import { ITileRange } from '../../../src/models/interfaces/geo/iTile';
import { SingleTileMerger } from '../../../src/geo/singleTileMerger';

type Tile = [zoom: number, x: number, y: number];

// adds the tiles to a merger that never flushes early, then drains it
const merge = (tiles: Tile[]): ITileRange[] => {
  const merger = new SingleTileMerger(Number.MAX_SAFE_INTEGER);
  for (const [zoom, x, y] of tiles) {
    merger.add(zoom, x, y);
  }
  return [...merger.drain()];
};

const range = (zoom: number, minX: number, maxX: number, minY: number, maxY: number): ITileRange => ({ zoom, minX, maxX, minY, maxY });

describe('SingleTileMerger', () => {
  describe('merging', () => {
    it('should yield nothing when no tile was added', () => {
      expect(merge([])).toEqual([]);
    });

    it('should yield a lone tile as a 1x1 range', () => {
      expect(merge([[5, 10, 7]])).toEqual([range(5, 10, 10, 7, 7)]);
    });

    it('should join neighbours in a row into one run', () => {
      const ranges = merge([
        [5, 10, 7],
        [5, 11, 7],
        [5, 12, 7],
      ]);

      expect(ranges).toEqual([range(5, 10, 12, 7, 7)]);
    });

    it('should stack the same single column on consecutive rows into one block', () => {
      const ranges = merge([
        [5, 10, 7],
        [5, 10, 8],
      ]);

      expect(ranges).toEqual([range(5, 10, 10, 7, 8)]);
    });

    it('should merge a full square of tiles into one block', () => {
      const ranges = merge([
        [5, 10, 7],
        [5, 11, 7],
        [5, 10, 8],
        [5, 11, 8],
      ]);

      expect(ranges).toEqual([range(5, 10, 11, 7, 8)]);
    });

    it('should split a row with a gap into separate runs', () => {
      const ranges = merge([
        [5, 10, 7],
        [5, 11, 7],
        [5, 13, 7],
      ]);

      expect(ranges).toEqual([range(5, 10, 11, 7, 7), range(5, 13, 13, 7, 7)]);
    });

    it('should not stack runs that span different columns', () => {
      const ranges = merge([
        [5, 10, 7],
        [5, 11, 7],
        [5, 10, 8],
        [5, 11, 8],
        [5, 12, 8],
      ]);

      expect(ranges).toEqual([range(5, 10, 11, 7, 7), range(5, 10, 12, 8, 8)]);
    });

    it('should not stack runs on rows that are not consecutive', () => {
      const ranges = merge([
        [5, 10, 7],
        [5, 10, 9],
      ]);

      expect(ranges).toEqual([range(5, 10, 10, 7, 7), range(5, 10, 10, 9, 9)]);
    });

    it('should not join the last column of a row with the first column of the next row', () => {
      // zoom 1 is 4 columns wide, so (3, 0) and (0, 1) have consecutive keys 3 and 4
      const ranges = merge([
        [1, 3, 0],
        [1, 0, 1],
      ]);

      expect(ranges).toEqual([range(1, 3, 3, 0, 0), range(1, 0, 0, 1, 1)]);
    });

    it('should keep zoom levels apart and yield them in ascending zoom order', () => {
      const ranges = merge([
        [6, 20, 14],
        [5, 10, 7],
        [6, 21, 14],
        [5, 11, 7],
      ]);

      expect(ranges).toEqual([range(5, 10, 11, 7, 7), range(6, 20, 21, 14, 14)]);
    });

    it('should not depend on the order the tiles are added in', () => {
      const tiles: Tile[] = [
        [8, 100, 50],
        [8, 101, 50],
        [8, 100, 51],
        [8, 101, 51],
        [8, 103, 51],
        [8, 100, 52],
      ];

      expect(merge([...tiles].reverse())).toEqual(merge(tiles));
    });

    it('should handle keys at the far corner of the deepest supported zoom exactly', () => {
      // zoom 22 is 2^23 columns by 2^22 rows: the last keys are near 2^45, still exact in a double
      const maxX = 2 * Math.pow(2, 22) - 1;
      const maxY = Math.pow(2, 22) - 1;

      const ranges = merge([
        [22, maxX - 1, maxY],
        [22, maxX, maxY],
      ]);

      expect(ranges).toEqual([range(22, maxX - 1, maxX, maxY, maxY)]);
    });
  });

  describe('held tiles limit', () => {
    it('should hold tiles until a zoom reaches the limit, then return that zoom merged', () => {
      const merger = new SingleTileMerger(3);

      expect(merger.add(5, 10, 7)).toBeUndefined();
      expect(merger.add(5, 11, 7)).toBeUndefined();
      expect(merger.add(5, 12, 7)).toEqual([range(5, 10, 12, 7, 7)]);
    });

    it('should count the limit per zoom', () => {
      const merger = new SingleTileMerger(2);

      expect(merger.add(5, 10, 7)).toBeUndefined();
      expect(merger.add(6, 20, 14)).toBeUndefined();
      expect(merger.add(5, 11, 7)).toEqual([range(5, 10, 11, 7, 7)]);
    });

    it('should start a flushed zoom over, so draining yields only the tiles added after the flush', () => {
      const merger = new SingleTileMerger(2);
      merger.add(5, 10, 7);
      merger.add(5, 11, 7); // flushes 10..11

      merger.add(5, 12, 7);

      expect([...merger.drain()]).toEqual([range(5, 12, 12, 7, 7)]);
    });

    it('should yield nothing on a second drain', () => {
      const merger = new SingleTileMerger(10);
      merger.add(5, 10, 7);
      const first = [...merger.drain()];

      expect(first).toEqual([range(5, 10, 10, 7, 7)]);
      expect([...merger.drain()]).toEqual([]);
    });

    it.each([0, -1, 1.5, Number.NaN])('should throw RangeError when the limit is %p', (maxHeldSingleTiles) => {
      expect(() => new SingleTileMerger(maxHeldSingleTiles)).toThrow(RangeError);
    });
  });
});
