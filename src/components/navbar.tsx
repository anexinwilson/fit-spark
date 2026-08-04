"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Dumbbell, Menu } from "lucide-react";
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
  { href: "/workoutplan", label: "Workout plan" },
  { href: "/profile", label: "Profile" },
];

export default function NavBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-blue-400/30 bg-linear-to-r from-blue-700 to-sky-500 text-white shadow-sm">
      <nav
        aria-label="Primary navigation"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
      >
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        >
          <Image
            src="/app-icon.png"
            width={40}
            height={40}
            sizes="40px"
            alt=""
            className="size-10 rounded-xl"
          />
          <span className="text-xl font-bold tracking-tight sm:text-2xl">
            FitSpark
          </span>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          <Show when="signed-in">
            <Button
              nativeButton={false}
              variant="ghost"
              className="h-10 px-4 text-white hover:bg-white/15 hover:text-white"
              render={<Link href="/workoutplan" />}
            >
              <Dumbbell aria-hidden="true" />
              Workout plan
            </Button>
            <UserButton />
          </Show>

          <Show when="signed-out">
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
              <Show when="signed-in">
                {authenticatedLinks.map((link) => (
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
