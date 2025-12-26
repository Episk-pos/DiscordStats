import { REST, Routes } from 'discord.js';
import { getCommandsJSON } from './definitions';

/**
 * Register slash commands with Discord
 * Run with: npx tsx src/commands/register.ts
 */
async function registerCommands() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;

  if (!token || !clientId) {
    console.error('Missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID environment variables');
    process.exit(1);
  }

  const rest = new REST({ version: '10' }).setToken(token);
  const commands = getCommandsJSON();

  try {
    console.log(`Registering ${commands.length} slash command(s)...`);

    // Register commands globally (available in all servers)
    const data = await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    });

    console.log(`Successfully registered ${(data as any[]).length} command(s)`);
    console.log('Commands may take up to an hour to appear in all servers.');
  } catch (error) {
    console.error('Failed to register commands:', error);
    process.exit(1);
  }
}

// Run if executed directly
registerCommands();
