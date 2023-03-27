import { Props } from "./FSQueue";
import { DefaultConfig, HandlerConfig } from "../types";

export const mergeConfig = (
  config: HandlerConfig,
  defaultConfig: DefaultConfig,
  lambdaRepoName: string,
  lambdaImageTag: string
): Props => {
  return {
    blueGreenConfig: {
      ...defaultConfig.blueGreenConfig,
      ...config.blueGreenConfig,
    },
    lambdaConfig: {
      ...defaultConfig.lambdaConfig,
      ...config.lambdaConfig,
      lambdaRepoName,
      lambdaImageTag,
    },
    datadogConfig: defaultConfig.datadogConfig,
    featureFlagConfig: defaultConfig.featureFlagConfig,
    legacyApiRoleArn: defaultConfig.legacyApiRoleArn,
    handlerEnvironment: config.handlerEnvironment,
    dlqDestinationConfig: config.dlqDestinationConfig,
  };
};
