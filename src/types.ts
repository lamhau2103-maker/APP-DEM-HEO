export type CountDirection = 'IN_TO_OUT' | 'OUT_TO_IN';

export type UserRole = 'admin' | 'user';

export interface AuthUser {
  email: string;
  name: string;
  role: UserRole;
}

export interface ApprovedUser {
  email: string;
  name: string;
  approvedAt: string;
}

export interface PendingApproval {
  id: string;
  email: string;
  name: string;
  requestedAt: string;
}

export type NavTab = 'camera' | 'reports' | 'ai_params' | 'admin';

export interface Point2D {
  x: number;
  y: number;
}

export interface LineZonePoints {
  p1: Point2D;
  p2: Point2D;
}

export interface PigTrack {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  history: Array<{ x: number; y: number }>;
  confidence: number;
  crossed: boolean;
  crossedDirection?: CountDirection;
  color: string;
  speed: number;
  lastSeen: number;
  isPig: boolean;
}

export interface CrossingEvent {
  id: string;
  pigId: number;
  timestamp: string;
  timeFormatted: string;
  direction: CountDirection;
  snapshotUrl?: string;
}

export interface BatchInfo {
  farmName: string;
  pigType: string;
  licensePlate: string;
  deckNumber: string;
  driverName: string;
  inspectorName: string;
  expectedCount: number;
  notes: string;
}

export interface BatchRecord {
  id: string;
  code: string;
  farmName: string;
  pigType: string;
  licensePlate: string;
  deckNumber: string;
  driverName: string;
  inspectorName: string;
  expectedCount: number;
  actualCount: number;
  forwardCount: number;
  backwardCount: number;
  startTime: string;
  endTime: string;
  notes: string;
  snapshotUrl?: string;
  directionMode: CountDirection;
  eventsCount: number;
}

export interface ModelInfo {
  loaded: boolean;
  name: string;
  source: 'onnx_file' | 'default_onnx' | 'fallback_cv';
  classes: string[];
  inputShape?: number[];
  error?: string;
}
