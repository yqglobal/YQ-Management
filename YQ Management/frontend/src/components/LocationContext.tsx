import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../lib/api';
import { useAuth } from './AuthContext';

interface LocationContextType {
  activeLocationId: string | null;
  setActiveLocationId: (id: string | null) => void;
  allowedLocations: any[];
  isLoading: boolean;
}

const LocationContext = createContext<LocationContextType>({
  activeLocationId: null,
  setActiveLocationId: () => {},
  allowedLocations: [],
  isLoading: true,
});

export const useLocation = () => useContext(LocationContext);

export const LocationProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);

  // Fetch all locations for the tenant
  const { data: tenant, isLoading: isTenantLoading } = useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: () => fetchApi('/tenant/me').catch(() => null),
    enabled: !!user,
  });

  // Determine allowed locations based on RBAC
  const allowedLocations = useMemo(() => {
    if (!tenant || !tenant.locations) return [];
    
    // Admins see all locations
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN' || user?.role === 'ADMIN') {
      return tenant.locations;
    }
    
    // Operators/Managers see only assigned locations
    if (user?.allowedLocationIds && user.allowedLocationIds.length > 0) {
      return tenant.locations.filter((loc: any) => user.allowedLocationIds.includes(loc.id));
    }
    
    // Default fallback (no locations assigned)
    return [];
  }, [tenant, user]);

  useEffect(() => {
    // Attempt to load from localStorage first
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('qmova_active_location_id');
      if (saved) {
        // Only set it if it's still allowed (or if 'all' is selected and user is admin)
        if (saved === 'all' && (user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN' || user?.role === 'ADMIN')) {
          setActiveLocationId('all');
        } else if (allowedLocations.some(l => l.id === saved)) {
          setActiveLocationId(saved);
        }
      }
    }
  }, [allowedLocations, user]);

  useEffect(() => {
    // If no active location (or invalid one) is set, default to something sensible
    if (!activeLocationId || (activeLocationId !== 'all' && !allowedLocations.some(l => l.id === activeLocationId))) {
      if (allowedLocations.length > 0) {
        // Admins default to 'all', others default to their first allowed location
        if (user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN' || user?.role === 'ADMIN') {
           setActiveLocationId('all');
        } else {
           setActiveLocationId(allowedLocations[0].id);
        }
      } else {
        // If they have no locations allowed (and aren't admin), they get nothing
        setActiveLocationId(null);
      }
    }
  }, [allowedLocations, activeLocationId, user]);

  // Persist changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (activeLocationId) {
        localStorage.setItem('qmova_active_location_id', activeLocationId);
      } else {
        localStorage.removeItem('qmova_active_location_id');
      }
    }
  }, [activeLocationId]);

  return (
    <LocationContext.Provider
      value={{
        activeLocationId,
        setActiveLocationId,
        allowedLocations,
        isLoading: isTenantLoading,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};
