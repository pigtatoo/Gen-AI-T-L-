const cron = require('node-cron');
const { syncRssWeekly } = require('./rssSync');
const { cleanupOldChatHistory } = require('./chatHistoryCleanup');
const rssConfig = require('../config/rssConfig');

let scheduledTask = null;
let cleanupTask = null;

/**
 * Initialize the scheduler
 */
function initScheduler() {
  if (!process.env.RSS_SYNC_ENABLED || process.env.RSS_SYNC_ENABLED !== 'true') {
    console.log('RSS sync scheduler is disabled (set RSS_SYNC_ENABLED=true to enable)');
  } else {
    // Schedule the RSS sync job
    const schedule = rssConfig.schedule;
    console.log(`Scheduling RSS sync with cron: "${schedule}"`);

    scheduledTask = cron.schedule(schedule, async () => {
      console.log('\n⏰ Scheduled RSS sync started');
      await syncRssWeekly();
    });

    console.log('✓ RSS sync scheduler initialized');
  }

  // Schedule chat history cleanup daily at 2 AM UTC
  console.log('Scheduling chat history cleanup daily at 2 AM UTC');
  cleanupTask = cron.schedule('0 2 * * *', async () => {
    console.log('\n⏰ Chat history cleanup started');
    await cleanupOldChatHistory();
  });

  console.log('✓ Chat history cleanup scheduler initialized');
}

/**
 * Stop the scheduler
 */
function stopScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    console.log('✓ RSS sync scheduler stopped');
  }
  if (cleanupTask) {
    cleanupTask.stop();
    console.log('✓ Chat history cleanup scheduler stopped');
  }
}

module.exports = {
  initScheduler,
  stopScheduler,
  scheduledTask
};
