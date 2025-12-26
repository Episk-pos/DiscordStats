import {
  joinVoiceChannel,
  VoiceConnection,
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection,
} from '@discordjs/voice';
import { VoiceChannel, TextChannel } from 'discord.js';
import { getClient } from '../discord';
import { sessionRegistry } from '../rallyround';

// Store voice connections per guild
const voiceConnections = new Map<string, VoiceConnection>();

// Reconnection settings
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAYS = [2000, 4000, 8000];

/**
 * Join a voice channel for a session
 */
export async function joinSessionVoiceChannel(
  guildId: string,
  voiceChannelId: string,
  notifyChannelId: string
): Promise<VoiceConnection | null> {
  const client = getClient();
  if (!client) {
    console.error('Discord client not available');
    return null;
  }

  try {
    const guild = await client.guilds.fetch(guildId);
    const voiceChannel = (await guild.channels.fetch(voiceChannelId)) as VoiceChannel;
    const textChannel = (await guild.channels.fetch(notifyChannelId)) as TextChannel;

    if (!voiceChannel) {
      console.error(`Voice channel ${voiceChannelId} not found`);
      return null;
    }

    const connection = joinVoiceChannel({
      channelId: voiceChannelId,
      guildId: guildId,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
    });

    // Set up connection event handlers
    setupConnectionHandlers(connection, guildId, voiceChannelId, textChannel);

    // Wait for the connection to be ready
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
      voiceConnections.set(guildId, connection);
      console.log(`Joined voice channel ${voiceChannel.name} in ${guild.name}`);
      return connection;
    } catch (error) {
      console.error('Failed to establish voice connection:', error);
      connection.destroy();
      return null;
    }
  } catch (error) {
    console.error('Failed to join voice channel:', error);
    return null;
  }
}

/**
 * Set up voice connection event handlers
 */
function setupConnectionHandlers(
  connection: VoiceConnection,
  guildId: string,
  voiceChannelId: string,
  textChannel: TextChannel
): void {
  let reconnectAttempts = 0;

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    console.log(`Voice connection disconnected for guild ${guildId}`);

    // Check if session is still active
    const session = sessionRegistry.get(guildId);
    if (!session) {
      connection.destroy();
      voiceConnections.delete(guildId);
      return;
    }

    // Attempt to reconnect
    while (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      try {
        await entersState(connection, VoiceConnectionStatus.Connecting, 5_000);
        // Connected, reset attempts
        reconnectAttempts = 0;
        return;
      } catch (error) {
        reconnectAttempts++;
        console.log(`Reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);

        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          await delay(RECONNECT_DELAYS[reconnectAttempts - 1]);
        }
      }
    }

    // Failed to reconnect
    console.error(`Failed to reconnect after ${MAX_RECONNECT_ATTEMPTS} attempts`);

    // Notify the text channel
    try {
      await textChannel.send(
        ':warning: Lost connection to voice channel. Sound effects temporarily unavailable. ' +
          'Use `!rr sfx on` to attempt reconnection.'
      );
    } catch (e) {
      console.error('Failed to send disconnect notification:', e);
    }

    connection.destroy();
    voiceConnections.delete(guildId);
  });

  connection.on(VoiceConnectionStatus.Destroyed, () => {
    console.log(`Voice connection destroyed for guild ${guildId}`);
    voiceConnections.delete(guildId);
  });

  connection.on('error', (error) => {
    console.error(`Voice connection error for guild ${guildId}:`, error);
  });
}

/**
 * Leave voice channel for a session
 */
export function leaveSessionVoiceChannel(guildId: string): void {
  const connection = voiceConnections.get(guildId);
  if (connection) {
    connection.destroy();
    voiceConnections.delete(guildId);
    console.log(`Left voice channel for guild ${guildId}`);
  }
}

/**
 * Get voice connection for a guild
 */
export function getVoiceConnectionForGuild(guildId: string): VoiceConnection | undefined {
  return voiceConnections.get(guildId) || getVoiceConnection(guildId);
}

/**
 * Check if bot is in voice channel
 */
export function isBotInVoiceChannel(guildId: string): boolean {
  const connection = getVoiceConnectionForGuild(guildId);
  return connection?.state.status === VoiceConnectionStatus.Ready;
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
