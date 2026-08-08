import { TextEncoder, TextDecoder } from "util";

// Define response types to match WorkoutPlanResponse
export interface WorkoutPlanResponse {
  complete?: boolean;
  workoutPlan?: Record<string, unknown>;
  exercisesUsed?: unknown[];
  error?: string;
  status?: string;
  node?: string;
}

// Extract exact SSE decoder logic under test from src/features/workout-plan/workout-plan-form.tsx
export async function parseSseStream(
  readable: ReadableStream<Uint8Array>,
  onStatusUpdate?: (status: string, node?: string) => void,
  onChunkUpdate?: (chunk: string) => void,
): Promise<WorkoutPlanResponse> {
  const reader = readable.getReader();
  const decoder = new TextDecoder();

  let result: WorkoutPlanResponse | null = null;
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      buffer += decoder.decode();
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    let lineEnd: number;
    while ((lineEnd = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, lineEnd);
      buffer = buffer.slice(lineEnd + 1);
      if (line.endsWith("\r")) {
        line = line.slice(0, -1);
      }
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data:")) continue;

      const jsonStr = trimmed.slice(5).trim();
      if (!jsonStr) continue;

      let data: Record<string, unknown>;
      try {
        data = JSON.parse(jsonStr) as Record<string, unknown>;
      } catch {
        continue;
      }

      if (typeof data.error === "string") {
        throw new Error(data.error);
      }
      if (typeof data.status === "string" && onStatusUpdate) {
        onStatusUpdate(
          data.status,
          typeof data.node === "string" ? data.node : undefined,
        );
      }
      if (typeof data.chunk === "string" && onChunkUpdate) {
        onChunkUpdate(data.chunk);
      }
      if (data.complete) {
        result = data as WorkoutPlanResponse;
      }
    }
  }

  if (buffer.trim().startsWith("data:")) {
    const jsonStr = buffer.trim().slice(5).trim();
    if (jsonStr) {
      try {
        const data = JSON.parse(jsonStr);
        if (data.error) throw new Error(data.error);
        if (data.status && onStatusUpdate)
          onStatusUpdate(data.status, data.node);
        if (data.chunk && onChunkUpdate) onChunkUpdate(data.chunk);
        if (data.complete) result = data as WorkoutPlanResponse;
      } catch (e) {
        if (
          e instanceof Error &&
          e.message.length > 0 &&
          !e.message.includes("JSON")
        )
          throw e;
      }
    }
  }

  if (!result) throw new Error("Stream closed before completing the plan");
  return result;
}

// Helper to create a ReadableStream from Uint8Array chunks
function createStreamFromChunks(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });
}

