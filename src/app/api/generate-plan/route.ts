import { NextResponse } from "next/server";
import { workoutPlanWorkflow } from "@/features/workout-generator/graph";
import { RateLimitQuotaExhaustedError } from "@/lib/errors";
import { getAuthenticatedUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const {
      fitnessGoal,
      experienceLevel,
      trainingDays,
      limitations,
      equipment,
      includeCardio,
    } = body;

    const parsedEquipment = Array.isArray(equipment)
      ? equipment.filter(Boolean)
      : typeof equipment === "string" && equipment.trim().length > 0
        ? equipment
            .split(", ")
            .map((e) => e.trim())
            .filter(Boolean)
        : [];

    if (
      !fitnessGoal ||
      !experienceLevel ||
      !trainingDays ||
      trainingDays.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: fitnessGoal, experienceLevel, or trainingDays",
        },
        { status: 400 },
      );
    }

    if (parsedEquipment.length === 0) {
      return NextResponse.json(
        {
          error: "Equipment selection cannot be empty.",
        },
        { status: 400 },
      );
    }

    const goalModifier = includeCardio
      ? " (Must include Cardio)"
      : " (No Cardio)";

    const initialState = {
      goal: fitnessGoal + goalModifier,
      experience: experienceLevel,
      daysPerWeek: trainingDays.length,
      trainingDays: trainingDays,
      injuries: limitations || "None",
      equipment: parsedEquipment,
    };

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const events = workoutPlanWorkflow.streamEvents(initialState, {
            version: "v2",
          });

          let finalState: Record<string, unknown> | null = null;

          for await (const event of events) {
            if (
              event.event === "on_chain_start" &&
              event.name !== "LangGraph"
            ) {
              const nodeName = event.name;
              let statusMsg = "";
              let logLines: string[] = [];

              if (nodeName === "equipmentResolver") {
                statusMsg = "Resolving equipment...";
                logLines = [
                  "[equipmentResolver] Agent starting...",
                  "[equipmentResolver] Reading user equipment profile from session",
                ];
              } else if (nodeName === "exerciseRetriever") {
                statusMsg = "Searching exercise catalog...";
                logLines = [
                  "[exerciseRetriever] Connecting to Pinecone vector database...",
                  "[exerciseRetriever] Querying RAG index: exercises-v1",
                  "[exerciseRetriever] Applying equipment filters...",
                ];
              } else if (nodeName === "muscleGapAnalyzer") {
                statusMsg = "Analyzing muscle group coverage...";
                logLines = [
                  "[muscleGapAnalyzer] Mapping equipment to muscle groups...",
                  "[muscleGapAnalyzer] Detecting coverage gaps...",
                  "[muscleGapAnalyzer] Generating coach recommendations...",
                ];
              } else if (nodeName === "planBuilder") {
                statusMsg = "Building weekly schedule...";
                logLines = [
                  "[planBuilder] Preparing prompt with retrieved exercises...",
                  "[planBuilder] Invoking Gemini model (gemini-3.6-flash)...",
                  "[planBuilder] Streaming plan tokens...",
                ];
              } else if (nodeName === "safetyEvaluator") {
                statusMsg = "Evaluating safety & compliance...";
                logLines = [
                  "[safetyEvaluator] Running programmatic compliance checks (0 tokens)...",
                  "[safetyEvaluator] Checking RAG exercise compliance...",
                  "[safetyEvaluator] Checking injury safety constraints...",
                  "[safetyEvaluator] Checking equipment selection constraints...",
                ];
              }

              if (statusMsg) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ status: statusMsg, node: nodeName })}\n\n`,
                  ),
                );
              }
              for (const line of logLines) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ log: line })}\n\n`),
                );
              }
            } else if (
              event.event === "on_chain_end" &&
              event.name !== "LangGraph"
            ) {
              const nodeName = event.name;
              let completionLog = "";
              if (nodeName === "equipmentResolver") {
                const eq = (event.data?.output?.equipment as string[]) ?? [];
                completionLog = `[equipmentResolver] Done. Equipment resolved: ${eq.join(", ") || "none"}`;
              } else if (nodeName === "exerciseRetriever") {
                const exCount =
                  (event.data?.output?.exercises as unknown[])?.length ?? 0;
                completionLog = `[exerciseRetriever] Done. Fetched ${exCount} exercises from Pinecone.`;
              } else if (nodeName === "muscleGapAnalyzer") {
                const insight = event.data?.output?.coachInsight as {
                  coveredGroups?: string[];
                  missingGroups?: string[];
                  coachMessage?: string;
                } | null;
                if (insight) {
                  const covered =
                    (insight.coveredGroups ?? []).join(", ") || "none";
                  const missing =
                    (insight.missingGroups ?? []).join(", ") || "none";
                  completionLog = `[muscleGapAnalyzer] Done. Covered: ${covered}. Missing: ${missing}.`;
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ coachInsight: insight })}\n\n`,
                    ),
                  );
                }
              } else if (nodeName === "planBuilder") {
                completionLog =
                  "[planBuilder] Done. Weekly schedule generated.";
              } else if (nodeName === "safetyEvaluator") {
                const issues =
                  (event.data?.output?.safetyIssues as string[]) ?? [];
                completionLog =
                  issues.length === 0
                    ? "[safetyEvaluator] Done. Plan passed all safety checks."
                    : `[safetyEvaluator] Issues found (${issues.length}). Retrying plan...`;
              }
              if (completionLog) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ log: completionLog })}\n\n`,
                  ),
                );
              }
            } else if (event.event === "on_chat_model_stream") {
              // Don't stream raw tokens to UI — suppress
            } else if (
              event.event === "on_chain_end" &&
              event.name === "LangGraph"
            ) {
              finalState = event.data.output as Record<string, unknown>;
            }
          }

          if (!finalState) {
            throw new Error("No final state returned from LangGraph");
          }

          const safetyIssues = Array.isArray(finalState.safetyIssues)
            ? finalState.safetyIssues
            : [];
          if (safetyIssues.length > 0) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: "Could not generate a safe plan based on your injuries." })}\n\n`,
              ),
            );
            controller.close();
            return;
          }

          let parsedPlan = {};
          try {
            const planStr =
              typeof finalState.plan === "string" ? finalState.plan : "";
            const cleanedStr =
              planStr.replace(/```json/g, "").replace(/```/g, "") || "{}";
            parsedPlan = JSON.parse(cleanedStr);
            
            // Clean up uncompleted sessions from any previous plan
            await prisma.workoutSession.deleteMany({
              where: {
                userId,
                completedAt: null
              }
            });
            // Save the new blueprint
            await prisma.workoutPlan.upsert({
              where: { userId },
              create: { userId, plan: parsedPlan },
              update: { plan: parsedPlan },
            });
          } catch (e) {
            console.error("Failed to parse LLM JSON or save to DB:", e);
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                complete: true,
                workoutPlan: parsedPlan,
                exercisesUsed: finalState.exercises,
                coachInsight: finalState.coachInsight ?? null,
              })}\n\n`,
            ),
          );

          controller.close();
        } catch (error: unknown) {
          console.error("Stream execution error:", error);
          let errorMessage = "Failed to generate plan. Please try again.";
          const errObj = error as { status?: number; message?: string };
          if (
            error instanceof RateLimitQuotaExhaustedError ||
            errObj?.status === 429 ||
            errObj?.message?.includes("429") ||
            errObj?.message?.includes("Quota") ||
            errObj?.message?.includes("quota")
          ) {
            errorMessage =
              error instanceof RateLimitQuotaExhaustedError
                ? error.message
                : "API Quota Exceeded. You have hit the daily request limit.";
          }
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: errorMessage })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    console.error("API Route Error:", error);
    const errObj = error as { message?: string };
    return NextResponse.json(
      { error: "Internal Server Error", details: errObj.message },
      { status: 500 },
    );
  }
}
