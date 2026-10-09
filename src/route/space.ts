import { Router } from "express";
import {
    saveSpace,
    getSpace,
    getSpaceById,
    updateSpace,
    deleteSpace
} from "../controller/space.js";
import { verifyJWT } from "../middlewares/auth.js";
import { upload } from "../middlewares/multer.js";

const route = Router();

route.post("/create", verifyJWT, saveSpace);
route.get("/get", verifyJWT, getSpace);
route.get("/get/:spaceId", verifyJWT, getSpaceById);
route.get("/:spaceId", verifyJWT, getSpaceById);
route.put("/update", verifyJWT, updateSpace);
route.put("/update/:spaceId", verifyJWT, updateSpace);
route.delete("/delete", verifyJWT, deleteSpace);
route.delete("/delete/:spaceId", verifyJWT, deleteSpace);

export default route;