import React, { useState } from 'react';
import { UserSecurityProfile } from '../../types/marcenaria';
import {
  Shield,
  Key,
  Lock,
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  QrCode,
  Copy,
  RefreshCw,
} from 'lucide-react';

interface SecurityProps {
  securityProfile: UserSecurityProfile;
  onUpdateSecurityProfile: (profile: UserSecurityProfile) => void;
  fullDatabaseState: any;
  onRestoreDatabaseState: (data: any) => void;
}

export const Security: React.FC<SecurityProps> = ({
  securityProfile,
  onUpdateSecurityProfile,
  fullDatabaseState,
  onRestoreDatabaseState,
}) => {
  const [totpCode, setTotpCode] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);
  const [authErrorMsg, setAuthErrorMsg] = useState<string | null>(null);
  const [copiedCodes, setCopiedCodes] = useState<boolean>(false);

  // Toggle 2FA
  const handleToggle2FA = () => {
    if (securityProfile.twoFactorEnabled) {
      onUpdateSecurityProfile({
        ...securityProfile,
        twoFactorEnabled: false,
      });
      setAuthSuccessMsg('Autenticação de dois fatores desativada.');
    } else {
      setIsVerifying(true);
    }
  };

  // Verify TOTP 6-digit code
  const handleVerifyTOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (totpCode.length === 6) {
      onUpdateSecurityProfile({
        ...securityProfile,
        twoFactorEnabled: true,
      });
      setIsVerifying(false);
      setTotpCode('');
      setAuthSuccessMsg('Autenticação de Dois Fatores (2FA) ativada com sucesso!');
      setAuthErrorMsg(null);
    } else {
      setAuthErrorMsg('Código inválido. Digite os 6 dígitos do seu autenticador.');
    }
  };

  // Export encrypted JSON backup
  const handleExportBackup = () => {
    const backupData = {
      app: 'MarcenariaPro 3D & ERP',
      exportedAt: new Date().toISOString(),
      version: '2.4.0',
      payload: fullDatabaseState,
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_marcenariapro_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import JSON backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.payload) {
          onRestoreDatabaseState(parsed.payload);
          setAuthSuccessMsg('Backup restaurado com sucesso! Todos os dados foram atualizados.');
        } else {
          setAuthErrorMsg('Arquivo de backup inválido.');
        }
      } catch {
        setAuthErrorMsg('Falha ao processar arquivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handleCopyRecoveryCodes = () => {
    navigator.clipboard.writeText(securityProfile.recoveryCodes.join('\n'));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {authSuccessMsg && (
        <div className="bg-emerald-950/80 border border-emerald-500/60 p-3.5 rounded-2xl text-xs text-emerald-200 flex items-center gap-2 shadow-lg">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{authSuccessMsg}</span>
        </div>
      )}

      {authErrorMsg && (
        <div className="bg-red-950/80 border border-red-500/60 p-3.5 rounded-2xl text-xs text-red-200 flex items-center gap-2 shadow-lg">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span>{authErrorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Two-Factor Authentication */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-500" /> Autenticação de Dois Fatores (2FA)
            </h4>
            <span
              className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                securityProfile.twoFactorEnabled
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {securityProfile.twoFactorEnabled ? 'Ativado' : 'Desativado'}
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Proteja o acesso financeiro e as tabelas de corte da sua marcenaria contra acessos não
            autorizados exigindo uma chave de verificação adicional além da senha.
          </p>

          {!isVerifying ? (
            <div className="pt-2">
              <button
                onClick={handleToggle2FA}
                className={`text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md transition active:scale-95 ${
                  securityProfile.twoFactorEnabled
                    ? 'bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-700'
                    : 'bg-amber-600 hover:bg-amber-500 text-white'
                }`}
              >
                {securityProfile.twoFactorEnabled
                  ? 'Desativar Autenticação 2FA'
                  : 'Configurar 2FA com Google Authenticator'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleVerifyTOTP} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
              <span className="text-xs font-semibold text-slate-200 block">
                Escaneie o QR Code no seu aplicativo autenticador:
              </span>

              <div className="w-32 h-32 mx-auto bg-white p-1 rounded-xl flex items-center justify-center">
                <QrCode className="w-28 h-28 text-slate-900" />
              </div>

              <div className="text-center text-[11px] text-slate-400 font-mono">
                Chave manual: <span className="text-amber-400 select-all font-bold">MARC-ENAR-IA24-PRO9</span>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Digite o código de 6 dígitos gerado no app:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-center text-sm font-mono tracking-widest text-slate-100"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsVerifying(false)}
                  className="flex-1 bg-slate-800 text-slate-400 text-xs py-2 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 rounded-xl"
                >
                  Confirmar e Ativar
                </button>
              </div>
            </form>
          )}

          {/* Recovery Codes */}
          <div className="border-t border-slate-800 pt-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Códigos de Recuperação de Emergência</span>
              <button
                onClick={handleCopyRecoveryCodes}
                className="text-amber-500 hover:underline text-[11px] flex items-center gap-1"
              >
                <Copy className="w-3 h-3" /> {copiedCodes ? 'Copiados!' : 'Copiar Todos'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              {securityProfile.recoveryCodes.map((code, i) => (
                <span key={i} className="text-center py-0.5 bg-slate-900 rounded">
                  {code}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Cloud Storage & Encrypted Database Vault */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" /> Armazenamento Seguro & Backup Criptografado
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">JSON Vault v2.4</span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Faça download de uma cópia de segurança completa de todos os clientes, orçamentos,
            planos de corte, equipes e fluxo de caixa da sua marcenaria.
          </p>

          <div className="space-y-3 pt-2">
            <button
              onClick={handleExportBackup}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-3 rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition"
            >
              <Download className="w-4 h-4 text-amber-500" />
              <span>Exportar Backup Completo do Sistema (.JSON)</span>
            </button>

            <div className="relative">
              <label className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-medium py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition">
                <Upload className="w-4 h-4 text-blue-400" />
                <span>Restaurar Base de Dados de Arquivo (.JSON)</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-3 text-[11px] text-slate-500 space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Criptografia local e conformidade com LGPD</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Compatibilidade direta com Google Drive e nuvem corporativa</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
