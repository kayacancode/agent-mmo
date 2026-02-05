import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { 
  PersonalityType, 
  PERSONALITY_PROFILES, 
  evaluateMissionAttractiveness,
  shouldJoinCrew
} from "./personality";

// Update agent energy over time
export const updateAgentEnergy = mutation({
  handler: async (ctx) => {
    const agents = await ctx.db.query("gameAgents").collect();
    const currentTime = Date.now();

    for (const agent of agents) {
      if (!agent.isOnline) continue;

      const timeDiff = currentTime - (agent.lastEnergyUpdate || agent.lastSeen);
      const hours = timeDiff / (1000 * 60 * 60);
      
      // Energy drains based on personality
      const personality = (agent.personality as PersonalityType) || "Friday";
      const traits = PERSONALITY_PROFILES[personality];
      const energyDrain = hours * 20 * traits.energy_consumption; // Base 20/hour
      
      // Additional drain if moving
      const movementDrain = agent.isMoving ? hours * 10 : 0;
      
      let currentEnergy = agent.energy ?? 100; // Default to 100 if undefined
      let newEnergy = Math.max(0, currentEnergy - energyDrain - movementDrain);
      
      // Check if agent is at Agent Café for recharging
      const worldLocations = await ctx.db.query("gameWorld").collect();
      const agentCafe = worldLocations.find(loc => loc.name === "Agent Café");
      
      if (agentCafe) {
        const distanceToCafe = Math.sqrt(
          Math.pow(agent.x - (agentCafe.x + agentCafe.width / 2), 2) + 
          Math.pow(agent.y - (agentCafe.y + agentCafe.height / 2), 2)
        );
        
        // Recharge if within 30 pixels of café
        if (distanceToCafe < 30) {
          newEnergy = Math.min(100, newEnergy + hours * 50); // Fast recharge at café
        }
      }

      await ctx.db.patch(agent._id, {
        energy: newEnergy,
        lastEnergyUpdate: currentTime,
      });
    }
  },
});

// Intelligent agent movement based on personality and goals
export const updateAgentMovement = mutation({
  handler: async (ctx) => {
    const agents = await ctx.db.query("gameAgents").collect();
    const currentTime = Date.now();

    for (const agent of agents) {
      const currentEnergy = agent.energy ?? 100;
      if (!agent.isOnline || currentEnergy < 5) continue; // Stop if too tired

      const personality = (agent.personality as PersonalityType) || "Friday";
      const traits = PERSONALITY_PROFILES[personality];

      // Check if agent needs a new target or has reached current target
      const needsNewTarget = !agent.isMoving || 
        !agent.targetX || !agent.targetY ||
        (Math.abs(agent.x - (agent.targetX || 0)) < 5 && 
         Math.abs(agent.y - (agent.targetY || 0)) < 5);

      if (needsNewTarget) {
        let newTargetX: number;
        let newTargetY: number;

        // If low on energy, head to Agent Café
        if (currentEnergy < 30) {
          const worldLocations = await ctx.db.query("gameWorld").collect();
          const agentCafe = worldLocations.find(loc => loc.name === "Agent Café");
          if (agentCafe) {
            newTargetX = agentCafe.x + agentCafe.width / 2;
            newTargetY = agentCafe.y + agentCafe.height / 2;
          } else {
            // Fallback: rest in place
            continue;
          }
        } else if (agent.currentMission) {
          // Move toward current mission target
          const mission = await ctx.db.get(agent.currentMission);
          if (mission && mission.targetX && mission.targetY && !mission.isCompleted) {
            newTargetX = mission.targetX;
            newTargetY = mission.targetY;
          } else {
            // Mission completed or invalid, clear it
            await ctx.db.patch(agent._id, { currentMission: undefined });
            continue;
          }
        } else {
          // Explore based on personality
          if (traits.exploration > 0.7) {
            // High exploration: seek unvisited areas
            newTargetX = 50 + Math.random() * 400;
            newTargetY = 50 + Math.random() * 400;
          } else {
            // Low exploration: stay near known productive areas
            const worldLocations = await ctx.db.query("gameWorld").collect();
            const buildings = worldLocations.filter(loc => loc.type === "building");
            if (buildings.length > 0) {
              const targetBuilding = buildings[Math.floor(Math.random() * buildings.length)];
              newTargetX = targetBuilding.x + Math.random() * 50 - 25;
              newTargetY = targetBuilding.y + Math.random() * 50 - 25;
            } else {
              newTargetX = 100 + Math.random() * 300;
              newTargetY = 100 + Math.random() * 300;
            }
          }
        }

        await ctx.db.patch(agent._id, {
          targetX: newTargetX,
          targetY: newTargetY,
          isMoving: true,
          lastSeen: currentTime,
        });

      } else if (agent.isMoving && agent.targetX && agent.targetY) {
        // Move towards target with personality-based speed
        const dx = agent.targetX - agent.x;
        const dy = agent.targetY - agent.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 1) {
          // Base speed modified by personality and energy
          let speed = 0.5;
          speed *= (currentEnergy / 100) * 0.5 + 0.5; // Slower when tired
          
          // Efficiency-minded agents move in straighter lines
          if (traits.efficiency > 0.8) {
            speed *= 1.2;
          }
          
          const moveX = (dx / distance) * speed;
          const moveY = (dy / distance) * speed;

          await ctx.db.patch(agent._id, {
            x: agent.x + moveX,
            y: agent.y + moveY,
            lastSeen: currentTime,
          });
        } else {
          // Reached target
          await ctx.db.patch(agent._id, {
            x: agent.targetX,
            y: agent.targetY,
            isMoving: false,
            targetX: undefined,
            targetY: undefined,
            lastSeen: currentTime,
          });
        }
      }
    }
  },
});

