import axios, { AxiosBasicCredentials, AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { StatusCodes as statusCodes } from 'http-status-codes';
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
  MethodNotAllowedError,
  ContentTooLarge,
  TooManyRequestsError,
} from '@map-colonies/error-types';
import type { Logger } from '@map-colonies/js-logger';

export interface IHttpRetryConfig {
  attempts: number;
  delay: number | 'exponential';
  shouldResetTimeout: boolean;
}

export type AxiosHeaderValue = string | string[] | number | boolean | null;

export abstract class HttpClient {
  protected axiosOptions: AxiosRequestConfig = {};
  private readonly axiosClient: AxiosInstance;

  public constructor(
    protected readonly logger: Logger,
    protected baseUrl: string,
    protected readonly targetService = '',
    protected retryConfig?: IHttpRetryConfig,
    protected readonly disableDebugLogs = false
  ) {
    this.axiosClient = axios.create();

    this.axiosOptions.baseURL = baseUrl;
    const axiosRetryConfig: IAxiosRetryConfig = retryConfig
      ? this.parseConfig(retryConfig)
      : {
          retries: 0,
        };

    const delayFunc = axiosRetryConfig.retryDelay ?? ((): number => 0);
    axiosRetryConfig.retryDelay = (retryCount: number, error: AxiosError): number => {
      this.logger.error({
        err: error,
        retries: retryCount,
        targetService: this.targetService,
        msg: `error from ${this.targetService}.`,
        msgError: error.message,
      });
      return delayFunc(retryCount, error);
    };
    axiosRetry(this.axiosClient, axiosRetryConfig);
  }

  protected async get<T>(
    url: string,
    queryParams?: Record<string, unknown>,
    retryConfig?: IAxiosRetryConfig,
    auth?: AxiosBasicCredentials,
    headers?: Record<string, AxiosHeaderValue>
  ): Promise<T> {
    try {
      const reqConfig = this.getRequestConfig(retryConfig, queryParams, auth, headers);
      if (!this.disableDebugLogs) {
        this.logger.debug({
          reqConfig,
          url,
          targetService: this.targetService,
          msg: `Send GET message to ${this.targetService}.`,
        });
      }
      const res = await this.axiosClient.get<T>(url, reqConfig);
      return res.data;
    } catch (err) {
      const error = this.wrapError(url, err as AxiosError);
      throw error;
    }
  }

  protected async post<T>(
    url: string,
    body?: unknown,
    queryParams?: Record<string, unknown>,
    retryConfig?: IAxiosRetryConfig,
    auth?: AxiosBasicCredentials,
    headers?: Record<string, AxiosHeaderValue>
  ): Promise<T> {
    try {
      const reqConfig = this.getRequestConfig(retryConfig, queryParams, auth, headers);
      if (!this.disableDebugLogs) {
        this.logger.debug({
          reqConfig,
          url,
          body,
          targetService: this.targetService,
          msg: `Send POST message to ${this.targetService}.`,
        });
      }
      const res = await this.axiosClient.post<T>(url, body, reqConfig);
      return res.data;
    } catch (err) {
      const error = this.wrapError(url, err as AxiosError, body);
      throw error;
    }
  }

  protected async put<T>(
    url: string,
    body?: unknown,
    queryParams?: Record<string, unknown>,
    retryConfig?: IAxiosRetryConfig,
    auth?: AxiosBasicCredentials,
    headers?: Record<string, AxiosHeaderValue>
  ): Promise<T> {
    try {
      const reqConfig = this.getRequestConfig(retryConfig, queryParams, auth, headers);
      if (!this.disableDebugLogs) {
        this.logger.debug({
          reqConfig,
          url,
          body,
          targetService: this.targetService,
          msg: `Send PUT message to ${this.targetService}.`,
        });
      }
      const res = await this.axiosClient.put<T>(url, body, reqConfig);
      return res.data;
    } catch (err) {
      const error = this.wrapError(url, err as AxiosError, body);
      throw error;
    }
  }

  protected async delete<T>(
    url: string,
    queryParams?: Record<string, unknown>,
    retryConfig?: IAxiosRetryConfig,
    auth?: AxiosBasicCredentials,
    headers?: Record<string, AxiosHeaderValue>
  ): Promise<T> {
    try {
      const reqConfig = this.getRequestConfig(retryConfig, queryParams, auth, headers);
      if (!this.disableDebugLogs) {
        this.logger.debug({
          reqConfig,
          url,
          targetService: this.targetService,
          msg: `Send DELTE message to ${this.targetService}.`,
        });
      }
      const res = await this.axiosClient.delete<T>(url, reqConfig);
      return res.data;
    } catch (err) {
      const error = this.wrapError(url, err as AxiosError);
      throw error;
    }
  }

  protected async head<T>(
    url: string,
    queryParams?: Record<string, unknown>,
    retryConfig?: IAxiosRetryConfig,
    auth?: AxiosBasicCredentials,
    headers?: Record<string, AxiosHeaderValue>
  ): Promise<T> {
    try {
      const reqConfig = this.getRequestConfig(retryConfig, queryParams, auth, headers);
      if (!this.disableDebugLogs) {
        this.logger.debug({
          reqConfig,
          url,
          targetService: this.targetService,
          msg: `Send HEAD message to ${this.targetService}.`,
        });
      }
      const res = await this.axiosClient.head<T>(url, reqConfig);
      return res.data;
    } catch (err) {
      const error = this.wrapError(url, err as AxiosError);
      throw error;
    }
  }

