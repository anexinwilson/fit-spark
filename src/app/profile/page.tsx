"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  CircularProgress,
  Avatar,
  Typography,
  Container,
  Divider,
  Chip,
  Paper,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from "@mui/material";
import { availablePlans } from "@/lib/plans";
import toast, { Toaster } from "react-hot-toast";
import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Fetches the current user's subscription status from the backend.
 */
const fetchSubscriptionStatus = async () => {
  const response = await fetch("/api/profile/subscription-status");
  return response.json();
};

/**
 * Sends a request to update the user's subscription plan.
 */
const updatePlan = async (newPlan: string) => {
  const response = await fetch("/api/profile/change-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newPlan }),
  });
  return response.json();
};

/**
 * Sends a request to unsubscribe the user.
 */
const unsubscibe = async () => {
  const response = await fetch("/api/profile/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return response.json();
};

/**
 * Renders the user's profile page, including subscription details,
 * plan management, and the ability to unsubscribe.
 * Only accessible for signed-in users.
 */
const Profile = () => {
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const { isLoaded, isSignedIn, user } = useUser();
  const queryClient = useQueryClient();
  const router = useRouter();
  const {
    data: subscription,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["subscription"],
    queryFn: fetchSubscriptionStatus,
    enabled: isLoaded && isSignedIn,
    staleTime: 5 * 60 * 1000,
  });

  // Handles subscription plan updates
  const {
    data: updatedPlan,
    mutate: updatePlanMutation,
    isPending: isUpdatePlanPending,
  } = useMutation({
    mutationFn: updatePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      toast.success("Subscription plan updated successfully!");
      refetch();
    },
    onError: () => {
      toast.error("Error updating plan");
    },
  });

  // Handles unsubscribing from the service
  const {
    data: canceledPlan,
    mutate: unsubscibeMutation,
    isPending: isUnsubscribedPending,
  } = useMutation({
    mutationFn: unsubscibe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      router.push("/subscribe");
    },
    onError: () => {
      toast.error("Error unsubscribing");
    },
  });

  // Finds the user's current plan from the available plans list.
  const currentPlan = availablePlans.find(
    (plan) => plan.interval === subscription?.subscription.subscriptionTier
  );

  // Handles plan change requests.
  const handleUpdatePlan = () => {
    if (selectedPlan) {
      updatePlanMutation(selectedPlan);
    }
    setSelectedPlan("");
  };

  // Handles the user clicking "unsubscribe."
  const handleUnsubscribe = () => {
    if (
      confirm(
        "Are you sure you want to unscribe? You will lose access to premium features."
      )
    ) {
      unsubscibeMutation();
    }
  };

  // Renders loading state while checking auth.
  if (!isLoaded) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        height="50vh"
      >
        <CircularProgress />
        <Typography ml={2}>Loading...</Typography>
      </Box>
    );
  }

  // Redirects users to sign-in if not authenticated.
  if (!isSignedIn) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="warning">Please sign in to view your profile.</Alert>
      </Container>
    );
  }

  // Renders the profile UI with subscription management.
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Toaster position="top-center" />

      <Paper elevation={4} sx={{ borderRadius: 4, p: 4 }}>
        <Box
          display="flex"
          flexDirection={{ xs: "column", sm: "row" }}
          alignItems="center"
          gap={3}
        >
          {user.imageUrl && (
            <Avatar
              src={user.imageUrl}
              alt="User Avatar"
              sx={{ width: 100, height: 100 }}
            />
          )}
          <Box>
            <Typography variant="h5" fontWeight="bold">
              {user.firstName} {user.lastName}
            </Typography>
            <Typography color="text.secondary">
              {user.primaryEmailAddress?.emailAddress}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Typography variant="h5" fontWeight="medium" gutterBottom>
          Subscription Details
        </Typography>

        {isLoading ? (
          // Shows spinner while fetching subscription.
          <Box display="flex" alignItems="center" gap={2}>
            <CircularProgress size={24} />
            <Typography>Loading subscription details...</Typography>
          </Box>
        ) : isError ? (
          <Alert severity="error">{error?.message}</Alert>
        ) : subscription ? (
          <Box
            sx={{
              mt: 2,
              p: 3,
              borderRadius: 2,
              backgroundColor: "grey.100",
              display: "flex",
              gap: 4,
              flexWrap: "wrap",
            }}
          >
            <Box sx={{ flex: 1, minWidth: 250, mt: 3 }}>
              {currentPlan ? (
                <>
                  <Typography variant="h6">
                    <strong>Plan:</strong> {currentPlan.name}
                  </Typography>
                  <Typography variant="h6">
                    <strong>Amount:</strong> {currentPlan.amount}
                    {currentPlan.currency}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1} mt={1}>
                    <Typography variant="h6">
                      <strong>Status:</strong>
                    </Typography>
                    <Chip
                      label="ACTIVE"
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                </>
              ) : (
                <Typography color="text.secondary">
                  Current plan not found.
                </Typography>
              )}
            </Box>

            <Box
              sx={{
                flex: 1,
                minWidth: 250,
                minHeight: 150,
                textAlign: "center",
              }}
            >
              <Typography variant="h6" gutterBottom>
                Change subscription
              </Typography>

              {currentPlan && (
                <>
                  <FormControl
                    fullWidth
                    disabled={isUpdatePlanPending}
                    sx={{ mb: 2, width: 240 }}
                  >
                    <InputLabel id="plan-select-label">
                      Select New Plan
                    </InputLabel>
                    <Select
                      labelId="plan-select-label"
                      value={selectedPlan || currentPlan.interval}
                      label="Select New Plan"
                      onChange={(event) => setSelectedPlan(event.target.value)}
                    >
                      {availablePlans.map((plan) => (
                        <MenuItem key={plan.interval} value={plan.interval}>
                          {plan.name} - ${plan.amount} / {plan.interval}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Button
                    variant="contained"
                    onClick={handleUpdatePlan}
                    disabled={!selectedPlan || isUpdatePlanPending}
                    sx={{ width: 240 }}
                  >
                    Save Change
                  </Button>

                  {isUpdatePlanPending && (
                    <Box display="flex" alignItems="center" mt={2} gap={1}>
                      <CircularProgress size={20} />
                      <Typography>Updating Plan...</Typography>
                    </Box>
                  )}
                </>
              )}
            </Box>
          </Box>
        ) : (
          <Alert severity="info" sx={{ mt: 2 }}>
            You are not subscribed to any plan.
          </Alert>
        )}
        <Divider sx={{ my: 4 }} />

        <Box mt={4} textAlign="center">
          <Typography variant="h6" gutterBottom>
            Unsubscribe
          </Typography>

          <Button
            variant="outlined"
            color="error"
            onClick={handleUnsubscribe}
            disabled={isUnsubscribedPending}
            sx={{ minWidth: 200 }}
          >
            {isUnsubscribedPending ? "Unsubscribing..." : "Unsubscribe"}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Profile;
