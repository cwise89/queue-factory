// External Imports
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { PolicyStatement, Policy, Role } from "aws-cdk-lib/aws-iam";

interface Props extends StackProps {
  appId: string;
  cfExecutionRoleArn: string;
}

// TODO: there only needs to be one of these for the entire account.
export class ExtendCFDeployRole extends Stack {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    const { account, region } = this;
    const { appId, cfExecutionRoleArn } = props;

    const statements = [
      new PolicyStatement({
        sid: "BlueGreenPermissions",
        actions: [
          "codedeploy:CreateApplication",
          "codedeploy:DeleteApplication",
          "codedeploy:CreateDeploymentGroup",
          "codedeploy:DeleteDeploymentGroup",
          "codedeploy:CreateDeployment",
          "codedeploy:GetDeploymentConfig",
          "codedeploy:RegisterApplicationRevision",
          "codedeploy:GetDeployment",
          "codedeploy:GetApplicationRevision",
          "codedeploy:GetDeploymentGroup",
          "codedeploy:UpdateDeploymentGroup",
          "cloudwatch:PutMetricAlarm",
          "cloudwatch:DeleteAlarms",
          "logs:DescribeMetricFilters",
          "logs:DeleteMetricFilter",
          "logs:DescribeMetricFilters",
          "logs:PutMetricFilter",
          "lambda:ListVersionsByFunction",
          "lambda:PublishVersion",
          "lambda:CreateAlias",
          "lambda:DeleteAlias",
          "lambda:UpdateFunctionCode",
          "lambda:ListTags",
          "lambda:GetAlias",
          "lambda:CreateTags",
          "lambda:DeleteTags",
        ],
        resources: [
          `arn:aws:cloudwatch:${region}:${account}:alarm:${appId}*`,
          `arn:aws:codedeploy:${region}:${account}:application:${appId}*`,
          `arn:aws:codedeploy:${region}:${account}:deploymentgroup:${appId}*`,
          `arn:aws:codedeploy:${region}:${account}:deploymentconfig:CodeDeployDefault.*`,
          `arn:aws:logs:${region}:${account}:log-group:/aws/lambda/${appId}*:log-stream:`,
          `arn:aws:lambda:${region}:${account}:function:${appId}*`,
        ],
      }),
      new PolicyStatement({
        sid: "sqsPermissions",
        actions: ["sqs:*"],
        resources: [`arn:aws:sqs:${region}:${account}:${appId}*`],
      }),
      new PolicyStatement({
        sid: "lambdaPermissions",
        actions: [
          "lambda:DeleteFunction",
          "lambda:CreateFunction",
          "lambda:TagResource",
          "lambda:GetFunction",
          "lambda:UpdateFunctionConfiguration",
          "lambda:UntagResource",
        ],
        resources: [`arn:aws:lambda:${region}:${account}:function:${appId}*`],
      }),
      new PolicyStatement({
        sid: "iamPermissions",
        actions: ["iam:PassRole"],
        resources: [`arn:aws:iam::${account}:role/${appId}*`],
      }),
      new PolicyStatement({
        sid: "eventMappingPermissions",
        actions: [
          "lambda:CreateEventSourceMapping",
          "lambda:DeleteEventSourceMapping",
          "lambda:GetEventSourceMapping",
        ],
        resources: ["*"],
      }),
    ];

    Role.fromRoleArn(
      this,
      "CFExecutionRole",
      cfExecutionRoleArn
    ).attachInlinePolicy(
      new Policy(this, id, {
        policyName: `${appId}-deployment-permissions`,
        statements,
      })
    );
  }
}
