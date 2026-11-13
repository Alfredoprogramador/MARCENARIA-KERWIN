import React, { useState } from 'react';
import { Project, CutPiece, MaterialItem, Cabinet3DModule } from '../../types/marcenaria';
import {
  analyzeRoomPhotoWithGemini,
  generateFurnitureRender,
  editFurnitureRender,
  RoomAnalysisResponse,
} from '../../services/geminiApi';
import {
  Sparkles,
  Camera,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Layers,
  ArrowRight,
  RefreshCw,
  Download,
  Wand2,
} from 'lucide-react';

interface AiStudioProps {
  project: Project;
  onApplyAnalysisToProject: (data: {
    modules: Cabinet3DModule[];
    cutPieces: CutPiece[];
    materials: MaterialItem[];
    roomDimensions: { widthMm: number; lengthMm: number; heightMm: number };
  }) => void;
}

export const AiStudio: React.FC<AiStudioProps> = ({
  project,
  onApplyAnalysisToProject,
}) => {
  const [activeTab, setActiveTab] = useState<'analyze' | 'generate'>('analyze');

  // Tab 1: Room Photo Analysis (gemini-4-argon)
  const [roomPhotoBase64, setRoomPhotoBase64] = useState<string | null>(null);
  const [roomType, setRoomType] = useState<string>('Cozinha Residencial');
  const [manualWidth, setManualWidth] = useState<number>(project.room.widthMm);
  const [manualLength, setManualLength] = useState<number>(project.room.lengthMm);
  const [manualHeight, setManualHeight] = useState<number>(project.room.heightMm);
  const [notes, setNotes] = useState<string>('Cliente deseja armários em Freijó, torre de fornos e gavetões soft-close.');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<RoomAnalysisResponse | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);

  // Tab 2: Image Creation & Editing (gemini-nano-banana-2.1)
  const [prompt, setPrompt] = useState<string>(
    'Cozinha moderna com armários planejados em madeira Freijó natural, bancada em quartzo branco e iluminação LED embutida nas prateleiras'
  );
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '4:3' | '3:4'>('1:1');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // File upload reader
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setRoomPhotoBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Run Room Analysis using gemini-4-argon
  const handleRunAnalysis = async () => {
    if (!roomPhotoBase64) {
      alert('Por favor, carregue uma foto do cômodo antes de iniciar a análise.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAppliedSuccess(false);

    try {
      const result = await analyzeRoomPhotoWithGemini(
        roomPhotoBase64,
        {
          widthMm: manualWidth,
          lengthMm: manualLength,
          heightMm: manualHeight,
        },
        notes,
        roomType
      );
      setAnalysisResult(result);
    } catch (err: any) {
      setAnalysisError(err.message || 'Erro ao analisar imagem.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Apply AI result to 3D project & cut list
  const handleApplyToProject = () => {
    if (!analysisResult) return;

    const modules: Cabinet3DModule[] = analysisResult.furnitureModules.map((m, idx) => ({
      id: `ai-mod-${idx}-${Date.now()}`,
      name: m.name,
      type: (m.type as any) || 'base_cabinet',
      position: { x: (idx - 1) * 0.9, y: m.type === 'wall_cabinet' ? 1.5 : 0, z: -1.2 },
      dimensionsMm: {
        width: m.widthMm || 800,
        height: m.heightMm || 850,
        depth: m.depthMm || 600,
      },
      rotationY: 0,
      finish: m.material || 'MDF Freijó 18mm',
      doorColor: '#b45309',
      carcassColor: '#f8fafc',
      doorsCount: m.doors || 0,
      drawersCount: m.drawers || 0,
      shelvesCount: m.shelves || 1,
      doorOpenAngle: 0,
      drawerSlideOut: 0,
    }));

    const cutPieces: CutPiece[] = analysisResult.suggestedCutList.map((c, idx) => ({
      id: `ai-p-${idx}-${Date.now()}`,
      name: c.name,
      widthMm: c.widthMm,
      lengthMm: c.lengthMm,
      thicknessMm: c.thicknessMm || 18,
      quantity: c.quantity || 1,
      material: 'MDF Freijó 18mm',
      grain: 'vertical',
      edgeBanding: {
        c1: true,
        c2: c.edgeBanding?.includes('4_lados') || false,
        l1: true,
        l2: c.edgeBanding?.includes('4_lados') || false,
      },
    }));

    const materials: MaterialItem[] = analysisResult.materialsNeeded.map((m, idx) => ({
      id: `ai-mat-${idx}-${Date.now()}`,
      name: m.item,
      category: (m.category as any) || 'MDF',
      quantity: m.quantity || 1,
      unit: m.unit || 'un',
      unitPrice: m.category === 'MDF' ? 380 : 45,
      totalPrice: (m.quantity || 1) * (m.category === 'MDF' ? 380 : 45),
    }));

    onApplyAnalysisToProject({
      modules,
      cutPieces,
      materials,
      roomDimensions: {
        widthMm: analysisResult.roomAnalysis.estimatedRoomDimensionsMm.width,
        lengthMm: analysisResult.roomAnalysis.estimatedRoomDimensionsMm.length,
        heightMm: analysisResult.roomAnalysis.estimatedRoomDimensionsMm.height,
      },
    });

    setAppliedSuccess(true);
  };

  // Run Image Generation using gemini-nano-banana-2.1
  const handleGenerateImage = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const res = await generateFurnitureRender(prompt, aspectRatio);
      setGeneratedImageUrl(res.imageUrl);
    } catch (err: any) {
      setGenerationError(err.message || 'Erro ao gerar imagem.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Run Image Editing using gemini-nano-banana-2.1
  const handleEditImage = async () => {
    if (!generatedImageUrl || !editPrompt) return;
    setIsEditing(true);
    setGenerationError(null);

    try {
      const res = await editFurnitureRender(generatedImageUrl, editPrompt);
      if (res.imageUrl) {
        setGeneratedImageUrl(res.imageUrl);
        setEditPrompt('');
      }
    } catch (err: any) {
      setGenerationError(err.message || 'Erro ao editar imagem.');
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <button
          onClick={() => setActiveTab('analyze')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'analyze'
              ? 'bg-amber-600 text-white shadow-lg'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Análise de Fotos & Medidas (gemini-4-argon)</span>
        </button>

        <button
          onClick={() => setActiveTab('generate')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'generate'
              ? 'bg-amber-600 text-white shadow-lg'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wand2 className="w-4 h-4" />
          <span>Criar & Editar Renders 3D (gemini-nano-banana-2.1)</span>
        </button>
      </div>

      {/* Tab 1: Image & Measurement Analysis with gemini-4-argon */}
      {activeTab === 'analyze' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Upload & Measurements Form */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-500" /> 1. Foto do Interior & Medidas Manuais
              </h3>

              {/* Photo Upload Zone */}
              <div className="space-y-2">
                <label className="text-xs text-slate-400 block">Foto do Cômodo Fornecida pelo Cliente</label>
                <div className="relative border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-slate-950/60 cursor-pointer overflow-hidden transition">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {roomPhotoBase64 ? (
                    <div className="relative w-full h-40">
                      <img
                        src={roomPhotoBase64}
                        alt="Room Preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs opacity-0 hover:opacity-100 transition">
                        Clique para alterar foto
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 space-y-2">
                      <Camera className="w-8 h-8 text-slate-500 mx-auto" />
                      <div className="text-xs text-slate-300 font-medium">Clique ou arraste a foto do ambiente</div>
                      <div className="text-[10px] text-slate-500">JPG, PNG ou WebP até 15MB</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Room Measurements in Millimeters */}
              <div className="space-y-2">
                <label className="text-xs text-slate-400 block">Medidas Reais Tomadas no Local (em mm)</label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Largura (mm)</span>
                    <input
                      type="number"
                      value={manualWidth}
                      onChange={(e) => setManualWidth(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Comprimento</span>
                    <input
                      type="number"
                      value={manualLength}
                      onChange={(e) => setManualLength(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Pé Direito</span>
                    <input
                      type="number"
                      value={manualHeight}
                      onChange={(e) => setManualHeight(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Room Type & Notes */}
              <div>
                <label className="text-xs text-slate-400 block mb-1">Tipo de Ambiente</label>
                <select
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200"
                >
                  <option value="Cozinha Residencial">Cozinha Residencial</option>
                  <option value="Dormitório / Closet">Dormitório / Closet</option>
                  <option value="Home Theater / Sala de Estar">Home Theater / Sala de Estar</option>
                  <option value="Home Office Executivo">Home Office Executivo</option>
                  <option value="Gabinete de Banheiro">Gabinete de Banheiro</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Desejos do Cliente / Observações Técnicas</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Armários aéreos até o teto, porta-temperos embutido, espaço para micro-ondas..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 resize-none"
                />
              </div>

              <button
                disabled={isAnalyzing || !roomPhotoBase64}
                onClick={handleRunAnalysis}
                className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processando Imagem com Gemini 4 Argon...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Analisar Espaço & Gerar Lista de Corte</span>
                  </>
                )}
              </button>

              {analysisError && (
                <div className="bg-red-950/60 border border-red-500/50 p-3 rounded-xl text-xs text-red-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                  <span>{analysisError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: AI Analysis Results */}
          <div className="lg:col-span-7 space-y-4">
            {analysisResult ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> Resultado da IA (Gemini 4 Argon)
                    </h4>
                    <span className="text-xs text-slate-400">
                      Ambiente detectado: {analysisResult.roomAnalysis.detectedRoom}
                    </span>
                  </div>

                  <button
                    onClick={handleApplyToProject}
                    disabled={appliedSuccess}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg transition"
                  >
                    {appliedSuccess ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Aplicado com Sucesso!</span>
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4" />
                        <span>Aplicar ao Projeto 3D & Corte</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Recommended Layout & Advice */}
                <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl text-xs space-y-1">
                  <span className="font-semibold text-slate-300">Layout Sugerido:</span>
                  <p className="text-slate-400">{analysisResult.roomAnalysis.recommendedLayout}</p>
                  <p className="text-amber-400/90 italic pt-1">
                    Orientação do Mestre Marceneiro: {analysisResult.technicalAdvice}
                  </p>
                </div>

                {/* Proposed Furniture Modules */}
                <div>
                  <h5 className="text-xs font-semibold text-slate-300 mb-2">
                    Módulos Paramétricos Propostos ({analysisResult.furnitureModules.length})
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {analysisResult.furnitureModules.map((m) => (
                      <div key={m.id} className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs">
                        <div className="font-semibold text-slate-200">{m.name}</div>
                        <div className="text-[11px] text-amber-500 font-mono">
                          {m.widthMm} x {m.heightMm} x {m.depthMm} mm
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{m.material}</div>
                        <div className="text-[10px] text-slate-500">
                          {m.doors} portas, {m.drawers} gavetas, {m.shelves} prateleiras
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggested Cut List */}
                <div>
                  <h5 className="text-xs font-semibold text-slate-300 mb-2">
                    Peças Principais para o Otimizador de Corte ({analysisResult.suggestedCutList.length})
                  </h5>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {analysisResult.suggestedCutList.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-slate-950/80 p-2 rounded-lg text-xs border border-slate-800/80"
                      >
                        <span className="font-medium text-slate-300">{c.name}</span>
                        <span className="font-mono text-slate-400">
                          {c.lengthMm} x {c.widthMm} x {c.thicknessMm} mm ({c.quantity}x)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Materials Needed */}
                <div>
                  <h5 className="text-xs font-semibold text-slate-300 mb-2">Ferragens & Chapas Recomendadas</h5>
                  <div className="flex flex-wrap gap-1.5">
                    {analysisResult.materialsNeeded.map((mat, i) => (
                      <span
                        key={i}
                        className="bg-slate-800 text-slate-300 text-[11px] px-2.5 py-1 rounded-lg border border-slate-700"
                      >
                        {mat.item} ({mat.quantity} {mat.unit})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[380px] bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-8 text-slate-500">
                <Sparkles className="w-12 h-12 text-slate-600 mb-3" />
                <h4 className="text-sm font-semibold text-slate-300 mb-1">Aguardando Envio da Foto</h4>
                <p className="text-xs max-w-sm">
                  Envie a foto do ambiente à esquerda e clique em "Analisar Espaço" para que o Gemini 4 Argon
                  gere a planta, os módulos e a lista de peças automaticamente.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Image Creation & Editing with gemini-nano-banana-2.1 */}
      {activeTab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-amber-500" /> Criar Render Fotorrealista
              </h3>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Descrição Textual do Projeto / Móvel</label>
                <textarea
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 resize-none focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5">Proporção da Imagem (Aspect Ratio)</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['1:1', '16:9', '4:3', '3:4'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setAspectRatio(ratio)}
                      className={`py-1.5 text-xs font-mono rounded-lg border transition ${
                        aspectRatio === ratio
                          ? 'bg-amber-600/30 text-amber-400 border-amber-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              <button
                disabled={isGenerating || !prompt}
                onClick={handleGenerateImage}
                className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Renderizando com gemini-nano-banana-2.1...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Gerar Imagem do Móvel</span>
                  </>
                )}
              </button>

              {generationError && (
                <div className="bg-red-950/60 border border-red-500/50 p-3 rounded-xl text-xs text-red-200">
                  {generationError}
                </div>
              )}
            </div>

            {/* Edit existing image section */}
            {generatedImageUrl && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-400" /> Editar Imagem Gerada
                </h4>
                <input
                  type="text"
                  placeholder="Ex: Trocar para madeira Carvalho e adicionar luz de LED"
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
                <button
                  disabled={isEditing || !editPrompt}
                  onClick={handleEditImage}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2 rounded-xl text-xs flex items-center justify-center gap-2 transition"
                >
                  {isEditing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Editando com gemini-nano-banana-2.1...</span>
                    </>
                  ) : (
                    <span>Aplicar Alteração na Imagem</span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Rendered Image Display */}
          <div className="lg:col-span-7">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col items-center justify-center min-h-[460px]">
              {generatedImageUrl ? (
                <div className="w-full space-y-3">
                  <div className="relative rounded-xl overflow-hidden border border-slate-800 max-h-[500px]">
                    <img
                      src={generatedImageUrl}
                      alt="Furniture Render"
                      className="w-full h-auto object-cover"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <a
                      href={generatedImageUrl}
                      download="marcenariapro_render.png"
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 border border-slate-700"
                    >
                      <Download className="w-3.5 h-3.5" /> Baixar Imagem
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 text-slate-500">
                  <ImageIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h4 className="text-sm font-semibold text-slate-300 mb-1">Nenhuma Imagem Gerada Ainda</h4>
                  <p className="text-xs max-w-sm">
                    Digite a descrição do móvel ou ambiente desejado e clique em "Gerar Imagem do Móvel"
                    para visualizar a renderização em alta qualidade.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
