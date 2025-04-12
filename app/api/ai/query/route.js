import { NextResponse } from 'next/server';
import OpenAI from 'openai';

/**
 * POST handler for AI queries using OpenAI
 * Extracts API key from environment variables
 */
export async function POST(request) {
  // Get API key from environment variables
  const apiKey = process.env.OPENAI_API_KEY;
  
  // Check if OpenAI API key is configured
  if (!apiKey) {
    console.warn("OpenAI API key not configured, returning mock response");
    
    // For development, return a mock response
    return NextResponse.json({
      result: generateMockAIResponse(),
      model: "gpt-4o-mock",
      mockResponse: true
    }, { status: 200 });
  }
  
  try {
    // Parse the request body
    const body = await request.json();
    
    // Check if we have the expected format
    if (!body.query) {
      return NextResponse.json(
        { error: "Query is required in the request body" },
        { status: 400 }
      );
    }
    
    // Extract query and data from the request
    const { query, data = [] } = body;
    
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey,
    });
    
    // Process the data in a way that preserves important information while keeping token count manageable
    let dataToSend;
    let dataStats;
    
    if (Array.isArray(data) && data.length > 0) {
      const totalRecords = data.length;
      console.log(`Processing AI query on ${totalRecords} records`);
      
      // Generate statistics for all data
      dataStats = generateDataStats(data);
      
      if (totalRecords > 1000) {
        // For very large datasets, use a smarter sampling strategy
        // but include more data for better analysis
        
        // Get more samples from beginning, middle and end
        const beginning = data.slice(0, 50);
        const middle = data.slice(Math.floor(totalRecords / 2) - 25, Math.floor(totalRecords / 2) + 25);
        const end = data.slice(totalRecords - 50);
        
        // Find potential outliers (simple z-score approach)
        const findOutliers = (metric) => {
          const values = data.map(item => parseFloat(item[metric])).filter(val => !isNaN(val));
          if (values.length === 0) return [];
          
          const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
          const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
          const threshold = 2.5; // z-score threshold for outliers
          
          return data.filter(item => {
            const val = parseFloat(item[metric]);
            if (isNaN(val)) return false;
            const zScore = Math.abs((val - mean) / stdDev);
            return zScore > threshold;
          }).slice(0, 30); // Allow more outliers
        };
        
        // Get outliers for key metrics
        const pm25Outliers = findOutliers('pm25');
        const temperatureOutliers = findOutliers('temperature');
        const humidityOutliers = findOutliers('humidity');
        
        // Combine samples and outliers, removing duplicates
        const combinedSamples = [...beginning, ...middle, ...end, ...pm25Outliers, ...temperatureOutliers, ...humidityOutliers];
        const uniqueIds = new Set();
        dataToSend = combinedSamples.filter(item => {
          const id = item.id || item.deviceId || JSON.stringify(item);
          if (uniqueIds.has(id)) return false;
          uniqueIds.add(id);
          return true;
        }); // No arbitrary limit
        
        console.log(`Sampled ${dataToSend.length} representative records from dataset of ${totalRecords} total records`);
      } else {
        // For medium to smaller datasets, use all the data
        dataToSend = data;
        console.log(`Using all ${totalRecords} records for analysis`);
      }
    } else {
      dataToSend = [];
      dataStats = "No data available";
      console.warn("No data provided for analysis");
    }
    
    // Create a system prompt with enhanced data context
    const systemPrompt = createSystemPrompt(query);
    
    // Combine the statistics with the sampled data for API call
    const promptContent = `
Analysis Request: ${query}

Data Statistics Summary:
${dataStats}

Sample Data (${dataToSend.length} records${dataToSend.length < data.length ? ' from ' + data.length + ' total' : ''}):
${JSON.stringify(dataToSend, null, 2)}

Please analyze this data thoroughly and provide detailed insights in response to the query. Include numerical values, trends, patterns, and any significant findings. If relevant, suggest visualizations that would be helpful.`;
    
    // Call the OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: promptContent }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });
    
    // Extract the response
    const result = completion.choices[0].message.content;
    
    // Return the result along with model info
    return NextResponse.json({
      result,
      model: completion.model,
      usage: completion.usage
    });
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    
    // Check if we're in development or API key is missing
    if (process.env.NODE_ENV === 'development' || !apiKey) {
      return NextResponse.json({
        result: generateMockAIResponse(),
        model: "gpt-4o-mock",
        mockResponse: true
      }, { status: 200 });
    }
    
    // Return error in production
    return NextResponse.json(
      { error: error.message },
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
  
  if (queryLower.includes('map') || queryLower.includes('location') || queryLower.includes('geographic')) {
    return `${basePrompt}
    
Focus on geospatial analysis of air quality data:
- Identify clusters or hotspots
- Analyze distribution patterns across locations
- Consider elevation effects on readings
- Look for correlation between location and specific metrics
- Consider potential environmental or infrastructure factors

Include specific coordinates or regions when discussing spatial patterns.`;
  }
  
  // General air quality analysis prompt
  return `${basePrompt}
  
When analyzing air quality data, focus on:
1. PM2.5, PM10, temperature, humidity, and geospatial patterns
2. Temporal trends and patterns across different time periods
3. Compliance with health guidelines and standards
4. Potential sources of pollution based on patterns
5. Health implications of observed levels

Provide specific numerical findings and clear, actionable insights.`;
}

