import type { IUser } from "../models/user.js";

declare global {
    namespace Express {
        interface Request {
            user?: IUser;
        }
        interface User extends IUser { }
    }
}

export { };