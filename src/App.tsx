import React, { useState, useEffect } from 'react';
import {
  Project,
  Client,
  Professional,
  FinancialEntry,
  InAppMessage,
  AppNotification,
  UserSecurityProfile,
} from './types/marcenaria';
import {
  initialProjects,
  initialClients,
  initialProfessionals,
  initialFinancialEntries,
  initialMessages,
  initialNotifications,
  initialSecurityProfile,
} from './utils/mockSeed';
import { initAuth, getAccessToken, googleSignIn } from './services/firebaseAuth';
import { ThreeDStudio } from './components/ThreeDStudio/ThreeDStudio';
import { ARView } from './components/ARView/ARView';
import { CutOptimizer } from './components/CutOptimizer/CutOptimizer';
import { AiStudio } from './components/AiStudio/AiStudio';
import { Budgeting } from './components/Budgeting/Budgeting';
import { CRM } from './components/CRM/CRM';
import { CalendarView } from './components/CalendarView/CalendarView';
import { Finance } from './components/Finance/Finance';
import { Messaging } from './components/Messaging/Messaging';
import { PaymentGateway } from './components/PaymentGateway/PaymentGateway';
import { Security } from './components/Security/Security';
import { GoogleWorkspaceModal } from './components/GoogleWorkspace/GoogleWorkspaceModal';

import {
  Box,
  Scissors,
  Sparkles,
  FileText,
  Users,
  Calendar,
  DollarSign,
  CreditCard,
  Shield,
  MessageSquare,
  Cloud,
  Bell,
  Camera,
  Plus,
  CheckCircle,
  Menu,
  X,
} from 'lucide-react';

