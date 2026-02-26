/**
 * Set Aza Command - Configure bank account details
 */

const fs = require('fs');
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, '../database/aza.json');

// Default bank details
const defaultBankDetails = {
    primary: {
        bankName: 'Not Set',
        accountName: 'Not Set',
        accountNumber: 'Not Set',
        accountType: 'Savings',
        branch: 'Main Branch',
        swiftCode: '',
        iban: '',
        currency: 'NGN',
        additionalInfo: 'Send screenshot after payment'
    },
    secondary: {
        bankName: 'Not Set',
        accountName: 'Not Set',
        accountNumber: 'Not Set',
        accountType: 'Savings',
        branch: 'Main Branch',
        swiftCode: '',
        iban: '',
        currency: 'NGN',
        additionalInfo: 'Send screenshot after payment'
    },
    crypto: {
        btc: '',
        eth: '',
        usdt: '',
        binance: ''
    },
    activeAccount: 'primary',
    updatedAt: null,
    updatedBy: null
};

// Load settings
const loadBankDetails = () => {
    try {
        const dir = path.dirname(DB_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH, 'utf8');
            return { ...defaultBankDetails, ...JSON.parse(data) };
        } else {
            fs.writeFileSync(DB_PATH, JSON.stringify(defaultBankDetails, null, 2));
        }
    } catch (error) {
        console.error('Error loading bank details:', error);
    }
    return { ...defaultBankDetails };
};

