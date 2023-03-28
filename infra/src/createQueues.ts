import { mergeConfig } from "./mergeConfig";
import { FSQueue } from "./FSQueue";
import type { App } from "aws-cdk-lib";
import * as path from "path";
import type { Construct } from "constructs";
import type { DefaultConfig } from "../types";
import type { SortedHandlers } from "./sortHandlers";

export const createQueues = (
  sortedHandlers: SortedHandlers,
  app: App,
  appId: string,
  defaultConfig: DefaultConfig,
  execPolicy: Construct
) => {
  sortedHandlers.forEach((handler) => {
    const { config, id } = handler;
    // grab the image tag and repo name from the <handler id>/deploy.out.json file.
    const {
      imageTag,
      repoName,
    }: {
      imageTag: string;
      repoName: string;
    } = require(path.join(
      __dirname,
      `../../handlers/npm/${handler.id}/deploy.out.json.ts`
    ));

    if (!repoName)
      throw new Error(`{WARNING] Missing deploy.out.json["repoName"]`);

    if (!imageTag)
      console.warn(
        `{WARNING] Missing deploy.outjson["imageTag"], reverting to use "latest" tag for image.`
      );

    const queueStack = new FSQueue(
      app,
      `${appId}-${id}`,
      mergeConfig(config, defaultConfig, repoName, imageTag || "latest"),
      appId,
      id
    );

    // use cdk to make sure cfx policy stack is created before the queue stack
    queueStack.node.addDependency(execPolicy);
  });
};
