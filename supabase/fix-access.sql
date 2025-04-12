-- Check if the air_quality table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public'
  AND table_name = 'air_quality'
);

-- Check if RLS is enabled
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'air_quality';

-- Check the ID column type
SELECT 
  column_name, 
  data_type, 
  column_default
FROM 
  information_schema.columns
WHERE 
  table_name = 'air_quality' AND
  column_name = 'id';

-- List existing policies
SELECT 
  policyname AS policy_name,
  permissive,
  roles,
  cmd AS operation,
  qual AS expression,
  with_check
FROM pg_policies
WHERE tablename = 'air_quality';

-- FIXES START HERE --

-- Fix 1: Reset RLS policies completely
ALTER TABLE public.air_quality DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.air_quality ENABLE ROW LEVEL SECURITY;

-- Fix 2: Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public read access on air_quality" ON public.air_quality;
DROP POLICY IF EXISTS "Allow insert for authenticated users on air_quality" ON public.air_quality;
DROP POLICY IF EXISTS "Allow public insert on air_quality" ON public.air_quality;
DROP POLICY IF EXISTS "anon_select" ON public.air_quality;
DROP POLICY IF EXISTS "anon_insert" ON public.air_quality;

-- Fix 3: Create policies with USING true to allow everyone
CREATE POLICY "anon_select" 
  ON public.air_quality 
  FOR SELECT 
  USING (true);

CREATE POLICY "anon_insert" 
  ON public.air_quality 
  FOR INSERT 
  WITH CHECK (true);

-- Fix 4: Grant permissions to the anon role
GRANT SELECT, INSERT ON public.air_quality TO anon;
-- Note: The sequence grant has been removed as the table uses UUID instead of SERIAL

-- Fix 5: Ensure identity column insert works if using UUID
DO $$
DECLARE
  id_type text;
BEGIN
  SELECT data_type INTO id_type 
  FROM information_schema.columns 
  WHERE table_name = 'air_quality' AND column_name = 'id';
  
  IF id_type = 'uuid' THEN
    -- For UUID columns, ensure the anon role can use the gen_random_uuid() function
    GRANT EXECUTE ON FUNCTION gen_random_uuid() TO anon;
  END IF;
END$$; 