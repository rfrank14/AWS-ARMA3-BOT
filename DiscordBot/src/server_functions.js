var instance_fns = require('./instance_functions');
var volume_fns = require('./volume_functions');
var message_fns = require('./message_fns');
var gamedig = require('gamedig');
var fs = require('fs');

const { MISSIONS }  = require('../config.json');
const { VOLUMES } = require('../config.json');

async function startServer() {
    try {
        mission = await volume_fns.returnLoadedMission();
        instanceid = MISSIONS[mission];
        state = await instance_fns.returnInstanceState(instanceid);
        if (state == "stopped") {
            instance_fns.startInstance(instanceid);
            message_fns.sendMessage(`Starting the server, i will let you know when its ready`);
            message = await queryStart(instanceid);
            return message_fns.sendMessage(message);
        } else {
            message = `Server cannot be started as it is in ${state} state`;
            message_fns.sendMessage(message);
        }
    
    } catch (err) {
        message_fns.sendMessage(`Error starting the server`);
    }
}

async function stopServer() {
    try {
        mission = await volume_fns.returnLoadedMission();
        instanceid = MISSIONS[mission];
        serverBusy = await playersOnServer(instanceid);
        if (!serverBusy) { 
            instance_fns.stopInstance(instanceid);
            message_fns.sendMessage(`Stopping the server`);
            stopped = await waitForServerStop(instanceid);
            if(stopped) {
                message_fns.sendMessage("Server stopped");
                return true;
            } else {
                message_fns.sendMessage(`Stop timeout, server: ${returnInstanceState} spot: ${returnSpotInstanceState}`);
                return false;
            }
        } else {
            message_fns.sendMessage('players still on server, cannot stop.');
            return false;
        }

    } catch (err) {
        message_fns.sendMessage(`Error stopping the server`);
        console.log(err);
    }
}

async function changeMission(mission) {
    try {
        missionInstanceId = MISSIONS[mission];
        rootVol = VOLUMES['root'];
        dataVol = VOLUMES['data'];
        volAttachInstance = await volume_fns.returnAttachedInstance(dataVol[1]);
        if(!(missionInstanceId == volAttachInstance) || volAttachInstance != undefined) {
            rootVolId = rootVol[1];
            dataVolId = dataVol[1];
            swap1 = volume_fns.swapDisk(rootVolId, missionInstanceId, rootVol[0]);
            swap2 = volume_fns.swapDisk(dataVolId, missionInstanceId, dataVol[0]);
            await Promise.all([swap1, swap2]);
            console.log(`Swapped disks root: ${rootVolId}, data: ${dataVolId} to instance ${missionInstanceId}`)
        } else {
            console.log(`Disk swap not needed`)
        }
        var scriptPath = `${__dirname}/missions/${mission}.txt`;
        var scriptString = fs.readFileSync(scriptPath, 'utf8');
        scriptBase64 = Buffer.from(scriptString).toString('base64');

        await instance_fns.setInstanceUserData(missionInstanceId, scriptBase64);
        await volume_fns.updateMissionTag(dataVol[1], mission);
        console.log('mission swapped');
    } catch (e) {
        console.log(e);
        throw e;
    }
}

async function missionHelp() {
    try {
        missions = Object.keys(MISSIONS);
        var message = `usage $server mission <mission name> \n List of missions on server: \n`;
        missions.forEach(function(mission) {
            message += `\t ${mission} \n`;
        });
        message_fns.sendMessage(message);
    } catch (err) {
        console.log(err);
    }
}

async function waitForServerStop(instanceid) {
    try {
        attempts = 1;
        state = "";
        message = "";
        spotInstanceid = await instance_fns.returnSpotInstance(instanceid);
        spotInstanceid == undefined ? spotStop = true : spotStop = false;
        instanceStop = false; 
        while (attempts <= 40 && (!spotStop || !instanceStop)) {
            !spotStop && await instance_fns.returnSpotInstanceState(spotInstanceid) == 'disabled' ? spotStop = true : null;
            !instanceStop && await instance_fns.returnInstanceState(instanceid) == 'stopped' ? instanceStop = true : null;

            if (!spotStop || !instanceStop) {
                await sleep(15000);
            }

            attempts++
        }

        if (instanceStop && spotStop) {
            return true; 
        } else {
            return false;
        }
    } catch(err) {
        console.log(err);
    }
}

