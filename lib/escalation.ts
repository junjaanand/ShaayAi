import { ConversationState, getConfirmedSlots, getUncertainSlots, getMissingSlots } from './conversation-state';

export interface EscalationPackage {
  conversationSummary: string;
  callerLanguageContext: string;
  confirmedDetails: Record<string, string>;
  uncertainDetails: Record<string, string>;
  missingDetails: string[];
  questionsAsked: string[];
  escalationReason: string;
  safetyBoundaryHit: boolean;
  timestamp: string;
  ticketId?: string;
}

export function buildEscalationPackage(state: ConversationState, transcriptText: string[]): EscalationPackage {
  const recentTranscript = transcriptText.slice(-10).join('\n');
  
  let languageContext = `Current language: ${state.currentLanguage}`;
  if (state.detectedLanguages.length > 1) {
    languageContext = `Started in ${state.detectedLanguages[0]}, switched to ${state.currentLanguage}. Detected languages: ${state.detectedLanguages.join(', ')}. Code switches: ${state.codeSwitchCount}`;
  }

  return {
    conversationSummary: recentTranscript,
    callerLanguageContext: languageContext,
    confirmedDetails: getConfirmedSlots(state),
    uncertainDetails: getUncertainSlots(state),
    missingDetails: getMissingSlots(state),
    questionsAsked: state.questionsAsked,
    escalationReason: state.escalationReason || 'Automatic escalation based on state rules.',
    safetyBoundaryHit: state.safetyBoundaryHit,
    timestamp: new Date().toISOString(),
  };
}
