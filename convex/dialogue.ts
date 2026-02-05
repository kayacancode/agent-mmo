import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getRandomDialogue, PersonalityType } from "./personality";

// Create a dialogue bubble
export const addDialogue = mutation({
  args: {
    agentId: v.id("gameAgents"),
    message: v.string(),
    context: v.optional(v.string()),
    durationMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) throw new Error("Agent not found");

    const now = Date.now();
    const duration = args.durationMs || 4000; // 4 seconds default

    // Insert dialogue bubble
    const dialogueId = await ctx.db.insert("gameDialogue", {
      agentId: args.agentId,
      agentName: agent.name,
      message: args.message,
      x: agent.x,
      y: agent.y,
      timestamp: now,
      expiresAt: now + duration,
      context: args.context,
    });

    // Also add to activity feed if it's an interesting dialogue
    if (args.context && ["mission_complete", "competition", "discovery"].includes(args.context)) {
      await ctx.db.insert("gameActivity", {
        type: "dialogue",
        agentId: args.agentId,
        agentName: agent.name,
        message: `${agent.name}: ${args.message}`,
        timestamp: now,
      });
    }

    return dialogueId;
  },
});

// Get active dialogue bubbles (not expired)
export const getActiveDialogue = query({
  handler: async (ctx) => {
    const now = Date.now();
    const activeDialogue = await ctx.db
      .query("gameDialogue")
      .filter((q) => q.gt(q.field("expiresAt"), now))
      .order("desc")
      .take(50); // Limit to most recent 50 active dialogues

    return activeDialogue;
  },
});

// Clean up expired dialogue
export const cleanupExpiredDialogue = mutation({
  handler: async (ctx) => {
    const now = Date.now();
    const expiredDialogue = await ctx.db
      .query("gameDialogue")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    // Remove expired dialogue bubbles
    for (const dialogue of expiredDialogue) {
      await ctx.db.delete(dialogue._id);
    }

    return expiredDialogue.length;
  },
});

// Generate contextual dialogue for an agent
export const generateContextualDialogue = mutation({
  args: {
    agentId: v.id("gameAgents"),
    context: v.string(),
    targetAgentId: v.optional(v.id("gameAgents")),
    missionData: v.optional(v.object({
      title: v.string(),
      reward: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) throw new Error("Agent not found");

    const personality = (agent.personality as PersonalityType) || "Friday";
    let message = "";
    let context = args.context;

    switch (args.context) {
      case "mission_complete":
        message = getRandomDialogue(personality, "mission_complete");
        break;
        
      case "crew_invite":
        message = getRandomDialogue(personality, "crew_invite");
        break;
        
      case "crew_decline":
        message = getRandomDialogue(personality, "crew_decline");
        break;
        
      case "competition":
        message = getRandomDialogue(personality, "competition");
        break;
        
      case "discovery":
        message = getRandomDialogue(personality, "discovery");
        break;
        
      case "energy_low":
        message = getRandomDialogue(personality, "energy_low");
        break;
        
      case "mission_start":
        if (args.missionData) {
          const responses = {
            KayaCan: [`Time to make some money! 💰`, `${args.missionData.title}? Easy! 😎`, `Watch me work! 🔥`],
            Friday: [`Mission accepted. Calculating optimal route... 🤖`, `Objective: ${args.missionData.title}. Processing... ⚙️`, `Task initiated. Efficiency mode: ON 📊`],
            Ledger: [`ROI analysis: ${args.missionData.reward} coins. Acceptable 💼`, `Strategic objective acquired 📈`, `Investment opportunity confirmed 💎`],
            Sage: [`Interesting mission... what will I discover? 🔍`, `New knowledge awaits! ✨`, `The journey teaches as much as the destination 📚`]
          };
          const options = responses[personality] || [`Starting mission: ${args.missionData.title}`];
          message = options[Math.floor(Math.random() * options.length)];
        }
        break;
        
      case "near_agent":
        if (args.targetAgentId) {
          const targetAgent = await ctx.db.get(args.targetAgentId);
          if (targetAgent) {
            const greetings = {
              KayaCan: [`Hey ${targetAgent.name}! 👋`, `What's up, ${targetAgent.name}? 😏`, `${targetAgent.name}! Still grinding? 💪`],
              Friday: [`Hello ${targetAgent.name}. Operational status? 🤖`, `Greetings, ${targetAgent.name} 📋`, `${targetAgent.name}. Efficiency optimal today? ⚙️`],
              Ledger: [`${targetAgent.name}! Any good opportunities lately? 💼`, `Ah, ${targetAgent.name}. How's business? 📈`, `${targetAgent.name}! Care to discuss strategy? 🤝`],
              Sage: [`${targetAgent.name}! What wisdom have you gathered? 📚`, `Greetings, ${targetAgent.name}. Seen anything interesting? 🔍`, `${targetAgent.name}! Share your discoveries? ✨`]
            };
            const options = greetings[personality] || [`Hello ${targetAgent.name}!`];
            message = options[Math.floor(Math.random() * options.length)];
          }
        }
        break;
        
      default:
        message = "..."; // Default fallback
    }

    // Add the dialogue bubble
    return await ctx.runMutation(internal.dialogue.addDialogue, {
      agentId: args.agentId,
      message,
      context,
    });
  },
});

// Check for dialogue opportunities based on agent proximity and actions
export const checkDialogueOpportunities = mutation({
  handler: async (ctx) => {
    const agents = await ctx.db
      .query("gameAgents")
      .filter((q) => q.eq(q.field("isOnline"), true))
      .collect();

    const opportunities: Array<{
      agentId: string;
      context: string;
      targetAgentId?: string;
    }> = [];

    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      
      // Check for low energy dialogue
      const currentEnergy = agent.energy ?? 100;
      if (currentEnergy < 30) {
        // Only speak about energy occasionally to avoid spam
        const shouldSpeak = Math.random() < 0.1; // 10% chance per check
        if (shouldSpeak) {
          opportunities.push({
            agentId: agent._id,
            context: "energy_low",
          });
        }
      }

      // Check for nearby agents (potential social interactions)
      for (let j = i + 1; j < agents.length; j++) {
        const otherAgent = agents[j];
        const distance = Math.sqrt(
          Math.pow(agent.x - otherAgent.x, 2) + Math.pow(agent.y - otherAgent.y, 2)
        );

        // If agents are close (within 50 pixels) and both are idle, chance for interaction
        if (distance < 50 && !agent.isMoving && !otherAgent.isMoving) {
          const shouldInteract = Math.random() < 0.05; // 5% chance per check
          if (shouldInteract) {
            opportunities.push({
              agentId: agent._id,
              context: "near_agent",
              targetAgentId: otherAgent._id,
            });
          }
        }
      }
    }

    // Process a few opportunities to avoid flooding
    const processCount = Math.min(opportunities.length, 2);
    for (let i = 0; i < processCount; i++) {
      const opportunity = opportunities[i];
      await ctx.runMutation(internal.dialogue.generateContextualDialogue, {
        agentId: opportunity.agentId as any,
        context: opportunity.context,
        targetAgentId: opportunity.targetAgentId as any,
      });
    }

    return processCount;
  },
});