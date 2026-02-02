#!/usr/bin/env node

/**
 * Script to send newsletters to all active subscriptions
 * Run manually: node scripts/send-newsletters.js
 * Or scheduled via Render cron job
 */

require('dotenv').config();
const supabase = require('../config/supabase');
const newsletterController = require('../controllers/newsletterController');

async function sendAllNewsletters() {
  console.log('\n📧 Starting newsletter batch send...');
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  console.log('═'.repeat(60));

  try {
    // Get all active subscriptions
    const { data: subscriptions, error } = await supabase
      .from('user_newsletter_subscriptions')
      .select(`
        id,
        user_id,
        module_id,
        topic_ids,
        email,
        is_active
      `)
      .eq('is_active', true);

    if (error) {
      console.error('❌ Database error:', error.message);
      throw error;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('ℹ️  No active subscriptions found');
      console.log('✅ Process completed (nothing to send)');
      return;
    }

    console.log(`📬 Found ${subscriptions.length} active subscription(s)\n`);

    let sent = 0;
    let failed = 0;

    // Send newsletter for each subscription
    for (let i = 0; i < subscriptions.length; i++) {
      const sub = subscriptions[i];
      
      console.log(`\n[${i + 1}/${subscriptions.length}] Processing subscription #${sub.id}`);
      console.log(`   User ID: ${sub.user_id}`);
      console.log(`   Email: ${sub.email}`);
      console.log(`   Module ID: ${sub.module_id}`);
      console.log(`   Topics: ${sub.topic_ids.length} selected`);

      try {
        // Create minimal user object for the controller
        const user = { id: sub.user_id };
        
        const result = await newsletterController.sendSubscriptionNewsletter(sub.id, user);
        
        if (result.success) {
          sent++;
          console.log(`   ✅ Sent successfully`);
        } else {
          failed++;
          console.log(`   ❌ Failed: ${result.error}`);
        }

        // Small delay between sends to avoid rate limiting
        if (i < subscriptions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (err) {
        failed++;
        console.error(`   ❌ Error: ${err.message}`);
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('📊 BATCH SEND SUMMARY');
    console.log('═'.repeat(60));
    console.log(`✅ Successfully sent: ${sent}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📧 Total processed: ${subscriptions.length}`);
    console.log('═'.repeat(60));
    console.log(`✅ Newsletter batch send completed at ${new Date().toISOString()}\n`);

    process.exit(failed > 0 ? 1 : 0);

  } catch (err) {
    console.error('\n❌ Fatal error in newsletter batch send:', err);
    console.error(err.stack);
    process.exit(1);
  }
}

// Run the script
sendAllNewsletters();
