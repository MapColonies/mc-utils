import { ITileRange } from '../models/interfaces/geo/iTile';

async function timeout(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * split collection of tile ranges to batches based on tile count
 * @param batchSize amount of tile per batch
 * @param ranges iterable collection of tile ranges
 */
async function* tileBatchGenerator(batchSize: number, ranges: Iterable<ITileRange>): AsyncIterable<ITileRange[]> {
  let targetRanges: ITileRange[] = [];
  let requiredForFullBatch = batchSize;
  for await(const range of ranges) {
    const dx = range.maxX - range.minX;
    let dy = range.maxY - range.minY;
    if (dx === 0 || dy === 0) {
      continue;
    }
    let reminderX = range.maxX;
    await timeout(0);
    while (range.minY < range.maxY) {
      //remaining tiles in batch row row
      if (reminderX < range.maxX) {
        const remaining = range.maxX - reminderX;
        if (remaining > requiredForFullBatch) {
          targetRanges.push({
            minX: reminderX,
            maxX: reminderX + requiredForFullBatch,
            minY: range.minY,
            maxY: range.minY + 1,
            zoom: range.zoom,
          });
          yield await Promise.resolve(targetRanges);
          reminderX += requiredForFullBatch;
          targetRanges = [];
          requiredForFullBatch = batchSize;
          continue;
        } else {
          targetRanges.push({
            minX: reminderX,
            maxX: reminderX + remaining,
            minY: range.minY,
            maxY: range.minY + 1,
            zoom: range.zoom,
          });
          range.minY++;
          reminderX += remaining;
          requiredForFullBatch -= remaining;
          dy--;
        }
      }
      //add max full lines
      const requiredLines = Math.floor(requiredForFullBatch / dx);
      const yRange = Math.min(requiredLines, dy);
      if (yRange > 0) {
        targetRanges.push({
          minX: range.minX,
          maxX: range.maxX,
          minY: range.minY,
          maxY: range.minY + yRange,
          zoom: range.zoom,
        });
        range.minY += yRange;
        dy -= yRange;
        requiredForFullBatch -= yRange * dx;
      }
      //add partial lines beginning
      if (requiredForFullBatch > 0 && range.minY < range.maxY) {
        const endX = Math.min(range.minX + requiredForFullBatch, range.maxX);
        targetRanges.push({
          minX: range.minX,
          maxX: endX,
          minY: range.minY,
          maxY: range.minY + 1,
          zoom: range.zoom,
        });
        requiredForFullBatch -= endX - range.minX;
        if (endX < range.maxX) {
          reminderX = endX;
        } else {
          range.minY++;
        }
      }
      if (requiredForFullBatch === 0) {
        yield await Promise.resolve(targetRanges);
        targetRanges = [];
        requiredForFullBatch = batchSize;
      }
    }
  }
  if (targetRanges.length > 0) {
    yield await Promise.resolve(targetRanges);
  }
}

export { tileBatchGenerator };