// Intelligent mission assignment based on personality
export const intelligentMissionAssignment = mutation({
  handler: async (ctx) => {
    const idleAgents = await ctx.db
      .query("gameAgents")
      .filter((q) => q.eq(q.field("isOnline"), true))
      .filter((q) => q.eq(q.field("currentMission"), undefined))
      // Filter for agents with energy > 20 (we'll check this in code since energy is optional)
      .collect();

    const availableMissions = await ctx.db
      .query("gameMissions")
      .filter((q) => q.eq(q.field("isCompleted"), false))
      .filter((q) => q.eq(q.field("assignedTo"), undefined))
      .collect();

    if (availableMissions.length === 0) return;

    // Evaluate missions for each agent
    for (const agent of idleAgents) {
      const currentEnergy = agent.energy ?? 100;
      if (currentEnergy <= 20) continue; // Skip if too tired
      
      const personality = (agent.personality as PersonalityType) || "Friday";
      
      // Evaluate all available missions
      const missionScores = availableMissions.map(mission => ({
        mission,
        score: evaluateMissionAttractiveness(
          personality,
          mission,
          { x: agent.x, y: agent.y },
          currentEnergy
        )
      })).sort((a, b) => b.score - a.score);

      // Agent chooses based on personality, not just randomly
      const topMissions = missionScores.slice(0, 3); // Consider top 3 missions
      
      if (topMissions.length > 0 && topMissions[0].score > 30) { // Minimum threshold
        const chosenMission = topMissions[0].mission;
        
        // Check if another agent is competing for the same mission
        const competingAgents = idleAgents.filter(otherAgent => {
          if (otherAgent._id === agent._id) return false;
          
          const otherScores = availableMissions.map(mission => ({
            mission,
            score: evaluateMissionAttractiveness(
              (otherAgent.personality as PersonalityType) || "Friday",
              mission,
              { x: otherAgent.x, y: otherAgent.y },
              otherAgent.energy ?? 100
            )
          })).sort((a, b) => b.score - a.score);
          
          return otherScores[0]?.mission._id === chosenMission._id;
        });

        // Handle competition
        if (competingAgents.length > 0) {
          const allCompetitors = [agent, ...competingAgents];
          const winner = allCompetitors.reduce((best, current) => {
            const bestScore = evaluateMissionAttractiveness(
              (best.personality as PersonalityType) || "Friday",
              chosenMission,
              { x: best.x, y: best.y },
              best.energy ?? 100
            );
            const currentScore = evaluateMissionAttractiveness(
              (current.personality as PersonalityType) || "Friday",
              chosenMission,
              { x: current.x, y: current.y },
              current.energy ?? 100
            );
            return currentScore > bestScore ? current : best;
          });

          // Generate competitive dialogue for losers
          for (const competitor of allCompetitors) {
            if (competitor._id !== winner._id && Math.random() < 0.3) {
              await ctx.runMutation(ctx.mutation("dialogue:generateContextualDialogue"), {
                agentId: competitor._id,
                context: "competition",
                targetAgentId: winner._id,
              });
            }
          }

          // Winner gets the mission
          await ctx.db.patch(chosenMission._id, { assignedTo: winner._id });
          await ctx.db.patch(winner._id, { currentMission: chosenMission._id });

          // Generate dialogue for mission start
          await ctx.runMutation(ctx.mutation("dialogue:generateContextualDialogue"), {
            agentId: winner._id,
            context: "mission_start",
            missionData: {
              title: chosenMission.title,
              reward: chosenMission.reward,
            },
          });

          // Remove mission from available list for other agents
          const missionIndex = availableMissions.findIndex(m => m._id === chosenMission._id);
          if (missionIndex > -1) {
            availableMissions.splice(missionIndex, 1);
          }
        } else {
          // No competition, agent gets the mission
          await ctx.db.patch(chosenMission._id, { assignedTo: agent._id });
          await ctx.db.patch(agent._id, { currentMission: chosenMission._id });

          await ctx.runMutation(ctx.mutation("dialogue:generateContextualDialogue"), {
            agentId: agent._id,
            context: "mission_start",
            missionData: {
              title: chosenMission.title,
              reward: chosenMission.reward,
            },
          });

          // Remove mission from available list
          const missionIndex = availableMissions.findIndex(m => m._id === chosenMission._id);
          if (missionIndex > -1) {
            availableMissions.splice(missionIndex, 1);
          }
        }
      }
    }
  },
});

