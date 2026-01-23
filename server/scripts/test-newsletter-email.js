/**
 * Test newsletter email sending with Resend
 * Usage: npm run newsletter:test
 */

require('dotenv').config();
const sequelize = require('../config/database');
const { sendAllNewsletters } = require('../jobs/newsletterScheduler');
const UserNewsletterSubscription = require('../models/UserNewsletterSubscription');
const Modules = require('../models/Modules');
const User = require('../models/User');

async function testNewsletterEmail() {
  try {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║    Newsletter Email Sending Test (Resend)  ║');
    console.log('╚════════════════════════════════════════════╝\n');

    // Sync database first
    console.log('0️⃣  Syncing database...');
    await sequelize.sync({ alter: true });
    console.log('   ✓ Database synced\n');

    // Check environment
    console.log('1️⃣  Checking environment configuration...');
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not set');
    if (!process.env.RESEND_FROM_EMAIL) throw new Error('RESEND_FROM_EMAIL not set');
    
    console.log(`   ✓ RESEND_API_KEY configured`);
    console.log(`   ✓ RESEND_FROM_EMAIL: ${process.env.RESEND_FROM_EMAIL}`);
    console.log(`   ✓ CLIENT_URL: ${process.env.CLIENT_URL}`);
    console.log(`   ✓ NEWSLETTER_ENABLED: ${process.env.NEWSLETTER_ENABLED}`);

    // Check subscriptions
    console.log('\n2️⃣  Checking newsletter subscriptions...');
    const allSubscriptions = await UserNewsletterSubscription.findAll({
      include: [{ model: Modules, attributes: ['title'] }]
    });
    console.log(`   Total subscriptions: ${allSubscriptions.length}`);

    const activeSubscriptions = allSubscriptions.filter(s => s.is_active);
    console.log(`   Active subscriptions: ${activeSubscriptions.length}`);

    if (activeSubscriptions.length > 0) {
      console.log('\n   📧 Subscriptions to process:');
      activeSubscriptions.forEach((sub, idx) => {
        console.log(`      ${idx + 1}. ${sub.email} → ${sub.Module.title} (Topics: ${sub.topic_ids.join(', ')})`);
      });
    } else {
      console.log('   ⚠️  No active subscriptions found');
    }

    // Trigger sending
    console.log('\n3️⃣  Triggering newsletter sending...\n');
    console.log('═══════════════════════════════════════════');
    await sendAllNewsletters();
    console.log('═══════════════════════════════════════════\n');

    // Results
    console.log('4️⃣  Test Complete!');
    console.log('\n   📧 Check your email inbox (may take 1-2 minutes)');
    console.log('   🔗 Resend Dashboard: https://dashboard.resend.com/');
    console.log('   📱 View logs in Resend account for delivery status\n');

    console.log('✅ Newsletter test completed!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testNewsletterEmail().then(() => {
  console.log('Exiting test script...\n');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
