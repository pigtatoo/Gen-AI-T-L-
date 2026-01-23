const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createNewsletterSubscriptionTable() {
  try {
    console.log('Creating user_newsletter_subscriptions table...');

    // Execute raw SQL to create the table
    const { data, error } = await supabase.rpc('create_newsletter_subscription_table', {}, {
      method: 'POST'
    });

    if (error) {
      console.error('Error creating table:', error);
      console.log('\nTrying alternative method...');
      
      // If RPC doesn't work, provide SQL for manual creation
      const sql = `
        CREATE TABLE IF NOT EXISTS public.user_newsletter_subscriptions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
          module_id INTEGER NOT NULL REFERENCES public."Modules"(module_id) ON DELETE CASCADE,
          topic_ids JSONB NOT NULL DEFAULT '[]',
          email VARCHAR(255) NOT NULL,
          is_active BOOLEAN DEFAULT true,
          last_sent TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, module_id)
        );

        CREATE INDEX idx_user_newsletter_active ON public.user_newsletter_subscriptions(is_active);
        CREATE INDEX idx_user_newsletter_user ON public.user_newsletter_subscriptions(user_id);
      `;

      console.log('\nManually execute this SQL in Supabase:');
      console.log(sql);
      return;
    }

    console.log('✓ Table created successfully');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

createNewsletterSubscriptionTable();
