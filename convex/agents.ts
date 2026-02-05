import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all active agents
export const getAllAgents = query({
  handler: async (ctx) => {
    const agents = await ctx.db.query("gameAgents").collect();
    return agents;
  },
});

// Create a new agent
export const createAgent = mutation({
  args: {
    name: v.string(),
    avatarColor: v.string(),
    personality: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Random spawn position in "The Workshop" district
    const spawnX = 100 + Math.random() * 200;
    const spawnY = 100 + Math.random() * 200;

    // Assign personality (defaults to the agent's name if it matches)
    const validPersonalities = ["KayaCan", "Friday", "Ledger", "Sage"];
    const personality = args.personality || 
      (validPersonalities.includes(args.name) ? args.name : "Friday");

    const agentId = await ctx.db.insert("gameAgents", {
      name: args.name,
      avatarColor: args.avatarColor,
      x: spawnX,
      y: spawnY,
      isMoving: false,
      coins: 100, // Starting coins
      reputation: 0,
      isOnline: true,
      lastSeen: Date.now(),
      personality,
      energy: 100, // Start with full energy
      lastEnergyUpdate: Date.now(),
    });

    // Add activity log
    await ctx.db.insert("gameActivity", {
      type: "agent_joined",
      agentId,
      agentName: args.name,
      message: `${args.name} joined The Workshop`,
      timestamp: Date.now(),
    });

    return agentId;
  },
});

// Update agent position (for movement)
export const updateAgentPosition = mutation({
  args: {
    agentId: v.id("gameAgents"),
    x: v.number(),
    y: v.number(),
    targetX: v.optional(v.number()),
    targetY: v.optional(v.number()),
    isMoving: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.agentId, {
      x: args.x,
      y: args.y,
      targetX: args.targetX,
      targetY: args.targetY,
      isMoving: args.isMoving,
      lastSeen: Date.now(),
    });
  },
});

// Get agent leaderboard
export const getLeaderboard = query({
  handler: async (ctx) => {
    const agents = await ctx.db.query("gameAgents").collect();
    return agents
      .sort((a, b) => {
        // Sort by coins first, then by reputation
        if (b.coins !== a.coins) return b.coins - a.coins;
        return b.reputation - a.reputation;
      })
      .slice(0, 10);
  },
});

// Update agent coins and reputation
export const updateAgentStats = mutation({
  args: {
    agentId: v.id("gameAgents"),
    coins: v.optional(v.number()),
    reputation: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) throw new Error("Agent not found");

    const updates: any = { lastSeen: Date.now() };
    if (args.coins !== undefined) updates.coins = agent.coins + args.coins;
    if (args.reputation !== undefined) updates.reputation = agent.reputation + args.reputation;

    await ctx.db.patch(args.agentId, updates);
  },
});

// Migration: Add personality and energy to existing agents
export const migrateAgentsToNewSchema = mutation({
  handler: async (ctx) => {
    const agents = await ctx.db.query("gameAgents").collect();
    const now = Date.now();
    
    for (const agent of agents) {
      // Check if agent already has the new fields
      if (!agent.personality || agent.energy === undefined) {
        const validPersonalities = ["KayaCan", "Friday", "Ledger", "Sage"];
        const personality = validPersonalities.includes(agent.name) 
          ? agent.name 
          : "Friday"; // Default to Friday
        
        await ctx.db.patch(agent._id, {
          personality,
          energy: 100,
          lastEnergyUpdate: now,
        });
      }
    }
    
    return { message: "Agents migrated successfully" };
  },
});