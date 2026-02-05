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
    personality: v.optional(v.string()), // "KayaCan", "Friday", "Ledger", "Sage"
    energy: v.optional(v.number()), // 0-100, drains over time, recharged at Agent Café
    lastEnergyUpdate: v.optional(v.number()),
    // GTA-style wanted system
    wantedLevel: v.optional(v.number()), // 0-5 stars
    lastWantedUpdate: v.optional(v.number()),
    isBeingChased: v.optional(v.boolean()),
    // Vehicle system
    vehicleId: v.optional(v.id("gameVehicles")),
    isInVehicle: v.optional(v.boolean()),
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
      v.literal("crew_joined"),
      v.literal("dialogue"),
      v.literal("event")
    ),
    agentId: v.optional(v.id("gameAgents")),
    agentName: v.optional(v.string()),
    message: v.string(),
    timestamp: v.number(),
  }),

  // Agent dialogue bubbles
  gameDialogue: defineTable({
    agentId: v.id("gameAgents"),
    agentName: v.string(),
    message: v.string(),
    x: v.number(),
    y: v.number(),
    timestamp: v.number(),
    expiresAt: v.number(),
    context: v.optional(v.string()), // mission_complete, crew_interaction, etc.
  }),

  // Random events in the game world
  gameEvents: defineTable({
    type: v.string(),
    title: v.string(),
    description: v.string(),
    x: v.optional(v.number()),
    y: v.optional(v.number()),
    radius: v.optional(v.number()),
    isActive: v.boolean(),
    startedAt: v.number(),
    endsAt: v.number(),
    data: v.optional(v.object({})), // additional event data
  }),

  // Vehicles in the game world
  gameVehicles: defineTable({
    type: v.union(v.literal("sedan"), v.literal("sports"), v.literal("van")),
    x: v.number(),
    y: v.number(),
    color: v.string(),
    speed: v.number(), // speed multiplier
    isAvailable: v.boolean(),
    ownerId: v.optional(v.id("gameAgents")),
    spawnLocation: v.string(), // district where it spawns
  }),

  // Security NPCs that chase wanted agents
  gameSecurity: defineTable({
    x: v.number(),
    y: v.number(),
    targetAgentId: v.optional(v.id("gameAgents")),
    targetX: v.optional(v.number()),
    targetY: v.optional(v.number()),
    isChasing: v.boolean(),
    speed: v.number(),
    spawnedAt: v.number(),
    despawnAt: v.number(),
  }),

  // Heist missions (multi-agent coordinated)
  gameHeists: defineTable({
    title: v.string(),
    description: v.string(),
    district: v.string(),
    requiredAgents: v.number(),
    plannedBy: v.optional(v.id("gameCrews")),
    participantIds: v.optional(v.array(v.id("gameAgents"))),
    status: v.union(v.literal("planning"), v.literal("active"), v.literal("completed"), v.literal("failed")),
    targetX: v.number(),
    targetY: v.number(),
    reward: v.number(),
    heatGenerated: v.number(),
    createdAt: v.number(),
    startsAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  }),
});