import { ChunkMetrics, FileMetrics, MetricsCollector, ResourceMetrics } from '../types';
import { ShapefileChunk } from '../types';

/**
 * Interface for metrics management functionality
 */
export interface IMetricsManager {
  /**
   * Updates metrics with chunk processing information
   * @param chunk The chunk that was processed
   * @param readTime Time spent reading the chunk in milliseconds
   * @param processTime Time spent processing the chunk in milliseconds
   */
  sendChunkMetrics: (chunk: ShapefileChunk, readTime: number, processTime: number) => void;

  /**
   * Finalizes metrics collection and notifies collectors
   * @returns The finalized file metrics
   */
  sendFileMetrics: () => FileMetrics;

  /**
   * Resets the resource monitoring baseline
   */
  resetResourceMonitoring: () => void;
}

/**
 * Implementation of metrics management for shapefile processing with integrated resource monitoring
 */
export class MetricsManager implements IMetricsManager {
  private fileMetrics: FileMetrics;
  private peakCpu = 0;
  private peakMemory = 0;

  // Resource monitoring properties
  private startCpuUsage!: NodeJS.CpuUsage;
  private startTime!: number;

  public constructor(
    filePath: string,
    private readonly metricsCollector?: MetricsCollector,
    private readonly includeResourceMetrics: boolean = false
  ) {
    this.fileMetrics = this.initializeFileMetrics(filePath);
    this.initializeResourceMonitoring();
  }

  public sendChunkMetrics(chunk: ShapefileChunk, readTime: number, processTime: number): void {
    const totalTime = readTime + processTime;

    // Update file metrics
    this.fileMetrics.totalFeatures += chunk.features.length;
    this.fileMetrics.totalVertices += chunk.verticesCount;
    this.fileMetrics.totalChunks++;
    this.fileMetrics.totalReadTimeMs += readTime;
    this.fileMetrics.totalProcessTimeMs += processTime;
    this.fileMetrics.totalTimeMs += totalTime;

    // Create chunk metrics
    const chunkMetrics: ChunkMetrics = {
      chunkId: chunk.id,
      featuresCount: chunk.features.length,
      verticesCount: chunk.verticesCount,
      readTimeMs: readTime,
      processTimeMs: processTime,
      totalTimeMs: totalTime,
      timestamp: new Date(),
    };

    // Add resource metrics if enabled
    if (this.includeResourceMetrics) {
      const resourceMetrics = this.getResourceMetrics();
      chunkMetrics.resources = resourceMetrics;
      this.updateResourceMetrics(resourceMetrics.cpu, resourceMetrics.memory);
    }

    // Notify metrics collector
    this.metricsCollector?.onChunkMetrics?.(chunkMetrics);
  }

  public sendFileMetrics(): FileMetrics {
    this.fileMetrics.endTime = new Date();

    if (this.includeResourceMetrics) {
      this.fileMetrics.peakResources = {
        cpu: this.peakCpu,
        memory: this.peakMemory,
      };
    }

    this.metricsCollector?.onFileMetrics?.(this.fileMetrics);
    return this.fileMetrics;
  }

  public resetResourceMonitoring(): void {
    if (this.includeResourceMetrics) {
      this.initializeResourceMonitoring();
    }
  }

  private initializeFileMetrics(filePath: string): FileMetrics {
    return {
      filePath,
      totalFeatures: 0,
      totalVertices: 0,
      totalChunks: 0,
      totalReadTimeMs: 0,
      totalProcessTimeMs: 0,
      totalTimeMs: 0,
      startTime: new Date(),
    };
  }

  private initializeResourceMonitoring(): void {
    this.startCpuUsage = process.cpuUsage();
    this.startTime = performance.now();
  }

  private updateResourceMetrics(cpu: number, memory: number): void {
    if (this.includeResourceMetrics) {
      this.peakCpu = Math.max(this.peakCpu, cpu);
      this.peakMemory = Math.max(this.peakMemory, memory);
    }
  }

  private getResourceMetrics(): ResourceMetrics {
    if (!this.includeResourceMetrics) {
      return { cpu: 0, memory: 0 };
    }

    const currentMemory = process.memoryUsage();
    const cpuUsage = process.cpuUsage(this.startCpuUsage);
    const elapsedTime = Date.now() - this.startTime;

    // Calculate CPU cores used
    // cpuUsage is in microseconds, convert to milliseconds
    /* eslint-disable @typescript-eslint/no-magic-numbers */
    const totalCpuTime = (cpuUsage.user + cpuUsage.system) / 1000;
    // Calculate actual cores used (can be > 1 for multi-core usage)
    const cpuCores = totalCpuTime / elapsedTime;

    // Memory in MB (using RSS - Resident Set Size)
    const memoryMB = currentMemory.rss / 1024 / 1024;
    /* eslint-enable @typescript-eslint/no-magic-numbers */

    return {
      cpu: cpuCores,
      memory: memoryMB,
    };
  }
}
