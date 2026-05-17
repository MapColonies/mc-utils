import { ITile, ITileRange } from '../models/interfaces/geo/iTile';

export async function* tilesGenerator(rangeGen: AsyncIterable<ITileRange>): AsyncGenerator<ITile> {
  for await (const range of rangeGen) {
    for (let x = range.minX; x <= range.maxX; x++) {
      // <= because maxX is inclusive
      for (let y = range.minY; y <= range.maxY; y++) {
        // <= because maxY is inclusive
        yield await Promise.resolve({
          x,
          y,
          zoom: range.zoom,
        });
      }
    }
  }
}
