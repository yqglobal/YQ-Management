import React, { createContext, useContext, useState, ReactNode } from 'react';

interface MyDeskContextType {
  activeVisit: any | null;
  setActiveVisit: (visit: any | null) => void;
  refetchVisits: () => void;
}

const MyDeskContext = createContext<MyDeskContextType | undefined>(undefined);

export const MyDeskProvider = ({ children }: { children: ReactNode }) => {
  const [activeVisit, setActiveVisit] = useState<any | null>(null);

  const refetchVisits = () => {
    // In a real implementation, this might trigger a React Query refetch
    // For now, we'll dispatch an event that widgets can listen to
    window.dispatchEvent(new Event('my-desk-refetch'));
  };

  return (
    <MyDeskContext.Provider value={{ activeVisit, setActiveVisit, refetchVisits }}>
      {children}
    </MyDeskContext.Provider>
  );
};

export const useMyDesk = () => {
  const context = useContext(MyDeskContext);
  if (!context) {
    throw new Error('useMyDesk must be used within a MyDeskProvider');
  }
  return context;
};
