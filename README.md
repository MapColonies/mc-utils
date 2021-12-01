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
