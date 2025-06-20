-- Create sessions table for tracking user uploads
CREATE TABLE IF NOT EXISTS upload_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  user_ip TEXT,
  file_name TEXT,
  file_size INTEGER,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cleaned')),
  metadata JSONB DEFAULT '{}'
);

-- Create session_data table for temporary air quality data
CREATE TABLE IF NOT EXISTS session_data (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID REFERENCES upload_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Air quality data fields (same as original air_quality table)
  datetime TIMESTAMPTZ,
  from_node TEXT,
  pm1standard FLOAT,
  pm25standard FLOAT,
  pm10standard FLOAT,
  pm100standard FLOAT,
  temperature FLOAT,
  relativehumidity FLOAT,
  barometricpressure FLOAT,
  gasresistance FLOAT,
  iaq FLOAT,
  voc FLOAT,
  co2 FLOAT,
  latitude FLOAT,
  longitude FLOAT,
  elevation FLOAT,
  
  -- Additional metadata
  device_name TEXT,
  raw_data JSONB
);

-- Create index for fast session-based queries
CREATE INDEX IF NOT EXISTS session_data_session_id_idx ON session_data(session_id);
CREATE INDEX IF NOT EXISTS session_data_datetime_idx ON session_data(datetime);
CREATE INDEX IF NOT EXISTS upload_sessions_expires_idx ON upload_sessions(expires_at);

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete expired sessions (and their data via CASCADE)
  DELETE FROM upload_sessions 
  WHERE expires_at < NOW() OR status = 'expired';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Function to get session data for LLM
CREATE OR REPLACE FUNCTION get_session_data(
  session_uuid UUID,
  data_limit INT DEFAULT 50
) RETURNS TABLE (
  id BIGINT,
  datetime TIMESTAMPTZ,
  temperature FLOAT,
  humidity FLOAT,
  pm25 FLOAT,
  pm10 FLOAT,
  pm1 FLOAT,
  device_name TEXT,
  latitude FLOAT,
  longitude FLOAT,
  location FLOAT[]
) LANGUAGE SQL STABLE AS $$
  SELECT
    sd.id,
    sd.datetime,
    sd.temperature,
    sd.relativehumidity as humidity,
    sd.pm25standard as pm25,
    sd.pm10standard as pm10,
    sd.pm1standard as pm1,
    sd.device_name,
    sd.latitude,
    sd.longitude,
    ARRAY[sd.latitude, sd.longitude] as location
  FROM session_data sd
  JOIN upload_sessions us ON sd.session_id = us.id
  WHERE us.id = session_uuid 
    AND us.status = 'active'
    AND us.expires_at > NOW()
    AND sd.latitude IS NOT NULL
    AND sd.longitude IS NOT NULL
  ORDER BY sd.datetime DESC
  LIMIT data_limit;
$$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON upload_sessions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON session_data TO anon, authenticated;
GRANT USAGE ON SEQUENCE session_data_id_seq TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_sessions() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_session_data(UUID, INT) TO anon, authenticated; 