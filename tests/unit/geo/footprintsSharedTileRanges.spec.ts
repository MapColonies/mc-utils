import type { MultiPolygon, Polygon } from 'geojson';
import { bboxPolygon, booleanDisjoint, bbox as turfBbox } from '@turf/turf';
import { ITileRange } from '../../../src/models/interfaces/geo/iTile';
import { footprintsSharedTileRanges, footprintToTileRanges } from '../../../src/geo/footprintToTileRanges';
import { Footprint } from '../../../src/geo/geoIntersection';
import { degreesPerTile } from '../../../src/geo/tiles';

// exhaustive ground truth: a tile belongs to the result iff it touches the first footprint AND
// touches the second one. Candidates are the tiles of the intersection of both bboxes, each
// padded by one tile so boundary-touching neighbors are candidates too
const oracleTileSet = (first: Footprint, second: Footprint, minZoom: number, maxZoom: number): Set<string> => {
  const tiles = new Set<string>();
  const [aMinLon, aMinLat, aMaxLon, aMaxLat] = turfBbox(first);
  const [bMinLon, bMinLat, bMaxLon, bMaxLat] = turfBbox(second);
  for (let zoom = minZoom; zoom <= maxZoom; zoom++) {
    const resolution = degreesPerTile(zoom);
    const cols = 2 * Math.pow(2, zoom);
    const rows = Math.pow(2, zoom);
    const toX = (lon: number): number => Math.floor((lon + 180) / resolution);
    const toY = (lat: number): number => Math.floor((lat + 90) / resolution);
    const minX = Math.max(0, Math.max(toX(aMinLon), toX(bMinLon)) - 1);
    const maxX = Math.min(cols - 1, Math.min(toX(aMaxLon), toX(bMaxLon)) + 1);
    const minY = Math.max(0, Math.max(toY(aMinLat), toY(bMinLat)) - 1);
    const maxY = Math.min(rows - 1, Math.min(toY(aMaxLat), toY(bMaxLat)) + 1);
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const tilePolygon = bboxPolygon([x * resolution - 180, y * resolution - 90, (x + 1) * resolution - 180, (y + 1) * resolution - 90]);
        if (!booleanDisjoint(tilePolygon, first) && !booleanDisjoint(tilePolygon, second)) {
          tiles.add(`${zoom}/${x}/${y}`);
        }
      }
    }
  }
  return tiles;
};

const expandToTileSet = (ranges: Iterable<ITileRange>): Set<string> => {
  const tiles = new Set<string>();
  for (const range of ranges) {
    for (let x = range.minX; x <= range.maxX; x++) {
      for (let y = range.minY; y <= range.maxY; y++) {
        tiles.add(`${range.zoom}/${x}/${y}`);
      }
    }
  }
  return tiles;
};

const tileCount = (ranges: ITileRange[]): number =>
  ranges.reduce((sum, range) => sum + (range.maxX - range.minX + 1) * (range.maxY - range.minY + 1), 0);

const squarePolygon = (minLon: number, minLat: number, maxLon: number, maxLat: number): Polygon => ({
  type: 'Polygon',
  coordinates: [
    [
      [minLon, minLat],
      [maxLon, minLat],
      [maxLon, maxLat],
      [minLon, maxLat],
      [minLon, minLat],
    ],
  ],
});

const triangle = (a: [number, number], b: [number, number], c: [number, number]): Polygon => ({
  type: 'Polygon',
  coordinates: [[a, b, c, a]],
});

