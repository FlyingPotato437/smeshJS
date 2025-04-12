import React, { memo } from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { metricMapping } from './MapComponent';

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

// Get marker icon based on value and selected metric
function getMarkerIcon(value, metric) {
  // Default to PM2.5 if no metric specified
  const metricType = metric || 'pm25';
  
  // Different color thresholds based on metric type
  let color = '';
  let size = 10;
  
  if (metricType === 'pm25') {
    // PM2.5 thresholds (EPA standards)
    if (value <= 12) color = STANFORD_COLORS.green; // Good
    else if (value <= 35.4) color = STANFORD_COLORS.sky; // Moderate
    else if (value <= 55.4) color = STANFORD_COLORS.sandstone; // Unhealthy for Sensitive Groups
    else if (value <= 150.4) color = STANFORD_COLORS.poppy; // Unhealthy
    else if (value <= 250.4) color = STANFORD_COLORS.purple; // Very Unhealthy
    else color = STANFORD_COLORS.cardinalRed; // Hazardous
    
    // Size based on value (capped)
    size = Math.min(Math.max(value / 5, 8), 20);
  } 
  else if (metricType === 'pm10') {
    // PM10 thresholds
    if (value <= 54) color = STANFORD_COLORS.green; // Good
    else if (value <= 154) color = STANFORD_COLORS.sky; // Moderate
    else if (value <= 254) color = STANFORD_COLORS.sandstone; // Unhealthy for Sensitive Groups
    else if (value <= 354) color = STANFORD_COLORS.poppy; // Unhealthy
    else if (value <= 424) color = STANFORD_COLORS.purple; // Very Unhealthy
    else color = STANFORD_COLORS.cardinalRed; // Hazardous
    
    size = Math.min(Math.max(value / 10, 8), 20);
  }
  else if (metricType === 'temperature') {
    // Temperature thresholds (°C)
    if (value <= 0) color = '#2196F3'; // Very Cold
    else if (value <= 10) color = '#03A9F4'; // Cold
    else if (value <= 20) color = STANFORD_COLORS.green; // Comfortable
    else if (value <= 30) color = STANFORD_COLORS.sandstone; // Warm
    else if (value <= 35) color = STANFORD_COLORS.poppy; // Hot
    else color = STANFORD_COLORS.cardinalRed; // Very Hot
    
    size = Math.min(Math.max(value / 3 + 8, 8), 20);
  }
  else if (metricType === 'humidity') {
    // Humidity thresholds (%)
    if (value <= 20) color = STANFORD_COLORS.poppy; // Very Dry
    else if (value <= 30) color = STANFORD_COLORS.sandstone; // Dry
    else if (value <= 50) color = STANFORD_COLORS.green; // Comfortable
    else if (value <= 70) color = STANFORD_COLORS.sky; // Humid
    else color = STANFORD_COLORS.lagunita; // Very Humid
    
    size = Math.min(Math.max(value / 5, 8), 20);
  }
  else {
    // Default for any other metric
    color = STANFORD_COLORS.sky;
    size = 10;
  }
  
  return {
    color,
    size
  };
}

// Custom marker component
const CustomMarker = ({ data, selectedMetric, onMarkerClick }) => {
  // Skip rendering if invalid data
  if (!data || !data.latitude || !data.longitude || 
      isNaN(Number(data.latitude)) || isNaN(Number(data.longitude))) {
    console.warn("Invalid coordinate data for marker:", data);
    return null;
  }
  
  // Try to parse coordinates as numbers
  const lat = Number(data.latitude);
  const lng = Number(data.longitude);
  
  // Skip if coordinates are invalid after parsing
  if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
    console.warn("Zero or invalid coordinates for marker:", data);
    return null;
  }
  
  // Extract the correct metric value based on selected metric
  let metricValue = 0;
  
  // Handle different field name formats
  switch (selectedMetric) {
    case 'pm25':
      metricValue = parseFloat(data.pm25standard || data.pm25Standard || data.pm25 || data['PM2.5'] || 0);
      break;
    case 'pm10':
      metricValue = parseFloat(data.pm10standard || data.pm10Standard || data.pm10 || data['PM10'] || 0);
      break;
    case 'temperature':
      metricValue = parseFloat(data.temperature || data.temp || 0);
      break;
    case 'humidity':
      metricValue = parseFloat(data.relativehumidity || data.relativeHumidity || data.humidity || 0);
      break;
    default:
      metricValue = parseFloat(data.pm25standard || data.pm25Standard || data.pm25 || 0);
  }
  
  // Ensure metricValue is a valid number
  if (isNaN(metricValue)) metricValue = 0;
  
  const { color, size } = getMarkerIcon(metricValue, selectedMetric);
  
  try {
    return (
      <Marker 
        position={[lat, lng]} 
        icon={L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="
            background-color: ${color}; 
            width: ${size}px; 
            height: ${size}px; 
            border-radius: 50%; 
            border: 1px solid rgba(0,0,0,0.2);
            opacity: 0.9;
          "></div>`,
          iconSize: [size, size],
          iconAnchor: [size/2, size/2]
        })}
        eventHandlers={{
          click: () => {
            if (onMarkerClick) {
              onMarkerClick(data);
            }
          }
        }}
      />
    );
  } catch (error) {
    console.error("Error rendering marker:", error);
    return null;
  }
};

// Use memo to prevent unnecessary re-renders
const MemoizedCustomMarker = memo(CustomMarker);

// Add display name for debugging purposes
MemoizedCustomMarker.displayName = 'CustomMarker';

export default MemoizedCustomMarker; 