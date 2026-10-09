import mongoose, { Schema, Types } from "mongoose";
import { TaskPriority, TaskStatus } from "../constants/constant.js";

export interface ITask {
    _id?: string | Types.ObjectId;
    name: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: Date;
    assignee?: Types.ObjectId | string;
    assigneeEmail?: string;
    files?: {
        filename: string;
        fileUrl: string;
    }[];
    projectId?: Types.ObjectId | string;
    createdBy?: Types.ObjectId | string;
    workspaceId?: Types.ObjectId | string;
}

const taskSchema = new Schema<ITask>({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
    },
    status: {
        type: String,
        enum: Object.values(TaskStatus),
        default: TaskStatus.TODO
    },
    priority: {
        type: String,
        enum: Object.values(TaskPriority),
        default: TaskPriority.MEDIUM
    },
    dueDate: {
        type: Date,
    },
    files: {
        type: [
            {
                filename: { type: String },
                fileUrl: { type: String }
            }
        ],
        default: []

    },
    assignee: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    assigneeEmail: {
        type: String,
        trim: true,
        lowercase: true
    },
    projectId: {
        type: Schema.Types.ObjectId,
        ref: "Project",
        // require: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    workspaceId: {
        type: Schema.Types.ObjectId,
        ref: "Workspace",
        // require: true
    },
})

export const Task = mongoose.model<ITask>("Tasks", taskSchema);