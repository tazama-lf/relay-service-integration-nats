"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const dotenv = tslib_1.__importStar(require("dotenv"));
const path_1 = tslib_1.__importDefault(require("path"));
dotenv.config({
    path: path_1.default.resolve(__dirname, '../.env'),
});
const config = {
    serverUrl: process.env.DESTINATION_TRANSPORT_URL ?? 'tls://localhost:4223',
    subject: process.env.PRODUCER_STREAM ?? 'example.subject',
    ca: process.env.NATS_TLS_CA,
};
exports.default = config;
//# sourceMappingURL=config.js.map