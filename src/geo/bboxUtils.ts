import { BBox2d } from '@turf/helpers/dist/js/lib/geojson';
import { ITile, ITileRange } from '../models/interfaces/geo/iTile';
import { degreesToTile, tileToDegrees } from './geoConvertor';
import { degreesPerTile } from './tiles';

const snapMinCordToTileGrid = (cord: number, tileRes: number): number => {
  const newCord = Math.floor(cord / tileRes) * tileRes;
  return newCord;
};

/**
 * rounds bbox to grid
 * @param bbox original bbox
 * @param zoomLevel target tiles grid zoom level
 * @returns bbox that contains the original bbox and match tile grid lines
 */
export const snapBBoxToTileGrid = (bbox: BBox2d, zoomLevel: number): BBox2d => {
  const minLon = Math.min(bbox[0], bbox[2]);
  const minLat = Math.min(bbox[1], bbox[3]);
  const maxLon = Math.max(bbox[0], bbox[2]);
  const maxLat = Math.max(bbox[1], bbox[3]);

  const tileRes = degreesPerTile(zoomLevel);
  const snappedMinLon = snapMinCordToTileGrid(minLon, tileRes);
  let snappedMaxLon = snapMinCordToTileGrid(maxLon, tileRes);
  if (snappedMaxLon != maxLon) {
    snappedMaxLon += tileRes;
  }
  let sanppedMinLat: number;
  let snappedMaxLat: number;
  if (zoomLevel === 0) {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    sanppedMinLat = -90;
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    snappedMaxLat = 90;
  } else {
    sanppedMinLat = snapMinCordToTileGrid(minLat, tileRes);
    snappedMaxLat = snapMinCordToTileGrid(maxLat, tileRes);
    if (snappedMaxLat != maxLat) {
      snappedMaxLat += tileRes;
    }
  }
  const snappedBbox: BBox2d = [snappedMinLon, sanppedMinLat, snappedMaxLon, snappedMaxLat];
  return snappedBbox;
};

/**
 * create bbox from tile grid coordinates
 * @param minTile corner tile for bbox with minimal x,y values
 * @param maxTile corner tile for bbox with maximal x,y values
 * @returns
 */
export const bboxFromTiles = (minTile: ITile, maxTile: ITile): BBox2d => {
  if (minTile.zoom !== maxTile.zoom) {
    throw new Error(`Could not calcualte bbox from tiles due to not matching zoom levels`);
  }

  const minPoint = tileToDegrees(minTile);
  const maxPoint = tileToDegrees({
    x: maxTile.x + 1,
    y: maxTile.y + 1,
    zoom: maxTile.zoom,
  });

  return [minPoint.longitude, minPoint.latitude, maxPoint.longitude, maxPoint.latitude];
};

/**
 * coverts bbox to covering tile range of specified zoom level
 * @param bbox
 * @param zoom target zoom level
 * @returns covering tile range
 */
export const bboxToTileRange = async(bbox: BBox2d, zoom: number): Promise<ITileRange> => {
  const sanitizedBbox = snapBBoxToTileGrid(bbox, zoom);
  const minTile = degreesToTile(
    {
      longitude: sanitizedBbox[0],
      latitude: sanitizedBbox[1],
    },
    zoom
  );
  const maxTile = degreesToTile(
    {
      longitude: sanitizedBbox[2],
      latitude: sanitizedBbox[3],
    },
    zoom
  );
  return Promise.resolve({
    minX: minTile.x,
    minY: minTile.y,
    maxX: maxTile.x,
    maxY: maxTile.y,
    zoom,
  });
};
