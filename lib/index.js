var spawn = require('child_process').spawn;
var stream = require('stream');
var Promise = require('bluebird');
var passError = require('passerror');
var async = require('async');

function Jshell(args) {
    this.commands = [];

    if (Array.isArray(args) && args.length > 0) {
        this.pipe.apply(this, args);
    }
}

Jshell.prototype.pipe = function () {
    var args = Array.prototype.slice.call(arguments);
    if (args[0].writable) {
        this.executeCommands(function (err, output) {
            output.pipe.apply(output, args);
        });
        return args[0];
    } else {
        this.commands.push(args);
        return this;
    }
};

Jshell.prototype.executeCommands = function (callback) {
    async.map(this.commands, function (command, cb) {
        async.map(command, function (commandPart, cb) {
            if (commandPart instanceof Jshell) {
                commandPart.text(cb);
            } else {
                cb(null, commandPart);
            }
        }, cb);
    }, function (err, commands) {
        var spawnedCommands = commands.map(function (command) {
            return spawn(command[0], command.slice(1));
        });

        spawnedCommands.forEach(function (spawnedCommand, index) {
            if (index > 0) {
                spawnedCommands[index - 1].stdout.pipe(spawnedCommand.stdin);
            }
        });

        callback(null, spawnedCommands[spawnedCommands.length - 1].stdout);
    });
};

Jshell.prototype.buffer = Promise.promisify(function (callback) {
    var chunks = [];
    this.executeCommands(passError(callback, function (output) {
        output.on('data', function (data) {
            chunks.push(data);
        }).on('error', function (err) {
            callback(err);
        }).on('end', function () {
            callback(null, Buffer.concat(chunks));
        });
    }));
});

Jshell.prototype.toString = function (callback) {
    return this.commands.map(function (command) {
        return [command[0]].concat(command.slice(1).map(function (arg) {
            if (arg.indexOf(' ') === -1) {
                return arg;
            } else {
                return '"' + arg.replace(/"/g, '\\"') + '"';
            }
        })).join(' ');
    }).join(' | ');
};

Jshell.prototype.text = Promise.promisify(function (callback) {
    this.buffer(passError(callback, function (buffer) {
        callback(null, buffer.toString('utf-8'));
    }));
});

Jshell.prototype.log = function () {
    this.pipe(process.stdout);
};

Jshell.prototype.lines = Promise.promisify(function (callback) {
    this.text(passError(callback, function (string) {
        callback(null, string.split('\n').filter(function (line) { return line; }));
    }));
});

function jshell() {
    var args = Array.prototype.slice.call(arguments);
    return new Jshell(args);
}

module.exports = jshell;
