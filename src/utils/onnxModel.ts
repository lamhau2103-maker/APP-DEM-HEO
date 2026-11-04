import { DetectionBox } from './pigTracker';

export type ModelLoadingStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface ModelStatusInfo {
  isLoaded: boolean;
  status: ModelLoadingStatus;
  statusMessage: string;
  modelName: string;
}

export const GITHUB_MODEL_URL =
  'https://github.com/lamhau2103-maker/APP-DEM-HEO/releases/download/v1.0.0/weights1.onnx';

export class OnnxPigDetector {
  private session: any = null;
  private isLoaded = false;
  private status: ModelLoadingStatus = 'idle';
  private statusMessage = 'Đang chuẩn bị mô hình weights1.onnx...';
  private modelName = 'weights1.onnx';
  private inputWidth = 640;
  private inputHeight = 640;
  private preCanvas: HTMLCanvasElement | null = null;
  private preCtx: CanvasRenderingContext2D | null = null;

  constructor() {
    this.initPreCanvas();
    // Tự động tìm và nạp file /weights1.onnx khi ứng dụng khởi chạy (Yêu cầu 3)
    this.autoLoadModel();
  }

  private initPreCanvas() {
    if (typeof document !== 'undefined') {
      this.preCanvas = document.createElement('canvas');
      this.preCanvas.width = this.inputWidth;
      this.preCanvas.height = this.inputHeight;
      this.preCtx = this.preCanvas.getContext('2d', { willReadFrequently: true });
    }
  }

