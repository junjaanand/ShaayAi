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
    <div className="relative mx-auto flex w-full max-w-xl flex-col items-center overflow-hidden rounded-lg border border-slate-200/80 bg-white/90 p-6 text-center shadow-[0_24px_80px_-32px_rgba(15,23,42,0.45)] backdrop-blur sm:p-10 dark:border-slate-700/70 dark:bg-slate-900/90">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400" />

      <div className="flex flex-col items-center space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-cyan-300 shadow-lg shadow-cyan-950/20 dark:bg-cyan-400 dark:text-slate-950">
          <Headphones size={30} strokeWidth={1.8} />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">Team OASIS support desk</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">SahaayAI</h1>
          <p className="text-base font-medium text-slate-700 dark:text-slate-200">A calm, multilingual voice assistant</p>
          <p className="mx-auto max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">Get help in Hindi, English, or a natural mix of both. Start a private voice session when you&apos;re ready.</p>
        </div>
      </div>

      <div className="mt-8 grid w-full grid-cols-2 gap-2.5 sm:gap-3">
        <div className="flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-2.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
          <Globe size={16} className="text-blue-500" />
          <span>Multilingual</span>
        </div>
        <div className="flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-2.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
          <Zap size={16} className="text-amber-500" />
          <span>Real-time</span>
        </div>
        <div className="flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-2.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
          <Shield size={16} className="text-emerald-500" />
          <span>Safe & Private</span>
        </div>
        <div className="flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-2.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
          <User size={16} className="text-cyan-500" />
          <span>Human Backup</span>
        </div>
      </div>

      {error && (
        <div role="alert" className="mt-5 w-full rounded-md border border-red-200 bg-red-50 p-3 text-left text-sm text-red-600 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </div>
      )}

      <button
        onClick={onStartConversation}
        disabled={isLoading}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-6 py-4 font-semibold text-white shadow-lg shadow-slate-950/15 transition duration-200 hover:-translate-y-0.5 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300"
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

      <p className="mt-5 max-w-sm text-xs leading-5 text-slate-400 dark:text-slate-500">
        This AI assistant cannot provide medical, legal, or emergency advice. For emergencies, call 112.
      </p>
    </div>
  );
}
