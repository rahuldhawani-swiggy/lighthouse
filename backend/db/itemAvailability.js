/**
 * Item Availability Database Module
 * This module handles all database operations related to item availability results
 */

const { supabase } = require("../config/supabase");

/**
 * Saves item availability results to the database
 * @param {Array} results - Array of item availability results
 * @returns {Object} Result object with success status and details
 */
const saveItemAvailabilityResults = async (results) => {
  try {
    console.log(
      `Saving ${results.length} item availability results to database...`
    );

    if (!results || results.length === 0) {
      return {
        success: false,
        message: "No results to save",
        savedCount: 0,
      };
    }

    // Insert data according to actual table schema
    const { data, error } = await supabase
      .from("item_availability")
      .insert(
        results.map((result) => ({
          store_id: result.storeId,
          item_id: result.itemId,
          item_name: result.itemName || null,
          store_locality: result.storeLocality || null,
          store_description: result.storeDescription || null,
          spot_name: result.spotName,
          spot_area: result.spotArea,
          spot_city: result.spotCity,
          spot_lat: result.coordinates?.lat || null,
          spot_lng: result.coordinates?.lng || null,
          available: result.available,
          // created_at is handled by default
        }))
      )
      .select();

    if (error) {
      console.error("Error saving item availability results:", error);
      return {
        success: false,
        message: "Failed to save results to database",
        error: error.message,
        savedCount: 0,
      };
    }

    console.log(`Successfully saved ${data.length} item availability results`);
    return {
      success: true,
      message: `Successfully saved ${data.length} item availability results`,
      savedCount: data.length,
      data: data,
    };
  } catch (error) {
    console.error("Error in saveItemAvailabilityResults:", error);
    return {
      success: false,
      message: "Database operation failed",
      error: error.message,
      savedCount: 0,
    };
  }
};

/**
 * Retrieves item availability results from the database
 * @param {Object} options - Query options (filters, pagination, etc.)
 * @returns {Object} Result object with data and metadata
 */
const getItemAvailabilityResults = async (options = {}) => {
  try {
    console.log("Fetching item availability results from database...");

    let query = supabase.from("item_availability").select("*");

    // Apply filters if provided
    if (options.filters) {
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
      } = options.filters;

      if (storeId) query = query.eq("store_id", storeId);
      if (itemId) query = query.eq("item_id", itemId);
      if (itemName) query = query.ilike("item_name", `%${itemName}%`);
      if (spotName) query = query.ilike("spot_name", `%${spotName}%`);
      if (spotArea) query = query.ilike("spot_area", `%${spotArea}%`);
      if (spotCity) query = query.ilike("spot_city", `%${spotCity}%`);
      if (available !== undefined) query = query.eq("available", available);
      if (dateFrom) query = query.gte("created_at", dateFrom);
      if (dateTo) query = query.lte("created_at", dateTo);
    }

    // Apply sorting
    const sortBy = options.sortBy || "created_at";
    const sortOrder = options.sortOrder || "desc";
    query = query.order(sortBy, { ascending: sortOrder === "asc" });

    // Apply pagination
    if (options.page && options.pageSize) {
      const offset = (options.page - 1) * options.pageSize;
      query = query.range(offset, offset + options.pageSize - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching item availability results:", error);
      return {
        success: false,
        message: "Failed to fetch item availability results",
        error: error.message,
        data: [],
        count: 0,
      };
    }

    console.log(
      `Successfully fetched ${data.length} item availability results`
    );
    return {
      success: true,
      message: `Successfully fetched ${data.length} item availability results`,
      data: data,
      count: count,
      pagination:
        options.page && options.pageSize
          ? {
              page: options.page,
              pageSize: options.pageSize,
              total: count,
              totalPages: Math.ceil(count / options.pageSize),
            }
          : null,
    };
  } catch (error) {
    console.error("Error in getItemAvailabilityResults:", error);
    return {
      success: false,
      message: "Database operation failed",
      error: error.message,
      data: [],
      count: 0,
    };
  }
};

/**
 * Gets item availability statistics
 * @param {Object} options - Query options for statistics
 * @returns {Object} Statistics object
 */
const getItemAvailabilityStats = async (options = {}) => {
  try {
    console.log("Fetching item availability statistics...");

    // Fetch data for statistics calculation
    const { data, error } = await supabase
      .from("item_availability")
      .select("available, item_id, store_id, created_at");

    if (error) {
      console.error("Error fetching item availability statistics:", error);
      return {
        success: false,
        message: "Failed to fetch statistics",
        error: error.message,
        stats: {},
      };
    }

    // Calculate basic statistics
    const stats = {
      totalChecks: data.length,
      availableCount: data.filter((r) => r.available === true).length,
      unavailableCount: data.filter((r) => r.available === false).length,
      nullCount: data.filter((r) => r.available === null).length,
      availabilityRate:
        data.length > 0
          ? (
              (data.filter((r) => r.available === true).length / data.length) *
              100
            ).toFixed(2)
          : 0,
      uniqueItems: [...new Set(data.map((r) => r.item_id))].length,
      uniqueStores: [...new Set(data.map((r) => r.store_id))].length,
      lastUpdated:
        data.length > 0
          ? Math.max(...data.map((r) => new Date(r.created_at).getTime()))
          : null,
    };

    console.log("Successfully calculated item availability statistics");
    return {
      success: true,
      message: "Successfully fetched statistics",
      stats: stats,
    };
  } catch (error) {
    console.error("Error in getItemAvailabilityStats:", error);
    return {
      success: false,
      message: "Database operation failed",
      error: error.message,
      stats: {},
    };
  }
};

module.exports = {
  saveItemAvailabilityResults,
  getItemAvailabilityResults,
  getItemAvailabilityStats,
};
