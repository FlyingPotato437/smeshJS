"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { EyeIcon, EyeSlashIcon, MapPinIcon, FireIcon, UserGroupIcon } from '@heroicons/react/24/outline';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);

// We need to handle L differently - import only on client
let L;
if (typeof window !== 'undefined') {
  L = require('leaflet');
  // Patch Leaflet to clean up container ID and avoid "Map container is already initialized" errors
  if (L && L.Map && L.DomUtil) {
    const proto = L.Map.prototype;
    if (!proto._initContainerPatched) {
      const originalInitContainer = proto._initContainer;
      proto._initContainer = function (id) {
        // Ensure any previous Leaflet ID on the container is removed before initializing
        const container = typeof id === 'string' ? L.DomUtil.get(id) : id;
        if (container && container._leaflet_id) {
          delete container._leaflet_id;
        }
        // Call the original init to stamp a fresh ID
        originalInitContainer.call(this, id);
      };
      proto._initContainerPatched = true;
    }
  }
}

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);

const ZoomControl = dynamic(
  () => import('react-leaflet').then((mod) => mod.ZoomControl),
  { ssr: false }
);

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

const CircleMarker = dynamic(
  () => import('react-leaflet').then((mod) => mod.CircleMarker),
  { ssr: false }
);

const FeatureGroup = dynamic(
  () => import('react-leaflet').then((mod) => mod.FeatureGroup),
  { ssr: false }
);

// Dynamically import MarkerCluster to avoid SSR issues
const MarkerClusterGroup = dynamic(
  () => import('react-leaflet-cluster'),
  { ssr: false }
);

// Dynamically import HeatmapLayer to avoid SSR issues
const HeatmapLayer = dynamic(
  () => import('react-leaflet-heatmap-layer'),
  { ssr: false }
);

// Dynamically import useMap hook if needed
const useMapHook = dynamic(
  () => import('react-leaflet').then((mod) => ({ useMap: mod.useMap })),
  { ssr: false }
);

// Dynamically import Plotly for mini-charts
const MiniChart = dynamic(
  () => import('react-plotly.js'),
  { 
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-24 w-full rounded"></div>
  }
);

// Helper function to get display name and units for metrics
const getMetricInfo = (metric) => {
  const metricMap = {
    pm25Standard: { name: "PM2.5", unit: "μg/m³", description: "Fine particulate matter" },
    pm10Standard: { name: "PM10", unit: "μg/m³", description: "Coarse particulate matter" },
    temperature: { name: "Temperature", unit: "°C", description: "Ambient temperature" },
    humidity: { name: "Humidity", unit: "%", description: "Relative humidity" }
  };
  return metricMap[metric] || { name: metric, unit: "", description: "" };
};

// Color scales for different metrics
const colorScales = {
  pm25Standard: [
    { threshold: 0, color: "#00ff00", label: "Good (0-12)" },
    { threshold: 12.1, color: "#ffff00", label: "Moderate (12.1-35.4)" },
    { threshold: 35.5, color: "#ff9900", label: "Unhealthy for Sensitive Groups (35.5-55.4)" },
    { threshold: 55.5, color: "#ff0000", label: "Unhealthy (55.5-150.4)" },
    { threshold: 150.5, color: "#990066", label: "Very Unhealthy (150.5-250.4)" },
    { threshold: 250.5, color: "#660000", label: "Hazardous (250.5+)" },
  ],
  pm10Standard: [
    { threshold: 0, color: "#00ff00", label: "Good (0-54)" },
    { threshold: 54.1, color: "#ffff00", label: "Moderate (54.1-154)" },
    { threshold: 154.1, color: "#ff9900", label: "Unhealthy for Sensitive Groups (154.1-254)" },
    { threshold: 254.1, color: "#ff0000", label: "Unhealthy (254.1-354)" },
    { threshold: 354.1, color: "#990066", label: "Very Unhealthy (354.1-424)" },
    { threshold: 424.1, color: "#660000", label: "Hazardous (424.1+)" },
  ],
  temperature: [
    { threshold: -10, color: "#0000ff", label: "Very Cold (< 0°C)" },
    { threshold: 0, color: "#00ffff", label: "Cold (0-10°C)" },
    { threshold: 10, color: "#00ff00", label: "Cool (10-20°C)" },
    { threshold: 20, color: "#ffff00", label: "Warm (20-30°C)" },
    { threshold: 30, color: "#ff9900", label: "Hot (30-40°C)" },
    { threshold: 40, color: "#ff0000", label: "Very Hot (> 40°C)" },
  ],
  humidity: [
    { threshold: 0, color: "#ff0000", label: "Very Dry (0-20%)" },
    { threshold: 20, color: "#ff9900", label: "Dry (20-40%)" },
    { threshold: 40, color: "#ffff00", label: "Moderate (40-60%)" },
    { threshold: 60, color: "#00ff00", label: "Humid (60-80%)" },
    { threshold: 80, color: "#00ffff", label: "Very Humid (80-100%)" },
  ]
};

