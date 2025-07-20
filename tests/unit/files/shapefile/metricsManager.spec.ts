import { Feature, Polygon } from '@turf/turf';
import { MetricsManager } from '../../../../src/files/shapefile/core/metricsManager';
import { MetricsCollector, ShapefileChunk } from '../../../../src/files/shapefile/types';
import { createTestChunk } from './utils';

// Mock Node.js process methods
const mockCpuUsage = jest.fn();
const mockMemoryUsage = jest.fn();
const mockPerformanceNow = jest.fn();

// Store original methods
const originalCpuUsage = process.cpuUsage.bind(process);
const originalMemoryUsage = process.memoryUsage.bind(process);
const originalPerformanceNow = performance.now.bind(performance);

describe('MetricsManager', () => {
  let metricsManager: MetricsManager;
  let mockMetricsCollector: jest.Mocked<MetricsCollector>;
  const testFilePath = '/test/path/file.shp';

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock process methods
    process.cpuUsage = mockCpuUsage;
    process.memoryUsage = mockMemoryUsage;
    performance.now = mockPerformanceNow;

    // Setup default mock implementations
    mockCpuUsage.mockReturnValue({ user: 100000, system: 50000 }); // in microseconds
    mockMemoryUsage.mockReturnValue({
      rss: 52428800, // 50 MB in bytes
      heapTotal: 20971520,
      heapUsed: 15728640,
      external: 1048576,
      arrayBuffers: 0,
    });
    mockPerformanceNow.mockReturnValue(1000);

    // Setup metrics collector mock
    mockMetricsCollector = {
      onChunkMetrics: jest.fn(),
      onFileMetrics: jest.fn(),
    };
  });

  afterEach(() => {
    // Restore original methods
    process.cpuUsage = originalCpuUsage;
    process.memoryUsage = originalMemoryUsage;
    performance.now = originalPerformanceNow;
  });

  describe('constructor', () => {
    it('should initialize with basic configuration', () => {
      metricsManager = new MetricsManager(testFilePath);

      expect(metricsManager).toBeDefined();
    });

    it('should initialize with metrics collector', () => {
      metricsManager = new MetricsManager(testFilePath, mockMetricsCollector);

      expect(metricsManager).toBeDefined();
    });

    it('should initialize with resource metrics enabled', () => {
      metricsManager = new MetricsManager(testFilePath, mockMetricsCollector, true);

      expect(metricsManager).toBeDefined();
      expect(mockCpuUsage).toHaveBeenCalled();
      expect(mockPerformanceNow).toHaveBeenCalled();
    });

    it('should not initialize resource monitoring when disabled', () => {
      const metricsManager = new MetricsManager(testFilePath, mockMetricsCollector, false);

      expect(metricsManager).toBeDefined();
      // CPU usage might be called once during initialization, but not for monitoring
    });
  });

  describe('sendChunkMetrics', () => {
    beforeEach(() => {
      metricsManager = new MetricsManager(testFilePath, mockMetricsCollector, false);
    });

    it('should update file metrics with chunk data', () => {
      const chunk = createTestChunk(1, 5, 100);
      const readTime = 10;
      const processTime = 20;

      metricsManager.sendChunkMetrics(chunk, readTime, processTime);

      // Verify metrics collector was called
      expect(mockMetricsCollector.onChunkMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          chunkId: 1,
          featuresCount: 5,
          verticesCount: 100,
          readTimeMs: 10,
          processTimeMs: 20,
          totalTimeMs: 30,
          timestamp: expect.any(Date) as Date,
        })
      );
    });

    it('should accumulate metrics across multiple chunks', () => {
      const chunk1 = createTestChunk(1, 3, 50);
      const chunk2 = createTestChunk(2, 7, 150);

      metricsManager.sendChunkMetrics(chunk1, 5, 10);
      metricsManager.sendChunkMetrics(chunk2, 8, 12);

      const fileMetrics = metricsManager.sendFileMetrics();

      expect(fileMetrics.totalFeatures).toBe(10);
      expect(fileMetrics.totalVertices).toBe(200);
      expect(fileMetrics.totalChunks).toBe(2);
      expect(fileMetrics.totalReadTimeMs).toBe(13);
      expect(fileMetrics.totalProcessTimeMs).toBe(22);
      expect(fileMetrics.totalTimeMs).toBe(35);
    });

    it('should include resource metrics when enabled', () => {
      metricsManager = new MetricsManager(testFilePath, mockMetricsCollector, true);

      // Setup CPU usage delta for calculation
      mockCpuUsage.mockReturnValueOnce({ user: 0, system: 0 }); // Initial baseline
      mockCpuUsage.mockReturnValueOnce({ user: 200000, system: 100000 }); // Current usage
      mockPerformanceNow.mockReturnValueOnce(0); // Initial time

      // Mock Date.now for elapsed time calculation
      const mockDateNow = jest.spyOn(Date, 'now');
      mockDateNow.mockReturnValue(1000); // 1 second elapsed

      const chunk = createTestChunk(1, 5, 100);
      metricsManager.sendChunkMetrics(chunk, 10, 20);

      expect(mockMetricsCollector.onChunkMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          resources: expect.objectContaining({
            cpu: expect.any(Number) as number,
            memory: expect.any(Number) as number,
          }) as { cpu: number; memory: number },
        })
      );

      mockDateNow.mockRestore();
    });

    it('should not include resource metrics when disabled', () => {
      metricsManager = new MetricsManager(testFilePath, mockMetricsCollector, false);
      const chunk = createTestChunk(1, 5, 100);
      metricsManager.sendChunkMetrics(chunk, 10, 20);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect(mockMetricsCollector.onChunkMetrics).not.toHaveBeenCalledWith(expect.objectContaining({ resources: expect.anything() }));
    });
  });

  describe('sendFileMetrics', () => {
    beforeEach(() => {
      metricsManager = new MetricsManager(testFilePath, mockMetricsCollector, false);
    });

    it('should return finalized file metrics', () => {
      const chunk = createTestChunk(1, 5, 100);
      metricsManager.sendChunkMetrics(chunk, 10, 20);

      const fileMetrics = metricsManager.sendFileMetrics();

      expect(fileMetrics).toEqual(
        expect.objectContaining({
          filePath: testFilePath,
          totalFeatures: 5,
          totalVertices: 100,
          totalChunks: 1,
          totalReadTimeMs: 10,
          totalProcessTimeMs: 20,
          totalTimeMs: 30,
          startTime: expect.any(Date) as Date,
          endTime: expect.any(Date) as Date,
        })
      );
    });

    it('should notify metrics collector with file metrics', () => {
      const chunk = createTestChunk(1, 5, 100);
      metricsManager.sendChunkMetrics(chunk, 10, 20);

      metricsManager.sendFileMetrics();

      expect(mockMetricsCollector.onFileMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: testFilePath,
          totalFeatures: 5,
          totalVertices: 100,
        })
      );
    });

    it('should include peak resource metrics when enabled', () => {
      metricsManager = new MetricsManager(testFilePath, mockMetricsCollector, true);

      // Setup for resource metrics calculation
      mockCpuUsage.mockReturnValue({ user: 0, system: 0 });
      mockPerformanceNow.mockReturnValue(0);
      const mockDateNow = jest.spyOn(Date, 'now');
      mockDateNow.mockReturnValue(1000);

      const chunk = createTestChunk(1, 5, 100);
      metricsManager.sendChunkMetrics(chunk, 10, 20);

      const fileMetrics = metricsManager.sendFileMetrics();

      expect(fileMetrics.peakResources).toEqual(
        expect.objectContaining({
          cpu: expect.any(Number) as number,
          memory: expect.any(Number) as number,
        })
      );

      mockDateNow.mockRestore();
    });

    it('should not include peak resource metrics when disabled', () => {
      const chunk = createTestChunk(1, 5, 100);
      metricsManager.sendChunkMetrics(chunk, 10, 20);

      const fileMetrics = metricsManager.sendFileMetrics();

      expect(fileMetrics.peakResources).toBeUndefined();
    });
  });

  describe('resetResourceMonitoring', () => {
    it('should reset resource monitoring when enabled', () => {
      metricsManager = new MetricsManager(testFilePath, mockMetricsCollector, true);

      // Clear previous calls
      mockCpuUsage.mockClear();
      mockPerformanceNow.mockClear();

      metricsManager.resetResourceMonitoring();

      expect(mockCpuUsage).toHaveBeenCalled();
      expect(mockPerformanceNow).toHaveBeenCalled();
    });

    it('should not affect anything when resource monitoring is disabled', () => {
      metricsManager = new MetricsManager(testFilePath, mockMetricsCollector, false);

      // Clear previous calls
      mockCpuUsage.mockClear();
      mockPerformanceNow.mockClear();

      metricsManager.resetResourceMonitoring();

      expect(mockCpuUsage).not.toHaveBeenCalled();
      expect(mockPerformanceNow).not.toHaveBeenCalled();
    });
  });

  describe('resource metrics calculations', () => {
    beforeEach(() => {
      metricsManager = new MetricsManager(testFilePath, mockMetricsCollector, true);
    });

    it('should calculate CPU cores usage correctly', () => {
      // Setup for CPU calculation
      mockCpuUsage.mockReturnValueOnce({ user: 0, system: 0 }); // Initial baseline in constructor
      mockPerformanceNow.mockReturnValueOnce(1000); // Initial performance.now() for startTime

      // Create metrics manager (this will call the first mocks)
      metricsManager = new MetricsManager(testFilePath, mockMetricsCollector, true);

      // Now setup the mocks for when sendChunkMetrics calls getResourceMetrics
      mockCpuUsage.mockReturnValueOnce({ user: 500000, system: 300000 }); // 800ms total CPU time

      const mockDateNow = jest.spyOn(Date, 'now');
      mockDateNow.mockReturnValue(2000); // Current time = 2000, elapsed = 2000 - 1000 = 1000ms

      const chunk = createTestChunk(1, 5, 100);
      metricsManager.sendChunkMetrics(chunk, 10, 20);

      expect(mockMetricsCollector.onChunkMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          resources: expect.objectContaining({
            cpu: 0.8, // 800ms CPU time / 1000ms elapsed time
          }) as { cpu: number },
        })
      );

      mockDateNow.mockRestore();
    });

    it('should calculate memory usage in MB correctly', () => {
      // Setup memory usage: 104857600 bytes = 100 MB
      mockMemoryUsage.mockReturnValue({
        rss: 104857600,
        heapTotal: 20971520,
        heapUsed: 15728640,
        external: 1048576,
        arrayBuffers: 0,
      });

      mockCpuUsage.mockReturnValue({ user: 0, system: 0 });
      const mockDateNow = jest.spyOn(Date, 'now');
      mockDateNow.mockReturnValue(1000);

      const chunk = createTestChunk(1, 5, 100);
      metricsManager.sendChunkMetrics(chunk, 10, 20);

      expect(mockMetricsCollector.onChunkMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          resources: expect.objectContaining({
            memory: 100, // 104857600 bytes / 1024 / 1024 = 100 MB
          }) as { memory: number },
        })
      );

      mockDateNow.mockRestore();
    });

    it('should track peak CPU and memory usage', () => {
      mockCpuUsage.mockReturnValue({ user: 0, system: 0 });
      const mockDateNow = jest.spyOn(Date, 'now');
      mockDateNow.mockReturnValue(1000);

      // First chunk with lower resource usage
      mockMemoryUsage.mockReturnValueOnce({ rss: 52428800, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 }); // 50 MB
      const chunk1 = createTestChunk(1, 3, 50);
      metricsManager.sendChunkMetrics(chunk1, 5, 10);

      // Second chunk with higher resource usage
      mockMemoryUsage.mockReturnValueOnce({ rss: 104857600, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 }); // 100 MB
      const chunk2 = createTestChunk(2, 7, 150);
      metricsManager.sendChunkMetrics(chunk2, 8, 12);

      const fileMetrics = metricsManager.sendFileMetrics();

      expect(fileMetrics.peakResources?.memory).toBe(100); // Should track the peak

      mockDateNow.mockRestore();
    });
  });

  describe('without metrics collector', () => {
    beforeEach(() => {
      metricsManager = new MetricsManager(testFilePath);
    });

    it('should handle chunk metrics without collector', () => {
      const chunk = createTestChunk(1, 5, 100);

      expect(() => {
        metricsManager.sendChunkMetrics(chunk, 10, 20);
      }).not.toThrow();
    });

    it('should handle file metrics without collector', () => {
      const chunk = createTestChunk(1, 5, 100);
      metricsManager.sendChunkMetrics(chunk, 10, 20);

      expect(() => {
        metricsManager.sendFileMetrics();
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      metricsManager = new MetricsManager(testFilePath, mockMetricsCollector, false);
    });

    it('should handle empty chunks', () => {
      const emptyChunk = createTestChunk(1, 0, 0);

      metricsManager.sendChunkMetrics(emptyChunk, 5, 10);
      const fileMetrics = metricsManager.sendFileMetrics();

      expect(fileMetrics.totalFeatures).toBe(0);
      expect(fileMetrics.totalVertices).toBe(0);
      expect(fileMetrics.totalChunks).toBe(1);
    });

    it('should handle zero processing times', () => {
      const chunk = createTestChunk(1, 5, 100);

      metricsManager.sendChunkMetrics(chunk, 0, 0);
      const fileMetrics = metricsManager.sendFileMetrics();

      expect(fileMetrics.totalReadTimeMs).toBe(0);
      expect(fileMetrics.totalProcessTimeMs).toBe(0);
      expect(fileMetrics.totalTimeMs).toBe(0);
    });

    it('should handle large numbers', () => {
      const largeChunk = createTestChunk(1, 1000000, 50000000);

      metricsManager.sendChunkMetrics(largeChunk, 5000, 10000);
      const fileMetrics = metricsManager.sendFileMetrics();

      expect(fileMetrics.totalFeatures).toBe(1000000);
      expect(fileMetrics.totalVertices).toBe(50000000);
      expect(fileMetrics.totalTimeMs).toBe(15000);
    });
  });
});
