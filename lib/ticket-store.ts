export interface Ticket {
  ticketId: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: number;
  updatedAt: number;
  channelName: string;
  escalationPackage: {
    conversationSummary: string;
    callerLanguageContext: string;
    confirmedDetails: Record<string, string>;
    uncertainDetails: Record<string, string>;
    missingDetails: string[];
    questionsAsked: string[];
    escalationReason: string;
    safetyBoundaryHit: boolean;
  };
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

const ticketStore = new Map<string, Ticket>();

function generateTicketId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TKT-${timestamp}-${random}`;
}

export function createTicket(data: Omit<Ticket, 'ticketId' | 'status' | 'createdAt' | 'updatedAt'>): Ticket {
  const ticketId = generateTicketId();
  const now = Date.now();
  
  const newTicket: Ticket = {
    ...data,
    ticketId,
    status: 'OPEN',
    createdAt: now,
    updatedAt: now,
  };
  
  ticketStore.set(ticketId, newTicket);
  return newTicket;
}

export function getTickets(): Ticket[] {
  return Array.from(ticketStore.values());
}

export function getTicketById(id: string): Ticket | undefined {
  return ticketStore.get(id);
}

export function updateTicketStatus(id: string, status: Ticket['status']): Ticket {
  const ticket = ticketStore.get(id);
  if (!ticket) {
    throw new Error(`Ticket with id ${id} not found`);
  }
  
  const updatedTicket: Ticket = {
    ...ticket,
    status,
    updatedAt: Date.now(),
  };
  
  ticketStore.set(id, updatedTicket);
  return updatedTicket;
}