export default function App() {
  // Global State with LocalStorage fallbacks
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('marcenariapro_projects');
    return saved ? JSON.parse(saved) : initialProjects;
  });

  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('marcenariapro_clients');
    return saved ? JSON.parse(saved) : initialClients;
  });

  const [professionals, setProfessionals] = useState<Professional[]>(() => {
    const saved = localStorage.getItem('marcenariapro_pros');
    return saved ? JSON.parse(saved) : initialProfessionals;
  });

  const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>(() => {
    const saved = localStorage.getItem('marcenariapro_finance');
    return saved ? JSON.parse(saved) : initialFinancialEntries;
  });

  const [messages, setMessages] = useState<InAppMessage[]>(() => {
    const saved = localStorage.getItem('marcenariapro_messages');
    return saved ? JSON.parse(saved) : initialMessages;
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('marcenariapro_notifs');
    return saved ? JSON.parse(saved) : initialNotifications;
  });

  const [securityProfile, setSecurityProfile] = useState<UserSecurityProfile>(() => {
    const saved = localStorage.getItem('marcenariapro_sec');
    return saved ? JSON.parse(saved) : initialSecurityProfile;
  });

  // Selected Active Project
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  // Navigation tab
  const [activeTab, setActiveTab] = useState<
    '3d' | 'cut' | 'ai' | 'budget' | 'crm' | 'calendar' | 'finance' | 'payment' | 'messaging' | 'security'
  >('3d');

  // Modals & Overlays
  const [isAROpen, setIsAROpen] = useState<boolean>(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState<boolean>(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [googleTokenAvailable, setGoogleTokenAvailable] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [newProjectModalOpen, setNewProjectModalOpen] = useState<boolean>(false);

  // New project state
  const [newProjectTitle, setNewProjectTitle] = useState<string>('');
  const [newProjectClientName, setNewProjectClientName] = useState<string>('');
  const [newProjectEnvironment, setNewProjectEnvironment] = useState<string>('Cozinha Gourmet');

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('marcenariapro_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('marcenariapro_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('marcenariapro_pros', JSON.stringify(professionals));
  }, [professionals]);

  useEffect(() => {
    localStorage.setItem('marcenariapro_finance', JSON.stringify(financialEntries));
  }, [financialEntries]);

  useEffect(() => {
    localStorage.setItem('marcenariapro_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('marcenariapro_notifs', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('marcenariapro_sec', JSON.stringify(securityProfile));
  }, [securityProfile]);

  // Initialize Firebase Auth listener as instructed by workspace skill
  useEffect(() => {
    initAuth(
      (user) => {
        setCurrentUserEmail(user.email);
        setGoogleTokenAvailable(true);
      },
      () => {
        setCurrentUserEmail(null);
        setGoogleTokenAvailable(false);
      }
    );
  }, []);

  // Update current project helper
  const handleUpdateCurrentProject = (updated: Project) => {
    setProjects(projects.map((p) => (p.id === updated.id ? updated : p)));
  };

  // Push notification trigger helper
  const triggerNotification = (title: string, message: string, type: AppNotification['type']) => {
    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title,
      message,
      type,
      timestamp: 'Agora mesmo',
      read: false,
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  // Add financial entry and trigger push alert
  const handleAddFinancialEntry = (entry: FinancialEntry) => {
    setFinancialEntries((prev) => [entry, ...prev]);
    triggerNotification(
      `Movimentação Financeira (${entry.type === 'income' ? 'Receita' : 'Despesa'})`,
      `${entry.description} - R$ ${entry.amount.toFixed(2)} confirmado via ${entry.paymentMethod}`,
      'financial'
    );
  };

  // Add message & auto notify
  const handleSendMessage = (msg: InAppMessage) => {
    setMessages((prev) => [...prev, msg]);
    if (msg.isStatusAlert) {
      triggerNotification('Atualização de Status de Serviço', msg.content, 'project_status');
    }
  };

  // Apply AI Room Analysis directly
  const handleApplyAiAnalysis = (data: {
    modules: any[];
    cutPieces: any[];
    materials: any[];
    roomDimensions: { widthMm: number; lengthMm: number; heightMm: number };
  }) => {
    if (!currentProject) return;

    const updated: Project = {
      ...currentProject,
      modules: data.modules.length > 0 ? data.modules : currentProject.modules,
      cutPieces: data.cutPieces.length > 0 ? data.cutPieces : currentProject.cutPieces,
      materials: data.materials.length > 0 ? data.materials : currentProject.materials,
      room: {
        ...currentProject.room,
        widthMm: data.roomDimensions.widthMm || currentProject.room.widthMm,
        lengthMm: data.roomDimensions.lengthMm || currentProject.room.lengthMm,
        heightMm: data.roomDimensions.heightMm || currentProject.room.heightMm,
      },
      status: 'Projeto 3D',
    };

    handleUpdateCurrentProject(updated);
    triggerNotification(
      'Projeto 3D Atualizado pela IA',
      `O modelo Gemini 4 Argon gerou nova planta 3D e ${data.cutPieces.length} peças para corte.`,
      'project_status'
    );
    setActiveTab('3d');
  };

  // Create New Project
  const handleCreateNewProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;

    const newProj: Project = {
      id: `proj-${Date.now()}`,
      title: newProjectTitle.trim(),
      clientId: clients[0]?.id || 'cli-1',
      clientName: newProjectClientName.trim() || clients[0]?.name || 'Novo Cliente',
      environment: newProjectEnvironment,
      status: 'Orçamento',
      budgetTotal: 12000,
      materialsCost: 3500,
      laborCost: 2800,
      hardwareCost: 1400,
      profitMarginPercent: 30,
      createdAt: new Date().toISOString(),
      deliveryDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      room: {
        widthMm: 3200,
        lengthMm: 4000,
        heightMm: 2600,
        wallColor: '#f1f5f9',
        floorColor: '#e2e8f0',
        hasWindow: true,
        windowPosition: { wall: 'north', widthMm: 1200, heightMm: 1100, elevationMm: 1000 },
        hasDoor: true,
        doorPosition: { wall: 'south', widthMm: 850, heightMm: 2100 },
      },
      modules: [
        {
          id: `mod-${Date.now()}-1`,
          name: 'Balcão Inferior 2 Portas',
          type: 'base_cabinet',
          position: { x: 0, y: 0, z: -1.2 },
          dimensionsMm: { width: 1200, height: 860, depth: 600 },
          rotationY: 0,
          finish: 'MDF Freijó Natural 18mm',
          doorColor: '#b45309',
          carcassColor: '#f8fafc',
          doorsCount: 2,
          drawersCount: 2,
          shelvesCount: 1,
          doorOpenAngle: 0,
          drawerSlideOut: 0,
        },
      ],
      cutPieces: [
        {
          id: `p-${Date.now()}-1`,
          name: 'Lateral Balcão',
          widthMm: 580,
          lengthMm: 860,
          thicknessMm: 18,
          quantity: 2,
          material: 'MDF Freijó 18mm',
          grain: 'vertical',
          edgeBanding: { c1: true, c2: false, l1: true, l2: false },
        },
      ],
      materials: [
        {
          id: `m-${Date.now()}-1`,
          name: 'Chapa MDF Freijó 18mm (2750x1830)',
          category: 'MDF',
          quantity: 2,
          unit: 'chapa',
          unitPrice: 380,
          totalPrice: 760,
        },
      ],
    };

    setProjects([newProj, ...projects]);
    setSelectedProjectId(newProj.id);
    setNewProjectModalOpen(false);
    setNewProjectTitle('');
    setNewProjectClientName('');
    triggerNotification('Novo Projeto Criado', `Projeto "${newProj.title}" iniciado no sistema.`, 'project_status');
  };

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Application Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-600/30">
              <Box className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm lg:text-base tracking-tight text-white">
                  Marcenaria<span className="text-amber-500">Pro</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                  3D & ERP
                </span>
              </div>
              <span className="text-[10px] text-slate-400 hidden sm:block">
                Cortes Otimizados, Realidade Aumentada & Google Workspace
              </span>
            </div>
          </div>

          {/* Project Selector Switcher */}
          <div className="hidden md:flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-500">Obra Atual:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-transparent text-xs text-amber-400 font-semibold focus:outline-none cursor-pointer max-w-xs truncate"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                  {p.title} ({p.clientName})
                </option>
              ))}
            </select>
            <button
              onClick={() => setNewProjectModalOpen(true)}
              className="p-1 text-slate-400 hover:text-amber-400 rounded-lg"
              title="Criar novo projeto de marcenaria"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right Action Icons: Google Workspace, Notifications, 2FA Status */}
          <div className="flex items-center gap-2 lg:gap-3">
            {/* Google Workspace Button */}
            <button
              onClick={() => setIsWorkspaceModalOpen(true)}
              className={`text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 border transition ${
                currentUserEmail
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
              title="Google Drive, Calendar, Docs e Forms"
            >
              <Cloud className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">
                {currentUserEmail ? 'Workspace Conectado' : 'Google Workspace'}
              </span>
            </button>

            {/* Notifications Button */}
            <button
              onClick={() => setActiveTab('messaging')}
              className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Notificações Push e Mensageria"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadNotifsCount}
                </span>
              )}
            </button>

            {/* 2FA Security Badge */}
            <button
              onClick={() => setActiveTab('security')}
              className={`p-2 rounded-xl border transition ${
                securityProfile.twoFactorEnabled
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title={securityProfile.twoFactorEnabled ? '2FA Ativado' : '2FA Desativado'}
            >
              <Shield className="w-4 h-4" />
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="max-w-7xl mx-auto mt-2.5 pt-2 border-t border-slate-800/60 overflow-x-auto no-scrollbar flex items-center gap-1.5">
          {[
            { id: '3d', label: 'Planta 3D & AR', icon: Box },
            { id: 'cut', label: 'Plano de Corte', icon: Scissors },
            { id: 'ai', label: 'IA & Visão', icon: Sparkles },
            { id: 'budget', label: 'Orçamentos & PDF', icon: FileText },
            { id: 'crm', label: 'Clientes & Equipe', icon: Users },
            { id: 'calendar', label: 'Calendário & Agenda', icon: Calendar },
            { id: 'finance', label: 'Fluxo de Caixa', icon: DollarSign },
            { id: 'payment', label: 'Checkout & PIX', icon: CreditCard },
            { id: 'messaging', label: 'Mensageria & Push', icon: MessageSquare },
            { id: 'security', label: 'Segurança & 2FA', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setMobileMenuOpen(false);
                }}
                className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
        {activeTab === '3d' && currentProject && (
          <ThreeDStudio
            project={currentProject}
            onUpdateProject={handleUpdateCurrentProject}
            onOpenAR={() => setIsAROpen(true)}
            googleTokenAvailable={googleTokenAvailable}
          />
        )}

        {activeTab === 'cut' && currentProject && (
          <CutOptimizer
            pieces={currentProject.cutPieces}
            onUpdatePieces={(updated) => handleUpdateCurrentProject({ ...currentProject, cutPieces: updated })}
            projectName={currentProject.title}
          />
        )}

        {activeTab === 'ai' && currentProject && (
          <AiStudio
            project={currentProject}
            onApplyAnalysisToProject={handleApplyAiAnalysis}
          />
        )}

        {activeTab === 'budget' && currentProject && (
          <Budgeting
            project={currentProject}
            client={clients.find((c) => c.id === currentProject.clientId)}
            onUpdateProject={handleUpdateCurrentProject}
            googleTokenAvailable={googleTokenAvailable}
          />
        )}

        {activeTab === 'crm' && (
          <CRM
            clients={clients}
            professionals={professionals}
            projects={projects}
            onUpdateClients={setClients}
            onUpdateProfessionals={setProfessionals}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            projects={projects}
            clients={clients}
            professionals={professionals}
            googleTokenAvailable={googleTokenAvailable}
          />
        )}

        {activeTab === 'finance' && (
          <Finance
            entries={financialEntries}
            projects={projects}
            onAddEntry={handleAddFinancialEntry}
          />
        )}

        {activeTab === 'payment' && currentProject && (
          <PaymentGateway
            project={currentProject}
            onPaymentSuccess={handleAddFinancialEntry}
          />
        )}

        {activeTab === 'messaging' && (
          <Messaging
            messages={messages}
            notifications={notifications}
            projects={projects}
            onSendMessage={handleSendMessage}
            onClearNotifications={() => setNotifications([])}
            onMarkNotificationRead={(id) =>
              setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)))
            }
          />
        )}

        {activeTab === 'security' && (
          <Security
            securityProfile={securityProfile}
            onUpdateSecurityProfile={setSecurityProfile}
            fullDatabaseState={{ projects, clients, professionals, financialEntries, messages }}
            onRestoreDatabaseState={(data) => {
              if (data.projects) setProjects(data.projects);
              if (data.clients) setClients(data.clients);
              if (data.professionals) setProfessionals(data.professionals);
              if (data.financialEntries) setFinancialEntries(data.financialEntries);
            }}
          />
        )}
      </main>

      {/* Augmented Reality Fullscreen Overlay */}
      {isAROpen && currentProject && (
        <ARView project={currentProject} onClose={() => setIsAROpen(false)} />
      )}

      {/* Google Workspace Integration Modal */}
      {currentProject && (
        <GoogleWorkspaceModal
          isOpen={isWorkspaceModalOpen}
          onClose={() => setIsWorkspaceModalOpen(false)}
          currentUserEmail={currentUserEmail}
          onAuthChange={(email) => {
            setCurrentUserEmail(email);
            setGoogleTokenAvailable(!!email);
          }}
          currentProject={currentProject}
        />
      )}

      {/* New Project Modal */}
      {newProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl text-slate-200">
            <h3 className="font-semibold text-base mb-4 text-slate-100 flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-500" /> Iniciar Novo Projeto de Marcenaria
            </h3>

            <form onSubmit={handleCreateNewProject} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Título do Projeto</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Cozinha Gourmet Freijó com Ilha"
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Nome do Cliente</label>
                <input
                  type="text"
                  placeholder="Ex: Mariana Silva"
                  value={newProjectClientName}
                  onChange={(e) => setNewProjectClientName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Ambiente</label>
                <select
                  value={newProjectEnvironment}
                  onChange={(e) => setNewProjectEnvironment(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="Cozinha Gourmet">Cozinha Gourmet</option>
                  <option value="Dormitório Casal">Dormitório Casal</option>
                  <option value="Home Theater / Sala">Home Theater / Sala</option>
                  <option value="Home Office">Home Office</option>
                  <option value="Gabinete de Banheiro">Gabinete de Banheiro</option>
                  <option value="Área de Serviço">Área de Serviço</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewProjectModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold"
                >
                  Criar Projeto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
