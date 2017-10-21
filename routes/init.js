const logger = require('../libs/logger');
const redisClient = require('./redis');
const fs = require('fs-extra');

let logconf = {};

// inititalize rooms
function room(req, res) {
    logger.trace(logconf, req.body, req.params, req.query);
    let roomName = req.params.id;
    // let userName = req.body.userName;

    async function runner() {
        let roomData =  await doesKeyExists(roomName);
        if (roomData !==  null ) {
            roomData.userNames.push(userName);
            let response = {
                content : roomData.content,
                userNames :roomData.userNames , 
                syntax : roomData.syntax
            };
            // await updateRedis(roomName, response);
            return response;
        }
        try {
            let fileData = await fs.readFile(path, 'utf8');            
            let metadata = JSON.parse(fileData);
            let content = metadata.content;
            let syntax = metadta.syntax;
            let userNames = [];
            
            let response = {
                content, 
                syntax, 
                userNames
            };
            await updateRedis(roomName, response);
            return response;

        } catch (error) {
            let response = {
                content : '', 
                userNames : [], 
                syntax : 'text'
            };
            await updateRedis(roomName, response);            
            return response;
        }
    }

    runner()
        .then((response)=>{
            return res.render('editor', response );
        })
        .catch((error)=>{
            logging.error(logconf, error);
        })

}

// iniitalize username
function userName(req, res) {
    logger.trace(logconf, req.body, req.params, req.query);
    let roomName = req.params.id;
    let userName = req.body.userName;
    
    async function runner() {
        let roomData =  await doesKeyExists(roomName);
        roomData.userNames.push(userName);
        let result = await updateRedisKey(roomName, roomData);
        return result ;
    }

    runner()
        .then((response)=>{
            return response;
        })
        .catch((error)=>{
            logging.error(logconf, error);
        })



}

function getRedis(uniqueKey) {
    return new Promise((resolve, reject) => {
        redisClient.getAsync(uniqueKey).then((value)=>{
            resolve(value);
        }).catch((err)=>{
            reject(err);
        });
    });
}

function updateRedis(key, value) {
    return new Promise((resolve, reject) => {
        redisClient.setAsync(key, value).then((value)=>{
            resolve(value);
        }).catch((err)=>{
            reject(err);
        });
    });
}