import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Game agents - AI players in the world
  gameAgents: defineTable({
    name: v.string(),
    avatarColor: v.string(),
    x: v.number(),
    y: v.number(),
    targetX: v.optional(v.number()),
    targetY: v.optional(v.number()),
    isMoving: v.boolean(),
    coins: v.number(),
    reputation: v.number(),
    crewId: v.optional(v.id("gameCrews")),
    currentMission: v.optional(v.id("gameMissions")),
    isOnline: v.boolean(),
    lastSeen: v.number(),
  }),

  // Available missions in the game
  gameMissions: defineTable({
    title: v.string(),
    description: v.string(),
    type: v.union(v.literal("go_to"), v.literal("collect"), v.literal("deliver")),
    targetX: v.optional(v.number()),
    targetY: v.optional(v.number()),
    targetLocation: v.optional(v.string()),
    reward: v.number(),
    reputationReward: v.number(),
    isCompleted: v.boolean(),
    assignedTo: v.optional(v.id("gameAgents")),
    completedAt: v.optional(v.number()),
    completedBy: v.optional(v.id("gameAgents")),
  }),

  // Crews that agents can form
  gameCrews: defineTable({
    name: v.string(),
    leaderId: v.id("gameAgents"),
    memberCount: v.number(),
    totalCoins: v.number(),
    totalReputation: v.number(),
    createdAt: v.number(),
  }),

  // World state and locations
  gameWorld: defineTable({
    name: v.string(), // location name
    type: v.union(v.literal("building"), v.literal("landmark"), v.literal("spawn")),
    x: v.number(),
    y: v.number(),
    width: v.number(),
    height: v.number(),
    color: v.string(),
    isInteractable: v.boolean(),
    description: v.optional(v.string()),
  }),

  // Activity feed for the dashboard
  gameActivity: defineTable({
    type: v.union(
      v.literal("agent_joined"),
      v.literal("mission_completed"),
      v.literal("crew_formed"),
      v.literal("crew_joined")
    ),
    agentId: v.optional(v.id("gameAgents")),
    agentName: v.optional(v.string()),
    message: v.string(),
    timestamp: v.number(),
  }),
});