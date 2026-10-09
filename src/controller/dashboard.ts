import type { Request, Response } from "express";
import mongoose from "mongoose";
import { logger } from "../lib/logger.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Task } from "../models/Tasks.js";
import { Project } from "../models/project.js";
import { TaskPriority, TaskStatus } from "../constants/constant.js";

const getDashboardTasks = asyncHandler(async (req: Request, res: Response) => {
    const TAG = "Get Dashboard Stats & Aggregations";
    logger.info(TAG);

    const { workspaceId } = req.query as { workspaceId?: string };
    const now = new Date();

    // 1. Build Task Match Condition
    let taskMatchCondition: Record<string, any> = {};

    if (workspaceId && typeof workspaceId === "string" && workspaceId.trim() !== "" && workspaceId !== "undefined" && workspaceId !== "null") {
        const cleanWsId = workspaceId.trim();
        const wsIdObj = mongoose.Types.ObjectId.isValid(cleanWsId)
            ? new mongoose.Types.ObjectId(cleanWsId)
            : null;

        // Find projects belonging to this workspace to catch tasks tied to projects
        const wsProjects = await Project.find({
            $or: [
                ...(wsIdObj ? [{ workspace: wsIdObj }] : []),
                { workspace: cleanWsId }
            ]
        }).select("_id");
        const projectObjectIds = wsProjects.map((p) => p._id);

        const matchOrClauses: any[] = [];
        if (wsIdObj) matchOrClauses.push({ workspaceId: wsIdObj });
        matchOrClauses.push({ workspaceId: cleanWsId });
        if (projectObjectIds.length > 0) {
            matchOrClauses.push({ projectId: { $in: projectObjectIds } });
        }

        taskMatchCondition = { $or: matchOrClauses };
    } else if (req.user?._id) {
        const userObjId = new mongoose.Types.ObjectId(req.user._id);
        taskMatchCondition = {
            $or: [
                { createdBy: userObjId },
                { assignee: userObjId }
            ]
        };
    }

    // 2. Execute Task Aggregation Pipeline (Single query with $facet for maximum performance)
    const [taskAggregateResult] = await Task.aggregate([
        { $match: taskMatchCondition },
        {
            $facet: {
                summary: [
                    {
                        $group: {
                            _id: null,
                            total: { $sum: 1 },
                            completed: {
                                $sum: { $cond: [{ $eq: ["$status", TaskStatus.COMPLETED] }, 1, 0] }
                            },
                            inProgress: {
                                $sum: { $cond: [{ $eq: ["$status", TaskStatus.IN_PROGRESS] }, 1, 0] }
                            },
                            todo: {
                                $sum: { $cond: [{ $eq: ["$status", TaskStatus.TODO] }, 1, 0] }
                            },
                            overdue: {
                                $sum: {
                                    $cond: [
                                        {
                                            $and: [
                                                { $ne: ["$status", TaskStatus.COMPLETED] },
                                                { $ne: ["$dueDate", null] },
                                                { $lt: ["$dueDate", now] }
                                            ]
                                        },
                                        1,
                                        0
                                    ]
                                }
                            }
                        }
                    }
                ],
                priorityBreakdown: [
                    {
                        $group: {
                            _id: "$priority",
                            count: { $sum: 1 }
                        }
                    }
                ],
                statusBreakdown: [
                    {
                        $group: {
                            _id: "$status",
                            count: { $sum: 1 }
                        }
                    }
                ],
                recentTasks: [
                    { $sort: { _id: -1 } },
                    { $limit: 8 },
                    {
                        $lookup: {
                            from: "users",
                            localField: "assignee",
                            foreignField: "_id",
                            as: "assigneeInfo"
                        }
                    },
                    {
                        $lookup: {
                            from: "projects",
                            localField: "projectId",
                            foreignField: "_id",
                            as: "projectInfo"
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            status: 1,
                            priority: 1,
                            dueDate: 1,
                            assigneeEmail: 1,
                            createdAt: 1,
                            assignee: {
                                $let: {
                                    vars: { u: { $arrayElemAt: ["$assigneeInfo", 0] } },
                                    in: {
                                        _id: "$$u._id",
                                        fullName: "$$u.fullName",
                                        username: "$$u.username",
                                        email: "$$u.email",
                                        avatar: "$$u.avatar"
                                    }
                                }
                            },
                            project: {
                                $let: {
                                    vars: { p: { $arrayElemAt: ["$projectInfo", 0] } },
                                    in: {
                                        _id: "$$p._id",
                                        name: "$$p.name"
                                    }
                                }
                            }
                        }
                    }
                ],
                upcomingDeadlines: [
                    {
                        $match: {
                            status: { $ne: TaskStatus.COMPLETED },
                            dueDate: { $ne: null }
                        }
                    },
                    { $sort: { dueDate: 1 } },
                    { $limit: 6 },
                    {
                        $lookup: {
                            from: "projects",
                            localField: "projectId",
                            foreignField: "_id",
                            as: "projectInfo"
                        }
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "assignee",
                            foreignField: "_id",
                            as: "assigneeInfo"
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            status: 1,
                            priority: 1,
                            dueDate: 1,
                            project: {
                                $let: {
                                    vars: { p: { $arrayElemAt: ["$projectInfo", 0] } },
                                    in: {
                                        _id: "$$p._id",
                                        name: "$$p.name"
                                    }
                                }
                            },
                            assignee: {
                                $let: {
                                    vars: { u: { $arrayElemAt: ["$assigneeInfo", 0] } },
                                    in: {
                                        _id: "$$u._id",
                                        fullName: "$$u.fullName",
                                        username: "$$u.username",
                                        avatar: "$$u.avatar"
                                    }
                                }
                            }
                        }
                    }
                ]
            }
        }
    ]);

    // 3. Project Aggregation Pipeline (Projects with nested Task calculation & progress)
    let projectMatch: Record<string, any> = {};
    if (workspaceId && typeof workspaceId === "string" && workspaceId.trim() !== "" && workspaceId !== "undefined" && workspaceId !== "null") {
        const cleanWsId = workspaceId.trim();
        const wsIdObj = mongoose.Types.ObjectId.isValid(cleanWsId)
            ? new mongoose.Types.ObjectId(cleanWsId)
            : null;

        projectMatch = {
            $or: [
                ...(wsIdObj ? [{ workspace: wsIdObj }] : []),
                { workspace: cleanWsId }
            ]
        };
    } else if (req.user?._id) {
        projectMatch = { createdBy: new mongoose.Types.ObjectId(req.user._id) };
    }

    const projectsWithProgress = await Project.aggregate([
        { $match: projectMatch },
        {
            $lookup: {
                from: "tasks",
                localField: "_id",
                foreignField: "projectId",
                as: "projectTasks"
            }
        },
        {
            $lookup: {
                from: "spaces",
                localField: "space",
                foreignField: "_id",
                as: "spaceInfo"
            }
        },
        {
            $addFields: {
                totalTasks: { $size: "$projectTasks" },
                completedTasks: {
                    $size: {
                        $filter: {
                            input: "$projectTasks",
                            as: "t",
                            cond: { $eq: ["$$t.status", TaskStatus.COMPLETED] }
                        }
                    }
                },
                inProgressTasks: {
                    $size: {
                        $filter: {
                            input: "$projectTasks",
                            as: "t",
                            cond: { $eq: ["$$t.status", TaskStatus.IN_PROGRESS] }
                        }
                    }
                },
                todoTasks: {
                    $size: {
                        $filter: {
                            input: "$projectTasks",
                            as: "t",
                            cond: { $eq: ["$$t.status", TaskStatus.TODO] }
                        }
                    }
                },
                space: { $arrayElemAt: ["$spaceInfo", 0] }
            }
        },
        {
            $addFields: {
                progress: {
                    $cond: [
                        { $gt: ["$totalTasks", 0] },
                        {
                            $round: [
                                {
                                    $multiply: [
                                        { $divide: ["$completedTasks", "$totalTasks"] },
                                        100
                                    ]
                                },
                                0
                            ]
                        },
                        0
                    ]
                },
                status: {
                    $cond: [
                        {
                            $and: [
                                { $gt: ["$totalTasks", 0] },
                                { $eq: ["$completedTasks", "$totalTasks"] }
                            ]
                        },
                        "Completed",
                        {
                            $cond: [
                                {
                                    $or: [
                                        { $gt: ["$completedTasks", 0] },
                                        { $gt: ["$inProgressTasks", 0] }
                                    ]
                                },
                                "In Progress",
                                "Planning"
                            ]
                        }
                    ]
                }
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                isPrivate: 1,
                totalTasks: 1,
                completedTasks: 1,
                inProgressTasks: 1,
                todoTasks: 1,
                progress: 1,
                status: 1,
                space: {
                    _id: "$space._id",
                    name: "$space.name",
                    color: "$space.color"
                }
            }
        },
        { $sort: { _id: -1 } }
    ]);

    // 4. Personal Task Metrics for Current User (if user authenticated)
    let myTasksSummary = {
        total: 0,
        completed: 0,
        inProgress: 0,
        todo: 0,
        overdue: 0
    };

    if (req.user?._id) {
        const userObjId = new mongoose.Types.ObjectId(req.user._id);
        const myTasksResult = await Task.aggregate([
            {
                $match: {
                    assignee: userObjId,
                    ...(workspaceId && mongoose.Types.ObjectId.isValid(workspaceId)
                        ? {
                            $or: [
                                { workspaceId: new mongoose.Types.ObjectId(workspaceId) },
                                { workspaceId }
                            ]
                        }
                        : {})
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    completed: {
                        $sum: { $cond: [{ $eq: ["$status", TaskStatus.COMPLETED] }, 1, 0] }
                    },
                    inProgress: {
                        $sum: { $cond: [{ $eq: ["$status", TaskStatus.IN_PROGRESS] }, 1, 0] }
                    },
                    todo: {
                        $sum: { $cond: [{ $eq: ["$status", TaskStatus.TODO] }, 1, 0] }
                    },
                    overdue: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $ne: ["$status", TaskStatus.COMPLETED] },
                                        { $ne: ["$dueDate", null] },
                                        { $lt: ["$dueDate", now] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        if (myTasksResult && myTasksResult.length > 0) {
            myTasksSummary = {
                total: myTasksResult[0].total || 0,
                completed: myTasksResult[0].completed || 0,
                inProgress: myTasksResult[0].inProgress || 0,
                todo: myTasksResult[0].todo || 0,
                overdue: myTasksResult[0].overdue || 0
            };
        }
    }

    // 5. Structure & Normalize Data
    const summaryData = (taskAggregateResult?.summary && taskAggregateResult.summary[0]) || {
        total: 0,
        completed: 0,
        inProgress: 0,
        todo: 0,
        overdue: 0
    };

    const taskMetrics = {
        total: summaryData.total || 0,
        completed: summaryData.completed || 0,
        inProgress: summaryData.inProgress || 0,
        todo: summaryData.todo || 0,
        overdue: summaryData.overdue || 0,
        completionRate:
            summaryData.total > 0
                ? Math.round((summaryData.completed / summaryData.total) * 100)
                : 0
    };

    // Priority Counts Map
    const priorityCounts: Record<string, number> = {
        [TaskPriority.URGENT]: 0,
        [TaskPriority.HIGH]: 0,
        [TaskPriority.MEDIUM]: 0,
        [TaskPriority.LOW]: 0
    };
    (taskAggregateResult?.priorityBreakdown || []).forEach((item: any) => {
        if (item._id && priorityCounts.hasOwnProperty(item._id)) {
            priorityCounts[item._id] = item.count;
        }
    });

    // Status Counts Map
    const statusCounts: Record<string, number> = {
        [TaskStatus.TODO]: 0,
        [TaskStatus.IN_PROGRESS]: 0,
        [TaskStatus.COMPLETED]: 0
    };
    (taskAggregateResult?.statusBreakdown || []).forEach((item: any) => {
        if (item._id && statusCounts.hasOwnProperty(item._id)) {
            statusCounts[item._id] = item.count;
        }
    });

    // Project Metrics Summary
    const totalProjects = projectsWithProgress.length;
    const completedProjects = projectsWithProgress.filter((p) => p.status === "Completed").length;
    const inProgressProjects = projectsWithProgress.filter((p) => p.status === "In Progress").length;
    const planningProjects = projectsWithProgress.filter((p) => p.status === "Planning").length;

    const projectMetrics = {
        total: totalProjects,
        completed: completedProjects,
        inProgress: inProgressProjects,
        planning: planningProjects,
        completionRate:
            totalProjects > 0
                ? Math.round((completedProjects / totalProjects) * 100)
                : 0
    };

    const dashboardData = {
        taskMetrics,
        projectMetrics,
        priorityBreakdown: priorityCounts,
        statusBreakdown: statusCounts,
        projects: projectsWithProgress,
        recentTasks: taskAggregateResult?.recentTasks || [],
        upcomingDeadlines: taskAggregateResult?.upcomingDeadlines || [],
        myTasksSummary
    };

    return res
        .status(200)
        .json(new ApiResponse(200, dashboardData, "Dashboard metrics fetched successfully"));
});

export { getDashboardTasks };