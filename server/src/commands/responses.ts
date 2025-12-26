import { EmbedBuilder } from 'discord.js';
import { Session, QueueEntry, AgendaItem, AgendaItemStatus } from '../services/rallyround/types';

// Emoji constants
export const Emoji = {
  // Status
  success: ':white_check_mark:',
  error: ':x:',
  warning: ':warning:',
  info: ':information_source:',

  // Signals
  hand: ':raised_hand:',
  pointOfOrder: ':rotating_light:',
  clarification: ':pushpin:',
  information: ':information_source:',
  question: ':question:',
  agree: ':thumbsup:',
  disagree: ':thumbsdown:',
  away: ':zzz:',
  back: ':wave:',

  // Session
  speaker: ':speaking_head:',
  queue: ':busts_in_silhouette:',
  recording: ':red_circle:',
  pause: ':pause_button:',
  play: ':arrow_forward:',
  stop: ':stop_button:',
  mode: ':gear:',

  // Agenda
  pending: ':white_circle:',
  active: ':large_blue_circle:',
  completed: ':white_check_mark:',
  skipped: ':fast_forward:',

  // Sounds
  sound: ':loud_sound:',
  mute: ':mute:',
} as const;

/**
 * Format a success message
 */
export function successMessage(text: string): string {
  return `${Emoji.success} ${text}`;
}

/**
 * Format an error message
 */
export function errorMessage(text: string): string {
  return `${Emoji.error} ${text}`;
}

/**
 * Format session status as an embed
 */
export function formatSessionStatus(session: Session): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`${Emoji.info} Session Status`)
    .setColor(session.isRecording ? 0xff0000 : 0x5865f2)
    .addFields(
      { name: 'Title', value: session.title, inline: true },
      { name: 'Mode', value: session.mode, inline: true },
      { name: 'Status', value: session.status, inline: true }
    );

  if (session.isRecording) {
    embed.addFields({ name: 'Recording', value: `${Emoji.recording} Active`, inline: true });
  }

  if (session.currentSpeaker) {
    embed.addFields({
      name: 'Current Speaker',
      value: `${Emoji.speaker} ${session.currentSpeaker.displayName}`,
      inline: true,
    });
  }

  if (session.queue && session.queue.length > 0) {
    embed.addFields({
      name: 'Queue',
      value: `${session.queue.length} waiting`,
      inline: true,
    });
  }

  return embed;
}

/**
 * Format speaker queue as an embed
 */
export function formatQueue(queue: QueueEntry[]): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`${Emoji.queue} Speaker Queue`)
    .setColor(0x5865f2);

  if (queue.length === 0) {
    embed.setDescription('The queue is empty.');
    return embed;
  }

  const signalEmoji: Record<string, string> = {
    hand: Emoji.hand,
    point_of_order: Emoji.pointOfOrder,
    clarification: Emoji.clarification,
    information: Emoji.information,
    question: Emoji.question,
  };

  const lines = queue.map((entry, index) => {
    const emoji = signalEmoji[entry.signal] || Emoji.hand;
    const ack = entry.acknowledged ? ' (ack)' : '';
    return `${index + 1}. ${emoji} **${entry.displayName}**${ack}`;
  });

  embed.setDescription(lines.join('\n'));
  return embed;
}

/**
 * Format agenda as an embed
 */
export function formatAgenda(agenda: AgendaItem[]): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`${Emoji.info} Agenda`)
    .setColor(0x5865f2);

  if (agenda.length === 0) {
    embed.setDescription('No agenda items.');
    return embed;
  }

  const statusEmoji: Record<AgendaItemStatus, string> = {
    pending: Emoji.pending,
    active: Emoji.active,
    completed: Emoji.completed,
    skipped: Emoji.skipped,
  };

  const lines = agenda.map((item) => {
    const emoji = statusEmoji[item.status];
    const duration = item.duration ? ` (${item.duration}m)` : '';
    return `${emoji} ${item.title}${duration}`;
  });

  embed.setDescription(lines.join('\n'));
  return embed;
}

/**
 * Format help message
 */
export function formatHelp(): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('RallyRound Bot Commands')
    .setColor(0x5865f2)
    .setDescription('Use `!rr <command>` to interact with live sessions.')
    .addFields(
      {
        name: 'Session (Facilitator)',
        value: [
          '`!rr start [title]` - Start a new session',
          '`!rr end` - End the current session',
          '`!rr pause` - Pause the session',
          '`!rr resume` - Resume the session',
          '`!rr status` - Show session status',
          '`!rr link` - Post dashboard URL',
        ].join('\n'),
      },
      {
        name: 'Mode & Recording (Facilitator)',
        value: [
          '`!rr mode structured|unstructured` - Change mode',
          '`!rr record start|stop` - Toggle recording',
        ].join('\n'),
      },
      {
        name: 'Speaker (Facilitator)',
        value: [
          '`!rr next` - Move to next speaker',
          '`!rr speaker @user` - Set specific speaker',
          '`!rr clear` - Clear speaker',
          '`!rr queue` - Show speaker queue',
        ].join('\n'),
      },
      {
        name: 'Signals (Voice Channel)',
        value: [
          '`!rr hand` - Raise/lower hand',
          '`!rr point order|clarify|info` - Parliamentary signals',
          '`!rr question` - Question signal',
          '`!rr agree` / `!rr disagree` - Sentiment signals',
          '`!rr away` / `!rr back` - Status updates',
        ].join('\n'),
      },
      {
        name: 'Agenda (Facilitator)',
        value: [
          '`!rr agenda` - Show agenda',
          '`!rr agenda add [item]` - Add item',
          '`!rr agenda next` - Advance to next item',
          '`!rr agenda done` - Mark current complete',
          '`!rr agenda skip` - Skip current item',
        ].join('\n'),
      },
      {
        name: 'Sound Effects',
        value: [
          '`!rr sfx on|off` - Enable/disable sounds',
          '`!rr sfx list` - List available sounds',
          '`!rr sfx [name]` - Play specific sound',
        ].join('\n'),
      }
    );

  return embed;
}

/**
 * Get signal emoji
 */
export function getSignalEmoji(signal: string): string {
  const map: Record<string, string> = {
    hand: Emoji.hand,
    point_of_order: Emoji.pointOfOrder,
    clarification: Emoji.clarification,
    information: Emoji.information,
    question: Emoji.question,
    agree: Emoji.agree,
    disagree: Emoji.disagree,
    away: Emoji.away,
    back: Emoji.back,
  };
  return map[signal] || Emoji.hand;
}
