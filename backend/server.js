const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
require("dotenv").config();

// Import the store SLA check functionality
const { performStoreSlaCheck } = require("./cron/storeSlaCheck");
const {
  performItemAvailabilityCheck,
} = require("./cron/itemAvailabilityCheck");
// Import the cron jobs initializer
const { initCronJobs } = require("./cron");

// Import database operations
const {
  getLatestServiceability,
  getLocationHistory,
} = require("./db/storeServiceability");
const {
  getItemAvailabilityResults,
  getItemAvailabilityStats,
} = require("./db/itemAvailability");

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

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "API is running" });
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

// Get all latest store serviceability records
app.get("/api/store-serviceability", async (req, res) => {
  try {
    const result = await getLatestServiceability();

    if (!result.success) {
      return res.status(500).json({
        error: "Failed to fetch serviceability data",
        message: result.error,
      });
    }

    res.json({
      success: true,
      count: result.data.length,
      data: result.data,
    });
  } catch (error) {
    console.error("Error fetching serviceability data:", error);
    res.status(500).json({
      error: "Failed to fetch serviceability data",
      message: error.message,
    });
  }
});

// Get serviceability history for a specific location
app.get("/api/store-serviceability/:locationName", async (req, res) => {
  try {
    const { locationName } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const result = await getLocationHistory(locationName, limit);

    if (!result.success) {
      return res.status(500).json({
        error: "Failed to fetch location history",
        message: result.error,
      });
    }

    res.json({
      success: true,
      location: locationName,
      count: result.data.length,
      data: result.data,
    });
  } catch (error) {
    console.error("Error fetching location history:", error);
    res.status(500).json({
      error: "Failed to fetch location history",
      message: error.message,
    });
  }
});

// Item Availability Check endpoint
app.get("/api/item-availability-check", async (req, res) => {
  try {
    console.log("Item availability check triggered via API");

    // Get parameters from query
    const { itemIds, testMode, full } = req.query;

    // Parse itemIds if provided
    let itemIdsArray = [];
    if (itemIds) {
      itemIdsArray = itemIds.split(",").map((id) => id.trim());
    }

    // Call the item availability check function
    const result = await performItemAvailabilityCheck({
      itemIds: itemIdsArray.length > 0 ? itemIdsArray : undefined,
      testMode: testMode === "true",
      returnFullData: full === "true",
      source: "api_request",
      requestTime: new Date().toISOString(),
      params: req.query,
    });

    // Format the response
    const formattedResponse = {
      success: result.success,
      message: result.message,
      timestamp: result.timestamp,
      duration: result.duration,
      summary: result.summary,
      results: result.results,
      errors: result.errors,
    };

    res.json(formattedResponse);
  } catch (error) {
    console.error("Error during item availability check:", error);
    res.status(500).json({
      error: "Failed to perform item availability check",
      message: error.message,
    });
  }
});

// Get item availability results with filtering
app.get("/api/item-availability", async (req, res) => {
  try {
    const {
      storeId,
      itemId,
      itemName,
      spotName,
      spotArea,
      spotCity,
      available,
      dateFrom,
      dateTo,
      page,
      pageSize,
      sortBy,
      sortOrder,
    } = req.query;

    const options = {
      filters: {
        storeId,
        itemId,
        itemName,
        spotName,
        spotArea,
        spotCity,
        available: available !== undefined ? available === "true" : undefined,
        dateFrom,
        dateTo,
      },
      page: page ? parseInt(page) : undefined,
      pageSize: pageSize ? parseInt(pageSize) : undefined,
      sortBy,
      sortOrder,
    };

    const result = await getItemAvailabilityResults(options);

    if (!result.success) {
      return res.status(500).json({
        error: "Failed to fetch item availability results",
        message: result.error,
      });
    }

    res.json({
      success: true,
      count: result.data.length,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Error fetching item availability results:", error);
    res.status(500).json({
      error: "Failed to fetch item availability results",
      message: error.message,
    });
  }
});

// Get item availability statistics
app.get("/api/item-availability-stats", async (req, res) => {
  try {
    const result = await getItemAvailabilityStats();

    if (!result.success) {
      return res.status(500).json({
        error: "Failed to fetch item availability statistics",
        message: result.error,
      });
    }

    res.json({
      success: true,
      stats: result.stats,
    });
  } catch (error) {
    console.error("Error fetching item availability statistics:", error);
    res.status(500).json({
      error: "Failed to fetch item availability statistics",
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
