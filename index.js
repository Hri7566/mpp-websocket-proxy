require('dotenv').config();

const WebSocket = require('ws');
const Client = require('mppclone-client');
// const Client = require('mpp-client');

const fs = require('fs');

let wss = new WebSocket.Server({ port: 8080 });
let cl = new Client('wss://mppclone.com:8443', process.env.MPPCLONE_TOKEN);
// let cl = new Client('wss://mpp.hri7566.info:8443');

let owners = [
    "ead940199c7d9717e5149919",
    "e1e7e489ec8d635d980c65cd"
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
                    case 'ch':
                        if (msg._id == "NMPB test/fishing") {
                            msg._id = "test/fishing";
                        }
                        if (msg._id == "NMPB lobby") {
                            msg._id = "lobby";
                        }
                    case 'a':
                        if (msg.m == 'a') {
                            if (msg.message.includes('is now marked as AFK')) {
                                msg.message = msg.message.replace('and he is now', 'and they are now');
                            }
                            if (msg.message.includes('if he comes back')) {
                                msg.message = msg.message.replace('if he comes back', 'if they come back');
                            }
                            if (msg.message.includes('Welcome')) return;
                            // console.log(msg);
                        }
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
                    return;
                case 'hi':
                    delete msg.token;
                    break;
                case 'bye':
                    // cl.ws.close();
                    // ws.close();
                    return;
                case 'p':
                    if (msg.m == 'p') {
                        let u = msg;
                        if (msg.u) u = msg.u;
                        if (typeof msg['tag'] !== 'undefined') {
                            if (u.tag.text == 'BOT') return;
                        }
                    }
                case 'ch':
                    if (msg.m == 'ch') {
                        if (msg.ppl) {
                            msg.ppl = msg.ppl.filter((p) => {
                                if (p['tag']) {
                                    if (p.tag['text']) {
                                        if (p.tag.text == 'BOT') return false;
                                    }
                                }
                                return true;
                            });
                        }
                        // console.log(msg.ppl);
                    }
                case 'a':
                    if (msg.m == 'a') {
                        if (lock) {
                            if (!owners.includes(msg.p._id)) return;
                        }
                        if (banned_ids.includes(msg.p._id)) {
                            break;
                        }
                        if (msg.a.startsWith('/about')) {
                            cl.sendArray([{
                                m: 'a',
                                message: 'This is a modification of NMPB by Hri7566.'
                            }]);
                            return;
                        }
                    }
                default:
                    // console.log(msg);
                    // let msgs2 = [msg];
                    // ws.send(JSON.stringify(msgs2));
                    // break;
            }

            let msgs2 = [msg];
            ws.send(JSON.stringify(msgs2));
        }
    });

    let name = "๖ۣۜH͜r̬i͡7566's NMPB"
    
    cl.on('hi', msg => {
        cl.sendArray([{
            m: 'userset',
            set: {
                name: name
            }
        }]);
    });

    setInterval(() => {
        if (!name.endsWith(' [/help]'))
        name += ' [/help]';
        if (cl.getOwnParticipant().name !== name) {
            cl.sendArray([{
                m: 'userset',
                set: { name }
            }])
        }
    }, 10 * 1000);

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
            if (msg.a.startsWith('!unban')) {
                let i = banned_ids.indexOf(msg.a.substring(msg.a.split(' ')[0].length).trim())
                if (i !== -1) {
                    banned_ids.splice(i, 1);
                    fs.writeFileSync('./banned_ids.json', JSON.stringify(banned_ids, undefined, 4));
                    cl.sendArray([{m: 'a', message: 'Unbanned ID ' + msg.a.substring(msg.a.split(' ')[0].length).trim()}]);
                }
            }
            if (msg.a.startsWith('!crown')) {
                cl.sendArray([{
                    m: 'chown',
                    id: msg.p.id
                }]);
            }
            if (msg.a.startsWith('!solo')) {
                cl.sendArray([{
                    m: 'chset',
                    set: {
                        crownsolo: !cl.channel.settings.crownsolo
                    }
                }]);
            }
            if (msg.a.startsWith('!private') || msg.a.startsWith('!visible') || msg.a.startsWith('!hide')) {
                cl.sendArray([{
                    m: 'chset',
                    set: {
                        visible: !cl.channel.settings.visible
                    }
                }]);
            }
			if (msg.a.startsWith('!color') || msg.a.startsWith('!setcolor')) {
				let args = msg.a.split(' ');
				let argcat = msg.a.substring(args[0].length).trim();
				cl.sendArray([{
					m: 'userset',
					set: {
						color: argcat
					}
				}]);
			}
        }
    });
});

wss.on('error', err => {
    console.error(err);
})
