import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Shared Gemini Client with required User-Agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Model 1: gemini-4-argon for Room and Cabinetry Image Analysis
app.post('/api/gemini/analyze-room', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType, manualMeasurements, notes, roomType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Uma imagem em base64 é necessária para análise.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'Chave de API Gemini não encontrada. Configure-a no painel Secrets do AI Studio.',
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

    const prompt = `Você é um engenheiro de marcenaria de alto nível e mestre marceneiro profissional.
Analise a foto fornecida do ambiente (${roomType || 'Ambiente residencial'}) e cruze com as seguintes medidas manuais tomadas em campo:
${JSON.stringify(manualMeasurements || {}, null, 2)}
Observações do cliente/marceneiro: "${notes || 'Geração de projeto planejado completo e lista de corte'}".

Sua missão é responder EXCLUSIVAMENTE em formato JSON estruturado com os seguintes campos:
{
  "roomAnalysis": {
    "detectedRoom": "Cozinha / Quarto / Sala / etc.",
    "architecturalFeatures": ["Paredes de alvenaria", "Ponto de água na parede sul", "Tomadas a 110cm", "Janela ampla", etc.],
    "estimatedRoomDimensionsMm": {
      "width": 3200,
      "length": 4100,
      "height": 2600
    },
    "recommendedLayout": "Layout em L com armários aéreos até o teto e torre de fornos ergonômica"
  },
  "furnitureModules": [
    {
      "id": "mod-1",
      "name": "Balcão Inferior Pia",
      "type": "base_cabinet",
      "widthMm": 1200,
      "heightMm": 850,
      "depthMm": 600,
      "material": "MDF Branco TX 18mm com tamponamento Freijó 15mm",
      "doors": 2,
      "drawers": 0,
      "shelves": 1,
      "estimatedCost": 780.00
    },
    {
      "id": "mod-2",
      "name": "Gaveteiro 4 Gavetas com Corrediça Oculta",
      "type": "drawer_unit",
      "widthMm": 600,
      "heightMm": 850,
      "depthMm": 600,
      "material": "MDF Freijó 18mm",
      "doors": 0,
      "drawers": 4,
      "shelves": 0,
      "estimatedCost": 650.00
    },
    {
      "id": "mod-3",
      "name": "Armário Aéreo Basculante com Vidro Reflecta",
      "type": "wall_cabinet",
      "widthMm": 1800,
      "heightMm": 700,
      "depthMm": 350,
      "material": "MDF Cinza Sagrado 18mm",
      "doors": 3,
      "drawers": 0,
      "shelves": 2,
      "estimatedCost": 920.00
    }
  ],
  "suggestedCutList": [
    { "name": "Lateral Esquerda Balcão", "lengthMm": 850, "widthMm": 580, "thicknessMm": 18, "quantity": 1, "edgeBanding": "C1-L1" },
    { "name": "Lateral Direita Balcão", "lengthMm": 850, "widthMm": 580, "thicknessMm": 18, "quantity": 1, "edgeBanding": "C1-L1" },
    { "name": "Base Balcão", "lengthMm": 1164, "widthMm": 580, "thicknessMm": 18, "quantity": 1, "edgeBanding": "C1" },
    { "name": "Porta Balcão", "lengthMm": 830, "widthMm": 590, "thicknessMm": 18, "quantity": 2, "edgeBanding": "4_lados" },
    { "name": "Fundo Balcão", "lengthMm": 1180, "widthMm": 830, "thicknessMm": 6, "quantity": 1, "edgeBanding": "nenhuma" }
  ],
  "materialsNeeded": [
    { "item": "Chapas MDF Freijó 18mm (2750x1830)", "quantity": 2, "unit": "chapas", "category": "MDF" },
    { "item": "Chapas MDF Branco TX 15mm (2750x1830)", "quantity": 3, "unit": "chapas", "category": "MDF" },
    { "item": "Fita de Borda PVC Freijó 22mm", "quantity": 40, "unit": "metros", "category": "Fita" },
    { "item": "Dobradiça 35mm com amortecedor Slow-Motion", "quantity": 10, "unit": "unid", "category": "Ferragens" },
    { "item": "Corrediça Telescópica 500mm Soft-Close", "quantity": 4, "unit": "pares", "category": "Ferragens" },
    { "item": "Pistão a Gás 80N para Basculante", "quantity": 2, "unit": "unid", "category": "Ferragens" },
    { "item": "Puxador Perfil Gola Alumínio Fosco", "quantity": 5, "unit": "metros", "category": "Puxadores" },
    { "item": "Parafusos 4.0 x 40mm Philips e Tapa-furos", "quantity": 200, "unit": "unid", "category": "Fixação" }
  ],
  "technicalAdvice": "Atenção ao prumo da parede leste que aparenta ligeiro desnível na foto. Recomenda-se régua de ajuste de 20mm no tamponamento lateral."
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-argon',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: cleanBase64,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        systemInstruction:
          'Você é o assistente técnico de IA da MarcenariaPro. Retorne sempre JSON válido sem blocos de código extras.',
        responseMimeType: 'application/json',
      },
    });

    const textOutput = response.text || '{}';
    let parsedResult;
    try {
      parsedResult = JSON.parse(textOutput);
    } catch {
      // Fallback clean markdown if present
      const cleaned = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleaned);
    }

    return res.json({ success: true, analysis: parsedResult });
  } catch (err: any) {
    console.error('Error in analyze-room:', err);
    return res.status(500).json({
      error: err.message || 'Erro ao analisar imagem com Gemini 4 Argon',
    });
  }
});

// Model 2: gemini-nano-banana-2.1 for Furniture Rendering & Design Generation
app.post('/api/gemini/generate-furniture-image', async (req: Request, res: Response) => {
  try {
    const { prompt, aspectRatio, referenceImageBase64 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Um texto/prompt é obrigatório para geração.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'Chave de API Gemini não encontrada. Configure-a no painel Secrets do AI Studio.',
      });
    }

    const parts: any[] = [];

    if (referenceImageBase64) {
      const cleanBase64 = referenceImageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: cleanBase64,
        },
      });
    }

    parts.push({
      text: `Professional architectural woodwork render: ${prompt}. Photorealistic, ultra detailed wood grain texture, warm interior lighting, studio quality finish, 8k resolution, clean modern carpentry.`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-nano-banana-2.1',
      contents: {
        parts,
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio || '1:1',
          imageSize: '1K',
        },
      },
    });

    let imageUrl = '';
    let responseText = '';

    const candidates = response.candidates || [];
    for (const candidate of candidates) {
      for (const part of candidate.content?.parts || []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          imageUrl = `data:${mime};base64,${part.inlineData.data}`;
          break;
        } else if (part.text) {
          responseText += part.text;
        }
      }
      if (imageUrl) break;
    }

    if (!imageUrl) {
      return res.json({
        success: false,
        message: 'O modelo processou a solicitação mas não retornou dados de imagem direta.',
        textResponse: responseText,
      });
    }

    return res.json({
      success: true,
      imageUrl,
      textResponse: responseText,
    });
  } catch (err: any) {
    console.error('Error in generate-furniture-image:', err);
    return res.status(500).json({
      error: err.message || 'Erro ao gerar imagem com gemini-nano-banana-2.1',
    });
  }
});

// Model 2: gemini-nano-banana-2.1 for Editing Furniture Renderings
app.post('/api/gemini/edit-furniture-image', async (req: Request, res: Response) => {
  try {
    const { imageBase64, prompt } = req.body;

    if (!imageBase64 || !prompt) {
      return res.status(400).json({ error: 'Imagem base64 e instrução de edição são obrigatórias.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'Chave de API Gemini não encontrada. Configure-a no painel Secrets do AI Studio.',
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-nano-banana-2.1',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanBase64,
            },
          },
          {
            text: `Edit this carpentry and furniture visual: ${prompt}. Keep architectural alignment, maintain realistic wood textures and shadows.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: '1:1',
          imageSize: '1K',
        },
      },
    });

    let imageUrl = '';
    let responseText = '';

    for (const candidate of response.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          imageUrl = `data:${mime};base64,${part.inlineData.data}`;
          break;
        } else if (part.text) {
          responseText += part.text;
        }
      }
      if (imageUrl) break;
    }

    return res.json({
      success: !!imageUrl,
      imageUrl: imageUrl || null,
      textResponse: responseText,
    });
  } catch (err: any) {
    console.error('Error in edit-furniture-image:', err);
    return res.status(500).json({
      error: err.message || 'Erro ao editar imagem com gemini-nano-banana-2.1',
    });
  }
});

// Setup Vite middleware or static serving
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`MarcenariaPro server listening on port ${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
