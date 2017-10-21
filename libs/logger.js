'use strict';
const stack = require('callsite');
const moment = require('moment');
const os = require('os');
const colors = require('colors');
const debugLog = require('debug')('logger');
var PrettyError = require('pretty-error');
var pe = new PrettyError();

exports.trace = trace;
exports.debug = debug;
exports.info = info;
exports.warn = warn;
exports.error = error;
exports.logDatabaseQuery= logDatabaseQuery;

var levels = {
    trace: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4
};

colors.setTheme({
    trace: 'bgGreen',
    debug: 'bgBlue',
    info: 'bgGreen',
    warn: 'bgYellow',
    error: 'bgRed',
    red: 'red',
    blue: 'blue',
    green: 'green'
});

const defaultConfig = {
    loggingEnabled: true,
    defaultLoggingLevel: 'trace',

    utcDelay: 330,

    showLevel: true,
    showCPUInfo: false,

    timestampPattern: 'hh:mm:ss MM-DD-YY',
    showTimestamp: true,

    displayStack: true,
    stackDepth: 3,

    showFileName: true,
    showFunctionName: true,
    showLineNumber: true,

    showLoggingInterval: true
};

let lastLogTime = new Date();

/**
*   Main function to display logs in console
*   loggingLevel        {Number}    displays the logging level
*   loggingParameters   {Object}    1st argument is config object 
*                                   from locally called function. 
*                                   Rest all needs to be printed
**/
function log(loggingLevel, loggingParameters) {
    let stackObj = stack();

    let execConfig = defaultConfig;
    let localConfig = loggingParameters['0'];
    delete loggingParameters['0']; //delete the first argument i.e localConfig.

    Object.keys(execConfig).map(key => {
        if (localConfig[key] === undefined) {
            localConfig[key] = execConfig[key];
        }
    });

    printLoggingParameters(
        localConfig,
        loggingLevel,
        loggingParameters,
        stackObj
    );
    // printOptionalParameters(execConfig, stackObj);
}

function printOptionalParameters(execConfig, stackObj) {
    let output = '';
    output += showStackTrace(execConfig, stackObj);
    output += showCPUInfo(execConfig);
    console.log(output);
}

/** Need to made it more understandable 
    @todo 
    1. remove too many ifelse
    2. improvise if else condition 
    3. Add error stack functionality in case of error
*/
function printLoggingParameters(
    execConfig,
    loggingLevel,
    loggingParameters,
    stackObj
) {
    Object.keys(loggingParameters).forEach(index => {
        let output = '';

        let defaultLoggingLevel = levels[execConfig.defaultLoggingLevel];
        // console.log('DLL: ' + defaultLoggingLevel , 'CLL: ' +loggingLevel );

        // always print error ,  return when logging is disabled ,
        if (
            (loggingLevel < defaultLoggingLevel ||
                execConfig.loggingEnabled === false) &&
            loggingLevel !== levels.error
        ) {
            return;
        }

        output += showLevel(execConfig, loggingLevel, stackObj);
        output += showTimeStamp(execConfig);
        output += showFileName(execConfig, stackObj);
        output += showFunctionName(execConfig, stackObj);
        output += showLineNumber(execConfig, stackObj);

        if (loggingParameters[index] instanceof Error) {
            // output += colors.red(loggingParameters[index].message);
            var renderedError = pe.render(loggingParameters[index]);
            output += renderedError;
            // console.log(loggingParameters[index]); //show error stack error trace
            // output += showStackTrace(execConfig, error);
        } else if (typeof loggingParameters[index] === 'object') {
            //not the right check for object.
            output += JSON.stringify(loggingParameters[index]);
        } else {
            output += loggingParameters[index];
        }
        output += showLoggingInterval(execConfig) + '\n \n \n';
        if (loggingLevel === levels.error) {
            process.stderr.write(output);
        } else {
            process.stdout.write(output);
        }
    });
}

