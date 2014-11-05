var spawn = require('child_process').spawn;
var stream = require('stream');

function Jshell(args) {
    this.commands = [];

    if (Array.isArray(args)) {
        this.pipe.apply(this, args);
    }
}

Jshell.prototype.pipe = function () {
    var args = Array.prototype.slice.call(arguments);
    if (args[0] instanceof stream.Writable) {
        return this.executeCommands().pipe(args[0]);
    } else {
        this.commands.push(args);
        return this;
    }
};

Jshell.prototype.executeCommands = function () {
    var spawnedCommands = this.commands.map(function (command) {
        return spawn(command[0], command.slice(1));
    });

    spawnedCommands.forEach(function (spawnedCommand, index) {
        if (index > 0) {
            spawnedCommands[index - 1].stdout.pipe(spawnedCommand.stdin);
        }
    });

    return spawnedCommands[spawnedCommands.length - 1].stdout;
};

Jshell.prototype.toBuffer = function (callback) {
    var chunks = [];
    this.executeCommands().on('data', function (data) {
        chunks.push(data);
    }).on('error', function (err) {
        callback(err);
    }).on('end', function () {
        callback(null, Buffer.concat(chunks));
    });
};

Jshell.prototype.toString = function (callback) {
    if (callback) {
        this.toBuffer(function (err, buffer) {
            if (err) {
                callback(err);
            } else {
                callback(null, buffer.toString('utf-8'));
            }
        });
    } else {
        return this.commands.map(function (command) {
            return [command[0]].concat(command.slice(1).map(function (arg) {
                if (arg.indexOf(' ') === -1) {
                    return arg;
                } else {
                    return '"' + arg.replace(/"/g, '\\"') + '"';
                }
            })).join(' ');
        }).join(' | ');
    }
};

Jshell.prototype.lines = function (callback) {
    this.toString(function (err, string) {
        if (err) {
            callback(err);
        } else {
            callback(null, string.split('\n').filter(function (line) { return line; }));
        }
    });
};

function jshell() {
    var args = Array.prototype.slice.call(arguments);
    return new Jshell(args);
}

module.exports = jshell;
