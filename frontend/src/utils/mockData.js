// Mock data representing the microbiome AI assistant functionality
export const mockMicrobiomeData = {
  sampleId: "USER_001",
  microbes: {
    "Bifidobacterium": 0.15,
    "Firmicutes": 0.35,
    "Bacteroidetes": 0.25,
    "Lactobacillus": 0.10,
    "Akkermansia": 0.08,
    "Prevotella": 0.07
  },
  shannonIndex: 2.1,
  riskScore: 0.52,
  diversityLevel: "Moderate"
};

export const mockWearableData = {
  sleepHours: 6.5,
  steps: 8500,
  stressScore: 6,
  heartRate: 72,
  lastUpdated: "2025-01-27T10:30:00Z"
};

export const mockUserProfile = {
  diet: "vegetarian",
  allergies: ["dairy", "gluten"],
  goal: "improve digestion",
  age: 32,
  conditions: ["IBS"]
};

export const mockIntents = {
  "gut_health": "🧬 The gut microbiome supports digestion, immunity, and mental health. Based on your profile, focus on anti-inflammatory foods.",
  "probiotic_info": "🧫 Probiotics are beneficial microbes found in yogurt, kefir, kimchi, and supplements. Given your dairy allergy, try coconut yogurt or fermented vegetables.",
  "fiber_info": "🌾 Fiber feeds your good gut bacteria. Eat fruits, veggies, legumes, and oats. Your Bifidobacterium levels could benefit from more prebiotic fiber.",
  "diversity_info": "🌈 A diverse microbiome is a healthy one. Your Shannon Index of 2.1 is moderate - aim for more variety in plant foods.",
  "diet_suggestion": "🥗 Based on your microbiome analysis: increase fermented foods, add ginger for digestion, and reduce processed sugars to balance Firmicutes.",
  "hello": "👋 Hello! I'm your personalized gut health assistant. I can analyze your microbiome, provide dietary recommendations, and learn from your feedback.",
  "unknown": "❓ I'm still learning about your specific needs. Try asking about gut health, probiotics, fiber, diet, or your microbiome analysis."
};

export const mockRecommendations = [
  "🥬 Increase leafy greens to boost Bacteroidetes",
  "🫖 Try ginger tea for digestive support",
  "🥜 Add almonds and walnuts for healthy fats",
  "🍄 Include mushrooms for immune support",
  "🧘 Practice meditation to reduce stress (current: 6/10)"
];

export const mockChatHistory = [
  {
    id: 1,
    message: "Hello! Can you analyze my gut health?",
    response: "👋 Hello! I'm your personalized gut health assistant. I can see your microbiome data shows a Shannon Index of 2.1 with moderate diversity. How can I help you improve your gut health today?",
    timestamp: "2025-01-27T09:15:00Z",
    intent: "hello",
    keywords: ["analyze", "gut", "health"],
    entities: [],
    wasCorrect: true
  },
  {
    id: 2,
    message: "What should I eat for better digestion?",
    response: "🥗 Based on your microbiome analysis: increase fermented foods, add ginger for digestion, and reduce processed sugars to balance Firmicutes. Your vegetarian diet is great - focus on diverse plant foods!",
    timestamp: "2025-01-27T09:18:00Z",
    intent: "diet_suggestion",
    keywords: ["eat", "digestion"],
    entities: [],
    wasCorrect: true
  },
  {
    id: 3,
    message: "Tell me about probiotics",
    response: "🧫 Probiotics are beneficial microbes found in yogurt, kefir, kimchi, and supplements. Given your dairy allergy, try coconut yogurt or fermented vegetables like sauerkraut and kimchi.",
    timestamp: "2025-01-27T09:20:00Z",
    intent: "probiotic_info",
    keywords: ["probiotics"],
    entities: [],
    wasCorrect: true
  }
];

export const mockKnowledgeGraph = {
  nodes: [
    { id: 'Bifidobacterium', type: 'microbe', category: 'beneficial' },
    { id: 'Firmicutes', type: 'microbe', category: 'imbalanced' },
    { id: 'Yogurt', type: 'food', category: 'fermented' },
    { id: 'Kimchi', type: 'food', category: 'fermented' },
    { id: 'Obesity', type: 'condition', category: 'disease' },
    { id: 'IBS', type: 'condition', category: 'digestive' }
  ],
  edges: [
    { from: 'Yogurt', to: 'Bifidobacterium', relationship: 'boosts' },
    { from: 'Kimchi', to: 'Bifidobacterium', relationship: 'boosts' },
    { from: 'Firmicutes', to: 'Obesity', relationship: 'associated_with' },
    { from: 'Bifidobacterium', to: 'IBS', relationship: 'helps_with' }
  ]
};

// Mock API responses for different intents
export const generateMockResponse = (message) => {
  const text = message.toLowerCase();
  
  // Extract keywords (simplified)
  const keywords = text.split(' ').filter(word => 
    word.length > 3 && !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'its', 'did', 'yes', 'get', 'may', 'say', 'she', 'use', 'her', 'each', 'which', 'their', 'time', 'will', 'about', 'after', 'could', 'first', 'have', 'other', 'many', 'some', 'very', 'what', 'with', 'would'].includes(word)
  );

  // Detect intent
  let intent = 'unknown';
  if (text.includes('gut') || text.includes('microbiome') || text.includes('digestion')) {
    intent = 'gut_health';
  } else if (text.includes('probiotic') || text.includes('fermented')) {
    intent = 'probiotic_info';
  } else if (text.includes('fiber') || text.includes('prebiotic')) {
    intent = 'fiber_info';
  } else if (text.includes('shannon') || text.includes('diversity') || text.includes('risk')) {
    intent = 'diversity_info';
  } else if (text.includes('diet') || text.includes('food') || text.includes('eat')) {
    intent = 'diet_suggestion';
  } else if (text.includes('hello') || text.includes('hi') || text.includes('hey')) {
    intent = 'hello';
  }

  return {
    intent,
    response: mockIntents[intent] || mockIntents['unknown'],
    keywords,
    entities: [], // Simplified for mock
    confidence: Math.random() * 0.3 + 0.7, // Random confidence between 0.7-1.0
    recommendations: intent === 'diet_suggestion' ? mockRecommendations : []
  };
};

export const mockHealthInsights = {
  overallScore: 72,
  improvements: [
    { category: "Diversity", current: 2.1, target: 2.5, improvement: "Add 2-3 new plant foods weekly" },
    { category: "Beneficial Bacteria", current: 0.15, target: 0.20, improvement: "Increase fermented foods" },
    { category: "Sleep Quality", current: 6.5, target: 8.0, improvement: "Establish consistent sleep schedule" }
  ],
  warnings: [
    { level: "moderate", message: "Firmicutes levels slightly elevated (35%)" },
    { level: "low", message: "Sleep duration below optimal (6.5h vs 8h)" }
  ]
};