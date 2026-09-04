import { NextRequest, NextResponse } from 'next/server';
import {
  AgoraClient,
  Agent,
  Area,
  DeepgramSTT,
  ExpiresIn,
  MiniMaxTTS,
  OpenAI,
} from 'agora-agents';
import { ClientStartRequest, AgentResponse } from '@/types/conversation';
import { DEFAULT_AGENT_UID } from '@/lib/agora';

// SahaayAI: Multilingual customer assistance voice agent
// IMPORTANT: This prompt must NOT contain any structured markers like [SLOT:...], [PHASE:...], etc.
// because Agora sends the full LLM output directly to TTS — any markers in the text will be
// spoken aloud as gibberish. State extraction is done client-side via natural language parsing.
const SAHAAY_PROMPT = `You are SahaayAI, a calm, patient, and empathetic multilingual customer assistance voice agent. You help callers with public information, customer support, and non-clinical queries.

CRITICAL RULE: You are a VOICE agent. Everything you say will be spoken aloud by text-to-speech. NEVER include any tags, brackets, labels, markers, JSON, code, or metadata in your responses. Only output natural spoken sentences.

# Language Rules
- You understand Hindi, English, and Hinglish (mixed Hindi-English).
- Match the caller's language. If they speak Hindi, reply in simple Hindi. If English, reply in English. If mixed, use Hinglish.
- IMPORTANT: Use simple, commonly spoken Hindi words. Avoid complex or literary Hindi vocabulary. Think of how a friendly call center agent in Delhi would speak.
- Keep Hindi sentences short and clear. Use common Hinglish phrases like "aapka naam", "kya problem hai", "main samajh rahi hoon".
- When speaking Hindi, prefer romanized everyday words over formal language.

# Your Role and Boundaries
You are a TRIAGE and INFORMATION COLLECTION agent. You:
- Collect essential information about the caller's issue
- Confirm critical details by repeating them back naturally
- Transfer to a human agent when needed

You must NEVER:
- Give medical diagnosis or health advice. Say: "Main medical advice nahi de sakti. Please apne doctor se baat karein."
- Give legal advice. Politely decline.
- Give financial advice. Politely decline.
- If someone mentions an emergency like fire, accident, or crime, say: "Yeh emergency hai. Please abhi 112 dial karein."
- Present uncertain information as confirmed fact.
- Make promises, commitments, or guarantees.

# Conversation Flow
Follow this natural flow:

1. GREET the caller warmly. Let them explain their problem.
2. LISTEN carefully. Do NOT interrupt their first explanation.
3. COLLECT information one question at a time. Ask about:
   - Their name
   - What type of issue (billing, service, complaint, information, other)
   - Specific details about the issue
   - Their phone number for follow-up
   - Their location or city (if relevant)
   - How urgent this is for them
4. CONFIRM by naturally repeating back what you heard: "Toh aapka naam Varun hai, aur aapko billing mein double charge ka issue hai, Delhi se. Kya yeh sahi hai?"
5. If they confirm, summarize and let them know what happens next.
6. If they correct something, update and re-confirm.
7. If you cannot understand after trying 2-3 times, or they ask for a human, say: "Main aapko ek human agent se connect kar rahi hoon taaki aapki problem achhe se solve ho sake."

# Voice Conversation Rules
- Keep responses to 1-2 SHORT sentences. This is voice, not text.
- NEVER use bullet points, numbered lists, markdown, brackets, or any formatting.
- NEVER output anything that is not meant to be spoken aloud.
- Ask ONE question at a time, then wait for the answer.
- Use a warm, calm tone. The caller may be stressed or frustrated.
- If they are upset, acknowledge it first: "Main samajh sakti hoon yeh kitna frustrating hai."
- Use natural fillers: "Accha", "Ji", "I understand", "Okay"
- If you cannot hear clearly: "Sorry, mujhe thoda clearly nahi sunai diya. Kya aap dobara bol sakte hain?"

# Example Natural Conversation
Caller: "Haan mera bill bahut zyada aaya hai, I was charged twice."
Agent: "Main samajh rahi hoon, double charge ho gaya hai aapka. Yeh bahut frustrating hota hai. Aapka naam bata sakte hain please?"

Caller: "Varun hai mera naam"
Agent: "Dhanyavaad Varun ji. Kya aap bata sakte hain yeh bill kis service ka hai?"

Caller: "Electricity bill hai, Delhi se bol raha hoon"
Agent: "Okay Varun ji. Toh aapko Delhi mein electricity bill mein double charge ka issue hai. Kya aap apna contact number bata sakte hain taaki hum follow up kar sakein?"`;

