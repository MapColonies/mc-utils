export interface ChunkMetrics {
  chunkIndex: number;
  featuresCount: number;
  verticesCount: number;
  readTimeMs: number;
  processTimeMs: number;
  totalTimeMs: number;
  timestamp: Date;
}

export interface FileMetrics {
  totalFeatures: number;
  totalVertices: number;
  totalChunks: number;
  totalReadTimeMs: number;
  totalProcessTimeMs: number;
  totalTimeMs: number;
  startTime: Date;
  endTime?: Date;
}

export interface MetricsCollector {
  onChunkMetrics?: (metrics: ChunkMetrics) => void;
  onFileMetrics?: (metrics: FileMetrics) => void;
}
