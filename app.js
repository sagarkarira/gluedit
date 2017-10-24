'use strict';

if (process.env.NODE_ENV !== 'development' &&
    process.env.NODE_ENV !== 'production') {

    console.log(
    `Please specify one of the following environments to run your server
            - development
            - production
            
    Example : NODE_ENV=development pm2 start app.js`
    );
    throw 'abc';
    return '';

}


process.env.NODE_CONFIG_DIR = __dirname + '/config/';

/** Node Modules **/
const config = require('config');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const morgan = require('morgan');
const http = require('http');
const https = require('https');
const colors = require('colors');
const logger = require('./libs/logger');
let logconf = {};
// const mysql = require('./routes/dbHandler');

/** Routes **/
const editor = require('./routes/editor');

/** Socket **/
const socket = require('./routes/socket');


const app = express();

app.set('port', process.env.PORT || config.get('port'));
app.use(express.static('public'));
app.use(morgan('dev'));
app.use(bodyParser.json({limit: '100mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.set('views','./src/views');
app.set('view engine','ejs');	

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});


/**--------------------------------------------------------
 *  API to check if server is running or not
 *---------------------------------------------------------
 */

app.get('/ping', function (req, res) {
    res.send(200, {}, { pong: true });
});

app.get('/', (req, res)=>{
    res.render('home.ejs');
});

// app.post('/username', init.userName);

app.get('/editor/:editorName', editor.initialize);

app.post('/editor/:editorName',  editor.initialize);
app.get('/users/:editorName', editor.getUserList);


var httpsServer = http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});    

socket.realTime(httpsServer);

// get sharejs dependencies

var sharejs = require('share');
require('redis');

// options for sharejs 
var options = {
  db: {type: 'redis'}, 
  browserChannel : {cors :"*"},
};

// attach the express server to sharejs
// sharejs.server.attach(app, options);

// sharejs.client.open('wyt4p', 'text', 'http://localhost:8000/channel',  (error, doc)=>{
//     if (error) {
//         console.log(error);
//     }
//     doc.on('change', function(op) {
//         console.log(op);
//     })
// })

// seconds after document should saved
const INTERVAL = 60 ;
setInterval(function() {
    editor.saveVersion().then(()=>{
        console.log('Saved');
    }).catch((error)=>{
        console.log(error);
    });
}, 1000 * INTERVAL)




