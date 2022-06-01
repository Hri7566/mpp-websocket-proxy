require('dotenv').config();

const WebSocket = require('ws');
const Client = require('mppclone-client');

const fs = require('fs');

let wss = new WebSocket.Server({ port: 8080 });
let cl = new Client('wss://mppclone.com:8443', process.env.MPPCLONE_TOKEN);

let owners = [
    "ead940199c7d9717e5149919"
];

let banned_ids = require('./banned_ids.json');

let lock = false;

wss.on('connection', (ws, req) => {
    console.log('Client connected');
    cl.start();
    ws.on('message', data => {
        try {
            let msgs = JSON.parse(data.toString());
            for (let msg of msgs) {
                switch (msg.m) {
                    case 'hi':
                        break;
                    default:
                        // console.log(msg);
                        cl.sendArray(msgs);
                        break;
                }
            }
        } catch (err) {
            console.error(`Failed to parse message: `, err);
        }
    });

    cl.ws.on('message', data => {
        let msgs = JSON.parse(data.toString());
        for (let msg of msgs) {
            switch (msg.m) {
                case 'b':
                    break;
                case 'hi':
                    delete msg.token;
                case 'a':
                    if (msg.m == 'a') {
                        if (lock) {
                            if (!owners.includes(msg.p._id)) break;
                        }
                        if (banned_ids.includes(msg.p._id)) {
                            break;
                        }
                    }
                default:
                    // console.log(msg);
                    let msgs2 = [msg];
                    ws.send(JSON.stringify(msgs2));
                    break;
            }
        }
    });
    
    cl.on('hi', msg => {
        cl.sendArray([{
            m: 'userset',
            set: {
                name: "Hri7566's NMPB"
            }
        }])
    });

    cl.on('a', msg => {
        if (lock) {
            if (!(owners.includes(msg.p._id) || msg.p._id == cl.getOwnParticipant()._id)) return;
        }

        if (owners.includes(msg.p._id) || msg.p._id == cl.getOwnParticipant()._id) {
            if (msg.a == '!lock') {
                lock = !lock;
                cl.sendArray([{m: 'a', message: 'Lock toggled to: ' + lock}]);
            }
            if (msg.a.startsWith('!ban')) {
                banned_ids.push(msg.a.substring(msg.a.split(' ')[0].length).trim());
                fs.writeFileSync('./banned_ids.json', JSON.stringify(banned_ids, undefined, 4));
                cl.sendArray([{m: 'a', message: 'Banned ID ' + msg.a.substring(msg.a.split(' ')[0].length).trim()}]);
            }
        }
    })
});

wss.on('error', err => {
    console.error(err);
})
