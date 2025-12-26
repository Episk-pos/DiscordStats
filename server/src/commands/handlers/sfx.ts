import { ChatInputCommandInteraction } from 'discord.js';
import { sessionRegistry } from '../../services/rallyround';
import { successMessage, errorMessage, Emoji } from '../responses';

// Available sounds
export const AVAILABLE_SOUNDS = [
  { name: 'chime', description: 'Hand raise notification' },
  { name: 'gavel', description: 'Point of order / session control' },
  { name: 'swoosh', description: 'Speaker transition' },
  { name: 'ding', description: 'Agenda item complete' },
  { name: 'bell', description: 'Time warning' },
  { name: 'notification', description: 'Generic notification' },
] as const;

export type SoundName = (typeof AVAILABLE_SOUNDS)[number]['name'];

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
 * /rr sfx action:on|off|list
 */
export async function handleSfx(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;
  const action = interaction.options.getString('action', true);

  if (!guildId) {
    await interaction.reply({ content: errorMessage('This command can only be used in a server.'), ephemeral: true });
    return;
  }

  const session = sessionRegistry.get(guildId);
  if (!session) {
    await interaction.reply({ content: errorMessage('No active session in this server.'), ephemeral: true });
    return;
  }

  switch (action) {
    case 'on': {
      const permission = checkFacilitator(interaction);
      if (!permission.allowed) {
        await interaction.reply({ content: errorMessage(permission.reason!), ephemeral: true });
        return;
      }
      sessionRegistry.setSoundEffects(guildId, true);
      await interaction.reply(`${Emoji.sound} Sound effects enabled.`);
      break;
    }

    case 'off': {
      const permission = checkFacilitator(interaction);
      if (!permission.allowed) {
        await interaction.reply({ content: errorMessage(permission.reason!), ephemeral: true });
        return;
      }
      sessionRegistry.setSoundEffects(guildId, false);
      await interaction.reply(`${Emoji.mute} Sound effects disabled.`);
      break;
    }

    case 'list': {
      const lines = AVAILABLE_SOUNDS.map(
        (sound) => `\`${sound.name}\` - ${sound.description}`
      );
      await interaction.reply({
        content: `${Emoji.sound} **Available Sounds:**\n${lines.join('\n')}\n\nUse \`/rr sfx-play sound:[name]\` to play a sound.`,
        ephemeral: true,
      });
      break;
    }
  }
}

/**
 * /rr sfx-play sound:[name]
 */
export async function handleSfxPlay(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;
  const soundName = interaction.options.getString('sound', true);

  if (!guildId) {
    await interaction.reply({ content: errorMessage('This command can only be used in a server.'), ephemeral: true });
    return;
  }

  const session = sessionRegistry.get(guildId);
  if (!session) {
    await interaction.reply({ content: errorMessage('No active session in this server.'), ephemeral: true });
    return;
  }

  if (!session.soundEffectsEnabled) {
    await interaction.reply({ content: errorMessage('Sound effects are disabled. Use `/rr sfx action:on` to enable.'), ephemeral: true });
    return;
  }

  // Validate sound name
  const sound = AVAILABLE_SOUNDS.find((s) => s.name === soundName);
  if (!sound) {
    await interaction.reply({ content: errorMessage(`Unknown sound: \`${soundName}\``), ephemeral: true });
    return;
  }

  // TODO: Actually play the sound via audio service
  // audioService.playSound(guildId, soundName);

  await interaction.reply(`${Emoji.sound} Playing: \`${soundName}\``);
}

/**
 * Check if a sound name is valid
 */
export function isValidSound(name: string): name is SoundName {
  return AVAILABLE_SOUNDS.some((s) => s.name === name);
}
