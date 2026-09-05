'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Headphones, Inbox, ChevronDown, ChevronUp, AlertCircle, Clock, Search, RefreshCw, Activity, ExternalLink } from 'lucide-react';

interface Ticket {
  id: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  escalationReason: string;
  conversationSummary: string;
  confirmedDetails: Record<string, string>;
  uncertainDetails: Record<string, string>;
  missingDetails: string[];
  callerLanguageContext: string;
  questionsAsked?: string[];
  linearUrl?: string | null;
  linearIssueKey?: string | null;
  slackAlertSent?: boolean;
}

const PRIORITY_COLORS = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
  LOW: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
};

const STATUS_COLORS = {
  OPEN: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-300 dark:border-cyan-900',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900',
  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900',
  CLOSED: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

export function SupportAgentView() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Ticket['status']>('ALL');

  const fetchTickets = useCallback(async (manual = false) => {
      if (manual) setIsRefreshing(true);
      try {
        const res = await fetch('/api/get-tickets', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const rawTickets = data.tickets || [];
          // Normalize whether tickets come from ticketStore or raw format
          const normalized: Ticket[] = rawTickets.map((t: Record<string, unknown>) => {
            const pkg = (t.escalationPackage || {}) as Record<string, unknown>;
            const createdAt = t.createdAt;
            return {
              id: String(t.ticketId || t.id || ''),
              priority: (t.priority as Ticket['priority']) || 'MEDIUM',
              status: (t.status as Ticket['status']) || 'OPEN',
              createdAt: typeof createdAt === 'number' ? new Date(createdAt).toISOString() : String(createdAt || new Date().toISOString()),
              updatedAt: typeof t.updatedAt === 'number' ? new Date(t.updatedAt).toISOString() : String(t.updatedAt || createdAt || new Date().toISOString()),
              escalationReason: String(pkg.escalationReason || t.escalationReason || 'Human review required'),
              conversationSummary: String(pkg.conversationSummary || t.conversationSummary || 'No summary available'),
              confirmedDetails: (pkg.confirmedDetails || t.confirmedDetails || {}) as Record<string, string>,
              uncertainDetails: (pkg.uncertainDetails || t.uncertainDetails || {}) as Record<string, string>,
              missingDetails: (pkg.missingDetails || t.missingDetails || []) as string[],
              callerLanguageContext: String(pkg.callerLanguageContext || t.callerLanguageContext || 'Multilingual (Hindi/English)'),
              questionsAsked: (pkg.questionsAsked || t.questionsAsked || []) as string[],
              linearUrl: (t.linearUrl as string) || (pkg.linearUrl as string) || null,
              linearIssueKey: (t.linearIssueKey as string) || (pkg.linearIssueKey as string) || null,
              slackAlertSent: Boolean(t.slackAlertSent || pkg.slackAlertSent),
            };
          });
          setTickets(normalized);
        }
      } catch (err) {
        console.error('Failed to fetch tickets:', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }, []);

  useEffect(() => {
    void fetchTickets();
    const interval = setInterval(() => void fetchTickets(), 5000);
    return () => clearInterval(interval);
  }, [fetchTickets]);

  const toggleTicket = (id: string) => {
    setSelectedTicketId(prev => prev === id ? null : id);
  };

  const filteredTickets = tickets.filter((ticket) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesStatus = statusFilter === 'ALL' || ticket.status === statusFilter;
    const matchesQuery = !query || [ticket.id, ticket.escalationReason, ticket.conversationSummary, ticket.callerLanguageContext]
      .some((value) => value.toLowerCase().includes(query));
    return matchesStatus && matchesQuery;
  });
  const openCount = tickets.filter((ticket) => ticket.status === 'OPEN').length;
  const activeCount = tickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length;
  const urgentCount = tickets.filter((ticket) => ticket.priority === 'CRITICAL' || ticket.priority === 'HIGH').length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-6 md:py-8">
      <div className="flex flex-col gap-5 border-b border-slate-200/80 pb-6 dark:border-slate-800 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-cyan-300 shadow-lg dark:bg-cyan-400 dark:text-slate-950">
            <Headphones size={22} />
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Live queue</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Support operations</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Review escalations and keep callers moving.</p>
          </div>
        </div>
        <button type="button" onClick={() => void fetchTickets(true)} disabled={isRefreshing} className="inline-flex h-9 items-center justify-center gap-2 self-start rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white md:self-auto">
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          Refresh queue
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Total cases', value: tickets.length, icon: Inbox, tone: 'text-slate-600 dark:text-slate-300' },
          { label: 'Waiting', value: openCount, icon: Activity, tone: 'text-cyan-600 dark:text-cyan-300' },
          { label: 'In progress', value: activeCount, icon: Clock, tone: 'text-blue-600 dark:text-blue-300' },
          { label: 'Priority cases', value: urgentCount, icon: AlertCircle, tone: 'text-amber-600 dark:text-amber-300' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-lg border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className={`mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${tone}`}><Icon size={15} />{label}</div>
            <div className="text-2xl font-semibold text-slate-950 dark:text-white">{value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <label className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search ticket, reason, or language" className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
        </label>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <option value="ALL">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Escalated cases</h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">{filteredTickets.length} shown</span>
      </div>

      {isLoading && tickets.length === 0 ? (
        <div className="flex justify-center rounded-lg border border-slate-200 bg-white p-12 dark:border-slate-800 dark:bg-slate-900">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-200 border-t-cyan-600" />
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/60 py-16 text-slate-500 dark:border-slate-700 dark:bg-slate-900/50">
          <Inbox size={48} className="text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">{tickets.length === 0 ? 'No escalated tickets yet' : 'No matching cases'}</h3>
          <p className="text-sm">{tickets.length === 0 ? 'New escalations will appear here automatically.' : 'Try changing the search or status filter.'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map(ticket => {
            const isExpanded = selectedTicketId === ticket.id;
            return (
              <div key={ticket.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-700">
                <div 
                  className="p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  onClick={() => toggleTicket(ticket.id)}
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="font-mono text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {ticket.id}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${PRIORITY_COLORS[ticket.priority]}`}>
                        {ticket.priority}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${STATUS_COLORS[ticket.status]}`}>
                        {ticket.status}
                      </span>
                      {ticket.linearUrl && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 flex items-center gap-1">
                          Linear {ticket.linearIssueKey || 'Issue'}
                        </span>
                      )}
                      {ticket.slackAlertSent && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                          Slack Sent
                        </span>
                      )}
                    </div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                      <AlertCircle size={14} className="mr-1.5 shrink-0 text-amber-500" />
                      {ticket.escalationReason}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 sm:space-x-6 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock size={14} className="mr-1.5" />
                      {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50 space-y-4">
                    {/* MCP Action Integrations Status */}
                    {(ticket.linearUrl || ticket.slackAlertSent) && (
                      <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs">
                        <span className="font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">MCP Integrations:</span>
                        {ticket.linearUrl && (
                          <a
                            href={ticket.linearUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-medium hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>Linear {ticket.linearIssueKey ? `(${ticket.linearIssueKey})` : 'Issue'}</span>
                            <ExternalLink size={12} />
                          </a>
                        )}
                        {ticket.slackAlertSent && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Slack Alert Sent (#all-sahaayai-support)
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Language:</span>
                      <span className="text-sm bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded">{ticket.callerLanguageContext}</span>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Summary</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                        {ticket.conversationSummary}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {ticket.confirmedDetails && Object.keys(ticket.confirmedDetails).length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Confirmed Details</h4>
                          <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded border border-green-100 dark:border-green-900/30 space-y-1">
                            {Object.entries(ticket.confirmedDetails).map(([k, v]) => (
                              <div key={k} className="flex justify-between text-sm">
                                <span className="text-green-800 dark:text-green-400 font-medium capitalize">{k.replace(/_/g, ' ')}:</span>
                                <span className="text-green-700 dark:text-green-300">{v}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {ticket.uncertainDetails && Object.keys(ticket.uncertainDetails).length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Uncertain Details</h4>
                          <div className="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded border border-yellow-100 dark:border-yellow-900/30 space-y-1">
                            {Object.entries(ticket.uncertainDetails).map(([k, v]) => (
                              <div key={k} className="flex justify-between text-sm">
                                <span className="text-yellow-800 dark:text-yellow-500 font-medium capitalize">{k.replace(/_/g, ' ')}:</span>
                                <span className="text-yellow-700 dark:text-yellow-400">{v}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {ticket.missingDetails && ticket.missingDetails.length > 0 && (
                        <div className="md:col-span-2">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Missing Details</h4>
                          <div className="flex flex-wrap gap-2">
                            {ticket.missingDetails.map((item, i) => (
                              <span key={i} className="text-xs bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800 px-2 py-1 rounded capitalize">
                                {item.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {ticket.questionsAsked && ticket.questionsAsked.length > 0 && (
                        <div className="md:col-span-2">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Questions Asked by Caller</h4>
                          <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1 bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                            {ticket.questionsAsked.map((q, i) => (
                              <li key={i}>{q}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const SupportAgentDashboard = SupportAgentView;
