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
  public async *encodeFootprint(footprint: Polygon | Feature<Polygon | MultiPolygon>, zoom: number, verbose = false): AsyncGenerator<ITileRange> {
    ////////////////////////////////
    /// Step 1: check if the footprint is identical to its bbox
    ////////////////////////////////
    if (verbose) {
      console.log('encode footprint');
    }

    ////////////////////////////////
    /// Step 2: convert footprint to BBOX
    ////////////////////////////////
    const bbox = polygonToBbox(footprint) as BBox2d;
    if (this.isBbox(footprint)) {
      // if it is convert its bbox directly to tile range and return it (bbox to tiles conversion is fast and direct mathematical conversion)
      const tileRange = await bboxToTileRange(bbox, zoom);
      if (verbose) {
        console.log(
          `footprint is identical to its bbox - return BBOX tile range zoom: ${tileRange.zoom} : X ${tileRange.minX} - ${tileRange.maxX} : Y ${tileRange.minY} - ${tileRange.maxY}`
        );
      }
      yield await Promise.resolve(tileRange);
      //yield tileRange;
    } else {
      const intersectionParams: IFootprintIntersectionParams = {
        footprint,
        maxZoom: zoom,
      };
      if (verbose) {
        console.log('footprint is different from its bbox - generateRanges');
      }
      yield* await Promise.resolve(this.generateRanges(bbox, zoom, intersectionParams, this.tileFootprintIntersection, verbose));
      //yield* this.generateRanges(bbox, zoom, intersectionParams, this.tileFootprintIntersection, verbose);
    }
  }

  /**
   * generate tile
   * @param bbox bbox to cover with generated tiles
   * @param zoom target tiles zoom level
   */
  public generateTiles(bbox: BBox2d, zoom: number): AsyncGenerator<ITile>;
  /**
   * generate tile
   * @param footprint footprint to cover with generated tiles
   * @param zoom target tiles zoom level
   */
  public generateTiles(footprint: Polygon | Feature<Polygon | MultiPolygon>, zoom: number): AsyncGenerator<ITile>;
  public generateTiles(area: BBox2d | Polygon | Feature<Polygon | MultiPolygon>, zoom: number): AsyncGenerator<ITile> {
    let gen: AsyncIterable<ITileRange>;
    if (Array.isArray(area)) {
      const generator = async function* tileRangeGenerator(): AsyncGenerator<ITileRange> {
        yield await Promise.resolve(bboxToTileRange(area, zoom));
      }
      gen = generator();
    } else {
      gen = this.encodeFootprint(area, zoom);
    }
    return tilesGenerator(gen);
  }

  private async *generateRanges<T>(
    bbox: BBox2d,
    zoom: number,
    intersectionTarget: T,
    intersectionFunction: TileIntersectionFunction<T>,
    verbose = false
  ): AsyncGenerator<ITileRange> {
    /////////////////////////////////////////////////////////////////////////////////////////////////
    /// Step 3: Convert the bbox to tile range of the requested zoom
    /////////////////////////////////////////////////////////////////////////////////////////////////
    if (verbose) {
      console.log('Convert the bbox to tile range of the requested zoom');
    }
    const boundingRange = await bboxToTileRange(bbox, zoom);
    if (verbose) {
      const bboxString = `BBOX[0]: ${bbox[0]}, BBOX[1]: ${bbox[1]}, BBOX[2]: ${bbox[2]}, BBOX[3]: ${bbox[3]}`;
      console.log(
        `${bboxString}, Zoom: ${zoom}, bounding range: minX: ${boundingRange.minX}, maxX: ${boundingRange.maxX}, minY: ${boundingRange.minY}, maxY: ${boundingRange.maxY}`
      );
    }
    /////////////////////////////////////////////////////////////////////////////////////////////////
    /// Step 4: Use range size to calculate zoom level where the target area is smaller then 1 tile
    ///         (use zoom zero in-case there is no such zoom, for example in global bbox).
    /////////////////////////////////////////////////////////////////////////////////////////////////
    // find minimal zoom where the the area can be converted by area the size of single tile to skip levels that can't have full hashes
    if (verbose) {
      console.log("find minimal zoom where the the area can be converted by area the size of single tile to skip levels that can't have full hashes");
    }
    const dx = boundingRange.maxX - boundingRange.minX;
    const dy = boundingRange.maxY - boundingRange.minY;
    const minXZoom = Math.max(Math.floor(Math.log2(1 << (zoom + 1)) / dx) - 1, 0);
    const minYZoom = Math.max(Math.floor(Math.log2(1 << zoom) / dy), 0);
    const minZoom = Math.min(minXZoom, minYZoom);

    if (verbose) {
      console.log(`MinZoom: ${minZoom}`);
    }
    /////////////////////////////////////////////////////////////////////////////////////////////////
    /// Step 5: convert the requested bbox to to tile range of the zoom level calculated in step 3 (this reduce the iteration required for the calculation)
    /////////////////////////////////////////////////////////////////////////////////////////////////
    //find base hashes
    const minimalRange = await bboxToTileRange(bbox, minZoom);
    for (let x = minimalRange.minX; x < minimalRange.maxX; x++) {
      for (let y = minimalRange.minY; y < minimalRange.maxY; y++) {
        /////////////////////////////////////////////////////////////////////////////////////////////////
        /// Step 6: for every tile in the current range:
        /// Step 7: check the tile intersection with the footprint
        /////////////////////////////////////////////////////////////////////////////////////////////////
        const tile = { x, y, zoom: minimalRange.zoom };
        const intersection = intersectionFunction(tile, intersectionTarget);
        if (verbose) {
          console.log(`Tile X: ${tile.x}, Y: ${tile.y} zoom ${tile.zoom}, intersection: ${intersection}`);
        }
        /// if it is completely covered or the tile is in the requested zoom:
        if (intersection === TileIntersectionState.FULL) {
          /// convert it to tile range of the requested resolution
          /// add the range to the result set (yield is used for lazy calculation to improve memory usage)

          const tileRange = this.tileToRange(tile, zoom);
          if (verbose) {
            console.log(
              `return BBOX tile range zoom: ${tileRange.zoom} : X ${tileRange.minX} - ${tileRange.maxX} : Y ${tileRange.minY} - ${tileRange.maxY}`
            );
          }
          yield tileRange;
        } else if (intersection === TileIntersectionState.PARTIAL) {
          /// if it partly covered:
          // calculate the sub tiles contained in the current tile (in the next zoom level)
          // for every sub tile recursively run step 6
          //optimize partial base hashes
          yield* this.optimizeHash(tile, zoom, intersectionTarget, intersectionFunction, verbose);
        }
        /// else do nothing as this tiles aren't intersected with the original footprint
      }
    }
  }

  /**
   * generate tile
   * @param tile tile to get all intersecting tiles from
   * @param targetZoom target tiles zoom level
   * @param intersectionTarget original zoom level and footprint to intersect
   * @param intersectionFunction the intersection function to be called
   */
  private *optimizeHash<T>(
    tile: ITile,
    targetZoom: number,
    intersectionTarget: T,
    intersectionFunction: TileIntersectionFunction<T>,
    verbose = false
  ): Generator<ITileRange> {
    /// generate from a tile the next zoom level tiles that compose the tile
    if (verbose) {
      console.log(
        `optimizeHash: Tile X: ${tile.x}, Y: ${tile.y} zoom ${tile.zoom}, intersectionTarget ${
          (intersectionTarget as unknown as { maxZoom: number }).maxZoom
        }, - generate from a tile the next zoom level tiles that compose the tile`
      );
    }
    const tiles = this.generateSubTiles(tile);
    for (const subTile of tiles) {
      const intersection = intersectionFunction(subTile, intersectionTarget);
      if (verbose) {
        console.log(`Tile X: ${subTile.x}, Y: ${subTile.y} zoom ${subTile.zoom}, intersection: ${intersection}`);
      }
      if (intersection === TileIntersectionState.FULL) {
        /// convert it to tile range of the requested resolution
        /// add the range to the result set (yield is used for lazy calculation to improve memory usage)

        const tileRange = this.tileToRange(subTile, targetZoom);
        if (verbose) {
          console.log(
            `return BBOX tile range zoom: ${tileRange.zoom} : X ${tileRange.minX} - ${tileRange.maxX} : Y ${tileRange.minY} - ${tileRange.maxY}`
          );
        }
        yield tileRange;
      } else if (intersection === TileIntersectionState.PARTIAL) {
        /// if it partly covered:
        // calculate the sub tiles contained in the current tile (in the next zoom level) - recursive
        yield* this.optimizeHash(subTile, targetZoom, intersectionTarget, intersectionFunction, verbose);
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
    // stop condition
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