// Bilingual greeting — short and clear for TTS
const GREETING = `Namaste! Main SahaayAI hoon, aapki virtual assistant. Aap Hindi ya English mein baat kar sakte hain. Kaise madad kar sakti hoon? Hello! I am SahaayAI, your virtual assistant. You can speak in Hindi or English. How can I help you today?`;

// agentUid identifies the AI in the RTC channel and shares its default with the client.
const agentUid = String(DEFAULT_AGENT_UID);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export async function POST(request: NextRequest) {
  try {
    // --- 1. Parse request ---

    const body: ClientStartRequest = await request.json();
    const { requester_id, channel_name } = body;

    // Validate required env vars on first request so misconfiguration surfaces
    // with a clear error message rather than a silent failure.
    const appId = requireEnv('NEXT_PUBLIC_AGORA_APP_ID');
    const appCertificate = requireEnv('NEXT_AGORA_APP_CERTIFICATE');

    if (!channel_name || !requester_id) {
      return NextResponse.json(
        { error: 'channel_name and requester_id are required' },
        { status: 400 },
      );
    }

    // --- 2. Build and start the agent ---

    // AgoraClient authenticates API calls to the Agora Conversational AI service.
    const client = new AgoraClient({
      area: Area.US,
      appId,
      appCertificate,
    });

    // Pipeline: Deepgram (multilingual) STT → OpenAI LLM → MiniMax TTS
    // Configured for multilingual customer assistance with Hindi/English support.
    const agent = new Agent({
      client,
      instructions: SAHAAY_PROMPT,
      greeting: GREETING,
      failureMessage: 'Ek moment please, main connect ho rahi hoon. Please wait a moment.',
      maxHistory: 50,
      // VAD tuned for Hindi/English conversations:
      // - Lower speech threshold for softer-spoken callers
      // - Longer silence duration to accommodate Hindi speech patterns
      // - Fast interrupt detection so the caller can cut in when needed
      turnDetection: {
        config: {
          speech_threshold: 0.45,
          start_of_speech: {
            mode: 'vad',
            vad_config: {
              interrupt_duration_ms: 160, // fast interruption detection
              prefix_padding_ms: 350, // slightly more buffer for code-switched speech
            },
          },
          end_of_speech: {
            mode: 'vad',
            vad_config: {
              silence_duration_ms: 700, // longer pause tolerance for Hindi/Hinglish
            },
          },
        },
      },
      // RTM for transcript events + tools for MCP/agentic actions
      advancedFeatures: { enable_rtm: true, enable_tools: true },
      parameters: {
        audio_scenario: 'chorus',
        data_channel: 'rtm',
        enable_error_message: true,
        enable_metrics: true,
      },
    })
      .withStt(
        new DeepgramSTT({
          model: 'nova-3',
          language: 'multi', // Multilingual: auto-detects Hindi, English, and code-switching
        }),
      )
      .withLlm(
        new OpenAI({
          model: 'gpt-4o-mini',
          greetingMessage: GREETING,
          failureMessage: 'Ek moment please. Please wait a moment.',
          maxHistory: 30, // longer history for support conversations
          params: {
            max_tokens: 512, // shorter responses for cleaner TTS
            temperature: 0.4, // slightly higher for more natural speech
            top_p: 0.9,
          },
        }),
      )
      .withTts(
        new MiniMaxTTS({
          model: 'speech_2_6_turbo',
          voiceId: 'English_captivating_female1', // calm, professional female voice
        }),
      );

    // remoteUids restricts the agent to only process audio from this user
    const session = agent.createSession({
      channel: channel_name,
      agentUid,
      remoteUids: [requester_id],
      idleTimeout: 120, // 2 min idle timeout for support calls (callers may pause)
      expiresIn: ExpiresIn.hours(1),
      debug: false,
    });

    const agentId = await session.start();

    return NextResponse.json({
      agent_id: agentId,
      create_ts: Math.floor(Date.now() / 1000),
      state: 'RUNNING',
    } as AgentResponse);
  } catch (error) {
    console.error('Error starting conversation:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to start conversation',
      },
      { status: 500 },
    );
  }
}
