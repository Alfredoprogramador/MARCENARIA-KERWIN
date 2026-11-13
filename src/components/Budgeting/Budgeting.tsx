import React, { useState } from 'react';
import { Project, Client, MaterialItem } from '../../types/marcenaria';
import { generateProjectQuotePDF } from '../../utils/pdfExport';
import { createGoogleContractDoc, uploadFileToDrive } from '../../services/workspace';
import {
  FileText,
  Download,
  DollarSign,
  CloudUpload,
  CheckCircle,
  FileCheck,
  Plus,
  Trash2,
  ExternalLink,
  Percent,
} from 'lucide-react';

interface BudgetingProps {
  project: Project;
  client?: Client;
  onUpdateProject: (updated: Project) => void;
  googleTokenAvailable?: boolean;
}

export const Budgeting: React.FC<BudgetingProps> = ({
  project,
  client,
  onUpdateProject,
  googleTokenAvailable,
}) => {
  const [marginPercent, setMarginPercent] = useState<number>(project.profitMarginPercent || 30);
  const [freightCost, setFreightCost] = useState<number>(350);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [createdDocUrl, setCreatedDocUrl] = useState<string | null>(null);

  // Recalculate total budget dynamically
  const materialsTotal = project.materials.reduce((acc, m) => acc + m.totalPrice, 0) || project.materialsCost;
  const hardwareTotal = project.hardwareCost || 1200;
  const laborTotal = project.laborCost || 2500;

  const baseCost = materialsTotal + hardwareTotal + laborTotal + freightCost;
  const calculatedTotal = baseCost / (1 - marginPercent / 100);
  const profitValue = calculatedTotal - baseCost;

  // Handle PDF Download
  const handleDownloadPDF = () => {
    const doc = generateProjectQuotePDF(
      {
        ...project,
        budgetTotal: calculatedTotal,
        materialsCost: materialsTotal,
        profitMarginPercent: marginPercent,
      },
      client
    );
    doc.save(`Orcamento_${project.title.replace(/\s+/g, '_')}.pdf`);
  };

  // Handle Direct Upload of PDF to Google Drive
  const handleUploadPDFToDrive = async () => {
    if (!googleTokenAvailable) {
      alert('Conecte sua Conta Google no topo da tela para enviar diretamente ao Google Drive.');
      return;
    }

    setActionStatus('Gerando PDF e enviando para o Google Drive...');
    try {
      const doc = generateProjectQuotePDF(
        {
          ...project,
          budgetTotal: calculatedTotal,
          materialsCost: materialsTotal,
          profitMarginPercent: marginPercent,
        },
        client
      );

      const pdfBlob = doc.output('blob');
      const fileName = `Orcamento_${project.title}_${Date.now()}.pdf`;
      const res = await uploadFileToDrive(fileName, pdfBlob, 'application/pdf');

      setActionStatus(`Orçamento salvo com sucesso no Google Drive! (ID: ${res.id})`);
      setTimeout(() => setActionStatus(null), 5000);
    } catch (err: any) {
      setActionStatus(`Erro ao salvar no Drive: ${err.message}`);
      setTimeout(() => setActionStatus(null), 6000);
    }
  };

  // Handle Google Docs Contract Generation
  const handleGenerateGoogleDocContract = async () => {
    if (!googleTokenAvailable) {
      alert('Conecte sua Conta Google no topo para gerar documentos no Google Docs.');
      return;
    }

    setActionStatus('Criando Minuta Contratual no Google Docs...');
    try {
      const contractText = `
INSTRUMENTO PARTICULAR DE CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MARCENARIA

CONTRATADA: MARCENARIA PRO LTDA, CNPJ 12.345.678/0001-90, com sede em São Paulo/SP.
CONTRATANTE: ${client?.name || project.clientName}, residente em ${client?.address || 'São Paulo/SP'}, Telefone: ${client?.phone || ''}.

CLÁUSULA 1ª - DO OBJETO:
O presente contrato tem como objeto a fabricação, acabamento e montagem de móveis sob medida para o projeto "${project.title}", ambiente "${project.environment}", conforme especificações de projeto 3D aprovadas.

CLÁUSULA 2ª - DOS MATERIAIS & FERRAGENS:
Os móveis serão executados com as seguintes matérias-primas e padrões de acabamento:
${project.materials.map((m) => `- ${m.name} (${m.quantity} ${m.unit})`).join('\n')}

CLÁUSULA 3ª - DO VALOR E CONDIÇÕES DE PAGAMENTO:
Pela execução completa dos serviços ora contratados, a CONTRATANTE pagará à CONTRATADA o valor global de R$ ${calculatedTotal.toFixed(2)} (Reais), nas condições de pagamento acordadas na proposta comercial.

CLÁUSULA 4ª - DO PRAZO DE ENTREGA:
A entrega e início da montagem dar-se-á até a data acordada de ${new Date(project.deliveryDate).toLocaleDateString('pt-BR')}.

São Paulo, ${new Date().toLocaleDateString('pt-BR')}.
      `.trim();

      const docRes = await createGoogleContractDoc(project.title, client?.name || project.clientName, contractText);
      setCreatedDocUrl(docRes.url);
      setActionStatus(`Contrato gerado no Google Docs!`);
      setTimeout(() => setActionStatus(null), 5000);
    } catch (err: any) {
      setActionStatus(`Erro ao gerar contrato: ${err.message}`);
      setTimeout(() => setActionStatus(null), 6000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Alert */}
      {actionStatus && (
        <div className="bg-amber-950/80 border border-amber-500/60 p-3.5 rounded-2xl text-xs text-amber-200 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-amber-400" />
            <span>{actionStatus}</span>
          </div>
          {createdDocUrl && (
            <a
              href={createdDocUrl}
              target="_blank"
              rel="noreferrer"
              className="bg-amber-600 hover:bg-amber-500 text-white text-[11px] px-3 py-1 rounded-lg flex items-center gap-1"
            >
              Abrir Documento <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* Top Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div>
          <h3 className="font-semibold text-slate-100 text-sm">
            Orçamento & Composição de Preço: {project.title}
          </h3>
          <span className="text-xs text-slate-400">Cliente: {client?.name || project.clientName}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg transition active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Proposta em PDF</span>
          </button>

          <button
            onClick={handleUploadPDFToDrive}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 border border-slate-700 transition"
            title="Salvar PDF no Google Drive"
          >
            <CloudUpload className="w-4 h-4 text-emerald-400" />
            <span>Salvar no Drive</span>
          </button>

          <button
            onClick={handleGenerateGoogleDocContract}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 border border-slate-700 transition"
            title="Criar Minuta no Google Docs"
          >
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Contrato Google Docs</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Material Items List */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Lista de Insumos, Chapas & Ferragens
            </h4>
            <span className="text-xs font-mono text-slate-400">
              {project.materials.length} itens listados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Item / Descrição</th>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3">Qtd</th>
                  <th className="py-2.5 px-3">Preço Unit.</th>
                  <th className="py-2.5 px-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {project.materials.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-medium text-slate-200">{m.name}</td>
                    <td className="py-2.5 px-3">
                      <span className="bg-slate-800 text-[10px] px-2 py-0.5 rounded text-slate-400">
                        {m.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {m.quantity} {m.unit}
                    </td>
                    <td className="py-2.5 px-3 font-mono">R$ {m.unitPrice.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-200">
                      R$ {m.totalPrice.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Pricing & Margins Calculator */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-500" /> Formação de Preço
            </h4>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Chapas de MDF & Fitas:</span>
                <span className="font-mono">R$ {materialsTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ferragens Soft-Close:</span>
                <span className="font-mono">R$ {hardwareTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mão de Obra e Usinagem:</span>
                <span className="font-mono">R$ {laborTotal.toFixed(2)}</span>
              </div>

              {/* Freight input */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400">Frete & Instalação:</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 font-mono">R$</span>
                  <input
                    type="number"
                    value={freightCost}
                    onChange={(e) => setFreightCost(parseFloat(e.target.value) || 0)}
                    className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-right text-xs font-mono text-slate-200"
                  />
                </div>
              </div>

              <div className="border-t border-slate-800 pt-2 flex justify-between font-semibold">
                <span className="text-slate-300">Custo Total Base:</span>
                <span className="font-mono text-slate-100">R$ {baseCost.toFixed(2)}</span>
              </div>

              {/* Margin Slider */}
              <div className="pt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Margem de Lucro:</span>
                  <span className="font-bold text-amber-400 font-mono">{marginPercent}%</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="60"
                  step="1"
                  value={marginPercent}
                  onChange={(e) => {
                    const m = parseInt(e.target.value);
                    setMarginPercent(m);
                    onUpdateProject({ ...project, profitMarginPercent: m, budgetTotal: calculatedTotal });
                  }}
                  className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Lucro Projetado:</span>
                  <span className="text-emerald-400 font-mono font-semibold">+ R$ {profitValue.toFixed(2)}</span>
                </div>
              </div>

              {/* Final Total Box */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1 text-center mt-3">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                  Valor Total da Proposta
                </span>
                <div className="text-2xl font-bold text-amber-400 font-mono">
                  R$ {calculatedTotal.toFixed(2)}
                </div>
                <span className="text-[10px] text-slate-500 block">
                  Em até 12x de R$ {(calculatedTotal / 12).toFixed(2)} no cartão
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
