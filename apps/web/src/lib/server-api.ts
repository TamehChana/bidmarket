import { buildApp } from "@bidmarket/api/app";
import type { FastifyInstance } from "fastify";

let appPromise: Promise<FastifyInstance> | null = null;

export function getApp() {
  if (!appPromise) {
    appPromise = buildApp().catch((error) => {
      appPromise = null;
      throw error;
    });
  }
  return appPromise;
}
