import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase';

/**
 * GET handler for fetching air quality data statistics
 * Falls back to mock data if Supabase is not configured
 */
export async function GET(request) {
  try {
    console.log('Generating data stats...');

    // If Supabase is configured, try to fetch from the database
    if (isSupabaseConfigured()) {
      try {
        console.log('Fetching stats from Supabase...');
        
        // Count records
        const { count, error: countError } = await supabaseAdmin
          .from('air_quality')
          .select('*', { count: 'exact', head: true });
        
        if (countError) {
          console.error('Count error:', countError);
          throw countError;
        }
        
        // Get date range with explicit selection to avoid large data fetching
        const { data: dateData, error: dateError } = await supabaseAdmin
          .from('air_quality')
          .select('datetime')
          .order('datetime', { ascending: true })
          .limit(1);
        
        const { data: dateDataEnd, error: dateErrorEnd } = await supabaseAdmin
          .from('air_quality')
          .select('datetime')
          .order('datetime', { ascending: false })
          .limit(1);
        
        if (dateError || dateErrorEnd) {
          console.error('Date range error:', dateError || dateErrorEnd);
          throw dateError || dateErrorEnd;
        }
        
        const dateRange = {
          start: dateData && dateData.length > 0 ? new Date(dateData[0].datetime) : new Date(),
          end: dateDataEnd && dateDataEnd.length > 0 ? new Date(dateDataEnd[0].datetime) : new Date()
        };
        
        return NextResponse.json({
          totalRecords: count || 0,
          dateRange,
          metrics: [
            { name: "PM2.5", field: "pm25Standard" },
            { name: "PM10", field: "pm10Standard" },
            { name: "Temperature", field: "temperature" },
            { name: "Humidity", field: "relativeHumidity" }
          ],
          source: 'supabase'
        });
      } catch (error) {
        console.error('Error fetching from Supabase:', error);
        
        // On error, fall back to mock data
        const mockData = generateMockData();
        return NextResponse.json({
          totalRecords: mockData.length,
          dateRange: getMockDateRange(mockData),
          metrics: [
            { name: "PM2.5", field: "pm25Standard" },
            { name: "PM10", field: "pm10Standard" },
            { name: "Temperature", field: "temperature" },
            { name: "Humidity", field: "relativeHumidity" }
          ],
          source: 'mock'
        });
      }
    } else {
      // If Supabase is not configured, return mock data statistics
      const mockData = generateMockData();
      
      return NextResponse.json({
        totalRecords: mockData.length,
        dateRange: getMockDateRange(mockData),
        metrics: [
          { name: "PM2.5", field: "pm25Standard" },
          { name: "PM10", field: "pm10Standard" },
          { name: "Temperature", field: "temperature" },
          { name: "Humidity", field: "relativeHumidity" }
        ],
        source: 'mock'
      });
    }
  } catch (error) {
    console.error('Error generating data stats:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Helper function to get date range from mock data
function getMockDateRange(mockData) {
  // Get date range from the mock data
  const dates = mockData.map(item => new Date(item.datetime).getTime());
  return {
    start: new Date(Math.min(...dates)),
    end: new Date(Math.max(...dates))
  };
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