import { Feature, Polygon } from 'geojson';
import { ChunkBuilder } from '../../../../src/files/shapefile/core/chunkBuilder';
import { createPolygonFeature } from './utils';

describe('ChunkBuilder', () => {
  let chunkBuilder: ChunkBuilder;
  const initialChunkIndex = 1;

  beforeEach(() => {
    chunkBuilder = new ChunkBuilder(initialChunkIndex);
  });

  describe('constructor', () => {
    it('should initialize with provided chunk ID', () => {
      const testChunkIndex = 5;
      const builder = new ChunkBuilder(testChunkIndex);
      const chunk = builder.build();

      expect(chunk.id).toBe(testChunkIndex);
      expect(chunk.features).toEqual([]);
      expect(chunk.verticesCount).toBe(0);
    });
  });

  describe('canAddFeature', () => {
    it('should return true when feature can be added within vertex limit', () => {
      const feature = createPolygonFeature([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ]); // 5 vertices
      const maxVertices = 10;

      const canAdd = chunkBuilder.canAddFeature(feature, maxVertices);

      expect(canAdd).toBe(true);
    });

    it('should return false when adding feature would exceed vertex limit', () => {
      const feature1 = createPolygonFeature([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ]); // 5 vertices
      const feature2 = createPolygonFeature([
        [2, 2],
        [3, 2],
        [3, 3],
        [2, 3],
        [2, 2],
      ]); // 5 vertices
      const maxVertices = 8;

      chunkBuilder.addFeature(feature1); // Current count: 5
      const canAdd = chunkBuilder.canAddFeature(feature2, maxVertices); // Would be 10 > 8

      expect(canAdd).toBe(false);
    });

    it('should return true when adding feature exactly matches vertex limit', () => {
      const feature1 = createPolygonFeature([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ]); // 5 vertices
      const feature2 = createPolygonFeature([
        [2, 2],
        [3, 2],
        [3, 3],
        [2, 3],
        [2, 2],
      ]); // 5 vertices
      const maxVertices = 10;

      chunkBuilder.addFeature(feature1); // Current count: 5
      const canAdd = chunkBuilder.canAddFeature(feature2, maxVertices); // Would be exactly 10

      expect(canAdd).toBe(true);
    });

    it('should add features that exceeded vertices limit to skipped array', () => {
      const largeFeature = createPolygonFeature([
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0],
        [3, 1],
        [3, 2],
        [2, 2],
        [1, 2],
        [0, 2],
        [0, 1],
        [0, 0],
      ]); // 11 vertices
      const maxVertices = 10;

      const canAdd = chunkBuilder.canAddFeature(largeFeature, maxVertices);

      expect(canAdd).toBe(false);
      expect(chunkBuilder.build().skippedFeatures).toHaveLength(1);
    });
  });

  describe('addFeature', () => {
    it('should add feature to the chunk', () => {
      const feature = createPolygonFeature([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ]);

      chunkBuilder.addFeature(feature);
      const chunk = chunkBuilder.build();

      expect(chunk.features).toHaveLength(1);
      expect(chunk.features[0]).toBe(feature);
      expect(chunk.verticesCount).toBe(5);
    });

    it('should add multiple features and update vertex count correctly', () => {
      const feature1 = createPolygonFeature([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ]); // 5 vertices
      const feature2 = createPolygonFeature([
        [2, 2],
        [3, 2],
        [3, 3],
        [2, 3],
        [2, 2],
      ]); // 5 vertices

      chunkBuilder.addFeature(feature1);
      chunkBuilder.addFeature(feature2);
      const chunk = chunkBuilder.build();

      expect(chunk.features).toHaveLength(2);
      expect(chunk.features[0]).toBe(feature1);
      expect(chunk.features[1]).toBe(feature2);
      expect(chunk.verticesCount).toBe(10);
    });

    it('should handle complex polygons with multiple rings', () => {
      // Polygon with hole
      const complexFeature: Feature<Polygon> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            // Outer ring
            [
              [0, 0],
              [4, 0],
              [4, 4],
              [0, 4],
              [0, 0],
            ], // 5 vertices
            // Inner ring (hole)
            [
              [1, 1],
              [3, 1],
              [3, 3],
              [1, 3],
              [1, 1],
            ], // 5 vertices
          ],
        },
      };

      chunkBuilder.addFeature(complexFeature);
      const chunk = chunkBuilder.build();

      expect(chunk.features).toHaveLength(1);
      expect(chunk.verticesCount).toBe(10); // 5 + 5 vertices
    });
  });

  describe('build', () => {
    it('should return chunk with correct ID, features, and vertex count', () => {
      const feature = createPolygonFeature([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ]);

      chunkBuilder.addFeature(feature);
      const chunk = chunkBuilder.build();

      expect(chunk.id).toBe(initialChunkIndex);
      expect(chunk.features).toEqual([feature]);
      expect(chunk.verticesCount).toBe(5);
    });

    it('should return empty chunk when no features added', () => {
      const chunk = chunkBuilder.build();

      expect(chunk.id).toBe(initialChunkIndex);
      expect(chunk.features).toEqual([]);
      expect(chunk.verticesCount).toBe(0);
    });
  });

  describe('nextChunk', () => {
    it('should clear features and reset vertex count', () => {
      const feature = createPolygonFeature([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ]);

      chunkBuilder.addFeature(feature);

      chunkBuilder.nextChunk();

      const chunk = chunkBuilder.build();
      expect(chunk.features).toEqual([]);
      expect(chunk.verticesCount).toBe(0);
    });

    it('should increment chunk ID', () => {
      const feature = createPolygonFeature([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ]);

      chunkBuilder.addFeature(feature);
      const chunkBeforenextChunk = chunkBuilder.build();
      expect(chunkBeforenextChunk.id).toBe(initialChunkIndex);

      chunkBuilder.nextChunk();
      const chunkAfternextChunk = chunkBuilder.build();
      expect(chunkAfternextChunk.id).toBe(initialChunkIndex + 1);
    });

    it('should allow adding features after nextChunk', () => {
      const feature1 = createPolygonFeature([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ]);
      const feature2 = createPolygonFeature([
        [2, 2],
        [3, 2],
        [3, 3],
        [2, 3],
        [2, 2],
      ]);

      chunkBuilder.addFeature(feature1);
      chunkBuilder.nextChunk();
      chunkBuilder.addFeature(feature2);

      const chunk = chunkBuilder.build();
      expect(chunk.features).toEqual([feature2]);
      expect(chunk.verticesCount).toBe(5);
      expect(chunk.id).toBe(initialChunkIndex + 1);
    });
  });

  describe('integration scenarios', () => {
    it('should handle typical chunking workflow', () => {
      const maxVertices = 10;
      const features = [
        createPolygonFeature([
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ]), // 5 vertices
        createPolygonFeature([
          [2, 2],
          [3, 2],
          [3, 3],
          [2, 3],
          [2, 2],
        ]), // 5 vertices
        createPolygonFeature([
          [4, 4],
          [5, 4],
          [5, 5],
          [4, 5],
          [4, 4],
        ]), // 5 vertices
      ];

      // Add first two features (exactly at limit)
      expect(chunkBuilder.canAddFeature(features[0], maxVertices)).toBe(true);
      chunkBuilder.addFeature(features[0]);

      expect(chunkBuilder.canAddFeature(features[1], maxVertices)).toBe(true);
      chunkBuilder.addFeature(features[1]);

      // Third feature would exceed limit
      expect(chunkBuilder.canAddFeature(features[2], maxVertices)).toBe(false);

      // Build first chunk
      const chunk1 = chunkBuilder.build();
      expect(chunk1.id).toBe(initialChunkIndex);
      expect(chunk1.features).toHaveLength(2);
      expect(chunk1.verticesCount).toBe(10);

      // nextChunk and add third feature
      chunkBuilder.nextChunk();
      expect(chunkBuilder.canAddFeature(features[2], maxVertices)).toBe(true);
      chunkBuilder.addFeature(features[2]);

      // Build second chunk
      const chunk2 = chunkBuilder.build();
      expect(chunk2.id).toBe(initialChunkIndex + 1);
      expect(chunk2.features).toHaveLength(1);
      expect(chunk2.verticesCount).toBe(5);
    });

    it('should maintain state consistency across operations', () => {
      const feature = createPolygonFeature([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ]);

      // Add feature
      chunkBuilder.addFeature(feature);

      // Build should not change state
      const chunk1 = chunkBuilder.build();
      expect(chunk1.verticesCount).toBe(5);

      // Second build should be identical
      const chunk2 = chunkBuilder.build();
      expect(chunk2).toEqual(chunk1);

      // nextChunk should reset state
      chunkBuilder.nextChunk();

      const chunk3 = chunkBuilder.build();
      expect(chunk3.features).toEqual([]);
      expect(chunk3.verticesCount).toBe(0);
      expect(chunk3.id).toBe(initialChunkIndex + 1);
    });
  });
});
