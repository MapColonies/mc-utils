import { ITileRange } from '../../../src';
import {
  batch2area,
  degreesPerPixel,
  degreesPerPixelToZoomLevel,
  degreesPerTile,
  featureCollectionToBboxToTilesCount,
  featureCollectionToTilesCount,
  featureToBboxToTilesCount,
  featureToTilesCount,
  flipYAxis,
  zoomLevelToResolutionDeg,
  zoomLevelToResolutionMeter,
} from '../../../src/geo/tiles';
import { fc4, fc5, fcComplexGeo, fcComplexGeoNoMinMax, fcFullWorld, feature1 } from '../data/testData';

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
      expect(zoomLevelResult === 0).toEqual(true);
    });

    it('Check for resolution equal to existing resolution, res = 0.02197265625, // 5, return 5', function () {
      const zoomLevelResult = degreesPerPixelToZoomLevel(0.02197265625);
      expect(zoomLevelResult).toEqual(5);
    });

    it('Check for resolution between resolutions returns the lower , 0.02197265625 (zoom 5) > res >  0.010986328125, (zoom 6), return 5', function () {
      const zoomLevelResult = degreesPerPixelToZoomLevel(0.01098632813);
      expect(zoomLevelResult).toEqual(5);
    });

    it('Check for resolution smaller than last existing resolution returns the last existing resolution, res < 1.67638063430786e-7, (zoom 22), return 22', function () {
      const zoomLevelResult = degreesPerPixelToZoomLevel(0.97638063430786e-7);
      expect(zoomLevelResult).toEqual(22);
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
      expect(resolutionDegResult === undefined).toEqual(true);
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
      expect(resolutionDegResult === undefined).toEqual(true);
    });
  });

  describe('batch2area', () => {
    it('Check calculation for area calculation', function () {
      const batch: ITileRange = {
        maxX: 180,
        minX: -180,
        maxY: 90,
        minY: -90,
        zoom: 0,
      };
      const areaResult = batch2area(batch);
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
      expect(resolutionDegResult === undefined).toEqual(true);
    });
  });

  describe('featureToTilesCount', () => {
    it('Check calculation for min zoom level 0 and max zoom level 10', function () {
      const tileCountResult = featureToTilesCount(feature1, 10, 0);
      const expectedResult = 14782;
      expect(tileCountResult).toEqual(expectedResult);
    });

    it('Check calculation for min zoom level 0 without providing param and max zoom level 10', function () {
      const tileCountResult = featureToTilesCount(feature1, 10);
      const expectedResult = 14782;
      expect(tileCountResult).toEqual(expectedResult);
    });

    it('Check calculation for min zoom level 5 param and max zoom level 10', function () {
      const tileCountResult = featureToTilesCount(feature1, 10, 5);
      const expectedResult = 14761;
      expect(tileCountResult).toEqual(expectedResult);
    });

    it('Check calculation for single zoom range', function () {
      const tileCountResult = featureToTilesCount(feature1, 10, 10);
      const expectedResult = 10838;
      expect(tileCountResult).toEqual(expectedResult);
    });
  });

  describe('featureCollectionToTilesCount', () => {
    it('Check calculation for minResolutionDeg 0.703125 (zoom 0) and maxResolutionDeg 0.02197265625(zoom 5)', function () {
      const tileCountResult = featureCollectionToTilesCount(fc4);
      const expectedResult = 31;
      expect(tileCountResult).toEqual(expectedResult);
    });

    it('Check calculation for features without included max or min resolution properties with provided min max zooms as params', function () {
      const tileCountResult = featureCollectionToTilesCount(fc5, 5, 0);
      const expectedResult = 31;
      expect(tileCountResult).toEqual(expectedResult);
    });

    it('Check calculation for features without included max or min resolution properties without min max zooms as params', function () {
      const tileCountResult = featureCollectionToTilesCount(fcFullWorld);
      const expectedResult = 11728124029610;
      expect(tileCountResult).toEqual(expectedResult);
    });

    it('Check calculation for features without included max or min resolution properties with max zooms  params only', function () {
      const tileCountResult = featureCollectionToTilesCount(fcFullWorld, undefined, 20);
      const expectedResult = 10995116277760;
      expect(tileCountResult).toEqual(expectedResult);
    });
  });

  describe('featureToBboxToTilesCount', () => {
    it('Check calculation for min zoom level 0 and max zoom level 10', function () {
      const tileCountResult = featureToBboxToTilesCount(feature1, 10, 0);
      const expectedResult = 42304;
      expect(tileCountResult).toEqual(expectedResult);
    });

    it('Check calculation for min zoom level 0 without providing param and max zoom level 10', function () {
      const tileCountResult = featureToBboxToTilesCount(feature1, 10);
      const expectedResult = 42304;
      expect(tileCountResult).toEqual(expectedResult);
    });

    it('Check calculation for min zoom level 5 param and max zoom level 10', function () {
      const tileCountResult = featureToBboxToTilesCount(feature1, 10, 5);
      const expectedResult = 42281;
      expect(tileCountResult).toEqual(expectedResult);
    });

    it('Check calculation for single zoom range', function () {
      const tileCountResult = featureToBboxToTilesCount(feature1, 10, 10);
      const expectedResult = 31584;
      expect(tileCountResult).toEqual(expectedResult);
    });
  });

  describe('featureCollectionToBboxToTilesCount', () => {
    it('Check calculation for minResolutionDeg 0.703125 (zoom 0) and maxResolutionDeg 0.02197265625(zoom 5)', function () {
      const tileCountResult = featureCollectionToBboxToTilesCount(fcComplexGeo);
      const expectedResult = 71;
      expect(tileCountResult).toEqual(expectedResult);
    });

    it('Check calculation for features without included max or min resolution properties with provided min max zooms as params', function () {
      const tileCountResult = featureCollectionToBboxToTilesCount(fcComplexGeoNoMinMax, 5, 0);
      const expectedResult = 71;
      expect(tileCountResult).toEqual(expectedResult);
    });

    it('Check calculation for features without included max or min resolution properties without min max zooms as params', function () {
      const tileCountResult = featureCollectionToBboxToTilesCount(fcComplexGeoNoMinMax);
      const expectedResult = 174629021729;
      expect(tileCountResult).toEqual(expectedResult);
    });

    it('Check calculation for features without included max or min resolution properties with max zooms  params only', function () {
      const tileCountResult = featureCollectionToBboxToTilesCount(fcComplexGeoNoMinMax, undefined, 20);
      const expectedResult = 163714440609;
      expect(tileCountResult).toEqual(expectedResult);
    });
  });
});
