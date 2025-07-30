/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/naming-convention */
import * as shapefile from 'shapefile';
import jsLogger from '@map-colonies/js-logger';
import { Feature } from 'geojson';
import { ReaderOptions, ChunkProcessor, ProcessingState, ShapefileChunk } from '../../../../src/files/shapefile/types';
import { ShapefileChunkReader } from '../../../../src';
import { ChunkBuilder } from '../../../../src/files/shapefile/core/chunkBuilder';
import { ProgressTracker } from '../../../../src/files/shapefile/core/progressTracker';
import { MetricsManager } from '../../../../src/files/shapefile/core/metricsManager';
import * as vertices from '../../../../src/geo/vertices';

const shapefilePath = '/path/to/shapefile.shp';

// Mock all dependencies
jest.mock('shapefile');
jest.mock('../../../../src/files/shapefile/core/chunkBuilder');
jest.mock('../../../../src/files/shapefile/core/progressTracker');
jest.mock('../../../../src/files/shapefile/core/metricsManager');
jest.mock('../../../../src/geo/vertices');

// Import mocked modules
const mockShapefile = shapefile as jest.Mocked<typeof shapefile>;
const MockChunkBuilder = ChunkBuilder as jest.MockedClass<typeof ChunkBuilder>;
const MockProgressTracker = ProgressTracker as jest.MockedClass<typeof ProgressTracker>;
const MockMetricsManager = MetricsManager as jest.MockedClass<typeof MetricsManager>;

const mockFeature: Feature = {
  type: 'Feature',
  geometry: { type: 'Polygon', coordinates: [[]] },
  properties: {},
};

