'use strict';
module.exports = {
	realTime
};

/**
 * // sending to sender-client only
socket.emit('message', "this is a test");

// sending to all clients, include sender
io.emit('message', "this is a test");

// sending to all clients except sender
socket.broadcast.emit('message', "this is a test");

// sending to all clients in 'game' room(channel) except sender
socket.broadcast.to('game').emit('message', 'nice game');

// sending to all clients in 'game' room(channel), include sender
io.in('game').emit('message', 'cool game');

// sending to sender client, only if they are in 'game' room(channel)
socket.to('game').emit('message', 'enjoy the game');

// sending to all clients in namespace 'myNamespace', include sender
io.of('myNamespace').emit('message', 'gg');

// sending to individual socketid
socket.broadcast.to(socketid).emit('message', 'for your eyes only');
 */

const socket = require('socket.io');
const logging = require('../libs/logger');
const redisClient = require('./redis');
const parameters = require('./parameters');
const logoot = require('./logoot');
const utils = require('./utils');
const Promise = require('bluebird');

let logconf = {};

Promise.promisifyAll(redisClient);


function realTime(server) {
	const io = socket(server); 
	const main = io.of('/');

	main.on('connection' , (client)=>{
		
		client.on('join', (data)=>{
			let editorName = data.editorName;
			let userName = data.userName;
			let clientId = client.id;

			client.join(editorName);
			let clientObject = {editorName, userName, clientId};
			redisClient
				.setAsync(`socketId:${clientId}`, JSON.stringify(clientObject))
				.then(()=>{
					client.to(editorName).broadcast.emit('userJoin', userName);
					logging.trace(logconf, `${userName} joined editor : ${editorName}`);
				})
				.catch((error)=>{
					logging.error(logconf, error);
				});
		});

		client.on('disconnect', ()=>{
			clientOnDisconnect(client)
				.then((result)=>{
					logging.trace(logconf, 
						`${result.userName} left the editor : ${result.editorName}`);
				})
				.catch((error)=>{
					logging.error(logconf, error);
				});
		});

		client.on('change', (data)=>{
			let editorName = data.editorName;
			logging.trace(logconf, data);
			changeServerCharMap(data)
				.then((result)=>{
					client.to(editorName).broadcast.emit('change', data);
				})
				.catch((error)=>{
					logging.trace(logconf, error);
				});
		});

		client.on('message', (data)=>{
			let editorName = data.editorName;
			let userName = data.userName;
			let message = data.message;

			client.to(editorName).emit('message', data);
			logging.trace(logconf, `
				Editor : ${editorName} 
				New message from ${userName}
				Message : ${message}`);
		});

		client.on('changeVersion', (data)=>{
			let {editorName} = data;
			changeVersion(data)
				.then(()=>{
					io.to(editorName).emit('refresh');
				})
				.catch((error)=>{
					logging.error(logconf, error);
				});
		});
	});
}

async function changeVersion(data) {
	logging.trace(logconf, `Updating version`);
	let {version, editorName} = data;
	let {editorKey, versionKey} = utils.keyNames(editorName);
	let text = await redisClient.lindexAsync(versionKey, -parseInt(version));
	let charMap = logoot.textToCharMap(text);
	logging.trace(logconf, versionKey, -parseInt(version), data, text, charMap );
	let editorObject = {
		editorName : editorName, 
		version : version,  
		charMap : charMap
	};
	await redisClient.setAsync(editorKey, JSON.stringify(editorObject));
	return;
}

async function clientOnDisconnect(client) {
	let clientId = client.id;
	let data = await redisClient.getAsync(`socketId:${clientId}`)
	data = JSON.parse(data);
	let {editorName, userName} = data;
	client.leave(editorName);
	let editorKey = parameters.keyNames.EDITOR + editorName;
	let usersKey = editorKey + parameters.keyNames.USERS;
	
	await redisClient.sremAsync(usersKey, userName);
	client.to(editorName).broadcast.emit('userLeft', userName);	
	await redisClient.delAsync(`socketId:${clientId}`);
	//delete editing docs if all user left
	
	let totalUsers = await redisClient.scardAsync(usersKey);
	if (totalUsers == 0 ) {
		await redisClient.lremAsync('editing:', editorName);
	}

	return {userName, editorName};
}

async function changeServerCharMap(data) {
	let {editorName, type, charObj} = data;
	let editorKey = parameters.keyNames.EDITOR + editorName;
	let editorObj = await redisClient.getAsync(editorKey);
	editorObj = JSON.parse(editorObj);
	let charMap = editorObj.charMap;
	if (type === 'insert') {
		charMap = logoot.insertServerChar(charObj, charMap);
	}
	if (type === 'delete') {
		charMap = logoot.deleteServerChar(charObj, charMap);
	}
	await redisClient.setAsync(editorKey, JSON.stringify(editorObj));
	return;
}