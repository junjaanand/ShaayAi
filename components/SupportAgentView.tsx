'use client';

import React, { useState, useEffect } from 'react';
import { Headphones, Inbox, ChevronDown, ChevronUp, AlertCircle, Clock } from 'lucide-react';

interface Ticket {
  id: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: string;
  createdAt: string;
  escalationReason: string;
  conversationSummary: string;
  confirmedDetails: Record<string, string>;
  uncertainDetails: Record<string, string>;
  missingDetails: string[];
  callerLanguageContext: string;
  questionsAsked?: string[];
}

const PRIORITY_COLORS = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
  LOW: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
};

export function SupportAgentView() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await fetch('/api/get-tickets');
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
              status: String(t.status || 'OPEN'),
              createdAt: typeof createdAt === 'number' ? new Date(createdAt).toISOString() : String(createdAt || new Date().toISOString()),
              escalationReason: String(pkg.escalationReason || t.escalationReason || 'Human review required'),
              conversationSummary: String(pkg.conversationSummary || t.conversationSummary || 'No summary available'),
              confirmedDetails: (pkg.confirmedDetails || t.confirmedDetails || {}) as Record<string, string>,
              uncertainDetails: (pkg.uncertainDetails || t.uncertainDetails || {}) as Record<string, string>,
              missingDetails: (pkg.missingDetails || t.missingDetails || []) as string[],
              callerLanguageContext: String(pkg.callerLanguageContext || t.callerLanguageContext || 'Multilingual (Hindi/English)'),
              questionsAsked: (pkg.questionsAsked || t.questionsAsked || []) as string[],
            };
          });
          setTickets(normalized);
        }
      } catch (err) {
        console.error('Failed to fetch tickets:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTickets();
    const interval = setInterval(fetchTickets, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleTicket = (id: string) => {
    setSelectedTicketId(prev => prev === id ? null : id);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-3 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="bg-blue-600 text-white p-2 rounded-lg">
          <Headphones size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Support Agent Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Live view of escalated tickets</p>
        </div>
      </div>

      {isLoading && tickets.length === 0 ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
          <Inbox size={48} className="text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No escalated tickets yet</h3>
          <p className="text-sm">New escalations will appear here automatically.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map(ticket => {
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
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">
                        {ticket.status}
                      </span>
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
