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
  /** Maximum vertices per chunk to control memory usage */
  maxVerticesPerChunk: number;
  /** Determines whether a unique feature identifier should be automatically generated for each feature missing an indentifier */
  generateFeatureId?: boolean;
  /** Logger for debugging and monitoring */
  logger?: Logger;
  /** State manager for resumable processing */
  stateManager?: StateManager;
  /** Metrics collector for performance monitoring */
  metricsCollector?: MetricsCollector;
}
