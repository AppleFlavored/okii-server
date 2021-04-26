const moniker = require('moniker');
const express = require('express');
const { Server } = require('ws'); 

// HTTP server
const PORT = process.env.PORT || 3000;
const server = express()
    .use((req, res) => res.send('bruh'))
    .listen(PORT, console.log(`Listening on port ${PORT}`));

// WebSocket server
const wss = new Server({ server });

const chatManager = {
    clients: new Array(),

    start: function() {
        wss.on('connection', socket => {
            socket.on('message', message => {
                this.handlePacket(socket, message);
            });

            socket.on('close', () => {
                this.removeClient(socket);
                this.updateUserList();
            });
        });
    },

    // TODO: Custom nicknames?
    registerClient: function(ws) {
        const client = { socket: ws, nickname: moniker.choose() };

        this.clients.push(client);
        this.updateUserList();

        console.log(`${client.nickname} connected.`);
    },

    removeClient: function(ws) {
        this.clients.forEach((v, i) => {
            if (v.socket === ws) {
                console.log(`${v.nickname} disconnected.`)
                this.clients.splice(i, 1);
            }
        })
    },

    handlePacket: async function(ws, message) {
        const split = message.split('\n');

        console.log(split);

        switch (split[0]) {
            case 'CONNECT':
                this.registerClient(ws);
                ws.send(`OK\n`);
                break;
            case 'SEND':
                if (split[1].trim() === '')
                    break;

                this.clients.forEach(client => {
                    const response = { author: this.getNickname(ws), content: escape(split[1]) };
                    //console.log(response);
                    client.socket.send(`MESSAGE\n${JSON.stringify(response)}`)
                });
                break;
            default:
                break;
        }
    },

    getNickname: function(ws)  {
        for(i = 0; i < this.clients.length; i++){
			if(this.clients[i].socket === ws){
				return this.clients[i].nickname;
			}
		}
    },

    updateUserList: function() {
        var userList = new Array();
		for(i = 0; i < this.clients.length; i++){
			userList.push(this.clients[i].nickname);
		}
        this.clients.forEach(client => {
            client.socket.send(`LIST\n${JSON.stringify(userList)}`);
        });
    },
};

chatManager.start();