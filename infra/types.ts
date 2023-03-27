import { DlqDestinationConfig } from "./src/createPipe";

export interface HandlerConfig {
  tags?: { [key: string]: string };
  blueGreenConfig?: {
    enabled?: boolean;
    deploymentStrategy?: string;
  };
  handlerEnvironment?: { [key: string]: string };
  dlqDestinationConfig?: DlqDestinationConfig;
  lambdaConfig?: {
    timeout?: number;
    memorySize?: number;
  };
}

export interface DefaultConfig {
  blueGreenConfig: {
    enabled: boolean;
    deploymentStrategy: string;
    cloudWatchNameSpace: string;
    cloudWatchMetricName: string;
    cloudWatchDimensionName: string;
  };
  datadogConfig: {
    environment: string;
    version: string;
    service: string;
    secretArn: string;
    site: string;
    lambdaHandler: string;
  };
  lambdaConfig: {
    timeout: number;
    memorySize: number;
  };
  featureFlagConfig: {
    applicationName: string;
    environmentName: string;
    configProfileName: string;
    deployStrategyName: string;
  };
  legacyApiRoleArn: string;
  handlerEnvironment?: {
    [key: string]: string;
  };
  dlqDestinationConfig?: DlqDestinationConfig;
}
