import { degreesPerPixel, degreesPerPixelToZoomLevel, degreesPerTile, flipYAxis } from '../../../src/geo/tiles';

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
    it('Check for resolution bigger than minimum , res >  0.703125, return 0', function () {
      const zoomLevelResult = degreesPerPixelToZoomLevel(1);
      expect(zoomLevelResult === 0).toEqual(true);
    });

    it('Check for resolution equal to existing resolution, res = 0.02197265625, // 5, return 5', function () {
      const zoomLevelResult = degreesPerPixelToZoomLevel(0.02197265625);
      expect(zoomLevelResult).toEqual(5);
    });

    it('Check for resolution between resolutions returns bigger, 0.02197265625 (zoom 5) > res >  0.010986328125, (zoom 6), return 6', function () {
      const zoomLevelResult = degreesPerPixelToZoomLevel(0.01098632813);
      expect(zoomLevelResult).toEqual(6);
    });

    it('Check for resolution smaller than last existing resolution, res < 1.67638063430786e-7, (zoom 22), return 23', function () {
      const zoomLevelResult = degreesPerPixelToZoomLevel(0.97638063430786e-7);
      expect(zoomLevelResult).toEqual(23);
    });
  });
});
