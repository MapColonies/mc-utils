import axios, { AxiosBasicCredentials, AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import HttpStatus from 'http-status-codes';
import axiosRetry, { exponentialDelay, IAxiosRetryConfig } from 'axios-retry';
import { get as readProperty } from 'lodash';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
  HttpError,
} from '@map-colonies/error-types';
import { ILogger } from '../../models/interfaces/iLogger';

export interface IHttpRetryConfig {
  attempts: number;
  delay: number | 'exponential';
  shouldResetTimeout: boolean;
}

export abstract class HttpClient {
  protected axiosOptions: AxiosRequestConfig = {};
  private readonly axiosClient: AxiosInstance;

  public constructor(protected readonly logger: ILogger, baseUrl: string, private readonly targetService = '', retryConfig?: IHttpRetryConfig) {
    this.axiosClient = axios.create();

    this.axiosOptions.baseURL = baseUrl;
    const axiosRetryConfig: IAxiosRetryConfig = retryConfig
      ? this.parseConfig(retryConfig)
      : {
          retries: 0,
        };

    const delayFunc = axiosRetryConfig.retryDelay ?? ((): number => 0);
    axiosRetryConfig.retryDelay = (retryCount: number, error: AxiosError): number => {
      this.logger.error(`error from ${this.targetService}. retries: ${retryCount}. error: ${error.message}`);
      return delayFunc(retryCount, error);
    };
    axiosRetry(this.axiosClient, axiosRetryConfig);
  }

  protected async get<T>(
    url: string,
    queryParams?: Record<string, unknown>,
    retryConfig?: IAxiosRetryConfig,
    auth?: AxiosBasicCredentials,
    headers?: unknown
  ): Promise<T> {
    try {
      const reqConfig = retryConfig ? { ...this.axiosOptions, 'axios-retry': retryConfig } : { ...this.axiosOptions };
      reqConfig.params = queryParams;
      reqConfig.auth = auth;
      reqConfig.headers = headers;
      const res = await this.axiosClient.get<T>(url, reqConfig);
      return res.data;
    } catch (err) {
      const error = this.wrapError(url, err);
      throw error;
    }
  }

  protected async post<T>(
    url: string,
    body?: unknown,
    queryParams?: Record<string, unknown>,
    retryConfig?: IAxiosRetryConfig,
    auth?: AxiosBasicCredentials,
    headers?: unknown
  ): Promise<T> {
    try {
      const reqConfig = retryConfig ? { ...this.axiosOptions, 'axios-retry': retryConfig } : this.axiosOptions;
      reqConfig.params = queryParams;
      reqConfig.auth = auth;
      reqConfig.headers = headers;
      const res = await this.axiosClient.post<T>(url, body, reqConfig);
      return res.data;
    } catch (err) {
      const error = this.wrapError(url, err, body);
      throw error;
    }
  }

  protected async put<T>(
    url: string,
    body?: unknown,
    queryParams?: Record<string, unknown>,
    retryConfig?: IAxiosRetryConfig,
    auth?: AxiosBasicCredentials,
    headers?: unknown
  ): Promise<T> {
    try {
      const reqConfig = retryConfig ? { ...this.axiosOptions, 'axios-retry': retryConfig } : this.axiosOptions;
      reqConfig.params = queryParams;
      reqConfig.auth = auth;
      reqConfig.headers = headers;
      const res = await this.axiosClient.put<T>(url, body, reqConfig);
      return res.data;
    } catch (err) {
      const error = this.wrapError(url, err, body);
      throw error;
    }
  }

  protected async delete<T>(
    url: string,
    queryParams?: Record<string, unknown>,
    retryConfig?: IAxiosRetryConfig,
    auth?: AxiosBasicCredentials,
    headers?: unknown
  ): Promise<T> {
    try {
      const reqConfig = retryConfig ? { ...this.axiosOptions, 'axios-retry': retryConfig } : this.axiosOptions;
      reqConfig.params = queryParams;
      reqConfig.auth = auth;
      reqConfig.headers = headers;
      const res = await this.axiosClient.delete<T>(url, reqConfig);
      return res.data;
    } catch (err) {
      const error = this.wrapError(url, err);
      throw error;
    }
  }

