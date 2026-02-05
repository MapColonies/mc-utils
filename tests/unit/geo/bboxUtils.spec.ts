import { ITile, BBox2d } from '../../../src';
import { bboxFromTiles, bboxToTileRange, snapBBoxToTileGrid } from '../../../src/geo/bboxUtils';

describe('bboxUtils', () => {
  describe('snapBBoxToTileGrid', () => {
    it('rounds coordinates to tile grid', () => {
      const roundedBbox = snapBBoxToTileGrid([-180, -179.9999, 179.9999, 180], 20);
      const gridStep = 180 / (1 << 20);
      for (const cord of roundedBbox) {
        expect(Math.abs(cord % gridStep)).toBe(0);
      }
    });

    it('rounded bbox contains original bbox', () => {
      const roundedBbox = snapBBoxToTileGrid([1, 2, 3, 4], 20);
      expect(roundedBbox[0]).toBeLessThanOrEqual(1);
      expect(roundedBbox[1]).toBeLessThanOrEqual(2);
      expect(roundedBbox[2]).toBeGreaterThanOrEqual(3);
      expect(roundedBbox[3]).toBeGreaterThanOrEqual(4);
    });
  });

  describe('bboxFromTiles', () => {
    it('bbox match given tiles', () => {
      const tile: ITile = {
        x: 0,
        y: 0,
        zoom: 0,
      };
      const bbox = bboxFromTiles(tile, tile);
      expect(bbox).toEqual([-180, -90, 0, 90]);
    });
  });

  describe('bboxToTileRange', () => {
    it('coverts bbox to expected tile range (no rounding, single tile)', () => {
      const bbox = [0, 0, 45, 45] as BBox2d;

      const range = bboxToTileRange(bbox, 2);

      const expectedRange = {
        minX: 4,
        minY: 2,
        maxX: 5,
        maxY: 3,
        zoom: 2,
      };
      expect(range).toEqual(expectedRange);
    });

    it('coverts bbox to expected tile range (no rounding)', () => {
      const bbox = [0, 0, 90, 45] as BBox2d;

      const range = bboxToTileRange(bbox, 2);

      const expectedRange = {
        minX: 4,
        minY: 2,
        maxX: 6,
        maxY: 3,
        zoom: 2,
      };
      expect(range).toEqual(expectedRange);
    });

    it('coverts bbox to expected tile range (rounding down)', () => {
      const bbox = [0, 0, 45, 45] as BBox2d;

      const range = bboxToTileRange(bbox, 1);

      const expectedRange = {
        minX: 2,
        minY: 1,
        maxX: 3,
        maxY: 2,
        zoom: 1,
      };
      expect(range).toEqual(expectedRange);
    });

    it('coverts bbox to expected tile range  (rounding up)', () => {
      const bbox = [0, 0, 45, 45.1] as BBox2d;

      const range = bboxToTileRange(bbox, 3);

      const expectedRange = {
        minX: 8,
        minY: 4,
        maxX: 10,
        maxY: 7,
        zoom: 3,
      };
      expect(range).toEqual(expectedRange);
    });
  });
});
