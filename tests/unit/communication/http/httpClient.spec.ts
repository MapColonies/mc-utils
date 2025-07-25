import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
  MethodNotAllowedError,
  ContentTooLarge,
  TooManyRequestsError,
} from '@map-colonies/error-types';
import jsLogger from '@map-colonies/js-logger';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { exponentialDelay, IAxiosRetryConfig } from 'axios-retry';
import { HttpClient } from '../../../../src';
import { axiosMocks, initAxiosMock } from '../../../mocks/externalDeps/axios';

const logger = jsLogger({ enabled: false });
class TestClient extends HttpClient {
  public callGet = this.get.bind(this);
  public callPost = this.post.bind(this);
  public callPut = this.put.bind(this);
  public callPatch = this.patch.bind(this);
  public callDelete = this.delete.bind(this);
  public callHead = this.head.bind(this);
  public callOptions = this.options.bind(this);
  public callGetRequestConfig = this.getRequestConfig.bind(this);
  public setGlobalConfig(config: AxiosRequestConfig): void {
    this.axiosOptions = config;
  }
}

const testUrl = 'http://test/test';
const testQuery = {
  a: 'aaa',
  b: 'bbbb',
};
const testBody = {
  c: 'ccc',
  d: {
    e: 'eeee',
  },
};
const axiosTestResponseBody = {
  value: 'test',
};
const axiosTestResponse = {
  data: axiosTestResponseBody,
};
const axiosTestError = {
  message: 'bad request',
  response: {
    status: 400,
  },
};

