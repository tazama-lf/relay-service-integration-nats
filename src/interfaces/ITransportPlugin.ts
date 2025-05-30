export interface ITransportPlugin {
  init: () => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  relay: (data: any) => Promise<void>;
}
