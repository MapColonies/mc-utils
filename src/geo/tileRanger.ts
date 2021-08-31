import { BBox2d } from '@turf/helpers/dist/js/lib/geojson';
import { area, bbox as polygonToBbox, bboxPolygon, booleanEqual, Feature, intersect, MultiPolygon, Polygon } from '@turf/turf';
import { ITile, ITileRange } from '../models/interfaces/geo/iTile';
import { bboxToTileRange } from './bboxUtils';
import { tileToBbox } from './tiles';
import { tilesGenerator } from './tilesGenerator';

type TileIntersectionFunction<T> = (tile: ITile, intersectionTarget: T) => TileIntersectionState;

enum TileIntersectionState {
  FULL = 'full',
  PARTIAL = 'partial',
  NONE = 'none',
}

interface IFootprintIntersectionParams {
  footprint: Polygon | Feature<Polygon | MultiPolygon>;
  maxZoom: number;
}

/**
 * class for generating and decoding tile hashes
 */
export class TileRanger {
  /**
   * converts tile to tile range of specified zoom level
   * @param tile
   * @param zoom target tile range zoom
   * @returns
   */
  public tileToRange(tile: ITile, zoom: number): ITileRange {
    let minX: number, minY: number, maxX: number, maxY: number;
    minX = tile.x;
    maxX = tile.x + 1;
    minY = tile.y;
    maxY = tile.y + 1;
    if (tile.zoom < zoom) {
      const dz = zoom - tile.zoom;
      minX = minX << dz;
      maxX = maxX << dz;
      minY = minY << dz;
      maxY = maxY << dz;
    } else if (tile.zoom > zoom) {
      const dz = tile.zoom - zoom;
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
   * generate tile hashes
   * @param footprint footprint to cover with generated tile hashes
   * @param zoom max hash zoom
   * @returns
   */
  public *encodeFootprint(footprint: Polygon | Feature<Polygon | MultiPolygon>, zoom: number): Generator<ITileRange> {
    const bbox = polygonToBbox(footprint) as BBox2d;
    if (this.isBbox(footprint)) {
      yield bboxToTileRange(bbox, zoom);
    } else {
      const intersectionParams: IFootprintIntersectionParams = {
        footprint,
        maxZoom: zoom,
      };
      yield* this.generateRanges(bbox, zoom, intersectionParams, this.tileFootprintIntersection);
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
    let gen: Iterable<ITileRange>;
    if (Array.isArray(area)) {
      gen = [bboxToTileRange(area, zoom)];
    } else {
      gen = this.encodeFootprint(area, zoom);
    }
    return tilesGenerator(gen);
  }

  private *generateRanges<T>(
    bbox: BBox2d,
    zoom: number,
    intersectionTarget: T,
    intersectionFunction: TileIntersectionFunction<T>
  ): Generator<ITileRange> {
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
          yield this.tileToRange(tile, zoom);
        } else if (intersection === TileIntersectionState.PARTIAL) {
          //optimize partial base hashes
          yield* this.optimizeHash(tile, zoom, intersectionTarget, intersectionFunction);
        }
      }
    }
  }

  private *optimizeHash<T>(
    tile: ITile,
    targetZoom: number,
    intersectionTarget: T,
    intersectionFunction: TileIntersectionFunction<T>
  ): Generator<ITileRange> {
    const tiles = this.generateSubTiles(tile);
    for (const subTile of tiles) {
      const intersection = intersectionFunction(subTile, intersectionTarget);
      if (intersection === TileIntersectionState.FULL) {
        yield this.tileToRange(subTile, targetZoom);
      } else if (intersection === TileIntersectionState.PARTIAL) {
        yield* this.optimizeHash(subTile, targetZoom, intersectionTarget, intersectionFunction);
      }
    }
  }

  private generateSubTiles(tile: ITile): ITile[] {
    const tile0 = { x: tile.x << 1, y: tile.y << 1, zoom: tile.zoom + 1 };
    const tile1 = { x: tile0.x + 1, y: tile0.y, zoom: tile0.zoom };
    const tile2 = { x: tile0.x, y: tile0.y + 1, zoom: tile0.zoom };
    const tile3 = { x: tile0.x + 1, y: tile0.y + 1, zoom: tile0.zoom };
    const tiles = [tile0, tile1, tile2, tile3];
    return tiles;
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
