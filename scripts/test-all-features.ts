import {
  createInitialState,
  parseAgentResponse,
  parseFullConversation,
  extractDisplayText,
  getFilledSlotCount,
  getMissingSlots,
  getConfirmedSlots,
  getUncertainSlots,
  shouldEscalate,
} from '../lib/conversation-state';
import { buildEscalationPackage } from '../lib/escalation';
import {
  createTicket,
  getTickets,
  getTicketById,
  updateTicketStatus,
} from '../lib/ticket-store';
import { GET as generateTokenRoute } from '../app/api/generate-agora-token/route';
import { POST as createTicketRoute } from '../app/api/create-ticket/route';
import { GET as getTicketsRoute } from '../app/api/get-tickets/route';
import { POST as inviteAgentRoute } from '../app/api/invite-agent/route';
import { POST as stopConversationRoute } from '../app/api/stop-conversation/route';
import { NextRequest } from 'next/server';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runTests() {
  console.log('\n=== RUNNING ECHOSPHERE PS51 COMPREHENSIVE FEATURE TESTS ===\n');

  // 1. Initial State Test
  console.log('--- Testing Initial Conversation State ---');
  const state0 = createInitialState();
  assert(state0.phase === 'GREETING', 'Initial phase is GREETING');
  assert(state0.overallConfidence === 1.0, 'Initial confidence is 1.0');
  assert(state0.slots.caller_name.value === null, 'caller_name slot is initially null');
  assert(getMissingSlots(state0).length === 6, 'All 6 slots initially missing');
  assert(getFilledSlotCount(state0) === 0, 'Filled slot count is 0');

  // 2. Natural Language Parsing Test (no markers!)
  console.log('\n--- Testing Natural Language Slot Extraction ---');
  const agentResponse1 =
    'Main samajh rahi hoon, double charge ho gaya hai aapka. Yeh bahut frustrating hota hai. Dhanyavaad Varun ji, kya aap bata sakte hain yeh bill kis service ka hai?';
  const state1 = parseAgentResponse(agentResponse1, state0);

  assert(state1.currentLanguage === 'hi-en', 'Detected current language as Hinglish (hi-en)');
  assert(state1.slots.caller_name.value === 'Varun', 'Extracted caller_name = Varun from natural Hindi');
  assert(state1.slots.issue_category.value === 'billing', 'Extracted issue_category = billing from natural text');
  assert(getFilledSlotCount(state1) === 2, 'Filled slot count is now 2');

  // 3. Display Text Cleaning Test
  console.log('\n--- Testing Clean Display Text Output ---');
  const markerText = '[LANGUAGE:hi] [SLOT:caller_name=Test] Hello, how can I help?';
  const cleanText = extractDisplayText(markerText);
  assert(
    !cleanText.includes('[LANGUAGE') && !cleanText.includes('[SLOT'),
    'Bracket markers removed from display text',
  );
  assert(cleanText.includes('Hello, how can I help?'), 'Clean message retains conversational content');

  // Clean text without markers should pass through unchanged
  const normalText = 'Main samajh rahi hoon, aapko double charge ho gaya hai.';
  assert(extractDisplayText(normalText) === normalText, 'Normal text passes through unchanged');

  // 4. Confirmation & Location Extraction Test
  console.log('\n--- Testing Confirmation & Details Tracking ---');
  const agentResponse2 =
    'Toh aapka naam Varun hai, aur aapko Delhi mein electricity bill mein double charge ka issue hai. Kya yeh sahi hai?';
  const state2 = parseAgentResponse(agentResponse2, state1);

  assert(state2.phase === 'CONFIRMING', 'Phase transitioned to CONFIRMING on confirmation language');
  assert(state2.slots.location.value === 'Delhi', 'Extracted location = Delhi from natural text');
  assert(typeof getConfirmedSlots(state2) === 'object', 'getConfirmedSlots returns object');
  assert(typeof getUncertainSlots(state2) === 'object', 'getUncertainSlots returns object');

  // 5. Safety Boundary Detection Test
  console.log('\n--- Testing Safety Boundary Detection ---');
  assert(!shouldEscalate(state2), 'Normal conversation does not prematurely escalate');

  const agentResponseSafety =
    'Main medical advice nahi de sakti. Please apne doctor se consult karein. Aapki health bahut important hai.';
  const stateSafety = parseAgentResponse(agentResponseSafety, state0);
  assert(Boolean(stateSafety.safetyBoundaryHit), 'Safety boundary flag is set on medical refusal');
  assert(shouldEscalate(stateSafety), 'shouldEscalate() triggers on safety boundary');

  // 6. Human Escalation Detection Test
  console.log('\n--- Testing Human Escalation Detection ---');
  const agentResponseEscalate =
    'Main aapko ek human agent se connect kar rahi hoon taaki aapki problem achhe se solve ho sake.';
  const stateEscalate = parseAgentResponse(agentResponseEscalate, state2);
  assert(stateEscalate.escalationReason !== null, 'Escalation reason detected from natural language');
  assert(stateEscalate.phase === 'ESCALATING', 'Phase set to ESCALATING');
  assert(shouldEscalate(stateEscalate), 'shouldEscalate() triggers on human transfer');

  // 7. Emergency Detection Test
  console.log('\n--- Testing Emergency Detection ---');
  const agentResponseEmergency =
    'Yeh ek emergency hai. Please abhi 112 dial karein. Main aapki aur koi madad nahi kar sakti is situation mein.';
  const stateEmergency = parseAgentResponse(agentResponseEmergency, state0);
  assert(Boolean(stateEmergency.safetyBoundaryHit), 'Emergency triggers safety boundary');

  // 8. Escalation Package Generation
  console.log('\n--- Testing Escalation Package Construction ---');
  const transcriptHistory = [
    'Caller: Hello, mera electricity bill double aa gaya hai',
    'Agent: Main samajh rahi hoon. Aapka naam bata sakte hain?',
    'Caller: Mera naam Varun hai, Delhi se bol raha hoon',
    'Agent: Dhanyavaad Varun ji. Contact number bata sakte hain?',
    'Caller: Mujhe kisi insaan se baat karni hai',
  ];
  const escalationPkg = buildEscalationPackage(stateEscalate, transcriptHistory);

  assert(escalationPkg.confirmedDetails.caller_name === 'Varun', 'Package includes caller name');
  assert(escalationPkg.confirmedDetails.location === 'Delhi', 'Package includes location');
  assert(escalationPkg.callerLanguageContext.length > 0, 'Language context recorded');
  assert(escalationPkg.conversationSummary.length > 0, 'Summary compiled from history');
  assert(escalationPkg.escalationReason.length > 0, 'XAI escalation reason included');

  // 9. Ticket Store Test
  console.log('\n--- Testing Ticket Store (Case Management) ---');
  const ticket = createTicket({
    channelName: 'test-channel-101',
    priority: 'HIGH',
    escalationPackage: escalationPkg,
  });

  assert(ticket.ticketId.startsWith('TKT-'), 'Ticket ID generated with TKT- prefix');
  assert(ticket.status === 'OPEN', 'Ticket starts in OPEN status');
  assert(getTickets().length >= 1, 'Ticket listed in ticket store');

  const fetched = getTicketById(ticket.ticketId);
  assert(fetched?.ticketId === ticket.ticketId, 'Ticket retrieved by ID');

  const updated = updateTicketStatus(ticket.ticketId, 'IN_PROGRESS');
  assert(updated.status === 'IN_PROGRESS', 'Ticket status updated to IN_PROGRESS');

  // 10. API Routes Contract Testing
  console.log('\n--- Testing API Route Handlers ---');

  // Test /api/generate-agora-token
  const tokenReq = new NextRequest('http://localhost:3000/api/generate-agora-token?channel=testchan&uid=999');
  const tokenRes = await generateTokenRoute(tokenReq);
  const tokenData = await tokenRes.json();
  assert(tokenRes.status === 200, 'generate-agora-token returns 200');
  assert(typeof tokenData.token === 'string' && tokenData.token.length > 20, 'RTC+RTM token generated');
  assert(tokenData.channel === 'testchan', 'Token channel matches query param');

  // Test /api/create-ticket
  const createTktReq = new NextRequest('http://localhost:3000/api/create-ticket', {
    method: 'POST',
    body: JSON.stringify({
      escalation_package: escalationPkg,
      channel_name: 'test-channel-101',
      priority: 'HIGH',
    }),
  });
  const createTktRes = await createTicketRoute(createTktReq);
  const createTktData = await createTktRes.json();
  assert(createTktRes.status === 201, 'create-ticket route returns 201 Created');
  assert(createTktData.ticket_id.startsWith('TKT-'), 'Returned created ticket_id');

  // Test /api/get-tickets
  const getTktsReq = new NextRequest('http://localhost:3000/api/get-tickets');
  const getTktsRes = await getTicketsRoute(getTktsReq);
  const getTktsData = await getTktsRes.json();
  assert(getTktsRes.status === 200, 'get-tickets route returns 200');
  assert(Array.isArray(getTktsData.tickets) && getTktsData.tickets.length > 0, 'Returned tickets array');

  // Test /api/invite-agent validation
  const invalidInviteReq = new NextRequest('http://localhost:3000/api/invite-agent', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  const invalidInviteRes = await inviteAgentRoute(invalidInviteReq);
  assert(invalidInviteRes.status === 400, 'invite-agent rejects empty body with 400 Bad Request');

  // Test /api/stop-conversation validation
  const invalidStopReq = new NextRequest('http://localhost:3000/api/stop-conversation', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  const invalidStopRes = await stopConversationRoute(invalidStopReq);
  assert(invalidStopRes.status === 400, 'stop-conversation rejects missing agent_id with 400 Bad Request');

  // 11. Phone Number Extraction Test
  console.log('\n--- Testing Phone Number Extraction ---');
  const agentResponsePhone = 'Okay Varun ji, aapka contact number 9876543210 note kar liya hai.';
  const statePhone = parseAgentResponse(agentResponsePhone, state2);
  assert(statePhone.slots.contact_number.value === '9876543210', 'Extracted phone number from natural text');

  // 12. Legacy Marker Fallback Test
  console.log('\n--- Testing Legacy Marker Fallback ---');
  const legacyText = '[SLOT:urgency_level=high] Yeh bahut urgent hai, main samajh rahi hoon.';
  const stateLegacy = parseAgentResponse(legacyText, state0);
  assert(stateLegacy.slots.urgency_level.value === 'high', 'Legacy marker fallback still works');
  const cleanLegacy = extractDisplayText(legacyText);
  assert(!cleanLegacy.includes('[SLOT'), 'Legacy markers stripped from display text');

  // 13. Full Conversation with Spoken Numbers & Confirmation Test
  console.log('\n--- Testing Full Spoken Conversation with Word Numbers & Affirmations ---');
  const simulatedTranscript = [
    { uid: '123456', text: "I understand. May I have your name, please?" },
    { uid: '0', text: "My name is Varun." },
    { uid: '123456', text: "Thank you, Varun. What specific issue are you facing with your electricity bill?" },
    { uid: '0', text: "The electricity is suddenly highermuch higher than the previous month." },
    { uid: '123456', text: "I see. So, you are facing an issue with a sudden increase in your electricity bill. Can you please provide your phone number for follow-up?" },
    { uid: '0', text: "Yes. Right. It my phone number isnine two seven three one four" },
    { uid: '123456', text: "It seems I didn't catch the full number. Could you please repeat your phone number?" },
    { uid: '0', text: "three fiveeight two" },
    { uid: '123456', text: "Thank you for that. So, your phone number is nine two seven three one four three five eight two. Is that correct?" },
    { uid: '0', text: "Yes. Correct." },
  ];

  const fullState = parseFullConversation(simulatedTranscript, '0', createInitialState());
  assert(fullState.slots.caller_name.value === 'Varun', 'Full transcript extracted caller_name = Varun');
  assert(fullState.slots.caller_name.confirmed === true, 'caller_name is confirmed on caller yes/correct');
  assert(fullState.slots.issue_category.value === 'billing', 'Full transcript extracted issue_category = billing');
  assert(Boolean(fullState.slots.issue_description.value), 'Full transcript extracted issue_description');
  assert(fullState.slots.contact_number.value === '9273143582', 'Spoken word phone number normalized to 9273143582');
  assert(fullState.slots.contact_number.confirmed === true, 'contact_number is confirmed');
  assert(fullState.slots.urgency_level.value === 'high', 'Extracted urgency from sudden increase / higher bill');

  const pkg = buildEscalationPackage(fullState, simulatedTranscript.map(t => t.text));
  assert(Boolean(pkg.confirmedDetails.caller_name), 'Escalation package includes confirmed caller_name');
  assert(Boolean(pkg.confirmedDetails.contact_number), 'Escalation package includes confirmed contact_number');
  assert(Boolean(pkg.confirmedDetails.issue_description), 'Escalation package includes confirmed issue_description');
  assert(!pkg.missingDetails.includes('caller_name'), 'caller_name is NOT in missingDetails');
  assert(!pkg.missingDetails.includes('contact_number'), 'contact_number is NOT in missingDetails');
  assert(!pkg.missingDetails.includes('issue_description'), 'issue_description is NOT in missingDetails');

  console.log('\n🎉 ALL FEATURE TESTS PASSED SUCCESSFULLY! 100% HEALTHY.\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
