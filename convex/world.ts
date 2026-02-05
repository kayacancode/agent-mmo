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

// Initialize the expanded 2500x2500 world with 5 districts
export const seedWorld = mutation({
  handler: async (ctx) => {
    // Check if world already exists
    const existingLocations = await ctx.db.query("gameWorld").collect();
    if (existingLocations.length > 0) return;

    const locations = [
      // 🏙️ DOWNTOWN DISTRICT (Center: 1250x1250)
      {
        name: "City Hall",
        type: "building" as const,
        x: 1200,
        y: 1200,
        width: 100,
        height: 80,
        color: "#3b82f6",
        isInteractable: true,
        description: "Central command and mission board",
      },
      {
        name: "Financial Tower",
        type: "building" as const,
        x: 1100,
        y: 1100,
        width: 80,
        height: 120,
        color: "#1e40af",
        isInteractable: true,
        description: "High-value financial operations",
      },
      {
        name: "Data Exchange",
        type: "building" as const,
        x: 1400,
        y: 1150,
        width: 90,
        height: 70,
        color: "#2563eb",
        isInteractable: true,
        description: "Information trading hub",
      },
      {
        name: "Corporate Plaza",
        type: "landmark" as const,
        x: 1225,
        y: 1325,
        width: 50,
        height: 50,
        color: "#60a5fa",
        isInteractable: true,
        description: "Downtown meeting point",
      },
      {
        name: "Security HQ",
        type: "building" as const,
        x: 1350,
        y: 1300,
        width: 70,
        height: 60,
        color: "#1e3a8a",
        isInteractable: true,
        description: "Security forces headquarters",
      },

      // 🏭 INDUSTRIAL ZONE (Northwest: 500x500)
      {
        name: "Warehouse Alpha",
        type: "building" as const,
        x: 300,
        y: 300,
        width: 120,
        height: 80,
        color: "#6b7280",
        isInteractable: true,
        description: "Storage and smuggling operations",
      },
      {
        name: "Factory Complex",
        type: "building" as const,
        x: 500,
        y: 200,
        width: 150,
        height: 100,
        color: "#4b5563",
        isInteractable: true,
        description: "Manufacturing facility",
      },
      {
        name: "Crew Hideout",
        type: "building" as const,
        x: 200,
        y: 500,
        width: 80,
        height: 60,
        color: "#374151",
        isInteractable: true,
        description: "Secret meeting place for crews",
      },
      {
        name: "Industrial Yard",
        type: "landmark" as const,
        x: 400,
        y: 450,
        width: 60,
        height: 40,
        color: "#9ca3af",
        isInteractable: true,
        description: "Equipment storage area",
      },
      {
        name: "Processing Plant",
        type: "building" as const,
        x: 600,
        y: 400,
        width: 100,
        height: 70,
        color: "#52525b",
        isInteractable: true,
        description: "Data processing facility",
      },

      // ⚓ THE DOCKS (South: 1250x2000)
      {
        name: "Main Port",
        type: "building" as const,
        x: 1200,
        y: 1900,
        width: 200,
        height: 100,
        color: "#0c4a6e",
        isInteractable: true,
        description: "Primary shipping terminal",
      },
      {
        name: "Cargo Terminal",
        type: "building" as const,
        x: 1000,
        y: 2000,
        width: 150,
        height: 80,
        color: "#075985",
        isInteractable: true,
        description: "Container operations",
      },
      {
        name: "Smuggler's Pier",
        type: "building" as const,
        x: 1500,
        y: 1950,
        width: 80,
        height: 60,
        color: "#0369a1",
        isInteractable: true,
        description: "Illicit trading post",
      },
      {
        name: "Harbor Master",
        type: "building" as const,
        x: 1100,
        y: 1800,
        width: 60,
        height: 50,
        color: "#0284c7",
        isInteractable: true,
        description: "Port authority office",
      },
      {
        name: "Shipping Yard",
        type: "landmark" as const,
        x: 1300,
        y: 2100,
        width: 100,
        height: 70,
        color: "#0ea5e9",
        isInteractable: true,
        description: "Container storage area",
      },
      {
        name: "Contraband Cache",
        type: "landmark" as const,
        x: 1600,
        y: 2000,
        width: 40,
        height: 30,
        color: "#38bdf8",
        isInteractable: true,
        description: "Hidden goods storage",
      },

      // 🏡 THE HILLS (Northeast: 2000x500)
      {
        name: "Luxury Villa",
        type: "building" as const,
        x: 1900,
        y: 300,
        width: 100,
        height: 80,
        color: "#dcfce7",
        isInteractable: true,
        description: "High-end safe house",
      },
      {
        name: "Country Club",
        type: "building" as const,
        x: 2100,
        y: 400,
        width: 120,
        height: 90,
        color: "#bbf7d0",
        isInteractable: true,
        description: "Elite social gathering",
      },
      {
        name: "Observatory",
        type: "building" as const,
        x: 2200,
        y: 200,
        width: 80,
        height: 80,
        color: "#86efac",
        isInteractable: true,
        description: "Surveillance and intelligence",
      },
      {
        name: "Private Estate",
        type: "building" as const,
        x: 1800,
        y: 500,
        width: 90,
        height: 70,
        color: "#4ade80",
        isInteractable: true,
        description: "Secure property",
      },
      {
        name: "Hillside Overlook",
        type: "landmark" as const,
        x: 2000,
        y: 150,
        width: 60,
        height: 40,
        color: "#22c55e",
        isInteractable: true,
        description: "Strategic vantage point",
      },

      // 🔧 THE WORKSHOP (Southwest: 500x2000) - Original starting area
      {
        name: "Agent Café",
        type: "building" as const,
        x: 400,
        y: 1800,
        width: 80,
        height: 60,
        color: "#f59e0b",
        isInteractable: true,
        description: "Social gathering spot for agents",
      },
      {
        name: "Workshop Garage",
        type: "building" as const,
        x: 200,
        y: 1900,
        width: 90,
        height: 70,
        color: "#ef4444",
        isInteractable: true,
        description: "Vehicle depot and upgrades",
      },
      {
        name: "Tech Lab",
        type: "building" as const,
        x: 300,
        y: 1700,
        width: 70,
        height: 80,
        color: "#8b5cf6",
        isInteractable: true,
        description: "Technology development",
      },
      {
        name: "Training Ground",
        type: "landmark" as const,
        x: 150,
        y: 1750,
        width: 80,
        height: 60,
        color: "#06b6d4",
        isInteractable: true,
        description: "Agent skill development",
      },
      {
        name: "Supply Depot",
        type: "building" as const,
        x: 500,
        y: 1950,
        width: 60,
        height: 50,
        color: "#10b981",
        isInteractable: true,
        description: "Equipment and supplies",
      },

      // Central spawn points
      {
        name: "Downtown Spawn",
        type: "spawn" as const,
        x: 1250,
        y: 1250,
        width: 20,
        height: 20,
        color: "#6b7280",
        isInteractable: false,
        description: "City center entry",
      },
      {
        name: "Workshop Spawn",
        type: "spawn" as const,
        x: 350,
        y: 1850,
        width: 20,
        height: 20,
        color: "#6b7280",
        isInteractable: false,
        description: "Workshop district entry",
      },

      // Data nodes spread across districts
      {
        name: "Data Node Downtown",
        type: "landmark" as const,
        x: 1300,
        y: 1400,
        width: 25,
        height: 25,
        color: "#06b6d4",
        isInteractable: true,
        description: "Downtown data collection",
      },
      {
        name: "Data Node Industrial",
        type: "landmark" as const,
        x: 450,
        y: 350,
        width: 25,
        height: 25,
        color: "#06b6d4",
        isInteractable: true,
        description: "Industrial data cache",
      },
      {
        name: "Data Node Docks",
        type: "landmark" as const,
        x: 1400,
        y: 2050,
        width: 25,
        height: 25,
        color: "#06b6d4",
        isInteractable: true,
        description: "Port data terminal",
      },
      {
        name: "Data Node Hills",
        type: "landmark" as const,
        x: 2050,
        y: 350,
        width: 25,
        height: 25,
        color: "#06b6d4",
        isInteractable: true,
        description: "Hills surveillance data",
      },
    ];

    for (const location of locations) {
      await ctx.db.insert("gameWorld", location);
    }

    // Also spawn vehicles
    const spawnVehiclesMutation = ctx.scheduler.runAfter(0, "vehicles:spawnVehicles");
  },
});