/**
 * Client service to communicate with server-side Gemini API endpoints
 */

export interface RoomAnalysisResponse {
  roomAnalysis: {
    detectedRoom: string;
    architecturalFeatures: string[];
    estimatedRoomDimensionsMm: {
      width: number;
      length: number;
      height: number;
    };
    recommendedLayout: string;
  };
  furnitureModules: Array<{
    id: string;
    name: string;
    type: 'base_cabinet' | 'wall_cabinet' | 'drawer_unit' | 'wardrobe' | 'tv_panel';
    widthMm: number;
    heightMm: number;
    depthMm: number;
    material: string;
    doors: number;
    drawers: number;
    shelves: number;
    estimatedCost: number;
  }>;
  suggestedCutList: Array<{
    name: string;
    lengthMm: number;
    widthMm: number;
    thicknessMm: number;
    quantity: number;
    edgeBanding: string;
  }>;
  materialsNeeded: Array<{
    item: string;
    quantity: number;
    unit: string;
    category: string;
  }>;
  technicalAdvice: string;
}

/**
 * Send image and manual dimensions to Gemini 4 Argon
 */
export async function analyzeRoomPhotoWithGemini(
  imageBase64: string,
  manualMeasurements: { widthMm?: number; lengthMm?: number; heightMm?: number },
  notes: string = '',
  roomType: string = 'Ambiente Residencial'
): Promise<RoomAnalysisResponse> {
  const response = await fetch('/api/gemini/analyze-room', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64,
      manualMeasurements,
      notes,
      roomType,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Falha ao analisar a imagem com o modelo Gemini');
  }

  return data.analysis;
}

/**
 * Generate furniture rendering using gemini-nano-banana-2.1
 */
export async function generateFurnitureRender(
  prompt: string,
  aspectRatio: '1:1' | '16:9' | '4:3' | '3:4' = '1:1',
  referenceImageBase64?: string
): Promise<{ imageUrl: string; textResponse?: string }> {
  const response = await fetch('/api/gemini/generate-furniture-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      aspectRatio,
      referenceImageBase64,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Falha ao gerar imagem com Gemini Nano Banana');
  }

  if (!data.imageUrl && !data.success) {
    throw new Error(data.message || 'Não foi possível gerar a imagem.');
  }

  return { imageUrl: data.imageUrl, textResponse: data.textResponse };
}

/**
 * Edit an existing furniture rendering with gemini-nano-banana-2.1
 */
export async function editFurnitureRender(
  imageBase64: string,
  prompt: string
): Promise<{ imageUrl: string; textResponse?: string }> {
  const response = await fetch('/api/gemini/edit-furniture-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64,
      prompt,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Falha ao editar renderização.');
  }

  return { imageUrl: data.imageUrl, textResponse: data.textResponse };
}
