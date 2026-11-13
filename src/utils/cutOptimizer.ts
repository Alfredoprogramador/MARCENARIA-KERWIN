import { CutPiece, SheetDefinition, CutSheetResult, PlacedPiece } from '../types/marcenaria';

interface FreeRect {
  x: number;
  y: number;
  width: number;
  length: number;
}

/**
 * Optimizes cutting layout of pieces onto MDF sheets using a 2D guillotine packing algorithm
 */
export function optimizeCutSheets(
  pieces: CutPiece[],
  sheet: SheetDefinition
): CutSheetResult[] {
  // Expand pieces by quantity
  const individualPieces: { piece: CutPiece; originalIndex: number }[] = [];
  pieces.forEach((p, pIdx) => {
    for (let i = 0; i < p.quantity; i++) {
      individualPieces.push({ piece: p, originalIndex: pIdx });
    }
  });

  // Sort pieces by area descending for best-fit placement
  individualPieces.sort((a, b) => {
    const areaA = a.piece.widthMm * a.piece.lengthMm;
    const areaB = b.piece.widthMm * b.piece.lengthMm;
    return areaB - areaA;
  });

  const usableWidth = sheet.widthMm - sheet.trimMarginMm * 2;
  const usableLength = sheet.lengthMm - sheet.trimMarginMm * 2;
  const kerf = sheet.kerfMm;

  const sheets: CutSheetResult[] = [];
  const unplaced = [...individualPieces];

  while (unplaced.length > 0) {
    const currentSheetIndex = sheets.length + 1;
    let freeRects: FreeRect[] = [
      {
        x: sheet.trimMarginMm,
        y: sheet.trimMarginMm,
        width: usableWidth,
        length: usableLength,
      },
    ];

    const placedThisSheet: PlacedPiece[] = [];
    const remainingForNext: typeof individualPieces = [];

    for (const item of unplaced) {
      let placed = false;
      let bestRectIdx = -1;
      let bestRotated = false;
      let bestW = 0;
      let bestL = 0;
      let minWaste = Number.MAX_SAFE_INTEGER;

      // Check standard orientation and 90 deg rotation
      const canRotate = item.piece.grain === 'indifferent';

      for (let rIdx = 0; rIdx < freeRects.length; rIdx++) {
        const rect = freeRects[rIdx];

        // Normal orientation: piece.widthMm along X, piece.lengthMm along Y
        if (item.piece.widthMm <= rect.width && item.piece.lengthMm <= rect.length) {
          const waste = rect.width * rect.length - item.piece.widthMm * item.piece.lengthMm;
          if (waste < minWaste) {
            minWaste = waste;
            bestRectIdx = rIdx;
            bestRotated = false;
            bestW = item.piece.widthMm;
            bestL = item.piece.lengthMm;
          }
        }

        // Rotated orientation
        if (
          canRotate &&
          item.piece.lengthMm <= rect.width &&
          item.piece.widthMm <= rect.length
        ) {
          const waste = rect.width * rect.length - item.piece.lengthMm * item.piece.widthMm;
          if (waste < minWaste) {
            minWaste = waste;
            bestRectIdx = rIdx;
            bestRotated = true;
            bestW = item.piece.lengthMm;
            bestL = item.piece.widthMm;
          }
        }
      }

      if (bestRectIdx !== -1) {
        const rect = freeRects[bestRectIdx];
        placedThisSheet.push({
          piece: item.piece,
          pieceIndex: item.originalIndex,
          x: rect.x,
          y: rect.y,
          width: bestW,
          length: bestL,
          rotated: bestRotated,
        });

        // Guillotine split of the chosen free rectangle
        freeRects.splice(bestRectIdx, 1);

        const remRightW = rect.width - bestW - kerf;
        const remTopL = rect.length - bestL - kerf;

        if (remRightW > 20) {
          freeRects.push({
            x: rect.x + bestW + kerf,
            y: rect.y,
            width: remRightW,
            length: bestL,
          });
        }

        if (remTopL > 20) {
          freeRects.push({
            x: rect.x,
            y: rect.y + bestL + kerf,
            width: rect.width,
            length: remTopL,
          });
        }

        // Sort free rects by size
        freeRects.sort((a, b) => a.width * a.length - b.width * b.length);
        placed = true;
      }

      if (!placed) {
        remainingForNext.push(item);
      }
    }

    // Calculate metrics
    const totalAreaMm2 = sheet.widthMm * sheet.lengthMm;
    const usedAreaMm2 = placedThisSheet.reduce((acc, p) => acc + p.width * p.length, 0);
    const efficiencyPercent = Number(((usedAreaMm2 / totalAreaMm2) * 100).toFixed(1));

    sheets.push({
      sheetIndex: currentSheetIndex,
      sheet,
      placedPieces: placedThisSheet,
      usedAreaMm2,
      totalAreaMm2,
      efficiencyPercent,
      leftoverCuts: freeRects.filter((r) => r.width >= 100 && r.length >= 100),
    });

    if (remainingForNext.length === unplaced.length) {
      // Piece larger than the whole sheet, break to avoid infinite loop
      break;
    }
    unplaced.length = 0;
    unplaced.push(...remainingForNext);
  }

  return sheets;
}

/**
 * Calculates edge banding linear meters needed for all pieces
 */
export function calculateEdgeBandingMeters(pieces: CutPiece[]): {
  totalMeters: number;
  breakdown: { pieceName: string; meters: number }[];
} {
  let totalMm = 0;
  const breakdown: { pieceName: string; meters: number }[] = [];

  for (const p of pieces) {
    let pieceMeters = 0;
    if (p.edgeBanding.c1) pieceMeters += p.lengthMm;
    if (p.edgeBanding.c2) pieceMeters += p.lengthMm;
    if (p.edgeBanding.l1) pieceMeters += p.widthMm;
    if (p.edgeBanding.l2) pieceMeters += p.widthMm;

    const totalForPieceType = (pieceMeters * p.quantity) / 1000;
    totalMm += pieceMeters * p.quantity;

    breakdown.push({
      pieceName: p.name,
      meters: Number(totalForPieceType.toFixed(2)),
    });
  }

  // Add 10% safety margin for trims and curves
  const finalMeters = (totalMm / 1000) * 1.1;

  return {
    totalMeters: Number(finalMeters.toFixed(2)),
    breakdown,
  };
}
