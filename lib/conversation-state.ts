export interface SlotValue {
  value: string | null;
  confirmed: boolean;
  confidence: 'high' | 'medium' | 'low' | 'unknown';
  attempts: number;
}

export interface ConversationState {
  slots: {
    caller_name: SlotValue;
    issue_category: SlotValue;
    issue_description: SlotValue;
    contact_number: SlotValue;
    location: SlotValue;
    urgency_level: SlotValue;
  };
  phase: 'GREETING' | 'LISTENING' | 'COLLECTING' | 'CONFIRMING' | 'RESOLVED' | 'ESCALATING' | 'ESCALATED';
  detectedLanguages: string[];
  currentLanguage: string;
  codeSwitchCount: number;
  overallConfidence: number;
  confirmationAttempts: number;
  escalationReason: string | null;
  safetyBoundaryHit: boolean;
  questionsAsked: string[];
  turnCount: number;
}

const emptySlot: SlotValue = {
  value: null,
  confirmed: false,
  confidence: 'unknown',
  attempts: 0
};

export function createInitialState(): ConversationState {
  return {
    slots: {
      caller_name: { ...emptySlot },
      issue_category: { ...emptySlot },
      issue_description: { ...emptySlot },
      contact_number: { ...emptySlot },
      location: { ...emptySlot },
      urgency_level: { ...emptySlot },
    },
    phase: 'GREETING',
    detectedLanguages: [],
    currentLanguage: 'en',
    codeSwitchCount: 0,
    overallConfidence: 1.0,
    confirmationAttempts: 0,
    escalationReason: null,
    safetyBoundaryHit: false,
    questionsAsked: [],
    turnCount: 0,
  };
}

// ---- Natural Language Parsing Helpers ----
// Since Agora sends LLM output directly to TTS, we cannot use structured markers.
// Instead, we extract state from the agent's natural conversational responses.

const HINDI_PATTERNS = /[\u0900-\u097F]/; // Devanagari script detection
const HINGLISH_WORDS = /\b(aapka|naam|kya|hai|hoon|mein|se|kar|sakti|bata|sakte|nahi|abhi|bahut|zyada|accha|ji|dhanyavaad|toh|aur|yeh|sahi|please|okay)\b/i;

function detectLanguage(text: string): string {
  const hasDevanagari = HINDI_PATTERNS.test(text);
  const hasHinglish = HINGLISH_WORDS.test(text);
  const hasEnglish = /\b(your|name|issue|help|understand|confirm|please|what|how|can|will|the|is|are)\b/i.test(text);

  if (hasDevanagari) return 'hi';
  if (hasHinglish && hasEnglish) return 'hi-en';
  if (hasHinglish) return 'hi-en';
  return 'en';
}

// Name extraction: look for patterns like "your name is X", "naam X hai", "Dhanyavaad X ji"
function extractName(text: string): string | null {
  const patterns = [
    /(?:your name is|naam)\s+(\w+)/i,
    /(?:dhanyavaad|thank you)\s+(\w+)\s*ji/i,
    /(?:okay|accha|toh)\s+(\w+)\s*ji/i,
    /(\w+)\s*ji,?\s*(?:aapko|aapka|your|main)/i,
    /(?:confirm|confirmed).*?naam\s+(\w+)/i,
    /(?:naam)\s+(\w+)\s+hai/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const name = match[1];
      // Filter out common false positives
      if (!['main', 'aapka', 'kya', 'yeh', 'toh', 'aur', 'ek', 'hai', 'se', 'ki', 'ka'].includes(name.toLowerCase())) {
        return name;
      }
    }
  }
  return null;
}

// Issue category extraction
function extractIssueCategory(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\b(bill|billing|charge|payment|invoice|paisa|paise|amount|rupe)\b/i.test(lower)) return 'billing';
  if (/\b(service|seva|connection|network|signal|internet|wifi|broadband)\b/i.test(lower)) return 'service';
  if (/\b(complaint|shikayat|problem|issue|dikkat|pareshan)\b/i.test(lower)) return 'complaint';
  if (/\b(information|jaankari|enquiry|inquiry|puchna|pata)\b/i.test(lower)) return 'information';
  return null;
}

// Phone number extraction
function extractPhone(text: string): string | null {
  const match = text.match(/\b(\d{10,12})\b/);
  return match?.[1] ?? null;
}

