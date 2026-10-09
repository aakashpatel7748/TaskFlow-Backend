import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import type { Request, Response } from "express"
import { User } from "../models/user.js"
import { ApiError } from "../utils/ApiError.js"
import { WorkspaceInvitation } from "../models/workspaceInvitePeople.js"
import crypto from "crypto";
import { Workspace } from "../models/workspace.js"
import { logger } from "../lib/logger.js"
import { sendEmail } from "../helpers/sendEmail.js"

export const inviteWorkspaceMember = asyncHandler(async (req: Request, res: Response, next) => {
    const TAG = "Email Invitation Called"
    logger.info(TAG)

    const { email, workspaceId, role } = req.body

    if (!email || !workspaceId) {
        throw new ApiError(400, "All fields are required")
    }

    const inviteToken = crypto.randomBytes(32).toString("hex");
    const inviteLink = `${process.env.FRONTEND_URL}/invite/${inviteToken}`;

    const user = await User.findById(req.user?._id)
    const workspace = await Workspace.findById(workspaceId)
    if (!user) {
        throw new ApiError(404, "User not found")
    }
    if (!workspace) {
        throw new ApiError(404, "Workspace not found")
    }
    if (workspace.createdBy.toString() !== req.user?._id.toString()) {
        throw new ApiError(401, "Unauthorized request")
    }
    const invitation = await WorkspaceInvitation.create({
        email: email.toLowerCase(),
        invitedBy: req.user?._id,
        workspace: workspaceId,
        token: inviteToken,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        role
    })
    await sendEmail(email.toLowerCase(), inviteLink, user.email, workspace.name)

    return res.status(201).json(
        new ApiResponse(200, invitation, "Invitation email sent Successfully")
    )
})


export const checkInvitationToken = asyncHandler(async (req: Request, res: Response, next) => {
    const TAG = "Check Invitation Token Called"
    logger.info(TAG)

    const { token } = req.query;
    if (!token || typeof token !== "string") {
        throw new ApiError(400, "Token is required")
    }
    const invitation = await WorkspaceInvitation.findOne({ token })
    if (!invitation) {
        throw new ApiError(404, "Invitation not found")
    }
    if (invitation.expiresAt.getTime() < Date.now()) {
        throw new ApiError(400, "Invitation has expired")
    }
    const user = await User.findOne({ email: invitation.email })
    return res.status(200).json(
        new ApiResponse(200, {
            isUserExist: !!user,
            email: invitation.email,
            token: invitation.token
        }, "Invitation token is valid")
    )
})

export const getEmailInvitationList = asyncHandler(async (req: Request, res: Response) => {
    const TAG = "Email Invitation List"
    logger.info(TAG)

    const invitation = await WorkspaceInvitation.find();

    return res.status(201).json(
        new ApiResponse(201, invitation, "Invitation Get successfully")
    )

})
