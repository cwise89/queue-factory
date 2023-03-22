import { Construct } from "constructs";
import { Duration, Stack } from "aws-cdk-lib";
import { Alias, DockerImageFunction, Function } from "aws-cdk-lib/aws-lambda";
import {
  Alarm,
  ComparisonOperator,
  Metric,
  Unit,
} from "aws-cdk-lib/aws-cloudwatch";
import {
  ILambdaDeploymentConfig,
  LambdaDeploymentConfig,
  LambdaDeploymentGroup,
} from "aws-cdk-lib/aws-codedeploy";

// Types specific for Blue/Green.
type DeploymentStrategy = {
  [key in string]: ILambdaDeploymentConfig;
};

/**
 * Available strategies for blue/green deployments.
 *
 * @see https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-configurations.html#deployment-configuration-lambda
 *
 * @default - LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_2MINUTES
 *
 * @resource AWS::CodeDeploy::DeploymentConfig
 *
 */
interface Props {
  /**
   * Lamba Function to use Blue/Green Deployment on.
   * @type DockerImageFunction | Function
   */
  lambda: DockerImageFunction | Function;

  /**
   * The namespace for logs.
   * @type string
   * @example DialplanDataAccess/Lambda
   */
  cloudWatchNameSpace: string;

  /**
   * Blue/Green deployment configuration.
   * @type string
   * @default LINEAR_10PERCENT_EVERY_2MINUTES
   */
  deploymentStrategy: string;

  /**
   * How the alarm compares against metrics.
   * @type ComparisonOperator
   * @default GREATER_THAN_OR_EQUAL_TO_THRESHOLD
   */
  alarmComparisonOperator?: ComparisonOperator;

  /**
   * The name of the Lambda Alias to shift traffic. Updating the version of the alias will trigger a CodeDeploy deployment.
   * @type string
   * @default "prod"
   */
  aliasName?: string;

  /**
   * The value against which the specified statistic is compared to trigger the alarm.
   * @type number
   * @default 1
   */
  alarmThreshold?: number;

  /**
   * The number of periods over which data is compared to the specified threshold. This is not the time interval between metric collection.
   * @type number
   * @default 1
   */
  alarmEvalPeriod?: number;

  /**
   * The period in minutes.
   * @type number
   * @default 1 minutes
   * @see https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html#CloudWatchPeriods
   */
  alarmMetricPollPeriod?: number;

  /**
   * The name of the metric you are creating.
   * @type string
   * @example CAUGHT_ERRORS
   */
  cloudWatchMetricName: string;

  /**
   * The name of the dimension.
   * @type string
   * @example DIALPLAN_DATA_ACCESS_LAMBDA
   */
  dimensionName: string;

  /**
   * The value of the dimension.
   * @type string
   * @example ERRORS
   */
  dimensionValue: string;
}

export class BlueGreenLambdaDeployment {
  constructor(scope: Construct, id: string, props: Props) {
    const {
      lambda,
      deploymentStrategy,
      alarmComparisonOperator,
      aliasName,
      alarmThreshold,
      alarmEvalPeriod,
      alarmMetricPollPeriod,
      dimensionName,
      dimensionValue,
      cloudWatchNameSpace,
      cloudWatchMetricName,
    } = props;

    const stack = Stack.of(scope);

    const version = lambda.currentVersion;

    const alias = new Alias(scope, `${id}Alias`, {
      aliasName: aliasName || "prod",
      version,
    });

    const deploymentStrategyOptions: DeploymentStrategy = {
      ALL_AT_ONCE: LambdaDeploymentConfig.ALL_AT_ONCE,
      CANARY_10PERCENT_30MINUTES:
        LambdaDeploymentConfig.CANARY_10PERCENT_30MINUTES,
      CANARY_10PERCENT_15MINUTES:
        LambdaDeploymentConfig.CANARY_10PERCENT_15MINUTES,
      CANARY_10PERCENT_10MINUTES:
        LambdaDeploymentConfig.CANARY_10PERCENT_10MINUTES,
      CANARY_10PERCENT_5MINUTES:
        LambdaDeploymentConfig.CANARY_10PERCENT_5MINUTES,
      LINEAR_10PERCENT_EVERY_10MINUTES:
        LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_10MINUTES,
      LINEAR_10PERCENT_EVERY_3MINUTES:
        LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_3MINUTES,
      LINEAR_10PERCENT_EVERY_2MINUTES:
        LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_2MINUTES,
      LINEAR_10PERCENT_EVERY_1MINUTE:
        LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
    };

    const deploymentGroup = new LambdaDeploymentGroup(scope, `${id}BGDeploy`, {
      alias: alias,
      deploymentConfig:
        deploymentStrategyOptions[deploymentStrategy] ||
        LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_2MINUTES,
    });

    const metric = new Metric({
      account: stack.account,
      region: stack.region,
      namespace: cloudWatchNameSpace,
      metricName: cloudWatchMetricName,
      dimensionsMap: { [dimensionName]: dimensionValue },
      unit: Unit.COUNT,
      period: Duration.minutes(alarmMetricPollPeriod || 1),
      statistic: "Sum",
    });

    const errorLogAlarm = new Alarm(scope, `${id}BlueGreenErrorAlarm`, {
      comparisonOperator:
        alarmComparisonOperator ||
        ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      threshold: alarmThreshold || 1,
      evaluationPeriods: alarmEvalPeriod || 1,
      metric,
    });

    deploymentGroup.addAlarm(errorLogAlarm);
  }
}
