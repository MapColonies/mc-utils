interface SyncStateManager {
  saveState: (state: ProcessingState) => Promise<void>;
  loadState: () => ProcessingState | null;
}

interface AsyncStateManager {
  saveState: (state: ProcessingState) => Promise<void>;
  loadState: () => Promise<ProcessingState | null>;
}

export type StateManager = SyncStateManager | AsyncStateManager;

export interface ProgressInfo {
  startTime: number;
  endTime?: number;
  processedFeatures: number;
  totalFeatures: number;
  processedChunks: number;
  totalChunks: number;
  processedVertices: number;
  totalVertices: number;
  percentage: number;
  elapsedTimeMs: number;
  estimatedRemainingTimeMs: number;
  featuresPerSecond: number;
  verticesPerSecond: number;
  chunksPerSecond: number;
}

export interface ProcessingState {
  filePath: string;
  lastProcessedChunkId: number;
  lastProcessedFeatureIndex: number;
  timestamp: Date;
  progress?: ProgressInfo;
}
