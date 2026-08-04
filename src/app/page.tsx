import { ArrowRight, CalendarDays, Dumbbell, RefreshCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

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
      <section className="relative isolate flex min-h-[calc(100svh-4rem)] items-center overflow-hidden bg-slate-950 text-white">
        <Image
          src="/homepage.webp"
          alt="A welcoming gym training space"
          fill
          priority
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

      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Less guessing. More confidence.
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              The useful parts of a coach, organized into a calm experience for
              someone who is still learning the gym.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {benefits.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="h-full border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <Icon aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-semibold">{title}</h3>
                  <p className="text-muted-foreground mt-3 leading-7">
                    {description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-slate-50 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            How it works
          </h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map(([number, title, description]) => (
              <li key={number} className="text-center">
                <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
                  {number}
                </span>
                <h3 className="mt-5 text-xl font-semibold">{title}</h3>
                <p className="text-muted-foreground mt-3 leading-7">
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
