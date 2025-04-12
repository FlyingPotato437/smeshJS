import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { ScaleControl, NavigationControl, GeolocateControl, Popup, Source, Layer, FullscreenControl } from 'react-map-gl';
import mapboxgl from 'mapbox-gl';

// Dynamically import Map component to avoid SSR issues
const Map = dynamic(() => import('react-map-gl'), { 
    ssr: false,
    loading: () => (
    <div className="min-h-[600px] w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-t-2 border-b-2 border-primary-500 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading map...</p>
        </div>
      </div>
    )
});

// Dynamically import lightweight mini-chart component
const MiniChart = dynamic(() => import('react-plotly.js'), { 
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-24 w-full rounded"></div>
});

export default function AirQualityMap({ data = [], activeDevice = null, onDeviceClick = () => {}, timeSeriesData = [] }) {
  const [viewState, setViewState] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    zoom: 10
  });
  const [hoverInfo, setHoverInfo] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/light-v11');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('pm25Standard');
  const [popupInfo, setPopupInfo] = useState(null);
  const [initialViewSet, setInitialViewSet] = useState(false);
  const [mapError, setMapError] = useState(null);
  
  // New state variables for enhanced features
  const [filterOptions, setFilterOptions] = useState({
    timeRange: 'all',  // 'all', 'day', 'week', 'month'
    minValue: null,
    maxValue: null,
    showOutliers: true
  });
  const [mapLayers, setMapLayers] = useState({
    clusters: false,
    heatmap: false,
    contour: false,
    buildings: false,
    terrain: false
  });
  const [timelineVisible, setTimelineVisible] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedDeviceHistory, setSelectedDeviceHistory] = useState([]);
  const [showLegend, setShowLegend] = useState(true);
  const [legendPosition, setLegendPosition] = useState('bottom');
  const [compareMode, setCompareMode] = useState(false);
  const [comparedDevices, setComparedDevices] = useState([]);
  const mapRef = useRef(null);
  const map = useRef(null);
  const mapContainer = useRef(null);
  const popup = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [autoFit, setAutoFit] = useState(true);

  const metrics = [
    { value: 'pm25Standard', label: 'PM2.5' },
    { value: 'pm10Standard', label: 'PM10' },
    { value: 'pm100Standard', label: 'PM100' },
    { value: 'temperature', label: 'Temperature' },
    { value: 'relativeHumidity', label: 'Humidity' },
    { value: 'iaq', label: 'Air Quality Index' }
  ];

  // Detect dark mode
  useEffect(() => {
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(isDark);
    setMapStyle(isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11');

    // Add listener for theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      setIsDarkMode(e.matches);
      setMapStyle(e.matches ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11');
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Set initial view based on data
  useEffect(() => {
    if (data.length > 0 && !initialViewSet) {
      // If active device is selected, center on it
      if (activeDevice) {
        const device = data.find(d => d.deviceId === activeDevice);
        if (device && device.latitude && device.longitude) {
          setViewState({
            latitude: device.latitude,
            longitude: device.longitude,
            zoom: 14
          });
          setInitialViewSet(true);
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
        // Simple calculation - can be improved
        const latDiff = maxLat - minLat;
        const lonDiff = maxLon - minLon;
        const maxDiff = Math.max(latDiff, lonDiff);
        
        let zoom = 12; // Default zoom
        if (maxDiff > 0.5) zoom = 8;
        else if (maxDiff > 0.2) zoom = 10;
        else if (maxDiff > 0.1) zoom = 11;
        else if (maxDiff > 0.05) zoom = 12;
        else zoom = 13;
        
        setViewState({
          latitude: centerLat,
          longitude: centerLon,
          zoom: zoom
        });
        setInitialViewSet(true);
      }
    }
  }, [data, activeDevice, initialViewSet]);

  // Get color for PM2.5 values
  const getColorForValue = useCallback((value, metric) => {
    if (value === null || value === undefined || isNaN(value)) return '#999999';
    
    if (metric === 'pm25Standard') {
      if (value <= 12) return '#4CAF50';      // Good
      if (value <= 35.4) return '#FFEB3B';    // Moderate
      if (value <= 55.4) return '#FF9800';    // Unhealthy for Sensitive Groups
      if (value <= 150.4) return '#F44336';   // Unhealthy
      if (value <= 250.4) return '#9C27B0';   // Very Unhealthy
      return '#7E0023';                       // Hazardous
    } 
    else if (metric === 'pm10Standard') {
      if (value <= 54) return '#4CAF50';      // Good
      if (value <= 154) return '#FFEB3B';     // Moderate
      if (value <= 254) return '#FF9800';     // Unhealthy for Sensitive Groups
      if (value <= 354) return '#F44336';     // Unhealthy
      if (value <= 424) return '#9C27B0';     // Very Unhealthy
      return '#7E0023';                       // Hazardous
    }
    else if (metric === 'iaq') {
      if (value <= 50) return '#4CAF50';      // Good
      if (value <= 100) return '#FFEB3B';     // Moderate
      if (value <= 150) return '#FF9800';     // Unhealthy for Sensitive Groups
      if (value <= 200) return '#F44336';     // Unhealthy
      if (value <= 300) return '#9C27B0';     // Very Unhealthy
      return '#7E0023';                       // Hazardous
    }
    else if (metric === 'temperature') {
      if (value <= 0) return '#0D47A1';       // Very Cold
      if (value <= 10) return '#2196F3';      // Cold
      if (value <= 20) return '#B3E5FC';      // Cool
      if (value <= 25) return '#C8E6C9';      // Comfortable
      if (value <= 30) return '#FFEB3B';      // Warm
      if (value <= 35) return '#FF9800';      // Hot
      return '#F44336';                       // Very Hot
    }
    else if (metric === 'relativeHumidity') {
      if (value <= 20) return '#F57F17';      // Very Dry
      if (value <= 30) return '#FBC02D';      // Dry
      if (value <= 50) return '#CDDC39';      // Comfortable Dry
      if (value <= 70) return '#4CAF50';      // Comfortable
      if (value <= 85) return '#26A69A';      // Comfortable Humid
      return '#0288D1';                       // Very Humid
    }
    else {
      return '#2196F3';  // Default
    }
  }, []);

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

  const getSizeForValue = useCallback((value, metric) => {
    if (value === null || value === undefined || isNaN(value)) return 15;
    
    if (metric === 'pm25Standard' || metric === 'pm10Standard' || metric === 'iaq') {
      return Math.min(Math.max(value / 5, 15), 40);
    } else if (metric === 'temperature') {
      return Math.min(Math.max(value / 2, 15), 40);
    } else if (metric === 'relativeHumidity') {
      return Math.min(Math.max(value / 3, 15), 40);
    } else {
      return 20;
    }
  }, []);

  // Normalize value to 0-1 range for heatmap weight
  const normalizeValue = useCallback((value) => {
    if (value === null || value === undefined || isNaN(value)) return 0;
    
    // Different normalization based on metric type
    if (selectedMetric === 'pm25Standard' || selectedMetric === 'pm25') {
      // PM2.5 - normalize based on AQI ranges
      return Math.min(1, value / 250); // Max around 250
    } 
    else if (selectedMetric === 'pm10Standard' || selectedMetric === 'pm10') {
      // PM10 - normalize based on AQI ranges
      return Math.min(1, value / 430); // Max around 430
    }
    else if (selectedMetric === 'temperature') {
      // Temperature - normalize around comfortable range (10-35°C)
      return Math.min(1, Math.max(0, (value - 10) / 25));
    }
    else if (selectedMetric === 'relativeHumidity' || selectedMetric === 'humidity') {
      // Humidity - already 0-100 scale
      return value / 100;
    }
    else {
      // Default normalization - assume 0-100 scale
      return Math.min(1, Math.max(0, value / 100));
    }
  }, [selectedMetric]);

  // Helper function to get the actual metric value from a data point
  const getMetricValue = useCallback((point) => {
    // Handle different data formats (camelCase from local data vs lowercase from Supabase)
    if (!point) return null;
    
    // Direct field match
    if (point[selectedMetric] !== undefined && point[selectedMetric] !== null) {
      return parseFloat(point[selectedMetric]);
    }
    
    // Try lowercase version (from Supabase)
    const lowercaseField = selectedMetric.toLowerCase();
    if (point[lowercaseField] !== undefined && point[lowercaseField] !== null) {
      return parseFloat(point[lowercaseField]);
    }
    
    // Try alternative field names
    const fieldMappings = {
      'pm25': ['pm25Standard', 'pm25standard', 'pm2_5', 'PM2.5'],
      'pm10': ['pm10Standard', 'pm10standard', 'PM10'],
      'temperature': ['temp'],
      'humidity': ['relativeHumidity', 'relativehumidity']
    };
    
    // Check if we have mappings for this metric
    const alternatives = fieldMappings[selectedMetric] || [];
    for (const alt of alternatives) {
      if (point[alt] !== undefined && point[alt] !== null) {
        return parseFloat(point[alt]);
      }
    }
    
    return null;
  }, [selectedMetric]);

  // Generate heatmap data points from the provided data
  const generateHeatmapData = useCallback(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn('No data available for heatmap');
      return [];
    }
    
    console.log(`Generating heatmap from ${data.length} points`);
    
    // Filter for data points with valid coordinates and selected metric
    const validPoints = data.filter(point => {
      // Check if point has valid coordinates
      if (!point.latitude || !point.longitude || 
          isNaN(parseFloat(point.latitude)) || 
          isNaN(parseFloat(point.longitude))) {
        return false;
      }
      
      // Check if the selected metric exists and has a value
      const metricValue = getMetricValue(point);
      return metricValue !== null && metricValue !== undefined && !isNaN(metricValue);
    });
    
    console.log(`Found ${validPoints.length} valid points for heatmap`);
    
    // Convert to the format expected by the heatmap layer
    return validPoints.map(point => {
      const metricValue = getMetricValue(point);
      return {
        longitude: parseFloat(point.longitude),
        latitude: parseFloat(point.latitude),
        weight: normalizeValue(metricValue)
      };
    });
  }, [data, selectedMetric, getMetricValue, normalizeValue]);
  
  // Initialize map when component mounts
  useEffect(() => {
    if (!mapContainer.current) return;
    
    if (map.current) return; // Skip if map already initialized
    
    // Initialize the map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: initialViewState.longitude ? 
        [initialViewState.longitude, initialViewState.latitude] : 
        [-98.5795, 39.8283], // Default to US center if no coordinates provided
      zoom: initialViewState.zoom,
      pitch: initialViewState.pitch,
      bearing: initialViewState.bearing,
      attributionControl: false,
      antialias: true
    });
    
    // Create a default popup, but don't add it to the map yet
    popup.current = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: '300px',
      className: isDarkMode ? 'dark-popup' : 'light-popup'
    });
    
    // Add controls to the map
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
    map.current.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true
    }), 'top-right');
    
    // Add attribution control
    map.current.addControl(new mapboxgl.AttributionControl({
      compact: true
    }));
    
    // Wait for map to load before adding layers
    map.current.on('load', () => {
      setMapLoaded(true);
      
      // Add 3D terrain if enabled
      if (mapLayers.terrain) {
        addTerrainToMap();
      }
      
      // Add buildings layer if enabled
      if (mapLayers.buildings) {
        addBuildingsToMap();
      }
      
      // Add sky layer for better visualization in 3D mode
      if (mapLayers.sky) {
        addSkyToMap();
      }
      
      // Create data points from the provided data
      const points = generateHeatmapData();
      
      // Add heatmap source and layer
      if (mapLayers.heatmap) {
        addHeatmapToMap(points);
      }
      
      // Add point source and layer for individual markers
      addMarkersToMap();
      
      // Fit map to bounds based on data points
      const bounds = getBoundsFromPoints(points);
      if (bounds) {
        map.current.fitBounds(bounds, {
          padding: 50,
          duration: 1000
        });
      }
      
      // Update map when data changes
      updateMapData();
    });
    
    // Handle map interactions
    map.current.on('click', 'point-layer', handlePointClick);
    map.current.on('mouseenter', 'point-layer', () => {
      map.current.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', 'point-layer', () => {
      map.current.getCanvas().style.cursor = '';
    });
    
    // Effect cleanup function
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update data source when data changes
  const updateMapData = useCallback(() => {
    if (!map.current || !mapLoaded) return;
    
    // Generate data points from the available data
    const points = generateHeatmapData();
    console.log(`Updating map with ${points.length} points`);
    
    // Update heatmap source
    if (map.current.getSource('heatmap-source')) {
      map.current.getSource('heatmap-source').setData({
        type: 'FeatureCollection',
        features: points.map(point => ({
          type: 'Feature',
          properties: {
            weight: point.weight
          },
          geometry: {
            type: 'Point',
            coordinates: [point.longitude, point.latitude]
          }
        }))
      });
    }
    
    // Update point source
    if (map.current.getSource('point-source')) {
      // Create GeoJSON for individual point markers
      const pointFeatures = data
        .filter(item => {
          // Filter for valid coordinates and metric value
          if (!item.latitude || !item.longitude || 
              isNaN(parseFloat(item.latitude)) || 
              isNaN(parseFloat(item.longitude))) {
            return false;
          }
          
          const metricValue = getMetricValue(item);
          return metricValue !== null && metricValue !== undefined && !isNaN(metricValue);
        })
        .map(item => {
          const metricValue = getMetricValue(item);
          const deviceId = item.deviceId || item.from_node || 'unknown';
          const deviceName = item.deviceName || item.name || `Device ${deviceId}`;
          const timestamp = item.timestamp || item.datetime || new Date().toISOString();
          
          return {
            type: 'Feature',
            properties: {
              id: deviceId,
              name: deviceName,
              value: metricValue,
              color: getColorForValue(metricValue, selectedMetric),
              timestamp: timestamp,
              // Store additional data for popup
              pm25: getValueForMetric(item, 'pm25Standard') || getValueForMetric(item, 'pm25standard') || getValueForMetric(item, 'pm25'),
              pm10: getValueForMetric(item, 'pm10Standard') || getValueForMetric(item, 'pm10standard') || getValueForMetric(item, 'pm10'),
              temperature: getValueForMetric(item, 'temperature') || getValueForMetric(item, 'temp'),
              humidity: getValueForMetric(item, 'relativeHumidity') || getValueForMetric(item, 'relativehumidity') || getValueForMetric(item, 'humidity')
            },
            geometry: {
              type: 'Point',
              coordinates: [parseFloat(item.longitude), parseFloat(item.latitude)]
            }
          };
        });
      
      map.current.getSource('point-source').setData({
        type: 'FeatureCollection',
        features: pointFeatures
      });
    }
    
    // Fit map to bounds if we have data and autoFit is enabled
    if (points.length > 0 && autoFit) {
      const bounds = getBoundsFromPoints(points);
      if (bounds) {
        map.current.fitBounds(bounds, {
          padding: 50,
          duration: 1000
        });
        setAutoFit(false); // Only auto-fit once
      }
    }
  }, [data, mapLoaded, generateHeatmapData, selectedMetric, getMetricValue, autoFit]);
  
  // Helper function to get value for a specific metric
  const getValueForMetric = useCallback((item, metricName) => {
    if (!item) return null;
    
    if (item[metricName] !== undefined && item[metricName] !== null) {
      return parseFloat(item[metricName]);
    }
    
    return null;
  }, []);

  // Update the map when data changes
  useEffect(() => {
    updateMapData();
  }, [data, selectedMetric, updateMapData]);

  // Handle mouse events for map interactions
  const handleMouseEnter = useCallback((e) => {
    if (e.features && e.features.length > 0) {
      setHoverInfo({
        longitude: e.lngLat.lng,
        latitude: e.lngLat.lat,
        deviceId: e.features[0].properties.deviceId,
        value: e.features[0].properties[selectedMetric]
      });
    }
  }, [selectedMetric]);

  const handleMouseLeave = useCallback(() => {
    setHoverInfo(null);
  }, []);

  // Load time series data for a device
  const loadDeviceHistory = useCallback((deviceId) => {
    if (!timeSeriesData || timeSeriesData.length === 0) return;
    
    const deviceHistory = timeSeriesData.filter(item => item.deviceId === deviceId);
    setSelectedDeviceHistory(deviceHistory);
  }, [timeSeriesData]);

  // Handle device selection with history
  const handleDeviceClick = useCallback((device) => {
    setPopupInfo(device);
    loadDeviceHistory(device.deviceId);
    onDeviceClick(device.deviceId);
    
    // Add to compared devices list if compare mode is active
    if (compareMode) {
      setComparedDevices(prev => {
        // Don't add duplicates
        if (prev.some(d => d.deviceId === device.deviceId)) return prev;
        // Limit to 3 devices for comparison
        const newList = [...prev, device].slice(0, 3);
        return newList;
      });
    }
  }, [onDeviceClick, loadDeviceHistory, compareMode]);

  // Simple animation for time-series data
  useEffect(() => {
    let animationFrame;
    
    if (isPlaying && timeSeriesData.length > 0) {
      let currentIndex = 0;
      const uniqueTimes = [...new Set(timeSeriesData.map(item => item.datetime))].sort();
      
      const animate = () => {
        // Filter data to show only readings from this timestamp
        const timestamp = uniqueTimes[currentIndex];
        const pointsAtTime = data.filter(item => item.datetime === timestamp);
        
        // Update visualization with these points
        // This is simplified - you'd need to implement the actual visualization update
        
        // Advance to next frame
        currentIndex = (currentIndex + 1) % uniqueTimes.length;
        
        // Continue animation based on speed
        animationFrame = setTimeout(
          () => requestAnimationFrame(animate),
          1000 / animationSpeed
        );
      };
      
      animate();
    }
    
    return () => {
      if (animationFrame) {
        clearTimeout(animationFrame);
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isPlaying, timeSeriesData, animationSpeed, data]);

  // Add renderTimeline function to draw the timeline slider
  const renderTimeline = useCallback(() => {
    if (!timelineVisible || timeSeriesData.length === 0) return null;
    
    // Extract all unique timestamps
    const timestamps = [...new Set(timeSeriesData.map(item => item.datetime))].sort();
    
    return (
      <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 bg-opacity-90 dark:bg-opacity-90 p-2 z-20">
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1 rounded-full bg-primary-500 text-white"
          >
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>
          
          <input 
            type="range" 
            min="0" 
            max={timestamps.length - 1} 
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            onChange={(e) => {
              const index = parseInt(e.target.value);
              // Update visualization for this timestamp
              // Implementation would depend on your data structure
            }}
          />
          
          <div className="flex items-center space-x-1">
            <button 
              onClick={() => setAnimationSpeed(prev => Math.max(0.5, prev - 0.5))}
              className="p-1 text-gray-600 dark:text-gray-300 disabled:opacity-50"
              disabled={animationSpeed <= 0.5}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13H5v-2h14v2z"/>
              </svg>
            </button>
            <span className="text-xs text-gray-600 dark:text-gray-300">{animationSpeed}x</span>
            <button 
              onClick={() => setAnimationSpeed(prev => Math.min(5, prev + 0.5))}
              className="p-1 text-gray-600 dark:text-gray-300 disabled:opacity-50"
              disabled={animationSpeed >= 5}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }, [timelineVisible, timeSeriesData, isPlaying, animationSpeed, setIsPlaying, setAnimationSpeed]);

  // Get Mapbox token from environment variables with fallback
  // WARNING: This should be a PUBLIC token (starts with pk.), never use a secret token (starts with sk.)
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1Ijoic3Jpa2lmcmlraSIsImEiOiJjbTlhdGJpcXIwOHZ5Mm5vZGNmMTdwN3hxIn0.cEjV-2UbYV-W6IkTFKVjKg';

  if (!data || data.length === 0) {
    return (
      <div className="min-h-[600px] w-full flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">No location data available</p>
      </div>
    );
  }
  
  return (
    <div className="w-full h-full flex flex-col">
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
          
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-700 dark:text-gray-300">Map Style:</label>
            <select
              value={mapStyle}
              onChange={(e) => setMapStyle(e.target.value)}
              className="text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="mapbox://styles/mapbox/light-v11">Light</option>
              <option value="mapbox://styles/mapbox/dark-v11">Dark</option>
              <option value="mapbox://styles/mapbox/streets-v12">Streets</option>
              <option value="mapbox://styles/mapbox/satellite-streets-v12">Satellite</option>
              <option value="mapbox://styles/mapbox/outdoors-v12">Outdoors</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="relative flex-grow" style={{ height: '700px', minHeight: '600px' }}>
        {!mapboxToken ? (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400 font-medium mb-2">Mapbox API key is missing</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Please add NEXT_PUBLIC_MAPBOX_TOKEN to your environment variables</p>
            </div>
          </div>
        ) : mapError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400 font-medium mb-2">Map failed to load</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{mapError}</p>
              <button 
                onClick={() => setMapError(null)} 
                className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-md text-sm hover:bg-primary-600"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <Map
            ref={mapRef}
            mapboxAccessToken={mapboxToken}
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            mapStyle={mapStyle}
            style={{ width: '100%', height: '100%' }}
            interactiveLayerIds={['point-layer', 'contour-layer']}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onError={err => {
              console.error('Map error:', err);
              setMapError(err.message || 'Failed to load map');
            }}
            terrain={mapLayers.terrain ? { source: 'mapbox-dem', exaggeration: 1.5 } : null}
            reuseMaps
          >
            {/* Standard navigation controls */}
            <GeolocateControl position="top-right" positionOptions={{ enableHighAccuracy: true }} trackUserLocation />
            <NavigationControl position="top-right" />
            <ScaleControl position="bottom-right" />
            <FullscreenControl position="top-right" />
            
            {/* Add terrain and sky layer for improved 3D visualization */}
            {mapLayers.terrain && (
              <>
                <Source
                  id="mapbox-dem"
                  type="raster-dem"
                  url="mapbox://mapbox.mapbox-terrain-dem-v1"
                  tileSize={512}
                  maxzoom={14}
                />
                <Layer 
                  id="sky-layer"
                  type="sky"
                  paint={{
                    'sky-type': 'atmosphere',
                    'sky-atmosphere-sun': [0.0, 0.0],
                    'sky-atmosphere-sun-intensity': 15
                  }}
                />
              </>
            )}
            
            {/* Enhanced heatmap layer with time dimension */}
            {(showHeatmap || mapLayers.heatmap) && (
              <Source type="geojson" data={generateHeatmapData()}>
                <Layer
                  id="heatmap-layer"
                  type="heatmap"
                  paint={{
                    'heatmap-weight': ['get', 'weight'],
                    'heatmap-intensity': 1,
                    'heatmap-color': [
                      'interpolate',
                      ['linear'],
                      ['heatmap-density'],
                      0, 'rgba(0, 0, 255, 0)',
                      0.2, 'rgb(0, 255, 0)',
                      0.4, 'rgb(255, 255, 0)',
                      0.6, 'rgb(255, 153, 0)',
                      0.8, 'rgb(255, 0, 0)',
                      1, 'rgb(153, 0, 76)'
                    ],
                    'heatmap-radius': 20,
                    'heatmap-opacity': 0.7
                  }}
                />
              </Source>
            )}
            
            {/* 3D Extrusion layer for better data visualization */}
            {mapLayers.contour && (
              <Source
                id="contour-data"
                type="geojson"
                data={generateHeatmapData()}
              >
                <Layer
                  id="contour-layer"
                  type="fill-extrusion"
                  paint={{
                    'fill-extrusion-color': [
                      'interpolate',
                      ['linear'],
                      ['get', 'weight'],
                      0, '#4CAF50',
                      12, '#FFEB3B',
                      35.4, '#FF9800', 
                      55.4, '#F44336',
                      150.4, '#9C27B0',
                      250.4, '#7E0023'
                    ],
                    'fill-extrusion-height': [
                      'interpolate',
                      ['linear'],
                      ['get', 'weight'],
                      0, 0,
                      250, 10000
                    ],
                    'fill-extrusion-opacity': 0.7,
                    'fill-extrusion-base': 0
                  }}
                />
              </Source>
            )}
            
            {/* Advanced 3D Buildings layer with dynamic coloring */}
            {mapLayers.buildings && (
              <Layer
                id="3d-buildings"
                source="composite"
                sourceLayer="building"
                filter={['==', 'extrude', 'true']}
                type="fill-extrusion"
                minzoom={15}
                paint={{
                  'fill-extrusion-color': isDarkMode ? 
                    ['interpolate', ['linear'], ['zoom'], 15, '#aaa', 20, '#888'] : 
                    ['interpolate', ['linear'], ['zoom'], 15, '#ddd', 20, '#bbb'],
                  'fill-extrusion-height': [
                    'interpolate', ['linear'], ['zoom'],
                    15, 0,
                    16, ['get', 'height']
                  ],
                  'fill-extrusion-base': ['get', 'min_height'],
                  'fill-extrusion-opacity': 0.6
                }}
              />
            )}
            
            {/* Render markers for each data point */}
            {data.map(device => {
              if (!device.latitude || !device.longitude) return null;
              
              const value = device[selectedMetric];
              const color = getColorForValue(value, selectedMetric);
              const size = getSizeForValue(value, selectedMetric);
              const isActive = activeDevice === device.deviceId;
              
              return (
                <div key={device.deviceId}>
                  <div 
                    className={`absolute cursor-pointer transition-all duration-300 rounded-full flex items-center justify-center ${isActive ? 'z-20' : 'z-10'}`}
                    style={{
                      left: 'calc(50% + ' + (viewState.longitude - device.longitude) * -10000 / Math.pow(2, viewState.zoom) + 'px)',
                      top: 'calc(50% + ' + (viewState.latitude - device.latitude) * 10000 / Math.pow(2, viewState.zoom) + 'px)',
                      width: `${size}px`,
                      height: `${size}px`,
                      backgroundColor: color,
                      border: isActive ? '3px solid white' : '1px solid rgba(255, 255, 255, 0.8)',
                      boxShadow: isActive ? '0 0 0 2px rgba(0, 0, 0, 0.3)' : 'none',
                      transform: 'translate(-50%, -50%)'
                    }}
                    onClick={() => handleDeviceClick(device)}
                  >
                    {isActive && (
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                      </span>
                    )}
                  </div>
                  
                  {(popupInfo && popupInfo.deviceId === device.deviceId) && (
                    <Popup
                      latitude={device.latitude}
                      longitude={device.longitude}
                      anchor="bottom"
                      offset={[0, -5]}
                      closeButton={true}
                      closeOnClick={false}
                      onClose={() => setPopupInfo(null)}
                      className="z-30"
                      maxWidth="300px"
                    >
                      <div className="p-2 max-w-xs">
                        <h3 className="font-semibold text-sm mb-1">Device: {device.deviceId}</h3>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-600">PM2.5:</span>
                            <span className="font-medium">{getValueLabel(device.pm25Standard, 'pm25Standard')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">PM10:</span>
                            <span className="font-medium">{getValueLabel(device.pm10Standard, 'pm10Standard')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Temperature:</span>
                            <span className="font-medium">{getValueLabel(device.temperature, 'temperature')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Humidity:</span>
                            <span className="font-medium">{getValueLabel(device.relativeHumidity, 'relativeHumidity')}</span>
                          </div>
                          {device.iaq !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">IAQ:</span>
                              <span className="font-medium">{getValueLabel(device.iaq, 'iaq')}</span>
                            </div>
                          )}
                          {device.datetime && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Last Update:</span>
                              <span className="font-medium">{new Date(device.datetime).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">Air Quality:</span>
                            <span 
                              className="text-xs font-semibold px-2 py-1 rounded"
                              style={{ 
                                backgroundColor: getColorForValue(device.pm25Standard, 'pm25Standard'),
                                color: device.pm25Standard > 35.4 ? 'white' : 'black'
                              }}
                            >
                              {getAQICategory(device.pm25Standard, 'pm25Standard')}
                            </span>
                          </div>
                        </div>
                        
                        {/* Render mini chart if we have history data */}
                        {renderDeviceMiniChart()}
                        
                        {/* Additional actions */}
                        <div className="mt-2 flex space-x-2 justify-end">
                          <button 
                            onClick={() => {
                              if (compareMode) {
                                setComparedDevices(prev => {
                                  if (prev.some(d => d.deviceId === device.deviceId)) return prev;
                                  return [...prev, device].slice(0, 3);
                                });
                              }
                            }}
                            className={`text-xs px-2 py-1 rounded ${
                              compareMode ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                            disabled={!compareMode}
                          >
                            Compare
                          </button>
                          <button 
                            onClick={() => {
                              // Center and zoom to this device
                              setViewState({
                                ...viewState,
                                latitude: device.latitude,
                                longitude: device.longitude,
                                zoom: 16,
                                transitionDuration: 1000
                              });
                            }}
                            className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded"
                          >
                            Zoom
                          </button>
                        </div>
                      </div>
                    </Popup>
                  )}
                </div>
              );
            })}
            
            {hoverInfo && !popupInfo && (
              <div 
                className="absolute pointer-events-none bg-white dark:bg-gray-800 shadow-lg rounded-md p-2 z-30 text-xs max-w-xs"
                style={{
                  left: 'calc(50% + ' + (viewState.longitude - hoverInfo.longitude) * -10000 / Math.pow(2, viewState.zoom) + 'px)',
                  top: 'calc(50% + ' + (viewState.latitude - hoverInfo.latitude) * 10000 / Math.pow(2, viewState.zoom) - 50 + 'px)',
                  transform: 'translate(-50%, -100%)'
                }}
              >
                <div className="text-gray-700 dark:text-gray-200">
                  {selectedMetric === 'pm25Standard' && <div><strong>PM2.5:</strong> {getValueLabel(hoverInfo.value, selectedMetric)}</div>}
                  {selectedMetric === 'pm10Standard' && <div><strong>PM10:</strong> {getValueLabel(hoverInfo.value, selectedMetric)}</div>}
                  {selectedMetric === 'temperature' && <div><strong>Temperature:</strong> {getValueLabel(hoverInfo.value, selectedMetric)}</div>}
                  {selectedMetric === 'relativeHumidity' && <div><strong>Humidity:</strong> {getValueLabel(hoverInfo.value, selectedMetric)}</div>}
                  {selectedMetric === 'iaq' && <div><strong>IAQ:</strong> {getValueLabel(hoverInfo.value, selectedMetric)}</div>}
                  {(selectedMetric === 'pm25Standard' || selectedMetric === 'pm10Standard' || selectedMetric === 'iaq') && (
                    <div className="mt-1">
                      <span 
                        className="inline-block px-1 rounded text-xs"
                        style={{ 
                          backgroundColor: getColorForValue(hoverInfo.value, selectedMetric),
                          color: hoverInfo.value > 35.4 ? 'white' : 'black'
                        }}
                      >
                        {getAQICategory(hoverInfo.value, selectedMetric)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Map>
        )}
        
        {/* Render the filter panel */}
        {renderFilterPanel()}
        
        {/* Render timeline if enabled */}
        {timelineVisible && timeSeriesData.length > 0 && (
          <div className="absolute bottom-10 left-0 right-0 bg-white dark:bg-gray-800 bg-opacity-90 dark:bg-opacity-90 p-4 z-20 shadow-lg rounded-t-lg mx-8">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">Time-based Analysis</h3>
                <button 
                  onClick={() => setTimelineVisible(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2 rounded-full bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                >
                  {isPlaying ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  )}
                </button>
                
                <div className="relative flex-1">
                  <input 
                    type="range" 
                    min="0" 
                    max={timeSeriesData.length > 0 ? [...new Set(timeSeriesData.map(item => item.datetime))].sort().length - 1 : 100} 
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    onChange={(e) => {
                      const index = parseInt(e.target.value);
                      const timestamps = [...new Set(timeSeriesData.map(item => item.datetime))].sort();
                      if (timestamps[index]) {
                        // Filter data to this timestamp
                        const timestamp = timestamps[index];
                        const pointsAtTime = data.filter(item => item.datetime === timestamp);
                        // Update visualization with filtered points
                        console.log(`Showing data from ${new Date(timestamp).toLocaleString()}`);
                      }
                    }}
                  />
                  <div className="absolute -top-6 left-0 right-0 text-xs text-gray-600 dark:text-gray-300 flex justify-between">
                    <span>
                      {timeSeriesData.length > 0 
                        ? new Date([...new Set(timeSeriesData.map(item => item.datetime))].sort()[0]).toLocaleDateString() 
                        : ''}
                    </span>
                    <span>
                      {timeSeriesData.length > 0 
                        ? new Date([...new Set(timeSeriesData.map(item => item.datetime))].sort().pop()).toLocaleDateString() 
                        : ''}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  <button 
                    onClick={() => setAnimationSpeed(prev => Math.max(0.5, prev - 0.5))}
                    className="p-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    disabled={animationSpeed <= 0.5}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 13H5v-2h14v2z"/>
                    </svg>
                  </button>
                  <span className="text-xs font-medium w-8 text-center text-gray-600 dark:text-gray-300">{animationSpeed}x</span>
                  <button 
                    onClick={() => setAnimationSpeed(prev => Math.min(5, prev + 0.5))}
                    className="p-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    disabled={animationSpeed >= 5}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Render comparison chart if in compare mode */}
        {renderComparisonChart()}
      </div>
      
      {showLegend && (
        <div className={`mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 px-2 text-xs ${
          legendPosition === 'bottom' ? 'order-last' : 'order-first mb-3'
        }`}>
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
              <span className="text-gray-700 dark:text-gray-300">Hazardous ({'>'}250.4)</span>
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
              <span className="text-gray-700 dark:text-gray-300">Very Hot ({'>'}35°C)</span>
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
              <span className="text-gray-700 dark:text-gray-300">Very Humid ({'>'}85%)</span>
            </div>
          </>
        )}
      </div>
      )}
    </div>
  );
}