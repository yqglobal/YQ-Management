import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getBackendUrl } from '../lib/api';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // We only want a persistent dashboard socket if the user is logged in
    if (!user) return;

    const baseUrl = typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_API_URL || getBackendUrl())
      : getBackendUrl();

    const socketInstance = io(baseUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      if (user.tenantId) {
        socketInstance.emit('joinTenantRoom', user.tenantId);
      }
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      setSocket(null);
    };
  }, [user?.id, user?.tenantId]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