/**
 * Generate statistics from data for better context
 */
function generateDataStats(data) {
  if (!data || data.length === 0) return "No data available for statistics";
  
  // Extract metrics to analyze
  const metrics = ['pm25', 'pm10', 'temperature', 'humidity'];
  const stats = {};
  
  // Calculate basic stats for each metric
  metrics.forEach(metric => {
    // Get valid values for this metric
    const values = data
      .map(item => parseFloat(item[metric]))
      .filter(val => !isNaN(val));
    
    if (values.length === 0) {
      stats[metric] = "No data available";
      return;
    }
    
    // Calculate min, max, average
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    stats[metric] = {
      count: values.length,
      min: min.toFixed(2),
      max: max.toFixed(2),
      avg: avg.toFixed(2)
    };
  });
  
  // Format date range if available
  let dateRange = "Unknown date range";
  if (data[0]?.datetime) {
    try {
      const dates = data.map(item => new Date(item.datetime)).filter(d => !isNaN(d.getTime()));
      if (dates.length > 0) {
        const minDate = new Date(Math.min(...dates.map(d => d.getTime()))).toISOString().split('T')[0];
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime()))).toISOString().split('T')[0];
        dateRange = `${minDate} to ${maxDate}`;
      }
    } catch (e) {
      console.error("Error processing dates:", e);
    }
  }
  
  // Location summary if available
  let locationSummary = "Unknown locations";
  try {
    const validGeoPoints = data.filter(item => 
      item.latitude !== undefined && 
      item.longitude !== undefined && 
      !isNaN(parseFloat(item.latitude)) && 
      !isNaN(parseFloat(item.longitude))
    );
    
    if (validGeoPoints.length > 0) {
      locationSummary = `${validGeoPoints.length} locations with geographic coordinates`;
    }
  } catch (e) {
    console.error("Error processing location data:", e);
  }
  
  // Format into readable string
  return `
Date Range: ${dateRange}
Locations: ${locationSummary}
Total Records: ${data.length}

PM2.5 (μg/m³): ${formatStat(stats.pm25)}
PM10 (μg/m³): ${formatStat(stats.pm10)}
Temperature (°C): ${formatStat(stats.temperature)}
Humidity (%): ${formatStat(stats.humidity)}
`;
}

/**
 * Format a stat object into a readable string
 */
function formatStat(stat) {
  if (typeof stat === 'string') return stat;
  return `${stat.count} readings, Min: ${stat.min}, Max: ${stat.max}, Avg: ${stat.avg}`;
}

/**
 * Generate a mock AI response for development
 */
function generateMockAIResponse() {
  const responses = [
    `Based on the air quality data provided, I can see that PM2.5 levels average around 18.3 μg/m³, which exceeds the WHO guideline of 12 μg/m³ but remains below the USEPA standard of 35 μg/m³. 

The highest PM2.5 readings were recorded at the northern monitoring stations, suggesting a possible pollution source in that direction. Temperature readings show an average of 23.2°C, which is within the comfortable range of 20-25°C.

There appears to be a correlation between higher humidity levels and lower PM10 concentrations, which aligns with the expectation that particulate matter can be suppressed in more humid conditions.`,

    `Analysis of your air quality data reveals several interesting patterns:

1. PM2.5 levels fluctuate significantly throughout the day, with peak values occurring between 7-9 AM and 5-7 PM, coinciding with rush hour traffic.

2. Temperature values range from 18.5°C to 26.3°C, with an average of 22.1°C.

3. The monitoring stations at higher elevations consistently show lower pollution levels, with approximately 15% reduction in PM10 for every 100m increase in elevation.

4. Relative humidity averages 42%, which is within the ideal range for human comfort (30-60%).`,

    `The air quality data shows concerning levels of particulate matter in several locations. PM2.5 concentrations exceed WHO guidelines (12 μg/m³) at 68% of the monitoring stations, though only 12% exceed the USEPA standard (35 μg/m³).

Geographic analysis indicates a cluster of high readings in the southeast region, possibly due to industrial activities in that area. Time series analysis shows improving air quality over the past week, with PM10 levels decreasing by approximately 8% on average.

Temperature and humidity remain within comfortable ranges across most stations, with only minor deviations at the outlying locations.`
  ];
  
  // Return a random response from the list
  return responses[Math.floor(Math.random() * responses.length)];
} 