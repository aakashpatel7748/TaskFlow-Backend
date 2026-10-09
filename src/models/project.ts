import mongoose, { Schema, Types } from "mongoose";

export interface IProject {
    _id?: string | Types.ObjectId;
    name: string;
    description?: string;
    isPrivate?: boolean;
    createdBy: Types.ObjectId | string;
    workspace: Types.ObjectId | string;
    space: Types.ObjectId | string;
}

const projectSchema = new Schema<IProject>({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
    },
    isPrivate: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    workspace: {
        type: Schema.Types.ObjectId,
        ref: "Workspace"
    },
    space: {
        type: Schema.Types.ObjectId,
        ref: "Space"
    }
})

export const Project = mongoose.model<IProject>("Project", projectSchema);