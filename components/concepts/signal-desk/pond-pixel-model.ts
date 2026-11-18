import type { PondWorldFrame as SharedPondWorldFrame } from "./pond-shared-model.ts";

export * from "./pond-shared-model.ts";

export type PondWorldFrame = SharedPondWorldFrame & {
  debug: {
    seed: number;
  };
};
