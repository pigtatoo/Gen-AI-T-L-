/**
 * Standalone script to send newsletters to all active subscriptions
 * This runs in GitHub Actions to bypass Render's email restrictions
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const newsletterController = require('../controllers/newsletterController');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function sendAllNewsletters() {
  try {
    console.log('📧 Starting newsletter batch send...');
    console.log('🔗 Connecting to Supabase...');

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
      console.error('❌ Error fetching subscriptions:', error);
      throw error;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('ℹ️  No active subscriptions found');
      return {
        success: true,
        sent: 0,
        failed: 0
      };
    }

    console.log(`📬 Found ${subscriptions.length} active subscription(s)\n`);

    const results = {
      sent: 0,
      failed: 0,
      errors: []
    };

    // Process each subscription
    for (let i = 0; i < subscriptions.length; i++) {
      const sub = subscriptions[i];
      console.log(`\n[${i + 1}/${subscriptions.length}] Processing subscription ID ${sub.id}`);
      console.log(`   User: ${sub.user_id} | Module: ${sub.module_id} | Email: ${sub.email}`);

      try {
        // Create minimal user object
        const user = { id: sub.user_id };

        // Send newsletter using existing controller
        const result = await newsletterController.sendSubscriptionNewsletter(sub.id, user);

        if (result.success) {
          results.sent++;
          console.log(`   ✅ SUCCESS - Newsletter sent`);
        } else {
          results.failed++;
          results.errors.push({
            subscriptionId: sub.id,
            email: sub.email,
            error: result.error
          });
          console.log(`   ❌ FAILED - ${result.error}`);
        }

        // Small delay to avoid rate limiting
        if (i < subscriptions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (err) {
        results.failed++;
        results.errors.push({
          subscriptionId: sub.id,
          email: sub.email,
          error: err.message
        });
        console.log(`   ❌ ERROR - ${err.message}`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 BATCH SEND COMPLETE');
    console.log('='.repeat(60));
    console.log(`✅ Successfully sent: ${results.sent}`);
    console.log(`❌ Failed: ${results.failed}`);

    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. Subscription ${err.subscriptionId} (${err.email}): ${err.error}`);
      });
    }

    // Exit with error code if any failed
    if (results.failed > 0) {
      process.exit(1);
    }

    return results;

  } catch (err) {
    console.error('\n❌ FATAL ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  sendAllNewsletters()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ Script failed:', err);
      process.exit(1);
    });
}

module.exports = { sendAllNewsletters };
