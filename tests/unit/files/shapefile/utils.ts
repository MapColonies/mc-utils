import { Feature, Polygon } from 'geojson';
import { ShapefileChunk } from '../../../../src';

// Helper function to create a simple polygon feature
export function createPolygonFeature(coordinates: number[][]): Feature<Polygon> {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates],
    },
  };
}

// Helper function to create test chunks
export function createTestChunk(id: number, featuresCount: number, verticesCount: number): ShapefileChunk {
  const features: Feature<Polygon>[] = [];

  // Create mock features (simplified for testing)
  for (let i = 0; i < featuresCount; i++) {
    features.push({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      },
    });
  }

  return {
    id,
    features,
    skippedFeatures: [],
    verticesCount,
  };
}
