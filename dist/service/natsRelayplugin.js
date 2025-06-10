"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// SPDX-License-Identifier: Apache-2.0
const nats_1 = require("nats");
const config_1 = require("../config");
const fs_1 = tslib_1.__importDefault(require("fs"));
const processor_config_1 = require("@tazama-lf/frms-coe-lib/lib/config/processor.config");
class NatsRelayPlugin {
    natsConnection;
    loggerService;
    apm;
    configuration;
    constructor(loggerService, apm) {
        this.loggerService = loggerService;
        this.apm = apm;
        this.configuration = (0, processor_config_1.validateProcessorConfig)(config_1.additionalEnvironmentVariables);
    }
    async init() {
        try {
            this.loggerService.log(`Initializing NATS connection: ${this.configuration.DESTINATION_TRANSPORT_URL}`, NatsRelayPlugin.name);
            if (this.configuration.nodeEnv !== 'dev' && this.configuration.NATS_TLS_CA) {
                const tlsOptions = {
                    ca: fs_1.default.readFileSync(this.configuration.NATS_TLS_CA, 'utf-8'),
                };
                this.natsConnection = await (0, nats_1.connect)({
                    servers: this.configuration.DESTINATION_TRANSPORT_URL,
                    tls: tlsOptions,
                });
            }
            else {
                this.natsConnection = await (0, nats_1.connect)({
                    servers: this.configuration.DESTINATION_TRANSPORT_URL,
                });
            }
            this.loggerService?.log('NATS connection established', NatsRelayPlugin.name);
        }
        catch (error) {
            this.loggerService?.error(`Error connecting to NATS: ${JSON.stringify(this.natsConnection?.info, null, 4)}`, NatsRelayPlugin.name);
        }
    }
    async relay(data) {
        let apmTransaction = null;
        try {
            apmTransaction = this.apm.startTransaction(NatsRelayPlugin.name);
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
            this.natsConnection?.publish(this.configuration.PRODUCER_STREAM, payload);
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