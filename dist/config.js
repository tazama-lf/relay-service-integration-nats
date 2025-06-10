"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.additionalEnvironmentVariables = void 0;
const tslib_1 = require("tslib");
// SPDX-License-Identifier: Apache-2.0
const dotenv = tslib_1.__importStar(require("dotenv"));
const path_1 = tslib_1.__importDefault(require("path"));
dotenv.config({
    path: path_1.default.resolve(__dirname, '../.env'),
});
exports.additionalEnvironmentVariables = [
    {
        name: 'DESTINATION_TRANSPORT_URL',
        type: 'string',
    },
    {
        name: 'PRODUCER_STREAM',
        type: 'string',
    },
    {
        name: 'NATS_TLS_CA',
        type: 'string',
        optional: true,
    },
];
//# sourceMappingURL=config.js.map