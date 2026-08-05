import { StateGraph, END, Annotation } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// 1. Define the State
const WorkoutPlanState = Annotation.Root({
  // Inputs
  goal: Annotation<string>(),
  experience: Annotation<string>(),
  daysPerWeek: Annotation<number>(),
  injuries: Annotation<string>(),
  
  // Internal State
  equipment: Annotation<string[]>({ default: () => [] }),
  exercises: Annotation<string[]>({ default: () => [] }),
  plan: Annotation<string | null>({ default: () => null }),
  safetyIssues: Annotation<string[]>({ default: () => [] }),
  retryCount: Annotation<number>({ default: () => 0 }),
});

type WorkoutPlanStateType = typeof WorkoutPlanState.State;

// 2. Initialize the LLM
// Make sure GEMINI_API_KEY is in your .env.local
let apiKey = process.env.GEMINI_API_KEY;
if (!apiKey && process.env.FITSPARK_RUNTIME_CONFIG_JSON) {
  try {
    const config = JSON.parse(process.env.FITSPARK_RUNTIME_CONFIG_JSON);
    apiKey = config.GEMINI_API_KEY;
  } catch (e) {
    console.error("Failed to parse FITSPARK_RUNTIME_CONFIG_JSON");
  }
}

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-flash-latest",
  temperature: 0.4,
  apiKey: apiKey,
});

// 3. Define the Nodes

import pg from "pg";

let config: any = {};
if (process.env.FITSPARK_RUNTIME_CONFIG_JSON) {
  try {
    config = JSON.parse(process.env.FITSPARK_RUNTIME_CONFIG_JSON);
  } catch (e) {}
}

const pool = new pg.Pool({ connectionString: config.DATABASE_URL });

// Real Neon DB Equipment Resolver (Modified to use State for testing diverse scenarios)
async function equipmentResolver(state: WorkoutPlanStateType): Promise<Partial<WorkoutPlanStateType>> {
  console.log("-> [Node] Resolving Equipment & Profile...");
  // Instead of fetching a random user from Neon for this test, we use the equipment provided in the state
  // to ensure we can test vastly different Pinecone RAG scenarios.
  return { equipment: state.equipment || ["bodyweight"] };
}

// Real Pinecone RAG Retriever
async function exerciseRetriever(state: WorkoutPlanStateType): Promise<Partial<WorkoutPlanStateType>> {
  console.log("-> [Node] Retrieving Exercises from Pinecone (RAG)...");
  
  const endpoint = `${config.PINECONE_INDEX_HOST.replace(/\/$/, "")}/records/namespaces/${encodeURIComponent(config.PINECONE_NAMESPACE)}/search`;
  const equipmentQuery = state.equipment?.join(" ") || "bodyweight";
  
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Api-Key": config.PINECONE_API_KEY,
      "Content-Type": "application/json",
      "X-Pinecone-Api-Version": "2026-04",
    },
    body: JSON.stringify({
      query: {
        inputs: { text: `${equipmentQuery} exercises for ${state.goal}, focusing on ${state.injuries || 'general fitness'}` },
        top_k: 30, // Get a healthy variety of exercises
      },
      fields: ["name", "equipment_name", "category"],
    }),
  });

  if (!response.ok) {
    console.error("Pinecone search failed");
    return { exercises: ["Pushups"] };
  }

  const data = await response.json();
  const exercises = data.result?.hits?.map((hit: any) => hit.fields.name) || [];
  console.log(`   [RAG] Retrieved ${exercises.length} real exercises from Pinecone.`);
  
  return { exercises };
}

// The Plan Builder
async function planBuilder(state: WorkoutPlanStateType): Promise<Partial<WorkoutPlanStateType>> {
  const currentRetry = state.retryCount || 0;
  console.log(`-> [Node] Building Plan (Attempt ${currentRetry + 1})...`);
  
  const issues = state.safetyIssues || [];
  const safetyContext = issues.length > 0
    ? `\n\nCRITICAL: The previous plan was rejected for these reasons:\n${issues.join("\n")}\nFIX THESE ISSUES.`
    : "";

  const prompt = `You are a certified personal trainer. Create a FULL 7-DAY WORKOUT PLAN based on the following constraints:
Goal: ${state.goal}
Experience: ${state.experience}
Days per Week to Train: ${state.daysPerWeek}
Injuries/Limitations: ${state.injuries || "None"}

Available Equipment: ${(state.equipment || []).join(", ")}
Available Exercises (FROM RAG DATABASE): ${(state.exercises || []).join(", ")}
${safetyContext}

CRITICAL RULES:
1. You MUST outline all 7 days of the week (e.g., Day 1, Day 2... Day 7), clearly labeling rest days.
2. You MUST ONLY use exercises from the "Available Exercises" list above. Do NOT use any exercises outside of this list.

Return a clean, simple 7-day workout plan. Do not use markdown code blocks, just text.`;

  const response = await llm.invoke(prompt);
  
  // Log Token Usage for Efficiency
  const usage = response.usage_metadata;
  if (usage) {
    console.log(`   [Tokens] Builder used ${usage.input_tokens} input, ${usage.output_tokens} output.`);
  }

  return { plan: response.content.toString() };
}

