import { NextRequest, NextResponse } from 'next/server';
import { createTicket } from '@/lib/ticket-store';
import { EscalationPackage } from '@/lib/escalation';

interface CreateTicketRequest {
  escalation_package: EscalationPackage;
  channel_name: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as CreateTicketRequest;
    
    if (!body.escalation_package || !body.channel_name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const ticket = createTicket({
      channelName: body.channel_name,
      escalationPackage: body.escalation_package,
      priority: body.priority || 'MEDIUM',
    });
    
    return NextResponse.json({
      ticket_id: ticket.ticketId,
      status: ticket.status,
      created_at: ticket.createdAt,
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
