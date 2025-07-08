/**
 * Cron Jobs Index
 * This file will be used to set up and schedule all cron jobs.
 * Currently commented out as we're testing via API endpoint.
 */

// Uncomment this code when ready to implement the cron job
/*
const cron = require('node-cron');
const { performStoreSlaCheck } = require('./storeSlaCheck');

// Function to initialize all cron jobs
const initCronJobs = () => {
  // Schedule the store SLA check
  // This example runs every hour at minute 0 (1:00, 2:00, etc.)
  cron.schedule('0 * * * *', async () => {
    console.log('Running scheduled store SLA check');
    try {
      const result = await performStoreSlaCheck({
        source: 'cron_job',
        scheduledTime: new Date().toISOString()
      });
      
      console.log('Store SLA check completed:', result.success);
    } catch (error) {
      console.error('Error during scheduled store SLA check:', error);
    }
  });
  
  console.log('All cron jobs have been scheduled');
};

module.exports = {
  initCronJobs
};
*/

const cron = require("node-cron");
const { performStoreSlaCheck } = require("./storeSlaCheck");
const { performItemAvailabilityCheck } = require("./itemAvailabilityCheck");

/**
 * Function to initialize all cron jobs
 */
const initCronJobs = () => {
  // Schedule the store SLA check to run every 5 minutes
  // The cron pattern '*/5 * * * *' means "every 5 minutes"
  cron.schedule("*/5 * * * *", async () => {
    console.log("Running scheduled store SLA check");
    try {
      const result = await performStoreSlaCheck({
        source: "cron_job",
        scheduledTime: new Date().toISOString(),
      });

      console.log(
        `Store SLA check completed: ${result.success ? "Success" : "Failed"}`
      );
      console.log(
        `Checked ${result.summary.total} locations: ${result.summary.successful} successful, ${result.summary.failed} failed`
      );
    } catch (error) {
      console.error("Error during scheduled store SLA check:", error);
    }
  });

  // Schedule the item availability check to run every 2 minutes
  // The cron pattern '*/2 * * * *' means "every 2 minutes"
  cron.schedule("*/2 * * * *", async () => {
    console.log("Running scheduled item availability check");
    try {
      const result = await performItemAvailabilityCheck({
        source: "cron_job",
        scheduledTime: new Date().toISOString(),
        itemIds: ["A8S21QP2A1", "RC72JAN6NK", "61WDNU5G4B"], // Example item IDs for testing
      });

      console.log(
        `Item availability check completed: ${
          result.success ? "Success" : "Failed"
        }`
      );
      if (result.success) {
        console.log(
          `Checked ${result.summary.totalChecks} item-store combinations: ${result.summary.successful} successful, ${result.summary.failed} failed`
        );
        console.log(`Success rate: ${result.summary.successRate}`);
      }
    } catch (error) {
      console.error("Error during scheduled item availability check:", error);
    }
  });

  console.log("Cron jobs have been scheduled:");
  console.log("- Store SLA check: every 5 minutes");
  console.log("- Item availability check: every 2 minutes");
};

module.exports = {
  initCronJobs,
};
