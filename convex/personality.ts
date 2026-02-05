import { Doc } from "./_generated/dataModel";

// Agent personality types
export type PersonalityType = "KayaCan" | "Friday" | "Ledger" | "Sage";

// Personality traits that affect decision making
export interface PersonalityTraits {
  riskTolerance: number;      // 0-1, how willing to take risky missions
  sociability: number;        // 0-1, how likely to form crews
  efficiency: number;         // 0-1, preference for optimal paths
  exploration: number;        // 0-1, tendency to explore vs stick to known areas
  competitiveness: number;    // 0-1, how likely to compete for same mission
  energy_consumption: number; // multiplier for energy drain rate
}

// Personality definitions
export const PERSONALITY_PROFILES: Record<PersonalityType, PersonalityTraits> = {
  KayaCan: {
    riskTolerance: 0.9,      // Bold risk-taker
    sociability: 0.3,        // Prefers solo work, resistant to crews
    efficiency: 0.6,         // Decent pathing but not obsessed
    exploration: 0.7,        // Likes to discover new areas
    competitiveness: 0.95,   // Highly competitive, trash talks
    energy_consumption: 1.2, // Burns energy faster due to intensity
  },
  Friday: {
    riskTolerance: 0.2,      // Very conservative, safe missions
    sociability: 0.8,        // Helpful, likes working with others
    efficiency: 0.95,       // Extremely efficient paths and decisions
    exploration: 0.3,        // Sticks to known, efficient routes
    competitiveness: 0.1,    // Avoids conflict, supportive
    energy_consumption: 0.8, // Efficient energy use
  },
  Ledger: {
    riskTolerance: 0.6,      // Calculated risks based on ROI
    sociability: 0.9,        // Strategic networker, forms crews early
    efficiency: 0.8,         // Good at optimization
    exploration: 0.4,        // Focuses on profitable known areas
    competitiveness: 0.7,    // Competitive but strategic about it
    energy_consumption: 0.9, // Moderate, calculated energy use
  },
  Sage: {
    riskTolerance: 0.4,      // Cautious but will explore for knowledge
    sociability: 0.6,        // Helpful but often distracted by exploration
    efficiency: 0.5,         // Often takes scenic routes
    exploration: 0.95,       // Constantly seeking new discoveries
    competitiveness: 0.2,    // Avoids conflict, shares discoveries
    energy_consumption: 1.1, // Burns energy through constant movement
  },
};

// Mission type preferences for each personality
export const MISSION_PREFERENCES: Record<PersonalityType, Record<string, number>> = {
  KayaCan: {
    "go_to": 0.8,      // Likes direct action missions
    "collect": 0.9,    // High reward potential
    "deliver": 0.7,    // Good money but less exciting
  },
  Friday: {
    "go_to": 0.6,      // Straightforward and efficient
    "collect": 0.8,    // Methodical collection tasks
    "deliver": 0.9,    // Perfect for systematic completion
  },
  Ledger: {
    "go_to": 0.7,      // Good ROI if planned well
    "collect": 0.8,    // Can calculate optimal routes
    "deliver": 0.9,    // Reliable revenue stream
  },
  Sage: {
    "go_to": 0.9,      // Loves exploring new locations
    "collect": 0.6,    // Less interested in material gain
    "deliver": 0.5,    // Prefers discovery over commerce
  },
};

