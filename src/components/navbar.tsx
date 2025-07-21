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
  Menu,
  MenuItem,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

/**
 * Main navigation bar component for the application.
 * Displays app logo, links, user profile, and authentication actions.
 * Integrates Clerk for authentication and user state.
 */
const NavBar = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Handle menu open and close for mobile
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) =>
    setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  // Shows a loading bar while user data is being fetched.
  if (!isLoaded) {
    return (
      <AppBar
        position="sticky"
        sx={{ background: "linear-gradient(90deg, #1976d2, #42a5f5)" }}
      >
        <Toolbar>
          <Typography color="white">Loading...</Typography>
        </Toolbar>
      </AppBar>
    );
  }

  // Renders navigation options depending on whether the user is signed in.
  return (
    <AppBar
      position="sticky"
      sx={{
        background: "linear-gradient(90deg, #1976d2, #42a5f5)",
        color: "white",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between", py: 1 }}>
        {/* Logo and brand name as clickable link */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            textDecoration: "none",
            gap: "8px",
          }}
        >
          <Image src="/app-icon.png" width={45} height={45} alt="Logo" />
          <Typography
            variant="h6"
            sx={{ fontWeight: "bold", color: "white", fontSize: "1.8rem" }}
          >
            FitSpark
          </Typography>
        </Link>

        {/* Desktop navigation and actions */}
        <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 2 }}>
          <SignedIn>
            {/* If signed in, show workout plan link, sign out button, and avatar linking to profile */}
            <Link href="/workoutplan">
              <Typography
                variant="h6"
                component="span"
                sx={{ color: "white", fontWeight: "medium"}}
              >
                Workout Plan
              </Typography>
            </Link>

            <SignOutButton>
              <Button
                variant="outlined"
                sx={{
                  color: "white",
                  borderColor: "white",
                  fontSize: "15px",
                  px: "12px",
                  py: "6px",
                }}
              >
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
            {/* If not signed in, show sign up action */}
            <Button
              variant="outlined"
              sx={{
                textTransform: "none",
                color: "white",
                borderColor: "white",
                fontWeight: "bold",
                fontSize: "15px",
                px: "14px",
                py: "6px",
              }}
              component={Link}
              href="/sign-up"
            >
              Sign Up
            </Button>
          </SignedOut>
        </Box>

        {/* Mobile view */}
        <Box sx={{ display: { xs: "flex", md: "none" }, alignItems: "center", gap: 1 }}>
          <IconButton sx={{ color: "white" }} onClick={handleMenuOpen}>
            <MenuIcon />
          </IconButton>

          <SignedIn>
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
        </Box>

        {/* Dropdown menu for mobile */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <SignedIn>
            <MenuItem component={Link} href="/workoutplan">
              Workout Plan
            </MenuItem>
            <MenuItem>
              <SignOutButton>Sign Out</SignOutButton>
            </MenuItem>
          </SignedIn>
          <SignedOut>
            <MenuItem component={Link} href="/sign-up">
              Sign Up
            </MenuItem>
          </SignedOut>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;