async function serverStatus() {
    console.warn("Getting server status");
    try {
        mission = await volume_fns.returnLoadedMission();
        instanceid = MISSIONS[mission];
        reply = await instance_fns.returnInstanceData(instanceid);
        instanceState = reply.State.Name;
        istanceLaunch = reply.LaunchTime;
        ip = reply.PublicIpAddress;
        var launchTime = new Date(istanceLaunch).toLocaleString("en-US", {timezone: "Australia/Sydney"});

        message = `\`\`\`diff`
        message +=`\nServer Status`
        message += '\n________________________________';

        if (instanceState == 'running') {
            serverStatus = '+ Server: RUNNING';
            armaStatusP = queryServer('arma3', ip, 'status');
            tsStatusP = queryServer('teamspeak3', ip, 'status');
            playersP = queryServer('arma3', ip, 'players');
            let [armaStatus, tsStatus, players] = await Promise.all([armaStatusP, tsStatusP, playersP]);

            message +=`\n${serverStatus}`;
            message +=`\n${armaStatus}`;
            message +=`\n${tsStatus}`;
            message +=`\n  IP Address : ${ip}`;
            message +=`\n  Launch Time : ${launchTime} \n`
            
            if(typeof players != 'undefined') {
                message +=`\n  Players: ${players.length}`
                players.forEach(player => {
                    message+=`\n\t\t${player.name}`
                });
            }

        } else {
            message += `\n- Server: ${instanceState.toUpperCase()}`;
        }

        message += '\n\`\`\`'
        message_fns.sendMessage(message);
        // msg.channel.createMessage(message);
    } catch (err) {
	console.warn(err);
        message_fns.sendMessage(`Error getting status`);
        return message_fns.sendMessage(err);
    }
}

async function queryStart(instanceid) {
    var serverOnline = false;
    var tsOnline = false;
    var a3Online = false;
    var ipAddress;

    var attempts = 0;
    while (attempts < 5 && !serverOnline) {
        instance = await instance_fns.returnInstanceData(instanceid);
        if (instance.State.Name == "running") {
            serverOnline = true;
            ipAddress = instance.PublicIpAddress
        } else {
            console.log("server offline sleeping for 15 seconds");
            await sleep(15000);
        }
        attempts++
    }

    attempts = 0;
    while (attempts < 10 && (!a3Online || !tsOnline)) {
        if (!a3Online) {
            reply = await queryServer('arma3', ipAddress, 'status');
            if (reply[0] == '+') {a3Online = true;}
        }
        if(!tsOnline) {
            reply = await queryServer('teamspeak3', ipAddress, 'status');
            if (reply[0] == '+') {tsOnline = true;}
        }

        if(!tsOnline | !a3Online) {
            console.log("Instance offline sleeping for 15 seconds");
            await sleep(20000);
        }
        attempts++;
    }

    message = '```diff';
    if(a3Online && tsOnline && serverOnline) {
        message += '\nServer is Ready';
    } else {
        message +='\nMax wait time reached'
    }

    message += '\n________________________________';
    message += (serverOnline) ? `\n+ Server: ONLINE \n  IP Address: ${ipAddress}` : '\n- Server: OFFLINE';
    message += (a3Online) ? '\n+ ARMA3: ONLINE' : '\n- ARMA3: OFFLINE';
    message += (tsOnline) ? '\n+ Teamspeak: ONLINE' : '\n- Teamspeak: OFFLINE';
    message += '\n```'
    
    return message;
}

async function queryServer(serverType, ipAddress, queryType) {
    var queryInstance = new gamedig();
    let result = queryInstance.query({
        type: serverType,
        host: ipAddress
    }).then((state) => {
        if(queryType == 'players') {
            return state.players
        } else if(queryType == 'status') {
            return `+ ${serverType.toUpperCase()} Instance: ONLINE`;
        }
    }).catch((error) => {
        if(queryType=='players') {

        } else if (queryType == 'status') {
            return `- ${serverType.toUpperCase()} Instance: OFFLINE`;
        }
    });
    return result;
}

async function playersOnServer(instanceid){
    data = await instance_fns.returnInstanceData(instanceid);
    players = queryServer('arma3', data.PublicIpAddress, 'players');
    return (players.length > 0);
}

async function missionOnServer(incMission) {
    missionFound = false
    missions = Object.keys(MISSIONS);
    missions.forEach(function(mission) {
        if(mission == incMission) {
            missionFound = true;
        }
    });
    return missionFound;
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports.startServer = startServer;
module.exports.stopServer = stopServer;
module.exports.waitForServerStop = waitForServerStop;
module.exports.serverStatus = serverStatus;
module.exports.queryStart = queryStart;
module.exports.changeMission = changeMission;
module.exports.playersOnServer = playersOnServer;
module.exports.missionHelp = missionHelp;
module.exports.missionOnServer = missionOnServer;