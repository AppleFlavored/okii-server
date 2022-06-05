// @ts-check

const moniker = require('moniker');
const express = require('express');
const { Server } = require('ws');

class ConnectionManager {
    constructor() {
        this.clients = new Array();
    }

    start() {
        const wss = new Server();
        wss.on('connection', socket => {
            socket.on('message', message => this.handlePacket(socket, message));
            socket.on('close', () => {
                this.removeClient(socket);
                this.updateUserList();
            });
        })
    }

    registerClient(ws) {
        const client = {
            socket: ws,
            nickname: moniker.choose()
        };

        console.log(`${client.nickname} connected.`);
        this.clients.push(client);
        this.updateUserList();
    }

    handlePacket(ws, message) {
        const data = message.split('\n');
        switch (data[0]) {
            case 'CONNECT':
                this.registerClient(ws);
                ws.send('OK\n');
                break;
            case 'SEND':
                // I'm not refactoring this. /shrug
                if (data[1].trim().length === 0)
                    break;

                this.clients.forEach(client => {
                    const response = { author: this.getNickname(ws), content: encodeURI(data[1]) };
                    //console.log(response);
                    client.socket.send(`MESSAGE\n${JSON.stringify(response)}`)
                });

                if (data[1].startsWith('!')) {
                    const args = data[1].content.slice('!'.length).trim().split(/ +/);
	                const command = args.shift().toLowerCase();

                    switch (command) {
                        case 'nickname':
                            this.changeNickname(ws, args.join('-'));
                            break;
                    }
                }
                break;
            default:
                break;
        }
    }

    updateUserList() {
        const data = this.clients.map(c => c.nickname);
        this.clients.forEach(c => c.socket.send(`LIST\n${JSON.stringify(data)}`));
    }

    changeNickname(ws, nickname) {
        let client = this.clients.find(c => c.socket === ws);
        if (client === undefined) return;

        client.nickname = nickname;
        this.updateUserList();
    }

    getNickname(ws) {
        return this.clients.find(c => c.socket === ws).nickname;
    }

    removeClient(ws) {
        let idx;
        const client = this.clients.find((c, i) => {idx = i; return c.socket === ws});
        if (client === undefined) return;

        console.log(`${client.nickname} disconnected.`)
        this.clients.splice(idx, 1);
    }
}

const PORT = process.env.PORT || 3000;
const _ = express().listen(PORT, () => console.log(`Listening on port ${PORT}`));

const connManager = new ConnectionManager();
connManager.start();