-- ============================================================================
-- Backfill profiles for existing users
-- Run this in Supabase SQL Editor to create profiles for users that don't have them
-- ============================================================================

-- Insert profiles for any auth users that don't have a profile yet
INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
SELECT
    au.id,
    au.email,
    au.raw_user_meta_data->>'full_name' as full_name,
    au.created_at,
    NOW() as updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- Show how many profiles were created
SELECT 'Backfill complete. Total profiles:' as message, COUNT(*) as count FROM public.profiles;
