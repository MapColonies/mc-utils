/**
 * Hierarchical precompute of the tiles intersecting a footprint (or shared by several footprints at once).
 * The tile pyramid is a quadtree — tile (z, x, y) contains tiles (z+1, 2x..2x+1, 2y..2y+1) -
 * so classifying one coarse tile can settle its entire subtree; the walk only recurses where
 * the footprint's boundary passes, making total work O(boundary tiles), not O(bbox area).
 */
import type { Position } from 'geojson';
import { ITileRange } from '../models/interfaces/geo/iTile';
import { Footprint } from './geoIntersection';
import { degreesPerTile } from './tiles';

interface ZoomRange {
  minZoom: number;
  maxZoom: number;
}

interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface TileBounds {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

// a footprint as the descent sees it at one tile: the edges still relevant there, and whether
// the tile is already known to be fully inside
interface FootprintState {
  flatRings: Float64Array[]; // the rings of the footprint as flat arrays of coordinates
  edges: Segment[]; // edges that crossed the parent tile
  inside: boolean; // whether the parent tile is fully inside the footprint
}

const MIN_SUPPORTED_ZOOM = 0;
const MAX_SUPPORTED_ZOOM = 22;
const GRID_MIN_LON = -180;
const GRID_MIN_LAT = -90;
const SUBTILES_PER_AXIS = 2;
const VALUES_PER_POINT = 2; // a flat ring stores lon, lat per point

// eslint-disable-next-line @typescript-eslint/no-magic-numbers
const midpoint = (a: number, b: number): number => (a + b) / 2;

// normalizes any accepted footprint into a flat list of rings
function ringsOf(footprint: Footprint): Position[][] {
  const geometry = footprint.type === 'Feature' ? footprint.geometry : footprint;
  if (geometry.type === 'Polygon') {
    return geometry.coordinates;
  }
  // flattening MultiPolygon parts is safe: edge clipping and the even-odd point test are
  // both ring-agnostic, so outer rings, holes and disjoint parts all work with one flat list
  return geometry.coordinates.flat();
}

// converts rings to individual edges (each ring is closed: last point equals the first)
function ringsToEdges(rings: Position[][]): Segment[] {
  const edges: Segment[] = [];
  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      edges.push({ x1: ring[i][0], y1: ring[i][1], x2: ring[i + 1][0], y2: ring[i + 1][1] });
    }
  }
  return edges;
}

// Liang-Barsky line clipping as a boolean: does any part of the segment lie within the tile?
// The segment is P(t) = start + t * (dx, dy) for t in [0, 1]; the loop shrinks the window
// [t0, t1] of the part inside the tile. Touching a border counts as intersecting
// docs: https://mapcolonies.atlassian.net/wiki/spaces/MAPConflicResolution/pages/3334111234/Liang-Barsky+intersection+predicate+segmentIntersectsBounds
function segmentIntersectsBounds(segment: Segment, bounds: TileBounds): boolean {
  const dx = segment.x2 - segment.x1;
  const dy = segment.y2 - segment.y1;
  const p = [-dx, dx, -dy, dy]; // speed toward each boundary: west, east, south, north
  const q = [segment.x1 - bounds.minLon, bounds.maxLon - segment.x1, segment.y1 - bounds.minLat, bounds.maxLat - segment.y1]; // start point's signed distance inside each boundary
  let t0 = 0; // window start: latest entry crossing seen so far
  let t1 = 1; // window end: earliest exit crossing seen so far

  for (let i = 0; i < p.length; i++) {
    // docs: #LB-2.1
    if (p[i] === 0) {
      // parallel to boundary i, so it never crosses it
      if (q[i] < 0) {
        // and it runs on the outside of that boundary -> the whole segment is out (docs: #LB-2.1.A  (path P1))
        return false;
      }
    } else {
      const r = q[i] / p[i]; // the t at which the segment crosses boundary i
      // docs: #LB-2.2
      if (p[i] < 0) {
        // moving toward the inside: r is an ENTRY point
        if (r > t1) {
          return false; // enters only after it already exited elsewhere -> misses the tile (docs: #LB-2.2.A  (path P2))
        }
        if (r > t0) {
          t0 = r; // docs: #LB-2.2.B
        }
      } else {
        // moving toward the outside: r is an EXIT point (docs: #LB-2.3)
        if (r < t0) {
          return false; // exits before it ever entered -> misses the tile (docs: #LB-2.3.A  (path P3))
        }
        if (r < t1) {
          t1 = r; // docs: #LB-2.3.B
        }
      }
    }
  }
  // a valid window remains; t0 === t1 means a single touch point, which still counts
  return true; // docs: #LB-3  (path P4)
}

