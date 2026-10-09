import passport from "passport"
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from "../models/user.js";


export function passportAuth() {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: 'http://localhost:3000/api/v1/user/auth/google/callback',
    }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        const email = profile.emails?.[0]?.value;

        if (!email) {
            return done(new Error("Google account email not found"));
        }

        let user = await User.findOne({ email });

        if (!user) {
            user = await User.create({
                fullName: profile.displayName,
                email,
                username: `${profile.displayName.split(" ")[0]
                    .toLowerCase()
                    .replace(/\s+/g, "_")}_${Date.now().toString().slice(-2)}`,
            });
        }

        return done(null, user);
    }
    ));
    return passport
}



