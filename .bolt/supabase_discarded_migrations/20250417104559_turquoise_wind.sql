/*
  # Update user_locations RLS policies

  1. Changes
    - Update RLS policies for user_locations table to properly handle:
      - Authenticated users accessing their own locations
      - Anonymous users with proper anonymous ID handling
  
  2. Security
    - Maintain RLS enabled on user_locations table
    - Update policies to properly check user authentication status
    - Add specific checks for anonymous users using app.anonymous_id
*/

-- First, drop existing policies to recreate them with proper conditions
DROP POLICY IF EXISTS "Anyone can read all locations" ON "user_locations";
DROP POLICY IF EXISTS "Users can delete their own location" ON "user_locations";
DROP POLICY IF EXISTS "Users can insert their own location" ON "user_locations";
DROP POLICY IF EXISTS "Users can update their own location" ON "user_locations";

-- Create new policies with proper authentication checks
CREATE POLICY "Anyone can read all locations"
ON "user_locations"
FOR SELECT
TO public
USING (true);

CREATE POLICY "Users can insert their own location"
ON "user_locations"
FOR INSERT
TO public
WITH CHECK (
  -- Allow authenticated users to insert their own location
  (auth.role() = 'authenticated' AND auth.uid()::text = user_id) OR
  -- Allow anonymous users to insert with proper anonymous ID
  (auth.role() = 'anon' AND is_anonymous = true AND user_id = current_setting('app.anonymous_id'::text, true))
);

CREATE POLICY "Users can update their own location"
ON "user_locations"
FOR UPDATE
TO public
USING (
  -- Allow authenticated users to update their own location
  (auth.role() = 'authenticated' AND auth.uid()::text = user_id) OR
  -- Allow anonymous users to update with proper anonymous ID
  (auth.role() = 'anon' AND is_anonymous = true AND user_id = current_setting('app.anonymous_id'::text, true))
)
WITH CHECK (
  -- Same conditions for the new row
  (auth.role() = 'authenticated' AND auth.uid()::text = user_id) OR
  (auth.role() = 'anon' AND is_anonymous = true AND user_id = current_setting('app.anonymous_id'::text, true))
);

CREATE POLICY "Users can delete their own location"
ON "user_locations"
FOR DELETE
TO public
USING (
  -- Allow authenticated users to delete their own location
  (auth.role() = 'authenticated' AND auth.uid()::text = user_id) OR
  -- Allow anonymous users to delete with proper anonymous ID
  (auth.role() = 'anon' AND is_anonymous = true AND user_id = current_setting('app.anonymous_id'::text, true))
);