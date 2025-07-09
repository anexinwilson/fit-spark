import { SignUp } from "@clerk/nextjs";
import { Box } from "@mui/material";

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
