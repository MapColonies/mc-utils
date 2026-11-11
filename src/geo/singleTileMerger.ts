/**
 * Merges single (1x1) tiles of the WGS84 geodetic grid into larger ranges: neighbours in a row
 * join into runs, and runs spanning the same columns on consecutive rows stack into blocks.
 * Internal to footprintToTileRanges, whose depth-first walk scatters neighbouring tiles far
 * apart, so they can only be merged once a zoom's tiles have been collected.
 */
import { ITileRange } from '../models/interfaces/geo/iTile';
import { columnsAt } from './geodeticGrid';

// merges the tiles of one zoom, given as keys y * columns + x (so sorting the keys sorts by row,
// then column)
function mergeKeys(zoom: number, keys: Float64Array): ITileRange[] {
  const columns = columnsAt(zoom);
  const rowOf = (key: number): number => Math.floor(key / columns);
  keys.sort();
  const blocks: ITileRange[] = [];
  const lastBlockByColumns = new Map<string, ITileRange>();
  let i = 0;
  while (i < keys.length) {
    const y = rowOf(keys[i]);
    const minX = keys[i] % columns;
    let maxX = minX;
    // consecutive keys are neighbours only within one row: the last column of a row and the
    // first column of the next one also differ by 1
    while (i + 1 < keys.length && keys[i + 1] === keys[i] + 1 && rowOf(keys[i + 1]) === y) {
      i++;
      maxX++;
    }
    i++;
    const columnsKey = `${minX}:${maxX}`;
    const lastBlock = lastBlockByColumns.get(columnsKey);
    if (lastBlock !== undefined && lastBlock.maxY + 1 === y) {
      lastBlock.maxY = y;
    } else {
      const block = { zoom, minX, maxX, minY: y, maxY: y };
      lastBlockByColumns.set(columnsKey, block);
      blocks.push(block);
    }
  }
  return blocks;
}

/**
 * collects single tiles per zoom as packed numeric keys (8 bytes each) and merges them into
 * disjoint ranges. A zoom holding `maxHeldSingleTiles` tiles is merged right away and starts over,
 * which bounds memory at the cost of some merging; every tile added is emitted exactly once.
 * Each tile must be added at most once.
 */
export class SingleTileMerger {
  private readonly keysByZoom = new Map<number, number[]>();

  /**
   * @param maxHeldSingleTiles how many tiles of one zoom are held before they are merged early; a positive integer
   */
  public constructor(private readonly maxHeldSingleTiles: number) {
    if (!Number.isInteger(maxHeldSingleTiles) || maxHeldSingleTiles < 1) {
      throw new RangeError(`maxHeldSingleTiles [${maxHeldSingleTiles}] must be a positive integer`);
    }
  }

  /**
   * adds one tile
   * @returns the zoom's merged ranges when it just reached the limit, otherwise undefined
   */
  public add(zoom: number, x: number, y: number): ITileRange[] | undefined {
    let keys = this.keysByZoom.get(zoom);
    if (keys === undefined) {
      keys = [];
      this.keysByZoom.set(zoom, keys);
    }
    keys.push(y * columnsAt(zoom) + x);
    if (keys.length < this.maxHeldSingleTiles) {
      return undefined;
    }
    this.keysByZoom.delete(zoom);
    return mergeKeys(zoom, Float64Array.from(keys));
  }

  /**
   * merges every tile still held, zoom by zoom in ascending order, freeing each zoom once merged
   */
  public *drain(): Generator<ITileRange> {
    for (const zoom of [...this.keysByZoom.keys()].sort((a, b) => a - b)) {
      const keys = this.keysByZoom.get(zoom) ?? [];
      this.keysByZoom.delete(zoom);
      yield* mergeKeys(zoom, Float64Array.from(keys));
    }
  }
}
