"use client";

import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Doc } from "../convex/_generated/dataModel";

interface HUDProps {
  selectedAgent?: Doc<"gameAgents"> | null;
  onAgentSelect?: (agent: Doc<"gameAgents"> | null) => void;
  cameraX: number;
  cameraY: number;
  worldZoom: number;
}

export default function HUD({ selectedAgent, onAgentSelect, cameraX, cameraY, worldZoom }: HUDProps) {
  const minimapRef = useRef<HTMLDivElement>(null);
  const minimapAppRef = useRef<PIXI.Application | null>(null);
  
  const agents = useQuery(api.agents.getAllAgents);
  const worldLocations = useQuery(api.world.getWorldLocations);
  
  // Initialize minimap
  useEffect(() => {
    if (!minimapRef.current || typeof window === 'undefined') return;

    let destroyed = false;
    const app = new PIXI.Application();

    const init = async () => {
      try {
        await app.init({
          width: 200,
          height: 200,
          backgroundColor: '#000000',
          antialias: false,
        });
        if (destroyed || !minimapRef.current) return;
        minimapRef.current.appendChild(app.canvas);
        minimapAppRef.current = app;
      } catch (e) {
        console.error('Minimap init error:', e);
      }
    };

    init();

    return () => {
      destroyed = true;
      if (minimapAppRef.current) {
        minimapAppRef.current.destroy(true);
        minimapAppRef.current = null;
      }
    };
  }, []);

  // Update minimap
  useEffect(() => {
    if (!minimapAppRef.current || !worldLocations || !agents) return;

    const app = minimapAppRef.current;
    try {
      app.stage.removeChildren();

    // Minimap scale: 2500x2500 world -> 200x200 minimap
    const scale = 200 / 2500;

    // Draw world boundary
    const boundary = new PIXI.Graphics();
    boundary.rect(0, 0, 200, 200);
    boundary.stroke({ width: 1, color: '#374151' });
    app.stage.addChild(boundary);

    // Draw districts as colored regions
    const districts = [
      { name: "Downtown", x: 1000, y: 1000, w: 500, h: 500, color: 0x3b82f6 },
      { name: "Industrial", x: 0, y: 0, w: 750, h: 750, color: 0x6b7280 },
      { name: "Docks", x: 750, y: 1750, w: 1000, h: 750, color: 0x0c4a6e },
      { name: "Hills", x: 1750, y: 0, w: 750, h: 750, color: 0x22c55e },
      { name: "Workshop", x: 0, y: 1750, w: 750, h: 750, color: 0xf59e0b },
    ];

    districts.forEach(district => {
      const graphics = new PIXI.Graphics();
      graphics.rect(district.x * scale, district.y * scale, district.w * scale, district.h * scale);
      graphics.fill({ color: district.color, alpha: 0.2 });
      graphics.stroke({ width: 1, color: district.color, alpha: 0.5 });
      app.stage.addChild(graphics);
    });

    // Draw major buildings as tiny squares
    worldLocations.forEach((location) => {
      if (location.type === "building") {
        const building = new PIXI.Graphics();
        building.rect(location.x * scale - 1, location.y * scale - 1, 2, 2);
        building.fill(0xffffff);
        app.stage.addChild(building);
      }
    });

    // Draw agents as colored dots
    agents.forEach((agent) => {
      const dot = new PIXI.Graphics();
      dot.circle(agent.x * scale, agent.y * scale, 3);
      dot.fill(agent.avatarColor);
      if (selectedAgent && selectedAgent._id === agent._id) {
        dot.stroke({ width: 2, color: '#ffffff' });
      }
      app.stage.addChild(dot);
    });

    // Draw camera viewport
    const viewportSize = 500 / worldZoom; // Viewport size in world coordinates
    const viewport = new PIXI.Graphics();
    viewport.rect(
      (cameraX - viewportSize/2) * scale, 
      (cameraY - viewportSize/2) * scale, 
      viewportSize * scale, 
      viewportSize * scale
    );
    viewport.stroke({ width: 2, color: '#ffffff', alpha: 0.8 });
    app.stage.addChild(viewport);
    
    } catch (error) {
      console.error("Error updating minimap:", error);
    }

  }, [worldLocations, agents, selectedAgent, cameraX, cameraY, worldZoom]);

  // Calculate total money across all agents
  const totalMoney = agents?.reduce((sum, agent) => sum + (agent.coins || 0), 0) || 0;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Minimap - Bottom Left */}
      <div className="absolute bottom-4 left-4 pointer-events-auto">
        <div className="bg-black/80 border border-zinc-600 rounded-lg p-2">
          <h4 className="text-xs font-semibold text-zinc-100 mb-1">CITY MAP</h4>
          <div 
            ref={minimapRef} 
            className="border border-zinc-600 rounded overflow-hidden"
            style={{ width: '200px', height: '200px' }}
          />
          <div className="text-xs text-zinc-400 mt-1">
            Zoom: {worldZoom.toFixed(1)}x
          </div>
        </div>
      </div>

      {/* Money Counter - Top Right */}
      <div className="absolute top-4 right-4 pointer-events-auto">
        <div className="bg-black/80 border border-green-600 rounded-lg px-4 py-2">
          <div className="text-sm text-zinc-400">TOTAL ECONOMY</div>
          <div className="text-2xl font-bold text-green-400">
            ${totalMoney.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Current Event Banner - Top Left */}
      <div className="absolute top-4 left-4 pointer-events-auto">
        <div className="bg-black/80 border border-blue-600 rounded-lg px-4 py-2 max-w-md">
          <div className="text-sm text-blue-400 font-semibold">🏙️ LIVE FEED</div>
          <div className="text-sm text-zinc-100">
            {agents?.length || 0} agents active across 5 districts
          </div>
        </div>
      </div>

      {/* Selected Agent Info - Bottom Center */}
      {selectedAgent && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
          <div className="bg-black/90 border border-zinc-600 rounded-lg px-6 py-3 min-w-96">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded-full border-2 border-white"
                  style={{ backgroundColor: selectedAgent.avatarColor }}
                />
                <span className="font-bold text-zinc-100 text-lg">{selectedAgent.name}</span>
                {/* Wanted stars */}
                {selectedAgent.wantedLevel && selectedAgent.wantedLevel > 0 && (
                  <div className="text-yellow-400">
                    {'⭐'.repeat(Math.floor(selectedAgent.wantedLevel))}
                  </div>
                )}
              </div>
              <button 
                onClick={() => onAgentSelect?.(null)}
                className="text-zinc-400 hover:text-zinc-100"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-zinc-400">Coins</div>
                <div className="text-green-400 font-semibold">${selectedAgent.coins}</div>
              </div>
              <div>
                <div className="text-zinc-400">Reputation</div>
                <div className="text-blue-400 font-semibold">{selectedAgent.reputation}</div>
              </div>
              <div>
                <div className="text-zinc-400">Energy</div>
                <div className="text-yellow-400 font-semibold">{selectedAgent.energy || 100}%</div>
              </div>
            </div>

            {selectedAgent.currentMission && (
              <div className="mt-2 pt-2 border-t border-zinc-700">
                <div className="text-xs text-zinc-400">ACTIVE MISSION</div>
                <div className="text-sm text-zinc-100">In progress...</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}