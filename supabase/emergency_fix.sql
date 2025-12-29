-- EMERGENCY FIX: Remove ALL policies on profiles to stop infinite recursion
-- We will restore admin access later, first let's get login working.

-- 1. Disable RLS temporarily to clean up (optional but helps debug)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. Drop all known policies causing recursion
DROP POLICY IF EXISTS "Public Read Profiles" ON "profiles";
DROP POLICY IF EXISTS "Read Own Profile" ON "profiles";
DROP POLICY IF EXISTS "Read Profiles" ON "profiles";
DROP POLICY IF EXISTS "Update Own Profile" ON "profiles";
DROP POLICY IF EXISTS "Admin Read Profiles" ON "profiles";
DROP POLICY IF EXISTS "Users can view own profile, admins view all" ON "profiles";

-- 3. Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create ONE simple policy with NO recursion (User can only read their own profile)
CREATE POLICY "Simple Read Own Profile" ON "profiles" FOR SELECT USING (
  auth.uid() = id
);

-- 5. Create simple update policy
CREATE POLICY "Simple Update Own Profile" ON "profiles" FOR UPDATE USING (
  auth.uid() = id
);

-- NOTE: This removes Admin access to read other profiles for now, 
-- but it GUARANTEES that login will work for normal users.
