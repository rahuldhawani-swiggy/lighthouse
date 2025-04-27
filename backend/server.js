const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
require("dotenv").config();

// Import the store SLA check functionality
const { performStoreSlaCheck } = require("./cron/storeSlaCheck");
// Import the cron jobs initializer (will be used in the future)
const { initCronJobs } = require("./cron");

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

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

// Routes
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
// TODO: Move this functionality to a cron job in the future
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Initialize cron jobs (placeholder for future implementation)
  initCronJobs();
});