  protected async options<T>(
    url: string,
    queryParams?: Record<string, unknown>,
    retryConfig?: IAxiosRetryConfig,
    auth?: AxiosBasicCredentials,
    headers?: Record<string, AxiosHeaderValue>
  ): Promise<T> {
    try {
      const reqConfig = this.getRequestConfig(retryConfig, queryParams, auth, headers);
      if (!this.disableDebugLogs) {
        this.logger.debug({
          reqConfig,
          url,
          targetService: this.targetService,
          msg: `Send OPTIONS message to ${this.targetService}.`,
        });
      }
      const res = await this.axiosClient.options<T>(url, reqConfig);
      return res.data;
    } catch (err) {
      const error = this.wrapError(url, err as AxiosError);
      throw error;
    }
  }

  protected async patch<T>(
    url: string,
    body?: unknown,
    queryParams?: Record<string, unknown>,
    retryConfig?: IAxiosRetryConfig,
    auth?: AxiosBasicCredentials,
    headers?: Record<string, AxiosHeaderValue>
  ): Promise<T> {
    try {
      const reqConfig = this.getRequestConfig(retryConfig, queryParams, auth, headers);
      if (!this.disableDebugLogs) {
        this.logger.debug({
          reqConfig,
          url,
          targetService: this.targetService,
          msg: `Send PATCH message to ${this.targetService}.`,
        });
      }
      const res = await this.axiosClient.patch<T>(url, body, reqConfig);
      return res.data;
    } catch (err) {
      const error = this.wrapError(url, err as AxiosError);
      throw error;
    }
  }

  protected getRequestConfig(
    retryConfig: IAxiosRetryConfig | undefined,
    queryParams: Record<string, unknown> | undefined,
    auth: AxiosBasicCredentials | undefined,
    headers: Record<string, AxiosHeaderValue> | undefined
  ): AxiosRequestConfig {
    const reqConfig = retryConfig ? { ...this.axiosOptions, 'axios-retry': retryConfig } : { ...this.axiosOptions };
    if (queryParams !== undefined) {
      reqConfig.params = reqConfig.params !== undefined ? { ...(reqConfig.params as Record<string, unknown>), ...queryParams } : queryParams;
    }
    if (auth !== undefined) {
      reqConfig.auth = auth;
    }
    if (headers !== undefined) {
      reqConfig.headers = reqConfig.headers !== undefined ? { ...(reqConfig.headers as Record<string, AxiosHeaderValue>), ...headers } : headers;
    }
    return reqConfig;
  }

  private wrapError(url: string, err: AxiosError, body?: unknown): HttpError {
    const message = readProperty(err, 'response.data.message', undefined) as string | undefined;
    switch (err.response?.status) {
      case statusCodes.BAD_REQUEST: {
        if (!this.disableDebugLogs) {
          this.logger.debug({
            err,
            url,
            body,
            targetService: this.targetService,
            msg: `invalid request error received from service ${this.targetService}.`,
            msgError: err.message,
          });
        }
        return new BadRequestError(err, message);
      }
      case statusCodes.NOT_FOUND: {
        if (!this.disableDebugLogs) {
          this.logger.debug({
            err,
            url,
            body,
            targetService: this.targetService,
            msg: `not found error received from service ${this.targetService}.`,
            msgError: err.message,
          });
        }
        return new NotFoundError(err, message);
      }
      case statusCodes.CONFLICT: {
        if (!this.disableDebugLogs) {
          this.logger.debug({
            err,
            url,
            body,
            targetService: this.targetService,
            msg: `conflict error received from service ${this.targetService}.`,
            msgError: err.message,
          });
        }
        return new ConflictError(err, message);
      }
      case statusCodes.FORBIDDEN: {
        if (!this.disableDebugLogs) {
          this.logger.debug({
            err,
            url,
            body,
            targetService: this.targetService,
            msg: `forbidden error received from service ${this.targetService}.`,
            msgError: err.message,
          });
        }
        return new ForbiddenError(err, message);
      }
      case statusCodes.UNAUTHORIZED: {
        if (!this.disableDebugLogs) {
          this.logger.debug({
            err,
            url,
            body,
            targetService: this.targetService,
            msg: `unauthorized error received from service ${this.targetService}.`,
            msgError: err.message,
          });
        }
        return new UnauthorizedError(err, message);
      }
      case statusCodes.METHOD_NOT_ALLOWED: {
        if (!this.disableDebugLogs) {
          this.logger.debug({
            err,
            url,
            body,
            targetService: this.targetService,
            msg: `method not allowed error received from service ${this.targetService}.`,
            msgError: err.message,
          });
        }
        return new MethodNotAllowedError(err, message);
      }
      case statusCodes.REQUEST_TOO_LONG: {
        if (!this.disableDebugLogs) {
          this.logger.debug({
            err,
            url,
            body,
            targetService: this.targetService,
            msg: `content too large error received from service ${this.targetService}.`,
            msgError: err.message,
          });
        }
        return new ContentTooLarge(err, message);
      }
      case statusCodes.TOO_MANY_REQUESTS: {
        if (!this.disableDebugLogs) {
          this.logger.debug({
            err,
            url,
            body,
            targetService: this.targetService,
            msg: `too many requests error received from service ${this.targetService}.`,
            msgError: err.message,
          });
        }
        return new TooManyRequestsError(err, message);
      }
      case undefined:
      default: {
        this.logger.error({
          err,
          url,
          body,
          targetService: this.targetService,
          msg: `Internal Server Error received from service ${this.targetService}.`,
          msgError: err.message,
        });
        return new InternalServerError(err);
      }
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
