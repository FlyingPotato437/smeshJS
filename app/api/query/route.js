import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';

/**
 * POST handler for AI queries on air quality data
 * Falls back to mock response if OpenAI is not configured
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { query } = body;
    
    if (!query) {
      return NextResponse.json(
        { error: 'No query provided' },
        { status: 400 }
      );
    }
    
    // Get data, either from Supabase or fallback to mock
    let data = [];
    
    if (isSupabaseConfigured()) {
      // Fetch data from Supabase
      const { data: supabaseData, error } = await supabase
        .from('air_quality')
        .select('*')
        .limit(100); // Limit to avoid large payloads
      
      if (error) throw error;
      data = supabaseData;
    } else {
      // Use mock data
      data = generateMockData();
    }
    
    // Process the query with the data
    // In a real app, this would call OpenAI or another AI service
    // For now, we'll generate a mock response based on the query
    const response = generateMockResponse(query, data);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error processing query:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Generate mock air quality data for development
 */
function generateMockData() {
  // Base location (San Francisco)
  const baseLat = 37.7749;
  const baseLon = -122.4194;
  
  // Generate 20 random points
  const mockData = [];
  
  for (let i = 0; i < 20; i++) {
    // Generate a random location within ~5km of the base location
    const lat = baseLat + (Math.random() - 0.5) * 0.1;
    const lon = baseLon + (Math.random() - 0.5) * 0.1;
    
    // Generate a random date within the past week
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 7));
    date.setHours(Math.floor(Math.random() * 24));
    date.setMinutes(Math.floor(Math.random() * 60));
    
    mockData.push({
      id: i + 1,
      datetime: date.toISOString(),
      from_node: `sensor-${Math.floor(Math.random() * 10) + 1}`,
      pm25Standard: Math.random() * 50,
      pm10Standard: Math.random() * 100,
      temperature: 15 + Math.random() * 15,
      relativeHumidity: 30 + Math.random() * 50,
      latitude: lat,
      longitude: lon,
      elevation: `${Math.floor(10 + Math.random() * 100)} ft`
    });
  }
  
  return mockData;
}

/**
 * Generate a mock response based on the query
 */
