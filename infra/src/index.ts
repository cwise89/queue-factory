import { App } from "aws-cdk-lib";
import { context as defaultConfig } from "../cdk.json";
import { ExtendCFDeployRole } from "./ExtendCFDeployRole";
import { createQueues } from "./createQueues";
import { sortHandlers } from "./sortHandlers";

const { appId } = defaultConfig;

// grab the accountId from ENV variable. CDK sets this ENV based on the aws credentials.
const account = process.env.CDK_DEFAULT_ACCOUNT;
if (!account)
  throw new Error(
    "CDK_DEFAULT_ACCOUNT is not set. Make sure you have credentials set."
  );

// grab the region from ENV variable.
const region = process.env.AWS_REGION;
if (!region) throw new Error("AWS_REGION is not set.");

const app = new App();

// create a stack for extending the CF deploy role. This extends the base cdk deploy role with permissions to create all the necessary infra with least privilege.
const execPolicy = new ExtendCFDeployRole(
  app,
  `${appId}-${defaultConfig.cfxDeployRoleStackId}`,
  {
    appId,
    cfExecutionRoleArn: `arn:aws:iam::${account}:role/cdk-${defaultConfig["@aws-cdk/core:bootstrapQualifier"]}-cfn-exec-role-${account}-${region}`,
  }
);

// sort handlers directory so that the queues are created in the correct order- if one queue depends on another using "$_handlerDirName"
const sortedHandlers = sortHandlers();

// create a queue stack for every directory in the handlers directory.
createQueues(sortedHandlers, app, appId, defaultConfig, execPolicy);
