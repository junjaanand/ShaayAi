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

export function buildEscalationPackage(state: ConversationState, transcriptText: string[] = []): EscalationPackage {
  const safeText = Array.isArray(transcriptText) ? transcriptText : [];
  const recentTranscript = safeText.slice(-10).join('\n');
  const detectedLangs = state?.detectedLanguages || [];
  
  let languageContext = `Current language: ${state?.currentLanguage || 'en'}`;
  if (detectedLangs.length > 1) {
    languageContext = `Started in ${detectedLangs[0]}, switched to ${state.currentLanguage}. Detected languages: ${detectedLangs.join(', ')}. Code switches: ${state?.codeSwitchCount || 0}`;
  }

  return {
    conversationSummary: recentTranscript,
    callerLanguageContext: languageContext,
    confirmedDetails: state ? getConfirmedSlots(state) : {},
    uncertainDetails: state ? getUncertainSlots(state) : {},
    missingDetails: state ? getMissingSlots(state) : [],
    questionsAsked: state?.questionsAsked || [],
    escalationReason: state?.escalationReason || 'Automatic escalation based on state rules.',
    safetyBoundaryHit: Boolean(state?.safetyBoundaryHit),
    timestamp: new Date().toISOString(),
  };
}
