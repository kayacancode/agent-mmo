"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import GameWorld from "../components/GameWorld";
import Dashboard from "../components/Dashboard";
import GameEngine from "../components/GameEngine";

export default function Home() {
  const [gameInitialized, setGameInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const initializeGame = useMutation(api.init.initializeGame);
  const resetGame = useMutation(api.init.resetGame);

  const handleInitializeGame = async () => {
    setIsLoading(true);
    try {
      const result = await initializeGame();
      console.log(result);
      setGameInitialized(true);
    } catch (error) {
      console.error("Error initializing game:", error);
    }
    setIsLoading(false);
  };

  const handleResetGame = async () => {
    setIsLoading(true);
    try {
      await resetGame();
      setGameInitialized(false);
    } catch (error) {
      console.error("Error resetting game:", error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    // Auto-initialize on first load
    handleInitializeGame();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Game Engine - runs AI logic */}
      {gameInitialized && <GameEngine />}
      
      {/* Header */}
      <div className="border-b border-zinc-700 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">AI Agent MMO</h1>
            <p className="text-zinc-400">The Workshop District</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleInitializeGame}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Loading..." : "Initialize Game"}
            </button>
            <button
              onClick={handleResetGame}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              Reset Game
            </button>
          </div>
        </div>
      </div>

      {/* Main Game Layout */}
      <div className="flex">
        {/* Game World */}
        <div className="flex-1 p-6 flex items-center justify-center">
          <GameWorld />
        </div>
        
        {/* Dashboard */}
        <Dashboard />
      </div>

      {/* Status Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-700 p-2 text-center">
        <p className="text-sm text-zinc-400">
          {gameInitialized ? "🟢 Game Active" : "🔴 Game Inactive"} | 
          Real-time multiplayer AI agent simulation
        </p>
      </div>
    </div>
  );
}