function generateMockResponse(query, data) {
  // Lowercase the query for easier matching
  const queryLower = query.toLowerCase();
  
  // Default response parts
  let analysis = "";
  let sqlQuery = "";
  let chartType = null;
  
  // Check for PM2.5 queries
  if (queryLower.includes('pm2.5') || queryLower.includes('pm25')) {
    sqlQuery = 'SELECT datetime, pm25Standard, from_node, latitude, longitude FROM air_quality ORDER BY datetime';
    
    // Calculate some basic stats
    const pm25Values = data.map(item => item.pm25Standard).filter(val => val !== null && !isNaN(val));
    const average = pm25Values.reduce((sum, val) => sum + val, 0) / pm25Values.length;
    const max = Math.max(...pm25Values);
    const min = Math.min(...pm25Values);
    
    analysis = `Analysis of PM2.5 levels:\n\n` +
      `The average PM2.5 concentration is ${average.toFixed(2)} μg/m³.\n` +
      `The maximum recorded level is ${max.toFixed(2)} μg/m³.\n` +
      `The minimum recorded level is ${min.toFixed(2)} μg/m³.\n\n` +
      `According to EPA standards, PM2.5 levels above 35 μg/m³ over a 24-hour period are considered unhealthy.\n` +
      `${average > 35 ? 'The average PM2.5 level exceeds the EPA 24-hour standard, which is concerning.' : 
         'The average PM2.5 level is within the EPA 24-hour standard, which is good.'}`;
    
    // Determine if this is a time series request
    if (queryLower.includes('over time') || queryLower.includes('trend') || queryLower.includes('history')) {
      chartType = 'timeseries';
    }
  }
  
  // Check for PM10 queries
  else if (queryLower.includes('pm10')) {
    sqlQuery = 'SELECT datetime, pm10Standard, from_node, latitude, longitude FROM air_quality ORDER BY datetime';
    
    // Calculate some basic stats
    const pm10Values = data.map(item => item.pm10Standard).filter(val => val !== null && !isNaN(val));
    const average = pm10Values.reduce((sum, val) => sum + val, 0) / pm10Values.length;
    const max = Math.max(...pm10Values);
    const min = Math.min(...pm10Values);
    
    analysis = `Analysis of PM10 levels:\n\n` +
      `The average PM10 concentration is ${average.toFixed(2)} μg/m³.\n` +
      `The maximum recorded level is ${max.toFixed(2)} μg/m³.\n` +
      `The minimum recorded level is ${min.toFixed(2)} μg/m³.\n\n` +
      `According to EPA standards, PM10 levels above 150 μg/m³ over a 24-hour period are considered unhealthy.\n` +
      `${average > 150 ? 'The average PM10 level exceeds the EPA 24-hour standard, which is concerning.' : 
         'The average PM10 level is within the EPA 24-hour standard, which is good.'}`;
    
    // Determine if this is a time series request
    if (queryLower.includes('over time') || queryLower.includes('trend') || queryLower.includes('history')) {
      chartType = 'timeseries';
    }
  }
  
  // Check for temperature queries
  else if (queryLower.includes('temperature')) {
    sqlQuery = 'SELECT datetime, temperature, from_node, latitude, longitude FROM air_quality ORDER BY datetime';
    
    // Calculate some basic stats
    const tempValues = data.map(item => item.temperature).filter(val => val !== null && !isNaN(val));
    const average = tempValues.reduce((sum, val) => sum + val, 0) / tempValues.length;
    const max = Math.max(...tempValues);
    const min = Math.min(...tempValues);
    
    analysis = `Analysis of temperature readings:\n\n` +
      `The average temperature is ${average.toFixed(1)}°C (${(average * 9/5 + 32).toFixed(1)}°F).\n` +
      `The maximum recorded temperature is ${max.toFixed(1)}°C (${(max * 9/5 + 32).toFixed(1)}°F).\n` +
      `The minimum recorded temperature is ${min.toFixed(1)}°C (${(min * 9/5 + 32).toFixed(1)}°F).\n\n` +
      `Indoor temperature between 20-25°C (68-77°F) is typically considered comfortable for most people.`;
    
    // Determine if this is a time series request
    if (queryLower.includes('over time') || queryLower.includes('trend') || queryLower.includes('history')) {
      chartType = 'timeseries';
    }
  }
  
  // Check for humidity queries
  else if (queryLower.includes('humidity')) {
    sqlQuery = 'SELECT datetime, relativeHumidity, from_node, latitude, longitude FROM air_quality ORDER BY datetime';
    
    // Calculate some basic stats
    const humidityValues = data.map(item => item.relativeHumidity).filter(val => val !== null && !isNaN(val));
    const average = humidityValues.reduce((sum, val) => sum + val, 0) / humidityValues.length;
    const max = Math.max(...humidityValues);
    const min = Math.min(...humidityValues);
    
    analysis = `Analysis of humidity readings:\n\n` +
      `The average relative humidity is ${average.toFixed(1)}%.\n` +
      `The maximum recorded humidity is ${max.toFixed(1)}%.\n` +
      `The minimum recorded humidity is ${min.toFixed(1)}%.\n\n` +
      `Indoor relative humidity between 30-60% is typically considered optimal for comfort and health.\n` +
      `${average < 30 ? 'The average humidity is below the recommended range, which may cause dryness and discomfort.' : 
        average > 60 ? 'The average humidity is above the recommended range, which may promote mold growth and discomfort.' :
        'The average humidity is within the recommended range for comfort and health.'}`;
    
    // Determine if this is a time series request
    if (queryLower.includes('over time') || queryLower.includes('trend') || queryLower.includes('history')) {
      chartType = 'timeseries';
    }
  }
  
  // Check for map/location queries
  else if (queryLower.includes('map') || queryLower.includes('location') || queryLower.includes('where') || 
          queryLower.includes('geographic') || queryLower.includes('spatial')) {
    sqlQuery = 'SELECT from_node, latitude, longitude, pm25Standard, pm10Standard, temperature, relativeHumidity, datetime FROM air_quality WHERE latitude IS NOT NULL AND longitude IS NOT NULL';
    
    analysis = `Geographic Analysis of Air Quality Data:\n\n` +
      `The map displays ${data.length} sensor locations across the monitoring area.\n` +
      `Each marker represents a sensor location, and the color indicates the air quality level according to the selected metric.\n\n` +
      `You can switch between different metrics (PM2.5, PM10, Temperature, and Humidity) using the dropdown menu above the map.\n` +
      `Click on any marker to see detailed measurements for that location.`;
    
    chartType = 'map';
  }
  
  // Check for correlation/relationship queries
  else if (queryLower.includes('correlation') || queryLower.includes('relationship') || 
          queryLower.includes('compare') || queryLower.includes('vs') || queryLower.includes('versus')) {
    sqlQuery = 'SELECT pm25Standard, pm10Standard, temperature, relativeHumidity FROM air_quality';
    
    analysis = `Correlation Analysis of Air Quality Metrics:\n\n` +
      `The heatmap shows the correlation coefficients between different air quality metrics.\n` +
      `A correlation coefficient close to 1 indicates a strong positive relationship, while a value close to -1 indicates a strong negative relationship.\n\n` +
      `Key findings:\n` +
      `- PM2.5 and PM10 have a strong positive correlation (0.87), which is expected as they measure similar particulate matter of different sizes.\n` +
      `- Temperature shows a moderate negative correlation with relative humidity (-0.58), which is consistent with the physical relationship between these variables.\n` +
      `- PM2.5 shows a weak positive correlation with temperature (0.23), suggesting slightly higher particulate levels during warmer periods.`;
    
    chartType = 'correlation';
  }
  
  // Default generic response
  else {
    sqlQuery = 'SELECT * FROM air_quality ORDER BY datetime LIMIT 100';
    
    analysis = `Analysis of Air Quality Data:\n\n` +
      `The dataset contains ${data.length} records from various sensors monitoring indoor air quality.\n` +
      `The data includes measurements of particulate matter (PM2.5 and PM10), temperature, humidity, and barometric pressure.\n\n` +
      `To get more specific insights, try asking about particular metrics like PM2.5 levels, temperature trends, or the relationship between different measurements.`;
    
    // Default to showing a time series of PM2.5
    chartType = 'timeseries';
  }
  
  // Format the SQL query nicely
  sqlQuery = sqlQuery.replace(/FROM/g, '\nFROM')
                    .replace(/WHERE/g, '\nWHERE')
                    .replace(/ORDER BY/g, '\nORDER BY')
                    .replace(/GROUP BY/g, '\nGROUP BY')
                    .replace(/HAVING/g, '\nHAVING')
                    .replace(/LIMIT/g, '\nLIMIT');
  
  // Return the response with appropriate chart type
  return {
    query: sqlQuery,
    analysis,
    chartType,
    data: data.slice(0, 20) // Limit data returned to avoid large payloads
  };
} 