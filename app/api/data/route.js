import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase';

/**
 * GET handler for fetching air quality data
 * Supports pagination with limit and offset parameters
 * Supports filtering by uploadId, date range, and filterId
 * Falls back to mock data if Supabase is not configured
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '1000');
    const offset = parseInt(searchParams.get('offset') || '0');
    const uploadId = searchParams.get('uploadId');
    const filterId = searchParams.get('filterId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // If Supabase is configured, try to fetch from the database
    if (isSupabaseConfigured()) {
      try {
        let query = supabaseAdmin
          .from('air_quality')
          .select('*', { count: 'exact' });
        
        // Apply filters if provided
        if (uploadId) {
          query = query.eq('upload_id', uploadId);
        }
        
        if (filterId) {
          query = query.eq('filter_id', filterId);
        }
        
        if (startDate && endDate) {
          query = query.gte('datetime', startDate).lte('datetime', endDate);
        } else if (startDate) {
          query = query.gte('datetime', startDate);
        } else if (endDate) {
          query = query.lte('datetime', endDate);
        }
        
        // Apply pagination
        query = query.range(offset, offset + limit - 1);
        
        const { data, error, count } = await query;
        
        if (error) {
          console.error('Supabase query error:', error);
          throw new Error(`Database query failed: ${error.message}`);
        }
        
        // Check if we actually got data back
        if (!data) {
          throw new Error('No data returned from database');
        }
        
        return NextResponse.json({
          data,
          count: count || data.length,
          limit,
          offset,
          source: 'supabase',
          filters: {
            uploadId,
            filterId,
            startDate,
            endDate
          }
        });
      } catch (dbError) {
        console.error('Database error:', dbError);
        // Fall back to mock data if database query fails
        console.log('Falling back to mock data due to database error');
        
        const mockData = generateMockData(limit, uploadId, filterId);
        return NextResponse.json({
          data: mockData,
          count: mockData.length,
          limit,
          offset,
          source: 'mock (fallback)',
          error: dbError.message,
          filters: {
            uploadId,
            filterId,
            startDate,
            endDate
          }
        });
      }
    } else {
      // If Supabase is not configured, return mock data
      // In mock mode, we'll still try to honor the date filters
      const mockData = generateMockData(limit, uploadId, filterId);
      
      let filteredData = mockData;
      if (startDate || endDate) {
        try {
          const start = startDate ? new Date(startDate) : new Date(0);
          const end = endDate ? new Date(endDate) : new Date();
          
          filteredData = mockData.filter(item => {
            const itemDate = new Date(item.datetime);
            return itemDate >= start && itemDate <= end;
          });
        } catch (filterError) {
          console.error('Error filtering mock data by date:', filterError);
          // Just use the unfiltered data if date filtering fails
        }
      }
      
      return NextResponse.json({
        data: filteredData,
        count: filteredData.length,
        limit,
        offset,
        source: 'mock',
        filters: {
          uploadId,
          filterId,
          startDate,
          endDate
        }
      });
    }
  } catch (error) {
    console.error('Error in data API route:', error);
    return NextResponse.json(
      { 
        error: error.message,
        data: generateMockData(20) // Return some mock data even in error case
      },
      { status: 500 }
    );
  }
}

/**
 * Generate mock air quality data for development
 */
function generateMockData(count = 20, uploadId = null, filterId = null) {
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
      elevation: `${Math.floor(10 + Math.random() * 100)} ft`,
      upload_id: uploadId || `mock-upload-${Math.floor(Math.random() * 5) + 1}`,
      filter_id: filterId || null
    };
  });
} 