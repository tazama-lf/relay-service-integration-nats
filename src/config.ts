import * as dotenv from 'dotenv';
import path from 'path';
import type { IConfig } from './interfaces/IConfig';

dotenv.config({
  path: path.resolve(__dirname, '../.env'),
});

const config = {
  serverUrl: process.env.DESTINATION_TRANSPORT_URL ?? 'tls://localhost:4223',
  subject: process.env.PRODUCER_STREAM ?? 'example.subject',
  ca: process.env.NATS_TLS_CA,
};

export default config as IConfig;
