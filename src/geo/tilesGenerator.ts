import { ITile, ITileRange } from '../models/interfaces/geo/iTile';

export function* tilesGenerator(rangeGen: Iterable<ITileRange>): Generator<ITile> {
  for (const range of rangeGen) {
    for (let x = range.minX; x < range.maxX; x++) {
      for (let y = range.minY; y < range.maxY; y++) {
        yield {
          x,
          y,
          zoom: range.zoom,
        };
      }
    }
  }
}
