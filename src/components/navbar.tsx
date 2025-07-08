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

const NavBar = () => {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) {
    return (
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography>Loading...</Typography>
        </Toolbar>
      </AppBar>
    );
  }

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar sx={{ justifyContent: "space-between" }}>
        {/* Left side - Logo */}
        <Link href="/" style={{ textDecoration: "none" }}>
          <Image src="/window.svg" width={60} height={60} alt="Logo" />
        </Link>

        {/* Right side - Workout Plan, Profile and Sign Out */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <SignedIn>
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
            <Link href="/">
              <Button color="inherit" sx={{ textTransform: 'none' }} size="large">Home</Button>
            </Link>
            <Link
              href={isSignedIn ? "/subscribe" : "/sign-up"}
              
            >
              <Button color="inherit" sx={{ textTransform: 'none' }} size="large">Subscribe</Button>
            </Link>
            <Link href="/sign-up">
              <Button variant="outlined" sx={{ textTransform: 'none' }} color="primary" size="medium">
                Sign Up
              </Button>
            </Link>
          </SignedOut>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;
