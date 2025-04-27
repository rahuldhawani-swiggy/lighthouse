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

  console.log(
    "Cron job for store SLA check has been scheduled to run every 5 minutes"
  );
};

module.exports = {
  initCronJobs,
};