  /**
   * Truy cập thư viện ONNX Runtime Web được nhúng qua CDN trong index.html
   * window.ort từ https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.min.js
   */
  private getOrt(): any {
    if (typeof window !== 'undefined' && (window as any).ort) {
      return (window as any).ort;
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
   * Tự động liên kết và nạp file weights1.onnx trực tiếp từ GitHub Release của người dùng
   */
  public async autoLoadModel(url = GITHUB_MODEL_URL): Promise<boolean> {
    const ort = this.getOrt();
    if (!ort) {
      // Đợi thêm một nhịp nếu CDN đang tải
      setTimeout(() => this.autoLoadModel(url), 500);
      return false;
    }

    try {
      this.status = 'loading';
      this.statusMessage = 'Đang kết nối mô hình AI...';

      // Cấu hình CDN WASM v1.18.0 ngay trước khi tạo session
      ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/';
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.proxy = false;

      // Ưu tiên tăng tốc phần cứng đồ họa bằng WebGL trước, sau đó fallback sang WASM
      let created = false;
      try {
        this.session = await ort.InferenceSession.create(url, {
          executionProviders: ['webgl', 'wasm'],
        });
        created = true;
      } catch {
        try {
          this.session = await ort.InferenceSession.create(url, {
            executionProviders: ['wasm'],
          });
          created = true;
        } catch {
          // Fallback tải buffer qua fetch (hỗ trợ redirect GitHub objects.githubusercontent.com)
          const resp = await fetch(url);
          if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
          }
          const buffer = await resp.arrayBuffer();
          const modelBytes = new Uint8Array(buffer);
          try {
            this.session = await ort.InferenceSession.create(modelBytes, {
              executionProviders: ['webgl', 'wasm'],
            });
          } catch {
            this.session = await ort.InferenceSession.create(modelBytes, {
              executionProviders: ['wasm'],
            });
          }
          created = true;
        }
      }

      if (created && this.session) {
        this.isLoaded = true;
        this.status = 'loaded';
        this.modelName = 'weights1.onnx (GitHub Release)';
        this.statusMessage = 'Mô hình AI: Sẵn sàng';
        return true;
      }

      throw new Error('Không thể khởi tạo session ONNX');
    } catch (err: unknown) {
      this.isLoaded = false;
      this.status = 'error';
      const msg = err instanceof Error ? err.message : String(err);
      this.statusMessage = `Đang kết nối lại mô hình AI... (${msg})`;
      return false;
    }
  }

  /**
   * Nạp tệp từ URL bất kỳ (mặc định là GitHub Release)
   */
  public async loadModelFromUrl(url = GITHUB_MODEL_URL): Promise<boolean> {
    return this.autoLoadModel(url);
  }

  /**
   * Nạp thủ công tệp weights1.onnx do người dùng chọn từ máy (Yêu cầu 3)
   */
  public async loadModelFromBuffer(buffer: ArrayBuffer, fileName = 'weights1.onnx'): Promise<boolean> {
    const ort = this.getOrt();
    if (!ort) {
      throw new Error('Thư viện ONNX Runtime Web CDN chưa được tải. Vui lòng kiểm tra kết nối mạng.');
    }

    try {
      this.isLoaded = false;
      this.status = 'loading';
      this.statusMessage = `Đang nạp ${fileName}...`;

      ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/';
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.proxy = false;

      const modelBytes = new Uint8Array(buffer);

      try {
        this.session = await ort.InferenceSession.create(modelBytes, {
          executionProviders: ['wasm', 'webgl'],
        });
      } catch {
        this.session = await ort.InferenceSession.create(modelBytes, {
          executionProviders: ['wasm'],
        });
      }

      this.isLoaded = true;
      this.status = 'loaded';
      this.modelName = fileName;
      this.statusMessage = `Đã kết nối weights1.onnx (${fileName})`;
      return true;
    } catch (err: unknown) {
      this.isLoaded = false;
      this.status = 'error';
      const msg = err instanceof Error ? err.message : String(err);
      this.statusMessage = `Lỗi nạp file: ${msg}`;
      throw err;
    }
  }

  /**
   * TIỀN XỬ LÝ (PRE-PROCESSING CHUẨN YOLOv8 - Yêu cầu 4)
   * - Vẽ khung hình qua thẻ canvas ẩn 640x640
   * - Lấy pixel data từ ctx.getImageData(0, 0, 640, 640).data
   * - Đóng gói mảng Float32Array 1 * 3 * 640 * 640 Planar RGB (NCHW)
   * - Trả về ort.Tensor
   */
  private preprocess(sourceCanvas: HTMLCanvasElement): any {
    const ort = this.getOrt();
    if (!this.preCanvas || !this.preCtx || !ort) return null;

    // Vẽ qua canvas ẩn 640x640
    this.preCtx.drawImage(sourceCanvas, 0, 0, this.inputWidth, this.inputHeight);
    const imgData = this.preCtx.getImageData(0, 0, this.inputWidth, this.inputHeight).data;

    // Thứ tự kênh màu Planar RGB (NCHW): toàn bộ kênh R, rồi G, rồi B (chia cho 255.0)
    const float32Data = new Float32Array(3 * this.inputWidth * this.inputHeight);
    const imageArea = this.inputWidth * this.inputHeight;

    for (let i = 0; i < imageArea; i++) {
      float32Data[i] = imgData[i * 4] / 255.0; // Kênh R
      float32Data[i + imageArea] = imgData[i * 4 + 1] / 255.0; // Kênh G
      float32Data[i + 2 * imageArea] = imgData[i * 4 + 2] / 255.0; // Kênh B
    }

    return new ort.Tensor('float32', float32Data, [1, 3, this.inputHeight, this.inputWidth]);
  }

  /**
   * HẬU XỬ LÝ (POST-PROCESSING) & NON-MAXIMUM SUPPRESSION (NMS - Yêu cầu 5)
   * - Đầu vào: sourceCanvas (kích thước thực) và confidenceThreshold (mặc định 0.45)
   * - Hỗ trợ các shape: [1, 4 + num_classes, 8400] và [1, 8400, 4 + num_classes]
   * - Chỉ giữ dự đoán có confidence >= 0.45 và classId === 0 (Heo)
   * - Áp dụng NMS với iouThreshold = 0.45
   * - Quy đổi tọa độ (x1, y1, x2, y2) về kích thước hiển thị thực tế
   */
  public async detectPigs(
    sourceCanvas: HTMLCanvasElement,
    confidenceThreshold = 0.45
  ): Promise<DetectionBox[]> {
    // Yêu cầu 1: Nếu mô hình ONNX chưa nạp xong, tuyệt đối không trả về kết quả giả
    if (!this.session || !this.isLoaded) {
      return [];
    }

    try {
      const tensor = this.preprocess(sourceCanvas);
      if (!tensor) return [];

      const inputName = this.session.inputNames[0] || 'images';
      const feeds = { [inputName]: tensor };

      // Chạy suy luận trực tiếp 100% bằng ONNX Runtime
      const results = await this.session.run(feeds);
      const outputName = this.session.outputNames[0];
      const outputTensor = results[outputName];
      if (!outputTensor) return [];

      const data = outputTensor.data as Float32Array;
      const dims = outputTensor.dims; // e.g. [1, 5, 8400] hoặc [1, 8400, 5] hoặc [1, N, 6]

      const boxes: DetectionBox[] = [];
      const origW = sourceCanvas.width;
      const origH = sourceCanvas.height;
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
