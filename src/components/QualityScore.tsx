import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';

interface QualityScoreProps {
  score: number;
}

export default function QualityScore({ score }: QualityScoreProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const steps = 60;
    const stepTime = Math.abs(Math.floor(duration / steps));
    const increment = score / steps;
    let current = 0;
    let hasTriggeredConfetti = false;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setAnimatedScore(score);
        clearInterval(timer);
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (score >= 90 && !hasTriggeredConfetti && !prefersReducedMotion) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#10B981', '#34D399', '#059669', '#FBBF24']
          });
          hasTriggeredConfetti = true;
        }
      } else {
        setAnimatedScore(Math.floor(current));
      }
    }, stepTime);
    
    return () => clearInterval(timer);
  }, [score]);

  let status = '';
  let color = '';

  if (score >= 90) {
    status = 'Excellent';
    color = '#10B981'; // emerald-500
  } else if (score >= 75) {
    status = 'Good';
    color = '#3B82F6'; // blue-500
  } else if (score >= 60) {
    status = 'Fair';
    color = '#F59E0B'; // amber-500
  } else if (score >= 40) {
    status = 'Poor';
    color = '#F97316'; // orange-500
  } else {
    status = 'Critical';
    color = '#EF4444'; // red-500
  }

  const data = [
    { name: 'Score', value: animatedScore },
    { name: 'Remaining', value: 100 - animatedScore },
  ];

  return (
    <div className="relative flex flex-col items-center justify-center p-6 bg-white dark:bg-[#111113] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden h-full">
      <div className="w-full flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Data Health Score</h3>
        <div 
          className="px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase"
          style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}30` }}
        >
          {status}
        </div>
      </div>
      
      <div 
        className="relative w-full aspect-square max-w-[180px] mx-auto mt-2" 
        role="img" 
        aria-label={`Data Health Score is ${animatedScore} out of 100, which is considered ${status}.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="75%"
              outerRadius="95%"
              startAngle={210}
              endAngle={-30}
              dataKey="value"
              stroke="none"
              cornerRadius={6}
            >
              <Cell fill={color} />
              <Cell fill="currentColor" className="text-gray-100 dark:text-gray-800" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center -mt-2">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 250, damping: 20 }}
            className="flex items-baseline"
          >
            <span className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
              {animatedScore}
            </span>
            <span className="text-lg font-medium text-gray-400 dark:text-gray-500 ml-1">/100</span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
