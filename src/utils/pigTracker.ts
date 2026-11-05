import { CountDirection, PigTrack, Point2D, LineZonePoints } from '../types';

export interface DetectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export interface TrackingOptions {
  linePoints: LineZonePoints;
  isFlipped: boolean; // default: false
  onCross?: (track: PigTrack, direction: CountDirection) => void;
  maxDistanceThreshold?: number;
  maxMissedFrames?: number;
}

// 2D Cross product orientation
function ccw(p1: Point2D, p2: Point2D, p3: Point2D): number {
  return (p3.y - p1.y) * (p2.x - p1.x) - (p2.y - p1.y) * (p3.x - p1.x);
}

// Check if two line segments (a-b) and (c-d) intersect
function segmentsIntersect(a: Point2D, b: Point2D, c: Point2D, d: Point2D): boolean {
  const ccw1 = ccw(a, b, c);
  const ccw2 = ccw(a, b, d);
  const ccw3 = ccw(c, d, a);
  const ccw4 = ccw(c, d, b);

  if (
    ((ccw1 > 0 && ccw2 < 0) || (ccw1 < 0 && ccw2 > 0)) &&
    ((ccw3 > 0 && ccw4 < 0) || (ccw3 < 0 && ccw4 > 0))
  ) {
    return true;
  }
  return false;
}

export class PigTracker {
  private tracks: Map<number, PigTrack> = new Map();
  private nextId = 1;
  private missedFrames: Map<number, number> = new Map();
  private options: TrackingOptions;

  constructor(options: TrackingOptions) {
    this.options = {
      maxDistanceThreshold: 65,
      maxMissedFrames: 14,
      ...options,
    };
  }

  public updateOptions(newOptions: Partial<TrackingOptions>) {
    this.options = { ...this.options, ...newOptions };
  }

  public reset() {
    this.tracks.clear();
    this.missedFrames.clear();
    this.nextId = 1;
  }

  public getTracks(): PigTrack[] {
    return Array.from(this.tracks.values());
  }

