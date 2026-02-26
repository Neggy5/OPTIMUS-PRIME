/**
 * Pterodactyl WhatsApp Bot Deployer
 * Allows users to deploy bots by just entering their phone number
 */

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Pterodactyl Configuration
const PTERODACTYL_URL = process.env.PTERODACTYL_URL;
const API_KEY = process.env.PTERODACTYL_API_KEY;

// Bot template configuration [citation:1]
const BOT_TEMPLATE = {
    name: 'WhatsApp Bot',
    description: 'Auto-deployed WhatsApp bot',
    nest: process.env.NEST_ID || 1,      // Your WhatsApp bot nest ID
    egg: process.env.EGG_ID || 2,        // Your WhatsApp bot egg ID
    limits: {
        memory: 1024,    // 1GB RAM
        disk: 2048,      // 2GB disk
        cpu: 100,        // 1 core
        swap: 0
    }
};

// Store active pairing sessions
const activeSessions = new Map();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Generate a secure random password
 */
function generatePassword() {
    return crypto.randomBytes(12).toString('hex');
}

/**
 * Generate username from phone number
 */
function generateUsername(phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    return `bot_${cleanPhone.substring(cleanPhone.length - 8)}`;
}

/**
 * Create Pterodactyl user [citation:4]
 */
async function createPterodactylUser(phone, email) {
    try {
        const username = generateUsername(phone);
        const password = generatePassword();
        
        const response = await axios.post(`${PTERODACTYL_URL}/api/application/users`, {
            username,
            email,
            first_name: 'Bot',
            last_name: 'User',
            password
        }, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        return {
            success: true,
            user: response.data.attributes,
            password,
            username
        };
    } catch (error) {
        console.error('User creation error:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Get available node and allocation [citation:8]
 */
async function getNodeAndAllocation() {
    try {
        const nodes = await axios.get(`${PTERODACTYL_URL}/api/application/nodes`, {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        });
        
        const node = nodes.data.data[0];
        
        const allocations = await axios.get(
            `${PTERODACTYL_URL}/api/application/nodes/${node.attributes.id}/allocations`,
            { headers: { 'Authorization': `Bearer ${API_KEY}` } }
        );
        
        const freeAlloc = allocations.data.data.find(a => !a.attributes.assigned);
        
        return {
            nodeId: node.attributes.id,
            allocationId: freeAlloc.attributes.id
        };
    } catch (error) {
        console.error('Node/allocation error:', error);
        return null;
    }
}

/**
 * Create Pterodactyl server [citation:1][citation:8]
 */
async function createPterodactylServer(userId, phone, nodeInfo) {
    try {
        const serverName = `wa-bot-${phone.substring(phone.length - 4)}`;
        
        const serverData = {
            name: serverName,
            user: userId,
            description: `WhatsApp Bot for ${phone}`,
            nest: BOT_TEMPLATE.nest,
            egg: BOT_TEMPLATE.egg,
            docker_image: 'node:18',
            startup: 'npm install && npm start',
            environment: {
                NODE_VERSION: '18',
                MAIN_FILE: 'index.js',
                BOT_NUMBER: phone,
                OWNER_NUMBER: phone,
                PREFIX: '.',
                BOT_NAME: 'Auto-Bot'
            },
            limits: BOT_TEMPLATE.limits,
            feature_limits: {
                databases: 0,
                backups: 1,
                allocations: 1
            },
            allocation: {
                default: nodeInfo.allocationId
            }
        };
        
        const response = await axios.post(
            `${PTERODACTYL_URL}/api/application/servers`,
            serverData,
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return { success: true, server: response.data.attributes };
    } catch (error) {
        console.error('Server creation error:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Generate WhatsApp pairing code [citation:3][citation:9]
 * This uses Baileys to generate a pairing code without QR
 */
async function generatePairingCode(phoneNumber, sessionId) {
    return new Promise(async (resolve, reject) => {
        try {
            const logger = pino({ level: 'silent' });
            const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${sessionId}`);
            
            const sock = makeWASocket({
                logger,
                auth: state,
                printQRInTerminal: false,
                browser: ['Pterodactyl Deployer', 'Chrome', '1.0']
            });
            
            let pairingCode = null;
            let timeout = setTimeout(() => {
                reject(new Error('Pairing timeout'));
                sock.end();
            }, 60000);
            
            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect } = update;
                
                if (connection === 'open') {
                    clearTimeout(timeout);
                    resolve({ success: true, message: 'Already authenticated' });
                    sock.end();
                }
            });
            
            // Request pairing code [citation:9]
            setTimeout(async () => {
                try {
                    const code = await sock.requestPairingCode(phoneNumber);
                    pairingCode = code.match(/.{1,4}/g).join('-'); // Format: XXXX-XXXX-XXXX
                    clearTimeout(timeout);
                    resolve({ success: true, pairingCode: pairingCode });
                } catch (error) {
                    reject(error);
                }
            }, 2000);
            
            // Save credentials
            sock.ev.on('creds.update', saveCreds);
            
        } catch (error) {
            reject(error);
        }
    });
}

// ==================== API ENDPOINTS ====================

/**
 * Deploy endpoint - Main entry point for users [citation:7]
 */
app.post('/api/deploy', async (req, res) => {
    try {
        const { phoneNumber, email } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({ error: 'Phone number required' });
        }
        
        // Clean phone number
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        const userEmail = email || `${cleanPhone}@temp.deploy.com`;
        
        console.log(`[Deploy] Starting deployment for ${cleanPhone}`);
        
        // 1. Generate session ID
        const sessionId = `session_${Date.now()}_${cleanPhone.substring(cleanPhone.length - 4)}`;
        
        // 2. Create Pterodactyl user [citation:4]
        const userResult = await createPterodactylUser(cleanPhone, userEmail);
        if (!userResult.success) {
            return res.status(500).json({ error: 'Failed to create user: ' + userResult.error });
        }
        
        // 3. Get node and allocation
        const nodeInfo = await getNodeAndAllocation();
        if (!nodeInfo) {
            return res.status(500).json({ error: 'No available server nodes' });
        }
        
        // 4. Create server [citation:1]
        const serverResult = await createPterodactylServer(
            userResult.user.id,
            cleanPhone,
            nodeInfo
        );
        
        if (!serverResult.success) {
            return res.status(500).json({ error: 'Failed to create server: ' + serverResult.error });
        }
        
        // 5. Generate pairing code [citation:3][citation:9]
        let pairingResult;
        try {
            pairingResult = await generatePairingCode(cleanPhone, sessionId);
        } catch (pairError) {
            pairingResult = { success: false, error: pairError.message };
        }
        
        // Store session info
        activeSessions.set(sessionId, {
            phone: cleanPhone,
            userId: userResult.user.id,
            serverId: serverResult.server.id,
            createdAt: Date.now()
        });
        
        // Return deployment info to user
        res.json({
            success: true,
            message: 'Bot deployment initiated',
            serverId: serverResult.server.id,
            panelUrl: `${PTERODACTYL_URL}/server/${serverResult.server.id}`,
            username: userResult.username,
            password: userResult.password,
            pairingCode: pairingResult.pairingCode || null,
            pairingStatus: pairingResult.success ? 'ready' : 'failed',
            instructions: [
                '1. Save your panel login credentials',
                '2. If pairing code is available, enter it in WhatsApp',
                '3. Login to panel to start your bot',
                '4. Bot will be ready after authentication'
            ]
        });
        
    } catch (error) {
        console.error('[Deploy] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Check deployment status [citation:7]
 */
app.get('/api/status/:sessionId', (req, res) => {
    const session = activeSessions.get(req.params.sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
});

/**
 * Get pairing code for existing session [citation:9]
 */
app.post('/api/pair/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { phoneNumber } = req.body;
        
        const result = await generatePairingCode(phoneNumber, sessionId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`✅ Deployment server running on port ${PORT}`);
    console.log(`🌐 Open http://localhost:${PORT} in your browser`);
});