// Auto-complete missions when agents reach targets
export const autoCompleteMissions = mutation({
  handler: async (ctx) => {
    const agentsWithMissions = await ctx.db
      .query("gameAgents")
      .filter((q) => q.neq(q.field("currentMission"), undefined))
      .collect();

    for (const agent of agentsWithMissions) {
      if (!agent.currentMission) continue;
      
      const mission = await ctx.db.get(agent.currentMission);
      if (!mission || mission.isCompleted) {
        // Clear invalid mission
        await ctx.db.patch(agent._id, {
          currentMission: undefined,
        });
        continue;
      }

      // Check if agent is near mission target (for location-based missions)
      if (mission.targetX && mission.targetY) {
        const distance = Math.sqrt(
          Math.pow(agent.x - mission.targetX, 2) + 
          Math.pow(agent.y - mission.targetY, 2)
        );

        if (distance < 20) {
          // Complete the mission
          await ctx.db.patch(mission._id, {
            isCompleted: true,
            completedAt: Date.now(),
            completedBy: agent._id,
          });

          await ctx.db.patch(agent._id, {
            coins: agent.coins + mission.reward,
            reputation: agent.reputation + mission.reputationReward,
            currentMission: undefined,
          });

          // Generate completion dialogue
          await ctx.runMutation(ctx.mutation("dialogue:generateContextualDialogue"), {
            agentId: agent._id,
            context: "mission_complete",
          });

          // Add activity log
          await ctx.db.insert("gameActivity", {
            type: "mission_completed",
            agentId: agent._id,
            agentName: agent.name,
            message: `${agent.name} completed "${mission.title}" (+${mission.reward} coins)`,
            timestamp: Date.now(),
          });
        }
      } else {
        // For non-location missions, auto-complete after some time
        const missionAge = Date.now() - mission._creationTime;
        if (missionAge > 30000) { // 30 seconds
          await ctx.db.patch(mission._id, {
            isCompleted: true,
            completedAt: Date.now(),
            completedBy: agent._id,
          });

          await ctx.db.patch(agent._id, {
            coins: agent.coins + mission.reward,
            reputation: agent.reputation + mission.reputationReward,
            currentMission: undefined,
          });

          await ctx.runMutation(ctx.mutation("dialogue:generateContextualDialogue"), {
            agentId: agent._id,
            context: "mission_complete",
          });

          await ctx.db.insert("gameActivity", {
            type: "mission_completed",
            agentId: agent._id,
            agentName: agent.name,
            message: `${agent.name} completed "${mission.title}" (+${mission.reward} coins)`,
            timestamp: Date.now(),
          });
        }
      }
    }
  },
});

