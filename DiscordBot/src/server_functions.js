var instance_fns = require('./instance_functions');
var volume_fns = require('./volume_functions');
var gamedig = require('gamedig');
var fs = require('fs');

const { MISSIONS }  = require('../config.json');
const { VOLUMES } = require('../config.json');

async function startServer(msg) {
    try {
        console.log('Entering start server function')
        mission = await volume_fns.returnLoadedMission();
        console.log(`mission ${mission} is currently loaded`);
        instanceid = MISSIONS[mission];
        console.log(`${mission} attached to ${instanceid}`);
        state = await instance_fns.returnInstanceState(instanceid);
        console.log(`instance ${instanceid} is in ${state} state`)
        if (state == "stopped") {
            instance_fns.startInstance(instanceid);
            msg.channel.createMessage(`Starting the server, i will let you know when its ready`);
            message = await queryStart(instanceid);
            return msg.channel.createMessage(message);
        } else {
            message = `Server cannot be started as it is in ${state} state`;
            msg.channel.createMessage(message);
        }
    
    } catch (err) {
        msg.channel.createMessage(`Error starting the server`);
    }
}

async function stopServer(msg) {
    try {
        console.log('Entering stop server function')
        mission = await volume_fns.returnLoadedMission();
        console.log(`mission ${mission} is currently loaded`);
        instanceid = MISSIONS[mission];
        console.log(`${mission} attached to ${instanceid}`);    
        serverBusy = await playersOnServer(instanceid);
        if (!serverBusy) { 
            console.log(`server has players on it`);
            instance_fns.stopInstance(instanceid);
            msg.channel.createMessage(`Stopping the server`);
            
            stopped = await waitForServerStop(instanceid);
            console.log(`server is stopped ${stopped}`);
            if(stopped) {
                msg.channel.createMessage("Server stopped");
                return true;
            } else {
                msg.channel.createMessage(`Stop timeout, server: ${returnInstanceState} spot: ${returnSpotInstanceState}`);
                return false;
            }
        } else {
            msg.channel.createMessage('players still on server, cannot stop.');
            return false;
        }
        console.log('finish stop server');
    } catch (err) {
        msg.channel.createMessage(`Error stopping the server`);
        console.log(err);
    }
}

async function changeMission(mission) {
    try {
        console.log(`Entering change mission function with ${mission} argument`)
        missionInstanceId = MISSIONS[mission];
        console.log(`${mission} attached to instance ${instanceid}`);
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
        console.log(`path to mission script: ${scriptPath}`);
        var scriptString = fs.readFileSync(scriptPath, 'utf8');
        scriptBase64 = Buffer.from(scriptString).toString('base64');

        await instance_fns.setInstanceUserData(missionInstanceId, scriptBase64);
        await volume_fns.updateMissionTag(dataVol[1], mission);
        console.log('finish change mission');
    } catch (e) {
        console.log(e);
        throw e;
    }
}

async function missionHelp(msg) {
    try {
        console.log('start mission help');
        missions = Object.keys(MISSIONS);
        var message = `usage $server mission <mission name> \n List of missions on server: \n`;
        missions.forEach(function(mission) {
            message += `\t ${mission} \n`;
        });
        msg.channel.createMessage(message);
        console.log('finish missin help');
    } catch (err) {
        console.log('error in mission help function: ');
        console.log(err);
    }
}

async function waitForServerStop(instanceid) {
    try {
        console.log(`start server stop wait with ${instanceid}`);
        attempts = 1;
        state = "";
        message = "";
        spotInstanceid = await instance_fns.returnSpotInstance(instanceid);
        console.log(`instance ${instanceid} attached to ${spotInstanceid}`);
        spotInstanceid == undefined ? spotStop = true : spotStop = false;
        instanceStop = false;
        console.log('starting server stop wait loop');
        while (attempts <= 40 && (!spotStop || !instanceStop)) {
            console.log(`attempt ${attempts}`);
            !spotStop && await instance_fns.returnSpotInstanceState(spotInstanceid) == 'disabled' ? spotStop = true : null;
            console.log(`spot request stop ${spotStop}`);
            !instanceStop && await instance_fns.returnInstanceState(instanceid) == 'stopped' ? instanceStop = true : null;
            console.log(`instance stop ${spotStop}`);

            if (!spotStop || !instanceStop) {
                console.log('sleeping for 15 seconds');
                await sleep(15000);
            }

            attempts++
        }
        console.log('server stop wait loop finished')

        if (instanceStop && spotStop) {
            console.log('server stopped');
            return true; 
        } else {
            console.log(`server not stopped`);
            return false;
        }
    } catch(err) {
        console.log(err);
    }
}

