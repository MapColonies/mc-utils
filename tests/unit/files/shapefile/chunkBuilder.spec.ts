import { Feature, Polygon } from 'geojson';
import { ChunkBuilder } from '../../../../src/files/shapefile/core/chunkBuilder';
import { createPolygonFeature } from './utils';

describe('ChunkBuilder', () => {
  let chunkBuilder: ChunkBuilder;
  const maxVertices = 10;
  const initialChunkIndex = 1;

  beforeEach(() => {
    chunkBuilder = new ChunkBuilder(maxVertices, initialChunkIndex);
  });

  describe('constructor', () => {
    it('should initialize with provided chunk ID', () => {
      const testChunkIndex = 5;
      const testMaxVertices = 15;
      const builder = new ChunkBuilder(testMaxVertices, testChunkIndex);
      const chunk = builder.build();

      expect(builder).toBeInstanceOf(ChunkBuilder);
      expect(chunk.id).toBe(testChunkIndex);
    });
  });

  describe('canAddFeature', () => {
    it('should return true when feature can be added within vertex limit', () => {
      const feature = createPolygonFeature(
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
        'feature-1'
      ); // 5 vertices

      const canAdd = chunkBuilder.canAddFeature(feature);

      expect(canAdd).toBe(true);
    });

    it('should throw error when feature has no ID', () => {
      const feature = createPolygonFeature([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ]); // no ID provided

      expect(() => chunkBuilder.canAddFeature(feature)).toThrow('Feature must have an id');
    });

    it('should return false when adding feature would exceed vertex limit', () => {
      // 11 vertices
      const feature1 = createPolygonFeature(
        [
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
        ],
        'feature-1'
      );

      const canAdd = chunkBuilder.canAddFeature(feature1); // Would be 11 > 10

      expect(canAdd).toBe(false);
    });

    it('should return true when adding feature exactly matches vertex limit', () => {
      // 10 vertices
      const feature1 = createPolygonFeature(
        [
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
        ],
        'feature-1'
      );

      const canAdd = chunkBuilder.canAddFeature(feature1); // Would be exactly 10

      expect(canAdd).toBe(true);
    });

    it('should add features that exceeded vertices limit to skipped array', () => {
      const largeFeature = createPolygonFeature(
        [
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
        ],
        'large-feature'
      ); // 11 vertices

      const canAdd = chunkBuilder.canAddFeature(largeFeature);

      expect(canAdd).toBe(false);
      expect(chunkBuilder.build().skippedFeatures).toHaveLength(1);
    });

    it('should not add feature that is already in skipped array', () => {
      const largeFeature = createPolygonFeature(
        [
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
        ],
        'large-feature'
      ); // 11 vertices

      // First, feature gets added to skipped array via canAddFeature
      const canAdd = chunkBuilder.canAddFeature(largeFeature);
      expect(canAdd).toBe(false);
      expect(chunkBuilder.build().skippedFeatures).toHaveLength(1);

      // Now try to add the same feature - it should be ignored
      chunkBuilder.addFeature(largeFeature);

      const chunk = chunkBuilder.build();
      expect(chunk.features).toHaveLength(0); // Feature not added to main features array
      expect(chunk.skippedFeatures).toHaveLength(1); // Still only one skipped feature
      expect(chunk.verticesCount).toBe(0); // Vertex count unchanged
    });
  });

  describe('addFeature', () => {
    it('should add feature to the chunk', () => {
      const feature = createPolygonFeature(
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
        'feature-1'
      );

      chunkBuilder.addFeature(feature);
      const chunk = chunkBuilder.build();

      expect(chunk.features).toHaveLength(1);
      expect(chunk.features[0]).toBe(feature);
      expect(chunk.verticesCount).toBe(5);
    });

    it('should throw error when feature has no ID during addFeature', () => {
      const feature = createPolygonFeature([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ]); // no ID provided

      expect(() => chunkBuilder.addFeature(feature)).toThrow('Feature must have an id');
    });

    it('should add multiple features and update vertex count correctly', () => {
      const feature1 = createPolygonFeature(
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
        'feature-1'
      ); // 5 vertices
      const feature2 = createPolygonFeature(
        [
          [2, 2],
          [3, 2],
          [3, 3],
          [2, 3],
          [2, 2],
        ],
        'feature-2'
      ); // 5 vertices

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
        id: 'complex-feature',
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
      const feature = createPolygonFeature(
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
        'feature-1'
      );

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
      const feature = createPolygonFeature(
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
        'feature-1'
      );

      chunkBuilder.addFeature(feature);

      chunkBuilder.nextChunk();

      const chunk = chunkBuilder.build();
      expect(chunk.features).toEqual([]);
      expect(chunk.verticesCount).toBe(0);
    });

    it('should increment chunk ID', () => {
      const feature = createPolygonFeature(
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
        'feature-1'
      );

      chunkBuilder.addFeature(feature);
      const chunkBeforenextChunk = chunkBuilder.build();
      expect(chunkBeforenextChunk.id).toBe(initialChunkIndex);

      chunkBuilder.nextChunk();
      const chunkAfternextChunk = chunkBuilder.build();
      expect(chunkAfternextChunk.id).toBe(initialChunkIndex + 1);
    });

    it('should allow adding features after nextChunk', () => {
      const feature1 = createPolygonFeature(
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
        'feature-1'
      );
      const feature2 = createPolygonFeature(
        [
          [2, 2],
          [3, 2],
          [3, 3],
          [2, 3],
          [2, 2],
        ],
        'feature-2'
      );

      chunkBuilder.addFeature(feature1);
      chunkBuilder.nextChunk();
      chunkBuilder.addFeature(feature2);

      const chunk = chunkBuilder.build();
      expect(chunk.features).toEqual([feature2]);
      expect(chunk.verticesCount).toBe(5);
      expect(chunk.id).toBe(initialChunkIndex + 1);
    });
  });

  describe('multi-step scenarios', () => {
    it('should handle typical chunking workflow', () => {
      const features = [
        createPolygonFeature(
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
          'feature-1'
        ), // 5 vertices
        createPolygonFeature(
          [
            [2, 2],
            [3, 2],
            [3, 3],
            [2, 3],
            [2, 2],
          ],
          'feature-2'
        ), // 5 vertices
        createPolygonFeature(
          [
            [4, 4],
            [5, 4],
            [5, 5],
            [4, 5],
            [4, 4],
          ],
          'feature-3'
        ), // 5 vertices
      ];

      // Add first two features (exactly at limit)
      expect(chunkBuilder.canAddFeature(features[0])).toBe(true);
      chunkBuilder.addFeature(features[0]);

      expect(chunkBuilder.canAddFeature(features[1])).toBe(true);
      chunkBuilder.addFeature(features[1]);

      // Third feature would exceed limit
      expect(chunkBuilder.canAddFeature(features[2])).toBe(false);

      // Build first chunk
      const chunk1 = chunkBuilder.build();
      expect(chunk1.id).toBe(initialChunkIndex);
      expect(chunk1.features).toHaveLength(2);
      expect(chunk1.verticesCount).toBe(10);

      // nextChunk and add third feature
      chunkBuilder.nextChunk();
      expect(chunkBuilder.canAddFeature(features[2])).toBe(true);
      chunkBuilder.addFeature(features[2]);

      // Build second chunk
      const chunk2 = chunkBuilder.build();
      expect(chunk2.id).toBe(initialChunkIndex + 1);
      expect(chunk2.features).toHaveLength(1);
      expect(chunk2.verticesCount).toBe(5);
    });

    it('should maintain state consistency across operations', () => {
      const feature = createPolygonFeature(
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
        'feature-1'
      );

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

  describe('ID validation scenarios', () => {
    it('should handle features with string IDs', () => {
      const feature = createPolygonFeature(
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
        'string-id'
      );

      expect(chunkBuilder.canAddFeature(feature)).toBe(true);
      chunkBuilder.addFeature(feature);

      const chunk = chunkBuilder.build();
      expect(chunk.features).toHaveLength(1);
      expect(chunk.features[0].id).toBe('string-id');
    });

    it('should handle features with numeric IDs', () => {
      const feature = createPolygonFeature(
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
        12345
      );

      expect(chunkBuilder.canAddFeature(feature)).toBe(true);
      chunkBuilder.addFeature(feature);

      const chunk = chunkBuilder.build();
      expect(chunk.features).toHaveLength(1);
      expect(chunk.features[0].id).toBe(12345);
    });

    it('should throw error when trying to add feature without ID via canAddFeature', () => {
      const featureWithoutId = createPolygonFeature([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ]);

      expect(() => chunkBuilder.canAddFeature(featureWithoutId)).toThrow('Feature must have an id');
    });

    it('should throw error when trying to add feature without ID via addFeature', () => {
      const featureWithoutId = createPolygonFeature([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ]);

      expect(() => chunkBuilder.addFeature(featureWithoutId)).toThrow('Feature must have an id');
    });

    it('should handle features with zero as ID', () => {
      const feature = createPolygonFeature(
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
        0
      );

      expect(chunkBuilder.canAddFeature(feature)).toBe(true);
      chunkBuilder.addFeature(feature);

      const chunk = chunkBuilder.build();
      expect(chunk.features).toHaveLength(1);
      expect(chunk.features[0].id).toBe(0);
    });

    it('should handle features with empty string as ID', () => {
      const feature = createPolygonFeature(
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
        ''
      );

      expect(chunkBuilder.canAddFeature(feature)).toBe(true);
      chunkBuilder.addFeature(feature);

      const chunk = chunkBuilder.build();
      expect(chunk.features).toHaveLength(1);
      expect(chunk.features[0].id).toBe('');
    });
  });
});
