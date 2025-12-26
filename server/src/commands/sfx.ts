import { Message } from 'discord.js';
import { sessionRegistry } from '../services/rallyround';
import { ParsedCommand } from './parser';
import { hasActiveSession, isFacilitator } from './permissions';
import { successMessage, errorMessage, Emoji } from './responses';

// Available sounds
export const AVAILABLE_SOUNDS = [
  { name: 'chime', description: 'Hand raise notification' },
  { name: 'gavel', description: 'Point of order / session control' },
  { name: 'swoosh', description: 'Speaker transition' },
  { name: 'record-start', description: 'Recording started' },
  { name: 'record-stop', description: 'Recording stopped' },
  { name: 'ding', description: 'Agenda item complete' },
  { name: 'bell', description: 'Time warning' },
  { name: 'error', description: 'Error notification' },
  { name: 'notification', description: 'Generic notification' },
] as const;

export type SoundName = (typeof AVAILABLE_SOUNDS)[number]['name'];

/**
 * !rr sfx on|off|list|[name] - Sound effect controls
 */
export async function handleSfx(message: Message, parsed: ParsedCommand): Promise<void> {
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

  const subcommand = parsed.subcommand;

  if (!subcommand) {
    await message.reply(
      errorMessage('Usage: `!rr sfx on|off|list|[sound name]`')
    );
    return;
  }

  switch (subcommand) {
    case 'on':
      await handleSfxOn(message, guildId, member.id);
      break;
    case 'off':
      await handleSfxOff(message, guildId, member.id);
      break;
    case 'list':
      await handleSfxList(message);
      break;
    default:
      // Try to play a specific sound
      await handleSfxPlay(message, guildId, member.id, subcommand);
  }
}

/**
 * !rr sfx on - Enable sound effects
 */
async function handleSfxOn(message: Message, guildId: string, userId: string): Promise<void> {
  const permission = isFacilitator(guildId, userId);
  if (!permission.allowed) {
    await message.reply(errorMessage(permission.reason!));
    return;
  }

  sessionRegistry.setSoundEffects(guildId, true);
  await message.reply(`${Emoji.sound} Sound effects enabled.`);
}

/**
 * !rr sfx off - Disable sound effects
 */
async function handleSfxOff(message: Message, guildId: string, userId: string): Promise<void> {
  const permission = isFacilitator(guildId, userId);
  if (!permission.allowed) {
    await message.reply(errorMessage(permission.reason!));
    return;
  }

  sessionRegistry.setSoundEffects(guildId, false);
  await message.reply(`${Emoji.mute} Sound effects disabled.`);
}

/**
 * !rr sfx list - List available sounds
 */
async function handleSfxList(message: Message): Promise<void> {
  const lines = AVAILABLE_SOUNDS.map(
    (sound) => `\`${sound.name}\` - ${sound.description}`
  );

  await message.reply(
    `${Emoji.sound} **Available Sounds:**\n${lines.join('\n')}\n\n` +
    `Use \`!rr sfx [name]\` to play a sound.`
  );
}

/**
 * !rr sfx [name] - Play a specific sound
 */
async function handleSfxPlay(
  message: Message,
  guildId: string,
  userId: string,
  soundName: string
): Promise<void> {
  const session = sessionRegistry.get(guildId);
  if (!session) {
    await message.reply(errorMessage('No active session in this server.'));
    return;
  }

  // Check if sound exists
  const sound = AVAILABLE_SOUNDS.find((s) => s.name === soundName);
  if (!sound) {
    await message.reply(
      errorMessage(`Unknown sound: \`${soundName}\`. Use \`!rr sfx list\` to see available sounds.`)
    );
    return;
  }

  // Check if sound effects are enabled
  if (!session.soundEffectsEnabled) {
    await message.reply(errorMessage('Sound effects are disabled. Use `!rr sfx on` to enable.'));
    return;
  }

  // The actual sound playback will be handled by the audio service
  // For now, we'll just confirm the request
  // In the full implementation, this would call the audio service
  await message.reply(`${Emoji.sound} Playing: \`${soundName}\``);

  // TODO: Call audio service to play sound
  // audioService.playSound(guildId, soundName);
}

/**
 * Check if a sound name is valid
 */
export function isValidSound(name: string): name is SoundName {
  return AVAILABLE_SOUNDS.some((s) => s.name === name);
}
