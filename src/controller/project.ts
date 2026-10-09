import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Project } from "../models/project.js";
import { Task } from "../models/Tasks.js";
import type { Request, Response } from "express";
import { logger } from "../lib/logger.js";

const saveProject = asyncHandler(async (req: Request, res: Response) => {
    const TAG = "Save Project"
    logger.info(TAG)

    const { name, description, isPrivate } = req.body;
    const { workspaceId, spaceId } = req.query as {
        workspaceId: string,
        spaceId: string
    }

    if (!req.user?._id) {
        throw new ApiError(401, "Unauthorized request");
    }

    const project = await Project.create({
        name,
        description,
        isPrivate,
        createdBy: req.user._id,
        workspace: workspaceId,
        space: spaceId
    })

    return res
        .status(200)
        .json(new ApiResponse(200, project, "project created successfully"))
});

const getAllProject = asyncHandler(async (req: Request, res: Response) => {
    const TAG = " Get Project"
    logger.info(TAG)

    const { workspaceId, spaceId } = req.query as {
        workspaceId?: string,
        spaceId?: string
    }

    const query: any = {};
    if (workspaceId && workspaceId !== "undefined" && workspaceId !== "null") {
        query.workspace = workspaceId;
    }
    if (spaceId && spaceId !== "undefined" && spaceId !== "null") {
        query.space = spaceId;
    }

    const projects = await Project.find(query)
        .populate("createdBy", "username fullName email avatar")
        .populate("space", "name _id")
        .populate("workspace", "name _id")
        .sort({ _id: -1 });

    return res
        .status(200)
        .json(new ApiResponse(200, projects, "projects fetched successfully"))
})

const getProject = asyncHandler(async (req: Request, res: Response) => {
    const TAG = " Get Project with Id"
    logger.info(TAG)

    const { workspaceId, projectId } = req.query as {
        workspaceId?: string,
        projectId?: string
    }

    const id = projectId || (req.params as any)?.projectId || (req.params as any)?.id;

    if (!id || id === "undefined" || id === "null") {
        throw new ApiError(400, "projectId is required");
    }

    const project = await Project.findById(id)
        .populate("space", "name _id")
        .populate("workspace", "name _id")
        .populate("createdBy", "username fullName email avatar");

    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, project, "project fetched successfully"))
})

const updateProject = asyncHandler(async (req: Request, res: Response) => {
    const TAG = "Update Project";
    logger.info(TAG);

    if (!req.user?._id) {
        throw new ApiError(401, "Unauthorized request");
    }

    const { name, description, isPrivate, spaceId } = req.body;
    const projectId = req.params.projectId || req.query.projectId || req.body.projectId;

    if (!projectId) {
        throw new ApiError(400, "projectId is required");
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isPrivate !== undefined) updateData.isPrivate = isPrivate;
    if (spaceId !== undefined && spaceId !== "") updateData.space = spaceId;

    const updatedProject = await Project.findByIdAndUpdate(
        projectId,
        updateData,
        { new: true }
    )
        .populate("space", "name _id")
        .populate("workspace", "name _id")
        .populate("createdBy", "username fullName email avatar");

    if (!updatedProject) {
        throw new ApiError(404, "Project not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedProject, "Project updated successfully"));
});

const deleteProject = asyncHandler(async (req: Request, res: Response) => {
    const TAG = "Delete Project";
    logger.info(TAG);

    if (!req.user?._id) {
        throw new ApiError(401, "Unauthorized request");
    }

    const projectId = req.params.projectId || req.query.projectId || req.body.projectId;

    if (!projectId) {
        throw new ApiError(400, "projectId is required");
    }

    const deletedProject = await Project.findByIdAndDelete(projectId);

    if (!deletedProject) {
        throw new ApiError(404, "Project not found");
    }

    // Delete tasks inside this project
    await Task.deleteMany({ projectId: projectId });

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Project and associated tasks deleted successfully"));
});

export {
    saveProject,
    getAllProject,
    getProject,
    updateProject,
    deleteProject
}