'use strict';

module.exports = {
	initialize
}

const redisClient = require('./redis');
const superheroes = require('superheroes');
const superb = require('superb');
const animals = require('animals');
const utils = require('./utils');
const Promise = require('bluebird');

const logging = require('../libs/logger');
const parameters = require('./parameters');

Promise.promisifyAll(redisClient);

let logconf = {
	loggingEnabled : true
};

//check user name

function initialize(req, res) {
	logging.trace(logconf, "INCOMING REQUEST", req.query, req.params, req.body);

	let editorName = req.params.editorName 
	let userName = req.body.userName || undefined;

	if (editorName === undefined) {
		logging.error(logconf, "Editor name is undefined");
	}
	
	initializeRunner(editorName, userName)
		.then((result)=>{
			logging.trace(logconf, 'RESPONSE SENT', result );
			res.render('main', {data : JSON.stringify(result)});
		})
		.catch((error)=>{
			logging.error(logconf, error);
		});
}

async function initializeRunner(editorName, userName) {
	let editorKey = parameters.keyNames.EDITOR + editorName;
	let usersKey = editorKey + parameters.keyNames.USERS;
	let exists = await redisClient.existsAsync(editorKey);

	if (exists === 0 ) {
		logging.debug(logconf, "Editor does not exists", exists);	
		let editorObject = {
			editorName : editorName, 
			version : 1, 
			content : "", 
			lang : "none"
		};
		await redisClient.setAsync(editorKey, JSON.stringify(editorObject));
		if (userName === undefined) {
			userName = `${animals()}`
		}
		await redisClient.saddAsync(usersKey, userName);

		return {
			editorObject : editorObject, 
			userName : userName,
			users : [userName] 
		};
	}

	logging.debug(logconf, "Editor already exists");
	let editorObject = JSON.parse(await redisClient.getAsync(editorKey));

	let userList =  await redisClient.smembersAsync(usersKey);
	if (userName === undefined) {
		userName = `${animals()}`
	}
	// fix duplicate problem bug 
	// small probability that the random generated name is duplicated
	userList.push(userName);
	await redisClient.saddAsync(usersKey, userName);

	return { 
		editorObject : editorObject, 
		userName : userName, 
		users : userList
	};
}

