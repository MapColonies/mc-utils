import { bboxPolygon } from '@turf/turf';
import { multiIntersect } from '../../../src';

describe('geoIntersections', () => {
  describe('multiIntersect', () => {
    it('returns null when no part is inersecting all the layers', () => {
      const footprints = [bboxPolygon([0, 0, 2, 2]), bboxPolygon([0, 1, 1, 2]), bboxPolygon([3, 3, 5, 5])];

      const intersection = multiIntersect(footprints);

      expect(intersection).toBeNull();
    });

    it('returns intersection when all the layers are intersecting', () => {
      const footprints = [bboxPolygon([0, 0, 2, 2]), bboxPolygon([0, 1, 2, 3]), bboxPolygon([1, 1, 5, 5])];

      const intersection = multiIntersect(footprints);

      const expected = bboxPolygon([1, 1, 2, 2]);
      expected.bbox = undefined;
      expect(intersection).toEqual(expected);
    });
  });
});
