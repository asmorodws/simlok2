import { io } from '@/server/socket';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest) {
  if (!io.httpServer) {
    // Attach to global server if not attached
    const server = (globalThis as any).__socket_server;
    if (server) {
      io.attach(server);
    }
  }
  
  return new Response('Socket.IO server is running', { 
    status: 200,
    headers: {
      'Content-Type': 'text/plain'
    }
  });
}
