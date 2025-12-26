import { ChatInputCommandInteraction, TextChannel } from 'discord.js';
import { sessionRegistry } from '../../services/rallyround';
import { successMessage, errorMessage, formatAgenda, Emoji } from '../responses';

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
 * /rr agenda - Display agenda
 */
export async function handleAgenda(interaction: ChatInputCommandInteraction): Promise<void> {
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
    const agenda = await session.client.getAgenda(session.sessionId);
    const embed = formatAgenda(agenda);
    await interaction.editReply({ embeds: [embed] });
  } catch (error: any) {
    console.error('Failed to get agenda:', error);
    await interaction.editReply(errorMessage(`Failed to get agenda: ${error.message}`));
  }
}

/**
 * /rr agenda-add item:"Title"
 */
export async function handleAgendaAdd(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;

  const permission = checkFacilitator(interaction);
  if (!permission.allowed) {
    await interaction.reply({ content: errorMessage(permission.reason!), ephemeral: true });
    return;
  }

  const title = interaction.options.getString('item', true);
  const session = sessionRegistry.get(guildId!)!;

  try {
    const item = await session.client.addAgendaItem(session.sessionId, { title });
    await interaction.reply(successMessage(`Added agenda item: **${item.title}**`));
  } catch (error: any) {
    console.error('Failed to add agenda item:', error);
    await interaction.reply({ content: errorMessage(`Failed to add agenda item: ${error.message}`), ephemeral: true });
  }
}

/**
 * /rr agenda-next
 */
export async function handleAgendaNext(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;

  const permission = checkFacilitator(interaction);
  if (!permission.allowed) {
    await interaction.reply({ content: errorMessage(permission.reason!), ephemeral: true });
    return;
  }

  const session = sessionRegistry.get(guildId!)!;

  try {
    const item = await session.client.advanceAgenda(session.sessionId);
    await interaction.reply(`${Emoji.active} Now discussing: **${item.title}**`);
  } catch (error: any) {
    console.error('Failed to advance agenda:', error);
    if (error.code === 'NOT_FOUND') {
      await interaction.reply({ content: errorMessage('No more pending agenda items.'), ephemeral: true });
    } else {
      await interaction.reply({ content: errorMessage(`Failed to advance agenda: ${error.message}`), ephemeral: true });
    }
  }
}

/**
 * /rr agenda-done
 */
export async function handleAgendaDone(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;

  const permission = checkFacilitator(interaction);
  if (!permission.allowed) {
    await interaction.reply({ content: errorMessage(permission.reason!), ephemeral: true });
    return;
  }

  const session = sessionRegistry.get(guildId!)!;

  await interaction.deferReply();

  try {
    const agenda = await session.client.getAgenda(session.sessionId);
    const activeItem = agenda.find((item) => item.status === 'active');

    if (!activeItem) {
      await interaction.editReply(errorMessage('No active agenda item to complete.'));
      return;
    }

    await session.client.updateAgendaItem(session.sessionId, activeItem.id, {
      status: 'completed',
    });

    let response = `${Emoji.completed} Completed: **${activeItem.title}**`;

    const pendingItems = agenda.filter((item) => item.status === 'pending');
    if (pendingItems.length > 0) {
      const nextItem = await session.client.advanceAgenda(session.sessionId);
      response += `\n${Emoji.active} Next up: **${nextItem.title}**`;
    }

    await interaction.editReply(response);
  } catch (error: any) {
    console.error('Failed to complete agenda item:', error);
    await interaction.editReply(errorMessage(`Failed to complete agenda item: ${error.message}`));
  }
}

/**
 * /rr agenda-skip
 */
export async function handleAgendaSkip(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;

  const permission = checkFacilitator(interaction);
  if (!permission.allowed) {
    await interaction.reply({ content: errorMessage(permission.reason!), ephemeral: true });
    return;
  }

  const session = sessionRegistry.get(guildId!)!;

  await interaction.deferReply();

  try {
    const agenda = await session.client.getAgenda(session.sessionId);
    const activeItem = agenda.find((item) => item.status === 'active');

    if (!activeItem) {
      await interaction.editReply(errorMessage('No active agenda item to skip.'));
      return;
    }

    await session.client.updateAgendaItem(session.sessionId, activeItem.id, {
      status: 'skipped',
    });

    let response = `${Emoji.skipped} Skipped: **${activeItem.title}**`;

    const pendingItems = agenda.filter((item) => item.status === 'pending');
    if (pendingItems.length > 0) {
      const nextItem = await session.client.advanceAgenda(session.sessionId);
      response += `\n${Emoji.active} Next up: **${nextItem.title}**`;
    }

    await interaction.editReply(response);
  } catch (error: any) {
    console.error('Failed to skip agenda item:', error);
    await interaction.editReply(errorMessage(`Failed to skip agenda item: ${error.message}`));
  }
}
