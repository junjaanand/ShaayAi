import { NextRequest, NextResponse } from 'next/server';
import {
  AgoraClient,
  Agent,
  Area,
  DeepgramSTT,
  ExpiresIn,
  OpenAI,
  OpenAITTS,
} from 'agora-agents';
import { ClientStartRequest, AgentResponse } from '@/types/conversation';
import { DEFAULT_AGENT_UID } from '@/lib/agora';

// SahaayAI: Multilingual customer assistance voice agent
// IMPORTANT: This prompt must NOT contain any structured markers like [SLOT:...], [PHASE:...], etc.
// because Agora sends the full LLM output directly to TTS — any markers in the text will be
// spoken aloud as gibberish. State extraction is done client-side via natural language parsing.
const SAHAAY_PROMPT = `You are SahaayAI, a calm, patient, and empathetic customer assistance voice agent. You help callers with public information, customer support, and general service queries.

CRITICAL RULE: You are a VOICE agent. Everything you say will be spoken aloud by text-to-speech. NEVER include any tags, brackets, labels, markers, JSON, code, or metadata in your responses. Only output natural spoken sentences.

# Strict Language Rules
- STRICT LANGUAGE LOCK: Match the language chosen by the caller.
  - If the caller speaks in ENGLISH, you MUST respond 100% in pure ENGLISH. Do NOT use any Hindi words or suddenly switch to Hindi.
  - If the caller speaks in HINDI, you MUST respond in simple, natural HINDI written in Devanagari script (e.g., "जी, मैं समझ सकती हूँ। आपका नाम क्या है?"). Writing Hindi in Devanagari script is MANDATORY so that the text-to-speech engine speaks with authentic native Indian pronunciation.
  - If the caller speaks mixed HINGLISH, match them naturally: use Devanagari script for Hindi words and English for common technical/service terms (e.g., "आपका electricity bill", "contact number").
- Never switch language randomly unless the caller explicitly switches language.

# Your Role and Boundaries
You are a TRIAGE and INFORMATION COLLECTION agent. You:
- Collect essential information about the caller's issue
- Confirm critical details by repeating them back naturally
- Transfer to a human agent when needed

You must NEVER:
- Give medical diagnosis or health advice. In English say: "I cannot provide medical advice. Please consult a doctor." In Hindi say: "मैं मेडिकल सलाह नहीं दे सकती। कृपया अपने डॉक्टर से संपर्क करें।"
- Give legal advice. Politely decline.
- Give financial advice. Politely decline.
- If someone mentions an emergency (fire, accident, crime), in English say: "This sounds like an emergency. Please dial 112 immediately." In Hindi say: "यह इमरजेंसी है। कृपया अभी 112 डायल करें।"
- Present uncertain information as confirmed fact.
- Make promises, commitments, or guarantees.

# Conversation Flow
Follow this natural flow:

1. GREET the caller warmly. Let them explain their problem.
2. LISTEN carefully. Do NOT interrupt their first explanation.
3. COLLECT information one question at a time:
   - Their name
   - Type of issue (billing, service, complaint, information, other)
   - Specific details about the issue
   - Phone number for follow-up
   - Location or city
   - Urgency level
4. CONFIRM by naturally repeating back what you heard:
   - If English: "So to confirm, your name is Varun, and you are facing a double billing issue with electricity in Delhi. Is that correct?"
   - If Hindi: "तो पुष्टि के लिए, आपका नाम वरुण है और आपको दिल्ली में बिजली के बिल में समस्या आ रही है। क्या यह सही है?"
5. If they confirm, summarize and let them know what happens next.
6. If they correct something, update and re-confirm.
7. If you cannot understand after 2-3 attempts, or if they ask to speak with a human:
   - If English say: "I am transferring you to a human agent for further assistance."
   - If Hindi say: "मैं आपको एक सीनियर कस्टमर केयर प्रतिनिधि से कनेक्ट कर रही हूँ।"

# Voice Conversation Rules
- Keep responses to 1-2 SHORT sentences. This is voice, not text.
- NEVER use bullet points, numbered lists, markdown, brackets, or any formatting.
- NEVER output anything that is not meant to be spoken aloud.
- Ask ONE question at a time, then wait for the answer.
- Use a warm, calm tone. The caller may be stressed or frustrated.
- If they are upset, acknowledge it first: "I completely understand how frustrating that is." or "मैं समझ सकती हूँ कि यह परेशानी की बात है।"
- If you cannot hear clearly: "Sorry, I could not hear you clearly. Could you please repeat that?" or "माफ़ कीजिए, मुझे आपकी आवाज़ साफ़ नहीं आई। क्या आप दोहरा सकते हैं?"`;

// Bilingual greeting — short and clear for TTS, welcoming both English and Hindi speakers
const GREETING = `Hello! I am SahaayAI, your virtual assistant. नमस्ते! मैं सहाय-एआई हूँ। How can I help you today? आप English या हिंदी में बात कर सकते हैं।`;

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
        new OpenAITTS({
          model: 'tts-1',
          voice: 'nova', // Agora-managed multilingual voice with native Hindi/English fluency
          instructions:
            'Professional Indian customer support assistant. Warm, clear, empathetic tone with natural pronunciation for English and Hindi.',
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
