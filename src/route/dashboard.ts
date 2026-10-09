import { Router } from "express";
import { getDashboardTasks } from "../controller/dashboard.js";
import { verifyJWT } from "../middlewares/auth.js";

const route = Router();

// Primary GET routes for dashboard stats and aggregations
route.get("/get-dashboard-tasks", verifyJWT, getDashboardTasks);
route.get("/stats", verifyJWT, getDashboardTasks);
route.get("/", verifyJWT, getDashboardTasks);

// POST fallback for compatibility
route.post("/get-tasks", verifyJWT, getDashboardTasks);

export default route;