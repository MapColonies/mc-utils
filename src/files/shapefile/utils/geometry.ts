import { Geometry } from 'geojson';

/**
 * Counts the number of vertices in a given geometry.
 * @param geometry - The geometry object to count vertices in.
 * @returns The total number of vertices in the geometry.
 * @throws Will throw an error if the geometry type is unsupported(supporting only Polygon and MultiPolygon).
 */
export function countVertices(geometry: Geometry): number {
  let count = 0;

  switch (geometry.type) {
    case 'Polygon':
      geometry.coordinates.forEach((ring) => {
        count += ring.length;
      });
      break;
    case 'MultiPolygon':
      geometry.coordinates.forEach((polygon) => {
        polygon.forEach((ring) => {
          count += ring.length;
        });
      });
      break;
    default: {
      throw new Error(`Vertices Count Not Supported: "${geometry.type}" case`);
    }
  }

  return count;
}
