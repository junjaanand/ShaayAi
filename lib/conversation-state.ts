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
// ---- Natural Language Parsing Helpers ----
// Since Agora sends LLM output directly to TTS, we cannot use structured markers.
// Instead, we extract state from both the caller's speech and the agent's conversational responses.

const HINDI_PATTERNS = /[\u0900-\u097F]/; // Devanagari script detection
const HINGLISH_WORDS = /\b(aapka|naam|kya|hai|hoon|mein|se|kar|sakti|bata|sakte|nahi|abhi|bahut|zyada|accha|ji|dhanyavaad|toh|aur|yeh|sahi|please|okay)\b/i;

const WORD_TO_DIGIT: Record<string, string> = {
  zero: '0', oh: '0', o: '0', one: '1', two: '2', three: '3', four: '4', five: '5',
  six: '6', seven: '7', eight: '8', nine: '9',
  shunya: '0', ek: '1', do: '2', teen: '3', chaar: '4', char: '4',
  paanch: '5', panch: '5', chhah: '6', che: '6', saat: '7', aath: '8', ath: '8', nau: '9',
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
  'शून्य': '0', 'एक': '1', 'दो': '2', 'तीन': '3', 'चार': '4', 'पाँच': '5', 'पांच': '5', 'छह': '6', 'सात': '7', 'आठ': '8', 'नौ': '9',
};

function normalizeSpokenDigits(text: string): string {
  let normalized = text.toLowerCase();
  for (const [word, digit] of Object.entries(WORD_TO_DIGIT)) {
    if (word.length >= 3) {
      normalized = normalized.replace(new RegExp(word, 'gi'), ` ${digit} `);
    }
  }
  return normalized;
}

function detectLanguage(text: string): string {
  const hasDevanagari = HINDI_PATTERNS.test(text);
  const hasHinglish = HINGLISH_WORDS.test(text);
  const hasEnglish = /\b(your|name|issue|help|understand|confirm|please|what|how|can|will|the|is|are|service|bill|number)\b/i.test(text);

  if (hasDevanagari && hasEnglish) return 'hi-en';
  if (hasDevanagari) return 'hi';
  if (hasHinglish && hasEnglish) return 'hi-en';
  if (hasHinglish) return 'hi';
  return 'en';
}

// Name extraction: extracts name from caller ("My name is X", "I am X") or agent acknowledgment ("Thank you, X")
function extractName(text: string): string | null {
  const patterns = [
    /(?:my name is|i am|this is|call me|name's)\s+([A-Za-z\u0900-\u097F]+)/i,
    /(?:mera naam|mera name)\s+([A-Za-z\u0900-\u097F]+)/i,
    /(?:मेरा नाम|मैं हूँ|नाम है)\s+([A-Za-z\u0900-\u097F]+)/i,
    /(?:thank you|thanks|dhanyavaad|धन्यवाद)\s*,?\s*([A-Za-z\u0900-\u097F]+)/i,
    /(?:your name is|caller's name is|name is|naam)\s+([A-Za-z\u0900-\u097F]+)/i,
    /(?:okay|accha|toh|जी)\s*,?\s*([A-Za-z\u0900-\u097F]+)\s*ji/i,
    /([A-Za-z\u0900-\u097F]+)\s*ji,?\s*(?:aapko|aapka|your|main|आपको|आपका)/i,
    /(?:confirm|confirmed|पुष्टि).*?नाम\s+([A-Za-z\u0900-\u097F]+)/i,
    /(?:नाम|naam)\s+([A-Za-z\u0900-\u097F]+)\s+(?:hai|है)/i,
  ];

  const falsePositives = new Set([
    'main', 'aapka', 'kya', 'yeh', 'toh', 'aur', 'ek', 'hai', 'se', 'ki', 'ka',
    'जी', 'हाँ', 'है', 'क्या', 'आपका', 'तो', 'calling', 'facing', 'having',
    'thank', 'thanks', 'sure', 'yes', 'right', 'that', 'for', 'very', 'much',
    'so', 'now', 'please', 'sir', 'madam', 'customer', 'agent', 'hello', 'hi'
  ]);

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const name = match[1].trim();
      if (!falsePositives.has(name.toLowerCase()) && name.length >= 2) {
        return name.charAt(0).toUpperCase() + name.slice(1);
      }
    }
  }
  return null;
}

// Issue category extraction
function extractIssueCategory(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\b(bill|billing|charge|payment|invoice|paisa|paise|amount|rupe|electricity)\b/i.test(lower) || /(बिल|बिलिंग|चार्ज|भुगतान|राशि|पैसे|बिजली)/.test(text)) return 'billing';
  if (/\b(service|seva|connection|network|signal|internet|wifi|broadband)\b/i.test(lower) || /(सेवा|कनेक्शन|नेटवर्क|सिग्नल|इंटरनेट|वाईफाई)/.test(text)) return 'service';
  if (/\b(complaint|shikayat|problem|issue|dikkat|pareshan)\b/i.test(lower) || /(शिकायत|समस्या|दिक्कत|परेशानी)/.test(text)) return 'complaint';
  if (/\b(information|jaankari|enquiry|inquiry|puchna|pata)\b/i.test(lower) || /(जानकारी|पूछताछ)/.test(text)) return 'information';
  return null;
}

