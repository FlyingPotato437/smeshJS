const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Initialize Prisma Client
const prisma = new PrismaClient();

// Process date string from various formats
function parseDate(dateStr) {
  if (!dateStr) return new Date();
  
  try {
    return new Date(dateStr);
  } catch (e) {
    console.error(`Error parsing date: ${dateStr}`);
    return new Date();
  }
}

// Convert string to number, return null if not a valid number
function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

// Process a row from the CSV
function processRow(row) {
  return {
    datetime: parseDate(row.datetime),
    from_node: row.from_node || row.fromNode || null,
    pm10Standard: toNumber(row.pm10Standard || row.pm10 || row['pm10-standard']),
    pm25Standard: toNumber(row.pm25Standard || row.pm25 || row['pm2.5'] || row['pm2.5-standard']),
    pm100Standard: toNumber(row.pm100Standard || row.pm100 || row['pm100-standard']),
    pm10Environmental: toNumber(row.pm10Environmental || row['pm10-environmental']),
    pm25Environmental: toNumber(row.pm25Environmental || row['pm2.5-environmental']),
    pm100Environmental: toNumber(row.pm100Environmental || row['pm100-environmental']),
    rxSnr: toNumber(row.rxSnr || row.snr || row['rx-snr']),
    hopLimit: toNumber(row.hopLimit || row['hop-limit']),
    rxRssi: toNumber(row.rxRssi || row.rssi || row['rx-rssi']),
    hopStart: toNumber(row.hopStart || row['hop-start']),
    from_short_name: row.from_short_name || row.fromShortName || row.shortName || null,
    temperature: toNumber(row.temperature || row.temp),
    relativeHumidity: toNumber(row.relativeHumidity || row.humidity || row['relative-humidity']),
    barometricPressure: toNumber(row.barometricPressure || row.pressure || row['barometric-pressure']),
    gasResistance: toNumber(row.gasResistance || row.gas || row['gas-resistance']),
    iaq: toNumber(row.iaq || row['air-quality-index']),
    latitude: toNumber(row.latitude || row.lat),
    longitude: toNumber(row.longitude || row.lon || row.lng),
    elevation: row.elevation || row.elev || row.altitude || null
  };
}

// Load data from CSV file
async function loadData(filePath) {
  const results = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        try {
          const processedRow = processRow(data);
          results.push(processedRow);
        } catch (error) {
          console.error('Error processing row:', error);
        }
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

// Insert data into the database
async function insertData(data) {
  console.log(`Inserting ${data.length} rows into the database...`);
  
  // Insert in batches to avoid overloading the database
  const batchSize = 100;
  const batches = [];
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    batches.push(batch);
  }
  
  let inserted = 0;
  
  for (const batch of batches) {
    await prisma.airQuality.createMany({
      data: batch,
      skipDuplicates: true,
    });
    inserted += batch.length;
    console.log(`Inserted ${inserted} of ${data.length} rows...`);
  }
  
  console.log(`Successfully inserted ${inserted} rows.`);
}

// Main function to run the script
async function main() {
  try {
    const csvPath = path.resolve(process.cwd(), 'public/data/Dataset_with_Location_Data.csv');
    
    // Check if the file exists
    if (!fs.existsSync(csvPath)) {
      console.error(`CSV file not found at ${csvPath}`);
      console.error('Please make sure to place your CSV file in the public/data directory.');
      return;
    }
    
    console.log(`Loading data from ${csvPath}...`);
    const data = await loadData(csvPath);
    console.log(`Loaded ${data.length} rows from CSV.`);
    
    // Insert data into the database
    await insertData(data);
    
    console.log('Database initialization complete.');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();