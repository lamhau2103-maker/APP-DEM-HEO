import { DetectionBox } from './pigTracker';

export type ModelLoadingStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface ModelStatusInfo {
  isLoaded: boolean;
  status: ModelLoadingStatus;
  statusMessage: string;
  modelName: string;
}

export const DEFAULT_MODEL_URL = '/weights1.onnx';

const IDB_NAME = 'pig_counter_onnx_cache_v1';
const IDB_STORE = 'models';

function getCachedModelBuffer(key: string): Promise<ArrayBuffer | null> {
  return new Promise(resolve => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => {
        try {
          const db = req.result;
          const tx = db.transaction(IDB_STORE, 'readonly');
          const store = tx.objectStore(IDB_STORE);
          const getReq = store.get(key);
          getReq.onsuccess = () => {
            resolve(getReq.result instanceof ArrayBuffer ? getReq.result : null);
          };
          getReq.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function setCachedModelBuffer(key: string, buffer: ArrayBuffer): Promise<void> {
  return new Promise(resolve => {
    if (typeof indexedDB === 'undefined') {
      resolve();
      return;
    }
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => {
        try {
          const db = req.result;
          const tx = db.transaction(IDB_STORE, 'readwrite');
          const store = tx.objectStore(IDB_STORE);
          store.put(buffer, key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      };
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export class OnnxPigDetector {
  private session: any = null;
  private isLoaded = false;
  private status: ModelLoadingStatus = 'idle';
  private statusMessage = 'Đang chuẩn bị mô hình weights1.onnx...';
  private modelName = 'weights1.onnx';
  private inputWidth = 640;
  private inputHeight = 640;
  private preCanvas: OffscreenCanvas | HTMLCanvasElement | null = null;
  private preCtx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null = null;
  private float32Data: Float32Array = new Float32Array(3 * 640 * 640);
  private loadingPromise: Promise<boolean> | null = null;

  constructor() {
    this.initPreCanvas(640, 640);
    // Tự động tìm và nạp file /weights1.onnx khi ứng dụng khởi chạy
    this.autoLoadModel(DEFAULT_MODEL_URL);
  }

  private initPreCanvas(w = 640, h = 640) {
    this.inputWidth = w;
    this.inputHeight = h;
    if (this.float32Data.length !== 3 * w * h) {
      this.float32Data = new Float32Array(3 * w * h);
    }
    if (typeof OffscreenCanvas !== 'undefined') {
      if (!this.preCanvas || !(this.preCanvas instanceof OffscreenCanvas)) {
        this.preCanvas = new OffscreenCanvas(this.inputWidth, this.inputHeight);
      } else {
        this.preCanvas.width = this.inputWidth;
        this.preCanvas.height = this.inputHeight;
      }
      this.preCtx = this.preCanvas.getContext('2d', { willReadFrequently: true });
    } else if (typeof document !== 'undefined') {
      if (!this.preCanvas) {
        this.preCanvas = document.createElement('canvas');
      }
      this.preCanvas.width = this.inputWidth;
      this.preCanvas.height = this.inputHeight;
      this.preCtx = this.preCanvas.getContext('2d', { willReadFrequently: true });
    }
  }

  /**
   * Truy cập thư viện ONNX Runtime Web được nhúng qua CDN trong index.html
   */
  private getOrt(): any {
    if (typeof window !== 'undefined' && (window as any).ort) {
      return (window as any).ort;
    }
    return null;
  }

  /**
   * Đợi thư viện ONNX Runtime Web sẵn sàng (tự động chèn script CDN nếu cần)
   */
  private async waitForOrt(timeoutMs = 15000): Promise<any> {
    const existing = this.getOrt();
    if (existing) return existing;

    if (typeof document !== 'undefined' && !document.querySelector('script[src*="onnxruntime-web"]')) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js';
      script.async = true;
      document.head.appendChild(script);
    }

    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const ort = this.getOrt();
      if (ort) return ort;
      await new Promise(r => setTimeout(r, 150));
    }
    return null;
  }

  public getStatus(): ModelStatusInfo {
    return {
      isLoaded: this.isLoaded,
      status: this.status,
      statusMessage: this.statusMessage,
      modelName: this.modelName,
    };
  }

  /**
   * Cấu hình môi trường WASM chuẩn của ONNX Runtime Web
   */
  private configureOrtEnv(ort: any) {
    ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";
    const canUseThreads =
      typeof crossOriginIsolated !== 'undefined' &&
      crossOriginIsolated &&
      typeof navigator !== 'undefined' &&
      Boolean(navigator.hardwareConcurrency);
    ort.env.wasm.numThreads = canUseThreads ? Math.min(4, navigator.hardwareConcurrency) : 1;
    ort.env.wasm.simd = true;
    ort.env.wasm.proxy = false;
  }

  /**
   * Khởi tạo session ONNX với executionProviders: ['wasm']
   * Tự động fallback numThreads = 1 nếu trình duyệt không bật SharedArrayBuffer
   */
  private async createWasmSession(ort: any, modelSource: Uint8Array | string): Promise<any> {
    this.configureOrtEnv(ort);
    try {
      return await ort.InferenceSession.create(modelSource, {
        executionProviders: ['wasm'],
      });
    } catch (err) {
      console.warn('[ONNX] Thử lại khởi tạo session WASM với numThreads = 1:', err);
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.proxy = false;
      return await ort.InferenceSession.create(modelSource, {
        executionProviders: ['wasm'],
      });
    }
  }

  /**
   * Đồng bộ kích thước input thực tế từ session.inputMetadata (thường là 640x640 hoặc 416x416)
   */
  private syncInputDimensionsFromSession() {
    try {
      if (!this.session) return;
      const meta = this.session.inputMetadata;
      const inputName = this.session.inputNames?.[0];
      const info = meta && inputName ? meta[inputName] : Array.isArray(meta) ? meta[0] : null;
      const dims = info?.dimensions || info?.shape;
      if (Array.isArray(dims) && dims.length === 4) {
        const h = Number(dims[2]);
        const w = Number(dims[3]);
        if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
          this.initPreCanvas(w, h);
        }
      }
    } catch {
      // Giữ mặc định 640x640
    }
  }

  /**
   * Tự động nạp trực tiếp mô hình từ "/weights1.onnx" kèm cơ chế try/catch & dự phòng IndexedDB Cache
   */
  public async autoLoadModel(url = DEFAULT_MODEL_URL): Promise<boolean> {
    if (this.isLoaded && this.session) {
      return true;
    }
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = this.performLoadModel(url).finally(() => {
      this.loadingPromise = null;
    });
    return this.loadingPromise;
  }

  private async performLoadModel(url = DEFAULT_MODEL_URL): Promise<boolean> {
    this.status = 'loading';
    this.statusMessage = 'Đang kết nối mô hình AI...';

    const ort = await this.waitForOrt();
    if (!ort) {
      this.isLoaded = false;
      this.status = 'error';
      this.statusMessage = 'Không thể tải thư viện ONNX Runtime Web từ CDN.';
      console.error('[ONNX] Không tìm thấy window.ort sau khi chờ CDN.');
      return false;
    }

    this.configureOrtEnv(ort);

    // Bước 1: Thử nạp nhanh từ IndexedDB Cache nếu đã lưu từ lần mở trước
    try {
      const cachedBuffer = await getCachedModelBuffer(url);
      if (cachedBuffer && cachedBuffer.byteLength > 1024) {
        this.session = await this.createWasmSession(ort, new Uint8Array(cachedBuffer));
        if (this.session) {
          this.syncInputDimensionsFromSession();
          this.isLoaded = true;
          this.status = 'loaded';
          this.modelName = 'weights1.onnx';
          this.statusMessage = 'Đã kết nối mô hình AI (Sẵn sàng)';
          return true;
        }
      }
    } catch (cacheErr) {
      console.warn('[ONNX] Cache IndexedDB không hợp lệ, chuyển sang tải mới từ', url, cacheErr);
    }

    // Bước 2: Nạp trực tiếp từ đường dẫn tĩnh nội bộ "/weights1.onnx" (kèm try/catch chi tiết)
    try {
      const resp = await fetch(url, { cache: 'no-cache' });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} khi tải ${url}`);
      }
      const buffer = await resp.arrayBuffer();
      if (!buffer || buffer.byteLength < 1024) {
        throw new Error(`Tệp ${url} trống hoặc không hợp lệ (${buffer?.byteLength ?? 0} bytes)`);
      }

      // Lưu vào IndexedDB Cache cho các lần mở tiếp theo
      await setCachedModelBuffer(url, buffer);

      this.session = await this.createWasmSession(ort, new Uint8Array(buffer));
      if (this.session) {
        this.syncInputDimensionsFromSession();
        this.isLoaded = true;
        this.status = 'loaded';
        this.modelName = 'weights1.onnx';
        this.statusMessage = 'Đã kết nối mô hình AI (Sẵn sàng)';
        return true;
      }
    } catch (firstErr: unknown) {
      console.error(`[ONNX] Lần nạp đầu từ "${url}" thất bại, đang thử lại:`, firstErr);

      // Bước 3: Tự động thử lại bằng cách gọi trực tiếp ort.InferenceSession.create("/weights1.onnx") hoặc đọc lại IndexedDB Cache
      try {
        const retryCache = await getCachedModelBuffer(url);
        if (retryCache && retryCache.byteLength > 1024) {
          this.session = await this.createWasmSession(ort, new Uint8Array(retryCache));
        } else {
          this.session = await this.createWasmSession(ort, url);
        }

        if (this.session) {
          this.syncInputDimensionsFromSession();
          this.isLoaded = true;
          this.status = 'loaded';
          this.modelName = 'weights1.onnx';
          this.statusMessage = 'Đã kết nối mô hình AI (Sẵn sàng)';
          return true;
        }
      } catch (retryErr: unknown) {
        console.error('[ONNX] Thử lại nạp mô hình "/weights1.onnx" thất bại chi tiết:', retryErr);
        this.isLoaded = false;
        this.status = 'error';
        const msg = retryErr instanceof Error ? retryErr.message : String(retryErr);
        this.statusMessage = `Lỗi nạp mô hình AI: ${msg}`;
        return false;
      }
    }

    this.isLoaded = false;
    this.status = 'error';
    this.statusMessage = 'Không thể khởi tạo mô hình /weights1.onnx';
    return false;
  }

  /**
   * Nạp tệp từ URL bất kỳ (mặc định là "/weights1.onnx")
   */
  public async loadModelFromUrl(url = DEFAULT_MODEL_URL): Promise<boolean> {
    this.isLoaded = false;
    this.session = null;
    return this.autoLoadModel(url);
  }

  /**
   * Nạp thủ công tệp weights1.onnx từ ArrayBuffer
   */
  public async loadModelFromBuffer(buffer: ArrayBuffer, fileName = 'weights1.onnx'): Promise<boolean> {
    const ort = await this.waitForOrt();
    if (!ort) {
      throw new Error('Thư viện ONNX Runtime Web CDN chưa được tải. Vui lòng kiểm tra kết nối mạng.');
    }

    try {
      this.isLoaded = false;
      this.status = 'loading';
      this.statusMessage = `Đang nạp ${fileName}...`;

      const modelBytes = new Uint8Array(buffer);
      this.session = await this.createWasmSession(ort, modelBytes);

      this.syncInputDimensionsFromSession();
      await setCachedModelBuffer(DEFAULT_MODEL_URL, buffer);

      this.isLoaded = true;
      this.status = 'loaded';
      this.modelName = fileName;
      this.statusMessage = 'Đã kết nối mô hình AI (Sẵn sàng)';
      return true;
    } catch (err: unknown) {
      console.error('[ONNX] Lỗi nạp file từ ArrayBuffer:', err);
      this.isLoaded = false;
      this.status = 'error';
      const msg = err instanceof Error ? err.message : String(err);
      this.statusMessage = `Lỗi nạp file: ${msg}`;
      throw err;
    }
  }

  /**
   * TIỀN XỬ LÝ (PRE-PROCESSING CHUẨN YOLOv8 & TỐI ƯU BỘ NHỚ)
   * - Tái sử dụng duy nhất 1 canvas ẩn và 1 mảng Float32Array cho mọi frame để không gây tràn RAM hay nóng máy
   */
  private preprocess(source: HTMLCanvasElement | HTMLVideoElement): any {
    const ort = this.getOrt();
    if (!this.preCanvas || !this.preCtx || !ort) return null;

    this.preCtx.drawImage(source, 0, 0, this.inputWidth, this.inputHeight);
    const imgData = this.preCtx.getImageData(0, 0, this.inputWidth, this.inputHeight).data;

    const float32Data = this.float32Data;
    const imageArea = this.inputWidth * this.inputHeight;

    for (let i = 0; i < imageArea; i++) {
      const idx = i * 4;
      float32Data[i] = imgData[idx] / 255.0; // Kênh R
      float32Data[i + imageArea] = imgData[idx + 1] / 255.0; // Kênh G
      float32Data[i + 2 * imageArea] = imgData[idx + 2] / 255.0; // Kênh B
    }

    return new ort.Tensor('float32', float32Data, [1, 3, this.inputHeight, this.inputWidth]);
  }

  /**
   * HẬU XỬ LÝ (POST-PROCESSING) & NON-MAXIMUM SUPPRESSION (NMS, IoU = 0.45)
   */
  public async detectPigs(
    source: HTMLCanvasElement | HTMLVideoElement,
    confidenceThreshold = 0.25,
    displayWidth = 640,
    displayHeight = 480
  ): Promise<DetectionBox[]> {
    if (!this.session || !this.isLoaded) {
      return [];
    }

    try {
      const tensor = this.preprocess(source);
      if (!tensor) return [];

      const inputName = this.session.inputNames[0] || 'images';
      const feeds = { [inputName]: tensor };

      const results = await this.session.run(feeds);
      const outputName = this.session.outputNames[0];
      const outputTensor = results[outputName];
      if (!outputTensor) return [];

      const data = outputTensor.data as Float32Array;
      const dims = outputTensor.dims;

      const boxes: DetectionBox[] = [];
      const origW = displayWidth || (source instanceof HTMLVideoElement ? source.videoWidth || 640 : source.width);
      const origH = displayHeight || (source instanceof HTMLVideoElement ? source.videoHeight || 480 : source.height);
      const scaleX = origW / this.inputWidth;
      const scaleY = origH / this.inputHeight;

      // ĐỊNH DẠNG 1: Chuẩn YOLOv8 [1, channels, 8400] (ví dụ: [1, 5, 8400] hoặc [1, 6, 8400])
      if (dims.length === 3 && dims[1] < dims[2]) {
        const channels = dims[1]; // 4 coords (cx, cy, w, h) + num_classes
        const candidates = dims[2]; // thường là 8400 boxes

        for (let i = 0; i < candidates; i++) {
          const cx = data[0 * candidates + i];
          const cy = data[1 * candidates + i];
          const w = data[2 * candidates + i];
          const h = data[3 * candidates + i];

          let pigScore = 0;
          let isPig = false;

          if (channels === 5) {
            // Model 1 class: chỉ có duy nhất lớp Heo (Pig)
            pigScore = data[4 * candidates + i];
            isPig = true;
          } else {
            // Model đa lớp: Class 0 = Heo (Pig). Bỏ qua hoàn toàn các lớp khác (người, vật dụng, gậy)
            const class0Score = data[4 * candidates + i];
            let maxOtherScore = 0;
            for (let c = 5; c < channels; c++) {
              const other = data[c * candidates + i];
              if (other > maxOtherScore) maxOtherScore = other;
            }

            if (class0Score >= confidenceThreshold && class0Score > maxOtherScore) {
              pigScore = class0Score;
              isPig = true;
            }
          }

          if (isPig && pigScore >= confidenceThreshold) {
            this.addBoxWithScaling(boxes, cx, cy, w, h, pigScore, scaleX, scaleY, origW, origH);
          }
        }
      }
      // ĐỊNH DẠNG 2: Transposed YOLO [1, 8400, channels]
      else if (dims.length === 3 && dims[1] >= dims[2]) {
        const candidates = dims[1];
        const channels = dims[2];

        for (let i = 0; i < candidates; i++) {
          const offset = i * channels;
          const cx = data[offset];
          const cy = data[offset + 1];
          const w = data[offset + 2];
          const h = data[offset + 3];

          let pigScore = 0;
          let isPig = false;

          if (channels === 5) {
            pigScore = data[offset + 4];
            isPig = true;
          } else {
            const class0Score = data[offset + 4];
            let maxOtherScore = 0;
            for (let c = 5; c < channels; c++) {
              const other = data[offset + c];
              if (other > maxOtherScore) maxOtherScore = other;
            }

            if (class0Score >= confidenceThreshold && class0Score > maxOtherScore) {
              pigScore = class0Score;
              isPig = true;
            }
          }

          if (isPig && pigScore >= confidenceThreshold) {
            this.addBoxWithScaling(boxes, cx, cy, w, h, pigScore, scaleX, scaleY, origW, origH);
          }
        }
      }
      // ĐỊNH DẠNG 3: YOLOv5 có NMS tích hợp sẵn [1, N, 6] (x1, y1, x2, y2, score, classId)
      else if (dims.length === 3 && dims[2] === 6) {
        const count = dims[1];
        for (let i = 0; i < count; i++) {
          const offset = i * 6;
          const x1 = data[offset];
          const y1 = data[offset + 1];
          const x2 = data[offset + 2];
          const y2 = data[offset + 3];
          const score = data[offset + 4];
          const classId = Math.round(data[offset + 5]);

          // Chỉ nhận classId === 0 (Heo) và score >= confidenceThreshold
          if (classId === 0 && score >= confidenceThreshold) {
            const w = x2 - x1;
            const h = y2 - y1;
            const cx = x1 + w / 2;
            const cy = y1 + h / 2;
            this.addBoxWithScaling(boxes, cx, cy, w, h, score, scaleX, scaleY, origW, origH);
          }
        }
      }

      // Áp dụng thuật toán Non-Maximum Suppression (NMS) với iouThreshold = 0.45 (Yêu cầu 5)
      return this.applyNMS(boxes, 0.45);
    } catch (err) {
      console.error('Lỗi suy luận ONNX:', err);
      return [];
    }
  }

  /**
   * Quy đổi tọa độ từ hệ 640x640 về kích thước hiển thị thực tế
   */
  private addBoxWithScaling(
    boxes: DetectionBox[],
    cx: number,
    cy: number,
    w: number,
    h: number,
    score: number,
    scaleX: number,
    scaleY: number,
    origW: number,
    origH: number
  ) {
    const boxW = Math.max(16, w * scaleX);
    const boxH = Math.max(16, h * scaleY);
    const boxX = Math.max(0, (cx - w / 2) * scaleX);
    const boxY = Math.max(0, (cy - h / 2) * scaleY);

    if (boxX >= origW || boxY >= origH) return;

    boxes.push({
      x: Math.round(boxX),
      y: Math.round(boxY),
      width: Math.round(Math.min(boxW, origW - boxX)),
      height: Math.round(Math.min(boxH, origH - boxY)),
      confidence: parseFloat(score.toFixed(4)),
    });
  }

  /**
   * Thuật toán Non-Maximum Suppression (NMS) với iouThreshold = 0.45
   */
  private applyNMS(boxes: DetectionBox[], iouThreshold = 0.45): DetectionBox[] {
    if (boxes.length <= 1) return boxes;

    // Sắp xếp giảm dần theo điểm tin cậy
    boxes.sort((a, b) => b.confidence - a.confidence);

    const selected: DetectionBox[] = [];
    const active = new Array(boxes.length).fill(true);

    for (let i = 0; i < boxes.length; i++) {
      if (!active[i]) continue;
      const b1 = boxes[i];
      selected.push(b1);

      for (let j = i + 1; j < boxes.length; j++) {
        if (!active[j]) continue;
        const b2 = boxes[j];

        const x1 = Math.max(b1.x, b2.x);
        const y1 = Math.max(b1.y, b2.y);
        const x2 = Math.min(b1.x + b1.width, b2.x + b2.width);
        const y2 = Math.min(b1.y + b1.height, b2.y + b2.height);

        const interW = Math.max(0, x2 - x1);
        const interH = Math.max(0, y2 - y1);
        const interArea = interW * interH;

        const unionArea = b1.width * b1.height + b2.width * b2.height - interArea;
        const iou = unionArea > 0 ? interArea / unionArea : 0;

        if (iou > iouThreshold) {
          active[j] = false;
        }
      }
    }

    return selected;
  }
}
