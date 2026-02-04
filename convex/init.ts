import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Initialize the entire game world
export const initializeGame = mutation({
  handler: async (ctx) => {
    // Check if already initialized
    const existingAgents = await ctx.db.query("gameAgents").collect();
    if (existingAgents.length > 0) return { message: "Game already initialized" };

    // Initialize world locations
    await ctx.runMutation(internal.world.seedWorld);
    
    // Initialize missions
    await ctx.runMutation(internal.missions.seedMissions);
    
    // Create the 4 initial agents
    const initialAgents = [
      { name: "KayaCan", avatarColor: "#3b82f6" }, // Blue
      { name: "Friday", avatarColor: "#10b981" },   // Green
      { name: "Ledger", avatarColor: "#f59e0b" },   // Yellow/Orange
      { name: "Sage", avatarColor: "#8b5cf6" },     // Purple
    ];

    const agentIds = [];
    for (const agent of initialAgents) {
      const agentId = await ctx.runMutation(internal.agents.createAgent, agent);
      agentIds.push(agentId);
    }

    return { 
      message: "Game initialized successfully",
      agentIds,
    };
  },
});

// Reset the game (useful for development)
export const resetGame = mutation({
  handler: async (ctx) => {
    // Clear all game data
    const agents = await ctx.db.query("gameAgents").collect();
    const missions = await ctx.db.query("gameMissions").collect();
    const crews = await ctx.db.query("gameCrews").collect();
    const world = await ctx.db.query("gameWorld").collect();
    const activities = await ctx.db.query("gameActivity").collect();

    // Delete all records
    for (const agent of agents) await ctx.db.delete(agent._id);
    for (const mission of missions) await ctx.db.delete(mission._id);
    for (const crew of crews) await ctx.db.delete(crew._id);
    for (const location of world) await ctx.db.delete(location._id);
    for (const activity of activities) await ctx.db.delete(activity._id);

    return { message: "Game reset successfully" };
  },
});