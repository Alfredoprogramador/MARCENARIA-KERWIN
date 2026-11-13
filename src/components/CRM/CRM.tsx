import React, { useState } from 'react';
import { Client, Professional, Project } from '../../types/marcenaria';
import {
  Users,
  UserCheck,
  Plus,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  Trash2,
  Calendar,
  Briefcase,
  Star,
} from 'lucide-react';

interface CRMProps {
  clients: Client[];
  professionals: Professional[];
  projects: Project[];
  onUpdateClients: (clients: Client[]) => void;
  onUpdateProfessionals: (pros: Professional[]) => void;
  onSelectClient?: (client: Client) => void;
}

export const CRM: React.FC<CRMProps> = ({
  clients,
  professionals,
  projects,
  onUpdateClients,
  onUpdateProfessionals,
}) => {
  const [activeTab, setActiveTab] = useState<'clients' | 'team'>('clients');
  const [showAddClientModal, setShowAddClientModal] = useState<boolean>(false);
  const [showAddProModal, setShowAddProModal] = useState<boolean>(false);

  // Client form
  const [newClient, setNewClient] = useState<Partial<Client>>({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: 'São Paulo',
    state: 'SP',
    notes: '',
  });

  // Professional form
  const [newPro, setNewPro] = useState<Partial<Professional>>({
    name: '',
    role: 'Marceneiro',
    phone: '',
    email: '',
    hourlyRate: 60,
    commissionPercentage: 5,
    status: 'Disponível',
  });

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name) return;

    const created: Client = {
      id: `cli-${Date.now()}`,
      name: newClient.name,
      phone: newClient.phone || '',
      email: newClient.email || '',
      address: newClient.address || '',
      city: newClient.city || 'São Paulo',
      state: newClient.state || 'SP',
      notes: newClient.notes || '',
      createdAt: new Date().toISOString(),
      projectsCount: 0,
      totalSpent: 0,
    };

    onUpdateClients([...clients, created]);
    setShowAddClientModal(false);
    setNewClient({ name: '', phone: '', email: '', address: '', notes: '' });
  };

  const handleAddProfessional = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPro.name) return;

    const created: Professional = {
      id: `pro-${Date.now()}`,
      name: newPro.name,
      role: newPro.role || 'Marceneiro',
      phone: newPro.phone || '',
      email: newPro.email || '',
      hourlyRate: Number(newPro.hourlyRate) || 60,
      commissionPercentage: Number(newPro.commissionPercentage) || 5,
      activeProjects: 0,
      status: newPro.status || 'Disponível',
      rating: 5.0,
      hireDate: new Date().toISOString().split('T')[0],
    };

    onUpdateProfessionals([...professionals, created]);
    setShowAddProModal(false);
    setNewPro({ name: '', role: 'Marceneiro', phone: '', email: '', hourlyRate: 60, commissionPercentage: 5 });
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('clients')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'clients'
                ? 'bg-amber-600 text-white shadow-lg'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Clientes ({clients.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'team'
                ? 'bg-amber-600 text-white shadow-lg'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Equipe de Marceneiros ({professionals.length})</span>
          </button>
        </div>

        {activeTab === 'clients' ? (
          <button
            onClick={() => setShowAddClientModal(true)}
            className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5 font-medium shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cliente</span>
          </button>
        ) : (
          <button
            onClick={() => setShowAddProModal(true)}
            className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5 font-medium shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Profissional</span>
          </button>
        )}
      </div>

      {/* Tab 1: Clients */}
      {activeTab === 'clients' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => {
            const clientProjects = projects.filter((p) => p.clientId === c.id);
            return (
              <div
                key={c.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3 hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-100 text-sm">{c.name}</h4>
                    <span className="text-[11px] text-amber-500 font-mono">
                      Cliente desde {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <button
                    onClick={() => onUpdateClients(clients.filter((item) => item.id !== c.id))}
                    className="text-slate-500 hover:text-red-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{c.phone}</span>
                    <a
                      href={`https://wa.me/55${c.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800 hover:bg-emerald-900"
                    >
                      WhatsApp
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate">{c.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate">
                      {c.address}, {c.city} - {c.state}
                    </span>
                  </div>
                </div>

                {c.notes && (
                  <div className="bg-slate-950 p-2.5 rounded-xl text-[11px] text-slate-400 italic">
                    "{c.notes}"
                  </div>
                )}

                <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Projetos: {clientProjects.length}</span>
                  <span className="font-bold text-amber-400">
                    R${' '}
                    {clientProjects
                      .reduce((acc, p) => acc + p.budgetTotal, 0)
                      .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Professional Team */}
      {activeTab === 'team' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {professionals.map((pro) => (
            <div
              key={pro.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-slate-100 text-sm">{pro.name}</h4>
                  <span className="text-xs text-amber-400 font-medium">{pro.role}</span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    pro.status === 'Disponível'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-blue-950 text-blue-300 border border-blue-800'
                  }`}
                >
                  {pro.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Valor Hora</span>
                  <span className="font-bold text-slate-200">R$ {pro.hourlyRate.toFixed(2)}/h</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Comissão</span>
                  <span className="font-bold text-amber-400">{pro.commissionPercentage}% por obra</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>{pro.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                  <span>{pro.activeProjects} obras em andamento</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>Avaliação: {pro.rating.toFixed(1)} / 5.0</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Client Modal */}
      {showAddClientModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-200">
            <h3 className="font-semibold text-base mb-4 text-slate-100 flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-500" /> Cadastrar Novo Cliente
            </h3>

            <form onSubmit={handleAddClient} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    required
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">E-mail</label>
                  <input
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Endereço da Obra</label>
                <input
                  type="text"
                  value={newClient.address}
                  onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Notas / Preferências</label>
                <textarea
                  rows={2}
                  value={newClient.notes}
                  onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddClientModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold"
                >
                  Cadastrar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Professional Modal */}
      {showAddProModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-200">
            <h3 className="font-semibold text-base mb-4 text-slate-100 flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-500" /> Cadastrar Marceneiro / Profissional
            </h3>

            <form onSubmit={handleAddProfessional} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={newPro.name}
                  onChange={(e) => setNewPro({ ...newPro, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Função</label>
                  <select
                    value={newPro.role}
                    onChange={(e) => setNewPro({ ...newPro, role: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="Marceneiro Líder">Marceneiro Líder</option>
                    <option value="Marceneiro">Marceneiro</option>
                    <option value="Montador">Montador</option>
                    <option value="Projetista 3D">Projetista 3D</option>
                    <option value="Acabador">Acabador</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Telefone</label>
                  <input
                    type="text"
                    value={newPro.phone}
                    onChange={(e) => setNewPro({ ...newPro, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Valor Hora (R$)</label>
                  <input
                    type="number"
                    value={newPro.hourlyRate}
                    onChange={(e) => setNewPro({ ...newPro, hourlyRate: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Comissão (%)</label>
                  <input
                    type="number"
                    value={newPro.commissionPercentage}
                    onChange={(e) => setNewPro({ ...newPro, commissionPercentage: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold"
                >
                  Salvar Profissional
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
