"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Doc } from "../convex/_generated/dataModel";
import HUD from "./HUD";

const WORLD_WIDTH = 2500;
const WORLD_HEIGHT = 2500;
const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 600;

export default function GameWorld({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const worldContainerRef = useRef<PIXI.Container | null>(null);

  const [selectedAgent, setSelectedAgent] = useState<Doc<"gameAgents"> | null>(null);
  const [cameraX, setCameraX] = useState(1250);
  const [cameraY, setCameraY] = useState(1250);
  const [zoom, setZoom] = useState(0.4);

  const agents = useQuery(api.agents.getAllAgents);
  const worldLocations = useQuery(api.world.getWorldLocations);
  const activeDialogue = useQuery(api.dialogue.getActiveDialogue);
  const security = useQuery(api.wanted.getAllSecurity);
  const vehicles = useQuery(api.vehicles.getAllVehicles);

  // Camera helpers
  const clampCamera = useCallback((x: number, y: number, z: number) => {
    const halfW = (SCREEN_WIDTH / 2) / z;
    const halfH = (SCREEN_HEIGHT / 2) / z;
    return {
      x: Math.max(halfW, Math.min(WORLD_WIDTH - halfW, x)),
      y: Math.max(halfH, Math.min(WORLD_HEIGHT - halfH, y)),
    };
  }, []);

  // Init Pixi
  useEffect(() => {
    if (!canvasRef.current || typeof window === 'undefined') return;
    let destroyed = false;
    const app = new PIXI.Application();
    appRef.current = app;

    const init = async () => {
      try {
        await app.init({
          width: SCREEN_WIDTH,
          height: SCREEN_HEIGHT,
          backgroundColor: '#0a0a0a',
          antialias: true,
        });
        if (destroyed || !canvasRef.current) return;
        canvasRef.current.appendChild(app.canvas);

        const world = new PIXI.Container();
        app.stage.addChild(world);
        worldContainerRef.current = world;

      // Drag handling
      let dragging = false;
      let lastX = 0;
      let lastY = 0;

      app.canvas.addEventListener('pointerdown', (e) => {
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
      });
      app.canvas.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        setCameraX(prev => {
          const clamped = clampCamera(prev - dx / zoom, cameraY, zoom);
          return clamped.x;
        });
        setCameraY(prev => {
          const clamped = clampCamera(cameraX, prev - dy / zoom, zoom);
          return clamped.y;
        });
      });
      app.canvas.addEventListener('pointerup', () => { dragging = false; });
      app.canvas.addEventListener('pointerleave', () => { dragging = false; });

        // Zoom
        app.canvas.addEventListener('wheel', (e) => {
          e.preventDefault();
          setZoom(prev => Math.max(0.15, Math.min(2, prev + (e.deltaY > 0 ? -0.05 : 0.05))));
        }, { passive: false });
      } catch (e) {
        console.error('GameWorld init error:', e);
      }
    };
    init();

    return () => {
      destroyed = true;
      appRef.current?.destroy(true);
      appRef.current = null;
      worldContainerRef.current = null;
    };
  }, []);

  // Apply camera transform
  useEffect(() => {
    const world = worldContainerRef.current;
    if (!world) return;
    world.scale.set(zoom);
    world.x = SCREEN_WIDTH / 2 - cameraX * zoom;
    world.y = SCREEN_HEIGHT / 2 - cameraY * zoom;
  }, [cameraX, cameraY, zoom]);

  // Follow selected agent
  useEffect(() => {
    if (!selectedAgent || !agents) return;
    const agent = agents.find(a => a._id === selectedAgent._id);
    if (agent) {
      setCameraX(agent.x);
      setCameraY(agent.y);
    }
  }, [selectedAgent, agents]);

  // Render world
  useEffect(() => {
    const world = worldContainerRef.current;
    if (!world || !worldLocations || !agents) return;
    
    try {
      world.removeChildren();

    // World boundary
    const boundary = new PIXI.Graphics();
    boundary.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    boundary.fill({ color: '#0a0a0a' });
    boundary.stroke({ width: 4, color: '#374151' });
    world.addChild(boundary);

    // District backgrounds
    const districts = [
      { name: "DOWNTOWN", x: 1000, y: 1000, w: 500, h: 500, color: 0x1e40af },
      { name: "INDUSTRIAL", x: 0, y: 0, w: 750, h: 750, color: 0x6b7280 },
      { name: "THE DOCKS", x: 750, y: 1750, w: 1000, h: 750, color: 0x0c4a6e },
      { name: "THE HILLS", x: 1750, y: 0, w: 750, h: 750, color: 0x22c55e },
      { name: "WORKSHOP", x: 0, y: 1750, w: 750, h: 750, color: 0xf59e0b },
    ];

    districts.forEach(d => {
      const bg = new PIXI.Graphics();
      bg.rect(d.x, d.y, d.w, d.h);
      bg.fill({ color: d.color, alpha: 0.08 });
      bg.stroke({ width: 2, color: d.color, alpha: 0.25 });
      world.addChild(bg);

      const label = new PIXI.Text({
        text: d.name,
        style: { fontFamily: 'monospace', fontSize: 22, fill: d.color, fontWeight: 'bold' },
      });
      label.anchor.set(0.5);
      label.x = d.x + d.w / 2;
      label.y = d.y + 30;
      label.alpha = 0.5;
      world.addChild(label);
    });

    // Grid lines
    const grid = new PIXI.Graphics();
    for (let i = 0; i <= WORLD_WIDTH; i += 250) {
      grid.moveTo(i, 0); grid.lineTo(i, WORLD_HEIGHT);
      grid.moveTo(0, i); grid.lineTo(WORLD_WIDTH, i);
    }
    grid.stroke({ width: 1, color: '#ffffff', alpha: 0.03 });
    world.addChild(grid);

    // Buildings
    worldLocations.forEach((loc: Doc<"gameWorld">) => {
      const g = new PIXI.Graphics();
      g.roundRect(loc.x, loc.y, loc.width, loc.height, 4);
      g.fill(loc.color);
      if (loc.isInteractable) g.stroke({ width: 2, color: '#ffffff', alpha: 0.4 });
      world.addChild(g);

      const t = new PIXI.Text({
        text: loc.name,
        style: { fontFamily: 'Arial', fontSize: 12, fill: '#ffffff' },
      });
      t.anchor.set(0.5);
      t.x = loc.x + loc.width / 2;
      t.y = loc.y - 16;
      world.addChild(t);
    });

    // Vehicles (available ones)
    vehicles?.forEach(v => {
      if (!v.isAvailable) return;
      const vg = new PIXI.Graphics();
      vg.roundRect(v.x - 12, v.y - 8, 24, 16, 3);
      vg.fill(v.color);
      vg.stroke({ width: 1, color: '#ffffff', alpha: 0.5 });
      world.addChild(vg);

      const icon = v.type === "sports" ? "🏎️" : v.type === "van" ? "🚐" : "🚗";
      const vt = new PIXI.Text({ text: icon, style: { fontSize: 14 } });
      vt.anchor.set(0.5);
      vt.x = v.x;
      vt.y = v.y;
      world.addChild(vt);
    });

    // Security NPCs
    security?.forEach(sec => {
      const sg = new PIXI.Graphics();
      sg.circle(sec.x, sec.y, 10);
      sg.fill('#ef4444');
      sg.stroke({ width: 2, color: '#ffffff', alpha: 0.9 });
      world.addChild(sg);

      const st = new PIXI.Text({
        text: "🚔",
        style: { fontSize: 14 },
      });
      st.anchor.set(0.5);
      st.x = sec.x;
      st.y = sec.y - 18;
      world.addChild(st);

      if (sec.targetX && sec.targetY) {
        const cl = new PIXI.Graphics();
        cl.moveTo(sec.x, sec.y);
        cl.lineTo(sec.targetX, sec.targetY);
        cl.stroke({ width: 2, color: '#ef4444', alpha: 0.4 });
        world.addChild(cl);
      }
    });

    // Agents
    agents.forEach((agent: Doc<"gameAgents">) => {
      const isSelected = selectedAgent?._id === agent._id;

      // Movement trail
      if (agent.isMoving && agent.targetX && agent.targetY) {
        const trail = new PIXI.Graphics();
        trail.moveTo(agent.x, agent.y);
        trail.lineTo(agent.targetX, agent.targetY);
        trail.stroke({ width: 2, color: agent.avatarColor, alpha: 0.3 });
        world.addChild(trail);
      }

      // Agent body
      const ag = new PIXI.Graphics();
      if (agent.isInVehicle) {
        ag.roundRect(agent.x - 14, agent.y - 9, 28, 18, 4);
      } else {
        ag.circle(agent.x, agent.y, 12);
      }
      ag.fill(agent.avatarColor);
      ag.stroke({ width: isSelected ? 3 : 2, color: isSelected ? '#ffffff' : '#000000' });
      world.addChild(ag);

      // Selection ring
      if (isSelected) {
        const ring = new PIXI.Graphics();
        ring.circle(agent.x, agent.y, 20);
        ring.stroke({ width: 2, color: '#ffffff', alpha: 0.5 });
        world.addChild(ring);
      }

      // Energy bar
      const energy = agent.energy ?? 100;
      const barW = 24;
      const barBg = new PIXI.Graphics();
      barBg.rect(agent.x - barW / 2, agent.y - 42, barW, 4);
      barBg.fill('#374151');
      world.addChild(barBg);

      const barFill = new PIXI.Graphics();
      barFill.rect(agent.x - barW / 2, agent.y - 42, barW * (energy / 100), 4);
      barFill.fill(energy > 50 ? '#10b981' : energy > 25 ? '#f59e0b' : '#ef4444');
      world.addChild(barFill);

      // Name + wanted stars
      const wanted = agent.wantedLevel ?? 0;
      const stars = wanted > 0 ? ' ' + '⭐'.repeat(Math.min(wanted, 5)) : '';
      const nameText = new PIXI.Text({
        text: agent.name + stars,
        style: {
          fontFamily: 'Arial',
          fontSize: 13,
          fill: wanted >= 3 ? '#ef4444' : '#ffffff',
          stroke: { color: '#000000', width: 3 },
        },
      });
      nameText.anchor.set(0.5);
      nameText.x = agent.x;
      nameText.y = agent.y - 30;
      world.addChild(nameText);
    });

    // Dialogue bubbles (rendered on canvas)
    activeDialogue?.forEach(d => {
      const bubble = new PIXI.Graphics();
      const textObj = new PIXI.Text({
        text: d.message,
        style: { fontFamily: 'Arial', fontSize: 11, fill: '#ffffff', wordWrap: true, wordWrapWidth: 140 },
      });
      const padding = 6;
      const bw = textObj.width + padding * 2;
      const bh = textObj.height + padding * 2;

      bubble.roundRect(d.x - bw / 2, d.y - 65 - bh, bw, bh, 6);
      bubble.fill({ color: '#18181b', alpha: 0.9 });
      bubble.stroke({ width: 1, color: '#3f3f46' });
      world.addChild(bubble);

      textObj.anchor.set(0.5);
      textObj.x = d.x;
      textObj.y = d.y - 65 - bh / 2;
      world.addChild(textObj);
    });
    
    } catch (error) {
      console.error("Error rendering game world:", error);
    }

  }, [worldLocations, agents, selectedAgent, security, vehicles, activeDialogue]);

  return (
    <div className={`relative ${className}`}>
      <div
        ref={canvasRef}
        className="border border-zinc-700 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ width: `${SCREEN_WIDTH}px`, height: `${SCREEN_HEIGHT}px` }}
      />

      <HUD
        selectedAgent={selectedAgent}
        onAgentSelect={setSelectedAgent}
        cameraX={cameraX}
        cameraY={cameraY}
        worldZoom={zoom}
      />

      <div className="absolute top-2 left-2 bg-black/70 rounded px-3 py-2 border border-zinc-600">
        <h3 className="text-sm font-bold text-zinc-100">🎮 AI Agent City</h3>
        <p className="text-xs text-zinc-400">{agents?.length || 0} agents · 5 districts</p>
        <p className="text-xs text-zinc-500">Drag to pan · Scroll to zoom</p>
      </div>
    </div>
  );
}
