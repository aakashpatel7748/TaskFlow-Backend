import cookieParser from "cookie-parser"
import cors from "cors"
import express from "express"
import passport from "passport"
import { passportAuth } from "./lib/passport.js"


const app = express()

// Enhanced Request & Response Logger Middleware
app.use((req, res, next) => {
    const startTime = Date.now();
    const timestamp = new Date().toLocaleTimeString();

    // Log incoming request
    console.log(`📥 [${timestamp}] ${req.method} ${req.originalUrl}`);

    // Log response status and duration when finished
    res.on("finish", () => {
        const duration = Date.now() - startTime;
        const status = res.statusCode;
        const statusIcon = status >= 500 ? "💥" : status >= 400 ? "⚠️" : status >= 300 ? "🔀" : "✅";
        console.log(`📤 [${timestamp}] ${statusIcon} ${req.method} ${req.originalUrl} - ${status} (${duration}ms)`);
    });

    next();
});

const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
].filter(Boolean) as string[];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, true);
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-secret-key"]
}))

app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("public"))
app.use(cookieParser())

// configure passport js
passportAuth()
app.use(passport.initialize());

// routes import
import router from "./route/index.js"
import { ApiResponse } from "./utils/ApiResponse.js"

// routes declaration
app.use("/api/v1", router)

// 404 Handler
app.use((req, res) => {
    console.log(`⚠️ [404 Not Found] ${req.method} ${req.originalUrl}`);
    res.status(404).json(new ApiResponse(404, null, `Route not found: ${req.originalUrl}`));
});

app.get("/", (req, res) => {
    res.send("Hello World! Server is live.");
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error(`❌ [Error ${statusCode}] ${req.method} ${req.originalUrl}:`, message);
    return res.status(statusCode).json({
        statusCode,
        data: null,
        message,
        success: false,
        errors: err.errors || []
    });
});

export default app;

