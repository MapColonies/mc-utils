import { ITileRange } from '../../../src/models/interfaces/geo/iTile';
import { tileBatchGenerator } from '../../../src/geo/tileBatcher';

describe('GeoHashBatcher', () => {
  describe('#getResource', () => {
    it('return expected batches for complex data', function () {
      const ranges = [
        { minX: 0, minY: 2, maxX: 5, maxY: 4, zoom: 8 },
        { minX: 0, minY: 6, maxX: 2, maxY: 8, zoom: 8 },
        { minX: 0, minY: 8, maxX: 1, maxY: 11, zoom: 8 },
      ];

      // action
      const generator = tileBatchGenerator(3, ranges);
      const batches: ITileRange[][] = [];
      for (const range of generator) {
        batches.push(range);
      }

      // expectation
      const expectedBatches = [
        [{ minX: 0, maxX: 3, minY: 2, maxY: 3, zoom: 8 }],
        [
          { minX: 3, maxX: 5, minY: 2, maxY: 3, zoom: 8 },
          { minX: 0, maxX: 1, minY: 3, maxY: 4, zoom: 8 },
        ],
        [{ minX: 1, maxX: 4, minY: 3, maxY: 4, zoom: 8 }],
        [
          { minX: 4, maxX: 5, minY: 3, maxY: 4, zoom: 8 },
          { minX: 0, maxX: 2, minY: 6, maxY: 7, zoom: 8 },
        ],
        [
          { minX: 0, maxX: 2, minY: 7, maxY: 8, zoom: 8 },
          { minX: 0, maxX: 1, minY: 8, maxY: 9, zoom: 8 },
        ],
        [{ minX: 0, maxX: 1, minY: 9, maxY: 11, zoom: 8 }],
      ];
      expect(batches).toEqual(expectedBatches);
    });

    it('return expected batch for single tile', function () {
      const ranges = [{ minX: 0, minY: 2, maxX: 1, maxY: 3, zoom: 8 }];

      // action
      const generator = tileBatchGenerator(3, ranges);
      const batches: ITileRange[][] = [];
      for (const range of generator) {
        batches.push(range);
      }

      // expectation
      const expectedBatches = [[{ minX: 0, maxX: 1, minY: 2, maxY: 3, zoom: 8 }]];
      expect(batches).toEqual(expectedBatches);
    });

    it('return empty batch on invalid empty x', function () {
      const ranges = [{ minX: 0, minY: 2, maxX: 0, maxY: 3, zoom: 8 }];

      // action
      const generator = tileBatchGenerator(3, ranges);
      const batches: ITileRange[][] = [];
      for (const range of generator) {
        batches.push(range);
      }

      // expectation
      const expectedBatches: ITileRange[][] = [];
      expect(batches).toEqual(expectedBatches);
    });

    it('return empty batch on invalid empty y', function () {
      const ranges = [{ minX: 0, minY: 2, maxX: 4, maxY: 2, zoom: 8 }];

      // action
      const generator = tileBatchGenerator(3, ranges);
      const batches: ITileRange[][] = [];
      for (const range of generator) {
        batches.push(range);
      }

      // expectation
      const expectedBatches: ITileRange[][] = [];
      expect(batches).toEqual(expectedBatches);
    });
  });
});
