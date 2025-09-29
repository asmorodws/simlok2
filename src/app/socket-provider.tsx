'use client';

import { createContext, useContext } from 'react';

interface SocketContextType {
  socket: null;
  isConnected: false;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export function SocketProvider({ children }: { children: React.ReactNode }) {
  // Socket.IO has been replaced with Server-Sent Events (SSE)
  // This provider is kept for backwards compatibility but does nothing
  console.log('SocketProvider: Socket.IO disabled, using Server-Sent Events instead');

  return (
    <SocketContext.Provider value={{ socket: null, isConnected: false }}>
      {children}
    </SocketContext.Provider>
  );
}