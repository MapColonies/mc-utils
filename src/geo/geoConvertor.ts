import { TileOrigin } from '../models/enums/geo/tileOrigin';
import { IPoint } from '../models/interfaces/geo/iPoint';
import { ITile } from '../models/interfaces/geo/iTile';
import { degreesPerTile } from './tiles';

/**
 * converts point on WGS84 projection (with degree coordinates) to tile coordinates
 * @param point coordinates to convert to matching tile
 * @param zoomLevel matching tile zoom level
 * @param origin tile grid origin location (default ll)
 * @returns tile that contains the given point.
 */
export const degreesToTile = (point: IPoint, zoomLevel: number, origin: TileOrigin = TileOrigin.LOWER_LEFT): ITile => {
  const resolution = degreesPerTile(zoomLevel);
  let lat = point.latitude;
  if (origin === TileOrigin.UPPER_LEFT) {
    lat = -lat;
  }

  const xTile = point.longitude / resolution + (1 << zoomLevel);
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  const yTile = zoomLevel != 0 ? lat / resolution + (1 << (zoomLevel - 1)) : lat / resolution + 0.5;

  return {
    x: Math.floor(xTile),
    y: Math.floor(yTile),
    zoom: zoomLevel,
  };
};

/**
 * return the coordinates of the minimal corner of the given tile
 * @param tile tile to convert
 * @param origin tile grid origin location (default ll)
 * @returns point with the coordinates of the tile corner
 */
export const tileToDegrees = (tile: ITile, origin: TileOrigin = TileOrigin.LOWER_LEFT): IPoint => {
  const maxLon = 180;
  const maxLat = 90;
  const degPerTile = degreesPerTile(tile.zoom);
  const lon = tile.x * degPerTile - maxLon;
  let lat = tile.y * degPerTile - maxLat;

  if (origin === TileOrigin.UPPER_LEFT) {
    lat = -lat;
  }

  return {
    latitude: lat,
    longitude: lon,
  };
};
