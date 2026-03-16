import { Logger } from '@map-colonies/types';

export const loggerMock: Logger = {
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  fatal: jest.fn(),
};
