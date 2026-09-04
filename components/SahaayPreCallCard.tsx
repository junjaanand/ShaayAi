'use client';

import React from 'react';
import { Headphones, Phone, Globe, Zap, Shield, User } from 'lucide-react';

export interface SahaayPreCallCardProps {
  onStartConversation: () => void;
  isLoading: boolean;
  error?: string | null;
}

export function SahaayPreCallCard({ onStartConversation, isLoading, error }: SahaayPreCallCardProps) {
  return (
    <div className="w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 flex flex-col items-center text-center space-y-6">
      <div className="flex flex-col items-center space-y-2">
        <div className="bg-blue-100 text-blue-600 p-4 rounded-full">
          <Headphones size={48} strokeWidth={1.5} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">SahaayAI</h1>
        <p className="text-lg font-medium text-teal-600 dark:text-teal-400">Your Multilingual AI Support Assistant</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">Speak in Hindi, English, or both — I understand</p>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full">
        <div className="flex items-center justify-center space-x-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
          <Globe size={16} className="text-blue-500" />
          <span>Multilingual</span>
        </div>
        <div className="flex items-center justify-center space-x-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
          <Zap size={16} className="text-yellow-500" />
          <span>Real-time</span>
        </div>
        <div className="flex items-center justify-center space-x-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
          <Shield size={16} className="text-green-500" />
          <span>Safe & Private</span>
        </div>
        <div className="flex items-center justify-center space-x-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
          <User size={16} className="text-teal-500" />
          <span>Human Backup</span>
        </div>
      </div>

      {error && (
        <div className="w-full p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={onStartConversation}
        disabled={isLoading}
        className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-xl font-semibold transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <Phone size={20} />
            <span>Start Support Call</span>
          </>
        )}
      </button>

      <p className="text-xs text-gray-400 max-w-sm">
        This AI assistant cannot provide medical, legal, or emergency advice. For emergencies, call 112.
      </p>
    </div>
  );
}
