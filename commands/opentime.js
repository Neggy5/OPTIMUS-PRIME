/**
 * OpenTime Command - Open group for a specific duration then auto-close
 */
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Store active timers in memory
const activeTimers = new Map();

// Persistent storage path
const DB_DIR = path.join(process.cwd(), 'database');
const DB_PATH = path.join(DB_DIR, 'opentime.json');

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const loadScheduled = () => {
    try {
        if (fs.existsSync(DB_PATH)) return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch (e) { console.error('Load Error:', e); }
    return {};
};

const saveScheduled = (data) => {
    try { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); }
    catch (e) { console.error('Save Error:', e); }
};

let scheduledOpenings = loadScheduled();

const formatDuration = (ms) => {
    const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
    if (d > 0) return `${d}d`;
    if (h > 0) return `${h}h`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
};

module.exports = {
    name: 'opentime',
    aliases: ['openfor', 'tempopen'],
    description: 'Open group for a specific duration',
    category: 'admin',

    async execute(sock, msg, args, extra) {
        const { from, isGroup, isAdmin, isBotAdmin, reply } = extra;

        if (!isGroup) return reply('❌ This is a group-only command.');
        if (!isAdmin) return reply('❌ Only admins can use this.');
        if (!isBotAdmin) return reply('❌ I need admin to manage group settings.');

        // 1. Show Status if no args
        if (!args[0]) {
            const active = activeTimers.get(from);
            const timeInfo = active ? `\n┆ ⏱️ *Closing in:* ${formatDuration(active.endTime - Date.now())}` : '';
            
            return reply(`┌───『 *OPENTIME* 』───┐\n┆ 📊 *Status:* Online\n┆ 💡 *Format:* .opentime 1h\n┆ 💡 *Stop:* .opentime stop${timeInfo}\n└──────────────────┘`);
        }

        const input = args[0].toLowerCase();

        // 2. Handle Stop
        if (input === 'stop' || input === 'cancel') {
            if (activeTimers.has(from)) {
                clearTimeout(activeTimers.get(from).timer);
                activeTimers.delete(from);
                delete scheduledOpenings[from];
                saveScheduled(scheduledOpenings);
                return reply('✅ *Timer stopped.* Group will stay as it is.');
            }
            return reply('❌ No active timer found.');
        }

        // 3. Parse Duration (e.g., 30m, 1h)
        let totalSeconds = 0;
        const matches = input.match(/(\d+)([smhd])/g);
        if (!matches) return reply('❌ Invalid format. Use: 10m, 2h, etc.');

        matches.forEach(m => {
            const val = parseInt(m), unit = m.slice(-1);
            if (unit === 's') totalSeconds += val;
            if (unit === 'm') totalSeconds += val * 60;
            if (unit === 'h') totalSeconds += val * 3600;
            if (unit === 'd') totalSeconds += val * 86400;
        });

        if (totalSeconds < 10) return reply('❌ Minimum 10 seconds.');

        try {
            // Open the group
            await sock.groupSettingUpdate(from, 'not_announcement');
            
            // Set Timer
            if (activeTimers.has(from)) clearTimeout(activeTimers.get(from).timer);

            const timer = setTimeout(async () => {
                await sock.groupSettingUpdate(from, 'announcement');
                await sock.sendMessage(from, { text: '🔒 *Time Up!* Group is now closed. Only admins can chat.' });
                activeTimers.delete(from);
                delete scheduledOpenings[from];
                saveScheduled(scheduledOpenings);
            }, totalSeconds * 1000);

            const endTime = Date.now() + (totalSeconds * 1000);
            activeTimers.set(from, { timer, endTime });
            
            scheduledOpenings[from] = { endTime };
            saveScheduled(scheduledOpenings);

            await reply(`┌───『 *GROUP OPENED* 』───┐\n┆ ⏱️ *Duration:* ${input}\n┆ 🔓 *Status:* Members can chat\n┆ 🔒 *Auto-Close:* Active\n└───────────────────┘\n\n> 𝑃ᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸`);

        } catch (e) {
            console.error(e);
            reply('❌ Failed to update group settings.');
        }
    }
};