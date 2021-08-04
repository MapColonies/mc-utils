import { ITile } from '../models/interfaces/geo/iTile';

export function degreesPerTile(zoomLevel: number): number {
  const latRange = 180;
  return latRange / (1 << zoomLevel);
}

export function degreesPerPixel(zoomLevel: number): number {
  const tileSize = 256;
  const tileRes = degreesPerTile(zoomLevel);
  return tileRes / tileSize;
}

export function flipYAxis(tile: ITile): ITile {
  const yTiles = 1 << tile.zoom;
  return {
    x: tile.x,
    y: yTiles - tile.y - 1,
    zoom: tile.zoom,
  };
}

export function degreesPerPixelToZoomLevel(resolution: number): number {
  const MIN_ZOOM_LEVEL = 0;
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  const zoomLevel = Math.ceil(Math.log2(180 / (resolution * 256)));
  if (zoomLevel < MIN_ZOOM_LEVEL) {
    throw new Error(`Invalid zoom level ${zoomLevel} for resolution ${resolution}`);
  }
  return zoomLevel;
}
