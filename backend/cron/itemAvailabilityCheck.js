/**
 * Item Availability Check Module
 * This module contains the functionality to check item availability across stores.
 * It will be used by both the API endpoint and later by a cron job.
 */

const axios = require("axios");
const { saveItemAvailabilityResults } = require("../db/itemAvailability");
const { getLatestServiceability } = require("../db/storeServiceability");

/**
 * Configuration for item availability checking
 */
const config = {
  defaultItems: ["123456", "789012"], // Example item IDs for testing
  batchSize: 50, // Number of stores to process at once
  apiTimeout: 10000, // API timeout in milliseconds
  retryAttempts: 3, // Number of retry attempts
  parallelRequests: 10, // Max parallel API calls
};

/**
 * Fetches store serviceability data from database
 * @returns {Promise<Array>} Promise that resolves to an array of store objects
 */
const getStoreServiceabilityData = async () => {
  try {
    console.log("Fetching store serviceability data from database...");

    // Get all serviceable stores from the database
    const storeData = await getLatestServiceability();

    if (!storeData || !storeData.data || storeData.data.length === 0) {
      throw new Error("No serviceable stores found in database");
    }

    // Transform the data to match our expected structure
    const stores = storeData.data
      .filter((store) => store.serviceability === "SERVICEABLE")
      .map((store) => ({
        storeId: store.store_id,
        spotName: store.spot_name,
        spotArea: store.spot_area,
        spotCity: store.spot_city,
        coordinates: {
          lat: store.spot_lat,
          lng: store.spot_lng,
        },
        serviceability: store.serviceability,
        sla: store.sla,
        lastChecked: store.created_at,
      }));

    console.log(`Loaded ${stores.length} serviceable stores from database`);
    return stores;
  } catch (error) {
    console.error("Error fetching store serviceability data:", error);
    throw new Error("Failed to fetch store serviceability data");
  }
};

/**
 * Extracts the relevant item availability data from the API response
 * @param {Object} response - The API response data
 * @param {string} itemId - The item ID that was checked
 * @returns {Object} Object with the extracted item availability information
 */
const extractItemAvailabilityData = (response, itemId) => {
  try {
    // Extract availability data from the API response
    // The response structure will be determined based on actual API responses

    if (response?.data) {
      // Try to extract availability information from the response
      // This will need to be updated based on actual API response structure
      let available = null;
      let itemName = null;
      let storeId = null;
      let storeLocality = null;
      let storeDescription = null;

      // TODO: Update this based on actual API response structure
      // For now, we'll try to extract basic availability info
      if (response.data.available !== undefined) {
        available = response.data.available;
      } else if (response.data.availability !== undefined) {
        available = response.data.availability === "AVAILABLE";
      }

      if (response.data.itemName) {
        itemName = response.data.itemName;
      }

      if (response.data.storeId) {
        storeId = response.data.storeId;
      }

      if (response.data.storeLocality) {
        storeLocality = response.data.storeLocality;
      }

      if (response.data.storeDescription) {
        storeDescription = response.data.storeDescription;
      }

      return {
        itemId: itemId,
        available: available,
        itemName: itemName,
        storeId: storeId,
        storeLocality: storeLocality,
        storeDescription: storeDescription,
      };
    }

    // Log if we couldn't extract the data
    console.log(
      "Unable to extract item availability data from response:",
      JSON.stringify(response, null, 2).substring(0, 500) + "..."
    );

    return {
      itemId: itemId,
      available: null,
      itemName: null,
      storeId: null,
      storeLocality: null,
      storeDescription: null,
    };
  } catch (error) {
    console.error("Error extracting item availability data:", error);
    return {
      itemId: itemId,
      available: null,
      itemName: null,
      storeId: null,
      storeLocality: null,
      storeDescription: null,
      error: "Failed to extract availability data",
    };
  }
};

/**
 * Calls the Item Availability API for a specific store and item
 * @param {Object} store - The store object with store details
 * @param {string} itemId - The item ID to check
 * @returns {Promise<Object>} The API response
 */
