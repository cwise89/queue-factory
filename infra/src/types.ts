// External Imports
import { StackProps } from 'aws-cdk-lib';

export interface InfraProps {
	blueGreenConfig: {
		enabled: boolean;
		deploymentStrategy?: string;
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
	};
	featureFlagConfig: FeatureFlagsProps;
	legacyApiRoleArn: string;
}

export interface ApplicationProps extends StackProps {
	infraProps: InfraProps;
	qualifier: string;
	stackId: string;
}

export interface FeatureFlagsProps {
	applicationName: string;
	environmentName: string;
	configProfileName: string;
	deployStrategyName: string;
}
