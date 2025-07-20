import { ProgressTracker, IProgressTracker } from '../../../../src/files/shapefile/core/progressTracker';

describe('ProgressTracker', () => {
  let progressTracker: ProgressTracker;
  const mockTotalVertices = 1000;
  const mockTotalFeatures = 100;
  const mockMaxVerticesPerChunk = 100;

  beforeEach(() => {
    // Mock Date.now to control time-based calculations
    jest.spyOn(Date, 'now').mockReturnValue(1000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default values when no initial progress provided', () => {
      progressTracker = new ProgressTracker(mockTotalVertices, mockTotalFeatures, mockMaxVerticesPerChunk);

      const progress = progressTracker.calculateProgress();

      expect(progress.startTime).toBe(1000);
      expect(progress.processedVertices).toBe(0);
      expect(progress.processedFeatures).toBe(0);
      expect(progress.processedChunks).toBe(0);
    });

    it('should initialize with provided initial progress values', () => {
      const initialProgress = {
        startTime: 500,
        processedVertices: 200,
        processedFeatures: 20,
        processedChunks: 2,
      };

      progressTracker = new ProgressTracker(mockTotalVertices, mockTotalFeatures, mockMaxVerticesPerChunk, initialProgress);

      const progress = progressTracker.calculateProgress();

      expect(progress.startTime).toBe(500);
      expect(progress.processedVertices).toBe(200);
      expect(progress.processedFeatures).toBe(20);
      expect(progress.processedChunks).toBe(2);
    });
  });

  describe('incrementFeatures', () => {
    beforeEach(() => {
      progressTracker = new ProgressTracker(mockTotalVertices, mockTotalFeatures, mockMaxVerticesPerChunk);
    });

    it('should increment features and vertices counters', () => {
      progressTracker.incrementFeatures(5, 50);

      const progress = progressTracker.calculateProgress();

      expect(progress.processedFeatures).toBe(5);
      expect(progress.processedVertices).toBe(50);
    });

    it('should accumulate multiple increments', () => {
      progressTracker.incrementFeatures(3, 30);
      progressTracker.incrementFeatures(2, 20);

      const progress = progressTracker.calculateProgress();

      expect(progress.processedFeatures).toBe(5);
      expect(progress.processedVertices).toBe(50);
    });
  });

  describe('incrementChunks', () => {
    beforeEach(() => {
      progressTracker = new ProgressTracker(mockTotalVertices, mockTotalFeatures, mockMaxVerticesPerChunk);
    });

    it('should increment chunks counter', () => {
      progressTracker.incrementChunks();

      const progress = progressTracker.calculateProgress();

      expect(progress.processedChunks).toBe(1);
    });

    it('should accumulate multiple chunk increments', () => {
      progressTracker.incrementChunks();
      progressTracker.incrementChunks();
      progressTracker.incrementChunks();

      const progress = progressTracker.calculateProgress();

      expect(progress.processedChunks).toBe(3);
    });
  });

  describe('getProcessedFeatures', () => {
    beforeEach(() => {
      progressTracker = new ProgressTracker(mockTotalVertices, mockTotalFeatures, mockMaxVerticesPerChunk);
    });

    it('should return the current number of processed features', () => {
      expect(progressTracker.getProcessedFeatures()).toBe(0);

      progressTracker.incrementFeatures(10, 100);

      expect(progressTracker.getProcessedFeatures()).toBe(10);
    });
  });

  describe('calculateProgress', () => {
    beforeEach(() => {
      progressTracker = new ProgressTracker(mockTotalVertices, mockTotalFeatures, mockMaxVerticesPerChunk);
    });

    it('should calculate progress with zero values initially', () => {
      const progress = progressTracker.calculateProgress();

      expect(progress).toEqual({
        processedFeatures: 0,
        totalFeatures: mockTotalFeatures,
        processedChunks: 0,
        totalChunks: 10, // Math.ceil(1000 / 100)
        processedVertices: 0,
        totalVertices: mockTotalVertices,
        percentage: 0,
        elapsedTimeMs: 0,
        estimatedRemainingTimeMs: 0,
        featuresPerSecond: 0,
        verticesPerSecond: 0,
        chunksPerSecond: 0,
        startTime: 1000,
        endTime: undefined,
      });
    });

    it('should calculate correct percentage based on processed vertices', () => {
      progressTracker.incrementFeatures(25, 250); // 25% of vertices processed

      const progress = progressTracker.calculateProgress();

      expect(progress.percentage).toBe(25);
    });

    it('should cap percentage at 100 when vertices exceed total', () => {
      progressTracker.incrementFeatures(100, 1500); // 150% of vertices processed

      const progress = progressTracker.calculateProgress();

      expect(progress.percentage).toBe(100);
    });

    it('should calculate elapsed time correctly', () => {
      jest.spyOn(Date, 'now').mockReturnValue(6000); // 5 seconds later

      const progress = progressTracker.calculateProgress();

      expect(progress.elapsedTimeMs).toBe(5000);
    });

    it('should calculate processing speeds correctly', () => {
      // Simulate 2 seconds elapsed
      jest.spyOn(Date, 'now').mockReturnValue(3000);

      progressTracker.incrementFeatures(20, 200);
      progressTracker.incrementChunks();
      progressTracker.incrementChunks();

      const progress = progressTracker.calculateProgress();

      expect(progress.featuresPerSecond).toBe(10); // 20 features / 2 seconds
      expect(progress.verticesPerSecond).toBe(100); // 200 vertices / 2 seconds
      expect(progress.chunksPerSecond).toBe(1); // 2 chunks / 2 seconds
    });

    it('should return zero speeds when no time has elapsed', () => {
      progressTracker.incrementFeatures(10, 100);

      const progress = progressTracker.calculateProgress();

      expect(progress.featuresPerSecond).toBe(0);
      expect(progress.verticesPerSecond).toBe(0);
      expect(progress.chunksPerSecond).toBe(0);
    });

    it('should estimate remaining time correctly when progress is made', () => {
      // Simulate 1 second elapsed with 25% progress
      jest.spyOn(Date, 'now').mockReturnValue(2000);
      progressTracker.incrementFeatures(25, 250);

      const progress = progressTracker.calculateProgress();

      // Total estimated time: 1000ms / 0.25 = 4000ms
      // Remaining time: 4000ms - 1000ms = 3000ms
      expect(progress.estimatedRemainingTimeMs).toBe(3000);
    });

    it('should return zero remaining time when no progress is made', () => {
      jest.spyOn(Date, 'now').mockReturnValue(2000);

      const progress = progressTracker.calculateProgress();

      expect(progress.estimatedRemainingTimeMs).toBe(0);
    });

    it('should return zero remaining time when progress is complete', () => {
      jest.spyOn(Date, 'now').mockReturnValue(2000);
      progressTracker.incrementFeatures(100, 1000); // 100% progress

      const progress = progressTracker.calculateProgress();

      expect(progress.estimatedRemainingTimeMs).toBe(0);
    });

    it('should calculate total chunks correctly based on vertices and chunk size', () => {
      const progress = progressTracker.calculateProgress();

      expect(progress.totalChunks).toBe(10); // Math.ceil(1000 / 100)
    });

    it('should handle edge case when total vertices is zero', () => {
      progressTracker = new ProgressTracker(0, mockTotalFeatures, mockMaxVerticesPerChunk);

      const progress = progressTracker.calculateProgress();

      expect(progress.percentage).toBe(0);
      expect(progress.totalChunks).toBe(0);
    });

    it('should set endTime when all features are processed', () => {
      jest.spyOn(Date, 'now').mockReturnValue(5000);
      progressTracker.incrementFeatures(mockTotalFeatures, 800); // All features processed

      const progress = progressTracker.calculateProgress();

      expect(progress.endTime).toBe(5000);
    });

    it('should not set endTime when features are not fully processed', () => {
      jest.spyOn(Date, 'now').mockReturnValue(5000);
      progressTracker.incrementFeatures(50, 400); // 50% of features processed

      const progress = progressTracker.calculateProgress();

      expect(progress.endTime).toBeUndefined();
    });

    it('should use processed chunks as total when total vertices is zero', () => {
      progressTracker = new ProgressTracker(0, mockTotalFeatures, mockMaxVerticesPerChunk);
      progressTracker.incrementChunks();
      progressTracker.incrementChunks();

      const progress = progressTracker.calculateProgress();

      expect(progress.totalChunks).toBe(2); // Uses processedChunks when totalVertices is 0
    });
  });

  describe('interface compliance', () => {
    it('should implement IProgressTracker interface', () => {
      progressTracker = new ProgressTracker(mockTotalVertices, mockTotalFeatures, mockMaxVerticesPerChunk);

      // Type assertion to ensure interface compliance
      const tracker: IProgressTracker = progressTracker;

      expect(tracker.incrementFeatures).toBeDefined();
      expect(tracker.incrementChunks).toBeDefined();
      expect(tracker.getProcessedFeatures).toBeDefined();
      expect(tracker.calculateProgress).toBeDefined();
    });
  });

  describe('edge cases and error conditions', () => {
    it('should handle negative initial progress values gracefully', () => {
      const initialProgress = {
        startTime: 1000,
        processedVertices: -10,
        processedFeatures: -5,
        processedChunks: -1,
      };

      progressTracker = new ProgressTracker(mockTotalVertices, mockTotalFeatures, mockMaxVerticesPerChunk, initialProgress);

      const progress = progressTracker.calculateProgress();

      expect(progress.processedVertices).toBe(-10);
      expect(progress.processedFeatures).toBe(-5);
      expect(progress.processedChunks).toBe(-1);
    });

    it('should handle very large numbers without overflow', () => {
      const largeNumbers = {
        totalVertices: Number.MAX_SAFE_INTEGER,
        totalFeatures: Number.MAX_SAFE_INTEGER,
        maxVerticesPerChunk: 1000000,
      };

      progressTracker = new ProgressTracker(largeNumbers.totalVertices, largeNumbers.totalFeatures, largeNumbers.maxVerticesPerChunk);

      progressTracker.incrementFeatures(1000000, 10000000);

      const progress = progressTracker.calculateProgress();

      expect(progress.processedFeatures).toBe(1000000);
      expect(progress.processedVertices).toBe(10000000);
      expect(Number.isFinite(progress.percentage)).toBe(true);
    });

    it('should maintain precision with decimal calculations', () => {
      progressTracker = new ProgressTracker(333, 33, 111); // Numbers that create decimals
      progressTracker.incrementFeatures(11, 111); // 33.33% progress

      const progress = progressTracker.calculateProgress();

      expect(progress.percentage).toBeCloseTo(33.33, 2);
    });
  });
});
