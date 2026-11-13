import React, { useState, useEffect } from 'react';
import {
  googleSignIn,
  logoutGoogle,
  getAccessToken,
} from '../../services/firebaseAuth';
import {
  listDriveFiles,
  deleteDriveFile,
  createProjectIntakeForm,
  DriveFileInfo,
  CreatedFormInfo,
} from '../../services/workspace';
import { Project } from '../../types/marcenaria';
import {
  Cloud,
  ExternalLink,
  Trash2,
  RefreshCw,
  Plus,
  Copy,
  CheckCircle,
  FileSpreadsheet,
  Calendar,
  FileText,
  X,
} from 'lucide-react';

interface GoogleWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail: string | null;
  onAuthChange: (email: string | null) => void;
  currentProject: Project;
}

export const GoogleWorkspaceModal: React.FC<GoogleWorkspaceModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail,
  onAuthChange,
  currentProject,
}) => {
  const [driveFiles, setDriveFiles] = useState<DriveFileInfo[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [createdForm, setCreatedForm] = useState<CreatedFormInfo | null>(null);
  const [isCreatingForm, setIsCreatingForm] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const loadFiles = async () => {
    const token = await getAccessToken();
    if (!token) return;

    setIsLoadingFiles(true);
    try {
      const files = await listDriveFiles();
      setDriveFiles(files);
    } catch (err: any) {
      console.warn('Erro ao listar arquivos do Google Drive:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (isOpen && currentUserEmail) {
      loadFiles();
    }
  }, [isOpen, currentUserEmail]);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res?.user) {
        onAuthChange(res.user.email);
        loadFiles();
      }
    } catch (err: any) {
      alert(`Falha no login Google: ${err.message}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    await logoutGoogle();
    onAuthChange(null);
    setDriveFiles([]);
  };

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    try {
      const deleted = await deleteDriveFile(fileId, fileName);
      if (deleted) {
        setDriveFiles(driveFiles.filter((f) => f.id !== fileId));
      }
    } catch (err: any) {
      alert(`Erro ao excluir: ${err.message}`);
    }
  };

  const handleCreateBriefingForm = async () => {
    setIsCreatingForm(true);
    setStatusMsg('Criando formulário de briefing no Google Forms...');
    try {
      const formInfo = await createProjectIntakeForm(
        currentProject.clientName,
        currentProject.title
      );
      setCreatedForm(formInfo);
      setStatusMsg('Formulário criado com sucesso no seu Google Forms!');
    } catch (err: any) {
      setStatusMsg(`Erro ao criar formulário: ${err.message}`);
    } finally {
      setIsCreatingForm(false);
    }
  };

  const handleCopyFormLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl text-slate-200 space-y-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-600/20 text-amber-500 border border-amber-500/30">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Integração Google Workspace</h3>
              <p className="text-xs text-slate-400">
                Google Drive, Google Calendar, Google Docs & Google Forms
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Account Status Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-400">Status da Conexão</span>
            <div className="font-semibold text-xs text-slate-200">
              {currentUserEmail ? (
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Conectado como {currentUserEmail}
                </span>
              ) : (
                <span className="text-slate-400">Nenhuma conta Google conectada</span>
              )}
            </div>
          </div>

          {currentUserEmail ? (
            <button
              onClick={handleSignOut}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-1.5 rounded-xl border border-slate-700 transition"
            >
              Desconectar
            </button>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={isLoggingIn}
              className="flex items-center gap-2.5 bg-white text-slate-800 hover:bg-slate-100 text-xs font-semibold px-4 py-2 rounded-xl shadow-md transition active:scale-95"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                />
              </svg>
              <span>{isLoggingIn ? 'Conectando...' : 'Entrar com Google'}</span>
            </button>
          )}
        </div>

        {/* Feature 1: Google Forms Project Briefing Generator */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-purple-400" /> Google Forms: Briefing do Cliente
            </h4>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <p className="text-xs text-slate-400">
              Crie automaticamente um questionário personalizado no seu Google Forms para enviar pelo
              WhatsApp do cliente ({currentProject.clientName}) para coletar preferências de estilo e
              eletrodomésticos.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                disabled={isCreatingForm || !currentUserEmail}
                onClick={handleCreateBriefingForm}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 transition"
              >
                {isCreatingForm ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Gerando no Google Forms...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Gerar Formulário de Briefing</span>
                  </>
                )}
              </button>

              {createdForm && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyFormLink(createdForm.responderUri)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-2 rounded-xl flex items-center gap-1 border border-slate-700"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link para Cliente'}</span>
                  </button>

                  <a
                    href={createdForm.editUri}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-2 rounded-xl flex items-center gap-1 border border-slate-700"
                  >
                    Editar no Forms <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {statusMsg && <div className="text-[11px] text-amber-400">{statusMsg}</div>}
          </div>
        </div>

        {/* Feature 2: Google Drive Project Files Explorer */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Cloud className="w-4 h-4 text-emerald-400" /> Arquivos no Google Drive ({driveFiles.length})
            </h4>

            {currentUserEmail && (
              <button
                onClick={loadFiles}
                disabled={isLoadingFiles}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingFiles ? 'animate-spin' : ''}`} /> Atualizar
              </button>
            )}
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 min-h-32">
            {!currentUserEmail ? (
              <div className="text-center py-6 text-xs text-slate-500">
                Conecte sua conta Google acima para ver seus arquivos no Drive.
              </div>
            ) : driveFiles.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                Nenhum arquivo enviado para o Google Drive ainda. Use os botões "Salvar no Drive" no 3D
                Studio ou na aba Orçamentos para enviar arquivos.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {driveFiles.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-xs"
                  >
                    <div className="truncate mr-3">
                      <div className="font-semibold text-slate-200 truncate">{f.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">ID: {f.id}</div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {f.webViewLink && (
                        <a
                          href={f.webViewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-amber-400 p-1"
                          title="Abrir no Google Drive"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => handleDeleteFile(f.id, f.name)}
                        className="text-slate-500 hover:text-red-400 p-1"
                        title="Excluir arquivo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
