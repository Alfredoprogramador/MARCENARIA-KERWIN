import { jsPDF } from 'jspdf';
import { Project, Client } from '../types/marcenaria';

/**
 * Generate a professional Carpentry Estimate PDF document using jsPDF
 */
export function generateProjectQuotePDF(project: Project, client?: Client): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 20;

  // Primary colors
  const primaryColor = [30, 41, 59]; // slate-800
  const accentColor = [180, 83, 9];   // amber-700 (warm wood tone)
  const mutedColor = [100, 116, 139]; // slate-500

  // 1. Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('MARCENARIAPRO', 15, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Móveis Planejados & Arquitetura de Interiores', 15, 21);

  doc.setFontSize(8);
  doc.text('Contato: (11) 98765-4321 | contato@marcenariapro.com.br', pageWidth - 15, 14, {
    align: 'right',
  });
  doc.text('CNPJ: 12.345.678/0001-90 | São Paulo - SP', pageWidth - 15, 21, { align: 'right' });

  currentY = 38;

  // 2. Document Title
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('PROPOSTA COMERCIAL & ORÇAMENTO DE MARCENARIA', 15, currentY);
  currentY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  const dateStr = new Date().toLocaleDateString('pt-BR');
  doc.text(`Proposta Nº: MP-${project.id.toUpperCase().slice(0, 6)} | Emitido em: ${dateStr} | Validade: 15 dias`, 15, currentY);
  currentY += 10;

  // 3. Client & Project Details Card
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(15, currentY, pageWidth - 30, 26, 2, 2, 'FD');

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DADOS DO CLIENTE:', 20, currentY + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${client?.name || project.clientName}`, 20, currentY + 14);
  doc.text(`Telefone/WhatsApp: ${client?.phone || '(11) 99999-0000'}`, 20, currentY + 21);

  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO PROJETO:', pageWidth / 2 + 5, currentY + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Projeto: ${project.title}`, pageWidth / 2 + 5, currentY + 14);
  doc.text(
    `Ambiente: ${project.environment} (${project.room.widthMm} x ${project.room.lengthMm} x ${project.room.heightMm} mm)`,
    pageWidth / 2 + 5,
    currentY + 21
  );

  currentY += 34;

  // 4. Modules & Items Table Header
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(15, currentY, pageWidth - 30, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('DESCRIÇÃO DO MÓVEL / ESPECIFICAÇÃO', 18, currentY + 5);
  doc.text('DIMENSÕES (L x A x P)', 105, currentY + 5);
  doc.text('PORTAS / GAV', 150, currentY + 5);
  doc.text('SUBTOTAL', pageWidth - 18, currentY + 5, { align: 'right' });
  currentY += 7;

  // Rows of modules
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);

  project.modules.forEach((mod, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, currentY, pageWidth - 30, 8, 'F');
    }
    doc.text(mod.name, 18, currentY + 5.5);
    doc.text(
      `${mod.dimensionsMm.width} x ${mod.dimensionsMm.height} x ${mod.dimensionsMm.depth} mm`,
      105,
      currentY + 5.5
    );
    doc.text(`${mod.doorsCount}P / ${mod.drawersCount}G`, 150, currentY + 5.5);

    // Rough estimated portion
    const modCost = (project.budgetTotal / (project.modules.length || 1)).toFixed(2);
    doc.text(`R$ ${modCost}`, pageWidth - 18, currentY + 5.5, { align: 'right' });
    currentY += 8;
  });

  currentY += 4;

  // 5. Materials & Hardware Summary
  doc.setFillColor(241, 245, 249);
  doc.rect(15, currentY, pageWidth - 30, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('LISTA DE MATERIAIS, FERRAGENS & TAMPONAMENTOS SELECIONADOS:', 18, currentY + 4.5);
  currentY += 9;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  project.materials.slice(0, 5).forEach((m) => {
    doc.text(`• ${m.name} (${m.quantity} ${m.unit})`, 20, currentY);
    currentY += 5;
  });

  currentY += 6;

  // 6. Financial Summary Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(pageWidth - 95, currentY, 80, 36, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text('Custos de Materiais e MDF:', pageWidth - 90, currentY + 7);
  doc.text(`R$ ${project.materialsCost.toFixed(2)}`, pageWidth - 20, currentY + 7, { align: 'right' });

  doc.text('Ferragens Soft-Close e Puxadores:', pageWidth - 90, currentY + 14);
  doc.text(`R$ ${project.hardwareCost.toFixed(2)}`, pageWidth - 20, currentY + 14, { align: 'right' });

  doc.text('Mão de Obra e Instalação:', pageWidth - 90, currentY + 21);
  doc.text(`R$ ${project.laborCost.toFixed(2)}`, pageWidth - 20, currentY + 21, { align: 'right' });

  doc.setDrawColor(203, 213, 225);
  doc.line(pageWidth - 90, currentY + 24, pageWidth - 20, currentY + 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('TOTAL DO PROJETO:', pageWidth - 90, currentY + 31);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text(`R$ ${project.budgetTotal.toFixed(2)}`, pageWidth - 20, currentY + 31, { align: 'right' });

  // 7. Payment Terms on the Left
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('CONDIÇÕES DE PAGAMENTO:', 15, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text('• Opção 1: PIX à vista com 5% de desconto.', 15, currentY + 14);
  doc.text('• Opção 2: 50% de entrada no aceite + 50% na conclusão da instalação.', 15, currentY + 21);
  doc.text('• Opção 3: Parcelado em até 12x no Cartão de Crédito.', 15, currentY + 28);

  currentY += 46;

  // 8. Signatures Block
  doc.setDrawColor(203, 213, 225);
  doc.line(20, currentY + 14, 85, currentY + 14);
  doc.line(pageWidth - 85, currentY + 14, pageWidth - 20, currentY + 14);

  doc.setFontSize(8);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text('MARCENARIAPRO (CONTRATADA)', 52.5, currentY + 19, { align: 'center' });
  doc.text(`${(client?.name || project.clientName).toUpperCase()} (CONTRATANTE)`, pageWidth - 52.5, currentY + 19, {
    align: 'center',
  });

  return doc;
}
