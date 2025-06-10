// SPDX-License-Identifier: Apache-2.0
import { connect, type NatsConnection } from 'nats';
import { additionalEnvironmentVariables, type Configuration } from '../config';
import { type ITransportPlugin } from '../interfaces/ITransportPlugin';
import type { LoggerService } from '@tazama-lf/frms-coe-lib';
import type { Apm } from '@tazama-lf/frms-coe-lib/lib/services/apm';
import fs from 'fs';
import { validateProcessorConfig } from '@tazama-lf/frms-coe-lib/lib/config/processor.config';

export default class NatsRelayPlugin implements ITransportPlugin {
  private natsConnection?: NatsConnection;
  private readonly loggerService: LoggerService;
  private readonly apm: Apm;
  private readonly configuration: Configuration;

  constructor(loggerService: LoggerService, apm: Apm) {
    this.loggerService = loggerService;
    this.apm = apm;
    this.configuration = validateProcessorConfig(additionalEnvironmentVariables) as Configuration;
  }

  async init(): Promise<void> {
    try {
      this.loggerService.log(`Initializing NATS connection: ${this.configuration.DESTINATION_TRANSPORT_URL}`, NatsRelayPlugin.name);
      if (this.configuration.nodeEnv !== 'dev' && this.configuration.NATS_TLS_CA) {
        const tlsOptions = {
          ca: fs.readFileSync(this.configuration.NATS_TLS_CA, 'utf-8'),
        };
        this.natsConnection = await connect({
          servers: this.configuration.DESTINATION_TRANSPORT_URL,
          tls: tlsOptions,
        });
      } else {
        this.natsConnection = await connect({
          servers: this.configuration.DESTINATION_TRANSPORT_URL,
        });
      }
      this.loggerService?.log('NATS connection established', NatsRelayPlugin.name);
    } catch (error) {
      this.loggerService?.error(`Error connecting to NATS: ${JSON.stringify(this.natsConnection?.info, null, 4)}`, NatsRelayPlugin.name);
    }
  }

  async relay(data: Uint8Array | string): Promise<void> {
    let apmTransaction = null;
    try {
      apmTransaction = this.apm.startTransaction(NatsRelayPlugin.name);
      const span = this.apm.startSpan('relay');
      this.loggerService.log('Relaying data to NATS', NatsRelayPlugin.name);

      let payload: Uint8Array | string | undefined;
      if (Buffer.isBuffer(data)) {
        payload = data;
      } else if (typeof data === 'string') {
        payload = data;
      } else {
        payload = JSON.stringify(data);
      }

      this.natsConnection?.publish(this.configuration.PRODUCER_STREAM, payload);

      span?.end();
    } catch (error) {
      this.loggerService?.error(`Error relaying data to NATS: ${JSON.stringify(this.natsConnection?.info, null, 4)}`, NatsRelayPlugin.name);
    } finally {
      apmTransaction?.end();
    }
  }
}
