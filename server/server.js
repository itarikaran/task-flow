const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);
app.use(express.json());

// Task Schema
const taskSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    dueDate: {
      type: String,
      default: "",
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TaskGroup",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Task = mongoose.model("Task", taskSchema);

const taskGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 40,
    },
  },
  { timestamps: true }
);

const TaskGroup = mongoose.model("TaskGroup", taskGroupSchema);

// Sample tasks for the first database setup
const initialTasks = [
  {
    id: 1,
    title: "Build TaskFlow dashboard",
    description: "Create the React dashboard",
    status: "In Progress",
    priority: "High",
    dueDate: "2026-10-29",
  },
  {
    id: 2,
    title: "Learn Express.js",
    description: "Build REST APIs",
    status: "Pending",
    priority: "Medium",
    dueDate: "2026-10-30",
  },
];

// Health check API
app.get("/", (req, res) => {
  res.json({
    message: "TaskFlow API is running!",
  });
});

// GET all task groups
app.get("/api/groups", async (req, res) => {
  try {
    const groups = await TaskGroup.find().sort({ name: 1 });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch groups" });
  }
});

// CREATE a task group
app.post("/api/groups", async (req, res) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    if (!name) {
      return res.status(400).json({ message: "Group name is required" });
    }

    const existingGroup = await TaskGroup.findOne({
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });
    if (existingGroup) {
      return res.status(409).json({ message: "A group with this name already exists" });
    }

    const group = await TaskGroup.create({ name });
    res.status(201).json(group);
  } catch (error) {
    res.status(400).json({ message: "Failed to create group" });
  }
});

// GET all tasks
app.get("/api/tasks", async (req, res) => {
  try {
    const tasks = await Task.find().sort({ id: 1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch tasks",
    });
  }
});

// GET a single task
app.get("/api/tasks/:id", async (req, res) => {
  try {
    const task = await Task.findOne({
      id: Number(req.params.id),
    });

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch task",
    });
  }
});

// CREATE a task
app.post("/api/tasks", async (req, res) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      dueDate,
      groupId,
    } = req.body;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        message: "Task title is required",
      });
    }

    const fallbackGroup = groupId
      ? null
      : await TaskGroup.findOne().sort({ createdAt: 1 });
    const taskGroupId = groupId || fallbackGroup?._id;
    if (!taskGroupId || !mongoose.Types.ObjectId.isValid(taskGroupId)) {
      return res.status(400).json({ message: "A valid task group is required" });
    }
    const groupExists = await TaskGroup.exists({ _id: taskGroupId });
    if (!groupExists) {
      return res.status(400).json({ message: "Task group not found" });
    }

    const newTask = await Task.create({
      id: Date.now(),
      title: title.trim(),
      description: description || "",
      status: status || "Pending",
      priority: priority || "Medium",
      dueDate: dueDate || "",
      groupId: taskGroupId,
    });

    res.status(201).json(newTask);
  } catch (error) {
    res.status(400).json({
      message: "Failed to create task",
    });
  }
});

// UPDATE a task
app.patch("/api/tasks/:id", async (req, res) => {
  try {
    const allowedFields = [
      "title",
      "description",
      "status",
      "priority",
      "dueDate",
      "groupId",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (Object.hasOwn(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.hasOwn(updates, "groupId")) {
      if (!mongoose.Types.ObjectId.isValid(updates.groupId)) {
        return res.status(400).json({ message: "A valid task group is required" });
      }
      const groupExists = await TaskGroup.exists({ _id: updates.groupId });
      if (!groupExists) {
        return res.status(400).json({ message: "Task group not found" });
      }
    }

    const updatedTask = await Task.findOneAndUpdate(
      { id: Number(req.params.id) },
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedTask) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    res.json(updatedTask);
  } catch (error) {
    res.status(400).json({
      message: "Failed to update task",
    });
  }
});

// DELETE a task
app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const deletedTask = await Task.findOneAndDelete({
      id: Number(req.params.id),
    });

    if (!deletedTask) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    res.json({
      message: "Task deleted successfully",
      task: deletedTask,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete task",
    });
  }
});

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    message: "API route not found",
  });
});

// Connect to MongoDB, then start server
async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from .env");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully!");

    let groups = await TaskGroup.find().sort({ createdAt: 1 });
    if (groups.length === 0) {
      groups = await TaskGroup.insertMany([
        { name: "Personal" },
        { name: "Work" },
        { name: "Study" },
        { name: "Projects" },
      ]);
    }

    const defaultGroup = groups.find((group) => group.name === "Personal") || groups[0];
    await Task.updateMany(
      { $or: [{ groupId: { $exists: false } }, { groupId: null }] },
      { $set: { groupId: defaultGroup._id } }
    );

    // Add sample tasks only when the collection is empty
    const taskCount = await Task.countDocuments();

    if (taskCount === 0) {
      await Task.insertMany(
        initialTasks.map((task) => ({ ...task, groupId: defaultGroup._id }))
      );
      console.log("Initial sample tasks inserted.");
    }

    app.listen(PORT, () => {
      console.log(
        `TaskFlow API running at http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
