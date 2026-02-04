import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all world locations
export const getWorldLocations = query({
  handler: async (ctx) => {
    const locations = await ctx.db.query("gameWorld").collect();
    return locations;
  },
});

// Get recent activity for the activity feed
export const getRecentActivity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const activities = await ctx.db
      .query("gameActivity")
      .order("desc")
      .take(limit);
    return activities;
  },
});

// Initialize the world with locations
export const seedWorld = mutation({
  handler: async (ctx) => {
    // Check if world already exists
    const existingLocations = await ctx.db.query("gameWorld").collect();
    if (existingLocations.length > 0) return;

    const locations = [
      // Central Plaza
      {
        name: "Central Plaza",
        type: "landmark" as const,
        x: 225,
        y: 225,
        width: 50,
        height: 50,
        color: "#3b82f6",
        isInteractable: true,
        description: "The heart of The Workshop district",
      },
      // Buildings
      {
        name: "Mission Board",
        type: "building" as const,
        x: 100,
        y: 100,
        width: 40,
        height: 30,
        color: "#10b981",
        isInteractable: true,
        description: "Where agents find new missions",
      },
      {
        name: "Data Processing Center",
        type: "building" as const,
        x: 350,
        y: 150,
        width: 60,
        height: 40,
        color: "#8b5cf6",
        isInteractable: true,
        description: "Central hub for data operations",
      },
      {
        name: "Agent Café",
        type: "building" as const,
        x: 200,
        y: 350,
        width: 50,
        height: 35,
        color: "#f59e0b",
        isInteractable: true,
        description: "Social gathering spot for agents",
      },
      {
        name: "Workshop Garage",
        type: "building" as const,
        x: 50,
        y: 300,
        width: 45,
        height: 55,
        color: "#ef4444",
        isInteractable: true,
        description: "Equipment and upgrades",
      },
      // Spawn points
      {
        name: "North Spawn",
        type: "spawn" as const,
        x: 250,
        y: 50,
        width: 20,
        height: 20,
        color: "#6b7280",
        isInteractable: false,
        description: "Northern entry point",
      },
      {
        name: "South Spawn",
        type: "spawn" as const,
        x: 250,
        y: 450,
        width: 20,
        height: 20,
        color: "#6b7280",
        isInteractable: false,
        description: "Southern entry point",
      },
      // Data Nodes for collection missions
      {
        name: "Data Node Alpha",
        type: "landmark" as const,
        x: 150,
        y: 200,
        width: 15,
        height: 15,
        color: "#06b6d4",
        isInteractable: true,
        description: "Data collection point",
      },
      {
        name: "Data Node Beta",
        type: "landmark" as const,
        x: 300,
        y: 300,
        width: 15,
        height: 15,
        color: "#06b6d4",
        isInteractable: true,
        description: "Data collection point",
      },
    ];

    for (const location of locations) {
      await ctx.db.insert("gameWorld", location);
    }
  },
});