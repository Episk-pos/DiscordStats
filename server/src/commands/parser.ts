import { Message } from 'discord.js';

export interface ParsedCommand {
  command: string;
  subcommand?: string;
  args: string[];
  mentions: string[]; // User IDs from mentions
  raw: string;
}

const COMMAND_PREFIX = '!rr';

/**
 * Parse a message to extract command, subcommand, and arguments
 */
export function parseCommand(message: Message): ParsedCommand | null {
  const content = message.content.trim();

  if (!content.toLowerCase().startsWith(COMMAND_PREFIX)) {
    return null;
  }

  // Remove prefix and split into parts
  const withoutPrefix = content.slice(COMMAND_PREFIX.length).trim();
  const parts = withoutPrefix.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return {
      command: 'help',
      args: [],
      mentions: [],
      raw: content,
    };
  }

  const command = parts[0].toLowerCase();
  const restParts = parts.slice(1);

  // Extract user mentions
  const mentions = message.mentions.users.map((user) => user.id);

  // Handle commands with subcommands
  const commandsWithSubcommands = ['mode', 'record', 'point', 'agenda', 'sfx'];

  let subcommand: string | undefined;
  let args: string[];

  if (commandsWithSubcommands.includes(command) && restParts.length > 0) {
    subcommand = restParts[0].toLowerCase();
    args = restParts.slice(1);
  } else {
    args = restParts;
  }

  // Remove mention strings from args (they're captured separately)
  args = args.filter((arg) => !arg.match(/^<@!?\d+>$/));

  return {
    command,
    subcommand,
    args,
    mentions,
    raw: content,
  };
}

/**
 * Join remaining args as a single string (for titles, descriptions, etc.)
 */
export function joinArgs(args: string[]): string {
  return args.join(' ').trim();
}
