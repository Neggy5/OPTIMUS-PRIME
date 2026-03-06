/**
 * Poll Command
 */
module.exports = {
  name: 'poll',
  description: 'Create a group poll',
  category: 'group',
  groupOnly: true,

  async execute(sock, msg, args, extra) {
    const text = args.join(' ');
    if (!text.includes('|')) return extra.reply('Usage: `.poll Question | Option1 | Option2`');
    
    const [name, ...options] = text.split('|').map(v => v.trim());
    await sock.sendMessage(extra.from, {
      poll: {
        name,
        values: options,
        selectableCount: 1
      }
    });
  }
};