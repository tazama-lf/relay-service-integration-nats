export interface ITransportPlugin {
    init: () => Promise<void>;
    relay: (data: any) => Promise<void>;
}
