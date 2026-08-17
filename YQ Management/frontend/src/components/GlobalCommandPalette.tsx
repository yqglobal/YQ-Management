import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/router';
import {
  Search,
  Calendar,
  Settings,
  Users,
  Building,
  Monitor,
  X
} from 'lucide-react';
import { useAuth } from './AuthContext';

export function GlobalCommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] sm:pt-[20vh]">
      <div 
        className="fixed inset-0 bg-zinc-950/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-[640px] px-4">
        <Command
          className="relative flex h-full w-full flex-col overflow-hidden rounded-xl bg-white dark:bg-zinc-950 shadow-2xl border border-zinc-200 dark:border-zinc-800"
          shouldFilter={true}
        >
          <div className="flex items-center border-b border-zinc-200 dark:border-zinc-800 px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input 
              autoFocus
              placeholder="Type a command or search..." 
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-50"
            />
            <div 
              className="ml-2 flex h-6 w-6 items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4 opacity-50" />
            </div>
          </div>
          
          <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
            <Command.Empty className="py-6 text-center text-sm text-zinc-500">
              No results found.
            </Command.Empty>

            <Command.Group heading="Navigation" className="px-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 py-2">
              <Command.Item
                onSelect={() => runCommand(() => router.push('/dashboard'))}
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800"
              >
                <Monitor className="h-4 w-4 text-sky-500" />
                Dashboard
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push('/dashboard/appointments'))}
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800"
              >
                <Calendar className="h-4 w-4 text-emerald-500" />
                Appointments
              </Command.Item>
            </Command.Group>

            {user?.role === 'SUPER_ADMIN' && (
              <Command.Group heading="Super Admin" className="px-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 py-2">
                <Command.Item
                  onSelect={() => runCommand(() => router.push('/super-admin/tenants'))}
                  className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800"
                >
                  <Building className="h-4 w-4" />
                  Tenants
                </Command.Item>
                <Command.Item
                  onSelect={() => runCommand(() => router.push('/super-admin/users'))}
                  className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800"
                >
                  <Users className="h-4 w-4" />
                  Users
                </Command.Item>
                <Command.Item
                  onSelect={() => runCommand(() => router.push('/super-admin/integrations'))}
                  className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800"
                >
                  <Settings className="h-4 w-4 text-amber-500" />
                  Integrations
                </Command.Item>
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
