import { Feature } from 'geojson';
import { Logger } from '@map-colonies/js-logger';
import { StateManager } from '../types';
import { MetricsCollector } from './metrics';

export * from './metrics';
export * from './state';

export interface ShapefileChunk {
  id: number;
  features: Feature[];
  skippedFeatures: Feature[];
  verticesCount: number;
}

export interface ChunkProcessor {
  process: (chunk: ShapefileChunk) => Promise<void>;
}

export interface ReaderOptions {
  logger?: Logger;
  maxVerticesPerChunk: number;
  stateManager?: StateManager;
  metricsCollector?: MetricsCollector;
  includeResourceMetrics?: boolean;
}
