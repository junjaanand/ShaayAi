'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { PhoneOff, ExternalLink } from 'lucide-react';
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
    conversationState.phase === 'ESCALATING' ||
    conversationState.phase === 'ESCALATED';

  return (
    <div className="flex min-h-0 flex-1 flex-col text-left">
      {/* Header */}
      <header className="flex shrink-0 flex-col gap-3 border-b border-border bg-white/80 px-4 py-3 backdrop-blur-sm dark:bg-gray-900/80 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-teal-500 text-lg font-bold text-white">
            S
          </div>
          <div className="flex min-w-0 flex-col justify-center gap-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-lg font-semibold leading-none tracking-tight text-foreground">
                SahaayAI
              </span>
              <LanguageBadge
                detectedLanguages={conversationState.detectedLanguages}
                currentLanguage={conversationState.currentLanguage}
              />
            </div>
            <div className="flex items-center gap-2">
              {pipelineMetrics}
              <ConfidenceMeter
                confidence={conversationState.overallConfidence}
                phase={conversationState.phase}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:pr-1">
          {statusPanel}
          {!isEscalated && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-md border-amber-300 px-3 text-xs font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
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
            className="h-8 rounded-md border border-destructive bg-transparent px-3 text-xs font-medium text-destructive hover:bg-destructive/10"
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
      <div className="flex min-h-0 w-full flex-1 flex-col gap-4 px-4 pb-4 pt-4 md:px-6 lg:flex-row lg:gap-0">
        {/* Left: Transcript */}
        <aside className="order-2 h-64 min-h-0 w-full shrink-0 lg:order-1 lg:h-full lg:w-[22rem]">
          {transcriptPanel}
        </aside>

        {/* Center: Visualizer + Controls */}
        <main className="order-1 flex min-h-0 flex-1 flex-col lg:order-2 lg:border-l lg:border-border/80 lg:pl-6">
          {escalationPanel ? (
            <div className="flex min-h-0 flex-1 flex-col pb-2 pt-3 md:pb-6">
              {escalationPanel}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col pb-2 pt-3 md:pb-6">
              <div className="flex min-h-0 flex-1 items-center justify-center">
                {visualizer}
              </div>
              <div className="shrink-0 pt-4">{controls}</div>
            </div>
          )}
        </main>

        {/* Right: Slot Filling Card */}
        <aside className="order-3 h-64 min-h-0 w-full shrink-0 lg:h-full lg:w-[20rem] lg:border-l lg:border-border/80 lg:pl-4">
          {slotFillingCard}
        </aside>
      </div>
    </div>
  );
}
