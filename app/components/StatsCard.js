"use client";

import React, { useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Users, Wind, Droplets, Thermometer, Activity } from "lucide-react";

// AnimatedGradient Component
const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

function useDimensions(ref) {
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    let timeoutId;

    const updateDimensions = () => {
      if (ref.current) {
        const { width, height } = ref.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    const debouncedUpdateDimensions = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateDimensions, 250);
    };

    // Initial measurement
    updateDimensions();

    window.addEventListener('resize', debouncedUpdateDimensions);

    return () => {
      window.removeEventListener('resize', debouncedUpdateDimensions);
      clearTimeout(timeoutId);
    };
  }, [ref]);

  return dimensions;
}

const AnimatedGradient = ({
  colors,
  speed = 5,
  blur = "light",
}) => {
  const containerRef = useRef();
  const dimensions = useDimensions(containerRef);
  const [randomValues, setRandomValues] = React.useState(null);
  const [mounted, setMounted] = React.useState(false);

  const circleSize = useMemo(
    () => Math.max(dimensions.width, dimensions.height),
    [dimensions.width, dimensions.height]
  );

  const blurClass =
    blur === "light"
      ? "blur-2xl"
      : blur === "medium"
      ? "blur-3xl"
      : "blur-[100px]";
      
  // Generate random values only on the client side after hydration
  React.useEffect(() => {
    setMounted(true);
    
    // Generate random values for each color
    const values = colors.map(() => ({
      top: Math.random() * 50,
      left: Math.random() * 50,
      tx1: Math.random() - 0.5,
      ty1: Math.random() - 0.5,
      tx2: Math.random() - 0.5,
      ty2: Math.random() - 0.5,
      tx3: Math.random() - 0.5,
      ty3: Math.random() - 0.5,
      tx4: Math.random() - 0.5,
      ty4: Math.random() - 0.5,
      width: circleSize * randomInt(0.5, 1.5),
      height: circleSize * randomInt(0.5, 1.5),
    }));
    
    setRandomValues(values);
  }, [colors.length, circleSize]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <div className={`absolute inset-0 ${blurClass}`}>
        {mounted && randomValues && colors.map((color, index) => (
          <svg
            key={index}
            className="absolute animate-background-gradient"
            style={{
              top: `${randomValues[index].top}%`,
              left: `${randomValues[index].left}%`,
              "--background-gradient-speed": `${1 / speed}s`,
              "--tx-1": randomValues[index].tx1,
              "--ty-1": randomValues[index].ty1,
              "--tx-2": randomValues[index].tx2,
              "--ty-2": randomValues[index].ty2,
              "--tx-3": randomValues[index].tx3,
              "--ty-3": randomValues[index].ty3,
              "--tx-4": randomValues[index].tx4,
              "--ty-4": randomValues[index].ty4,
            }}
            width={randomValues[index].width}
            height={randomValues[index].height}
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="50"
              fill={color}
              className="opacity-30 dark:opacity-[0.15]"
            />
          </svg>
        ))}
      </div>
    </div>
  );
};

// Stats Card Component
const StatsCard = ({
  title,
  value,
  subtitle,
  colors,
  delay,
  icon,
}) => {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: delay + 0.3,
      },
    },
  };

  const item = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.5 } },
  };

  return (
    <motion.div
      className="relative overflow-hidden h-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay }}
    >
      <AnimatedGradient colors={colors} speed={0.05} blur="medium" />
      <motion.div
        className="relative z-10 p-3 sm:p-5 md:p-6 text-gray-800 dark:text-white backdrop-blur-sm"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <div className="flex justify-between items-start mb-4">
          <motion.h3 
            className="text-sm sm:text-base md:text-lg text-gray-800 dark:text-white" 
            variants={item}
          >
            {title}
          </motion.h3>
          <motion.div 
            className="text-[#8C1515] dark:text-[#f8d6d6]"
            variants={item}
          >
            {icon}
          </motion.div>
        </div>
        <motion.p
          className="text-2xl sm:text-3xl md:text-4xl font-medium mb-2 text-gray-900 dark:text-white"
          variants={item}
        >
          {value}
        </motion.p>
        {subtitle && (
          <motion.p 
            className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1" 
            variants={item}
          >
            {subtitle}
            <ArrowUpRight className="h-4 w-4 text-[#8C1515] dark:text-[#f8d6d6]" />
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
};

// Air Quality Dashboard Component
const AirQualityDashboard = ({ className, airQualityData }) => {
  // Default data if none is provided
  const data = airQualityData || {
    pm25: { value: 15.2, change: "+2.3" },
    pm10: { value: 42.7, change: "-1.5" },
    temperature: { value: "24°C", change: "+0.8" },
    humidity: { value: "68%", change: "+5%" },
    overall: { value: "Good", change: "Improved from yesterday" }
  };

  // Stanford color palette
  const stanfordColors = {
    cardinal: "#8C1515",
    brightRed: "#B83A4B",
    gray: "#4D4F53",
    sandstone: "#D2C295",
    darkGray: "#2E2D29",
  };

  return (
    <div className={`w-full bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-100 dark:border-gray-700 shadow-md ${className}`}>
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center">
        <Activity className="h-5 w-5 mr-2 text-[#8C1515]" />
        Environmental Monitoring
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="md:col-span-2">
          <StatsCard
            title="PM2.5 Concentration"
            value={`${data.pm25.value} µg/m³`}
            subtitle={`${data.pm25.change} from yesterday`}
            colors={[stanfordColors.cardinal, stanfordColors.brightRed, stanfordColors.sandstone]}
            delay={0.2}
            icon={<Wind className="h-5 w-5" />}
          />
        </div>
        <StatsCard
          title="PM10 Concentration"
          value={`${data.pm10.value} µg/m³`}
          subtitle={`${data.pm10.change} from yesterday`}
          colors={[stanfordColors.brightRed, stanfordColors.sandstone, stanfordColors.gray]}
          delay={0.4}
          icon={<Activity className="h-5 w-5" />}
        />
        <StatsCard
          title="Temperature"
          value={data.temperature.value}
          subtitle={`${data.temperature.change} from yesterday`}
          colors={[stanfordColors.sandstone, stanfordColors.brightRed, stanfordColors.cardinal]}
          delay={0.6}
          icon={<Thermometer className="h-5 w-5" />}
        />
        <div className="md:col-span-2">
          <StatsCard
            title="Humidity"
            value={data.humidity.value}
            subtitle={`${data.humidity.change} from yesterday`}
            colors={[stanfordColors.gray, stanfordColors.sandstone, stanfordColors.cardinal]}
            delay={0.8}
            icon={<Droplets className="h-5 w-5" />}
          />
        </div>
        <div className="md:col-span-3">
          <StatsCard
            title="Overall Air Quality"
            value={data.overall.value}
            subtitle={data.overall.change}
            colors={[stanfordColors.cardinal, stanfordColors.brightRed, stanfordColors.gray]}
            delay={1}
            icon={<Activity className="h-5 w-5" />}
          />
        </div>
      </div>
    </div>
  );
};

export { StatsCard, AirQualityDashboard }; 