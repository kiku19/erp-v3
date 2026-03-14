function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function bool(key: string, fallback: boolean): boolean {
  const value = process.env[key];
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1";
}

interface Env {
  readonly DATABASE_URL: string;
  readonly JWT_ACCESS_SECRET: string;
  readonly JWT_REFRESH_SECRET: string;
  readonly NODE_ENV: "development" | "production" | "test";
  readonly CI: boolean;
}

function lazyEnv<T>(getter: () => T): { get: () => T } {
  return { get: getter };
}

const envDefs = {
  DATABASE_URL: lazyEnv(() => required("DATABASE_URL")),
  JWT_ACCESS_SECRET: lazyEnv(() => required("JWT_ACCESS_SECRET")),
  JWT_REFRESH_SECRET: lazyEnv(() => required("JWT_REFRESH_SECRET")),
  NODE_ENV: lazyEnv(
    () => optional("NODE_ENV", "development") as Env["NODE_ENV"],
  ),
  CI: lazyEnv(() => bool("CI", false)),
};

export const env = Object.defineProperties(
  {} as Env,
  Object.fromEntries(
    Object.entries(envDefs).map(([key, def]) => [
      key,
      { get: def.get, enumerable: true },
    ]),
  ),
);

export type { Env };
