var spawn = require('child_process').spawn;
var stream = require('stream');
var Promise = require('bluebird');

function Jshell(args) {
    this.commands = [];

    if (Array.isArray(args) && args.length > 0) {
        this.pipe.apply(this, args);
    }
}

Jshell.prototype.pipe = function () {
    var args = Array.prototype.slice.call(arguments);
    if (args[0].writable && !args[0].readable) {
        this.executeCommands().pipe(args[0]);
    } else {
        this.commands.push(args);
        return this;
    }
};

function toWritable(stream) {
    return stream.writable ? stream : stream.stdin;
}

function toReadable(stream) {
    return stream.readable ? stream : stream.stdout;
}

Jshell.prototype.executeCommands = function () {
    var spawnedCommands = this.commands.map(function (command) {
        if (command[0].writable || command[0].readable) {
            return command[0];
        } else {
            return spawn(command[0], command.slice(1));
        }
    });

    spawnedCommands.forEach(function (spawnedCommand, index) {
        if (index > 0) {
            toReadable(spawnedCommands[index - 1]).pipe(toWritable(spawnedCommand));
        }
    });

    return toReadable(spawnedCommands[spawnedCommands.length - 1]);
};

Jshell.prototype.buffer = Promise.promisify(function (callback) {
    var chunks = [];
    this.executeCommands().on('data', function (data) {
        chunks.push(data);
    }).on('error', function (err) {
        callback(err);
    }).on('end', function () {
        callback(null, Buffer.concat(chunks));
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
    this.buffer(function (err, buffer) {
        if (err) {
            callback(err);
        } else {
            callback(null, buffer.toString('utf-8'));
        }
    });
});

Jshell.prototype.log = function () {
    this.pipe(process.stdout);
};

Jshell.prototype.lines = Promise.promisify(function (callback) {
    this.text(function (err, string) {
        if (err) {
            callback(err);
        } else {
            callback(null, string.split('\n').filter(function (line) { return line; }));
        }
    });
});

function jshell() {
    var args = Array.prototype.slice.call(arguments);
    return new Jshell(args);
}

module.exports = jshell;
