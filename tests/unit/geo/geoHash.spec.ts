import { bboxPolygon } from '@turf/turf';
import { BBox2d } from '@turf/helpers/dist/js/lib/geojson';
import { createGeoHashGenerator, decodeGeoHash, tileGenerator } from '../../../src/geo/geoHash';
import { TileOrigin } from '../../../src/models/enums/geo/tileOrigin';

describe('geoHash', () => {
  describe('decodegeoHash', () => {
    it('return bbox of specific hash', () => {
      const hash = '00';

      const bbox = decodeGeoHash(hash);

      const expectedBbox = [-180, -90, -168.75, -84.375];
      expect(bbox).toEqual(expectedBbox);
    });
  });
  describe('createGeoHashGenerator', () => {
    it('generate optimized geohashes base on polygon and zoom level that covers the polygon', () => {
      const bbox = [0, 0, 45, 50.626] as BBox2d;
      const poly = bboxPolygon(bbox);

      const gen = createGeoHashGenerator(poly, 6);

      const hashes = [];
      for (const hash of gen) {
        hashes.push(hash);
      }
      const expectedHashes = [
        's',
        'u0',
        'u2',
        'u8',
        'ub',
        'u10',
        'u11',
        'u14',
        'u15',
        'u1h',
        'u1j',
        'u1n',
        'u1p',
        'u30',
        'u31',
        'u34',
        'u35',
        'u3h',
        'u3j',
        'u3n',
        'u3p',
        'u90',
        'u91',
        'u94',
        'u95',
        'u9h',
        'u9j',
        'u9n',
        'u9p',
        'uc0',
        'uc1',
        'uc4',
        'uc5',
        'uch',
        'ucj',
        'ucn',
        'ucp',
      ];

      expect(hashes).toEqual(expectedHashes);
    });
  });
  describe('tileGenerator', () => {
    it('generate ll tile list for given polygon and zoom', () => {
      const bbox = [-90, 0, 90, 90] as BBox2d;
      const poly = bboxPolygon(bbox);

      const gen = tileGenerator(poly, 1);

      const tiles = [];
      for (const tile of gen) {
        tiles.push(tile);
      }
      const expectedTiles = [
        { x: 1, y: 1, zoom: 1 },
        { x: 2, y: 1, zoom: 1 },
      ];

      expect(tiles).toEqual(expectedTiles);
    });

    it('generate ul tile list for given polygon and zoom', () => {
      const bbox = [-90, 0, 90, 90] as BBox2d;
      const poly = bboxPolygon(bbox);

      const gen = tileGenerator(poly, 1, TileOrigin.UPPER_LEFT);

      const tiles = [];
      for (const tile of gen) {
        tiles.push(tile);
      }
      const expectedTiles = [
        { x: 1, y: 0, zoom: 1 },
        { x: 2, y: 0, zoom: 1 },
      ];

      expect(tiles).toEqual(expectedTiles);
    });
  });
});
