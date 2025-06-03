import { connect } from 'nats';
import NatsRelayPlugin from '../src/service/natsRelayPlugin';
import config from '../src/config';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import fs from 'fs';

// Mock dependencies
jest.mock('nats');
jest.mock('fs');
jest.mock('../src/config', () => ({
  serverUrl: 'nats://localhost:4222',
  subject: 'test.subject',
  ca: '/path/to/mock/ca.pem',
}));

describe('NatsRelayPlugin', () => {
  let natsRelayPlugin: NatsRelayPlugin;
  let mockLoggerService: jest.Mocked<LoggerService>;
  let mockNatsConnection: any;
  let mockApm: any;

  beforeEach(() => {
    mockLoggerService = {
      log: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    mockNatsConnection = {
      publish: jest.fn(),
    };

    (fs.readFileSync as jest.Mock).mockReturnValue('-----BEGIN CERTIFICATE-----\nMockCertificateContent\n-----END CERTIFICATE-----');

    mockApm = {
      startSpan: jest.fn().mockReturnValue({
        end: jest.fn(),
      }),
      startTransaction: jest.fn().mockReturnValue({
        end: jest.fn(),
      }),
      captureError: jest.fn(),
    };

    (connect as jest.Mock).mockResolvedValue(mockNatsConnection);

    natsRelayPlugin = new NatsRelayPlugin(mockLoggerService, mockApm);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('init', () => {
    it('should establish a NATS connection successfully', async () => {
      await natsRelayPlugin.init();

      expect(connect).toHaveBeenCalledWith({
        servers: config.serverUrl,
        tls: {
          ca: '-----BEGIN CERTIFICATE-----\nMockCertificateContent\n-----END CERTIFICATE-----',
        },
      });
      expect(mockLoggerService.log).toHaveBeenCalledWith('NATS connection established', 'NatsRelayPlugin');
    });

    it('should handle connection error', async () => {
      const error = new Error('Connection failed');
      (connect as jest.Mock).mockRejectedValueOnce(error);

      await natsRelayPlugin.init();

      expect(connect).toHaveBeenCalledWith({
        servers: config.serverUrl,
        tls: {
          ca: '-----BEGIN CERTIFICATE-----\nMockCertificateContent\n-----END CERTIFICATE-----',
        },
      });
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        `Error connecting to NATS: ${JSON.stringify(undefined, null, 4)}`,
        'NatsRelayPlugin',
      );
    });
  });

  describe('relay', () => {
    const testData = { message: 'test' };

    beforeEach(async () => {
      jest.clearAllMocks();
      await natsRelayPlugin.init();
    });

    it('should relay data to NATS successfully', async () => {
      jest.clearAllMocks();

      await natsRelayPlugin.relay(testData);

      expect(mockLoggerService.log).toHaveBeenCalledWith('Relaying data to NATS', 'NatsRelayPlugin');
      expect(mockNatsConnection.publish).toHaveBeenCalledWith(config.subject, JSON.stringify(testData));
    });

    it('should handle relay error', async () => {
      const error = new Error('Publish failed');
      mockNatsConnection.publish.mockImplementationOnce(() => {
        throw error;
      });

      mockNatsConnection.info = { server_id: 'test-server', server_name: 'test' };

      await natsRelayPlugin.relay(testData);

      expect(mockLoggerService.error).toHaveBeenCalledWith(
        `Error relaying data to NATS: ${JSON.stringify(mockNatsConnection.info, null, 4)}`,
        'NatsRelayPlugin',
      );
    });
  });
});
