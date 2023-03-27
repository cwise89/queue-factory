import { CfnOutput, Duration, Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Repository } from "aws-cdk-lib/aws-ecr";
import { ArnPrincipal, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { DockerImageCode, DockerImageFunction } from "aws-cdk-lib/aws-lambda";
import { blueGreenLambdaDeployment } from "./blueGreenLambdaDeployment";
import { DlqDestinationConfig, createPipe } from "./createPipe";

export interface Props {
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
    lambdaRepoName: string;
    lambdaImageTag: string;
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

export class FSQueue extends Stack {
  public readonly dlq: Queue;
  public readonly standardQueue: Queue;
  public readonly lambda: DockerImageFunction;

  constructor(
    scope: Construct,
    id: string,
    props: Props,
    appId: string,
    handlerId: string
  ) {
    super(scope, id);

    const {
      lambdaConfig,
      blueGreenConfig,
      datadogConfig,
      legacyApiRoleArn,
      dlqDestinationConfig,
    } = props;

    const { lambdaImageTag, lambdaRepoName, timeout, memorySize } =
      lambdaConfig;

    // Create Dead Letter Queue
    this.dlq = new Queue(this, "Dlq");

    // Create standard queue
    this.standardQueue = new Queue(this, "StandardQueue", {
      deadLetterQueue: {
        // TODO: make the parameter configurable
        maxReceiveCount: 5,
        queue: this.dlq,
      },
    });

    if (dlqDestinationConfig) {
      createPipe(this, this.dlq.queueArn, dlqDestinationConfig, appId);
    }

    new CfnOutput(this, `${appId}${handlerId}queuearn`, {
      value: this.standardQueue.queueArn,
      exportName: `${appId}${handlerId}queuearn`
        .toLowerCase()
        .replace(/-/g, ""),
    });

    // Creates lambda
    this.lambda = new DockerImageFunction(this, "Lambda", {
      timeout: Duration.seconds(timeout),
      memorySize: memorySize,
      code: DockerImageCode.fromEcr(
        Repository.fromRepositoryName(this, `Image`, lambdaRepoName),
        {
          tagOrDigest: lambdaImageTag,
        }
      ),
      environment: {
        DLQ_URL: this.dlq.queueUrl,
        CLOUDWATCH_NAME_SPACE: blueGreenConfig.cloudWatchNameSpace,
        CLOUDWATCH_METRIC_NAME: blueGreenConfig.cloudWatchMetricName,
        CLOUDWATCH_DIMENSION_NAME: blueGreenConfig.cloudWatchDimensionName,
        DD_ENV: datadogConfig.environment,
        DD_VERSION: datadogConfig.version,
        DD_SITE: datadogConfig.site,
        DD_LAMBDA_HANDLER: datadogConfig.lambdaHandler,
        DD_SERVICE: datadogConfig.service,
        DD_API_KEY_SECRET_ARN: datadogConfig.secretArn,
      },
    });

    // Allows lambda to send message to DLQ
    this.lambda.addToRolePolicy(
      new PolicyStatement({
        sid: "sqsPermissions",
        actions: ["sqs:SendMessage"],
        resources: [this.dlq.queueArn],
      })
    );

    // Add cloudwatch:PutMetricData permissions
    this.lambda.addToRolePolicy(
      new PolicyStatement({
        sid: "cloudWatchPermissions",
        actions: ["cloudwatch:PutMetricData"],
        resources: [`*`],
        conditions: {
          StringEquals: {
            "cloudwatch:namespace": `${blueGreenConfig.cloudWatchNameSpace}`,
          },
        },
      })
    );

    this.lambda.addToRolePolicy(
      new PolicyStatement({
        sid: "dataDogSecret",
        actions: ["secretsmanager:GetSecretValue"],
        resources: [datadogConfig.secretArn],
      })
    );

    this.standardQueue.addToResourcePolicy(
      new PolicyStatement({
        sid: "__sender_statement",
        principals: [new ArnPrincipal(legacyApiRoleArn)],
        actions: ["SQS:SendMessage"],
        resources: ["*"],
      })
    );

    // Hook up queue to lambda
    const eventSource = new SqsEventSource(this.standardQueue, {
      // TODO: make this parameterized
      batchSize: 1,
    });

    this.lambda.addEventSource(eventSource);

    // Blue/Green Deployment
    let deploymentStrategy: string;

    if (blueGreenConfig.enabled == false) {
      // ignore blue/green and deploy all.
      deploymentStrategy = "ALL_AT_ONCE";
    } else if (blueGreenConfig.deploymentStrategy) {
      // Use what is configured in cdk.json.
      deploymentStrategy = blueGreenConfig.deploymentStrategy;
    } else {
      // Use default.
      deploymentStrategy = "LINEAR_10PERCENT_EVERY_2MINUTES";
    }

    // Add Blue/Green deployment strategy to lambda.
    blueGreenLambdaDeployment(this, "BlueGreen", {
      cloudWatchMetricName: blueGreenConfig.cloudWatchMetricName,
      cloudWatchNameSpace: blueGreenConfig.cloudWatchNameSpace,
      lambda: this.lambda,
      deploymentStrategy,
      dimensionName: blueGreenConfig.cloudWatchDimensionName,
      dimensionValue: this.lambda.functionName,
    });
  }
}
