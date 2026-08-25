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

export type CreativeRightsMode = 'original' | 'permissioned_or_licensed' | 'third_party_adaptation_requires_human_review';
export interface ProjectBrief {
  schemaVersion: '1.0.0'; projectId: string; workingTitle: string; purpose: string; targetAudience: string[];
  desiredExperience: string[]; expectedSessionLength: string; narrativeGoal: string; interactionGoal: string;
  visualAspirations: string[]; platformConstraints: string[]; accessibilityExpectations: string[]; mobileExpectations: string[];
  engineeringConstraints: string[]; creativeRightsMode: CreativeRightsMode; prohibitedExpressions: string[];
  mustHaveQualities: string[]; unwantedQualities: string[]; openQuestions: string[];
}
export interface AnalysisTupleDescriptor { runDir: string; analysisPacketPath: string; profilePath: string; principlesPath: string }
export interface ReferenceSetEntry {
  referenceId: string; runId: string; analysisTuple: AnalysisTupleDescriptor & { analysisPacketSha256: string; profileSha256: string; principlesSha256: string }; validation: 'pass'; rightsStatus: RightsStatus;
  rightsBasis: string; rightsNotes: string[]; materialWarnings: string[]; limitations: string[];
}
export interface ReferenceSet { schemaVersion: '1.0.0'; projectId: string; minimumReferenceCount: 3; references: ReferenceSetEntry[] }
export interface SynthesisPacket {
  schemaVersion: '1.0.0'; packetId: string; projectId: string; referenceSet: ReferenceSet;
  agentFacing: { projectBriefSummary: Omit<ProjectBrief, 'schemaVersion'>; references: Array<{ opaqueReferenceId: string; claims: ReferenceProfileClaim[]; principles: DesignPrinciple[]; confidenceLimitations: string[]; rights: { status: RightsStatus; basis: string; notes: string[] }; contributionBoundary: string; antiCopyConstraints: AntiCopyConstraints[] }>; policy: { referenceEvidenceFirewall: true; sourceNeutralReasoning: true; antiFrankenstein: true; rightsAreNotReusePermission: true; enforcement: 'protocol' } };
}
export type SynthesisUnitType = 'convergent_pattern' | 'complementary_pattern' | 'tension_tradeoff' | 'unique_candidate';
export interface SynthesisContribution { referenceId: string; principleIds: string[]; profileClaimIds: string[] }
export interface SynthesisUnit {
  id: string; type: SynthesisUnitType; title: string; problemAddressed: string; abstractMechanism: string; projectValue: string;
  avoidWhen: string[]; tensionsCreated: string[]; sourceSpecificExpressionExcluded: string[]; contributions: SynthesisContribution[];
  contradictoryPrincipleIds: string[]; contradictoryProfileClaimIds: string[]; confidence: Confidence; limitations: string[];
  rightsCaveats: string[]; inheritedAntiCopyConstraints: string[]; consensusClaimed: boolean;
}
export interface SynthesisMap { schemaVersion: '1.0.0'; synthesisId: string; projectId: string; sourcePacketId: string; units: SynthesisUnit[] }
export interface CreativePacket {
  schemaVersion: '1.0.0'; creativePacketId: string; projectBrief: ProjectBrief; synthesisId: string; synthesisUnits: Array<Omit<SynthesisUnit, 'contributions' | 'contradictoryPrincipleIds' | 'contradictoryProfileClaimIds'> & { opaqueReferenceIds: string[] }>;
  rightsMode: CreativeRightsMode; protectedExpressionProhibitions: string[]; antiCopyRequirements: string[];
  designTensions: string[]; technicalConstraints: string[]; influenceLedger: Array<{ synthesisUnitId: string; opaqueReferenceIds: string[] }>;
  policy: { originalityFirewall: true; sourceNamesExcluded: true; sourceUrlsExcluded: true; screenshotsExcluded: true; rawEvidenceExcluded: true; sourceProseExcluded: true; exactSourceMotionExcluded: true; enforcement: 'protocol' };
}
export interface CreativeConcept {
  id: string; name: string; thesis: string; experiencePromise: string; targetEmotionalArc: string[]; narrativeModel: string;
  interactionModel: string; spatialProgressionModel: string; visualLanguageDirection: string; audioMotionRole: string; expectedSessionFlow: string[];
  selectedSynthesisUnitIds: string[]; rejectedSynthesisUnitIds: string[]; resolvedTensions: string[]; unresolvedTensions: string[];
  originalityRationale: string; sourceInfluenceSummary: Array<{ synthesisUnitId: string }>;
  protectedExpressionProhibitions: string[]; implementationPosture: string; mobilePosture: string; accessibilityConsiderations: string[];
  complexityRisk: string[]; smallestConvincingPlayableSlice: string; majorUnknowns: string[];
}
export interface CreativeConceptsDocument { schemaVersion: '1.0.0'; projectId: string; synthesisId: string; rightsMode: CreativeRightsMode; concepts: CreativeConcept[] }
