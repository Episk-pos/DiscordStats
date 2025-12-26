import { RallyRoundClient } from './client';
import { Session, SessionConfig } from './types';

export interface ActiveSession {
  sessionId: string;
  guildId: string;
  channelId: string;
  voiceChannelId: string;
  facilitatorId: string;
  webhookSecret: string;
  soundEffectsEnabled: boolean;
  client: RallyRoundClient;
  createdAt: Date;
}

class SessionRegistry {
  // Map of guildId -> ActiveSession
  private sessions: Map<string, ActiveSession> = new Map();

  /**
   * Register a new active session for a guild
   */
  register(
    guildId: string,
    sessionId: string,
    channelId: string,
    voiceChannelId: string,
    facilitatorId: string,
    webhookSecret: string,
    config: Partial<SessionConfig>,
    client: RallyRoundClient
  ): ActiveSession {
    const session: ActiveSession = {
      sessionId,
      guildId,
      channelId,
      voiceChannelId,
      facilitatorId,
      webhookSecret,
      soundEffectsEnabled: config.soundEffectsEnabled ?? true,
      client,
      createdAt: new Date(),
    };

    this.sessions.set(guildId, session);
    return session;
  }

  /**
   * Get active session for a guild
   */
  get(guildId: string): ActiveSession | undefined {
    return this.sessions.get(guildId);
  }

  /**
   * Get session by session ID
   */
  getBySessionId(sessionId: string): ActiveSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.sessionId === sessionId) {
        return session;
      }
    }
    return undefined;
  }

  /**
   * Check if a guild has an active session
   */
  has(guildId: string): boolean {
    return this.sessions.has(guildId);
  }

  /**
   * Remove session for a guild
   */
  remove(guildId: string): boolean {
    return this.sessions.delete(guildId);
  }

  /**
   * Get all active sessions
   */
  getAll(): ActiveSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session count
   */
  get count(): number {
    return this.sessions.size;
  }

  /**
   * Update sound effects setting for a session
   */
  setSoundEffects(guildId: string, enabled: boolean): void {
    const session = this.sessions.get(guildId);
    if (session) {
      session.soundEffectsEnabled = enabled;
    }
  }

  /**
   * Check if user is the facilitator for a guild's session
   */
  isFacilitator(guildId: string, userId: string): boolean {
    const session = this.sessions.get(guildId);
    return session?.facilitatorId === userId;
  }
}

// Export singleton instance
export const sessionRegistry = new SessionRegistry();