// Issue description extraction from agent recap or caller statement
function extractIssueDescription(text: string, isCaller: boolean = false): string | null {
  // Agent confirmation recap: "So, you are facing an issue with a sudden increase in your electricity bill."
  const agentMatch = text.match(/(?:you are facing an issue with|facing an issue with|facing a problem with|issue with|problem with|problem is|issue is|regarding)\s+([^.?!,]+(?:\s+[^.?!,]+){2,15})/i);
  if (agentMatch?.[1]) {
    const desc = agentMatch[1].trim();
    if (!desc.toLowerCase().startsWith('your name') && !desc.toLowerCase().startsWith('follow-up')) {
      return desc.charAt(0).toUpperCase() + desc.slice(1);
    }
  }

  const hindiAgentMatch = text.match(/(?:समस्या यह है कि|परेशानी यह है कि|दिक्कत यह है कि|समस्या आ रही है कि)\s+([^.?!,]+)/);
  if (hindiAgentMatch?.[1]) {
    return hindiAgentMatch[1].trim();
  }

  // Caller problem statement: "The electricity is suddenly higher than previous month."
  if (isCaller) {
    const clean = text.trim();
    if (
      /\b(higher|increase|decreased|cut|power|light|bill|charging|charged|money|speed|slow|down|broken|stopped|failing|error|problem|issue|dikkat|pareshani|chalu nahi|chal nahi|kaat diya|zyada|jyada)\b/i.test(clean) &&
      !/^(yes|no|correct|right|haan|nahi|okay|ok|sure|varun|my name)/i.test(clean) &&
      clean.length > 15
    ) {
      const normalized = clean.replace(/(\w+)(much|very|more)/i, '$1 $2').replace(/\s{2,}/g, ' ');
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }
  }

  return null;
}

// Phone number extraction: handles both raw digits and spoken word numbers
function extractPhone(text: string): string | null {
  const directMatch = text.match(/\b(\d{10,12})\b/);
  if (directMatch) return directMatch[1];

  const normalized = normalizeSpokenDigits(text);
  const digitsOnly = normalized.replace(/\D/g, '');
  if (digitsOnly.length >= 10) {
    if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
      return digitsOnly.slice(2);
    }
    return digitsOnly.slice(-10);
  }
  return null;
}

// Location extraction
const INDIAN_CITIES = /\b(Delhi|Mumbai|Bangalore|Bengaluru|Chennai|Kolkata|Hyderabad|Pune|Ahmedabad|Jaipur|Lucknow|Kanpur|Nagpur|Indore|Thane|Bhopal|Visakhapatnam|Patna|Vadodara|Ghaziabad|Ludhiana|Agra|Nashik|Faridabad|Meerut|Rajkot|Varanasi|Srinagar|Aurangabad|Dhanbad|Amritsar|Noida|Gurgaon|Gurugram|Chandigarh|Ranchi|Coimbatore|Kochi|Trivandrum|Dehradun|दिल्ली|मुंबई|बैंगलोर|चेन्नई|कोलकाता|हैदराबाद|पुणे|अहमदाबाद|जयपुर|लखनऊ|कानपुर|नागपुर|इंदौर|भोपाल|पटना|नोएडा|गुड़गांव|चंडीगढ़)\b/i;

function extractLocation(text: string): string | null {
  const match = text.match(INDIAN_CITIES);
  return match?.[1] ?? null;
}

// Urgency extraction
function extractUrgency(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\b(emergency|urgent|turant|abhi|jaldi|critical|serious|immediately|higher.*previous month|sudden increase|power cut)\b/.test(lower) || /(इमरजेंसी|तुरंत|जल्दी|अति आवश्यक)/.test(text)) return 'high';
  if (/\b(important|zaruri|jaruri|jald|soon|higher|increase)\b/.test(lower) || /(ज़रूरी|जरूरी|शीघ्र)/.test(text)) return 'medium';
  if (/\b(whenever|jab bhi|no rush|koi jaldi nahi)\b/.test(lower) || /(कोई जल्दी नहीं|जब भी)/.test(text)) return 'low';
  return null;
}

// Detect if agent is in confirmation mode
function isConfirming(text: string): boolean {
  return /\b(confirm|sahi hai|correct|verify|is this right|kya yeh sahi|let me confirm|toh aapka)\b/i.test(text) ||
    /(पुष्टि|क्या यह सही है|सही है|तो आपका नाम)/.test(text);
}

// Detect caller affirmation ("Yes", "Correct", "Haan", etc.)
function isAffirmation(text: string): boolean {
  return /^(yes|correct|right|haan|ji haan|sahi hai|bilkul|that is correct|yes correct|yes right)\b/i.test(text.trim());
}

