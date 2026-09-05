import { NextRequest, NextResponse } from 'next/server';
import { createTicket } from '@/lib/ticket-store';
import { EscalationPackage } from '@/lib/escalation';
import { createLinearEscalationIssue } from '@/lib/mcp/linear';
import { sendSlackEscalationAlert } from '@/lib/mcp/slack';

interface CreateTicketRequest {
  escalation_package: EscalationPackage;
  channel_name: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateTicketRequest;

    if (!body.escalation_package || !body.channel_name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    const pkg = body.escalation_package;
    const callerName = pkg.confirmedDetails?.caller_name || 'Customer';
    const contactNumber = pkg.confirmedDetails?.contact_number;
    const location = pkg.confirmedDetails?.location;
    const issueCategory = pkg.confirmedDetails?.issue_category || 'Support';
    const priority = body.priority || 'MEDIUM';

    const ticket = createTicket({
      channelName: body.channel_name,
      escalationPackage: pkg,
      priority,
    });

    // 1. MCP Action: Auto-create issue in Linear
    const linearResult = await createLinearEscalationIssue({
      title: `[SahaayAI] ${issueCategory.toUpperCase()} - ${callerName} (${ticket.ticketId})`,
      description: pkg.conversationSummary,
      priority,
      callerName,
      contactNumber,
      location,
      issueCategory,
      conversationSummary: pkg.conversationSummary,
      callerLanguageContext: pkg.callerLanguageContext,
      ticketId: ticket.ticketId,
      audioChannel: body.channel_name,
    });

    if (linearResult.success) {
      ticket.linearUrl = linearResult.url;
      ticket.linearIssueKey = linearResult.identifier;
    }

    // 2. MCP Action: Send rich alert to Slack support channel
    const slackResult = await sendSlackEscalationAlert({
      ticketId: ticket.ticketId,
      callerName,
      contactNumber,
      location,
      issueCategory,
      priority,
      escalationReason: pkg.escalationReason,
      conversationSummary: pkg.conversationSummary,
      callerLanguageContext: pkg.callerLanguageContext,
      safetyBoundaryHit: pkg.safetyBoundaryHit,
      channelName: body.channel_name,
      linearUrl: ticket.linearUrl,
    });

    ticket.slackAlertSent = slackResult.success;

    return NextResponse.json(
      {
        ticket_id: ticket.ticketId,
        status: ticket.status,
        created_at: ticket.createdAt,
        linear_url: ticket.linearUrl,
        linear_issue_key: ticket.linearIssueKey,
        slack_alert_sent: ticket.slackAlertSent,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
