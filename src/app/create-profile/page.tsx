"use client"

import { useUser } from "@clerk/nextjs";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type ApiResponse = {
  message: string;
  error?: string;
};

/**
 * Sends a POST request to create a user profile.
 * Returns the response JSON.
 */
const createProfileRequest = async () => {
  const response = await fetch("/api/create-profile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = await response.json();
  return data as ApiResponse;
}

/**
 * React component that attempts to create a user profile
 * immediately upon mount (if signed in).
 * On success, redirects to /subscribe.
 */
const createProfile = () => {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter()
  const { mutate, isPending } = useMutation<ApiResponse, Error>({
    mutationFn: createProfileRequest,
    onSuccess: (data) => {
      // On success, route the user to the subscription page.
      router.push("/subscribe")
    },
    onError: (error) => {
      // Logs error to the browser console (for debugging).
      console.log(error);
    },
  });

  useEffect(() => {
    // Runs profile creation once user is loaded and authenticated.
    if (isLoaded && isSignedIn && !isPending) {
      mutate();
    }
  }, [isLoaded, isSignedIn]);
  return (
    <>
      <div>Processing sign in</div>
    </>
  );
}

export default createProfile;
