import { BBox2d } from '@turf/helpers/dist/js/lib/geojson';
import { area, bbox as polygonToBbox, bboxPolygon, booleanEqual, Feature, intersect, MultiPolygon, Polygon } from '@turf/turf';
import { ITile, ITileRange } from '../models/interfaces/geo/iTile';
import { bboxToTileRange } from './bboxUtils';
import { tileToBbox } from './tiles';

type HashDigits = '0' | '1' | '2' | '3';
type TileIntersectionFunction<T> = (tile: ITile, intersectionTarget: T) => TileIntersectionState;

enum TileIntersectionState {
  FULL = 'full',
  PARTIAL = 'partial',
  NONE = 'none',
}

interface IHashedTile extends ITile {
  hash: string;
}

interface IFootprintIntersectionParams {
  footprint: Polygon | Feature<Polygon | MultiPolygon>;
  maxZoom: number;
}

/**
 * class for generating and decoding tile hashes
 */
export class TileHasher {
  /*
      tile hash structure:
      zoom 0:
      ---------
      | 0 | 1 |  
      ---------
      zoom 1: 
      ---------------------
      | 02 | 03 | 12 | 13 |
      ---------------------
      | 00 | 01 | 10 | 11 |
      ---------------------
      ....
  */

  private readonly hashDigits = {
    '0': 0,
    '1': 1,
    '2': 2,
    '3': 3,
  };

  /**
   * encodes tile to its hash
   * @param tile
   * @returns
   */
  public encodeTile(tile: ITile): string {
    let x = tile.x;
    let y = tile.y;
    let hash = '';
    for (let z = tile.zoom; z >= 0; z--) {
      const xDigit = x & 1;
      const yDigit = (y & 1) << 1;
      const digit = xDigit + yDigit;
      hash = `${digit}${hash}`;
      x = x >> 1;
      y = y >> 1;
    }
    return hash;
  }

  /**
   * decodes tile hash to tile
   * @param hash
   * @returns
   */
  public decodeTile(hash: string): ITile {
    let x = 0;
    let y = 0;

    for (const char of hash) {
      const digit = this.hashDigits[char as HashDigits];
      x = (x << 1) + (digit & 1);
      y = (y << 1) + (digit >> 1);
    }

    return {
      x,
      y,
      zoom: hash.length - 1,
    };
  }

  /**
   * decodes hash to tile range of specified zoom level
   * @param hash
   * @param zoom target tile range zoom
   * @returns
   */
  public decodeTileRange(hash: string, zoom: number): ITileRange {
    const baseTile = this.decodeTile(hash);
    let minX: number, minY: number, maxX: number, maxY: number;
    minX = baseTile.x;
    maxX = baseTile.x + 1;
    minY = baseTile.y;
    maxY = baseTile.y + 1;
    if (baseTile.zoom < zoom) {
      const dz = zoom - baseTile.zoom;
      minX = minX << dz;
      maxX = maxX << dz;
      minY = minY << dz;
      maxY = maxY << dz;
    } else if (baseTile.zoom > zoom) {
      const dz = baseTile.zoom - zoom;
      minX = minX >> dz;
      minY = minY >> dz;
      maxX = minX + 1;
      maxY = minY + 1;
    }
    return {
      minX,
      minY,
      maxX,
      maxY,
      zoom,
    };
  }

  /**
   * returns hash bbox
   * @param hash
   * @returns
   */
  public decodeBbox(hash: string): BBox2d {
    const tile = this.decodeTile(hash);
    return tileToBbox(tile);
  }

  /**
   * generate tile hashes
   * @param bbox bbox to cover with generated tile hashes
   * @param zoom max hash zoom
   * @returns
   */
  public encodeBBox(bbox: BBox2d, zoom: number): Generator<string> {
    const boundingRange = bboxToTileRange(bbox, zoom);
    return this.generateHashes(bbox, zoom, boundingRange, this.tileRangeIntersection);
  }

  /**
   * generate tile hashes
   * @param footprint footprint to cover with generated tile hashes
   * @param zoom max hash zoom
   * @returns
   */
  public encodeFootprint(footprint: Polygon | Feature<Polygon | MultiPolygon>, zoom: number): Generator<string> {
    const bbox = polygonToBbox(footprint) as BBox2d;
    if (this.isBbox(footprint)) {
      return this.encodeBBox(bbox, zoom);
    } else {
      const intersectionParams: IFootprintIntersectionParams = {
        footprint,
        maxZoom: zoom,
      };
      return this.generateHashes(bbox, zoom, intersectionParams, this.tileFootprintIntersection);
    }
  }

  /**
   * generate tile
   * @param bbox bbox to cover with generated tiles
   * @param zoom target tiles zoom level
   */
  public generateTiles(bbox: BBox2d, zoom: number): Generator<ITile>;
  /**
   * generate tile
   * @param footprint footprint to cover with generated tiles
   * @param zoom target tiles zoom level
   */
  public generateTiles(footprint: Polygon | Feature<Polygon | MultiPolygon>, zoom: number): Generator<ITile>;
  public generateTiles(area: BBox2d | Polygon | Feature<Polygon | MultiPolygon>, zoom: number): Generator<ITile> {
    let gen: Generator<string>;
    if (Array.isArray(area)) {
      gen = this.encodeBBox(area, zoom);
    } else {
      gen = this.encodeFootprint(area, zoom);
    }
    return this.tilesGenerator(gen, zoom);
  }

  private *tilesGenerator(hashGen: Generator<string>, targetZoom: number): Generator<ITile> {
    for (const hash of hashGen) {
      const range = this.decodeTileRange(hash, targetZoom);
      for (let x = range.minX; x < range.maxX; x++) {
        for (let y = range.minY; y < range.maxY; y++) {
          yield {
            x,
            y,
            zoom: targetZoom,
          };
        }
      }
    }
  }

