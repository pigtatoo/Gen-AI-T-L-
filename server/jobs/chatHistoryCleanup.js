const supabase = require('../config/supabase');

// Delete chat history older than 15 days
async function cleanupOldChatHistory() {
  try {
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('ChatHistory')
      .delete()
      .lt('created_at', fifteenDaysAgo);

    if (error) {
      console.error('Error cleaning up old chat history:', error);
      return;
    }

    console.log('✓ Chat history cleanup completed');
  } catch (err) {
    console.error('Error in cleanup job:', err);
  }
}

module.exports = { cleanupOldChatHistory };
