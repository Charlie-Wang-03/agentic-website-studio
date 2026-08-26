import Ajv from 'ajv/dist/ajv.js';
import addFormats from 'ajv-formats/dist/index.js';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function createValidator(root = process.cwd()): Promise<InstanceType<typeof Ajv.default>> {
  const ajv = new Ajv.default({ allErrors: true, strict: true });
  addFormats.default(ajv);
  for (const name of ['rights', 'evidence', 'reference-run', 'reference-profile', 'design-principle', 'analysis-packet', 'project-brief', 'reference-set', 'synthesis-packet', 'synthesis-map', 'creative-packet', 'creative-concepts', 'concept-review', 'human-creative-gate', 'human-concept-decision', 'implementation-contract', 'm42-source-manifest', 'm42-qa-report', 'human-playtest-gate', 'm42-human-playtest-feedback', 'm42r-revision-contract', 'm42r-source-manifest', 'm42r-qa-report', 'human-replaytest-gate']) {
    const schema = JSON.parse(await fs.readFile(path.join(root, 'schemas', `${name}.schema.json`), 'utf8')) as object;
    ajv.addSchema(schema);
  }
  return ajv;
}
