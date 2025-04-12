-- Create the devices table
CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  name TEXT,
  description TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  elevation DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the sensor_readings table with foreign key to devices
CREATE TABLE IF NOT EXISTS sensor_readings (
  id SERIAL PRIMARY KEY,
  device_id INTEGER REFERENCES devices(id),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  pm25 DECIMAL,
  pm10 DECIMAL,
  temperature DECIMAL,
  humidity DECIMAL,
  co2 DECIMAL,
  voc DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp ON sensor_readings(timestamp);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_id ON sensor_readings(device_id);

-- Add comment to tables
COMMENT ON TABLE devices IS 'Stores information about air quality monitoring devices';
COMMENT ON TABLE sensor_readings IS 'Stores sensor readings from air quality monitoring devices';

-- Enable Row Level Security
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;

-- Create policies that allow anyone to select from the tables
CREATE POLICY "Allow public read access on devices"
ON devices FOR SELECT
USING (true);

CREATE POLICY "Allow public read access on sensor_readings"
ON sensor_readings FOR SELECT
USING (true);

-- Create policies that allow authenticated users to insert data
CREATE POLICY "Allow insert for authenticated users on devices"
ON devices FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow insert for authenticated users on sensor_readings"
ON sensor_readings FOR INSERT
WITH CHECK (true);

-- Create policies that allow public insert for demo purposes
CREATE POLICY "Allow public insert on devices"
ON devices FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public insert on sensor_readings"
ON sensor_readings FOR INSERT
WITH CHECK (true);

-- Migration function to copy data from air_quality to the new tables
CREATE OR REPLACE FUNCTION migrate_data_to_new_schema() RETURNS void AS $$
DECLARE
  device_record RECORD;
  device_id INTEGER;
BEGIN
  -- For each unique device in air_quality
  FOR device_record IN 
    SELECT DISTINCT from_node, latitude, longitude, elevation
    FROM air_quality
    WHERE from_node IS NOT NULL
  LOOP
    -- Insert into devices table and get the new ID
    INSERT INTO devices (name, latitude, longitude, elevation)
    VALUES (device_record.from_node, device_record.latitude, device_record.longitude, device_record.elevation)
    RETURNING id INTO device_id;
    
    -- Insert corresponding readings into sensor_readings
    INSERT INTO sensor_readings (
      device_id, 
      timestamp, 
      pm25, 
      pm10, 
      temperature, 
      humidity
    )
    SELECT 
      device_id,
      datetime,
      pm25Standard,
      pm10Standard,
      temperature,
      relativeHumidity
    FROM air_quality
    WHERE from_node = device_record.from_node;
  END LOOP;
END;
$$ LANGUAGE plpgsql; 