describe('footprintsSharedTileRanges', () => {
  describe('zoom range validation', () => {
    it('should throw RangeError when minZoom is greater than maxZoom', () => {
      const footprint = squarePolygon(0, 0, 90, 90);

      const generate = () => [...footprintsSharedTileRanges(footprint, footprint, { minZoom: 5, maxZoom: 3 })];

      expect(generate).toThrow(RangeError);
    });

    it.each([
      [-1, 5],
      [0, 23],
    ])('should throw RangeError when the range [%i, %i] exceeds the supported zoom levels', (minZoom, maxZoom) => {
      const footprint = squarePolygon(0, 0, 90, 90);

      const generate = () => [...footprintsSharedTileRanges(footprint, footprint, { minZoom, maxZoom })];

      expect(generate).toThrow(RangeError);
    });
  });

  describe('tile coverage', () => {
    it('should keep only the coarse tiles that contain both of two far apart footprints', () => {
      const first = squarePolygon(35.4, 33.8, 35.6, 34.0);
      const second = squarePolygon(34.2, 31.2, 34.4, 31.5);

      const ranges = [...footprintsSharedTileRanges(first, second, { minZoom: 0, maxZoom: 12 })];

      expect(expandToTileSet(ranges)).toEqual(oracleTileSet(first, second, 0, 12));
      expect(Math.max(...ranges.map((range) => range.zoom))).toBeLessThan(12);
    });

    it('should keep the tiles along a shared edge at every zoom', () => {
      const first = squarePolygon(34.4, 31.3, 34.5, 31.4);
      const second = squarePolygon(34.3, 31.3, 34.4, 31.4);

      const ranges = [...footprintsSharedTileRanges(first, second, { minZoom: 16, maxZoom: 16 })];

      expect(ranges.length).toBeGreaterThan(0);
      expect(expandToTileSet(ranges)).toEqual(oracleTileSet(first, second, 16, 16));
    });

    it('should equal footprintToTileRanges when both footprints are the same', () => {
      const footprint = squarePolygon(34.72, 31.23, 35.28, 31.87);

      const shared = expandToTileSet(footprintsSharedTileRanges(footprint, footprint, { minZoom: 0, maxZoom: 10 }));

      expect(shared).toEqual(expandToTileSet(footprintToTileRanges(footprint, { minZoom: 0, maxZoom: 10 })));
    });

    it('should equal footprintToTileRanges of the inner footprint when it lies strictly inside the outer one', () => {
      const outer = squarePolygon(34.0, 31.0, 36.0, 33.0);
      const inner = squarePolygon(34.72, 31.23, 35.28, 31.87);

      const shared = expandToTileSet(footprintsSharedTileRanges(outer, inner, { minZoom: 0, maxZoom: 10 }));

      expect(shared).toEqual(expandToTileSet(footprintToTileRanges(inner, { minZoom: 0, maxZoom: 10 })));
    });

    it('should not depend on the argument order', () => {
      const first = squarePolygon(34.72, 31.23, 35.28, 31.87);
      const second = triangle([35.0, 31.5], [35.6, 31.5], [35.3, 32.2]);

      const forward = expandToTileSet(footprintsSharedTileRanges(first, second, { minZoom: 0, maxZoom: 10 }));
      const backward = expandToTileSet(footprintsSharedTileRanges(second, first, { minZoom: 0, maxZoom: 10 }));

      expect(backward).toEqual(forward);
    });
  });

  describe('brute-force parity', () => {
    const donut: Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [34.7, 31.2],
          [35.3, 31.2],
          [35.3, 31.9],
          [34.7, 31.9],
          [34.7, 31.2],
        ],
        [
          [34.9, 31.4],
          [35.1, 31.4],
          [35.1, 31.7],
          [34.9, 31.7],
          [34.9, 31.4],
        ],
      ],
    };

    const twoParts: MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [squarePolygon(34.5, 31.3, 34.8, 31.6).coordinates, squarePolygon(35.0, 31.3, 35.3, 31.6).coordinates],
    };

    it.each<[string, Footprint, Footprint, number, number]>([
      ['two overlapping rectangles', squarePolygon(34.72, 31.23, 35.28, 31.87), squarePolygon(35.0, 31.5, 35.6, 32.1), 0, 10],
      [
        'mirrored triangles sharing a diagonal',
        triangle([34.5, 31.0], [35.0, 31.0], [34.5, 31.5]),
        triangle([35.0, 31.0], [35.0, 31.5], [34.5, 31.5]),
        0,
        12,
      ],
      ['a square in a donut hole', donut, squarePolygon(34.95, 31.45, 35.05, 31.65), 0, 11],
      ['a square across a donut ring', donut, squarePolygon(35.05, 31.5, 35.2, 31.6), 0, 11],
      ['a strip over the gap of a MultiPolygon', twoParts, squarePolygon(34.7, 31.4, 35.1, 31.5), 0, 10],
      ['two squares 0.001 degrees apart', squarePolygon(34.3, 31.3, 34.4, 31.4), squarePolygon(34.401, 31.3, 34.501, 31.4), 8, 16],
    ])('should match the exhaustive oracle key-by-key for %s', (_name, first, second, minZoom, maxZoom) => {
      const tiles = expandToTileSet(footprintsSharedTileRanges(first, second, { minZoom, maxZoom }));

      expect(tiles).toEqual(oracleTileSet(first, second, minZoom, maxZoom));
    });

    it('should emit disjoint ranges per zoom level', () => {
      const ranges = [...footprintsSharedTileRanges(donut, squarePolygon(35.0, 31.3, 35.5, 31.8), { minZoom: 0, maxZoom: 10 })];

      expect(tileCount(ranges)).toBe(expandToTileSet(ranges).size);
    });

    it('should emit an interior block of both footprints as one range per zoom', () => {
      // both cover zoom 2 tile (4, 2) = [0, 45] x [0, 45] entirely, so its subtree comes out as blocks
      const first = squarePolygon(-1, -1, 50, 50);
      const second = squarePolygon(-2, -2, 46, 46);

      const ranges = [...footprintsSharedTileRanges(first, second, { minZoom: 6, maxZoom: 6 })];

      expect(ranges).toContainEqual({ zoom: 6, minX: 64, maxX: 79, minY: 32, maxY: 47 });
    });

    it('should be deterministic across runs', () => {
      const second = squarePolygon(35.0, 31.3, 35.5, 31.8);
      const first = [...footprintsSharedTileRanges(donut, second, { minZoom: 0, maxZoom: 10 })];
      const again = [...footprintsSharedTileRanges(donut, second, { minZoom: 0, maxZoom: 10 })];

      expect(again).toEqual(first);
    });
  });
});
