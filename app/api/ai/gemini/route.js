import { NextResponse } from 'next/server';

/**
 * POST handler for AI queries using Google Gemini
 * Enhanced to take initial analysis and provide final synthesis with large context window
 */
export async function POST(request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.warn('Gemini API key not configured. Using mock response.');
      return NextResponse.json(
        { 
          result: generateMockAIResponse(), 
          mockResponse: true,
          model: "mock-gemini" 
        },
        { status: 200 } // Return 200 with mock response for development
      );
    }
    
    const { query, data, initialAnalysis, hasGeoData } = await request.json();
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }
    
    // Validate data
    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: 'Valid data array is required' },
        { status: 400 }
      );
    }
    
    // Import the Gemini SDK only if API key is available
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Preprocess data to normalize field names
    const processedData = data.map(item => ({
      ...item,
      // Ensure consistent field naming (similar to llm5.py approach)
      pm25: item.pm25 || item.pm25Standard || item.pm2_5 || item['PM2.5'] || null,
      pm10: item.pm10 || item.pm10Standard || item['PM10'] || null,
      temperature: item.temperature || item.temp || null,
      humidity: item.humidity || item.relativeHumidity || null
    }));
    
    // Generate data statistics for context
    const statsContext = generateDataStats(processedData);
    
    // Configure Gemini model with larger context window and more tokens
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash-8b",
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 4000, // Increased for more detailed responses
      }
    });
    
    // Generate enhanced system prompt for synthesis
    const systemPrompt = createSystemPrompt(query);
    
    // Prepare geographic context if applicable
    const geoContext = hasGeoData 
      ? prepareGeographicContext(processedData)
      : "No geographic data available for spatial analysis.";
    
    // Calculate sample size based on total data - use more data for final synthesis
    let sampleSize = Math.min(processedData.length, 50);
    const limitedData = processedData.slice(0, sampleSize);
    
    // Generate content with enhanced prompt that includes initial analysis
    const prompt = `${systemPrompt}
      
You are the final synthesizer in a multi-stage AI analysis pipeline.

USER QUERY: ${query}

INITIAL ANALYSIS: ${initialAnalysis || "No initial analysis provided."}

GEOGRAPHIC CONTEXT: ${geoContext}

DATA STATISTICS:
${statsContext}

DATA SAMPLE (${processedData.length} records total, showing ${sampleSize}): 
${JSON.stringify(limitedData, null, 2)}

TASK:
1. Synthesize the final answer using all available context
2. Build upon the initial analysis, adding more depth and insights
3. Reference specific data points and statistics to support your conclusions
4. Organize your response with clear sections and formatting
5. Include health implications and actionable recommendations if relevant
6. End with 2-3 follow-up questions the user might want to ask

FORMAT YOUR RESPONSE for readability with clear sections and bullet points where appropriate.
`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return NextResponse.json({
      result: response.text(),
      model: "gemini-1.5-flash-8b"
    });
  } catch (error) {
    console.error('Error in Gemini query:', error);
    
    // If this is a development environment or API key isn't set
    if (!process.env.GEMINI_API_KEY || process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        result: generateMockAIResponse(),
        mockResponse: true,
        model: "mock-gemini"
      });
    }
    
    return NextResponse.json(
      { error: error.message || "An error occurred while processing your request" },
      { status: 500 }
    );
  }
}

/**
 * Create a tailored system prompt based on query content
 */
