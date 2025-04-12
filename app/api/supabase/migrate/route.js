import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

export async function GET(request) {
  try {
    // Get authorization token from header
    const authHeader = request.headers.get('authorization');
    
    // Basic security check - require a token
    // In production, you'd want a more secure method
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];
    
    // Simple token check - in production use a proper auth mechanism
    if (token !== process.env.MIGRATION_SECRET_TOKEN) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 403 }
      );
    }
    
    console.log('Starting database schema migration...');
    
    // Check if devices table exists
    const { data: devicesTable, error: devicesTableError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'devices')
      .single();
      
    if (devicesTableError && devicesTableError.code !== 'PGRST116') {
      return NextResponse.json({
        success: false,
        stage: 'check-devices-table',
        error: devicesTableError.message,
        details: devicesTableError
      }, { status: 500 });
    }
    
    const devicesExists = devicesTable && devicesTable.table_name === 'devices';
    
    // Check if sensor_readings table exists
    const { data: readingsTable, error: readingsTableError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'sensor_readings')
      .single();
      
    if (readingsTableError && readingsTableError.code !== 'PGRST116') {
      return NextResponse.json({
        success: false,
        stage: 'check-readings-table',
        error: readingsTableError.message,
        details: readingsTableError
      }, { status: 500 });
    }
    
    const readingsExists = readingsTable && readingsTable.table_name === 'sensor_readings';
    
    // If both tables already exist, no migration needed
    if (devicesExists && readingsExists) {
      return NextResponse.json({
        success: true,
        message: 'Tables already exist, no migration needed',
        tables: { devices: true, sensor_readings: true }
      });
    }
    
    // Create tables if they don't exist
    console.log('Creating tables...');
    
    // Create devices table if it doesn't exist
    if (!devicesExists) {
      const { error: createDevicesError } = await supabaseAdmin.rpc('exec', {
        query: `
          CREATE TABLE IF NOT EXISTS devices (
            id SERIAL PRIMARY KEY,
            name TEXT,
            description TEXT,
            latitude DECIMAL,
            longitude DECIMAL,
            elevation DECIMAL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          -- Enable Row Level Security
          ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
          
          -- Create policies that allow anyone to select from the table
          CREATE POLICY "Allow public read access on devices"
          ON devices FOR SELECT
          USING (true);
          
          -- Create policies that allow authenticated users to insert data
          CREATE POLICY "Allow insert for authenticated users on devices"
          ON devices FOR INSERT
          WITH CHECK (true);
          
          -- Create policies that allow public insert for demo purposes
          CREATE POLICY "Allow public insert on devices"
          ON devices FOR INSERT
          WITH CHECK (true);
        `
      });
      
      if (createDevicesError) {
        return NextResponse.json({
          success: false,
          stage: 'create-devices-table',
          error: createDevicesError.message,
          details: createDevicesError
        }, { status: 500 });
      }
      
      console.log('Created devices table');
    }
    
    // Create sensor_readings table if it doesn't exist
    if (!readingsExists) {
      const { error: createReadingsError } = await supabaseAdmin.rpc('exec', {
        query: `
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
          
          -- Enable Row Level Security
          ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
          
          -- Create policies that allow anyone to select from the table
          CREATE POLICY "Allow public read access on sensor_readings"
          ON sensor_readings FOR SELECT
          USING (true);
          
          -- Create policies that allow authenticated users to insert data
          CREATE POLICY "Allow insert for authenticated users on sensor_readings"
          ON sensor_readings FOR INSERT
          WITH CHECK (true);
          
          -- Create policies that allow public insert for demo purposes
          CREATE POLICY "Allow public insert on sensor_readings"
          ON sensor_readings FOR INSERT
          WITH CHECK (true);
        `
      });
      
      if (createReadingsError) {
        return NextResponse.json({
          success: false,
          stage: 'create-readings-table',
          error: createReadingsError.message,
          details: createReadingsError
        }, { status: 500 });
      }
      
      console.log('Created sensor_readings table');
    }
    
    // Check if the air_quality table exists for data migration
    const { data: airQualityTable, error: airQualityTableError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'air_quality')
      .single();
      
    const airQualityExists = airQualityTable && airQualityTable.table_name === 'air_quality';
    
    // Migrate data if the air_quality table exists
    if (airQualityExists) {
      // First create a migration function
      const { error: createFunctionError } = await supabaseAdmin.rpc('exec', {
        query: `
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
        `
      });
      
      if (createFunctionError) {
        return NextResponse.json({
          success: false,
          stage: 'create-migration-function',
          error: createFunctionError.message,
          details: createFunctionError
        }, { status: 500 });
      }
      
      // Then execute the migration function
      const { error: migrationError } = await supabaseAdmin.rpc('exec', {
        query: `
          SELECT migrate_data_to_new_schema();
        `
      });
      
      if (migrationError) {
        return NextResponse.json({
          success: false,
          stage: 'execute-migration',
          error: migrationError.message,
          details: migrationError
        }, { status: 500 });
      }
      
      console.log('Migrated data from air_quality to the new tables');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      tables: {
        devices: true,
        sensor_readings: true
      },
      dataMigrated: airQualityExists
    });
    
  } catch (error) {
    console.error('Error in migration:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * This function would be used if we had a form to trigger the migration.
 * For now, we're only supporting GET requests for simplicity.
 */
export async function POST(request) {
  return NextResponse.json(
    { message: 'Use GET request to run the migration' },
    { status: 405 }
  );
} 