import { SignUp } from "@clerk/nextjs";
import { Box } from "@mui/material";

/**
 * Renders a full-page sign-up form using Clerk's SignUp component.
 * Redirects new users to /create-profile upon successful sign-up.
 */
const SignUpPage = () => {
  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <SignUp signInFallbackRedirectUrl="/create-profile" />
    </Box>
  );
};

export default SignUpPage;
