import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Popup,
  useMap,
  ZoomControl,
  Marker
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import CustomMarker from './CustomMarker';
import MetricSelector from './MetricSelector';
import ToggleSwitch from './ToggleSwitch';
import TimeFilter from './TimeFilter';
import ThemeToggle from './ThemeToggle';

// Stanford color palette
const STANFORD_COLORS = {
  // Primary colors
  cardinalRed: '#8C1515', // Stanford's primary red
  coolGrey: '#4D4F53',
  black: '#2e2d29',
  white: '#ffffff',
  
  // Secondary colors
  clay: '#5F574F',
  sandstone: '#D2C295',
  stone: '#928B81',
  fog: '#DAD7CB',
  sky: '#0098DB',
  
  // Accent colors  
  poppy: '#E04E39',
  purple: '#53284F',
  green: '#008566',
  lagunita: '#00505C',
  light: '#FAFAFA'
};

// Define the metricMapping in a consistent place
const metricMapping = {
  'pm25': 'pm25standard',
  'pm10': 'pm10standard',
  'temperature': 'temperature',
  'humidity': 'relativehumidity'
};

const metricDisplayNames = {
  'pm25': 'PM2.5',
  'pm10': 'PM10',
  'temperature': 'Temperature',
  'humidity': 'Humidity'
};

// Export the mapping for use in other components
export { metricMapping };

// Internal metric display names
const metricNames = {
  'pm25': 'PM2.5 (μg/m³)',
  'pm10': 'PM10 (μg/m³)',
  'temperature': 'Temperature (°C)',
  'humidity': 'Humidity (%)'
};

// Function to format timestamp for display
const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'Unknown Time';
  try {
    return new Date(timestamp).toLocaleString();
  } catch (e) {
    console.error('Error formatting timestamp:', e);
    return 'Invalid Date';
  }
};

// Function to format values based on metric type
const formatValue = (metric, value) => {
  if (value === undefined || value === null || isNaN(Number(value))) {
    return 'N/A';
  }
  
  const numValue = Number(value);
  
  switch (metric) {
    case 'pm25':
      return `${numValue.toFixed(1)} μg/m³`;
    case 'pm10':
      return `${numValue.toFixed(1)} μg/m³`;
    case 'temperature':
      return `${numValue.toFixed(1)} °C`;
    case 'humidity':
      return `${numValue.toFixed(1)} %`;
    default:
      return numValue.toFixed(2);
  }
};

// Component to update map view when markers change
const MapUpdater = ({ data, mapRef }) => {
  const map = useMap();
  
  useEffect(() => {
    try {
      // Skip if no data or map not ready
      if (!data || !Array.isArray(data) || data.length === 0 || !map || !mapRef.current) {
        console.log("MapUpdater: Unable to update map bounds - data or map not ready");
        return;
      }
      
      // Find valid coordinates for calculating bounds
      const validCoords = data
        .filter(point => 
          point && 
          typeof point === 'object' &&
          point.latitude !== undefined && 
          point.longitude !== undefined && 
          !isNaN(parseFloat(point.latitude)) && 
          !isNaN(parseFloat(point.longitude)) &&
          // Exclude points with zero coordinates (often default values)
          !(parseFloat(point.latitude) === 0 && parseFloat(point.longitude) === 0)
        )
        .map(point => [
          parseFloat(point.latitude), 
          parseFloat(point.longitude)
        ]);
      
      console.log(`MapUpdater: Found ${validCoords.length} valid data points for map bounds`);
      
      if (validCoords.length > 0) {
        // Create bounds object and fit map to it
        const bounds = L.latLngBounds(validCoords);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      } else if (mapRef.current) {
        // If no valid coordinates, reset to default view
        console.log("MapUpdater: No valid coordinates, resetting to default view");
        mapRef.current.setView([37.7749, -122.4194], 5);
      }
    } catch (error) {
      console.error("MapUpdater: Error updating map bounds:", error);
      // Fallback to default view on error
      if (map) {
        map.setView([37.7749, -122.4194], 5);
      }
    }
  }, [data, map, mapRef]);
  
  return null;
};

// Create a custom wrapper for MarkerClusterGroup that properly handles cleanup
function CustomClusterGroup({ children, ...props }) {
  const clusterRef = useRef(null);
  
  // Cleanup effect to properly handle unmounting
  useEffect(() => {
    return () => {
      if (clusterRef.current) {
        // Clear all layers when unmounting to prevent instanceof errors
        clusterRef.current.clearLayers();
      }
    };
  }, []);
  
  return (
    <MarkerClusterGroup
      ref={clusterRef}
      chunkedLoading
      {...props}
    >
      {children}
    </MarkerClusterGroup>
  );
}

