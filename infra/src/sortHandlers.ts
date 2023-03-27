import { HandlerConfig } from "../types";
import * as fs from "fs";
import * as path from "path";

export type SortedHandlers = {
  id: string;
  config: HandlerConfig;
}[];

export const sortHandlers = (): SortedHandlers => {
  return fs
    .readdirSync(path.join(__dirname, "../../handlers/npm"))
    .map((handlerName) => {
      const configFile = require(path.join(
        __dirname,
        `../../handlers/npm/${handlerName}/config.ts`
      ));

      const config: HandlerConfig = configFile.config;

      return {
        id: handlerName,
        config,
      };
    })
    .sort((a, b) => {
      const aDependsOnB =
        a.config.dlqDestinationConfig?.targetSQSArn.startsWith("$") &&
        a.config.dlqDestinationConfig?.targetSQSArn.slice(2) === b.id;

      const bDependsOnA =
        b.config.dlqDestinationConfig?.targetSQSArn.startsWith("$") &&
        b.config.dlqDestinationConfig?.targetSQSArn.slice(2) === a.id;

      if (aDependsOnB) {
        return 1;
      } else if (bDependsOnA) {
        return -1;
      } else {
        return 0;
      }
    });
};
