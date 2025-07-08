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
  // Schedule the store SLA check to run every 10 minutes
  // The cron pattern '*/10 * * * *' means "every 10 minutes"
  cron.schedule("*/10 * * * *", async () => {
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

  // Schedule the item availability check to run every 20 minutes
  // The cron pattern '*/20 * * * *' means "every 20 minutes"
  cron.schedule("*/20 * * * *", async () => {
    console.log("Running scheduled item availability check");
    try {
      const result = await performItemAvailabilityCheck({
        source: "cron_job",
        scheduledTime: new Date().toISOString(),
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
  console.log("- Store SLA check: every 10 minutes");
  console.log("- Item availability check: every 20 minutes");
};

module.exports = {
  initCronJobs,
};
