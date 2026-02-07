import { Router } from "express";
import {
  initiateGoogleAuth,
  handleGoogleCallback,
  getCurrentUser,
  devLogin,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/authenticate";

const router = Router();

// Step 1: redirect user to Google consent screen
router.get("/google", initiateGoogleAuth);

// Step 2: Google redirects back here with a code
router.get("/google/callback", handleGoogleCallback);

// Step 3: frontend calls this to verify its token
router.get("/me", authenticate, getCurrentUser);

// Dev-only: bypass OAuth for local testing
router.post("/dev-login", devLogin);

export default router;
