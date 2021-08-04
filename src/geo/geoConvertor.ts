import { TileOrigin } from '../models/enums/geo/tileOrigin';
import { IPoint } from '../models/interfaces/geo/iPoint';
import { ITile } from '../models/interfaces/geo/iTile';
import { degreesPerTile } from './tiles';

export const degreesToTile = (point: IPoint, zoomLevel: number, origin: TileOrigin = TileOrigin.LOWER_LEFT): ITile => {
  const resolution = degreesPerTile(zoomLevel);
  let lat = point.latitude;
  if (origin === TileOrigin.UPPER_LEFT) {
    lat = -lat;
  }

  const xTile = point.longitude / resolution + (1 << zoomLevel);
  const yTile = lat / resolution + (1 << (zoomLevel - 1));

  return {
    x: Math.floor(xTile),
    y: Math.floor(yTile),
    zoom: zoomLevel,
  };
};

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
