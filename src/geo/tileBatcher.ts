import { ITileRange } from '../models/interfaces/geo/iTile';
import { timeout } from '../utils/timeout';

/**
 * split collection of tile ranges to batches based on tile count
 * @param batchSize amount of tile per batch
 * @param ranges iterable collection of tile ranges
 */
async function* tileBatchGenerator(batchSize: number, ranges: AsyncGenerator<ITileRange>): AsyncGenerator<ITileRange[]> {
  let targetRanges: ITileRange[] = [];
  let requiredForFullBatch = batchSize;
  for await (const range of ranges) {
    const dx = range.maxX - range.minX + 1;
    let dy = range.maxY - range.minY + 1;
    if (range.maxX < range.minX || range.maxY < range.minY) {
      continue;
    }
    let reminderX = range.maxX + 1; // sentinel: no partial row (one past inclusive end)
    while (range.minY <= range.maxY) {
      //remaining tiles in partial row
      if (reminderX <= range.maxX) {
        const remaining = range.maxX - reminderX + 1;
        if (remaining > requiredForFullBatch) {
          targetRanges.push({
            minX: reminderX,
            maxX: reminderX + requiredForFullBatch - 1,
            minY: range.minY,
            maxY: range.minY,
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
            maxX: range.maxX,
            minY: range.minY,
            maxY: range.minY,
            zoom: range.zoom,
          });
          range.minY++;
          reminderX += remaining; // becomes range.maxX + 1 (sentinel)
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
          maxY: range.minY + yRange - 1,
          zoom: range.zoom,
        });
        range.minY += yRange;
        dy -= yRange;
        requiredForFullBatch -= yRange * dx;
      }
      //add partial line at row beginning
      if (requiredForFullBatch > 0 && range.minY <= range.maxY) {
        const endX = Math.min(range.minX + requiredForFullBatch - 1, range.maxX);
        targetRanges.push({
          minX: range.minX,
          maxX: endX,
          minY: range.minY,
          maxY: range.minY,
          zoom: range.zoom,
        });
        requiredForFullBatch -= endX - range.minX + 1;
        reminderX = endX + 1; // next partial start, or sentinel if endX === maxX
        if (endX >= range.maxX) {
          range.minY++;
        }
      }
      if (requiredForFullBatch === 0) {
        yield await Promise.resolve(targetRanges);
        targetRanges = [];
        requiredForFullBatch = batchSize;
      }
    }
    await timeout(0); // TODO: * This is a hot fix to keep work async and handle concurrency requests while handling the task batch merging, remove this when moving to the new utils package ! *
  }
  if (targetRanges.length > 0) {
    yield await Promise.resolve(targetRanges);
  }
}

export { tileBatchGenerator };
