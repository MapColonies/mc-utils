import { Geometry, Polygon, MultiPolygon } from 'geojson';
import { countVertices } from '../../../src/geo/vertices';

describe('countVertices', () => {
  describe('Polygon geometries', () => {
    it('should count vertices in a simple polygon with one ring', () => {
      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0], // closing vertex
          ],
        ],
      };

      const result = countVertices(polygon);

      expect(result).toBe(5);
    });

    it('should count vertices in a polygon with holes', () => {
      const polygonWithHole: Polygon = {
        type: 'Polygon',
        coordinates: [
          // Outer ring
          [
            [0, 0],
            [4, 0],
            [4, 4],
            [0, 4],
            [0, 0], // 5 vertices
          ],
          // Inner ring (hole)
          [
            [1, 1],
            [3, 1],
            [3, 3],
            [1, 3],
            [1, 1], // 5 vertices
          ],
        ],
      };

      const result = countVertices(polygonWithHole);

      expect(result).toBe(10); // 5 + 5 vertices
    });

    it('should count vertices in a polygon with multiple holes', () => {
      const polygonWithMultipleHoles: Polygon = {
        type: 'Polygon',
        coordinates: [
          // Outer ring
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0], // 5 vertices
          ],
          // First hole
          [
            [1, 1],
            [3, 1],
            [3, 3],
            [1, 3],
            [1, 1], // 5 vertices
          ],
          // Second hole
          [
            [6, 6],
            [8, 6],
            [8, 8],
            [6, 8],
            [6, 6], // 5 vertices
          ],
        ],
      };

      const result = countVertices(polygonWithMultipleHoles);

      expect(result).toBe(15); // 5 + 5 + 5 vertices
    });

    it('should handle polygon with single vertex ring', () => {
      const singleVertexPolygon: Polygon = {
        type: 'Polygon',
        coordinates: [[[0, 0]]],
      };

      const result = countVertices(singleVertexPolygon);

      expect(result).toBe(1);
    });

    it('should handle polygon with empty rings', () => {
      const emptyRingsPolygon: Polygon = {
        type: 'Polygon',
        coordinates: [[], []],
      };

      const result = countVertices(emptyRingsPolygon);

      expect(result).toBe(0);
    });
  });

  describe('MultiPolygon geometries', () => {
    it('should count vertices in a simple multipolygon', () => {
      const multiPolygon: MultiPolygon = {
        type: 'MultiPolygon',
        coordinates: [
          [
            // First polygon
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0], // 5 vertices
            ],
          ],
          [
            // Second polygon
            [
              [2, 2],
              [3, 2],
              [3, 3],
              [2, 3],
              [2, 2], // 5 vertices
            ],
          ],
        ],
      };

      const result = countVertices(multiPolygon);

      expect(result).toBe(10); // 5 + 5 vertices
    });

    it('should count vertices in multipolygon with holes', () => {
      const multiPolygonWithHoles: MultiPolygon = {
        type: 'MultiPolygon',
        coordinates: [
          [
            // First polygon with hole
            [
              [0, 0],
              [4, 0],
              [4, 4],
              [0, 4],
              [0, 0], // 5 vertices
            ],
            [
              [1, 1],
              [3, 1],
              [3, 3],
              [1, 3],
              [1, 1], // 5 vertices
            ],
          ],
          [
            // Second polygon without holes
            [
              [5, 5],
              [7, 5],
              [7, 7],
              [5, 7],
              [5, 5], // 5 vertices
            ],
          ],
        ],
      };

      const result = countVertices(multiPolygonWithHoles);

      expect(result).toBe(15); // 5 + 5 + 5 vertices
    });

    it('should handle empty multipolygon', () => {
      const emptyMultiPolygon: MultiPolygon = {
        type: 'MultiPolygon',
        coordinates: [],
      };

      const result = countVertices(emptyMultiPolygon);

      expect(result).toBe(0);
    });

    it('should handle multipolygon with empty polygon coordinates', () => {
      const multiPolygonWithEmptyPolygon: MultiPolygon = {
        type: 'MultiPolygon',
        coordinates: [
          [], // Empty polygon
          [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 0], // 4 vertices
            ],
          ],
        ],
      };

      const result = countVertices(multiPolygonWithEmptyPolygon);

      expect(result).toBe(4);
    });
  });

  describe('Error handling', () => {
    it('should throw error for Point geometry', () => {
      const point: Geometry = {
        type: 'Point',
        coordinates: [0, 0],
      };

      expect(() => countVertices(point)).toThrow('Vertices Count Not Supported: "Point" case');
    });

    it('should throw error for LineString geometry', () => {
      const lineString: Geometry = {
        type: 'LineString',
        coordinates: [
          [0, 0],
          [1, 1],
        ],
      };

      expect(() => countVertices(lineString)).toThrow('Vertices Count Not Supported: "LineString" case');
    });

    it('should throw error for MultiPoint geometry', () => {
      const multiPoint: Geometry = {
        type: 'MultiPoint',
        coordinates: [
          [0, 0],
          [1, 1],
        ],
      };

      expect(() => countVertices(multiPoint)).toThrow('Vertices Count Not Supported: "MultiPoint" case');
    });

    it('should throw error for MultiLineString geometry', () => {
      const multiLineString: Geometry = {
        type: 'MultiLineString',
        coordinates: [
          [
            [0, 0],
            [1, 1],
          ],
          [
            [2, 2],
            [3, 3],
          ],
        ],
      };

      expect(() => countVertices(multiLineString)).toThrow('Vertices Count Not Supported: "MultiLineString" case');
    });

    it('should throw error for GeometryCollection', () => {
      const geometryCollection: Geometry = {
        type: 'GeometryCollection',
        geometries: [
          {
            type: 'Point',
            coordinates: [0, 0],
          },
        ],
      };

      expect(() => countVertices(geometryCollection)).toThrow('Vertices Count Not Supported: "GeometryCollection" case');
    });
  });

  describe('Real-world examples', () => {
    it('should count vertices in a complex polygon', () => {
      const complexPolygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [108.23021298738564, 52.09272928306041],
            [113.51557640000391, 63.529763133526615],
            [89.89497162493814, 55.343736045515755],
            [64.84938510265445, 59.67151334643026],
            [54.65598238553369, 51.79699229921323],
            [73.24391328373366, 55.232514659387306],
            [108.99519269978873, 47.1374091167618],
            [108.23021298738564, 52.09272928306041], // closing vertex
          ],
        ],
      };

      const result = countVertices(complexPolygon);

      expect(result).toBe(8);
    });

    it('should count vertices in a triangle', () => {
      const triangle: Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [0.5, 1],
            [0, 0], // closing vertex
          ],
        ],
      };

      const result = countVertices(triangle);

      expect(result).toBe(4);
    });
  });
});