function logDatabaseQuery(handlerInfo, eventFired, err, result, query) {
    if (err) {
        if (typeof query !== 'undefined')
            error(
                handlerInfo,
                { event: eventFired },
                { error: err },
                { result: result },
                { query: query }
            );
        else
            error(
                handlerInfo,
                { event: eventFired },
                { error: err },
                { result: result }
            );
    } else {
        if (typeof query !== 'undefined')
            trace(
                handlerInfo,
                { event: eventFired },
                { error: err },
                { result: result },
                { query: query }
            );
        else
            trace(
                handlerInfo,
                { event: eventFired },
                { error: err },
                { result: result }
            );
    }
}

function showLevel(execConfig, loggingLevel, stackObj) {
    if (!execConfig.showLevel) {
        return '';
    }
    let level = stackObj[1].getFunctionName();
    return colors[level].white(level) + ' ';
}

function showTimeStamp(execConfig) {
    if (!execConfig.showTimestamp) {
        return '';
    }

    return (
        colors.blue(
            moment()
                .utc()
                .add(330, 'minutes')
                .format(execConfig.timestampPattern)
        ) + ' '
    );
}

function showFileName(execConfig, stackObj) {
    if (!execConfig.showFileName) {
        return '';
    }
    let fileName = stackObj[2].getFileName().replace(__dirname + '/', '');
    return colors.green(fileName + ':');
}

function showFunctionName(execConfig, stackObj) {
    if (!execConfig.showFunctionName) {
        return '';
    }
    let functionName = stackObj[2].getFunctionName() || 'anonymous';
    return colors.green(functionName + '');
}

function showLineNumber(execConfig, stackObj) {
    if (!execConfig.showFileName) {
        return '';
    }
    let lineNumber = stackObj[2].getLineNumber();
    return colors.italic(' at line: ' + lineNumber + '  ==>  ');
}

function showLoggingInterval(execConfig) {
    if (!execConfig.showLoggingInterval) {
        return '';
    }
    let output = colors.magenta(
        ' +' + moment().diff(moment(lastLogTime), 'milliseconds') + 'ms'
    );
    lastLogTime = new Date();
    return output;
}

function showStackTrace(execConfig, stackObj) {
    if (!execConfig.displayStack) {
        return '';
    }
    let stackDepth = execConfig.stackDepth;
    let output = '\n ******** Stack Trace ******* \n';
    for (let i in stackObj) {
        if (i > execConfig.stackDepth) {
            break;
        }
        let tabs = '        ';
        let serialNumber = parseInt(i) + 1;
        let functionName =
            'Function: ' +
            (stackObj[i].getFunctionName() || 'anonymous') +
            tabs;
        let fileName = 'Path: ' + stackObj[i].getFileName() + tabs;
        let lineNumber = 'Line: ' + stackObj[i].getLineNumber() + tabs;
        output +=
            +serialNumber + '. ' + functionName + fileName + lineNumber + '\n';
    }
    return output;
}

function showCPUInfo(execConfig) {
    if (!execConfig.showCPUInfo) {
        return '';
    }
    let output = `\n ******** OS Info ******* \n`;
    output += `Hostname :  ${os.hostname()}  \n`;
    output += `Type :   ${os.type()} \n`;
    output += `Platform :  ${os.platform()} \n`;
    output += `Architecture : ${os.arch()} \n`;
    output += `Release : ${os.release()} \n`;
    output += `Uptime :  ${os.uptime()} \n`;
    output += `Load Avg : ${os.loadavg()} \n`;
    output += `Total Time :  ${os.totalmem()} \n`;
    output += `Freememory : ${os.freemem()} \n`;
    output += `CPUS : ${os.cpus()} \n`;
    output += `Network Interfaces : ${os.networkInterfaces()} \n`;
    return output;
}

function trace(/* arguments */) {
    log(levels.trace, arguments);
}

function debug(/* arguments */) {
    log(levels.debug, arguments);
}

function info(/* arguments */) {
    log(levels.info, arguments);
}

function warn(/* arguments */) {
    log(levels.warn, arguments);
}

function error(/* arguments */) {
    log(levels.error, arguments);
}
