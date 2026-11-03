import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Project, Cabinet3DModule } from '../../types/marcenaria';
import { generateAutoCAD_DXF, generateSketchUp_OBJ, downloadFile } from '../../utils/cadExport';
import { uploadFileToDrive } from '../../services/workspace';
import {
  Box,
  Layers,
  Camera,
  Download,
  CloudUpload,
  Maximize2,
  Eye,
  Sliders,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Plus,
  Trash2,
} from 'lucide-react';

interface ThreeDStudioProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onOpenAR?: () => void;
  googleTokenAvailable?: boolean;
}

export const ThreeDStudio: React.FC<ThreeDStudioProps> = ({
  project,
  onUpdateProject,
  onOpenAR,
  googleTokenAvailable,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [explodedView, setExplodedView] = useState<number>(0);
  const [doorOpenAngle, setDoorOpenAngle] = useState<number>(0);
  const [drawerSlide, setDrawerSlide] = useState<number>(0);
  const [activeFinish, setActiveFinish] = useState<string>('Freijó Natural');
  const [viewMode, setViewMode] = useState<'shaded' | 'wireframe' | 'xray'>('shaded');
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'controls' | 'modules' | 'export'>('controls');
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // References for Three.js state
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const furnitureGroupRef = useRef<THREE.Group | null>(null);
  const animFrameIdRef = useRef<number>(0);

  // Procedural wood floor texture generator
  const createWoodTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#c79f67';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#a67d47';
    ctx.lineWidth = 2;
    for (let i = 0; i < 512; i += 64) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();

      for (let j = 0; j < 512; j += 128) {
        ctx.beginPath();
        ctx.moveTo(j + (i % 128 === 0 ? 0 : 64), i);
        ctx.lineTo(j + (i % 128 === 0 ? 0 : 64), i + 64);
        ctx.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Detect software WebGL as instructed by Three.js skill
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f172a'); // slate-900
    scene.fog = new THREE.Fog('#0f172a', 6, 18);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(3.2, 2.5, 4.2);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.replaceChildren(renderer.domElement);

    // Studio Environment map using PMREMGenerator & RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Don't go below floor
    controls.minDistance = 1;
    controls.maxDistance = 12;
    controls.target.set(0, 0.8, 0);
    controlsRef.current = controls;

    // Studio Lighting Rig
    const warmKeyLight = new THREE.DirectionalLight('#fff5ea', 1.8);
    warmKeyLight.position.set(4, 5, 3);
    warmKeyLight.castShadow = !isSoftwareGl;
    warmKeyLight.shadow.mapSize.width = 1024;
    warmKeyLight.shadow.mapSize.height = 1024;
    warmKeyLight.shadow.bias = -0.0005;
    warmKeyLight.shadow.normalBias = 0.02;
    scene.add(warmKeyLight);

    const coolHemiLight = new THREE.HemisphereLight('#60a5fa', '#334155', 0.9);
    scene.add(coolHemiLight);

    const rimLight = new THREE.DirectionalLight('#e2e8f0', 0.7);
    rimLight.position.set(-3, 3, -4);
    scene.add(rimLight);

    // Group for furniture and room elements
    const furnitureGroup = new THREE.Group();
    furnitureGroupRef.current = furnitureGroup;
    scene.add(furnitureGroup);

    // Procedural Room (Walls and Floor)
    const roomW = project.room.widthMm / 1000;
    const roomL = project.room.lengthMm / 1000;
    const roomH = project.room.heightMm / 1000;

    // Floor with procedural wood texture
    const floorGeo = new THREE.PlaneGeometry(roomW, roomL);
    const floorMat = new THREE.MeshStandardMaterial({
      map: createWoodTexture(),
      roughness: 0.35,
      metalness: 0.05,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = !isSoftwareGl;
    scene.add(floorMesh);

    // Baseboards (Rodapés de madeira)
    const baseboardMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.4,
    });
    const backBaseboard = new THREE.Mesh(
      new THREE.BoxGeometry(roomW, 0.08, 0.02),
      baseboardMat
    );
    backBaseboard.position.set(0, 0.04, -roomL / 2 + 0.01);
    scene.add(backBaseboard);

    // Back wall
    const wallMat = new THREE.MeshStandardMaterial({
      color: project.room.wallColor || '#f1f5f9',
      roughness: 0.85,
    });
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(roomW, roomH, 0.08),
      wallMat
    );
    backWall.position.set(0, roomH / 2, -roomL / 2 - 0.04);
    backWall.receiveShadow = !isSoftwareGl;
    scene.add(backWall);

    // Left wall
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, roomH, roomL),
      wallMat
    );
    leftWall.position.set(-roomW / 2 - 0.04, roomH / 2, 0);
    leftWall.receiveShadow = !isSoftwareGl;
    scene.add(leftWall);

    // Grid helper on floor for precision carpentry reference
    const grid = new THREE.GridHelper(Math.max(roomW, roomL) + 1, 10, '#475569', '#1e293b');
    grid.position.y = 0.001;
    scene.add(grid);

    // Render loop
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      animFrameIdRef.current = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animFrameIdRef.current);
      renderer.dispose();
      scene.clear();
    };
  }, [project.room.widthMm, project.room.lengthMm, project.room.heightMm]);

  // Re-build 3D Furniture Models whenever modules, finishes, or sliders change
  useEffect(() => {
    if (!furnitureGroupRef.current) return;
    const group = furnitureGroupRef.current;

    // Clear previous meshes
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
      if ((obj as any).geometry) (obj as any).geometry.dispose();
    }

    // Material library
    const woodColor =
      activeFinish === 'Freijó Natural'
        ? '#b45309'
        : activeFinish === 'Carvalho Americano'
        ? '#92400e'
        : activeFinish === 'Grafite Matt'
        ? '#334155'
        : activeFinish === 'Nero Marquina'
        ? '#18181b'
        : '#e2e8f0';

    const carcassMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.5,
      wireframe: viewMode === 'wireframe',
      transparent: viewMode === 'xray',
      opacity: viewMode === 'xray' ? 0.4 : 1,
    });

    const finishMat = new THREE.MeshStandardMaterial({
      color: woodColor,
      roughness: 0.35,
      metalness: 0.08,
      wireframe: viewMode === 'wireframe',
      transparent: viewMode === 'xray',
      opacity: viewMode === 'xray' ? 0.6 : 1,
    });

    const countertopMat = new THREE.MeshStandardMaterial({
      color: '#f1f5f9',
      roughness: 0.15,
      metalness: 0.1,
      wireframe: viewMode === 'wireframe',
    });

    const handleMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.2,
      metalness: 0.9,
    });

    // Build each modular cabinet as a 4-10 part THREE.Group as instructed by Three.js skill
    project.modules.forEach((mod: Cabinet3DModule, modIdx: number) => {
      const modGroup = new THREE.Group();
      const w = mod.dimensionsMm.width / 1000;
      const h = mod.dimensionsMm.height / 1000;
      const d = mod.dimensionsMm.depth / 1000;

      // Exploded view offset
      const explodeOffset = (modIdx - project.modules.length / 2) * explodedView * 0.4;
      modGroup.position.set(
        mod.position.x + explodeOffset,
        mod.position.y,
        mod.position.z
      );

      // 1. Carcass Box (Caixaria MDF 18mm)
      const t = 0.018; // 18mm MDF thickness
      // Left side
      const leftSide = new THREE.Mesh(new THREE.BoxGeometry(t, h, d), carcassMat);
      leftSide.position.set(-w / 2 + t / 2, h / 2, 0);
      modGroup.add(leftSide);

      // Right side
      const rightSide = new THREE.Mesh(new THREE.BoxGeometry(t, h, d), carcassMat);
      rightSide.position.set(w / 2 - t / 2, h / 2, 0);
      modGroup.add(rightSide);

      // Bottom base
      const bottomBase = new THREE.Mesh(new THREE.BoxGeometry(w - t * 2, t, d), carcassMat);
      bottomBase.position.set(0, t / 2, 0);
      modGroup.add(bottomBase);

      // Top ceiling
      const topCeiling = new THREE.Mesh(new THREE.BoxGeometry(w - t * 2, t, d), carcassMat);
      topCeiling.position.set(0, h - t / 2, 0);
      modGroup.add(topCeiling);

      // Back panel (Fundo 6mm)
      const backPanel = new THREE.Mesh(new THREE.BoxGeometry(w - t * 2, h - t * 2, 0.006), carcassMat);
      backPanel.position.set(0, h / 2, -d / 2 + 0.003);
      modGroup.add(backPanel);

      // Base plinth / rodapé
      if (mod.type === 'base_cabinet' || mod.type === 'wardrobe') {
        const plinth = new THREE.Mesh(new THREE.BoxGeometry(w - 0.04, 0.1, d - 0.08), finishMat);
        plinth.position.set(0, -0.05, 0);
        modGroup.add(plinth);

        // Countertop (Bancada)
        if (mod.type === 'base_cabinet') {
          const countertop = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.03, d + 0.04), countertopMat);
          countertop.position.set(0, h + 0.015, 0.01);
          countertop.castShadow = true;
          modGroup.add(countertop);
        }
      }

      // Internal Shelves
      if (mod.shelvesCount > 0) {
        for (let s = 1; s <= mod.shelvesCount; s++) {
          const shelfY = (h / (mod.shelvesCount + 1)) * s;
          const shelf = new THREE.Mesh(new THREE.BoxGeometry(w - t * 2, t, d - 0.02), carcassMat);
          shelf.position.set(0, shelfY, 0.01);
          modGroup.add(shelf);
        }
      }

      // Animated Doors or Drawers
      if (mod.doorsCount > 0) {
        const doorWidth = (w - 0.004 * mod.doorsCount) / mod.doorsCount;
        for (let dIdx = 0; dIdx < mod.doorsCount; dIdx++) {
          const doorPivot = new THREE.Group();
          const isLeft = dIdx === 0;
          const hingeX = isLeft
            ? -w / 2 + t + dIdx * doorWidth
            : -w / 2 + t + (dIdx + 1) * doorWidth;

          doorPivot.position.set(hingeX, h / 2, d / 2 + 0.01);

          const doorMesh = new THREE.Mesh(
            new THREE.BoxGeometry(doorWidth, h - 0.006, t),
            finishMat
          );
          doorMesh.position.set(isLeft ? doorWidth / 2 : -doorWidth / 2, 0, 0);
          doorMesh.castShadow = true;
          doorPivot.add(doorMesh);

          // Handle (Puxador Perfil)
          const handle = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.16, 0.015), handleMat);
          handle.position.set(isLeft ? doorWidth - 0.04 : -doorWidth + 0.04, 0, 0.015);
          doorPivot.add(handle);

          // Open animation
          const openRad = THREE.MathUtils.degToRad(doorOpenAngle * 85);
          doorPivot.rotation.y = isLeft ? -openRad : openRad;

          modGroup.add(doorPivot);
        }
      }

      // Drawers
      if (mod.drawersCount > 0) {
        const drawerHeight = (h - 0.01 * mod.drawersCount) / mod.drawersCount;
        for (let g = 0; g < mod.drawersCount; g++) {
          const drawerGroup = new THREE.Group();
          const drawerY = g * drawerHeight + drawerHeight / 2;
          const slideOutDist = drawerSlide * 0.35; // slide up to 35cm

          drawerGroup.position.set(0, drawerY, d / 2 + 0.01 + slideOutDist);

          // Front panel
          const drawerFront = new THREE.Mesh(
            new THREE.BoxGeometry(w - 0.006, drawerHeight - 0.006, t),
            finishMat
          );
          drawerGroup.add(drawerFront);

          // Handle
          const dHandle = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.015, 0.02), handleMat);
          dHandle.position.set(0, 0, 0.012);
          drawerGroup.add(dHandle);

          // Internal drawer box when slid out
          if (drawerSlide > 0.05) {
            const innerBox = new THREE.Mesh(
              new THREE.BoxGeometry(w - t * 3, drawerHeight - 0.04, d - 0.05),
              carcassMat
            );
            innerBox.position.set(0, -0.01, -d / 2);
            drawerGroup.add(innerBox);
          }

          modGroup.add(drawerGroup);
        }
      }

      // 3D Dimension cota tag (above cabinet)
      const cotaGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-w / 2, h + 0.08, d / 2),
        new THREE.Vector3(w / 2, h + 0.08, d / 2),
      ]);
      const cotaLine = new THREE.Line(cotaGeo, new THREE.LineBasicMaterial({ color: '#38bdf8' }));
      modGroup.add(cotaLine);

      group.add(modGroup);
    });
  }, [
    project.modules,
    explodedView,
    doorOpenAngle,
    drawerSlide,
    activeFinish,
    viewMode,
  ]);

  // Camera presets
  const setCameraView = (view: 'perspective' | 'top' | 'front') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    if (view === 'perspective') {
      camera.position.set(3.2, 2.5, 4.2);
      controls.target.set(0, 0.8, 0);
    } else if (view === 'top') {
      camera.position.set(0, 5.5, 0.01);
      controls.target.set(0, 0, 0);
    } else if (view === 'front') {
      camera.position.set(0, 1.2, 4.5);
      controls.target.set(0, 1.2, 0);
    }
    controls.update();
  };

  // Export handlers
  const handleExportDXF = () => {
    const dxfString = generateAutoCAD_DXF(project);
    downloadFile(
      `${project.title.toLowerCase().replace(/\s+/g, '_')}_autocad.dxf`,
      dxfString,
      'application/dxf'
    );
  };

  const handleExportOBJ = () => {
    const { obj } = generateSketchUp_OBJ(project);
    downloadFile(
      `${project.title.toLowerCase().replace(/\s+/g, '_')}_sketchup.obj`,
      obj,
      'text/plain'
    );
  };

  const handleUploadToDrive = async () => {
    if (!googleTokenAvailable) {
      alert('Conecte sua conta Google no menu superior para salvar diretamente no Google Drive.');
      return;
    }
    setUploadStatus('Enviando para o Google Drive...');
    try {
      const dxfContent = generateAutoCAD_DXF(project);
      const fileName = `Planta3D_${project.title}_${Date.now()}.dxf`;
      const res = await uploadFileToDrive(fileName, dxfContent, 'application/dxf');
      setUploadStatus(`Salvo no Google Drive com sucesso! ID: ${res.id}`);
      setTimeout(() => setUploadStatus(null), 4000);
    } catch (err: any) {
      setUploadStatus(`Erro ao salvar no Drive: ${err.message}`);
      setTimeout(() => setUploadStatus(null), 5000);
    }
  };

  // Add modular cabinet to current room
  const handleAddModule = (type: Cabinet3DModule['type']) => {
    const newMod: Cabinet3DModule = {
      id: `mod-${Date.now()}`,
      name:
        type === 'base_cabinet'
          ? 'Balcão Inferior 2 Portas'
          : type === 'wall_cabinet'
          ? 'Armário Aéreo Basculante'
          : type === 'wardrobe'
          ? 'Guarda-Roupas 2 Portas'
          : type === 'tv_panel'
          ? 'Painel Home Theater Ripado'
          : 'Módulo Planejado',
      type,
      position: { x: (project.modules.length % 3) * 0.7 - 0.7, y: type === 'wall_cabinet' ? 1.5 : 0, z: -1.2 },
      dimensionsMm: {
        width: type === 'tv_panel' ? 1800 : type === 'wardrobe' ? 1200 : 800,
        height: type === 'wall_cabinet' ? 700 : type === 'wardrobe' ? 2200 : 850,
        depth: type === 'wall_cabinet' ? 360 : type === 'wardrobe' ? 580 : 600,
      },
      rotationY: 0,
      finish: activeFinish,
      doorColor: '#b45309',
      carcassColor: '#f8fafc',
      doorsCount: type === 'base_cabinet' ? 2 : type === 'wall_cabinet' ? 2 : 0,
      drawersCount: type === 'base_cabinet' ? 1 : 0,
      shelvesCount: 1,
      doorOpenAngle: 0,
      drawerSlideOut: 0,
    };

    onUpdateProject({
      ...project,
      modules: [...project.modules, newMod],
    });
  };

  return (
    <div className="relative w-full h-[720px] rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-950 shadow-2xl flex flex-col select-none">
      {/* Top Floating Header & Info Badge */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
        <div className="bg-slate-900/90 border border-slate-700/70 backdrop-blur-md px-3.5 py-2 rounded-xl flex items-center gap-2.5 shadow-lg text-slate-100">
          <Box className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-semibold tracking-wide uppercase">Planta 3D Detalhada</span>
          <span className="text-xs text-slate-400">
            ({project.room.widthMm} x {project.room.lengthMm} x {project.room.heightMm} mm)
          </span>
        </div>

        {uploadStatus && (
          <div className="bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs px-3 py-1.5 rounded-lg shadow-lg">
            {uploadStatus}
          </div>
        )}
      </div>

      {/* Top Right AR & Quick View buttons */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {onOpenAR && (
          <button
            onClick={onOpenAR}
            className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-lg transition active:scale-95"
            title="Abrir Realidade Aumentada com Câmera"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Ver em Realidade Aumentada (AR)</span>
          </button>
        )}
      </div>

      {/* 3D WebGL Canvas Mount Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Collapsible Unified Bottom Control Dock (Zero Viewport Occlusion) */}
      <div
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[95%] max-w-4xl transition-all duration-300 ease-in-out ${
          isDockCollapsed ? 'translate-y-[calc(100%-36px)]' : 'translate-y-0'
        }`}
      >
        {/* Collapse Toggle Pill */}
        <div className="flex justify-center mb-1">
          <button
            onClick={() => setIsDockCollapsed(!isDockCollapsed)}
            className="bg-slate-900/95 border border-slate-700/80 text-slate-300 hover:text-white px-4 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 shadow-md backdrop-blur-md transition"
          >
            {isDockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Mostrar Painel Técnico</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Ocultar Painel</span>
              </>
            )}
          </button>
        </div>

        {/* Glassmorphic Dock Container */}
        <div className="bg-slate-900/95 border border-slate-700/80 backdrop-blur-md rounded-2xl p-4 shadow-2xl text-slate-200">
          {/* Tabs row */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('controls')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                  activeTab === 'controls'
                    ? 'bg-amber-600/30 text-amber-400 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                Simulação & Ajustes
              </button>
              <button
                onClick={() => setActiveTab('modules')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                  activeTab === 'modules'
                    ? 'bg-amber-600/30 text-amber-400 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                Módulos ({project.modules.length})
              </button>
              <button
                onClick={() => setActiveTab('export')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                  activeTab === 'export'
                    ? 'bg-amber-600/30 text-amber-400 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                Exportação CAD & Drive
              </button>
            </div>

            {/* Camera Angle Presets */}
            <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setCameraView('perspective')}
                className="text-[11px] px-2.5 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
                title="Perspectiva 3D"
              >
                3D Livre
              </button>
              <button
                onClick={() => setCameraView('top')}
                className="text-[11px] px-2.5 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
                title="Planta Baixa Superior"
              >
                Planta Baixa
              </button>
              <button
                onClick={() => setCameraView('front')}
                className="text-[11px] px-2.5 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
                title="Elevação Frontal"
              >
                Elevação
              </button>
            </div>
          </div>

          {/* Tab 1: Simulation & Sliders */}
          {activeTab === 'controls' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              {/* Exploded View Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Vista Explodida</span>
                  <span className="text-amber-400 font-mono">{(explodedView * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={explodedView}
                  onChange={(e) => setExplodedView(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Doors Open Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Abertura Portas</span>
                  <span className="text-amber-400 font-mono">{(doorOpenAngle * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={doorOpenAngle}
                  onChange={(e) => setDoorOpenAngle(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Drawers Slide */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Deslizar Gavetas</span>
                  <span className="text-amber-400 font-mono">{(drawerSlide * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={drawerSlide}
                  onChange={(e) => setDrawerSlide(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Finishes Swatches */}
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 block">Padrão MDF / Tamponamento</span>
                <div className="flex items-center gap-1.5">
                  {[
                    { name: 'Freijó Natural', color: '#b45309' },
                    { name: 'Carvalho Americano', color: '#92400e' },
                    { name: 'Grafite Matt', color: '#334155' },
                    { name: 'MDF Branco TX', color: '#e2e8f0' },
                  ].map((f) => (
                    <button
                      key={f.name}
                      onClick={() => setActiveFinish(f.name)}
                      title={f.name}
                      style={{ backgroundColor: f.color }}
                      className={`w-6 h-6 rounded-full border-2 transition ${
                        activeFinish === f.name ? 'border-amber-400 scale-110 shadow-md' : 'border-slate-700 opacity-80'
                      }`}
                    />
                  ))}
                  <button
                    onClick={() => setViewMode(viewMode === 'shaded' ? 'xray' : viewMode === 'xray' ? 'wireframe' : 'shaded')}
                    className="ml-auto text-[11px] px-2 py-1 bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700"
                  >
                    {viewMode === 'shaded' ? 'Raio-X' : viewMode === 'xray' ? 'Wireframe' : 'Sólido'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Module Management */}
          {activeTab === 'modules' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Adicionar Módulo Rápido:</span>
                <button
                  onClick={() => handleAddModule('base_cabinet')}
                  className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1 border border-slate-700"
                >
                  <Plus className="w-3 h-3" /> Balcão Inferior
                </button>
                <button
                  onClick={() => handleAddModule('wall_cabinet')}
                  className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1 border border-slate-700"
                >
                  <Plus className="w-3 h-3" /> Armário Aéreo
                </button>
                <button
                  onClick={() => handleAddModule('wardrobe')}
                  className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1 border border-slate-700"
                >
                  <Plus className="w-3 h-3" /> Guarda-Roupas
                </button>
                <button
                  onClick={() => handleAddModule('tv_panel')}
                  className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1 border border-slate-700"
                >
                  <Plus className="w-3 h-3" /> Painel TV
                </button>
              </div>

              {/* List of current modules */}
              <div className="flex gap-2 overflow-x-auto pb-1 max-h-24">
                {project.modules.map((m, idx) => (
                  <div
                    key={m.id}
                    className="flex-shrink-0 bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl text-xs flex items-center gap-3"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">{m.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {m.dimensionsMm.width} x {m.dimensionsMm.height} x {m.dimensionsMm.depth} mm
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const updated = project.modules.filter((_, i) => i !== idx);
                        onUpdateProject({ ...project, modules: updated });
                      }}
                      className="text-red-400 hover:text-red-300 p-1 hover:bg-red-950/40 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: CAD Export & Cloud Drive */}
          {activeTab === 'export' && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-300">
                <span className="font-semibold text-amber-400">Integração Direta com Softwares Profissionais:</span>
                <p className="text-[11px] text-slate-400">
                  Exporte o layout 3D paramétrico para AutoCAD (.DXF com camadas de paredes e cotas) ou SketchUp (.OBJ com materiais).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportDXF}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 border border-slate-700 transition"
                  title="Baixar arquivo DXF 2D/3D para AutoCAD"
                >
                  <Download className="w-3.5 h-3.5 text-red-400" />
                  <span>AutoCAD (.DXF)</span>
                </button>

                <button
                  onClick={handleExportOBJ}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 border border-slate-700 transition"
                  title="Baixar modelo Wavefront OBJ para SketchUp"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>SketchUp (.OBJ)</span>
                </button>

                <button
                  onClick={handleUploadToDrive}
                  className="bg-amber-600 hover:bg-amber-500 text-white text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 transition shadow-md active:scale-95"
                  title="Salvar no Google Drive conectado"
                >
                  <CloudUpload className="w-3.5 h-3.5" />
                  <span>Salvar no Google Drive</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
