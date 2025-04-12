-- Create the air_quality table with all required columns
CREATE TABLE IF NOT EXISTS air_quality (
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_air_quality_datetime ON air_quality(datetime);
CREATE INDEX IF NOT EXISTS idx_air_quality_location ON air_quality(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_air_quality_node ON air_quality(from_node);

-- Add comment to table
COMMENT ON TABLE air_quality IS 'Stores air quality measurements from various sensors';

-- Enable Row Level Security
ALTER TABLE air_quality ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anyone to select from the table
CREATE POLICY "Allow public read access on air_quality"
ON air_quality FOR SELECT
USING (true);

-- Create a policy that allows authenticated users to insert data
CREATE POLICY "Allow insert for authenticated users on air_quality"
ON air_quality FOR INSERT
WITH CHECK (true);

-- Create a policy that allows anyone to insert data (for this demo app)
-- Comment this out if you want to restrict inserts to authenticated users only
CREATE POLICY "Allow public insert on air_quality"
ON air_quality FOR INSERT
WITH CHECK (true); 