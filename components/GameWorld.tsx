"use client";

import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

interface GameWorldProps {
  className?: string;
}

export default function GameWorld({ className }: GameWorldProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  
  const agents = useQuery(api.agents.getAllAgents);
  const worldLocations = useQuery(api.world.getWorldLocations);
  
  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize Pixi.js application
    const app = new PIXI.Application();
    appRef.current = app;

    const init = async () => {
      await app.init({
        width: 500,
        height: 500,
        backgroundColor: '#0a0a0a',
        antialias: true,
      });

      canvasRef.current?.appendChild(app.canvas);
    };

    init();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, []);

  // Update world when data changes
  useEffect(() => {
    if (!appRef.current || !worldLocations || !agents) return;

    const app = appRef.current;
    app.stage.removeChildren();

    // Draw world boundary
    const boundary = new PIXI.Graphics();
    boundary.rect(0, 0, 500, 500);
    boundary.stroke({ width: 2, color: '#374151' });
    app.stage.addChild(boundary);

    // Draw world locations
    worldLocations.forEach((location) => {
      const graphics = new PIXI.Graphics();
      
      // Set color based on type
      let color = location.color;
      
      graphics.rect(location.x, location.y, location.width, location.height);
      graphics.fill(color);
      
      if (location.isInteractable) {
        graphics.stroke({ width: 1, color: '#ffffff', alpha: 0.3 });
      }
      
      app.stage.addChild(graphics);

      // Add location label
      const text = new PIXI.Text({
        text: location.name,
        style: {
          fontFamily: 'Arial',
          fontSize: 10,
          fill: '#ffffff',
          align: 'center',
        }
      });
      text.anchor.set(0.5);
      text.x = location.x + location.width / 2;
      text.y = location.y - 12;
      app.stage.addChild(text);
    });

    // Draw agents
    agents.forEach((agent) => {
      const agentGraphics = new PIXI.Graphics();
      
      // Agent body
      agentGraphics.circle(agent.x, agent.y, 8);
      agentGraphics.fill(agent.avatarColor);
      agentGraphics.stroke({ width: 2, color: '#ffffff', alpha: 0.8 });
      
      app.stage.addChild(agentGraphics);

      // Agent name
      const nameText = new PIXI.Text({
        text: agent.name,
        style: {
          fontFamily: 'Arial',
          fontSize: 12,
          fill: '#ffffff',
          align: 'center',
        }
      });
      nameText.anchor.set(0.5);
      nameText.x = agent.x;
      nameText.y = agent.y - 20;
      app.stage.addChild(nameText);

      // Movement indicator
      if (agent.isMoving && agent.targetX && agent.targetY) {
        const targetIndicator = new PIXI.Graphics();
        targetIndicator.circle(agent.targetX, agent.targetY, 4);
        targetIndicator.fill('#ffffff');
        targetIndicator.alpha = 0.5;
        app.stage.addChild(targetIndicator);

        // Movement line
        const line = new PIXI.Graphics();
        line.moveTo(agent.x, agent.y);
        line.lineTo(agent.targetX, agent.targetY);
        line.stroke({ width: 1, color: agent.avatarColor, alpha: 0.6 });
        app.stage.addChild(line);
      }
    });

  }, [worldLocations, agents]);

  return (
    <div className={`relative ${className}`}>
      <div 
        ref={canvasRef} 
        className="border border-zinc-700 rounded-lg overflow-hidden"
        style={{ width: '500px', height: '500px' }}
      />
      <div className="absolute top-2 left-2 bg-black/50 rounded px-2 py-1">
        <h3 className="text-sm font-semibold text-zinc-100">The Workshop</h3>
        <p className="text-xs text-zinc-400">{agents?.length || 0} agents online</p>
      </div>
    </div>
  );
}