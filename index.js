const { Client, IntentsBitField, EmbedBuilder } = require('discord.js');
const samp = require('samp-query');
require('dotenv').config();
const { MongoClient } = require('mongodb');  // MongoDB integration

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent
    ]
});

// Configuration
const config = {
    BOT_TOKEN: process.env.BOT_TOKEN,
    SAMP_SERVER_IP: '163.172.105.21',
    SAMP_SERVER_PORT: 7777,
    SERVER_NAME: 'Valiant Roleplay/Freeroam',
    HEX_COLOR: '#0099ff',
    OFFLINE_COLOR: '#ff0000',
    ICON_URL: 'https://i.postimg.cc/zBrffQy6/vg.png',
    MAX_PLAYERS_PER_PAGE: 15,
    MONGODB_URI: 'mongodb+srv://vg-bot:ashwinjr10@vg-bot.eypjth3.mongodb.net/?retryWrites=true&w=majority&appName=vG-Bot',
    DB_NAME: 'valiant',
    COLLECTION_NAME: 'players'
};

// MongoDB Client Setup
const clientMongo = new MongoClient(config.MONGODB_URI);
let db = null;

// Ready event when the bot logs in
client.on('ready', async () => {
    console.log(`✅ ${client.user.tag} is ready!`);
    client.user.setActivity(`${config.SERVER_NAME}`, { type: 'WATCHING' });

    try {
        await clientMongo.connect();
        db = clientMongo.db(config.DB_NAME);
        console.log('✅ MongoDB connected');
    } catch (err) {
        console.error('❌ MongoDB connection failed:', err);
    }
});

// Handle slash commands
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    try {
        switch (interaction.commandName) {
            case 'players':
                await getPlayers(interaction);
                break;
            case 'ip':
                await getServerIP(interaction);
                break;
            case 'status':
                await getServerStatus(interaction);
                break;
            case 'help':
                await sendHelpEmbed(interaction);
                break;
            case 'toptoday':
                await getTopPlayers(interaction);
                break;
            case 'topweek':
                await getTopPlayersWeek(interaction);
                break;
            case 'topmonth':
                await getTopPlayersMonth(interaction);
                break;
            case 'spark':
                await sparkCommand(interaction);
                break;
            case 'cri':
                await handleCriCommand(interaction);
                break;
            case 'playtime':
                await getPlaytime(interaction);
                break;
            case 'topyear':
                await getTopPlayersYear(interaction);
                break;
            default:
                await interaction.reply('❓ Unknown command! Type `/help` for a list of available commands.');
        }
    } catch (err) {
        console.error('❌ Error handling interaction:', err);
        await interaction.reply('⚠️ An error occurred while processing your request. Please try again later.');
    }
});

// Command functions

