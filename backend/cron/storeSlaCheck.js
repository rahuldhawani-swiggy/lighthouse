/**
 * Store SLA Check Module
 * This module contains the functionality to check store SLAs.
 * It will be used by both the API endpoint and later by a cron job.
 */

const { saveServiceabilityResults } = require("../db/storeServiceability");
const { getLocationData, callSwiggyApi } = require("../utils/swiggyApi");

/**
 * Performs the store SLA check by calling the Swiggy API for multiple locations
 * @param {Object} options - Configuration options for the SLA check
 * @returns {Object} - Results of all the SLA checks
 */
const performStoreSlaCheck = async (options = {}) => {
  try {
    console.log("Starting store SLA check for multiple locations...");

    // Get the location data from the CSV file
    const locations = await getLocationData();

    // Call the Swiggy API for each location
    const results = [];
    const errors = [];

    // Use Promise.all to run all API calls in parallel
    const apiPromises = locations.map((location) => callSwiggyApi(location));
    const apiResults = await Promise.all(apiPromises);

    // Process the results
    apiResults.forEach((result) => {
      if (result.error) {
        errors.push(result);
      } else {
        results.push(result);
      }
    });

    // Create a simplified version of the results with just the key data
    const simplifiedResults = results.map((result) => ({
      locationMeta: {
        societyName: result.location.societyName,
        area: result.location.area,
        city: result.location.city,
        coordinates: {
          lat: result.location.lat,
          lng: result.location.lng,
        },
      },
      storeId: result.slaData.storeId,
      storeDescription: result.slaData.storeDescription,
      storeLocality: result.slaData.storeLocality,
      sla: result.slaData.slaString,
      serviceability: result.slaData.serviceability,
      timestamp: result.timestamp,
    }));

    console.log(simplifiedResults);

    // Save results to Supabase if not in test mode
    if (!options.testMode) {
      try {
        const saveResult = await saveServiceabilityResults(simplifiedResults);
        console.log(
          "Database save result:",
          saveResult.success ? "Success" : "Failed"
        );
      } catch (dbError) {
        console.error("Error saving to database:", dbError);
        // Continue execution even if database save fails
      }
    }

    // Create a simplified version of the errors
    const simplifiedErrors = errors.map((error) => ({
      locationMeta: {
        societyName: error.location.societyName,
        area: error.location.area,
        city: error.location.city,
        coordinates: {
          lat: error.location.lat,
          lng: error.location.lng,
        },
      },
      error: error.error,
      timestamp: error.timestamp,
    }));

    return {
      success: true,
      message: `Completed SLA check for ${locations.length} locations`,
      timestamp: new Date().toISOString(),
      summary: {
        total: locations.length,
        successful: results.length,
        failed: errors.length,
      },
      results: options.returnFullData ? results : simplifiedResults,
      errors: simplifiedErrors,
      options,
    };
  } catch (error) {
    console.error("Error during store SLA check:", error);
    return {
      success: false,
      message: "Failed to perform SLA check",
      error: error.message,
      timestamp: new Date().toISOString(),
      options,
    };
  }
};

module.exports = {
  performStoreSlaCheck,
};
