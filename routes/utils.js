'use strict';
const parameters = require('./parameters');

function keyNames(editorName) {
	let editorKey = parameters.keyNames.EDITOR + editorName;
	let siteKey = editorKey + parameters.keyNames.SITE;
	let usersKey = editorKey + parameters.keyNames.USERS;
	let versionKey = editorKey + parameters.keyNames.VERSIONS;
	return {
		editorKey, 
		siteKey,
		usersKey, 
		versionKey
	};
}