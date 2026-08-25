export type RightsStatus = 'inspect_only' | 'reuse_allowed' | 'attribution_required' | 'licensed' | 'permission_required' | 'unknown' | 'blocked';
export type ViewportName = 'desktop' | 'mobile';
export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface ArtifactRef { path: string; sha256: string }
export interface EvidenceRef { runId: string; evidenceId: string }
export interface NetworkRecord { viewport: ViewportName; method: string; url: string; resourceType: string; status?: number; contentType?: string }
export interface ConsoleRecord { viewport: ViewportName; type: string; text: string; location?: string }
export interface EvidenceRecord {
  id: string;
  runId: string;
  referenceId: string;
  sourceReference: string;
  capturedAt: string;
  viewport?: ViewportName | 'cross_viewport';
  kind: 'navigation' | 'page_metadata' | 'structure' | 'visual_system' | 'motion_interaction' | 'technical_signal' | 'responsive' | 'screenshot' | 'console' | 'network';
  epistemicType: 'observed_fact';
  claim: string;
  value?: unknown;
  provenance: { method: string; locator?: string };
  artifact?: ArtifactRef;
  rightsStatus: RightsStatus;
  notes?: string;
}

export interface ViewportProfile { name: ViewportName; width: number; height: number }
export interface ReferenceRunManifest {
  schemaVersion: '2.0.0'; referenceId: string; runId: string; project: string;
  requestedUrl: string; finalUrl: string; capturedAt: string; viewports: ViewportProfile[];
  tools: Record<string, string>; artifacts: ArtifactRef[]; evidenceIds: string[];
  warnings: string[]; errors: string[]; policyDecisions: string[];
}

export type ProfileCategory = 'layout_structure' | 'visual_language' | 'typography' | 'color_system' | 'spacing_density' | 'interaction_pattern' | 'motion_pattern' | 'navigation' | 'content_structure' | 'narrative_progression' | 'media_usage' | 'responsive_behavior' | 'technical_signal';
export interface Confidence { level: ConfidenceLevel; rationale: string }
export interface ReferenceProfileClaim {
  id: string; category: ProfileCategory; statement: string; epistemicType: 'inference' | 'evaluation';
  supportingEvidence: EvidenceRef[]; contradictoryEvidence: EvidenceRef[]; confidence: Confidence; limitations: string[];
}
export interface ReferenceProfile {
  schemaVersion: '1.0.0'; referenceId: string; runId: string; source: { sanitizedUrl: string };
  rightsStatus: RightsStatus; rightsBasis: string; sourceRightsNotes: string[]; rightsCaveats: string[]; claims: ReferenceProfileClaim[]; insufficientEvidence: string[];
}

export interface AntiCopyConstraints {
  abstractionOnly: true; independentVisualExpressionRequired: true; noSourceAssetReuse: true;
  noSourceProseReuse: true; noExactLayoutReplication: true; noExactMotionSequenceReplication: true;
  noSourceCodeReconstruction: true; referenceOnlyElements: string[];
}
export interface DesignPrinciple {
  id: string; principle: string; problemAddressed: string; mechanism: string; expectedExperientialEffect: string;
  applicableContexts: string[]; transferability: ConfidenceLevel; constraints: string[];
  supportingProfileClaimIds: string[]; supportingEvidence: EvidenceRef[]; contradictoryEvidence: EvidenceRef[];
  confidence: Confidence; antiCopy: AntiCopyConstraints;
  rights: { sourceStatus: RightsStatus; sourceBasis: string; sourceNotes: string[]; caveats: string[]; isLegalOpinion: false }; sourceReferenceIds: string[];
}
export interface DesignPrinciplesDocument {
  schemaVersion: '1.0.0'; referenceId: string; runId: string; principles: DesignPrinciple[];
}
