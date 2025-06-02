"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const nats_1 = require("nats");
const config_1 = tslib_1.__importDefault(require("../config"));
const fs_1 = tslib_1.__importDefault(require("fs"));
class NatsRelayPlugin {
    natsConnection;
    loggerService;
    apm;
    ca = fs_1.default.readFileSync(config_1.default.ca, 'utf8');
    constructor(loggerService, apm) {
        this.loggerService = loggerService;
        this.apm = apm;
    }
    async init() {
        try {
            this.natsConnection = await (0, nats_1.connect)({
                servers: config_1.default.serverUrl,
                tls: {
                    ca: this.ca,
                },
            });
            this.loggerService?.log('NATS connection established', NatsRelayPlugin.name);
        }
        catch (error) {
            this.loggerService?.error(`Error connecting to NATS: ${JSON.stringify(this.natsConnection?.info, null, 4)}, ${JSON.stringify(error, null, 4)}`, NatsRelayPlugin.name);
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async relay(data) {
        let apmTransaction = null;
        try {
            apmTransaction = this.apm.startTransaction(NatsRelayPlugin.name, {
                childOf: data.metaData?.traceParent ?? undefined,
            });
            const span = this.apm.startSpan('relay');
            this.loggerService.log('Relaying data to NATS', NatsRelayPlugin.name);
            let payload;
            if (Buffer.isBuffer(data)) {
                payload = data;
            }
            else if (typeof data === 'string') {
                payload = data;
            }
            else {
                payload = JSON.stringify(data);
            }
            this.natsConnection?.publish(config_1.default.subject, payload);
            span?.end();
        }
        catch (error) {
            this.loggerService?.error(`Error relaying data to NATS: ${JSON.stringify(this.natsConnection?.info, null, 4)}`, NatsRelayPlugin.name);
        }
        finally {
            apmTransaction?.end();
        }
    }
}
exports.default = NatsRelayPlugin;
//# sourceMappingURL=natsRelayPlugin.js.map