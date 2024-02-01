import { ITile, ITileRange } from '../models/interfaces/geo/iTile';

export async function* tilesGenerator(rangeGen: AsyncIterable<ITileRange>): AsyncGenerator<ITile> {
  for await (const range of rangeGen) {
    for (let x = range.minX; x < range.maxX; x++) {
      for (let y = range.minY; y < range.maxY; y++) {
        yield await Promise.resolve({
          x,
          y,
          zoom: range.zoom,
        });
      }
    }
  }
}
