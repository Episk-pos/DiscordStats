import { ChatInputCommandInteraction } from 'discord.js';
import {
  handleStart,
  handleEnd,
  handlePause,
  handleResume,
  handleStatus,
  handleLink,
  handleMode,
  handleRecord,
} from './handlers/session';
import {
  handleNext,
  handleSpeaker,
  handleClear,
  handleQueue,
} from './handlers/speaker';
import {
  handleHand,
  handlePoint,
  handleQuestion,
  handleAgree,
  handleDisagree,
  handleAway,
  handleBack,
  clearSessionSignals,
  clearUserSignal,
} from './handlers/signals';
import {
  handleAgenda,
  handleAgendaAdd,
  handleAgendaNext,
  handleAgendaDone,
  handleAgendaSkip,
} from './handlers/agenda';
import { handleSfx, handleSfxPlay } from './handlers/sfx';
import { errorMessage } from './responses';

/**
 * Route slash command interactions to appropriate handlers
 */
export async function handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  // Only handle /rr commands
  if (interaction.commandName !== 'rr') {
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  try {
    switch (subcommand) {
      // Session commands
      case 'start':
        await handleStart(interaction);
        break;
      case 'end':
        await handleEnd(interaction);
        break;
      case 'pause':
        await handlePause(interaction);
        break;
      case 'resume':
        await handleResume(interaction);
        break;
      case 'status':
        await handleStatus(interaction);
        break;
      case 'link':
        await handleLink(interaction);
        break;

      // Mode and recording
      case 'mode':
        await handleMode(interaction);
        break;
      case 'record':
        await handleRecord(interaction);
        break;

      // Speaker commands
      case 'next':
        await handleNext(interaction);
        break;
      case 'speaker':
        await handleSpeaker(interaction);
        break;
      case 'clear':
        await handleClear(interaction);
        break;
      case 'queue':
        await handleQueue(interaction);
        break;

      // Signal commands
      case 'hand':
        await handleHand(interaction);
        break;
      case 'point':
        await handlePoint(interaction);
        break;
      case 'question':
        await handleQuestion(interaction);
        break;
      case 'agree':
        await handleAgree(interaction);
        break;
      case 'disagree':
        await handleDisagree(interaction);
        break;
      case 'away':
        await handleAway(interaction);
        break;
      case 'back':
        await handleBack(interaction);
        break;

      // Agenda commands
      case 'agenda':
        await handleAgenda(interaction);
        break;
      case 'agenda-add':
        await handleAgendaAdd(interaction);
        break;
      case 'agenda-next':
        await handleAgendaNext(interaction);
        break;
      case 'agenda-done':
        await handleAgendaDone(interaction);
        break;
      case 'agenda-skip':
        await handleAgendaSkip(interaction);
        break;

      // Sound effect commands
      case 'sfx':
        await handleSfx(interaction);
        break;
      case 'sfx-play':
        await handleSfxPlay(interaction);
        break;

      default:
        await interaction.reply({
          content: errorMessage(`Unknown command: \`${subcommand}\``),
          ephemeral: true,
        });
    }
  } catch (error) {
    console.error('Slash command error:', error);
    const errorResponse = errorMessage('An error occurred while processing your command.');

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorResponse, ephemeral: true });
    } else {
      await interaction.reply({ content: errorResponse, ephemeral: true });
    }
  }
}

// Re-export utilities
export { clearSessionSignals, clearUserSignal };
export { getCommandsJSON } from './definitions';
