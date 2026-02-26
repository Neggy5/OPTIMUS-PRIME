/**
 * Repo Command - Display bot repository information
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// GitHub repository information
const repoInfo = {
    owner: '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸',
    repo: '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸-BOT',
    url: 'https://github.com/𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸/𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸',
    api: 'https://api.github.com/repos/𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸/𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸',
    defaultBranch: 'main',
    description: '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸 - Multi-Command WhatsApp Bot with Baileys'
};

// Cache for GitHub stats
let statsCache = {
    data: null,
    timestamp: 0
};

const CACHE_DURATION = 3600000; // 1 hour

// Fetch GitHub repository stats
const fetchRepoStats = async () => {
    try {
        // Check cache
        if (statsCache.data && (Date.now() - statsCache.timestamp) < CACHE_DURATION) {
            return statsCache.data;
        }
        
        const response = await axios.get(repoInfo.api, {
            timeout: 5000,
            headers: {
                'User-Agent': '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸-Bot'
            }
        }).catch(() => null);
        
        let stats = {
            stars: 0,
            forks: 0,
            issues: 0,
            watchers: 0,
            size: 0,
            language: 'JavaScript',
            license: 'MIT',
            updated: 'Recently'
        };
        
        if (response && response.data) {
            stats = {
                stars: response.data.stargazers_count || 0,
                forks: response.data.forks_count || 0,
                issues: response.data.open_issues_count || 0,
                watchers: response.data.watchers_count || 0,
                size: Math.round((response.data.size || 0) / 1024), // Convert to MB
                language: response.data.language || 'JavaScript',
                license: response.data.license?.name || 'MIT',
                updated: new Date(response.data.updated_at).toLocaleDateString()
            };
        }
        
        // Try to get commit count
        try {
            const commitsResponse = await axios.get(`${repoInfo.api}/commits?per_page=1`, {
                timeout: 5000,
                headers: {
                    'User-Agent': '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸-Bot'
                }
            });
            
            if (commitsResponse.headers && commitsResponse.headers.link) {
                const linkHeader = commitsResponse.headers.link;
                const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
                if (lastPageMatch) {
                    stats.commits = parseInt(lastPageMatch[1]);
                }
            }
        } catch (e) {
            // Ignore commit count errors
        }
        
        // Cache the stats
        statsCache = {
            data: stats,
            timestamp: Date.now()
        };
        
        return stats;
    } catch (error) {
        console.error('Error fetching repo stats:', error);
        return statsCache.data || {
            stars: 0,
            forks: 0,
            issues: 0,
            watchers: 0,
            size: 0,
            language: 'JavaScript',
            license: 'MIT',
            updated: 'Unknown'
        };
    }
};

// Get bot version from package.json
const getBotVersion = () => {
    try {
        const packagePath = path.join(__dirname, '../package.json');
        if (fs.existsSync(packagePath)) {
            const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            return packageJson.version || '1.0.0';
        }
    } catch (error) {
        console.error('Error reading package.json:', error);
    }
    return '1.0.0';
};

// Get total commands count
const getTotalCommands = () => {
    try {
        const commandsPath = path.join(__dirname, '../');
        if (fs.existsSync(commandsPath)) {
            const files = fs.readdirSync(commandsPath);
            return files.filter(f => f.endsWith('.js')).length;
        }
    } catch (error) {
        console.error('Error counting commands:', error);
    }
    return 0;
};

module.exports = {
    name: 'repo',
    aliases: ['repository', 'github', 'source', 'git'],
    description: 'Show bot repository information',
    usage: '.repo or .repo <stats/contributors/latest>',
    groupOnly: false,
    adminOnly: false,
    botAdminNeeded: false,
    
    async execute(sock, msg, args, extra) {
        try {
            const chatId = extra.from;
            const botVersion = getBotVersion();
            const totalCommands = getTotalCommands();
            
            // Fetch GitHub stats
            const stats = await fetchRepoStats();
            
            const subCmd = args[0]?.toLowerCase();
            
            // Handle subcommands
            if (subCmd === 'stats') {
                return extra.reply(`📊 *REPOSITORY STATISTICS*\n\n` +
                    `⭐ *Stars:* ${stats.stars}\n` +
                    `🍴 *Forks:* ${stats.forks}\n` +
                    `👀 *Watchers:* ${stats.watchers}\n` +
                    `🐛 *Issues:* ${stats.issues}\n` +
                    `📦 *Size:* ${stats.size} MB\n` +
                    `🔤 *Language:* ${stats.language}\n` +
                    `📝 *License:* ${stats.license}\n` +
                    `🔄 *Updated:* ${stats.updated}\n` +
                    (stats.commits ? `📝 *Commits:* ${stats.commits}\n` : '') +
                    `\n📌 *Repository:* ${repoInfo.url}`);
            }
            
            if (subCmd === 'contributors') {
                return extra.reply(`👥 *CONTRIBUTORS*\n\n` +
                    `• @𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸 - Lead Developer\n` +
                    `• Community contributors welcome!\n\n` +
                    `Want to contribute? Fork the repo and submit a PR!\n` +
                    `📌 ${repoInfo.url}/fork`);
            }
            
            if (subCmd === 'latest' || subCmd === 'updates') {
                return extra.reply(`🔄 *LATEST UPDATES*\n\n` +
                    `Check the repository for latest changes:\n` +
                    `📌 ${repoInfo.url}/commits/${repoInfo.defaultBranch}\n\n` +
                    `💡 Use .repo to see main info`);
            }
            
            if (subCmd === 'issues') {
                return extra.reply(`🐛 *ISSUES & FEATURES*\n\n` +
                    `Report bugs or request features:\n` +
                    `📌 ${repoInfo.url}/issues\n\n` +
                    `Open issues: ${stats.issues}`);
            }
            
            // Main repo info
            const response = `╔══════════════════════╗
║  📦 *REPOSITORY*  📦   ║
╚══════════════════════╝

━━━━━━━━━━━━━━━━━━━
📌 *${repoInfo.owner}/${repoInfo.repo}*
${repoInfo.description}

━━━━━━━━━━━━━━━━━━━
📊 *STATISTICS*
⭐ Stars: ${stats.stars}  🍴 Forks: ${stats.forks}
👀 Watchers: ${stats.watchers}  🐛 Issues: ${stats.issues}
📦 Size: ${stats.size} MB  🔤 Language: ${stats.language}
📝 License: ${stats.license}  🔄 Updated: ${stats.updated}
⚡ Commands: ${totalCommands}  📱 Version: v${botVersion}

━━━━━━━━━━━━━━━━━━━
🔗 *LINKS*
• Repository: ${repoInfo.url}
• Issues: ${repoInfo.url}/issues
• Wiki: ${repoInfo.url}/wiki
• Releases: ${repoInfo.url}/releases

━━━━━━━━━━━━━━━━━━━
📋 *COMMANDS*
• .repo stats - Show detailed stats
• .repo contributors - Show contributors
• .repo latest - Show latest updates
• .repo issues - Show issues link

━━━━━━━━━━━━━━━━━━━
💡 *Want to contribute?*
Fork the repo and submit a PR!
Star ⭐ the repo to show support!

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`;

            // Try to send with image if available
            try {
                const imageUrl = 'https://opengraph.githubassets.com/1/' + repoInfo.owner + '/' + repoInfo.repo;
                const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                
                await sock.sendMessage(chatId, {
                    image: Buffer.from(imageResponse.data),
                    caption: response,
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363405724402785@newsletter',
                            newsletterName: '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸',
                            serverMessageId: -1
                        }
                    }
                });
            } catch (imageError) {
                // Send without image
                await sock.sendMessage(chatId, {
                    text: response,
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363405724402785@newsletter',
                            newsletterName: '𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸',
                            serverMessageId: -1
                        }
                    }
                });
            }
            
        } catch (error) {
            console.error('Repo Command Error:', error);
            await extra.reply(`❌ *Error:* ${error.message}`);
        }
    }
};