// The Safety Evaluator
async function safetyEvaluator(state: WorkoutPlanStateType): Promise<Partial<WorkoutPlanStateType>> {
  console.log("-> [Node] Evaluating Safety...");
  
  const prompt = `You are a strict safety evaluator for workout plans.
User Injuries/Limitations: ${state.injuries || "None"}

Proposed Plan:
${state.plan}

Does this plan contain any exercises that clearly violate the user's injuries or limitations?
If it violates them, explain exactly why in a short sentence.
If it is completely safe, respond with 'PASS'.`;

  const response = await llm.invoke([{ role: "user", content: prompt }]);
  const resultText = response.content.toString().trim();
  
  const usage = response.usage_metadata;
  if (usage) {
    console.log(`   [Tokens] Evaluator used ${usage.input_tokens} input, ${usage.output_tokens} output.`);
  }
  console.log(`   [Safety Result]: ${resultText.substring(0, 80)}...`);
  
  if (resultText === "PASS" || resultText.includes("PASS")) {
    return { safetyIssues: [] };
  } else {
    return { 
      safetyIssues: [resultText],
      retryCount: (state.retryCount || 0) + 1
    };
  }
}

// 4. Define the Graph Edges
function shouldRetry(state: WorkoutPlanStateType) {
  const issues = state.safetyIssues || [];
  const retries = state.retryCount || 0;
  
  if (issues.length > 0 && retries < 2) {
    console.log("<- [Edge] Safety failed. Routing back to Plan Builder.");
    return "planBuilder";
  }
  if (issues.length > 0) {
     console.log("<- [Edge] Max retries reached. Failing.");
     return END;
  }
  console.log("<- [Edge] Safety passed. Completing workflow.");
  return END;
}

// 5. Build and Compile the Graph
const workflow = new StateGraph(WorkoutPlanState)
  .addNode("equipmentResolver", equipmentResolver)
  .addNode("exerciseRetriever", exerciseRetriever)
  .addNode("planBuilder", planBuilder)
  .addNode("safetyEvaluator", safetyEvaluator)
  .addEdge("__start__", "equipmentResolver")
  .addEdge("equipmentResolver", "exerciseRetriever")
  .addEdge("exerciseRetriever", "planBuilder")
  .addEdge("planBuilder", "safetyEvaluator")
  .addConditionalEdges("safetyEvaluator", shouldRetry);

const app = workflow.compile();

// 6. Test Runner
async function runTest() {
  console.log("=== Starting LangGraph RAG Efficiency Test ===\n");
  
  const scenarios = [
    {
      name: "Scenario 1: Pregnant Woman, Home Workout",
      state: {
        goal: "Maintain fitness",
        experience: "Beginner",
        daysPerWeek: 3,
        injuries: "7 months pregnant. Cannot do exercises lying flat on back or heavy core compression.",
        equipment: ["Dumbbells", "Exercise Ball", "Bodyweight"],
      }
    },
    {
      name: "Scenario 2: Advanced Bodybuilder, Full Gym",
      state: {
        goal: "Hypertrophy (Massive Chest and Back)",
        experience: "Advanced",
        daysPerWeek: 5,
        injuries: "None",
        equipment: ["Barbell", "Dumbbells", "Cable Machine", "Pull-up Bar", "Bench"],
      }
    }
  ];

  for (const scenario of scenarios) {
    console.log(`\n>>> TESTING: ${scenario.name}`);
    const finalState = await app.invoke(scenario.state);
    console.log(`\n[FINAL PLAN EXTRACT for ${scenario.name}]`);
    // Print just the first 400 characters to prove it worked without spamming terminal
    console.log(finalState.plan?.substring(0, 400) + "\n...\n");
  }
}

runTest().catch(console.error);
