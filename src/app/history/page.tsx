import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CalendarDays, CheckCircle2, Trophy } from "lucide-react";
import { format } from "date-fns";

import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function HistoryPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-up");

  const sessions = await prisma.workoutSession.findMany({
    where: { 
      userId,
      completedAt: { not: null }
    },
    orderBy: { completedAt: "desc" },
    include: {
      exercises: {
        include: {
          sets: true
        }
      }
    }
  });

  return (
    <main className="min-h-screen bg-ambient-aurora bg-background py-24 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] pointer-events-none opacity-50" />
      
      <div className="mx-auto max-w-4xl px-4 sm:px-6 relative z-10">
        <div className="mt-4 mb-8">
          <h1 className="text-5xl font-black tracking-tighter sm:text-6xl italic text-foreground flex items-center gap-4">
            <Trophy className="size-10 sm:size-12 text-primary" />
            Your History
          </h1>
          <p className="text-muted-foreground mt-6 max-w-2xl text-xl leading-relaxed">
            Every completed workout and exercise tracked over time.
          </p>
        </div>

        {sessions.length === 0 ? (
          <Card className="mt-8 border-white/5 bg-card/40 backdrop-blur-3xl shadow-2xl">
            <CardContent className="p-12 text-center">
              <div className="mx-auto size-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                <CalendarDays className="size-8 text-slate-500" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">No history yet</h2>
              <p className="text-muted-foreground mt-2 max-w-lg mx-auto text-sm">
                Complete a workout on your dashboard to see your history appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {sessions.map((session) => {
              const completedExercisesCount = session.exercises.filter(
                ex => ex.sets.some(s => s.completed)
              ).length;
              const totalExercises = session.exercises.length;
              
              return (
                <Card key={session.id} className="overflow-hidden border-white/5 shadow-xl bg-card/40 backdrop-blur-3xl">
                  <CardHeader className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-white/5 bg-black/20 p-6 space-y-0">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                      <CheckCircle2 className="size-6 text-emerald-500" aria-hidden="true" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-2xl font-bold tracking-tight">{session.name}</CardTitle>
                        <Badge variant="secondary" className="text-[10px] font-bold tracking-widest uppercase text-slate-400">
                          {format(session.completedAt!, "MMM d, yyyy")}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-400 mt-1">
                        {completedExercisesCount} of {totalExercises} exercises completed
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                      {session.exercises.map((ex) => {
                        const setsDone = ex.sets.filter(s => s.completed).length;
                        if (setsDone === 0) return null; // Only show exercises that had at least one set done
                        
                        return (
                          <div key={ex.id} className="rounded-lg border border-white/5 bg-white/5 p-3 text-sm flex items-center justify-between">
                            <span className="font-medium truncate pr-2">{ex.exerciseName}</span>
                            <Badge variant="outline" className="shrink-0 bg-white/5 border-white/10 text-[10px]">
                              {setsDone} {setsDone === 1 ? 'set' : 'sets'}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
