// SPDX-License-Identifier: Apache-2.0
import { connect } from 'nats';
import NatsRelayPlugin from '../src/service/natsRelayPlugin';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import fs from 'node:fs';
import { validateProcessorConfig } from '@tazama-lf/frms-coe-lib/lib/config/processor.config';
import * as util from 'node:util';

// Mock dependencies
jest.mock('nats');
jest.mock('node:fs');
jest.mock('@tazama-lf/frms-coe-lib/lib/config/processor.config', () => ({
  validateProcessorConfig: jest.fn(),
}));

describe('NatsRelayPlugin', () => {
  let natsRelayPlugin: NatsRelayPlugin;
  let mockLoggerService: jest.Mocked<LoggerService>;
  let mockNatsConnection: any;
  let mockApm: any;

  beforeEach(() => {
    jest.clearAllMocks();

    (validateProcessorConfig as jest.Mock).mockReturnValue({
      nodeEnv: 'dev',
      DESTINATION_TRANSPORT_URL: 'nats://localhost:4222',
      PRODUCER_STREAM: 'test.subject',
    });

    (fs.readFileSync as jest.Mock).mockReturnValue('-----BEGIN CERTIFICATE-----\nMockCertificateContent\n-----END CERTIFICATE-----');

    mockLoggerService = {
      log: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    mockNatsConnection = {
      publish: jest.fn(),
      info: undefined,
    };

    mockApm = {
      startSpan: jest.fn().mockReturnValue({ end: jest.fn() }),
      startTransaction: jest.fn().mockReturnValue({ end: jest.fn() }),
      captureError: jest.fn(),
    };

    (connect as jest.Mock).mockResolvedValue(mockNatsConnection);

    natsRelayPlugin = new NatsRelayPlugin();
  });

  describe('init', () => {
    it('should establish a NATS connection successfully without TLS configuration', async () => {
      await natsRelayPlugin.init(mockLoggerService, mockApm);
      expect(connect).toHaveBeenCalledWith({
        servers: 'nats://localhost:4222',
      });
      expect(mockLoggerService.log).toHaveBeenCalledWith('NATS connection established', 'NatsRelayPlugin');
    });

    it('should establish a NATS connection with TLS in production environment', async () => {
      (validateProcessorConfig as jest.Mock).mockReturnValueOnce({
        nodeEnv: 'production',
        DESTINATION_TRANSPORT_URL: 'tls://localhost:4223',
        PRODUCER_STREAM: 'test.subject',
        DESTINATION_NATS_AUTHENTICATED: true,
        DESTINATION_NATS_CERTIFICATE_AUTHORITY_PATH: '/path/to/ca.pem',
      });
      (fs.readFileSync as jest.Mock).mockReturnValueOnce('-----BEGIN CERTIFICATE-----\nMockCertificateContent\n-----END CERTIFICATE-----');

      const prodNatsRelayPlugin = new NatsRelayPlugin();
      await prodNatsRelayPlugin.init(mockLoggerService, mockApm);

      expect(connect).toHaveBeenCalledWith({
        servers: 'tls://localhost:4223',
        tls: {
          ca: '-----BEGIN CERTIFICATE-----\nMockCertificateContent\n-----END CERTIFICATE-----',
        },
      });
      expect(mockLoggerService.log).toHaveBeenCalledWith('NATS connection established', 'NatsRelayPlugin');
    });

    it.each([false, undefined])('should ignore certificate paths when DESTINATION_NATS_AUTHENTICATED is %s', async (authenticated) => {
      (validateProcessorConfig as jest.Mock).mockReturnValueOnce({
        nodeEnv: 'dev',
        DESTINATION_TRANSPORT_URL: 'nats://localhost:4222',
        PRODUCER_STREAM: 'test.subject',
        DESTINATION_NATS_AUTHENTICATED: authenticated,
        DESTINATION_NATS_CERTIFICATE_AUTHORITY_PATH: '/missing/ca.pem',
        DESTINATION_NATS_CLIENT_CERT_PATH: '/missing/client.pem',
      });

      await new NatsRelayPlugin().init(mockLoggerService, mockApm);

      expect(fs.readFileSync).not.toHaveBeenCalled();
      expect(connect).toHaveBeenCalledTimes(1);
      expect(connect).toHaveBeenCalledWith({ servers: 'nats://localhost:4222' });
    });

    it('should require TLS with system trusted CAs when explicitly enabled', async () => {
      (validateProcessorConfig as jest.Mock).mockReturnValueOnce({
        DESTINATION_TRANSPORT_URL: 'nats://localhost:4222',
        PRODUCER_STREAM: 'test.subject',
        DESTINATION_NATS_AUTHENTICATED: true,
      });

      await new NatsRelayPlugin().init(mockLoggerService, mockApm);

      expect(connect).toHaveBeenCalledWith({ servers: 'nats://localhost:4222', tls: {} });
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });

    it.each([undefined, '/path/to/ca.pem'])('should support mutual TLS with CA %s', async (ca) => {
      (validateProcessorConfig as jest.Mock).mockReturnValueOnce({
        DESTINATION_TRANSPORT_URL: 'tls://localhost:4223',
        PRODUCER_STREAM: 'test.subject',
        nodeEnv: 'dev',
        DESTINATION_NATS_AUTHENTICATED: true,
        DESTINATION_NATS_CERTIFICATE_AUTHORITY_PATH: ca,
        DESTINATION_NATS_CLIENT_CERT_PATH: '/path/to/client.pem',
        DESTINATION_NATS_CLIENT_KEY_PATH: '/path/to/client-key.pem',
      });
      (fs.readFileSync as jest.Mock).mockImplementation((file) => `contents of ${file}`);

      await new NatsRelayPlugin().init(mockLoggerService, mockApm);

      expect(connect).toHaveBeenCalledWith({
        servers: 'tls://localhost:4223',
        tls: {
          ...(ca ? { ca: `contents of ${ca}` } : {}),
          cert: 'contents of /path/to/client.pem',
          key: 'contents of /path/to/client-key.pem',
        },
      });
    });

    it.each([
      { DESTINATION_NATS_CLIENT_CERT_PATH: '/path/to/client.pem' },
      { DESTINATION_NATS_CLIENT_KEY_PATH: '/path/to/client-key.pem' },
    ])('should reject incomplete mutual TLS configuration: %o', async (tlsConfig) => {
      (validateProcessorConfig as jest.Mock).mockReturnValueOnce({
        DESTINATION_TRANSPORT_URL: 'nats://localhost:4222',
        PRODUCER_STREAM: 'test.subject',
        DESTINATION_NATS_AUTHENTICATED: true,
        ...tlsConfig,
      });

      await expect(new NatsRelayPlugin().init(mockLoggerService, mockApm)).rejects.toThrow(
        'DESTINATION_NATS_CLIENT_CERT_PATH and DESTINATION_NATS_CLIENT_KEY_PATH must be provided together',
      );
      expect(connect).not.toHaveBeenCalled();
    });

    it('should propagate certificate file errors without connecting', async () => {
      (validateProcessorConfig as jest.Mock).mockReturnValueOnce({
        DESTINATION_TRANSPORT_URL: 'tls://localhost:4223',
        PRODUCER_STREAM: 'test.subject',
        DESTINATION_NATS_AUTHENTICATED: true,
        DESTINATION_NATS_CERTIFICATE_AUTHORITY_PATH: '/missing/ca.pem',
      });
      const error = new Error('Certificate file not found');
      (fs.readFileSync as jest.Mock).mockImplementationOnce(() => {
        throw error;
      });

      await expect(new NatsRelayPlugin().init(mockLoggerService, mockApm)).rejects.toThrow(error);
      expect(connect).not.toHaveBeenCalled();
      expect(mockLoggerService.error).toHaveBeenCalledWith(`Error connecting to NATS: ${util.inspect(error)}`, 'NatsRelayPlugin');
    });

    it('should handle connection error', async () => {
      const error = new Error('Connection failed');
      (connect as jest.Mock).mockRejectedValueOnce(error);

      await expect(natsRelayPlugin.init(mockLoggerService, mockApm)).rejects.toThrow('Connection failed');

      expect(connect).toHaveBeenCalledWith({
        servers: 'nats://localhost:4222',
      });
      expect(mockLoggerService.error).toHaveBeenCalledWith(`Error connecting to NATS: ${util.inspect(error)}`, 'NatsRelayPlugin');
    });
  });

  describe('relay', () => {
    beforeEach(async () => {
      await natsRelayPlugin.init(mockLoggerService, mockApm);
      mockNatsConnection.publish.mockClear();
    });

    it('should relay object data to NATS successfully (converts to JSON string)', async () => {
      const testData = { message: 'test' };

      await natsRelayPlugin.relay(testData as any);

      expect(mockLoggerService.log).toHaveBeenCalledWith('Relaying data to NATS', 'NatsRelayPlugin');
      expect(mockNatsConnection.publish).toHaveBeenCalledWith('test.subject', JSON.stringify(testData));
    });

    it('should relay string data to NATS successfully', async () => {
      const stringData = 'test message';

      await natsRelayPlugin.relay(stringData);

      expect(mockLoggerService.log).toHaveBeenCalledWith('Relaying data to NATS', 'NatsRelayPlugin');
      expect(mockNatsConnection.publish).toHaveBeenCalledWith('test.subject', stringData);
    });

    it('should relay buffer data to NATS successfully', async () => {
      const bufferData = Buffer.from('test message');

      await natsRelayPlugin.relay(bufferData);

      expect(mockLoggerService.log).toHaveBeenCalledWith('Relaying data to NATS', 'NatsRelayPlugin');
      expect(mockNatsConnection.publish).toHaveBeenCalledWith('test.subject', bufferData);
    });

    it('should handle relay error', async () => {
      const error = new Error('Publish failed');
      mockNatsConnection.publish.mockImplementationOnce(() => {
        throw error;
      });
      mockNatsConnection.info = { server_id: 'test-server', server_name: 'test' };

      const testData = 'test message';

      await expect(natsRelayPlugin.relay(testData)).rejects.toThrow('Publish failed');

      expect(mockLoggerService.error).toHaveBeenCalledWith(`Error relaying data to NATS: ${util.inspect(error)}`, 'NatsRelayPlugin');
    });
  });
});
