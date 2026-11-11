# mc-utils
this is general utilities for usage in Map Colonies project.

# included components
 - [http client](#http-client)
 - [footprint to tile ranges](#footprint-to-tile-ranges)

# usage
 ## footprint to tile ranges
 `footprintToTileRanges(footprint, { minZoom, maxZoom })` lazily computes the tile ranges intersecting a footprint (Polygon / MultiPolygon / Feature, holes supported) for every zoom level in the span, on the WGS84 geodetic 2:1 grid.

 it uses hierarchical descent (see `docs/adr/0001-hierarchical-precompute-in-mc-utils.md`): fully-interior subtrees are emitted as compressed ranges with no per-tile work, as the walk finds them. boundary tiles are held per zoom (one number each) and emitted at the end, merged into row runs and blocks, so memory grows with the length of the footprint's boundary, not with the number of tiles it covers. a tile touching the footprint with zero overlap area counts as intersecting. ranges of the same zoom are disjoint; their order is deterministic but unspecified.

 typical use is tile-cache invalidation: expand each range to your cache's key format and batch-delete.

```typescript
import { footprintToTileRanges } from '@map-colonies/mc-utils';

for (const range of footprintToTileRanges(footprint, { minZoom: 0, maxZoom: 18 })) {
  for (let x = range.minX; x <= range.maxX; x++) {
    for (let y = range.minY; y <= range.maxY; y++) {
      actionOnTile(range.zoom, x, y); // e.g. batch UNLINK keys in redis
    }
  }
}
```

 footprints are not validated: they must be valid GeoJSON (closed rings, no self-intersections), otherwise the result is unspecified. the zoom range must be within [0, 22] with `minZoom <= maxZoom`, otherwise a `RangeError` is thrown.

 passing a list of footprints, `footprintToTileRanges([first, second, ...], { minZoom, maxZoom })`, yields in the same format the tiles that touch **every** footprint in the list, in a single descent over all of them. a tile counts even when the footprints don't overlap inside it (e.g. two areas sharing an edge, or both inside one coarse tile), so this is a superset of the tiles of their intersection. the order of the footprints does not matter. typical use is invalidating only the cached tiles of an existing layer that an update area can have changed.

```typescript
import { footprintToTileRanges } from '@map-colonies/mc-utils';

for (const range of footprintToTileRanges([updateFootprint, previousFootprint], { minZoom: 0, maxZoom: 21 })) {
  // same range shape as with a single footprint
}
```

 ## http client
 this is abstract base class for sending http request with logging and request retries.

 this class constructor requires the following parameters:
 - [ILogger](#ilogger) instance.
 - base url to use for all requests.
 - optional name for target service to be used in logs.
 - optional [retry configuration](#ihttpretryconfig).

 the class have the following protected attributes
 -```axiosOptions``` the options used by axios when sending requests

 the class have the protected methods for sending http requests:
 - ```protected async get<T>(url: string, queryParams?: Record<string, unknown>, retryConfig?: IAxiosRetryConfig, auth?: AxiosBasicCredentials, headers?: unknown): Promise<T>```
 - ```protected async post<T>(url: string, body?: unknown, queryParams?: Record<string, unknown>, retryConfig?: IAxiosRetryConfig, auth?: AxiosBasicCredentials, headers?: unknown): Promise<T>```
 - ```protected async put<T>(url: string, body?: unknown, queryParams?: Record<string, unknown>, retryConfig?: IAxiosRetryConfig, auth?: AxiosBasicCredentials, headers?: unknown): Promise<T>```
 - ```protected async delete<T>(url: string, queryParams?: Record<string, unknown>, retryConfig?: IAxiosRetryConfig, auth?: AxiosBasicCredentials, headers?: unknown): Promise<T>```
 - ```protected async head<T>(url: string, queryParams?: Record<string, unknown>, retryConfig?: IAxiosRetryConfig, auth?: AxiosBasicCredentials, headers?: unknown): Promise<T>```
 - ```protected async options<T>(url: string, queryParams?: Record<string, unknown>, retryConfig?: IAxiosRetryConfig, auth?: AxiosBasicCredentials, headers?: unknown): Promise<T>```
 - ```protected async patch<T>(url: string, body?: unknown, queryParams?: Record<string, unknown>, retryConfig?: IAxiosRetryConfig, auth?: AxiosBasicCredentials, headers?: unknown): Promise<T>```
  
function parameters list:
- `url`: url path to send the request to (not including the base url).
- `body`: optional object to be used as request body (in relevant request types).
- `queryParams`: optional dictionary with query parameters and value.
- `retryConfig`: optional override to the class retry configuration.
- `auth`: optional basic authentication object (username, password).
- `headers`: optional headers to proceed to the request.

usage example:
```typescript
class myServiceClient extends HttpClient {
  public constructor(logger: ILogger){
    super(logger,'https://myService.com','myService',{
      attempts: 3,
      delay: 'exponential',
      shouldResetTimeout: true
    })
  }

  public async getName(): string {
    const name = await this.get<string>('api/name',{queryParam1: 'name'});
    return name;
  }
}
```
# models
## ILogger
logger interface
with the flowing log methods
- ``` error(message:string) ```
- ```warn(message:string)```
- ```info(message: string)``` 
- ```debug(message: string)```

## IHttpRetryConfig
http requests retry configuration interface with the following attributes:
- ```attempts``` - the number of request to send until valid response (not 500+ status code). this value must be integer and greater then 0.
- ```delay``` - the amount of time in ms to wait between attempts (for constant delay) or ```'exponential'``` for exponential backoff.
- ```shouldResetTimeout``` boolean value to indicate if the request timeout should be for each request (true) or global for all attempts (false) 

## Shapefile Processing with State Management

The `ShapefileChunkReader` provides robust shapefile processing with built-in state management and progress tracking capabilities.

### Features

- **Resumable Processing**: Automatically saves processing state and can resume from the last processed chunk
- **Progress Tracking**: Real-time progress information including features processed, vertices counted, and time estimates
- **Metrics Collection**: Optional performance metrics collection for monitoring resource usage
- **Chunk-based Processing**: Processes large shapefiles in configurable chunks to manage memory usage

### Basic Usage

```typescript
import { ShapefileChunkReader, ReaderOptions, ChunkProcessor } from '@map-colonies/mc-utils';

// Define your chunk processor
const processor: ChunkProcessor = {
  process: async (chunk) => {
    console.log(`Processing chunk ${chunk.id} with ${chunk.features.length} features`);
    // Your processing logic here
  }
};

// Configure the reader
const options: ReaderOptions = {
  maxVerticesPerChunk: 10000,
  generateFeatureId: false, // Optional: for generating an UUID v4 for missing IDs
  logger: myLogger,
  stateManager: myStateManager, // Optional: for resumable processing
  metricsCollector: myMetricsCollector, // Optional: for performance monitoring
};

// Create and use the reader
const reader = new ShapefileChunkReader(options);
await reader.readAndProcess('/path/to/shapefile.shp', processor);
```

### State Management

Implement the `StateManager` interface to enable resumable processing:

```typescript
import { StateManager, ProcessingState } from '@map-colonies/mc-utils';

class FileStateManager implements StateManager {
  async saveState(state: ProcessingState): Promise<void> {
    // Save state to file, database, etc.
    await fs.writeFile('processing-state.json', JSON.stringify(state));
  }

  async loadState(): Promise<ProcessingState | null> {
    try {
      const data = await fs.readFile('processing-state.json', 'utf8');
      return JSON.parse(data);
    } catch {
      return null; // No previous state found
    }
  }
}
```

### Progress Tracking

The reader automatically tracks processing progress and provides detailed information:

```typescript
// Progress information is included in the saved state
const progressInfo = state.progress; // Contains:
// - processedFeatures, totalFeatures
// - processedChunks, totalChunks  
// - processedVertices, totalVertices
// - percentage, elapsedTimeMs, estimatedRemainingTimeMs
// - Processing speeds (features/sec, vertices/sec, chunks/sec)
```

### Metrics Collection

Implement the `MetricsCollector` interface to monitor performance:

```typescript
import { MetricsCollector, ChunkMetrics, FileMetrics } from '@map-colonies/mc-utils';

const metricsCollector: MetricsCollector = {
  onChunkMetrics: (metrics: ChunkMetrics) => {
    console.log(`Chunk ${metrics.chunkIndex}: ${metrics.featuresCount} features, ${metrics.totalTimeMs}ms`);
  },
  onFileMetrics: (metrics: FileMetrics) => {
    console.log(`File complete: ${metrics.totalFeatures} features, ${metrics.totalTimeMs}ms total`);
  }
};
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxVerticesPerChunk` | number | Required | Maximum vertices per chunk to control memory usage |
| `generateFeatureId` | boolean | false | Optional determines whether a unique feature identifier should be automatically generated for each feature missing an indentifier |
| `logger` | Logger | undefined | Optional logger for debugging and monitoring |
| `stateManager` | StateManager | undefined | Optional state manager for resumable processing |
| `metricsCollector` | MetricsCollector | undefined | Optional metrics collector for performance monitoring |