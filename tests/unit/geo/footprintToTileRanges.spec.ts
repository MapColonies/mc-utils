import type { Feature, MultiPolygon, Polygon } from 'geojson';
import { bboxPolygon, booleanDisjoint, bbox as turfBbox } from '@turf/turf';
import { ITileRange } from '../../../src/models/interfaces/geo/iTile';
import { footprintToTileRanges } from '../../../src/geo/footprintToTileRanges';
import { Footprint } from '../../../src/geo/geoIntersection';
import { degreesPerTile } from '../../../src/geo/tiles';

// exhaustive ground truth (see ADR 0001): test every candidate tile in the footprint's bbox
// (padded by one tile so boundary-touching neighbors are candidates too) with the same
// inclusive intersection predicate the production algorithm must honor
const oracleTileSet = (footprint: Footprint, minZoom: number, maxZoom: number): Set<string> => {
  const tiles = new Set<string>();
  const [minLon, minLat, maxLon, maxLat] = turfBbox(footprint);
  for (let zoom = minZoom; zoom <= maxZoom; zoom++) {
    const resolution = degreesPerTile(zoom);
    const cols = 2 * Math.pow(2, zoom);
    const rows = Math.pow(2, zoom);
    const minX = Math.max(0, Math.floor((minLon + 180) / resolution) - 1);
    const maxX = Math.min(cols - 1, Math.floor((maxLon + 180) / resolution) + 1);
    const minY = Math.max(0, Math.floor((minLat + 90) / resolution) - 1);
    const maxY = Math.min(rows - 1, Math.floor((maxLat + 90) / resolution) + 1);
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const tilePolygon = bboxPolygon([x * resolution - 180, y * resolution - 90, (x + 1) * resolution - 180, (y + 1) * resolution - 90]);
        if (!booleanDisjoint(tilePolygon, footprint)) {
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

describe('footprintToTileRanges', () => {
  describe('zoom span validation', () => {
    it('should throw RangeError when minZoom is greater than maxZoom', () => {
      const footprint = squarePolygon(0, 0, 90, 90);

      const generate = () => [...footprintToTileRanges(footprint, { minZoom: 5, maxZoom: 3 })];

      expect(generate).toThrow(RangeError);
    });

    it.each([
      [-1, 5],
      [0, 23],
    ])('should throw RangeError when the span [%i, %i] exceeds the supported zoom levels', (minZoom, maxZoom) => {
      const footprint = squarePolygon(0, 0, 90, 90);

      const generate = () => [...footprintToTileRanges(footprint, { minZoom, maxZoom })];

      expect(generate).toThrow(RangeError);
    });
  });

  describe('tile coverage', () => {
    it.only('should yield exactly the two root tiles for a world-covering footprint at zoom 0', () => {
      const footprint = squarePolygon(-180, -90, 180, 90);

      const tiles = expandToTileSet(footprintToTileRanges(footprint, { minZoom: 0, maxZoom: 0 }));

      expect(tiles).toEqual(new Set(['0/0/0', '0/1/0']));
    });

    it('should include tiles that only touch the footprint boundary with zero overlap area', () => {
      // footprint aligned exactly to the zoom 2 grid (tile resolution 45 degrees): it fills
      // tile (4,2) and touches all 8 neighbors along edges/corners without overlapping them
      const footprint = squarePolygon(0, 0, 45, 45);

      const tiles = expandToTileSet(footprintToTileRanges(footprint, { minZoom: 2, maxZoom: 2 }));

      expect(tiles).toEqual(new Set(['2/3/1', '2/4/1', '2/5/1', '2/3/2', '2/4/2', '2/5/2', '2/3/3', '2/4/3', '2/5/3']));
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

    const disjointMultiPolygon: MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [squarePolygon(10, 10, 10.5, 10.5).coordinates, squarePolygon(40, -20, 40.4, -19.6).coordinates],
    };

    const thinSliver: Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [34.7, 31.2],
          [35.3, 31.9],
          [35.3005, 31.9],
          [34.7005, 31.2],
          [34.7, 31.2],
        ],
      ],
    };

    const rectangleFeature: Feature<Polygon> = {
      type: 'Feature',
      properties: {},
      geometry: squarePolygon(34.72, 31.23, 35.28, 31.87),
    };

    it.each<[string, Footprint, number, number]>([
      ['off-grid rectangle', squarePolygon(34.72, 31.23, 35.28, 31.87), 0, 8],
      ['donut with a hole', donut, 0, 10],
      ['disjoint MultiPolygon parts', disjointMultiPolygon, 2, 8],
      ['adversarial thin sliver', thinSliver, 4, 12],
      ['Feature-wrapped rectangle', rectangleFeature, 3, 8],
    ])('should match the exhaustive oracle key-by-key for a %s', (_name, footprint, minZoom, maxZoom) => {
      const tiles = expandToTileSet(footprintToTileRanges(footprint, { minZoom, maxZoom }));

      expect(tiles).toEqual(oracleTileSet(footprint, minZoom, maxZoom));
    });

    it('should emit disjoint ranges per zoom level', () => {
      const ranges = [...footprintToTileRanges(donut, { minZoom: 0, maxZoom: 10 })];

      const totalTiles = ranges.reduce((sum, range) => sum + (range.maxX - range.minX + 1) * (range.maxY - range.minY + 1), 0);
      expect(totalTiles).toBe(expandToTileSet(ranges).size);
    });

    it('should be deterministic across runs', () => {
      const first = [...footprintToTileRanges(thinSliver, { minZoom: 0, maxZoom: 10 })];
      const second = [...footprintToTileRanges(thinSliver, { minZoom: 0, maxZoom: 10 })];

      expect(second).toEqual(first);
    });
  });
});
