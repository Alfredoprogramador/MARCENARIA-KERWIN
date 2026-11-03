import React, { useState, useEffect } from 'react';
import { Project, Client, Professional } from '../../types/marcenaria';
import {
  createCalendarEvent,
  listUpcomingCalendarEvents,
  deleteCalendarEvent,
  GoogleCalendarEvent,
} from '../../services/workspace';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Plus,
  RefreshCw,
  CheckCircle,
  ExternalLink,
  Trash2,
  CalendarDays,
  AlertCircle,
} from 'lucide-react';

interface CalendarViewProps {
  projects: Project[];
  clients: Client[];
  professionals: Professional[];
  googleTokenAvailable?: boolean;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  projects,
  clients,
  professionals,
  googleTokenAvailable,
}) => {
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(false);
  const [showAddEventModal, setShowAddEventModal] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // New Event Form
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [eventType, setEventType] = useState<'Medição no Local' | 'Início do Corte' | 'Montagem e Instalação'>(
    'Medição no Local'
  );
  const [eventDate, setEventDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [eventTime, setEventTime] = useState<string>('14:00');
  const [eventDurationHours, setEventDurationHours] = useState<number>(2);

  // Load Google Calendar Events
  const loadGoogleCalendar = async () => {
    if (!googleTokenAvailable) return;
    setIsLoadingEvents(true);
    try {
      const items = await listUpcomingCalendarEvents();
      setGoogleEvents(items);
    } catch (err: any) {
      console.warn('Erro ao carregar eventos do Google Calendar:', err);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (googleTokenAvailable) {
      loadGoogleCalendar();
    }
  }, [googleTokenAvailable]);

  // Create Google Calendar event
  const handleScheduleGoogleEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleTokenAvailable) {
      alert('Conecte sua Conta Google no topo da página para agendar no Google Calendar.');
      return;
    }

    const project = projects.find((p) => p.id === selectedProjectId) || projects[0];
    const client = clients.find((c) => c.id === project?.clientId);

    const startDateTime = `${eventDate}T${eventTime}:00`;
    const endHour = (parseInt(eventTime.split(':')[0]) + eventDurationHours).toString().padStart(2, '0');
    const endDateTime = `${eventDate}T${endHour}:${eventTime.split(':')[1]}:00`;

    setStatusMessage('Agendando no Google Calendar...');
    try {
      const created = await createCalendarEvent({
        summary: `MarcenariaPro: ${eventType} - ${project.title} (${project.clientName})`,
        description: `Visita técnica de marcenaria referente ao projeto "${project.title}".\nCliente: ${project.clientName} (${client?.phone || ''})\nAmbiente: ${project.environment}\nEndereço: ${client?.address || ''}`,
        location: client?.address || 'São Paulo - SP',
        startDateTime: new Date(startDateTime).toISOString(),
        endDateTime: new Date(endDateTime).toISOString(),
      });

      setStatusMessage('Agendamento sincronizado com sucesso no Google Calendar!');
      setShowAddEventModal(false);
      loadGoogleCalendar();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage(`Erro ao agendar: ${err.message}`);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const handleDeleteCalendarEvent = async (eventId: string, title: string) => {
    try {
      const deleted = await deleteCalendarEvent(eventId, title);
      if (deleted) {
        setGoogleEvents(googleEvents.filter((ev) => ev.id !== eventId));
      }
    } catch (err: any) {
      alert(`Erro ao excluir evento: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert banner */}
      {statusMessage && (
        <div className="bg-amber-950/80 border border-amber-500/60 p-3.5 rounded-2xl text-xs text-amber-200 flex items-center gap-2 shadow-lg">
          <CheckCircle className="w-4 h-4 text-amber-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div>
          <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-amber-500" /> Calendário de Medições, Cortes & Montagens
          </h3>
          <span className="text-xs text-slate-400">
            Sincronização em tempo real com sua agenda profissional do Google Calendar
          </span>
        </div>

        <div className="flex items-center gap-2">
          {googleTokenAvailable && (
            <button
              onClick={loadGoogleCalendar}
              disabled={isLoadingEvents}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 border border-slate-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingEvents ? 'animate-spin' : ''}`} />
              <span>Atualizar Agenda</span>
            </button>
          )}

          <button
            onClick={() => setShowAddEventModal(true)}
            className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Agendar Visita / Montagem</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Project Timelines */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-3">
              Cronograma das Obras em Andamento ({projects.length})
            </h4>

            <div className="space-y-4">
              {projects.map((p) => {
                const client = clients.find((c) => c.id === p.clientId);
                const pro = professionals.find((item) => item.id === p.assignedProfessionalId);

                return (
                  <div
                    key={p.id}
                    className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="font-semibold text-slate-100 text-sm">{p.title}</h5>
                        <span className="text-xs text-amber-500">{p.clientName}</span>
                      </div>
                      <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-semibold">
                        {p.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-400">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Medição</span>
                        <span className="text-slate-300 font-medium">
                          {p.measurementDate ? new Date(p.measurementDate).toLocaleDateString('pt-BR') : 'Agendar'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Previsão Entrega</span>
                        <span className="text-slate-300 font-medium font-mono">
                          {new Date(p.deliveryDate).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Responsável</span>
                        <span className="text-slate-300 font-medium">{pro?.name || 'A definir'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Google Calendar Events Feed */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-blue-400" /> Próximos no Google Calendar
              </h4>
              <span className="text-xs text-slate-500">{googleEvents.length} eventos</span>
            </div>

            {!googleTokenAvailable ? (
              <div className="bg-slate-950 p-6 rounded-xl text-center space-y-2 border border-slate-800">
                <CalendarIcon className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">Conta Google não conectada</p>
                <p className="text-[11px] text-slate-500">
                  Conecte sua conta para sincronizar visitas técnicas diretamente na agenda do seu smartphone.
                </p>
              </div>
            ) : googleEvents.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                Nenhum compromisso agendado para os próximos dias.
              </div>
            ) : (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {googleEvents.map((ev) => {
                  const startDate = ev.start?.dateTime ? new Date(ev.start.dateTime) : null;
                  return (
                    <div
                      key={ev.id}
                      className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between">
                        <div className="font-semibold text-slate-200">{ev.summary}</div>
                        <button
                          onClick={() => handleDeleteCalendarEvent(ev.id, ev.summary)}
                          className="text-slate-500 hover:text-red-400 p-1"
                          title="Cancelar agendamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {startDate && (
                        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>
                            {startDate.toLocaleDateString('pt-BR')} às{' '}
                            {startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}

                      {ev.location && (
                        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          <span className="truncate">{ev.location}</span>
                        </div>
                      )}

                      {ev.htmlLink && (
                        <a
                          href={ev.htmlLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-blue-400 hover:underline flex items-center gap-1 pt-1"
                        >
                          Ver no Google Calendar <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {showAddEventModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-200">
            <h3 className="font-semibold text-base mb-4 text-slate-100 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-amber-500" /> Agendar no Google Calendar
            </h3>

            <form onSubmit={handleScheduleGoogleEvent} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Projeto Relacionado</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} - {p.clientName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Tipo de Compromisso</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="Medição no Local">Medição Técnica no Local</option>
                  <option value="Início do Corte">Início do Corte na Oficina</option>
                  <option value="Montagem e Instalação">Montagem & Instalação na Obra</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Horário de Início</label>
                  <input
                    type="time"
                    required
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Duração Estimada</label>
                <select
                  value={eventDurationHours}
                  onChange={(e) => setEventDurationHours(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value={1}>1 hora (Medição rápida)</option>
                  <option value={2}>2 horas (Conferência de prumo)</option>
                  <option value={4}>4 horas (Meio período)</option>
                  <option value={8}>8 horas (Dia inteiro de montagem)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddEventModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold"
                >
                  Confirmar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
