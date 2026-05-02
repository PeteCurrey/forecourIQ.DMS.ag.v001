'use client'

import { cn } from '@/lib/utils'

export default function PortfolioHealthGauge({ score }: { score: number }) {
  // Determine color based on score
  let colorClass = "text-negative"
  let colorHex = "#C94040" // negative
  
  if (score >= 75) {
    colorClass = "text-positive"
    colorHex = "#3DB87A" // positive
  } else if (score >= 50) {
    colorClass = "text-warning"
    colorHex = "#D4922A" // warning
  }

  // Calculate SVG arc
  const radius = 60
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className="bg-carbon border border-steel rounded-[2px] p-6 flex flex-col items-center justify-center relative">
      <div className="relative w-40 h-40 flex items-center justify-center">
        {/* Background Arc */}
        <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 140 140">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="transparent"
            stroke="#1C2029"
            strokeWidth="8"
          />
          {/* Progress Arc */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="transparent"
            stroke={colorHex}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        
        {/* Score Text */}
        <div className="flex flex-col items-center z-10">
          <span className={cn("font-syne font-bold text-5xl leading-none", colorClass)}>
            {score}
          </span>
        </div>
      </div>
      
      <p className="font-mono text-[10px] text-pewter uppercase tracking-[0.12em] mt-2 text-center absolute bottom-6">
        Portfolio Health
      </p>
    </div>
  )
}
