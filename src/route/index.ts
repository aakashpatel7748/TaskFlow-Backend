import { Router } from "express"
import workspaceRouter from "./workspace.js"
import userRouter from "./user.js"
import spaceRouter from "./space.js"
import projectRouter from "./project.js"
import emailRouter from "./inviteworkspace.js"
import taskRouter from "./tasks.js"
import dashboardRouter from "./dashboard.js"

const router = Router()


router.use("/user", userRouter)
router.use("/workspace", workspaceRouter)
router.use("/space", spaceRouter)
router.use("/project", projectRouter)
router.use("/tasks", taskRouter)
router.use("/dashboard", dashboardRouter)

router.use("/email", emailRouter)


export default router