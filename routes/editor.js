'use strict';

module.exports = {
	initialize, 
	getUserList
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

/**
 * TODOS
 * 1.username should not contain spaces
 * 2.username should be unique to a channel (no duplicates)
 */

function initialize(req, res) {
	logging.trace(logconf, "INCOMING REQUEST", req.query, req.params, req.body);

	let editorName = req.params.editorName;
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

function getUserList(req, res) {
	logging.trace(logconf, "User List", req.query, req.params, req.body);

	let editorName = req.params.editorName;

	if (editorName === undefined) {
		logging.error(logconf, "Editor name is undefined");
	}
	
	getUserListRunner(editorName)
		.then((result)=>{
			logging.trace(logconf, result );
			return	res.send({
				flag: 200, 
				users : result
			});
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
		logging.debug(logconf, "Editor does not exists");	
		let editorObject = {
			editorName : editorName, 
			version : 1,  
			lang : "none", 
			charMap : []
		};
		await redisClient.setAsync(editorKey, JSON.stringify(editorObject));
		if (userName === undefined) {
			userName = `${animals()}`
		}
		await redisClient.saddAsync(usersKey, userName);

		return {
			editorObject : editorObject, 
			userName : userName
		};
	}

	logging.debug(logconf, "Editor already exists");
	let editorObject = JSON.parse(await redisClient.getAsync(editorKey));

	let userList =  await redisClient.smembersAsync(usersKey);
	if (userName === undefined) {
		userName = `${animals()}`
	}
	// fix duplicate problem bug 
	// small chance that the random generated name is duplicated
	await redisClient.saddAsync(usersKey, userName);

	return { 
		editorObject : editorObject, 
		userName : userName
	};
}


async function getUserListRunner(editorName) {
	let editorKey = parameters.keyNames.EDITOR + editorName;
	let usersKey = editorKey + parameters.keyNames.USERS;
	let userList =  await redisClient.smembersAsync(usersKey);
	console.log(usersKey);
	return userList;	
}

async function getDocSnapshot(editorName) {
	let editorKey = parameters.keyNames.EDITOR + editorName;
	let editorObject = await redisClient.getAsync(editorKey);
	editorObject =  JSON.parse(editorObject);
	let charMap = editorObject.charMap;
	let textArr = charMap.map((obj)=>{
	    return obj.value;
	});
	return textArr.join('');
}