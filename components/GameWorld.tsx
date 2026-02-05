"use client";

import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Doc } from "../convex/_generated/dataModel";
import DialogueBubble from "./DialogueBubble";
import HUD from "./HUD";

interface GameWorldProps {
  className?: string;
}

export default function GameWorld({ className }: GameWorldProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const viewportRef = useRef<Viewport | null>(null);
  
  const [selectedAgent, setSelectedAgent] = useState<Doc<"gameAgents"> | null>(null);
  const [cameraX, setCameraX] = useState(1250); // Start in downtown
  const [cameraY, setCameraY] = useState(1250);
  const [worldZoom, setWorldZoom] = useState(1.0);
  
  const agents = useQuery(api.agents.getAllAgents);
  const worldLocations = useQuery(api.world.getWorldLocations);
  const activeDialogue = useQuery(api.dialogue.getActiveDialogue);
  const security = useQuery(api.wanted.getAllSecurity);
  const vehicles = useQuery(api.vehicles.getAllVehicles);
  
  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize Pixi.js application
    const app = new PIXI.Application();
    appRef.current = app;

    const init = async () => {
      await app.init({
        width: 800,
        height: 600,
        backgroundColor: '#0a0a0a',
        antialias: true,
      });

      canvasRef.current?.appendChild(app.canvas);

      // Create viewport for camera controls
      const viewport = new Viewport({
        screenWidth: 800,
        screenHeight: 600,
        worldWidth: 2500,
        worldHeight: 2500,
        interaction: app.renderer.events,
      });

      app.stage.addChild(viewport);
      viewportRef.current = viewport;

      // Add viewport controls
      viewport
        .drag()
        .pinch()
        .wheel()
        .decelerate()
        .clamp({
          left: 0,
          top: 0,
          right: 2500,
          bottom: 2500
        });

      // Center camera on downtown initially
      viewport.moveCenter(1250, 1250);

      // Update camera position tracking
      viewport.on('moved', () => {
        setCameraX(viewport.center.x);
        setCameraY(viewport.center.y);
        setWorldZoom(viewport.scaled);
      });
    };

    init();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
        viewportRef.current = null;
      }
    };
  }, []);

  // Update world when data changes
  useEffect(() => {
    if (!viewportRef.current || !worldLocations || !agents) return;

    const viewport = viewportRef.current;
    viewport.removeChildren();

    // Draw world boundary
    const boundary = new PIXI.Graphics();
    boundary.rect(0, 0, 2500, 2500);
    boundary.stroke({ width: 4, color: '#374151' });
    viewport.addChild(boundary);

    // Draw district backgrounds
    const districts = [
      { name: "Downtown", x: 1000, y: 1000, w: 500, h: 500, color: 0x1e40af, alpha: 0.1 },
      { name: "Industrial", x: 0, y: 0, w: 750, h: 750, color: 0x6b7280, alpha: 0.1 },
      { name: "Docks", x: 750, y: 1750, w: 1000, h: 750, color: 0x0c4a6e, alpha: 0.1 },
      { name: "Hills", x: 1750, y: 0, w: 750, h: 750, color: 0x22c55e, alpha: 0.1 },
      { name: "Workshop", x: 0, y: 1750, w: 750, h: 750, color: 0xf59e0b, alpha: 0.1 },
    ];

    districts.forEach(district => {
      const bg = new PIXI.Graphics();
      bg.rect(district.x, district.y, district.w, district.h);
      bg.fill({ color: district.color, alpha: district.alpha });
      bg.stroke({ width: 2, color: district.color, alpha: 0.3 });
      viewport.addChild(bg);

      // District label
      const label = new PIXI.Text({
        text: district.name.toUpperCase(),
        style: {
          fontFamily: 'Arial',
          fontSize: 24,
          fill: district.color,
          fontWeight: 'bold',
          align: 'center',
        }
      });
      label.anchor.set(0.5);
      label.x = district.x + district.w / 2;
      label.y = district.y + 30;
      label.alpha = 0.6;
      viewport.addChild(label);
    });

    // Draw world locations
    worldLocations.forEach((location: Doc<"gameWorld">) => {
      const graphics = new PIXI.Graphics();
      
      graphics.rect(location.x, location.y, location.width, location.height);
      graphics.fill(location.color);
      
      if (location.isInteractable) {
        graphics.stroke({ width: 2, color: '#ffffff', alpha: 0.5 });
      }
      
      viewport.addChild(graphics);

      // Add location label
      const text = new PIXI.Text({
        text: location.name,
        style: {
          fontFamily: 'Arial',
          fontSize: 14,
          fill: '#ffffff',
          align: 'center',
        }
      });
      text.anchor.set(0.5);
      text.x = location.x + location.width / 2;
      text.y = location.y - 20;
      viewport.addChild(text);
    });

    // Draw vehicles
    vehicles?.forEach((vehicle) => {
      if (vehicle.isAvailable) {
        const vehicleGraphics = new PIXI.Graphics();
        // Vehicles are rectangles, slightly larger than agents
        vehicleGraphics.rect(vehicle.x - 15, vehicle.y - 10, 30, 20);
        vehicleGraphics.fill(vehicle.color);
        vehicleGraphics.stroke({ width: 2, color: '#ffffff', alpha: 0.7 });
        viewport.addChild(vehicleGraphics);

        // Vehicle type icon
        const typeIcon = vehicle.type === "sports" ? "🏎️" : vehicle.type === "van" ? "🚐" : "🚗";
        const vehicleText = new PIXI.Text({
          text: typeIcon,
          style: {
            fontFamily: 'Arial',
            fontSize: 16,
            align: 'center',
          }
        });
        vehicleText.anchor.set(0.5);
        vehicleText.x = vehicle.x;
        vehicleText.y = vehicle.y;
        viewport.addChild(vehicleText);
      }
    });

    // Draw agents
    agents.forEach((agent: Doc<"gameAgents">) => {
      // Create interactive agent container
      const agentContainer = new PIXI.Container();
      agentContainer.x = agent.x;
      agentContainer.y = agent.y;
      agentContainer.eventMode = 'static';
      agentContainer.cursor = 'pointer';

      // Agent body - different rendering if in vehicle
      if (agent.isInVehicle && agent.vehicleId) {
        // Agent in vehicle - show as larger rectangle (vehicle)
        const vehicleGraphics = new PIXI.Graphics();
        vehicleGraphics.rect(-15, -10, 30, 20);
        vehicleGraphics.fill(agent.avatarColor);
        vehicleGraphics.stroke({ width: 3, color: selectedAgent?._id === agent._id ? '#ffffff' : '#000000', alpha: 0.8 });
        agentContainer.addChild(vehicleGraphics);
      } else {
        // Agent on foot - show as circle
        const agentGraphics = new PIXI.Graphics();
        agentGraphics.circle(0, 0, 12);
        agentGraphics.fill(agent.avatarColor);
        
        const strokeColor = selectedAgent?._id === agent._id ? '#ffffff' : '#000000';
        const strokeWidth = selectedAgent?._id === agent._id ? 3 : 2;
        agentGraphics.stroke({ width: strokeWidth, color: strokeColor, alpha: 0.8 });
        agentContainer.addChild(agentGraphics);
      }

      // Energy bar above agent
      if (agent.energy !== undefined) {
        const energyBarWidth = 24;
        const energyBarHeight = 4;
        const energyPercent = agent.energy / 100;
        
        // Background bar
        const energyBg = new PIXI.Graphics();
        energyBg.rect(-energyBarWidth / 2, -45, energyBarWidth, energyBarHeight);
        energyBg.fill('#374151');
        agentContainer.addChild(energyBg);
        
        // Energy fill
        const energyFill = new PIXI.Graphics();
        energyFill.rect(-energyBarWidth / 2, -45, energyBarWidth * energyPercent, energyBarHeight);
        
        // Color based on energy level
        let energyColor = '#10b981'; // Green
        if (agent.energy < 50) energyColor = '#f59e0b'; // Yellow
        if (agent.energy < 25) energyColor = '#ef4444'; // Red
        
        energyFill.fill(energyColor);
        agentContainer.addChild(energyFill);
      }

      // Agent name with wanted stars
      const wantedStars = agent.wantedLevel && agent.wantedLevel > 0 
        ? ' ' + '⭐'.repeat(Math.floor(agent.wantedLevel))
        : '';
      
      const nameText = new PIXI.Text({
        text: agent.name + wantedStars,
        style: {
          fontFamily: 'Arial',
          fontSize: 14,
          fill: agent.wantedLevel && agent.wantedLevel >= 3 ? '#ef4444' : '#ffffff',
          align: 'center',
          stroke: { color: '#000000', width: 2 },
        }
      });
      nameText.anchor.set(0.5);
      nameText.y = -35;
      agentContainer.addChild(nameText);

      // Click handler for agent selection
      agentContainer.on('pointerdown', (event: any) => {
        event.stopPropagation();
        setSelectedAgent(selectedAgent?._id === agent._id ? null : agent);
        
        // Follow agent when selected
        if (selectedAgent?._id !== agent._id && viewportRef.current) {
          viewportRef.current.animate({
            time: 1000,
            position: { x: agent.x, y: agent.y },
            ease: 'easeInOutQuart'
          });
        }
      });

      viewport.addChild(agentContainer);

      // Movement indicator
      if (agent.isMoving && agent.targetX && agent.targetY) {
        const targetIndicator = new PIXI.Graphics();
        targetIndicator.circle(agent.targetX, agent.targetY, 6);
        targetIndicator.fill('#ffffff');
        targetIndicator.alpha = 0.6;
        viewport.addChild(targetIndicator);

        // Movement line with trail effect
        const line = new PIXI.Graphics();
        line.moveTo(agent.x, agent.y);
        line.lineTo(agent.targetX, agent.targetY);
        line.stroke({ width: 3, color: agent.avatarColor, alpha: 0.5 });
        viewport.addChild(line);
      }
    });

    // Draw security NPCs
    security?.forEach((sec) => {
      const securityGraphics = new PIXI.Graphics();
      securityGraphics.circle(sec.x, sec.y, 10);
      securityGraphics.fill('#ef4444'); // Red for security
      securityGraphics.stroke({ width: 2, color: '#ffffff', alpha: 0.9 });
      viewport.addChild(securityGraphics);

      // Security label
      const secText = new PIXI.Text({
        text: "SEC",
        style: {
          fontFamily: 'Arial',
          fontSize: 10,
          fill: '#ffffff',
          align: 'center',
          fontWeight: 'bold',
        }
      });
      secText.anchor.set(0.5);
      secText.x = sec.x;
      secText.y = sec.y - 20;
      viewport.addChild(secText);

      // Chase line to target
      if (sec.targetX && sec.targetY) {
        const chaseLine = new PIXI.Graphics();
        chaseLine.moveTo(sec.x, sec.y);
        chaseLine.lineTo(sec.targetX, sec.targetY);
        chaseLine.stroke({ width: 2, color: '#ef4444', alpha: 0.6 });
        viewport.addChild(chaseLine);
      }
    });

  }, [worldLocations, agents, selectedAgent, security, vehicles]);

  // Follow selected agent
  useEffect(() => {
    if (selectedAgent && viewportRef.current) {
      const followAgent = () => {
        if (selectedAgent && viewportRef.current) {
          const agent = agents?.find(a => a._id === selectedAgent._id);
          if (agent) {
            viewportRef.current.animate({
              time: 500,
              position: { x: agent.x, y: agent.y },
              ease: 'easeOutQuart'
            });
          }
        }
      };

      const interval = setInterval(followAgent, 2000); // Follow every 2 seconds
      return () => clearInterval(interval);
    }
  }, [selectedAgent, agents]);

  return (
    <div className={`relative ${className}`}>
      <div 
        ref={canvasRef} 
        className="border border-zinc-700 rounded-lg overflow-hidden"
        style={{ width: '800px', height: '600px' }}
      />
      
      {/* GTA-Style HUD */}
      <HUD 
        selectedAgent={selectedAgent}
        onAgentSelect={setSelectedAgent}
        cameraX={cameraX}
        cameraY={cameraY}
        worldZoom={worldZoom}
      />
      
      {/* Dialogue bubbles overlay - need to transform coordinates */}
      {activeDialogue?.map((dialogue) => {
        // Transform world coordinates to screen coordinates
        if (!viewportRef.current) return null;
        
        const screenPos = viewportRef.current.toScreen(dialogue.x, dialogue.y);
        
        return (
          <DialogueBubble
            key={dialogue._id}
            message={dialogue.message}
            x={screenPos.x}
            y={screenPos.y}
            agentName={dialogue.agentName}
            duration={dialogue.expiresAt - Date.now()}
          />
        );
      })}
      
      <div className="absolute top-2 left-2 bg-black/70 rounded px-3 py-2 border border-zinc-600">
        <h3 className="text-sm font-semibold text-zinc-100">GTA-Style AI Agent City</h3>
        <p className="text-xs text-zinc-400">{agents?.length || 0} agents across 5 districts</p>
        <div className="text-xs text-zinc-500 mt-1">
          Camera: ({cameraX.toFixed(0)}, {cameraY.toFixed(0)}) | Zoom: {worldZoom.toFixed(1)}x
        </div>
      </div>
    </div>
  );
}