describe('ShapefileChunkReader', () => {
  let reader: ShapefileChunkReader;
  let mockOptions: ReaderOptions;
  let mockProcessor: jest.MockedFunction<ChunkProcessor['process']>;
  let mockSource: jest.Mocked<shapefile.Source<Feature>>;
  let mockChunkBuilder: jest.Mocked<ChunkBuilder>;
  let mockProgressTracker: jest.Mocked<ProgressTracker>;
  let mockMetricsManager: jest.Mocked<MetricsManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock options
    mockOptions = {
      maxVerticesPerChunk: 1000,
      logger: jsLogger({ enabled: false }),
      stateManager: {
        loadState: jest.fn(),
        saveState: jest.fn(),
      },
      metricsCollector: {
        onChunkMetrics: jest.fn(),
        onFileMetrics: jest.fn(),
      },
    };

    // Setup mock processor
    mockProcessor = jest.fn().mockResolvedValue(undefined);

    // Setup mock shapefile source
    mockSource = {
      read: jest.fn(),
    } as unknown as jest.Mocked<shapefile.Source<Feature>>;

    mockShapefile.open.mockResolvedValue(mockSource);

    // Setup mock chunk builder
    mockChunkBuilder = {
      addFeature: jest.fn(),
      canAddFeature: jest.fn(),
      isEmpty: jest.fn(),
      build: jest.fn(),
      nextChunk: jest.fn(),
    } as unknown as jest.Mocked<ChunkBuilder>;

    MockChunkBuilder.mockImplementation(() => mockChunkBuilder);

    // Setup mock progress tracker
    mockProgressTracker = {
      addProcessedFeatures: jest.fn(),
      addSkippedFeatures: jest.fn(),
      incrementChunks: jest.fn(),
      calculateProgress: jest.fn(),
      getProcessedFeatures: jest.fn(),
    } as unknown as jest.Mocked<ProgressTracker>;
    MockProgressTracker.mockImplementation(() => mockProgressTracker);

    // Setup mock metrics manager
    mockMetricsManager = {
      sendChunkMetrics: jest.fn(),
      sendFileMetrics: jest.fn(),
    } as unknown as jest.Mocked<MetricsManager>;
    MockMetricsManager.mockImplementation(() => mockMetricsManager);

    reader = new ShapefileChunkReader(mockOptions);
  });

  describe('readAndProcess', () => {
    beforeEach(() => {
      jest.spyOn(reader, 'getShapefileStats').mockResolvedValue({
        totalVertices: 5000,
        totalFeatures: 10,
      });
    });

    it('should successfully read and process a shapefile with single chunk', async () => {
      mockSource.read
        .mockResolvedValueOnce({ done: false, value: mockFeature })
        .mockResolvedValueOnce({ done: false, value: mockFeature })
        .mockResolvedValueOnce({ done: true, value: mockFeature });

      mockChunkBuilder.canAddFeature.mockReturnValue(true);
      mockChunkBuilder.build.mockReturnValue({
        id: 0,
        features: [mockFeature, mockFeature],
        skippedFeatures: [],
        verticesCount: 100,
      });

      await reader.readAndProcess(shapefilePath, { process: mockProcessor });

      expect(mockShapefile.open).toHaveBeenCalledWith(shapefilePath);
      expect(mockChunkBuilder.addFeature).toHaveBeenCalledTimes(2);
      expect(mockProcessor).toHaveBeenCalledTimes(1);
      expect(mockOptions.stateManager?.saveState).toHaveBeenCalled();
    });

    it('should process multiple chunks when features exceed chunk capacity', async () => {
      mockSource.read
        .mockResolvedValueOnce({ done: false, value: mockFeature })
        .mockResolvedValueOnce({ done: false, value: mockFeature })
        .mockResolvedValueOnce({ done: false, value: mockFeature })
        .mockResolvedValueOnce({ done: true, value: mockFeature });

      mockChunkBuilder.canAddFeature.mockReturnValueOnce(true).mockReturnValueOnce(false).mockReturnValueOnce(true);

      const chunk1: ShapefileChunk = { id: 0, features: [mockFeature], skippedFeatures: [], verticesCount: 50 };
      const chunk2: ShapefileChunk = { id: 1, features: [mockFeature, mockFeature], skippedFeatures: [], verticesCount: 100 };
      mockChunkBuilder.build.mockReturnValueOnce(chunk1).mockReturnValueOnce(chunk2);

      await reader.readAndProcess(shapefilePath, { process: mockProcessor });

      expect(mockProcessor).toHaveBeenCalledTimes(2);
      expect(mockProcessor).toHaveBeenCalledWith(chunk1);
      expect(mockProcessor).toHaveBeenCalledWith(chunk2);
      expect(mockChunkBuilder.nextChunk).toHaveBeenCalledTimes(1);
    });

    it('should resume from last processed state', async () => {
      const lastState: ProcessingState = {
        filePath: shapefilePath,
        lastProcessedChunkIndex: 2,
        lastProcessedFeatureIndex: 3,
        timestamp: new Date(),
      };

      mockOptions.stateManager!.loadState = jest.fn().mockResolvedValue(lastState);

      // Features 0-3 should be skipped
      mockSource.read
        .mockResolvedValueOnce({ done: false, value: mockFeature }) // index 0 - skip
        .mockResolvedValueOnce({ done: false, value: mockFeature }) // index 1 - skip
        .mockResolvedValueOnce({ done: false, value: mockFeature }) // index 2 - skip
        .mockResolvedValueOnce({ done: false, value: mockFeature }) // index 3 - skip
        .mockResolvedValueOnce({ done: false, value: mockFeature }) // index 4 - process
        .mockResolvedValueOnce({ done: true, value: mockFeature });

      mockChunkBuilder.canAddFeature.mockReturnValue(true);
      mockChunkBuilder.build.mockReturnValue({
        id: 3,
        features: [mockFeature],
        verticesCount: 50,
        skippedFeatures: [],
      });

      await reader.readAndProcess(shapefilePath, { process: mockProcessor });

      expect(mockChunkBuilder.addFeature).toHaveBeenCalledTimes(1); // Only feature at index 4
      expect(MockChunkBuilder).toHaveBeenCalledWith(mockOptions.maxVerticesPerChunk, 2); // Resume from chunk 2
    });

    it('should handle feature with exceeding vertex count', async () => {
      const largeFeature: Feature = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-1, -1],
              [-1, 1],
              [1, 1],
              [1, -1],
              [-1, -1],
              [-1, -1],
              [-1, -1],
              [-1, -1],
            ],
          ],
        },
        properties: {},
      };
      const chunk: ShapefileChunk = {
        id: 0,
        features: [],
        skippedFeatures: [largeFeature],
        verticesCount: 0,
      };

      mockSource.read.mockResolvedValueOnce({ done: false, value: largeFeature }).mockResolvedValueOnce({ done: true, value: largeFeature });
      mockChunkBuilder.canAddFeature.mockReturnValue(false);
      mockChunkBuilder.build.mockReturnValue(chunk);
      await reader.readAndProcess(shapefilePath, { process: mockProcessor });
      expect(mockChunkBuilder.canAddFeature).toHaveBeenCalledWith(largeFeature);
      expect(mockChunkBuilder.build).toHaveBeenCalled();
      expect(mockProcessor).toHaveBeenCalledWith(chunk);
    });

    it('should handle processing errors and save state', async () => {
      mockSource.read.mockResolvedValueOnce({ done: false, value: mockFeature }).mockResolvedValueOnce({ done: false, value: mockFeature });

      mockChunkBuilder.canAddFeature.mockReturnValue(false);
      mockChunkBuilder.build.mockReturnValue({
        id: 0,
        features: [mockFeature],
        verticesCount: 50,
        skippedFeatures: [],
      });

      mockProcessor.mockRejectedValue(new Error());
      mockProgressTracker.getProcessedFeatures.mockReturnValue(1);

      await expect(reader.readAndProcess(shapefilePath, { process: mockProcessor })).rejects.toThrow();
      expect(mockOptions.stateManager?.saveState).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: shapefilePath,
          lastProcessedChunkIndex: 0,
          lastProcessedFeatureIndex: 0,
        })
      );
    });

    it('should send metrics for each chunk', async () => {
      mockSource.read.mockResolvedValueOnce({ done: false, value: mockFeature }).mockResolvedValueOnce({ done: true, value: mockFeature });

      mockChunkBuilder.canAddFeature.mockReturnValue(true);
      const chunk = { id: 0, features: [mockFeature], skippedFeatures: [], verticesCount: 50 } as ShapefileChunk;
      mockChunkBuilder.build.mockReturnValue(chunk);

      await reader.readAndProcess(shapefilePath, { process: mockProcessor });

      expect(mockMetricsManager.sendChunkMetrics).toHaveBeenCalledWith(chunk, expect.any(Number), expect.any(Number));
      expect(mockMetricsManager.sendFileMetrics).toHaveBeenCalled();
    });
  });

  describe('getShapefileStats', () => {
    beforeEach(() => {
      jest.spyOn(vertices, 'countVertices').mockReturnValue(100);
    });

    it('should count total vertices and features', async () => {
      mockSource.read
        .mockResolvedValueOnce({ done: false, value: mockFeature })
        .mockResolvedValueOnce({ done: false, value: mockFeature })
        .mockResolvedValueOnce({ done: false, value: mockFeature })
        .mockResolvedValueOnce({ done: true, value: undefined as unknown as Feature });

      const stats = await reader.getShapefileStats(shapefilePath);

      expect(stats).toEqual({
        totalVertices: 300,
        totalFeatures: 3,
      });
    });

    it('should skip features exceeding vertex limit', async () => {
      jest.spyOn(vertices, 'countVertices').mockReturnValueOnce(100).mockReturnValueOnce(2000).mockReturnValueOnce(100);

      mockSource.read
        .mockResolvedValueOnce({ done: false, value: mockFeature })
        .mockResolvedValueOnce({ done: false, value: { ...mockFeature, id: 'large-feature' } })
        .mockResolvedValueOnce({ done: false, value: mockFeature })
        .mockResolvedValueOnce({ done: true, value: undefined as unknown as Feature });

      const stats = await reader.getShapefileStats(shapefilePath);

      expect(stats).toEqual({
        totalVertices: 200, // Only features 1 and 3
        totalFeatures: 2,
      });
    });

    it('should handle errors during counting', async () => {
      mockSource.read.mockRejectedValue(new Error('Read error'));

      await expect(reader.getShapefileStats(shapefilePath)).rejects.toThrow('Read error');
    });
  });
});
