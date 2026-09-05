'use client';

import { SupportAgentDashboard } from '@/components/SupportAgentView';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AgentDashboardPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-950 dark:to-gray-900">
      <div className="mx-auto flex w-full max-w-6xl px-4 pt-4 md:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white/80 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-cyan-400 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:text-white"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to SahaayAI
        </Link>
      </div>
      <SupportAgentDashboard />
    </div>
  );
}
