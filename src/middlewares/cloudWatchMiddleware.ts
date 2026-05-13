import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import type { Request, Response, NextFunction } from "express";
import { shouldSkipHeavyObservability } from "./observabilityPaths";

const cw = new CloudWatchClient({ region: process.env.AWS_REGION || "us-east-1" });

const metricsEnabled =
  process.env.CLOUDWATCH_METRICS_ENABLED !== "false" &&
  process.env.CLOUDWATCH_METRICS_ENABLED !== "0";

export function latencyMetric(req: Request, res: Response, next: NextFunction) {
  if (!metricsEnabled || shouldSkipHeavyObservability(req)) {
    return next();
  }

  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - start) / 1_000_000;

    const endpoint = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path;

    void cw.send(new PutMetricDataCommand({
      Namespace: "Kikiri/API",
      MetricData: [
        {
          MetricName: "RequestLatencyMs",
          Unit: "Milliseconds",
          Value: ms,
          Dimensions: [
            { Name: "Endpoint", Value: endpoint },
            { Name: "Method", Value: req.method }
          ]
        },
        {
          MetricName: "RequestCount",
          Unit: "Count",
          Value: 1,
          Dimensions: [
            { Name: "Endpoint", Value: endpoint },
            { Name: "Method", Value: req.method }
          ]
        }
      ]
    })).catch(() => {});
  });

  next();
}