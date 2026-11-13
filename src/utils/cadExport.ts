import { Project, Cabinet3DModule } from '../types/marcenaria';

/**
 * Generate standard AutoCAD ASCII DXF format containing 2D room floorplan,
 * furniture layout, and dimensions.
 */
export function generateAutoCAD_DXF(project: Project): string {
  const room = project.room;
  const modules = project.modules;

  let dxf = '';

  // DXF Header
  dxf += '0\nSECTION\n2\nHEADER\n';
  dxf += '9\n$ACADVER\n1\nAC1015\n'; // AutoCAD 2000 format, universally compatible
  dxf += '9\n$INSUNITS\n70\n4\n';    // Millimeters
  dxf += '0\nENDSEC\n';

  // DXF Tables & Layers
  dxf += '0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n';

  const layers = [
    { name: 'PAREDES', color: 7 }, // White
    { name: 'MOVEIS_MARCENARIA', color: 1 }, // Red
    { name: 'PORTAS_GAVETAS', color: 3 }, // Green
    { name: 'COTAS_DIMENSOES', color: 4 }, // Cyan
    { name: 'TEXTOS_PROJETO', color: 2 }, // Yellow
  ];

  layers.forEach((l) => {
    dxf += '0\nLAYER\n2\n' + l.name + '\n70\n0\n62\n' + l.color + '\n6\nCONTINUOUS\n';
  });

  dxf += '0\nENDTAB\n0\nENDSEC\n';

  // DXF Entities
  dxf += '0\nSECTION\n2\nENTITIES\n';

  // Helper to add a 2D line
  const addLine = (x1: number, y1: number, x2: number, y2: number, layer: string) => {
    dxf += `0\nLINE\n8\n${layer}\n10\n${x1.toFixed(2)}\n20\n${y1.toFixed(2)}\n30\n0.0\n11\n${x2.toFixed(2)}\n21\n${y2.toFixed(2)}\n31\n0.0\n`;
  };

  // Helper to add text
  const addText = (text: string, x: number, y: number, height: number, layer: string) => {
    dxf += `0\nTEXT\n8\n${layer}\n10\n${x.toFixed(2)}\n20\n${y.toFixed(2)}\n30\n0.0\n40\n${height}\n1\n${text}\n`;
  };

  // 1. Room Boundary (PAREDES)
  const rw = room.widthMm;
  const rl = room.lengthMm;
  addLine(0, 0, rw, 0, 'PAREDES');
  addLine(rw, 0, rw, rl, 'PAREDES');
  addLine(rw, rl, 0, rl, 'PAREDES');
  addLine(0, rl, 0, 0, 'PAREDES');

  // Room Dimensions (COTAS_DIMENSOES)
  addText(`LARGURA: ${rw} mm`, rw / 2 - 200, -80, 50, 'COTAS_DIMENSOES');
  addText(`COMPRIMENTO: ${rl} mm`, -120, rl / 2, 50, 'COTAS_DIMENSOES');
  addText(`PÉ DIREITO: ${room.heightMm} mm`, rw / 2 - 200, rl + 60, 50, 'COTAS_DIMENSOES');

  // Project title text
  addText(
    `PROJETO: ${project.title.toUpperCase()} - CLIENTE: ${project.clientName.toUpperCase()}`,
    50,
    rl - 100,
    70,
    'TEXTOS_PROJETO'
  );

  // 2. Furniture Modules (MOVEIS_MARCENARIA)
  modules.forEach((mod) => {
    // Convert 3D scene position (meters) to 2D floorplan (mm)
    const posX = rw / 2 + mod.position.x * 1000 - mod.dimensionsMm.width / 2;
    const posY = rl / 2 + mod.position.z * 1000 - mod.dimensionsMm.depth / 2;
    const w = mod.dimensionsMm.width;
    const d = mod.dimensionsMm.depth;

    // Outer box
    addLine(posX, posY, posX + w, posY, 'MOVEIS_MARCENARIA');
    addLine(posX + w, posY, posX + w, posY + d, 'MOVEIS_MARCENARIA');
    addLine(posX + w, posY + d, posX, posY + d, 'MOVEIS_MARCENARIA');
    addLine(posX, posY + d, posX, posY, 'MOVEIS_MARCENARIA');

    // Label inside module
    addText(
      `${mod.name} (${w}x${mod.dimensionsMm.height}x${d})`,
      posX + 10,
      posY + d / 2,
      25,
      'TEXTOS_PROJETO'
    );

    // Front door/drawer line
    addLine(posX, posY + d, posX + w, posY + d, 'PORTAS_GAVETAS');
  });

  dxf += '0\nENDSEC\n0\nEOF\n';
  return dxf;
}

