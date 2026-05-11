export interface Coordinates {
  latitude?: number;
  longitude?: number;
}

export interface DateRange {
  startTimestamp?: number;
  endTimestamp?: number;
}

export interface SearchableFields {
  unspscCode?: number;
  location?: Coordinates;
  dateRange?: DateRange;
  cronSchedule?: string;
}

export interface MessageDocument {
  id: string;
  messageType: 'anonymized' | 'text' | 'public_contact_unencrypted';
  publicKey: string;
  signature: string;
  payload: Record<string, unknown>;
  searchable: SearchableFields;
  recipientPublicKey?: string;
  createdAt: string;
}

export interface InboxMessage {
  id: string;
  recipientPublicKey: string;
  messageType: 'text' | 'match' | 'story' | 'notification' | 'contact_info';
  content: string;
  data?: Record<string, unknown>;
  createdAt: string;
  read?: boolean;
}

export interface MatchCandidate {
  leftMessageId: string;
  rightMessageId: string;
  unspscCode?: number;
  score: number;
  reason: string;
}

export interface ConnectAnalysisResult {
  keyCount: number;
  myMessageCount: number;
  globalMessageCount: number;
  matches: MatchCandidate[];
  modelSummary?: string;
  communityActivitySummary?: string;
}

export interface UnspscTally {
  code: number;
  count: number;
}

export interface CommunityActivityReport {
  connectionCount: number;
  topActiveUnspscs: UnspscTally[];
}
