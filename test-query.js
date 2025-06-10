import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://zwnyvdnxczrpaykqshxx.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3bnl2ZG54Y3pycGF5a3FzaHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxMzA1NTAsImV4cCI6MjA1OTcwNjU1MH0.prNNXXAhICMLIbNc6whELE1AcvBdQkV_GKyyHlwJ8SU";
const supabase = createClient(supabaseUrl, supabaseKey);

async function testNestedQuery() {
  try {
    // Try nested query format
    console.log("Testing nested query format...");
    const { data: nestedData, error: nestedError } = await supabase
      .from("sensor_readings")
      .select("timestamp, pm25, pm10, temperature, humidity, device_id, devices(name, latitude, longitude)")
      .limit(10);
      
    if (nestedError) {
      console.error("Error with nested query:", nestedError);
    } else {
      console.log("Nested query result:", nestedData);
    }
  } catch (error) {
    console.error("Unexpected error:", error);
  }
}

testNestedQuery();
