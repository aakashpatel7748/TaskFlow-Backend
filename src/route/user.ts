import { Router } from "express";
import { body } from "express-validator";
import {
    changeCurrentPassword,
    checkUsernameUnique,
    getCurrentUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    registerUser,
    updateAccountDetails,
    googleAuthCallback
} from "../controller/user.js";
import { verifyJWT } from "../middlewares/auth.js";
import passport from "passport";

const route = Router()

route.post("/register", [
    body("fullName").isLength({ min: 3 }).withMessage("First name is required"),
    body("email").isEmail().withMessage("Email is required"),
    body("username").isLength({ min: 3 }).withMessage("Username is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long")
], registerUser)

route.post("/login", loginUser)

// login with google
route.get("/auth/google", passport.authenticate('google', {
    scope: ["profile", "email"],
}))

route.get(
    "/auth/google/callback",
    passport.authenticate("google", {
        session: false,
        failureRedirect: "/login",
    }),
    googleAuthCallback
);

route.post("/check-username-unique", checkUsernameUnique)

//secured routes
route.post("/logout", verifyJWT, logoutUser)
route.post("/refresh-token", refreshAccessToken)
route.post("/change-password", verifyJWT, changeCurrentPassword)
route.get("/current-user", verifyJWT, getCurrentUser)
route.patch("/update-account", verifyJWT, updateAccountDetails)




export default route