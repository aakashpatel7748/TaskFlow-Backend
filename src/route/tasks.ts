import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.js";
import { saveTask, getTasks } from "../controller/tasks.js";
import multer from "multer";
import { upload } from "../middlewares/multer.js";

const router = Router();

router.post("/create", upload.single("files"), verifyJWT, saveTask);
router.get("/get-tasks", verifyJWT, getTasks);

export default router;