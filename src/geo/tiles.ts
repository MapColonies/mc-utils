import { BBox2d } from '@turf/helpers/dist/js/lib/geojson';
import { ITile } from '../models/interfaces/geo/iTile';
import { tileToDegrees } from './geoConvertor';

/**
 * calculates tile size (resolution) in degrees
 * @param zoomLevel zoom level of returned tile size
 * @returns tile size (resolution) in degrees
 */
export function degreesPerTile(zoomLevel: number): number {
  const latRange = 180;
  return latRange / (1 << zoomLevel);
}

/**
 * returns pixel size (resolution) in degrees
 * @param zoomLevel tile zoom level of returned tile pixel size
 * @returns pixel size (resolution) in degrees
 */
export function degreesPerPixel(zoomLevel: number): number {
  const tileSize = 256;
  const tileRes = degreesPerTile(zoomLevel);
  return tileRes / tileSize;
}

/**
 * coverts tile coordinates between ll and ul
 * @param tile source tile
 * @returns converted tile
 */
export function flipYAxis(tile: ITile): ITile {
  const yTiles = 1 << tile.zoom;
  return {
    x: tile.x,
    y: yTiles - tile.y - 1,
    zoom: tile.zoom,
  };
}

/**
 * converts pixel size (resolution) in degrees to matching zoom level (rounded down)
 * @param resolution pixel size (resolution) in degrees
 * @returns zoom level for given pixel size
 */
export function degreesPerPixelToZoomLevel(resolution: number): number {
  const MIN_ZOOM_LEVEL = 0;
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  const zoomLevel = Math.floor(Math.log2(180 / (resolution * 256)));
  if (zoomLevel < MIN_ZOOM_LEVEL) {
    throw new Error(`Invalid zoom level ${zoomLevel} for resolution ${resolution}`);
  }
  return zoomLevel;
}

/**
 * returns bbox of given tile
 * @param tile
 * @returns
 */
export function tileToBbox(tile: ITile): BBox2d {
  const minPoint = tileToDegrees(tile);
  const tileSize = degreesPerTile(tile.zoom);
  return [minPoint.longitude, minPoint.latitude, minPoint.longitude + tileSize, minPoint.latitude + tileSize];
}
