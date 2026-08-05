import { NextResponse } from "next/server";
import { workoutPlanWorkflow } from "@/features/workout-generator/graph";
import { RateLimitQuotaExhaustedError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      fitnessGoal,
      experienceLevel,
      trainingDays,
      limitations,
      equipment,
    } = body;

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

    const initialState = {
      goal: fitnessGoal,
      experience: experienceLevel,
      daysPerWeek: trainingDays.length,
      trainingDays: trainingDays,
      injuries: limitations || "None",
      equipment: equipment ? equipment.split(", ") : ["bodyweight"],
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
              let msg = "";
              if (nodeName === "equipmentResolver")
                msg = "Resolving equipment...";
              else if (nodeName === "exerciseRetriever")
                msg = "Searching exercise catalog...";
              else if (nodeName === "planBuilder")
                msg = "Building weekly schedule...";
              else if (nodeName === "safetyEvaluator")
                msg = "Evaluating safety & compliance...";

              if (msg) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ status: msg, node: nodeName })}\n\n`,
                  ),
                );
              }
            } else if (event.event === "on_chat_model_stream") {
              if (event.data?.chunk?.content) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ chunk: event.data.chunk.content })}\n\n`,
                  ),
                );
              }
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
          } catch {
            console.error("Failed to parse LLM JSON:", finalState.plan);
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                complete: true,
                workoutPlan: parsedPlan,
                exercisesUsed: finalState.exercises,
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
