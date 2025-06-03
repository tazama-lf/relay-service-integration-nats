import { connect, type NatsConnection } from 'nats';
import config from '../config';
import { type ITransportPlugin } from '../interfaces/ITransportPlugin';
import type { LoggerService } from '@tazama-lf/frms-coe-lib';
import type { Apm } from '@tazama-lf/frms-coe-lib/lib/services/apm';
import fs from 'fs';

export default class NatsRelayPlugin implements ITransportPlugin {
  private natsConnection?: NatsConnection;
  private readonly loggerService: LoggerService;
  private readonly apm: Apm;
  private readonly ca = fs.readFileSync(config.ca, 'utf8');

  constructor(loggerService: LoggerService, apm: Apm) {
    this.loggerService = loggerService;
    this.apm = apm;
  }

  async init(): Promise<void> {
    try {
      this.loggerService.log(`Initializing NATS connection: ${config.serverUrl}`, NatsRelayPlugin.name);
      this.natsConnection = await connect({
        servers: config.serverUrl,
        tls: {
          ca: this.ca,
        },
      });
      this.loggerService?.log('NATS connection established', NatsRelayPlugin.name);
    } catch (error) {
      this.loggerService?.error(`Error connecting to NATS: ${JSON.stringify(this.natsConnection?.info, null, 4)}`, NatsRelayPlugin.name);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async relay(data: any): Promise<void> {
    let apmTransaction = null;
    try {
      apmTransaction = this.apm.startTransaction(NatsRelayPlugin.name, {
        childOf: data.metaData?.traceParent ?? undefined,
      });
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

      this.natsConnection?.publish(config.subject, payload);

      span?.end();
    } catch (error) {
      this.loggerService?.error(`Error relaying data to NATS: ${JSON.stringify(this.natsConnection?.info, null, 4)}`, NatsRelayPlugin.name);
    } finally {
      apmTransaction?.end();
    }
  }
}