// Detect escalation language - strictly require explicit human transfer intent
function detectEscalation(text: string): string | null {
  const lower = text.toLowerCase();
  if (
    /\b(transfer to human|transfer you to a human|talk to a human|speak with a human|transfer to an agent|transfer to representative|customer care executive|customer care representative)\b/i.test(lower) ||
    /\b(human agent se connect|human agent se baat|insaan se baat karwao|kisi representative se baat)\b/i.test(lower) ||
    /(सीनियर कस्टमर केयर प्रतिनिधि से कनेक्ट|ह्यूमन एजेंट से कनेक्ट|प्रतिनिधि से बात)/.test(text)
  ) {
    return 'Transferring to human agent for better assistance';
  }
  if (
    /\b(cannot provide medical advice|medical advice nahi|consult a doctor|doctor se consult|emergency.*112)\b/i.test(lower) ||
    /(मेडिकल सलाह नहीं दे सकती|डॉक्टर से संपर्क|इमरजेंसी है.*112 डायल)/.test(text)
  ) {
    return 'Safety boundary: medical/emergency query detected';
  }
  if (
    /\b(cannot provide legal advice|legal advice nahi|cannot provide financial advice|financial advice nahi)\b/i.test(lower) ||
    /(कानूनी सलाह नहीं दे सकती|वित्तीय सलाह नहीं दे सकती)/.test(text)
  ) {
    return 'Safety boundary: legal/financial query detected';
  }
  return null;
}

// Detect safety boundary hit
function detectSafetyBoundary(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /\b(cannot provide medical advice|medical advice nahi|consult a doctor|doctor se consult|emergency.*112|cannot provide legal advice|legal advice nahi|cannot provide financial advice|financial advice nahi)\b/i.test(lower) ||
    /(मेडिकल सलाह नहीं दे सकती|डॉक्टर से संपर्क|इमरजेंसी है.*112 डायल|कानूनी सलाह नहीं दे सकती|वित्तीय सलाह नहीं दे सकती)/.test(text)
  );
}

/**
 * Parse a single conversation turn from either agent or caller.
 */
export function parseConversationTurn(
  text: string,
  currentState: ConversationState,
  isCaller: boolean = false,
): ConversationState {
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
  if (category && !newState.slots.issue_category.value) {
    newState.slots.issue_category.value = category;
    newState.slots.issue_category.confidence = 'high';
    newState.slots.issue_category.attempts += 1;
  }

  const desc = extractIssueDescription(text, isCaller);
  if (desc && !newState.slots.issue_description.value) {
    newState.slots.issue_description.value = desc;
    newState.slots.issue_description.confidence = 'high';
    newState.slots.issue_description.attempts += 1;
  }

  const phone = extractPhone(text);
  if (phone && !newState.slots.contact_number.value) {
    newState.slots.contact_number.value = phone;
    newState.slots.contact_number.confidence = 'high';
    newState.slots.contact_number.attempts += 1;
  }

  const location = extractLocation(text);
  if (location && !newState.slots.location.value) {
    newState.slots.location.value = location;
    newState.slots.location.confidence = 'high';
    newState.slots.location.attempts += 1;
  }

  const urgency = extractUrgency(text);
  if (urgency && !newState.slots.urgency_level.value) {
    newState.slots.urgency_level.value = urgency;
    newState.slots.urgency_level.confidence = 'high';
    newState.slots.urgency_level.attempts += 1;
  }

  // --- Caller affirmation confirms all extracted slots ---
  if (isCaller && isAffirmation(text)) {
    for (const slot of Object.values(newState.slots)) {
      if (slot.value !== null) {
        slot.confirmed = true;
        slot.confidence = 'high';
      }
    }
    newState.phase = 'CONFIRMING';
  }

  // --- Phase detection ---
  if (!isCaller && isConfirming(text)) {
    newState.phase = 'CONFIRMING';
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
  const filled = getFilledSlotCount(newState);
  const total = 6;
  if (newState.safetyBoundaryHit) {
    newState.overallConfidence = 0.2;
  } else if (newState.phase === 'CONFIRMING') {
    newState.overallConfidence = Math.min(0.95, 0.5 + (filled / total) * 0.5);
  } else {
    newState.overallConfidence = Math.min(1.0, 0.4 + (filled / total) * 0.6);
  }

  // Also support legacy markers as fallback
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
 * Backward-compatible wrapper for agent-only responses.
 */
export function parseAgentResponse(text: string, currentState: ConversationState): ConversationState {
  return parseConversationTurn(text, currentState, false);
}

/**
 * Parse entire transcript history from both caller and agent to build complete state.
 */
export function parseFullConversation(
  transcript: { uid?: string | number; text?: string | unknown }[],
  callerUid: string,
  currentState: ConversationState,
): ConversationState {
  let state = { ...currentState };

  for (const turn of transcript) {
    const text = typeof turn.text === 'string' ? turn.text.trim() : '';
    if (!text) continue;
    const isCaller = String(turn.uid) === '0' || String(turn.uid) === callerUid;
    state = parseConversationTurn(text, state, isCaller);
  }

  return state;
}

/**
 * Strip any remaining bracket markers from text before display.
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
    state.confirmationAttempts > 6 ||
    state.safetyBoundaryHit ||
    state.escalationReason !== null ||
    state.phase === 'ESCALATING' ||
    state.phase === 'ESCALATED'
  );
}
