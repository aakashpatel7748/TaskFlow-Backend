import mongoose, { Model, Schema } from "mongoose";
import { WorkspaceManage, WorkspacePurpose, WorkspaceRole } from "../constants/constant.js";

export interface IWorkspaceMember {
    user: mongoose.Types.ObjectId;
    role: WorkspaceRole;
    joinedAt: Date
}


export interface IWorkspace {
    _id: string,
    purpose: WorkspacePurpose,
    manage: WorkspaceManage,
    name: string,
    createdBy: mongoose.Types.ObjectId,
    members: IWorkspaceMember[]
}


const workspaceSchema = new Schema<IWorkspace>(
    {
        name: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index: true
        },
        purpose: {
            type: String,
            required: true,
            enum: Object.values(WorkspacePurpose),
            default: WorkspacePurpose.WORK
        },
        manage: {
            type: String,
            enum: Object.values(WorkspaceManage),
            required: true
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        members: [
            {
                user: {
                    type: Schema.Types.ObjectId,
                    ref: "User",
                    require: true
                },
                role: {
                    type: String,
                    enum: Object.values(WorkspaceRole),
                    default: WorkspaceRole.MEMBER
                },
                joinedAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ]

    },
    {
        timestamps: true
    }
)

type WorkspaceModel = Model<IWorkspace>;

export const Workspace = mongoose.model<IWorkspace, WorkspaceModel>("Workspace", workspaceSchema)