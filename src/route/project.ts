import { Router } from "express";
import {
    saveProject,
    getAllProject,
    getProject,
    updateProject,
    deleteProject
} from "../controller/project.js";
import { verifyJWT } from "../middlewares/auth.js";

const router = Router();

router.post("/create", verifyJWT, saveProject);
router.get("/getAllProjects", verifyJWT, getAllProject);
router.get("/get-project", verifyJWT, getProject);
router.get("/get-project/:projectId", verifyJWT, getProject);

router.put("/update", verifyJWT, updateProject);
router.put("/update/:projectId", verifyJWT, updateProject);

router.delete("/delete", verifyJWT, deleteProject);
router.delete("/delete/:projectId", verifyJWT, deleteProject);

export default router;