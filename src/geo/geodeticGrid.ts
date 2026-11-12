// the WGS84 geodetic tile grid: two root tiles (2x1) at zoom 0 with the origin at the south-west
// corner (-180, -90), x growing east and y growing north; each zoom level doubles both axes.
// Internal to the geo module, not exported from the package
export const GRID_MIN_LON = -180;
export const GRID_MIN_LAT = -90;
export const ROOT_COLUMNS = 2;
export const SUBTILES_PER_AXIS = 2;

// the grid's width in tiles at a zoom level
export const columnsAt = (zoom: number): number => ROOT_COLUMNS * Math.pow(SUBTILES_PER_AXIS, zoom);