const checkItemAvailability = async (store, itemId) => {
  try {
    // Replace the lat and lng placeholders in the Cookie header (similar to SLA check)
    const cookieString =
      "platform=web; subplatform=dweb;userLocation=%7B%22lat%22%3A" +
      store.coordinates.lat +
      "%2C%22lng%22%3A" +
      store.coordinates.lng +
      "%7D; ally-on=false; bottomOffset=0; deviceId=s%3A94c5cda2-5930-47d1-a603-00cb68b15470.ain%2BSoarjMuUnId2CpwOetU%2FdPzrKB2QKMMkOuGZrA4; genieTrackOn=false; isNative=false; openIMHP=false; platform=web; sid=s%3Ak9ce015e-346c-4c2b-860c-c626bfe67fca.ZtO6jYKh8O0MWxiWQMuGIBQxydM7cbLtKhvZ5gOz2jY; statusBarHeight=0; strId=; subplatform=dweb; tid=s%3A13eb14bb-0c60-47bd-b4f0-fecd2a7dc060.bBmfpGDceDK3rxGdTpZroWq7cdfto5lfnWXpzvG%2FWlM; versionCode=1200";

    // Set up the request config using the provided URL structure
    const apiConfig = {
      method: "get",
      url: `https://www.swiggy.com/api/instamart/item/${itemId}/widgets?storeId=${store.storeId}&primaryStoreId=${store.storeId}`,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        Accept: "application/json",
        Cookie: cookieString,
      },
      timeout: config.apiTimeout,
    };

    // Make the API call
    const response = await axios(apiConfig);

    // Extract availability data from the response
    const availabilityData = extractItemAvailabilityData(response.data, itemId);

    return {
      store: store,
      itemId: itemId,
      status: response.status,
      statusText: response.statusText,
      availabilityData: availabilityData,
      timestamp: new Date().toISOString(),
      rawData: response.data, // Keep the raw data for debugging
    };
  } catch (error) {
    console.error(
      `Error checking item availability for store ${store.storeId}, item ${itemId}:`,
      error.message
    );

    // If API call fails, provide fallback mock data for testing purposes
    const mockAvailabilityData = {
      itemId: itemId,
      available: Math.random() > 0.3, // 70% chance of being available
      itemName: `Mock Item ${itemId}`,
      storeId: store.storeId,
      storeLocality: store.spotArea,
      storeDescription: `Mock Store ${store.storeId}`,
    };

    return {
      store: store,
      itemId: itemId,
      status: error.response?.status || 500,
      statusText: error.response?.statusText || "Error",
      error: error.message,
      availabilityData: mockAvailabilityData, // Use mock data for testing
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * Processes stores in batches to avoid overwhelming the API
 * @param {Array} stores - Array of store objects
 * @param {Array} itemIds - Array of item IDs to check
 * @param {number} batchSize - Number of stores to process at once
 * @returns {Promise<Array>} Array of all results
 */
const processStoresInBatches = async (stores, itemIds, batchSize = 50) => {
  const results = [];
  const errors = [];

  for (let i = 0; i < stores.length; i += batchSize) {
    const batch = stores.slice(i, i + batchSize);
    console.log(
      `Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(
        stores.length / batchSize
      )} (${batch.length} stores)`
    );

    // Create promises for all store-item combinations in this batch
    const batchPromises = [];
    batch.forEach((store) => {
      itemIds.forEach((itemId) => {
        batchPromises.push(checkItemAvailability(store, itemId));
      });
    });

    // Execute all promises in parallel for this batch
    const batchResults = await Promise.all(batchPromises);

    // Process the results
    batchResults.forEach((result) => {
      if (result.error) {
        errors.push(result);
      } else {
        results.push(result);
      }
    });

    // Add a small delay between batches to be respectful to the API
    if (i + batchSize < stores.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return { results, errors };
};

/**
 * Performs the item availability check by calling the API for multiple stores and items
 * @param {Object} options - Configuration options for the availability check
 * @returns {Object} - Results of all the availability checks
 */
const performItemAvailabilityCheck = async (options = {}) => {
  try {
    const startTime = new Date();
    console.log("Starting item availability check for multiple stores...");

    // Get configuration
    const itemIds = options.itemIds || config.defaultItems;
    const batchSize = options.batchSize || config.batchSize;

    console.log(`Checking availability for items: ${itemIds.join(", ")}`);

    // Get the store data from the database
    const stores = await getStoreServiceabilityData();

    if (stores.length === 0) {
      throw new Error("No serviceable stores found");
    }

    // Process stores in batches
    const { results, errors } = await processStoresInBatches(
      stores,
      itemIds,
      batchSize
    );

    // Create a simplified version of the results with just the key data
    const simplifiedResults = results.map((result) => ({
      storeId: result.availabilityData.storeId || result.store.storeId,
      itemId: result.itemId,
      itemName: result.availabilityData.itemName,
      storeLocality: result.availabilityData.storeLocality,
      storeDescription: result.availabilityData.storeDescription,
      spotName: result.store.spotName,
      spotArea: result.store.spotArea,
      spotCity: result.store.spotCity,
      coordinates: result.store.coordinates,
      available: result.availabilityData.available,
      timestamp: result.timestamp,
    }));

    console.log(
      `Processed ${simplifiedResults.length} item availability checks`
    );

    // Save results to database if not in test mode
    if (!options.testMode) {
      try {
        const saveResult = await saveItemAvailabilityResults(simplifiedResults);
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
      storeId: error.store.storeId,
      itemId: error.itemId,
      spotName: error.store.spotName,
      spotArea: error.store.spotArea,
      spotCity: error.store.spotCity,
      coordinates: error.store.coordinates,
      error: error.error,
      timestamp: error.timestamp,
    }));

    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;

    return {
      success: true,
      message: `Completed item availability check for ${stores.length} stores and ${itemIds.length} items`,
      timestamp: new Date().toISOString(),
      duration: `${duration} seconds`,
      summary: {
        totalStores: stores.length,
        totalItems: itemIds.length,
        totalChecks: stores.length * itemIds.length,
        successful: results.length,
        failed: errors.length,
        successRate: `${(
          (results.length / (stores.length * itemIds.length)) *
          100
        ).toFixed(2)}%`,
      },
      results: options.returnFullData ? results : simplifiedResults,
      errors: simplifiedErrors,
      options,
    };
  } catch (error) {
    console.error("Error during item availability check:", error);
    return {
      success: false,
      message: "Failed to perform item availability check",
      error: error.message,
      timestamp: new Date().toISOString(),
      options,
    };
  }
};

module.exports = {
  performItemAvailabilityCheck,
  checkItemAvailability,
  getStoreServiceabilityData,
};
