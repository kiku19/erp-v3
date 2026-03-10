import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import jsYaml from "js-yaml";

/**
 * GET /api/docs
 *
 * Serves Swagger UI with a merged OpenAPI spec built from all files in openapi/.
 * DISABLED in production — returns 404.
 */
export async function GET(_request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const spec = buildMergedSpec();
  const specJson = JSON.stringify(spec);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      spec: ${specJson},
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
      deepLinking: true,
    });
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// ---------------------------------------------------------------------------
// Merge all YAML spec files from openapi/ into a single OpenAPI 3.0 object
// ---------------------------------------------------------------------------

function buildMergedSpec(): Record<string, unknown> {
  const openApiDir = path.join(process.cwd(), "openapi");

  const base: Record<string, unknown> = {
    openapi: "3.0.3",
    info: { title: "ERP Backend API", version: "0.1.0" },
    paths: {},
    components: { schemas: {}, responses: {}, securitySchemes: {} },
  };

  if (!fs.existsSync(openApiDir)) return base;

  // Recursively find all YAML files in openapi directory and subdirectories
  const findYamlFiles = (dir: string): string[] => {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...findYamlFiles(fullPath));
      } else if (entry.name.endsWith(".yaml") || entry.name.endsWith(".yml")) {
        files.push(fullPath);
      }
    }
    return files;
  };

  const files = findYamlFiles(openApiDir);

  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    const doc = jsYaml.load(content) as Record<string, unknown>;

    if (doc.paths) {
      Object.assign(base.paths as object, doc.paths);
    }

    if (doc.components) {
      const docComponents = doc.components as Record<string, unknown>;
      const baseComponents = base.components as Record<string, Record<string, unknown>>;
      for (const section of ["schemas", "responses", "securitySchemes"] as const) {
        if (docComponents[section]) {
          Object.assign(baseComponents[section], docComponents[section]);
        }
      }
    }
  }

  // Inject servers from environment
  const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:3002";
  const kongBaseUrl = process.env.KONG_BASE_URL ?? "http://localhost:8000";

  return {
    ...base,
    servers: [
      { url: kongBaseUrl, description: "Kong Gateway (recommended)" },
      { url: appBaseUrl, description: "Direct App Server" },
    ],
  };
}
