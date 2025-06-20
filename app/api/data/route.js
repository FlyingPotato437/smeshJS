import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase';

/**
 * GET handler for fetching fire management data
 * Supports pagination and filtering with fast response times
 * Falls back to mock fire data if Supabase is not configured
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000); // Cap at 1000
    const offset = parseInt(searchParams.get('offset') || '0');
    const uploadId = searchParams.get('uploadId');
    const filterId = searchParams.get('filterId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Try Supabase with fire management data
    if (isSupabaseConfigured()) {
      try {
        // Try fire_data table first (preferred)
        let query = supabase
          .from('fire_data')
          .select(`
            id, datetime, burn_unit, location_name, burn_type, status,
            acres_planned, acres_completed, temperature, humidity,
            wind_speed, fuel_moisture, latitude, longitude, elevation,
            crew_size, burn_boss, objectives, risk_level
          `, { count: 'exact' });
        
        // Apply filters if provided
        if (startDate && endDate) {
          query = query.gte('datetime', startDate).lte('datetime', endDate);
        } else if (startDate) {
          query = query.gte('datetime', startDate);
        } else if (endDate) {
          query = query.lte('datetime', endDate);
        }
        
        // Apply pagination
        query = query.range(offset, offset + limit - 1).order('datetime', { ascending: false });
        
        const { data, error, count } = await query;
        
        if (error) {
          console.log('Fire data table not found, trying air_quality fallback...');
          
          // Fallback to air_quality table for backward compatibility
          let fallbackQuery = supabase
            .from('air_quality')
            .select('*', { count: 'exact' });
          
          // Apply same filters
          if (startDate && endDate) {
            fallbackQuery = fallbackQuery.gte('datetime', startDate).lte('datetime', endDate);
          } else if (startDate) {
            fallbackQuery = fallbackQuery.gte('datetime', startDate);
          } else if (endDate) {
            fallbackQuery = fallbackQuery.lte('datetime', endDate);
          }
          
          fallbackQuery = fallbackQuery.range(offset, offset + limit - 1).order('datetime', { ascending: false });
          
          const { data: fallbackData, error: fallbackError, count: fallbackCount } = await fallbackQuery;
          
          if (fallbackError) {
            throw new Error(`Database query failed: ${fallbackError.message}`);
          }
          
          // Convert air_quality data to fire data format
          const burnTypes = ['Fuel Reduction', 'Ecosystem Restoration', 'Habitat Enhancement'];
          const statuses = ['Planned', 'In Progress', 'Completed', 'Monitoring'];
          const riskLevels = ['Low', 'Moderate', 'High'];
          
          const convertedData = fallbackData.map((item, index) => {
            // Generate realistic fire management data based on air quality sensor locations
            const burnType = burnTypes[index % burnTypes.length];
            const status = statuses[index % statuses.length];
            const riskLevel = riskLevels[index % riskLevels.length];
            
            // Determine location name based on coordinates (Bay Area/Sonoma County region)
            let locationName = 'Northern California';
            if (item.latitude > 38.5 && item.latitude < 39.0 && item.longitude > -123.0 && item.longitude < -122.5) {
              locationName = 'Sonoma County Fire Management Area';
            }
            
            return {
              id: item.id,
              datetime: item.datetime,
              burn_unit: `Unit-${item.from_short_name || item.from_node?.slice(-4) || `S${index + 1}`}`,
              location_name: locationName,
              burn_type: burnType,
              status: status,
              acres_planned: Math.floor(Math.random() * 400) + 50,
              acres_completed: Math.floor(Math.random() * 300) + 25,
              temperature: item.temperature || Math.floor(Math.random() * 30) + 50,
              humidity: item.relativeHumidity || Math.floor(Math.random() * 40) + 30,
              wind_speed: Math.floor(Math.random() * 15) + 3,
              wind_direction: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][index % 8],
              fuel_moisture: Math.floor(Math.random() * 15) + 8,
              latitude: item.latitude,
              longitude: item.longitude,
              elevation: item.elevation,
              crew_size: Math.floor(Math.random() * 10) + 5,
              burn_boss: `Fire Manager ${String.fromCharCode(65 + (index % 26))}`,
              objectives: `${burnType} objectives for enhanced ecosystem health`,
              risk_level: riskLevel,
              _converted_from: 'air_quality'
            };
          });
          
          return NextResponse.json({
            data: convertedData,
            count: fallbackCount || convertedData.length,
            limit,
            offset,
            source: 'supabase-legacy',
            table: 'air_quality'
          });
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
 * Generate mock fire management data for development
 */
function generateMockData(count = 20, uploadId = null, filterId = null) {
  // Base location (California fire regions)
  const locations = [
    { name: 'Los Padres NF', lat: 36.2048, lon: -121.5623 },
    { name: 'Angeles NF', lat: 34.3644, lon: -118.0886 },
    { name: 'Cleveland NF', lat: 33.3128, lon: -116.7945 },
    { name: 'San Bernardino NF', lat: 34.1764, lon: -117.3089 }
  ];
  
  const burnTypes = ['Fuel Reduction', 'Ecosystem Restoration', 'Habitat Enhancement'];
  const burnStatuses = ['Planned', 'In Progress', 'Completed', 'Monitoring'];
  
  // Generate fire management data points
  return Array.from({ length: count }, (_, i) => {
    const location = locations[Math.floor(Math.random() * locations.length)];
    
    // Generate a random date within the past year
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 365));
    date.setHours(Math.floor(Math.random() * 24));
    date.setMinutes(Math.floor(Math.random() * 60));
    
    return {
      id: i + 1,
      datetime: date.toISOString(),
      burn_unit: `Unit-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 50) + 1}`,
      location_name: location.name,
      burn_type: burnTypes[Math.floor(Math.random() * burnTypes.length)],
      status: burnStatuses[Math.floor(Math.random() * burnStatuses.length)],
      acres_planned: Math.floor(Math.random() * 500) + 50,
      acres_completed: Math.floor(Math.random() * 400) + 25,
      temperature: Math.floor(Math.random() * 40) + 45, // 45-85°F
      humidity: Math.floor(Math.random() * 40) + 30, // 30-70%
      wind_speed: Math.floor(Math.random() * 15) + 3, // 3-18 mph
      fuel_moisture: Math.floor(Math.random() * 15) + 8, // 8-23%
      latitude: location.lat + (Math.random() - 0.5) * 0.1,
      longitude: location.lon + (Math.random() - 0.5) * 0.1,
      elevation: `${Math.floor(Math.random() * 3000) + 500} ft`,
      upload_id: uploadId || `fire-${Math.floor(Math.random() * 5) + 1}`,
      filter_id: filterId || null
    };
  });
} 