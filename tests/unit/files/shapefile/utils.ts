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
  const defaultCoords: number[][] = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
    [0, 0],
  ];
  const features = Array.from({ length: featuresCount }, () => createPolygonFeature(defaultCoords));

  return {
    id,
    features,
    skippedFeatures: [],
    verticesCount,
  };
}