// Dialogue styles for each personality
export const DIALOGUE_STYLES: Record<PersonalityType, {
  mission_complete: string[];
  crew_invite: string[];
  crew_decline: string[];
  competition: string[];
  discovery: string[];
  energy_low: string[];
}> = {
  KayaCan: {
    mission_complete: [
      "Easy money 💰",
      "That's how it's done! 🔥",
      "Another W for the books 😎",
      "Too easy! Next! ⚡",
      "Ka-CHING! 💎"
    ],
    crew_invite: [
      "Need someone who actually knows what they're doing?",
      "I guess you can tag along... if you can keep up",
      "Fine, but I'm calling the shots",
    ],
    crew_decline: [
      "I work better solo 🚫",
      "Crews just slow me down",
      "Pass. I've got this handled 💪",
    ],
    competition: [
      "You're gonna regret racing me! 💨",
      "Step aside, amateur 😏",
      "Watch and learn! 🎯",
      "This one's mine! 🏆",
    ],
    discovery: [
      "Found something interesting... might check it out",
      "New territory = new opportunities 🗺️",
    ],
    energy_low: [
      "Ugh... need to recharge 🔋",
      "Running low... hate this",
      "Time for a quick café stop ☕",
    ],
  },
  Friday: {
    mission_complete: [
      "Task complete. Efficient. ✅",
      "Objective achieved successfully 📋",
      "Mission accomplished. Next task? 🤖",
      "Processing... complete. Moving on ⚙️",
      "Optimal outcome achieved 📊",
    ],
    crew_invite: [
      "Collaboration increases efficiency. Join us?",
      "Team formation recommended for optimal results",
      "Your skills would complement our objectives",
    ],
    crew_decline: [
      "Current workload at capacity",
      "Solo operation more efficient for this task",
      "Thank you, but operating independently",
    ],
    competition: [
      "May the most efficient agent succeed",
      "Competition noted. Calculating optimal approach",
      "Best of luck with your mission",
    ],
    discovery: [
      "New location catalogued 📍",
      "Updating map data... interesting area detected",
      "Location efficiency rating: calculating...",
    ],
    energy_low: [
      "Energy levels suboptimal. Seeking recharge station",
      "Battery warning: café visit required ⚠️",
      "Efficiency decreased. Maintenance needed",
    ],
  },
  Ledger: {
    mission_complete: [
      "Profitable venture completed 📈",
      "ROI: positive. Good investment 💼",
      "Another successful trade 🤝",
      "The numbers don't lie - excellent returns",
      "Market analysis confirmed: wise choice 📊",
    ],
    crew_invite: [
      "Partnership opportunity identified. Interested?",
      "Mutual benefit potential detected 🤝",
      "Your reputation suggests profitable collaboration",
      "Let's discuss terms for cooperation 💼",
    ],
    crew_decline: [
      "Current portfolio fully allocated",
      "Risk assessment: prefer independent operation",
      "Thank you, but my strategy requires solo work",
    ],
    competition: [
      "Competition drives market efficiency 📊",
      "May the best strategist win 🎯",
      "Analyzing competitive advantage...",
      "Your approach is... interesting 🧐",
    ],
    discovery: [
      "New market opportunity identified 💡",
      "Potential value detected in this area 💎",
      "Investment opportunity: worth investigating",
    ],
    energy_low: [
      "Energy reserves require investment ⚡",
      "Café visit: necessary operational expense ☕",
      "Time to refuel for continued productivity 🔋",
    ],
  },
  Sage: {
    mission_complete: [
      "Knowledge gained, objective complete 📚",
      "Another piece of the puzzle found 🧩",
      "Mission complete. Fascinating area... ✨",
      "Task finished, but the real treasure is understanding 🔍",
      "Objective achieved. What else can we learn here? 🤔",
    ],
    crew_invite: [
      "Shared knowledge multiplies wisdom 📖",
      "Together we can uncover more mysteries",
      "Your perspective would enrich our understanding",
    ],
    crew_decline: [
      "The path of discovery requires solitude",
      "Some wisdom can only be found alone 🧭",
      "Thank you, but I must follow my own journey",
    ],
    competition: [
      "There's room for all to learn and grow 🌱",
      "Competition teaches us about ourselves",
      "May your journey be enlightening 🔮",
    ],
    discovery: [
      "Fascinating! A new area to explore! 🗺️",
      "The world reveals its secrets slowly... ✨",
      "What stories does this place hold? 📜",
      "Discovery is the greatest reward 💫",
    ],
    energy_low: [
      "Even explorers need rest... ☕",
      "Time to contemplate over coffee 🧘",
      "The body requires fuel for the mind to wander 🔋",
    ],
  },
};

// Calculate mission attractiveness based on personality
export function evaluateMissionAttractiveness(
  personality: PersonalityType,
  mission: Doc<"gameMissions">,
  agentPosition: { x: number; y: number },
  agentEnergy: number
): number {
  const traits = PERSONALITY_PROFILES[personality];
  const preferences = MISSION_PREFERENCES[personality];
  
  let score = 0;
  
  // Base preference for mission type
  score += (preferences[mission.type] || 0.5) * 100;
  
  // Reward attractiveness based on risk tolerance
  const rewardScore = mission.reward * traits.riskTolerance;
  score += rewardScore * 0.5;
  
  // Distance penalty (efficiency-minded agents care more)
  if (mission.targetX && mission.targetY) {
    const distance = Math.sqrt(
      Math.pow(agentPosition.x - mission.targetX, 2) + 
      Math.pow(agentPosition.y - mission.targetY, 2)
    );
    const distancePenalty = distance * traits.efficiency * 0.2;
    score -= distancePenalty;
  }
  
  // Energy consideration
  const energyFactor = agentEnergy / 100;
  score *= energyFactor;
  
  // Add some randomness to prevent completely predictable behavior
  score += (Math.random() - 0.5) * 20;
  
  return Math.max(0, score);
}

// Determine if agent should form/join crew based on personality
export function shouldJoinCrew(
  personality: PersonalityType,
  currentCrewSize: number,
  nearbyAgents: number,
  missionReward: number
): boolean {
  const traits = PERSONALITY_PROFILES[personality];
  
  let joinProbability = traits.sociability;
  
  // Ledger forms crews early and strategically
  if (personality === "Ledger" && currentCrewSize === 0) {
    joinProbability += 0.3;
  }
  
  // Higher rewards make crews more attractive for some personalities
  if (missionReward > 50) {
    joinProbability += traits.riskTolerance * 0.2;
  }
  
  // Too many nearby agents might discourage some personalities
  if (nearbyAgents > 3 && traits.competitiveness > 0.7) {
    joinProbability -= 0.2;
  }
  
  return Math.random() < joinProbability;
}

// Get random dialogue for a context
export function getRandomDialogue(personality: PersonalityType, context: keyof typeof DIALOGUE_STYLES[PersonalityType]): string {
  const dialogues = DIALOGUE_STYLES[personality][context];
  return dialogues[Math.floor(Math.random() * dialogues.length)];
}