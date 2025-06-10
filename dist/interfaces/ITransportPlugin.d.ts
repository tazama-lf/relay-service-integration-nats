export interface ITransportPlugin {
    init: () => Promise<void>;
    relay: (data: Uint8Array | string) => Promise<void>;
}
