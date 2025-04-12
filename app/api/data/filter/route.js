import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin, isSupabaseConfigured } from '../../../../lib/supabase';

/**
 * POST handler for filtering air quality data by date range
 * Falls back to mock data if Supabase is not configured
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { startDate, endDate, limit = 1000, offset = 0 } = body;
    
    // If Supabase is configured, try to fetch from the database
    if (isSupabaseConfigured()) {
      const query = supabaseAdmin
        .from('air_quality')
        .select('*', { count: 'exact' });
      
      if (startDate && endDate) {
        query.gte('datetime', startDate).lte('datetime', endDate);
      }
      
      const { data, error, count } = await query.range(offset, offset + limit - 1);
      
      if (error) throw error;
      
      return NextResponse.json({
        data,
        count,
        limit,
        offset,
        source: 'supabase',
        dateRange: { startDate, endDate }
      });
    } else {
      // If Supabase is not configured, return filtered mock data
      const mockData = generateMockData(1000); // Generate a larger dataset
      
      // Filter the mock data if date range is provided
      let filteredData = mockData;
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        filteredData = mockData.filter(item => {
          const itemDate = new Date(item.datetime);
          return itemDate >= start && itemDate <= end;
        });
      }
      
      // Apply pagination
      const paginatedData = filteredData.slice(offset, offset + limit);
      
      return NextResponse.json({
        data: paginatedData,
        count: filteredData.length,
        limit,
        offset,
        source: 'mock',
        dateRange: { startDate, endDate }
      });
    }
  } catch (error) {
    console.error('Error filtering data:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Generate mock air quality data for development
 */
function generateMockData(count = 20) {
  // Base location (San Francisco)
  const baseLat = 37.7749;
  const baseLon = -122.4194;
  
  // Generate random data points
  return Array.from({ length: count }, (_, i) => {
    // Generate a random location within ~5km of the base location
    const lat = baseLat + (Math.random() - 0.5) * 0.1;
    const lon = baseLon + (Math.random() - 0.5) * 0.1;
    
    // Generate a random date within the past week
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 7));
    date.setHours(Math.floor(Math.random() * 24));
    date.setMinutes(Math.floor(Math.random() * 60));
    
    return {
      id: i + 1,
      datetime: date.toISOString(),
      from_node: `sensor-${Math.floor(Math.random() * 10) + 1}`,
      pm25standard: Math.random() * 50,
      pm10standard: Math.random() * 100,
      temperature: 15 + Math.random() * 15,
      relativehumidity: 30 + Math.random() * 50,
      latitude: lat,
      longitude: lon,
      elevation: `${Math.floor(10 + Math.random() * 100)} ft`
    };
  });
} 