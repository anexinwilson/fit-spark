/**
 * Real end-to-end pipeline test with your actual equipment.
 * Run: npx tsx scripts/test-real-pipeline.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { workoutPlanWorkflow } from "../src/features/workout-generator/graph";

async function main() {
  console.log("=".repeat(60));
  console.log("REAL PIPELINE TEST — Your Actual Equipment");
  console.log("=".repeat(60));

  // Your exact Postgres slugs as they come from the DB
  const userEquipmentSlugs = [
    "ab-crunch-machine",
    "ab-roller",
    "butterfly-machine",
    "calf-press-machine",
    "chest-press-machine",
    "climbing-rope",
    "circus-bell",
  ];

  const input = {
    goal: "Build Muscle (No Cardio)",
    experience: "intermediate",
    daysPerWeek: 4,
    trainingDays: ["Monday", "Tuesday", "Thursday", "Friday"],
    injuries: "None",
    equipment: userEquipmentSlugs,
  };

  console.log("\nInput:");
  console.log(JSON.stringify(input, null, 2));
  console.log("\nRunning LangGraph pipeline...\n");

  const startMs = Date.now();
  const result = await workoutPlanWorkflow.invoke(input);
  const elapsedMs = Date.now() - startMs;

  console.log("\n" + "=".repeat(60));
  console.log("PIPELINE RESULT");
  console.log("=".repeat(60));
  console.log(`\nTime: ${(elapsedMs / 1000).toFixed(1)}s`);
  console.log(`Equipment resolved: ${JSON.stringify(result.equipment)}`);
  console.log(`Exercises fetched: ${result.exercises?.length ?? 0}`);

  if (result.exercises?.length) {
    console.log("\nAll exercises retrieved from Pinecone:");
    (result.exercises as string[]).forEach((e) => console.log(" ", e));
  } else {
    console.log("\n❌ ZERO exercises fetched — slug resolution or filter bug");
  }

  console.log("\nSafety issues:", result.safetyIssues ?? []);

  if (result.plan) {
    console.log("\n" + "=".repeat(60));
    console.log("GENERATED PLAN (raw JSON)");
    console.log("=".repeat(60));
    console.log(result.plan);
  } else {
    console.log("\n❌ No plan generated");
  }
}

main().catch(console.error);
