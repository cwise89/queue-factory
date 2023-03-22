// TODO: replace with relative path
import { HandlerConfig } from "../../infra/types";

export const config: HandlerConfig = {
  tags: {
    project: "bria-sms",
    component: "bria",
  },
  blueGreenConfig: {
    enabled: false,
    deploymentStrategy: "LINEAR_10PERCENT_EVERY_2MINUTES",
  },
  lambdaConfig: {
    timeout: 30,
    memorySize: 256,
  },
  handlerEnvironment: {
    FOO: "bar",
  },
  dlqDestinationConfig: {
    transformer: {},
    sqsArn: "foo",
  },
};
