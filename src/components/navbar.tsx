"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { CalendarDays, Dumbbell, History, Menu, ClipboardList } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const authenticatedLinks = [
  { href: "/today", label: "Today" },
  { href: "/explore", label: "Explore" },
  { href: "/workoutplan", label: "My Plan" },
  { href: "/history", label: "History" },
  { href: "/profile#subscription", label: "Billing" },
  { href: "/profile", label: "Profile" },
];

export default function NavBar() {
  return (
    <header className="fixed inset-x-0 top-6 z-50 flex justify-center px-4">
      <nav
        aria-label="Primary navigation"
        className="flex h-14 w-full max-w-4xl items-center justify-between rounded-full border border-white/10 bg-background/60 px-6 text-foreground shadow-2xl backdrop-blur-2xl supports-[backdrop-filter]:bg-background/40"
      >
        <Link
          href="/"
          className="flex items-center gap-3 rounded-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <Image
            src="/app-icon.png"
            width={32}
            height={32}
            sizes="32px"
            alt=""
            className="size-8 rounded-lg"
          />
          <span className="text-xl font-bold italic tracking-tight sm:text-2xl">
            FitSpark
          </span>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          <Show when="signed-in">
            <Button
              nativeButton={false}
              variant="ghost"
              className="h-10 px-4 text-white hover:bg-white/15 hover:text-white"
              render={<Link href="/today" />}
            >
              <CalendarDays aria-hidden="true" />
              Today
            </Button>

            <Button
              nativeButton={false}
              variant="ghost"
              className="h-10 px-4 text-white hover:bg-white/15 hover:text-white"
              render={<Link href="/explore" />}
            >
              <Dumbbell aria-hidden="true" />
              Explore
            </Button>
            <Button
              nativeButton={false}
              variant="ghost"
              className="h-10 px-4 text-white hover:bg-white/15 hover:text-white"
              render={<Link href="/workoutplan" />}
            >
              <ClipboardList aria-hidden="true" />
              My Plan
            </Button>
            <Button
              nativeButton={false}
              variant="ghost"
              className="h-10 px-4 text-white hover:bg-white/15 hover:text-white"
              render={<Link href="/history" />}
            >
              <History aria-hidden="true" />
              History
            </Button>
            <Button
              nativeButton={false}
              variant="ghost"
              className="h-10 px-4 text-white hover:bg-white/15 hover:text-white"
              render={<Link href="/profile#subscription" />}
            >
              Profile & Billing
            </Button>
            <UserButton />
          </Show>

          <Show when="signed-out">
            <Button
              nativeButton={false}
              variant="ghost"
              className="h-10 px-4 text-white hover:bg-white/15 hover:text-white"
              render={<Link href="/explore" />}
            >
              <Dumbbell aria-hidden="true" />
              Explore
            </Button>
            <SignInButton>
              <Button
                variant="ghost"
                className="h-10 px-4 text-white hover:bg-white/15 hover:text-white"
              >
                Sign in
              </Button>
            </SignInButton>
            <SignUpButton>
              <Button className="h-10 bg-white px-4 text-blue-700 hover:bg-blue-50">
                Start free
              </Button>
            </SignUpButton>
          </Show>
        </div>

        <div className="flex items-center gap-3 md:hidden">
          <Show when="signed-in">
            <UserButton />
          </Show>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Open navigation"
              render={
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className="text-white hover:bg-white/15 hover:text-white"
                />
              }
            >
              <Menu aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem render={<Link href="/explore" />}>
                Explore
              </DropdownMenuItem>
              <Show when="signed-in">
                {authenticatedLinks
                  .filter((link) => link.href !== "/explore")
                  .map((link) => (
                    <DropdownMenuItem
                      key={link.href}
                      render={<Link href={link.href} />}
                    >
                      {link.label}
                    </DropdownMenuItem>
                  ))}
              </Show>
              <Show when="signed-out">
                <DropdownMenuItem>
                  <SignInButton>Sign in</SignInButton>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <SignUpButton>Start free</SignUpButton>
                </DropdownMenuItem>
              </Show>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </header>
  );
}
