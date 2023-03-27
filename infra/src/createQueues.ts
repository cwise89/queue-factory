import { mergeConfig } from "./mergeConfig";
import { FSQueue } from "./FSQueue";
import type { App } from "aws-cdk-lib";
import type { Construct } from "constructs";
import type { DefaultConfig } from "../types";
import type { SortedHandlers } from "./sortHandlers";

export const createQueues = (
  sortedHandlers: SortedHandlers,
  app: App,
  appId: string,
  context: DefaultConfig,
  execPolicy: Construct
) => {
  sortedHandlers.forEach((handler) => {
    const { config, id } = handler;
    /*
        grab the sha tag from the environment variables. This will be set by the script deploying the image to ecr.
        for example, the github action will set this variable.
        */
    const handlerTagReference = `HANDLER_IMAGE_SHA_TAG_${id
      .toUpperCase()
      .replace(/-/g, "_")}`;
    const lambdaImageShaTag = process.env[handlerTagReference];

    if (!lambdaImageShaTag)
      console.warn(
        `{WARNING] Missing env var ${handlerTagReference}, reverting to use "latest" tag for image.`
      );

    const queueStack = new FSQueue(
      app,
      `${appId}-${id}`,
      mergeConfig(
        config,
        context,
        `${appId}/${handler}`,
        lambdaImageShaTag || "latest"
      ),
      appId,
      id
    );

    // use cdk to make sure cfx policy stack is created before the queue stack
    queueStack.node.addDependency(execPolicy);
  });
};
