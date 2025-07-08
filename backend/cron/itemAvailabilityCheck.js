/**
 * Item Availability Check Module
 * This module contains the functionality to check item availability across stores.
 * It will be used by both the API endpoint and later by a cron job.
 */

const axios = require("axios");
const { saveItemAvailabilityResults } = require("../db/itemAvailability");
const { getLocationData, callSwiggyApi } = require("../utils/swiggyApi");
const { readItemListCsv, getProductIds } = require("../utils/itemList");

/**
 * Configuration for item availability checking
 */
const config = {
  defaultItems: ["A8S21QP2A1", "RC72JAN6NK", "61WDNU5G4B", "D7RY5RSB1Y"], // Fallback item IDs
  batchSize: 50, // Number of stores to process at once
  apiTimeout: 10000, // API timeout in milliseconds
  retryAttempts: 3, // Number of retry attempts
  parallelRequests: 10, // Max parallel API calls
};

/**
 * Gets the list of items to check from CSV file
 * @returns {Promise<Array>} Promise that resolves to array of item objects with internal names
 */
const getItemsToCheck = async () => {
  try {
    return await readItemListCsv();
  } catch (error) {
    console.error("Error reading item list from CSV, using fallback:", error);
    return config.defaultItems.map((itemId) => ({
      itemInternalName: `item_${itemId}`,
      productId: itemId,
    }));
  }
};

/**
 * Fetches fresh store serviceability data by reading CSV and calling Swiggy API
 * @returns {Promise<Array>} Promise that resolves to an array of store objects
 */
