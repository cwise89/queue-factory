// TODO: replace with relative path
import { HandlerConfig } from "../../../infra/types";

export const config: HandlerConfig = {
  dlqDestinationConfig: {
    transformer: {
      input: {
        foo: "bar",
        raz: "<$.body>",
      },
      destination: {
        type: "sqs",
        queueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/MyQueue",
      },
    },
  },
};
