import { Message } from 'discord.js';
import { parseCommand } from './parser';
import { formatHelp, errorMessage } from './responses';
import {
  handleStart,
  handleEnd,
  handlePause,
  handleResume,
  handleStatus,
  handleLink,
  handleMode,
  handleRecord,
} from './session';
import {
  handleNext,
  handleSpeaker,
  handleClear,
  handleQueue,
  handleClearQueue,
} from './speaker';
import {
  handleHand,
  handlePoint,
  handleQuestion,
  handleAgree,
  handleDisagree,
  handleAway,
  handleBack,
} from './signals';
import { handleAgenda } from './agenda';
import { handleSfx } from './sfx';

/**
 * Main command handler - routes messages to appropriate command handlers
 */
export async function handleCommand(message: Message): Promise<void> {
  // Ignore bot messages
  if (message.author.bot) return;

  // Parse the command
  const parsed = parseCommand(message);
  if (!parsed) return;

  try {
    switch (parsed.command) {
      // Session commands
      case 'start':
        await handleStart(message, parsed);
        break;
      case 'end':
        await handleEnd(message);
        break;
      case 'pause':
        await handlePause(message);
        break;
      case 'resume':
        await handleResume(message);
        break;
      case 'status':
        await handleStatus(message);
        break;
      case 'link':
        await handleLink(message);
        break;

      // Mode and recording
      case 'mode':
        await handleMode(message, parsed);
        break;
      case 'record':
        await handleRecord(message, parsed);
        break;

      // Speaker commands
      case 'next':
        await handleNext(message);
        break;
      case 'speaker':
        await handleSpeaker(message, parsed);
        break;
      case 'clear':
        await handleClear(message);
        break;
      case 'queue':
        await handleQueue(message);
        break;
      case 'clearqueue':
        await handleClearQueue(message);
        break;

      // Signal commands
      case 'hand':
        await handleHand(message);
        break;
      case 'point':
        await handlePoint(message, parsed);
        break;
      case 'question':
        await handleQuestion(message);
        break;
      case 'agree':
        await handleAgree(message);
        break;
      case 'disagree':
        await handleDisagree(message);
        break;
      case 'away':
        await handleAway(message);
        break;
      case 'back':
        await handleBack(message);
        break;

      // Agenda commands
      case 'agenda':
        await handleAgenda(message, parsed);
        break;

      // Sound effect commands
      case 'sfx':
        await handleSfx(message, parsed);
        break;

      // Help
      case 'help':
        const embed = formatHelp();
        await message.reply({ embeds: [embed] });
        break;

      // Unknown command
      default:
        await message.reply(
          errorMessage(`Unknown command: \`${parsed.command}\`. Use \`!rr help\` for a list of commands.`)
        );
    }
  } catch (error) {
    console.error('Command error:', error);
    await message.reply(errorMessage('An error occurred while processing your command.'));
  }
}

export { parseCommand } from './parser';
export { clearSessionSignals, clearUserSignal } from './signals';
