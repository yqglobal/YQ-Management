import React, { useState } from 'react';
import { X, Play, CheckCircle2, Clock, Calendar, User, Hash, MoreVertical, XCircle, RotateCcw } from 'lucide-react';
import { fetchApi } from '../lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface VisitDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  visit: any | null;
}

export function VisitDrawer({ isOpen, onClose, visit }: VisitDrawerProps) {
  const queryClient = useQueryClient();

  const startMutation = useMutation({
    mutationFn: () => fetchApi(`/visits/${visit?.id}/start`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['visits'] }),
  });

  const completeMutation = useMutation({
    mutationFn: () => fetchApi(`/visits/${visit?.id}/complete`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['visits'] }),
  });

  if (!visit) return null;

  const handleStart = () => startMutation.mutate();
  const handleComplete = () => completeMutation.mutate();

  const isWaiting = visit.currentState === 'WAITING' || visit.currentState === 'CHECKED_IN';
  const isInService = visit.currentState === 'IN_SERVICE';
  const isCompleted = visit.currentState === 'COMPLETED';

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-zinc-950/40 dark:bg-black/80 backdrop-blur-md z-[80] transition-opacity" 
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-zinc-950 border-l border-gray-200 dark:border-white/10 shadow-2xl z-[90] transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10 shrink-0 bg-gray-50/50 dark:bg-zinc-900/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Visit Details</h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400">ID: {visit.id.substring(0, 8)}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-white/10 shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Header Card */}
          <div className="p-6 border-b border-gray-100 dark:border-white/5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{visit.customer?.name || 'Walk-in Customer'}</h3>
                <p className="text-sm text-gray-500">{visit.customer?.phone || 'No phone provided'}</p>
              </div>
              <StateBadge state={visit.currentState} />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-gray-50 dark:bg-zinc-900/50 p-3 rounded-xl border border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400 mb-1">
                  <Hash className="w-3.5 h-3.5" />
                  Service
                </div>
                <div className="font-medium text-gray-900 dark:text-white text-sm">
                  {visit.service?.name || 'General'}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-zinc-900/50 p-3 rounded-xl border border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400 mb-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Source
                </div>
                <div className="font-medium text-gray-900 dark:text-white text-sm capitalize">
                  {visit.source?.toLowerCase().replace('_', ' ')}
                </div>
              </div>
            </div>
          </div>

          {/* Timeline / Status Info */}
          <div className="p-6">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Timeline</h4>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 dark:before:via-white/10 before:to-transparent">
              {visit.createdAt && (
                <div className="relative flex items-center gap-4">
                  <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-zinc-700 ring-4 ring-white dark:ring-zinc-950 z-10 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Visit Created</p>
                    <p className="text-xs text-gray-500">{new Date(visit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              )}
              {(visit.waitingStart || visit.checkInTime) && (
                <div className="relative flex items-center gap-4">
                  <div className="w-4 h-4 rounded-full bg-yellow-400 ring-4 ring-white dark:ring-zinc-950 z-10 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Checked In / Waiting</p>
                    <p className="text-xs text-gray-500">{new Date(visit.waitingStart || visit.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              )}
              {visit.serviceStart && (
                <div className="relative flex items-center gap-4">
                  <div className="w-4 h-4 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-zinc-950 z-10 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Service Started</p>
                    <p className="text-xs text-gray-500">{new Date(visit.serviceStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              )}
              {visit.completedAt && (
                <div className="relative flex items-center gap-4">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-zinc-950 z-10 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Completed</p>
                    <p className="text-xs text-gray-500">{new Date(visit.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-zinc-900/50 shrink-0 flex gap-3">
          {isWaiting && (
            <button 
              onClick={handleStart}
              disabled={startMutation.isPending}
              className="flex-1 flex justify-center items-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              Start Service
            </button>
          )}
          
          {isInService && (
            <button 
              onClick={handleComplete}
              disabled={completeMutation.isPending}
              className="flex-1 flex justify-center items-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              Complete
            </button>
          )}

          {!isCompleted && (
            <button className="px-4 py-2.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 rounded-xl transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function StateBadge({ state }: { state: string }) {
  const colors: Record<string, string> = {
    WAITING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20',
    CHECKED_IN: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    IN_SERVICE: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20',
    COMPLETED: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300 border-gray-200 dark:border-white/10',
    NO_SHOW: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20',
  };

  const style = colors[state] || colors.COMPLETED;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${style}`}>
      {state.replace('_', ' ')}
    </span>
  );
}
