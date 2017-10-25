'use strict';

module.exports = {
	initialize, 
	getUserList, 
	saveVersion
};

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
	if (userName !== undefined) {
		userName = userName.replace(/ /g,"_");
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
	let siteKey = editorKey + parameters.keyNames.SITE;
	let usersKey = editorKey + parameters.keyNames.USERS;
	let versionKey = editorKey + parameters.keyNames.VERSIONS;
	let exists = await redisClient.existsAsync(editorKey);

	if (exists === 0 ) {
		logging.debug(logconf, "Editor does not exists");	
		let editorObject = {
			editorName : editorName, 
			version : 0,  
			charMap : []
		};
		await redisClient.setAsync(editorKey, JSON.stringify(editorObject));
		// the first user is 1 the next user will be 2
		await redisClient.setAsync(siteKey, "2");
		
		// if user came in directly
		if (userName === undefined) {
			userName = `${animals()}`
		}
		// add the user to the list
		await redisClient.saddAsync(usersKey, userName);
		// add the document to currently being edited  list
		await redisClient.lpushAsync('editing:', editorName);

		return {
			editorObject : editorObject, 
			userName : userName,
			siteNumber : 1,
			totalVersions : 0
		};
	}

	logging.debug(logconf, "Editor already exists");
	let editorObject = JSON.parse(await redisClient.getAsync(editorKey));
	let totalVersions = await redisClient.llenAsync(versionKey);

	let userList =  await redisClient.smembersAsync(usersKey);
	
	// editor exists but user came back to edit 
	if (userList.length === 0 ) {
		await redisClient.lpush('editing:', editorName);
	}
	// if user came directly through share url 
	if (userName === undefined) {
		userName = `${animals()}`;
	}

	// fix duplicate problem bug 
	// small chance that the random generated name is duplicated
	await redisClient.saddAsync(usersKey, userName);
	
	// give unique number to each user as per logoot algorithm 
	let siteNumber = await redisClient.getAsync(siteKey)
	await redisClient.incrAsync(siteKey);
	return { 
		editorObject : editorObject, 
		userName : userName, 
		siteNumber : parseInt(siteNumber), 
		totalVersions : parseInt(totalVersions)
	};
}


//runs at regular interval to save versions of 
//currently being edited documents
async function saveVersion() {
	logging.trace(logconf, `Saving version for all open editors`);
	let openEditors = await redisClient.lrangeAsync('editing:', 0, -1); 
	for ( let index in openEditors) {
		let editorName = openEditors[index];
		let {editorKey, versionKey} = utils.keyNames(editorName);
		logging.trace(logconf, `Saving version for ${editorName}`);
		let text = await getDocSnapshot(editorName);
		// dont version if document is empty
		if (text === "") {
			continue;
		}
		// dont version when no changes has been made.
		// let length = await redisClient.llenAsync(versionKey);
		let getLatestVersion = await redisClient.lindexAsync(versionKey, 0);

		if (text === getLatestVersion) {
			continue;					
		}		
		await redisClient.lpushAsync(versionKey, text);		
	}
	logging.trace(logconf, 'Saved version for all documents');
	return;
}

/**
 * User list internal function  
 */
async function getUserListRunner(editorName) {
	let editorKey = parameters.keyNames.EDITOR + editorName;
	let usersKey = editorKey + parameters.keyNames.USERS;
	let userList =  await redisClient.smembersAsync(usersKey);
	console.log(usersKey);
	return userList;	
}

/**
 * Get current text value of the document from its charMap
 */
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

// async function getEditorVersion(editorName) {
// 	let editorKey = parameters.keyNames.EDITOR + editorName;
// 	let versionKey = editorKey + parameters.keyNames.VERISON;

// }