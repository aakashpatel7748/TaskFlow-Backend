import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Space } from "../models/space.js";
import { Project } from "../models/project.js";
import { Task } from "../models/Tasks.js";
import { logger } from "../lib/logger.js";

const saveSpace = asyncHandler(async (req: Request, res: Response) => {
    const TAG = "Save Space Called";
    logger.info(TAG)

    const { name, description, color, icon, workSpaceId } = req.body;
    if (!workSpaceId) {
        throw new ApiError(400, "Workspace not found");
    }
    if (!name) {
        throw new ApiError(400, "All fields are required")
    }

    const user = req.user;

    if (!user) {
        throw new ApiError(401, "Unauthorized");
    }

    const space = await Space.create({
        name,
        description,
        color,
        icon,
        workspace: workSpaceId,
        createdBy: user._id,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, "Space created successfully"))
});

const getSpace = asyncHandler(async (req: Request, res: Response) => {
    const TAG = "Get Space Called";
    logger.info(TAG);

    const user = req.user;
    const { workspaceId, spaceId } = req.query;
    if (!user) {
        throw new ApiError(401, "Unauthorized");
    }

    if (spaceId && typeof spaceId === "string") {
        const singleSpace = await Space.findById(spaceId)
            .populate("createdBy", "username fullName email avatar")
            .populate("workspace", "name description");

        if (!singleSpace) {
            throw new ApiError(404, "Space not found");
        }

        return res
            .status(200)
            .json(new ApiResponse(200, singleSpace, "Space fetched successfully"));
    }

    if (!workspaceId || typeof workspaceId !== "string") {
        throw new ApiError(400, "Workspace not found");
    }

    const space = await Space.find({
        workspace: workspaceId,
    })
    .populate("createdBy", "username fullName email avatar")
    .sort({ createdAt: -1 });

    return res
        .status(200)
        .json(new ApiResponse(200, space, "Space fetched successfully"));
});

const getSpaceById = asyncHandler(async (req: Request, res: Response) => {
    const TAG = "Get Space By ID Called";
    logger.info(TAG);

    const user = req.user;
    if (!user) {
        throw new ApiError(401, "Unauthorized");
    }

    const spaceId = req.params.spaceId || req.query.spaceId || (req.params as any)?.id;
    if (!spaceId || typeof spaceId !== "string") {
        throw new ApiError(400, "Space ID is required");
    }

    const space = await Space.findById(spaceId)
        .populate("createdBy", "username fullName email avatar")
        .populate("workspace", "name description");

    if (!space) {
        throw new ApiError(404, "Space not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, space, "Space fetched successfully"));
});

const updateSpace = asyncHandler(async (req: Request, res: Response) => {
    const TAG = "Update Space Called";
    logger.info(TAG);

    const user = req.user;
    if (!user) {
        throw new ApiError(401, "Unauthorized");
    }

    const { name, description, color, icon } = req.body;
    const spaceId = req.params.spaceId || req.query.spaceId || req.body.spaceId;

    if (!spaceId) {
        throw new ApiError(400, "spaceId is required");
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;

    const updatedSpace = await Space.findByIdAndUpdate(
        spaceId,
        updateData,
        { new: true }
    ).populate("createdBy", "username fullName email avatar");

    if (!updatedSpace) {
        throw new ApiError(404, "Space not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedSpace, "Space updated successfully"));
});

const deleteSpace = asyncHandler(async (req: Request, res: Response) => {
    const TAG = "Delete Space Called";
    logger.info(TAG);

    const user = req.user;
    if (!user) {
        throw new ApiError(401, "Unauthorized");
    }

    const spaceId = req.params.spaceId || req.query.spaceId || req.body.spaceId;

    if (!spaceId) {
        throw new ApiError(400, "spaceId is required");
    }

    const deletedSpace = await Space.findByIdAndDelete(spaceId);

    if (!deletedSpace) {
        throw new ApiError(404, "Space not found");
    }

    // Cascade delete associated projects and tasks
    const projects = await Project.find({ space: spaceId });
    const projectIds = projects.map((p) => p._id);

    if (projectIds.length > 0) {
        await Task.deleteMany({ projectId: { $in: projectIds } });
        await Project.deleteMany({ space: spaceId });
    }

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Space and associated projects deleted successfully"));
});

export {
    saveSpace,
    getSpace,
    getSpaceById,
    updateSpace,
    deleteSpace
};