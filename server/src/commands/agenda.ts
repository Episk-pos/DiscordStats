import { Message, TextChannel } from 'discord.js';
import { sessionRegistry } from '../services/rallyround';
import { ParsedCommand, joinArgs } from './parser';
import { isFacilitator, hasActiveSession } from './permissions';
import { successMessage, errorMessage, formatAgenda, Emoji } from './responses';

/**
 * !rr agenda - Display or manage agenda
 */
export async function handleAgenda(message: Message, parsed: ParsedCommand): Promise<void> {
  const { guildId, member } = message;

  if (!guildId || !member) {
    await message.reply(errorMessage('This command can only be used in a server.'));
    return;
  }

  const sessionCheck = hasActiveSession(guildId);
  if (!sessionCheck.allowed) {
    await message.reply(errorMessage(sessionCheck.reason!));
    return;
  }

  const session = sessionRegistry.get(guildId)!;

  // No subcommand = display agenda
  if (!parsed.subcommand) {
    try {
      const agenda = await session.client.getAgenda(session.sessionId);
      const embed = formatAgenda(agenda);
      await message.reply({ embeds: [embed] });
    } catch (error: any) {
      console.error('Failed to get agenda:', error);
      await message.reply(errorMessage(`Failed to get agenda: ${error.message}`));
    }
    return;
  }

  // Subcommands require facilitator permission
  const permission = isFacilitator(guildId, member.id);
  if (!permission.allowed) {
    await message.reply(errorMessage(permission.reason!));
    return;
  }

  switch (parsed.subcommand) {
    case 'add':
      await handleAgendaAdd(message, session, parsed);
      break;
    case 'next':
      await handleAgendaNext(message, session);
      break;
    case 'done':
      await handleAgendaDone(message, session);
      break;
    case 'skip':
      await handleAgendaSkip(message, session);
      break;
    default:
      await message.reply(
        errorMessage('Usage: `!rr agenda`, `!rr agenda add [item]`, `!rr agenda next|done|skip`')
      );
  }
}

/**
 * !rr agenda add [item] - Add agenda item
 */
async function handleAgendaAdd(
  message: Message,
  session: ReturnType<typeof sessionRegistry.get>,
  parsed: ParsedCommand
): Promise<void> {
  if (!session) return;

  const title = joinArgs(parsed.args);
  if (!title) {
    await message.reply(errorMessage('Usage: `!rr agenda add [item title]`'));
    return;
  }

  try {
    const item = await session.client.addAgendaItem(session.sessionId, { title });
    await message.reply(successMessage(`Added agenda item: **${item.title}**`));
  } catch (error: any) {
    console.error('Failed to add agenda item:', error);
    await message.reply(errorMessage(`Failed to add agenda item: ${error.message}`));
  }
}

/**
 * !rr agenda next - Advance to next agenda item
 */
async function handleAgendaNext(
  message: Message,
  session: ReturnType<typeof sessionRegistry.get>
): Promise<void> {
  if (!session) return;

  try {
    const item = await session.client.advanceAgenda(session.sessionId);
    await message.reply(
      `${Emoji.active} Now discussing: **${item.title}**`
    );
  } catch (error: any) {
    console.error('Failed to advance agenda:', error);
    if (error.code === 'NOT_FOUND') {
      await message.reply(errorMessage('No more pending agenda items.'));
    } else {
      await message.reply(errorMessage(`Failed to advance agenda: ${error.message}`));
    }
  }
}

/**
 * !rr agenda done - Mark current item as complete
 */
async function handleAgendaDone(
  message: Message,
  session: ReturnType<typeof sessionRegistry.get>
): Promise<void> {
  if (!session) return;

  try {
    // Get current agenda to find active item
    const agenda = await session.client.getAgenda(session.sessionId);
    const activeItem = agenda.find((item) => item.status === 'active');

    if (!activeItem) {
      await message.reply(errorMessage('No active agenda item to complete.'));
      return;
    }

    await session.client.updateAgendaItem(session.sessionId, activeItem.id, {
      status: 'completed',
    });

    await message.reply(
      `${Emoji.completed} Completed: **${activeItem.title}**`
    );

    // Automatically advance to next item if available
    const pendingItems = agenda.filter((item) => item.status === 'pending');
    if (pendingItems.length > 0) {
      const nextItem = await session.client.advanceAgenda(session.sessionId);
      if (message.channel.isTextBased() && 'send' in message.channel) {
        await (message.channel as TextChannel).send(
          `${Emoji.active} Next up: **${nextItem.title}**`
        );
      }
    }
  } catch (error: any) {
    console.error('Failed to complete agenda item:', error);
    await message.reply(errorMessage(`Failed to complete agenda item: ${error.message}`));
  }
}

/**
 * !rr agenda skip - Skip current item
 */
async function handleAgendaSkip(
  message: Message,
  session: ReturnType<typeof sessionRegistry.get>
): Promise<void> {
  if (!session) return;

  try {
    // Get current agenda to find active item
    const agenda = await session.client.getAgenda(session.sessionId);
    const activeItem = agenda.find((item) => item.status === 'active');

    if (!activeItem) {
      await message.reply(errorMessage('No active agenda item to skip.'));
      return;
    }

    await session.client.updateAgendaItem(session.sessionId, activeItem.id, {
      status: 'skipped',
    });

    await message.reply(
      `${Emoji.skipped} Skipped: **${activeItem.title}**`
    );

    // Automatically advance to next item if available
    const pendingItems = agenda.filter((item) => item.status === 'pending');
    if (pendingItems.length > 0) {
      const nextItem = await session.client.advanceAgenda(session.sessionId);
      if (message.channel.isTextBased() && 'send' in message.channel) {
        await (message.channel as TextChannel).send(
          `${Emoji.active} Next up: **${nextItem.title}**`
        );
      }
    }
  } catch (error: any) {
    console.error('Failed to skip agenda item:', error);
    await message.reply(errorMessage(`Failed to skip agenda item: ${error.message}`));
  }
}
