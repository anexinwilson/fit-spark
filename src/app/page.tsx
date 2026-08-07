import { ArrowRight, CalendarDays, Dumbbell, RefreshCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import heroBg from "../../public/homepage.webp";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const benefits = [
  {
    icon: CalendarDays,
    title: "A plan, not random workouts",
    description:
      "Follow a clear four-week sequence and always see today, this week, and what comes next.",
  },
  {
    icon: Dumbbell,
    title: "Built around your gym",
    description:
      "Choose the equipment you recognize and get exercises that match your experience and limits.",
  },
  {
    icon: RefreshCw,
    title: "Flexible when life changes",
    description:
      "Move, shorten, skip, or replace a workout without losing the structure of your program.",
  },
];

const steps = [
  [
    "1",
    "Tell us what feels realistic",
    "Share your goal, schedule, experience, and equipment.",
  ],
  [
    "2",
    "See one clear next step",
    "Start with a guided workout that explains what to do and why.",
  ],
  [
    "3",
    "Build confidence over time",
    "Track what you completed and let the plan adjust around real life.",
  ],
] as const;

export default function Home() {
  return (
    <>
      <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden bg-slate-950 text-white">
        <Image
          src={heroBg}
          alt="A welcoming gym training space"
          fill
          priority
          placeholder="blur"
          unoptimized
          sizes="100vw"
          className="-z-20 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-linear-to-r from-slate-950/90 via-slate-950/70 to-slate-950/35" />
        <div className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-semibold tracking-widest text-sky-300 uppercase">
              Your beginner-friendly gym guide
            </p>
            <h1 className="text-4xl leading-tight font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Walk into the gym knowing exactly what to do next.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200 sm:text-xl">
              FitSpark turns your goals, schedule, and available equipment into
              a clear workout sequence that adapts when life gets in the way.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-12 bg-blue-600 px-6 text-base hover:bg-blue-500",
                )}
              >
                Create my plan
                <ArrowRight aria-hidden="true" />
              </Link>
              <Link
                href="#how-it-works"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-12 border-white/40 bg-white/10 px-6 text-base text-white hover:bg-white/20 hover:text-white",
                )}
              >
                See how it works
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-300">
              See how it works before choosing the plan that fits you.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-black italic tracking-tighter sm:text-5xl text-foreground">
              Less guessing. More confidence.
            </h2>
            <p className="text-muted-foreground mt-4 text-xl">
              The useful parts of a coach, organized into a calm experience for
              someone who is still learning the gym.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {benefits.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="h-full border-white/10 bg-card/40 backdrop-blur-xl shadow-2xl">
                <CardContent className="p-8">
                  <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-primary/20 text-primary">
                    <Icon aria-hidden="true" className="size-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">{title}</h3>
                  <p className="text-muted-foreground mt-4 leading-relaxed text-lg">
                    {description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-ambient-aurora py-24 sm:py-32 relative">
        <div className="absolute inset-0 bg-background/50 pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-center text-4xl font-black italic tracking-tighter sm:text-6xl text-foreground">
            How it works
          </h2>
          <ol className="mt-16 grid gap-12 md:grid-cols-3">
            {steps.map(([number, title, description]) => (
              <li key={number} className="text-center">
                <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary text-2xl font-black italic text-primary-foreground shadow-[0_0_30px_rgba(139,92,246,0.3)]">
                  {number}
                </span>
                <h3 className="mt-6 text-2xl font-bold text-white">{title}</h3>
                <p className="text-muted-foreground mt-4 leading-relaxed text-lg">
                  {description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
