"use client";

import { SignedIn, SignedOut, SignOutButton, useUser } from "@clerk/nextjs";
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  Avatar,
  Typography,
  IconButton,
} from "@mui/material";
import Image from "next/image";
import Link from "next/link";

/**
 * Main navigation bar component for the application.
 * Displays app logo, links, user profile, and authentication actions.
 * Integrates Clerk for authentication and user state.
 */
const NavBar = () => {
  const { isLoaded, isSignedIn, user } = useUser();

  // Shows a loading bar while user data is being fetched.
  if (!isLoaded) {
    return (
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography>Loading...</Typography>
        </Toolbar>
      </AppBar>
    );
  }

  // Renders navigation options depending on whether the user is signed in.
  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar sx={{ justifyContent: "space-between" }}>
        <Link href="/">
          {/* Logo image, clickable to home */}
          <Image src="/app-icon.png" width={60} height={60} alt="Logo" />
        </Link>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <SignedIn>
            {/* If signed in, show workout plan link, sign out button, and avatar linking to profile */}
            <Link href="/workoutplan">
              <Typography
                variant="h6"
                component="span"
                sx={{ color: "text.primary", fontWeight: "medium" }}
              >
                Workout Plan
              </Typography>
            </Link>

            <SignOutButton>
              <Button variant="outlined" size="large">
                Sign Out
              </Button>
            </SignOutButton>

            {user?.imageUrl && (
              <Link href="/profile">
                <IconButton sx={{ p: 0 }}>
                  <Avatar
                    src={user.imageUrl}
                    alt="Profile Picture"
                    sx={{ width: 40, height: 40 }}
                  />
                </IconButton>
              </Link>
            )}
          </SignedIn>

          <SignedOut>
            {/* If not signed in, show home, subscribe, and sign up actions */}
            <Button
              color="inherit"
              sx={{ textTransform: "none" }}
              size="large"
              component={Link}
              href="/"
            >
              Home
            </Button>

            <Button
              color="inherit"
              sx={{ textTransform: "none" }}
              size="large"
              component={Link}
              href={isSignedIn ? "/subscribe" : "/sign-up"}
            >
              Subscribe
            </Button>

            <Button
              variant="outlined"
              sx={{ textTransform: "none" }}
              color="primary"
              size="medium"
              component={Link}
              href="/sign-up"
            >
              Sign Up
            </Button>
          </SignedOut>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;
