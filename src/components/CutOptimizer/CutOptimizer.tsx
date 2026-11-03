import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CutPiece, SheetDefinition, CutSheetResult } from '../../types/marcenaria';
import { optimizeCutSheets, calculateEdgeBandingMeters } from '../../utils/cutOptimizer';
import {
  Scissors,
  Layers,
  Plus,
  Trash2,
  Printer,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Sparkles,
  Download,
  AlertCircle,
  Tag,
} from 'lucide-react';

interface CutOptimizerProps {
  pieces: CutPiece[];
  onUpdatePieces: (updated: CutPiece[]) => void;
  projectName?: string;
}

export const CutOptimizer: React.FC<CutOptimizerProps> = ({
  pieces,
  onUpdatePieces,
  projectName = 'Projeto',
}) => {
  // Standard MDF sheet in Brazil: 2750 x 1830 mm
  const [sheetDef, setSheetDef] = useState<SheetDefinition>({
    widthMm: 2750,
    lengthMm: 1830,
    thicknessMm: 18,
    material: 'MDF Freijó 18mm',
    kerfMm: 3.2,
    trimMarginMm: 10,
    costPerSheet: 380,
  });

  const [activeSheetIdx, setActiveSheetIdx] = useState<number>(0);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showLabelsModal, setShowLabelsModal] = useState<boolean>(false);

  // New piece form state
  const [newPiece, setNewPiece] = useState<Partial<CutPiece>>({
    name: '',
    widthMm: 500,
    lengthMm: 700,
    thicknessMm: 18,
    quantity: 1,
    material: 'MDF Freijó 18mm',
    grain: 'vertical',
    edgeBanding: { c1: true, c2: false, l1: true, l2: false },
  });

  // Run optimization
  const optimizationResults = useMemo(() => {
    return optimizeCutSheets(pieces, sheetDef);
  }, [pieces, sheetDef]);

  const activeSheetResult: CutSheetResult | undefined = optimizationResults[activeSheetIdx];

  const edgeBandingSummary = useMemo(() => {
    return calculateEdgeBandingMeters(pieces);
  }, [pieces]);

  // Canvas drawing for active sheet
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !activeSheetResult) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Scaling factors to fit sheet on canvas with margin
    const padding = 30;
    const availableW = w - padding * 2;
    const availableH = h - padding * 2;

    const scaleX = availableW / sheetDef.widthMm;
    const scaleY = availableH / sheetDef.lengthMm;
    const scale = Math.min(scaleX, scaleY);

    const sheetDrawW = sheetDef.widthMm * scale;
    const sheetDrawH = sheetDef.lengthMm * scale;
    const startX = padding + (availableW - sheetDrawW) / 2;
    const startY = padding + (availableH - sheetDrawH) / 2;

    // 1. Draw MDF Sheet Base
    ctx.fillStyle = '#1e293b'; // slate-800
    ctx.fillRect(startX, startY, sheetDrawW, sheetDrawH);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(startX, startY, sheetDrawW, sheetDrawH);

    // 2. Draw Trim Margin (Refilo)
    const trimX = startX + sheetDef.trimMarginMm * scale;
    const trimY = startY + sheetDef.trimMarginMm * scale;
    const trimW = (sheetDef.widthMm - sheetDef.trimMarginMm * 2) * scale;
    const trimH = (sheetDef.lengthMm - sheetDef.trimMarginMm * 2) * scale;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(trimX, trimY, trimW, trimH);
    ctx.setLineDash([]);

    // 3. Draw Placed Cut Pieces
    const pieceColors = [
      '#f59e0b', // amber-500
      '#3b82f6', // blue-500
      '#10b981', // emerald-500
      '#8b5cf6', // purple-500
      '#ec4899', // pink-500
      '#06b6d4', // cyan-500
      '#f97316', // orange-500
    ];

    activeSheetResult.placedPieces.forEach((p, idx) => {
      const px = startX + p.x * scale;
      const py = startY + p.y * scale;
      const pw = p.width * scale;
      const pl = p.length * scale;

      const color = pieceColors[p.pieceIndex % pieceColors.length];

      // Piece background
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(px, py, pw, pl);
      ctx.globalAlpha = 1.0;

      // Piece border
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px, py, pw, pl);

      // Edge banding highlights (Fita de borda)
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ef4444'; // Red edge banding indicator

      if (p.piece.edgeBanding.c1) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + pw, py);
        ctx.stroke();
      }
      if (p.piece.edgeBanding.c2) {
        ctx.beginPath();
        ctx.moveTo(px, py + pl);
        ctx.lineTo(px + pw, py + pl);
        ctx.stroke();
      }
      if (p.piece.edgeBanding.l1) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, py + pl);
        ctx.stroke();
      }
      if (p.piece.edgeBanding.l2) {
        ctx.beginPath();
        ctx.moveTo(px + pw, py);
        ctx.lineTo(px + pw, py + pl);
        ctx.stroke();
      }

      // Piece Text Label
      if (pw > 40 && pl > 25) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(p.piece.name, px + 5, py + 16, pw - 10);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '10px monospace';
        ctx.fillText(`${p.width} x ${p.length} mm`, px + 5, py + 29, pw - 10);
      }
    });

    // 4. Draw Leftovers / Retalhos
    activeSheetResult.leftoverCuts.forEach((rem) => {
      const rx = startX + rem.x * scale;
      const ry = startY + rem.y * scale;
      const rw = rem.width * scale;
      const rl = rem.length * scale;

      ctx.fillStyle = 'rgba(34, 197, 94, 0.12)';
      ctx.fillRect(rx, ry, rw, rl);
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(rx, ry, rw, rl);
      ctx.setLineDash([]);

      if (rw > 50 && rl > 30) {
        ctx.fillStyle = '#4ade80';
        ctx.font = '9px sans-serif';
        ctx.fillText(`Sobra: ${rem.width}x${rem.length}`, rx + 4, ry + 14);
      }
    });
  }, [activeSheetResult, sheetDef]);

  const handleAddPieceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPiece.name) return;

    const pieceToAdd: CutPiece = {
      id: `p-${Date.now()}`,
      name: newPiece.name || 'Nova Peça',
      widthMm: Number(newPiece.widthMm) || 500,
      lengthMm: Number(newPiece.lengthMm) || 500,
      thicknessMm: Number(newPiece.thicknessMm) || 18,
      quantity: Number(newPiece.quantity) || 1,
      material: newPiece.material || 'MDF Freijó 18mm',
      grain: newPiece.grain || 'vertical',
      edgeBanding: newPiece.edgeBanding || { c1: false, c2: false, l1: false, l2: false },
    };

    onUpdatePieces([...pieces, pieceToAdd]);
    setShowAddModal(false);
    setNewPiece({
      name: '',
      widthMm: 500,
      lengthMm: 700,
      thicknessMm: 18,
      quantity: 1,
      material: 'MDF Freijó 18mm',
      grain: 'vertical',
      edgeBanding: { c1: true, c2: false, l1: true, l2: false },
    });
  };

  const handleDeletePiece = (id: string) => {
    onUpdatePieces(pieces.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Aproveitamento Médio</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {optimizationResults.length > 0
              ? (
                  optimizationResults.reduce((acc, s) => acc + s.efficiencyPercent, 0) /
                  optimizationResults.length
                ).toFixed(1)
              : 0}
            %
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Otimização padrão guilhotina industrial</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Chapas Necessárias</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{optimizationResults.length} un.</div>
          <p className="text-[11px] text-slate-500 mt-1">
            Dimensão: {sheetDef.widthMm} x {sheetDef.lengthMm} mm
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Fita de Borda PVC</span>
            <Scissors className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{edgeBandingSummary.totalMeters} m</div>
          <p className="text-[11px] text-slate-500 mt-1">Inclui margem de 10% de refilamento</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total de Peças</span>
            <Tag className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {pieces.reduce((acc, p) => acc + p.quantity, 0)} cortes
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{pieces.length} modelos cadastrados</p>
        </div>
      </div>

      {/* Main Cutting Diagram Canvas Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        {/* Canvas Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-200 text-sm flex items-center gap-2">
              <Scissors className="w-4 h-4 text-amber-500" /> Plano de Corte da Chapa
            </span>

            {/* Sheet Navigator */}
            {optimizationResults.length > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800">
                <button
                  disabled={activeSheetIdx === 0}
                  onClick={() => setActiveSheetIdx((prev) => Math.max(0, prev - 1))}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono text-slate-300">
                  Chapa {activeSheetIdx + 1} de {optimizationResults.length}
                </span>
                <button
                  disabled={activeSheetIdx === optimizationResults.length - 1}
                  onClick={() =>
                    setActiveSheetIdx((prev) => Math.min(optimizationResults.length - 1, prev + 1))
                  }
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Legend */}
            <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400 mr-2">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-amber-500" /> Peça Cortada
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-red-500" /> Fita de Borda
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500" /> Sobra Reutilizável
              </span>
            </div>

            <button
              onClick={() => setShowLabelsModal(true)}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-xl flex items-center gap-1.5 border border-slate-700 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Etiquetas de Oficina</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5 font-medium transition shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Peça</span>
            </button>
          </div>
        </div>

        {/* 2D Canvas Container */}
        <div className="relative w-full h-[460px] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800/80">
          <canvas ref={canvasRef} width={900} height={460} className="w-full h-full object-contain" />

          {/* Quick overlay badges */}
          {activeSheetResult && (
            <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-slate-300 backdrop-blur-md">
              Aproveitamento desta chapa:{' '}
              <span className="font-semibold text-emerald-400">
                {activeSheetResult.efficiencyPercent}%
              </span>{' '}
              ({activeSheetResult.placedPieces.length} peças cortadas)
            </div>
          )}
        </div>
      </div>

      {/* Pieces Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-200 text-sm">Lista de Peças & Especificações de Fita</h3>
          <span className="text-xs text-slate-400">Espessura da serra (Kerf): 3.2 mm | Refilo: 10 mm</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Peça / Módulo</th>
                <th className="py-2.5 px-3">Comprimento (mm)</th>
                <th className="py-2.5 px-3">Largura (mm)</th>
                <th className="py-2.5 px-3">Espessura</th>
                <th className="py-2.5 px-3">Qtd</th>
                <th className="py-2.5 px-3">Veio</th>
                <th className="py-2.5 px-3">Bordas (C1/C2/L1/L2)</th>
                <th className="py-2.5 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {pieces.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-3 font-medium text-slate-200">{p.name}</td>
                  <td className="py-2.5 px-3 font-mono">{p.lengthMm}</td>
                  <td className="py-2.5 px-3 font-mono">{p.widthMm}</td>
                  <td className="py-2.5 px-3">{p.thicknessMm} mm</td>
                  <td className="py-2.5 px-3 font-semibold text-amber-400">{p.quantity}x</td>
                  <td className="py-2.5 px-3">
                    <span className="capitalize text-slate-400">{p.grain}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1 font-mono text-[10px]">
                      <span className={p.edgeBanding.c1 ? 'text-red-400 font-bold' : 'text-slate-600'}>C1</span>
                      <span className={p.edgeBanding.c2 ? 'text-red-400 font-bold' : 'text-slate-600'}>C2</span>
                      <span className={p.edgeBanding.l1 ? 'text-red-400 font-bold' : 'text-slate-600'}>L1</span>
                      <span className={p.edgeBanding.l2 ? 'text-red-400 font-bold' : 'text-slate-600'}>L2</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => handleDeletePiece(p.id)}
                      className="text-slate-500 hover:text-red-400 p-1 transition"
                      title="Excluir peça"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Piece Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-200">
            <h3 className="font-semibold text-base mb-4 text-slate-100 flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-500" /> Cadastrar Peça para Corte
            </h3>

            <form onSubmit={handleAddPieceSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Nome da Peça</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Lateral Esquerda Armário"
                  value={newPiece.name}
                  onChange={(e) => setNewPiece({ ...newPiece, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Comprimento (mm)</label>
                  <input
                    type="number"
                    required
                    min="10"
                    value={newPiece.lengthMm}
                    onChange={(e) => setNewPiece({ ...newPiece, lengthMm: parseInt(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Largura (mm)</label>
                  <input
                    type="number"
                    required
                    min="10"
                    value={newPiece.widthMm}
                    onChange={(e) => setNewPiece({ ...newPiece, widthMm: parseInt(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Quantidade</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newPiece.quantity}
                    onChange={(e) => setNewPiece({ ...newPiece, quantity: parseInt(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Sentido do Veio</label>
                  <select
                    value={newPiece.grain}
                    onChange={(e) => setNewPiece({ ...newPiece, grain: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="vertical">Vertical</option>
                    <option value="horizontal">Horizontal</option>
                    <option value="indifferent">Indiferente (Gira 90º)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5">Fitas de Borda PVC</label>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {[
                    { key: 'c1', label: 'C1 (Topo)' },
                    { key: 'c2', label: 'C2 (Base)' },
                    { key: 'l1', label: 'L1 (Esq)' },
                    { key: 'l2', label: 'L2 (Dir)' },
                  ].map((edge) => (
                    <label
                      key={edge.key}
                      className="flex items-center gap-1.5 bg-slate-950 p-2 rounded-lg border border-slate-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={newPiece.edgeBanding?.[edge.key as keyof typeof newPiece.edgeBanding]}
                        onChange={(e) =>
                          setNewPiece({
                            ...newPiece,
                            edgeBanding: {
                              ...newPiece.edgeBanding!,
                              [edge.key]: e.target.checked,
                            },
                          })
                        }
                        className="accent-amber-500 rounded"
                      />
                      <span>{edge.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold"
                >
                  Salvar Peça
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Workshop Labels Modal */}
      {showLabelsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto text-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <Printer className="w-4 h-4 text-amber-500" /> Etiquetas das Peças para Oficina
              </h3>
              <button onClick={() => window.print()} className="bg-amber-600 text-white px-3 py-1.5 text-xs rounded-lg">
                Imprimir
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 print:grid-cols-2">
              {pieces.map((p, idx) => (
                <div key={p.id} className="border border-slate-800 bg-slate-950 p-3 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between font-bold text-amber-400">
                    <span>{p.name}</span>
                    <span>#{idx + 1}</span>
                  </div>
                  <div className="text-slate-300 font-mono">
                    {p.lengthMm} x {p.widthMm} x {p.thicknessMm} mm
                  </div>
                  <div className="text-[11px] text-slate-400">Material: {p.material}</div>
                  <div className="text-[11px] text-red-400">
                    Bordas: {p.edgeBanding.c1 ? 'C1 ' : ''}
                    {p.edgeBanding.c2 ? 'C2 ' : ''}
                    {p.edgeBanding.l1 ? 'L1 ' : ''}
                    {p.edgeBanding.l2 ? 'L2 ' : ''}
                  </div>
                  <div className="text-[10px] text-slate-500">{projectName}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowLabelsModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
