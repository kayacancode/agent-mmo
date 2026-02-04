"use client";

import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export default function GameEngine() {
  const updateAgentMovement = useMutation(api.agentAI.updateAgentMovement);
  const autoAssignMissions = useMutation(api.agentAI.autoAssignMissions);
  const autoCompleteMissions = useMutation(api.agentAI.autoCompleteMissions);

  useEffect(() => {
    // Movement update loop - every 100ms for smooth movement
    const movementInterval = setInterval(() => {
      updateAgentMovement().catch(console.error);
    }, 100);

    // Mission management loop - every 3 seconds
    const missionInterval = setInterval(() => {
      autoAssignMissions().catch(console.error);
      autoCompleteMissions().catch(console.error);
    }, 3000);

    return () => {
      clearInterval(movementInterval);
      clearInterval(missionInterval);
    };
  }, [updateAgentMovement, autoAssignMissions, autoCompleteMissions]);

  // This component doesn't render anything, it just runs the game logic
  return null;
}