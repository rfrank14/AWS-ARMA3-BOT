var volume_functions = require('./volume_functions');
var server_fns = require('./server_functions');
var message_fns = require('./message_fns');
var instance_fns = require('./instance_functions');

var { MISSIONS } = require('../config.json');

console.log(__dirname);
// volume tests
// (async function() {
// //     console.log(await bot_functions.returnVolumeState('vol-068f9a55d9b8548f6'));
// //     console.log(await bot_functions.detatchVolume('vol-068f9a55d9b8548f6'));
// //     console.log(await bot_functions.attachVolume('vol-068f9a55d9b8548f6', 'i-0299ad255041ecc78', '/dev/sda1'));
// //     console.log(await bot_functions.swapDisk('vol-068f9a55d9b8548f6', 'i-0299ad255041ecc78', '/dev/sda1'))
//         // console.log(await volume_functions.returnAttachedInstance('vol-068f9a55d9b8548f6'));
// } ());

// server functions tests
(async function() {
    try {
        // await server_fns.serverStatus('i-0299ad255041ecc78');
        // console.log(await server_fns.playersOnServer('i-0299ad255041ecc78'));
        // await instance_fns.stopInstance('i-0299ad255041ecc78', 'sir-xtd8h21h');
        // await server_fns.startServer('i-0299ad255041ecc78');
        // await server_fns.stopServer('i-0299ad255041ecc78', 'sir-xtd8h21h');
        // server_fns.changeMission('antistasi');
        // server_fns.missionHelp();
        server_fns.waitForServerStop('i-06b246d68e5b030c4');
    } catch (err) {
        console.log(err);
    }
}())

//instance functions tests
// (async function() {
//     try {
//     } catch (err) {
//         console.log(err);
//     }
// }())