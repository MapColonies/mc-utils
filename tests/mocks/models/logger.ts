import { ILogger } from '../../../src';

const logMocks = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};
const loggerMock = logMocks as unknown as ILogger;

export { loggerMock, logMocks };