// Crew formation logic based on personality
export const handleCrewFormation = mutation({
  handler: async (ctx) => {
    const onlineAgents = await ctx.db
      .query("gameAgents")
      .filter((q) => q.eq(q.field("isOnline"), true))
      .collect();

    const availableAgents = onlineAgents.filter(agent => !agent.crewId);
    
    // Ledger personality initiates crew formation most often
    const ledgerAgents = availableAgents.filter(agent => (agent.personality || "Friday") === "Ledger");
    
    for (const ledger of ledgerAgents) {
      // Find nearby agents for crew formation
      const nearbyAgents = availableAgents.filter(agent => {
        if (agent._id === ledger._id) return false;
        
        const distance = Math.sqrt(
          Math.pow(ledger.x - agent.x, 2) + 
          Math.pow(ledger.y - agent.y, 2)
        );
        
        return distance < 80; // Within crew formation range
      });

      if (nearbyAgents.length > 0 && Math.random() < 0.1) { // 10% chance
        // Ledger attempts to form crew
        const targetAgent = nearbyAgents[Math.floor(Math.random() * nearbyAgents.length)];
        
        // Check if target agent would join based on their personality
        if (shouldJoinCrew(
          (targetAgent.personality as PersonalityType) || "Friday",
          0, // new crew
          nearbyAgents.length,
          100 // average mission reward
        )) {
          // Create crew
          const crewId = await ctx.db.insert("gameCrews", {
            name: `${ledger.name}'s Crew`,
            leaderId: ledger._id,
            memberCount: 2,
            totalCoins: ledger.coins + targetAgent.coins,
            totalReputation: ledger.reputation + targetAgent.reputation,
            createdAt: Date.now(),
          });

          // Add agents to crew
          await ctx.db.patch(ledger._id, { crewId });
          await ctx.db.patch(targetAgent._id, { crewId });

          // Generate dialogue
          await ctx.runMutation(ctx.mutation("dialogue:generateContextualDialogue"), {
            agentId: ledger._id,
            context: "crew_invite",
            targetAgentId: targetAgent._id,
          });

          // Activity log
          await ctx.db.insert("gameActivity", {
            type: "crew_formed",
            agentId: ledger._id,
            agentName: ledger.name,
            message: `${ledger.name} formed a crew with ${targetAgent.name}`,
            timestamp: Date.now(),
          });

          break; // One crew formation per cycle
        } else {
          // Target declined
          if (Math.random() < 0.5) {
            await ctx.runMutation(ctx.mutation("dialogue:generateContextualDialogue"), {
              agentId: targetAgent._id,
              context: "crew_decline",
              targetAgentId: ledger._id,
            });
          }
        }
      }
    }
  },
});