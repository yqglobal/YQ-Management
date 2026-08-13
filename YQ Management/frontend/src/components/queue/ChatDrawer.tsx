import React from 'react';
import { X, Send, Loader2, MessageSquare } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';

interface Message {
  id: string;
  sender: string;
  body: string;
  createdAt: string;
}

interface ChatDrawerProps {
  chatToken: { id: string; customerName: string } | null;
  messages: Message[];
  chatMessage: string;
  setChatMessage: (msg: string) => void;
  onClose: () => void;
}

export function ChatDrawer({ chatToken, messages, chatMessage, setChatMessage, onClose }: ChatDrawerProps) {
  const queryClient = useQueryClient();

  const sendMessageMutation = useMutation({
    mutationFn: ({ tokenId, text }: { tokenId: string; text: string }) =>
      fetchApi(`/messages/token/${tokenId}`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      }),
    onSuccess: (_, variables) => {
      setChatMessage('');
      queryClient.invalidateQueries({ queryKey: ['messages', variables.tokenId] });
      toast.success('Message sent');
    },
    onError: () => toast.error('Error sending message'),
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !chatToken) return;
    sendMessageMutation.mutate({ tokenId: chatToken.id, text: chatMessage });
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/40 dark:bg-black/80 backdrop-blur-md z-50 flex justify-end dark: animate-in fade-in" onClick={onClose}>
      <div className="w-[400px] h-full bg-white dark:bg-zinc-900 border-l border-gray-200 dark:border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50 dark:bg-zinc-900">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-500" />
              Chat with {chatToken?.customerName}
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">Token: {chatToken?.id}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-sm text-gray-500 dark:text-zinc-500 mt-10">
              No messages yet. Send a message to start the conversation via WhatsApp.
            </div>
          ) : (
            messages.map((msg: Message) => (
              <div key={msg.id} className={`flex ${msg.sender === 'OPERATOR' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.sender === 'OPERATOR' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white border border-gray-200 dark:border-white/5 rounded-bl-none'}`}>
                  <p className="text-sm">{msg.body}</p>
                  <p className={`text-[10px] mt-1 ${msg.sender === 'OPERATOR' ? 'text-indigo-200' : 'text-gray-500 dark:text-zinc-500'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!chatMessage.trim() || sendMessageMutation.isPending}
              className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-white transition-colors disabled:opacity-50"
            >
              {sendMessageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
