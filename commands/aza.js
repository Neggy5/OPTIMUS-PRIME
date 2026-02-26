/**
 * Aza Command - Send bank account details
 */

const fs = require('fs');
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, '../database/aza.json');

// Load bank details
const loadBankDetails = () => {
    try {
        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading bank details:', error);
    }
    return null;
};

module.exports = {
    name: 'aza',
    aliases: ['bank', 'account', 'payment', 'donate', 'pay'],
    description: 'Send bank account details',
    usage: '.aza or .aza <primary/secondary/crypto>',
    groupOnly: false,
    adminOnly: false,
    botAdminNeeded: false,
    
    async execute(sock, msg, args, extra) {
        try {
            const chatId = extra.from;
            const bankDetails = loadBankDetails();
            
            if (!bankDetails) {
                return extra.reply('❌ *Bank details not configured!*\n\nContact bot owner to set up payment details.');
            }
            
            const option = args[0]?.toLowerCase();
            let accountType = bankDetails.activeAccount || 'primary';
            
            // Check if specific account requested
            if (option === 'secondary') {
                accountType = 'secondary';
            } else if (option === 'crypto') {
                accountType = 'crypto';
            } else if (option === 'primary') {
                accountType = 'primary';
            }
            
            // Handle crypto
            if (accountType === 'crypto') {
                const crypto = bankDetails.crypto;
                let cryptoInfo = `╔══════════════════════╗
║  🪙 *CRYPTO WALLETS*  🪙  ║
╚══════════════════════╝\n\n`;
                
                if (crypto.btc) {
                    cryptoInfo += `━━━━━━━━━━━━━━━━━━━\n`;
                    cryptoInfo += `₿ *BITCOIN (BTC)*\n`;
                    cryptoInfo += `━━━━━━━━━━━━━━━━━━━\n`;
                    cryptoInfo += `\`${crypto.btc}\`\n\n`;
                }
                
                if (crypto.eth) {
                    cryptoInfo += `━━━━━━━━━━━━━━━━━━━\n`;
                    cryptoInfo += `⟠ *ETHEREUM (ETH)*\n`;
                    cryptoInfo += `━━━━━━━━━━━━━━━━━━━\n`;
                    cryptoInfo += `\`${crypto.eth}\`\n\n`;
                }
                
                if (crypto.usdt) {
                    cryptoInfo += `━━━━━━━━━━━━━━━━━━━\n`;
                    cryptoInfo += `💵 *USDT (TRC20)*\n`;
                    cryptoInfo += `━━━━━━━━━━━━━━━━━━━\n`;
                    cryptoInfo += `\`${crypto.usdt}\`\n\n`;
                }
                
                if (crypto.binance) {
                    cryptoInfo += `━━━━━━━━━━━━━━━━━━━\n`;
                    cryptoInfo += `📱 *BINANCE ID*\n`;
                    cryptoInfo += `━━━━━━━━━━━━━━━━━━━\n`;
                    cryptoInfo += `ID: \`${crypto.binance}\`\n\n`;
                }
                
                if (!crypto.btc && !crypto.eth && !crypto.usdt && !crypto.binance) {
                    cryptoInfo += 'No crypto wallets configured.\n';
                }
                
                cryptoInfo += `━━━━━━━━━━━━━━━━━━━\n`;
                cryptoInfo += `✅ *Please confirm after payment*\n\n`;
                cryptoInfo += `> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ZUKO-MD*`;
                
                return await sock.sendMessage(chatId, {
                    text: cryptoInfo,
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
            
            // Handle bank accounts
            const account = bankDetails[accountType];
            
            if (!account || account.accountNumber === 'Not Set') {
                return extra.reply(`❌ *${accountType} account not configured!*`);
            }
            
            // Format the account details
            const accountInfo = `╔══════════════════════╗
║  💳 *BANK ACCOUNT DETAILS*  ║
╚══════════════════════╝

━━━━━━━━━━━━━━━━━━━
🏦 *Bank Information*
━━━━━━━━━━━━━━━━━━━
• *Bank:* ${account.bankName}
• *Branch:* ${account.branch}
• *Account Type:* ${account.accountType}
• *Currency:* ${account.currency}

━━━━━━━━━━━━━━━━━━━
👤 *Account Holder*
━━━━━━━━━━━━━━━━━━━
• *Name:* ${account.accountName}
• *Account Number:* \`${account.accountNumber}\`

━━━━━━━━━━━━━━━━━━━
🔑 *Additional Details*
━━━━━━━━━━━━━━━━━━━
• *Swift Code:* ${account.swiftCode || 'N/A'}
• *IBAN:* ${account.iban || 'N/A'}

━━━━━━━━━━━━━━━━━━━
📝 *Note*
━━━━━━━━━━━━━━━━━━━
${account.additionalInfo}

━━━━━━━━━━━━━━━━━━━
✅ *Please confirm payment after transfer*

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ZUKO-MD*`;

            // Send account details
            await sock.sendMessage(chatId, {
                text: accountInfo,
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
            
        } catch (error) {
            console.error('Aza Command Error:', error);
            await extra.reply(`❌ *Error:* ${error.message}`);
        }
    }
};