/**
 * tile coordinates
 */
export interface ITile {
  x: number;
  y: number;
  zoom: number;
}

export interface ITileRange {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  zoom: number;
}