  private *generateHashes<T>(
    bbox: BBox2d,
    zoom: number,
    intersectionTarget: T,
    intersectionFunction: TileIntersectionFunction<T>
  ): Generator<string> {
    const boundingRange = bboxToTileRange(bbox, zoom);
    //find minimal zoom where the the area can be converted by area the size of single tile to skip levels that cant have full hashes
    const dx = boundingRange.maxX - boundingRange.minX;
    const dy = boundingRange.maxY - boundingRange.minY;
    const minXZoom = Math.max(Math.floor(Math.log2(1 << (zoom + 1)) / dx) - 1, 0);
    const minYZoom = Math.max(Math.floor(Math.log2(1 << zoom) / dy), 0);
    const minZoom = Math.min(minXZoom, minYZoom);

    //find base hashes
    const minimalRange = bboxToTileRange(bbox, minZoom);
    for (let x = minimalRange.minX; x < minimalRange.maxX; x++) {
      for (let y = minimalRange.minY; y < minimalRange.maxY; y++) {
        const tile = { x, y, zoom: minimalRange.zoom };
        const intersection = intersectionFunction(tile, intersectionTarget);
        if (intersection === TileIntersectionState.FULL) {
          yield this.encodeTile(tile);
        } else if (intersection === TileIntersectionState.PARTIAL) {
          //optimize partial base hashes
          yield* this.optimizeHash({ ...tile, hash: this.encodeTile(tile) }, intersectionTarget, intersectionFunction);
        }
      }
    }
  }

  private *optimizeHash<T>(tile: IHashedTile, intersectionTarget: T, intersectionFunction: TileIntersectionFunction<T>): Generator<string> {
    const tiles = this.generateSubTiles(tile);
    for (const subTile of tiles) {
      const intersection = intersectionFunction(subTile, intersectionTarget);
      if (intersection === TileIntersectionState.FULL) {
        yield subTile.hash;
      } else if (intersection === TileIntersectionState.PARTIAL) {
        yield* this.optimizeHash(subTile, intersectionTarget, intersectionFunction);
      }
    }
  }

  private generateSubTiles(tile: IHashedTile): IHashedTile[] {
    const tile0 = { x: tile.x << 1, y: tile.y << 1, zoom: tile.zoom + 1, hash: tile.hash + '0' };
    const tile1 = { x: tile0.x + 1, y: tile0.y, zoom: tile0.zoom, hash: tile.hash + '1' };
    const tile2 = { x: tile0.x, y: tile0.y + 1, zoom: tile0.zoom, hash: tile.hash + '2' };
    const tile3 = { x: tile0.x + 1, y: tile0.y + 1, zoom: tile0.zoom, hash: tile.hash + '3' };
    const tiles = [tile0, tile1, tile2, tile3];
    return tiles;
  }

  private readonly tileRangeIntersection = (tile: ITile, range: ITileRange): TileIntersectionState => {
    if (tile.zoom < range.zoom) {
      const dz = range.zoom - tile.zoom;
      const tileSize = (1 << dz) - 1;
      const startTile = {
        x: tile.x << dz,
        y: tile.y << dz,
        zoom: range.zoom,
      };
      const endTile = {
        x: startTile.x + tileSize,
        y: startTile.y + tileSize,
        zoom: startTile.zoom,
      };
      const startIncluded = this.sameZoomTileRangeIntersection(startTile, range);
      const endIncluded = this.sameZoomTileRangeIntersection(endTile, range);
      if (startIncluded && endIncluded) {
        return TileIntersectionState.FULL;
      } else if (startIncluded || endIncluded) {
        return TileIntersectionState.PARTIAL;
      } else if (endTile.x <= range.minX || startTile.x >= range.maxX || endTile.y <= range.minY || startTile.y >= range.maxY) {
        return TileIntersectionState.NONE;
      } else {
        return TileIntersectionState.PARTIAL;
      }
    } else if (tile.zoom > range.zoom) {
      const dz = tile.zoom - range.zoom;
      range = {
        minX: range.minX << dz,
        maxX: range.maxX << dz,
        minY: range.minY << dz,
        maxY: range.maxX << dz,
        zoom: tile.zoom,
      };
    }
    return this.sameZoomTileRangeIntersection(tile, range) ? TileIntersectionState.FULL : TileIntersectionState.NONE;
  };

  private sameZoomTileRangeIntersection(tile: ITile, range: ITileRange): boolean {
    return tile.x >= range.minX && tile.x < range.maxX && tile.y >= range.minY && tile.y < range.maxY;
  }

  private readonly tileFootprintIntersection = (tile: ITile, intersectionParams: IFootprintIntersectionParams): TileIntersectionState => {
    const tileBbox = tileToBbox(tile);
    const tilePoly = bboxPolygon(tileBbox);
    const intersection = intersect(intersectionParams.footprint, tilePoly);
    if (intersection === null) {
      return TileIntersectionState.NONE;
    }
    if (tile.zoom === intersectionParams.maxZoom) {
      return TileIntersectionState.FULL;
    }
    const intArea = area(intersection);
    const hashArea = area(tilePoly);
    if (intArea == hashArea) {
      return TileIntersectionState.FULL;
    }
    return TileIntersectionState.PARTIAL;
  };

  private isBbox(footprint: Polygon | Feature<Polygon | MultiPolygon>): boolean {
    const bbox = polygonToBbox(footprint);
    const bboxPoly = bboxPolygon(bbox);
    return booleanEqual(footprint, bboxPoly);
  }
}
