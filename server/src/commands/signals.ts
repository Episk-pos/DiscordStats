import { Message } from 'discord.js';
import { sessionRegistry, SignalType } from '../services/rallyround';
import { ParsedCommand } from './parser';
import { isInSessionVC } from './permissions';
import { successMessage, errorMessage, getSignalEmoji } from './responses';

// Map of point subcommands to signal types
const pointSignals: Record<string, SignalType> = {
  order: 'point_of_order',
  clarify: 'clarification',
  info: 'information',
};

// Track active signals per user per session for toggling
const userSignals = new Map<string, SignalType>();

function getUserKey(guildId: string, odId: string): string {
  return `${guildId}:${odId}`;
}

/**
 * !rr hand - Toggle raise/lower hand
 */
export async function handleHand(message: Message): Promise<void> {
  const { guildId, member } = message;

  if (!guildId || !member) {
    await message.reply(errorMessage('This command can only be used in a server.'));
    return;
  }

  const permission = isInSessionVC(guildId, member);
  if (!permission.allowed) {
    await message.reply(errorMessage(permission.reason!));
    return;
  }

  const session = sessionRegistry.get(guildId)!;
  const userKey = getUserKey(guildId, member.id);
  const currentSignal = userSignals.get(userKey);

  try {
    if (currentSignal === 'hand') {
      // Lower hand
      await session.client.clearSignal(session.sessionId, member.id);
      userSignals.delete(userKey);
      await message.react('👇');
    } else {
      // Clear any existing signal first
      if (currentSignal) {
        await session.client.clearSignal(session.sessionId, member.id);
      }
      // Raise hand
      await session.client.raiseSignal(session.sessionId, {
        discordId: member.id,
        signal: 'hand',
      });
      userSignals.set(userKey, 'hand');
      await message.react('✋');
    }
  } catch (error: any) {
    console.error('Failed to toggle hand:', error);
    await message.reply(errorMessage(`Failed to toggle hand: ${error.message}`));
  }
}

/**
 * !rr point order|clarify|info - Raise parliamentary signal
 */
export async function handlePoint(message: Message, parsed: ParsedCommand): Promise<void> {
  const { guildId, member } = message;

  if (!guildId || !member) {
    await message.reply(errorMessage('This command can only be used in a server.'));
    return;
  }

  const permission = isInSessionVC(guildId, member);
  if (!permission.allowed) {
    await message.reply(errorMessage(permission.reason!));
    return;
  }

  const subcommand = parsed.subcommand;
  if (!subcommand || !pointSignals[subcommand]) {
    await message.reply(errorMessage('Usage: `!rr point order|clarify|info`'));
    return;
  }

  const signal = pointSignals[subcommand];
  const session = sessionRegistry.get(guildId)!;
  const userKey = getUserKey(guildId, member.id);
  const currentSignal = userSignals.get(userKey);

  try {
    if (currentSignal === signal) {
      // Toggle off
      await session.client.clearSignal(session.sessionId, member.id);
      userSignals.delete(userKey);
      await message.reply(successMessage(`${getSignalEmoji(signal)} Signal cleared.`));
    } else {
      // Clear any existing signal first
      if (currentSignal) {
        await session.client.clearSignal(session.sessionId, member.id);
      }
      // Raise new signal
      await session.client.raiseSignal(session.sessionId, {
        discordId: member.id,
        signal,
      });
      userSignals.set(userKey, signal);
      await message.react(getReactionEmoji(signal));
    }
  } catch (error: any) {
    console.error('Failed to raise signal:', error);
    await message.reply(errorMessage(`Failed to raise signal: ${error.message}`));
  }
}

/**
 * !rr question - Raise question signal
 */
export async function handleQuestion(message: Message): Promise<void> {
  await handleSignal(message, 'question');
}

/**
 * !rr agree - Show agreement
 */
export async function handleAgree(message: Message): Promise<void> {
  await handleSignal(message, 'agree');
}

/**
 * !rr disagree - Show disagreement
 */
export async function handleDisagree(message: Message): Promise<void> {
  await handleSignal(message, 'disagree');
}

/**
 * !rr away - Mark as away
 */
export async function handleAway(message: Message): Promise<void> {
  const { guildId, member } = message;

  if (!guildId || !member) {
    await message.reply(errorMessage('This command can only be used in a server.'));
    return;
  }

  const permission = isInSessionVC(guildId, member);
  if (!permission.allowed) {
    await message.reply(errorMessage(permission.reason!));
    return;
  }

  const session = sessionRegistry.get(guildId)!;

  try {
    await session.client.updateParticipantStatus(session.sessionId, member.id, 'away');
    await message.react('💤');
  } catch (error: any) {
    console.error('Failed to update status:', error);
    await message.reply(errorMessage(`Failed to update status: ${error.message}`));
  }
}

/**
 * !rr back - Mark as back
 */
export async function handleBack(message: Message): Promise<void> {
  const { guildId, member } = message;

  if (!guildId || !member) {
    await message.reply(errorMessage('This command can only be used in a server.'));
    return;
  }

  const permission = isInSessionVC(guildId, member);
  if (!permission.allowed) {
    await message.reply(errorMessage(permission.reason!));
    return;
  }

  const session = sessionRegistry.get(guildId)!;

  try {
    await session.client.updateParticipantStatus(session.sessionId, member.id, 'ready');
    await message.react('👋');
  } catch (error: any) {
    console.error('Failed to update status:', error);
    await message.reply(errorMessage(`Failed to update status: ${error.message}`));
  }
}

/**
 * Generic signal handler
 */
async function handleSignal(message: Message, signal: SignalType): Promise<void> {
  const { guildId, member } = message;

  if (!guildId || !member) {
    await message.reply(errorMessage('This command can only be used in a server.'));
    return;
  }

  const permission = isInSessionVC(guildId, member);
  if (!permission.allowed) {
    await message.reply(errorMessage(permission.reason!));
    return;
  }

  const session = sessionRegistry.get(guildId)!;
  const userKey = getUserKey(guildId, member.id);
  const currentSignal = userSignals.get(userKey);

  try {
    if (currentSignal === signal) {
      // Toggle off
      await session.client.clearSignal(session.sessionId, member.id);
      userSignals.delete(userKey);
      await message.react('❌');
    } else {
      // Clear any existing signal first
      if (currentSignal) {
        await session.client.clearSignal(session.sessionId, member.id);
      }
      // Raise new signal
      await session.client.raiseSignal(session.sessionId, {
        discordId: member.id,
        signal,
      });
      userSignals.set(userKey, signal);
      await message.react(getReactionEmoji(signal));
    }
  } catch (error: any) {
    console.error('Failed to handle signal:', error);
    await message.reply(errorMessage(`Failed to handle signal: ${error.message}`));
  }
}

/**
 * Get reaction emoji for signal
 */
function getReactionEmoji(signal: SignalType): string {
  const map: Record<SignalType, string> = {
    hand: '✋',
    point_of_order: '🚨',
    clarification: '📌',
    information: 'ℹ️',
    question: '❓',
    agree: '👍',
    disagree: '👎',
    away: '💤',
    back: '👋',
  };
  return map[signal] || '✅';
}

/**
 * Clear user's signal state (called when session ends or user leaves)
 */
export function clearUserSignal(guildId: string, odId: string): void {
  const userKey = getUserKey(guildId, odId);
  userSignals.delete(userKey);
}

/**
 * Clear all signals for a session (called when session ends)
 */
export function clearSessionSignals(guildId: string): void {
  for (const key of userSignals.keys()) {
    if (key.startsWith(`${guildId}:`)) {
      userSignals.delete(key);
    }
  }
}
