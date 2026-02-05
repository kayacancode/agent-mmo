"use client";

import { useEffect, useState } from "react";

interface DialogueBubbleProps {
  message: string;
  x: number;
  y: number;
  agentName: string;
  duration?: number;
  onExpire?: () => void;
}

export default function DialogueBubble({ 
  message, 
  x, 
  y, 
  agentName, 
  duration = 4000,
  onExpire 
}: DialogueBubbleProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Start fade out 500ms before expiring
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, duration - 500);

    // Expire the bubble
    const expireTimer = setTimeout(() => {
      setIsVisible(false);
      onExpire?.();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(expireTimer);
    };
  }, [duration, onExpire]);

  if (!isVisible) return null;

  return (
    <div 
      className={`absolute pointer-events-none z-10 transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        left: x - 50, // Center the bubble over the agent
        top: y - 60,  // Position above the agent
      }}
    >
      {/* Speech bubble */}
      <div className="relative bg-zinc-800 text-zinc-100 px-3 py-2 rounded-lg text-xs max-w-32 text-center border border-zinc-600 shadow-lg">
        <div className="font-medium text-zinc-300 text-[10px] mb-1">
          {agentName}
        </div>
        <div className="text-zinc-100">
          {message}
        </div>
        
        {/* Speech bubble tail */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2">
          <div className="border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-800"></div>
          <div className="border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-600 -mt-1"></div>
        </div>
      </div>
    </div>
  );
}