// Location extraction
const INDIAN_CITIES = /\b(Delhi|Mumbai|Bangalore|Bengaluru|Chennai|Kolkata|Hyderabad|Pune|Ahmedabad|Jaipur|Lucknow|Kanpur|Nagpur|Indore|Thane|Bhopal|Visakhapatnam|Patna|Vadodara|Ghaziabad|Ludhiana|Agra|Nashik|Faridabad|Meerut|Rajkot|Varanasi|Srinagar|Aurangabad|Dhanbad|Amritsar|Noida|Gurgaon|Gurugram|Chandigarh|Ranchi|Coimbatore|Kochi|Trivandrum|Dehradun)\b/i;

function extractLocation(text: string): string | null {
  const match = text.match(INDIAN_CITIES);
  return match?.[1] ?? null;
}

// Urgency extraction
function extractUrgency(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\b(emergency|urgent|turant|abhi|jaldi|critical|serious|immediately)\b/.test(lower)) return 'high';
  if (/\b(important|zaruri|jaruri|jald|soon)\b/.test(lower)) return 'medium';
  if (/\b(whenever|jab bhi|no rush|koi jaldi nahi)\b/.test(lower)) return 'low';
  return null;
}

// Detect if agent is in confirmation mode
function isConfirming(text: string): boolean {
  return /\b(confirm|sahi hai|correct|verify|is this right|kya yeh sahi|let me confirm|toh aapka)\b/i.test(text);
}

// Detect escalation language
function detectEscalation(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\b(human agent|insaan|person|kisi se baat|connect kar|transfer kar|handover)\b/.test(lower)) {
    return 'Transferring to human agent for better assistance';
  }
  if (/\b(medical advice nahi|doctor se|emergency hai|112 dial)\b/.test(lower)) {
    return 'Safety boundary: medical/emergency query detected';
  }
  if (/\b(legal advice|financial advice|lawyer|advocate|ca se)\b/.test(lower)) {
    return 'Safety boundary: legal/financial query detected';
  }
  return null;
}

// Detect safety boundary hit
function detectSafetyBoundary(text: string): boolean {
  return /\b(medical advice nahi|doctor se consult|emergency hai|112 dial|legal advice nahi|financial advice nahi)\b/i.test(text);
}

/**
 * Parse agent's natural language response to extract conversation state.
 * This replaces the previous marker-based approach because Agora sends
 * LLM output directly to TTS — structured markers in the text get spoken aloud.
 */
