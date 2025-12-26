import axios, { AxiosInstance, AxiosError } from 'axios';
import { RallyRoundError } from './errors';
import {
  Session,
  CreateSessionOptions,
  UpdateSessionOptions,
  Participant,
  AddParticipantOptions,
  ParticipantStatus,
  Signal,
  RaiseSignalOptions,
  SpeakerChangeResult,
  SetSpeakerOptions,
  AgendaItem,
  AddAgendaItemOptions,
  UpdateAgendaItemOptions,
  SessionStats,
  QueueEntry,
} from './types';

const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

export class RallyRoundClient {
  private client: AxiosInstance;
  private authToken: string;

  constructor(baseUrl: string, authToken: string) {
    this.authToken = authToken;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: REQUEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  private async request<T>(
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    data?: any,
    retryCount = 0
  ): Promise<T> {
    try {
      const response = await this.client.request<T>({
        method,
        url: path,
        data,
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        // Handle timeout
        if (axiosError.code === 'ECONNABORTED') {
          if (retryCount < MAX_RETRIES) {
            await this.delay(RETRY_DELAYS[retryCount]);
            return this.request(method, path, data, retryCount + 1);
          }
          throw RallyRoundError.timeout();
        }

        // Handle network errors
        if (!axiosError.response) {
          if (retryCount < MAX_RETRIES) {
            await this.delay(RETRY_DELAYS[retryCount]);
            return this.request(method, path, data, retryCount + 1);
          }
          throw RallyRoundError.networkError(axiosError.message);
        }

        const { status, data: responseData } = axiosError.response;

        // Retry on 503 Service Unavailable
        if (status === 503 && retryCount < MAX_RETRIES) {
          await this.delay(RETRY_DELAYS[retryCount]);
          return this.request(method, path, data, retryCount + 1);
        }

        throw RallyRoundError.fromResponse(status, responseData);
      }

      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ==================== Session Management ====================

  async createSession(options: CreateSessionOptions): Promise<Session> {
    return this.request<Session>('post', '/sessions', options);
  }

  async getSession(
    sessionId: string,
    include?: ('participants' | 'queue' | 'agenda')[]
  ): Promise<Session> {
    const params = include ? `?include=${include.join(',')}` : '';
    return this.request<Session>('get', `/sessions/${sessionId}${params}`);
  }

  async updateSession(sessionId: string, updates: UpdateSessionOptions): Promise<Session> {
    return this.request<Session>('patch', `/sessions/${sessionId}`, updates);
  }

  async endSession(sessionId: string): Promise<SessionStats> {
    return this.request<SessionStats>('delete', `/sessions/${sessionId}`);
  }

  // ==================== Participant Management ====================

  async addParticipant(sessionId: string, options: AddParticipantOptions): Promise<Participant> {
    return this.request<Participant>('post', `/sessions/${sessionId}/participants`, options);
  }

  async removeParticipant(sessionId: string, discordId: string): Promise<void> {
    return this.request<void>('delete', `/sessions/${sessionId}/participants/${discordId}`);
  }

  async updateParticipantStatus(
    sessionId: string,
    discordId: string,
    status: ParticipantStatus
  ): Promise<Participant> {
    return this.request<Participant>(
      'patch',
      `/sessions/${sessionId}/participants/${discordId}`,
      { status }
    );
  }

  // ==================== Signal Management ====================

  async raiseSignal(sessionId: string, options: RaiseSignalOptions): Promise<Signal> {
    return this.request<Signal>('post', `/sessions/${sessionId}/signals`, options);
  }

  async clearSignal(sessionId: string, discordId: string): Promise<void> {
    return this.request<void>('delete', `/sessions/${sessionId}/signals/${discordId}`);
  }

  // ==================== Speaker Queue Management ====================

  async setSpeaker(sessionId: string, options: SetSpeakerOptions): Promise<SpeakerChangeResult> {
    return this.request<SpeakerChangeResult>('post', `/sessions/${sessionId}/speaker`, options);
  }

  async nextSpeaker(sessionId: string): Promise<SpeakerChangeResult> {
    return this.request<SpeakerChangeResult>('post', `/sessions/${sessionId}/speaker/next`);
  }

  async clearSpeaker(sessionId: string): Promise<void> {
    return this.request<void>('delete', `/sessions/${sessionId}/speaker`);
  }

  async clearSpeakerQueue(sessionId: string): Promise<void> {
    return this.request<void>('delete', `/sessions/${sessionId}/speaker/queue`);
  }

  async getQueue(sessionId: string): Promise<QueueEntry[]> {
    const session = await this.getSession(sessionId, ['queue']);
    return session.queue || [];
  }

  // ==================== Agenda Management ====================

  async getAgenda(sessionId: string): Promise<AgendaItem[]> {
    const session = await this.getSession(sessionId, ['agenda']);
    return session.agenda || [];
  }

  async addAgendaItem(sessionId: string, options: AddAgendaItemOptions): Promise<AgendaItem> {
    return this.request<AgendaItem>('post', `/sessions/${sessionId}/agenda`, options);
  }

  async updateAgendaItem(
    sessionId: string,
    itemId: string,
    options: UpdateAgendaItemOptions
  ): Promise<AgendaItem> {
    return this.request<AgendaItem>('patch', `/sessions/${sessionId}/agenda/${itemId}`, options);
  }

  async removeAgendaItem(sessionId: string, itemId: string): Promise<void> {
    return this.request<void>('delete', `/sessions/${sessionId}/agenda/${itemId}`);
  }

  async advanceAgenda(sessionId: string): Promise<AgendaItem> {
    return this.request<AgendaItem>('post', `/sessions/${sessionId}/agenda/next`);
  }

  async reorderAgenda(sessionId: string, itemIds: string[]): Promise<AgendaItem[]> {
    return this.request<AgendaItem[]>('post', `/sessions/${sessionId}/agenda/reorder`, {
      itemIds,
    });
  }
}
