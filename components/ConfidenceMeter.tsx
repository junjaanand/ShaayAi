'use client';

import React from 'react';

export interface ConfidenceMeterProps {
  confidence: number;
  phase: string;
}

export function ConfidenceMeter({ confidence, phase }: ConfidenceMeterProps) {
  const safeConfidence = typeof confidence === 'number' && !isNaN(confidence) ? confidence : 1.0;
  const percentage = Math.round(safeConfidence * 100);
  
  let colorClass = 'bg-red-500';
  if (safeConfidence > 0.7) {
    colorClass = 'bg-green-500';
  } else if (safeConfidence >= 0.4) {
    colorClass = 'bg-yellow-500';
  }

  return (
    <div className="w-full flex items-center space-x-3">
      <div className="flex-1 flex flex-col space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground text-gray-500">AI Confidence ({phase})</span>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
            style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
