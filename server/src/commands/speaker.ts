import { Message } from 'discord.js';
import { sessionRegistry } from '../services/rallyround';
import { ParsedCommand } from './parser';
import { isFacilitator } from './permissions';
import { successMessage, errorMessage, formatQueue, Emoji } from './responses';

/**
 * !rr next - Move to next speaker in queue
 */
export async function handleNext(message: Message): Promise<void> {
  const { guildId, member } = message;

  if (!guildId || !member) {
    await message.reply(errorMessage('This command can only be used in a server.'));
    return;
  }

  const permission = isFacilitator(guildId, member.id);
  if (!permission.allowed) {
    await message.reply(errorMessage(permission.reason!));
    return;
  }

  const session = sessionRegistry.get(guildId)!;

  try {
    const result = await session.client.nextSpeaker(session.sessionId);

    if (result.currentSpeaker) {
      let response = `${Emoji.speaker} **${result.currentSpeaker.displayName}** now has the floor.`;
      if (result.previousSpeaker) {
        const duration = Math.round(result.previousSpeaker.duration / 60);
        response += `\nPrevious speaker: ${duration}m`;
      }
      response += `\n${result.remainingQueue} remaining in queue.`;
      await message.reply(response);
    } else {
      await message.reply(`${Emoji.info} The queue is empty.`);
    }
  } catch (error: any) {
    console.error('Failed to advance speaker:', error);
    await message.reply(errorMessage(`Failed to advance speaker: ${error.message}`));
  }
}

/**
 * !rr speaker @user - Set specific user as speaker
 */
export async function handleSpeaker(message: Message, parsed: ParsedCommand): Promise<void> {
  const { guildId, member } = message;

  if (!guildId || !member) {
    await message.reply(errorMessage('This command can only be used in a server.'));
    return;
  }

  const permission = isFacilitator(guildId, member.id);
  if (!permission.allowed) {
    await message.reply(errorMessage(permission.reason!));
    return;
  }

  if (parsed.mentions.length === 0) {
    await message.reply(errorMessage('Usage: `!rr speaker @user`'));
    return;
  }

  const userId = parsed.mentions[0];
  const targetMember = message.guild?.members.cache.get(userId);

  if (!targetMember) {
    await message.reply(errorMessage('User not found in this server.'));
    return;
  }

  const session = sessionRegistry.get(guildId)!;

  try {
    const result = await session.client.setSpeaker(session.sessionId, { discordId: userId });

    let response = `${Emoji.speaker} **${targetMember.displayName}** now has the floor.`;
    if (result.previousSpeaker) {
      const duration = Math.round(result.previousSpeaker.duration / 60);
      response += `\nPrevious speaker: ${duration}m`;
    }
    await message.reply(response);
  } catch (error: any) {
    console.error('Failed to set speaker:', error);
    await message.reply(errorMessage(`Failed to set speaker: ${error.message}`));
  }
}

/**
 * !rr clear - Clear current speaker
 */
export async function handleClear(message: Message): Promise<void> {
  const { guildId, member } = message;

  if (!guildId || !member) {
    await message.reply(errorMessage('This command can only be used in a server.'));
    return;
  }

  const permission = isFacilitator(guildId, member.id);
  if (!permission.allowed) {
    await message.reply(errorMessage(permission.reason!));
    return;
  }

  const session = sessionRegistry.get(guildId)!;

  try {
    await session.client.clearSpeaker(session.sessionId);
    await message.reply(successMessage('Speaker cleared. The floor is open.'));
  } catch (error: any) {
    console.error('Failed to clear speaker:', error);
    await message.reply(errorMessage(`Failed to clear speaker: ${error.message}`));
  }
}

/**
 * !rr queue - Display speaker queue
 */
export async function handleQueue(message: Message): Promise<void> {
  const { guildId } = message;

  if (!guildId) {
    await message.reply(errorMessage('This command can only be used in a server.'));
    return;
  }

  const session = sessionRegistry.get(guildId);
  if (!session) {
    await message.reply(errorMessage('No active session in this server.'));
    return;
  }

  try {
    const queue = await session.client.getQueue(session.sessionId);
    const embed = formatQueue(queue);
    await message.reply({ embeds: [embed] });
  } catch (error: any) {
    console.error('Failed to get queue:', error);
    await message.reply(errorMessage(`Failed to get queue: ${error.message}`));
  }
}

/**
 * !rr clearqueue - Clear entire speaker queue (facilitator only)
 */
export async function handleClearQueue(message: Message): Promise<void> {
  const { guildId, member } = message;

  if (!guildId || !member) {
    await message.reply(errorMessage('This command can only be used in a server.'));
    return;
  }

  const permission = isFacilitator(guildId, member.id);
  if (!permission.allowed) {
    await message.reply(errorMessage(permission.reason!));
    return;
  }

  const session = sessionRegistry.get(guildId)!;

  try {
    await session.client.clearSpeakerQueue(session.sessionId);
    await message.reply(successMessage('Speaker queue cleared.'));
  } catch (error: any) {
    console.error('Failed to clear queue:', error);
    await message.reply(errorMessage(`Failed to clear queue: ${error.message}`));
  }
}