/**
 * Generate 3D Wavefront OBJ (.obj) model export directly compatible with SketchUp,
 * AutoCAD 3D, Blender, and Revit.
 */
export function generateSketchUp_OBJ(project: Project): { obj: string; mtl: string } {
  let obj = '# MarcenariaPro 3D CAD Export\n';
  obj += `# Projeto: ${project.title}\n`;
  obj += `# Cliente: ${project.clientName}\n`;
  obj += 'mtllib materials.mtl\n\n';

  let mtl = '# MarcenariaPro Material Library\n\n';
  mtl += 'newmtl Freijo\nKd 0.65 0.45 0.28\nKs 0.2 0.2 0.2\nNs 30\n\n';
  mtl += 'newmtl MDF_Branco\nKd 0.92 0.92 0.94\nKs 0.1 0.1 0.1\nNs 40\n\n';
  mtl += 'newmtl Grafite_Matt\nKd 0.25 0.26 0.28\nKs 0.1 0.1 0.1\nNs 20\n\n';
  mtl += 'newmtl Metal_Puxador\nKd 0.8 0.8 0.82\nKs 0.9 0.9 0.95\nNs 120\n\n';

  let vCount = 1;

  // Helper to add a 3D box (6 faces, 8 vertices)
  const addBox3D = (
    name: string,
    materialName: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number
  ) => {
    obj += `o ${name.replace(/\s+/g, '_')}\n`;
    obj += `usemtl ${materialName}\n`;

    const x0 = x - w / 2;
    const x1 = x + w / 2;
    const y0 = y;
    const y1 = y + h;
    const z0 = z - d / 2;
    const z1 = z + d / 2;

    // 8 Vertices
    obj += `v ${x0} ${y0} ${z0}\n`;
    obj += `v ${x1} ${y0} ${z0}\n`;
    obj += `v ${x1} ${y1} ${z0}\n`;
    obj += `v ${x0} ${y1} ${z0}\n`;
    obj += `v ${x0} ${y0} ${z1}\n`;
    obj += `v ${x1} ${y0} ${z1}\n`;
    obj += `v ${x1} ${y1} ${z1}\n`;
    obj += `v ${x0} ${y1} ${z1}\n`;

    const c = vCount;
    // 6 Quads / Faces
    obj += `f ${c} ${c + 1} ${c + 2} ${c + 3}\n`; // Front
    obj += `f ${c + 5} ${c + 4} ${c + 7} ${c + 6}\n`; // Back
    obj += `f ${c + 4} ${c} ${c + 3} ${c + 7}\n`; // Left
    obj += `f ${c + 1} ${c + 5} ${c + 6} ${c + 2}\n`; // Right
    obj += `f ${c + 3} ${c + 2} ${c + 6} ${c + 7}\n`; // Top
    obj += `f ${c + 4} ${c + 5} ${c + 1} ${c}\n`; // Bottom

    vCount += 8;
  };

  // Add room floor
  const rw = project.room.widthMm / 1000;
  const rl = project.room.lengthMm / 1000;
  addBox3D('Piso_Ambiente', 'MDF_Branco', 0, -0.05, 0, rw, 0.05, rl);

  // Add all furniture modules
  project.modules.forEach((mod: Cabinet3DModule) => {
    const w = mod.dimensionsMm.width / 1000;
    const h = mod.dimensionsMm.height / 1000;
    const d = mod.dimensionsMm.depth / 1000;
    const mat = mod.finish.includes('Branco') ? 'MDF_Branco' : mod.finish.includes('Grafite') ? 'Grafite_Matt' : 'Freijo';

    addBox3D(mod.name, mat, mod.position.x, mod.position.y, mod.position.z, w, h, d);
  });

  return { obj, mtl };
}

/**
 * Trigger file download directly in browser
 */
export function downloadFile(filename: string, content: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