// Main test suite runner
async function runStressTests() {
  const encoder = new TextEncoder();
  const results: { test: string; status: "PASS" | "FAIL"; details: string }[] = [];

  // Helper assertions
  function assert(condition: boolean, testName: string, failureDetail: string) {
    if (condition) {
      results.push({ test: testName, status: "PASS", details: "OK" });
    } else {
      results.push({ test: testName, status: "FAIL", details: failureDetail });
    }
  }

  // --- Test 1: Multiline JSON tokens containing \n ---
  try {
    const multilineText = "Line 1: Warmup\nLine 2: Bench Press 3x10\nLine 3: Cool down";
    const payload = `data: ${JSON.stringify({ chunk: multilineText })}\n\ndata: ${JSON.stringify({ complete: true, workoutPlan: { day1: multilineText } })}\n\n`;
    let accumulatedChunk = "";
    
    const stream = createStreamFromChunks([encoder.encode(payload)]);
    const res = await parseSseStream(stream, undefined, (c) => { accumulatedChunk += c; });
    
    assert(
      accumulatedChunk === multilineText && res.complete === true,
      "1. Multiline JSON tokens containing \\n",
      `Expected accumulated chunk to equal multiline text. Received length: ${accumulatedChunk.length}`,
    );
  } catch (err: unknown) {
    const error = err as Error;
    results.push({ test: "1. Multiline JSON tokens containing \\n", status: "FAIL", details: error.message });
  }

  // --- Test 2: Rapid Chunk Arrivals (10,000 chunks) ---
  try {
    const chunkCount = 10000;
    let sseString = "";
    for (let i = 0; i < chunkCount; i++) {
      sseString += `data: ${JSON.stringify({ chunk: `tok${i} ` })}\n\n`;
    }
    sseString += `data: ${JSON.stringify({ complete: true, workoutPlan: { total: chunkCount } })}\n\n`;
    
    let receivedChunks = 0;
    const stream = createStreamFromChunks([encoder.encode(sseString)]);
    const start = Date.now();
    const res = await parseSseStream(stream, undefined, () => { receivedChunks++; });
    const duration = Date.now() - start;

    assert(
      receivedChunks === chunkCount && res.complete === true,
      "2. Rapid Chunk Arrivals (10,000 chunks in single read)",
      `Expected ${chunkCount} chunks, received ${receivedChunks} in ${duration}ms`,
    );
  } catch (err: unknown) {
    const error = err as Error;
    results.push({ test: "2. Rapid Chunk Arrivals", status: "FAIL", details: error.message });
  }

  // --- Test 3: Empty Stream & Early Termination ---
  try {
    let emptyStreamErrorCaught = false;
    try {
      const stream = createStreamFromChunks([]);
      await parseSseStream(stream);
    } catch (e: unknown) {
      const err = e as Error;
      if (err.message === "Stream closed before completing the plan") {
        emptyStreamErrorCaught = true;
      }
    }

    let quotaErrorCaught = false;
    const errorPayload = `data: ${JSON.stringify({ error: "API Quota Exceeded. Limit 20/day." })}\n\n`;
    try {
      const stream = createStreamFromChunks([encoder.encode(errorPayload)]);
      await parseSseStream(stream);
    } catch (e: unknown) {
      const err = e as Error;
      if (err.message.includes("Quota Exceeded")) {
        quotaErrorCaught = true;
      }
    }

    assert(
      emptyStreamErrorCaught && quotaErrorCaught,
      "3. Empty Stream & Early Termination",
      `emptyStreamErrorCaught=${emptyStreamErrorCaught}, quotaErrorCaught=${quotaErrorCaught}`,
    );
  } catch (err: unknown) {
    const error = err as Error;
    results.push({ test: "3. Empty Stream & Early Termination", status: "FAIL", details: error.message });
  }

  // --- Test 4: Network Chunk Splits across Buffer Boundaries ---
  try {
    const fullSse = `data: ${JSON.stringify({ status: "Searching exercise catalog...", node: "exerciseRetriever" })}\r\ndata: ${JSON.stringify({ chunk: "🏋️‍♂️ Bench Press" })}\r\ndata: ${JSON.stringify({ complete: true, workoutPlan: {} })}\r\n`;
    const fullBytes = encoder.encode(fullSse);
    
    // Split into 1-byte micro chunks to stress test boundary reconstruction
    const microChunks: Uint8Array[] = [];
    for (let i = 0; i < fullBytes.length; i++) {
      microChunks.push(fullBytes.subarray(i, i + 1));
    }

    let statusReceived = "";
    let nodeReceived = "";
    let chunkReceived = "";

    const stream = createStreamFromChunks(microChunks);
    const res = await parseSseStream(
      stream,
      (status, node) => {
        statusReceived = status;
        nodeReceived = node || "";
      },
      (chunk) => {
        chunkReceived += chunk;
      },
    );

    assert(
      statusReceived === "Searching exercise catalog..." &&
        nodeReceived === "exerciseRetriever" &&
        chunkReceived === "🏋️‍♂️ Bench Press" &&
        res.complete === true,
      "4. Network Chunk Splits across Buffer Boundaries (Byte-by-byte split)",
      `status='${statusReceived}', node='${nodeReceived}', chunk='${chunkReceived}'`,
    );
  } catch (err: unknown) {
    const error = err as Error;
    results.push({ test: "4. Network Chunk Splits across Buffer Boundaries", status: "FAIL", details: error.message });
  }

  // --- Test 5: Node Status Transitions ---
  try {
    const nodesInSequence = ["equipmentResolver", "exerciseRetriever", "planBuilder", "safetyEvaluator"];
    const statusesInSequence = [
      "Resolving equipment...",
      "Searching exercise catalog...",
      "Building weekly schedule...",
      "Evaluating safety & compliance...",
    ];

    let sseData = "";
    for (let i = 0; i < nodesInSequence.length; i++) {
      sseData += `data: ${JSON.stringify({ status: statusesInSequence[i], node: nodesInSequence[i] })}\n\n`;
      sseData += `data: ${JSON.stringify({ chunk: `node_${nodesInSequence[i]}_output ` })}\n\n`;
    }
    sseData += `data: ${JSON.stringify({ complete: true, workoutPlan: { success: true } })}\n\n`;

    const trackedTransitions: { status: string; node?: string }[] = [];
    const stream = createStreamFromChunks([encoder.encode(sseData)]);

    const res = await parseSseStream(stream, (status, node) => {
      trackedTransitions.push({ status, node });
    });

    const isMatch =
      trackedTransitions.length === 4 &&
      trackedTransitions.every(
        (t, idx) => t.node === nodesInSequence[idx] && t.status === statusesInSequence[idx],
      );

    assert(
      isMatch && res.complete === true,
      "5. Node Status Transitions (4-node pipeline sequence)",
      `Tracked ${trackedTransitions.length} transitions. Match: ${isMatch}`,
    );
  } catch (err: unknown) {
    const error = err as Error;
    results.push({ test: "5. Node Status Transitions", status: "FAIL", details: error.message });
  }

  // Print results summary
  console.log("\n==========================================");
  console.log("   Milestone 1 SSE Stress Test Suite      ");
  console.log("==========================================");
  let totalPass = 0;
  for (const r of results) {
    console.log(`[${r.status}] ${r.test}`);
    if (r.status === "FAIL") {
      console.log(`       Details: ${r.details}`);
    } else {
      totalPass++;
    }
  }
  console.log("------------------------------------------");
  console.log(`Total: ${results.length} | Passed: ${totalPass} | Failed: ${results.length - totalPass}`);
  console.log("==========================================\n");

  if (totalPass !== results.length) {
    process.exit(1);
  }
}

runStressTests();
