import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
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

    let socketInstance: Socket | null = null;

    const initSocket = async () => {
      const { io } = await import('socket.io-client');
      
      const baseUrl = typeof window !== 'undefined'
        ? (process.env.NEXT_PUBLIC_API_URL || getBackendUrl())
        : getBackendUrl();

      socketInstance = io(baseUrl, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      // Re-join the tenant room on EVERY connect, not just the first.
      // Socket.io reconnects fire the 'connect' event again, but room memberships
      // are lost on the server side when a client disconnects. Without re-joining
      // here, after any network blip (idle, sleep, proxy timeout) the dashboard
      // would reconnect but receive no events because it's no longer in the room.
      socketInstance.on('connect', () => {
        setIsConnected(true);
        if (user.tenantId) {
          socketInstance?.emit('joinTenantRoom', user.tenantId);
        }
      });

      socketInstance.on('disconnect', (reason) => {
        setIsConnected(false);
        // If the server disconnected us (e.g., ping timeout), socket.io will
        // automatically try to reconnect. Log for visibility.
        if (reason === 'io server disconnect') {
          socketInstance?.connect();
        }
      });

      setSocket(socketInstance);
    };

    initSocket();

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
      setSocket(null);
    };
  }, [user?.id, user?.tenantId]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
