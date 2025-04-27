const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
require("dotenv").config();

// Import the store SLA check functionality
const { performStoreSlaCheck } = require("./cron/storeSlaCheck");
// Import the cron jobs initializer
const { initCronJobs } = require("./cron");

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
if (process.env.NODE_ENV === "production") {
  // In production, no need for CORS since frontend and backend are served from the same origin
  app.use(morgan("combined"));
} else {
  // In development, use CORS to allow frontend dev server to access the backend
  app.use(cors());
  app.use(morgan("dev"));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sample data
const data = {
  stats: {
    users: 1250,
    tasks: 3862,
    completionRate: 68,
  },
  latestTasks: [
    {
      id: 1,
      title: "Dashboard redesign",
      status: "in-progress",
      priority: "high",
    },
    {
      id: 2,
      title: "API integration",
      status: "completed",
      priority: "medium",
    },
    { id: 3, title: "Mobile optimization", status: "pending", priority: "low" },
    { id: 4, title: "User testing", status: "in-progress", priority: "high" },
  ],
};

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "API is running" });
});

app.get("/api/stats", (req, res) => {
  res.json(data.stats);
});

app.get("/api/tasks", (req, res) => {
  res.json(data.latestTasks);
});

app.post("/api/tasks", (req, res) => {
  const { title, priority } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }

  const newTask = {
    id: data.latestTasks.length + 1,
    title,
    status: "pending",
    priority: priority || "medium",
  };

  data.latestTasks.push(newTask);
  res.status(201).json(newTask);
});

// Internal SLA check endpoint
app.get("/api/internal_store_sla_check", async (req, res) => {
  try {
    console.log("Internal store SLA check triggered via API");

    // Check if we should return full data or just a summary
    const fullResponse = req.query.full === "true";

    // Call the SLA check function
    const result = await performStoreSlaCheck({
      source: "api_request",
      requestTime: new Date().toISOString(),
      params: req.query,
      returnFullData: fullResponse,
    });

    // Format the response to highlight the key data points: location, storeId, sla, and serviceability status
    const formattedResponse = {
      success: result.success,
      message: result.message,
      timestamp: result.timestamp,
      summary: result.summary,
      // Results already contain the simplified data by default or full data if requested
      results: result.results,
      errors: result.errors,
    };

    res.json(formattedResponse);
  } catch (error) {
    console.error("Error during SLA check:", error);
    res.status(500).json({
      error: "Failed to perform SLA check",
      message: error.message,
    });
  }
});

// Serve static files from the React frontend app
if (process.env.NODE_ENV === "production") {
  console.log("Serving frontend in production mode");
  // Serve any static files
  app.use(express.static(path.join(__dirname, "../frontend/build")));

  // Handle React routing, return all requests to React app
  app.get("*", function (req, res, next) {
    // Skip API routes
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(__dirname, "../frontend/build", "index.html"));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Initialize cron jobs
  initCronJobs();
});
