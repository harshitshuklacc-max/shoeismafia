declare module "qz-tray" {
  interface QzWebsocketConnectOptions {
    retries?: number;
    delay?: number;
  }

  interface QzPrintJob {
    type: string;
    format: string;
    flavor: string;
    data: string;
  }

  interface QzConfig {
    // opaque printer config from qz.configs.create
  }

  interface QzWebsocket {
    isActive(): boolean;
    connect(options?: QzWebsocketConnectOptions): Promise<void>;
  }

  interface QzPrinters {
    find(): Promise<string[]>;
  }

  interface QzConfigs {
    create(printerName: string): QzConfig;
  }

  interface QzApi {
    websocket: QzWebsocket;
    printers: QzPrinters;
    configs: QzConfigs;
    print(config: QzConfig, jobs: QzPrintJob[]): Promise<void>;
  }

  const qz: QzApi;
  export default qz;
}
