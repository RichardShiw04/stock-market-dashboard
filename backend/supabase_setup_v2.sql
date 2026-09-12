-- ============================================================================
-- Supabase Database Setup V2 – Saved News & Favorites
-- Run this AFTER the original supabase_setup.sql
-- ============================================================================

-- ============================================================================
-- 1. Create saved_news table for users to save news articles
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.saved_news (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  headline TEXT NOT NULL,
  source TEXT,
  url TEXT NOT NULL,
  summary TEXT,
  image TEXT,
  symbol TEXT NOT NULL,
  article_id TEXT,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, url)
);

-- ============================================================================
-- 2. Enable RLS on saved_news
-- ============================================================================
ALTER TABLE public.saved_news ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. RLS Policies for saved_news
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own saved news" ON public.saved_news;
CREATE POLICY "Users can view their own saved news"
  ON public.saved_news
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own saved news" ON public.saved_news;
CREATE POLICY "Users can insert their own saved news"
  ON public.saved_news
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own saved news" ON public.saved_news;
CREATE POLICY "Users can delete their own saved news"
  ON public.saved_news
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. Indexes for saved_news
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_saved_news_user_id ON public.saved_news(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_news_symbol ON public.saved_news(symbol);

-- ============================================================================
-- Setup V2 Complete!
-- ============================================================================
