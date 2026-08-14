import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { env } from "./env";
import { upsertUserByGoogleId } from "../repositories/userRepo";

passport.serializeUser((user: any, done) => done(null, user));
passport.deserializeUser((user: any, done) => done(null, user));

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value ?? "";
          const avatar = profile.photos?.[0]?.value;

          const user = await upsertUserByGoogleId({
            googleId: profile.id,
            name: profile.displayName,
            email,
            avatar,
          });

          done(null, user);
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );
} else {
  console.warn(
    "[auth] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set - Google login will not work until configured in .env"
  );
}

export default passport;
