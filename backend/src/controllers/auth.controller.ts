import { Request, Response } from "express";
import passport from "passport";
import {
  Strategy as GoogleStrategy,
  Profile,
  VerifyCallback,
} from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import { prisma } from "../db/client";
import { env } from "../config/environment";
import { logger } from "../config/logger";

// ─── Configure Passport Google Strategy ─────────────────

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL,
      scope: ["profile", "email"],
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: VerifyCallback
    ) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error("No email found in Google profile"));
        }

        // Upsert: create new user or update tokens for existing one
        const identity = await prisma.identity.upsert({
          where: { googleId: profile.id },
          update: {
            accessToken,
            refreshToken: refreshToken ?? undefined,
            displayName: profile.displayName,
            avatarUrl: profile.photos?.[0]?.value,
          },
          create: {
            googleId: profile.id,
            email,
            displayName: profile.displayName,
            avatarUrl: profile.photos?.[0]?.value,
            accessToken,
            refreshToken: refreshToken ?? "",
          },
        });

        logger.info({ userId: identity.id, email }, "OAuth identity resolved");
        done(null, identity);
      } catch (err) {
        done(err as Error);
      }
    }
  )
);

// ─── Route Handlers ─────────────────────────────────────

/** GET /auth/google — redirects to Google consent screen */
export const initiateGoogleAuth = passport.authenticate("google", {
  session: false,
  scope: ["profile", "email"],
});

/** GET /auth/google/callback — exchanges code for tokens, issues JWT */
export function handleGoogleCallback(req: Request, res: Response): void {
  passport.authenticate(
    "google",
    { session: false },
    (err: Error | null, user: any) => {
      if (err || !user) {
        logger.error({ err }, "Google OAuth callback failed");
        res.redirect(
          `${env.FRONTEND_URL}/login?error=auth_failed`
        );
        return;
      }

      // Mint a JWT for the frontend
      const token = jwt.sign(
        { sub: user.id, email: user.email },
        env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      // Redirect to frontend with token in query (frontend stores it)
      res.redirect(
        `${env.FRONTEND_URL}/auth/callback?token=${token}`
      );
    }
  )(req, res);
}

/** GET /auth/me — returns current user profile from JWT */
export async function getCurrentUser(
  req: Request,
  res: Response
): Promise<void> {
  const userId = (req as any).user?.sub;

  const identity = await prisma.identity.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  if (!identity) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res.json({ user: identity });
}

/**
 * POST /auth/dev-login — Development-only shortcut.
 * Issues a JWT for the seeded dev user so you can test
 * the full flow without configuring Google OAuth credentials.
 */
export async function devLogin(req: Request, res: Response): Promise<void> {
  if (env.NODE_ENV === "production") {
    res.status(403).json({ message: "Dev login disabled in production" });
    return;
  }

  const identity = await prisma.identity.findFirst({
    where: { googleId: "dev-test-user-001" },
  });

  if (!identity) {
    res.status(404).json({
      message: "Dev user not found — run: npm run db:seed",
    });
    return;
  }

  const token = jwt.sign(
    { sub: identity.id, email: identity.email },
    env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token, user: identity });
}
