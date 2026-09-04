import { NextRequest, NextResponse } from 'next/server';
import { getTickets, getTicketById } from '@/lib/ticket-store';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (id) {
      const ticket = getTicketById(id);
      if (!ticket) {
        return NextResponse.json(
          { error: 'Ticket not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ ticket }, { status: 200 });
    }
    
    const tickets = getTickets();
    return NextResponse.json({ tickets }, { status: 200 });
    
  } catch (error) {
    console.error('Error getting tickets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
