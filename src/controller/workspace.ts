import type { Request, Response } from "express"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { Workspace } from "../models/workspace.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { WorkspaceInvitation } from "../models/workspaceInvitePeople.js"
import { User } from "../models/user.js"
import { logger } from "../lib/logger.js"


export const createWorkspace = asyncHandler(async (req: Request, res: Response) => {

    const TAG = "Workspace create successfull"
    logger.info(TAG)

    const { name, manage, purpose } = req.body;
    console.log(name, manage, purpose);

    if (!name || !manage || !purpose) {
        throw new ApiError(400, "All fields are required")
    }

    if (!req.user?._id) {
        throw new ApiError(401, "Unauthorized request")
    }

    const user = await User.findById(req.user._id);
    if (!user) {
        throw new ApiError(404, "User not found")
    }

    const workspace = await Workspace.create({
        name: name.toLowerCase(),
        createdBy: req.user._id,
        manage,
        purpose
    })

    const createdWorkspace = await Workspace.findById(workspace._id)

    if (!createdWorkspace) {
        throw new ApiError(500, "Something went wrong while creating the workspace")
    }


    return res.status(201).json(
        new ApiResponse(200, createdWorkspace, "Workspace created Successfully")
    )

})

export const getWorkspace = asyncHandler(async (req: Request, res: Response) => {

    const TAG = "Workspace get successfull"
    logger.info(TAG)

    const workspace = await Workspace.find({
        $or: [
            { createdBy: req.user?._id },
            { "members.user": req.user?._id }
        ]
    })
        .populate("createdBy", "username fullName email")
        .populate("members.user", "username fullName email");

    if (!workspace) {
        throw new ApiError(404, "Workspace not found")
    }

    return res.status(200).json(
        new ApiResponse(200, workspace, "Workspace fetched Successfully")
    )

})

export const updateWorkspace = asyncHandler(async (req: Request, res: Response) => {

    const { id } = req.params;

    if (!req.user?._id) {
        throw new ApiError(401, "Unauthorized request")
    }

    const workspace = await Workspace.findById(id)

    if (!workspace) {
        throw new ApiError(404, "Workspace not found")
    }

    if (workspace.createdBy.toString() !== req.user._id.toString()) {
        throw new ApiError(401, "Unauthorized request")
    }

    const updatedWorkspace = await Workspace.findByIdAndUpdate(id, req.body, { new: true })

    if (!updatedWorkspace) {
        throw new ApiError(500, "Something went wrong while creating the workspace")
    }

    return res.status(201).json(
        new ApiResponse(200, updatedWorkspace, "Workspace updated Successfully")
    )

})

export const deleteWorkspace = asyncHandler(async (req: Request, res: Response) => {

    const { id } = req.params;

    if (!req.user?._id) {
        throw new ApiError(401, "Unauthorized request")
    }

    const workspace = await Workspace.findByIdAndDelete(id)

    if (!workspace) {
        throw new ApiError(404, "Workspace not found")
    }

    if (workspace.createdBy.toString() !== req.user._id.toString()) {
        throw new ApiError(401, "Unauthorized request")
    }


    return res.status(201).json(
        new ApiResponse(200, {}, "Workspace deleted Successfully")
    )

})