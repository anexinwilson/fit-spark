"use client";

import React from "react";
import {
  Paper,
  Typography,
  TextField,
  FormControlLabel,
  Checkbox,
  Button,
  Grid,
  Container,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
} from "@mui/material";
import { useMutation } from "@tanstack/react-query";

/**
 * Interface describing the expected input for generating a workout plan.
 */
interface WorkoutPlanInput {
  workoutType: string;
  fitnessGoal: string;
  experienceLevel: string;
  preferredDuration: number;
  includeCardio: boolean;
  days?: number;
  ageRange: string;
  equipment: string;
  limitations: string;
  daysPerWeek: number;
}

/**
 * Structure for API response containing the generated weekly workout plan.
 */
interface WorkoutPlanResponse {
  workoutPlan?: WeeklyWorkoutPlan;
  error: string;
}

/**
 * Structure for a daily workout plan.
 */
interface DailyWorkoutPlan {
  warmup?: string;
  mainWorkout?: string;
  cooldown?: string;
  cardio?: string;
}

/**
 * Weekly workout plan: each day of the week can map to a daily plan.
 */
interface WeeklyWorkoutPlan {
  [day: string]: DailyWorkoutPlan;
}

/**
 * Sends a POST request to generate an AI-powered workout plan.
 */
const generateWorkoutPlan = async (payload: WorkoutPlanInput) => {
  const response = await fetch("/api/generate-workoutplan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return response.json();
};

/**
 * Main dashboard component for users to create and view AI-generated workout plans.
 */
const WorkoutPlanDashboard = () => {
  const { mutate, isPending, data, isSuccess } = useMutation<
    WorkoutPlanResponse,
    Error,
    WorkoutPlanInput
  >({
    mutationFn: generateWorkoutPlan,
  });

  // Handles form submission and collects data for the API.
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formdata = new FormData(e.currentTarget);

    const payload: WorkoutPlanInput = {
      workoutType: formdata.get("workoutType")?.toString() || "",
      fitnessGoal: formdata.get("fitnessGoal")?.toString() || "",
      experienceLevel: formdata.get("experienceLevel")?.toString() || "",
      preferredDuration: Number(formdata.get("preferredDuration")) || 15,
      includeCardio: formdata.get("includeCardio") !== null,
      ageRange: formdata.get("ageRange")?.toString() || "",
      equipment: formdata.get("equipment")?.toString() || "",
      limitations: formdata.get("limitations")?.toString() || "",
      daysPerWeek: Number(formdata.get("daysPerWeek")) || 3,
      days: 7,
    };
    mutate(payload);
  };

  // Returns the list of days with generated workout plans.
  const getActiveDays = () => {
    const allDays = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    if (!data?.workoutPlan) return allDays;
    return allDays.filter((day) => data.workoutPlan![day]);
  };

  // Gets the workout plan for a specific day.
  const getWorkoutPlanForDay = (day: string): DailyWorkoutPlan | undefined => {
    if (!data?.workoutPlan) return undefined;
    return data?.workoutPlan[day];
  };

  // Renders the main UI for workout plan generation and display.
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              color="primary.main"
              sx={{ mb: 3 }}
            >
              AI Workout Plan Generator
            </Typography>

            <form onSubmit={handleSubmit} noValidate>
              {/* Various user input fields for the workout plan generator */}
              <FormControl fullWidth margin="normal" variant="outlined">
                <InputLabel>What type of workouts do you prefer?</InputLabel>
                <Select
                  name="workoutType"
                  label="What type of workouts do you prefer?"
                >
                  <MenuItem value="bodyweight">
                    Bodyweight (No equipment needed)
                  </MenuItem>
                  <MenuItem value="gym">Gym workouts (Full equipment)</MenuItem>
                  <MenuItem value="home-basic">
                    Home workouts (Basic equipment)
                  </MenuItem>
                  <MenuItem value="yoga-pilates">Yoga & Pilates</MenuItem>
                  <MenuItem value="hiit">
                    High-Intensity Interval Training
                  </MenuItem>
                  <MenuItem value="low-impact">
                    Low-impact (Joint-friendly)
                  </MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth margin="normal" variant="outlined">
                <InputLabel>Fitness Goal</InputLabel>
                <Select name="fitnessGoal" label="Fitness Goal">
                  <MenuItem value="weight-loss">Weight Loss</MenuItem>
                  <MenuItem value="muscle-gain">Muscle Gain</MenuItem>
                  <MenuItem value="strength">Build Strength</MenuItem>
                  <MenuItem value="endurance">Improve Endurance</MenuItem>
                  <MenuItem value="general-fitness">General Fitness</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth margin="normal" variant="outlined">
                <InputLabel>Fitness Experience</InputLabel>
                <Select name="experienceLevel" label="Fitness Experience">
                  <MenuItem value="complete-beginner">
                    Complete Beginner (Never worked out)
                  </MenuItem>
                  <MenuItem value="beginner">
                    Beginner (Some experience)
                  </MenuItem>
                  <MenuItem value="intermediate">
                    Intermediate (Regular workouts)
                  </MenuItem>
                  <MenuItem value="advanced">
                    Advanced (Years of experience)
                  </MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth margin="normal" variant="outlined">
                <InputLabel>Age Range</InputLabel>
                <Select name="ageRange" label="Age Range">
                  <MenuItem value="18-25">18-25</MenuItem>
                  <MenuItem value="26-35">26-35</MenuItem>
                  <MenuItem value="36-45">36-45</MenuItem>
                  <MenuItem value="46-55">46-55</MenuItem>
                  <MenuItem value="55+">55+</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth margin="normal" variant="outlined">
                <InputLabel>Available Equipment</InputLabel>
                <Select name="equipment" label="Available Equipment">
                  <MenuItem value="none">No equipment</MenuItem>
                  <MenuItem value="dumbbells">Dumbbells</MenuItem>
                  <MenuItem value="resistance-bands">Resistance Bands</MenuItem>
                  <MenuItem value="yoga-mat">Yoga Mat</MenuItem>
                  <MenuItem value="full-gym">Full Gym Access</MenuItem>
                  <MenuItem value="basic-home">Basic Home Setup</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth margin="normal" variant="outlined">
                <InputLabel>How many days per week?</InputLabel>
                <Select name="daysPerWeek" label="How many days per week?">
                  <MenuItem value="3">3 days (Beginner friendly)</MenuItem>
                  <MenuItem value="4">4 days (Moderate)</MenuItem>
                  <MenuItem value="5">5 days (Active)</MenuItem>
                  <MenuItem value="6">6 days (Very active)</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Preferred Duration (minutes)"
                name="preferredDuration"
                margin="normal"
                variant="outlined"
                type="number"
                slotProps={{
                  htmlInput: {
                    min: 15,
                    max: 90,
                  },
                }}
              />

              <TextField
                fullWidth
                label="Any injuries or physical limitations? (Optional)"
                name="limitations"
                margin="normal"
                variant="outlined"
                multiline
                rows={2}
                placeholder="e.g., knee injury, back pain, etc."
              />

              <FormControlLabel
                control={<Checkbox name="includeCardio" />}
                label="Include cardio"
                sx={{ mt: 2, mb: 2 }}
              />

              <Button
                type="submit"
                variant="contained"
                size="small"
                sx={{ mt: 2 }}
                fullWidth={false}
                disabled={isPending}
              >
                {isPending ? "Generating..." : "Generate Workout Plan"}
              </Button>
            </form>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 9 }}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography
              variant="h5"
              component="h2"
              gutterBottom
              color="text.primary"
            >
              Weekly Workout Plan
            </Typography>

            {data?.workoutPlan && isSuccess ? (
              // Renders the generated workout plan by day.
              <Box>
                {getActiveDays().map((day, key) => {
                  const workoutPlan = getWorkoutPlanForDay(day);
                  return (
                    <Box key={key} mb={2}>
                      <Typography variant="h6" color="primary">
                        {day}
                      </Typography>
                      {workoutPlan ? (
                        <Box>
                          {workoutPlan.warmup && (
                            <Typography variant="body2">
                              <strong>Warm-up:</strong> {workoutPlan.warmup}
                            </Typography>
                          )}
                          {workoutPlan.mainWorkout && (
                            <Typography variant="body2">
                              <strong>Main:</strong> {workoutPlan.mainWorkout}
                            </Typography>
                          )}
                          {workoutPlan.cooldown && (
                            <Typography variant="body2">
                              <strong>Cooldown:</strong> {workoutPlan.cooldown}
                            </Typography>
                          )}
                          {workoutPlan.cardio && (
                            <Typography variant="body2">
                              <strong>Cardio:</strong> {workoutPlan.cardio}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No workout available
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            ) : isPending ? (
              <CircularProgress />
            ) : (
              <Typography color="text.secondary">
                Please generate a workout plan to see here
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default WorkoutPlanDashboard;
