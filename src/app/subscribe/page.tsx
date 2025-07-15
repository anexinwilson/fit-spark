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
  CardActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { availablePlans } from "@/lib/plans";
import { useMutation } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

type SubscribeResponse = {
  url: string;
};
type SubscribeError = {
  error: string;
};

/**
 * Sends a POST request to initiate a subscription checkout session for a plan.
 * Expects planType, userId, and email.
 */
const subscribeToPlan = async (
  planType: string,
  userId: string,
  email: string
): Promise<SubscribeResponse> => {
  const response = await fetch("/api/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      planType,
      userId,
      email,
    }),
  });

  if (!response.ok) {
    const errorData: SubscribeError = await response.json();
    throw new Error(errorData.error || "Something went wrong");
  }

  const data: SubscribeResponse = await response.json();
  return data;
};

/**
 * Subscription page for selecting and subscribing to a pricing plan.
 * Only available to signed-in users.
 */
const Subscribe = () => {
  const { user } = useUser();
  const router = useRouter();

  // Clerk user ID and email for Stripe Checkout metadata.
  const userId = user?.id;
  const email = user?.emailAddresses[0].emailAddress || "";

  // Handles subscription checkout via React Query mutation.
  const { mutate, isPending } = useMutation<
    SubscribeResponse,
    Error,
    { planType: string }
  >({
    mutationFn: async ({ planType }) => {
      if (!userId) {
        throw new Error("User not signed in");
      }
      return subscribeToPlan(planType, userId, email);
    },
    onMutate: () => {
      // Shows a loading toast while the mutation is running.
      toast.loading("Processing your subscription");
    },
    onSuccess: (data) => {
      // Redirects user to Stripe Checkout on success.
      window.location.href = data.url;
    },
    onError: () => {
      toast.error("Something went wrong");
    },
  });

  // Starts the subscription flow when a plan is selected.
  const handleSubscribe = (planType: string) => {
    if (!userId) {
      router.push("/sign-up");
      return;
    }
    mutate({ planType });
  };

  // Renders the available pricing plans.
  return (
    <Box sx={{ py: 10, bgcolor: "grey.50", minHeight: "100vh" }}>
      <Toaster position="top-right" />
      <Container maxWidth="lg">
        <Box sx={{ textAlign: "center", mb: 8 }}>
          <Typography variant="h3" fontWeight="bold" gutterBottom>
            Pricing
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ maxWidth: 600, mx: "auto" }}
          >
            Get started on our monthly plan or upgrade to yearly when you are
            ready
          </Typography>
        </Box>

        <Grid
          container
          spacing={4}
          justifyContent="center"
          alignItems="stretch"
        >
          {availablePlans.map((plan) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={plan.name}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  transition: "transform 0.3s ease, box-shadow 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-6px)",
                    boxShadow: 6,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography
                    variant="h4"
                    fontWeight="bold"
                    gutterBottom
                    align="center"
                  >
                    {plan.name}
                  </Typography>

                  <Box sx={{ textAlign: "center", mb: 3 }}>
                    <Typography
                      variant="h3"
                      fontWeight="bold"
                      color="primary.main"
                    >
                      ${plan.amount}/{plan.interval}
                    </Typography>
                  </Box>

                  <Typography
                    color="text.secondary"
                    align="center"
                    sx={{ mb: 4 }}
                  >
                    {plan.description}
                  </Typography>

                  <List sx={{ p: 0 }}>
                    {plan.features.map((feature) => (
                      <ListItem
                        key={feature}
                        sx={{
                          px: 0,
                          py: "4px",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <CheckCircleIcon color="primary" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={feature}
                          primaryTypographyProps={{
                            fontSize: 14,
                            color: "text.secondary",
                            whiteSpace: "nowrap",
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>

                <CardActions>
                  <Button
                    variant="outlined"
                    size="large"
                    fullWidth
                    sx={{
                      fontSize: 16,
                      fontWeight: "bold",
                      lineHeight: 1.5,
                      py: 1.5,
                      textTransform: "none",
                    }}
                    onClick={() => handleSubscribe(plan.interval)}
                    disabled={isPending}
                  >
                    {isPending ? "Please wait ..." : `Subscribe ${plan.name}`}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ textAlign: "center", mt: 6 }}>
          <Typography variant="body2" color="text.secondary">
            Cancel anytime. No hidden fees.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Subscribe;
