import { bboxPolygon, FeatureCollection } from '@turf/turf';
import { multiIntersect, featureCollectionBooleanEqual } from '../../../src';
import { fc1, fc2, fcNoProperties } from '../data/testData';

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

  describe('roiBooleanEqual', () => {
    it('returns true to comparing two featureCollection with different feature order', () => {
      const isEqual = featureCollectionBooleanEqual(fc1, fc2);
      expect(isEqual).toBeTruthy();
    });

    it('returns false to comparing two featureCollection with not same features', () => {
      const fc3: FeatureCollection = { ...fc1, features: fc1.features.slice(1) };
      const isEqual = featureCollectionBooleanEqual(fc1, fc3);
      expect(isEqual).toBeFalsy();
    });

    it('returns false to comparing two featureCollection with not same properties', () => {
      const isEqual = featureCollectionBooleanEqual(fc1, fcNoProperties);
      expect(isEqual).toBeFalsy();
    });

    it('returns true to comparing two nullable', () => {
      const isEqual = featureCollectionBooleanEqual(
        {
          type: 'FeatureCollection',
          features: [],
        },
        {
          type: 'FeatureCollection',
          features: [],
        }
      );
      expect(isEqual).toBeTruthy();
    });
  });
});