const getStoreServiceabilityData = async () => {
  try {
    console.log("Fetching fresh store serviceability data from CSV and API...");

    // Get location data from CSV
    const locations = await getLocationData();

    // Call Swiggy API for each location to get fresh serviceability data
    const apiPromises = locations.map((location) => callSwiggyApi(location));
    const apiResults = await Promise.all(apiPromises);

    // Transform API results into the expected store format
    const stores = apiResults
      .filter((result) => result.slaData.serviceability === "SERVICEABLE")
      .map((result) => ({
        storeId: result.slaData.storeId,
        spotName: result.location.societyName,
        spotArea: result.location.area,
        spotCity: result.location.city,
        coordinates: {
          lat: result.location.lat,
          lng: result.location.lng,
        },
        serviceability: result.slaData.serviceability,
        sla: result.slaData.slaString,
        lastChecked: result.timestamp,
      }));

    console.log(
      `Loaded ${stores.length} serviceable stores from fresh API data`
    );
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
 * @param {string} itemInternalName - The internal name for the item
 * @returns {Object} Object with the extracted item availability information
 */
const extractItemAvailabilityData = (
  response,
  itemId,
  itemInternalName = null
) => {
  try {
    // Extract availability data from the actual Swiggy API response structure
    if (response?.data?.item) {
      const item = response.data.item;
      const storeDetails = response.data.storeDetails;

      // Extract availability information - use inStockAndSlotAvailable as primary indicator
      const available = item.inStockAndSlotAvailable;

      // Extract item information
      const itemName =
        item.display_name || item.product_name_without_brand || null;
      const brand = item.brand || null;
      const category = item.category || item.super_category || null;

      // Extract store information
      const storeId = storeDetails?.id || null;
      const storeLocality = storeDetails?.locality || null;
      const storeDescription = storeDetails?.name || null;

      // Extract variation details if available
      let variationsInfo = null;
      if (item.variations && Array.isArray(item.variations)) {
        variationsInfo = item.variations.map((variation) => ({
          id: variation.id,
          quantity: variation.quantity,
          inStock: variation.inventory?.in_stock || false,
          slotAvailable: variation.sku_slot_info?.is_avail || false,
          price: variation.price?.offer_price || variation.price?.store_price,
          maxAllowed: variation.max_allowed_quantity,
        }));
      }

      return {
        itemId: itemId,
        itemInternalName: itemInternalName,
        available: available,
        itemName: itemName,
        brand: brand,
        category: category,
        storeId: storeId,
        storeLocality: storeLocality,
        storeDescription: storeDescription,
        variationsCount: variationsInfo ? variationsInfo.length : 0,
        variationsInfo: variationsInfo,
        responseStatus: "SUCCESS",
      };
    }

    // Log if we couldn't extract the data
    console.log(
      "Unable to extract item availability data from response:",
      JSON.stringify(response, null, 2).substring(0, 500) + "..."
    );

    return {
      itemId: itemId,
      itemInternalName: itemInternalName,
      available: null,
      itemName: null,
      brand: null,
      category: null,
      storeId: null,
      storeLocality: null,
      storeDescription: null,
      variationsCount: 0,
      variationsInfo: null,
      responseStatus: "NO_DATA",
    };
  } catch (error) {
    console.error("Error extracting item availability data:", error);
    return {
      itemId: itemId,
      itemInternalName: itemInternalName,
      available: null,
      itemName: null,
      brand: null,
      category: null,
      storeId: null,
      storeLocality: null,
      storeDescription: null,
      variationsCount: 0,
      variationsInfo: null,
      responseStatus: "ERROR",
      error: "Failed to extract availability data",
    };
  }
};

/**
 * Calls the Item Availability API for a specific store and item
 * @param {Object} store - The store object with store details
 * @param {Object} item - The item object with productId and itemInternalName
 * @returns {Promise<Object>} The API response
 */
const checkItemAvailability = async (store, item) => {
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
      url: `https://www.swiggy.com/api/instamart/item/${item.productId}/widgets?storeId=${store.storeId}&primaryStoreId=${store.storeId}`,
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
    const availabilityData = extractItemAvailabilityData(
      response.data,
      item.productId,
      item.itemInternalName
    );

    return {
      store: store,
      itemId: item.productId,
      itemInternalName: item.itemInternalName,
      status: response.status,
      statusText: response.statusText,
      availabilityData: availabilityData,
      timestamp: new Date().toISOString(),
      rawData: response.data, // Keep the raw data for debugging
    };
  } catch (error) {
    console.error(
      `Error checking item availability for store ${store.storeId}, item ${item.productId}:`,
      error.message
    );

    // If API call fails, provide fallback mock data for testing purposes
    const mockAvailabilityData = {
      itemId: item.productId,
      itemInternalName: item.itemInternalName,
      available: Math.random() > 0.3, // 70% chance of being available
      itemName: `Mock Item ${item.productId}`,
      storeId: store.storeId,
      storeLocality: store.spotArea,
      storeDescription: `Mock Store ${store.storeId}`,
    };

    return {
      store: store,
      itemId: item.productId,
      itemInternalName: item.itemInternalName,
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
 * @param {Array} items - Array of item objects with productId and itemInternalName
 * @param {number} batchSize - Number of stores to process at once
 * @returns {Promise<Array>} Array of all results
 */
const processStoresInBatches = async (stores, items, batchSize = 50) => {
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
      items.forEach((item) => {
        batchPromises.push(checkItemAvailability(store, item));
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
    let items;
    if (options.itemIds) {
      // If specific item IDs are provided, convert them to item objects
      items = options.itemIds.split(",").map((id) => ({
        productId: id.trim(),
        itemInternalName: `item_${id.trim()}`,
      }));
    } else {
      // Get items from CSV file
      items = await getItemsToCheck();
    }

    const batchSize = options.batchSize || config.batchSize;

    console.log(
      `Checking availability for items: ${items
        .map((item) => item.productId)
        .join(", ")}`
    );

    // Get the store data from the database
    const stores = await getStoreServiceabilityData();

    if (stores.length === 0) {
      throw new Error("No serviceable stores found");
    }

    // Process stores in batches
    const { results, errors } = await processStoresInBatches(
      stores,
      items,
      batchSize
    );

    // Create a simplified version of the results with just the key data
    const simplifiedResults = results.map((result) => ({
      storeId: result.availabilityData.storeId || result.store.storeId,
      itemId: result.itemId,
      itemInternalName: result.itemInternalName,
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
      message: `Completed item availability check for ${stores.length} stores and ${items.length} items`,
      timestamp: new Date().toISOString(),
      duration: `${duration} seconds`,
      summary: {
        totalStores: stores.length,
        totalItems: items.length,
        totalChecks: stores.length * items.length,
        successful: results.length,
        failed: errors.length,
        successRate: `${(
          (results.length / (stores.length * items.length)) *
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
