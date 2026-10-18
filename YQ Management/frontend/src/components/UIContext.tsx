import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

interface UIContextType {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean, options?: { persist?: boolean }) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('qmova_sidebar_collapsed');
    if (saved) setIsSidebarCollapsed(saved === 'true');
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('qmova_sidebar_collapsed', String(newState));
      return newState;
    });
  }, []);

  const setSidebarCollapsed = useCallback((collapsed: boolean, options?: { persist?: boolean }) => {
    setIsSidebarCollapsed(collapsed);
    if (options?.persist !== false) {
      localStorage.setItem('qmova_sidebar_collapsed', String(collapsed));
    }
  }, []);

  const value = useMemo(
    () => ({ isSidebarCollapsed, toggleSidebar, setSidebarCollapsed }),
    [isSidebarCollapsed, toggleSidebar, setSidebarCollapsed]
  );

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