describe('HttpClient', function () {
  let client: TestClient;

  beforeEach(() => {
    initAxiosMock();
    client = new TestClient(logger, 'baseUrl', 'Unit tests');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('configurations', () => {
    it('static configurations are mapped properly', () => {
      const config = {
        attempts: 17,
        delay: 598761,
        shouldResetTimeout: true,
      };
      const parseConfig = (client as unknown as { parseConfig: (config: unknown) => IAxiosRetryConfig }).parseConfig;

      const options = parseConfig(config);

      expect(options.retries).toBe(16);
      expect(options.shouldResetTimeout).toBe(true);
      expect(options.retryDelay?.(0, {} as AxiosError)).toBe(598761);
    });

    it('"exponential" delay is mapped properly', () => {
      const config = {
        delay: 'exponential',
      };

      const parseConfig = (client as unknown as { parseConfig: (config: unknown) => IAxiosRetryConfig }).parseConfig;

      const options = parseConfig(config);

      expect(options.retryDelay).toBe(exponentialDelay);
    });

    it('zero attempts configuration throws exception', () => {
      const config = {
        arguments: 0,
      };

      const parseConfig = (client as unknown as { parseConfig: (config: unknown) => IAxiosRetryConfig }).parseConfig;
      const action = () => {
        parseConfig(config);
      };
      expect(action).toThrow();
    });

    it('global configurations are used when not overridden', () => {
      const globalConfig: AxiosRequestConfig = {
        'axios-retry': {
          retries: 1,
        },
        auth: {
          username: 'a',
          password: 'b',
        },
        params: {
          test1: 1,
          test2: 2,
        },
        headers: {
          test3: 3,
          test4: 4,
        },
      };
      client.setGlobalConfig(globalConfig);
      const reqConf = client.callGetRequestConfig(undefined, undefined, undefined, undefined);
      expect(reqConf).toEqual(globalConfig);
    });

    it('request configs are added to global configurations', () => {
      const globalConfig: AxiosRequestConfig = {
        'axios-retry': {
          retries: 1,
        },
        auth: {
          username: 'a',
          password: 'b',
        },
        params: {
          test1: 1,
          test2: 2,
        },
        headers: {
          test3: 3,
          test4: 4,
        },
      };
      const retryOverride = {
        retries: 3,
      };
      const queryOverride = {
        test1: 4,
        test3: 3,
      };
      const authOverride = {
        username: 't',
        password: 't',
      };
      const headerOverride = {
        test3: 6,
        test5: 5,
      };

      client.setGlobalConfig(globalConfig);
      const reqConf = client.callGetRequestConfig(retryOverride, queryOverride, authOverride, headerOverride);

      const expectedConfig = {
        'axios-retry': {
          retries: 3,
        },
        auth: {
          username: 't',
          password: 't',
        },
        params: {
          test1: 4,
          test2: 2,
          test3: 3,
        },
        headers: {
          test3: 6,
          test4: 4,
          test5: 5,
        },
      };

      expect(reqConf).toEqual(expectedConfig);
    });
  });

  describe('GET', () => {
    it('should send request without query params', async () => {
      axiosMocks.get.mockResolvedValue(axiosTestResponse);

      const res = await client.callGet(testUrl);

      expect(axiosMocks.get).toHaveBeenCalledTimes(1);
      expect(axiosMocks.get).toHaveBeenCalledWith(testUrl, expect.anything());
      expect(res).toEqual(axiosTestResponseBody);
    });

    it('should send request with query params', async () => {
      axiosMocks.get.mockResolvedValue(axiosTestResponse);

      const res = await client.callGet(testUrl, testQuery);

      expect(axiosMocks.get).toHaveBeenCalledTimes(1);
      expect(axiosMocks.get).toHaveBeenCalledWith(
        testUrl,
        expect.objectContaining({
          params: testQuery,
        })
      );
      expect(res).toEqual(axiosTestResponseBody);
    });

    it('should handle errors', async () => {
      axiosMocks.get.mockRejectedValue(axiosTestError);

      const action = async () => {
        await client.callGet(testUrl);
      };

      await expect(action).rejects.toThrow(BadRequestError);
      expect(axiosMocks.get).toHaveBeenCalledTimes(1);
      expect(axiosMocks.get).toHaveBeenCalledWith(testUrl, expect.anything());
    });
  });

  describe('POST', () => {
    it('should send request without query params, without body', async () => {
      axiosMocks.post.mockResolvedValue(axiosTestResponse);

      const res = await client.callPost(testUrl);

      expect(axiosMocks.post).toHaveBeenCalledTimes(1);
      expect(axiosMocks.post).toHaveBeenCalledWith(testUrl, undefined, expect.anything());
      expect(res).toEqual(axiosTestResponseBody);
    });

    it('should send request with query params, without body', async () => {
      axiosMocks.post.mockResolvedValue(axiosTestResponse);

      const res = await client.callPost(testUrl, undefined, testQuery);

      expect(axiosMocks.post).toHaveBeenCalledTimes(1);
      expect(axiosMocks.post).toHaveBeenCalledWith(
        testUrl,
        undefined,
        expect.objectContaining({
          params: testQuery,
        })
      );
      expect(res).toEqual(axiosTestResponseBody);
    });

    it('should send request without query params, with body', async () => {
      axiosMocks.post.mockResolvedValue(axiosTestResponse);

      const res = await client.callPost(testUrl, testBody);

      expect(axiosMocks.post).toHaveBeenCalledTimes(1);
      expect(axiosMocks.post).toHaveBeenCalledWith(testUrl, testBody, expect.anything());
      expect(res).toEqual(axiosTestResponseBody);
    });

    it('should send request with query params, with body', async () => {
      axiosMocks.post.mockResolvedValue(axiosTestResponse);

      const res = await client.callPost(testUrl, testBody, testQuery);

      expect(axiosMocks.post).toHaveBeenCalledTimes(1);
      expect(axiosMocks.post).toHaveBeenCalledWith(
        testUrl,
        testBody,
        expect.objectContaining({
          params: testQuery,
        })
      );
      expect(res).toEqual(axiosTestResponseBody);
    });

    it('should handle errors', async () => {
      axiosMocks.post.mockRejectedValue(axiosTestError);

      const action = async () => {
        await client.callPost(testUrl);
      };

      await expect(action).rejects.toThrow(BadRequestError);
      expect(axiosMocks.post).toHaveBeenCalledTimes(1);
      expect(axiosMocks.post).toHaveBeenCalledWith(testUrl, undefined, expect.anything());
    });
  });

  describe('PUT', () => {
    it('should send request without query params, without body', async () => {
      axiosMocks.put.mockResolvedValue(axiosTestResponse);

      const res = await client.callPut(testUrl);

      expect(axiosMocks.put).toHaveBeenCalledTimes(1);
      expect(axiosMocks.put).toHaveBeenCalledWith(testUrl, undefined, expect.anything());
      expect(res).toEqual(axiosTestResponseBody);
    });

    it('should send request with query params, without body', async () => {
      axiosMocks.put.mockResolvedValue(axiosTestResponse);

      const res = await client.callPut(testUrl, undefined, testQuery);

      expect(axiosMocks.put).toHaveBeenCalledTimes(1);
      expect(axiosMocks.put).toHaveBeenCalledWith(
        testUrl,
        undefined,
        expect.objectContaining({
          params: testQuery,
        })
      );
      expect(res).toEqual(axiosTestResponseBody);
    });

    it('should send request without query params, with body', async () => {
      axiosMocks.put.mockResolvedValue(axiosTestResponse);

      const res = await client.callPut(testUrl, testBody);

      expect(axiosMocks.put).toHaveBeenCalledTimes(1);
      expect(axiosMocks.put).toHaveBeenCalledWith(testUrl, testBody, expect.anything());
      expect(res).toEqual(axiosTestResponseBody);
    });

    it('should send request with query params, with body', async () => {
      axiosMocks.put.mockResolvedValue(axiosTestResponse);

      const res = await client.callPut(testUrl, testBody, testQuery);

      expect(axiosMocks.put).toHaveBeenCalledTimes(1);
      expect(axiosMocks.put).toHaveBeenCalledWith(
        testUrl,
        testBody,
        expect.objectContaining({
          params: testQuery,
        })
      );
      expect(res).toEqual(axiosTestResponseBody);
    });

    it('should handle errors', async () => {
      axiosMocks.put.mockRejectedValue(axiosTestError);

      const action = async () => {
        await client.callPut(testUrl);
      };

      await expect(action).rejects.toThrow(BadRequestError);
      expect(axiosMocks.put).toHaveBeenCalledTimes(1);
      expect(axiosMocks.put).toHaveBeenCalledWith(testUrl, undefined, expect.anything());
    });
  });

  describe('DELETE', () => {
    it('should send request without query params', async () => {
      axiosMocks.delete.mockResolvedValue(axiosTestResponse);

      const res = await client.callDelete(testUrl);

      expect(axiosMocks.delete).toHaveBeenCalledTimes(1);
      expect(axiosMocks.delete).toHaveBeenCalledWith(testUrl, expect.anything());
      expect(res).toEqual(axiosTestResponseBody);
    });

    it('should send request with query params', async () => {
      axiosMocks.delete.mockResolvedValue(axiosTestResponse);

      const res = await client.callDelete(testUrl, testQuery);

      expect(axiosMocks.delete).toHaveBeenCalledTimes(1);
      expect(axiosMocks.delete).toHaveBeenCalledWith(
        testUrl,
        expect.objectContaining({
          params: testQuery,
        })
      );
      expect(res).toEqual(axiosTestResponseBody);
    });

    it('should handle errors', async () => {
      axiosMocks.delete.mockRejectedValue(axiosTestError);

      const action = async () => {
        await client.callDelete(testUrl);
      };

      await expect(action).rejects.toThrow(BadRequestError);
      expect(axiosMocks.delete).toHaveBeenCalledTimes(1);
      expect(axiosMocks.delete).toHaveBeenCalledWith(testUrl, expect.anything());
    });
  });

  describe('HEAD', () => {
    it('should send request without query params', async () => {
      axiosMocks.head.mockResolvedValue(axiosTestResponse);

      const res = await client.callHead(testUrl);

      expect(axiosMocks.head).toHaveBeenCalledTimes(1);
      expect(axiosMocks.head).toHaveBeenCalledWith(testUrl, expect.anything());
      expect(res).toEqual(axiosTestResponseBody);
    });

    it('should send request with query params', async () => {
      axiosMocks.head.mockResolvedValue(axiosTestResponse);

      const res = await client.callHead(testUrl, testQuery);

      expect(axiosMocks.head).toHaveBeenCalledTimes(1);
      expect(axiosMocks.head).toHaveBeenCalledWith(
        testUrl,
        expect.objectContaining({
          params: testQuery,
        })
      );
      expect(res).toEqual(axiosTestResponseBody);
    });

    it('should handle errors', async () => {
      axiosMocks.head.mockRejectedValue(axiosTestError);

      const action = async () => {
        await client.callHead(testUrl);
      };

      await expect(action).rejects.toThrow(BadRequestError);
      expect(axiosMocks.head).toHaveBeenCalledTimes(1);
      expect(axiosMocks.head).toHaveBeenCalledWith(testUrl, expect.anything());
    });
  });

  describe('OPTIONS', () => {
    it('should send request without query params', async () => {
      axiosMocks.options.mockResolvedValue(axiosTestResponse);

      const res = await client.callOptions(testUrl);

      expect(axiosMocks.options).toHaveBeenCalledTimes(1);
      expect(axiosMocks.options).toHaveBeenCalledWith(testUrl, expect.anything());
      expect(res).toEqual(axiosTestResponseBody);
    });

    it('should send request with query params', async () => {
      axiosMocks.options.mockResolvedValue(axiosTestResponse);

      const res = await client.callOptions(testUrl, testQuery);

      expect(axiosMocks.options).toHaveBeenCalledTimes(1);
      expect(axiosMocks.options).toHaveBeenCalledWith(
        testUrl,
        expect.objectContaining({
          params: testQuery,
        })
      );
      expect(res).toEqual(axiosTestResponseBody);
    });

    it('should handle errors', async () => {
      axiosMocks.options.mockRejectedValue(axiosTestError);

      const action = async () => {
        await client.callOptions(testUrl);
      };

      await expect(action).rejects.toThrow(BadRequestError);
      expect(axiosMocks.options).toHaveBeenCalledTimes(1);
      expect(axiosMocks.options).toHaveBeenCalledWith(testUrl, expect.anything());
    });
  });

  describe('PATCH', () => {
    it('should send request without query params, without body', async () => {
      axiosMocks.patch.mockResolvedValue(axiosTestResponse);

      const res = await client.callPatch(testUrl);

      expect(axiosMocks.patch).toHaveBeenCalledTimes(1);
      expect(axiosMocks.patch).toHaveBeenCalledWith(testUrl, undefined, expect.anything());
      expect(res).toEqual(axiosTestResponseBody);
    });

    it('should send request with query params, without body', async () => {
      axiosMocks.patch.mockResolvedValue(axiosTestResponse);

      const res = await client.callPatch(testUrl, undefined, testQuery);

      expect(axiosMocks.patch).toHaveBeenCalledTimes(1);
      expect(axiosMocks.patch).toHaveBeenCalledWith(
        testUrl,
        undefined,
        expect.objectContaining({
          params: testQuery,
        })
      );
      expect(res).toEqual(axiosTestResponseBody);
    });

    it('should send request without query params, with body', async () => {
      axiosMocks.patch.mockResolvedValue(axiosTestResponse);

      const res = await client.callPatch(testUrl, testBody);

      expect(axiosMocks.patch).toHaveBeenCalledTimes(1);
      expect(axiosMocks.patch).toHaveBeenCalledWith(testUrl, testBody, expect.anything());
      expect(res).toEqual(axiosTestResponseBody);
    });

    it('should send request with query params, with body', async () => {
      axiosMocks.patch.mockResolvedValue(axiosTestResponse);

      const res = await client.callPatch(testUrl, testBody, testQuery);

      expect(axiosMocks.patch).toHaveBeenCalledTimes(1);
      expect(axiosMocks.patch).toHaveBeenCalledWith(
        testUrl,
        testBody,
        expect.objectContaining({
          params: testQuery,
        })
      );
      expect(res).toEqual(axiosTestResponseBody);
    });

    it('should handle errors', async () => {
      axiosMocks.patch.mockRejectedValue(axiosTestError);

      const action = async () => {
        await client.callPatch(testUrl);
      };

      await expect(action).rejects.toThrow(BadRequestError);
      expect(axiosMocks.patch).toHaveBeenCalledTimes(1);
      expect(axiosMocks.patch).toHaveBeenCalledWith(testUrl, undefined, expect.anything());
    });
  });

  describe('Error Handling - wrapError function', () => {
    describe('BadRequestError - 400', () => {
      it('should throw BadRequestError for GET on 400', async () => {
        const badRequestError = {
          message: 'bad request',
          response: {
            status: 400,
          },
        };
        axiosMocks.get.mockRejectedValue(badRequestError);

        const action = async () => {
          await client.callGet(testUrl);
        };

        await expect(action).rejects.toThrow(BadRequestError);
      });

      it('should throw BadRequestError for POST on 400', async () => {
        const badRequestError = {
          message: 'bad request',
          response: {
            status: 400,
          },
        };
        axiosMocks.post.mockRejectedValue(badRequestError);

        const action = async () => {
          await client.callPost(testUrl);
        };

        await expect(action).rejects.toThrow(BadRequestError);
      });
    });

    describe('UnauthorizedError - 401', () => {
      it('should throw UnauthorizedError for GET on 401', async () => {
        const unauthorizedError = {
          message: 'unauthorized',
          response: {
            status: 401,
          },
        };
        axiosMocks.get.mockRejectedValue(unauthorizedError);

        const action = async () => {
          await client.callGet(testUrl);
        };

        await expect(action).rejects.toThrow(UnauthorizedError);
      });
    });

    describe('ForbiddenError - 403', () => {
      it('should throw ForbiddenError for GET on 403', async () => {
        const forbiddenError = {
          message: 'forbidden',
          response: {
            status: 403,
          },
        };
        axiosMocks.get.mockRejectedValue(forbiddenError);

        const action = async () => {
          await client.callGet(testUrl);
        };

        await expect(action).rejects.toThrow(ForbiddenError);
      });
    });

    describe('NotFoundError - 404', () => {
      it('should throw NotFoundError for GET on 404', async () => {
        const notFoundError = {
          message: 'not found',
          response: {
            status: 404,
          },
        };
        axiosMocks.get.mockRejectedValue(notFoundError);

        const action = async () => {
          await client.callGet(testUrl);
        };

        await expect(action).rejects.toThrow(NotFoundError);
      });
    });

    describe('MethodNotAllowedError - 405', () => {
      it('should throw MethodNotAllowedError for GET on 405', async () => {
        const methodNotAllowedError = {
          message: 'method not allowed',
          response: {
            status: 405,
          },
        };
        axiosMocks.get.mockRejectedValue(methodNotAllowedError);

        const action = async () => {
          await client.callGet(testUrl);
        };

        await expect(action).rejects.toThrow(MethodNotAllowedError);
      });
    });

    describe('ConflictError - 409', () => {
      it('should throw ConflictError for GET on 409', async () => {
        const conflictError = {
          message: 'conflict',
          response: {
            status: 409,
          },
        };
        axiosMocks.get.mockRejectedValue(conflictError);

        const action = async () => {
          await client.callGet(testUrl);
        };

        await expect(action).rejects.toThrow(ConflictError);
      });
    });

    describe('ContentTooLarge - 413', () => {
      it('should throw ContentTooLarge for POST on 413', async () => {
        const contentTooLargeError = {
          message: 'content too large',
          response: {
            status: 413,
          },
        };
        axiosMocks.post.mockRejectedValue(contentTooLargeError);

        const action = async () => {
          await client.callPost(testUrl, testBody);
        };

        await expect(action).rejects.toThrow(ContentTooLarge);
      });
    });

    describe('TooManyRequestsError - 429', () => {
      it('should throw TooManyRequestsError for GET on 429', async () => {
        const tooManyRequestsError = {
          message: 'too many requests',
          response: {
            status: 429,
          },
        };
        axiosMocks.get.mockRejectedValue(tooManyRequestsError);

        const action = async () => {
          await client.callGet(testUrl);
        };

        await expect(action).rejects.toThrow(TooManyRequestsError);
      });
    });

    describe('InternalServerError - 500 and other status codes', () => {
      it('should throw InternalServerError for GET on 500', async () => {
        const internalServerError = {
          message: 'internal server error',
          response: {
            status: 500,
          },
        };
        axiosMocks.get.mockRejectedValue(internalServerError);

        const action = async () => {
          await client.callGet(testUrl);
        };

        await expect(action).rejects.toThrow(InternalServerError);
      });

      it('should throw InternalServerError for unknown status codes', async () => {
        const unknownError = {
          message: 'unknown error',
          response: {
            status: 999,
          },
        };
        axiosMocks.get.mockRejectedValue(unknownError);

        const action = async () => {
          await client.callGet(testUrl);
        };

        await expect(action).rejects.toThrow(InternalServerError);
      });
    });

    describe('Error message extraction', () => {
      it('should extract message from response.data.message', async () => {
        const errorWithMessage = {
          message: 'axios error message',
          response: {
            status: 400,
            data: {
              message: 'custom error message',
            },
          },
        };
        axiosMocks.get.mockRejectedValue(errorWithMessage);

        const action = async () => {
          await client.callGet(testUrl);
        };

        await expect(action).rejects.toThrow(BadRequestError);
      });

      it('should handle errors without custom message', async () => {
        const errorWithoutMessage = {
          message: 'axios error message',
          response: {
            status: 404,
          },
        };
        axiosMocks.get.mockRejectedValue(errorWithoutMessage);

        const action = async () => {
          await client.callGet(testUrl);
        };

        await expect(action).rejects.toThrow(NotFoundError);
      });
    });

    describe('Error handling across different HTTP methods', () => {
      it('should throw BadRequestError for PUT on 400', async () => {
        const error = { message: 'test error', response: { status: 400 } };
        axiosMocks.put.mockRejectedValue(error);
        await expect(client.callPut(testUrl)).rejects.toThrow(BadRequestError);
      });

      it('should throw UnauthorizedError for PATCH on 401', async () => {
        const error = { message: 'test error', response: { status: 401 } };
        axiosMocks.patch.mockRejectedValue(error);
        await expect(client.callPatch(testUrl)).rejects.toThrow(UnauthorizedError);
      });

      it('should throw ForbiddenError for DELETE on 403', async () => {
        const error = { message: 'test error', response: { status: 403 } };
        axiosMocks.delete.mockRejectedValue(error);
        await expect(client.callDelete(testUrl)).rejects.toThrow(ForbiddenError);
      });

      it('should throw NotFoundError for HEAD on 404', async () => {
        const error = { message: 'test error', response: { status: 404 } };
        axiosMocks.head.mockRejectedValue(error);
        await expect(client.callHead(testUrl)).rejects.toThrow(NotFoundError);
      });

      it('should throw MethodNotAllowedError for OPTIONS on 405', async () => {
        const error = { message: 'test error', response: { status: 405 } };
        axiosMocks.options.mockRejectedValue(error);
        await expect(client.callOptions(testUrl)).rejects.toThrow(MethodNotAllowedError);
      });

      it('should throw ConflictError for POST on 409', async () => {
        const error = { message: 'test error', response: { status: 409 } };
        axiosMocks.post.mockRejectedValue(error);
        await expect(client.callPost(testUrl)).rejects.toThrow(ConflictError);
      });

      it('should throw ContentTooLarge for PUT on 413', async () => {
        const error = { message: 'test error', response: { status: 413 } };
        axiosMocks.put.mockRejectedValue(error);
        await expect(client.callPut(testUrl)).rejects.toThrow(ContentTooLarge);
      });

      it('should throw TooManyRequestsError for POST on 429', async () => {
        const error = { message: 'test error', response: { status: 429 } };
        axiosMocks.post.mockRejectedValue(error);
        await expect(client.callPost(testUrl)).rejects.toThrow(TooManyRequestsError);
      });

      it('should throw InternalServerError for GET on 500', async () => {
        const error = { message: 'test error', response: { status: 500 } };
        axiosMocks.get.mockRejectedValue(error);
        await expect(client.callGet(testUrl)).rejects.toThrow(InternalServerError);
      });
    });
  });
});
