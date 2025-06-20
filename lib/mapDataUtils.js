/**
 * Utility functions for map data processing - Fire Management and Air Quality
 */

/**
 * Normalize fire management data points to ensure consistent format and valid coordinates
 * @param {Array} dataPoints - Array of fire management readings
 * @returns {Array} Normalized data points
 */
export function normalizeFireData(dataPoints) {
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
      // Ensure all relevant fields are properly formatted for fire management
      return {
        // Essential fields
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
        unitId: String(point.burn_unit || point.id || ''),
        unitName: point.burn_unit || point.location_name || `Unit ${point.id || ''}`,
        locationName: point.location_name || 'Unknown Location',
        datetime: point.datetime || point.timestamp,
        
        // Fire management specific fields
        burnType: point.burn_type || 'Unknown',
        status: point.status || 'Unknown',
        acresPlanned: normalizeMetric(point.acres_planned),
        acresCompleted: normalizeMetric(point.acres_completed),
        riskLevel: point.risk_level || 'Low',
        
        // Weather and environmental metrics
        temperature: normalizeMetric(point.temperature),
        humidity: normalizeMetric(point.humidity),
        windSpeed: normalizeMetric(point.wind_speed),
        windDirection: point.wind_direction || '',
        fuelMoisture: normalizeMetric(point.fuel_moisture),
        
        // Crew and management
        crewSize: normalizeMetric(point.crew_size),
        burnBoss: point.burn_boss || '',
        objectives: point.objectives || '',
        
        // Keep reference to original data
        _original: point
      };
    });
}

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
 * @param {number|string} value - Metric value
 * @param {string} metricType - Type of metric (pm25, pm10, temperature, humidity, status, riskLevel, etc.)
 * @returns {string} Color in hex format
 */
export function getColorForValue(value, metricType) {
  if (value === null || value === undefined || (typeof value === 'number' && isNaN(value))) {
    return '#CCCCCC'; // Gray for missing data
  }
  
  // Handle categorical fire management metrics
  if (metricType === 'status') {
    switch (String(value).toLowerCase()) {
      case 'planned': return '#2563EB'; // Blue
      case 'in progress': return '#F59E0B'; // Orange
      case 'completed': return '#059669'; // Green
      case 'monitoring': return '#7C3AED'; // Purple
      case 'cancelled': return '#DC2626'; // Red
      default: return '#6B7280'; // Gray
    }
  }
  
  if (metricType === 'risklevel') {
    switch (String(value).toLowerCase()) {
      case 'low': return '#059669'; // Green
      case 'moderate': return '#F59E0B'; // Orange
      case 'high': return '#DC2626'; // Red
      case 'very high': return '#7F1D1D'; // Dark Red
      case 'extreme': return '#4C1D95'; // Dark Purple
      default: return '#6B7280'; // Gray
    }
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
      if (numValue <= 20) return '#DC2626'; // Very Dry - Red (fire risk)
      if (numValue <= 40) return '#F59E0B'; // Dry - Orange
      if (numValue <= 60) return '#059669'; // Moderate - Green
      if (numValue <= 80) return '#2563EB'; // Humid - Blue
      return '#7C3AED'; // Very Humid - Purple
      
    case 'windspeed':
      if (numValue <= 5) return '#059669'; // Light - Green
      if (numValue <= 10) return '#F59E0B'; // Moderate - Orange
      if (numValue <= 15) return '#DC2626'; // Strong - Red
      return '#7F1D1D'; // Very Strong - Dark Red
      
    case 'fuelmoisture':
      if (numValue <= 8) return '#DC2626'; // Very Dry - Red (high fire risk)
      if (numValue <= 12) return '#F59E0B'; // Dry - Orange
      if (numValue <= 16) return '#FBBF24'; // Moderate - Yellow
      if (numValue <= 20) return '#059669'; // Moist - Green
      return '#2563EB'; // Very Moist - Blue
      
    case 'acresplanned':
    case 'acrescompleted':
      if (numValue <= 50) return '#2563EB'; // Small - Blue
      if (numValue <= 150) return '#059669'; // Medium - Green
      if (numValue <= 300) return '#F59E0B'; // Large - Orange
      return '#DC2626'; // Very Large - Red
      
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
    // Air Quality Metrics
    pm25Standard: { name: "PM2.5", unit: "μg/m³", description: "Fine particulate matter" },
    pm10Standard: { name: "PM10", unit: "μg/m³", description: "Coarse particulate matter" },
    pm100Standard: { name: "PM100", unit: "μg/m³", description: "Large particulate matter" },
    relativeHumidity: { name: "Humidity", unit: "%", description: "Relative humidity" },
    pressure: { name: "Pressure", unit: "hPa", description: "Barometric pressure" },
    co2: { name: "CO₂", unit: "ppm", description: "Carbon dioxide" },
    voc: { name: "VOC", unit: "ppb", description: "Volatile organic compounds" },
    
    // Fire Management Metrics
    status: { name: "Status", unit: "", description: "Current burn status" },
    riskLevel: { name: "Risk Level", unit: "", description: "Fire safety risk assessment" },
    burnType: { name: "Burn Type", unit: "", description: "Type of prescribed fire" },
    acresPlanned: { name: "Acres Planned", unit: "acres", description: "Planned burn area" },
    acresCompleted: { name: "Acres Completed", unit: "acres", description: "Completed burn area" },
    temperature: { name: "Temperature", unit: "°F", description: "Ambient temperature" },
    humidity: { name: "Humidity", unit: "%", description: "Relative humidity" },
    windSpeed: { name: "Wind Speed", unit: "mph", description: "Wind speed" },
    windDirection: { name: "Wind Direction", unit: "", description: "Wind direction" },
    fuelMoisture: { name: "Fuel Moisture", unit: "%", description: "Vegetation moisture content" },
    crewSize: { name: "Crew Size", unit: "people", description: "Number of crew members" },
    burnBoss: { name: "Burn Boss", unit: "", description: "Lead fire manager" },
    locationName: { name: "Location", unit: "", description: "Fire management area" },
    unitName: { name: "Burn Unit", unit: "", description: "Designated burn unit" }
  };
  
  return metricMap[metric] || { name: metric, unit: "", description: "" };
}
