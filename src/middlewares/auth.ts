import jwt, { type JwtPayload } from "jsonwebtoken";
import { User, } from "../models/user.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { Request } from "express";

interface ITokenPayload extends JwtPayload {
    _id: string;
}

export const verifyJWT = asyncHandler(async (req: Request, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

        // console.log(token);
        if (!token) {
            throw new ApiError(401, "Unauthorized request")
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as ITokenPayload

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")

        if (!user) {

            throw new ApiError(401, "Invalid Access Token")
        }

        req.user = user;
        next()
    } catch (error: unknown) {
        if (error instanceof Error) {
            throw new ApiError(401, error.message);
        }
        throw new ApiError(401, "Invalid access token")
    }

})