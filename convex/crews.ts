import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all crews
export const getAllCrews = query({
  handler: async (ctx) => {
    const crews = await ctx.db.query("gameCrews").collect();
    
    // Get crew members for each crew
    const crewsWithMembers = await Promise.all(
      crews.map(async (crew) => {
        const members = await ctx.db
          .query("gameAgents")
          .filter((q) => q.eq(q.field("crewId"), crew._id))
          .collect();
        
        return {
          ...crew,
          members,
        };
      })
    );
    
    return crewsWithMembers;
  },
});

// Create a new crew
export const createCrew = mutation({
  args: {
    name: v.string(),
    leaderId: v.id("gameAgents"),
  },
  handler: async (ctx, args) => {
    const leader = await ctx.db.get(args.leaderId);
    if (!leader) throw new Error("Leader not found");
    if (leader.crewId) throw new Error("Agent already in a crew");

    const crewId = await ctx.db.insert("gameCrews", {
      name: args.name,
      leaderId: args.leaderId,
      memberCount: 1,
      totalCoins: leader.coins,
      totalReputation: leader.reputation,
      createdAt: Date.now(),
    });

    // Update the leader to be in the crew
    await ctx.db.patch(args.leaderId, {
      crewId,
    });

    // Add activity log
    await ctx.db.insert("gameActivity", {
      type: "crew_formed",
      agentId: args.leaderId,
      agentName: leader.name,
      message: `${leader.name} formed crew "${args.name}"`,
      timestamp: Date.now(),
    });

    return crewId;
  },
});

// Join a crew
export const joinCrew = mutation({
  args: {
    crewId: v.id("gameCrews"),
    agentId: v.id("gameAgents"),
  },
  handler: async (ctx, args) => {
    const crew = await ctx.db.get(args.crewId);
    const agent = await ctx.db.get(args.agentId);
    
    if (!crew || !agent) throw new Error("Crew or agent not found");
    if (agent.crewId) throw new Error("Agent already in a crew");

    // Update agent to join crew
    await ctx.db.patch(args.agentId, {
      crewId: args.crewId,
    });

    // Update crew stats
    await ctx.db.patch(args.crewId, {
      memberCount: crew.memberCount + 1,
      totalCoins: crew.totalCoins + agent.coins,
      totalReputation: crew.totalReputation + agent.reputation,
    });

    // Add activity log
    await ctx.db.insert("gameActivity", {
      type: "crew_joined",
      agentId: args.agentId,
      agentName: agent.name,
      message: `${agent.name} joined crew "${crew.name}"`,
      timestamp: Date.now(),
    });

    return crew;
  },
});

// Get crew details with members
export const getCrewDetails = query({
  args: { crewId: v.id("gameCrews") },
  handler: async (ctx, args) => {
    const crew = await ctx.db.get(args.crewId);
    if (!crew) return null;

    const members = await ctx.db
      .query("gameAgents")
      .filter((q) => q.eq(q.field("crewId"), crew._id))
      .collect();

    return {
      ...crew,
      members,
    };
  },
});

// Update crew stats (called when members gain coins/reputation)
export const updateCrewStats = mutation({
  args: { crewId: v.id("gameCrews") },
  handler: async (ctx, args) => {
    const crew = await ctx.db.get(args.crewId);
    if (!crew) return;

    const members = await ctx.db
      .query("gameAgents")
      .filter((q) => q.eq(q.field("crewId"), crew._id))
      .collect();

    const totalCoins = members.reduce((sum, member) => sum + member.coins, 0);
    const totalReputation = members.reduce((sum, member) => sum + member.reputation, 0);

    await ctx.db.patch(args.crewId, {
      memberCount: members.length,
      totalCoins,
      totalReputation,
    });
  },
});