/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Upload,
  Play,
  Pause,
  RotateCcw,
  Printer,
  Sliders,
  Volume2,
  VolumeX,
  ArrowDownUp,
  Maximize2,
  Save,
  Cpu,
  Move,
  CheckCircle,
  FileText,
  ShieldCheck,
  LogOut,
  User,
  Lock,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  AuthUser,
  ApprovedUser,
  PendingApproval,
  NavTab,
  BatchRecord,
  CountDirection,
  CrossingEvent,
  PigTrack,
  Point2D,
  LineZonePoints,
} from './types';
import { PigTracker, DetectionBox } from './utils/pigTracker';
import { OnnxPigDetector, ModelStatusInfo } from './utils/onnxModel';
import { playCountSound, playReverseSound } from './utils/sound';
import { LoginScreen } from './components/LoginScreen';
import { ReportsTab } from './components/ReportsTab';
import { AiParamsTab } from './components/AiParamsTab';
import { AdminTab } from './components/AdminTab';
import { PrintDocket } from './components/PrintDocket';
import { LineSettingsModal } from './components/LineSettingsModal';

// Distance from point to segment
function distToSegment(p: Point2D, v: Point2D, w: Point2D) {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

export default function App() {
  // --- Authentication State (sessionStorage: Tự động xóa khi đóng tab/trình duyệt) ---
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      localStorage.removeItem('app_current_auth_user');
      const saved = sessionStorage.getItem('app_current_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Approved users list
  const [approvedUsers, setApprovedUsers] = useState<ApprovedUser[]>(() => {
    try {
      const saved = localStorage.getItem('app_approved_users_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [
      { email: 'lamhau2103@gmail.com', name: 'Lâm Hậu', approvedAt: '04/11/2026' },
      { email: 'khoheo@thaiviet.com', name: 'Kho Heo Trung Tâm', approvedAt: '04/11/2026' },
    ];
  });

  // Pending approval requests
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>(() => {
    try {
      const saved = localStorage.getItem('app_pending_approvals_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Active bottom navigation tab
  const [activeTab, setActiveTab] = useState<NavTab>('camera');

  // Persist authentication data in sessionStorage (tự động xóa khi tắt tab hoặc đóng ứng dụng)
  useEffect(() => {
    try {
      if (currentUser) {
        sessionStorage.setItem('app_current_auth_user', JSON.stringify(currentUser));
      } else {
        sessionStorage.removeItem('app_current_auth_user');
      }
    } catch {
      // ignore
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem('app_approved_users_v1', JSON.stringify(approvedUsers));
    } catch {
      // ignore
    }
  }, [approvedUsers]);

  useEffect(() => {
    try {
      localStorage.setItem('app_pending_approvals_v1', JSON.stringify(pendingApprovals));
    } catch {
      // ignore
    }
  }, [pendingApprovals]);

  // Auth Handlers
  const handleLogin = (user: AuthUser) => {
    setCurrentUser(user);
    setActiveTab('camera');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      sessionStorage.removeItem('app_current_auth_user');
      localStorage.removeItem('app_current_auth_user');
    } catch {
      // ignore
    }
    setActiveTab('camera');
  };

  const resolveUserName = (email: string, rawName?: string): string => {
    const trimmed = (rawName || '').trim();
    if (trimmed) return trimmed;
    const emailTrim = (email || '').trim();
    if (emailTrim.includes('@')) {
      const prefix = emailTrim.split('@')[0].trim();
      if (prefix) return prefix;
    }
    return 'Nhân viên';
  };

  const handleRequestApproval = (email: string, name: string): boolean => {
    const emailLower = email.toLowerCase().trim();
    if (pendingApprovals.some(p => p.email.toLowerCase() === emailLower)) {
      return false;
    }
    const newPending: PendingApproval = {
      id: `req-${Date.now()}`,
      email: emailLower,
      name: resolveUserName(emailLower, name),
      requestedAt: new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN'),
    };
    setPendingApprovals(prev => [newPending, ...prev]);
    return true;
  };

  const handleAddApprovedUser = (email: string, name: string): boolean => {
    const emailLower = email.toLowerCase().trim();
    if (approvedUsers.some(u => u.email.toLowerCase() === emailLower)) {
      return false;
    }
    const newUser: ApprovedUser = {
      email: emailLower,
      name: resolveUserName(emailLower, name),
      approvedAt: new Date().toLocaleDateString('vi-VN'),
    };
    setApprovedUsers(prev => [newUser, ...prev]);
    // Remove from pending if was present
    setPendingApprovals(prev => prev.filter(p => p.email.toLowerCase() !== emailLower));
    return true;
  };

  const handleRevokeUser = (email: string) => {
    const emailLower = email.toLowerCase().trim();
    setApprovedUsers(prev => prev.filter(u => u.email.toLowerCase() !== emailLower));
    // If the revoked user is currently logged in, log them out
    if (currentUser && currentUser.email.toLowerCase() === emailLower && currentUser.role !== 'admin') {
      setCurrentUser(null);
      try {
        sessionStorage.removeItem('app_current_auth_user');
      } catch {
        // ignore
      }
    }
  };

  const handleApprovePending = (pendingId: string) => {
    const pending = pendingApprovals.find(p => p.id === pendingId);
    if (!pending) return;
    handleAddApprovedUser(pending.email, pending.name);
  };

  const handleRejectPending = (pendingId: string) => {
    setPendingApprovals(prev => prev.filter(p => p.id !== pendingId));
  };

  // --- Video & Canvas References ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const uploadedVideoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // --- Computer Vision Engines (100% ONNX Inference) ---
  const onnxDetectorRef = useRef<OnnxPigDetector>(new OnnxPigDetector());
  const trackerRef = useRef<PigTracker | null>(null);
  const activeTracksRef = useRef<PigTrack[]>([]);
  const animFrameIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // --- Model Management State ---
  const [modelStatus, setModelStatus] = useState<ModelStatusInfo>(() =>
    onnxDetectorRef.current.getStatus()
  );

  // --- Real-time States (100% Real Camera & Video Feed, No Simulation) ---
  const [sourceMode, setSourceMode] = useState<'webcam' | 'upload'>('webcam');
  const [isPaused, setIsPaused] = useState(false);
  const [isExpandedCamera, setIsExpandedCamera] = useState(false);
  const [clockString, setClockString] = useState<string>('--:--:-- | --/--/----');

  // --- Tally Counts ---
  const [forwardCount, setForwardCount] = useState(0);
  const [backwardCount, setBackwardCount] = useState(0);
  const [direction, setDirection] = useState<CountDirection>('IN_TO_OUT');
  const [countMode, setCountMode] = useState<'net' | 'gross'>('net');
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.25);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isCountingPaused, setIsCountingPaused] = useState(false);

  // --- Arbitrary 2-Point Draggable LineZone ---
  const [linePoints, setLinePoints] = useState<LineZonePoints>(() => {
    try {
      const saved = localStorage.getItem('pig_counter_line_points_v2');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {
      p1: { x: 30, y: 280 },
      p2: { x: 610, y: 280 },
    };
  });

  // Dragging state
  const [dragTarget, setDragTarget] = useState<'none' | 'p1' | 'p2' | 'line'>('none');
  const dragStartMousePos = useRef<{ x: number; y: number } | null>(null);
  const dragStartPoints = useRef<LineZonePoints | null>(null);
  const [canvasCursor, setCanvasCursor] = useState<'default' | 'grab' | 'grabbing' | 'move'>('default');

  // Visual line flash state
  const [lineFlash, setLineFlash] = useState<{ active: boolean; type: 'forward' | 'backward' }>({
    active: false,
    type: 'forward',
  });

  const [recentEvents, setRecentEvents] = useState<CrossingEvent[]>([]);
  const [statusMsg, setStatusMsg] = useState('Đã kết nối mô hình AI (Sẵn sàng)');
  const [fps, setFps] = useState(30);

  // Modals
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeDocket, setActiveDocket] = useState<BatchRecord | null>(null);

  // Saved records (Báo cáo)
  const [savedRecords, setSavedRecords] = useState<BatchRecord[]>(() => {
    try {
      const data = localStorage.getItem('pig_counter_records_v1');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('pig_counter_records_v1', JSON.stringify(savedRecords));
    } catch (e) {
      console.error('Lỗi lưu lịch sử:', e);
    }
  }, [savedRecords]);

  useEffect(() => {
    try {
      localStorage.setItem('pig_counter_line_points_v2', JSON.stringify(linePoints));
    } catch (e) {
      console.error('Lỗi lưu vạch line:', e);
    }
  }, [linePoints]);

  // Tự động nạp trực tiếp mô hình "/weights1.onnx" kèm IndexedDB cache & xử lý lỗi chi tiết
  const triggerLoadModel = useCallback(() => {
    setStatusMsg('Đang kết nối mô hình AI...');
    setModelStatus(onnxDetectorRef.current.getStatus());
    onnxDetectorRef.current
      .autoLoadModel('/weights1.onnx')
      .then(loaded => {
        const current = onnxDetectorRef.current.getStatus();
        setModelStatus(current);
        if (loaded) {
          setStatusMsg('Đã kết nối mô hình AI (Sẵn sàng)');
        } else {
          setStatusMsg(current.statusMessage || 'Lỗi nạp mô hình /weights1.onnx. Nhấn Thử lại để kết nối.');
        }
      })
      .catch(err => {
        console.error('[App] Lỗi khởi tạo mô hình /weights1.onnx:', err);
        const current = onnxDetectorRef.current.getStatus();
        setModelStatus(current);
        setStatusMsg(current.statusMessage || 'Lỗi nạp mô hình /weights1.onnx.');
      });
  }, []);

  useEffect(() => {
    triggerLoadModel();
  }, [triggerLoadModel]);

  // Live Digital Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('vi-VN', { hour12: false });
      const dateStr = now.toLocaleDateString('vi-VN', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      setClockString(`${timeStr}  |  ${dateStr}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const actualCount = countMode === 'net' ? Math.max(0, forwardCount - backwardCount) : forwardCount;

  // Handler when a pig crosses line
  const handleCrossing = useCallback(
    (track: PigTrack, crossingDir: CountDirection) => {
      // Khi tạm dừng, vạch không ghi nhận thêm heo nữa
      if (isCountingPaused) {
        return;
      }

      const now = new Date();
      const timeFormatted = now.toLocaleTimeString('vi-VN');

      if (crossingDir === 'IN_TO_OUT') {
        setForwardCount(prev => prev + 1);
        if (soundEnabled) playCountSound();
        setLineFlash({ active: true, type: 'forward' });
      } else {
        setBackwardCount(prev => prev + 1);
        if (soundEnabled) playReverseSound();
        setLineFlash({ active: true, type: 'backward' });
      }

      setTimeout(() => {
        setLineFlash({ active: false, type: 'forward' });
      }, 400);

      let snapshotUrl: string | undefined = undefined;
      if (canvasRef.current) {
        try {
          snapshotUrl = canvasRef.current.toDataURL('image/jpeg', 0.6);
        } catch {
          // ignore
        }
      }

      const newEvent: CrossingEvent = {
        id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        pigId: track.id,
        timestamp: now.toISOString(),
        timeFormatted,
        direction: crossingDir,
        snapshotUrl,
      };

      setRecentEvents(prev => [newEvent, ...prev.slice(0, 19)]);
    },
    [soundEnabled, isCountingPaused]
  );

  // Initialize PigTracker instance
  useEffect(() => {
    trackerRef.current = new PigTracker({
      linePoints,
      isFlipped: direction === 'OUT_TO_IN',
      onCross: handleCrossing,
    });
  }, [linePoints, direction, handleCrossing]);


  // Cố định thuộc tính inline cho thẻ <video> (chống tự động văng toàn màn hình trên iOS/Android)
  const enforceInlineVideo = useCallback((videoEl: HTMLVideoElement | null) => {
    if (!videoEl) return;
    videoEl.autoplay = true;
    videoEl.playsInline = true;
    videoEl.muted = true;
    videoEl.controls = false;
    videoEl.setAttribute('autoplay', '');
    videoEl.setAttribute('playsinline', '');
    videoEl.setAttribute('webkit-playsinline', '');
    videoEl.setAttribute('x5-playsinline', 'true');
    videoEl.setAttribute('x5-video-player-type', 'h5');
    videoEl.setAttribute('muted', '');

    const preventNativeFullscreen = () => {
      try {
        if ((videoEl as any).webkitExitFullscreen) {
          (videoEl as any).webkitExitFullscreen();
        }
        if (document.fullscreenElement === videoEl && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
        videoEl.play().catch(() => {});
      } catch {
        // ignore
      }
    };
    (videoEl as any).onwebkitbeginfullscreen = preventNativeFullscreen;
  }, []);

  // Đảm bảo thẻ <video> không bị đơ hình khi chuyển đổi khung nhìn / tab
  useEffect(() => {
    enforceInlineVideo(webcamVideoRef.current);
    enforceInlineVideo(uploadedVideoRef.current);

    if (activeTab === 'camera' && !isPaused) {
      const activeVid = sourceMode === 'webcam' ? webcamVideoRef.current : uploadedVideoRef.current;
      if (activeVid && activeVid.paused && (activeVid.srcObject || activeVid.src)) {
        activeVid.play().catch(() => {});
      }
    }
  }, [activeTab, sourceMode, isPaused, enforceInlineVideo]);

  // Clean up media streams
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

  // --- Main Render & Tracking Loop (Only when activeTab === 'camera') ---
  useEffect(() => {
    if (activeTab !== 'camera') {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      return;
    }

    let frameCount = 0;
    let lastFpsUpdate = performance.now();
    let isProcessing = false;

    const loop = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animFrameIdRef.current = requestAnimationFrame(loop);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animFrameIdRef.current = requestAnimationFrame(loop);
        return;
      }

      const now = performance.now();
      frameCount++;
      if (now - lastFpsUpdate >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastFpsUpdate)));
        frameCount = 0;
        lastFpsUpdate = now;
      }

      const w = 640;
      const h = 480;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      const isModelReady = onnxDetectorRef.current.getStatus().isLoaded;
      if (!isModelReady) {
        activeTracksRef.current = [];
      }

      // 1. Luồng Video chạy tự nhiên ở 30-60 FPS trên thẻ <video>, <canvas> trong suốt đè lên trên
      const activeVideo = sourceMode === 'webcam' ? webcamVideoRef.current : uploadedVideoRef.current;
      const isVideoReady =
        activeVideo &&
        activeVideo.readyState >= 2 &&
        (sourceMode === 'webcam' || !activeVideo.paused || activeVideo.currentTime > 0);

      if (isVideoReady && activeVideo) {
        // Xóa trong suốt mặt phẳng canvas để hiển thị trực tiếp thẻ <video> mượt mà bên dưới
        ctx.clearRect(0, 0, w, h);

        // Chỉ khi isProcessing === false mới lấy frame hiện tại chạy ONNX ngầm
        if (!isPaused && isModelReady && !isProcessing) {
          isProcessing = true;
          onnxDetectorRef.current
            .detectPigs(activeVideo, confidenceThreshold, w, h)
            .then(boxes => {
              const filteredDetections = boxes.filter(b => b.confidence >= confidenceThreshold);
              if (trackerRef.current) {
                const result = trackerRef.current.update(filteredDetections, w, h);
                activeTracksRef.current = result.tracks;
              }
            })
            .catch(err => {
              console.error('Lỗi suy luận AI:', err);
            })
            .finally(() => {
              isProcessing = false;
            });
        }
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          sourceMode === 'webcam'
            ? 'Đang kết nối luồng Camera trực tiếp...'
            : 'Chưa có video hoặc video đang dừng. Vui lòng chọn tệp video.',
          w / 2,
          h / 2
        );
      }

      // 2. Trong lúc AI đang tính (isProcessing === true), giữ nguyên khung vẽ của frame trước (activeTracksRef.current)
      const activeTracks = activeTracksRef.current;

      // 3. Vẽ Bounding Boxes, ID từng con heo & Chấm tròn tâm heo lên <canvas> trong suốt
      for (const track of activeTracks) {
        if (track.history.length > 1) {
          ctx.strokeStyle = track.crossed ? 'rgba(34, 197, 94, 0.45)' : 'rgba(6, 182, 212, 0.45)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(track.history[0].x, track.history[0].y);
          for (let i = 1; i < track.history.length; i++) {
            ctx.lineTo(track.history[i].x, track.history[i].y);
          }
          ctx.stroke();
        }

        const boxX = track.x - track.width / 2;
        const boxY = track.y - track.height / 2;
        const boxColor = track.crossed ? '#22c55e' : '#06b6d4';

        ctx.strokeStyle = boxColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(boxX, boxY, track.width, track.height);

        // Corner Brackets
        const cornerSize = Math.min(10, track.width * 0.25);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(boxX, boxY + cornerSize);
        ctx.lineTo(boxX, boxY);
        ctx.lineTo(boxX + cornerSize, boxY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(boxX + track.width - cornerSize, boxY);
        ctx.lineTo(boxX + track.width, boxY);
        ctx.lineTo(boxX + track.width, boxY + cornerSize);
        ctx.stroke();

        // Chấm tròn nhỏ ngay tâm mỗi con heo (Yêu cầu centroid: centerX, centerY)
        ctx.save();
        ctx.fillStyle = track.crossed ? '#22c55e' : '#f59e0b';
        ctx.shadowColor = track.crossed ? '#22c55e' : '#f59e0b';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(track.x, track.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        const tagText = `HEO #${track.id} ${(track.confidence * 100).toFixed(0)}%`;
        ctx.font = 'bold 10px monospace';
        const textWidth = ctx.measureText(tagText).width;
        ctx.fillStyle = track.crossed ? 'rgba(34, 197, 94, 0.9)' : 'rgba(6, 182, 212, 0.9)';
        ctx.fillRect(boxX, boxY - 16, textWidth + 8, 16);
        ctx.fillStyle = '#000000';
        ctx.fillText(tagText, boxX + 4, boxY - 4);
      }

      // 4. Draw Arbitrary LineZone
      const p1 = linePoints.p1;
      const p2 = linePoints.p2;
      const colorChuaDem = '#00ffff';
      const colorDaDem = '#22c55e';

      ctx.save();
      if (lineFlash.active) {
        ctx.strokeStyle = lineFlash.type === 'forward' ? 'rgba(34, 197, 94, 0.95)' : 'rgba(245, 158, 11, 0.95)';
        ctx.lineWidth = 9;
        ctx.shadowColor = lineFlash.type === 'forward' ? '#22c55e' : '#f59e0b';
        ctx.shadowBlur = 18;
      } else {
        ctx.strokeStyle = colorDaDem;
        ctx.lineWidth = 3.5;
      }

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.restore();

      // Midpoint Handle
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(midX - 22, midY - 10, 44, 20, 5);
      ctx.fill();
      ctx.stroke();
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'center';
      ctx.fillText('MOVE', midX, midY + 3);

      // Endpoints A & B
      ctx.save();
      ctx.fillStyle = colorChuaDem;
      ctx.shadowColor = colorChuaDem;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = colorDaDem;
      ctx.shadowColor = colorDaDem;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p2.x, p2.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p2.x, p2.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = colorChuaDem;
      ctx.textAlign = 'center';
      ctx.fillText('ĐIỂM A', p1.x, p1.y - 12);

      ctx.fillStyle = colorDaDem;
      ctx.fillText('ĐIỂM B', p2.x, p2.y - 12);

      const isDown = direction === 'IN_TO_OUT';
      ctx.fillStyle = isDown ? colorChuaDem : colorDaDem;
      ctx.fillText(isDown ? '▼ VÙNG CHƯA ĐẾM (IN)' : '▲ VÙNG ĐÃ ĐẾM (OUT)', midX, midY - 16);
      ctx.fillStyle = isDown ? colorDaDem : colorChuaDem;
      ctx.fillText(isDown ? '▲ VÙNG ĐÃ ĐẾM (OUT)' : '▼ VÙNG CHƯA ĐẾM (IN)', midX, midY + 24);

      // HUD Status Overlays
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(10, 10, 240, 28);
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'left';
      ctx.fillText(`AI LINEZONE: 640x480 | ${fps} FPS`, 16, 28);

      ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
      ctx.fillRect(w - 225, 10, 215, 24);
      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('● CHỈ NHẬN DIỆN HEO (LỌC NGƯỜI/VẬT)', w - 218, 26);

      // Warning banner if counting is paused
      if (isCountingPaused) {
        ctx.save();
        ctx.fillStyle = 'rgba(234, 88, 12, 0.95)';
        ctx.fillRect(w / 2 - 140, 10, 280, 26);
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('⏸ ĐÃ TẠM DỪNG: VẠCH KHÔNG GHI NHẬN HEO', w / 2, 27);
        ctx.restore();
      }

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [activeTab, sourceMode, isPaused, confidenceThreshold, linePoints, direction, lineFlash, fps, isCountingPaused]);

  // Pointer event handlers for draggable line
  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point2D | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    const p1 = linePoints.p1;
    const p2 = linePoints.p2;

    const distP1 = Math.hypot(coords.x - p1.x, coords.y - p1.y);
    const distP2 = Math.hypot(coords.x - p2.x, coords.y - p2.y);
    const distLine = distToSegment(coords, p1, p2);

    if (distP1 < 24) {
      setDragTarget('p1');
      setCanvasCursor('grabbing');
      dragStartMousePos.current = coords;
      dragStartPoints.current = { ...linePoints };
      setStatusMsg('Đang kéo Điểm A của vạch LineZone...');
    } else if (distP2 < 24) {
      setDragTarget('p2');
      setCanvasCursor('grabbing');
      dragStartMousePos.current = coords;
      dragStartPoints.current = { ...linePoints };
      setStatusMsg('Đang kéo Điểm B của vạch LineZone...');
    } else if (distLine < 16) {
      setDragTarget('line');
      setCanvasCursor('grabbing');
      dragStartMousePos.current = coords;
      dragStartPoints.current = { ...linePoints };
      setStatusMsg('Đang di chuyển toàn bộ vạch LineZone...');
    }
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    if (dragTarget === 'none') {
      const p1 = linePoints.p1;
      const p2 = linePoints.p2;
      const distP1 = Math.hypot(coords.x - p1.x, coords.y - p1.y);
      const distP2 = Math.hypot(coords.x - p2.x, coords.y - p2.y);
      const distLine = distToSegment(coords, p1, p2);

      if (distP1 < 24 || distP2 < 24) {
        setCanvasCursor('grab');
      } else if (distLine < 16) {
        setCanvasCursor('move');
      } else {
        setCanvasCursor('default');
      }
      return;
    }

    const clampedX = Math.max(10, Math.min(630, coords.x));
    const clampedY = Math.max(10, Math.min(470, coords.y));

    if (dragTarget === 'p1') {
      setLinePoints(prev => ({
        ...prev,
        p1: { x: Math.round(clampedX), y: Math.round(clampedY) },
      }));
    } else if (dragTarget === 'p2') {
      setLinePoints(prev => ({
        ...prev,
        p2: { x: Math.round(clampedX), y: Math.round(clampedY) },
      }));
    } else if (dragTarget === 'line' && dragStartMousePos.current && dragStartPoints.current) {
      const dx = coords.x - dragStartMousePos.current.x;
      const dy = coords.y - dragStartMousePos.current.y;
      const startP1 = dragStartPoints.current.p1;
      const startP2 = dragStartPoints.current.p2;

      setLinePoints({
        p1: {
          x: Math.round(Math.max(10, Math.min(630, startP1.x + dx))),
          y: Math.round(Math.max(10, Math.min(470, startP1.y + dy))),
        },
        p2: {
          x: Math.round(Math.max(10, Math.min(630, startP2.x + dx))),
          y: Math.round(Math.max(10, Math.min(470, startP2.y + dy))),
        },
      });
    }
  };

  const handlePointerUp = () => {
    if (dragTarget !== 'none') {
      setDragTarget('none');
      setCanvasCursor('default');
      setStatusMsg('Đã cập nhật vị trí vạch đếm LineZone mới');
    }
  };

  // Video source controls
  const startWebcam = async () => {
    try {
      setStatusMsg('Đang kích hoạt Camera...');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (uploadedVideoRef.current && !uploadedVideoRef.current.paused) {
        uploadedVideoRef.current.pause();
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (webcamVideoRef.current) {
        enforceInlineVideo(webcamVideoRef.current);
        webcamVideoRef.current.srcObject = stream;
        await webcamVideoRef.current.play();
      }
      activeTracksRef.current = [];
      setSourceMode('webcam');
      setIsPaused(false);
      setStatusMsg('Đang nhận diện qua luồng Camera trực tiếp (Chỉ nhận diện heo)');
    } catch (err: unknown) {
      console.error('Lỗi mở camera:', err);
      const msg = err instanceof Error ? err.message : 'Không thể kết nối';
      setStatusMsg(`Lỗi camera: ${msg}. Vui lòng cấp quyền truy cập camera hoặc tải video từ máy.`);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      if (uploadedVideoRef.current) {
        enforceInlineVideo(uploadedVideoRef.current);
        uploadedVideoRef.current.src = url;
        uploadedVideoRef.current.play().catch(() => {});
      }
      activeTracksRef.current = [];
      setSourceMode('upload');
      setIsPaused(false);
      setStatusMsg(`Đang phát video tệp: ${file.name}`);
    }
  };

  const resetCounter = () => {
    // Ngay lập tức đặt số heo vừa đếm, IN qua OUT, quay ngược về 0
    setForwardCount(0);
    setBackwardCount(0);
    setRecentEvents([]);
    activeTracksRef.current = [];
    trackerRef.current?.reset();
    setStatusMsg('Đã làm mới: Số heo vừa đếm, IN qua OUT, quay ngược đã về 0');
  };

  const flipDirection = () => {
    setDirection(prev => (prev === 'IN_TO_OUT' ? 'OUT_TO_IN' : 'IN_TO_OUT'));
    setForwardCount(0);
    setBackwardCount(0);
    activeTracksRef.current = [];
    trackerRef.current?.reset();
    setStatusMsg(`Đã đổi chiều đếm sang: ${direction === 'IN_TO_OUT' ? 'Nhập Kho (OUT ➔ IN)' : 'Xuất Kho (IN ➔ OUT)'}`);
  };

  const captureSnapshot = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    try {
      const snapCanvas = document.createElement('canvas');
      snapCanvas.width = canvas.width || 640;
      snapCanvas.height = canvas.height || 480;
      const snapCtx = snapCanvas.getContext('2d');
      if (!snapCtx) return canvas.toDataURL('image/jpeg', 0.85);

      const activeVideo = sourceMode === 'webcam' ? webcamVideoRef.current : uploadedVideoRef.current;
      if (activeVideo && activeVideo.readyState >= 2) {
        snapCtx.drawImage(activeVideo, 0, 0, snapCanvas.width, snapCanvas.height);
      }
      snapCtx.drawImage(canvas, 0, 0, snapCanvas.width, snapCanvas.height);
      return snapCanvas.toDataURL('image/jpeg', 0.85);
    } catch {
      return null;
    }
  };

  const handleSaveBatch = () => {
    const snapshot = captureSnapshot();
    const now = new Date();
    const endTime = `${now.toLocaleTimeString('vi-VN')} ${now.toLocaleDateString('vi-VN')}`;
    const code = `PNK-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${(savedRecords.length + 1).toString().padStart(3, '0')}`;
    const effectiveUserName = resolveUserName(currentUser?.email || '', currentUser?.name);

    const record: BatchRecord = {
      id: `batch-${Date.now()}`,
      code,
      farmName: 'Thai Viet Corporation',
      pigType: 'Heo thịt thương phẩm (100-115kg)',
      licensePlate: 'Xe Vận Chuyển',
      deckNumber: 'Sàn 1',
      driverName: effectiveUserName,
      inspectorName: effectiveUserName,
      expectedCount: actualCount,
      actualCount,
      forwardCount,
      backwardCount,
      startTime: endTime,
      endTime,
      notes: `Đã lưu từ ca trực: ${effectiveUserName} (${currentUser?.email || ''}).`,
      snapshotUrl: snapshot || undefined,
      directionMode: direction,
      eventsCount: recentEvents.length,
    };

    setSavedRecords(prev => [record, ...prev]);
    setActiveDocket(record);
    setShowPrintModal(true);
    setStatusMsg(`Đã tạo và lưu Ghi Nhận Kiểm Đếm ${code}!`);
  };

  const handleOpenPrintPreview = () => {
    const snapshot = captureSnapshot();
    const now = new Date();
    const endTime = `${now.toLocaleTimeString('vi-VN')} ${now.toLocaleDateString('vi-VN')}`;
    const code = `PNK-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${(savedRecords.length + 1).toString().padStart(3, '0')}`;
    const effectiveUserName = resolveUserName(currentUser?.email || '', currentUser?.name);

    const record: BatchRecord = {
      id: `current-${Date.now()}`,
      code,
      farmName: 'Thai Viet Corporation',
      pigType: 'Heo thịt thương phẩm',
      licensePlate: 'Xe Vận Chuyển',
      deckNumber: 'Sàn 1',
      driverName: effectiveUserName,
      inspectorName: effectiveUserName,
      expectedCount: actualCount,
      actualCount,
      forwardCount,
      backwardCount,
      startTime: endTime,
      endTime,
      notes: 'Ghi nhận kiểm đếm tự động LineZone camera.',
      snapshotUrl: snapshot || undefined,
      directionMode: direction,
      eventsCount: recentEvents.length,
    };

    setActiveDocket(record);
    setShowPrintModal(true);
  };


  const toggleFullscreen = () => {
    // Mở rộng / thu gọn khung camera ngay bên trong giao diện (không gọi fullscreen trình duyệt để chống văng màn hình)
    setIsExpandedCamera(prev => !prev);
  };

  // --- RENDER LOGIN SCREEN IF NOT AUTHENTICATED ---
  if (!currentUser) {
    return (
      <LoginScreen
        approvedUsers={approvedUsers}
        pendingApprovals={pendingApprovals}
        onLogin={handleLogin}
        onRequestApproval={handleRequestApproval}
      />
    );
  }

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100/90 via-sky-50/40 to-blue-50/30 flex flex-col font-sans select-none text-slate-800 pb-28">
      {/* Hidden file input for video upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="video/*"
        onChange={handleVideoUpload}
        className="hidden"
      />

      {/* TOP HEADER (Soft Luminous Translucent 3D Glass & Official Logo) */}
      <header className="bg-white/80 backdrop-blur-xl text-slate-900 px-5 py-3 shadow-[0_8px_30px_rgba(14,165,233,0.07)] border-b border-white/90 sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white p-1 flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-slate-100 ring-1 ring-sky-100">
            <img
              src="/assets/aistudio/23-logo-thai-viet-corporation_c66d41c5.jpeg"
              alt="Thai Viet Corporation"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black uppercase tracking-tight bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 bg-clip-text text-transparent drop-shadow-xs">
              HỆ THỐNG ĐẾM HEO TỰ ĐỘNG AI
            </h1>
            <p className="text-xs text-sky-700/90 font-bold tracking-wide">
              Thai Viet Corporation · Vision LineZone
            </p>
          </div>
        </div>

        {/* User Badge, Clock & Logout */}
        <div className="flex items-center gap-2.5">
          {/* User Role Badge */}
          <div
            className={`px-3 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 border shadow-2xs backdrop-blur-md ${
              isAdmin
                ? 'bg-emerald-50/90 border-emerald-300/80 text-emerald-800'
                : 'bg-sky-50/80 border-sky-200/80 text-sky-800'
            }`}
          >
            {isAdmin ? <ShieldCheck className="w-4 h-4 text-emerald-600" /> : <User className="w-4 h-4 text-sky-600" />}
            <span className="max-w-[140px] truncate">{resolveUserName(currentUser.email, currentUser.name)}</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded-md bg-white/80 font-bold border border-slate-200/60 shadow-2xs">
              {isAdmin ? 'ADMIN' : 'USER'}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-2 bg-white/70 backdrop-blur-md border border-slate-200/80 px-3.5 py-1.5 rounded-2xl text-xs font-mono text-slate-700 font-medium shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{clockString}</span>
          </div>

          <button
            onClick={() => setSoundEnabled(prev => !prev)}
            className={`p-2 rounded-2xl border transition-all cursor-pointer text-xs flex items-center gap-1.5 shadow-[0_3px_0_0_#cbd5e1] active:shadow-none active:translate-y-0.5 ${
              soundEnabled
                ? 'bg-gradient-to-b from-white via-slate-50 to-slate-100 border-slate-300 text-emerald-700 hover:from-white hover:to-slate-150'
                : 'bg-slate-100 border-slate-300 text-slate-400'
            }`}
            title="Bật/Tắt âm thanh qua vạch"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 bg-gradient-to-b from-rose-500 via-rose-600 to-rose-700 hover:from-rose-400 hover:to-rose-500 text-white font-bold text-xs rounded-2xl shadow-[0_3px_0_0_#9f1239] active:shadow-none active:translate-y-0.5 border-t border-rose-300/40 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Đăng xuất khỏi tài khoản"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Đăng Xuất</span>
          </button>
        </div>
      </header>

      {/* MAIN VIEW BASED ON ACTIVE TAB */}
      <main
        className={
          activeTab === 'camera'
            ? 'flex-1 p-3 md:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 max-w-[1720px] mx-auto w-full'
            : 'fixed -left-[9999px] top-0 w-[640px] h-[480px] opacity-0 pointer-events-none overflow-hidden'
        }
      >
          {/* LEFT PANE: Camera & Computer Vision Feed */}
          <div
            ref={containerRef}
            className={`${
              isExpandedCamera ? 'lg:col-span-12 xl:col-span-12' : 'lg:col-span-7 xl:col-span-7'
            } bg-white/70 backdrop-blur-xl rounded-3xl overflow-hidden shadow-[0_12px_36px_rgba(15,23,42,0.06)] border border-white/90 ring-1 ring-slate-200/50 flex flex-col justify-between`}
          >
            {/* Top Video Header Bar */}
            <div className="px-4 py-2.5 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 flex items-center justify-between text-xs text-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="font-bold text-white uppercase tracking-wider">
                  {sourceMode === 'webcam'
                    ? 'Camera Trực Tiếp Kho'
                    : 'Tệp Video Tải Lên'}
                </span>
                <span className="text-slate-400 font-mono">· {fps} FPS</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] text-amber-300 font-medium hidden sm:inline-flex items-center gap-1">
                  <Move className="w-3 h-3" />
                  Kéo thả Điểm A, B hoặc thân vạch
                </span>
                <button
                  onClick={toggleFullscreen}
                  className="p-1 hover:text-white text-slate-400 transition-colors cursor-pointer"
                  title={isExpandedCamera ? 'Thu gọn khung camera' : 'Mở rộng khung camera trong trang'}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Khung chứa cố định (Container) giữ <video> và <canvas> gọn gàng bên trong, chống tràn/văng trên điện thoại */}
            <div className="relative w-full h-auto max-h-full bg-slate-950 flex items-center justify-center overflow-hidden p-0">
              <div className="relative w-full h-auto max-h-full aspect-[4/3] bg-black overflow-hidden flex items-center justify-center mx-auto">
                {/* Luồng hiển thị <video> camera trực tiếp: bắt buộc có autoplay playsinline muted webkit-playsinline */}
                <video
                  ref={webcamVideoRef}
                  autoPlay
                  playsInline
                  muted
                  disablePictureInPicture
                  controls={false}
                  {...({ 'webkit-playsinline': 'true', playsinline: 'true' } as any)}
                  className={
                    sourceMode === 'webcam'
                      ? 'relative w-full h-auto max-h-full object-contain pointer-events-none select-none block z-0'
                      : 'absolute w-px h-px opacity-0 pointer-events-none -z-10'
                  }
                />
                <video
                  ref={uploadedVideoRef}
                  autoPlay
                  loop
                  playsInline
                  muted
                  disablePictureInPicture
                  controls={false}
                  {...({ 'webkit-playsinline': 'true', playsinline: 'true' } as any)}
                  onPlay={() => setIsPaused(false)}
                  onPause={() => setIsPaused(true)}
                  className={
                    sourceMode === 'upload'
                      ? 'relative w-full h-auto max-h-full object-contain pointer-events-none select-none block z-0'
                      : 'absolute w-px h-px opacity-0 pointer-events-none -z-10'
                  }
                />

                {/* Thẻ <canvas> trong suốt đè khít lên trên video bên trong container đúng vị trí vạch đếm LINEZONE */}
                <canvas
                  ref={canvasRef}
                  style={{ cursor: canvasCursor }}
                  {...({ autoplay: 'true', playsinline: 'true', muted: 'true', 'webkit-playsinline': 'true' } as any)}
                  onMouseDown={handlePointerDown}
                  onMouseMove={handlePointerMove}
                  onMouseUp={handlePointerUp}
                  onTouchStart={handlePointerDown}
                  onTouchMove={handlePointerMove}
                  onTouchEnd={handlePointerUp}
                  className="absolute inset-0 w-full h-full max-h-full object-contain bg-transparent z-10 touch-none"
                />

                {lineFlash.active && (
                  <div
                    className={`absolute inset-0 z-20 pointer-events-none transition-opacity duration-300 flex items-center justify-center ${
                      lineFlash.type === 'forward'
                        ? 'bg-emerald-500/15 border-4 border-emerald-500'
                        : 'bg-amber-500/20 border-4 border-amber-500'
                    }`}
                  >
                    <div
                      className={`px-4 py-1.5 rounded-xl font-black text-sm uppercase tracking-wider text-white shadow-xl backdrop-blur-xs ${
                        lineFlash.type === 'forward' ? 'bg-emerald-600' : 'bg-amber-600'
                      }`}
                    >
                      {lineFlash.type === 'forward' ? '+1 HEO QUA VẠCH' : '-1 HEO QUAY ĐẦU'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Camera Controls Dock */}
            <div className="p-3 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={startWebcam}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                    sourceMode === 'webcam'
                      ? 'bg-gradient-to-b from-sky-400 to-sky-600 text-white shadow-[0_3px_0_0_#0284c7] ring-1 ring-sky-300'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-2xs'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5 text-sky-400" />
                  Bật Camera Trực Tiếp
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                    sourceMode === 'upload'
                      ? 'bg-gradient-to-b from-amber-400 to-amber-600 text-white shadow-[0_3px_0_0_#b45309] ring-1 ring-amber-300'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-2xs'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  Tải Video Từ Máy
                </button>

                <button
                  onClick={() => {
                    const nextPaused = !isPaused;
                    setIsPaused(nextPaused);
                    const vid = sourceMode === 'webcam' ? webcamVideoRef.current : uploadedVideoRef.current;
                    if (vid) {
                      if (nextPaused) vid.pause();
                      else vid.play().catch(() => {});
                    }
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer shadow-2xs"
                  title={isPaused ? 'Tiếp tục' : 'Tạm dừng'}
                >
                  {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-slate-400" />}
                </button>
              </div>

              {/* Trạng thái mô hình AI tự động từ /weights1.onnx (kèm cache IndexedDB & nút Thử lại nếu lỗi) */}
              <div className="flex items-center gap-2">
                {modelStatus.isLoaded ? (
                  <div className="px-3 py-1.5 bg-emerald-950/80 border border-emerald-500/70 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Đã kết nối mô hình AI (Sẵn sàng)</span>
                  </div>
                ) : modelStatus.status === 'error' ? (
                  <button
                    onClick={triggerLoadModel}
                    className="px-3 py-1.5 bg-rose-950/90 hover:bg-rose-900 border border-rose-500/70 rounded-xl text-rose-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                    title={modelStatus.statusMessage}
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="max-w-[220px] truncate">{modelStatus.statusMessage || 'Lỗi nạp AI - Nhấn thử lại'}</span>
                  </button>
                ) : (
                  <div className="px-3 py-1.5 bg-sky-950/80 border border-sky-500/60 rounded-xl text-sky-300 text-xs font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
                    <span>Đang kết nối mô hình AI...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT PANE: Counter Hero, Controls, Action Buttons (5 cols on desktop) */}
          <div className="lg:col-span-5 xl:col-span-5 flex flex-col gap-4 justify-between">
            <div className="space-y-4">
              {/* MAIN COUNTER HERO SECTION (Soft Translucent 3D Glass Container) */}
              <div className="bg-white/80 backdrop-blur-xl p-5 md:p-6 rounded-3xl border border-white/95 shadow-[0_12px_36px_rgba(15,23,42,0.06)] ring-1 ring-sky-100/70">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] inline-block animate-pulse"></span>
                    SỐ HEO QUA VẠCH / TỔNG ĐẾM AI
                  </span>
                  <span className="text-xs font-bold text-sky-700 bg-sky-50/90 px-3 py-1 rounded-xl border border-sky-200/60 shadow-2xs">
                    {direction === 'IN_TO_OUT' ? 'Xuất Kho (IN ➔ OUT)' : 'Nhập Kho (OUT ➔ IN)'}
                  </span>
                </div>

                {/* Giant Bold Counter Number with Soft Light Blue & Mint Fresh Container (Yêu cầu 1 & 2) */}
                <div className="py-7 px-4 text-center bg-gradient-to-br from-sky-50/90 via-white to-cyan-50/80 rounded-3xl my-3 border border-sky-200/90 relative overflow-hidden shadow-[0_10px_28px_rgba(14,165,233,0.10),inset_0_2px_4px_rgba(255,255,255,0.95)] ring-1 ring-sky-100">
                  {/* Subtle soft luminous ambient glow */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-52 h-24 bg-rose-400/10 rounded-full blur-2xl pointer-events-none"></div>
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-52 h-20 bg-sky-400/12 rounded-full blur-2xl pointer-events-none"></div>

                  {/* Modern, bold, soft, crisp typography easily legible from afar */}
                  <div className="relative text-7xl sm:text-8xl md:text-9xl font-black tracking-tight leading-none text-rose-600 drop-shadow-[0_4px_16px_rgba(225,29,72,0.20)] py-1 font-sans">
                    {actualCount}
                  </div>

                  {/* Status subtext pill in delicate mint theme */}
                  <div className="relative mt-2 flex items-center justify-center">
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-emerald-100/90 border border-emerald-200/90 rounded-full text-emerald-800 text-[11px] font-bold uppercase tracking-wider shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981] shrink-0"></span>
                      <span>CHỈ NHẬN DIỆN HEO · HEO THỰC TẾ QUA VẠCH</span>
                    </div>
                  </div>
                </div>

                {/* Breakdown details in Soft Translucent 3D Pastel Tiles */}
                <div className="grid grid-cols-2 gap-3 text-xs font-semibold py-1">
                  <div className="p-3.5 bg-gradient-to-b from-emerald-50/90 to-emerald-100/50 text-emerald-950 rounded-2xl border border-emerald-200/80 shadow-[0_4px_12px_rgba(16,185,129,0.06),inset_0_1px_0_rgba(255,255,255,0.8)]">
                    <div className="text-[10px] uppercase font-bold text-emerald-700 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      IN qua OUT (+)
                    </div>
                    <div className="text-2xl font-black font-mono mt-1 text-emerald-900">{forwardCount} con</div>
                  </div>

                  <div className="p-3.5 bg-gradient-to-b from-amber-50/90 to-amber-100/50 text-amber-950 rounded-2xl border border-amber-200/80 shadow-[0_4px_12px_rgba(245,158,11,0.06),inset_0_1px_0_rgba(255,255,255,0.8)]">
                    <div className="text-[10px] uppercase font-bold text-amber-700 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      Quay ngược (-)
                    </div>
                    <div className="text-2xl font-black font-mono mt-1 text-amber-900">{backwardCount} con</div>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS & DIRECTION (Soft 3D Tactile Buttons) */}
              <div className="space-y-3 bg-white/70 backdrop-blur-xl p-4 md:p-5 rounded-3xl border border-white/90 shadow-[0_12px_36px_rgba(15,23,42,0.05)] ring-1 ring-sky-100/60">
                <button
                  onClick={flipDirection}
                  className="w-full py-2.5 px-3 bg-gradient-to-b from-white via-slate-50 to-slate-100 hover:from-white hover:to-slate-200 text-slate-800 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-200 shadow-[0_3px_0_0_#cbd5e1] active:shadow-none active:translate-y-0.5"
                >
                  <ArrowDownUp className="w-4 h-4 text-sky-600" />
                  Đảo Chiều Đếm (Đường Cổng / Trại: {direction === 'IN_TO_OUT' ? 'IN ➔ OUT' : 'OUT ➔ IN'})
                </button>

                {/* Status Message */}
                <div
                  className={`text-[11px] font-bold px-3 py-2 rounded-2xl border flex items-center gap-2 shadow-2xs backdrop-blur-xs ${
                    modelStatus.isLoaded
                      ? 'text-emerald-800 bg-emerald-50/90 border-emerald-200/80'
                      : 'text-sky-900 bg-sky-50/80 border-sky-200/60'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      modelStatus.isLoaded ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-sky-500 animate-ping'
                    }`}
                  ></span>
                  <span className="truncate">{statusMsg}</span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  {/* TẠM DỪNG / TIẾP TỤC ĐẾM (3D Tactile Button) */}
                  <button
                    onClick={() => {
                      setIsCountingPaused(prev => !prev);
                      setStatusMsg(!isCountingPaused ? 'ĐÃ TẠM DỪNG: Vạch đếm không ghi nhận thêm heo' : 'ĐÃ TIẾP TỤC ĐẾM: Vạch đếm đang ghi nhận');
                    }}
                    className={`py-3.5 px-2 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer border-t border-white/40 ${
                      isCountingPaused
                        ? 'bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-600 text-white shadow-[0_4px_0_0_#047857,0_8px_16px_rgba(16,185,129,0.25)] active:shadow-[0_1px_0_0_#047857] active:translate-y-0.5 animate-pulse'
                        : 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-white shadow-[0_4px_0_0_#b45309,0_8px_16px_rgba(217,119,6,0.25)] active:shadow-[0_1px_0_0_#b45309] active:translate-y-0.5'
                    }`}
                    title={isCountingPaused ? 'Tiếp tục ghi nhận heo qua vạch' : 'Tạm dừng không ghi nhận thêm heo qua vạch'}
                  >
                    {isCountingPaused ? (
                      <>
                        <Play className="w-4 h-4 fill-white" />
                        TIẾP TỤC
                      </>
                    ) : (
                      <>
                        <Pause className="w-4 h-4 fill-white" />
                        TẠM DỪNG
                      </>
                    )}
                  </button>

                  {/* LƯU (3D Tactile Button) */}
                  <button
                    onClick={handleSaveBatch}
                    className="py-3.5 px-2 bg-gradient-to-b from-emerald-500 via-emerald-600 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer border-t border-white/40 shadow-[0_4px_0_0_#047857,0_8px_16px_rgba(16,185,129,0.25)] active:shadow-[0_1px_0_0_#047857] active:translate-y-0.5"
                  >
                    <Save className="w-4 h-4" />
                    LƯU
                  </button>

                  {/* LÀM MỚI (3D Tactile Button) */}
                  <button
                    onClick={resetCounter}
                    className="py-3.5 px-2 bg-gradient-to-b from-rose-500 via-rose-600 to-rose-700 hover:from-rose-400 hover:to-rose-600 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer border-t border-white/40 shadow-[0_4px_0_0_#be123c,0_8px_16px_rgba(225,29,72,0.25)] active:shadow-[0_1px_0_0_#be123c] active:translate-y-0.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    LÀM MỚI
                  </button>
                </div>
              </div>
            </div>

            {/* BRAND FOOTER (Translucent Glass Finish) */}
            <div className="text-center py-2.5 px-4 bg-white/60 backdrop-blur-md rounded-2xl border border-white/80 shadow-2xs flex items-center justify-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-white p-0.5 border border-slate-200/80 shadow-2xs">
                <img
                  src="/assets/aistudio/23-logo-thai-viet-corporation_c66d41c5.jpeg"
                  alt="Thai Viet Corporation"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-left">
                <h3 className="text-red-600 font-serif font-black text-xs tracking-wide">
                  Thai Viet Corporation
                </h3>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">
                  Hệ Thống Giám Sát Chăn Nuôi AI
                </p>
              </div>
            </div>
          </div>
      </main>

      {/* REPORTS TAB */}
      {activeTab === 'reports' && (
        <ReportsTab
          records={savedRecords}
          onSelectForPrint={rec => {
            setActiveDocket(rec);
            setShowPrintModal(true);
          }}
          onClearRecords={() => setSavedRecords([])}
          onDeleteRecord={id => setSavedRecords(prev => prev.filter(r => r.id !== id))}
        />
      )}

      {/* AI PARAMS TAB (LOCKED IF NOT ADMIN) */}
      {activeTab === 'ai_params' && (
        <AiParamsTab
          userRole={currentUser.role}
          onnxDetector={onnxDetectorRef.current}
          isModelLoaded={modelStatus.isLoaded}
          modelName={modelStatus.modelName}
          onModelLoaded={name => {
            setModelStatus(onnxDetectorRef.current.getStatus());
            setStatusMsg(`Đã nạp thành công mô hình ONNX: ${name}`);
          }}
          confidenceThreshold={confidenceThreshold}
          onConfidenceChange={setConfidenceThreshold}
          countMode={countMode}
          onCountModeChange={setCountMode}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(s => !s)}
          onResetLineZone={() => {
            setLinePoints({ p1: { x: 30, y: 240 }, p2: { x: 610, y: 240 } });
            setStatusMsg('Đã căn giữa lại vị trí vạch đếm LineZone');
          }}
        />
      )}

      {/* ADMIN TAB */}
      {activeTab === 'admin' && (
        <AdminTab
          approvedUsers={approvedUsers}
          pendingApprovals={pendingApprovals}
          onAddApprovedUser={handleAddApprovedUser}
          onRevokeUser={handleRevokeUser}
          onApprovePending={handleApprovePending}
          onRejectPending={handleRejectPending}
        />
      )}

      {/* BOTTOM NAVIGATION TOOLBAR (SOFT TRANSLUCENT 3D GLASS DOCK) */}
      <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 bg-white/80 backdrop-blur-2xl border border-white/95 shadow-[0_16px_40px_rgba(15,23,42,0.12)] px-3.5 py-2.5 flex items-center justify-center gap-2 sm:gap-3.5 max-w-3xl w-[96%] sm:w-auto rounded-3xl ring-1 ring-sky-100/50">
        {/* 1. Camera & Đếm (3D Button) */}
        <button
          onClick={() => setActiveTab('camera')}
          className={`cursor-pointer transition-all flex flex-col items-center justify-center px-4 sm:px-5 py-2 rounded-2xl min-w-[80px] sm:min-w-[96px] ${
            activeTab === 'camera'
              ? 'bg-gradient-to-b from-sky-400 via-sky-500 to-sky-600 text-white shadow-[0_5px_0_0_#0284c7,0_10px_20px_rgba(2,132,199,0.35)] border-t border-white/50 active:shadow-[0_1px_0_0_#0284c7] active:translate-y-1 font-bold'
              : 'bg-gradient-to-b from-white/90 via-slate-50/80 to-slate-200/70 hover:from-white hover:to-slate-100 text-slate-700 hover:text-slate-950 border border-white/80 shadow-[0_4px_0_0_#94a3b8,0_6px_12px_rgba(0,0,0,0.06)] active:shadow-[0_1px_0_0_#94a3b8] active:translate-y-1 font-semibold backdrop-blur-xs'
          }`}
        >
          <Camera className={`w-5 h-5 mb-0.5 ${activeTab === 'camera' ? 'drop-shadow-xs' : 'text-slate-600'}`} />
          <span className="text-[11px] leading-tight">Camera &amp; Đếm</span>
        </button>

        {/* 2. Báo Cáo (3D Button) */}
        <button
          onClick={() => setActiveTab('reports')}
          className={`cursor-pointer transition-all flex flex-col items-center justify-center px-4 sm:px-5 py-2 rounded-2xl min-w-[80px] sm:min-w-[96px] relative ${
            activeTab === 'reports'
              ? 'bg-gradient-to-b from-sky-400 via-sky-500 to-sky-600 text-white shadow-[0_5px_0_0_#0284c7,0_10px_20px_rgba(2,132,199,0.35)] border-t border-white/50 active:shadow-[0_1px_0_0_#0284c7] active:translate-y-1 font-bold'
              : 'bg-gradient-to-b from-white/90 via-slate-50/80 to-slate-200/70 hover:from-white hover:to-slate-100 text-slate-700 hover:text-slate-950 border border-white/80 shadow-[0_4px_0_0_#94a3b8,0_6px_12px_rgba(0,0,0,0.06)] active:shadow-[0_1px_0_0_#94a3b8] active:translate-y-1 font-semibold backdrop-blur-xs'
          }`}
        >
          <div className="relative">
            <FileText className={`w-5 h-5 mb-0.5 ${activeTab === 'reports' ? 'drop-shadow-xs' : 'text-slate-600'}`} />
            {savedRecords.length > 0 && (
              <span className="absolute -top-1 -right-2 bg-rose-600 text-white font-mono text-[9px] font-bold px-1.5 py-0.2 rounded-full shadow-[0_2px_0_0_#9f1239]">
                {savedRecords.length}
              </span>
            )}
          </div>
          <span className="text-[11px] leading-tight">Báo Cáo</span>
        </button>

        {/* 3. Thông Số AI (3D Button) */}
        <button
          onClick={() => setActiveTab('ai_params')}
          className={`cursor-pointer transition-all flex flex-col items-center justify-center px-4 sm:px-5 py-2 rounded-2xl min-w-[80px] sm:min-w-[96px] relative ${
            activeTab === 'ai_params'
              ? 'bg-gradient-to-b from-sky-400 via-sky-500 to-sky-600 text-white shadow-[0_5px_0_0_#0284c7,0_10px_20px_rgba(2,132,199,0.35)] border-t border-white/50 active:shadow-[0_1px_0_0_#0284c7] active:translate-y-1 font-bold'
              : 'bg-gradient-to-b from-white/90 via-slate-50/80 to-slate-200/70 hover:from-white hover:to-slate-100 text-slate-700 hover:text-slate-950 border border-white/80 shadow-[0_4px_0_0_#94a3b8,0_6px_12px_rgba(0,0,0,0.06)] active:shadow-[0_1px_0_0_#94a3b8] active:translate-y-1 font-semibold backdrop-blur-xs'
          }`}
        >
          <div className="relative">
            <Cpu className={`w-5 h-5 mb-0.5 ${activeTab === 'ai_params' ? 'drop-shadow-xs' : 'text-slate-600'}`} />
            {!isAdmin && (
              <span className="absolute -top-1 -right-2 bg-amber-500 text-white p-0.5 rounded-full shadow-2xs" title="Bị khóa với quyền người dùng">
                <Lock className="w-2.5 h-2.5" />
              </span>
            )}
          </div>
          <span className="text-[11px] leading-tight flex items-center gap-0.5">
            Thông Số AI
            {!isAdmin && <span className="text-[9px] text-amber-600 font-bold">(Khóa)</span>}
          </span>
        </button>

        {/* 4. Admin (3D Button) */}
        <button
          onClick={() => {
            if (isAdmin) {
              setActiveTab('admin');
            } else {
              setStatusMsg('Chỉ tài khoản Quản Trị Viên (Admin) mới có quyền truy cập bảng Quản trị Admin.');
            }
          }}
          className={`cursor-pointer transition-all flex flex-col items-center justify-center px-4 sm:px-5 py-2 rounded-2xl min-w-[80px] sm:min-w-[96px] relative ${
            activeTab === 'admin'
              ? 'bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-600 text-white shadow-[0_5px_0_0_#059669,0_10px_20px_rgba(5,150,105,0.35)] border-t border-white/50 active:shadow-[0_1px_0_0_#059669] active:translate-y-1 font-bold'
              : isAdmin
              ? 'bg-gradient-to-b from-white/90 via-slate-50/80 to-slate-200/70 hover:from-white hover:to-slate-100 text-slate-700 hover:text-slate-950 border border-white/80 shadow-[0_4px_0_0_#94a3b8,0_6px_12px_rgba(0,0,0,0.06)] active:shadow-[0_1px_0_0_#94a3b8] active:translate-y-1 font-semibold backdrop-blur-xs'
              : 'bg-gradient-to-b from-slate-100 to-slate-200 text-slate-400 border border-slate-200 shadow-[0_3px_0_0_#cbd5e1] opacity-75'
          }`}
        >
          <div className="relative">
            <ShieldCheck className={`w-5 h-5 mb-0.5 ${activeTab === 'admin' ? 'drop-shadow-xs' : isAdmin ? 'text-emerald-600' : 'text-slate-400'}`} />
            {pendingApprovals.length > 0 && isAdmin && (
              <span className="absolute -top-1 -right-2 bg-amber-600 text-white font-mono text-[9px] font-bold px-1.5 py-0.2 rounded-full shadow-[0_2px_0_0_#b45309] animate-bounce">
                {pendingApprovals.length}
              </span>
            )}
          </div>
          <span className="text-[11px] leading-tight flex items-center gap-0.5">
            Admin
            {!isAdmin && <Lock className="w-2.5 h-2.5 text-slate-400" />}
          </span>
        </button>
      </nav>

      {/* PRINT DOCKET MODAL */}
      {showPrintModal && activeDocket && (
        <PrintDocket
          record={activeDocket}
          onClose={() => setShowPrintModal(false)}
        />
      )}

    </div>
  );
}
