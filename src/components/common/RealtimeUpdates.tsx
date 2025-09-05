import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = () => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', {
      path: '/api/socket',
      addTrailingSlash: false,
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

    const handleDisconnect = () => {
      console.log('Disconnected from socket server');
    };

    const handleError = (error: any) => {
      console.error('Socket error:', error);
    };

    currentSocket.on('connect', handleConnect);
    currentSocket.on('disconnect', handleDisconnect);
    currentSocket.on('error', handleError);

    return () => {
      currentSocket.off('connect', handleConnect);
      currentSocket.off('disconnect', handleDisconnect);
      currentSocket.off('error', handleError);
    };
  }, []);

  return socketRef.current;
};
