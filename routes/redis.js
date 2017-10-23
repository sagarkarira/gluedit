'use strict';
const redis = require('redis');
const config = require('config');
const Promise = require('bluebird');

let redisClient = redis.createClient(config.get('redisConfig'));

redisClient.on('connect', function(){
	redisClient.flushall();
    console.log('Connected to redis. Listening on port : ' + config.get('redisConfig').port);
});

redisClient.on('error', function (err) {
    console.log('Error' + err);
});


module.exports = redisClient;