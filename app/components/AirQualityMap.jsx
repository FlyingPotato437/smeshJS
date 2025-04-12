import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle } from 'lucide-react';
import Loading from './Loading';

// Import MapComponent dynamically to avoid SSR issues with Leaflet
const MapComponent = dynamic(
  () => import('../../components/MapComponent'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-gray-100 dark:bg-gray-800 animate-pulse">
        <Loading text="Loading map..." />
      </div>
    )
  }
);

export default function AirQualityMap({ data, height = "600px", className = "" }) {
  const [mapData, setMapData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Process data when it changes
    const processData = async () => {
      try {
        setIsLoading(true);
        
        // Simulate network delay for demo purposes
        // In production, remove this timeout
        await new Promise(resolve => setTimeout(resolve, 800));
        
        if (!data || !Array.isArray(data)) {
          setMapData([]);
        } else {
          // Process and format data for the map
          const formattedData = data.map(item => ({
            ...item,
            latitude: typeof item.latitude === 'string' ? parseFloat(item.latitude) : item.latitude,
            longitude: typeof item.longitude === 'string' ? parseFloat(item.longitude) : item.longitude,
            pm25: item.pm25 !== undefined ? Number(item.pm25) : undefined,
            pm10: item.pm10 !== undefined ? Number(item.pm10) : undefined,
            temperature: item.temperature !== undefined ? Number(item.temperature) : undefined,
            humidity: item.humidity !== undefined ? Number(item.humidity) : undefined
          }));
          
          setMapData(formattedData);
        }
        setError(null);
      } catch (err) {
        console.error('Error processing map data:', err);
        setError('Failed to process map data');
        setMapData([]);
      } finally {
        setIsLoading(false);
      }
    };

    processData();
  }, [data]);

  // Full height container with the specified height
  return (
    <div 
      className={`w-full relative overflow-hidden rounded-lg shadow-md animate-fadeIn ${className}`}
      style={{ height }}
    >
      {isLoading ? (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <Loading text="Processing data..." />
        </div>
      ) : error ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 p-4">
          <AlertTriangle size={48} className="text-cardinal-red mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
            Error Loading Map
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md">
            {error}
          </p>
        </div>
      ) : (
        <MapComponent data={mapData} />
      )}
    </div>
  );
} 