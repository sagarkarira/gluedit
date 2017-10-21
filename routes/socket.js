'use strict';
module.exports = {
	realTime
};

const socket = require('socket.io');
const logging = require('../libs/logger');
const redisClient = require('./redis');
const parameters = require('./parameters');
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
						`${result.userName} left the editor : 
						 ${result.editorName}`);
				})
				.catch((error)=>{
					logging.trace(logconf, error);
				})
		});

		client.on('change', (data)=>{
			
		});

		client.on('message', (data)=>{
			let editorName = data.editorName;
			let userName = data.userName;
			let message = data.message;

			client.to(editorName).emit('message', data);
			logging.trace(logconf, `Editor : ${editorName} 
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