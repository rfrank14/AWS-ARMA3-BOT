var eris = require('eris');

const { BOT_TOKEN } = require('../config.json');
const { ROLEID } = require('../config.json');
const { CHANNELID } = require('../config.json');


async function sendMessage(content) {
    try {
        const bot = new eris.Client(BOT_TOKEN);
        await bot.connect();
        bot.on('ready', () => {
            return bot.createMessage(CHANNELID, content);
        });
        // bot.disconnect();
        // channel = bot.getChannel(CHANNELID);
        // return channel.createMessage(content);
    } catch (err) {
        console.log(err);
    }
}

module.exports.sendMessage = sendMessage;