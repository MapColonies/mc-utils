import { area, bbox as polygonToBbox, bboxPolygon, intersect } from '@turf/turf';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import * as ngeohash from 'ngeohash';
import { BBox2d } from '../models/types';
import { ITile } from '../models/interfaces/geo/iTile';
import { TileOrigin } from '../models/enums/geo/tileOrigin';
import { degreesToTile } from './geoConvertor';
import { snapBBoxToTileGrid } from './bboxUtils';

const MAX_STANDARD_ZOOM = 21;

const bboxIntersection = (bbox1: BBox2d, bbox2: BBox2d): BBox2d => {
  const minLon = Math.max(bbox1[0], bbox2[0]);
  const minLat = Math.max(bbox1[1], bbox2[1]);
  const maxLon = Math.min(bbox1[2], bbox2[2]);
  const maxLat = Math.min(bbox1[3], bbox2[3]);
  return [minLon, minLat, maxLon, maxLat];
};

const isSubHash = (hash: string, parent: string): boolean => {
  return hash.startsWith(parent);
};

function* geoHash(
  precision: number,
  maxPrecision: number,
  polygon: Polygon | Feature<Polygon | MultiPolygon>,
  bbox: BBox2d,
  parentHash = ''
): Generator<string> {
  // ngeohash bbox is a lat-lon array. we change turf bbox to it so it can be used.
  const hashes = ngeohash.bboxes(bbox[1], bbox[0], bbox[3], bbox[2], precision);
  if (hashes.length > 0) {
    for (const hash of hashes) {
      const hashBbox = decodeGeoHash(hash);
      const hashPoly = bboxPolygon(hashBbox);
      const intersection = intersect(polygon, hashPoly);
      if (intersection === null || !isSubHash(hash, parentHash)) {
        continue;
      }
      const intArea = area(intersection);
      const hashArea = area(hashPoly);
      if (intArea == hashArea || precision == maxPrecision) {
        yield hash;
      } else {
        const subBbox = bboxIntersection(hashBbox, bbox);
        yield* geoHash(precision + 1, maxPrecision, polygon, subBbox, hash);
      }
    }
  }
}

/**
 * converts geohash string to its bbox in wgs84 degrees
 * @param geohash geohash string
 * @returns bbox of the supplied geohash
 */
export const decodeGeoHash = (geohash: string): BBox2d => {
  const bboxFromGeohash = ngeohash.decode_bbox(geohash);
  // ngeohash.decode_bbox gives a lat-lon array. we change it to lon-lat so @turf can use it.
  const lonLatBbox: BBox2d = [bboxFromGeohash[1], bboxFromGeohash[0], bboxFromGeohash[3], bboxFromGeohash[2]];
  return lonLatBbox;
};

/**
 * generates optimized geohash iterator for given polygon and target zoom level
 * @param polygon polygon to cover with geohashes
 * @param maxTileZoom target zoom level
 * @returns generator that yields the matching geohashes
 */
export const createGeoHashGenerator = (polygon: Polygon | Feature<Polygon | MultiPolygon>, maxTileZoom = MAX_STANDARD_ZOOM): Generator<string> => {
  let bbox = polygonToBbox(polygon) as BBox2d;
  bbox = snapBBoxToTileGrid(bbox, maxTileZoom);
  //at this precision ea geo hash is a tile or smaller
  /* eslint-disable @typescript-eslint/no-magic-numbers */
  let zoomPrecision = Math.floor((2 / 5) * (maxTileZoom + 1));
  const precisionMod = maxTileZoom % 5;
  if (precisionMod > 0 && precisionMod <= 3) {
    zoomPrecision++;
  } else if (precisionMod > 3) {
    zoomPrecision += 2;
  }
  /* eslint-enable @typescript-eslint/no-magic-numbers */
  return geoHash(1, zoomPrecision, polygon, bbox);
};

/**
 * generate all tiles in supplied polygon
 * @param polygon polygon to cover with tiles
 * @param tileZoom target tiles zoom level
 * @param origin target tiles grid origin location (default ll)
 */
export async function* tileGenerator(
  polygon: Polygon | Feature<Polygon | MultiPolygon>,
  tileZoom: number,
  origin: TileOrigin = TileOrigin.LOWER_LEFT
): AsyncGenerator<ITile> {
  const hashGen = createGeoHashGenerator(polygon, tileZoom);
  for (const hash of hashGen) {
    const bbox = decodeGeoHash(hash);
    const minTile = degreesToTile(
      {
        longitude: bbox[0],
        latitude: bbox[1],
      },
      tileZoom,
      origin
    );
    const maxTile = degreesToTile(
      {
        longitude: bbox[2],
        latitude: bbox[3],
      },
      tileZoom,
      origin
    );
    const minX = Math.min(minTile.x, maxTile.x);
    const maxX = minTile.x + maxTile.x - minX;

    const minY = Math.min(minTile.y, maxTile.y);
    const maxY = minTile.y + maxTile.y - minY;
    for (let x = minX; x < maxX; x++) {
      for (let y = minY; y < maxY; y++) {
        yield await Promise.resolve({
          x,
          y,
          zoom: tileZoom,
        });
      }
    }
  }
}
