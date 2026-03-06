/**
 * Wikipedia Command - Search and get summaries from Wikipedia
 */

const axios = require('axios');

module.exports = {
    name: 'wikipedia',
    aliases: ['wiki', 'searchwiki', 'w', 'encyclopedia'],
    description: 'Search Wikipedia and get article summaries',
    usage: '.wiki <search term>',
    groupOnly: false,
    adminOnly: false,
    botAdminNeeded: false,
    
    async execute(sock, msg, args, extra) {
        try {
            const chatId = msg.key.remoteJid;
            
            if (args.length === 0) {
                return await sock.sendMessage(chatId, { 
                    text: `╔══════════════════════╗
║  📚 *WIKIPEDIA COMMAND*  ║
╚══════════════════════╝

❌ *Please provide a search term!*

📌 *Usage:*
• .wiki <search term>
• .w <search term>
• .searchwiki <topic>

💡 *Examples:*
• .wiki Albert Einstein
• .w Python programming
• .wiki WhatsApp
• .w Leonardo da Vinci

🌐 *Get knowledge from Wikipedia!*`,
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363405724402785@newsletter',
                            newsletterName: 'ZUKO-MD',
                            serverMessageId: -1
                        }
                    }
                });
            }
            
            const searchTerm = args.join(' ');
            
            // Send processing message
            const processingMsg = await sock.sendMessage(chatId, { 
                text: `📚 *Searching Wikipedia for:* ${searchTerm}...`,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363405724402785@newsletter',
                        newsletterName: 'ZUKO-MD',
                        serverMessageId: -1
                    }
                }
            });
            
            try {
                // First, search for the term
                const searchResponse = await axios.get('https://en.wikipedia.org/w/api.php', {
                    params: {
                        action: 'query',
                        list: 'search',
                        srsearch: searchTerm,
                        format: 'json',
                        origin: '*'
                    }
                });
                
                const searchResults = searchResponse.data.query.search;
                
                if (!searchResults || searchResults.length === 0) {
                    await sock.sendMessage(chatId, { delete: processingMsg.key });
                    return await sock.sendMessage(chatId, { 
                        text: `❌ *No results found for:* "${searchTerm}"\n\n💡 Try different keywords or check spelling.`,
                        contextInfo: {
                            forwardingScore: 999,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: '120363405724402785@newsletter',
                                newsletterName: 'ZUKO-MD',
                                serverMessageId: -1
                            }
                        }
                    });
                }
                
                const firstResult = searchResults[0];
                const pageId = firstResult.pageid;
                const pageTitle = firstResult.title;
                
                // Get the page summary
                const summaryResponse = await axios.get('https://en.wikipedia.org/w/api.php', {
                    params: {
                        action: 'query',
                        prop: 'extracts|pageimages|info',
                        exintro: true,
                        explaintext: true,
                        pithumbsize: 300,
                        pageids: pageId,
                        inprop: 'url',
                        format: 'json',
                        origin: '*'
                    }
                });
                
                const page = summaryResponse.data.query.pages[pageId];
                const extract = page.extract || 'No summary available.';
                const pageUrl = `https://en.wikipedia.org/?curid=${pageId}`;
                const thumbnail = page.thumbnail?.source || null;
                
                // Truncate extract if too long
                let summary = extract;
                if (summary.length > 1000) {
                    summary = summary.substring(0, 1000) + '...';
                }
                
                // Get additional search results for suggestions
                const suggestions = searchResults.slice(1, 4).map(r => r.title).join('\n• ');
                
                // Build the response message
                let wikiText = `╔══════════════════════╗
║  📖 *WIKIPEDIA*  📖   ║
╠══════════════════════╣
║ 📌 *${pageTitle}*
╚══════════════════════╝

━━━━━━━━━━━━━━━━━━━
📝 *SUMMARY*
━━━━━━━━━━━━━━━━━━━
${summary}

━━━━━━━━━━━━━━━━━━━
🔗 *SOURCE*
━━━━━━━━━━━━━━━━━━━
${pageUrl}

━━━━━━━━━━━━━━━━━━━`;

                if (suggestions) {
                    wikiText += `
📋 *MORE RESULTS*
━━━━━━━━━━━━━━━━━━━
• ${suggestions}

━━━━━━━━━━━━━━━━━━━`;
                }

                wikiText += `
💡 *Search again:* .wiki <term>
📚 *Powered by Wikipedia*`;

                // Delete processing message
                await sock.sendMessage(chatId, { delete: processingMsg.key });
                
                // Send the result
                await sock.sendMessage(chatId, { 
                    text: wikiText,
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363405724402785@newsletter',
                            newsletterName: 'ZUKO-MD',
                            serverMessageId: -1
                        }
                    }
                });
                
            } catch (apiError) {
                console.error('Wikipedia API error:', apiError);
                await sock.sendMessage(chatId, { delete: processingMsg.key });
                await sock.sendMessage(chatId, { 
                    text: `❌ *Error fetching from Wikipedia.*\n\nPlease try again later.`,
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363405724402785@newsletter',
                            newsletterName: 'ZUKO-MD',
                            serverMessageId: -1
                        }
                    }
                });
            }
            
        } catch (error) {
            console.error('Wikipedia Command Error:', error);
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `❌ *Error:* ${error.message}`,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363405724402785@newsletter',
                        newsletterName: 'ZUKO-MD',
                        serverMessageId: -1
                    }
                }
            });
        }
    }
};