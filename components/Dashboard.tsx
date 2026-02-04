"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Doc } from "../convex/_generated/dataModel";

export default function Dashboard() {
  const agents = useQuery(api.agents.getAllAgents);
  const leaderboard = useQuery(api.agents.getLeaderboard);
  const missions = useQuery(api.missions.getAvailableMissions);
  const crews = useQuery(api.crews.getAllCrews);
  const activity = useQuery(api.world.getRecentActivity, { limit: 10 });

  return (
    <div className="w-80 bg-zinc-900 border-l border-zinc-700 p-4 overflow-y-auto">
      <h2 className="text-xl font-bold mb-4 text-zinc-100">Dashboard</h2>
      
      {/* Agent Stats */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2 text-zinc-200">Agent Roster</h3>
        <div className="space-y-2">
          {agents?.map((agent: Doc<"gameAgents">) => (
            <div key={agent._id} className="bg-zinc-800 rounded p-2 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: agent.avatarColor }}
                />
                <span className="text-sm text-zinc-100">{agent.name}</span>
                {agent.isOnline && (
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                )}
              </div>
              <div className="text-xs text-zinc-400">
                {agent.coins}💰 | {agent.reputation}⭐
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2 text-zinc-200">Leaderboard</h3>
        <div className="space-y-1">
          {leaderboard?.slice(0, 5).map((agent: Doc<"gameAgents">, index: number) => (
            <div key={agent._id} className="bg-zinc-800 rounded p-2 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-zinc-500">#{index + 1}</span>
                <span className="text-sm text-zinc-100">{agent.name}</span>
              </div>
              <span className="text-xs text-yellow-400">{agent.coins}💰</span>
            </div>
          ))}
        </div>
      </div>

      {/* Available Missions */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2 text-zinc-200">Mission Board</h3>
        <div className="space-y-2">
          {missions?.slice(0, 3).map((mission: Doc<"gameMissions">) => (
            <div key={mission._id} className="bg-zinc-800 rounded p-2">
              <div className="text-sm font-medium text-zinc-100 mb-1">{mission.title}</div>
              <div className="text-xs text-zinc-400 mb-1">{mission.description}</div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-green-400">{mission.reward}💰</span>
                <span className="text-xs text-blue-400">{mission.reputationReward}⭐</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Crews */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2 text-zinc-200">Crews</h3>
        <div className="space-y-2">
          {crews?.slice(0, 3).map((crew: any) => (
            <div key={crew._id} className="bg-zinc-800 rounded p-2">
              <div className="text-sm font-medium text-zinc-100">{crew.name}</div>
              <div className="text-xs text-zinc-400">
                {crew.memberCount} members | {crew.totalCoins}💰 total
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                Led by: {crew.members?.find((m: Doc<"gameAgents">) => m._id === crew.leaderId)?.name || 'Unknown'}
              </div>
            </div>
          ))}
          {(!crews || crews.length === 0) && (
            <div className="text-xs text-zinc-500 italic">No crews formed yet</div>
          )}
        </div>
      </div>

      {/* Activity Feed */}
      <div>
        <h3 className="text-lg font-semibold mb-2 text-zinc-200">Activity Feed</h3>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {activity?.map((item: Doc<"gameActivity">, index: number) => (
            <div key={index} className="text-xs text-zinc-400 bg-zinc-800 rounded p-2">
              <div className="mb-1">{item.message}</div>
              <div className="text-zinc-500">
                {new Date(item.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
          {(!activity || activity.length === 0) && (
            <div className="text-xs text-zinc-500 italic">No recent activity</div>
          )}
        </div>
      </div>
    </div>
  );
}