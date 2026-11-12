import { bboxPolygon, booleanDisjoint, multiPolygon, polygon, bbox as turfBbox } from '@turf/turf';
import { ITileRange } from '../../../src/models/interfaces/geo/iTile';
import { footprintToTileRanges } from '../../../src/geo/footprintToTileRanges';
import { Footprint } from '../../../src/geo/geoIntersection';
import { degreesPerTile } from '../../../src/geo/tiles';

// exhaustive ground truth: a tile belongs to the result if it touches the first footprint AND
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

const triangle = (a: [number, number], b: [number, number], c: [number, number]): Footprint => polygon([[a, b, c, a]]);

const donut = polygon([
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
]);

const twoParts = multiPolygon([
  bboxPolygon([34.5, 31.3, 34.8, 31.6]).geometry.coordinates,
  bboxPolygon([35.0, 31.3, 35.3, 31.6]).geometry.coordinates,
]);

const twoOtherParts = multiPolygon([
  bboxPolygon([34.6, 31.2, 34.9, 31.5]).geometry.coordinates,
  bboxPolygon([35.2, 31.5, 35.5, 31.8]).geometry.coordinates,
]);

describe('footprintToTileRanges with multiple footprints', () => {
  describe('input validation', () => {
    it('should throw RangeError when minZoom is greater than maxZoom', () => {
      const footprint = bboxPolygon([0, 0, 90, 90]);

      const generate = () => [...footprintToTileRanges([footprint, footprint], { minZoom: 5, maxZoom: 3 })];

      expect(generate).toThrow(RangeError);
    });

    it.each([
      [-1, 5],
      [0, 23],
    ])('should throw RangeError when the range [%i, %i] exceeds the supported zoom levels', (minZoom, maxZoom) => {
      const footprint = bboxPolygon([0, 0, 90, 90]);

      const generate = () => [...footprintToTileRanges([footprint, footprint], { minZoom, maxZoom })];

      expect(generate).toThrow(RangeError);
    });

    it('should throw RangeError when the footprint list is empty', () => {
      const generate = () => [...footprintToTileRanges([], { minZoom: 0, maxZoom: 3 })];

      expect(generate).toThrow(RangeError);
    });
  });

  describe('tile coverage', () => {
    it('should keep only the coarse tiles that contain both of two far apart footprints', () => {
      const first = bboxPolygon([35.4, 33.8, 35.6, 34.0]);
      const second = bboxPolygon([34.2, 31.2, 34.4, 31.5]);

      const ranges = [...footprintToTileRanges([first, second], { minZoom: 0, maxZoom: 12 })];

      expect(expandToTileSet(ranges)).toEqual(oracleTileSet(first, second, 0, 12));
      expect(Math.max(...ranges.map((range) => range.zoom))).toBe(3);
    });

    it('should keep the tiles along a shared edge at every zoom', () => {
      const first = bboxPolygon([34.4, 31.3, 34.5, 31.4]);
      const second = bboxPolygon([34.3, 31.3, 34.4, 31.4]);

      const ranges = [...footprintToTileRanges([first, second], { minZoom: 0, maxZoom: 16 })];

      expect(new Set(ranges.map((range) => range.zoom)).size).toBe(17);
      expect(expandToTileSet(ranges)).toEqual(oracleTileSet(first, second, 0, 16));
    });

    it('should equal the single footprint result when both footprints are the same', () => {
      const footprint = bboxPolygon([34.72, 31.23, 35.28, 31.87]);

      const shared = expandToTileSet(footprintToTileRanges([footprint, footprint], { minZoom: 0, maxZoom: 10 }));

      expect(shared).toEqual(expandToTileSet(footprintToTileRanges(footprint, { minZoom: 0, maxZoom: 10 })));
    });

    it('should equal the single footprint result when given a list of one footprint', () => {
      const footprint = bboxPolygon([34.72, 31.23, 35.28, 31.87]);

      const fromList = [...footprintToTileRanges([footprint], { minZoom: 0, maxZoom: 10 })];

      expect(fromList).toEqual([...footprintToTileRanges(footprint, { minZoom: 0, maxZoom: 10 })]);
    });

    it('should equal the inner footprint result when it lies strictly inside the outer one', () => {
      const outer = bboxPolygon([34.0, 31.0, 36.0, 33.0]);
      const inner = bboxPolygon([34.72, 31.23, 35.28, 31.87]);

      const shared = expandToTileSet(footprintToTileRanges([outer, inner], { minZoom: 0, maxZoom: 10 }));

      expect(shared).toEqual(expandToTileSet(footprintToTileRanges(inner, { minZoom: 0, maxZoom: 10 })));
    });

    it('should not depend on the order of the footprints', () => {
      const first = bboxPolygon([34.72, 31.23, 35.28, 31.87]);
      const second = triangle([35.0, 31.5], [35.6, 31.5], [35.3, 32.2]);

      const forward = expandToTileSet(footprintToTileRanges([first, second], { minZoom: 0, maxZoom: 10 }));
      const backward = expandToTileSet(footprintToTileRanges([second, first], { minZoom: 0, maxZoom: 10 }));

      expect(backward).toEqual(forward);
    });

    it('should yield no deep tiles for a polygon entirely inside the hole of the other, away from its ring', () => {
      // the square keeps a 0.05 degree gap from the hole's ring, wider than a zoom 14 tile (~0.011 degrees)
      const insideHole = bboxPolygon([34.95, 31.45, 35.05, 31.65]);

      const ranges = [...footprintToTileRanges([donut, insideHole], { minZoom: 14, maxZoom: 14 })];

      expect(ranges).toEqual([]);
    });

    it.each<[string, Footprint, Footprint, number, number]>([
      ['two overlapping rectangles', bboxPolygon([34.72, 31.23, 35.28, 31.87]), bboxPolygon([35.0, 31.5, 35.6, 32.1]), 0, 10],
      [
        'mirrored triangles sharing a diagonal',
        triangle([34.5, 31.0], [35.0, 31.0], [34.5, 31.5]),
        triangle([35.0, 31.0], [35.0, 31.5], [34.5, 31.5]),
        0,
        12,
      ],
      ['a square in a donut hole', donut, bboxPolygon([34.95, 31.45, 35.05, 31.65]), 0, 11],
      ['a square across a donut ring', donut, bboxPolygon([35.05, 31.5, 35.2, 31.6]), 0, 11],
      ['a strip over the gap of a MultiPolygon', twoParts, bboxPolygon([34.7, 31.4, 35.1, 31.5]), 0, 10],
      ['a MultiPolygon against a MultiPolygon', twoParts, twoOtherParts, 0, 10],
      ['two squares 0.001 degrees apart', bboxPolygon([34.3, 31.3, 34.4, 31.4]), bboxPolygon([34.401, 31.3, 34.501, 31.4]), 8, 16],
    ])('should match the exhaustive oracle tile-by-tile for %s', (_name, first, second, minZoom, maxZoom) => {
      const tiles = expandToTileSet(footprintToTileRanges([first, second], { minZoom, maxZoom }));

      expect(tiles).toEqual(oracleTileSet(first, second, minZoom, maxZoom));
    });

    it('should not emit any tile twice', () => {
      // the oracle comparisons above use sets, which hide duplicates; equal counts prove the ranges never overlap
      const ranges = [...footprintToTileRanges([donut, bboxPolygon([35.0, 31.3, 35.5, 31.8])], { minZoom: 0, maxZoom: 10 })];

      expect(tileCount(ranges)).toBe(expandToTileSet(ranges).size);
    });

    it('should emit an interior block of both footprints as one range per zoom', () => {
      // both cover zoom 2 tile (4, 2) = [0, 45] x [0, 45] entirely, so its subtree comes out as blocks
      const first = bboxPolygon([-1, -1, 50, 50]);
      const second = bboxPolygon([-2, -2, 46, 46]);

      const ranges = [...footprintToTileRanges([first, second], { minZoom: 6, maxZoom: 6 })];

      expect(ranges).toContainEqual({ zoom: 6, minX: 64, maxX: 79, minY: 32, maxY: 47 });
    });

    it('should not emit neighbouring single-tile ranges of the same zoom', () => {
      const ranges = [...footprintToTileRanges([donut, bboxPolygon([35.0, 31.3, 35.5, 31.8])], { minZoom: 0, maxZoom: 12 })];

      const singles = new Set(ranges.filter((r) => r.minX === r.maxX && r.minY === r.maxY).map((r) => `${r.zoom}/${r.minX}/${r.minY}`));
      const neighbours = [...singles].filter((key) => {
        const [zoom, x, y] = key.split('/').map(Number);
        return singles.has(`${zoom}/${x + 1}/${y}`) || singles.has(`${zoom}/${x}/${y + 1}`);
      });
      expect(neighbours).toEqual([]);
    });

    it('should be deterministic across runs', () => {
      const other = bboxPolygon([35.0, 31.3, 35.5, 31.8]);

      const first = [...footprintToTileRanges([donut, other], { minZoom: 0, maxZoom: 10 })];
      const again = [...footprintToTileRanges([donut, other], { minZoom: 0, maxZoom: 10 })];

      expect(again).toEqual(first);
    });
  });
});
