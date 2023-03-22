export interface HandlerConfig {
  tags?: { [key: string]: string };
  blueGreenConfig?: {
    enabled?: boolean;
    deploymentStrategy?: string;
  };
  handlerEnvironment?: { [key: string]: string };
  dlqDestinationConfig?: {
    transformer?: {};
    sqsArn?: string;
  };
  lambdaConfig?: {
    timeout?: number;
    memorySize?: number;
  };
}
