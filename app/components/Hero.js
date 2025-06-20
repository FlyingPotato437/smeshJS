"use client";

import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { MoveRight, Wind } from "lucide-react";
import Link from "next/link";

const Particle = ({ className }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const duration = 15 + Math.random() * 10;
    const delay = Math.random() * 5;
    const size = 2 + Math.random() * 4;
    
    ref.current.style.setProperty("--x", `${x}%`);
    ref.current.style.setProperty("--y", `${y}%`);
    ref.current.style.setProperty("--duration", `${duration}s`);
    ref.current.style.setProperty("--delay", `${delay}s`);
    ref.current.style.setProperty("--size", `${size}px`);
  }, []);

  return (
    <div
      ref={ref}
      className={`absolute rounded-full bg-white opacity-20 animate-float ${className}`}
      style={{
        width: "var(--size)",
        height: "var(--size)",
        top: "var(--y)",
        left: "var(--x)",
        animationDuration: "var(--duration)",
        animationDelay: "var(--delay)",
      }}
    />
  );
};

const Hero = ({
  title = "Prescribed Fire GPT",
  subtitle = "An AI-powered system for prescribed fire management, combining domain expertise with advanced language models to support safer, more effective fire operations.",
  ctaText = "Start Planning",
  ctaLink = "/ai-assistant",
  badge = "Stanford University"
}) => {
  const particles = Array.from({ length: 30 }, (_, i) => i);
  
  return (
    <div className="relative overflow-hidden min-h-[80vh] flex items-center justify-center">
      {/* Gradient Background - Stanford colors */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#8C1515] via-[#B83A4B] to-[#75787B] dark:from-[#8C1515] dark:via-[#4D4F53] dark:to-[#2E2D29] z-0" />
      
      {/* Particles */}
      <div className="absolute inset-0 z-10">
        {particles.map((i) => (
          <Particle key={i} />
        ))}
      </div>
      
      {/* Content */}
      <div className="container relative z-20 mx-auto px-4 py-16">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <div>
            <div className="inline-block bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm mb-6 py-1 px-3 rounded-full text-sm font-medium text-[#8C1515] dark:text-white">
              <span className="flex items-center">
                <Wind className="w-4 h-4 mr-2" />
                {badge}
              </span>
            </div>
          </div>
          
          <motion.h1 
            className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 drop-shadow-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {title}
          </motion.h1>
          
          <motion.p 
            className="text-xl text-white/90 mb-10 max-w-2xl drop-shadow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {subtitle}
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex space-x-4"
          >
            <Link href={ctaLink}>
              <button 
                className="px-6 py-3 bg-white dark:bg-gray-800 text-[#8C1515] dark:text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center"
              >
                {ctaText} <MoveRight className="ml-2 h-4 w-4" />
              </button>
            </Link>
            <Link href="/fire-planning">
              <button 
                className="px-6 py-3 bg-transparent border border-white text-white rounded-lg font-medium hover:bg-white/10 transition-all duration-300 flex items-center"
              >
                Fire Planning Tools
              </button>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Hero; 