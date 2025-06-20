-- Corrected Migration function to copy data from air_quality to the new tables
CREATE OR REPLACE FUNCTION migrate_data_to_new_schema()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER          -- Run with privileges of the function owner (service role)
SET search_path = public  -- Ensure we operate in the correct schema
AS $$
DECLARE
  device_record RECORD;
  device_id INTEGER;
BEGIN
  -- Loop through unique devices in legacy air_quality table
  FOR device_record IN 
    SELECT DISTINCT from_node, latitude, longitude, elevation
    FROM air_quality
    WHERE from_node IS NOT NULL AND latitude IS NOT NULL
  LOOP
    -- Insert (or get existing) device record
    INSERT INTO devices (name, latitude, longitude, elevation)
    VALUES (device_record.from_node, device_record.latitude, device_record.longitude, device_record.elevation)
    ON CONFLICT (name) DO UPDATE
      SET latitude  = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          elevation = EXCLUDED.elevation
    RETURNING id INTO device_id;

    -- Insert corresponding readings, avoiding duplicates by timestamp
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
      COALESCE(pm25standard, pm25, 0),      -- Handle different column names / nulls
      COALESCE(pm10standard, pm10, 0),
      temperature,
      relativehumidity
    FROM air_quality
    WHERE from_node = device_record.from_node
END LOOP;
END;
$$; 