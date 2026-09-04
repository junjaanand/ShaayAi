'use client';

import React from 'react';
import { ClipboardList, CheckCircle2, AlertCircle, Circle } from 'lucide-react';

export interface Slot {
  value: string | null;
  confirmed: boolean;
  confidence: string;
}

export interface SlotFillingCardProps {
  slots: {
    caller_name: Slot;
    issue_category: Slot;
    issue_description: Slot;
    contact_number: Slot;
    location: Slot;
    urgency_level: Slot;
  };
  phase: string;
}

const formatLabel = (key: string) => {
  return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export function SlotFillingCard({ slots, phase }: SlotFillingCardProps) {
  const safeSlots = slots || {};
  const slotEntries = Object.entries(safeSlots);
  const totalSlots = slotEntries.length;
  const filledSlots = slotEntries.filter(([_, slot]) => slot?.value !== null && slot?.value !== undefined).length;
  const progressPercent = totalSlots > 0 ? (filledSlots / totalSlots) * 100 : 0;

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-gray-800 dark:text-gray-100">
          <ClipboardList size={20} className="text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold">Information Collected</h3>
        </div>
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {filledSlots} / {totalSlots}
        </div>
      </div>
      
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
        <div 
          className="bg-blue-600 h-1.5 rounded-full transition-all duration-500" 
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="space-y-2">
        {slotEntries.map(([key, slot]) => (
          <div key={key} className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
            <div className="flex items-center space-x-2">
              {slot?.confirmed ? (
                <CheckCircle2 size={16} className="text-green-500" />
              ) : slot?.value ? (
                <AlertCircle size={16} className="text-yellow-500" />
              ) : (
                <Circle size={16} className="text-gray-300 dark:text-gray-600" />
              )}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{formatLabel(key)}</span>
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[50%]">
              {slot?.value || '—'}
            </span>
          </div>
        ))}
      </div>

      <div className="pt-2">
        <span className="inline-block px-2.5 py-1 text-xs font-semibold bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 rounded-full">
          Phase: {phase || 'Unknown'}
        </span>
      </div>
    </div>
  );
}
