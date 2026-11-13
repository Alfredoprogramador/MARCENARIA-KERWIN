import React, { useState } from 'react';
import { Project, InAppMessage, AppNotification } from '../../types/marcenaria';
import {
  MessageSquare,
  Send,
  Bell,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  DollarSign,
  Calendar,
  Shield,
  Layers,
} from 'lucide-react';

interface MessagingProps {
  messages: InAppMessage[];
  notifications: AppNotification[];
  projects: Project[];
  onSendMessage: (msg: InAppMessage) => void;
  onClearNotifications: () => void;
  onMarkNotificationRead: (id: string) => void;
}

export const Messaging: React.FC<MessagingProps> = ({
  messages,
  notifications,
  projects,
  onSendMessage,
  onClearNotifications,
  onMarkNotificationRead,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'notifications'>('chat');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [inputText, setInputText] = useState<string>('');

  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: InAppMessage = {
      id: `msg-${Date.now()}`,
      projectId: selectedProjectId,
      senderName: 'MarcenariaPro',
      senderRole: 'Marcenaria',
      content: inputText.trim(),
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    onSendMessage(newMsg);
    setInputText('');
  };

  const handleQuickTemplate = (template: string) => {
    const newMsg: InAppMessage = {
      id: `msg-${Date.now()}`,
      projectId: selectedProjectId,
      senderName: 'Sistema MarcenariaPro',
      senderRole: 'Marcenaria',
      content: template,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isStatusAlert: true,
    };
    onSendMessage(newMsg);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'chat'
                ? 'bg-amber-600 text-white shadow-lg'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Mensageria do App</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'notifications'
                ? 'bg-amber-600 text-white shadow-lg'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Notificações Push</span>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'notifications' && (
          <button
            onClick={onClearNotifications}
            className="text-xs text-slate-400 hover:text-slate-200 transition"
          >
            Limpar todas
          </button>
        )}
      </div>

      {/* Tab 1: Chat */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Project Channel Selector */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Canais por Projeto
            </h4>
            <div className="space-y-2">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProjectId(p.id)}
                  className={`w-full text-left p-3 rounded-xl border transition flex flex-col gap-1 ${
                    selectedProjectId === p.id
                      ? 'bg-amber-950/40 border-amber-500/60 text-slate-100 shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850'
                  }`}
                >
                  <div className="font-semibold text-xs text-slate-200 truncate">{p.title}</div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{p.clientName}</span>
                    <span className="text-amber-500 font-medium">{p.status}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Window */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-[520px]">
            {/* Chat Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <h4 className="font-semibold text-slate-100 text-sm">
                  {currentProject?.title || 'Canal Geral'}
                </h4>
                <span className="text-xs text-slate-400">
                  Comunicação direta com o cliente ({currentProject?.clientName})
                </span>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                Online
              </span>
            </div>

            {/* Quick Status Templates */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
              {[
                '📐 Medição confirmada no local!',
                '🪚 Início do corte das chapas de MDF',
                '🚚 Móveis embalados e saindo para entrega',
                '🔧 Equipe de montagem iniciando instalação',
                '✅ Instalação finalizada e vistoriada!',
              ].map((template, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickTemplate(template)}
                  className="flex-shrink-0 bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-[11px] text-slate-300 px-3 py-1.5 rounded-lg transition"
                >
                  {template}
                </button>
              ))}
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4">
              {messages.map((m) => {
                const isMe = m.senderRole === 'Marcenaria';
                const isAlert = m.isStatusAlert;

                if (isAlert) {
                  return (
                    <div key={m.id} className="flex justify-center my-2">
                      <div className="bg-amber-950/60 border border-amber-600/40 px-4 py-1.5 rounded-full text-xs text-amber-300 flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>{m.content}</span>
                        <span className="text-[10px] text-amber-400/60 font-mono">{m.timestamp}</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs space-y-1 shadow ${
                        isMe
                          ? 'bg-amber-600 text-white rounded-br-none'
                          : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 text-[10px] opacity-75">
                        <span className="font-semibold">{m.senderName}</span>
                        <span className="font-mono">{m.timestamp}</span>
                      </div>
                      <p className="leading-relaxed">{m.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSend} className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <input
                type="text"
                placeholder="Digite sua mensagem para o cliente..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: Push Notifications Feed */}
      {activeTab === 'notifications' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Central de Notificações em Tempo Real (Status & Financeiro)
            </h4>
            <span className="text-xs text-slate-400">{notifications.length} notificações registradas</span>
          </div>

          <div className="space-y-3">
            {notifications.map((n) => {
              const icon =
                n.type === 'financial' ? (
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                ) : n.type === 'calendar' ? (
                  <Calendar className="w-4 h-4 text-blue-400" />
                ) : n.type === 'security' ? (
                  <Shield className="w-4 h-4 text-purple-400" />
                ) : (
                  <Layers className="w-4 h-4 text-amber-500" />
                );

              return (
                <div
                  key={n.id}
                  onClick={() => onMarkNotificationRead(n.id)}
                  className={`p-4 rounded-xl border transition flex items-start gap-3 cursor-pointer ${
                    !n.read
                      ? 'bg-slate-950 border-amber-500/40 shadow-md'
                      : 'bg-slate-950/60 border-slate-800/80 opacity-75'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">{icon}</div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <h5 className="font-semibold text-slate-100 text-xs">{n.title}</h5>
                      <span className="text-[10px] text-slate-500">{n.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-400">{n.message}</p>
                  </div>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-amber-500 mt-2" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
