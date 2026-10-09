import mongoose from "mongoose";
import { Model, Schema } from "mongoose";
import { WorkspaceRole } from "../constants/constant.js";

interface IWorkspaceInvitation {
    workspace: mongoose.Types.ObjectId;
    email: string;
    invitedBy: mongoose.Types.ObjectId;
    role: WorkspaceRole;
    token: string;
    status: "pending" | "accepted" | "expired";
    expiresAt: Date;
}

const workspaceInvitationSchema = new Schema<IWorkspaceInvitation>({
    workspace: {
        type: Schema.Types.ObjectId,
        ref: "Workspace",
        required: true
    },

    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,

    },

    invitedBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    role: {
        type: String,
        enum: Object.values(WorkspaceRole),
        default: WorkspaceRole.MEMBER,
    },
    token: String,

    status: {
        type: String,
        enum: ["pending", "accepted", "expired"],
        default: "pending"
    },

    expiresAt: Date
})


export const WorkspaceInvitation = mongoose.model<IWorkspaceInvitation>("WorkspaceInvitation", workspaceInvitationSchema)