const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

// Define the slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('players')
        .setDescription('Shows online players'),

    new SlashCommandBuilder()
        .setName('ip')
        .setDescription('Displays server IP'),

    new SlashCommandBuilder()
        .setName('status')
        .setDescription('Displays detailed server status'),

    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows help info for this bot'),

    new SlashCommandBuilder()
        .setName('toptoday')
        .setDescription('Shows top players based on total playtime today'), // ✅ NEW

    new SlashCommandBuilder()
        .setName('spark')
        .setDescription('Informs you when the player comes online')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Player in-game name to track')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('cri')
        .setDescription('Crys eviritim 😭'),

    new SlashCommandBuilder()
        .setName('topweek')
        .setDescription('Shows top players based on total playtime this week'),

    new SlashCommandBuilder()
        .setName('topmonth')
        .setDescription('Shows top players based on total playtime this month'),

    new SlashCommandBuilder()
        .setName('playtime')
        .setDescription('Shows your total playtime'),

    new SlashCommandBuilder()
        .setName('topyear') // ✅ NEW - Top yearly playtime
        .setDescription('Shows the top yearly playtime players'),

].map(cmd => cmd.toJSON());

// Create a new REST instance with the bot token
const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

// Register the slash commands globally
rest.put(Routes.applicationCommands('1361315810941079732'), { body: commands })
    .then(() => console.log('✅ Global slash commands registered!'))
    .catch(console.error);