async function serverStatus(msg) {
    try {
        console.log("start server status");
        mission = await volume_fns.returnLoadedMission();
        console.log(`loaded mission ${mission}`);
        instanceid = MISSIONS[mission];
        console.log(`${mission} attached to instance ${instanceid}`);
        reply = await instance_fns.returnInstanceData(instanceid);
        instanceState = reply.State.Name;
        instanceLaunch = reply.LaunchTime;
        ip = reply.PublicIpAddress;
        var launchTime = new Date(instanceLaunch).toLocaleString("en-US", {timezone: "Australia/Sydney"});
        console.log(`instance ${instanceid} state ${instanceState} public ip ${ip} launch ${launchTime}`);

        message = `\`\`\`diff`
        message +=`\nServer Status`
        message += '\n________________________________';

        if (instanceState == 'running') {
            console.log('instance running getting status');
            serverStatus = '+ Server: RUNNING';
            armaStatusP = queryServer('arma3', ip, 'status');
            tsStatusP = queryServer('teamspeak3', ip, 'status');
            playersP = queryServer('arma3', ip, 'players');
            console.log('await server query')
            let [armaStatus, tsStatus, players] = await Promise.all([armaStatusP, tsStatusP, playersP]);
            console.log("finish await");
            message +=`\n${serverStatus}`;
            message +=`\n${armaStatus}`;
            message +=`\n${tsStatus}`;
            message +=`\n  IP Address : ${ip}`;
            message +=`\n  Launch Time : ${launchTime} \n`
            
            console.log('starting player status check')
            if(typeof players != 'undefined') {
                console.log('players on server');
                message +=`\n  Players: ${players.length}`
                players.forEach(player => {
                    console.log(`print player ${player.name}`);
                    message+=`\n\t\t${player.name}`
                });
            } else {
                console.log('no players on server');
            }

        } else {
            console.log('instance not running');
            message += `\n- Server: ${instanceState.toUpperCase()}`;
        }

        message += '\n\`\`\`'
        msg.channel.createMessage(message);
        console.log('finished server status');
        // msg.channel.createMessage(message);
    } catch (err) {
	    console.warn(err);
        msg.channel.createMessage(`Error getting status`);
        return msg.channel.createMessage(err);
    }
}

async function queryStart(instanceid) {
    console.log('start querystart')
    var serverOnline = false;
    var tsOnline = false;
    var a3Online = false;
    var ipAddress;

    var attempts = 0;
    console.log('starting instnace check loop');
    while (attempts < 5 && !serverOnline) {
        console.log(`attempt ${attempts}`);
        instance = await instance_fns.returnInstanceData(instanceid);
        if (instance.State.Name == "running") {
            console.log('instance running');
            serverOnline = true;
            ipAddress = instance.PublicIpAddress
        } else {
            console.log('instance not running');
            console.log("server offline sleeping for 15 seconds");
            await sleep(15000);
        }
        attempts++
    }
    
    console.log('starting server query');
    attempts = 0;
    while (attempts < 10 && (!a3Online || !tsOnline)) {
        console.log(`server query attempt ${attempts}`);
        if (!a3Online) {
            console.log(`a3 server online`);
            reply = await queryServer('arma3', ipAddress, 'status');
            if (reply[0] == '+') {a3Online = true;}
        }
        if(!tsOnline) {
            console.log('ts3 server online')
            reply = await queryServer('teamspeak3', ipAddress, 'status');
            if (reply[0] == '+') {tsOnline = true;}
        }

        if(!tsOnline | !a3Online) {
            console.log("a3 or ts3 offline sleeping for 15 seconds");
            await sleep(20000);
        }
        attempts++;
    }

    console.log('prepareing status message');
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
    console.log(`start queryserver function with servertype: ${serverType}, ip: ${ipAddress}, querytype: ${queryType}`);
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
    console.log('finish query server');
    return result;
}

async function playersOnServer(instanceid){
    console.log('start players on server');
    data = await instance_fns.returnInstanceData(instanceid);
    players = queryServer('arma3', data.PublicIpAddress, 'players');
    console.log('finish players on server');
    return (players.length > 0);
}

async function missionOnServer(incMission) {
    console.log(`start mission on server with ${incMission}`);
    missionFound = false
    missions = Object.keys(MISSIONS);
    missions.forEach(function(mission) {
        if(mission == incMission) {
            console.log(`${incMission} found`);
            missionFound = true;
        }
    });
    console.log(`finish mission on server with ${missionHelp}`);
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