  protected async head<T>(
    url: string,
    queryParams?: Record<string, unknown>,
    retryConfig?: IAxiosRetryConfig,
    auth?: AxiosBasicCredentials,
    headers?: unknown
  ): Promise<T> {
    try {
      const reqConfig = retryConfig ? { ...this.axiosOptions, 'axios-retry': retryConfig } : this.axiosOptions;
      reqConfig.params = queryParams;
      reqConfig.auth = auth;
      reqConfig.headers = headers;
      const res = await this.axiosClient.head<T>(url, reqConfig);
      return res.data;
    } catch (err) {
      const error = this.wrapError(url, err);
      throw error;
    }
  }

  protected async options<T>(
    url: string,
    queryParams?: Record<string, unknown>,
    retryConfig?: IAxiosRetryConfig,
    auth?: AxiosBasicCredentials,
    headers?: unknown
  ): Promise<T> {
    try {
      const reqConfig = retryConfig ? { ...this.axiosOptions, 'axios-retry': retryConfig } : this.axiosOptions;
      reqConfig.params = queryParams;
      reqConfig.auth = auth;
      reqConfig.headers = headers;
      const res = await this.axiosClient.options<T>(url, reqConfig);
      return res.data;
    } catch (err) {
      const error = this.wrapError(url, err);
      throw error;
    }
  }

  protected async patch<T>(
    url: string,
    body?: unknown,
    queryParams?: Record<string, unknown>,
    retryConfig?: IAxiosRetryConfig,
    auth?: AxiosBasicCredentials,
    headers?: unknown
  ): Promise<T> {
    try {
      const reqConfig = retryConfig ? { ...this.axiosOptions, 'axios-retry': retryConfig } : this.axiosOptions;
      reqConfig.params = queryParams;
      reqConfig.auth = auth;
      reqConfig.headers = headers;
      const res = await this.axiosClient.patch<T>(url, body, reqConfig);
      return res.data;
    } catch (err) {
      const error = this.wrapError(url, err);
      throw error;
    }
  }

  private wrapError(url: string, err: AxiosError, body?: unknown): HttpError {
    const message = readProperty(err, 'response.data.message', undefined) as string | undefined;
    switch (err.response?.status) {
      case HttpStatus.BAD_REQUEST:
        if (body !== undefined) {
          body = JSON.stringify(body);
          this.logger.debug(`invalid request sent to ${this.targetService} at ${url}. body: ${body as string}. error: ${err.message}`);
        } else {
          this.logger.debug(`invalid request sent to ${this.targetService} at ${url}. error: ${err.message}`);
        }
        return new BadRequestError(err, message);
      case HttpStatus.NOT_FOUND:
        this.logger.debug(`request url not found for service ${this.targetService}, target url: ${url}, error: ${err.message}`);
        return new NotFoundError(err, message);
      case HttpStatus.CONFLICT:
        this.logger.debug(`request url conflicted, for service ${this.targetService}, target url: ${url}, error: ${err.message}`);
        return new ConflictError(err, message);
      case HttpStatus.FORBIDDEN:
        this.logger.debug(`forbidden request sent service ${this.targetService}, target url: ${url}, error: ${err.message}`);
        throw new ForbiddenError(err, message);
      case HttpStatus.UNAUTHORIZED:
        this.logger.debug(`unauthorized request sent service ${this.targetService}, target url: ${url}, error: ${err.message}`);
        throw new UnauthorizedError(err, message);
      default:
        if (body !== undefined) {
          body = JSON.stringify(body);
          this.logger.info(`error from ${this.targetService} at ${url}. body: ${body as string}. error: ${err.message}`);
        } else {
          this.logger.info(`error from ${this.targetService} at ${url}. error: ${err.message}`);
        }
        return new InternalServerError(err);
    }
  }

  private parseConfig(config: IHttpRetryConfig): IAxiosRetryConfig {
    const retries = config.attempts - 1;
    if (retries < 0) {
      throw new Error('invalid retry configuration: attempts must be positive');
    }
    let delay: (attempt: number) => number;
    if (config.delay === 'exponential') {
      delay = exponentialDelay;
    } else if (typeof config.delay === 'number') {
      delay = (): number => {
        return config.delay as number;
      };
    } else {
      throw new Error('invalid retry configuration: delay must be "exponential" or number');
    }
    return {
      retries: retries,
      retryDelay: delay,
      shouldResetTimeout: config.shouldResetTimeout,
    };
  }
}
