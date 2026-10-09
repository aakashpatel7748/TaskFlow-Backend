import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Task } from "../models/Tasks.js";
import { User } from "../models/user.js";
import { Workspace } from "../models/workspace.js";
import { Project } from "../models/project.js";
import { WorkspaceInvitation } from "../models/workspaceInvitePeople.js";
import { WorkspaceRole, TaskStatus, TaskPriority } from "../constants/constant.js";
import { sendEmail } from "../helpers/sendEmail.js";
import crypto from "crypto";
import type { Request, Response } from "express";
import { uploadImageInImageKit } from "../helpers/imageKit.js";
import { logger } from "../lib/logger.js";

const normalizeStatus = (status?: string): TaskStatus => {
    if (!status) return TaskStatus.TODO;
    const s = status.toLowerCase().trim();
    if (s === "in-progress" || s === "in_progress" || s === "inprogress") return TaskStatus.IN_PROGRESS;
    if (s === "completed" || s === "done") return TaskStatus.COMPLETED;
    return TaskStatus.TODO;
};

const normalizePriority = (priority?: string): TaskPriority => {
    if (!priority) return TaskPriority.MEDIUM;
    const p = priority.toLowerCase().trim();
    if (p === "low") return TaskPriority.LOW;
    if (p === "high") return TaskPriority.HIGH;
    if (p === "urgent") return TaskPriority.URGENT;
    return TaskPriority.MEDIUM;
};

const saveTask = asyncHandler(async (req: Request, res: Response) => {
    const TAG = "Task Called"
    logger.info(TAG)
    const { name, description, status, priority, dueDate, assignee, projectId, workspaceId } = req.body
    const file = req.file;
    if (!name || (typeof name === "string" && name.trim() === "")) {
        throw new ApiError(400, "Task name is required")
    }

    let imagekitResponse;
    if (file) {
        const base64 = file.buffer.toString('base64');
        imagekitResponse = await uploadImageInImageKit(base64, file.originalname)
    }

    let finalAssigneeId: any = undefined;
    let finalAssigneeEmail: string | undefined = undefined;

    if (assignee && typeof assignee === "string" && assignee.trim() !== "") {
        const trimmed = assignee.trim();
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);

        if (isEmail) {
            finalAssigneeEmail = trimmed.toLowerCase();
            // Check if user exists in TaskFlow
            const existingUser = await User.findOne({ email: finalAssigneeEmail });
            if (existingUser) {
                finalAssigneeId = existingUser._id;
                // If workspace exists, add user to workspace members if not already member
                if (workspaceId && workspaceId.trim() !== "") {
                    await Workspace.findByIdAndUpdate(workspaceId, {
                        $addToSet: { members: { user: existingUser._id, role: WorkspaceRole.MEMBER } }
                    });
                }
            } else {
                // User doesn't exist yet -> Send invitation email if workspace exists
                if (workspaceId && workspaceId.trim() !== "" && req.user?._id) {
                    try {
                        const currentUser = await User.findById(req.user._id);
                        const ws = await Workspace.findById(workspaceId);
                        if (ws && currentUser) {
                            const inviteToken = crypto.randomBytes(32).toString("hex");
                            const inviteLink = `${process.env.FRONTEND_URL}/invite/${inviteToken}`;

                            const existingInvite = await WorkspaceInvitation.findOne({
                                email: finalAssigneeEmail,
                                workspace: workspaceId
                            });

                            if (!existingInvite) {
                                await WorkspaceInvitation.create({
                                    email: finalAssigneeEmail,
                                    invitedBy: req.user._id,
                                    workspace: workspaceId as any,
                                    token: inviteToken,
                                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                                    role: WorkspaceRole.MEMBER
                                });
                            }
                            // Asynchronously send email without blocking if network/smtp is slow
                            sendEmail(finalAssigneeEmail, inviteLink, currentUser.email, ws.name).catch((err) => {
                                logger.error("Auto invite email error: " + err);
                            });
                        }
                    } catch (err) {
                        logger.error("Auto invite setup error: " + err);
                    }
                }
            }
        } else {
            // Provided as ObjectId string
            finalAssigneeId = trimmed;
        }
    }

    const validProjectId = projectId && typeof projectId === "string" && projectId.trim() !== "" ? projectId.trim() : undefined;

    const task = await Task.create({
        name: name.trim(),
        description: description ? description.trim() : undefined,
        status: normalizeStatus(status),
        priority: normalizePriority(priority),
        dueDate: dueDate ? new Date(dueDate) : undefined,
        assignee: finalAssigneeId || undefined,
        assigneeEmail: finalAssigneeEmail || undefined,
        projectId: validProjectId,
        files: file && imagekitResponse ? [{
            filename: imagekitResponse?.name,
            fileUrl: imagekitResponse?.url
        }] : undefined,
        createdBy: req.user?._id,
        workspaceId: workspaceId ? workspaceId.trim() : undefined
    });

    return res
        .status(200)
        .json(new ApiResponse(200, task, "Task created successfully"))
});

const getTasks = asyncHandler(async (req: Request, res: Response) => {
    const TAG = "Get task by project Id or workspace Id"
    logger.info(TAG)
    const { projectId, workspaceId } = req.query as { projectId?: string; workspaceId?: string };

    let query: any = {};

    if (projectId && typeof projectId === "string" && projectId.trim() !== "" && projectId !== "undefined" && projectId !== "null") {
        query.projectId = projectId.trim();
    } else if (workspaceId && typeof workspaceId === "string" && workspaceId.trim() !== "" && workspaceId !== "undefined" && workspaceId !== "null") {
        const workspaceProjects = await Project.find({ workspace: workspaceId.trim() }).select("_id");
        const projectIds = workspaceProjects.map(p => p._id);
        console.log("workspacea and parojectids ====>", projectIds, workspaceId)
        query = {
            // projectId: { $in: projectIds },
            $or: [
                { createdBy: req.user?._id },
                { assignee: req.user?._id }
            ]
        };
    } else if (req.user?._id) {
        console.log("req.user.id=======>", req.user._id)
        query = {
            $or: [
                { createdBy: req.user._id },
                { assignee: req.user._id }
            ]
        };
    }
    console.log("query========>", query)
    const tasks = await Task.find(query)
        .populate("assignee", "username fullName email avatar")
        .populate("createdBy", "username fullName email avatar")
        .populate("projectId", "name description")
        .sort({ _id: -1 });

    const sanitizedTasks = tasks.map((t: any) => {
        const obj = t.toObject ? t.toObject() : t;
        if (obj.files && Array.isArray(obj.files)) {
            obj.files = obj.files.map((f: any) => {
                if (f.fileUrl && typeof f.fileUrl === "string" && f.fileUrl.includes("ik.imagekit.io") && !f.fileUrl.includes("?tr=") && !f.fileUrl.includes("/tr:")) {
                    return { ...f, fileUrl: `${f.fileUrl}?tr=w-1600` };
                }
                return f;
            });
        }
        return obj;
    });

    return res
        .status(200)
        .json(new ApiResponse(200, sanitizedTasks, "Tasks fetched successfully"))
});

export {
    saveTask,
    getTasks
}