/**
 * Reset Menu Image Command - Reset to default menu image
 */

const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'resetmenuimage',
  aliases: ['resetmenu', 'defaultmenu'],
  category: 'owner',
  description: 'Reset menu image to default',
  usage: '.resetmenuimage',
  ownerOnly: true,
  
  async execute(sock, msg, args, extra) {
    try {
      // Paths
      const menuImagePath = path.join(__dirname, '../utils/menu_image.jpg');
      const defaultImagePath = path.join(__dirname, '../utils/default_menu.jpg');
      
      // Check if default image exists
      if (!fs.existsSync(defaultImagePath)) {
        // If no default, just delete the custom image
        if (fs.existsSync(menuImagePath)) {
          fs.unlinkSync(menuImagePath);
          return extra.reply('✅ *Menu image reset to default!*\n\nNo default image found, using text-only menu.');
        } else {
          return extra.reply('❌ *No custom menu image found!*');
        }
      }
      
      // Copy default over custom
      fs.copyFileSync(defaultImagePath, menuImagePath);
      
      await extra.reply('✅ *Menu image reset to default!*');
      
    } catch (error) {
      console.error('ResetMenuImage Error:', error);
      await extra.reply(`❌ Error: ${error.message}`);
    }
  }
};