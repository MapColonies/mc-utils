import { degreesToTile, tileToDegrees } from '../../../src/geo/geoConvertor';
import { TileOrigin } from '../../../src/models/enums/geo/tileOrigin';
import { IPoint, ITile } from '../../../src/models/interfaces';

describe('geoConvertor', () => {
  describe('degreesToTile', () => {
    it('converts coordinates to ll tile at specified zoom', () => {
      const point: IPoint = {
        longitude: -180,
        latitude: -90,
      };

      const tile = degreesToTile(point, 20);

      const expectedTile: ITile = {
        x: 0,
        y: 0,
        zoom: 20,
      };
      expect(tile).toEqual(expectedTile);
    });

    it('converts coordinates to ul tile at specified zoom', () => {
      const point: IPoint = {
        longitude: -180,
        latitude: 90,
      };

      const tile = degreesToTile(point, 20, TileOrigin.UPPER_LEFT);

      const expectedTile: ITile = {
        x: 0,
        y: 0,
        zoom: 20,
      };
      expect(tile).toEqual(expectedTile);
    });
  });

  describe('tileToDegrees', () => {
    it('converts ll tile to coordinate(degrees)', () => {
      const tile: ITile = {
        x: 0,
        y: 0,
        zoom: 20,
      };

      const point = tileToDegrees(tile);

      const expectedPoint: IPoint = {
        longitude: -180,
        latitude: -90,
      };
      expect(point).toEqual(expectedPoint);
    });

    it('converts ul tile to coordinate(degrees)', () => {
      const tile: ITile = {
        x: 0,
        y: 0,
        zoom: 20,
      };

      const point = tileToDegrees(tile, TileOrigin.UPPER_LEFT);

      const expectedPoint: IPoint = {
        longitude: -180,
        latitude: 90,
      };
      expect(point).toEqual(expectedPoint);
    });
  });
});