// Main map component
const MapComponent = ({ data = [], height = "600px" }) => {
  const [selectedMetric, setSelectedMetric] = useState('pm25');
  const [useClusters, setUseClusters] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [timeframe, setTimeframe] = useState('all');
  const [mapCenter, setMapCenter] = useState([37.7749, -122.4194]); // Default: San Francisco
  const [mapZoom, setMapZoom] = useState(5); // Default zoom level
  const [filteredData, setFilteredData] = useState([]);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const mapRef = useRef(null);
  
  // Fix icon references for Leaflet
  useEffect(() => {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    });
  }, []);
  
  // Handle metric change
  const handleMetricChange = (metric) => {
    setSelectedMetric(metric);
  };
  
  // Handle marker click
  const handleMarkerClick = (point) => {
    setSelectedPoint(point);
    // Could center map on the clicked point if desired
    // if (mapRef.current) {
    //   mapRef.current.setView([point.latitude, point.longitude], 14);
    // }
  };
  
  // Check for dark mode preference
  useEffect(() => {
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDarkMode);
    
    // Listen for changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Filter data based on selected timeframe
  useEffect(() => {
    if (!data || !Array.isArray(data)) {
      console.warn("MapComponent: Data is not an array or is null");
      setFilteredData([]);
      return;
    }
    
    console.log(`MapComponent: Filtering ${data.length} data points with timeframe ${timeframe}`);
    
    try {
      let filtered = [...data];
      
      // Apply time-based filtering if needed
      if (timeframe !== 'all') {
        const now = new Date();
        let cutoffDate;
        
        switch (timeframe) {
          case 'today':
            cutoffDate = new Date(now);
            cutoffDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            cutoffDate = new Date(now);
            cutoffDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            cutoffDate = new Date(now);
            cutoffDate.setMonth(now.getMonth() - 1);
            break;
          default:
            cutoffDate = null;
        }
        
        if (cutoffDate) {
          filtered = filtered.filter(point => {
            if (!point || !point.datetime) return false;
            try {
              const pointDate = new Date(point.datetime);
              return !isNaN(pointDate.getTime()) && pointDate >= cutoffDate;
            } catch (e) {
              console.error("Error parsing date:", e);
              return false;
            }
          });
        }
      }
      
      // Additional filtering for valid coordinates
      filtered = filtered.filter(point => {
        if (!point || typeof point !== 'object') return false;
        
        // Check for valid coordinates
        const lat = Number(point.latitude);
        const lng = Number(point.longitude);
        return !isNaN(lat) && !isNaN(lng) && !(lat === 0 && lng === 0);
      });
      
      console.log(`MapComponent: Filtered to ${filtered.length} valid data points`);
      setFilteredData(filtered);
    } catch (error) {
      console.error("Error filtering data:", error);
      setFilteredData([]);
    }
  }, [data, timeframe]);

  // Memoize cluster options for performance
  const clusterOptions = useMemo(() => ({
    chunkedLoading: true,
    maxClusterRadius: 80,
    spiderfyOnMaxZoom: true,
    disableClusteringAtZoom: 19
  }), []);
  
  return (
    <div className={`h-full w-full relative rounded-lg overflow-hidden ${isDarkMode ? 'dark' : ''}`}>
      <div className="absolute top-2 left-2 z-10 flex flex-col space-y-2">
        <MetricSelector value={selectedMetric} onChange={handleMetricChange} />
        <ToggleSwitch 
          label="Use Clusters" 
          checked={useClusters} 
          onChange={() => setUseClusters(!useClusters)} 
        />
        <TimeFilter 
          value={timeframe} 
          onChange={setTimeframe} 
        />
        <ThemeToggle 
          checked={isDarkMode} 
          onChange={() => setIsDarkMode(!isDarkMode)} 
        />
      </div>
      
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="h-full w-full"
        ref={(map) => { mapRef.current = map; }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={isDarkMode ? 
            'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          }
        />
        <ZoomControl position="bottomright" />
        
        {useClusters ? (
          <CustomClusterGroup>
            {filteredData.map((point, idx) => (
              <CustomMarker 
                key={`${point.id || idx}-${selectedMetric}`} 
                data={point} 
                selectedMetric={selectedMetric}
                onMarkerClick={handleMarkerClick}
              />
            ))}
          </CustomClusterGroup>
        ) : (
          <>
            {filteredData.map((point, idx) => (
              <CustomMarker 
                key={`${point.id || idx}-${selectedMetric}`} 
                data={point} 
                selectedMetric={selectedMetric}
                onMarkerClick={handleMarkerClick}
              />
            ))}
          </>
        )}
        
        <MapUpdater data={filteredData} mapRef={mapRef} />
      </MapContainer>
    </div>
  );
};

export default MapComponent;