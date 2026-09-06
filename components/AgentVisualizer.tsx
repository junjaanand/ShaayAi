'use client';

import React from 'react';

export type AgentVisualizerState =
  | 'idle'
  | 'listening'
  | 'talking'
  | 'analyzing'
  | 'ambient'
  | 'joining'
  | 'not-joined'
  | 'disconnected';

export interface AgentVisualizerProps {
  state?: AgentVisualizerState | string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AgentVisualizer({
  state = 'ambient',
  size = 'lg',
  className = '',
}: AgentVisualizerProps) {
  const currentState = (state || 'ambient').toLowerCase();

  const sizeMap = {
    sm: { container: 'h-32 w-32', orb: 'h-20 w-20', wave: 'h-28 w-28' },
    md: { container: 'h-48 w-48', orb: 'h-32 w-32', wave: 'h-44 w-44' },
    lg: { container: 'h-64 w-64 md:h-72 md:w-72', orb: 'h-40 w-40 md:h-48 md:w-48', wave: 'h-56 w-56 md:h-64 md:w-64' },
  };
  const dimensions = sizeMap[size] || sizeMap.lg;

  let statusText = 'SahaayAI Ready';
  let orbGradient = 'from-cyan-500 via-blue-600 to-teal-400';
  let glowColor = 'rgba(6, 182, 212, 0.4)';
  let isSpeaking = false;
  let isListening = false;
  let isThinking = false;

  switch (currentState) {
    case 'talking':
    case 'speaking':
      statusText = 'SahaayAI Speaking...';
      orbGradient = 'from-emerald-400 via-teal-500 to-cyan-500';
      glowColor = 'rgba(16, 185, 129, 0.45)';
      isSpeaking = true;
      break;
    case 'listening':
      statusText = 'Listening to you...';
      orbGradient = 'from-cyan-400 via-blue-500 to-indigo-600';
      glowColor = 'rgba(14, 165, 233, 0.45)';
      isListening = true;
      break;
    case 'analyzing':
    case 'thinking':
      statusText = 'Thinking...';
      orbGradient = 'from-purple-500 via-indigo-600 to-cyan-500';
      glowColor = 'rgba(139, 92, 246, 0.45)';
      isThinking = true;
      break;
    case 'joining':
    case 'not-joined':
      statusText = 'Connecting with Agent...';
      orbGradient = 'from-amber-400 via-orange-500 to-yellow-500';
      glowColor = 'rgba(245, 158, 11, 0.35)';
      break;
    case 'disconnected':
      statusText = 'Disconnected';
      orbGradient = 'from-slate-400 via-slate-500 to-slate-600';
      glowColor = 'rgba(100, 116, 139, 0.2)';
      break;
    case 'ambient':
    case 'idle':
    default:
      statusText = 'Assistant Ready';
      orbGradient = 'from-cyan-500 via-blue-600 to-teal-400';
      glowColor = 'rgba(6, 182, 212, 0.35)';
      break;
  }

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      <div className={`relative flex items-center justify-center ${dimensions.container}`}>
        {(isSpeaking || isListening) && (
          <div
            className={`absolute rounded-full border border-cyan-400/30 dark:border-cyan-400/20 animate-ping opacity-30 ${dimensions.wave}`}
            style={{ animationDuration: isSpeaking ? '1.6s' : '2.4s' }}
          />
        )}

        {isSpeaking && (
          <div
            className="absolute rounded-full border border-emerald-400/40 animate-pulse opacity-40 scale-125 transition-transform duration-300 h-48 w-48 md:h-56 md:w-56"
          />
        )}

        <div
          className={`absolute rounded-full blur-2xl transition-all duration-700 opacity-60 ${dimensions.orb}`}
          style={{
            backgroundColor: glowColor,
            transform: isSpeaking ? 'scale(1.3)' : isListening ? 'scale(1.15)' : 'scale(1)',
          }}
        />

        <div
          className={`relative z-10 flex items-center justify-center rounded-full bg-gradient-to-tr shadow-2xl transition-all duration-500 ${orbGradient} ${dimensions.orb} ${
            isThinking ? 'animate-spin' : isSpeaking ? 'scale-105' : 'hover:scale-102'
          }`}
          style={{
            boxShadow: `0 0 50px ${glowColor}, inset 0 0 25px rgba(255, 255, 255, 0.35)`,
            animationDuration: isThinking ? '6s' : undefined,
          }}
        >
          <div className="absolute top-2 left-3 h-1/3 w-1/3 rounded-full bg-white/30 blur-sm pointer-events-none" />

          {isSpeaking ? (
            <div className="flex items-center gap-1.5 z-20">
              <span className="h-6 w-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: '0ms' }} />
              <span className="h-10 w-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: '150ms' }} />
              <span className="h-8 w-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: '300ms' }} />
              <span className="h-12 w-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: '200ms' }} />
              <span className="h-5 w-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: '400ms' }} />
            </div>
          ) : isListening ? (
            <div className="flex items-center gap-1.5 z-20">
              <span className="h-4 w-1 rounded-full bg-white/90 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="h-7 w-1 rounded-full bg-white/90 animate-bounce" style={{ animationDelay: '100ms' }} />
              <span className="h-5 w-1 rounded-full bg-white/90 animate-bounce" style={{ animationDelay: '200ms' }} />
            </div>
          ) : (
            <div className="h-4 w-4 rounded-full bg-white/80 shadow-inner z-20 animate-ping opacity-75" style={{ animationDuration: '3s' }} />
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-4 py-1.5 text-xs font-medium backdrop-blur-md shadow-sm">
        <span
          className={`h-2 w-2 rounded-full ${
            isSpeaking
              ? 'bg-emerald-500 animate-ping'
              : isListening
              ? 'bg-cyan-500 animate-pulse'
              : isThinking
              ? 'bg-purple-500 animate-spin'
              : 'bg-blue-500'
          }`}
        />
        <span className="text-foreground/90">{statusText}</span>
      </div>
    </div>
  );
}
