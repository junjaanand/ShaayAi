export interface SlackEscalationPayload {
  ticketId: string;
  callerName?: string;
  contactNumber?: string;
  location?: string;
  issueCategory?: string;
  priority: string;
  escalationReason: string;
  conversationSummary: string;
  callerLanguageContext: string;
  safetyBoundaryHit: boolean;
  channelName: string;
  linearUrl?: string;
}

export async function sendSlackEscalationAlert(
  payload: SlackEscalationPayload,
): Promise<{ success: boolean; error?: string }> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('[MCP Slack] SLACK_WEBHOOK_URL is not set. Skipping Slack alert.');
    return { success: false, error: 'SLACK_WEBHOOK_URL not configured' };
  }

  const priorityEmoji =
    payload.priority === 'CRITICAL'
      ? '🚨'
      : payload.priority === 'HIGH'
        ? '⚠️'
        : '📋';

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${priorityEmoji} SahaayAI Escalation Alert: ${payload.ticketId}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Caller:*\n${payload.callerName || 'Unknown Caller'}`,
        },
        {
          type: 'mrkdwn',
          text: `*Contact:*\n${payload.contactNumber || 'Not provided'}`,
        },
        {
          type: 'mrkdwn',
          text: `*Category:*\n${payload.issueCategory || 'General Support'}`,
        },
        {
          type: 'mrkdwn',
          text: `*Location:*\n${payload.location || 'Not provided'}`,
        },
        {
          type: 'mrkdwn',
          text: `*Priority:*\n\`${payload.priority}\``,
        },
        {
          type: 'mrkdwn',
          text: `*Language Context:*\n${payload.callerLanguageContext || 'English/Hindi'}`,
        },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Why Escalated?*\n> ${payload.escalationReason}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Summary:*\n${payload.conversationSummary.slice(0, 400)}...`,
      },
    },
  ];

  if (payload.linearUrl) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Linear Issue:* <${payload.linearUrl}|View on Linear Board ↗>`,
      },
    });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `${priorityEmoji} Live Support Escalation: ${payload.callerName || 'Caller'} (${payload.issueCategory || 'Issue'}) - Ticket ${payload.ticketId}`,
        blocks,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[MCP Slack] Failed to post message to Slack:', errText);
      return { success: false, error: errText };
    }

    console.log('[MCP Slack] Escalation alert posted successfully to Slack!');
    return { success: true };
  } catch (error) {
    console.error('[MCP Slack] Network error posting to Slack:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
