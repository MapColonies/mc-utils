/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import * as shapefile from 'shapefile';
import { ReaderOptions, ChunkProcessor, ShapefileChunk, ProcessingState, ProgressInfo } from '../types';
import { countVertices } from '../utils/geometry';
import { ChunkBuilder } from './chunkBuilder';
import { IProgressTracker, ProgressTracker } from './progressTracker';
import { IMetricsManager, MetricsManager } from './metricsManager';

export class ShapefileChunkReader {
  private metricsManager?: IMetricsManager;
  private progressTracker?: IProgressTracker;
  private lastState: ProcessingState | null = null;

  public constructor(private readonly options: ReaderOptions) {}

  /**
   * Reads a shapefile and processes it in chunks.
   * @param shapefilePath Path to the shapefile to read
   * @param processor Processor to handle each chunk of features
   */
  public async read(shapefilePath: string, processor: ChunkProcessor): Promise<void> {
    await this.initializeReading(shapefilePath);

    let featureIndex = -1;
    const chunkIndex = this.lastState?.lastProcessedChunkIndex ?? 0;

    try {
      const reader = await shapefile.open(shapefilePath);

      const chunkBuilder = new ChunkBuilder(chunkIndex);

      this.options.logger?.info({ msg: 'Reading started' });
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const readStart = performance.now();
        const { done, value: feature } = await reader.read();

        if (done) {
          break;
        }

        featureIndex++;

        if (this.shouldSkipFeature(featureIndex)) {
          continue;
        }

        const readTime = performance.now() - readStart;
        this.options.logger?.info({ msg: 'Reading finished', readTime });

        // Check if we can add this feature to the current chunk
        if (!chunkBuilder.canAddFeature(feature, this.options.maxVerticesPerChunk)) {
          // Process current chunk before starting a new one
          if (!chunkBuilder.isEmpty()) {
            const chunk = chunkBuilder.build();
            await this.processChunk(chunk, processor, readTime, shapefilePath);
            chunkBuilder.nextChunk();
          }
        }

        chunkBuilder.addFeature(feature);
      }

      // Process any remaining features
      if (!chunkBuilder.isEmpty()) {
        await this.processChunk(chunkBuilder.build(), processor, 0, shapefilePath);
      }

      this.metricsManager?.sendFileMetrics();
    } catch (error) {
      this.options.logger?.error({ msg: 'Error processing shapefile:', shapefilePath, error });
      const lastFeatureIndex = (this.progressTracker?.getProcessedFeatures() ?? 0) - 1;

      await this.saveProcessingState({
        filePath: shapefilePath,
        chunkIndex,
        lastFeatureIndex,
      });
      throw error;
    }
  }

  /**
   * Count total vertices in the shapefile for progress calculation
   * @param shapefilePath Path to the shapefile
   * @returns Total number of vertices in the shapefile
   */
  public async getShapefileStats(shapefilePath: string): Promise<Pick<ProgressInfo, 'totalVertices' | 'totalFeatures'>> {
    const reader = await shapefile.open(shapefilePath);
    let totalVertices = 0;
    let totalFeatures = 0;

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value: feature } = await reader.read();

        if (done) {
          break;
        }

        totalFeatures++;

        const vertices = countVertices(feature.geometry);

        if (vertices > this.options.maxVerticesPerChunk) {
          this.options.logger?.warn({
            msg: `Feature exceeds maximum vertices limit: ${vertices} > ${this.options.maxVerticesPerChunk}`,
            featureId: feature.id,
          });
          continue; // Skip features that exceed the limit
        }

        totalVertices += vertices;
      }
    } catch (error) {
      this.options.logger?.error({ msg: 'Error counting vertices in shapefile:', error });
      throw error;
    }

    return { totalVertices, totalFeatures };
  }

  private async processChunk(chunk: ShapefileChunk, processor: ChunkProcessor, readTime: number, filePath: string): Promise<void> {
    // Reset resource monitoring for this chunk if enabled
    this.metricsManager?.resetResourceMonitoring();

    const processStart = performance.now();

    try {
      await processor.process(chunk);
    } catch (error) {
      console.error(`Error processing chunk ${chunk.id}:`, error);
      throw error;
    }

    const processTime = performance.now() - processStart;

    this.metricsManager?.sendChunkMetrics(chunk, readTime, processTime);

    this.progressTracker?.addProcessedFeatures(chunk.features.length, chunk.verticesCount);
    this.progressTracker?.incrementChunks();
    const lastFeatureIndex = (this.progressTracker?.getProcessedFeatures() ?? 0) - 1;

    // Save state after successful processing with progress information
    await this.saveProcessingState({
      filePath,
      chunkIndex: chunk.id,
      lastFeatureIndex,
    });
  }

  /**
   * Save processing state if state manager is available
   * @param context Context object containing the required state information
   */
  private async saveProcessingState(context: { filePath: string; chunkIndex: number; lastFeatureIndex: number }): Promise<void> {
    if (!this.options.stateManager) {
      return;
    }

    const state: ProcessingState = {
      filePath: context.filePath,
      lastProcessedChunkIndex: context.chunkIndex,
      lastProcessedFeatureIndex: context.lastFeatureIndex,
      timestamp: new Date(),
      progress: this.progressTracker?.calculateProgress(),
    };
    await this.options.stateManager.saveState(state);
  }

  private async initializeReading(shapefilePath: string): Promise<void> {
    try {
      if (this.options.metricsCollector) {
        this.metricsManager = new MetricsManager(shapefilePath, this.options.metricsCollector, this.options.includeResourceMetrics);
      }

      this.lastState = (await this.options.stateManager?.loadState()) ?? null;
      const { totalFeatures, totalVertices } = this.lastState?.progress ?? (await this.getShapefileStats(shapefilePath));
      this.progressTracker = new ProgressTracker(totalVertices, totalFeatures, this.options.maxVerticesPerChunk, this.lastState?.progress);
    } catch (error) {
      this.options.logger?.error({ msg: 'Failed to initialize reading', error });
      throw error;
    }
  }

  private shouldSkipFeature(featureIndex: number): boolean {
    return this.lastState !== null && featureIndex <= this.lastState.lastProcessedFeatureIndex;
  }
}