// Legend component
const Legend = ({ metric, darkMode }) => {
  const scale = colorScales[metric] || [];
  const metricInfo = getMetricInfo(metric);
  
  return (
    <div className={`absolute bottom-4 left-4 z-10 p-3 rounded-md shadow-lg ${
      darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
    }`}>
      <h4 className="font-semibold mb-2">{metricInfo.name} ({metricInfo.unit})</h4>
      <div className="text-xs mb-1">{metricInfo.description}</div>
      <div className="space-y-1">
        {scale.map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div 
              className="w-4 h-4 rounded-sm" 
              style={{ backgroundColor: item.color }}
            ></div>
            <span className="text-xs">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function AirQualityLeafletMap({ 
  data = [], 
  activeDevice = null, 
  onDeviceClick = () => {}, 
  timeSeriesData = [],
  darkMode = false,
  height = "500px"
}) {
  const [selectedMetric, setSelectedMetric] = useState('pm25Standard');
  const [isDarkMode, setIsDarkMode] = useState(darkMode);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [mapCenter, setMapCenter] = useState([37.7749, -122.4194]);
  const [zoom, setZoom] = useState(10);
  const [popupInfo, setPopupInfo] = useState(null);
  const [showLegend, setShowLegend] = useState(true);
  // Toggle clustering of markers
  const [clusterEnabled, setClusterEnabled] = useState(true);
  const [mapStyle, setMapStyle] = useState(darkMode ? 'dark' : 'streets');
  // Removed mapKey state; MapContainer will render once without remounting

  // Define the field mapping to handle different data formats
  const fieldMapping = useMemo(() => ({
    pm25Standard: ['pm25Standard', 'pm25', 'pm2_5', 'pm2.5'],
    pm10Standard: ['pm10Standard', 'pm10', 'pm10_0', 'pm10.0'],
    temperature: ['temperature', 'temp', 't'],
    humidity: ['relativeHumidity', 'humidity', 'rh'],
    latitude: ['latitude', 'lat', 'y'],
    longitude: ['longitude', 'lng', 'long', 'x'],
    deviceId: ['deviceId', 'device_id', 'id', 'from_node'],
    deviceName: ['deviceName', 'device_name', 'name', 'node_name'],
    datetime: ['datetime', 'timestamp', 'date', 'time', 'created_at']
  }), []);

  // Get value from an item based on possible field names
  const getFieldValue = useCallback((item, fieldNames) => {
    if (!item || typeof item !== 'object') return null;
    // Ensure fieldNames is iterable
    const names = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
    for (const field of names) {
      if (field !== undefined && item[field] !== undefined) {
        return item[field];
      }
    }
    return null;
  }, []);

  // Determine marker size based on value and metric - MOVED INSIDE COMPONENT
  const getMarkerSize = useCallback((value, metric) => {
    if (value === null || value === undefined) return 5; // Default size for missing data
    
    value = Number(value);
    if (isNaN(value)) return 5; // Default size for invalid values
    
    // Size range from 5 to 15 for most metrics
    switch (metric) {
      case 'pm25':
        if (value <= 12) return 5;
        if (value <= 35.4) return 7;
        if (value <= 55.4) return 9;
        if (value <= 150.4) return 11;
        if (value <= 250.4) return 13;
        return 15;
      case 'pm10':
        if (value <= 54) return 5;
        if (value <= 154) return 7;
        if (value <= 254) return 9;
        if (value <= 354) return 11;
        if (value <= 424) return 13;
        return 15;
      case 'temperature':
        // Normalize temperature to a reasonable size
        return Math.max(5, Math.min(15, 5 + (value + 10) / 10));
      case 'humidity':
        // Normalize humidity percentage to a size
        return Math.max(5, Math.min(15, 5 + value / 20));
      default:
        return 7;
    }
  }, []);

  // Get color for a value based on metric - MOVED INSIDE COMPONENT
  const getColorForValue = useCallback((value, metric) => {
    if (value === null || value === undefined) return '#CCCCCC'; // Gray for missing data
    
    value = Number(value);
    if (isNaN(value)) return '#CCCCCC'; // Gray for invalid values
    
    switch (metric) {
      case 'pm25':
        if (value <= 12) return '#00E400'; // Good
        if (value <= 35.4) return '#FFFF00'; // Moderate
        if (value <= 55.4) return '#FF7E00'; // Unhealthy for Sensitive Groups
        if (value <= 150.4) return '#FF0000'; // Unhealthy
        if (value <= 250.4) return '#99004C'; // Very Unhealthy
        return '#7E0023'; // Hazardous
      case 'pm10':
        if (value <= 54) return '#00E400'; // Good
        if (value <= 154) return '#FFFF00'; // Moderate
        if (value <= 254) return '#FF7E00'; // Unhealthy for Sensitive Groups
        if (value <= 354) return '#FF0000'; // Unhealthy
        if (value <= 424) return '#99004C'; // Very Unhealthy
        return '#7E0023'; // Hazardous
      case 'temperature':
        if (value <= 0) return '#0000FF'; // Very cold - Blue
        if (value <= 10) return '#00FFFF'; // Cold - Cyan
        if (value <= 20) return '#00FF00'; // Cool - Green
        if (value <= 25) return '#FFFF00'; // Moderate - Yellow
        if (value <= 30) return '#FF7E00'; // Warm - Orange
        return '#FF0000'; // Hot - Red
      case 'humidity':
        if (value <= 20) return '#FFFFCC'; // Very Dry
        if (value <= 40) return '#C7E9B4'; // Dry
        if (value <= 60) return '#7FCDBB'; // Moderate
        if (value <= 80) return '#41B6C4'; // Humid
        return '#225EA8'; // Very Humid
      default:
        // Default color scale for other metrics
        if (value <= 20) return '#00E400';
        if (value <= 40) return '#FFFF00';
        if (value <= 60) return '#FF7E00';
        if (value <= 80) return '#FF0000';
        return '#7E0023';
    }
  }, []);

  // Helper function to determine text color based on background color luminance
  const getLuminance = (hexColor) => {
    // Convert hex to RGB
    const r = parseInt(hexColor.substr(1, 2), 16) / 255;
    const g = parseInt(hexColor.substr(3, 2), 16) / 255;
    const b = parseInt(hexColor.substr(5, 2), 16) / 255;
    
    // Calculate luminance
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  // Metrics available for display on the map
  const metrics = [
    { value: 'pm25Standard', label: 'PM2.5' },
    { value: 'pm10Standard', label: 'PM10' },
    { value: 'temperature', label: 'Temperature' },
    { value: 'relativeHumidity', label: 'Humidity' }
  ];

  // Define available map styles
  const mapStyles = {
    streets: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      name: 'Streets'
    },
    dark: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      name: 'Dark'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      name: 'Satellite'
    },
    topo: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
      name: 'Topographic'
    },
    light: {
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      name: 'Light'
    }
  };

  // Detect dark mode
  useEffect(() => {
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(isDark);
    
    // Set appropriate map style based on dark mode
    if (isDark && mapStyle === 'streets') {
      setMapStyle('dark');
    }

    // Add listener for theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      setIsDarkMode(e.matches);
      if (e.matches && mapStyle === 'streets') {
        setMapStyle('dark');
      } else if (!e.matches && mapStyle === 'dark') {
        setMapStyle('streets');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mapStyle]);

  // Removed force remount logic on style change
  
  // Existing cleanup logic is retained; MapContainer unmount cleanup is handled by React Leaflet

  // Set initial view based on data
  useEffect(() => {
    if (data.length > 0) {
      // If active device is selected, center on it
      if (activeDevice) {
        const device = data.find(d => d.deviceId === activeDevice);
        if (device && device.latitude && device.longitude) {
          setMapCenter([device.latitude, device.longitude]);
          setZoom(14);
          return;
        }
      }
      
      // Otherwise calculate the bounding box of all devices
      const validCoords = data.filter(d => 
        d.latitude && d.longitude && 
        !isNaN(d.latitude) && !isNaN(d.longitude)
      );
      
      if (validCoords.length > 0) {
        const lats = validCoords.map(d => d.latitude);
        const lons = validCoords.map(d => d.longitude);
        
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLon = Math.min(...lons);
        const maxLon = Math.max(...lons);
        
        // Center point
        const centerLat = (minLat + maxLat) / 2;
        const centerLon = (minLon + maxLon) / 2;
        
        // Calculate appropriate zoom level
        const latDiff = maxLat - minLat;
        const lonDiff = maxLon - minLon;
        const maxDiff = Math.max(latDiff, lonDiff);
        
        let newZoom = 12; // Default zoom
        if (maxDiff > 0.5) newZoom = 8;
        else if (maxDiff > 0.2) newZoom = 10;
        else if (maxDiff > 0.1) newZoom = 11;
        else if (maxDiff > 0.05) newZoom = 12;
        else newZoom = 13;
        
        setMapCenter([centerLat, centerLon]);
        setZoom(newZoom);
      }
    }
  }, [data, activeDevice]);

  // Handle Leaflet icon issue on SSR
  useEffect(() => {
    // Leaflet icon default setup
    if (typeof window !== 'undefined') {
      // Fix the marker icon issue in Leaflet
      import('leaflet').then(L => {
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
      });
    }
  }, []);

  // Filter data based on requirements
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }
    
    // Log data example to help debug
    
    // Improved filtering to ensure valid coordinates and metric values
    const filtered = data.filter(item => {
      // Ensure valid latitude and longitude values
      const lat = parseFloat(getFieldValue(item, fieldMapping.latitude));
      const lng = parseFloat(getFieldValue(item, fieldMapping.longitude));
      
      const hasValidCoords = 
        lat !== null && 
        lng !== null && 
        !isNaN(lat) && 
        !isNaN(lng) &&
        // Exclude points with exactly zero coordinates (often default values)
        !(lat === 0 && lng === 0);
      
      // Check if the metric exists and has a valid value
      const metricValue = getFieldValue(item, fieldMapping[selectedMetric]);
      const hasMetric = metricValue !== null && metricValue !== undefined;
      
      return hasValidCoords && hasMetric;
    });
    
    
    return filtered;
  }, [data, selectedMetric, fieldMapping, getFieldValue]);

  // Access the actual metric value using field mapping
  const getMetricValue = useCallback((item, metric) => {
    return getFieldValue(item, fieldMapping[metric]);
  }, [fieldMapping, getFieldValue]);

  // Handle device selection
  const handleDeviceClick = useCallback((device) => {
    setPopupInfo(device);
    onDeviceClick(device.deviceId);
  }, [onDeviceClick]);

  // Function to get a human-readable display name for a metric
  const getMetricDisplayName = useCallback((metric) => {
    const metricMap = {
      'pm25Standard': 'PM2.5',
      'pm10Standard': 'PM10',
      'pm100Standard': 'PM100',
      'temperature': 'Temperature',
      'relativeHumidity': 'Humidity',
      'iaq': 'Air Quality Index'
    };
    
    return metricMap[metric] || metric;
  }, []);

  // Function to get formatted value label with units
  const getValueLabel = useCallback((value, metric) => {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    
    // Convert to number if it's not already a number
    const numValue = typeof value === 'number' ? value : Number(value);
    
    // Check if conversion was successful
    if (isNaN(numValue)) return 'N/A';
    
    if (metric === 'pm25Standard' || metric === 'pm10Standard' || metric === 'pm100Standard') {
      return `${numValue.toFixed(1)} µg/m³`;
    } else if (metric === 'temperature') {
      return `${numValue.toFixed(1)} °C`;
    } else if (metric === 'relativeHumidity') {
      return `${numValue.toFixed(1)}%`;
    } else if (metric === 'iaq') {
      return `${numValue.toFixed(0)} IAQ`;
    } else {
      return `${numValue}`;
    }
  }, []);

  // Function to get air quality category based on value
  const getAQICategory = useCallback((value, metric) => {
    if (value === null || value === undefined || isNaN(value)) return 'Unknown';
    
    if (metric === 'pm25Standard') {
      if (value <= 12) return 'Good';
      if (value <= 35.4) return 'Moderate';
      if (value <= 55.4) return 'Unhealthy for Sensitive Groups';
      if (value <= 150.4) return 'Unhealthy';
      if (value <= 250.4) return 'Very Unhealthy';
      return 'Hazardous';
    } 
    else if (metric === 'pm10Standard') {
      if (value <= 54) return 'Good';
      if (value <= 154) return 'Moderate';
      if (value <= 254) return 'Unhealthy for Sensitive Groups';
      if (value <= 354) return 'Unhealthy';
      if (value <= 424) return 'Very Unhealthy';
      return 'Hazardous';
    }
    else if (metric === 'iaq') {
      if (value <= 50) return 'Good';
      if (value <= 100) return 'Moderate';
      if (value <= 150) return 'Unhealthy for Sensitive Groups';
      if (value <= 200) return 'Unhealthy';
      if (value <= 300) return 'Very Unhealthy';
      return 'Hazardous';
    }
    
    return '';
  }, []);

  // Render mini time series chart for selected device
  const renderDeviceMiniChart = useCallback((device) => {
    if (!timeSeriesData || timeSeriesData.length === 0) return null;
    
    // Find matching time series data
    const deviceHistory = timeSeriesData.filter(item => {
      if (device.deviceId && item.deviceId) {
        return item.deviceId === device.deviceId;
      }
      if (device.from_node && item.from_node) {
        return item.from_node === device.from_node;
      }
      return false;
    });
    
    if (deviceHistory.length === 0) return null;
    
    // Sort data by datetime
    const sortedHistory = [...deviceHistory]
      .filter(item => getMetricValue(item, selectedMetric) !== null && getMetricValue(item, selectedMetric) !== undefined)
      .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    
    if (sortedHistory.length === 0) return null;
    
    // Extract dates and values for the chart
    const dates = sortedHistory.map(item => new Date(item.datetime));
    const values = sortedHistory.map(item => Number(getMetricValue(item, selectedMetric)));
    
    // Modern Plotly configuration
    return (
      <div className="mt-3 h-28 w-full">
        <MiniChart
          data={[
            {
              x: dates,
              y: values,
              type: 'scatter',
              mode: 'lines',
              line: { 
                color: getColorForValue(values[values.length - 1], selectedMetric),
                width: 2,
                shape: 'spline'
              },
              fill: 'tozeroy',
              fillcolor: `${getColorForValue(values[values.length - 1], selectedMetric)}20`
            }
          ]}
          layout={{
            showlegend: false,
            margin: { l: 30, r: 10, t: 10, b: 25 },
            xaxis: { 
              showgrid: false, 
              showticklabels: true,
              tickformat: '%m/%d',
              tickfont: { size: 8, color: '#888' }
            },
            yaxis: { 
              title: getMetricDisplayName(selectedMetric), 
              titlefont: { size: 10 },
              showgrid: true,
              gridcolor: '#f0f0f0',
              tickfont: { size: 8 }
            },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)'
          }}
          config={{ 
            displayModeBar: false, 
            responsive: true 
          }}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    );
  }, [timeSeriesData, selectedMetric, getColorForValue, getMetricDisplayName, getMetricValue]);

  // Create marker clusters
  const createClusterCustomIcon = function (cluster) {
    const childCount = cluster.getChildCount();
    let size = 30;
    let fontSize = 12;
    
    if (childCount > 50) {
      size = 50;
      fontSize = 16;
    } else if (childCount > 20) {
      size = 40;
      fontSize = 14;
    }
    
    return L.divIcon({
      html: `<div style="width: ${size}px; height: ${size}px; font-size: ${fontSize}px;">${childCount}</div>`,
      className: 'custom-cluster-icon',
      iconSize: L.point(size, size)
    });
  };

  // Generate popup content for a data point
  const createPopupContent = (item) => {
    const metricInfo = getMetricInfo(selectedMetric);
    const value = item[selectedMetric];
    const formattedValue = value ? value.toFixed(1) : "N/A";
    const color = getColorForValue(value, selectedMetric);
    
    return (`
      <div class="${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} p-0 rounded-lg overflow-hidden shadow-lg" style="min-width: 200px;">
        <div class="p-3 font-bold ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}">
          ${item.name || 'Air Quality Station'}
        </div>
        <div class="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">${metricInfo.name}:</span>
            <span className="p-1 px-2 rounded" style="background-color: ${color}; color: ${getLuminance(color) > 0.5 ? '#000' : '#fff'}">
              ${formattedValue} ${metricInfo.unit}
            </span>
          </div>
        </div>
      </div>
    `);
  };

  // Function to render device markers on the map
  const renderMarkers = useCallback(() => {
    if (!filteredData || filteredData.length === 0) return null;
    
    // Map between selectedMetric and the simplified metric names used in getMarkerSize/getColorForValue
    const metricMap = {
      'pm25Standard': 'pm25',
      'pm10Standard': 'pm10',
      'temperature': 'temperature',
      'relativeHumidity': 'humidity'
    };
    
    // Get the simplified metric name for the color/size functions
    const simplifiedMetric = metricMap[selectedMetric] || selectedMetric;
    
    return filteredData.map((device, idx) => {
      // Get coordinates using our field mapping
      const lat = parseFloat(getFieldValue(device, fieldMapping.latitude));
      const lng = parseFloat(getFieldValue(device, fieldMapping.longitude));
      
      // Skip devices with invalid coordinates
      if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
        return null;
      }
      
      // Get the current metric value from the device
      const metricValue = getMetricValue(device, selectedMetric);
      
      // Skip points with undefined, null, or NaN metric values
      if (metricValue === null || metricValue === undefined || isNaN(metricValue)) {
        return null;
      }
      
      // Get the marker size and color based on the metric value, using the simplified metric name
      const markerSize = getMarkerSize(metricValue, simplifiedMetric);
      const markerColor = getColorForValue(metricValue, simplifiedMetric);
      
      // Get device ID using field mapping
      const deviceId = getFieldValue(device, fieldMapping.deviceId);
      
      // Use a composite key of deviceId (if available) and index to ensure uniqueness
      const baseKey = deviceId || `${lat}-${lng}`;
      return (
        <CircleMarker 
          key={`${baseKey}-${idx}`}
          center={[lat, lng]} 
          radius={markerSize}
          fillColor={markerColor}
          color="#000"
          weight={deviceId === activeDevice ? 3 : 1}
          opacity={0.8}
          fillOpacity={0.8}
          eventHandlers={{
            click: () => handleDeviceClick(device)
          }}
        >
          <Popup maxWidth={350} className="custom-popup">
            <div className="p-3 max-w-sm">
              <h3 className="font-semibold text-base mb-2 flex items-center">
                <span className="inline-block w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: markerColor }}></span>
                {getFieldValue(device, fieldMapping.deviceName) || deviceId || 'Unknown Device'}
              </h3>
              
              <div className="popup-grid">
                <div className="popup-grid-item">
                  <span className="text-gray-500 block mb-1 text-xs">PM2.5</span>
                  <span className="font-medium text-sm">{getValueLabel(getMetricValue(device, 'pm25Standard'), 'pm25Standard')}</span>
                </div>
                <div className="popup-grid-item">
                  <span className="text-gray-500 block mb-1 text-xs">PM10</span>
                  <span className="font-medium text-sm">{getValueLabel(getMetricValue(device, 'pm10Standard'), 'pm10Standard')}</span>
                </div>
                <div className="popup-grid-item">
                  <span className="text-gray-500 block mb-1 text-xs">Temperature</span>
                  <span className="font-medium text-sm">{getValueLabel(getMetricValue(device, 'temperature'), 'temperature')}</span>
                </div>
                <div className="popup-grid-item">
                  <span className="text-gray-500 block mb-1 text-xs">Humidity</span>
                  <span className="font-medium text-sm">{getValueLabel(getMetricValue(device, 'relativeHumidity'), 'relativeHumidity')}</span>
                </div>
              </div>

              {getFieldValue(device, fieldMapping.datetime) && (
                <div className="text-xs text-gray-500 mt-3">
                  Last update: {new Date(getFieldValue(device, fieldMapping.datetime)).toLocaleString()}
                </div>
              )}

              <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Air Quality:</span>
                  <span 
                    className="text-xs font-semibold px-2 py-1 rounded"
                    style={{ 
                      backgroundColor: getColorForValue(getMetricValue(device, 'pm25Standard'), 'pm25'),
                      color: getMetricValue(device, 'pm25Standard') > 35.4 ? 'white' : 'black'
                    }}
                  >
                    {getAQICategory(getMetricValue(device, 'pm25Standard'), 'pm25Standard')}
                  </span>
                </div>
              </div>
              
              {/* Render mini chart if time series data is available */}
              <div className="mt-3">
                {renderDeviceMiniChart(device)}
              </div>
            </div>
          </Popup>
        </CircleMarker>
      );
    }).filter(Boolean); // Filter out null markers
  }, [filteredData, selectedMetric, activeDevice, getMetricValue, getMarkerSize, getColorForValue, getValueLabel, getAQICategory, handleDeviceClick, renderDeviceMiniChart, getFieldValue, fieldMapping]);

  return (
    <div className={`relative w-full h-full ${darkMode ? 'dark' : ''}`}>
      {/* Add custom CSS for map styling */}
      <style jsx global>{`
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          padding: 0;
          overflow: hidden;
          min-width: 280px;
        }
        
        .leaflet-popup-content {
          margin: 0;
          padding: 0;
          width: auto !important;
          max-height: 400px;
          overflow-y: auto;
        }
        
        .leaflet-popup-tip {
          box-shadow: 0 3px 14px rgba(0,0,0,0.1);
        }
        
        .leaflet-container {
          font-family: inherit;
        }
        
        .custom-cluster-icon {
          background: rgba(38, 84, 124, 0.85);
          background: linear-gradient(135deg, rgba(65, 132, 195, 0.85) 0%, rgba(38, 84, 124, 0.95) 100%);
          color: white;
          border-radius: 50%;
          text-align: center;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2), inset 0 2px 5px rgba(255,255,255,0.3);
          border: 2px solid rgba(255,255,255,0.3);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }
        
        .custom-popup .p-3 {
          padding: 0.75rem !important;
        }
        
        .popup-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-gap: 0.5rem;
          margin-top: 0.5rem;
        }
        
        .popup-grid-item {
          background-color: #f9fafb;
          border-radius: 0.25rem;
          padding: 0.5rem;
        }
        
        .dark .popup-grid-item {
          background-color: #1f2937;
        }
      `}</style>
      
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        {/* Metric selector */}
        <select
          className={`px-3 py-2 rounded-md text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            darkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-800 border-gray-200'
          }`}
          value={selectedMetric}
          onChange={e => setSelectedMetric(e.target.value)}
        >
          {metrics.map(metric => (
            <option key={metric.value} value={metric.value}>
              {metric.label}
            </option>
          ))}
        </select>

        <select 
          className={`px-3 py-2 rounded-md text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            darkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-800 border-gray-200'
          }`}
          value={mapStyle}
          onChange={e => {
            setMapStyle(e.target.value);
            // Removed remount logic; style change now updates tile layer without reinitializing map
          }}
        >
          {Object.entries(mapStyles).map(([key, style]) => (
            <option key={key} value={key}>{style.name}</option>
          ))}
        </select>

        <button 
          className={`p-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            darkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-gray-800 hover:bg-gray-100'
          }`}
          onClick={() => setShowLegend(!showLegend)}
          title={showLegend ? "Hide Legend" : "Show Legend"}
        >
          <span className="sr-only">{showLegend ? "Hide Legend" : "Show Legend"}</span>
          {showLegend ? (
            <EyeSlashIcon className="h-5 w-5" />
          ) : (
            <EyeIcon className="h-5 w-5" />
          )}
        </button>

        <button 
          className={`p-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            darkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-gray-800 hover:bg-gray-100'
          }`}
          onClick={() => setShowHeatmap(!showHeatmap)}
          title={showHeatmap ? "Show Markers" : "Show Heatmap"}
        >
          <span className="sr-only">{showHeatmap ? "Show Markers" : "Show Heatmap"}</span>
          {showHeatmap ? (
            <MapPinIcon className="h-5 w-5" />
          ) : (
            <FireIcon className="h-5 w-5" />
          )}
        </button>
        {/* Cluster toggle: enable or disable marker clustering */}
        <button
          className={`p-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            darkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-gray-800 hover:bg-gray-100'
          }`}
          onClick={() => setClusterEnabled(prev => !prev)}
          title={clusterEnabled ? "Disable Clustering" : "Enable Clustering"}
        >
          <span className="sr-only">{clusterEnabled ? "Disable Clustering" : "Enable Clustering"}</span>
          <UserGroupIcon className="h-5 w-5" />
        </button>
      </div>
      
      <div className="flex flex-wrap justify-between items-center mb-3 gap-2 p-2">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Display Metric:</label>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {metrics.map(metric => (
              <option key={metric.value} value={metric.value}>
                {metric.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-700 dark:text-gray-300">Map Style:</label>
            <select
              value={mapStyle}
              onChange={(e) => setMapStyle(e.target.value)}
              className="text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {Object.entries(mapStyles).map(([key, style]) => (
                <option key={key} value={key}>
                  {style.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showLegend"
              checked={showLegend}
              onChange={() => setShowLegend(prev => !prev)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="showLegend" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Show Legend
            </label>
          </div>
        </div>
      </div>

      <div className="relative flex-grow" style={{ height: height || '700px' }}>
          {typeof window !== 'undefined' && (
          <MapContainer 
            // Removed key to avoid duplicate map initialization
            center={mapCenter} 
            zoom={zoom} 
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            className={darkMode ? 'dark' : ''}
          >
            <ZoomControl position="bottomright" />
            <TileLayer
              url={mapStyles[mapStyle].url}
              attribution={mapStyles[mapStyle].attribution}
            />
            
            {/* Add HeatmapLayer if showHeatmap is true */}
            {showHeatmap && filteredData.length > 0 && (
              <HeatmapLayer
                points={filteredData
                  .filter(item => {
                    // Extra validation for heatmap points
                    const lat = parseFloat(getFieldValue(item, fieldMapping.latitude));
                    const lng = parseFloat(getFieldValue(item, fieldMapping.longitude));
                    const value = getMetricValue(item, selectedMetric);
                    
                    // Only include points with valid coordinates and metric values
                    return !isNaN(lat) && !isNaN(lng) && 
                      !(lat === 0 && lng === 0) && // Skip default/zero coordinates
                      value !== null && value !== undefined && !isNaN(value);
                  })
                  .map(item => ({
                    lat: parseFloat(getFieldValue(item, fieldMapping.latitude)),
                    lng: parseFloat(getFieldValue(item, fieldMapping.longitude)),
                    intensity: getMetricValue(item, selectedMetric) || 0
                  }))
                }
                longitudeExtractor={m => m.lng}
                latitudeExtractor={m => m.lat}
                intensityExtractor={m => m.intensity}
                radius={20}
                max={100}
                blur={15}
                gradient={{
                  0.4: '#4CAF50',
                  0.6: '#FFEB3B', 
                  0.7: '#FF9800', 
                  0.8: '#F44336',
                  0.9: '#9C27B0',
                  1.0: '#7E0023'
                }}
              />
            )}
            
            {/* Clustered markers for data points */}
            {!showHeatmap && (
              <MarkerClusterGroup
                chunkedLoading
                spiderfyOnMaxZoom={true}
                disableClusteringAtZoom={18}
                maxClusterRadius={60}
                showCoverageOnHover={false}
                zoomToBoundsOnClick={true}
                iconCreateFunction={(cluster) => {
                  if (typeof window !== 'undefined' && L) {
                    const count = cluster.getChildCount();
                    let size = 'small';
                    let diameter = 30;
                    
                    if (count > 50) {
                      size = 'large';
                      diameter = 50;
                    } else if (count > 10) {
                      size = 'medium';
                      diameter = 40;
                    }
                    
                    return L.divIcon({
                      html: `<div class="custom-cluster-icon" style="width: ${diameter}px; height: ${diameter}px;">${count}</div>`,
                      className: '',
                      iconSize: L.point(diameter, diameter)
                    });
                  }
                  return null;
                }}
              >
                {renderMarkers()}
              </MarkerClusterGroup>
            )}
          </MapContainer>
        )}
      </div>
      
      {showLegend && (
        <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 px-2 text-xs">
          {selectedMetric === 'pm25Standard' && (
            <>
              <div className="flex items-center">
                <span className="w-4 h-4 inline-block mr-1" style={{ backgroundColor: '#4CAF50' }}></span>
                <span className="text-gray-700 dark:text-gray-300">Good (0-12)</span>
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 inline-block mr-1" style={{ backgroundColor: '#FFEB3B' }}></span>
                <span className="text-gray-700 dark:text-gray-300">Moderate (12.1-35.4)</span>
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 inline-block mr-1" style={{ backgroundColor: '#FF9800' }}></span>
                <span className="text-gray-700 dark:text-gray-300">Unhealthy for Sensitive Groups (35.5-55.4)</span>
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 inline-block mr-1" style={{ backgroundColor: '#F44336' }}></span>
                <span className="text-gray-700 dark:text-gray-300">Unhealthy (55.5-150.4)</span>
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 inline-block mr-1" style={{ backgroundColor: '#9C27B0' }}></span>
                <span className="text-gray-700 dark:text-gray-300">Very Unhealthy (150.5-250.4)</span>
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 inline-block mr-1" style={{ backgroundColor: '#7E0023' }}></span>
                <span className="text-gray-700 dark:text-gray-300">Hazardous (&gt;250.4)</span>
              </div>
            </>
          )}
          
          {selectedMetric === 'temperature' && (
            <>
              <div className="flex items-center">
                <span className="w-4 h-4 inline-block mr-1" style={{ backgroundColor: '#0D47A1' }}></span>
                <span className="text-gray-700 dark:text-gray-300">Very Cold (≤0°C)</span>
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 inline-block mr-1" style={{ backgroundColor: '#2196F3' }}></span>
                <span className="text-gray-700 dark:text-gray-300">Cold (0-10°C)</span>
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 inline-block mr-1" style={{ backgroundColor: '#B3E5FC' }}></span>
                <span className="text-gray-700 dark:text-gray-300">Cool (10-20°C)</span>
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 inline-block mr-1" style={{ backgroundColor: '#C8E6C9' }}></span>
                <span className="text-gray-700 dark:text-gray-300">Comfortable (20-25°C)</span>
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 inline-block mr-1" style={{ backgroundColor: '#FFEB3B' }}></span>
                <span className="text-gray-700 dark:text-gray-300">Warm (25-30°C)</span>
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 inline-block mr-1" style={{ backgroundColor: '#FF9800' }}></span>
                <span className="text-gray-700 dark:text-gray-300">Hot (30-35°C)</span>
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 inline-block mr-1" style={{ backgroundColor: '#F44336' }}></span>
                <span className="text-gray-700 dark:text-gray-300">Very Hot (&gt;35°C)</span>
              </div>
            </>
          )}
          
          {selectedMetric === 'relativeHumidity' && (
            <>
              <div className="flex items-center">
                <span className="w-4 h-4 inline-block mr-1" style={{ backgroundColor: '#F57F17' }}></span>
                <span className="text-gray-700 dark:text-gray-300">Very Dry (≤20%)</span>
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 inline-block mr-1" style={{ backgroundColor: '#FBC02D' }}></span>
                <span className="text-gray-700 dark:text-gray-300">Dry (20-30%)</span>
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 inline-block mr-1" style={{ backgroundColor: '#CDDC39' }}></span>
                <span className="text-gray-700 dark:text-gray-300">Comfortable Dry (30-50%)</span>
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 inline-block mr-1" style={{ backgroundColor: '#4CAF50' }}></span>
                <span className="text-gray-700 dark:text-gray-300">Comfortable (50-70%)</span>
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 inline-block mr-1" style={{ backgroundColor: '#26A69A' }}></span>
                <span className="text-gray-700 dark:text-gray-300">Comfortable Humid (70-85%)</span>
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 inline-block mr-1" style={{ backgroundColor: '#0288D1' }}></span>
                <span className="text-gray-700 dark:text-gray-300">Very Humid (&gt;85%)</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
} 