function createSystemPrompt(query) {
  const basePrompt = `You are an expert in indoor air quality analysis. Parse and analyze air quality data to provide accurate insights.`;
  
  // Add specialized instructions based on query content
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes('pm2.5') || queryLower.includes('pm 2.5')) {
    return `${basePrompt}
    
Focus on analyzing PM2.5 levels in relation to established health standards:
- WHO guidelines: 5 μg/m³ (annual), 15 μg/m³ (24-hour)
- EPA standards: 12 μg/m³ (annual), 35 μg/m³ (24-hour)

Interpret health implications:
- 0-12 μg/m³: Good - minimal health risk
- 12-35 μg/m³: Moderate - may affect sensitive individuals
- 35-55 μg/m³: Unhealthy for sensitive groups
- 55-150 μg/m³: Unhealthy - can affect general population
- 150-250 μg/m³: Very unhealthy - significant health impacts
- >250 μg/m³: Hazardous - serious health effects for everyone

When analyzing trends, include specific numerical findings and clear health recommendations.`;
  }
  
  if (queryLower.includes('correlation') || queryLower.includes('relationship')) {
    return `${basePrompt}
    
Analyze correlations between metrics using statistical approaches:
- Identify positive or negative correlations
- Quantify correlation strength when possible
- Explain potential causal relationships
- Consider environmental factors that might influence relationships
- Look for temporal patterns in correlations

Provide clear numerical values and explain the significance of findings.`;
  }
  
  if (queryLower.includes('location') || queryLower.includes('geographic') || queryLower.includes('where')) {
    return `${basePrompt}
    
Focus on spatial analysis of air quality data:
- Identify areas with highest and lowest pollution levels
- Analyze how elevation affects air quality measurements
- Look for patterns based on geographic coordinates
- Consider how proximity to features (urban areas, etc.) might impact readings
- Examine distribution of sensor locations if relevant

Provide specific geographic insights supported by the data.`;
  }
  
  if (queryLower.includes('time') || queryLower.includes('trend') || queryLower.includes('pattern')) {
    return `${basePrompt}
    
Analyze temporal patterns in air quality data:
- Identify daily, weekly, or seasonal trends if present
- Look for peak pollution times and potential causes
- Compare values across different time periods
- Evaluate variations and stable periods
- Consider how weather or human activity patterns might affect readings

Provide specific temporal insights supported by the data.`;
  }
  
  // Default prompt for general queries
  return `${basePrompt}
  
Provide a comprehensive analysis of the air quality data:
- Summarize key metrics and their health implications
- Identify notable patterns or anomalies
- Compare values to established health standards
- Include both quantitative findings and qualitative interpretation
- Offer practical recommendations based on the findings

Ensure your response is well-structured and easy to understand.`;
}

/**
 * Generate statistics from the data for context
 */
function generateDataStats(data) {
  if (!data || data.length === 0) {
    return "No data available for statistical analysis.";
  }
  
  try {
    // Extract date range
    const dates = data
      .filter(item => item.datetime)
      .map(item => new Date(item.datetime));
    
    const dateRange = dates.length > 0 
      ? {
          start: new Date(Math.min(...dates)),
          end: new Date(Math.max(...dates))
        } 
      : { start: null, end: null };
    
    // Calculate metrics for key fields
    const metrics = {
      pm25: calculateMetricStats(data, 'pm25'),
      pm10: calculateMetricStats(data, 'pm10'),
      temperature: calculateMetricStats(data, 'temperature'),
      humidity: calculateMetricStats(data, 'humidity')
    };
    
    // Format as a string for the prompt
    return `
Total Records: ${data.length}
Date Range: ${dateRange.start ? dateRange.start.toISOString().slice(0, 10) : 'N/A'} to ${dateRange.end ? dateRange.end.toISOString().slice(0, 10) : 'N/A'}

PM2.5 Statistics:
  - Average: ${metrics.pm25.avg} μg/m³
  - Min: ${metrics.pm25.min} μg/m³
  - Max: ${metrics.pm25.max} μg/m³
  - Standard Deviation: ${metrics.pm25.std} μg/m³

PM10 Statistics:
  - Average: ${metrics.pm10.avg} μg/m³
  - Min: ${metrics.pm10.min} μg/m³
  - Max: ${metrics.pm10.max} μg/m³
  - Standard Deviation: ${metrics.pm10.std} μg/m³

Temperature Statistics:
  - Average: ${metrics.temperature.avg} °C
  - Min: ${metrics.temperature.min} °C
  - Max: ${metrics.temperature.max} °C
  - Standard Deviation: ${metrics.temperature.std} °C

Humidity Statistics:
  - Average: ${metrics.humidity.avg} %
  - Min: ${metrics.humidity.min} %
  - Max: ${metrics.humidity.max} %
  - Standard Deviation: ${metrics.humidity.std} %
`;
  } catch (error) {
    console.error("Error generating data statistics:", error);
    return "Error calculating statistics on data.";
  }
}