export function parseAgentResponse(text: string, currentState: ConversationState): ConversationState {
  const newState = { ...currentState };

  newState.slots = {
    caller_name: { ...currentState.slots.caller_name },
    issue_category: { ...currentState.slots.issue_category },
    issue_description: { ...currentState.slots.issue_description },
    contact_number: { ...currentState.slots.contact_number },
    location: { ...currentState.slots.location },
    urgency_level: { ...currentState.slots.urgency_level },
  };

  newState.turnCount += 1;

  // --- Language detection ---
  const detectedLang = detectLanguage(text);
  if (newState.currentLanguage !== detectedLang) {
    newState.codeSwitchCount += 1;
    newState.currentLanguage = detectedLang;
    if (!newState.detectedLanguages.includes(detectedLang)) {
      newState.detectedLanguages.push(detectedLang);
    }
  }

  // --- Slot extraction from natural language ---
  const name = extractName(text);
  if (name && !newState.slots.caller_name.value) {
    newState.slots.caller_name.value = name;
    newState.slots.caller_name.confidence = 'high';
    newState.slots.caller_name.attempts += 1;
  }

  const category = extractIssueCategory(text);
  if (category) {
    newState.slots.issue_category.value = category;
    newState.slots.issue_category.confidence = 'high';
    newState.slots.issue_category.attempts += 1;
  }

  const phone = extractPhone(text);
  if (phone) {
    newState.slots.contact_number.value = phone;
    newState.slots.contact_number.confidence = 'high';
    newState.slots.contact_number.attempts += 1;
  }

  const location = extractLocation(text);
  if (location) {
    newState.slots.location.value = location;
    newState.slots.location.confidence = 'high';
    newState.slots.location.attempts += 1;
  }

  const urgency = extractUrgency(text);
  if (urgency) {
    newState.slots.urgency_level.value = urgency;
    newState.slots.urgency_level.confidence = 'high';
    newState.slots.urgency_level.attempts += 1;
  }

  // --- Phase detection ---
  if (isConfirming(text)) {
    newState.phase = 'CONFIRMING';
    newState.confirmationAttempts += 1;
  } else if (getFilledSlotCount(newState) >= 1 && newState.phase === 'GREETING') {
    newState.phase = 'COLLECTING';
  } else if (getFilledSlotCount(newState) >= 3) {
    newState.phase = 'COLLECTING';
  }

  // --- Safety & escalation detection ---
  if (detectSafetyBoundary(text)) {
    newState.safetyBoundaryHit = true;
  }

  const escalation = detectEscalation(text);
  if (escalation) {
    newState.escalationReason = escalation;
    newState.phase = 'ESCALATING';
  }

  // --- Confidence heuristic ---
  // Based on how many slots are filled + confirmed
  const filled = getFilledSlotCount(newState);
  const total = 6;
  if (newState.safetyBoundaryHit) {
    newState.overallConfidence = 0.2;
  } else if (newState.phase === 'CONFIRMING') {
    newState.overallConfidence = Math.min(0.95, 0.5 + (filled / total) * 0.5);
  } else {
    newState.overallConfidence = Math.min(1.0, 0.4 + (filled / total) * 0.6);
  }

  // Also support legacy markers as fallback (strip from display but still parse)
  const markerRegex = /\[(.*?)\]/g;
  let match;
  while ((match = markerRegex.exec(text)) !== null) {
    const marker = match[1];
    if (marker === 'SAFETY_BOUNDARY') {
      newState.safetyBoundaryHit = true;
    } else if (marker.startsWith('SLOT:')) {
      const slotData = marker.substring(5);
      const eqIdx = slotData.indexOf('=');
      if (eqIdx > 0) {
        const slotKey = slotData.substring(0, eqIdx);
        const slotValue = slotData.substring(eqIdx + 1);
        if (Object.prototype.hasOwnProperty.call(newState.slots, slotKey)) {
          const typedKey = slotKey as keyof ConversationState['slots'];
          newState.slots[typedKey].value = slotValue;
          newState.slots[typedKey].attempts += 1;
          newState.slots[typedKey].confidence = newState.slots[typedKey].attempts > 2 ? 'low' : 'high';
        }
      }
    } else if (marker.startsWith('CONFIDENCE:')) {
      const val = parseFloat(marker.substring(11));
      if (!isNaN(val)) newState.overallConfidence = val;
    } else if (marker.startsWith('PHASE:')) {
      newState.phase = marker.substring(6) as ConversationState['phase'];
    } else if (marker.startsWith('ESCALATE:')) {
      newState.escalationReason = marker.substring(9);
      newState.phase = 'ESCALATING';
    } else if (marker.startsWith('LANGUAGE:')) {
      const lang = marker.substring(9);
      if (newState.currentLanguage !== lang) {
        newState.codeSwitchCount += 1;
        newState.currentLanguage = lang;
        if (!newState.detectedLanguages.includes(lang)) {
          newState.detectedLanguages.push(lang);
        }
      }
    }
  }

  return newState;
}

/**
 * Strip any remaining bracket markers from text before display.
 * Safety net in case the LLM still emits markers despite prompt instructions.
 */
export function extractDisplayText(text: string): string {
  return text.replace(/\[.*?\]/g, '').replace(/\s{2,}/g, ' ').trim();
}

export function getFilledSlotCount(state: ConversationState): number {
  return Object.values(state.slots).filter(slot => slot.value !== null).length;
}

export function getMissingSlots(state: ConversationState): string[] {
  return Object.entries(state.slots)
    .filter(([_, slot]) => slot.value === null)
    .map(([key, _]) => key);
}

export function getConfirmedSlots(state: ConversationState): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, slot] of Object.entries(state.slots)) {
    if (slot.value !== null && slot.confidence === 'high') {
      result[key] = slot.value;
    }
  }
  return result;
}

export function getUncertainSlots(state: ConversationState): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, slot] of Object.entries(state.slots)) {
    if (slot.value !== null && (slot.confidence === 'low' || slot.confidence === 'medium')) {
      result[key] = slot.value;
    }
  }
  return result;
}

export function shouldEscalate(state: ConversationState): boolean {
  return (
    state.overallConfidence < 0.3 ||
    state.confirmationAttempts > 3 ||
    state.safetyBoundaryHit ||
    state.escalationReason !== null ||
    state.phase === 'ESCALATING' ||
    state.phase === 'ESCALATED'
  );
}
