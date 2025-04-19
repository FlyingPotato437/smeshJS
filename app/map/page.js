import Link from 'next/link';
import { ChevronRight, AlertTriangle, UploadCloud, Info } from 'lucide-react';
import { Error } from '../components/Error';
import { supabaseAdmin } from '../../lib/supabase';
import AirQualityMapClient from './AirQualityMap.client';

export default async function MapPage({ searchParams }) {
  // Server-side data fetch
  let data = [];
  let error = null;
  // First, attempt to load from the new sensor_readings/devices schema
  try {
    const newQuery = supabaseAdmin
      .from('sensor_readings')
      .select('timestamp, pm25, pm10, temperature, humidity, device_id, devices(name, latitude, longitude)');
    if (searchParams.startDate) newQuery.gte('timestamp', searchParams.startDate);
    if (searchParams.endDate) newQuery.lte('timestamp', searchParams.endDate);
    const { data: newRows, error: newError } = await newQuery;
    if (newError) throw newError;
    if (newRows && newRows.length > 0) {
      data = newRows.map(row => ({
        latitude: row.devices?.latitude,
        longitude: row.devices?.longitude,
        pm25Standard: row.pm25,
        pm10Standard: row.pm10,
        temperature: row.temperature,
        relativeHumidity: row.humidity,
        datetime: row.timestamp,
        deviceName: row.devices?.name,
        deviceId: String(row.device_id)
      }));
    }
  } catch (e) {
    console.error('Error querying sensor_readings/devices:', e);
  }
  // If no data from new schema, fall back to legacy air_quality table
  if (!data || data.length === 0) {
    try {
      const legacyQuery = supabaseAdmin.from('air_quality').select('*');
      if (searchParams.uploadId) legacyQuery.eq('upload_id', searchParams.uploadId);
      if (searchParams.startDate) legacyQuery.gte('timestamp', searchParams.startDate);
      if (searchParams.endDate) legacyQuery.lte('timestamp', searchParams.endDate);
      if (searchParams.filterId) legacyQuery.eq('filter_id', searchParams.filterId);
      const { data: legacyRows, error: legError } = await legacyQuery;
      if (legError) throw legError;
      data = (legacyRows || []).map(item => {
        // Use null for missing metric values so the map component can render N/A instead of 0
        const pm25 = item.pm25Standard ?? item.pm25standard ?? item.pm25 ?? null;
        const pm10 = item.pm10Standard ?? item.pm10standard ?? item.pm10 ?? null;
        const temp = item.temperature ?? null;
        const humidity = item.relativeHumidity ?? item.relativehumidity ?? null;
        return {
          latitude: Number(item.latitude) || 0,
          longitude: Number(item.longitude) || 0,
          pm25Standard: pm25,
          pm10Standard: pm10,
          temperature: temp,
          relativeHumidity: humidity,
          datetime: item.timestamp || item.datetime,
          deviceName: item.device_name || item.from_node || '',
          deviceId: String(
            item.device_id ?? item.from_node ?? item.id ?? ''
          )
        };
      });
    } catch (e) {
      error = e.message || 'Failed to load legacy map data';
    }
  }

  // Filter to valid geo-coordinates
  const geoData = (data || []).filter(item =>
    item.latitude !== undefined &&
    item.longitude !== undefined &&
    !isNaN(Number(item.latitude)) &&
    !isNaN(Number(item.longitude)) &&
    Number(item.latitude) !== 0 &&
    Number(item.longitude) !== 0
  );

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
          <span className="text-gray-900 dark:text-white font-medium">Air Quality Map</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Air Quality Map</h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-3xl">
          Visualize air quality data across locations. Use the map controls to filter by different metrics and view detailed information for each monitoring station.
        </p>
        {hasData && (
          <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
            <span className="relative flex h-2 w-2 mr-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Using filtered data from database
          </div>
        )}
      </header>

      {hasError ? (
        <div className="w-full h-[500px] bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
          <Error title="Failed to load map data" message={error} />
        </div>
      ) : !hasData ? (
        <div className="w-full h-[500px] bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle size={48} className="text-cardinal-red mb-4 animate-bounce" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">No Geographic Data Available</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
            There are no data points with valid latitude and longitude coordinates in the current dataset.
          </p>
          <Link href="/upload" className="inline-flex items-center px-4 py-2 bg-cardinal-red text-white rounded-md hover:bg-cardinal-red/90 transition-all">
            <UploadCloud size={18} className="mr-2" />
            Upload Data with Location Info
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden animate-scaleIn">
          <AirQualityMapClient data={geoData} height="600px" />
        </div>
      )}

      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 animate-fadeUp">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">About This Map</h2>
          <button
            type="button"
            className="text-gray-500 dark:text-gray-400 hover:text-cardinal-red dark:hover:text-cardinal-red transition-colors"
          >
            <Info size={20} />
          </button>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          This map visualizes air quality data from sensors located at various points. The color of each marker indicates the quality level according to the selected metric.
        </p>
        <div className="mt-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Air Quality Metrics:</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>PM2.5</strong>: Fine particulate matter with a diameter of 2.5 micrometers or less. These tiny particles can penetrate deep into the lungs and even enter the bloodstream.</li>
            <li><strong>PM10</strong>: Particulate matter with a diameter of 10 micrometers or less, which can be inhaled and cause respiratory issues.</li>
            <li><strong>Temperature</strong>: Ambient air temperature in degrees Celsius (°C).</li>
            <li><strong>Humidity</strong>: Relative humidity as a percentage (%).</li>
          </ul>
        </div>
        <div className="mt-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Understanding the Colors:</h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <li className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-[#008566] mr-2"></div>
              <span>Good: Normal conditions, minimal health risk</span>
            </li>
            <li className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-[#0098DB] mr-2"></div>
              <span>Moderate: Acceptable quality, slight concern</span>
            </li>
            <li className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-[#D2C295] mr-2"></div>
              <span>Sensitive Groups: May affect sensitive individuals</span>
            </li>
            <li className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-[#E04E39] mr-2"></div>
              <span>Unhealthy: May affect general population</span>
            </li>
            <li className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-[#53284F] mr-2"></div>
              <span>Very Unhealthy: Health alert, significant risk</span>
            </li>
            <li className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-[#8C1515] mr-2"></div>
              <span>Hazardous: Emergency conditions, widespread risk</span>
            </li>
          </ul>
        </div>
        <p className="mt-4 text-sm italic text-gray-500 dark:text-gray-400">
          Note: The thresholds for each category are based on EPA standards for PM2.5 and PM10, and common comfort ranges for temperature and humidity.
        </p>
      </div>
    </div>
  );
}