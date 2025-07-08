// API configuration utility
// This handles different base URLs for development and production environments

const getApiBaseUrl = () => {
  // In development, use localhost:5000
  // In production, use relative URLs (same domain)
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:5000";
  }
  return ""; // Relative URLs for production
};

export const API_BASE_URL = getApiBaseUrl();

// Helper function to construct full API URLs
export const getApiUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};

// Common API endpoints
export const API_ENDPOINTS = {
  ITEM_AVAILABILITY: "/api/item-availability",
  STORE_SERVICEABILITY: "/api/store-serviceability",
  HEALTH: "/api/health",
};
