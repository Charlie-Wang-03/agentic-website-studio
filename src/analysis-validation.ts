import fs from 'node:fs/promises';
import { createValidator } from './schema.js';
import { evidenceRefKey } from './provenance.js';
import { REPOSITORY_ROOT, validateRunDirectory } from './run-validation.js';
import type { DesignPrinciplesDocument, EvidenceRef, ReferenceProfile } from './types.js';

function duplicates(values: string[]): string[] { const seen = new Set<string>(); return values.filter((value) => seen.has(value) || !seen.add(value)); }
function assertReferences(references: EvidenceRef[], runId: string, evidenceIds: Set<string>, label: string): void {
  const duplicated = duplicates(references.map(evidenceRefKey));
  if (duplicated.length) throw new Error(`${label} contains duplicate provenance references`);
  for (const reference of references) {
    if (reference.runId !== runId) throw new Error(`${label} references a different or nonexistent run: ${reference.runId}`);
    if (!evidenceIds.has(reference.evidenceId)) throw new Error(`${label} references nonexistent evidence: ${reference.evidenceId}`);
  }
}

export async function validateAnalysis(options: { runDir: string; profilePath: string; principlesPath: string }): Promise<{ claims: number; principles: number }> {
  const { manifest, evidence, rights } = await validateRunDirectory(options.runDir);
  const [profileText, principlesText] = await Promise.all([fs.readFile(options.profilePath, 'utf8'), fs.readFile(options.principlesPath, 'utf8')]);
  const profile = JSON.parse(profileText) as ReferenceProfile;
  const principles = JSON.parse(principlesText) as DesignPrinciplesDocument;
  const ajv = await createValidator(REPOSITORY_ROOT);
  const validateProfile = ajv.getSchema('https://agentic-website-studio.local/schemas/reference-profile.schema.json');
  const validatePrinciples = ajv.getSchema('https://agentic-website-studio.local/schemas/design-principle.schema.json');
  if (!validateProfile?.(profile)) throw new Error(`Reference Profile schema validation failed: ${JSON.stringify(validateProfile?.errors ?? [])}`);
  if (!validatePrinciples?.(principles)) throw new Error(`Design Principles schema validation failed: ${JSON.stringify(validatePrinciples?.errors ?? [])}`);
  if (profile.runId !== manifest.runId || principles.runId !== manifest.runId) throw new Error('Run identities are inconsistent');
  if (profile.referenceId !== manifest.referenceId || principles.referenceId !== manifest.referenceId) throw new Error('Reference identities are inconsistent');
  if (profile.source.sanitizedUrl !== manifest.finalUrl) throw new Error('Profile source URL does not match the source run');
  const sourceRights = rights[0]?.status;
  if (!sourceRights || profile.rightsStatus !== sourceRights) throw new Error('Reference Profile escalates or changes source rights');
  const sourceRightsBasis = rights[0]?.basis;
  if (!sourceRightsBasis || profile.rightsBasis !== sourceRightsBasis) throw new Error('Reference Profile does not preserve the source rights basis');
  const sourceRightsNotes = rights[0]?.notes ? [rights[0].notes] : [];
  if (JSON.stringify(profile.sourceRightsNotes) !== JSON.stringify(sourceRightsNotes)) throw new Error('Reference Profile does not preserve the source rights notes');
  const evidenceIds = new Set(evidence.map(({ id }) => id));
  const claimIds = profile.claims.map(({ id }) => id);
  const duplicatedClaims = duplicates(claimIds);
  if (duplicatedClaims.length) throw new Error(`Duplicate Reference Profile claim ID: ${duplicatedClaims[0]}`);
  for (const claim of profile.claims) {
    assertReferences(claim.supportingEvidence, manifest.runId, evidenceIds, `Claim ${claim.id} supporting evidence`);
    assertReferences(claim.contradictoryEvidence, manifest.runId, evidenceIds, `Claim ${claim.id} contradictory evidence`);
  }
  const principleIds = principles.principles.map(({ id }) => id);
  const duplicatedPrinciples = duplicates(principleIds);
  if (duplicatedPrinciples.length) throw new Error(`Duplicate Design Principle ID: ${duplicatedPrinciples[0]}`);
  const knownClaims = new Set(claimIds);
  for (const principle of principles.principles) {
    for (const claimId of principle.supportingProfileClaimIds) if (!knownClaims.has(claimId)) throw new Error(`Principle ${principle.id} references nonexistent profile claim: ${claimId}`);
    assertReferences(principle.supportingEvidence, manifest.runId, evidenceIds, `Principle ${principle.id} supporting evidence`);
    assertReferences(principle.contradictoryEvidence, manifest.runId, evidenceIds, `Principle ${principle.id} contradictory evidence`);
    if (principle.rights.sourceStatus !== sourceRights) throw new Error(`Principle ${principle.id} escalates or changes source rights`);
    if (principle.rights.sourceBasis !== sourceRightsBasis) throw new Error(`Principle ${principle.id} does not preserve the source rights basis`);
    if (JSON.stringify(principle.rights.sourceNotes) !== JSON.stringify(sourceRightsNotes)) throw new Error(`Principle ${principle.id} does not preserve the source rights notes`);
    if (principle.sourceReferenceIds.length !== 1 || principle.sourceReferenceIds[0] !== manifest.referenceId) throw new Error(`Principle ${principle.id} has inconsistent source reference identity`);
  }
  return { claims: profile.claims.length, principles: principles.principles.length };
}
