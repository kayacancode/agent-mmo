import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all vehicles
export const getAllVehicles = query({
  handler: async (ctx) => {
    return await ctx.db.query("gameVehicles").collect();
  },
});

// Spawn vehicles in different districts
export const spawnVehicles = mutation({
  handler: async (ctx) => {
    // Check if vehicles already exist
    const existingVehicles = await ctx.db.query("gameVehicles").collect();
    if (existingVehicles.length > 0) return;

    const vehicleSpawns = [
      // Workshop District
      { type: "sedan", x: 250, y: 1950, color: "#6b7280", speed: 2.0, district: "Workshop" },
      { type: "van", x: 300, y: 1900, color: "#374151", speed: 1.5, district: "Workshop" },
      
      // Downtown
      { type: "sports", x: 1200, y: 1300, color: "#ef4444", speed: 3.0, district: "Downtown" },
      { type: "sedan", x: 1350, y: 1200, color: "#3b82f6", speed: 2.0, district: "Downtown" },
      
      // Industrial
      { type: "van", x: 400, y: 300, color: "#52525b", speed: 1.5, district: "Industrial" },
      { type: "sedan", x: 500, y: 250, color: "#6b7280", speed: 2.0, district: "Industrial" },
      
      // Docks
      { type: "van", x: 1300, y: 2000, color: "#0c4a6e", speed: 1.5, district: "Docks" },
      { type: "sports", x: 1500, y: 1900, color: "#0ea5e9", speed: 3.0, district: "Docks" },
      
      // Hills
      { type: "sports", x: 2000, y: 300, color: "#22c55e", speed: 3.0, district: "Hills" },
      { type: "sedan", x: 1900, y: 400, color: "#86efac", speed: 2.0, district: "Hills" },
    ];

    for (const vehicle of vehicleSpawns) {
      await ctx.db.insert("gameVehicles", {
        type: vehicle.type as "sedan" | "sports" | "van",
        x: vehicle.x,
        y: vehicle.y,
        color: vehicle.color,
        speed: vehicle.speed,
        isAvailable: true,
        spawnLocation: vehicle.district,
      });
    }
  },
});

// Agent enters a vehicle
export const enterVehicle = mutation({
  args: {
    agentId: v.id("gameAgents"),
    vehicleId: v.id("gameVehicles"),
  },
  handler: async (ctx, { agentId, vehicleId }) => {
    const agent = await ctx.db.get(agentId);
    const vehicle = await ctx.db.get(vehicleId);
    
    if (!agent || !vehicle || !vehicle.isAvailable || agent.isInVehicle) return;

    // Check if agent is close enough to vehicle
    const distance = Math.sqrt(
      Math.pow(agent.x - vehicle.x, 2) + Math.pow(agent.y - vehicle.y, 2)
    );
    
    if (distance > 30) return; // Too far away

    await ctx.db.patch(agentId, {
      vehicleId: vehicleId,
      isInVehicle: true,
    });

    await ctx.db.patch(vehicleId, {
      isAvailable: false,
      ownerId: agentId,
    });

    await ctx.db.insert("gameActivity", {
      type: "event",
      agentId: agent._id,
      agentName: agent.name,
      message: `${agent.name} got into a ${vehicle.type}`,
      timestamp: Date.now(),
    });
  },
});

// Agent exits vehicle
export const exitVehicle = mutation({
  args: {
    agentId: v.id("gameAgents"),
  },
  handler: async (ctx, { agentId }) => {
    const agent = await ctx.db.get(agentId);
    if (!agent || !agent.isInVehicle || !agent.vehicleId) return;

    const vehicle = await ctx.db.get(agent.vehicleId);
    if (!vehicle) return;

    // Place vehicle at agent's current position
    await ctx.db.patch(vehicle._id, {
      x: agent.x,
      y: agent.y,
      isAvailable: true,
      ownerId: undefined,
    });

    await ctx.db.patch(agentId, {
      vehicleId: undefined,
      isInVehicle: false,
    });

    await ctx.db.insert("gameActivity", {
      type: "event",
      agentId: agent._id,
      agentName: agent.name,
      message: `${agent.name} exited their ${vehicle.type}`,
      timestamp: Date.now(),
    });
  },
});

// Update vehicle positions to follow their owners
export const updateVehicles = mutation({
  handler: async (ctx) => {
    const vehicles = await ctx.db.query("gameVehicles").collect();
    
    for (const vehicle of vehicles) {
      if (!vehicle.isAvailable && vehicle.ownerId) {
        const owner = await ctx.db.get(vehicle.ownerId);
        if (owner && owner.isInVehicle) {
          // Move vehicle to owner's position
          await ctx.db.patch(vehicle._id, {
            x: owner.x,
            y: owner.y,
          });
        }
      }
    }
  },
});