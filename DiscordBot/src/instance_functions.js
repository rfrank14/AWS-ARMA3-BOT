var awsCli = require('aws-cli-js');

var Options = awsCli.Options;
var Aws = awsCli.Aws;

const { ACCESSKEY } = require('../config.json');
const { SECRETKEY } = require('../config.json');
const { SESSIONTOKEN } = require('../config.json');
const { INSTANCE } = require('../config.json');
const { MESSAGELOGGING } = require('../config.json');
const { SPOTINSTANCE } = require('../config.json');

let options = new Options(
    /* accessKey    */ ACCESSKEY,
    /* secretKey    */ SECRETKEY,
    /* sessionToken */ SESSIONTOKEN,
    /* currentWorkingDirectory */ null
  );
  
const aws = new Aws(options);

async function startInstance(instanceid) {
    const StartCommand = `ec2 start-instances --instance-ids ${instanceid}`;
    try {
        await aws.command(StartCommand);
    } catch (err) {
        console.log(`Error starting instance ${instanceid} via aws cli`);
    }
}

async function stopInstance(instanceid) {
    const StopCommand = `ec2 stop-instances --instance-ids ${instanceid}`;
    try {
        await aws.command(StopCommand)
    } catch (err) {
        console.log(`Error stopping instance ${instanceid} via aws cli`)
    }
}

async function restartInstance(msg, args) {
    try {
        if (instanceState = await returnInstanceState() != 'running') {
            return msg.channel.createMessage(`Cannot restart server as it is ${instanceState}`);
        }
        commandHandler = commandHandlerForCommandName['stop']
        restartStopped = commandHandler(msg, 'stop');
        await restartStopped;
        if(restartStopped) {
            commandHandler = commandHandlerForCommandName['start']
            await commandHandler(msg, 'start');
        }
    } catch (err) {
        console.log(err);
    }
}

async function returnInstanceData(instanceid) {
    const StatusCommand = 'ec2 describe-instances --instance-id ' + instanceid;
    data = await aws.command(StatusCommand);
    return data.object.Reservations[0].Instances[0];
}

async function returnInstanceState(instanceid) {
    instance = await returnInstanceData(instanceid);
    return instance.State.Name;
}

async function returnSpotInstanceState(spotInstanceid) {
    const StatusSpotInstance = 'ec2 describe-spot-instance-requests --spot-instance-request-ids ' + spotInstanceid;
    data = await aws.command(StatusSpotInstance);
    return data.object.SpotInstanceRequests[0].State;
}

async function setInstanceUserData(instanceid, missionScript) {
    const setUserDataCommand = `ec2 modify-instance-attribute --instance-id ${instanceid} --attribute userData --value ${missionScript}`;
    try {
        await aws.command(setUserDataCommand);
        console.log('user data set')
    } catch (err) {
        console.log(err);
    }
}

async function returnSpotInstance(instanceid) {
    try {
        instance = await returnInstanceData(instanceid);
        return instance.SpotInstanceRequestId;
    } catch(err) {
        console.log(err);
    }
 }

module.exports.startInstance = startInstance;
module.exports.stopInstance = stopInstance;
module.exports.restartInstance = restartInstance;
module.exports.returnInstanceData = returnInstanceData;
module.exports.returnInstanceState = returnInstanceState;
module.exports.returnSpotInstanceState = returnSpotInstanceState;
module.exports.returnSpotInstance = returnSpotInstance;
module.exports.setInstanceUserData = setInstanceUserData;