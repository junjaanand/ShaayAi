'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { PhoneOff, ExternalLink, Radio } from 'lucide-react';
import { ConfidenceMeter } from '@/components/ConfidenceMeter';
import { LanguageBadge } from '@/components/LanguageBadge';
import type { ConversationState } from '@/lib/conversation-state';

type SahaayConversationLayoutProps = {
  statusPanel: ReactNode;
  pipelineMetrics: ReactNode;
  transcriptPanel: ReactNode;
  visualizer: ReactNode;
  controls: ReactNode;
  slotFillingCard: ReactNode;
  escalationPanel: ReactNode | null;
  conversationState: ConversationState;
  onEndConversation: () => void;
  onManualEscalate: () => void;
};

export function SahaayConversationLayout({
  statusPanel,
  pipelineMetrics,
  transcriptPanel,
  visualizer,
  controls,
  slotFillingCard,
  escalationPanel,
  conversationState,
  onEndConversation,
  onManualEscalate,
}: SahaayConversationLayoutProps) {
  const isEscalated =
    conversationState?.phase === 'ESCALATING' ||
    conversationState?.phase === 'ESCALATED';

  return (
    <div className="flex min-h-0 flex-1 flex-col text-left">
      {/* Header */}
      <header className="flex shrink-0 flex-col gap-3 border-b border-border/80 bg-card/80 px-4 py-3 shadow-sm backdrop-blur-xl md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-cyan-300 shadow-md dark:bg-cyan-400 dark:text-slate-950">
            <Radio size={19} strokeWidth={2.2} />
          </div>
          <div className="flex min-w-0 flex-col justify-center gap-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="truncate text-lg font-semibold leading-none tracking-tight text-foreground">
                SahaayAI
              </span>
              <LanguageBadge
                detectedLanguages={conversationState?.detectedLanguages || []}
                currentLanguage={conversationState?.currentLanguage || 'en'}
              />
            </div>
            <div className="flex items-center gap-2">
              {pipelineMetrics}
              <ConfidenceMeter
                confidence={conversationState?.overallConfidence ?? 1.0}
                phase={conversationState?.phase || 'GREETING'}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end md:pr-1">
          {statusPanel}
          <a
            href="/humanagent"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 h-9 rounded-md border border-slate-200/90 bg-white/90 px-3 text-xs font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:text-white transition-colors"
            title="Open Human Agent Dashboard in a new tab"
          >
            <span>Agent Dashboard</span>
            <ExternalLink className="h-3 w-3 text-cyan-500" />
          </a>
          {!isEscalated && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-md border-amber-300 px-3 text-xs font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
              onClick={onManualEscalate}
              title="Transfer to human agent"
            >
              <ExternalLink className="mr-1 h-3 w-3" />
              Transfer to Human
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            className="h-9 rounded-md border border-destructive bg-transparent px-3 text-xs font-medium text-destructive hover:bg-destructive/10"
            onClick={onEndConversation}
            aria-label="End conversation"
            title="End conversation"
          >
            <PhoneOff className="mr-1 h-3 w-3" />
            End Call
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex min-h-0 w-full flex-1 flex-col gap-3 px-3 pb-3 pt-3 md:gap-4 md:px-6 md:pb-5 md:pt-5 lg:flex-row lg:gap-0">
        {/* Left: Transcript */}
        <aside className="order-2 h-64 min-h-0 w-full shrink-0 lg:order-1 lg:h-full lg:w-[22rem] lg:pr-5">
          {transcriptPanel}
        </aside>

        {/* Center: Visualizer + Controls */}
        <main className="order-1 flex min-h-0 flex-1 flex-col lg:order-2 lg:border-l lg:border-border/80 lg:pl-5">
          {escalationPanel ? (
            <div className="flex min-h-0 flex-1 flex-col pb-2 pt-3 md:pb-6">
              {escalationPanel}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col pb-2 pt-2 md:pb-5 md:pt-3">
              <div className="voice-stage relative flex min-h-[20rem] min-w-0 flex-1 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-card/30 px-4 py-8">
                <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
                {visualizer}
              </div>
              <div className="shrink-0 pt-4 md:pt-5">{controls}</div>
            </div>
          )}
        </main>

        {/* Right: Slot Filling Card */}
        <aside className="order-3 h-64 min-h-0 w-full shrink-0 lg:h-full lg:w-[20rem] lg:border-l lg:border-border/80 lg:pl-5">
          {slotFillingCard}
        </aside>
      </div>
    </div>
  );
}
