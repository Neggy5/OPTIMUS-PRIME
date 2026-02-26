/**
 * Reset Aza Command - Reset bank account details to default
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

module.exports = {
    name: 'resetaza',
    aliases: ['resetbank', 'clearaccount'],
    description: 'Reset bank account details to default',
    usage: '.resetaza',
    groupOnly: false,
    adminOnly: false,
    botAdminNeeded: false,
    ownerOnly: true,
    
    async execute(sock, msg, args, extra) {
        try {
            // Confirmation
            if (!args[0] || args[0].toLowerCase() !== 'confirm') {
                return extra.reply(`⚠️ *WARNING*\n\nThis will reset ALL bank account details to default values.\n\nType: .resetaza confirm\n\nTo proceed with reset.`);
            }
            
            // Reset to default
            const newDetails = { ...defaultBankDetails };
            newDetails.updatedAt = Date.now();
            newDetails.updatedBy = extra.sender;
            
            // Ensure directory exists
            const dir = path.dirname(DB_PATH);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            // Save default settings
            fs.writeFileSync(DB_PATH, JSON.stringify(newDetails, null, 2));
            
            // Send confirmation
            await extra.reply(`✅ *Bank details reset to default!*\n\nUse .setaza view to see current settings.`);
            
        } catch (error) {
            console.error('ResetAza Error:', error);
            await extra.reply(`❌ *Error:* ${error.message}`);
        }
    }
};