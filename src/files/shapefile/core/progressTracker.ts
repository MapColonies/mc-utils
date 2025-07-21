import { ProgressInfo } from '../types';

/**
 * Interface for progress tracking functionality
 */
export interface IProgressTracker {
  /**
   * Increments the features counter vertices processed
   * @param processedVertices Number of vertices processed in the current operation
   * @returns Current progress information
   */
  addProcessedFeatures: (featuresCount: number, processedVertices: number) => void;

  /**
   * Increments the chunks counter
   */
  incrementChunks: () => void;

  /**
   * Gets the number of processed features
   * @returns Number of processed features
   */
  getProcessedFeatures: () => number;

  /**
   * Calculates and returns current progress information
   * @returns Current progress information
   */
  calculateProgress: () => ProgressInfo;
}

/**
 * Implementation of progress tracking for shapefile processing
 */
export class ProgressTracker implements IProgressTracker {
  private readonly startTime: number;
  private processedVertices: number;
  private processedFeatures: number;
  private processedChunks: number;

  public constructor(
    private readonly totalVertices: number,
    private readonly totalFeatures: number,
    private readonly maxVerticesPerChunk: number,
    private readonly initialProgress?: Pick<ProgressInfo, 'startTime' | 'processedVertices' | 'processedFeatures' | 'processedChunks'>
  ) {
    this.startTime = this.initialProgress?.startTime ?? Date.now();
    this.processedVertices = this.initialProgress?.processedVertices ?? 0;
    this.processedFeatures = this.initialProgress?.processedFeatures ?? 0;
    this.processedChunks = this.initialProgress?.processedChunks ?? 0;
  }

  public addProcessedFeatures(featuresCount: number, processedVertices: number): void {
    this.processedVertices += processedVertices;
    this.processedFeatures += featuresCount;
  }

  public getProcessedFeatures(): number {
    return this.processedFeatures;
  }

  public incrementChunks(): void {
    this.processedChunks++;
  }

  public calculateProgress(): ProgressInfo {
    const currentTime = Date.now();
    const elapsedTimeMs = currentTime - this.startTime;

    // Calculate percentage based on vertices processed
    let percentage = 0;
    const maxPercentage = 100;
    if (this.totalVertices > 0) {
      percentage = Math.min((this.processedVertices / this.totalVertices) * maxPercentage, maxPercentage);
    }

    // Calculate processing speeds
    const millisecondsPerSecond = 1000;
    const elapsedSeconds = elapsedTimeMs / millisecondsPerSecond;
    const featuresPerSecond = elapsedSeconds > 0 ? this.processedFeatures / elapsedSeconds : 0;
    const verticesPerSecond = elapsedSeconds > 0 ? this.processedVertices / elapsedSeconds : 0;
    const chunksPerSecond = elapsedSeconds > 0 ? this.processedChunks / elapsedSeconds : 0;

    // Estimate remaining time
    let estimatedRemainingTimeMs = 0;
    if (percentage > 0 && percentage < maxPercentage) {
      const totalEstimatedTimeMs = (elapsedTimeMs / percentage) * maxPercentage;
      estimatedRemainingTimeMs = totalEstimatedTimeMs - elapsedTimeMs;
    }

    const estimatedTotalChunks = this.totalVertices > 0 ? Math.ceil(this.totalVertices / this.maxVerticesPerChunk) : this.processedChunks;

    const endTime = this.processedFeatures === this.totalFeatures ? currentTime : undefined;

    return {
      processedFeatures: this.processedFeatures,
      totalFeatures: this.totalFeatures,
      processedChunks: this.processedChunks,
      totalChunks: estimatedTotalChunks,
      processedVertices: this.processedVertices,
      totalVertices: this.totalVertices,
      percentage,
      elapsedTimeMs,
      estimatedRemainingTimeMs,
      featuresPerSecond,
      verticesPerSecond,
      chunksPerSecond,
      startTime: this.startTime,
      endTime,
    };
  }
}
