"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

type ApiResponse = { message?: string; error?: string };

async function createProfileRequest() {
  const response = await fetch("/api/create-profile", { method: "POST" });
  const data = (await response.json()) as ApiResponse;

  if (!response.ok) {
    throw new Error(data.error ?? "Unable to finish setting up your profile");
  }

  return data;
}

export default function CreateProfilePage() {
  const attempted = useRef(false);
  const { isLoaded, isSignedIn } = useUser();
  const creation = useMutation({
    mutationFn: createProfileRequest,
    onSuccess: () => window.location.replace("/auth/continue"),
  });

  useEffect(() => {
    if (isLoaded && isSignedIn && !attempted.current) {
      attempted.current = true;
      creation.mutate();
    }
  }, [creation, isLoaded, isSignedIn]);

  if (isLoaded && !isSignedIn) {
    window.location.replace("/sign-up");
    return null;
  }

  return (
    <section className="flex min-h-[calc(100svh-4rem)] items-center justify-center bg-slate-50 px-4 py-12">
      <div className="bg-card w-full max-w-md rounded-xl border p-8 text-center shadow-sm">
        {creation.isError ? (
          <>
            <AlertCircle
              className="mx-auto size-10 text-red-600"
              aria-hidden="true"
            />
            <h1 className="mt-4 text-xl font-semibold">
              Setup needs another try
            </h1>
            <p role="alert" className="text-muted-foreground mt-2 text-sm">
              {creation.error.message}
            </p>
            <Button
              className="mt-6"
              onClick={() => {
                attempted.current = true;
                creation.mutate();
              }}
            >
              Try again
            </Button>
          </>
        ) : (
          <>
            <Loader2
              className="mx-auto size-10 animate-spin text-blue-600"
              aria-hidden="true"
            />
            <h1 className="mt-4 text-xl font-semibold">
              Setting up your profile
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              This should only take a moment.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
