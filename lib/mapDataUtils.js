/**
 * Utility functions for map data processing
 */

/**
 * Normalize sensor data points to ensure consistent format and valid coordinates
 * @param {Array} dataPoints - Array of sensor readings
 * @returns {Array} Normalized data points
 */
export function normalizeSensorData(dataPoints) {
  if (!dataPoints || !Array.isArray(dataPoints)) return [];

  return dataPoints
    .filter(point => {
      // Filter out points with missing or invalid coordinates
      const hasLat = point.latitude !== undefined && point.latitude !== null;
      const hasLng = point.longitude !== undefined && point.longitude !== null;
      const isValidLat = !isNaN(Number(point.latitude)) && 
                         Math.abs(Number(point.latitude)) > 0.001 && 
                         Math.abs(Number(point.latitude)) < 90;
      const isValidLng = !isNaN(Number(point.longitude)) && 
                         Math.abs(Number(point.longitude)) > 0.001 && 
                         Math.abs(Number(point.longitude)) < 180;
      
      return hasLat && hasLng && isValidLat && isValidLng;
    })
    .map(point => {
      // Ensure all relevant fields are properly formatted
      return {
        // Essential fields
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
        deviceId: String(point.deviceId || point.device_id || point.from_node || ''),
        deviceName: point.deviceName || point.device_name || point.from_node || `Device ${point.device_id || ''}`,
        datetime: point.datetime || point.timestamp,
        
        // Metric values - normalize to numbers where possible
        pm25Standard: normalizeMetric(point.pm25Standard || point.pm25 || point.PM25),
        pm10Standard: normalizeMetric(point.pm10Standard || point.pm10 || point.PM10),
        temperature: normalizeMetric(point.temperature || point.temp),
        relativeHumidity: normalizeMetric(point.relativeHumidity || point.humidity || point.rh),
        
        // Keep reference to original data
        _original: point
      };
    });
}

/**
 * Convert metric values to numbers if possible
 * @param {*} value - Input metric value
 * @returns {number|null} Normalized metric value
 */
function normalizeMetric(value) {
  if (value === undefined || value === null) return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

/**
 * Get color for a metric value based on standard thresholds
 * @param {number} value - Metric value
 * @param {string} metricType - Type of metric (pm25, pm10, temperature, humidity)
 * @returns {string} Color in hex format
 */
export function getColorForValue(value, metricType) {
  if (value === null || value === undefined || isNaN(value)) {
    return '#CCCCCC'; // Gray for missing data
  }
  
  const numValue = Number(value);
  
  switch (metricType) {
    case 'pm25':
      if (numValue <= 12) return '#00E400'; // Good
      if (numValue <= 35.4) return '#FFFF00'; // Moderate
      if (numValue <= 55.4) return '#FF7E00'; // Unhealthy for Sensitive Groups
      if (numValue <= 150.4) return '#FF0000'; // Unhealthy
      if (numValue <= 250.4) return '#99004C'; // Very Unhealthy
      return '#7E0023'; // Hazardous
      
    case 'pm10':
      if (numValue <= 54) return '#00E400'; // Good
      if (numValue <= 154) return '#FFFF00'; // Moderate
      if (numValue <= 254) return '#FF7E00'; // Unhealthy for Sensitive Groups
      if (numValue <= 354) return '#FF0000'; // Unhealthy
      if (numValue <= 424) return '#99004C'; // Very Unhealthy
      return '#7E0023'; // Hazardous
      
    case 'temperature':
      if (numValue <= 0) return '#0000FF'; // Very cold - Blue
      if (numValue <= 10) return '#00FFFF'; // Cold - Cyan
      if (numValue <= 20) return '#00FF00'; // Cool - Green
      if (numValue <= 25) return '#FFFF00'; // Moderate - Yellow
      if (numValue <= 30) return '#FF7E00'; // Warm - Orange
      return '#FF0000'; // Hot - Red
      
    case 'humidity':
      if (numValue <= 20) return '#FFFFCC'; // Very Dry
      if (numValue <= 40) return '#C7E9B4'; // Dry
      if (numValue <= 60) return '#7FCDBB'; // Moderate
      if (numValue <= 80) return '#41B6C4'; // Humid
      return '#225EA8'; // Very Humid
      
    default:
      // Default color scale for other metrics
      if (numValue <= 20) return '#00E400';
      if (numValue <= 40) return '#FFFF00';
      if (numValue <= 60) return '#FF7E00';
      if (numValue <= 80) return '#FF0000';
      return '#7E0023';
  }
}

/**
 * Get information about a metric (name, unit, description)
 * @param {string} metric - Metric identifier
 * @returns {Object} Metric information
 */
export function getMetricInfo(metric) {
  const metricMap = {
    pm25Standard: { name: "PM2.5", unit: "μg/m³", description: "Fine particulate matter" },
    pm10Standard: { name: "PM10", unit: "μg/m³", description: "Coarse particulate matter" },
    pm100Standard: { name: "PM100", unit: "μg/m³", description: "Large particulate matter" },
    temperature: { name: "Temperature", unit: "°C", description: "Ambient temperature" },
    relativeHumidity: { name: "Humidity", unit: "%", description: "Relative humidity" },
    pressure: { name: "Pressure", unit: "hPa", description: "Barometric pressure" },
    co2: { name: "CO₂", unit: "ppm", description: "Carbon dioxide" },
    voc: { name: "VOC", unit: "ppb", description: "Volatile organic compounds" }
  };
  
  return metricMap[metric] || { name: metric, unit: "", description: "" };
}