  /**
   * Process a frame's detected boxes and evaluate LineZone crossing with arbitrary 2-point line
   */
  public update(
    detections: DetectionBox[],
    _canvasWidth: number,
    _canvasHeight: number
  ): {
    tracks: PigTrack[];
    crossings: Array<{ track: PigTrack; direction: CountDirection }>;
  } {
    const crossings: Array<{ track: PigTrack; direction: CountDirection }> = [];
    const maxDist = this.options.maxDistanceThreshold || 65;
    const maxMissed = this.options.maxMissedFrames || 14;

    const lineA = this.options.linePoints.p1;
    const lineB = this.options.linePoints.p2;

    const matchedDetectionIndices = new Set<number>();
    const matchedTrackIds = new Set<number>();

    // 1. Associate detections with existing tracks (Centroid + IoU hybrid matching & coordinate smoothing)
    const existingTracks = Array.from(this.tracks.values());
    const smoothAlpha = 0.65; // Hệ số làm mượt tọa độ giúp khung bám sát từng con heo không bị nhấp nháy

    for (const track of existingTracks) {
      let bestScore = Infinity;
      let bestIndex = -1;

      const trackLeft = track.x - track.width / 2;
      const trackTop = track.y - track.height / 2;
      const trackRight = trackLeft + track.width;
      const trackBottom = trackTop + track.height;

      for (let i = 0; i < detections.length; i++) {
        if (matchedDetectionIndices.has(i)) continue;
        const det = detections[i];
        const detCenterX = det.x + det.width / 2;
        const detCenterY = det.y + det.height / 2;

        const dist = Math.hypot(detCenterX - track.x, detCenterY - track.y);

        // Compute IoU between existing track box and detection box
        const interX1 = Math.max(trackLeft, det.x);
        const interY1 = Math.max(trackTop, det.y);
        const interX2 = Math.min(trackRight, det.x + det.width);
        const interY2 = Math.min(trackBottom, det.y + det.height);
        const interArea = Math.max(0, interX2 - interX1) * Math.max(0, interY2 - interY1);
        const unionArea = track.width * track.height + det.width * det.height - interArea;
        const iou = unionArea > 0 ? interArea / unionArea : 0;

        // Match if within centroid distance OR overlapping IoU >= 0.2
        if (dist < maxDist || iou >= 0.2) {
          const score = dist * (1 - iou * 0.5);
          if (score < bestScore) {
            bestScore = score;
            bestIndex = i;
          }
        }
      }

      if (bestIndex !== -1) {
        matchedDetectionIndices.add(bestIndex);
        matchedTrackIds.add(track.id);

        const det = detections[bestIndex];
        const rawX = det.x + det.width / 2;
        const rawY = det.y + det.height / 2;

        // Làm mượt tọa độ (smoothing) để khung bám sát heo mượt mà
        const newX = track.x + smoothAlpha * (rawX - track.x);
        const newY = track.y + smoothAlpha * (rawY - track.y);
        const newW = track.width + smoothAlpha * (det.width - track.width);
        const newH = track.height + smoothAlpha * (det.height - track.height);

        const prevPoint: Point2D = { x: track.x, y: track.y };
        const currPoint: Point2D = { x: newX, y: newY };

        track.vx = newX - track.x;
        track.vy = newY - track.y;
        track.speed = Math.hypot(track.vx, track.vy);
        track.x = newX;
        track.y = newY;
        track.width = newW;
        track.height = newH;
        track.confidence = det.confidence;
        track.lastSeen = Date.now();

        track.history.push({ x: newX, y: newY });
        if (track.history.length > 25) {
          track.history.shift();
        }

        this.missedFrames.delete(track.id);

        // 2. Evaluate Arbitrary 2-Point Line Crossing (Mỗi ID chỉ đếm 1 lần qua vạch, chống đếm trùng)
        if (!track.crossed) {
          const prevStart = track.history.length >= 2 ? track.history[track.history.length - 2] : prevPoint;
          const intersects =
            segmentsIntersect(lineA, lineB, prevPoint, currPoint) ||
            segmentsIntersect(lineA, lineB, prevStart, currPoint);

          if (intersects) {
            const lineDx = lineB.x - lineA.x;
            const lineDy = lineB.y - lineA.y;
            const moveDx = currPoint.x - prevStart.x;
            const moveDy = currPoint.y - prevStart.y;

            const crossProduct = lineDx * moveDy - lineDy * moveDx;

            let crossingDir: CountDirection;
            if (!this.options.isFlipped) {
              crossingDir = crossProduct >= 0 ? 'IN_TO_OUT' : 'OUT_TO_IN';
            } else {
              crossingDir = crossProduct <= 0 ? 'IN_TO_OUT' : 'OUT_TO_IN';
            }

            track.crossed = true;
            track.crossedDirection = crossingDir;
            crossings.push({ track, direction: crossingDir });
            this.options.onCross?.(track, crossingDir);
          }
        }
      } else {
        const missed = (this.missedFrames.get(track.id) || 0) + 1;
        this.missedFrames.set(track.id, missed);
        if (missed > maxMissed) {
          this.tracks.delete(track.id);
          this.missedFrames.delete(track.id);
        }
      }
    }

    // 3. Register new tracks
    for (let i = 0; i < detections.length; i++) {
      if (!matchedDetectionIndices.has(i)) {
        const det = detections[i];
        const centerX = det.x + det.width / 2;
        const centerY = det.y + det.height / 2;

        const newId = this.nextId++;
        const newTrack: PigTrack = {
          id: newId,
          x: centerX,
          y: centerY,
          width: det.width,
          height: det.height,
          vx: 0,
          vy: 0,
          speed: 0,
          history: [{ x: centerX, y: centerY }],
          confidence: det.confidence,
          crossed: false,
          color: getRandomDistinctColor(newId),
          lastSeen: Date.now(),
          isPig: true,
        };

        this.tracks.set(newId, newTrack);
      }
    }

    return {
      tracks: Array.from(this.tracks.values()),
      crossings,
    };
  }
}

function getRandomDistinctColor(seed: number): string {
  const hues = [160, 200, 280, 32, 190, 45, 310];
  const hue = hues[seed % hues.length];
  return `hsl(${hue}, 85%, 60%)`;
}