// Save settings
const saveBankDetails = (details) => {
    try {
        const dir = path.dirname(DB_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(DB_PATH, JSON.stringify(details, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving bank details:', error);
        return false;
    }
};

module.exports = {
    name: 'setaza',
    aliases: ['setbank', 'setaccount', 'updatebank'],
    description: 'Configure bank account details',
    usage: '.setaza <option> <value>',
    groupOnly: false,
    adminOnly: false,
    botAdminNeeded: false,
    ownerOnly: true, // Only bot owner can set bank details
    
    async execute(sock, msg, args, extra) {
        try {
            const chatId = extra.from;
            const bankDetails = loadBankDetails();
            
            if (!args[0]) {
                return extra.reply(`╔══════════════════════╗
║  💳 *SET BANK DETAILS*  ║
╚══════════════════════╝

━━━━━━━━━━━━━━━━━━━
📋 *Commands:*
━━━━━━━━━━━━━━━━━━━

🏦 *Primary Account:*
• .setaza primary bank <name>
• .setaza primary name <account name>
• .setaza primary number <account number>
• .setaza primary type <savings/current>
• .setaza primary branch <branch>
• .setaza primary swift <code>
• .setaza primary iban <iban>
• .setaza primary currency <NGN/USD/GBP>
• .setaza primary info <additional info>

━━━━━━━━━━━━━━━━━━━
🏧 *Secondary Account:*
• .setaza secondary bank <name>
• .setaza secondary name <account name>
• .setaza secondary number <account number>
• etc.

━━━━━━━━━━━━━━━━━━━
🪙 *Crypto Wallets:*
• .setaza crypto btc <address>
• .setaza crypto eth <address>
• .setaza crypto usdt <address>
• .setaza crypto binance <id>

━━━━━━━━━━━━━━━━━━━
⚙️ *Settings:*
• .setaza active <primary/secondary>
• .setaza view - View current settings
• .setaza reset - Reset all to default

━━━━━━━━━━━━━━━━━━━
💡 *Examples:*
• .setaza primary bank GTBank
• .setaza primary number 0123456789
• .setaza crypto btc bc1q...

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`);
            }
            
            const option = args[0].toLowerCase();
            
            // Handle view
            if (option === 'view') {
                const primary = bankDetails.primary;
                const secondary = bankDetails.secondary;
                const crypto = bankDetails.crypto;
                const active = bankDetails.activeAccount;
                
                let response = `╔══════════════════════╗
║  💳 *CURRENT BANK DETAILS*  ║
╚══════════════════════╝\n\n`;
                
                response += `━━━━━━━━━━━━━━━━━━━\n`;
                response += `✅ *Active Account:* ${active.toUpperCase()}\n`;
                response += `━━━━━━━━━━━━━━━━━━━\n\n`;
                
                response += `🏦 *PRIMARY ACCOUNT*\n`;
                response += `• Bank: ${primary.bankName}\n`;
                response += `• Name: ${primary.accountName}\n`;
                response += `• Number: ${primary.accountNumber}\n`;
                response += `• Type: ${primary.accountType}\n`;
                response += `• Branch: ${primary.branch}\n`;
                response += `• Swift: ${primary.swiftCode || 'N/A'}\n`;
                response += `• IBAN: ${primary.iban || 'N/A'}\n`;
                response += `• Currency: ${primary.currency}\n`;
                response += `• Info: ${primary.additionalInfo}\n\n`;
                
                response += `🏧 *SECONDARY ACCOUNT*\n`;
                response += `• Bank: ${secondary.bankName}\n`;
                response += `• Name: ${secondary.accountName}\n`;
                response += `• Number: ${secondary.accountNumber}\n`;
                response += `• Type: ${secondary.accountType}\n\n`;
                
                if (crypto.btc || crypto.eth || crypto.usdt || crypto.binance) {
                    response += `🪙 *CRYPTO WALLETS*\n`;
                    if (crypto.btc) response += `• BTC: ${crypto.btc}\n`;
                    if (crypto.eth) response += `• ETH: ${crypto.eth}\n`;
                    if (crypto.usdt) response += `• USDT: ${crypto.usdt}\n`;
                    if (crypto.binance) response += `• Binance: ${crypto.binance}\n`;
                }
                
                if (bankDetails.updatedAt) {
                    response += `\n📅 Last updated: ${new Date(bankDetails.updatedAt).toLocaleString()}\n`;
                }
                
                return extra.reply(response);
            }
            
            // Handle reset
            if (option === 'reset') {
                const newDetails = { ...defaultBankDetails };
                newDetails.updatedAt = Date.now();
                newDetails.updatedBy = extra.sender;
                saveBankDetails(newDetails);
                
                return extra.reply('✅ *Bank details reset to default!*');
            }
            
            // Handle active account
            if (option === 'active') {
                const account = args[1]?.toLowerCase();
                if (!account || !['primary', 'secondary'].includes(account)) {
                    return extra.reply('❌ *Please specify primary or secondary*');
                }
                
                bankDetails.activeAccount = account;
                bankDetails.updatedAt = Date.now();
                bankDetails.updatedBy = extra.sender;
                saveBankDetails(bankDetails);
                
                return extra.reply(`✅ *Active account set to ${account.toUpperCase()}!*`);
            }
            
            // Handle primary account settings
            if (option === 'primary') {
                const field = args[1]?.toLowerCase();
                const value = args.slice(2).join(' ');
                
                if (!field || !value) {
                    return extra.reply('❌ *Please specify field and value!*\n\nExample: .setaza primary bank GTBank');
                }
                
                switch(field) {
                    case 'bank':
                        bankDetails.primary.bankName = value;
                        break;
                    case 'name':
                        bankDetails.primary.accountName = value.toUpperCase();
                        break;
                    case 'number':
                        bankDetails.primary.accountNumber = value.replace(/\D/g, '');
                        break;
                    case 'type':
                        bankDetails.primary.accountType = value;
                        break;
                    case 'branch':
                        bankDetails.primary.branch = value;
                        break;
                    case 'swift':
                        bankDetails.primary.swiftCode = value.toUpperCase();
                        break;
                    case 'iban':
                        bankDetails.primary.iban = value;
                        break;
                    case 'currency':
                        bankDetails.primary.currency = value.toUpperCase();
                        break;
                    case 'info':
                        bankDetails.primary.additionalInfo = value;
                        break;
                    default:
                        return extra.reply('❌ *Invalid field!*\n\nAvailable: bank, name, number, type, branch, swift, iban, currency, info');
                }
                
                bankDetails.updatedAt = Date.now();
                bankDetails.updatedBy = extra.sender;
                saveBankDetails(bankDetails);
                
                return extra.reply(`✅ *Primary account ${field} updated to:*\n\n${value}`);
            }
            
            // Handle secondary account settings
            if (option === 'secondary') {
                const field = args[1]?.toLowerCase();
                const value = args.slice(2).join(' ');
                
                if (!field || !value) {
                    return extra.reply('❌ *Please specify field and value!*\n\nExample: .setaza secondary bank Access Bank');
                }
                
                switch(field) {
                    case 'bank':
                        bankDetails.secondary.bankName = value;
                        break;
                    case 'name':
                        bankDetails.secondary.accountName = value.toUpperCase();
                        break;
                    case 'number':
                        bankDetails.secondary.accountNumber = value.replace(/\D/g, '');
                        break;
                    case 'type':
                        bankDetails.secondary.accountType = value;
                        break;
                    default:
                        return extra.reply('❌ *Invalid field!*\n\nAvailable: bank, name, number, type');
                }
                
                bankDetails.updatedAt = Date.now();
                bankDetails.updatedBy = extra.sender;
                saveBankDetails(bankDetails);
                
                return extra.reply(`✅ *Secondary account ${field} updated to:*\n\n${value}`);
            }
            
            // Handle crypto settings
            if (option === 'crypto') {
                const field = args[1]?.toLowerCase();
                const value = args.slice(2).join(' ');
                
                if (!field || !value) {
                    return extra.reply('❌ *Please specify crypto type and address!*\n\nExample: .setaza crypto btc bc1q...');
                }
                
                switch(field) {
                    case 'btc':
                        bankDetails.crypto.btc = value;
                        break;
                    case 'eth':
                        bankDetails.crypto.eth = value;
                        break;
                    case 'usdt':
                        bankDetails.crypto.usdt = value;
                        break;
                    case 'binance':
                        bankDetails.crypto.binance = value;
                        break;
                    default:
                        return extra.reply('❌ *Invalid crypto type!*\n\nAvailable: btc, eth, usdt, binance');
                }
                
                bankDetails.updatedAt = Date.now();
                bankDetails.updatedBy = extra.sender;
                saveBankDetails(bankDetails);
                
                return extra.reply(`✅ *Crypto wallet ${field.toUpperCase()} updated!*`);
            }
            
            extra.reply('❌ *Invalid option!*\n\nUse .setaza to see available commands.');
            
        } catch (error) {
            console.error('SetAza Error:', error);
            await extra.reply(`❌ *Error:* ${error.message}`);
        }
    }
};