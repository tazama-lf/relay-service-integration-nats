// SPDX-License-Identifier: Apache-2.0
import * as dotenv from 'dotenv';
import path from 'node:path';
import type { AdditionalConfig, ProcessorConfig } from '@tazama-lf/frms-coe-lib/lib/config/processor.config';

dotenv.config({
  path: path.resolve(__dirname, '../.env'),
});

export interface ExtendedConfig {
  DESTINATION_TRANSPORT_URL: string;
  PRODUCER_STREAM: string;
  DESTINATION_NATS_AUTHENTICATED?: boolean;
  DESTINATION_NATS_CERTIFICATE_AUTHORITY_PATH?: string;
  DESTINATION_NATS_CLIENT_CERT_PATH?: string;
  DESTINATION_NATS_CLIENT_KEY_PATH?: string;
}

export const additionalEnvironmentVariables: AdditionalConfig[] = [
  {
    name: 'DESTINATION_TRANSPORT_URL',
    type: 'string',
  },
  {
    name: 'PRODUCER_STREAM',
    type: 'string',
  },
  {
    name: 'DESTINATION_NATS_AUTHENTICATED',
    type: 'boolean',
    optional: true,
  },
  {
    name: 'DESTINATION_NATS_CERTIFICATE_AUTHORITY_PATH',
    type: 'string',
    optional: true,
  },
  {
    name: 'DESTINATION_NATS_CLIENT_CERT_PATH',
    type: 'string',
    optional: true,
  },
  {
    name: 'DESTINATION_NATS_CLIENT_KEY_PATH',
    type: 'string',
    optional: true,
  },
];

export type Configuration = ProcessorConfig & ExtendedConfig;
