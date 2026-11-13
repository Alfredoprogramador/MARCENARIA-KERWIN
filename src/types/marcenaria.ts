export type GrainDirection = 'horizontal' | 'vertical' | 'indifferent';

export interface CutPiece {
  id: string;
  name: string;
  widthMm: number;
  lengthMm: number;
  thicknessMm: number;
  quantity: number;
  material: string;
  grain: GrainDirection;
  // Edge banding flags: C1 (Comprimento 1), C2 (Comprimento 2), L1 (Largura 1), L2 (Largura 2)
  edgeBanding: {
    c1: boolean;
    c2: boolean;
    l1: boolean;
    l2: boolean;
  };
  notes?: string;
  colorHex?: string;
}

export interface SheetDefinition {
  widthMm: number;  // Ex: 2750 mm
  lengthMm: number; // Ex: 1830 mm
  thicknessMm: number;
  material: string;
  kerfMm: number;    // Espessura da serra (ex: 3mm)
  trimMarginMm: number; // Refilo (ex: 10mm)
  costPerSheet: number;
}

export interface PlacedPiece {
  piece: CutPiece;
  pieceIndex: number;
  x: number;
  y: number;
  width: number;
  length: number;
  rotated: boolean;
}

export interface CutSheetResult {
  sheetIndex: number;
  sheet: SheetDefinition;
  placedPieces: PlacedPiece[];
  usedAreaMm2: number;
  totalAreaMm2: number;
  efficiencyPercent: number;
  leftoverCuts: { x: number; y: number; width: number; length: number }[];
}

export interface MaterialItem {
  id: string;
  name: string;
  category: 'MDF' | 'Ferragens' | 'Fita' | 'Puxadores' | 'Química/Cola' | 'Vidro' | 'Outros';
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  supplier?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  cpfCnpj?: string;
  address: string;
  city: string;
  state: string;
  notes: string;
  createdAt: string;
  projectsCount: number;
  totalSpent: number;
}

export interface Professional {
  id: string;
  name: string;
  role: 'Marceneiro Líder' | 'Marceneiro' | 'Montador' | 'Projetista 3D' | 'Acabador' | 'Ajudante';
  phone: string;
  email: string;
  hourlyRate: number;
  commissionPercentage: number;
  activeProjects: number;
  status: 'Disponível' | 'Em Obra' | 'Em Férias';
  rating: number;
  hireDate: string;
}

export type ProjectStatus =
  | 'Orçamento'
  | 'Medição'
  | 'Projeto 3D'
  | 'Aprovado'
  | 'Corte & Usinagem'
  | 'Montagem Oficina'
  | 'Instalação Obra'
  | 'Finalizado';

export interface Cabinet3DModule {
  id: string;
  name: string;
  type: 'base_cabinet' | 'wall_cabinet' | 'tall_cabinet' | 'wardrobe' | 'tv_panel' | 'bathroom_vanity' | 'floating_shelf';
  position: { x: number; y: number; z: number }; // In meters
  dimensionsMm: { width: number; height: number; depth: number };
  rotationY: number; // In radians or degrees
  finish: string;
  doorColor: string;
  carcassColor: string;
  doorsCount: number;
  drawersCount: number;
  shelvesCount: number;
  doorOpenAngle: number; // 0 to 1
  drawerSlideOut: number; // 0 to 1
}

export interface ProjectRoom {
  widthMm: number;   // Largura da sala
  lengthMm: number;  // Comprimento da sala
  heightMm: number;  // Pé direito (ex: 2600mm)
  wallColor: string;
  floorColor: string;
  hasWindow: boolean;
  windowPosition: { wall: 'north' | 'south' | 'east' | 'west'; widthMm: number; heightMm: number; elevationMm: number };
  hasDoor: boolean;
  doorPosition: { wall: 'north' | 'south' | 'east' | 'west'; widthMm: number; heightMm: number };
}

export interface Project {
  id: string;
  title: string;
  clientId: string;
  clientName: string;
  environment: string; // Cozinha, Dormitório, Home Theater, etc.
  status: ProjectStatus;
  budgetTotal: number;
  materialsCost: number;
  laborCost: number;
  hardwareCost: number;
  profitMarginPercent: number;
  createdAt: string;
  deliveryDate: string;
  measurementDate?: string;
  installationDate?: string;
  assignedProfessionalId?: string;
  room: ProjectRoom;
  modules: Cabinet3DModule[];
  cutPieces: CutPiece[];
  materials: MaterialItem[];
  notes?: string;
  driveFolderId?: string;
  calendarEventId?: string;
  photoUrl?: string;
}

export interface FinancialEntry {
  id: string;
  projectId?: string;
  projectTitle?: string;
  type: 'income' | 'expense';
  category: 'Entrada de Cliente' | 'Parcela Obra' | 'Compra MDF' | 'Ferragens' | 'Salários/Mão de Obra' | 'Ferramentas' | 'Combustível/Frete' | 'Outros';
  amount: number;
  date: string;
  description: string;
  paymentMethod: 'PIX' | 'Cartão Crédito' | 'Boleto' | 'Transferência' | 'Dinheiro';
  status: 'Confirmado' | 'Pendente' | 'Cancelado';
}

export interface InAppMessage {
  id: string;
  projectId?: string;
  senderName: string;
  senderRole: 'Marcenaria' | 'Cliente' | 'Montador';
  content: string;
  timestamp: string;
  imageUrl?: string;
  isStatusAlert?: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'project_status' | 'financial' | 'calendar' | 'security' | 'system';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export interface UserSecurityProfile {
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  recoveryCodes: string[];
  lastBackupDate?: string;
  sessionExpiryHours: number;
}
