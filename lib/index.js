/*global setImmediate*/
var spawn = require('child_process').spawn;
var Promise = require('bluebird');
var passError = require('passerror');
var async = require('async');
var Duplex = require('stream').Duplex;
var util = require('util');

function Jshell(args) {
    Duplex.call(this);
    this.status = 'notSpawned';
    this.commands = [];
    this.spawned = false;

    if (Array.isArray(args) && args.length > 0) {
        this.pipe.apply(this, args);
    }

    var that = this;
    this.once('finish', function () {
        that.withInputAndOutput(function (input, output) {
            input.push(null);
        });
    });
}
util.inherits(Jshell, Duplex);

Jshell.prototype._write = function (chunk, enc, callback) {
    this.withInputAndOutput(function (input, output) {
        input.write(chunk, enc, callback);
    });
};

Jshell.prototype._read = function (size) {
    var that = this;
    this.withInputAndOutput(function (input, output) {
        function pushEnd() {
            that.push(null);
        }

        function pushData(data) {
            if (!that.push(data)) {
                output.removeListener('data', pushData);
                output.removeListener('end', pushEnd);
            }
        }

        output.on('data', pushData);
        output.on('end', pushEnd);
    });
};

Jshell.prototype.pipe = function () {
    var args = Array.prototype.slice.call(arguments);
    if (args[0].writable) {
        this.withInputAndOutput(function (input, output) {
            output.pipe.apply(output, args);
        });
        return args[0];
    } else {
        this.commands.push(args);
        return this;
    }
};

Jshell.prototype.withInputAndOutput = function (callback) {
    function forwardInputAndOutputStream(callback) {
        return function () {
            var spawnedCommands = that.spawnedCommands;
            callback(spawnedCommands[0].stdin,
                     spawnedCommands[spawnedCommands.length - 1].stdout);
        };
    }

    var that = this;
    if (that.status === 'spawned') {
        setImmediate(forwardInputAndOutputStream(callback));
    } else if (that.status === 'spawning') {
        that.once('spawned', forwardInputAndOutputStream(callback));
    } else {
        that.status = 'spawning';
        that.once('spawned', forwardInputAndOutputStream(callback));
        async.map(that.commands, function (command, cb) {
            async.map(command, function (commandPart, cb) {
                if (commandPart instanceof Jshell) {
                    commandPart.text(cb);
                } else {
                    cb(null, commandPart);
                }
            }, cb);
        }, function (err, commands) {
            that.spawnedCommands = commands.map(function (command) {
                return spawn(command[0], command.slice(1));
            });

            that.spawnedCommands.forEach(function (spawnedCommand, index) {
                if (index > 0) {
                    that.spawnedCommands[index - 1].stdout.pipe(spawnedCommand.stdin);
                }
            });

            that.status = 'spawned';
            that.emit('spawned');
        });
    }
};

Jshell.prototype.buffer = Promise.promisify(function (callback) {
    var chunks = [];
    this.withInputAndOutput(function (input, output) {
        output.on('data', function (data) {
            chunks.push(data);
        }).on('error', function (err) {
            callback(err);
        }).on('end', function () {
            callback(null, Buffer.concat(chunks));
        });
    });
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
