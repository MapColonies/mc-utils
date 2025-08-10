/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { open } from 'shapefile';
import { ReaderOptions, ChunkProcessor, ShapefileChunk, ProcessingState, ProgressInfo } from '../types';
import { countVertices } from '../../../geo/vertices';
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
  public async readAndProcess(shapefilePath: string, processor: ChunkProcessor): Promise<void> {
    const chunkIndex = await this.initializeReading(shapefilePath);
    let readFeatureIndex = -1;

    try {
      const reader = await open(shapefilePath);

      const chunkBuilder = new ChunkBuilder(this.options.maxVerticesPerChunk, chunkIndex);

      this.options.logger?.info({ msg: 'Reading started' });
      let readStart = performance.now();
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value: feature } = await reader.read();

        if (done) {
          break;
        }

        readFeatureIndex++;

        if (this.shouldSkipFeature(readFeatureIndex)) {
          continue;
        }

        if (!chunkBuilder.canAddFeature(feature)) {
          const readTime = performance.now() - readStart;
          const chunk = chunkBuilder.build();
          this.options.logger?.info({ msg: 'Chunk reading finished', readTime, chunkIndex: chunk.id, featuresCount: chunk.features.length });

          if (this.hasContentToProcess(chunk)) {
            await this.processChunk(chunk, processor, shapefilePath, readTime);
          }
          chunkBuilder.nextChunk();
          readStart = performance.now();
        }

        chunkBuilder.addFeature(feature);
      }

      // Process any remaining features
      const readTime = performance.now() - readStart;
      const finalChunk = chunkBuilder.build();

      if (this.hasContentToProcess(finalChunk)) {
        this.options.logger?.info({
          msg: 'Final chunk reading finished',
        });
        await this.processChunk(finalChunk, processor, shapefilePath, readTime);
      }

      this.metricsManager?.sendFileMetrics();
    } catch (error) {
      this.options.logger?.error({ msg: 'Error processing shapefile', shapefilePath, error });
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
   * Count total features and vertices in the shapefile for progress calculation
   * @param shapefilePath Path to the shapefile
   * @returns Total number of features and vertices in the shapefile
   */
  public async getShapefileStats(shapefilePath: string): Promise<Pick<ProgressInfo, 'totalVertices' | 'totalFeatures'>> {
    const reader = await open(shapefilePath);
    let totalVertices = 0;
    let totalFeatures = 0;

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value: feature } = await reader.read();

        if (done) {
          break;
        }

        const vertices = countVertices(feature.geometry);

        if (vertices > this.options.maxVerticesPerChunk) {
          this.options.logger?.warn({
            msg: `Feature exceeds maximum vertices limit: ${vertices} > ${this.options.maxVerticesPerChunk}`,
            featureId: feature.id,
          });
          continue; // Skip features that exceed the limit
        }
        totalFeatures++;

        totalVertices += vertices;
      }
    } catch (error) {
      this.options.logger?.error({ msg: 'Error counting vertices in shapefile', shapefilePath, error });
      throw error;
    }

    if (totalFeatures === 0 || totalVertices === 0) {
      const message = `Shapefile ${shapefilePath} has no valid features or vertices`;
      this.options.logger?.error({ msg: message });
      throw new Error(message);
    }

    return { totalVertices, totalFeatures };
  }

  private async processChunk(chunk: ShapefileChunk, processor: ChunkProcessor, filePath: string, readTime = 0): Promise<void> {
    const processStart = performance.now();

    try {
      this.options.logger?.info({ msg: 'Processing chunk', chunkIndex: chunk.id, featuresCount: chunk.features.length, filePath, readTime });
      await processor.process(chunk);
      this.options.logger?.info({ msg: 'Chunk processing finished', chunkIndex: chunk.id });
    } catch (error) {
      this.options.logger?.error(`Error processing chunk ${chunk.id}`, error);
      throw error;
    }

    const processTime = performance.now() - processStart;

    this.metricsManager?.sendChunkMetrics(chunk, readTime, processTime);

    this.progressTracker?.addProcessedFeatures(chunk.features.length, chunk.verticesCount);
    this.progressTracker?.addSkippedFeatures(chunk.skippedFeatures.length);
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
   * @param state State object containing the required state information
   */
  private async saveProcessingState(state: { filePath: string; chunkIndex: number; lastFeatureIndex: number }): Promise<void> {
    if (!this.options.stateManager) {
      return;
    }

    const currentState: ProcessingState = {
      filePath: state.filePath,
      lastProcessedChunkIndex: state.chunkIndex,
      lastProcessedFeatureIndex: state.lastFeatureIndex,
      timestamp: new Date(),
      progress: this.progressTracker?.calculateProgress(),
    };
    await this.options.stateManager.saveState(currentState);
  }

  private async initializeReading(shapefilePath: string): Promise<number> {
    try {
      if (this.options.metricsCollector) {
        this.metricsManager = new MetricsManager(this.options.metricsCollector);
      }
      this.lastState = (await this.options.stateManager?.loadState()) ?? null;
      const { totalFeatures, totalVertices } = this.lastState?.progress ?? (await this.getShapefileStats(shapefilePath));
      this.progressTracker = new ProgressTracker({
        totalVertices,
        totalFeatures,
        maxVerticesPerChunk: this.options.maxVerticesPerChunk,
        initialProgress: this.lastState?.progress,
      });

      const chunkIndex = this.lastState?.lastProcessedChunkIndex ?? 0;

      return chunkIndex;
    } catch (error) {
      this.options.logger?.error({ msg: 'Failed to initialize reading', error });
      throw error;
    }
  }

  private shouldSkipFeature(featureIndex: number): boolean {
    return this.lastState !== null && featureIndex <= this.lastState.lastProcessedFeatureIndex;
  }

  private hasContentToProcess(chunk: ShapefileChunk): boolean {
    return chunk.features.length > 0 || chunk.skippedFeatures.length > 0;
  }
}
