'use client';

import { SupportAgentDashboard } from '@/components/SupportAgentView';

export default function HumanAgentPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-950 dark:to-gray-900">
      <SupportAgentDashboard />
    </div>
  );
}
