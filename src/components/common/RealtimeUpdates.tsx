import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = () => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      path: '/api/socket',
      addTrailingSlash: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
      transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
    });
  }
  return socket;
};

export const getSocket = () => socket;

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = initSocket();
    }

    const currentSocket = socketRef.current;

    const handleConnect = () => {
      console.log('Connected to socket server');
    };

    const handleDisconnect = (reason: string) => {
      console.log('Disconnected from socket server:', reason);
    };

    const handleError = (error: any) => {
      console.error('Socket error:', error);
    };

    const handleConnectError = (error: any) => {
      console.error('Socket connection error:', error);
    };

    const handleReconnect = (attemptNumber: number) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
    };

    const handleReconnectError = (error: any) => {
      console.error('Socket reconnection error:', error);
    };

    currentSocket.on('connect', handleConnect);
    currentSocket.on('disconnect', handleDisconnect);
    currentSocket.on('error', handleError);
    currentSocket.on('connect_error', handleConnectError);
    currentSocket.on('reconnect', handleReconnect);
    currentSocket.on('reconnect_error', handleReconnectError);

    return () => {
      currentSocket.off('connect', handleConnect);
      currentSocket.off('disconnect', handleDisconnect);
      currentSocket.off('error', handleError);
      currentSocket.off('connect_error', handleConnectError);
      currentSocket.off('reconnect', handleReconnect);
      currentSocket.off('reconnect_error', handleReconnectError);
    };
  }, []);

  return socketRef.current;
};
