import {
  Client,
  GatewayIntentBits,
  Events,
  VoiceState,
} from 'discord.js';
import { handleCommand } from '../../commands';
import { handleVoiceStateUpdate } from '../voice';

// Discord client singleton
let client: Client | null = null;
let botReady = false;

/**
 * Initialize the Discord bot client
 */
export function initializeBot(): Client {
  if (client) {
    return client;
  }

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildPresences,
    ],
  });

  // Ready event
  client.on(Events.ClientReady, (readyClient) => {
    console.log(`Discord bot logged in as ${readyClient.user.tag}`);
    botReady = true;
  });

  // Error handling
  client.on(Events.Error, (error) => {
    console.error('Discord client error:', error);
  });

  // Message handling for commands
  client.on(Events.MessageCreate, async (message) => {
    await handleCommand(message);
  });

  // Voice state updates for presence tracking
  client.on(Events.VoiceStateUpdate, async (oldState: VoiceState, newState: VoiceState) => {
    await handleVoiceStateUpdate(oldState, newState);
  });

  // Login
  const token = process.env.DISCORD_BOT_TOKEN;
  if (token) {
    client.login(token).catch((error) => {
      console.error('Failed to login to Discord:', error.message);
    });
  } else {
    console.error('DISCORD_BOT_TOKEN is not set!');
  }

  return client;
}

/**
 * Get the Discord client instance
 */
export function getClient(): Client | null {
  return client;
}

/**
 * Check if the bot is ready
 */
export function isBotReady(): boolean {
  return botReady;
}

/**
 * Get a guild by ID
 */
export async function getGuild(guildId: string) {
  if (!client || !botReady) {
    throw new Error('Discord bot is not ready');
  }
  return client.guilds.fetch(guildId);
}
