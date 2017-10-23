'use strict';
module.exports = {
	realTime
};

const socket = require('socket.io');
const logging = require('../libs/logger');
const redisClient = require('./redis');
const parameters = require('./parameters');
const logoot = require('./logoot');
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
					
				})
		});

		client.on('disconnect', ()=>{
			clientOnDisconnect(client)
				.then((result)=>{
					logging.trace(logconf, 
						`${result.userName} left the editor : ${result.editorName}`);
				})
				.catch((error)=>{
					logging.trace(logconf, error);
				})
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
				})
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
	
	});

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