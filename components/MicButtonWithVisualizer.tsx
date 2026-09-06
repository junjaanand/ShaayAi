'use client';

import React from 'react';
import { Mic, MicOff } from 'lucide-react';
import type { IMicrophoneAudioTrack } from 'agora-rtc-react';

export interface MicButtonWithVisualizerProps {
  isEnabled: boolean;
  setIsEnabled?: (enabled: boolean) => void;
  track?: IMicrophoneAudioTrack | null;
  onToggle?: () => void;
  className?: string;
  'aria-label'?: string;
  enabledColor?: string;
  disabledColor?: string;
}

export function MicButtonWithVisualizer({
  isEnabled,
  onToggle,
  className = '',
  'aria-label': ariaLabel,
}: MicButtonWithVisualizerProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={ariaLabel || (isEnabled ? 'Mute microphone' : 'Unmute microphone')}
      className={`group relative flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 ${
        isEnabled
          ? 'bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 active:scale-95'
          : 'bg-red-500 text-white shadow-red-500/25 hover:bg-red-600 hover:scale-105 active:scale-95'
      } ${className}`}
    >
      {isEnabled && (
        <span className="absolute inset-0 rounded-full border border-cyan-400/50 animate-ping opacity-25 pointer-events-none" />
      )}
      {isEnabled ? (
        <Mic className="h-6 w-6 transition-transform group-hover:scale-110" />
      ) : (
        <MicOff className="h-6 w-6 transition-transform group-hover:scale-110" />
      )}
    </button>
  );
}
