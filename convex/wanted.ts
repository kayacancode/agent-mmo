import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Update wanted levels for all agents
export const updateWantedSystem = mutation({
  handler: async (ctx) => {
    const agents = await ctx.db.query("gameAgents").collect();
    const now = Date.now();

    for (const agent of agents) {
      if (!agent.isOnline) continue;

      const wantedLevel = agent.wantedLevel || 0;
      const lastUpdate = agent.lastWantedUpdate || now;
      const timeDelta = now - lastUpdate;

      // Decrease wanted level over time (heat cools down)
      if (wantedLevel > 0 && timeDelta > 30000) { // 30 seconds
        const newWantedLevel = Math.max(0, wantedLevel - 0.5);
        
        await ctx.db.patch(agent._id, {
          wantedLevel: newWantedLevel,
          lastWantedUpdate: now,
          isBeingChased: newWantedLevel >= 3,
        });

        // Log wanted level decrease
        if (Math.floor(newWantedLevel) < Math.floor(wantedLevel)) {
          await ctx.db.insert("gameActivity", {
            type: "event",
            agentId: agent._id,
            agentName: agent.name,
            message: `${agent.name} cooled down to ${Math.floor(newWantedLevel)} wanted stars`,
            timestamp: now,
          });
        }
      }
    }
  },
});

// Increase wanted level for an agent
export const addHeat = mutation({
  args: {
    agentId: v.id("gameAgents"),
    heatAmount: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, { agentId, heatAmount, reason }) => {
    const agent = await ctx.db.get(agentId);
    if (!agent) return;

    const currentWanted = agent.wantedLevel || 0;
    const newWantedLevel = Math.min(5, currentWanted + heatAmount);
    
    await ctx.db.patch(agentId, {
      wantedLevel: newWantedLevel,
      lastWantedUpdate: Date.now(),
      isBeingChased: newWantedLevel >= 3,
    });

    // Create activity log
    await ctx.db.insert("gameActivity", {
      type: "event",
      agentId: agent._id,
      agentName: agent.name,
      message: `${agent.name} gained heat: ${reason} (${Math.floor(newWantedLevel)} stars)`,
      timestamp: Date.now(),
    });

    // Spawn security if wanted level is high enough
    if (newWantedLevel >= 3) {
      await spawnSecurity(ctx, agent);
    }
  },
});

// Spawn security NPCs to chase wanted agents
async function spawnSecurity(ctx: any, agent: any) {
  const existingSecurity = await ctx.db
    .query("gameSecurity")
    .filter((q: any) => q.eq(q.field("targetAgentId"), agent._id))
    .collect();

  // Don't spawn more security if already chasing
  if (existingSecurity.length > 0) return;

  // Spawn 1-3 security NPCs based on wanted level
  const securityCount = Math.min(3, Math.floor((agent.wantedLevel || 0)));
  
  for (let i = 0; i < securityCount; i++) {
    // Spawn near agent but not too close
    const angle = (Math.PI * 2 * i) / securityCount;
    const distance = 100 + Math.random() * 50;
    const spawnX = agent.x + Math.cos(angle) * distance;
    const spawnY = agent.y + Math.sin(angle) * distance;

    await ctx.db.insert("gameSecurity", {
      x: spawnX,
      y: spawnY,
      targetAgentId: agent._id,
      targetX: agent.x,
      targetY: agent.y,
      isChasing: true,
      speed: 1.5, // Faster than walking agents
      spawnedAt: Date.now(),
      despawnAt: Date.now() + 60000, // Despawn after 1 minute
    });
  }
}

// Update security NPC movement and behavior
export const updateSecurity = mutation({
  handler: async (ctx) => {
    const securityNPCs = await ctx.db.query("gameSecurity").collect();
    const now = Date.now();

    for (const security of securityNPCs) {
      // Remove expired security
      if (now > security.despawnAt) {
        await ctx.db.delete(security._id);
        continue;
      }

      // Get target agent
      const target = security.targetAgentId 
        ? await ctx.db.get(security.targetAgentId)
        : null;

      if (!target || !target.isOnline || (target.wantedLevel || 0) < 3) {
        // Target is gone or no longer wanted, despawn
        await ctx.db.delete(security._id);
        continue;
      }

      // Move towards target
      const dx = target.x - security.x;
      const dy = target.y - security.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 5) {
        // Move towards target
        const moveDistance = security.speed;
        const newX = security.x + (dx / distance) * moveDistance;
        const newY = security.y + (dy / distance) * moveDistance;

        // Clamp to world bounds
        const clampedX = Math.max(0, Math.min(2500, newX));
        const clampedY = Math.max(0, Math.min(2500, newY));

        await ctx.db.patch(security._id, {
          x: clampedX,
          y: clampedY,
          targetX: target.x,
          targetY: target.y,
        });
      } else {
        // Caught the agent!
        await catchAgent(ctx, target, security);
      }
    }
  },
});

// Handle when security catches an agent
async function catchAgent(ctx: any, agent: any, security: any) {
  // Penalties for being caught
  const coinLoss = Math.floor(agent.coins * 0.1); // Lose 10% of coins
  const newCoins = Math.max(0, agent.coins - coinLoss);

  // Reset wanted level and teleport to spawn
  await ctx.db.patch(agent._id, {
    coins: newCoins,
    wantedLevel: 0,
    lastWantedUpdate: Date.now(),
    isBeingChased: false,
    x: 350, // Workshop spawn
    y: 1850,
    targetX: undefined,
    targetY: undefined,
    isMoving: false,
  });

  // Remove this security NPC
  await ctx.db.delete(security._id);

  // Remove all other security chasing this agent
  const otherSecurity = await ctx.db
    .query("gameSecurity")
    .filter((q: any) => q.eq(q.field("targetAgentId"), agent._id))
    .collect();
  
  for (const sec of otherSecurity) {
    await ctx.db.delete(sec._id);
  }

  // Create activity log
  await ctx.db.insert("gameActivity", {
    type: "event",
    agentId: agent._id,
    agentName: agent.name,
    message: `${agent.name} was busted by security! Lost $${coinLoss} and reset to spawn`,
    timestamp: Date.now(),
  });
}

// Get all security NPCs for rendering
export const getAllSecurity = query({
  handler: async (ctx) => {
    return await ctx.db.query("gameSecurity").collect();
  },
});

// Visit safe house to reduce heat
export const visitSafeHouse = mutation({
  args: {
    agentId: v.id("gameAgents"),
    district: v.string(),
  },
  handler: async (ctx, { agentId, district }) => {
    const agent = await ctx.db.get(agentId);
    if (!agent || (agent.wantedLevel || 0) === 0) return;

    // Safe houses in different districts reduce heat at different rates
    const heatReduction = district === "Hills" ? 2 : 1;
    const newWantedLevel = Math.max(0, (agent.wantedLevel || 0) - heatReduction);

    await ctx.db.patch(agentId, {
      wantedLevel: newWantedLevel,
      lastWantedUpdate: Date.now(),
      isBeingChased: newWantedLevel >= 3,
    });

    await ctx.db.insert("gameActivity", {
      type: "event",
      agentId: agent._id,
      agentName: agent.name,
      message: `${agent.name} cooled down at a ${district} safe house (${Math.floor(newWantedLevel)} stars)`,
      timestamp: Date.now(),
    });
  },
});