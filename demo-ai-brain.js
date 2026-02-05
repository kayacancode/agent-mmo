#!/usr/bin/env node

// Demo script to show the AI brain in action
// Run with: node demo-ai-brain.js

console.log("🤖 AI Agent MMO - Brain Demo");
console.log("=============================");
console.log("Running several AI cycles to demonstrate personality-driven behavior...\n");

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function runConvexCommand(command) {
  try {
    const { stdout, stderr } = await execPromise(`npx convex ${command} --prod`);
    return stdout.trim();
  } catch (error) {
    console.error(`Error running ${command}:`, error.message);
    return null;
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function showAgentStatus() {
  console.log("📊 Current Agent Status:");
  const agents = await runConvexCommand('run agents:getAllAgents');
  if (agents) {
    const agentData = JSON.parse(agents);
    agentData.forEach(agent => {
      const status = agent.isMoving ? "🏃 Moving" : "🧍 Idle";
      const mission = agent.currentMission ? "📋 On Mission" : "🆓 Available";
      const energy = `⚡ ${Math.round(agent.energy || 100)}%`;
      console.log(`  ${agent.name} (${agent.personality}): ${status} | ${mission} | ${energy} | 💰 ${agent.coins} coins`);
    });
  }
  console.log("");
}

async function showRecentActivity() {
  console.log("📰 Recent Activity:");
  const activity = await runConvexCommand('data gameActivity');
  if (activity) {
    const lines = activity.split('\n').slice(1, 6); // Get last 5 activities
    lines.forEach(line => {
      if (line.trim()) {
        const parts = line.split('|');
        if (parts.length > 4) {
          const message = parts[4]?.trim().replace(/"/g, '');
          const type = parts[5]?.trim().replace(/"/g, '');
          console.log(`  ${type === 'agent_joined' ? '👋' : type === 'mission_completed' ? '✅' : type === 'dialogue' ? '💬' : '🎯'} ${message}`);
        }
      }
    });
  }
  console.log("");
}

async function showActiveDialogue() {
  console.log("💬 Active Dialogue Bubbles:");
  const dialogue = await runConvexCommand('run dialogue:getActiveDialogue');
  if (dialogue) {
    const dialogueData = JSON.parse(dialogue);
    if (dialogueData.length > 0) {
      dialogueData.forEach(bubble => {
        console.log(`  ${bubble.agentName}: "${bubble.message}"`);
      });
    } else {
      console.log("  (No active dialogue)");
    }
  }
  console.log("");
}

async function runAICycle() {
  console.log("🧠 Running AI Brain Cycle...");
  
  // Run all the AI systems
  await runConvexCommand('run agentAI:updateAgentEnergy');
  await runConvexCommand('run agentAI:updateAgentMovement');
  await runConvexCommand('run agentAI:intelligentMissionAssignment');
  await runConvexCommand('run agentAI:autoCompleteMissions');
  await runConvexCommand('run agentAI:handleCrewFormation');
  await runConvexCommand('run dialogue:checkDialogueOpportunities');
  await runConvexCommand('run dialogue:cleanupExpiredDialogue');
  
  console.log("✅ AI cycle complete");
  console.log("");
}

async function main() {
  // Show initial state
  await showAgentStatus();
  await showRecentActivity();
  
  // Run several cycles
  for (let i = 1; i <= 5; i++) {
    console.log(`🔄 Cycle ${i}/5`);
    await runAICycle();
    await showAgentStatus();
    await showActiveDialogue();
    
    if (i < 5) {
      console.log("⏰ Waiting 3 seconds before next cycle...\n");
      await sleep(3000);
    }
  }
  
  console.log("🎉 Demo complete! The AI agents are now running with:");
  console.log("  • Personality-driven decision making");
  console.log("  • Intelligent mission selection"); 
  console.log("  • Energy/stamina system");
  console.log("  • Contextual dialogue generation");
  console.log("  • Crew formation logic");
  console.log("\n🌐 Visit https://agent-mmo.vercel.app to see them in action!");
}

main().catch(console.error);