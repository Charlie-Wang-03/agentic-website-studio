export type RightsStatus = 'inspect_only' | 'reuse_allowed' | 'attribution_required' | 'licensed' | 'permission_required' | 'unknown' | 'blocked';

export interface ArtifactRef { path: string; sha256: string }
export interface NetworkRecord { method: string; url: string; resourceType: string; status?: number; contentType?: string }
export interface ConsoleRecord { type: string; text: string; location?: string }
export interface EvidenceRecord {
  id: string; runId: string; sourceReference: string; capturedAt: string;
  kind: 'navigation' | 'page_metadata' | 'structure' | 'visual' | 'console' | 'network';
  epistemicType: 'observed_fact' | 'inference' | 'evaluation' | 'transferable_principle';
  claim: string; value?: unknown; confidence?: number;
  provenance: { method: string; locator?: string }; artifact?: ArtifactRef;
  rightsStatus: RightsStatus; notes?: string;
}