// even-odd (ray casting) point-in-polygon: cast a ray east from the point and count edge
// crossings — odd total means inside. One shared toggle across all rings is what makes
// holes and MultiPolygon parts work with no special casing (inside outer + inside hole
// toggles twice = outside). Each ring is flat: [lon0, lat0, lon1, lat1, ...].
function pointInRings(lon: number, lat: number, flatRings: Float64Array[]): boolean {
  let inside = false;
  for (const ring of flatRings) {
    for (let i = 0; i < ring.length - VALUES_PER_POINT; i += VALUES_PER_POINT) {
      const x1 = ring[i];
      const y1 = ring[i + 1];
      const x2 = ring[i + VALUES_PER_POINT];
      const y2 = ring[i + VALUES_PER_POINT + 1];
      // half-open test (<= vs >): a shared vertex is counted for exactly one of its two
      // edges, and horizontal edges (y1 === y2) never match — both avoid double counting
      if ((y1 <= lat && y2 > lat) || (y2 <= lat && y1 > lat)) {
        const xCross = x1 + ((lat - y1) * (x2 - x1)) / (y2 - y1); // longitude where the edge crosses the ray's latitude (linear interpolation)
        if (xCross > lon) {
          // the crossing is east of the point, i.e. actually on the ray
          inside = !inside;
        }
      }
    }
  }
  return inside;
}

// bounds of a tile on the WGS84 geodetic grid: tiles span 180 / 2^z degrees, origin at the
// south-west corner (-180, -90), x grows east (two hemispheres wide), y grows north
function tileBounds(zoom: number, x: number, y: number): TileBounds {
  const degrees = degreesPerTile(zoom);
  const minLon = GRID_MIN_LON + x * degrees;
  const minLat = GRID_MIN_LAT + y * degrees;
  return { minLon, minLat, maxLon: minLon + degrees, maxLat: minLat + degrees };
}

// emits the whole subtree of a tile proven fully inside the footprint — pure arithmetic,
// no geometry tests: a coarse interior tile can stand in for millions of deep tiles
function* subtreeRanges(zoom: number, x: number, y: number, range: ZoomRange): Generator<ITileRange> {
  // Math.max skips levels above the requested range; the block is still derived from THIS node
  for (let z = Math.max(zoom, range.minZoom); z <= range.maxZoom; z++) {
    const factor = Math.pow(SUBTILES_PER_AXIS, z - zoom); // each level doubles both axes
    // the block this tile covers at level z: x' in [x * factor, (x + 1) * factor - 1], y' likewise
    yield { zoom: z, minX: x * factor, maxX: (x + 1) * factor - 1, minY: y * factor, maxY: (y + 1) * factor - 1 };
  }
}

// [[lon, lat], ...] -> [lon, lat, lon, lat, ...]: a flat typed ring keeps the point test fast
const toFlatRing = (ring: Position[]): Float64Array => Float64Array.from(ring.flat());

// the descent's starting state for a footprint: all of its edges, not yet narrowed to any tile
function toFootprintState(footprint: Footprint): FootprintState {
  const rings = ringsOf(footprint);
  return {
    flatRings: rings.map(toFlatRing),
    edges: ringsToEdges(rings),
    inside: false,
  };
}

// classifies the tile against one footprint: the state for its children, or undefined when the
// tile lies entirely outside the footprint. A tile inside the footprint stays inside it all
// the way down, so its edges are never filtered again
function clipToTile(state: FootprintState, bounds: TileBounds): FootprintState | undefined {
  if (state.inside) {
    return state;
  }
  // `edges` only holds edges that crossed the PARENT tile; re-filter for this tile, so the
  // list keeps shrinking as the descent narrows onto the boundary
  const edges = state.edges.filter((edge) => segmentIntersectsBounds(edge, bounds));
  if (edges.length > 0) {
    return { flatRings: state.flatRings, edges, inside: false };
  }
  // the boundary does not pass through this tile, and a tile is a connected region — so it
  // lies entirely inside or entirely outside; any single interior point decides which
  if (pointInRings(midpoint(bounds.minLon, bounds.maxLon), midpoint(bounds.minLat, bounds.maxLat), state.flatRings)) {
    return { flatRings: state.flatRings, edges, inside: true };
  }
  return undefined;
}

