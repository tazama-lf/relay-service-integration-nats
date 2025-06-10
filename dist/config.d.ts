import type { AdditionalConfig, ProcessorConfig } from '@tazama-lf/frms-coe-lib/lib/config/processor.config';
export interface ExtendedConfig {
    DESTINATION_TRANSPORT_URL: string;
    PRODUCER_STREAM: string;
    NATS_TLS_CA?: string;
}
export declare const additionalEnvironmentVariables: AdditionalConfig[];
export type Configuration = ProcessorConfig & ExtendedConfig;
