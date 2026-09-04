'use client';

import React from 'react';
import { Globe } from 'lucide-react';

export interface LanguageBadgeProps {
  detectedLanguages: string[];
  currentLanguage?: string;
}

const LANG_MAP: Record<string, string> = {
  'hi': 'हिंदी',
  'en': 'English',
  'hi-en': 'Hinglish',
};

export function LanguageBadge({ detectedLanguages }: LanguageBadgeProps) {
  if (!detectedLanguages || !Array.isArray(detectedLanguages) || detectedLanguages.length === 0) return null;

  const displayNames = detectedLanguages.map(code => LANG_MAP[code] || code).join(', ');

  return (
    <div className="inline-flex items-center space-x-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full text-xs font-medium border border-blue-200 dark:border-blue-800 shadow-sm">
      <Globe size={12} className="shrink-0" />
      <span>{displayNames}</span>
    </div>
  );
}