async function getPlayers(interaction) {
    try {
        const options = {
            host: config.SAMP_SERVER_IP,
            port: config.SAMP_SERVER_PORT
        };

        await interaction.deferReply();

        const response = await new Promise((resolve, reject) => {
            samp(options, (error, res) => {
                if (error) reject(error);
                else resolve(res);
            });
        });

        let playerList = '';
        if (response.players && response.players.length > 0) {
            const maxIdLength = Math.max(2, response.players.length.toString().length);
            const maxNickLength = Math.min(
                response.players.reduce((max, player) => Math.max(max, player.name.length), 11),
                20
            );
            const maxScoreLength = Math.max(5, response.players.reduce((max, player) => Math.max(max, player.score.toString().length), 0));

            const header = `| ${'ID'.padEnd(maxIdLength)} |  ${'NICKNAME'.padEnd(maxNickLength)}  |  ${'SCORE'.padStart(maxScoreLength)} |`;

            const playerRows = response.players.slice(0, 25).map((player, index) => {
                const cleanName = player.name.replace(/`/g, "'"); // Handle special characters
                return `| ${(index + 1).toString().padEnd(maxIdLength)} |  ${cleanName.padEnd(maxNickLength)}  |  ${player.score.toString().padStart(maxScoreLength)} |`;
            }).join('\n');

            playerList = `${header}\n\n${playerRows}`;
        } else {
            // If no players are online, show a message without the code block
            playerList = '🚫 No players are currently online.';
        }

        const embed = new EmbedBuilder()
            .setColor(config.HEX_COLOR) // Soft white color for readability
            .setTitle(`${config.SERVER_NAME} - Player List`)
            .setDescription(`**Online Players:** ${response.players.length}/${response.maxplayers}`)
            .addFields(
                { name: '\u200B', value: response.players.length > 0 ? `\`\`\`\n${playerList}\n\`\`\`` : playerList } // Show playerList in code block only if players are online
            )
            .setFooter({
                text: `Requested by ${interaction.member?.displayName || interaction.user.username} \n Made with ✨`,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();

        interaction.followUp({ embeds: [embed] });

    } catch (error) {
        console.error('Player command error:', error);
        interaction.followUp('⚠️ An error occurred while fetching player data.');
    }
}


// MongoDB function to get top players from the database
async function getTopPlayers(interaction) {
    try {
        await interaction.deferReply();

        const playersCollection = db.collection(config.COLLECTION_NAME);
        const topPlayers = await playersCollection.find().sort({ playtime: -1 }).limit(9).toArray();

        if (topPlayers.length === 0) {
            return interaction.followUp('❌ No players have recorded playtime yet.');
        }

        let leaderboard = '```md\n';
        topPlayers.forEach((player, index) => {
            const hours = Math.floor(player.playtime / 3600);
            const mins = Math.floor((player.playtime % 3600) / 60);
            leaderboard += `#${String(index + 1).padEnd(2)} ${player.name.padEnd(20)} : ${hours}h ${mins}m\n`;
        });
        leaderboard += '```';

        const embed = new EmbedBuilder()
            .setColor(config.HEX_COLOR)
            .setTitle('🏆 Top Players by Playtime')
            .setDescription(leaderboard)
            .setFooter({ 
                text: `Requested by ${interaction.member?.displayName || interaction.user.username} \n • Made with ✨`, 
                iconURL: interaction.user.displayAvatarURL() 
            })
            .setTimestamp();

        interaction.followUp({ embeds: [embed] });

    } catch (err) {
        console.error('TopPlayers error:', err);
        interaction.followUp('⚠️ Error fetching top players.');
    }
}

async function getTopPlayersWeek(interaction) {
    try {
        await interaction.deferReply();

        const playersWeekCollection = db.collection('players_week');
        const topPlayers = await playersWeekCollection.find().sort({ playtime: -1 }).limit(9).toArray();

        if (topPlayers.length === 0) {
            return interaction.followUp('❌ No players have recorded playtime this week.');
        }

        let leaderboard = '```md\n';
        topPlayers.forEach((player, index) => {
            const totalTime = player.playtime || 0;
            const hours = Math.floor(totalTime / 3600);
            const mins = Math.floor((totalTime % 3600) / 60);
            leaderboard += `#${String(index + 1).padEnd(2)} ${player.name.padEnd(20)} : ${hours}h ${mins}m\n`;
        });
        leaderboard += '```';

        const embed = new EmbedBuilder()
            .setColor(config.HEX_COLOR)
            .setTitle('🤴 Top Players This Week 🤴') // Princess Crown for the week
            .setDescription(leaderboard)
            .setFooter({
                text: `Requested by ${interaction.member?.displayName || interaction.user.username} \n • Made with ✨`,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();

        interaction.followUp({ embeds: [embed] });

    } catch (err) {
        console.error('TopPlayersWeek error:', err);
        interaction.followUp('⚠️ Error fetching top players for the week.');
    }
}



async function getTopPlayersMonth(interaction) {
    try {
        await interaction.deferReply();

        const playersMonthCollection = db.collection('players_month');
        const topPlayers = await playersMonthCollection.find().sort({ playtime: -1 }).limit(9).toArray();

        if (topPlayers.length === 0) {
            return interaction.followUp('❌ No players have recorded playtime this month.');
        }

        let leaderboard = '```md\n';
        topPlayers.forEach((player, index) => {
            const totalTime = player.playtime || 0;
            const days = Math.floor(totalTime / 86400); // 1 day = 86400 seconds
            const hours = Math.floor((totalTime % 86400) / 3600); // 1 hour = 3600 seconds
            const mins = Math.floor((totalTime % 3600) / 60); // 1 minute = 60 seconds

            // Format hours and minutes to always be two digits
            const formattedHours = String(hours).padStart(2, '0');
            const formattedMinutes = String(mins).padStart(2, '0');

            leaderboard += `#${String(index + 1).padEnd(2)} ${player.name.padEnd(15)} : ${days}d ${formattedHours}h ${formattedMinutes}m\n`;
        });
        leaderboard += '```';

        const embed = new EmbedBuilder()
            .setColor(config.HEX_COLOR)
            .setTitle('👑  Top Players This Month  👑')
            .setDescription(leaderboard)
            .setFooter({
                text: `Requested by ${interaction.member?.displayName || interaction.user.username} \n • Made with ✨`,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();

        interaction.followUp({ embeds: [embed] });

    } catch (err) {
        console.error('TopPlayersMonth error:', err);
        interaction.followUp('⚠️ Error fetching top players for the month.');
    }
}

async function getTopPlayersYear(interaction) {
    try {
        await interaction.deferReply();

        const playersYearCollection = db.collection('players_year'); // Assuming you're storing the yearly playtime in 'players_year' collection
        const topPlayers = await playersYearCollection.find().sort({ playtime: -1 }).limit(9).toArray();

        if (topPlayers.length === 0) {
            return interaction.followUp('❌ No players have recorded playtime this year.');
        }

        let leaderboard = '```md\n';
        topPlayers.forEach((player, index) => {
            const totalTime = player.playtime || 0;
            const days = Math.floor(totalTime / 86400); // 1 day = 86400 seconds
            const hours = Math.floor((totalTime % 86400) / 3600); // 1 hour = 3600 seconds
            const mins = Math.floor((totalTime % 3600) / 60); // 1 minute = 60 seconds

            // Format hours and minutes to always be two digits
            const formattedHours = String(hours).padStart(2, '0');
            const formattedMinutes = String(mins).padStart(2, '0');

            leaderboard += `#${String(index + 1).padEnd(2)} ${player.name.padEnd(15)} : ${days}d ${formattedHours}h ${formattedMinutes}m\n`;
        });
        leaderboard += '```';

        const embed = new EmbedBuilder()
            .setColor(config.HEX_COLOR)
            .setTitle('👑  Top Players This Year  👑')
            .setDescription(leaderboard)
            .setFooter({
                text: `Requested by ${interaction.member?.displayName || interaction.user.username} \n • Made with ✨`,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();

        interaction.followUp({ embeds: [embed] });

    } catch (err) {
        console.error('TopPlayersYear error:', err);
        interaction.followUp('⚠️ Error fetching top players for the year.');
    }
}



async function sparkCommand(interaction) {
    const playerName = interaction.options.getString('name')?.toLowerCase();
    const userId = interaction.user.id;
    const channelId = interaction.channel.id;

    if (!playerName) {
        return interaction.reply('❌ Please provide the player name like `/spark [name]`!');
    }

    try {
        await interaction.deferReply();

        const sparkCollection = db.collection('sparkRequests');

        // Get start of today in UTC
        const startOfTodayUTC = new Date();
        startOfTodayUTC.setUTCHours(0, 0, 0, 0);

        // Count how many spark requests this user made today
        const todayCount = await sparkCollection.countDocuments({
            userId,
            createdAt: { $gte: startOfTodayUTC }
        });

        const remaining = 5 - todayCount;

        if (remaining <= 0) {
            return interaction.editReply('🚫 You’ve reached your daily limit of **5** spark requests. Try tomorrow, Good Night');
        }

        const alreadyTracking = await sparkCollection.findOne({ playerName, userId });

        if (alreadyTracking) {
            return interaction.editReply(`😣 You’ve already requested to be notified when **${playerName}** comes online.\n🧮 You have **${remaining}** spark(s) left for today.`);
        }

        await sparkCollection.insertOne({
            playerName,
            userId,
            channelId,
            createdAt: new Date()
        });

        await interaction.editReply(`😎 You’ll be notified when **${playerName}** joins the server.😏\n🧮 You have **${remaining - 1}** spark(s) left for today.`);

    } catch (err) {
        console.error('❌ Error in /spark command:', err);
        await interaction.editReply('❌ Could not process your request. Please try again later.');
    }
}


async function getServerIP(interaction) {
    const embed = new EmbedBuilder()
        .setColor(config.HEX_COLOR)
        .setTitle('🔗 Server Connection Info')
        .setDescription(`**Connect to ${config.SERVER_NAME}**`)
        .addFields(
            { name: 'IP Address', value: `\`\`\`\n${config.SAMP_SERVER_IP}:${config.SAMP_SERVER_PORT}\n\`\`\``, inline: true }
        )
        .setFooter({ text: `Requested by ${interaction.member?.displayName || interaction.user.username} \n • Made with ✨ `, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

    interaction.reply({ embeds: [embed] });
}

async function getServerStatus(interaction) {
    try {
        await interaction.deferReply();

        const options = {
            host: config.SAMP_SERVER_IP,
            port: config.SAMP_SERVER_PORT
        };

        samp(options, (error, response) => {
            const embed = new EmbedBuilder()
                .setTitle(`${config.SERVER_NAME} Status`)
                .setFooter({
                    text: `Requested by ${interaction.member?.displayName || interaction.user.username} \n • Made with ✨`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();

            if (error) {
                embed.setColor(config.OFFLINE_COLOR)
                    .setDescription('**Status:** 🔴 Offline')
                    .addFields({ name: 'Error', value: 'Could not connect to the server.' });
            } else {
                embed.setColor(config.HEX_COLOR)
                    .setDescription('**Status:** 🟢 Online')
                    .addFields(
                        { name: 'Hostname', value: `\`${response.hostname || 'Not available'}\`` },
                        { name: 'Gamemode', value: `\`${response.gamemode || 'Not available'}\``, inline: true },
                        { name: 'Players', value: `\`${response.players.length}/${response.maxplayers}\``, inline: true },
                        { name: 'Version', value: `\`${'v1.11.4.1' || 'Not available'}\``, inline: true },
                        { name: 'Map', value: `\`${'San andreas' || 'Not available'}\``, inline: true },
                        { name: 'Password', value: `\`${response.password ? 'Yes' : 'No'}\``, inline: true }
                    );
            }

            interaction.followUp({ embeds: [embed] });
        });
    } catch (error) {
        console.error('Status command error:', error);
        interaction.followUp('⚠️ An error occurred while checking server status.');
    }
}


// /help Command to show bot commands and usage
async function sendHelpEmbed(interaction) {
    await interaction.deferReply();

    const embed = new EmbedBuilder()
        .setColor(config.HEX_COLOR)
        .setTitle('🛠️ vG Bot Help')
        .setThumbnail(config.ICON_URL)
        .setDescription(`Here are the available commands for ${config.SERVER_NAME}:`)
        .addFields(
            { name: '/players', value: 'Shows currently online players in VG Server' },
            { name: '/ip', value: 'Displays server IP information' },
            { name: '/status', value: 'Shows detailed server status' },
            { name: '/toptoday', value: 'Shows who played most today' },
            { name: '/spark', value: 'Informs you when a player joins' },
            { name: '/help', value: 'Shows this help message' }
        )
        .setFooter({
            text: `${config.SERVER_NAME} • Made with ✨`,
            iconURL: config.ICON_URL
        })
        .setTimestamp();

    interaction.followUp({ embeds: [embed] });
}



async function handleCriCommand(interaction) {
    const name = interaction.member.displayName;

    // Defer the reply to acknowledge the interaction
    await interaction.deferReply();

    // After deferring, send the actual response
    await interaction.editReply(`**${name} cries evritim 😭**`);
}

async function getPlaytime(interaction) {
    const playerName = interaction.member.displayName;

    try {
        await interaction.deferReply();  // Start the deferred reply

        const collection = db.collection(config.COLLECTION_NAME);

        const player = await collection.findOne({ name: playerName });

        if (!player || typeof player.playtime !== 'number') {
            await interaction.followUp(`❌ No playtime data found for **${playerName}**.`);  // Follow-up with the final reply
            return;
        }

        const playtimeSeconds = player.playtime;
        const hours = Math.floor(playtimeSeconds / 3600);
        const minutes = Math.floor((playtimeSeconds % 3600) / 60);

        await interaction.followUp(`🕒  **${playerName}**, you have played for **${hours} hours ${minutes.toString().padStart(2, '0')} minutes** today.`);  // Format minutes with leading zero if necessary
    } catch (err) {
        console.error('Error fetching playtime:', err);
        await interaction.followUp('⚠️ Could not fetch playtime. Try again later.');
    }
}

const express = require('express');
const app = express();
const PORT = 8000; // The port your hosting expects (8000)

// Simple health check endpoint
app.get('/', (req, res) => {
    res.status(200).send('OK');
});

// Start the HTTP server
app.listen(PORT, () => {
    console.log(`✅ Health check server running on port ${PORT}`);
});



// Log the bot in
client.login(config.BOT_TOKEN);
