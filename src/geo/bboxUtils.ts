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
  bbox[0] = snapMinCordToTileGrid(minLon, tileRes);
  bbox[2] = snapMinCordToTileGrid(maxLon, tileRes);
  if (bbox[2] != maxLon) {
    bbox[2] += tileRes;
  }
  if (zoomLevel === 0) {
    bbox[1] = -90;
    bbox[3] = 90;
  } else {
    bbox[1] = snapMinCordToTileGrid(minLat, tileRes);
    bbox[3] = snapMinCordToTileGrid(maxLat, tileRes);
    if (bbox[3] != maxLat) {
      bbox[3] += tileRes;
    }
  }
  return bbox;
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
export const bboxToTileRange = (bbox: BBox2d, zoom: number): ITileRange => {
  bbox = snapBBoxToTileGrid(bbox, zoom);
  const minTile = degreesToTile(
    {
      longitude: bbox[0],
      latitude: bbox[1],
    },
    zoom
  );
  const maxTile = degreesToTile(
    {
      longitude: bbox[2],
      latitude: bbox[3],
    },
    zoom
  );
  return {
    minX: minTile.x,
    minY: minTile.y,
    maxX: maxTile.x,
    maxY: maxTile.y,
    zoom,
  };
};
