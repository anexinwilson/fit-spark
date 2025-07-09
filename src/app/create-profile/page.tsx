"use client"

import { useUser } from "@clerk/nextjs";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type ApiResponse = {
  message: string;
  error?: string;
};

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
const createProfile = () => {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter()
  const { mutate, isPending } = useMutation<ApiResponse, Error>({
    mutationFn: createProfileRequest,
    onSuccess: (data) => {
      router.push("/subscribe")
    },
    onError: (error) => {
      console.log(error);
    },
  });
  useEffect(() => {
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
