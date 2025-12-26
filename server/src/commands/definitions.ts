import { SlashCommandBuilder } from 'discord.js';

/**
 * Define all RallyRound slash commands
 */
export const rrCommand = new SlashCommandBuilder()
  .setName('rr')
  .setDescription('RallyRound live session commands')

  // Session Management
  .addSubcommand((sub) =>
    sub
      .setName('start')
      .setDescription('Start a new RallyRound session')
      .addStringOption((opt) =>
        opt.setName('title').setDescription('Session title').setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub.setName('end').setDescription('End the current session')
  )
  .addSubcommand((sub) =>
    sub.setName('pause').setDescription('Pause the current session')
  )
  .addSubcommand((sub) =>
    sub.setName('resume').setDescription('Resume the paused session')
  )
  .addSubcommand((sub) =>
    sub.setName('status').setDescription('Show current session status')
  )
  .addSubcommand((sub) =>
    sub.setName('link').setDescription('Post the session dashboard URL')
  )

  // Mode and Recording
  .addSubcommand((sub) =>
    sub
      .setName('mode')
      .setDescription('Change session mode')
      .addStringOption((opt) =>
        opt
          .setName('mode')
          .setDescription('Session mode')
          .setRequired(true)
          .addChoices(
            { name: 'Structured', value: 'structured' },
            { name: 'Unstructured', value: 'unstructured' }
          )
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('record')
      .setDescription('Control session recording')
      .addStringOption((opt) =>
        opt
          .setName('action')
          .setDescription('Recording action')
          .setRequired(true)
          .addChoices(
            { name: 'Start Recording', value: 'start' },
            { name: 'Stop Recording', value: 'stop' }
          )
      )
  )

  // Speaker Management
  .addSubcommand((sub) =>
    sub.setName('next').setDescription('Move to the next speaker in queue')
  )
  .addSubcommand((sub) =>
    sub
      .setName('speaker')
      .setDescription('Set a specific user as the current speaker')
      .addUserOption((opt) =>
        opt.setName('user').setDescription('User to set as speaker').setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub.setName('clear').setDescription('Clear the current speaker')
  )
  .addSubcommand((sub) =>
    sub.setName('queue').setDescription('Display the speaker queue')
  )

  // Signals
  .addSubcommand((sub) =>
    sub.setName('hand').setDescription('Raise or lower your hand')
  )
  .addSubcommand((sub) =>
    sub
      .setName('point')
      .setDescription('Raise a parliamentary point')
      .addStringOption((opt) =>
        opt
          .setName('type')
          .setDescription('Type of point')
          .setRequired(true)
          .addChoices(
            { name: 'Point of Order', value: 'order' },
            { name: 'Point of Clarification', value: 'clarify' },
            { name: 'Point of Information', value: 'info' }
          )
      )
  )
  .addSubcommand((sub) =>
    sub.setName('question').setDescription('Signal that you have a question')
  )
  .addSubcommand((sub) =>
    sub.setName('agree').setDescription('Signal agreement')
  )
  .addSubcommand((sub) =>
    sub.setName('disagree').setDescription('Signal disagreement')
  )
  .addSubcommand((sub) =>
    sub.setName('away').setDescription('Mark yourself as away')
  )
  .addSubcommand((sub) =>
    sub.setName('back').setDescription('Mark yourself as back')
  )

  // Agenda
  .addSubcommand((sub) =>
    sub.setName('agenda').setDescription('Display the session agenda')
  )
  .addSubcommand((sub) =>
    sub
      .setName('agenda-add')
      .setDescription('Add an item to the agenda')
      .addStringOption((opt) =>
        opt.setName('item').setDescription('Agenda item title').setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub.setName('agenda-next').setDescription('Advance to the next agenda item')
  )
  .addSubcommand((sub) =>
    sub.setName('agenda-done').setDescription('Mark the current agenda item as complete')
  )
  .addSubcommand((sub) =>
    sub.setName('agenda-skip').setDescription('Skip the current agenda item')
  )

  // Sound Effects
  .addSubcommand((sub) =>
    sub
      .setName('sfx')
      .setDescription('Control sound effects')
      .addStringOption((opt) =>
        opt
          .setName('action')
          .setDescription('Sound effect action')
          .setRequired(true)
          .addChoices(
            { name: 'Enable', value: 'on' },
            { name: 'Disable', value: 'off' },
            { name: 'List Sounds', value: 'list' }
          )
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('sfx-play')
      .setDescription('Play a specific sound effect')
      .addStringOption((opt) =>
        opt
          .setName('sound')
          .setDescription('Sound to play')
          .setRequired(true)
          .addChoices(
            { name: 'Chime', value: 'chime' },
            { name: 'Gavel', value: 'gavel' },
            { name: 'Swoosh', value: 'swoosh' },
            { name: 'Ding', value: 'ding' },
            { name: 'Bell', value: 'bell' },
            { name: 'Notification', value: 'notification' }
          )
      )
  );

/**
 * Get all commands as JSON for registration
 */
export function getCommandsJSON() {
  return [rrCommand.toJSON()];
}
