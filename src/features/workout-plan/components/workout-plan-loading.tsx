"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, Circle, Layers, Activity } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";

export interface LangGraphNode {
  id: string;
  name: string;
  description: string;
}

export const WORKFLOW_NODES: LangGraphNode[] = [
  {
    id: "equipmentResolver",
    name: "Equipment Resolver",
    description: "Resolving equipment...",
  },
  {
    id: "exerciseRetriever",
    name: "Exercise Catalog Search",
    description: "Searching exercise catalog...",
  },
  {
    id: "planBuilder",
    name: "Plan Builder",
    description: "Building weekly schedule...",
  },
  {
    id: "safetyEvaluator",
    name: "Safety & Compliance Evaluator",
    description: "Evaluating safety & compliance...",
  },
];

interface WorkoutPlanLoadingProps {
  activeNodeId?: string;
  statusMessage?: string;
  logLines?: string[];
}

export function WorkoutPlanLoading({
  activeNodeId = "equipmentResolver",
  statusMessage = "Building your workout plan...",
  logLines = [],
}: WorkoutPlanLoadingProps) {
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const terminalContainerRef = useRef<HTMLDivElement>(null);

  // Determine current active node index
  const activeNodeIndex = WORKFLOW_NODES.findIndex(
    (n) =>
      n.id === activeNodeId ||
      (statusMessage &&
        statusMessage.toLowerCase().includes(n.name.toLowerCase())) ||
      (statusMessage &&
        statusMessage
          .toLowerCase()
          .includes(n.description.replace("...", "").toLowerCase())),
  );
  const currentIndex = activeNodeIndex >= 0 ? activeNodeIndex : 0;

  // Auto-scroll terminal to bottom on new log
  useEffect(() => {
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop =
        terminalContainerRef.current.scrollHeight;
    }
  }, [logLines]);

  // Colour-code log lines by node prefix
  function getLineColor(line: string): string {
    if (line.includes("[equipmentResolver]")) return "text-violet-400";
    if (line.includes("[exerciseRetriever]")) return "text-sky-400";
    if (line.includes("[planBuilder]")) return "text-emerald-400";
    if (line.includes("[safetyEvaluator]")) return "text-amber-400";
    return "text-slate-300";
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-slate-200/80 shadow-xl shadow-blue-950/5 dark:border-slate-800">
        <CardHeader className="border-b bg-gradient-to-br from-blue-50/80 via-white to-slate-50 p-6 sm:px-8 sm:py-6 dark:from-blue-950/30 dark:via-slate-900 dark:to-slate-900/50">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                >
                  <Activity className="mr-1 size-3 animate-pulse text-blue-600 dark:text-blue-400" />
                  Generator Active
                </Badge>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  LangGraph Engine Pipeline
                </span>
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
                {statusMessage ||
                  WORKFLOW_NODES[currentIndex]?.description ||
                  "Generating Workout Routine"}
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Customizing exercises based on your equipment and preferences.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                <Spinner className="size-5" />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6 pt-4 sm:px-8 sm:pb-8 sm:pt-6">
          {/* LangGraph Node Execution Stepper */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                <Layers className="size-3.5" /> Execution Pipeline
              </h3>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Step {currentIndex + 1} of {WORKFLOW_NODES.length}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {WORKFLOW_NODES.map((node, index) => {
                const isCompleted = index < currentIndex;
                const isActive = index === currentIndex;

                return (
                  <div
                    key={node.id}
                    className={`relative flex flex-col justify-between rounded-xl border p-4 transition-all duration-200 ${
                      isActive
                        ? "border-blue-500 bg-blue-50/50 shadow-md shadow-blue-500/5 dark:border-blue-400 dark:bg-blue-950/40"
                        : isCompleted
                          ? "border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                          : "border-slate-200/80 bg-slate-50/40 opacity-70 dark:border-slate-800 dark:bg-slate-900/40"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isCompleted ? (
                            <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          ) : isActive ? (
                            <Spinner className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Circle className="size-4 shrink-0 text-slate-300 dark:text-slate-600" />
                          )}
                          <span
                            className={`text-xs font-semibold ${
                              isActive
                                ? "text-blue-900 dark:text-blue-100"
                                : isCompleted
                                  ? "text-emerald-950 dark:text-emerald-100"
                                  : "text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {node.name}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {node.description}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2">
                      <Badge
                        variant={
                          isCompleted
                            ? "secondary"
                            : isActive
                              ? "default"
                              : "outline"
                        }
                        className={`px-2 py-0.5 text-[10px] font-medium ${
                          isCompleted
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                            : isActive
                              ? "bg-blue-600 text-white dark:bg-blue-500"
                              : "text-slate-400 dark:text-slate-500"
                        }`}
                      >
                        {isCompleted
                          ? "Completed"
                          : isActive
                            ? "In Progress"
                            : "Pending"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Interactive Agent Activity Terminal */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-wider text-slate-700 uppercase dark:text-slate-300">
                Agent Activity Log
              </h3>
              <Badge
                variant="outline"
                className="border-slate-700 bg-slate-900 font-mono text-[10px] text-slate-400"
              >
                {logLines.length} events
              </Badge>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl">
              {/* Terminal Window Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/90 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="size-2.5 rounded-full bg-rose-500/80" />
                    <div className="size-2.5 rounded-full bg-amber-500/80" />
                    <div className="size-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="ml-2 font-mono text-xs text-slate-400">
                    fitspark-agent --live
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px] text-emerald-400/90">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                  </span>
                  LIVE
                </div>
              </div>

              {/* Terminal Content */}
              <div
                ref={terminalContainerRef}
                className="h-[200px] overflow-y-auto p-4 font-mono text-xs leading-relaxed"
              >
                {logLines.length === 0 ? (
                  <span className="text-slate-500 italic">
                    Waiting for agent to start
                    <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-slate-500 align-middle" />
                  </span>
                ) : (
                  logLines.map((line, i) => {
                    const isLast = i === logLines.length - 1;
                    return (
                      <div key={i} className="flex items-start gap-2">
                        <span className="mt-px shrink-0 text-slate-600">›</span>
                        <span className={getLineColor(line)}>
                          {line}
                          {isLast && (
                            <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-current align-middle opacity-70" />
                          )}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={terminalEndRef} />
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 pt-1">
              {[
                { label: "equipmentResolver", color: "bg-violet-400" },
                { label: "exerciseRetriever", color: "bg-sky-400" },
                { label: "planBuilder", color: "bg-emerald-400" },
                { label: "safetyEvaluator", color: "bg-amber-400" },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={`size-2 rounded-full ${color}`} />
                  <span className="font-mono text-[10px] text-slate-500">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
