"use client";

import React from "react";
import {
  Box,
  Button,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
} from "@mui/material";
import Link from "next/link";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import EventNoteIcon from "@mui/icons-material/EventNote";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

interface Step {
  step: number;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    step: 1,
    title: "Tell Us About You",
    description:
      "Complete a short questionnaire about your goals, experience, and equipment.",
  },
  {
    step: 2,
    title: "Subscribe & Generate",
    description: "Choose your plan and get your AI-generated workout schedule.",
  },
  {
    step: 3,
    title: "Start Training",
    description:
      "Access your plan anytime and follow the workouts to reach your goals.",
  },
];

export default function Home() {
  return (
    <Box>
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          background: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('/homepage.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: "white",
          px: "16px",
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h2" fontWeight="bold" gutterBottom>
            Your Personalized Monthly Workout Plan, Crafted by AI
          </Typography>
          <Typography variant="h6" sx={{ mb: "32px" }}>
            Stop guessing. Start training with a plan that adapts to your goals,
            schedule, and progress with FitSpark.
          </Typography>
          <Button
            variant="contained"
            size="large"
            endIcon={<ArrowForwardIcon />}
            sx={{ py: "16px", px: "32px" }}
            component={Link}
            href="/sign-up"
          >
            Create My Plan
          </Button>
        </Container>
      </Box>

      <Box sx={{ py: "80px" }}>
        <Container maxWidth="lg">
          <Typography variant="h3" align="center" gutterBottom>
            Why Choose FitSpark?
          </Typography>
          <Grid
            container
            spacing={4}
            sx={{ justifyContent: "center", mt: "32px" }}
          >
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: "100%", p: "24px", textAlign: "center" }}>
                <CardContent>
                  <EventNoteIcon
                    color="primary"
                    sx={{ fontSize: "48px", mb: "16px" }}
                  />
                  <Typography variant="h5" gutterBottom>
                    Structured Monthly Plans
                  </Typography>
                  <Typography color="text.secondary">
                    Receive a detailed 4-week workout schedule, laid out
                    day-by-day, so you always know what to do next.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: "100%", p: "24px", textAlign: "center" }}>
                <CardContent>
                  <FitnessCenterIcon
                    color="primary"
                    sx={{ fontSize: "48px", mb: "16px" }}
                  />
                  <Typography variant="h5" gutterBottom>
                    Truly Personalized
                  </Typography>
                  <Typography color="text.secondary">
                    Plans are tailored based on your fitness level, goals, and
                    available equipment.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Box sx={{ py: "80px", bgcolor: "grey.50" }}>
        <Container maxWidth="lg">
          <Typography variant="h3" align="center" gutterBottom>
            How It Works
          </Typography>
          <Grid container spacing={4} sx={{ mt: "32px" }}>
            {steps.map(({ step, title, description }) => (
              <Grid size={{ xs: 12, md: 4 }} key={step}>
                <Box
                  sx={{
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    minHeight: "280px",
                  }}
                >
                  <Box
                    sx={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "24px",
                      fontWeight: "bold",
                      mb: "24px",
                    }}
                  >
                    {step}
                  </Box>
                  <Typography variant="h5" gutterBottom>
                    {title}
                  </Typography>
                  <Typography color="text.secondary">{description}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    </Box>
  );
}
