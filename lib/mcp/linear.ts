export interface LinearIssuePayload {
  title: string;
  description: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  callerName?: string;
  contactNumber?: string;
  location?: string;
  issueCategory?: string;
  conversationSummary?: string;
  callerLanguageContext?: string;
  ticketId?: string;
  audioChannel?: string;
}

export interface LinearIssueResult {
  success: boolean;
  issueId?: string;
  identifier?: string;
  url?: string;
  error?: string;
}

const LINEAR_GRAPHQL_ENDPOINT = 'https://api.linear.app/graphql';

function mapPriorityToLinear(
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
): number {
  switch (priority) {
    case 'CRITICAL':
      return 1; // Urgent in Linear
    case 'HIGH':
      return 2; // High
    case 'MEDIUM':
      return 3; // Medium
    case 'LOW':
    default:
      return 4; // Low
  }
}

export async function createLinearEscalationIssue(
  payload: LinearIssuePayload,
): Promise<LinearIssueResult> {
  const apiKey = process.env.LINEAR_API_KEY;
  const teamId = process.env.LINEAR_TEAM_ID;

  if (!apiKey || !teamId) {
    console.warn(
      '[MCP Linear] LINEAR_API_KEY or LINEAR_TEAM_ID not configured. Skipping Linear sync.',
    );
    return { success: false, error: 'Linear credentials not configured' };
  }

  const markdownDescription = `
### 🚨 SahaayAI Voice Escalation Handoff
- **Ticket ID:** \`${payload.ticketId || 'N/A'}\`
- **Customer Name:** **${payload.callerName || 'Unknown Caller'}**
- **Contact Number:** \`${payload.contactNumber || 'Not provided'}\`
- **Location:** ${payload.location || 'Not provided'}
- **Category:** **${payload.issueCategory || 'General Support'}**
- **Language Context:** \`${payload.callerLanguageContext || 'English/Hindi'}\`
- **Voice Channel:** \`${payload.audioChannel || 'N/A'}\`

---
### 📝 Conversation Summary
> ${payload.conversationSummary || payload.description || 'No summary available.'}

*Created automatically by SahaayAI Voice Agent via Linear MCP.*
`.trim();

  const query = `
    mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue {
          id
          identifier
          url
          title
        }
      }
    }
  `;

  try {
    const response = await fetch(LINEAR_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify({
        query,
        variables: {
          input: {
            teamId,
            title: payload.title,
            description: markdownDescription,
            priority: mapPriorityToLinear(payload.priority),
          },
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[MCP Linear] GraphQL request failed:', errText);
      return { success: false, error: errText };
    }

    const data = await response.json();
    if (data.errors && data.errors.length > 0) {
      const errMsg = data.errors[0]?.message || 'GraphQL error';
      console.error('[MCP Linear] Error creating issue:', errMsg);
      return { success: false, error: errMsg };
    }

    const issue = data.data?.issueCreate?.issue;
    if (issue) {
      console.log(
        `[MCP Linear] Issue created successfully: ${issue.identifier} (${issue.url})`,
      );
      return {
        success: true,
        issueId: issue.id,
        identifier: issue.identifier,
        url: issue.url,
      };
    }

    return { success: false, error: 'No issue returned by Linear' };
  } catch (error) {
    console.error('[MCP Linear] Network error creating issue:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
