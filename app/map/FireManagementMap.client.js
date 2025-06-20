"use client";
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Loading from '../components/Loading';
import { getColorForValue, getMetricInfo } from '../../lib/mapDataUtils';

// Client-side only wrapper for the Leaflet-based fire management map
const FireManagementMap = dynamic(
  () => import('../../components/FireManagementMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[500px] flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse">
        <Loading size="large" text="Loading fire management map..." />
      </div>
    ),
  }
);

export default function FireManagementMapClient(props) {
  // Add pre-processing to ensure all data has the right format before passing to map
  const [processedData, setProcessedData] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState('status');
  
  useEffect(() => {
    if (props.data && props.data.length > 0) {
      // Ensure all data points have valid coordinates and values
      const validData = props.data.filter(point => (
        point.latitude && 
        point.longitude && 
        !isNaN(Number(point.latitude)) && 
        !isNaN(Number(point.longitude))
      ));
      
      console.log(`Client processed ${validData.length} valid fire data points for map`);
      setProcessedData(validData);
    }
  }, [props.data]);

  // Available metrics for fire management
  const availableMetrics = [
    { key: 'status', label: 'Burn Status' },
    { key: 'riskLevel', label: 'Risk Level' },
    { key: 'temperature', label: 'Temperature' },
    { key: 'humidity', label: 'Humidity' },
    { key: 'windSpeed', label: 'Wind Speed' },
    { key: 'fuelMoisture', label: 'Fuel Moisture' },
    { key: 'acresPlanned', label: 'Acres Planned' },
    { key: 'acresCompleted', label: 'Acres Completed' }
  ];

  // Add metric selector and enhanced props
  const enhancedProps = {
    ...props,
    data: processedData,
    selectedMetric,
    getColorForValue,
    getMetricInfo
  };

  return (
    <div className="space-y-4">
      {/* Metric Selector */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Display Metric:
        </label>
        <select
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-[#8C1515] focus:border-[#8C1515] dark:bg-gray-700 dark:text-white"
        >
          {availableMetrics.map(metric => (
            <option key={metric.key} value={metric.key}>
              {metric.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {getMetricInfo(selectedMetric).description}
        </p>
      </div>

      {/* Map */}
      <FireManagementMap {...enhancedProps} />
      
      {/* Legend */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {getMetricInfo(selectedMetric).name} Legend
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          {selectedMetric === 'status' && (
            <>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-[#2563EB] mr-2"></div>
                <span>Planned</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-[#F59E0B] mr-2"></div>
                <span>In Progress</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-[#059669] mr-2"></div>
                <span>Completed</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-[#7C3AED] mr-2"></div>
                <span>Monitoring</span>
              </div>
            </>
          )}
          {selectedMetric === 'riskLevel' && (
            <>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-[#059669] mr-2"></div>
                <span>Low Risk</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-[#F59E0B] mr-2"></div>
                <span>Moderate Risk</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-[#DC2626] mr-2"></div>
                <span>High Risk</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-[#7F1D1D] mr-2"></div>
                <span>Very High Risk</span>
              </div>
            </>
          )}
          {selectedMetric === 'humidity' && (
            <>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-[#DC2626] mr-2"></div>
                <span>&lt;20% (Very Dry)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-[#F59E0B] mr-2"></div>
                <span>20-40% (Dry)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-[#059669] mr-2"></div>
                <span>40-60% (Moderate)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-[#2563EB] mr-2"></div>
                <span>&gt;60% (Humid)</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}