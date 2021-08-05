import { ITile } from '../../../src';
import { bboxFromTiles, snapBBoxToTileGrid } from '../../../src/geo/bboxUtils';

describe('bboxUtils', () => {
  describe('snapBBoxToTileGrid', () => {
    it('rounds coordinates to tile grid', () => {
      const roundedBbox = snapBBoxToTileGrid([1, 2, 3, 4], 20);
      const gridStep = 180 / (1 << 20);
      for (const cord of roundedBbox) {
        expect(cord % gridStep).toBe(0);
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
});