/**
 * Calculate statistics for a specific metric from the data
 */
function calculateMetricStats(data, fieldName) {
  const values = data
    .map(item => item[fieldName])
    .filter(val => val !== undefined && val !== null && !isNaN(Number(val)))
    .map(val => Number(val));
  
  if (values.length === 0) {
    return { avg: 'N/A', min: 'N/A', max: 'N/A', std: 'N/A' };
  }
  
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  // Calculate standard deviation
  const sumSquaredDiff = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0);
  const std = Math.sqrt(sumSquaredDiff / values.length);
  
  return {
    avg: avg.toFixed(2),
    min: min.toFixed(2),
    max: max.toFixed(2),
    std: std.toFixed(2)
  };
}

/**
 * Prepare geographic context from data with lat/lng values
 */
function prepareGeographicContext(data) {
  // Filter data to include only records with valid coordinates
  const geoData = data.filter(item => 
    item && 
    typeof item === 'object' &&
    item.latitude !== undefined && 
    item.longitude !== undefined && 
    !isNaN(Number(item.latitude)) && 
    !isNaN(Number(item.longitude)) &&
    (Number(item.latitude) !== 0 || Number(item.longitude) !== 0)
  );
  
  if (geoData.length === 0) {
    return "No valid geographic coordinates found in the data.";
  }
  
  // Calculate center point
  const lats = geoData.map(item => Number(item.latitude));
  const lngs = geoData.map(item => Number(item.longitude));
  
  const centerLat = lats.reduce((sum, lat) => sum + lat, 0) / lats.length;
  const centerLng = lngs.reduce((sum, lng) => sum + lng, 0) / lngs.length;
  
  // Calculate bounding box
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  
  // Count the number of unique locations
  const uniqueLocations = new Set();
  geoData.forEach(item => {
    const locKey = `${item.latitude.toFixed(6)},${item.longitude.toFixed(6)}`;
    uniqueLocations.add(locKey);
  });
  
  return `
Geographic Summary:
- ${geoData.length} records with valid coordinates
- ${uniqueLocations.size} unique location points
- Center point: ${centerLat.toFixed(6)}, ${centerLng.toFixed(6)}
- Bounding box: 
  * Southwest: ${minLat.toFixed(6)}, ${minLng.toFixed(6)}
  * Northeast: ${maxLat.toFixed(6)}, ${maxLng.toFixed(6)}
  * Area size: ~${(Math.abs(maxLat - minLat) * Math.abs(maxLng - minLng) * 111 * 111).toFixed(2)} sq km
`;
}

/**
 * Generate a mock AI response for development and testing
 */
function generateMockAIResponse() {
  const responses = [
    "Based on the air quality data, PM2.5 levels average 18.3 μg/m³, which exceeds the WHO guideline of 12 μg/m³ but remains below the USEPA standard of 35 μg/m³. The highest concentrations were observed in the morning hours between 7-9am, suggesting a possible correlation with commuter traffic. Temperature and humidity appear to have a moderate negative correlation with PM2.5, with cleaner air typically observed during warmer, more humid periods. I recommend monitoring air quality during morning commute hours and considering air purification systems for sensitive individuals.",
    
    "The data shows significant spatial variation in air quality measurements. Locations at higher elevations generally show 15-20% lower PM10 concentrations compared to valley areas. Temperature averages 22.3°C across all measurements, falling within the ideal comfort range of 20-25°C. Humidity levels average 47%, also within the recommended 30-60% range for indoor comfort. The strongest correlation appears between PM2.5 and PM10 levels (r=0.87), suggesting common sources for these pollutants.",
    
    "Analysis reveals a cyclic pattern in air quality measurements, with PM2.5 and PM10 levels peaking during weekday mornings and evenings. Weekend readings average 26% lower than weekday readings. The data shows that 73% of measurements remain within acceptable air quality standards, though 27% exceed WHO guidelines for PM2.5. I recommend increasing ventilation during mid-day hours when pollution levels are typically at their lowest point.",
  ];
  
  // Return a random response from the list
  return responses[Math.floor(Math.random() * responses.length)];
} 