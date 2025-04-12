'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ChevronRight, AlertTriangle, UploadCloud, Info } from 'lucide-react';
import Loading from '../components/Loading';
import { Error } from '../components/Error';

// Import map component dynamically to avoid SSR issues with Leaflet
const AirQualityMap = dynamic(
  () => import('../../components/AirQualityLeafletMap'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-[500px] flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse">
        <Loading size="large" text="Loading map component..." />
      </div>
    )
  }
);

export default function MapPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [dataSource, setDataSource] = useState('api');
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if we have a data reference in sessionStorage
      const dataReferenceStr = sessionStorage.getItem('dataReference');
      
      if (dataReferenceStr) {
        try {
          const dataReference = JSON.parse(dataReferenceStr);
          console.log('Found data reference:', dataReference);
          
          if (dataReference.source === 'database') {
            // Use the reference to fetch from the API with filters
            let apiUrl = '/api/data';
            const params = new URLSearchParams();
            
            if (dataReference.uploadId) {
              params.append('uploadId', dataReference.uploadId);
            }
            
            if (dataReference.dateRange) {
              params.append('startDate', dataReference.dateRange.start);
              params.append('endDate', dataReference.dateRange.end);
            }
            
            if (dataReference.filterId) {
              params.append('filterId', dataReference.filterId);
            }
            
            // Add the params to the URL if we have any
            if (params.toString()) {
              apiUrl += `?${params.toString()}`;
            }
            
            console.log('Fetching data from API with reference:', apiUrl);
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
              throw new Error(`Error fetching data: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!result.data || !Array.isArray(result.data)) {
              throw new Error('Invalid data format from API');
            }
            
            console.log('Data fetched successfully from database:', result.data.length, 'records');
            setData(result.data);
            setDataSource('database');
            setLoading(false);
            return;
          } else if (dataReference.error) {
            console.warn('Data reference indicates an error:', dataReference.message);
          }
        } catch (e) {
          console.error('Failed to use data reference:', e);
          // Continue to fetch from API if reference parsing/usage fails
        }
      }
      
      // Fetch from API if no valid reference found
      console.log('Fetching data from default API endpoint');
      const response = await fetch('/api/data');
      
      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.data || !Array.isArray(result.data)) {
        throw new Error('Invalid data format from API');
      }
      
      console.log('Data fetched successfully from default API:', result.data.length, 'records');
      setData(result.data);
      setDataSource('api');
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to fetch air quality data');
    } finally {
      setLoading(false);
    }
  };
  
  // Filter data to only include points with valid geographic coordinates
  const geoData = data.filter(item => 
    item.latitude !== undefined && 
    item.longitude !== undefined && 
    !isNaN(Number(item.latitude)) && 
    !isNaN(Number(item.longitude)) &&
    Number(item.latitude) !== 0 && 
    Number(item.longitude) !== 0
  );
  
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
        {dataSource === 'database' && (
          <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
            <span className="relative flex h-2 w-2 mr-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Using filtered data from database
          </div>
        )}
      </header>
      
      {loading ? (
        <div className="w-full h-[500px] flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Loading text="Loading air quality data..." />
        </div>
      ) : error ? (
        <div className="w-full h-[500px] bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
          <Error 
            title="Failed to load map data" 
            message={error} 
            retryAction={fetchData}
          />
        </div>
      ) : geoData.length === 0 ? (
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
          <AirQualityMap data={geoData} height="600px" />
        </div>
      )}
      
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 animate-fadeUp">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">About This Map</h2>
          <button 
            onClick={() => setShowInfo(!showInfo)}
            className="text-gray-500 dark:text-gray-400 hover:text-cardinal-red dark:hover:text-cardinal-red transition-colors"
          >
            <Info size={20} />
          </button>
        </div>
        
        {showInfo && (
          <div className="text-gray-600 dark:text-gray-400 space-y-4 animate-fadeIn">
            <p>
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
            
            <p className="mt-4 text-sm italic">
              Note: The thresholds for each category are based on EPA standards for PM2.5 and PM10, and common comfort ranges for temperature and humidity.
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 