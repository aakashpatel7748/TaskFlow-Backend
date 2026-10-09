import type { Request, Response } from "express";
import { validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import { User } from "../models/user.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { logger } from "../lib/logger.js";
import { WorkspaceInvitation } from "../models/workspaceInvitePeople.js";
import { Workspace } from "../models/workspace.js";



const generateAccessAndRefereshTokens = async (userId: string) => {

    try {
        const user = await User.findById(userId)
        if (!user) {
            throw new ApiError(404, "User not found")
        }
        const accessToken = user?.generateAccessToken()
        const refreshToken = user?.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

const registerUser = asyncHandler(async (req: Request, res: Response) => {
    const TAG = "User Register Successfull"
    logger.info(TAG)

    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({ message: "Validation error", error: error.array() })
    }
    const { fullName, email, username, password, inviteToken } = req.body
    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }


    const user = await User.create({
        fullName,
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    if (inviteToken) {
        const invitation = await WorkspaceInvitation.findOne({
            token: inviteToken,
            email: email.toLowerCase(),
            status: "pending"
        })
        if (invitation && invitation.expiresAt.getTime() > Date.now()) {
            // Workspace ke members array me user ko add karo
            await Workspace.findByIdAndUpdate(invitation.workspace, {
                $addToSet: {
                    members: {
                        user: user._id,
                        role: invitation.role,
                        joinedAt: new Date()
                    }
                }
            })
            // Invitation status ko "accepted" mark karo
            invitation.status = "accepted"
            await invitation.save()
        }
    }
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

})

const loginUser = asyncHandler(async (req: Request, res: Response) => {
    const TAG = "User Login Successfull"
    logger.info(TAG)
    const { identifier, password, inviteToken } = req.body

    if (!identifier || !password) {
        throw new ApiError(400, "username or email is required")
    }

    // Here is an alternative of above code based on logic discussed in video:
    // if (!(username || email)) {
    //     throw new ApiError(400, "username or email is required")

    // }

    const user = await User.findOne({
        $or: [{ username: identifier.toLowerCase() }, { email: identifier.toLowerCase() }]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    if (!user.password) {
        throw new ApiError(400, "This account was created via Google Sign-In. Please login using Google.")
    }


    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    if (inviteToken) {
        const invitation = await WorkspaceInvitation.findOne({
            token: inviteToken,
            email: user.email.toLowerCase(),
            status: "pending"
        })
        if (invitation && invitation.expiresAt.getTime() > Date.now()) {
            await Workspace.findByIdAndUpdate(invitation.workspace, {
                $addToSet: {
                    members: {
                        user: user._id,
                        role: invitation.role,
                        joinedAt: new Date()
                    }
                }
            })
            invitation.status = "accepted"
            await invitation.save()
        }
    }

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged In Successfully"
            )
        )

})

const googleAuthCallback = asyncHandler(async (req: Request, res: Response) => {
    const TAG = "Google Auth Callback Successfull"
    logger.info(TAG)

    const user = req.user

    if (!user) {
        throw new ApiError(400, "User not found");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);

    const options = {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
    }

    res.cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)

    return res.redirect(`${process.env.FRONTEND_URL}/tasks/dashboard`)
})

const checkUsernameUnique = asyncHandler(async (req: Request, res: Response) => {
    const TAG = "Check Username Unique"
    logger.info(TAG)

    const { username } = req.body

    if (!username) {
        throw new ApiError(400, "Username is required")
    }

    const user = await User.findOne({ username: username.toLowerCase() })

    if (user) {
        return res.status(200).json(new ApiResponse(200, {}, "Username is already taken"))
    }

    return res.status(200).json(new ApiResponse(200, {}, "Usernaem is unique"))
})

const logoutUser = asyncHandler(async (req: Request, res: Response) => {
    const TAG = "User Logout Successfull"
    logger.info(TAG)

    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
    const TAG = "Refresh Access Token"
    logger.info(TAG)

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET!
        )
        if (typeof decodedToken === "string") {
            throw new ApiError(401, "Invalid refresh token");
        }

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }


        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")

        }

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
        }

        const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: refreshToken },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(
            401,
            error instanceof Error ? error.message : "Invalid refresh token"
        );
    }

})

const changeCurrentPassword = asyncHandler(async (req: Request, res: Response) => {
    const TAG = "Change Current Password Successfull"
    logger.info(TAG)

    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
    const TAG = "Get Current User Successfull"
    logger.info(TAG)

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            req.user,
            "User fetched successfully"
        ))
})

const updateAccountDetails = asyncHandler(async (req: Request, res: Response) => {
    const TAG = "Update Account Details Successfull"
    logger.info(TAG)

    const { fullName, email } = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        { new: true }

    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"))
});


export {
    changeCurrentPassword, checkUsernameUnique, getCurrentUser,
    loginUser,
    logoutUser,
    refreshAccessToken, registerUser, updateAccountDetails, googleAuthCallback
};

