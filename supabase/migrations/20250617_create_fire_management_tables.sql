-- Create fire management tables for Prescribed Fire GPT system

-- Fire data table for burn operations
CREATE TABLE IF NOT EXISTS fire_data (
  id SERIAL PRIMARY KEY,
  datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  burn_unit TEXT NOT NULL,
  location_name TEXT,
  burn_type TEXT,
  status TEXT DEFAULT 'Planned',
  acres_planned INTEGER,
  acres_completed INTEGER,
  temperature DECIMAL,
  humidity DECIMAL,
  wind_speed DECIMAL,
  wind_direction TEXT,
  fuel_moisture DECIMAL,
  latitude DECIMAL,
  longitude DECIMAL,
  elevation TEXT,
  crew_size INTEGER,
  burn_boss TEXT,
  objectives TEXT,
  weather_window_start TIMESTAMP WITH TIME ZONE,
  weather_window_end TIMESTAMP WITH TIME ZONE,
  risk_level TEXT DEFAULT 'Low',
  safety_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Risk assessments table
CREATE TABLE IF NOT EXISTS risk_assessments (
  id SERIAL PRIMARY KEY,
  fire_data_id INTEGER REFERENCES fire_data(id),
  assessment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  fuel_type TEXT,
  slope_percentage DECIMAL,
  infrastructure_distance INTEGER,
  crew_experience TEXT,
  weather_stability TEXT,
  seasonal_timing TEXT,
  overall_risk_score DECIMAL,
  risk_level TEXT,
  recommendations TEXT[],
  assessor_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Weather data table
CREATE TABLE IF NOT EXISTS weather_data (
  id SERIAL PRIMARY KEY,
  location_name TEXT,
  datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  temperature DECIMAL,
  humidity DECIMAL,
  wind_speed DECIMAL,
  wind_direction TEXT,
  pressure DECIMAL,
  haines_index INTEGER,
  forecast TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fire_data_datetime ON fire_data(datetime);
CREATE INDEX IF NOT EXISTS idx_fire_data_location ON fire_data(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_fire_data_status ON fire_data(status);
CREATE INDEX IF NOT EXISTS idx_fire_data_burn_unit ON fire_data(burn_unit);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_fire_id ON risk_assessments(fire_data_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_date ON risk_assessments(assessment_date);

CREATE INDEX IF NOT EXISTS idx_weather_data_datetime ON weather_data(datetime);
CREATE INDEX IF NOT EXISTS idx_weather_data_location ON weather_data(latitude, longitude);

-- Add comments to tables
COMMENT ON TABLE fire_data IS 'Stores prescribed fire burn operations and monitoring data';
COMMENT ON TABLE risk_assessments IS 'Stores fire risk assessments and safety evaluations';
COMMENT ON TABLE weather_data IS 'Stores weather data for fire management decisions';

-- Enable Row Level Security
ALTER TABLE fire_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_data ENABLE ROW LEVEL SECURITY;

-- Create secure policies for production readiness
-- Read access is public for demo, but write access requires authentication

CREATE POLICY "Allow public read access on fire_data"
ON fire_data FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated insert on fire_data"
ON fire_data FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated update on fire_data"
ON fire_data FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow public read access on risk_assessments"
ON risk_assessments FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated insert on risk_assessments"
ON risk_assessments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated update on risk_assessments"
ON risk_assessments FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow public read access on weather_data"
ON weather_data FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated insert on weather_data"
ON weather_data FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated update on weather_data"
ON weather_data FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Insert sample fire management data
INSERT INTO fire_data (
  datetime, burn_unit, location_name, burn_type, status, acres_planned, acres_completed,
  temperature, humidity, wind_speed, wind_direction, fuel_moisture,
  latitude, longitude, elevation, crew_size, burn_boss, objectives
) VALUES 
  (
    '2024-03-15T09:00:00Z', 'Unit-A12', 'Los Padres National Forest', 'Fuel Reduction', 'Completed',
    150, 145, 72, 45, 8, 'SW', 12.5, 36.2048, -121.5623, '1,200 ft', 8, 'J. Rodriguez',
    'Reduce fuel loading in oak woodland interface'
  ),
  (
    '2024-04-22T08:30:00Z', 'Unit-B7', 'Angeles National Forest', 'Ecosystem Restoration', 'In Progress',
    200, 85, 68, 52, 6, 'W', 15.2, 34.3644, -118.0886, '2,400 ft', 12, 'M. Chen',
    'Restore native grassland ecosystem'
  ),
  (
    '2024-05-10T07:45:00Z', 'Unit-C3', 'Cleveland National Forest', 'Habitat Enhancement', 'Planned',
    75, 0, 75, 38, 12, 'NW', 9.8, 33.3128, -116.7945, '3,100 ft', 6, 'R. Thompson',
    'Create mosaic pattern for wildlife habitat'
  ),
  (
    '2024-06-05T06:00:00Z', 'Unit-D15', 'San Bernardino National Forest', 'Fuel Reduction', 'Monitoring',
    300, 280, 78, 42, 15, 'SW', 11.3, 34.1764, -117.3089, '4,500 ft', 15, 'A. Martinez',
    'Wildfire prevention in high-risk interface zone'
  );

-- Insert sample risk assessments
INSERT INTO risk_assessments (
  fire_data_id, assessment_date, fuel_type, slope_percentage, infrastructure_distance,
  crew_experience, weather_stability, seasonal_timing, overall_risk_score, risk_level,
  recommendations, assessor_name
) VALUES 
  (
    1, '2024-03-14T14:00:00Z', 'Oak Woodland', 15, 500, 'experienced', 'stable', 'optimal',
    2.1, 'Low', ARRAY['Optimal conditions for burning', 'Standard safety protocols sufficient'],
    'Fire Management Specialist'
  ),
  (
    2, '2024-04-21T16:30:00Z', 'Chaparral', 25, 300, 'mixed', 'stable', 'optimal',
    3.2, 'Moderate', ARRAY['Increase crew readiness due to slope', 'Monitor wind conditions closely'],
    'Risk Assessment Team'
  );

-- Insert sample weather data
INSERT INTO weather_data (
  location_name, datetime, temperature, humidity, wind_speed, wind_direction,
  pressure, haines_index, forecast, latitude, longitude
) VALUES 
  (
    'Los Padres NF Station', '2024-06-17T12:00:00Z', 75, 45, 8, 'SW',
    29.85, 4, 'Favorable', 36.2048, -121.5623
  ),
  (
    'Angeles NF Station', '2024-06-17T12:00:00Z', 72, 52, 6, 'W',
    29.92, 3, 'Favorable', 34.3644, -118.0886
  );