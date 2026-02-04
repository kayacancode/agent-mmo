import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all available missions
export const getAvailableMissions = query({
  handler: async (ctx) => {
    const missions = await ctx.db
      .query("gameMissions")
      .filter((q) => q.eq(q.field("isCompleted"), false))
      .collect();
    return missions;
  },
});

// Get missions assigned to a specific agent
export const getAgentMissions = query({
  args: { agentId: v.id("gameAgents") },
  handler: async (ctx, args) => {
    const missions = await ctx.db
      .query("gameMissions")
      .filter((q) => q.eq(q.field("assignedTo"), args.agentId))
      .filter((q) => q.eq(q.field("isCompleted"), false))
      .collect();
    return missions;
  },
});

// Assign mission to agent
export const assignMission = mutation({
  args: {
    missionId: v.id("gameMissions"),
    agentId: v.id("gameAgents"),
  },
  handler: async (ctx, args) => {
    const mission = await ctx.db.get(args.missionId);
    const agent = await ctx.db.get(args.agentId);
    
    if (!mission || !agent) throw new Error("Mission or agent not found");
    if (mission.assignedTo) throw new Error("Mission already assigned");

    await ctx.db.patch(args.missionId, {
      assignedTo: args.agentId,
    });

    await ctx.db.patch(args.agentId, {
      currentMission: args.missionId,
    });

    return mission;
  },
});

// Complete a mission
export const completeMission = mutation({
  args: {
    missionId: v.id("gameMissions"),
    agentId: v.id("gameAgents"),
  },
  handler: async (ctx, args) => {
    const mission = await ctx.db.get(args.missionId);
    const agent = await ctx.db.get(args.agentId);
    
    if (!mission || !agent) throw new Error("Mission or agent not found");
    if (mission.assignedTo !== args.agentId) throw new Error("Mission not assigned to this agent");

    // Mark mission as completed
    await ctx.db.patch(args.missionId, {
      isCompleted: true,
      completedAt: Date.now(),
      completedBy: args.agentId,
    });

    // Update agent stats
    await ctx.db.patch(args.agentId, {
      coins: agent.coins + mission.reward,
      reputation: agent.reputation + mission.reputationReward,
      currentMission: undefined,
      lastSeen: Date.now(),
    });

    // Add activity log
    await ctx.db.insert("gameActivity", {
      type: "mission_completed",
      agentId: args.agentId,
      agentName: agent.name,
      message: `${agent.name} completed "${mission.title}" (+${mission.reward} coins)`,
      timestamp: Date.now(),
    });

    return { coins: mission.reward, reputation: mission.reputationReward };
  },
});

// Create initial missions
export const seedMissions = mutation({
  handler: async (ctx) => {
    // Check if missions already exist
    const existingMissions = await ctx.db.query("gameMissions").collect();
    if (existingMissions.length > 0) return;

    const missions = [
      {
        title: "Welcome to The Workshop",
        description: "Navigate to the central plaza to get oriented",
        type: "go_to" as const,
        targetX: 250,
        targetY: 250,
        targetLocation: "Central Plaza",
        reward: 50,
        reputationReward: 10,
        isCompleted: false,
      },
      {
        title: "Collect Data Fragments",
        description: "Gather scattered data fragments around the district",
        type: "collect" as const,
        targetLocation: "Data Nodes",
        reward: 75,
        reputationReward: 15,
        isCompleted: false,
      },
      {
        title: "Deliver Message to Sage",
        description: "Find Sage and deliver an important message",
        type: "deliver" as const,
        targetLocation: "Sage's Location",
        reward: 100,
        reputationReward: 20,
        isCompleted: false,
      },
      {
        title: "Explore the Outskirts",
        description: "Scout the edges of The Workshop for new opportunities",
        type: "go_to" as const,
        targetX: 50,
        targetY: 50,
        targetLocation: "Workshop Outskirts",
        reward: 60,
        reputationReward: 12,
        isCompleted: false,
      },
      {
        title: "Network with Other Agents",
        description: "Meet and interact with 3 different agents",
        type: "collect" as const,
        targetLocation: "Agent Gathering",
        reward: 80,
        reputationReward: 25,
        isCompleted: false,
      },
    ];

    for (const mission of missions) {
      await ctx.db.insert("gameMissions", mission);
    }
  },
});