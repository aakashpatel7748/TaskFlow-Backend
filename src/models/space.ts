import mongoose from "mongoose";
import { Schema } from "mongoose";

export interface ISpace {
    _id: string;
    name: string;
    workspace: string;
    createdBy: mongoose.Types.ObjectId;
    description?: string;
    color?: string;
    icon?: string;
}

const spaceSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    workspace: {
        type: Schema.Types.ObjectId,
        ref: "Workspace",
        required: true,
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    description: String,
    color: String,
    icon: String,
}, {
    timestamps: true
});

export const Space = mongoose.model<ISpace>("Space", spaceSchema);