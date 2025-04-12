import React from 'react';
import Hero from './components/Hero';
import { AirQualityDashboard } from './components/StatsCard';
import { ArrowRight, Database, Wind, Map, BarChart4, Activity } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  // Sample data for dashboard preview
  const sampleAirQualityData = {
    pm25: { value: 12.3, change: "-3.5" },
    pm10: { value: 35.6, change: "-2.1" },
    temperature: { value: "22°C", change: "+1.2" },
    humidity: { value: "65%", change: "+3%" },
    overall: { value: "Good", change: "Improved from last week" }
  };

  // Simplified feature set more focused on wildfire air quality monitoring
  const features = [
    {
      icon: <Database className="h-6 w-6 text-[#8C1515]" />,
      title: "Data Upload & Processing",
      description: "Upload CSV datasets from wildfire monitoring stations and process them automatically."
    },
    {
      icon: <Map className="h-6 w-6 text-[#8C1515]" />,
      title: "Geospatial Analysis",
      description: "Visualize wildfire impacts on air quality through interactive geospatial maps."
    },
    {
      icon: <BarChart4 className="h-6 w-6 text-[#8C1515]" />,
      title: "Environmental Metrics",
      description: "Track PM2.5, PM10, temperature, and humidity patterns across research stations."
    },
    {
      icon: <Activity className="h-6 w-6 text-[#8C1515]" />,
      title: "Research Insights",
      description: "Generate data-driven insights for environmental and wildfire research."
    }
  ];

  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <Hero />
      
      {/* About SMesh Section */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="animate-fadeIn">
              <div className="inline-block px-3 py-1 rounded bg-[#8C1515]/10 text-[#8C1515] dark:bg-[#8C1515]/20 dark:text-[#f8d6d6] text-sm font-medium mb-4">
                <span className="flex items-center">
                  <Wind className="w-4 h-4 mr-2" />
                  Stanford University
                </span>
              </div>
              <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">SMesh Wildfire Lab</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                At Stanford's Wildfire Lab, we develop advanced sensor networks and data analysis 
                tools to monitor and understand air quality impacts from wildfires across California.
              </p>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Our SMesh air quality analyzer provides researchers with a powerful platform to upload, 
                visualize, and derive insights from environmental data collected at multiple monitoring stations.
              </p>
              <Link href="/map">
                <button className="flex items-center px-5 py-3 bg-[#8C1515] hover:bg-[#B83A4B] text-white font-medium rounded-lg transition-colors duration-300">
                  Explore Our Data <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </Link>
            </div>
            <div className="w-full max-w-lg mx-auto relative rounded-xl overflow-hidden shadow-xl animate-fadeUp">
              <div className="aspect-w-16 aspect-h-9 bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden">
                {/* Image placeholder - in a real implementation, you would replace this with an actual image */}
                <div className="w-full h-full bg-gradient-to-r from-[#8C1515]/80 to-[#B83A4B]/80 flex items-center justify-center">
                  <Wind className="h-16 w-16 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Air Quality Analysis Features</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Specialized tools for wildfire researchers to analyze environmental data.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700 animate-fadeIn"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="mb-4 bg-[#8C1515]/10 dark:bg-[#8C1515]/20 p-3 rounded-full inline-block">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Dashboard Preview Section */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Air Quality Metrics</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Comprehensive monitoring of key environmental indicators impacted by wildfires.
            </p>
          </div>
          
          <div className="max-w-5xl mx-auto">
            <AirQualityDashboard airQualityData={sampleAirQualityData} />
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-[#8C1515] dark:bg-[#8C1515]/90">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 text-white">Ready to Analyze Wildfire Air Quality Data?</h2>
          <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
            Upload your research data and gain valuable insights through our specialized analysis tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/upload">
              <button className="px-6 py-3 bg-white text-[#8C1515] font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center">
                Upload Data <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </Link>
            <Link href="/query">
              <button className="px-6 py-3 bg-transparent border border-white text-white font-medium rounded-lg hover:bg-white/10 transition-all duration-300">
                Query Existing Data
              </button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
} 