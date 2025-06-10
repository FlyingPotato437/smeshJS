"use client";
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Loading from '../components/Loading';
import { getColorForValue, getMetricInfo } from '../../lib/mapDataUtils';

// Client-side only wrapper for the Leaflet-based air quality map
const AirQualityMap = dynamic(
  () => import('../../components/AirQualityLeafletMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[500px] flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse">
        <Loading size="large" text="Loading map component..." />
      </div>
    ),
  }
);

export default function AirQualityMapClient(props) {
  // Add pre-processing to ensure all data has the right format before passing to map
  const [processedData, setProcessedData] = useState([]);
  
  useEffect(() => {
    if (props.data && props.data.length > 0) {
      // Ensure all data points have valid coordinates and values
      const validData = props.data.filter(point => (
        point.latitude && 
        point.longitude && 
        !isNaN(Number(point.latitude)) && 
        !isNaN(Number(point.longitude))
      ));
      
      console.log(`Client processed ${validData.length} valid data points for map`);
      setProcessedData(validData);
    }
  }, [props.data]);

  // Add metric info to enhance the map display
  const enhancedProps = {
    ...props,
    data: processedData,
    getColorForValue,
    getMetricInfo
  };

  return <AirQualityMap {...enhancedProps} />;
}