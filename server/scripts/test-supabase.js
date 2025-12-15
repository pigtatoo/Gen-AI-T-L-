#!/usr/bin/env node

// Quick Supabase connectivity test over HTTPS
require('dotenv').config();
const supabase = require('../config/supabase');

(async () => {
  try {
    console.log('🔗 Testing Supabase (HTTPS) connection...');
    // Lightweight HEAD-style query to verify access; counts rows without returning them
    const { count, error } = await supabase
      .from('Modules')
      .select('module_id', { count: 'exact', head: true });

    if (error) throw error;
    console.log(`✅ Supabase reachable. Modules count: ${count ?? 0}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Supabase test failed:', err.message);
    process.exit(1);
  }
})();
