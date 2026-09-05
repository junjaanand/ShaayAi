'use client';

import React, { useState } from 'react';
import { AlertTriangle, Copy, Check, Info } from 'lucide-react';

export interface EscalationPanelProps {
  escalationReason: string;
  conversationSummary: string;
  confirmedDetails: Record<string, string>;
  uncertainDetails: Record<string, string>;
  missingDetails: string[];
  ticketId: string | null;
  callerLanguageContext: string;
  linearUrl?: string | null;
  slackAlertSent?: boolean;
}

export function EscalationPanel({
  escalationReason,
  conversationSummary,
  confirmedDetails,
  uncertainDetails,
  missingDetails,
  ticketId,
  callerLanguageContext,
  linearUrl,
  slackAlertSent,
}: EscalationPanelProps) {
  const [copied, setCopied] = useState(false);

  const copyTicket = () => {
    if (ticketId) {
      navigator.clipboard.writeText(ticketId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-amber-900/50 p-6 space-y-4 max-h-[80vh] overflow-y-auto shadow-lg">
      <div className="flex items-center space-x-2 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
        <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 shrink-0" />
        <h2 className="font-bold text-lg">Escalated to Human Agent</h2>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {ticketId && (
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Ticket: {ticketId}</span>
            <button onClick={copyTicket} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors" title="Copy Ticket ID">
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </button>
          </div>
        )}
        <div className="inline-flex items-center space-x-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full text-xs font-medium border border-blue-100 dark:border-blue-800">
          <Info size={12} />
          <span>Lang Context: {callerLanguageContext}</span>
        </div>
      </div>

      {/* MCP Action Integrations Status */}
      <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs">
        <span className="font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">MCP Integrations:</span>
        {linearUrl ? (
          <a
            href={linearUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-medium hover:underline"
          >
            <span>Linear Issue</span>
            <span className="text-indigo-500">↗</span>
          </a>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-slate-500 bg-slate-100 dark:bg-slate-800">
            Linear: Synced
          </span>
        )}
        {slackAlertSent !== false && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Slack Alert Sent (#all-sahaayai-support)
          </span>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Why was this escalated?</h3>
        <div className="border-l-4 border-amber-400 bg-gray-50 dark:bg-gray-800/50 p-3 text-sm italic text-gray-700 dark:text-gray-300 rounded-r-lg">
          &ldquo;{escalationReason}&rdquo;
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Context Summary</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
          {conversationSummary}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.keys(confirmedDetails).length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Confirmed Details</h3>
            <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-lg border border-green-100 dark:border-green-900/30 space-y-1.5">
              {Object.entries(confirmedDetails).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="font-medium text-green-800 dark:text-green-400 capitalize">{k.replace(/_/g, ' ')}:</span>
                  <span className="text-green-700 dark:text-green-300">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {Object.keys(uncertainDetails).length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Uncertain Details</h3>
            <div className="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-lg border border-yellow-100 dark:border-yellow-900/30 space-y-1.5">
              {Object.entries(uncertainDetails).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="font-medium text-yellow-800 dark:text-yellow-500 capitalize">{k.replace(/_/g, ' ')}:</span>
                  <span className="text-yellow-700 dark:text-yellow-400">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {missingDetails.length > 0 && (
          <div className="space-y-2 md:col-span-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Missing Details</h3>
            <div className="flex flex-wrap gap-2 bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
              {missingDetails.map((item, i) => (
                <span key={i} className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-1 rounded text-xs font-medium capitalize border border-red-200 dark:border-red-800">
                  {item.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
