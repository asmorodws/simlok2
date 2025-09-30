import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redisPub } from '@/lib/singletons';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const scope = searchParams.get('scope') || 
    ( session.user.role === 'SUPER_ADMIN' ? 'admin' :
     session.user.role === 'REVIEWER' ? 'reviewer' :
     session.user.role === 'APPROVER' ? 'approver' : 'vendor');
  const vendorId = searchParams.get('vendorId') || session.user.id;

  // Create Server-Sent Events stream
  const stream = new ReadableStream({
    start(controller) {
      console.log('🔥 SSE connection established for:', { scope, vendorId, role: session.user.role });

      // Send initial connection message
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
        type: 'connected', 
        message: 'Real-time notifications connected',
        scope,
        vendorId,
        role: session.user.role
      })}\n\n`));

      // Subscribe to Redis channels for real-time updates
      let channelName: string;
      switch (scope) {
        case 'admin':
          channelName = 'notifications:admin';
          break;
        case 'reviewer':
          channelName = 'notifications:reviewer';
          break;
        case 'approver':
          channelName = 'notifications:approver';
          break;
        case 'vendor':
          channelName = `notifications:vendor:${vendorId}`;
          break;
        default:
          channelName = 'notifications:admin';
      }
      
      // Create a Redis subscriber for this connection
      const subscriber = redisPub.duplicate();
      
      subscriber.subscribe(channelName, (err, count) => {
        if (err) {
          console.error('Redis subscribe error:', err);
          return;
        }
        console.log(`📡 Subscribed to Redis channel: ${channelName} (${count} channels)`);
      });

      subscriber.on('message', (channel, message) => {
        try {
          console.log(`📨 SSE Received message on ${channel}:`, message);
          const data = JSON.parse(message);
          
          // Send the notification data to client
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          console.log(`📤 SSE Forwarded message to client:`, data.type);
        } catch (error) {
          console.error('❌ SSE Error processing Redis message:', error);
        }
      });

      // Keep connection alive with heartbeat
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'heartbeat', 
          timestamp: new Date().toISOString() 
        })}\n\n`));
      }, 30000); // Every 30 seconds

      // Cleanup on connection close
      request.signal.addEventListener('abort', () => {
        console.log('🔌 SSE connection closed for:', { scope, vendorId });
        clearInterval(heartbeat);
        subscriber.unsubscribe();
        subscriber.disconnect();
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}
