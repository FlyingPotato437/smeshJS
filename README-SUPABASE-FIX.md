# Fixing Supabase Database Schema Issues

## Problem
The application is encountering errors because it's trying to query from two tables (`sensor_readings` and `devices`) with a relationship between them, but these tables don't exist in your Supabase database.

The errors you're seeing are:
```
GET https://zwnyvdnxczrpaykqshxx.supabase.co/rest/v1/sensor_readings?select=*%2Cdevices%28name%2Clatitude%2Clongitude%29&limit=10000 400 (Bad Request)

Error fetching data: Error: Could not find a relationship between 'sensor_readings' and 'devices' in the schema cache
```

## Current Schema
Currently, your Supabase database has an `air_quality` table but doesn't have the `sensor_readings` and `devices` tables that the frontend is trying to use.

## Solution
You need to:
1. Create the `devices` table
2. Create the `sensor_readings` table with a foreign key to the `devices` table
3. Migrate existing data from `air_quality` to these new tables (optional)

## How to Fix

### Option 1: Run the Migration API (Easiest)
We've created an API endpoint to automatically create the required tables and migrate your data:

1. Add a migration token to your `.env.local` file:
   ```
   MIGRATION_SECRET_TOKEN=your-secret-token-here
   ```

2. Restart your development server:
   ```bash
   npm run dev
   ```

3. Call the migration API (using curl, Postman, or your browser):
   ```bash
   curl -X GET "http://localhost:3000/api/supabase/migrate" \
     -H "Authorization: Bearer your-secret-token-here"
   ```

4. The API will:
   - Check if the required tables exist
   - Create any missing tables
   - Set up the foreign key relationship
   - Migrate data from your existing `air_quality` table (if it exists)
   - Return a JSON response with the results

### Option 2: Run SQL in Supabase Dashboard
1. Log in to your Supabase Dashboard at https://app.supabase.com
2. Open your project
3. Go to SQL Editor
4. Create a New Query
5. Copy the contents of `supabase/migrations/create_sensor_readings_and_devices.sql`
6. Execute the SQL
7. Run the migration function (if you want to migrate data from the old table):
   ```sql
   SELECT migrate_data_to_new_schema();
   ```

### Option 3: Use Supabase CLI
If you have the Supabase CLI installed:

1. Make sure you're logged in:
   ```bash
   supabase login
   ```

2. Link to your project:
   ```bash
   supabase link --project-ref <your-project-ref>
   ```

3. Push the migration:
   ```bash
   supabase db push
   ```

## Updating Data Upload Process

For future uploads, the application will need to:

1. Create a device record (or find an existing one) in the `devices` table
2. Insert readings with the `device_id` reference in the `sensor_readings` table

This process can be handled by the upload API. We'll need to modify the existing upload process to use the new schema.

## Updating Frontend Code (Optional)
If you prefer to use the existing `air_quality` table instead of creating new tables, you'll need to modify the frontend code to query from that table instead. Look for files that contain `supabase.from('sensor_readings')` and change them to use `supabase.from('air_quality')` with the appropriate field mappings.

## Need Help?
If you need assistance, feel free to reach out to the development team or refer to the Supabase documentation at https://supabase.com/docs 