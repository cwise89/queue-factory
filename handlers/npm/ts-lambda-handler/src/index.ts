// External Imports
import axios from 'axios';
import 'source-map-support';
import tracer from 'dd-trace';
import { CloudWatch, SQS } from 'aws-sdk';
import type { SQSHandler } from 'aws-lambda';

// Initialize DataDog tracer.
tracer.init({
	logInjection: true,
});

import { createLogger, format, transports, Logger } from 'winston';

// Inizialize Winston logger.
export const logger = createLogger({
	format: format.json(),
	transports: [new transports.Console()],
});

const sqs = new SQS({ region: process.env.AWS_REGION });
const cloudWatch = new CloudWatch({ region: process.env.AWS_REGION });

// Setup variables needed.
if (!process.env.CLOUDWATCH_NAME_SPACE)
	throw new Error('CloudWatch Name Space ENV var not provided.');

const cloudWatchNameSpace = process.env.CLOUDWATCH_NAME_SPACE;

if (!process.env.CLOUDWATCH_METRIC_NAME)
	throw new Error('CloudWatch Metric Name ENV var not provided.');

const cloudWatchMetricName = process.env.CLOUDWATCH_METRIC_NAME;

if (!process.env.CLOUDWATCH_DIMENSION_NAME)
	throw new Error('CloudWatch Dimension Name ENV var not provided.');

const cloudWatchDimensionName = process.env.CLOUDWATCH_DIMENSION_NAME;

export const cloudWatchPut = async (
	cloudWatch: CloudWatch,
	config: {
		nameSpace: string;
		dimensionName: string;
		dimensionValue: string;
		metricName: string;
		logger: Logger;
	}
) => {
	const { nameSpace, dimensionName, dimensionValue, metricName, logger } =
		config;
	logger.info(`Putting CloudWatch error metric.`);

	const putMetric = await cloudWatch
		.putMetricData({
			Namespace: nameSpace,
			MetricData: [
				{
					MetricName: metricName,
					Dimensions: [
						{
							Name: dimensionName,
							Value: dimensionValue,
						},
					],
					Unit: 'Count',
					Value: 1,
					Timestamp: new Date(),
				},
			],
		})
		.promise();

	if (putMetric.$response.error) {
		logger.error(
			`Error putting CloudWatch error message ${putMetric.$response.error}`
		);
		return;
	}

	logger.error(`Successfully put CloudWatch error metric.`);
	return;
};

export const sendMessageToDLQ = async (message: string, dlqUrl: string) => {
	const params = {
		MessageBody: message,
		QueueUrl: dlqUrl,
	};

	await sqs.sendMessage(params).promise();
};

export const handler: SQSHandler = async (event, context) => {
	try {
		// parse message body
		const { retryOnStatus, ...config } = JSON.parse(event.Records[0].body);

		logger.info('Sending request with config: ', JSON.stringify(config));

		// create a generic axios request from the config passed in the sqs message
		const response = await axios(config);

		// check to see if it is a server error, if so let's throw so retry behavior can be handled by SQS
		if (response.status >= 500) {
			logger.error(JSON.stringify(response));
			throw new Error(`Request failed with status code ${response.status}`);
		}

		// check to see if status code is in array of retryOnStatus codes, if so let's throw so retry behavior can be handled by SQS
		if (retryOnStatus?.includes(response.status)) {
			logger.info(
				`response status code: ${response.status} is in retryOnStatus array, so throwing error for retry`
			);
			throw new Error(`Request failed with status code ${response.status}`);
		}

		// don't retry on non transient errors, just throw them straight in DLQ
		if (response.status >= 300 && response.status < 500) {
			logger.error(
				`Putting message on DLQ since statusCode is less than 500. Status code: ${response.status}`
			);

			// Put cloudwatch error.
			await cloudWatchPut(cloudWatch, {
				nameSpace: cloudWatchNameSpace,
				metricName: cloudWatchMetricName,
				dimensionName: cloudWatchDimensionName,
				dimensionValue: context.functionName,
				logger,
			});

			const dlqUrl = process.env.DLQ_URL;
			if (!dlqUrl) throw new Error('DLQ_URL env var not set');

			await sendMessageToDLQ(event.Records[0].body, dlqUrl);

			return;
		}

		return;
	} catch (error) {
		logger.error('Handler Error: ', error);
		// this will trigger sqs lambda retry strategy.
		throw error;
	}
};
