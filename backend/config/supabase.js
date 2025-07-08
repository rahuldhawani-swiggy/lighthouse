/**
 * Supabase client configuration
 * This file sets up and exports the Supabase client for database operations
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Get Supabase URL and key from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Function to check if a URL is valid
const isValidUrl = (urlString) => {
  try {
    new URL(urlString);
    return true;
  } catch (e) {
    return false;
  }
};

// Check if environment variables are set and valid
if (
  !supabaseUrl ||
  !supabaseKey ||
  supabaseUrl === "your_supabase_url" ||
  !isValidUrl(supabaseUrl)
) {
  console.warn(
    "Supabase URL or key not found or invalid in environment variables."
  );
  console.warn("Using mock Supabase client that returns sample data.");

  // Create a mock Supabase client for development without actual credentials
  const mockSupabase = {
    from: (table) => {
      // Mock data for different tables
      const mockData = {
        store_serviceability_results: [
          {
            id: 1,
            created_at: new Date().toISOString(),
            store_id: "1385841",
            sla: "15 Mins",
            serviceability: "SERVICEABLE",
            store_description: "Mock Instamart Store",
            store_locality: "Test Location",
            spot_name: "Mock Society",
            spot_area: "Test Area",
            spot_city: "Test City",
            spot_lat: "19.0158",
            spot_lng: "72.8293",
          },
          {
            id: 2,
            created_at: new Date().toISOString(),
            store_id: "1401248",
            sla: "12 Mins",
            serviceability: "SERVICEABLE",
            store_description: "Mock Store 2",
            store_locality: "Test Location 2",
            spot_name: "Mock Society 2",
            spot_area: "Test Area 2",
            spot_city: "Test City 2",
            spot_lat: "12.8851",
            spot_lng: "77.5633",
          },
        ],
        item_availability: [
          {
            id: 1,
            created_at: new Date().toISOString(),
            store_id: "1385841",
            item_id: "123456",
            item_name: "Mock Item 1",
            available: true,
            store_locality: "Test Location",
            store_description: "Mock Store",
            spot_name: "Mock Society",
            spot_area: "Test Area",
            spot_city: "Test City",
            spot_lat: "19.0158",
            spot_lng: "72.8293",
          },
        ],
      };

      return {
        insert: async (data) => {
          console.log(`MOCK DB: Inserted ${data.length} records into ${table}`);
          return { data: Array.isArray(data) ? data : [data], error: null };
        },
        select: function (columns = "*") {
          console.log(`MOCK DB: Selected ${columns} from ${table}`);
          const tableData = mockData[table] || [];
          this._data = tableData;
          return this;
        },
        eq: function (column, value) {
          console.log(`MOCK DB: Filtering ${column} = ${value}`);
          if (this._data) {
            this._data = this._data.filter((row) => row[column] === value);
          }
          return this;
        },
        ilike: function (column, value) {
          console.log(`MOCK DB: Filtering ${column} ILIKE ${value}`);
          if (this._data) {
            const searchValue = value.replace(/%/g, "").toLowerCase();
            this._data = this._data.filter(
              (row) =>
                row[column] && row[column].toLowerCase().includes(searchValue)
            );
          }
          return this;
        },
        gte: function (column, value) {
          console.log(`MOCK DB: Filtering ${column} >= ${value}`);
          return this;
        },
        lte: function (column, value) {
          console.log(`MOCK DB: Filtering ${column} <= ${value}`);
          return this;
        },
        order: function (column, options = {}) {
          console.log(`MOCK DB: Ordering by ${column}`, options);
          return this;
        },
        range: function (from, to) {
          console.log(`MOCK DB: Range ${from} to ${to}`);
          if (this._data) {
            this._data = this._data.slice(from, to + 1);
          }
          return this;
        },
        limit: function (count) {
          console.log(`MOCK DB: Limit ${count}`);
          if (this._data) {
            this._data = this._data.slice(0, count);
          }
          return this;
        },
        then: function (callback) {
          // Make it thenable for async/await
          const result = {
            data: this._data || [],
            error: null,
            count: this._data ? this._data.length : 0,
          };
          return Promise.resolve(result).then(callback);
        },
      };
    },
  };

  module.exports = { supabase: mockSupabase };
} else {
  // Create and export the actual Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);
  module.exports = { supabase };
}
