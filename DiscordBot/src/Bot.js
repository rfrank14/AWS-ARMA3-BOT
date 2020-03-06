var awsCli = require('aws-cli-js');
var gamedig = require('gamedig');
var server_fns = require('./server_functions');
var volume_fns = require('./volume_functions');

var Options = awsCli.Options;
var Aws = awsCli.Aws;

const { ACCESSKEY } = require('../config.json');
const { SECRETKEY } = require('../config.json');
const { SESSIONTOKEN } = require('../config.json');
const { INSTANCE } = require('../config.json');
const { MESSAGELOGGING } = require('../config.json');
const { SPOTINSTANCE } = require('../config.json');
const { MISSIONS } = require('../config.json');
const { VOLUMES } = require('../config.json');

var verboseLog = (MESSAGELOGGING === 'T');

let options = new Options(
  /* accessKey    */ ACCESSKEY,
  /* secretKey    */ SECRETKEY,
  /* sessionToken */ SESSIONTOKEN,
  /* currentWorkingDirectory */ null
);

const aws = new Aws(options);

const eris = require('eris');
const { BOT_TOKEN } = require('../config.json');
const { ROLEID } = require('../config.json');
const { CHANNELID } = require('../config.json');

const PREFIX = '$server';
const HelpDocs =
    '\n Help Docs: \n `start`: Starts the server \n `stop`: Stops the server \n `status`: Returns the server status \n `mission`: gets list of misisons on server or changes mission on server \n `Github`: https://github.com/rfrank14/AWS-ARMA3-BOT';

missions = MISSIONS;

// Create a Client instance with our bot token.
const bot = new eris.Client(BOT_TOKEN);

// When the bot is connected and ready, log to console.
bot.on('ready', () => {
    console.log('Connected and ready.');
});

// starts instance and fires off query wait for instances
const commandHandlerForCommandName = {};
commandHandlerForCommandName['start'] = async (msg, args) => {
    try {
        server_fns.startServer(msg)
            .then(async function () {
                console.log('sever finished starting');
         })
         .catch(function (err) {
            msg.channel.createMessage(`Error starting the server`);
            console.error('error starting server');
         })
    } catch (err) {
        msg.channel.createMessage(`Error starting the server`);
        console.log(err);
    }
};

commandHandlerForCommandName['stop'] = async (msg, args) => {
    try {
        server_fns.stopServer(msg)
            .then(async function () {
                console.log('server finished stopping');
            })
            .catch(function (err) {
                msg.channel.createMessage(`Error stopping the server`);
                console.error('error stopping server');
            })
    } catch (err) {
        msg.channel.createMessage(`Error stopping the server`);
        console.log(err);
    }
};

commandHandlerForCommandName['help'] = (msg, args) => {
    return msg.channel.createMessage(HelpDocs);
};

// checks if instance is running and$server proceedes to get status of instance and players in arma server
commandHandlerForCommandName['status'] = (msg, args) => {
    console.warn("Getting server status");
    try {
        server_fns.serverStatus(msg);
    } catch (err) {
	console.logs(err);
    msg.channel.createMessage(`Error getting status`);
    }
};

commandHandlerForCommandName['mission'] = async (msg, args) => {
    try {
        mission = args[1];
        if(mission == undefined) {
           return await server_fns.missionHelp(msg);
        }
        await server_fns.changeMission(mission);
        msg.channel.createMessage(`Changed mission to ${mission}`);
    } catch (err) {
        console.log(err);
        msg.channel.createMessage(`Error changing mission`);
    }
}

function commandContainsMission(commandOption) {
    missions = MISSIONS;
    if (missions[commandOption] == undefined) {
        return false;
    }
    return true;
}

// Every time a message is sent anywhere the bot is present,
// this event will fire and we will check if the bot was mentioned.
// If it was, the bot will attempt to respond with "Present".
bot.on('messageCreate', async (msg) => {
    const content = msg.content;
    const botWasMentioned = msg.mentions.find(
        mentionedUser => mentionedUser.id === bot.user.id,
    );

    //make sure it's in the right channel
    if (!(msg.channel.id === CHANNELID)) {
        return;
    }

    //if the message is sent by a bot, ignore it
    if (msg.author.bot) {
        return;
    }

    if (!msg.member.roles.includes(ROLEID)) {
        await msg.channel.createMessage(`<  You do not have the required roles`);
        return;
    }

    if (botWasMentioned) {
        await msg.channel.createMessage('Brewing the coffee and ready to go!');
    }

    //ignore dms, guild messages only
    if (!msg.channel.guild) {
        console.warn('Received a dm, ignoring');
        return;
    }

    // Ignore any message that doesn't start with the correct prefix.
    if (!content.startsWith(PREFIX)) {
        return;
    }
    // Extract the parts of the command and the command name
    const commandString = content.split(PREFIX)[1].trim();
    const commandName = commandString.split(' ');
    const commandOption = commandString.split(' ')[1];
    // Get the appropriate handler for the command, if there is one.
    const commandHandler = commandHandlerForCommandName[commandName[0]];
    if (!commandHandler) {
        await msg.channel.createMessage(`Unkown command, try ${PREFIX} help for a list of commands`);
        return;
    }

    // if (commandName == 'mission' && !commandContainsMission(commandOption)) {
    //     return await msg.channel.createMessage(`Missing mission option, use $server missions to find list of missions`);
    // }

    if(commandName[0] == 'mission') {
        if(await volume_fns.returnLoadedMission() == commandOption) {
            return await msg.channel.createMessage(`${commandOption} is already loaded`);
        }

        if(commandOption != undefined) {
            missionFound = await server_fns.missionOnServer(commandOption)
            if(!missionFound) {
                return await msg.channel.createMessage(`unknown mission try ${PREFIX} mission for list of missions`)
            }
        }
    }
    // Separate the command arguments from the command prefix and command name.

    try {
        // Execute the command.
        await commandHandler(msg, commandName);
    } catch (err) {
        console.warn('Error handling command');
        console.warn(err);
    }
});

bot.on('error', err => {
    console.warn(err);
});

bot.connect();
