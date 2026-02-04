import { v } from "convex/values";
import { mutation } from "./_generated/server";

// Simple autonomous movement for agents
export const updateAgentMovement = mutation({
  handler: async (ctx) => {
    const agents = await ctx.db.query("gameAgents").collect();
    const currentTime = Date.now();

    for (const agent of agents) {
      if (!agent.isOnline) continue;

      // Check if agent needs a new target or has reached current target
      const needsNewTarget = !agent.isMoving || 
        !agent.targetX || !agent.targetY ||
        (Math.abs(agent.x - (agent.targetX || 0)) < 5 && 
         Math.abs(agent.y - (agent.targetY || 0)) < 5);

      if (needsNewTarget) {
        // Generate new random target within world bounds
        const newTargetX = 50 + Math.random() * 400; // Keep within 50-450 range
        const newTargetY = 50 + Math.random() * 400;

        await ctx.db.patch(agent._id, {
          targetX: newTargetX,
          targetY: newTargetY,
          isMoving: true,
          lastSeen: currentTime,
        });
      } else if (agent.isMoving && agent.targetX && agent.targetY) {
        // Move towards target
        const dx = agent.targetX - agent.x;
        const dy = agent.targetY - agent.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 1) {
          const speed = 0.5; // Movement speed
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

// Assign random mission to idle agents
export const autoAssignMissions = mutation({
  handler: async (ctx) => {
    const agents = await ctx.db
      .query("gameAgents")
      .filter((q) => q.eq(q.field("isOnline"), true))
      .filter((q) => q.eq(q.field("currentMission"), undefined))
      .collect();

    const availableMissions = await ctx.db
      .query("gameMissions")
      .filter((q) => q.eq(q.field("isCompleted"), false))
      .filter((q) => q.eq(q.field("assignedTo"), undefined))
      .collect();

    // Randomly assign missions to idle agents
    for (const agent of agents) {
      if (availableMissions.length === 0) break;
      
      // 20% chance to get a mission each cycle
      if (Math.random() < 0.2) {
        const randomMission = availableMissions[Math.floor(Math.random() * availableMissions.length)];
        
        await ctx.db.patch(randomMission._id, {
          assignedTo: agent._id,
        });

        await ctx.db.patch(agent._id, {
          currentMission: randomMission._id,
        });

        // Remove from available missions
        const index = availableMissions.indexOf(randomMission);
        availableMissions.splice(index, 1);

        // Set target if it's a location-based mission
        if (randomMission.targetX && randomMission.targetY) {
          await ctx.db.patch(agent._id, {
            targetX: randomMission.targetX,
            targetY: randomMission.targetY,
            isMoving: true,
          });
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
          await ctx.runMutation(ctx.mutation("missions:completeMission"), {
            missionId: mission._id,
            agentId: agent._id,
          });
        }
      }
    }
  },
});