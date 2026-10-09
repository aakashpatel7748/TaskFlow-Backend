import { Router } from "express";
import {
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    getWorkspace
} from "../controller/workspace.js";
import { verifyJWT } from "../middlewares/auth.js";



const route = Router()


route.post("/create", verifyJWT, createWorkspace)
route.get("/get", verifyJWT, getWorkspace)
route.post("/update", verifyJWT, updateWorkspace)
route.post("/delete", verifyJWT, deleteWorkspace)





export default route