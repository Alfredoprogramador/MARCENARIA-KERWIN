import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Project, Cabinet3DModule } from '../../types/marcenaria';
import {
  Camera,
  X,
  RotateCw,
  Move,
  Maximize,
  Minimize,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

interface ARViewProps {
  project: Project;
  onClose: () => void;
}

export const ARView: React.FC<ARViewProps> = ({ project, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(1);
  const [rotationY, setRotationY] = useState<number>(0);
  const [selectedModuleIdx, setSelectedModuleIdx] = useState<number>(0);
  const [snapshotTaken, setSnapshotTaken] = useState<string | null>(null);

  // Position state (normalized coordinates 0 to 1)
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // 3D Scene refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modMeshGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function initCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('API de Câmera não suportada neste navegador.');
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Rear camera on mobile
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setHasCamera(true);
      } catch (err: any) {
        console.warn('Câmera indisponível ou permissão negada, utilizando ambiente simulado:', err);
        setHasCamera(false);
        setErrorMessage(
          'Câmera não disponível no ambiente atual ou permissão não concedida. Você pode simular o posicionamento do móvel sobre um cenário de teste!'
        );
      }
    }

    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Initialize Three.js overlay
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.5, 2.5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight('#fffbeb', 1.5);
    dirLight.position.set(2, 4, 3);
    scene.add(dirLight);

    // Group for selected furniture
    const modMeshGroup = new THREE.Group();
    modMeshGroupRef.current = modMeshGroup;
    scene.add(modMeshGroup);

    // Contact shadow beneath
    const shadowGeo = new THREE.PlaneGeometry(1.6, 1.2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.01;
    scene.add(shadowPlane);

    let frameId = 0;
    const renderLoop = () => {
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    return () => {
      cancelAnimationFrame(frameId);
      renderer.dispose();
      scene.clear();
    };
  }, []);

  // Update 3D furniture mesh when module, scale, rotation or position changes
  useEffect(() => {
    if (!modMeshGroupRef.current) return;
    const group = modMeshGroupRef.current;

    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
      if ((obj as any).geometry) (obj as any).geometry.dispose();
    }

    const mod = project.modules[selectedModuleIdx] || project.modules[0];
    if (!mod) return;

    const w = (mod.dimensionsMm.width / 1000) * scale;
    const h = (mod.dimensionsMm.height / 1000) * scale;
    const d = (mod.dimensionsMm.depth / 1000) * scale;

    const woodMat = new THREE.MeshStandardMaterial({
      color: '#b45309', // Freijó
      roughness: 0.35,
      metalness: 0.05,
    });

    const carcassMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.4,
    });

    const handleMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.2,
      metalness: 0.8,
    });

    // Cabinet Main Box
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), woodMat);
    box.position.set(0, h / 2, 0);
    group.add(box);

    // Doors / Drawer lines
    if (mod.doorsCount > 0) {
      for (let i = 0; i < mod.doorsCount; i++) {
        const doorW = w / mod.doorsCount;
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.12, 0.012), handleMat);
        handle.position.set(
          -w / 2 + (i + 0.8) * doorW,
          h / 2,
          d / 2 + 0.01
        );
        group.add(handle);
      }
    }

    // Position and rotation from state
    group.position.set(pos.x, pos.y, 0);
    group.rotation.y = rotationY;
  }, [project.modules, selectedModuleIdx, scale, rotationY, pos]);

  // Handle Dragging
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = (e.clientX - lastMousePosRef.current.x) * 0.003;
    const dy = (e.clientY - lastMousePosRef.current.y) * 0.003;
    setPos((prev) => ({ x: prev.x + dx, y: prev.y - dy }));
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  // Capture photo of room with AR furniture
  const handleTakeSnapshot = () => {
    if (!canvasRef.current) return;
    const tempCanvas = document.createElement('canvas');
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    tempCanvas.width = width;
    tempCanvas.height = height;
    const ctx = tempCanvas.getContext('2d')!;

    // Draw background (video or mock room)
    if (videoRef.current && hasCamera) {
      ctx.drawImage(videoRef.current, 0, 0, width, height);
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '20px sans-serif';
      ctx.fillText('Ambiente Real Simulado', 40, 50);
    }

    // Draw 3D canvas on top
    ctx.drawImage(canvasRef.current, 0, 0, width, height);
    setSnapshotTaken(tempCanvas.toDataURL('image/jpeg', 0.9));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      {/* Top Bar */}
      <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-auto">
        <div className="bg-slate-900/90 border border-slate-700/80 backdrop-blur-md px-4 py-2 rounded-xl text-white flex items-center gap-2.5">
          <Camera className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-semibold">Realidade Aumentada (AR)</span>
          <span className="text-[11px] text-slate-400">Arraste para posicionar</span>
        </div>

        <button
          onClick={onClose}
          className="bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white p-2 rounded-xl transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* AR Viewport */}
      <div
        className="relative w-full h-full flex items-center justify-center overflow-hidden touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Background Video Stream from Real Camera */}
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className={`absolute inset-0 w-full h-full object-cover ${hasCamera ? 'block' : 'hidden'}`}
        />

        {/* Fallback Simulation Background if Camera is Blocked */}
        {!hasCamera && (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
            <div className="w-full max-w-md bg-slate-900/90 border border-slate-700 p-5 rounded-2xl mb-6 shadow-2xl">
              <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold mb-2 justify-center">
                <AlertTriangle className="w-4 h-4" /> Câmera em Modo Simulado
              </div>
              <p className="text-xs text-slate-300">{errorMessage}</p>
            </div>
            {/* Visual room grid perspective simulation */}
            <div className="w-80 h-48 border border-dashed border-slate-600 rounded-xl flex items-center justify-center">
              <span className="text-xs text-slate-500">Paredes do Ambiente / Superfície de Teste</span>
            </div>
          </div>
        )}

        {/* 3D WebGL Canvas Layer */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      </div>

      {/* Bottom AR Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-lg bg-slate-900/95 border border-slate-700/80 backdrop-blur-md rounded-2xl p-4 shadow-2xl text-slate-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-amber-400">Módulo Selecionado:</span>
          <select
            value={selectedModuleIdx}
            onChange={(e) => setSelectedModuleIdx(parseInt(e.target.value))}
            className="bg-slate-950 border border-slate-700 text-xs rounded-lg px-2.5 py-1 text-slate-200"
          >
            {project.modules.map((m, idx) => (
              <option key={m.id} value={idx}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Rotação Y</span>
              <span className="font-mono text-amber-400">{((rotationY * 180) / Math.PI).toFixed(0)}°</span>
            </div>
            <input
              type="range"
              min={-Math.PI}
              max={Math.PI}
              step="0.05"
              value={rotationY}
              onChange={(e) => setRotationY(parseFloat(e.target.value))}
              className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Escala</span>
              <span className="font-mono text-amber-400">{scale.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setPos({ x: 0, y: 0 });
              setRotationY(0);
              setScale(1);
            }}
            className="text-xs px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl flex items-center gap-1.5 border border-slate-700"
          >
            <RotateCw className="w-3.5 h-3.5" /> Redefinir Posição
          </button>

          <button
            onClick={handleTakeSnapshot}
            className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
          >
            <Camera className="w-4 h-4" /> Capturar Foto com Móvel
          </button>
        </div>
      </div>

      {/* Snapshot Modal */}
      {snapshotTaken && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 max-w-lg w-full">
            <div className="flex items-center justify-between mb-3 text-slate-100 font-semibold text-sm">
              <span>Foto do Móvel no Ambiente Real</span>
              <button onClick={() => setSnapshotTaken(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <img src={snapshotTaken} alt="AR Snapshot" className="w-full rounded-xl mb-3 border border-slate-800" />
            <div className="flex justify-end gap-2">
              <a
                href={snapshotTaken}
                download="marcenariapro_ar_snapshot.jpg"
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-4 py-2 rounded-xl"
              >
                Baixar Foto
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
