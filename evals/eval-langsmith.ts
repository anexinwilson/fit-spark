import { evaluate } from "langsmith/evaluation";
import { Client } from "langsmith";
import { workoutPlanWorkflow } from "../src/features/workout-generator/graph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new Client();

const datasetName = "FitSpark_RAG_and_Hallucination_Evals";

const datasetInputs = [
  {
    inputs: {
      goal: "Build Muscle",
      experience: "Intermediate",
      daysPerWeek: 3,
      trainingDays: ["Monday", "Wednesday", "Friday"],
      injuries: "None",
      equipment: ["Dumbbells", "Bench"],
    },
    outputs: {},
  },
  {
    inputs: {
      goal: "Cardio fitness",
      experience: "Beginner",
      daysPerWeek: 4,
      trainingDays: ["Tuesday", "Thursday", "Saturday", "Sunday"],
      injuries: "Bad knees",
      equipment: ["Bodyweight"],
    },
    outputs: {},
  },
  {
    inputs: {
      goal: "Increase Strength",
      experience: "Advanced",
      daysPerWeek: 5,
      trainingDays: ["Monday", "Tuesday", "Wednesday", "Friday", "Saturday"],
      injuries: "Lower back pain",
      equipment: ["Barbell", "Squat Rack"],
    },
    outputs: {},
  },
];

const ragEquipmentEvaluator = async (
  inputs: Record<string, unknown>,
  outputs: Record<string, unknown>,
) => {
  const equipmentInput = Array.isArray(inputs?.equipment)
    ? inputs.equipment
    : [];
  const allowed = equipmentInput.map((e: unknown) => String(e).toLowerCase());
  const hasBodyweight = allowed.some((e) => e === "bodyweight" || e === "none");
  if (hasBodyweight) {
    allowed.push("bodyweight", "none");
  }

  const exercises = Array.isArray(outputs?.exercises) ? outputs.exercises : [];

  let valid = true;
  let reason = "All retrieved exercises use allowed equipment.";

  for (const exStr of exercises) {
    let equipName = "";
    let exName = String(exStr);
    try {
      const ex = JSON.parse(String(exStr));
      equipName = ex.equipment_name || "";
      exName = ex.name || exName;
    } catch {
      const match = String(exStr).match(/\(Equipment:\s*([^)]+)\)/i);
      if (match) {
        equipName = match[1].trim();
      }
      const nameMatch = String(exStr).match(/^-\s*([^(]+)/);
      if (nameMatch) {
        exName = nameMatch[1].trim();
      }
    }

    if (
      equipName &&
      !allowed.some(
        (a) =>
          equipName.toLowerCase().includes(a) ||
          a.includes(equipName.toLowerCase()),
      )
    ) {
      valid = false;
      reason = `Retrieved exercise ${exName} uses disallowed equipment: ${equipName}`;
      break;
    }
  }

  return {
    key: "rag_equipment_compliance",
    score: valid ? 1 : 0,
    comment: reason,
  };
};

const outputHallucinationEvaluator = async (
  inputs: Record<string, unknown>,
  outputs: Record<string, unknown>,
) => {
  if (!process.env.GOOGLE_API_KEY) {
    process.env.GOOGLE_API_KEY = process.env.GEMINI_API_KEY;
  }
  const llmJudge = new ChatGoogleGenerativeAI({
    model: "gemini-flash-latest",
    temperature: 0,
    apiKey: process.env.GEMINI_API_KEY,
  });

  const plan = typeof outputs?.plan === "string" ? outputs.plan : "";
  const allowedExercises = Array.isArray(outputs?.exercises)
    ? outputs.exercises
    : [];

  const prompt = `You are a strict evaluator. 
Allowed Exercises (RAG Menu):
${allowedExercises.join("\n")}

Generated Plan:
${plan}

Task: Determine if the Generated Plan contains ANY exercises that are NOT in the Allowed Exercises menu. 
Return exactly "PASS" if it ONLY uses allowed exercises. 
Return "FAIL: <reason>" if it hallucinates an exercise.`;

  const response = await llmJudge.invoke(prompt);
  const text = response.content.toString().trim();

  const pass = text.startsWith("PASS");
  return { key: "no_hallucinations", score: pass ? 1 : 0, comment: text };
};

const coachPersonaEvaluator = async (
  inputs: Record<string, unknown>,
  outputs: Record<string, unknown>,
) => {
  if (!process.env.GOOGLE_API_KEY) {
    process.env.GOOGLE_API_KEY = process.env.GEMINI_API_KEY;
  }
  const llmJudge = new ChatGoogleGenerativeAI({
    model: "gemini-flash-latest",
    temperature: 0,
    apiKey: process.env.GEMINI_API_KEY,
  });

  const plan = typeof outputs?.plan === "string" ? outputs.plan : "";

  const prompt = `You are a strict evaluator.
Task: Read the following Generated Plan and determine if it sounds like an encouraging, helpful gym coach. 
A good gym coach persona is motivating, clear, and explains *why* the user is doing certain exercises, especially considering their inputs like experience level or injuries.
It should not just be a dry list of exercises.

User Inputs:
Goal: ${inputs?.goal}
Experience: ${inputs?.experience}
Injuries: ${inputs?.injuries}

Generated Plan:
${plan}

If the plan sounds like an encouraging gym coach and is tailored to the user inputs, return exactly "PASS".
If it is dry, robotic, or lacks encouragement and clear explanations, return "FAIL: <reason>".`;

  const response = await llmJudge.invoke(prompt);
  const text = response.content.toString().trim();

  const pass = text.startsWith("PASS");
  return { key: "coach_persona", score: pass ? 1 : 0, comment: text };
};

async function setupDataset() {
  try {
    const existing = await client.hasDataset({ datasetName });
    if (!existing) {
      await client.createDataset(datasetName, {
        description: "Workout Plan Graph Evaluation",
      });
      for (const data of datasetInputs) {
        await client.createExample(data.inputs, data.outputs, { datasetName });
      }
    }
  } catch {
    console.log("Dataset might already exist, continuing...");
  }
}

async function main() {
  console.log("Setting up LangSmith dataset...");
  await setupDataset();

  console.log("Running evaluation on LangGraph...");
  const target = async (inputs: Record<string, unknown>) => {
    // Add delay to avoid hitting Gemini Free Tier rate limits (5 RPM for some models)
    console.log("Waiting 15 seconds to respect rate limits...");
    await new Promise((resolve) => setTimeout(resolve, 15000));

    const res = await workoutPlanWorkflow.invoke(
      inputs as unknown as Parameters<typeof workoutPlanWorkflow.invoke>[0],
    );
    return res as unknown as Record<string, unknown>;
  };

  await evaluate(target, {
    data: datasetName,
    evaluators: [
      ragEquipmentEvaluator,
      outputHallucinationEvaluator,
      coachPersonaEvaluator,
    ] as unknown as NonNullable<Parameters<typeof evaluate>[1]>["evaluators"],
    experimentPrefix: "fitspark-rag-evals",
    maxConcurrency: 1,
  });
  console.log("Evaluation complete. View results in your LangSmith dashboard.");
}

main().catch(console.error);
