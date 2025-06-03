import { type ITransportPlugin } from '../interfaces/ITransportPlugin';
import type { LoggerService } from '@tazama-lf/frms-coe-lib';
import type { Apm } from '@tazama-lf/frms-coe-lib/lib/services/apm';
export default class NatsRelayPlugin implements ITransportPlugin {
    private natsConnection?;
    private readonly loggerService;
    private readonly apm;
    private readonly ca;
    constructor(loggerService: LoggerService, apm: Apm);
    init(): Promise<void>;
    relay(data: any): Promise<void>;
}
