import { Fn } from "aws-cdk-lib";
import {
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { CfnPipe } from "aws-cdk-lib/aws-pipes";
import type { Construct } from "constructs";

export interface DlqDestinationConfig {
  pattern?: { [key: string]: string[] | { [key: string]: string }[] };
  inputTemplate?: { [key: string]: string };
  targetSQSArn: string;
}

export const getTargetQueueArn = (appId: string, queueArn: string) => {
  if (queueArn?.startsWith("$_")) {
    const handlerName = queueArn.replace("$_", "");

    const exportName = `${appId}${handlerName}queuearn`
      .toLowerCase()
      .replace(/-/g, "");

    return Fn.importValue(exportName);
  }

  return queueArn;
};

export const createPipe = (
  scope: Construct,
  sourceQueueArn: string,
  dlqDestinationConfig: DlqDestinationConfig,
  appId: string
) => {
  const { targetSQSArn, pattern, inputTemplate } = dlqDestinationConfig;

  const targetQueue = getTargetQueueArn(appId, targetSQSArn);

  const role = new Role(scope, "PipeRole", {
    assumedBy: new ServicePrincipal("pipes.amazonaws.com"),
    inlinePolicies: {
      sourceQueueAccess: new PolicyDocument({
        statements: [
          new PolicyStatement({
            actions: [
              "sqs:ReceiveMessage",
              "sqs:DeleteMessage",
              "sqs:GetQueueAttributes",
            ],
            resources: [sourceQueueArn],
          }),
        ],
      }),
      targetQueueAccess: new PolicyDocument({
        statements: [
          new PolicyStatement({
            actions: ["sqs:SendMessage"],
            resources: [targetQueue],
          }),
        ],
      }),
    },
  });

  new CfnPipe(scope, "Pipe", {
    description: "my test pipe",
    name: "cdk-test-pipe",
    roleArn: role.roleArn,
    source: sourceQueueArn,

    // Expose the properties below as optional for the developer to configure for their destination mapping.
    target: targetQueue,
    sourceParameters: {
      filterCriteria: {
        filters: [
          {
            pattern: JSON.stringify(pattern),
          },
        ],
      },
      sqsQueueParameters: {
        batchSize: 1,
        maximumBatchingWindowInSeconds: 30,
      },
    },
    targetParameters: {
      inputTemplate: JSON.stringify(inputTemplate),
      sqsQueueParameters: {},
    },
  });
};
