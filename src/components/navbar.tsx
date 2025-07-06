"use client";
import { SignedIn, SignedOut, SignOutButton, useUser } from "@clerk/nextjs";
import { Button } from "@mui/material";
import Image from "next/image";
import Link from "next/link";

const NavBar = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  if (!isLoaded) {
    return <p>Loading ...</p>;
  }
  return (
    <nav>
      <div>
        <Link href="/">
          <Image src="/window.svg" width={60} height={60} alt="Logo" />
        </Link>
      </div>
      <div>
        <SignedIn>
          <Link href="/workoutplan">Workout Plan</Link>
          {user?.imageUrl ? (
            <Link href="/profile">
              <Image
                src={user.imageUrl}
                alt="Profile Picture"
                width={40}
                height={40}
              />
            </Link>
          ) : (
            <div></div>
          )}
          <SignOutButton>
            <Button>Sign Out</Button>
          </SignOutButton>
        </SignedIn>
        <SignedOut></SignedOut>
      </div>
    </nav>
  );
};

export default NavBar;
