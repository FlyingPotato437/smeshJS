# Supabase Setup

This directory contains the database schema and migrations for the SMesh Analyzer air quality application.

## Setup Instructions

1. Create a new Supabase project at https://supabase.com
2. Get your project URL and API keys from the Supabase dashboard
3. Add them to your `.env.local` file:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
4. Run the migrations using the Supabase CLI or execute the SQL directly in the SQL Editor

## Database Schema

The main table is `air_quality` with the following structure:

| Column           | Type      | Description                       |
|------------------|-----------|-----------------------------------|
| id               | SERIAL    | Primary key                       |
| datetime         | TIMESTAMP | When the measurement was taken    |
| from_node        | TEXT      | Sensor ID or name                 |
| pm25Standard     | DECIMAL   | PM2.5 concentration               |
| pm10Standard     | DECIMAL   | PM10 concentration                |
| temperature      | DECIMAL   | Temperature in degrees            |
| relativeHumidity | DECIMAL   | Relative humidity percentage      |
| latitude         | DECIMAL   | Geographic latitude               |
| longitude        | DECIMAL   | Geographic longitude              |
| elevation        | TEXT      | Elevation (height)                |
| created_at       | TIMESTAMP | When record was added to database |

## Troubleshooting

If you see errors like "Could not find the 'pm10Standard' column", you need to run the database migration to create the table structure. 