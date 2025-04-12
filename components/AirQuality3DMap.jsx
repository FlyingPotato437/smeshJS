"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Map, { 
  Source, 
  Layer, 
  Popup, 
  NavigationControl,
  FullscreenControl,
  ScaleControl,
  GeolocateControl 
} from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { XCircleIcon, EyeIcon, EyeSlashIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline';

// Note: Replace with your actual Mapbox token or use environment variable
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

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

// Helper function to get display name and units for metrics
const getMetricInfo = (metric) => {
  const metricMap = {
    pm25Standard: { name: "PM2.5", unit: "μg/m³", description: "Fine particulate matter" },
    pm10Standard: { name: "PM10", unit: "μg/m³", description: "Coarse particulate matter" },
    temperature: { name: "Temperature", unit: "°C", description: "Ambient temperature" },
    relativeHumidity: { name: "Humidity", unit: "%", description: "Relative humidity" }
  };
  return metricMap[metric] || { name: metric, unit: "", description: "" };
};

export default function AirQuality3DMap({
  data = [],
  activeDevice = null,
  onDeviceClick = () => {},
  timeSeriesData = [],
  darkMode = false
}) {
  const [viewState, setViewState] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    zoom: 10,
    pitch: 45,
    bearing: 0
  });
  const [selectedMetric, setSelectedMetric] = useState('pm25Standard');
  const [popupInfo, setPopupInfo] = useState(null);
  const [showLegend, setShowLegend] = useState(true);
  const [show3D, setShow3D] = useState(true);
  const [showBuildings, setShowBuildings] = useState(true);
  const [showTerrain, setShowTerrain] = useState(true);
  const [mapStyle, setMapStyle] = useState(darkMode ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11');
  const mapRef = useRef(null);

  // Available metrics for selection
  const metrics = [
    { value: 'pm25Standard', label: 'PM2.5' },
    { value: 'pm10Standard', label: 'PM10' },
    { value: 'temperature', label: 'Temperature' },
    { value: 'relativeHumidity', label: 'Humidity' }
  ];

  // Map style options
  const mapStyles = [
    { value: 'mapbox://styles/mapbox/light-v11', label: 'Light' },
    { value: 'mapbox://styles/mapbox/dark-v11', label: 'Dark' },
    { value: 'mapbox://styles/mapbox/streets-v12', label: 'Streets' },
    { value: 'mapbox://styles/mapbox/satellite-streets-v12', label: 'Satellite' },
    { value: 'mapbox://styles/mapbox/outdoors-v12', label: 'Outdoors' }
  ];

  // Convert data to GeoJSON format for the heatmap
  const heatmapData = useMemo(() => {
    if (!data || data.length === 0) return { type: 'FeatureCollection', features: [] };

    const features = data
      .filter(item => 
        item.latitude && 
        item.longitude && 
        !isNaN(Number(item.latitude)) && 
        !isNaN(Number(item.longitude))
      )
      .map(item => {
        // Get the metric value, accounting for field name differences
        let metricValue = null;
        
        // Check camelCase version
        if (item[selectedMetric] !== undefined && item[selectedMetric] !== null) {
          metricValue = item[selectedMetric];
        } 
        // Check lowercase version
        else if (item[selectedMetric.toLowerCase()] !== undefined && item[selectedMetric.toLowerCase()] !== null) {
          metricValue = item[selectedMetric.toLowerCase()];
        }

        return {
          type: 'Feature',
          properties: {
            ...item,
            metricValue
          },
          geometry: {
            type: 'Point',
            coordinates: [Number(item.longitude), Number(item.latitude)]
          }
        };
      })
      .filter(feature => feature.properties.metricValue !== null);

    return {
      type: 'FeatureCollection',
      features
    };
  }, [data, selectedMetric]);

  // Create point layer for individual data points
  const heatmapPointLayer = {
    id: 'data-points',
    type: 'circle',
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        8, 3,
        14, 15
      ],
      'circle-color': [
        'interpolate',
        ['linear'],
        ['get', 'metricValue'],
        // For PM2.5
        ...(selectedMetric === 'pm25Standard' ? [
          0, '#00ff00',
          12.1, '#ffff00',
          35.5, '#ff9900',
          55.5, '#ff0000',
          150.5, '#990066',
          250.5, '#660000'
        ] : 
        // For PM10
        selectedMetric === 'pm10Standard' ? [
          0, '#00ff00',
          54.1, '#ffff00',
          154.1, '#ff9900',
          254.1, '#ff0000',
          354.1, '#990066',
          424.1, '#660000'
        ] : 
        // For Temperature
        selectedMetric === 'temperature' ? [
          -10, '#0000ff',
          0, '#00ffff',
          10, '#00ff00',
          20, '#ffff00',
          30, '#ff9900',
          40, '#ff0000'
        ] : 
        // For Humidity
        [
          0, '#ff0000',
          20, '#ff9900',
          40, '#ffff00',
          60, '#00ff00',
          80, '#00ffff'
        ])
      ],
      'circle-opacity': 0.8,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-opacity': 0.5
    }
  };

  // 3D extrusion layer based on metric values
  const extrusionLayer = {
    id: 'data-extrusion',
    type: 'fill-extrusion',
    source: 'air-quality-data',
    filter: ['has', 'metricValue'],
    paint: {
      'fill-extrusion-color': [
        'interpolate',
        ['linear'],
        ['get', 'metricValue'],
        // Same color scale as points
        ...(selectedMetric === 'pm25Standard' ? [
          0, '#00ff00',
          12.1, '#ffff00',
          35.5, '#ff9900',
          55.5, '#ff0000',
          150.5, '#990066',
          250.5, '#660000'
        ] : 
        selectedMetric === 'pm10Standard' ? [
          0, '#00ff00',
          54.1, '#ffff00',
          154.1, '#ff9900',
          254.1, '#ff0000',
          354.1, '#990066',
          424.1, '#660000'
        ] : 
        selectedMetric === 'temperature' ? [
          -10, '#0000ff',
          0, '#00ffff',
          10, '#00ff00',
          20, '#ffff00',
          30, '#ff9900',
          40, '#ff0000'
        ] : 
        [
          0, '#ff0000',
          20, '#ff9900',
          40, '#ffff00',
          60, '#00ff00',
          80, '#00ffff'
        ])
      ],
      'fill-extrusion-height': [
        'interpolate',
        ['linear'],
        ['get', 'metricValue'],
        0, 100,
        250, 5000
      ],
      'fill-extrusion-base': 0,
      'fill-extrusion-opacity': 0.7
    }
  };

  // 3D buildings layer
  const buildingsLayer = {
    id: '3d-buildings',
    source: 'composite',
    'source-layer': 'building',
    type: 'fill-extrusion',
    minzoom: 15,
    paint: {
      'fill-extrusion-color': darkMode ? '#aaa' : '#ddd',
      'fill-extrusion-height': [
        'interpolate', ['linear'], ['zoom'],
        15, 0,
        16, ['get', 'height']
      ],
      'fill-extrusion-base': ['get', 'min_height'],
      'fill-extrusion-opacity': 0.6
    }
  };

  // Sky layer for better visual context in 3D
  const skyLayer = {
    id: 'sky',
    type: 'sky',
    paint: {
      'sky-type': 'atmosphere',
      'sky-atmosphere-sun': [0.0, 0.0],
      'sky-atmosphere-sun-intensity': 15
    }
  };

  // Handle point click
  const handlePointClick = useCallback((e) => {
    const features = e.features || [];
    if (features.length > 0) {
      const properties = features[0].properties;
      setPopupInfo({
        longitude: e.lngLat.lng,
        latitude: e.lngLat.lat,
        ...properties
      });
      
      if (properties.deviceId) {
        onDeviceClick(properties.deviceId);
      }
    }
  }, [onDeviceClick]);

  // Get formatted value display
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

  // Get AQI category based on value and metric
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
    
    return '';
  }, []);

  // Get metric display name
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

  // Get color for a specific value based on metric
  const getColorForValue = useCallback((value, metric) => {
    if (value === null || value === undefined) return '#888888'; // Default color for missing data
    
    value = Number(value);
    if (isNaN(value)) return '#888888'; // Default color for invalid values
    
    const scale = colorScales[metric];
    if (!scale) return '#888888';
    
    // Find the color based on threshold
    for (let i = scale.length - 1; i >= 0; i--) {
      if (value >= scale[i].threshold) {
        return scale[i].color;
      }
    }
    
    return scale[0].color; // Fallback to first color
  }, []);

  // Timeline slider for temporal data
  const renderTimeline = () => {
    if (!timeSeriesData || timeSeriesData.length === 0) return null;
    
    // Get unique dates from time series data
    const uniqueDates = [...new Set(
      timeSeriesData.map(item => new Date(item.datetime).toLocaleDateString())
    )].sort((a, b) => new Date(a) - new Date(b));
    
    if (uniqueDates.length <= 1) return null;
    
    return (
      <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 w-4/5 max-w-3xl bg-white dark:bg-gray-800 rounded-md shadow-lg p-3 z-10">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
          Time Range: {uniqueDates[0]} - {uniqueDates[uniqueDates.length - 1]}
        </label>
        <input 
          type="range" 
          min="0" 
          max={uniqueDates.length - 1} 
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          // Add functionality to update data based on selected time
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>{uniqueDates[0]}</span>
          <span>{uniqueDates[Math.floor(uniqueDates.length / 2)]}</span>
          <span>{uniqueDates[uniqueDates.length - 1]}</span>
        </div>
      </div>
    );
  };

  // Handle mouse enter on data point
  const handleMouseEnter = (e) => {
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = 'pointer';
    }
  };

  // Handle mouse leave on data point
  const handleMouseLeave = (e) => {
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = '';
    }
  };

  return (
    <div className={`relative w-full h-full ${darkMode ? 'dark' : ''}`}>
      {/* Controls panel */}
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
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
          onClick={() => setShow3D(!show3D)}
          title={show3D ? "2D View" : "3D View"}
        >
          <span className="sr-only">{show3D ? "2D View" : "3D View"}</span>
          <ArrowsPointingOutIcon className="h-5 w-5" />
        </button>
      </div>
      
      {/* Metric and map style selectors */}
      <div className="absolute top-4 left-4 z-10 flex flex-col space-y-2">
        <div className={`p-2 rounded-md shadow-sm ${
          darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
        }`}>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="form-select text-sm rounded-md border-0 focus:ring-2 focus:ring-blue-500 bg-transparent"
          >
            {metrics.map(metric => (
              <option key={metric.value} value={metric.value}>
                {metric.label}
              </option>
            ))}
          </select>
        </div>

        <div className={`p-2 rounded-md shadow-sm ${
          darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
        }`}>
          <select
            value={mapStyle}
            onChange={(e) => setMapStyle(e.target.value)}
            className="form-select text-sm rounded-md border-0 focus:ring-2 focus:ring-blue-500 bg-transparent"
          >
            {mapStyles.map(style => (
              <option key={style.value} value={style.value}>
                {style.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className={`absolute bottom-4 left-4 z-10 p-3 rounded-md shadow-lg ${
          darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
        }`}>
          <h4 className="font-semibold mb-2">{getMetricDisplayName(selectedMetric)}</h4>
          <div className="text-xs mb-1">{getMetricInfo(selectedMetric).description}</div>
          <div className="space-y-1">
            {colorScales[selectedMetric]?.map((item, index) => (
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
      )}

      {/* Time slider */}
      {renderTimeline()}

      {/* Main Map */}
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle={mapStyle}
        mapboxAccessToken={MAPBOX_TOKEN}
        interactiveLayerIds={['data-points']}
        onClick={handlePointClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ width: '100%', height: '100%' }}
        pitch={show3D ? 45 : 0}
      >
        <GeolocateControl position="top-left" />
        <FullscreenControl position="top-left" />
        <NavigationControl position="top-left" />
        <ScaleControl />

        {/* Terrain source and layer for 3D topography */}
        {showTerrain && show3D && (
          <>
            <Source
              id="mapbox-dem"
              type="raster-dem"
              url="mapbox://mapbox.mapbox-terrain-dem-v1"
              tileSize={512}
              maxzoom={14}
            />
            <Layer
              id="terrain-3d"
              type="hillshade"
              source="mapbox-dem"
              paint={{
                'hillshade-illumination-direction': 315,
                'hillshade-exaggeration': 0.5
              }}
            />
          </>
        )}

        {/* Buildings layer */}
        {showBuildings && show3D && (
          <Layer {...buildingsLayer} />
        )}

        {/* Air quality data source */}
        <Source id="air-quality-data" type="geojson" data={heatmapData}>
          {/* Point layer */}
          <Layer {...heatmapPointLayer} />
          
          {/* 3D extrusion layer */}
          {show3D && (
            <Layer {...extrusionLayer} />
          )}
        </Source>

        {/* Sky layer for 3D view */}
        {show3D && (
          <Layer {...skyLayer} />
        )}

        {/* Popup for clicked point */}
        {popupInfo && (
          <Popup
            longitude={Number(popupInfo.longitude)}
            latitude={Number(popupInfo.latitude)}
            anchor="bottom"
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            closeOnClick={false}
            className="custom-popup"
          >
            <div className="p-3 max-w-xs">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-base flex items-center">
                  <span className="inline-block w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: getColorForValue(popupInfo.metricValue, selectedMetric) }}></span>
                  {popupInfo.name || popupInfo.deviceId || 'Air Quality Station'}
                </h3>
                <button 
                  onClick={() => setPopupInfo(null)}
                  className="text-gray-500 hover:text-gray-800"
                >
                  <XCircleIcon className="h-5 w-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div>
                  <span className="text-gray-500 block mb-1 text-xs">PM2.5</span>
                  <span className="font-medium">{getValueLabel(popupInfo.pm25Standard, 'pm25Standard')}</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-1 text-xs">PM10</span>
                  <span className="font-medium">{getValueLabel(popupInfo.pm10Standard, 'pm10Standard')}</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-1 text-xs">Temperature</span>
                  <span className="font-medium">{getValueLabel(popupInfo.temperature, 'temperature')}</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-1 text-xs">Humidity</span>
                  <span className="font-medium">{getValueLabel(popupInfo.relativeHumidity, 'relativeHumidity')}</span>
                </div>
              </div>

              {popupInfo.timestamp && (
                <div className="text-xs text-gray-500 mt-2">
                  Last update: {new Date(popupInfo.timestamp).toLocaleString()}
                </div>
              )}

              <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Air Quality:</span>
                  <span 
                    className="text-xs font-semibold px-2 py-1 rounded"
                    style={{ 
                      backgroundColor: getColorForValue(popupInfo.pm25Standard, 'pm25Standard'),
                      color: popupInfo.pm25Standard > 35.4 ? 'white' : 'black'
                    }}
                  >
                    {getAQICategory(popupInfo.pm25Standard, 'pm25Standard')}
                  </span>
                </div>
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
} 