import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { redisSub } from '@/lib/database/singletons';
import { toJakartaISOString } from '@/lib/helpers/timezone';
import { requireSessionWithRole } from '@/lib/auth/roleHelpers';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userOrError = requireSessionWithRole(session, ['VENDOR', 'VERIFIER', 'REVIEWER', 'APPROVER', 'ADMIN', 'SUPER_ADMIN']);
  if (userOrError instanceof NextResponse) return new Response('Unauthorized', { status: 401 });

  const searchParams = request.nextUrl.searchParams;
  const scope = searchParams.get('scope') || 
    ( userOrError.role === 'SUPER_ADMIN' ? 'admin' :
     userOrError.role === 'REVIEWER' ? 'reviewer' :
     userOrError.role === 'APPROVER' ? 'approver' : 'vendor');
  const vendorId = searchParams.get('vendorId') || userOrError.id;

  // Create Server-Sent Events stream
  const stream = new ReadableStream({
    start(controller) {
      console.log('🔥 SSE connection established for:', { scope, vendorId, role: userOrError.role });

      // Send initial connection message
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
        type: 'connected', 
        message: 'Real-time notifications connected',
        scope,
        vendorId,
        role: userOrError.role
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
      const subscriber = redisSub.duplicate();

      subscriber.subscribe(channelName, (err, count) => {
        if (err) {
          console.error('Redis subscribe error:', err);
          return;
        }
        console.log(`📡 SSE Subscribed to Redis channel: ${channelName} (${count} channels)`);
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
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'heartbeat', 
            timestamp: toJakartaISOString(new Date()) || new Date().toISOString()
          })}\n\n`));
        } catch (error) {
          console.error('❌ SSE Heartbeat error:', error);
          clearInterval(heartbeat);
        }
      }, 30000); // Every 30 seconds

      // Cleanup on connection close
      const cleanup = async () => {
        console.log('🔌 SSE connection closed for:', { scope, vendorId });
        clearInterval(heartbeat);
        
        try {
          await subscriber.unsubscribe();
          await subscriber.quit();
          console.log('✅ SSE Redis subscriber cleaned up');
        } catch (error) {
          console.error('❌ SSE cleanup error:', error);
          // Force disconnect if quit fails
          subscriber.disconnect();
        }
        
        try {
          controller.close();
        } catch (error) {
          // Controller might already be closed
        }
      };

      request.signal.addEventListener('abort', cleanup);
      
      // Also cleanup on errors
      subscriber.on('error', (err) => {
        console.error('❌ SSE subscriber error:', err);
        cleanup();
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
