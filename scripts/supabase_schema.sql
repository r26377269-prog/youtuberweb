-- Supabase Table Schema Setup for YouTuber Website
-- Execute this SQL script in your Supabase SQL Editor (https://app.supabase.com -> SQL Editor)

-- 1. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY DEFAULT 1,
  website_title TEXT DEFAULT 'CREATOR • Official YouTuber Website',
  creator_name TEXT DEFAULT 'ALEX VANCE',
  profile_image TEXT DEFAULT '/images/profile.jpg',
  logo_url TEXT DEFAULT '',
  hero_welcome_text TEXT DEFAULT 'WELCOME TO THE CHANNEL',
  hero_typing_texts JSONB DEFAULT '["GAMING", "LIVE STREAMS", "TECH REVIEWS", "DAILY VLOGS"]'::jsonb,
  youtube_channel_url TEXT DEFAULT 'https://youtube.com',
  hero_video_url TEXT DEFAULT '',
  about_text TEXT DEFAULT 'Welcome to my official creator portal. I produce high-energy gaming streams, tech reviews, and daily behind-the-scenes content.',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. STREAMS TABLE
CREATE TABLE IF NOT EXISTS streams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  scheduled_date DATE,
  scheduled_time TIME,
  youtube_url TEXT,
  status TEXT CHECK (status IN ('LIVE NOW', 'UPCOMING', 'ENDED')) DEFAULT 'UPCOMING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. VIDEOS TABLE
CREATE TABLE IF NOT EXISTS videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  youtube_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT DEFAULT 'Gaming',
  status TEXT DEFAULT 'published',
  is_trending BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. SUBSCRIBERS TABLE
CREATE TABLE IF NOT EXISTS subscribers (
  id INT PRIMARY KEY DEFAULT 1,
  count INT DEFAULT 1245890,
  is_api_enabled BOOLEAN DEFAULT false,
  youtube_channel_id TEXT DEFAULT '',
  youtube_api_key TEXT DEFAULT '',
  counter_font TEXT DEFAULT '''Bebas Neue'', sans-serif',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. SUPPORT / UPI SETTINGS TABLE
CREATE TABLE IF NOT EXISTS support_settings (
  id INT PRIMARY KEY DEFAULT 1,
  upi_id TEXT DEFAULT 'creator@upi',
  creator_name TEXT DEFAULT 'ALEX VANCE',
  qr_code_url TEXT DEFAULT '/images/sample-qr.png',
  default_amount INT DEFAULT 100,
  support_message TEXT DEFAULT 'Support the stream directly to enable bigger production values and gear upgrades!',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. SOCIAL LINKS TABLE
CREATE TABLE IF NOT EXISTS social_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  icon_class TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0
);

-- 7. ADMIN USERS TABLE
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_links ENABLE ROW LEVEL SECURITY;

-- Allow PUBLIC read & write access to content
DROP POLICY IF EXISTS "Allow public read settings" ON settings;
DROP POLICY IF EXISTS "Allow public all settings" ON settings;
CREATE POLICY "Allow public all settings" ON settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read streams" ON streams;
DROP POLICY IF EXISTS "Allow public all streams" ON streams;
CREATE POLICY "Allow public all streams" ON streams FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read videos" ON videos;
DROP POLICY IF EXISTS "Allow public all videos" ON videos;
CREATE POLICY "Allow public all videos" ON videos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read subscribers" ON subscribers;
DROP POLICY IF EXISTS "Allow public all subscribers" ON subscribers;
CREATE POLICY "Allow public all subscribers" ON subscribers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read support_settings" ON support_settings;
DROP POLICY IF EXISTS "Allow public all support_settings" ON support_settings;
CREATE POLICY "Allow public all support_settings" ON support_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read social_links" ON social_links;
DROP POLICY IF EXISTS "Allow public all social_links" ON social_links;
CREATE POLICY "Allow public all social_links" ON social_links FOR ALL USING (true) WITH CHECK (true);
