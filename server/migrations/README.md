# Database Migrations

This folder contains SQL migrations for setting up Supabase tables and policies.

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended)
1. Go to https://app.supabase.com
2. Select your project
3. Open the "SQL Editor" from the left sidebar
4. Click "New Query"
5. Copy the SQL from the migration file
6. Paste it into the editor
7. Click "Run"

### Option 2: Command Line (via Supabase CLI)
```bash
supabase db push
```

## Migrations

### 001_create_userfeeds_table.sql
Creates the `UserFeeds` table that stores user-customized RSS feed URLs.

**Table Schema:**
- `feed_id` (BIGSERIAL): Primary key
- `user_id` (BIGINT): Foreign key to Users table
- `url` (TEXT): The RSS feed URL
- `name` (TEXT): Human-readable name for the feed
- `active` (BOOLEAN): Whether the feed is currently used in sync
- `created_at` (TIMESTAMP): When the feed was added

**Features:**
- Unique constraint on (user_id, url) to prevent duplicate feeds per user
- Index on user_id for fast lookups
- Row Level Security (RLS) policies to ensure users can only see/modify their own feeds
- Soft delete via `active` flag (instead of hard delete)

**Default Feeds:**
The RSS sync always uses the 3 default feeds as a base:
- Reuters Technology: https://www.reuters.com/technology/rss
- BBC Technology: https://feeds.bbci.co.uk/news/technology/rss.xml
- The Register: https://www.theregister.com/headlines.atom

**Custom Feeds:**
When users add custom feeds, they are added ON TOP of the defaults:
- User with 0 custom feeds: 3 feeds (defaults only)
- User with 1 custom feed: 4 feeds (1 custom + 3 defaults)
- User with 3 custom feeds: 6 feeds (3 custom + 3 defaults)

All feeds are synced together during the weekly RSS sync.
