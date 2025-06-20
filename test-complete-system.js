#!/usr/bin/env node

/**
 * Comprehensive system test for Prescribed Fire GPT
 * Tests RAG integration, database connectivity, API endpoints, and data flow
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeoutMs: 30000,
  retryAttempts: 3
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.bold}${colors.cyan}=== ${title} ===${colors.reset}`);
}

function logTest(name) {
  console.log(`\n${colors.yellow}🧪 Testing: ${name}${colors.reset}`);
}

function logSuccess(message) {
  log(colors.green, `✅ ${message}`);
}

function logError(message) {
  log(colors.red, `❌ ${message}`);
}

function logWarning(message) {
  log(colors.yellow, `⚠️  ${message}`);
}

function logInfo(message) {
  log(colors.blue, `ℹ️  ${message}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TEST_CONFIG.timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${TEST_CONFIG.timeoutMs}ms`);
    }
    throw error;
  }
}

// Test 1: Database Connectivity and Schema
async function testDatabaseConnectivity() {
  logTest('Database Connectivity and Schema');
  
  try {
    // Test basic connectivity
    const { data, error } = await supabase
      .from('air_quality')
      .select('id')
      .limit(1);
    
    if (error && !error.message.includes('does not exist')) {
      throw error;
    }
    
    logSuccess('Database connection established');
    
    // Test fire management tables
    const { data: fireData, error: fireError } = await supabase
      .from('fire_data')
      .select('id, burn_unit, status, latitude, longitude')
      .limit(5);
    
    if (fireError) {
      logWarning(`Fire management tables not accessible: ${fireError.message}`);
      return { connected: true, fireManagement: false, fireDataCount: 0 };
    }
    
    logSuccess(`Fire management tables accessible with ${fireData?.length || 0} records`);
    
    // Test normalized sensor schema
    const { data: sensorData, error: sensorError } = await supabase
      .from('sensor_readings')
      .select(`
        id,
        timestamp,
        temperature,
        humidity,
        device:devices!inner(name, latitude, longitude)
      `)
      .limit(3);
    
    if (sensorError) {
      logWarning(`Normalized sensor schema not accessible: ${sensorError.message}`);
    } else {
      logSuccess(`Normalized sensor schema accessible with ${sensorData?.length || 0} records`);
    }
    
    // Test vector database functions
    try {
      const { error: vectorError } = await supabase.rpc('search_embeddings', {
        query_embedding: new Array(1536).fill(0),
        match_threshold: 0.75,
        match_count: 1
      });
      
      if (vectorError) {
        logWarning(`Vector search function not available: ${vectorError.message}`);
      } else {
        logSuccess('Vector search function accessible');
      }
    } catch (e) {
      logWarning(`Vector search test failed: ${e.message}`);
    }
    
    return {
      connected: true,
      fireManagement: !fireError,
      fireDataCount: fireData?.length || 0,
      sensorData: !sensorError,
      sensorDataCount: sensorData?.length || 0
    };
    
  } catch (error) {
    logError(`Database connectivity failed: ${error.message}`);
    return { connected: false, error: error.message };
  }
}

// Test 2: AI API Endpoints
async function testAIEndpoints() {
  logTest('AI API Endpoints');
  
  const endpoints = [
    {
      name: 'Prescribed Fire Analysis',
      url: `${TEST_CONFIG.baseUrl}/api/ai/prescribed-fire`,
      method: 'POST',
      body: {
        query: 'What are the optimal conditions for a prescribed fire in oak woodland?',
        options: { limit: 3 }
      }
    },
    {
      name: 'General AI Query',
      url: `${TEST_CONFIG.baseUrl}/api/ai/query`,
      method: 'POST',
      body: {
        query: 'Explain air quality monitoring for fire management',
        options: { contextType: 'fire', limit: 3 }
      }
    },
    {
      name: 'Fire Analysis Pipeline (Gemini)',
      url: `${TEST_CONFIG.baseUrl}/api/ai/gemini`,
      method: 'POST',
      body: {
        message: 'Analyze current fire conditions for planning',
        context: 'fire_management'
      }
    },
    {
      name: 'Vector Search Test',
      url: `${TEST_CONFIG.baseUrl}/api/ai/query?q=fire&limit=2`,
      method: 'GET'
    }
  ];
  
  const results = {};
  
  for (const endpoint of endpoints) {
    try {
      logInfo(`Testing ${endpoint.name}...`);
      
      const options = {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' }
      };
      
      if (endpoint.body) {
        options.body = JSON.stringify(endpoint.body);
      }
      
      const response = await makeRequest(endpoint.url, options);
      const data = await response.json();
      
      if (response.ok && data.success !== false) {
        logSuccess(`${endpoint.name}: ${response.status} - ${data.success ? 'Success' : 'Response received'}`);
        results[endpoint.name] = {
          status: 'success',
          statusCode: response.status,
          hasData: !!(data.fireAnalysis || data.response || data.analysis || data.results),
          responseKeys: Object.keys(data)
        };
      } else {
        logWarning(`${endpoint.name}: ${response.status} - ${data.error || 'Unknown error'}`);
        results[endpoint.name] = {
          status: 'error',
          statusCode: response.status,
          error: data.error || data.details || 'Unknown error'
        };
      }
      
      await sleep(1000); // Rate limiting between requests
      
    } catch (error) {
      logError(`${endpoint.name}: Request failed - ${error.message}`);
      results[endpoint.name] = {
        status: 'failed',
        error: error.message
      };
    }
  }
  
  return results;
}

// Test 3: Fire Management Data Flow
async function testFireManagementDataFlow() {
  logTest('Fire Management Data Flow');
  
  try {
    // Test fire management data retrieval
    logInfo('Testing fire management data retrieval...');
    
    const response = await makeRequest(
      `${TEST_CONFIG.baseUrl}/api/ai/prescribed-fire`, 
      {
        method: 'GET'
      }
    );
    
    if (!response.ok) {
      logWarning(`GET endpoint not available: ${response.status}`);
      return { dataFlow: false, reason: 'GET endpoint not accessible' };
    }
    
    const data = await response.json();
    
    if (data.success) {
      logSuccess('Fire management status endpoint accessible');
      logInfo(`Current conditions: ${data.currentConditions?.overall || 'unknown'} risk`);
      logInfo(`Environmental records: ${data.environmentalData?.length || 0}`);
      logInfo(`Database status: ${Object.entries(data.databaseStatus || {}).map(([k,v]) => `${k}:${v}`).join(', ')}`);
      
      return {
        dataFlow: true,
        status: data.currentConditions,
        environmentalRecords: data.environmentalData?.length || 0,
        databaseStatus: data.databaseStatus
      };
    } else {
      logWarning(`Data flow test failed: ${data.error}`);
      return { dataFlow: false, reason: data.error };
    }
    
  } catch (error) {
    logError(`Fire management data flow test failed: ${error.message}`);
    return { dataFlow: false, reason: error.message };
  }
}

// Test 4: RAG System Integration
async function testRAGIntegration() {
  logTest('RAG System Integration');
  
  const testQueries = [
    'What safety protocols should I follow for prescribed fires?',
    'How does humidity affect fire behavior?',
    'What are the optimal weather windows for burning?'
  ];
  
  const results = [];
  
  for (const query of testQueries) {
    try {
      logInfo(`Testing RAG with query: "${query.substring(0, 40)}..."`);
      
      const response = await makeRequest(
        `${TEST_CONFIG.baseUrl}/api/ai/prescribed-fire`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            options: { limit: 3, threshold: 0.7 }
          })
        }
      );
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        const hasAnalysis = !!(data.fireAnalysis && data.fireAnalysis.length > 10);
        const hasContext = !!(data.context && data.context.knowledgeSources > 0);
        const hasEnvironmentalData = !!(data.environmentalData && data.environmentalData.length > 0);
        
        logSuccess(`RAG response generated (${data.fireAnalysis?.length || 0} chars)`);
        if (hasContext) logInfo(`  Knowledge sources: ${data.context.knowledgeSources}`);
        if (hasEnvironmentalData) logInfo(`  Environmental records: ${data.environmentalData.length}`);
        
        results.push({
          query,
          success: true,
          hasAnalysis,
          hasContext,
          hasEnvironmentalData,
          method: data.context?.method || 'unknown'
        });
      } else {
        logWarning(`RAG query failed: ${data.error || 'Unknown error'}`);
        results.push({
          query,
          success: false,
          error: data.error || 'Unknown error'
        });
      }
      
      await sleep(1500); // Rate limiting
      
    } catch (error) {
      logError(`RAG query error: ${error.message}`);
      results.push({
        query,
        success: false,
        error: error.message
      });
    }
  }
  
  const successfulQueries = results.filter(r => r.success).length;
  logInfo(`RAG Integration: ${successfulQueries}/${testQueries.length} queries successful`);
  
  return {
    totalQueries: testQueries.length,
    successfulQueries,
    results
  };
}

// Test 5: Map Data Integration
async function testMapDataIntegration() {
  logTest('Map Data Integration');
  
  try {
    // Test fire management map data
    const { data: fireData, error: fireError } = await supabase
      .from('fire_data')
      .select(`
        id, burn_unit, location_name, status, latitude, longitude,
        temperature, humidity, risk_level, acres_planned, acres_completed
      `)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(10);
    
    if (fireError) {
      logWarning(`Fire map data not accessible: ${fireError.message}`);
      return { mapData: false, reason: fireError.message };
    }
    
    const validPoints = fireData?.filter(point => 
      point.latitude && point.longitude && 
      Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180
    ).length || 0;
    
    if (validPoints > 0) {
      logSuccess(`Map data available: ${validPoints} valid fire management points`);
      logInfo(`Sample point: ${fireData[0].burn_unit} at ${fireData[0].latitude}, ${fireData[0].longitude}`);
      
      return {
        mapData: true,
        totalPoints: fireData?.length || 0,
        validPoints,
        sampleData: fireData?.slice(0, 2)
      };
    } else {
      logWarning('No valid geographic coordinates found in fire data');
      return { mapData: false, reason: 'No valid coordinates' };
    }
    
  } catch (error) {
    logError(`Map data integration test failed: ${error.message}`);
    return { mapData: false, reason: error.message };
  }
}

// Main test runner
async function runCompleteSystemTest() {
  console.log(`${colors.bold}${colors.magenta}
🔥 Prescribed Fire GPT - Complete System Test 🔥
==================================================${colors.reset}`);
  
  logInfo(`Base URL: ${TEST_CONFIG.baseUrl}`);
  logInfo(`Timeout: ${TEST_CONFIG.timeoutMs}ms`);
  logInfo(`Test started at: ${new Date().toISOString()}`);
  
  const testResults = {};
  
  // Run all tests
  testResults.database = await testDatabaseConnectivity();
  testResults.aiEndpoints = await testAIEndpoints();
  testResults.fireManagementFlow = await testFireManagementDataFlow();
  testResults.ragIntegration = await testRAGIntegration();
  testResults.mapIntegration = await testMapDataIntegration();
  
  // Summary
  logSection('Test Results Summary');
  
  const dbStatus = testResults.database.connected ? '✅ Connected' : '❌ Failed';
  logInfo(`Database: ${dbStatus}`);
  
  if (testResults.database.fireManagement) {
    logSuccess(`Fire Management Tables: Available (${testResults.database.fireDataCount} records)`);
  } else {
    logWarning('Fire Management Tables: Not available');
  }
  
  const aiEndpointSuccesses = Object.values(testResults.aiEndpoints).filter(r => r.status === 'success').length;
  const aiEndpointTotal = Object.keys(testResults.aiEndpoints).length;
  logInfo(`AI Endpoints: ${aiEndpointSuccesses}/${aiEndpointTotal} working`);
  
  const ragStatus = testResults.ragIntegration.successfulQueries > 0 ? '✅ Working' : '❌ Failed';
  logInfo(`RAG System: ${ragStatus} (${testResults.ragIntegration.successfulQueries}/${testResults.ragIntegration.totalQueries} queries)`);
  
  const mapStatus = testResults.mapIntegration.mapData ? '✅ Available' : '❌ No data';
  logInfo(`Map Data: ${mapStatus}`);
  
  if (testResults.mapIntegration.validPoints) {
    logInfo(`  Valid geographic points: ${testResults.mapIntegration.validPoints}`);
  }
  
  // Overall system health
  logSection('System Health Assessment');
  
  const isHealthy = 
    testResults.database.connected &&
    aiEndpointSuccesses >= 2 &&
    testResults.ragIntegration.successfulQueries >= 2;
  
  if (isHealthy) {
    logSuccess('🎉 System is HEALTHY and ready for prescribed fire management!');
    logInfo('✅ Database connectivity working');
    logInfo('✅ AI endpoints responding');
    logInfo('✅ RAG system functional');
    if (testResults.mapIntegration.mapData) {
      logInfo('✅ Map data available');
    }
  } else {
    logWarning('⚠️  System has issues that need attention:');
    
    if (!testResults.database.connected) {
      logError('- Database connectivity problems');
    }
    if (aiEndpointSuccesses < 2) {
      logError('- AI endpoints not responding properly');
    }
    if (testResults.ragIntegration.successfulQueries < 2) {
      logError('- RAG system integration problems');
    }
    if (!testResults.mapIntegration.mapData) {
      logWarning('- Map data not available (not critical)');
    }
  }
  
  // Recommendations
  logSection('Recommendations');
  
  if (!testResults.database.fireManagement) {
    logInfo('🔧 Run database migrations to create fire management tables');
    logInfo('   npm run db:migrate or check supabase/migrations/');
  }
  
  if (aiEndpointSuccesses < aiEndpointTotal) {
    logInfo('🔧 Check API environment variables (OPENAI_API_KEY, GEMINI_API_KEY)');
  }
  
  if (testResults.ragIntegration.successfulQueries === 0) {
    logInfo('🔧 Verify vector database setup and embedding functions');
  }
  
  if (!testResults.mapIntegration.mapData) {
    logInfo('🔧 Populate sample fire management data for map visualization');
  }
  
  logInfo('\n📊 Save this output for debugging and system monitoring');
  logInfo(`Test completed at: ${new Date().toISOString()}`);
  
  return testResults;
}

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCompleteSystemTest()
    .then(results => {
      // Exit with appropriate code
      const isHealthy = results.database.connected && 
        Object.values(results.aiEndpoints).filter(r => r.status === 'success').length >= 2;
      process.exit(isHealthy ? 0 : 1);
    })
    .catch(error => {
      logError(`Test runner failed: ${error.message}`);
      process.exit(1);
    });
}

export { runCompleteSystemTest };