// hierarchical descent over one or more footprints: a tile is kept only if it touches all of them.
// Each footprint classifies the tile as outside, inside, or crossed by its boundary:
//   outside any footprint  -> prune the tile and its subtree
//   inside every footprint -> emit the whole subtree arithmetically
//   otherwise              -> a boundary crosses it: emit the tile and recurse into its 4 children
function* descend(zoom: number, x: number, y: number, states: FootprintState[], range: ZoomRange): Generator<ITileRange> {
  const bounds = tileBounds(zoom, x, y);
  const childStates: FootprintState[] = [];
  for (const state of states) {
    const childState = clipToTile(state, bounds);
    if (childState === undefined) {
      return;
    }
    childStates.push(childState);
  }

  if (childStates.every((state) => state.inside)) {
    yield* subtreeRanges(zoom, x, y, range);
    return;
  }

  if (zoom >= range.minZoom) {
    // a boundary passes through this tile and the tile is inside or on the boundary of every
    // footprint (a polygon includes its boundary), so it touches them all; emit it as a 1x1
    // range (only when inside the requested range)
    yield { zoom, minX: x, maxX: x, minY: y, maxY: y };
  }
  if (zoom < range.maxZoom) {
    const childX = SUBTILES_PER_AXIS * x; // children occupy the doubled coordinates:
    const childY = SUBTILES_PER_AXIS * y; // x' in {2x, 2x+1}, y' in {2y, 2y+1}
    yield* descend(zoom + 1, childX, childY, childStates, range);
    yield* descend(zoom + 1, childX + 1, childY, childStates, range);
    yield* descend(zoom + 1, childX, childY + 1, childStates, range);
    yield* descend(zoom + 1, childX + 1, childY + 1, childStates, range);
  }
}

function validateZoomRange(range: ZoomRange): void {
  if (range.minZoom > range.maxZoom) {
    throw new RangeError(`minZoom [${range.minZoom}] must not be greater than maxZoom [${range.maxZoom}]`);
  }
  if (range.minZoom < MIN_SUPPORTED_ZOOM || range.maxZoom > MAX_SUPPORTED_ZOOM) {
    throw new RangeError(
      `zoom range [${range.minZoom}, ${range.maxZoom}] exceeds the supported range [${MIN_SUPPORTED_ZOOM}, ${MAX_SUPPORTED_ZOOM}]`
    );
  }
}

const isSingleTile = (range: ITileRange): boolean => range.minX === range.maxX && range.minY === range.maxY;

// the geodetic grid is two tiles wide at zoom 0, doubling with each level
const columnsAt = (zoom: number): number => SUBTILES_PER_AXIS * Math.pow(SUBTILES_PER_AXIS, zoom);

// merges the single tiles of one zoom, given as keys y * columns + x (so sorting the keys sorts
// by row, then column): neighbours in a row join into runs, and runs spanning the same columns
// on consecutive rows stack into blocks
function mergeSingleTiles(zoom: number, keys: Float64Array): ITileRange[] {
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

// the descent emits every boundary tile as its own 1x1 range, and depth-first order scatters
// neighbours far apart, so they can't be merged on the fly. Interior blocks pass straight
// through; single tiles are held per zoom as packed numeric keys and merged once the walk ends
function* mergeBoundaryTiles(ranges: Generator<ITileRange>): Generator<ITileRange> {
  const keysByZoom = new Map<number, number[]>();
  for (const range of ranges) {
    if (!isSingleTile(range)) {
      yield range;
      continue;
    }
    let keys = keysByZoom.get(range.zoom);
    if (keys === undefined) {
      keys = [];
      keysByZoom.set(range.zoom, keys);
    }
    keys.push(range.minY * columnsAt(range.zoom) + range.minX);
  }
  for (const [zoom, keys] of [...keysByZoom].sort(([a], [b]) => a - b)) {
    keysByZoom.delete(zoom); // free each zoom's keys once merged
    yield* mergeSingleTiles(zoom, Float64Array.from(keys));
  }
}

/**
 * computes the tile ranges of the tiles that touch the footprint, or every one of the given
 * footprints, for each zoom level in the range, on the WGS84 geodetic grid (2x1 root tiles at zoom 0).
 *
 * Touching includes zero-area contact (a shared edge or corner). With several footprints, each
 * tile only has to touch every footprint, not their intersection, so the result can be a superset
 * of the intersection's tiles.
 *
 * Ranges of the same zoom are disjoint; their order is deterministic but otherwise unspecified.
 * Footprints are not validated and must be valid GeoJSON, otherwise the result is unspecified.
 * Interior blocks are yielded during the walk; boundary tiles are held per zoom and yielded at
 * the end, merged into row runs and blocks.
 * @param footprints a footprint, or a non-empty list of footprints whose shared tiles to compute; holes are supported
 * @param range inclusive zoom range, must be within [0, 22] and minZoom <= maxZoom
 * @returns a generator of disjoint tile ranges, each with a single zoom level
 */
export function* footprintToTileRanges(footprints: Footprint | Footprint[], range: ZoomRange): Generator<ITileRange> {
  validateZoomRange(range);
  const footprintList = Array.isArray(footprints) ? footprints : [footprints];
  if (footprintList.length === 0) {
    throw new RangeError('at least one footprint is required');
  }
  const states = footprintList.map(toFootprintState);
  // the descent starts from both root tiles of the 2x1 grid; the walk can only visit real grid tiles
  const walk = function* (): Generator<ITileRange> {
    yield* descend(0, 0, 0, states, range);
    yield* descend(0, 1, 0, states, range);
  };
  yield* mergeBoundaryTiles(walk());
}

export type { ZoomRange };
