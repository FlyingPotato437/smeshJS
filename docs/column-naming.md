# Column Naming Convention Issue

## Problem

There's a mismatch between how the column names are stored in the Supabase database and how they're referenced in the application code:

- **Database column names** are lowercase: `pm10standard`, `pm25standard`, `relativehumidity`
- **Application code** uses camelCase: `pm10Standard`, `pm25Standard`, `relativeHumidity`

This causes errors like:

```
Could not find the 'pm10Standard' column of 'air_quality' in the schema cache
```

## Solutions

### 1. Updated Application Code (Current Approach)

We've updated the application code to handle both naming conventions:

- API endpoints now convert camelCase from frontend to lowercase for database
- Frontend components check for both formats when displaying data

### 2. Alternative: Recreate Database Table with camelCase

If you prefer to use camelCase in the database, you can recreate the table with camelCase column names:

```sql
-- Drop existing table (CAUTION: this will delete all data)
DROP TABLE IF EXISTS air_quality;

-- Create new table with camelCase column names
CREATE TABLE air_quality (
  id SERIAL PRIMARY KEY,
  datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  from_node TEXT,
  pm25Standard DECIMAL,
  pm10Standard DECIMAL,
  temperature DECIMAL,
  relativeHumidity DECIMAL,
  latitude DECIMAL,
  longitude DECIMAL,
  elevation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Apply Row Level Security
ALTER TABLE air_quality ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access on air_quality"
ON air_quality FOR SELECT USING (true);

CREATE POLICY "Allow public insert on air_quality"
ON air_quality FOR INSERT WITH CHECK (true);
```

## PostgreSQL Column Naming Best Practices

1. PostgreSQL column names are case-insensitive unless quoted
2. By convention, PostgreSQL uses lowercase names
3. For multi-word identifiers, use either:
   - snake_case (PostgreSQL standard): `relative_humidity`
   - or camelCase (JavaScript convention): `relativeHumidity`

## Reference

For more information on PostgreSQL naming conventions, see:
[PostgreSQL Documentation on Identifiers](https://www.postgresql.org/docs/current/sql-syntax-lexical.html#SQL-SYNTAX-IDENTIFIERS) 