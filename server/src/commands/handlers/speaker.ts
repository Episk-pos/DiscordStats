import { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { sessionRegistry } from '../../services/rallyround';
import { successMessage, errorMessage, formatQueue, Emoji } from '../responses';

/**
 * Check if user is facilitator
 */
function checkFacilitator(
  interaction: ChatInputCommandInteraction
): { allowed: boolean; reason?: string } {
  const guildId = interaction.guildId;
  if (!guildId) {
    return { allowed: false, reason: 'This command can only be used in a server.' };
  }

  const session = sessionRegistry.get(guildId);
  if (!session) {
    return { allowed: false, reason: 'No active session in this server.' };
  }

  if (session.facilitatorId !== interaction.user.id) {
    return { allowed: false, reason: 'Only the facilitator can use this command.' };
  }

  return { allowed: true };
}

/**
 * /rr next - Move to next speaker
 */
export async function handleNext(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;

  const permission = checkFacilitator(interaction);
  if (!permission.allowed) {
    await interaction.reply({ content: errorMessage(permission.reason!), ephemeral: true });
    return;
  }

  const session = sessionRegistry.get(guildId!)!;

  await interaction.deferReply();

  try {
    const result = await session.client.nextSpeaker(session.sessionId);

    if (result.currentSpeaker) {
      let response = `${Emoji.speaker} **${result.currentSpeaker.displayName}** now has the floor.`;
      if (result.previousSpeaker) {
        const duration = Math.round(result.previousSpeaker.duration / 60);
        response += `\nPrevious speaker: ${duration}m`;
      }
      response += `\n${result.remainingQueue} remaining in queue.`;
      await interaction.editReply(response);
    } else {
      await interaction.editReply(`${Emoji.info} The queue is empty.`);
    }
  } catch (error: any) {
    console.error('Failed to advance speaker:', error);
    await interaction.editReply(errorMessage(`Failed to advance speaker: ${error.message}`));
  }
}

/**
 * /rr speaker user:@user - Set specific speaker
 */
export async function handleSpeaker(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;

  const permission = checkFacilitator(interaction);
  if (!permission.allowed) {
    await interaction.reply({ content: errorMessage(permission.reason!), ephemeral: true });
    return;
  }

  const targetUser = interaction.options.getUser('user', true);
  const targetMember = interaction.guild?.members.cache.get(targetUser.id);

  if (!targetMember) {
    await interaction.reply({ content: errorMessage('User not found in this server.'), ephemeral: true });
    return;
  }

  const session = sessionRegistry.get(guildId!)!;

  await interaction.deferReply();

  try {
    const result = await session.client.setSpeaker(session.sessionId, { discordId: targetUser.id });

    let response = `${Emoji.speaker} **${targetMember.displayName}** now has the floor.`;
    if (result.previousSpeaker) {
      const duration = Math.round(result.previousSpeaker.duration / 60);
      response += `\nPrevious speaker: ${duration}m`;
    }
    await interaction.editReply(response);
  } catch (error: any) {
    console.error('Failed to set speaker:', error);
    await interaction.editReply(errorMessage(`Failed to set speaker: ${error.message}`));
  }
}

/**
 * /rr clear - Clear current speaker
 */
export async function handleClear(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;

  const permission = checkFacilitator(interaction);
  if (!permission.allowed) {
    await interaction.reply({ content: errorMessage(permission.reason!), ephemeral: true });
    return;
  }

  const session = sessionRegistry.get(guildId!)!;

  try {
    await session.client.clearSpeaker(session.sessionId);
    await interaction.reply(successMessage('Speaker cleared. The floor is open.'));
  } catch (error: any) {
    console.error('Failed to clear speaker:', error);
    await interaction.reply({ content: errorMessage(`Failed to clear speaker: ${error.message}`), ephemeral: true });
  }
}

/**
 * /rr queue - Display speaker queue
 */
export async function handleQueue(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({ content: errorMessage('This command can only be used in a server.'), ephemeral: true });
    return;
  }

  const session = sessionRegistry.get(guildId);
  if (!session) {
    await interaction.reply({ content: errorMessage('No active session in this server.'), ephemeral: true });
    return;
  }

  await interaction.deferReply();

  try {
    const queue = await session.client.getQueue(session.sessionId);
    const embed = formatQueue(queue);
    await interaction.editReply({ embeds: [embed] });
  } catch (error: any) {
    console.error('Failed to get queue:', error);
    await interaction.editReply(errorMessage(`Failed to get queue: ${error.message}`));
  }
}
