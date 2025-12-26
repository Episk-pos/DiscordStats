// Session types
export type SessionState = 'scheduled' | 'active' | 'paused' | 'ended';
export type SessionMode = 'structured' | 'unstructured';

export interface SessionConfig {
  soundEffectsEnabled: boolean;
  speakerTimeLimit?: number;
  selfQueueEnabled: boolean;
  facilitatorApprovalRequired: boolean;
}

export interface Session {
  id: string;
  title: string;
  guildId: string;
  channelId: string;
  voiceChannelId: string;
  facilitatorId: string;
  status: SessionState;
  mode: SessionMode;
  isRecording: boolean;
  currentSpeaker?: Participant;
  config: SessionConfig;
  createdAt: string;
  updatedAt: string;
  participants?: Participant[];
  queue?: QueueEntry[];
  agenda?: AgendaItem[];
}

export interface CreateSessionOptions {
  title: string;
  guildId: string;
  channelId: string;
  voiceChannelId: string;
  facilitatorId: string;
  webhookUrl: string;
  webhookSecret: string;
  config?: Partial<SessionConfig>;
}

export interface UpdateSessionOptions {
  mode?: SessionMode;
  isRecording?: boolean;
  status?: SessionState;
}

// Participant types
export type ParticipantStatus = 'ready' | 'away' | 'speaking' | 'disconnected';
export type ParticipantSource = 'discord' | 'dashboard';

export interface Participant {
  id: string;
  discordId: string;
  username: string;
  displayName: string;
  avatar?: string;
  status: ParticipantStatus;
  source: ParticipantSource;
  joinedAt: string;
  speakingTime: number;
  activeSignal?: SignalType;
}

export interface AddParticipantOptions {
  discordId: string;
  username: string;
  displayName: string;
  avatar?: string;
  source: ParticipantSource;
}

// Signal types
export type SignalType =
  | 'hand'
  | 'point_of_order'
  | 'clarification'
  | 'information'
  | 'question'
  | 'agree'
  | 'disagree'
  | 'away'
  | 'back';

export type SignalPriority = 'interrupt' | 'high' | 'normal' | 'acknowledgment';

export interface Signal {
  discordId: string;
  signal: SignalType;
  priority: SignalPriority;
  queuePosition?: number;
  raisedAt: string;
}

export interface RaiseSignalOptions {
  discordId: string;
  signal: SignalType;
}

// Queue types
export interface QueueEntry {
  discordId: string;
  username: string;
  displayName: string;
  signal: SignalType;
  priority: SignalPriority;
  position: number;
  queuedAt: string;
  acknowledged: boolean;
}

// Speaker types
export interface SetSpeakerOptions {
  discordId: string;
}

export interface SpeakerChangeResult {
  previousSpeaker?: {
    discordId: string;
    duration: number;
  };
  currentSpeaker?: Participant;
  remainingQueue: number;
}

// Agenda types
export type AgendaItemStatus = 'pending' | 'active' | 'completed' | 'skipped';

export interface AgendaItem {
  id: string;
  title: string;
  description?: string;
  duration?: number;
  status: AgendaItemStatus;
  position: number;
  createdBy: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AddAgendaItemOptions {
  title: string;
  description?: string;
  duration?: number;
  position?: number;
}

export interface UpdateAgendaItemOptions {
  title?: string;
  description?: string;
  duration?: number;
  status?: AgendaItemStatus;
}

// Session statistics
export interface SessionStats {
  duration: number;
  participantCount: number;
  totalSignals: number;
  agendaItemsCompleted: number;
  agendaItemsTotal: number;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
