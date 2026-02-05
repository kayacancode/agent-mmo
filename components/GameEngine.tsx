"use client";

import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export default function GameEngine() {
  const updateAgentMovement = useMutation(api.agentAI.updateAgentMovement);
  const updateAgentEnergy = useMutation(api.agentAI.updateAgentEnergy);
  const intelligentMissionAssignment = useMutation(api.agentAI.intelligentMissionAssignment);
  const autoCompleteMissions = useMutation(api.agentAI.autoCompleteMissions);
  const handleCrewFormation = useMutation(api.agentAI.handleCrewFormation);
  const checkDialogueOpportunities = useMutation(api.dialogue.checkDialogueOpportunities);
  const cleanupExpiredDialogue = useMutation(api.dialogue.cleanupExpiredDialogue);
  const updateWantedSystem = useMutation(api.wanted.updateWantedSystem);
  const updateSecurity = useMutation(api.wanted.updateSecurity);
  const updateVehicles = useMutation(api.vehicles.updateVehicles);

  useEffect(() => {
    // Movement and energy update loop - every 100ms for smooth movement
    const movementInterval = setInterval(() => {
      updateAgentMovement().catch(console.error);
    }, 100);

    // Energy update loop - every 5 seconds
    const energyInterval = setInterval(() => {
      updateAgentEnergy().catch(console.error);
    }, 5000);

    // Mission management loop - every 3 seconds (now with intelligent assignment)
    const missionInterval = setInterval(() => {
      intelligentMissionAssignment().catch(console.error);
      autoCompleteMissions().catch(console.error);
    }, 3000);

    // Crew formation and social interactions - every 8 seconds
    const socialInterval = setInterval(() => {
      handleCrewFormation().catch(console.error);
      checkDialogueOpportunities().catch(console.error);
    }, 8000);

    // Cleanup expired dialogue - every 10 seconds
    const cleanupInterval = setInterval(() => {
      cleanupExpiredDialogue().catch(console.error);
    }, 10000);

    // Wanted system - every 5 seconds
    const wantedInterval = setInterval(() => {
      updateWantedSystem().catch(console.error);
    }, 5000);

    // Security movement - every 200ms for smooth chase
    const securityInterval = setInterval(() => {
      updateSecurity().catch(console.error);
    }, 200);

    // Vehicle updates - every 1 second
    const vehicleInterval = setInterval(() => {
      updateVehicles().catch(console.error);
    }, 1000);

    return () => {
      clearInterval(movementInterval);
      clearInterval(energyInterval);
      clearInterval(missionInterval);
      clearInterval(socialInterval);
      clearInterval(cleanupInterval);
      clearInterval(wantedInterval);
      clearInterval(securityInterval);
      clearInterval(vehicleInterval);
    };
  }, [
    updateAgentMovement,
    updateAgentEnergy,
    intelligentMissionAssignment,
    autoCompleteMissions,
    handleCrewFormation,
    checkDialogueOpportunities,
    cleanupExpiredDialogue,
    updateWantedSystem,
    updateSecurity,
    updateVehicles
  ]);

  // This component doesn't render anything, it just runs the game logic
  return null;
}