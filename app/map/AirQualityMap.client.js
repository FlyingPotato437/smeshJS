"use client";
import dynamic from 'next/dynamic';
import Loading from '../components/Loading';

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
  return <AirQualityMap {...props} />;
}