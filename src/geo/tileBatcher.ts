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
    const dx = range.maxX - range.minX + 1; // +1: maxX is inclusive, so width = maxX - minX + 1
    let dy = range.maxY - range.minY + 1; // +1: same reasoning for height
    if (range.maxX < range.minX || range.maxY < range.minY) {
      // guard: degenerate/empty range
      continue;
    }
    let reminderX = range.maxX + 1; // sentinel: no partial row (one past inclusive end)
    while (range.minY <= range.maxY) {
      // <= because maxY is inclusive
      //remaining tiles in partial row from a previous cut
      if (reminderX <= range.maxX) {
        // reminderX > maxX means sentinel (no partial row)
        const remaining = range.maxX - reminderX + 1; // +1: maxX is inclusive
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
          reminderX += remaining; // advance past the partial row; equals maxX+1 (sentinel) when row is exhausted
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
          maxY: range.minY + yRange - 1, // -1: yRange rows starting at minY, last inclusive row is minY + yRange - 1
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
        requiredForFullBatch -= endX - range.minX + 1; // +1: endX is inclusive
        reminderX = endX + 1; // next unclaimed X; equals maxX+1 (sentinel) when the full row was consumed
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
