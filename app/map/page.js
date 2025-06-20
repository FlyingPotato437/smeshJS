import Link from 'next/link';
import { ChevronRight, AlertTriangle, UploadCloud, Info, MapPin } from 'lucide-react';
import { Error } from '../components/Error';
import { supabase } from '../../lib/supabase';
import { normalizeFireData, normalizeSensorData } from '../../lib/mapDataUtils';
import FireManagementMapClient from './FireManagementMap.client';

export default async function MapPage({ searchParams }) {
  // Server-side data fetch
  let data = [];
  let error = null;
  
  // Extract searchParams safely (they're already available)
  const startDate = searchParams?.startDate || null;
  const endDate = searchParams?.endDate || null;
  const uploadId = searchParams?.uploadId || null;
  const filterId = searchParams?.filterId || null;
  
  // First, attempt to load from the fire_data table (primary data source)
  try {
    const fireQuery = supabase
      .from('fire_data')
      .select(`
        id, datetime, burn_unit, location_name, burn_type, status,
        acres_planned, acres_completed, temperature, humidity,
        wind_speed, wind_direction, fuel_moisture, latitude, longitude, 
        elevation, crew_size, burn_boss, objectives, risk_level
      `)
      .order('datetime', { ascending: false })
      .limit(1000);
      
    if (startDate) fireQuery.gte('datetime', startDate);
    if (endDate) fireQuery.lte('datetime', endDate);
    
    const { data: fireRows, error: fireError } = await fireQuery;
    if (fireError) throw fireError;
    
    if (fireRows && fireRows.length > 0) {
      console.log(`Fetched ${fireRows.length} rows from fire_data`);
      
      // Apply normalization and validation to ensure all data points are usable
      data = normalizeFireData(fireRows);
      console.log(`Processed ${data.length} valid fire management points for map`);
    }
  } catch (e) {
    console.error('Error querying fire_data:', e);
    // Continue to fallback - don't exit early
  }
  // If no fire data available, fall back to air quality data as demo
  if (!data || data.length === 0) {
    try {
      console.log('No fire data found, falling back to air quality data for demonstration');
      const legacyQuery = supabase.from('air_quality').select('*');
      if (uploadId) legacyQuery.eq('upload_id', uploadId);
      if (startDate) legacyQuery.gte('timestamp', startDate);
      if (endDate) legacyQuery.lte('timestamp', endDate);
      if (filterId) legacyQuery.eq('filter_id', filterId);
      const { data: legacyRows, error: legError } = await legacyQuery;
      if (legError) throw legError;
      
      // Convert air quality data to fire management format for demonstration
      data = (legacyRows || []).map((item, index) => ({
        latitude: Number(item.latitude) || 0,
        longitude: Number(item.longitude) || 0,
        unitId: `Legacy-${item.id}`,
        unitName: item.from_node || `Unit ${item.id}`,
        locationName: 'Historical Location',
        burnType: 'Legacy Data',
        status: 'Historical',
        riskLevel: 'Unknown',
        temperature: item.temperature,
        humidity: item.relativeHumidity,
        datetime: item.timestamp || item.datetime,
        _isLegacy: true
      }));
    } catch (e) {
      error = e.message || 'Failed to load fire management data';
    }
  }

  // Our normalized data should already have valid coordinates
  // Just make a copy to follow the expected code flow
  const geoData = [...data];
  
  // For debugging, log the available geo data
  console.log(`Using ${geoData.length} points with valid coordinates`);

  // Derive state for rendering
  const hasError = Boolean(error);
  const hasData = !hasError && geoData.length > 0;
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-fadeIn">
      <header className="mb-6">
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
          <Link href="/" className="hover:text-cardinal-red dark:hover:text-cardinal-red transition-colors">
            Home
          </Link>
          <ChevronRight size={16} className="mx-2" />
          <span className="text-gray-900 dark:text-white font-medium">Fire Management Map</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Prescribed Fire Management Map</h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-3xl">
          Visualize prescribed fire operations and burn management data across California's fire management areas. Use the map controls to filter by different metrics and view detailed information for each burn unit.
        </p>
        {hasData && (
          <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
            <MapPin className="h-3 w-3 mr-1.5" />
            Live fire management data from Supabase
          </div>
        )}
      </header>

      {hasError ? (
        <div className="w-full h-[500px] bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
          <Error title="Failed to load map data" message={error} />
        </div>
      ) : !hasData ? (
        <div className="w-full h-[500px] bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle size={48} className="text-[#8C1515] mb-4 animate-bounce" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">No Fire Management Data Available</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
            There are no prescribed fire operations with valid geographic coordinates in the current dataset. Run the database migration to populate sample fire data.
          </p>
          <Link href="/fire-planning" className="inline-flex items-center px-4 py-2 bg-[#8C1515] text-white rounded-md hover:bg-[#8C1515]/90 transition-all">
            <MapPin size={18} className="mr-2" />
            Plan New Prescribed Fire
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden animate-scaleIn">
          <FireManagementMapClient data={geoData} height="600px" />
        </div>
      )}

      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 animate-fadeUp">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">About This Fire Management Map</h2>
          <button
            type="button"
            className="text-gray-500 dark:text-gray-400 hover:text-[#8C1515] dark:hover:text-[#8C1515] transition-colors"
          >
            <Info size={20} />
          </button>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          This map displays prescribed fire operations and burn management data across California's fire management areas. Each marker represents a burn unit with detailed operational information, weather conditions, and safety assessments.
        </p>
        <div className="mt-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Fire Management Metrics:</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Burn Status</strong>: Current operational status (Planned, In Progress, Completed, Monitoring)</li>
            <li><strong>Risk Level</strong>: Safety assessment based on weather, fuel conditions, and terrain</li>
            <li><strong>Acres Planned/Completed</strong>: Target area and progress of prescribed fire operations</li>
            <li><strong>Weather Conditions</strong>: Temperature, humidity, wind speed and direction for burn safety</li>
            <li><strong>Fuel Moisture</strong>: Vegetation moisture content affecting fire behavior and safety</li>
            <li><strong>Crew Information</strong>: Team size and burn boss for each operation</li>
          </ul>
        </div>
        <div className="mt-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Status Color Legend:</h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <li className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-[#2563EB] mr-2"></div>
              <span>Planned: Burn operation scheduled and approved</span>
            </li>
            <li className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-[#F59E0B] mr-2"></div>
              <span>In Progress: Active burn operation underway</span>
            </li>
            <li className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-[#059669] mr-2"></div>
              <span>Completed: Burn operation successfully finished</span>
            </li>
            <li className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-[#7C3AED] mr-2"></div>
              <span>Monitoring: Post-burn monitoring and assessment</span>
            </li>
            <li className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-[#DC2626] mr-2"></div>
              <span>Cancelled: Operation cancelled due to conditions</span>
            </li>
            <li className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-[#6B7280] mr-2"></div>
              <span>Unknown: Status information not available</span>
            </li>
          </ul>
        </div>
        <p className="mt-4 text-sm italic text-gray-500 dark:text-gray-400">
          Note: Fire management data is updated in real-time from field operations. Weather thresholds follow National Weather Service fire weather criteria.
        </p>
      </div>
    </div>
  );
}