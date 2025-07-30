# mc-utils
this is general utilities for usage in Map Colonies project.

# included components
 - [http client](#http-client)

# usage
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
import { ShapefileChunkReader, ReaderOptions, ChunkProcessor } from '@your-package/mc-utils';

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
import { StateManager, ProcessingState } from '@your-package/mc-utils';

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
import { MetricsCollector, ChunkMetrics, FileMetrics } from '@your-package/mc-utils';

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
| `logger` | Logger | undefined | Optional logger for debugging and monitoring |
| `stateManager` | StateManager | undefined | Optional state manager for resumable processing |
| `metricsCollector` | MetricsCollector | undefined | Optional metrics collector for performance monitoring |