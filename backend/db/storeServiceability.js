const { supabase } = require("../config/supabase");

/**
 * Saves SLA check results to the store_serviceablity table in Supabase
 * @param {Array} results - Array of SLA check results
 * @returns {Object} - Result of the insert operation
 */
const saveServiceabilityResults = async (results) => {
  try {
    console.log(results);
    if (!results || !Array.isArray(results) || results.length === 0) {
      throw new Error("Invalid or empty results array");
    }

    // Transform the results to match the database schema
    const dbRecords = results.map((result) => {
      // Use the separate location components directly from locationMeta
      const spotName = result.locationMeta.societyName || "N/A";
      const spotArea = result.locationMeta.area || "N/A";
      const spotCity = result.locationMeta.city || "N/A";

      // Get store description and locality directly from the result object
      // or fall back to empty strings if they don't exist
      const storeDescription = result.storeDescription || "";
      const storeLocality = result.storeLocality || "";

      return {
        store_id: result.storeId,
        sla: result.sla,
        serviceability: result.serviceability,
        store_description: storeDescription,
        store_locality: storeLocality,
        spot_name: spotName,
        spot_area: spotArea,
        spot_city: spotCity,
        spot_lat: result.locationMeta.coordinates.lat,
        spot_lng: result.locationMeta.coordinates.lng,
      };
    });

    // Insert into Supabase
    const { data, error } = await supabase
      .from("store_serviceablity")
      .insert(dbRecords)
      .select();
    console.log("data");
    console.log(data);
    if (error) {
      console.log(error);
      console.error("Error saving to Supabase:", error);
      throw error;
    }

    console.log(`Successfully saved ${dbRecords.length} records to Supabase`);
    return { success: true, count: dbRecords.length, data };
  } catch (error) {
    console.error("Error in saveServiceabilityResults:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Retrieves the latest serviceability status for all locations
 * @returns {Array} - Array of the latest serviceability records
 */
const getLatestServiceability = async () => {
  try {
    // Get the latest record for each location
    const { data, error } = await supabase
      .from("store_serviceablity")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching from Supabase:", error);
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error in getLatestServiceability:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Retrieves the serviceability history for a specific location
 * @param {string} societyName - Name of the society to fetch history for
 * @param {number} limit - Maximum number of records to return (optional)
 * @returns {Array} - Array of serviceability records for the location
 */
const getLocationHistory = async (societyName, limit = 50) => {
  try {
    if (!societyName) {
      throw new Error("Society name is required");
    }

    const { data, error } = await supabase
      .from("store_serviceablity")
      .select("*")
      .eq("spot_name", societyName)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching location history from Supabase:", error);
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error in getLocationHistory:", error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  saveServiceabilityResults,
  getLatestServiceability,
  getLocationHistory,
};
