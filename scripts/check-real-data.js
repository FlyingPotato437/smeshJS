require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRealData() {
  console.log('🔍 Looking for REAL data with actual values...\n');

  // 1. Get data with non-zero temperature and humidity
  console.log('1. Searching for data with real temperature/humidity values...');
  const { data: realData, error } = await supabase
    .from('air_quality')
    .select('*')
    .neq('temperature', 0)
    .neq('relativehumidity', 0)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .neq('latitude', 0)
    .neq('longitude', 0)
    .order('datetime', { ascending: false })
    .limit(10);
  
  if (realData && realData.length > 0) {
    console.log(`✅ Found ${realData.length} records with real values:`);
    realData.slice(0, 3).forEach((record, i) => {
      console.log(`\nRecord ${i + 1}:`);
      console.log(`  DateTime: ${record.datetime}`);
      console.log(`  Sensor: ${record.from_node}`);
      console.log(`  Temperature: ${record.temperature}°C`);
      console.log(`  Humidity: ${record.relativehumidity}%`);
      console.log(`  PM2.5: ${record.pm25standard} μg/m³`);
      console.log(`  Location: ${record.latitude}, ${record.longitude}`);
    });
  } else {
    console.log('❌ No data found with non-zero temperature/humidity');
  }

  // 2. Check date ranges
  console.log('\n2. Checking date ranges in the data...');
  const { data: dateData } = await supabase
    .from('air_quality')
    .select('datetime')
    .order('datetime', { ascending: true })
    .limit(1);
  
  const { data: latestDate } = await supabase
    .from('air_quality')
    .select('datetime')
    .order('datetime', { ascending: false })
    .limit(1);
  
  if (dateData && latestDate) {
    console.log(`  Earliest: ${dateData[0].datetime}`);
    console.log(`  Latest: ${latestDate[0].datetime}`);
  }

  // 3. Check all unique sensors
  console.log('\n3. Checking all sensors and their data quality...');
  const { data: allSensors } = await supabase
    .from('air_quality')
    .select('from_node');
  
  const uniqueSensors = [...new Set(allSensors.map(d => d.from_node))];
  
  for (const sensor of uniqueSensors.slice(0, 5)) {
    const { data: sensorData } = await supabase
      .from('air_quality')
      .select('temperature, relativehumidity, pm25standard')
      .eq('from_node', sensor)
      .neq('temperature', 0)
      .limit(1);
    
    if (sensorData && sensorData.length > 0) {
      console.log(`  ${sensor}: Has real data (T: ${sensorData[0].temperature}°C, H: ${sensorData[0].relativehumidity}%)`);
    } else {
      console.log(`  ${sensor}: Only zero values`);
    }
  }

  // 4. Get overall statistics
  console.log('\n4. Overall data statistics...');
  const { count: totalRecords } = await supabase
    .from('air_quality')
    .select('*', { count: 'exact', head: true });
  
  const { count: recordsWithTemp } = await supabase
    .from('air_quality')
    .select('*', { count: 'exact', head: true })
    .neq('temperature', 0);
  
  const { count: recordsWithLocation } = await supabase
    .from('air_quality')
    .select('*', { count: 'exact', head: true })
    .not('latitude', 'is', null)
    .neq('latitude', 0);
  
  console.log(`  Total records: ${totalRecords}`);
  console.log(`  Records with real temperature: ${recordsWithTemp}`);
  console.log(`  Records with real location: ${recordsWithLocation}`);
}

checkRealData().catch(console.error); 