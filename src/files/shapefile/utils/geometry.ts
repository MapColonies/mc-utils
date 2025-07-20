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
    case 'Point': {
      throw new Error('Vertices Count Not Supported: "Point" case');
    }
    case 'MultiPoint': {
      throw new Error('Vertices Count Not Supported: "MultiPoint" case');
    }
    case 'LineString': {
      throw new Error('Vertices Count Not Supported: "LineString" case');
    }
    case 'MultiLineString': {
      throw new Error('Vertices Count Not Supported: "MultiLineString" case');
    }
    case 'GeometryCollection': {
      throw new Error('Vertices Count Not Supported: "GeometryCollection" case');
    }
  }

  return count;
}
