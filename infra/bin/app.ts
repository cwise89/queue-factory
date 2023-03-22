import { App } from "aws-cdk-lib";
import { context } from "../cdk.json";
import { ExtendCFDeployRole } from "../lib/ExtendCFDeployRole";
import * as fs from "fs";
import { FSQueue, Props } from "../lib/FSQueue";
import { HandlerConfig } from "../types";

const { appId, cfxDeployRoleStackId } = context;
const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.AWS_REGION;

const app = new App();

export const mergeConfig = (
  config: HandlerConfig,
  defaultConfig: Props
): Props => {
  return {
    blueGreenConfig: {
      ...defaultConfig.blueGreenConfig,
      ...config.blueGreenConfig,
    },
    lambdaConfig: {
      ...defaultConfig.lambdaConfig,
      ...config.lambdaConfig,
    },
    datadogConfig: defaultConfig.datadogConfig,
    featureFlagConfig: defaultConfig.featureFlagConfig,
    legacyApiRoleArn: defaultConfig.legacyApiRoleArn,
    handlerEnvironment: config.handlerEnvironment,
    dlqDestinationConfig: config.dlqDestinationConfig,
  };
};

// create a stack for extending the CF deploy role
new ExtendCFDeployRole(app, `${appId}-${cfxDeployRoleStackId}`, {
  appId,
  cfExecutionRoleArn: `cdk-${appId}-cfn-exec-role-${account}-${region}`,
});

// create a queue stack for every directory in the handlers directory.
fs.readdirSync("./handlers").forEach((handler) => {
  // grab the config file from the handler directory.
  const handlerConfig: HandlerConfig = require(`./handlers/${handler}/config.json`);

  new FSQueue(app, `${appId}-${handler}`, mergeConfig(handlerConfig, context));
});
