import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';

/**
 * POST handler for uploading air quality data
 * Processes CSV data and stores it in Supabase if configured
 */
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      console.log('DEBUG - Upload error: No file provided');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Get date range filters if provided
    const startDate = formData.get('startDate');
    const endDate = formData.get('endDate');
    
    // Read file content as text
    const fileContent = await file.text();
    
    // Parse CSV data
    const data = parseCSV(fileContent);
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log('DEBUG - Upload error: No valid data parsed from file');
      return NextResponse.json(
        { error: 'No valid data parsed from file. Please ensure you are uploading a properly formatted CSV file.' },
        { status: 400 }
      );
    }

    console.log(`DEBUG - Parsed ${data.length} records from uploaded file`);
    
    // Apply date filtering if specified
    let filteredData = data;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Set to end of day
      
      filteredData = data.filter(item => {
        if (!item.datetime) return true; // Keep records without dates
        const recordDate = new Date(item.datetime);
        return recordDate >= start && recordDate <= end;
      });
      
      console.log(`DEBUG - Filtered to ${filteredData.length} records based on date range`);
    }
    
    // If Supabase is configured, try to insert the data
    if (isSupabaseConfigured()) {
      try {
        console.log('DEBUG - Uploading data to Supabase...');
        
        // First check if the table exists
        console.log('DEBUG - Checking if table exists...');
        const { data: tableData, error: tableCheckError } = await supabase
          .from('air_quality')
          .select('id')
          .limit(1);
          
        if (tableCheckError) {
          console.error('DEBUG - Table check error:', tableCheckError);
          
          // Try to get more detailed information about the error
          console.log('DEBUG - Checking error code:', tableCheckError.code);
          console.log('DEBUG - Error message:', tableCheckError.message);
          console.log('DEBUG - Error details:', tableCheckError.details);
          
          // Specific check for PGRST116 (table not found error)
          if (tableCheckError.code === 'PGRST116') {
            console.error('DEBUG - Confirmed table not found error (PGRST116)');
            return NextResponse.json({
              error: 'The air_quality table does not exist in your Supabase database. Please run the migration script.',
              rowCount: filteredData.length,
              data: filteredData // Return the data to the client
            });
          }
          
          // Generic error response with debug info
          return NextResponse.json({
            message: 'Failed to access the air_quality table in Supabase. Using local storage as fallback.',
            error: tableCheckError.message,
            rowCount: filteredData.length,
            data: filteredData // Return the data to the client
          });
        }
        
        console.log('DEBUG - Table exists check succeeded, got data:', tableData);
        
        // Create a simplified dataset with only essential fields
        const simplifiedData = filteredData.map(item => {
          // Just keep basic fields to avoid problems
          return {
            datetime: item.datetime ? new Date(item.datetime).toISOString() : new Date().toISOString(),
            from_node: item.from_node || 'unknown',
            pm25standard: Number(item.pm25Standard) || 0,
            pm10standard: Number(item.pm10Standard) || 0, 
            temperature: Number(item.temperature) || 0,
            relativehumidity: Number(item.relativeHumidity) || 0,
            latitude: Number(item.latitude) || 0,
            longitude: Number(item.longitude) || 0
          };
        });
        
        // For large datasets, upload in batches of 500 records
        const batchSize = 500;
        let successCount = 0;
        
        for (let i = 0; i < simplifiedData.length; i += batchSize) {
          const batch = simplifiedData.slice(i, i + batchSize);
          
          console.log(`DEBUG - Inserting batch ${Math.floor(i / batchSize) + 1}, size ${batch.length}`);
          
          const { data: insertedData, error } = await supabase
            .from('air_quality')
            .insert(batch);
          
          if (error) {
            console.error('DEBUG - Batch upload error:', error);
            console.log('DEBUG - Error code:', error.code);
            console.log('DEBUG - Error message:', error.message);
            console.log('DEBUG - Error details:', error.details);
            
            // Check for specific schema errors
            const errorMsg = error.message.toLowerCase();
            if (errorMsg.includes('pm10standard') || errorMsg.includes('pm25standard') || 
                errorMsg.includes('relativehumidity')) {
              return NextResponse.json({
                message: 'Column name case mismatch in Supabase. Database uses lowercase column names.',
                error: 'Column names in the database are lowercase (pm10standard, pm25standard, relativehumidity) ' +
                       'but the application is trying to use camelCase (pm10Standard, pm25Standard, relativeHumidity).',
                rowCount: filteredData.length,
                data: filteredData // Return the data to the client
              });
            }
            
            return NextResponse.json({
              message: 'Failed to upload to Supabase due to schema mismatch. Using local storage as fallback.',
              error: error.message + '. Run the migration script in /supabase/migrations.',
              rowCount: filteredData.length,
              data: filteredData // Return the data to the client
            });
          }
          
          successCount += batch.length;
          console.log(`DEBUG - Uploaded batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records`);
        }
        
        console.log(`DEBUG - Successfully uploaded ${successCount} records to Supabase`);
        
        return NextResponse.json({
          success: true,
          message: `Successfully uploaded ${successCount} records to Supabase`,
          rowCount: filteredData.length,
          data: filteredData // Return the data to the client
        });
      } catch (error) {
        console.error('DEBUG - Error uploading to Supabase:', error);
        
        // Return a success response with a message about local storage fallback
        return NextResponse.json({
          message: 'Failed to upload to Supabase. Using local storage as fallback.',
          error: error.message,
          rowCount: filteredData.length,
          data: filteredData // Return the data to the client
        });
      }
    } else {
      // If Supabase is not configured, just return a success response
      console.log('DEBUG - Supabase not configured, using local storage only');
      return NextResponse.json({
        success: true,
        message: 'Data received for local processing',
        rowCount: filteredData.length,
        data: filteredData // Return the data to the client
      });
    }
  } catch (error) {
    console.error('DEBUG - Error in upload handler:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Parse CSV content into JSON objects
 */
function parseCSV(csvContent) {
  try {
    // Split into lines
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length === 0) {
      console.log('DEBUG - No lines found in CSV');
      return [];
    }
    
    // Extract headers (first line)
    const headers = lines[0].split(',').map(header => header.trim());
    
    // Basic validation to check if this looks like a CSV
    if (headers.length < 2) {
      console.log('DEBUG - File does not appear to be a valid CSV (not enough columns)');
      return [];
    }
    
    // Validate that we have at least one required field for air quality data
    const requiredFields = ['datetime', 'pm25', 'pm25Standard', 'pm10', 'pm10Standard', 'temperature', 'humidity', 'relativeHumidity'];
    const hasRequiredField = requiredFields.some(field => 
      headers.some(header => header.toLowerCase().includes(field.toLowerCase()))
    );
    
    if (!hasRequiredField) {
      console.log('DEBUG - CSV does not contain any recognized air quality fields');
      return [];
    }
    
    // Parse data lines
    const results = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      
      if (values.length !== headers.length) {
        console.warn(`Line ${i+1} has different number of values (${values.length}) than headers (${headers.length})`);
        // Try to handle mismatched length - take the shorter length
        const obj = {};
        const min = Math.min(headers.length, values.length);
        for (let j = 0; j < min; j++) {
          obj[headers[j]] = values[j];
        }
        results.push(obj);
      } else {
        // Normal case - create an object with header keys and line values
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
          obj[headers[j]] = values[j];
        }
        results.push(obj);
      }
    }
    
    return results;
  } catch (error) {
    console.error('DEBUG - Error parsing CSV:', error);
    return [];
  }
}

/**
 * Parse a CSV line, handling quoted values correctly
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last value
  result.push(current.trim());
  
  return result;
} 