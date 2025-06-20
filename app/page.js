"use client";

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, Database, Wind, Map, BarChart4, Activity } from 'lucide-react';
import Link from 'next/link';

// Lazy load heavy components to improve initial page load
const Hero = dynamic(() => import('./components/Hero'), {
  ssr: true,
  loading: () => (
    <div className="min-h-[80vh] bg-gradient-to-br from-[#8C1515] to-[#B83A4B] flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-t-transparent border-white rounded-full animate-spin"></div>
    </div>
  )
});

const AirQualityDashboard = dynamic(() => import('./components/StatsCard').then(mod => ({ default: mod.AirQualityDashboard })), {
  ssr: false,
  loading: () => (
    <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-t-transparent border-gray-400 rounded-full animate-spin"></div>
    </div>
  )
});

export default function Home() {
  // Sample data for prescribed fire dashboard preview
  const sampleFireData = {
    totalBurns: { value: 156, change: "+12" },
    acres: { value: "2,847", change: "+340" },
    success: { value: "94%", change: "+2%" },
    riskReduction: { value: "High", change: "Improved community safety" },
    overall: { value: "Excellent", change: "Meeting all objectives" }
  };

  // Streamlined fire management features
  const features = [
    {
      icon: <Database className="h-5 w-5 text-[#8C1515]" />,
      title: "AI Assistant",
      description: "Expert fire management guidance powered by domain-specific knowledge."
    },
    {
      icon: <Map className="h-5 w-5 text-[#8C1515]" />,
      title: "Risk Assessment", 
      description: "Real-time safety evaluation with automated recommendations."
    },
    {
      icon: <BarChart4 className="h-5 w-5 text-[#8C1515]" />,
      title: "Fire Planning",
      description: "Comprehensive burn plan development and resource management."
    }
  ];

  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <Hero />
      
      {/* About Prescribed Fire GPT Section */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="animate-fadeIn">
              <div className="inline-block px-3 py-1 rounded bg-[#8C1515]/10 text-[#8C1515] dark:bg-[#8C1515]/20 dark:text-[#f8d6d6] text-sm font-medium mb-4">
                <span className="flex items-center">
                  <Activity className="w-4 h-4 mr-2" />
                  Stanford University
                </span>
              </div>
              <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Prescribed Fire GPT</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                An AI-powered system for prescribed fire management, inspired by Argonne National Lab's WildfireGPT. 
                We combine domain-specific knowledge with advanced language models to support fire managers.
              </p>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Our platform integrates weather data, vegetation analysis, historical burn records, and scientific 
                literature to provide intelligent recommendations for prescribed fire planning and execution.
              </p>
              <Link href="/ai-assistant">
                <button className="flex items-center px-5 py-3 bg-[#8C1515] hover:bg-[#B83A4B] text-white font-medium rounded-lg transition-colors duration-300">
                  Ask the AI Assistant <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </Link>
            </div>
            <div className="w-full max-w-lg mx-auto relative rounded-xl overflow-hidden shadow-xl animate-fadeUp">
              <div className="aspect-w-16 aspect-h-9 bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden">
                {/* Image placeholder - in a real implementation, you would replace this with an actual image */}
                <div className="w-full h-full bg-gradient-to-r from-[#8C1515]/80 to-[#B83A4B]/80 flex items-center justify-center">
                  <Activity className="h-16 w-16 text-white" />
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
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Prescribed Fire Management Features</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Advanced AI-powered tools for safe and effective prescribed fire operations.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700"
              >
                <div className="mb-3 bg-[#8C1515]/10 dark:bg-[#8C1515]/20 p-2.5 rounded-lg inline-block">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">{feature.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Dashboard Preview Section */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Prescribed Fire Metrics</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Real-time monitoring of prescribed fire operations and ecosystem health indicators.
            </p>
          </div>
          
          <div className="max-w-5xl mx-auto">
            <Suspense fallback={
              <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-t-transparent border-gray-400 rounded-full animate-spin"></div>
                <span className="ml-2 text-gray-500">Loading dashboard...</span>
              </div>
            }>
              <AirQualityDashboard airQualityData={sampleFireData} />
            </Suspense>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-[#8C1515] dark:bg-[#8C1515]/90">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 text-white">Ready to Plan Your Next Prescribed Fire?</h2>
          <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
            Get AI-powered recommendations and access comprehensive fire management tools for safer, more effective burns.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/ai-assistant">
              <button className="px-6 py-3 bg-white text-[#8C1515] font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center">
                Ask AI Assistant <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </Link>
            <Link href="/fire-planning">
              <button className="px-6 py-3 bg-transparent border border-white text-white font-medium rounded-lg hover:bg-white/10 transition-all duration-300">
                Fire Planning Tools
              </button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
} 