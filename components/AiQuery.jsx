import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic'; // Import dynamic
import { Sparkles, Database, Code, BarChart, Clock, Search, BarChart4, Globe, PieChart, ArrowRight, Terminal, Loader2 } from 'lucide-react';

// Dynamically import chart components
const TimeSeriesChart = dynamic(() => import('./TimeSeriesChart'), { ssr: false });
const AirQualityMap = dynamic(() => import('./AirQualityMap'), { ssr: false });
const CorrelationHeatmap = dynamic(() => import('./CorrelationHeatmap'), { ssr: false });

// Simple debounce function
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Enhanced AI query component for asking questions about air quality data
 * Uses a multi-stage approach:
 * 1. Uses Google embeddings for vector indexing
 * 2. Uses OpenAI for initial analysis
 * 3. Uses temperature=0 for database queries
 * 4. Uses Gemini for final synthesis with large context window
 */
export default function AiQuery({ data = [] }) {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiProvider, setAiProvider] = useState('hybrid'); // 'openai', 'gemini', or 'hybrid'
  const [processingStage, setProcessingStage] = useState(null);
  const [recentQueries, setRecentQueries] = useState([
    'Show me the average PM2.5 levels by location',
    'Analyze temperature trends over time',
    'Which areas have the highest pollution levels?',
    'Identify patterns in air quality data'
  ]);
  const [visualizationType, setVisualizationType] = useState(null);
  const [visualizationData, setVisualizationData] = useState([]);
  const queryInputRef = useRef(null);
  const fetchController = useRef(null);

  // Load previous queries from localStorage
  useEffect(() => {
    try {
      const savedQueries = localStorage.getItem('previousQueries');
      if (savedQueries) {
        setRecentQueries(JSON.parse(savedQueries));
      }
    } catch (error) {
      console.error('Error loading saved queries:', error);
    }
  }, []);

  // Save queries to localStorage when changed
  useEffect(() => {
    if (recentQueries.length > 0) {
      try {
        localStorage.setItem('previousQueries', JSON.stringify(recentQueries));
      } catch (error) {
        console.error('Error saving queries:', error);
      }
    }
  }, [recentQueries]);

  // Clear any previous errors when query changes
  useEffect(() => {
    setError(null);
  }, [query]);

  // Create a debounced submit handler
  const debouncedSubmit = useCallback(
    debounce(async (queryText) => {
      try {
        // Cancel any previous request
        if (fetchController.current) {
          fetchController.current.abort();
        }
        
        // Create a new controller for this request
        fetchController.current = new AbortController();
        const signal = fetchController.current.signal;
        
        const response = await fetch('/api/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: queryText }),
          signal
        });
        
        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Only add to recent queries if we have a successful response
        try {
          if (!recentQueries.some(q => q.text === queryText)) {
            setRecentQueries(prev => [
              { id: Date.now(), text: queryText },
              ...prev.slice(0, 3), // Keep only the 4 most recent queries
            ]);
          }
        } catch (storageError) {
          console.error('Error updating query history:', storageError);
        }
        
        setResponse(data);
      } catch (error) {
        // Ignore abort errors as they're expected when we cancel requests
        if (error.name !== 'AbortError') {
          console.error('Error submitting query:', error);
          setError(error.message);
        }
      } finally {
        setIsLoading(false);
        fetchController.current = null;
      }
    }, 500),
    [recentQueries]
  );

  // Preprocess data and ensure valid fields exist
  const preprocessData = (rawData) => {
    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
      console.warn("No valid data provided to AiQuery component");
      return { data: [], hasGeoData: false };
    }

    try {
      // Process all available records from the upload
      // Don't artificially limit to 100 records as that was causing issues
      if (rawData.length > 0) {
        console.log(`Processing ${rawData.length} records for AI analysis`);
        
        // Normalize field names for all data
        const normalizedData = rawData.map(item => {
          // Skip if item is not an object
          if (!item || typeof item !== 'object') return null;
          
          // Create a normalized object with standardized field names
          // Use various field name formats that might be present in the data
          return {
            ...item,
            // Normalize field names with fallbacks for different formats
            pm25: item.pm25 || item.pm25Standard || item.pm25standard || item.pm2_5 || item['PM2.5'] || null,
            pm10: item.pm10 || item.pm10Standard || item.pm10standard || item['PM10'] || null,
            temperature: item.temperature || item.temp || null,
            humidity: item.humidity || item.relativeHumidity || item.relativehumidity || null,
            // Ensure latitude/longitude exist for geo data
            latitude: item.latitude || item.lat || null,
            longitude: item.longitude || item.lng || item.lon || null,
            // Add datetime if it exists
            datetime: item.datetime || item.timestamp || item.date || null,
            // Preserve original deviceId if it exists
            deviceId: item.deviceId || item.device_id || item.id || `device-${Math.random().toString(36).substring(2, 10)}`,
          };
        }).filter(item => item !== null); // Remove any null items

        // Set a flag indicating whether this data has geographic coordinates
        const hasGeoData = normalizedData.some(item => 
          item && 
          typeof item === 'object' &&
          item.latitude !== undefined && 
          item.longitude !== undefined && 
          !isNaN(Number(item.latitude)) && 
          !isNaN(Number(item.longitude)) &&
          (Number(item.latitude) !== 0 || Number(item.longitude) !== 0) // Check that coords are not just zeros
        );

        // If we have non-empty normalized data, return it
        if (normalizedData.length > 0) {
          return {
            data: normalizedData,
            hasGeoData: hasGeoData
          };
        }
      }
    } catch (error) {
      console.error("Error preprocessing data:", error);
    }
    
    // If we get here, either there's no valid data or an error occurred
    // Generate a minimal mock dataset for testing
    const mockData = Array.from({ length: 5 }, (_, i) => ({
      id: i,
      deviceId: `mock-device-${i}`,
      datetime: new Date().toISOString(),
      pm25: Math.random() * 30,
      pm10: Math.random() * 50,
      temperature: 20 + Math.random() * 10,
      humidity: 40 + Math.random() * 40,
      latitude: 37.7749 + (Math.random() - 0.5) * 0.1,
      longitude: -122.4194 + (Math.random() - 0.5) * 0.1
    }));
    
    console.warn("Using mock data for testing. Upload real data for accurate results.");
    return { data: mockData, hasGeoData: true };
  };

  // Enhanced multi-stage query processing
  const handleSubmit = async (event) => {
    if (event && event.preventDefault) {
      event.preventDefault();
    }
    
    if (!query.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setResponse(null);
    setVisualizationData([]);
    setProcessingStage('preprocessing');
    
    try {
      // Check if data is available
      if (!data || !Array.isArray(data)) {
        throw new Error("No data available for analysis. Please upload or select data first.");
      }

      // Ensure data is valid before proceeding
      const processedDataResult = preprocessData(data);
      
      if (!processedDataResult || !processedDataResult.data || processedDataResult.data.length === 0) {
        throw new Error("No valid air quality data available for analysis");
      }
      
      // Use all records from the processed data for analysis
      const allData = processedDataResult.data;
      console.log(`Analyzing ${allData.length} data points`);
      
      if (aiProvider === 'hybrid') {
        // PRESCRIBED FIRE GPT PIPELINE:
        // 1. Initial analysis with OpenAI
        // 2. Query for SQL data with OpenAI temp 0  
        // 3. Combine initial + SQL data → Gemini for final analysis
        try {
          setProcessingStage('analyzing');
          const finalResult = await fetch('/api/ai/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: query,
              context: `Fire management data analysis with ${allData.length} data points. Geographic data available: ${processedDataResult.hasGeoData ? 'Yes' : 'No'}`
            })
          });
          
          if (!finalResult.ok) {
            console.error("Gemini workflow failed:", await finalResult.text());
            throw new Error(`Error in AI workflow: ${finalResult.statusText}`);
          }
          
          const workflowResult = await finalResult.json();
          console.log("AI workflow completed:", workflowResult);
          
          // Transform the workflow result to match expected response format
          const transformedResponse = {
            result: workflowResult.final_analysis || workflowResult.fallback_analysis,
            model: workflowResult.models_used ? 
              `${workflowResult.models_used.initial_analysis} → ${workflowResult.models_used.final_analysis}` : 
              'AI Workflow',
            workflow_complete: workflowResult.workflow_complete,
            data_points: workflowResult.data_points,
            sql_query: workflowResult.sql_query,
            initial_analysis: workflowResult.initial_analysis,
            timestamp: workflowResult.timestamp
          };
          
          setResponse(transformedResponse);
        } catch (stageError) {
          // If any stage fails, try the fallback approach
          console.error("Multi-stage approach failed. Falling back to OpenAI-only:", stageError);
          setProcessingStage('fallback');
          
          const fallbackResponse = await fetch('/api/ai/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query,
              data: allData,
              hasGeoData: processedDataResult.hasGeoData
            })
          });
          
          if (!fallbackResponse.ok) {
            throw new Error(`Fallback analysis failed: ${fallbackResponse.statusText}`);
          }
          
          const fallbackResult = await fallbackResponse.json();
          setResponse(fallbackResult);
        }
      } else {
        // Standard single-model approach
        const endpoint = aiProvider === 'gemini' ? '/api/ai/gemini' : '/api/ai/query';
        setProcessingStage('analyzing');
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            data: allData,
            hasGeoData: processedDataResult.hasGeoData
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("API error:", errorText);
          throw new Error(`Error ${response.status} ${response.statusText}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log("AI response received:", result);
        setResponse(result);
      }
      
      // Keep original data for visualization
      setVisualizationData(processedDataResult.data);
      
      // Add to recent queries if it's not already there
      const queryText = query.trim();
      if (!recentQueries.some(q => 
        (typeof q === 'string' && q === queryText) || 
        (typeof q === 'object' && q.text === queryText)
      )) {
        setRecentQueries(prev => [{
          id: Date.now(),
          text: queryText
        }, ...prev.filter(q => 
          (typeof q === 'string' ? q : q.text) !== queryText
        ).slice(0, 3)]);
      }
      
      // Set visualization type based on query content
      const plotType = determinePlotType(query, processedDataResult.data);
      if (plotType === 'map' && !processedDataResult.hasGeoData) {
        // If map visualization is requested but we don't have geo data
        setVisualizationType('time'); // Fallback to time series
      } else {
        setVisualizationType(plotType);
      }
      
    } catch (err) {
      console.error('Error querying AI:', err);
      setError(err.message || "An error occurred while processing your query");
    } finally {
      setIsLoading(false);
      setProcessingStage(null);
    }
  };

  const useExample = (example) => {
    setQuery(example);
    // Auto-submit after a short delay
    setTimeout(() => {
      handleSubmit();
    }, 100);
  };

  // Format AI response text with markdown-like parsing
  const formatResponse = (text) => {
    if (!text) return <div className="text-gray-500">No response received</div>;
    
    try {
      // Replace markdown-style headers
      let formattedText = text
        .replace(/\*\*(.*?)\*\*/g, '<span class="font-bold">$1</span>')
        .replace(/\n\s*-\s/g, '<br/>• ')
        .replace(/\n\n/g, '<br/><br/>')
        .replace(/\n/g, '<br/>')
        // Handle code blocks
        .replace(/```(.*?)```/gs, '<pre class="bg-gray-100 dark:bg-gray-800 p-2 rounded-md my-2 overflow-x-auto">$1</pre>');
        
      // If the response contains a list of queries at the end
      if (formattedText.includes('Follow-up Questions:')) {
        const [content, followUp] = formattedText.split('Follow-up Questions:');
        
        return (
          <div className="space-y-4">
            <div dangerouslySetInnerHTML={{ __html: content }} />
            
            {followUp && (
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Follow-up Questions:
                </h4>
                <div className="space-y-2">
                  {followUp.split('<br/>•').map((q, i) => {
                    if (i === 0) return null; // Skip the first empty item
                    
                    const trimmedQuestion = q.trim().replace(/<br\/>/g, '');
                    if (!trimmedQuestion) return null;
                    
                    return (
                      <button
                        key={i}
                        onClick={() => useExample(trimmedQuestion)}
                        className="block text-left text-sm px-3 py-2 rounded-md bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-800/50 w-full transition-colors duration-150"
                      >
                        {trimmedQuestion}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      }
      
      return <div dangerouslySetInnerHTML={{ __html: formattedText }} />;
    } catch (error) {
      console.error("Error formatting response:", error);
      return <div className="text-red-500">Error formatting response: {error.message}</div>;
    }
  };

  // Render appropriate visualization based on query and data
  const renderVisualization = (question, vizData) => {
    if (!vizData || vizData.length === 0) {
      console.warn("No data available for visualization");
      return null;
    }
    
    try {
      // Determine visualization type if not already set
      const vizType = visualizationType || determinePlotType(question, vizData);
      
      // Get the right time window of data for visualization
      const sortedData = [...vizData].sort((a, b) => {
        if (!a.datetime || !b.datetime) return 0;
        return new Date(a.datetime) - new Date(b.datetime);
      });
      
      console.log(`Rendering visualization of type ${vizType} with ${sortedData.length} data points`);
      
      // Common visualization container styles to improve spacing and appearance
      const containerClasses = "mt-8 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700";
      const headerClasses = "p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center";
      const titleClasses = "flex items-center font-medium text-lg text-gray-800 dark:text-white";
      const vizContainerClasses = "p-0 w-full"; // Remove padding inside viz area for better space usage
      
      // Common options button for all visualizations
      const optionsButton = (
        <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        </button>
      );
      
      switch (vizType) {
        case 'map':
          return (
            <div className={containerClasses}>
              <div className={headerClasses}>
                <h3 className={titleClasses}>
                  <Globe className="h-5 w-5 mr-3 text-primary-500" />
                  Geographic Distribution
                </h3>
                {optionsButton}
              </div>
              <div className={vizContainerClasses} style={{ height: '650px' }}>
                <AirQualityMap 
                  data={sortedData} 
                  timeSeriesData={sortedData.filter(d => d.datetime)} 
                />
              </div>
            </div>
          );
        
        case 'correlation':
          return (
            <div className={containerClasses}>
              <div className={headerClasses}>
                <h3 className={titleClasses}>
                  <BarChart4 className="h-5 w-5 mr-3 text-primary-500" />
                  Correlation Analysis
                </h3>
                {optionsButton}
              </div>
              <div className={vizContainerClasses} style={{ height: '600px' }}>
                <CorrelationHeatmap data={sortedData} />
              </div>
            </div>
          );
        
        case 'time':
        default:
          return (
            <div className={containerClasses}>
              <div className={headerClasses}>
                <h3 className={titleClasses}>
                  <BarChart className="h-5 w-5 mr-3 text-primary-500" />
                  Time Series Analysis
                </h3>
                {optionsButton}
              </div>
              <div className={vizContainerClasses} style={{ height: '600px' }}>
                <TimeSeriesChart data={sortedData} />
              </div>
            </div>
          );
      }
    } catch (error) {
      console.error("Error rendering visualization:", error);
      return (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
          Error rendering visualization: {error.message}
        </div>
      );
    }
  };

  // Determine what kind of plot to show based on the question and data
  const determinePlotType = (question, thisData) => {
    const q = question.toLowerCase();
    
    // First check if we have valid data
    if (!thisData || !Array.isArray(thisData) || thisData.length === 0) {
      console.warn("No data available for plot type determination");
      return 'time'; // Default visualization
    }
    
    // Check if data has geographic coordinates for map visualization
    const hasGeoData = thisData.some(item => 
      item && 
      typeof item === 'object' &&
      item.latitude !== undefined && 
      item.longitude !== undefined && 
      !isNaN(Number(item.latitude)) && 
      !isNaN(Number(item.longitude)) &&
      (Number(item.latitude) !== 0 || Number(item.longitude) !== 0)
    );
    
    // Check if data has time information for time series
    const hasTimeData = thisData.some(item => 
      item && 
      typeof item === 'object' &&
      item.datetime
    );
    
    // Advanced keyword and concept matching
    // Keywords that suggest a map visualization
    const mapKeywords = [
      'map', 'where', 'location', 'geographic', 'spatial', 'regions', 
      'areas', 'distribution', 'coordinates', 'latitude', 'longitude',
      'region', 'place', 'zone', 'district', 'territory', 'spot'
    ];
    
    // Keywords that suggest a correlation visualization
    const correlationKeywords = [
      'correlation', 'relationship', 'compare', 'versus', 'vs', 'against',
      'related', 'association', 'connection', 'link between', 'heatmap',
      'dependent', 'factor', 'influence', 'affect', 'impact', 'effect',
      'relative to', 'together', 'relation', 'consistent with'
    ];
    
    // Keywords that suggest time series visualization
    const timeKeywords = [
      'time', 'trends', 'over time', 'temporal', 'period', 'history',
      'evolution', 'development', 'progression', 'change', 'shift',
      'day', 'week', 'month', 'year', 'hour', 'date', 'today',
      'yesterday', 'recent', 'past', 'future', 'forecast', 'predict'
    ];
    
    // Check for spatial questions (map)
    if (hasGeoData && (
      mapKeywords.some(keyword => q.includes(keyword)) ||
      q.match(/(?:distribution|variation).*(?:across|by|in different|based on).*(?:loc|place|area|region|zone|map)/i)
    )) {
      console.log("Determined map visualization based on query and data");
      return 'map';
    }
    
    // Check for correlation questions
    if (
      correlationKeywords.some(keyword => q.includes(keyword)) ||
      q.match(/(?:how|what).*(?:relate|connection|link|association|correlation).*(?:between|among)/i) ||
      q.match(/(?:impact|effect|influence|affect).*(?:on|of)/i) ||
      q.match(/(?:compared|comparison|correlate)/i)
    ) {
      console.log("Determined correlation visualization based on query");
      return 'correlation';
    }
    
    // Check for time series questions
    if (hasTimeData && (
      timeKeywords.some(keyword => q.includes(keyword)) ||
      q.match(/(?:how|what).*(?:change|vary|fluctuate|trend|progress|develop|evolve)/i) ||
      q.match(/(?:over|during|throughout|across).*(?:time|days?|weeks?|months?|years?|period)/i)
    )) {
      console.log("Determined time series visualization based on query and data");
      return 'time';
    }
    
    // Default to time series if we have time data, otherwise correlation
    return hasTimeData ? 'time' : 'correlation';
  };

  // Modify the renderProcessingStages function to make it more prominent
  const renderProcessingStages = () => {
    const stages = [
      { id: 'preprocessing', label: 'Processing Data', icon: <Database className="h-4 w-4" /> },
      { id: 'analyzing', label: 'OpenAI → SQL → Gemini', icon: <Sparkles className="h-4 w-4" /> },
      { id: 'fallback', label: 'Fallback Analysis', icon: <BarChart className="h-4 w-4" /> }
    ];
    
    return (
      <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 text-center">Analysis Progress</h3>
        <div className="flex flex-wrap gap-3 items-center justify-center">
          {stages.map((stage, index) => {
            // Determine stage status
            const isActive = processingStage === stage.id;
            const isPassed = stages.findIndex(s => s.id === processingStage) > index;
            
            if (stage.id === 'fallback' && processingStage !== 'fallback') {
              return null; // Only show fallback stage when active
            }
            
            return (
              <div key={stage.id} className="flex items-center">
                <div 
                  className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-300
                    ${isActive ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 shadow-md scale-110' : 
                      isPassed ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 
                      'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}
                  `}
                >
                  {isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    stage.icon
                  )}
                  {stage.label}
                </div>
                
                {index < stages.length - 1 && stage.id !== 'fallback' && (
                  <ArrowRight className="h-3 w-3 mx-2 text-gray-400 dark:text-gray-600" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex flex-col space-y-8">
      {/* Query input */}
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          
          <input
            ref={queryInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question about your air quality data..."
            className="w-full py-3 pl-10 pr-14 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-primary-500 dark:focus:border-primary-600 bg-white dark:bg-gray-800 transition-shadow duration-200"
          />
          
          <div className="absolute inset-y-0 right-3 flex items-center">
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-white ${
                isLoading || !query.trim()
                  ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-700'
              } transition-colors duration-150`}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Ask'
              )}
            </button>
          </div>
        </div>
      </form>
      
      {/* AI Provider Selection */}
      <div className="flex items-center justify-center gap-2 text-sm">
        <span className="text-gray-600 dark:text-gray-400">AI Engine:</span>
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setAiProvider('openai')}
            className={`px-3 py-1 rounded-md transition-colors ${
              aiProvider === 'openai' 
                ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            OpenAI
          </button>
          <button
            onClick={() => setAiProvider('gemini')}
            className={`px-3 py-1 rounded-md transition-colors ${
              aiProvider === 'gemini' 
                ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Gemini
          </button>
          <button
            onClick={() => setAiProvider('hybrid')}
            className={`px-3 py-1 rounded-md transition-colors ${
              aiProvider === 'hybrid' 
                ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Hybrid (Best)
          </button>
        </div>
      </div>
      
      {/* Recent queries */}
      {recentQueries.length > 0 && !isLoading && (
        <div className="flex flex-wrap gap-2 justify-center">
          {recentQueries.slice(0, 4).map((q, index) => (
            <button
              key={index}
              onClick={() => useExample(typeof q === 'string' ? q : q.text)}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors duration-150 ${
                query === (typeof q === 'string' ? q : q.text)
                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {typeof q === 'string' ? q : q.text}
            </button>
          ))}
        </div>
      )}
      
      {/* Processing stages */}
      {isLoading && aiProvider === 'hybrid' && renderProcessingStages()}
      
      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="relative w-16 h-16">
            <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full border-4 border-t-primary-500 dark:border-t-primary-400 rounded-full animate-spin"></div>
          </div>
          <p className="mt-4 text-gray-600 dark:text-gray-300 text-center">
            {processingStage === 'preprocessing' && "Processing your fire management data..."}
            {processingStage === 'analyzing' && "Running AI workflow: OpenAI analysis → SQL query → Gemini synthesis..."}
            {processingStage === 'fallback' && "Running fallback analysis..."}
            {!processingStage && "Processing your query..."}
          </p>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
          <h3 className="font-semibold mb-1">Analysis Error</h3>
          <p>{error}</p>
        </div>
      )}
      
      {/* AI response */}
      {response && !isLoading && (
        <div className="space-y-8 animate-fadeIn">
          {/* Response box */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <Sparkles className="h-5 w-5 text-primary-500 dark:text-primary-400 mr-2" />
                <h3 className="font-medium text-lg text-gray-900 dark:text-white">Analysis Results</h3>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <span>Powered by</span>
                <span className="font-medium">
                  {response.model?.includes('gemini') 
                    ? 'Gemini AI' 
                    : response.model?.includes('gpt') 
                      ? 'OpenAI GPT' 
                      : 'AI Assistant'}
                </span>
                {response.mockResponse && <span className="italic">(Demo)</span>}
              </div>
            </div>
            <div className="p-6 prose dark:prose-invert prose-sm md:prose-base max-w-none">
              {formatResponse(response.result)}
            </div>
          </div>
          
          {/* Data summary section */}
          {visualizationData.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Records</div>
                <div className="text-2xl font-semibold mt-1">{visualizationData.length.toLocaleString()}</div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400">Time Range</div>
                <div className="text-lg font-medium mt-1 truncate">
                  {(() => {
                    try {
                      const dates = visualizationData
                        .filter(d => d.datetime)
                        .map(d => new Date(d.datetime))
                        .filter(d => !isNaN(d.getTime()));
                      
                      if (dates.length === 0) return "No time data";
                      
                      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
                      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
                      
                      return `${minDate.toLocaleDateString()} - ${maxDate.toLocaleDateString()}`;
                    } catch (e) {
                      return "Error processing dates";
                    }
                  })()}
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400">Locations</div>
                <div className="text-2xl font-semibold mt-1">
                  {(() => {
                    const uniqueLocations = new Set();
                    visualizationData.forEach(d => {
                      if (d.latitude && d.longitude) {
                        // Round to 4 decimal places for uniqueness
                        uniqueLocations.add(`${parseFloat(d.latitude).toFixed(4)},${parseFloat(d.longitude).toFixed(4)}`);
                      }
                    });
                    return uniqueLocations.size.toLocaleString();
                  })()}
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400">Devices</div>
                <div className="text-2xl font-semibold mt-1">
                  {(() => {
                    const uniqueDevices = new Set();
                    visualizationData.forEach(d => {
                      if (d.deviceId) uniqueDevices.add(d.deviceId);
                    });
                    return uniqueDevices.size.toLocaleString();
                  })()}
                </div>
              </div>
            </div>
          )}
          
          {/* Visualizations based on query */}
          {visualizationData.length > 0 && renderVisualization(query, visualizationData)}
        </div>
      )}
    </div>
  );
}