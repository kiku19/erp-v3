import fs from 'fs';
import path from 'path';

const templatePath = path.join(process.cwd(), 'kong.template.yaml');
const outputPath = path.join(process.cwd(), 'kong.yaml');

const template = fs.readFileSync(templatePath, 'utf-8');

const envVars: Record<string, string> = {
  '${APP_BASE_URL}': process.env.APP_BASE_URL ?? 'http://localhost:3002',
  '${APP_HOST}': process.env.APP_HOST ?? 'localhost',
  '${APP_PORT}': process.env.APP_PORT ?? '3002',
  '${KONG_BASE_URL}': process.env.KONG_BASE_URL ?? 'http://localhost:8000',
  '${CORS_ORIGIN}': process.env.CORS_ORIGIN ?? 'http://localhost:3002',
};

let output = template;
for (const [placeholder, value] of Object.entries(envVars)) {
  output = output.replaceAll(placeholder, value);
}

fs.writeFileSync(outputPath, output);
console.log('Generated kong.yaml from kong.template.yaml');
