/**
 * Item List Utility Module
 * This module contains functionality to read item data from the item_list.csv file.
 * Used by the item availability cron job to get the list of items to check.
 */

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

/**
 * Reads the item data from the item_list.csv file
 * @returns {Promise<Array>} Promise that resolves to an array of item objects
 */
const readItemListCsv = () => {
  return new Promise((resolve, reject) => {
    try {
      const results = [];
      const filePath = path.join(__dirname, "..", "..", "item_list.csv");

      fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (data) => {
          // Format the data to match our expected structure
          results.push({
            itemInternalName: data.item_internal_name,
            productId: data.product_id,
          });
        })
        .on("end", () => {
          console.log(`Loaded ${results.length} items from CSV file`);
          resolve(results);
        })
        .on("error", (err) => {
          console.error("Error reading item list CSV:", err);
          reject(err);
        });
    } catch (error) {
      console.error("Error reading item list CSV:", error);
      reject(error);
    }
  });
};

/**
 * Gets the list of product IDs from the CSV file
 * @returns {Promise<Array>} Promise that resolves to an array of product IDs
 */
const getProductIds = async () => {
  try {
    const items = await readItemListCsv();
    return items.map((item) => item.productId);
  } catch (error) {
    console.error("Error getting product IDs:", error);
    throw error;
  }
};

/**
 * Gets the internal name for a given product ID
 * @param {string} productId - The product ID to lookup
 * @returns {Promise<string|null>} Promise that resolves to the internal name or null if not found
 */
const getInternalNameForProductId = async (productId) => {
  try {
    const items = await readItemListCsv();
    const item = items.find((item) => item.productId === productId);
    return item ? item.itemInternalName : null;
  } catch (error) {
    console.error("Error getting internal name for product ID:", error);
    return null;
  }
};

module.exports = {
  readItemListCsv,
  getProductIds,
  getInternalNameForProductId,
};
