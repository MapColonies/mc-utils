import { BBox2d } from '@turf/helpers/dist/js/lib/geojson';
import { bboxPolygon, featureCollection, polygon } from '@turf/turf';
import { getHashes } from 'crypto';
import { fstat, writeFileSync } from 'fs';
import { snapBBoxToTileGrid } from '../../../src';
import { TileHasher } from '../../../src/geo/tileHasher';

describe('TileHasher', () => {
  let hasher: TileHasher;

  beforeEach(() => {
    hasher = new TileHasher();
  });

  describe('encodeTile', () => {
    it('returns expected hash', () => {
      const tile = {
        x: 3,
        y: 1,
        zoom: 2,
      };

      const hash = hasher.encodeTile(tile);

      expect(hash).toEqual('013');
    });
  });

  describe('decodeTile', () => {
    it('returns expected tile', () => {
      const tile = hasher.decodeTile('013');

      const expectedTile = {
        x: 3,
        y: 1,
        zoom: 2,
      };
      expect(tile).toEqual(expectedTile);
    });
  });

  describe('decodeTileRange', () => {
    it('return expcted tile range', () => {
      const range = hasher.decodeTileRange('013', 3);

      const expectedTileRange = {
        minX: 6,
        minY: 2,
        maxX: 8,
        maxY: 4,
        zoom: 3,
      };
      expect(range).toEqual(expectedTileRange);
    });
  });

  describe('decodeBbox', () => {
    it('retuns bbox of encoded tile', () => {
      const bbox = hasher.decodeBbox('013');

      const expectedBbox = [-45, -45, 0, 0];
      expect(bbox).toEqual(expectedBbox);
    });
  });

  describe('encodeBbox', () => {
    it('generates optimized tile hash cover for bbox', () => {
      const bbox = [0, 0, 45, 50.626] as BBox2d;
      const tileHashes = [];

      const hashGen = hasher.encodeBBox(bbox, 6);
      for (const hash of hashGen) {
        tileHashes.push(hash);
      }
      const expectedHashes = [
        '120',
        '122000',
        '122001',
        '1220020',
        '1220021',
        '1220030',
        '1220031',
        '122010',
        '122011',
        '1220120',
        '1220121',
        '1220130',
        '1220131',
        '122100',
        '122101',
        '1221020',
        '1221021',
        '1221030',
        '1221031',
        '122110',
        '122111',
        '1221120',
        '1221121',
        '1221130',
        '1221131',
      ];
      expect(tileHashes).toEqual(expectedHashes);
    });
  });

  describe('encodeFootprint', () => {
    it('encode rectangle polygon calls encode bbox', () => {
      const encodeBboxMock = jest.fn();
      hasher.encodeBBox = encodeBboxMock;
      const bbox = [0, 0, 1, 1] as BBox2d;
      const bboxPoly = bboxPolygon(bbox);

      hasher.encodeFootprint(bboxPoly, 8);

      expect(encodeBboxMock).toHaveBeenCalledTimes(1);
      expect(encodeBboxMock).toHaveBeenCalledWith(bbox, 8);
    });

    it('encodes none bbox polygon properly', () => {
      const encodeBboxMock = jest.fn();
      hasher.encodeBBox = encodeBboxMock;
      const poly = polygon([
        [
          [-45, 0],
          [0, 45],
          [45, 0],
          [-45, 0],
        ],
      ]);

      const tileHashes = [];
      const gen = hasher.encodeFootprint(poly, 5);
      for (const hash of gen) {
        tileHashes.push(hash);
      }
      const expectedHashes = [
        '031000',
        '031001',
        '031003',
        '03101',
        '031030',
        '031031',
        '031033',
        '0311',
        '031300',
        '031301',
        '031303',
        '03131',
        '031330',
        '031331',
        '031333',
        '1200',
        '12010',
        '120110',
        '120111',
        '120112',
        '120120',
        '120121',
        '120122',
        '12020',
        '120210',
        '120211',
        '120212',
        '120220',
        '120221',
        '120222',
      ];
      expect(tileHashes).toEqual(expectedHashes);
      expect(encodeBboxMock).toHaveBeenCalledTimes(0);
    });
  });

  describe('generateTiles', () => {
    it('generates expected tiles from bbox', () => {
      const bbox = [-45, -45, 0, 0] as BBox2d;

      const tiles = [];
      const gen = hasher.generateTiles(bbox, 2);
      for (const tile of gen) {
        tiles.push(tile);
      }

      const expectedTiles = [
        {
          x: 3,
          y: 1,
          zoom: 2,
        },
      ];
      expect(tiles).toEqual(expectedTiles);
    });

    it('generates expected tiles from bbox polygon', () => {
      const bbox = [-45, -45, 0, 0] as BBox2d;
      const poly = bboxPolygon(bbox);

      const tiles = [];
      const gen = hasher.generateTiles(poly, 2);
      for (const tile of gen) {
        tiles.push(tile);
      }

      const expectedTiles = [
        {
          x: 3,
          y: 1,
          zoom: 2,
        },
      ];
      expect(tiles).toEqual(expectedTiles);
    });

    it('generates expected tiles from none bbox polygon', () => {
      const poly = polygon([
        [
          [-45, 0],
          [0, 45],
          [45, 0],
          [-45, 0],
        ],
      ]);

      const tiles = [];
      const gen = hasher.generateTiles(poly, 2);
      for (const tile of gen) {
        tiles.push(tile);
      }

      const expectedTiles = [
        {
          x: 3,
          y: 2,
          zoom: 2,
        },
        {
          x: 4,
          y: 2,
          zoom: 2,
        },
      ];
      expect(tiles).toEqual(expectedTiles);
    });
  });
});
