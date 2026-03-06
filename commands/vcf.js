/**
 * VCF Command - Generate contact file (VCF) from group members
 */

const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// Temporary directory for VCF files
const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// Clean up old VCF files periodically
setInterval(() => {
    try {
        const files = fs.readdirSync(tempDir);
        const now = Date.now();
        files.forEach(file => {
            if (file.endsWith('.vcf')) {
                const filePath = path.join(tempDir, file);
                const stats = fs.statSync(filePath);
                // Delete files older than 1 hour
                if (now - stats.mtimeMs > 3600000) {
                    fs.unlinkSync(filePath);
                }
            }
        });
    } catch (error) {
        console.error('VCF cleanup error:', error);
    }
}, 3600000); // Run every hour

module.exports = {
    name: 'vcf',
    aliases: ['contacts', 'savecontacts', 'exportcontacts', 'getcontacts'],
    description: 'Generate VCF contact file from group members',
    usage: '.vcf or .vcf <name>',
    groupOnly: true,
    adminOnly: false,
    botAdminNeeded: false,
    
    async execute(sock, msg, args, extra) {
        try {
            const chatId = extra.from;
            const isGroup = extra.isGroup;
            const groupMetadata = extra.groupMetadata;
            const sender = extra.sender;
            
            if (!isGroup) {
                return extra.reply('❌ *This command can only be used in groups!*');
            }
            
            if (!groupMetadata || !groupMetadata.participants) {
                return extra.reply('❌ *Could not fetch group members!*');
            }
            
            const participants = groupMetadata.participants;
            const groupName = groupMetadata.subject || 'Unnamed Group';
            const groupDesc = groupMetadata.desc || '';
            
            // Custom filename from args
            let customName = args.join(' ').trim();
            if (!customName) {
                customName = groupName.replace(/[^a-zA-Z0-9]/g, '_');
            }
            
            // Sanitize filename
            const safeName = customName.replace(/[^a-zA-Z0-9_\-]/g, '');
            const fileName = `${safeName}_contacts_${Date.now()}.vcf`;
            const filePath = path.join(tempDir, fileName);
            
            // Send processing message
            const processingMsg = await sock.sendMessage(chatId, {
                text: `📇 *Generating VCF file...*\n\n👥 Processing ${participants.length} members...`
            });
            
            // Generate VCF content
            let vcfContent = '';
            let successCount = 0;
            let failCount = 0;
            let contactsWithPhoto = 0;
            
            // Add group info as a note
            vcfContent += `BEGIN:VCARD\n`;
            vcfContent += `VERSION:3.0\n`;
            vcfContent += `FN:📌 GROUP INFO - ${groupName}\n`;
            vcfContent += `NOTE:Group: ${groupName}\\nCreated: ${new Date(groupMetadata.creation * 1000).toLocaleString()}\\nMembers: ${participants.length}\\nDescription: ${groupDesc.replace(/\n/g, '\\n')}\n`;
            vcfContent += `END:VCARD\n\n`;
            
            // Process each participant
            for (let i = 0; i < participants.length; i++) {
                const participant = participants[i];
                const participantJid = participant.id;
                const participantNumber = participantJid.split('@')[0];
                const isAdmin = participant.admin === 'admin' || participant.admin === 'superadmin';
                const isSuperAdmin = participant.admin === 'superadmin';
                
                try {
                    // Try to get contact name
                    let contactName = '';
                    let pushName = '';
                    
                    try {
                        // Try to get pushname from store
                        if (sock.store && sock.store.contacts) {
                            const contact = sock.store.contacts[participantJid];
                            if (contact) {
                                pushName = contact.notify || contact.name || '';
                                contactName = pushName || participantNumber;
                            }
                        }
                        
                        // If no name found, use number
                        if (!contactName) {
                            contactName = participantNumber;
                        }
                    } catch (nameError) {
                        contactName = participantNumber;
                    }
                    
                    // Clean contact name (remove emojis and special chars for filename)
                    const cleanName = contactName.replace(/[^\w\s]/g, '').trim();
                    
                    // Get profile picture
                    let photoData = null;
                    try {
                        const ppUrl = await sock.profilePictureUrl(participantJid, 'image');
                        if (ppUrl) {
                            const response = await require('axios').get(ppUrl, { 
                                responseType: 'arraybuffer',
                                timeout: 5000
                            });
                            photoData = Buffer.from(response.data).toString('base64');
                            contactsWithPhoto++;
                        }
                    } catch (ppError) {
                        // No profile picture, skip
                    }
                    
                    // Create VCard
                    vcfContent += `BEGIN:VCARD\n`;
                    vcfContent += `VERSION:3.0\n`;
                    vcfContent += `FN:${contactName}\n`;
                    
                    // Add nickname if different from full name
                    if (pushName && pushName !== contactName) {
                        vcfContent += `NICKNAME:${pushName}\n`;
                    }
                    
                    // Add phone number
                    vcfContent += `TEL;TYPE=CELL:${participantNumber}\n`;
                    
                    // Add role/title
                    if (isSuperAdmin) {
                        vcfContent += `ROLE:Group Owner\n`;
                    } else if (isAdmin) {
                        vcfContent += `ROLE:Group Admin\n`;
                    } else {
                        vcfContent += `ROLE:Member\n`;
                    }
                    
                    // Add group info in note
                    vcfContent += `NOTE:Member of ${groupName}\\nJoined: ${new Date().toLocaleDateString()}\n`;
                    
                    // Add photo if available
                    if (photoData) {
                        vcfContent += `PHOTO;ENCODING=b;TYPE=JPEG:${photoData}\n`;
                    }
                    
                    // Add organization (group name)
                    vcfContent += `ORG:${groupName}\n`;
                    
                    vcfContent += `END:VCARD\n\n`;
                    
                    successCount++;
                    
                    // Update progress every 10 contacts
                    if ((i + 1) % 10 === 0 || i === participants.length - 1) {
                        await sock.sendMessage(chatId, {
                            text: `📇 *Generating VCF...*\n\nProgress: ${i + 1}/${participants.length} members processed`,
                            edit: processingMsg.key
                        });
                    }
                    
                } catch (contactError) {
                    console.error(`Error processing contact ${participantNumber}:`, contactError);
                    failCount++;
                }
            }
            
            // Write VCF file
            fs.writeFileSync(filePath, vcfContent);
            
            // Get file stats
            const stats = fs.statSync(filePath);
            const fileSizeKB = Math.round(stats.size / 1024);
            
            // Create admin counts
            const adminCount = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin').length;
            const superAdminCount = participants.filter(p => p.admin === 'superadmin').length;
            const regularCount = participants.length - adminCount;
            
            // Send VCF file
            await sock.sendMessage(chatId, {
                document: fs.readFileSync(filePath),
                mimetype: 'text/x-vcard',
                fileName: fileName,
                caption: `╔══════════════════════╗
║  📇 *VCF CONTACTS*  📇  ║
╚══════════════════════╝

📌 *Group:* ${groupName}
👥 *Total Members:* ${participants.length}
👑 *Admins:* ${adminCount} (Owner: ${superAdminCount})
👤 *Regular:* ${regularCount}

━━━━━━━━━━━━━━━━━━━
📊 *Generated:*
✅ Success: ${successCount}
❌ Failed: ${failCount}
📸 With Photos: ${contactsWithPhoto}
📦 File Size: ${fileSizeKB} KB

━━━━━━━━━━━━━━━━━━━

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝑂𝑃𝑇𝐼𝑀𝑈𝑆 𝑃𝑅𝐼𝑀𝐸*`,
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
            
            // Delete processing message
            await sock.sendMessage(chatId, { delete: processingMsg.key });
            
            // Schedule file deletion after 5 minutes
            setTimeout(() => {
                try {
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                } catch (deleteError) {
                    console.error('Error deleting VCF file:', deleteError);
                }
            }, 300000); // 5 minutes
            
        } catch (error) {
            console.error('VCF Command Error:', error);
            await extra.reply(`❌ *Error generating VCF:* ${error.message}`);
        }
    }
};