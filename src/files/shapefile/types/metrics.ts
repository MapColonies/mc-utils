export interface ResourceMetrics {
  cpu: number; // Absolute CPU cores used (e.g., 0.5 = 500m, 1.2 = 1200m)
  memory: number; // Absolute memory in MB (e.g., 512 MB)
}

export interface ChunkMetrics {
  chunkIndex: number;
  featuresCount: number;
  verticesCount: number;
  readTimeMs: number;
  processTimeMs: number;
  totalTimeMs: number;
  timestamp: Date;
  resources?: ResourceMetrics;
}

export interface FileMetrics {
  filePath: string;
  totalFeatures: number;
  totalVertices: number;
  totalChunks: number;
  totalReadTimeMs: number;
  totalProcessTimeMs: number;
  totalTimeMs: number;
  startTime: Date;
  endTime?: Date;
  peakResources?: ResourceMetrics;
}

export interface MetricsCollector {
  onChunkMetrics?: (metrics: ChunkMetrics) => void;
  onFileMetrics?: (metrics: FileMetrics) => void;
}
