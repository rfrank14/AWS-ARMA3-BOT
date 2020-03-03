var awsCli = require('aws-cli-js');

var Options = awsCli.Options;
var Aws = awsCli.Aws;

const { ACCESSKEY } = require('../config.json');
const { SECRETKEY } = require('../config.json');
const { SESSIONTOKEN } = require('../config.json');
const { INSTANCE } = require('../config.json');
const { MESSAGELOGGING } = require('../config.json');
const { SPOTINSTANCE } = require('../config.json');
const { VOLUMES } = require('../config.json');

var verboseLog = (MESSAGELOGGING === 'T');

let options = new Options(
    /* accessKey    */ ACCESSKEY,
    /* secretKey    */ SECRETKEY,
    /* sessionToken */ SESSIONTOKEN,
    /* currentWorkingDirectory */ null
  );
  
const aws = new Aws(options);

async function swapDisk(volumeid, instanceid, deviceName) {
    try {
        volState = await returnVolumeState(volumeid);
        if(volState != 'available') {
            volDetatched = await detatchVolume(volumeid);
        } else {
            volDetached = true;
        }
        if (volDetached) {
            volAttached = await attachVolume(volumeid, instanceid, deviceName);
        } else {
            return console.log('Error Detatching Disks');
        }

        if(!volAttached) {
            return console.log('Error Attaching Disks');
        }

        console.log('Disks Attached');
    } catch (e) {
        console.error(e);
        throw e;
    }
}

async function detatchVolume(volumeid) {
    try {
        const detatchCommand = 'ec2 detach-volume --volume-id ' + volumeid;
        await aws.command(detatchCommand);
        state = await returnVolumeState(volumeid);
        attempts = 0;
        volDetached = false;
        
        while(attempts <= 5 && !volDetached) {
            state = await returnVolumeState(volumeid);
            if(state.toLowerCase() == 'available') {
                volDetached = true;
            } else {
                await sleep(15000);
            }
            attempts++;
        }

        return volDetached;
    } catch (err) {
        console.error(`Error detaching volume ${volumeid}`)
        throw err;
    }
}

async function attachVolume(volumeid, instanceid, deviceName) {
    try {
        const attachCommand = 'ec2 attach-volume --volume-id ' + volumeid + ' --instance-id ' + instanceid + ' --device ' + deviceName;
        await aws.command(attachCommand);
        state = await returnVolumeState(volumeid);
        attempts = 0;
        volAttached = false;

        while(attempts <= 5 && !volAttached) {
            state = await returnVolumeState(volumeid);
            if(state.toLowerCase() == 'in-use') {
                volAttached = true;
            } else {
                await sleep(15000);
            }
            attempts++;
        }

        return volAttached;
    } catch (err) {
        console.error(`Error attaching volume ${volumeid} to ${instanceid} at ${deviceName}`);
        throw err;
    }
}

async function returnVolumeData(volumeid) {
    try {
        const volumeStatus = 'ec2 describe-volumes --volume-ids ' + volumeid;
        reply = await aws.command(volumeStatus);
        
        return reply.object.Volumes[0];
    } catch (err) {
        console.error(`Error returning volume ${volumeid} info`);
        throw err;
    }

}

async function returnAttachedInstance(volumeid) {
    try {
        volume = await returnVolumeData(volumeid);
        if(volume.Attachments.length > 0) { 
            volumeid = volume.Attachments[0].InstanceId;
        }
        return volumeid;
    } catch (err) {
        console.error(`Error returning attached instance for volume ${volumeid}`);
        throw err;
    }
}

async function returnVolumeState(volumeid) {
    try {
        volume = await returnVolumeData(volumeid);
        volState = volume.State;
        return volState;
    } catch (err) {
        console.error(`Error returning state for volume ${volumeid}`);
        throw err;
    }
}

async function returnLoadedMission() {
    try {
        volumeid = VOLUMES['data'][1];
        volume = await returnVolumeData(volumeid);
        volume.Tags.forEach(function (tag) {
            if (tag.Key == 'loaded_mission') {
                loadedMission = tag.Value;
            }
        });
        return loadedMission;
    } catch (err) {
        console.log('Error returning current loaded mission');
        console.error(err);
        throw err;
    }
}

async function updateMissionTag(volumeid, missionName) {
    try {
        const updateTagCommand = `ec2 create-tags --resources ${volumeid} --tags Key=loaded_mission,Value=${missionName}`;
        aws.command(updateTagCommand);
    } catch (err) {
        console.log(`Error updating tag ${missionName} on volume ${volumeid}`);
    }
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports.swapDisk = swapDisk;
module.exports.detatchVolume = detatchVolume;
module.exports.attachVolume = attachVolume;
module.exports.returnVolumeState = returnVolumeState;
module.exports.returnLoadedMission = returnLoadedMission;
module.exports.returnAttachedInstance = returnAttachedInstance;
module.exports.updateMissionTag = updateMissionTag;