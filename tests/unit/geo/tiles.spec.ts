import type { Feature, MultiPolygon, Polygon } from 'geojson';
import { ITileRange } from '../../../src';
import {
  tileRangeToTilesCount,
  degreesPerPixel,
  degreesPerPixelToZoomLevel,
  degreesPerTile,
  featureCollectionToTilesCount,
  featureToTilesCount,
  flipYAxis,
  zoomLevelToResolutionDeg,
  zoomLevelToResolutionMeter,
} from '../../../src/geo/tiles';
import { fcComplexGeo, fcComplexGeoNoMinMax, feature1 } from '../data/testData';

describe('tiles', () => {
  describe('degreesPerTile', () => {
    it('return tile size in degrees for specific zoom level', () => {
      const size = degreesPerTile(21);

      const expectedSize = 0.0000858306884765625;
      expect(size).toEqual(expectedSize);
    });
  });

  describe('degreesPerPixel', () => {
    it('return pixel size in degrees for specific zoom level', () => {
      const size = degreesPerPixel(21);

      const expectedSize = 0.000000335276126861572265625;
      expect(size).toEqual(expectedSize);
    });
  });

  describe('flipYAxis', () => {
    it('flips y axis direction', () => {
      const tile = {
        x: 0,
        y: 0,
        zoom: 1,
      };

      const flipped = flipYAxis(tile);

      const expectedTile = {
        x: 0,
        y: 1,
        zoom: 1,
      };
      expect(flipped).toEqual(expectedTile);
    });
  });

  describe('degreesPerPixelToZoomLevel', () => {
    it('Check if calculation is able to return 0', function () {
      const zoomLevelResult = degreesPerPixelToZoomLevel(0.7);
      expect(zoomLevelResult === 0).toBe(true);
    });

    it('Check for resolution equal to existing resolution, res = 0.02197265625, // 5, return 5', function () {
      const zoomLevelResult = degreesPerPixelToZoomLevel(0.02197265625);
      expect(zoomLevelResult).toBe(5);
    });

    it('Check for resolution between resolutions returns the lower , 0.02197265625 (zoom 5) > res >  0.010986328125, (zoom 6), return 5', function () {
      const zoomLevelResult = degreesPerPixelToZoomLevel(0.01098632813);
      expect(zoomLevelResult).toBe(5);
    });

    it('Check for resolution smaller than last existing resolution returns the last existing resolution, res < 1.67638063430786e-7, (zoom 22), return 22', function () {
      const zoomLevelResult = degreesPerPixelToZoomLevel(0.97638063430786e-7);
      expect(zoomLevelResult).toBe(22);
    });
  });

  describe('zoomLevelToResolutionDeg', () => {
    it('Check calculation for min zoom level 0', function () {
      const resolutionDegResult = zoomLevelToResolutionDeg(0);
      const expectedResult = 0.703125;
      expect(resolutionDegResult).toEqual(expectedResult);
    });

    it('Check calculation for max zoom level 22', function () {
      const resolutionDegResult = zoomLevelToResolutionDeg(22);
      const expectedResult = 0.000000167638063430786;
      expect(resolutionDegResult).toEqual(expectedResult);
    });

    it('Check for return undefined value for out of range value', function () {
      const resolutionDegResult = zoomLevelToResolutionDeg(50);
      expect(resolutionDegResult === undefined).toBe(true);
    });
  });

  describe('zoomLevelToResolutionMeter', () => {
    it('Check calculation for min zoom level 0', function () {
      const resolutionDegResult = zoomLevelToResolutionMeter(0);
      const expectedResult = 78271.52;
      expect(resolutionDegResult).toEqual(expectedResult);
    });

    it('Check calculation for max zoom level 22', function () {
      const resolutionDegResult = zoomLevelToResolutionMeter(22);
      const expectedResult = 0.0185;
      expect(resolutionDegResult).toEqual(expectedResult);
    });

    it('Check for return undefined value for out of range value', function () {
      const resolutionDegResult = zoomLevelToResolutionMeter(50);
      expect(resolutionDegResult === undefined).toBe(true);
    });
  });

  describe('tileRangeToTilesCount', () => {
    it('Check calculation for area calculation - tiles count by tiles range', function () {
      const batch: ITileRange = {
        maxX: 180,
        minX: -180,
        maxY: 90,
        minY: -90,
        zoom: 0,
      };
      const areaResult = tileRangeToTilesCount(batch);
      const expectedResult = 64800;
      expect(areaResult).toEqual(expectedResult);
    });

    it('Check calculation for max zoom level 22', function () {
      const resolutionDegResult = zoomLevelToResolutionMeter(22);
      const expectedResult = 0.0185;
      expect(resolutionDegResult).toEqual(expectedResult);
    });

    it('Check for return undefined value for out of range value', function () {
      const resolutionDegResult = zoomLevelToResolutionMeter(50);
      expect(resolutionDegResult === undefined).toBe(true);
    });
  });

  describe('featureToBboxToTilesCount', () => {
    it('Check calculation for minResolutionDeg 0.703125 (zoom 0) and maxResolutionDeg 0.02197265625(zoom 5)', function () {
      const featureWithParams = fcComplexGeo.features[0] as unknown as Feature<Polygon | MultiPolygon>;
      const tileCountResult = featureToTilesCount(featureWithParams);
      const expectedResult = 71;
      expect(tileCountResult).toEqual(expectedResult);
    });

    it('Check calculation for minResolutionDeg 0.703125 (zoom 0) without maxResolutionDeg use default (zoom 15)', function () {
      const featureWithoutParams = fcComplexGeoNoMinMax.features[0] as unknown as Feature<Polygon | MultiPolygon>;
      const testProperties = { ...featureWithoutParams.properties, minResolutionDeg: 0.703125 };
      const tileCountResult = featureToTilesCount({ ...featureWithoutParams, properties: testProperties }, 15);
      const expectedResult = 42659522;
      expect(tileCountResult).toEqual(expectedResult);
    });

    it('Check calculation for min zoom level 0 and max zoom level 10', function () {
      const tileCountResult = featureToTilesCount(feature1, 10, 0);
      const expectedResult = 42304;
      expect(tileCountResult).toEqual(expectedResult);
    });

    it('Check calculation for min zoom level 0 without providing param and max zoom level 10', function () {
      const tileCountResult = featureToTilesCount(feature1, 10);
      const expectedResult = 42304;
      expect(tileCountResult).toEqual(expectedResult);
    });

    it('Check calculation for min zoom level 5 param and max zoom level 10', function () {
      const tileCountResult = featureToTilesCount(feature1, 10, 5);
      const expectedResult = 42281;
      expect(tileCountResult).toEqual(expectedResult);
    });

    it('Check calculation for single zoom range', function () {
      const tileCountResult = featureToTilesCount(feature1, 10, 10);
      const expectedResult = 31584;
      expect(tileCountResult).toEqual(expectedResult);
    });

    it('Check calculation for default values 0-22 zoom range', function () {
      const tileCountResult = featureToTilesCount(feature1);
      const expectedResult = 698511953859;
      expect(tileCountResult).toEqual(expectedResult);
    });

    it('Check calculation for default illegal values default min zoom is negative', function () {
      const action = () => {
        featureToTilesCount(feature1, 22, -1);
      };
      expect(action).toThrow(RangeError);
      expect(action).toThrow('Un supported zoom levels values, min-max zoom should be [0-22] but actual [-1:22]');
    });

    it('Check calculation for default illegal values default max zoom is over 22', function () {
      const action = () => {
        featureToTilesCount(feature1, 23, 1);
      };
      expect(action).toThrow(RangeError);
      expect(action).toThrow('Un supported zoom levels values, min-max zoom should be [0-22] but actual [1:23]');
    });

    it('Check calculation for default illegal values min zoom larger than max zoom', function () {
      const action = () => {
        featureToTilesCount(feature1, 10, 20);
      };
      expect(action).toThrow(RangeError);
      expect(action).toThrow('Illegal - defaultMinZoom[20] is larger than defaultMaxZoom[10]');
    });
  });

  describe('featureCollectionToTilesCount', () => {
    it('Check calculation for minResolutionDeg 0.703125 (zoom 0) and maxResolutionDeg 0.02197265625(zoom 5)', function () {
      const tileCountResult = featureCollectionToTilesCount(fcComplexGeo);
      const expectedResult = 71;
      expect(tileCountResult).toEqual(expectedResult);
    });

    it('Check calculation for features without included max or min resolution properties with provided min max zooms as params', function () {
      const tileCountResult = featureCollectionToTilesCount(fcComplexGeoNoMinMax, 5, 0);
      const expectedResult = 71;
      expect(tileCountResult).toEqual(expectedResult);
    });

    it('Check calculation for features without included max or min resolution properties without min max zooms as params', function () {
      const tileCountResult = featureCollectionToTilesCount(fcComplexGeoNoMinMax);
      const expectedResult = 698511953859;
      expect(tileCountResult).toEqual(expectedResult);
    });

    it('Check calculation for features without included max or min resolution properties with max zooms  params only', function () {
      const tileCountResult = featureCollectionToTilesCount(fcComplexGeoNoMinMax, undefined, 20);
      const expectedResult = 687597372739;
      expect(tileCountResult).toEqual(expectedResult);
    });
  });
});
