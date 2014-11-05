/*global describe, it*/
var expect = require('unexpected');
var jshell = require('../lib/index');
var stream = require('stream');
var util = require('util');

function WritableMemoryStream(options) {
    if (!(this instanceof WritableMemoryStream)) {
        return new WritableMemoryStream(options);
    }
    stream.Writable.call(this, options);
    this.buffer = new Buffer('');
}
util.inherits(WritableMemoryStream, stream.Writable);

WritableMemoryStream.prototype._write = function (chunk, enc, cb) {
    var buffer = (Buffer.isBuffer(chunk)) ?
        chunk : new Buffer(chunk, enc);

    this.buffer = Buffer.concat([this.buffer, buffer]);
    cb();
};

describe('jshell', function () {
    it('should be a function', function () {
        expect(jshell, 'to be a function');
    });
    it('should return an object with a lines method', function () {
        expect(jshell('echo', 'foo'), 'to satisfy', {
            lines: expect.it('to be a function')
        });
    });
    it('should return an object with a pipe method', function () {
        expect(jshell('echo', 'foo'), 'to satisfy', {
            pipe: expect.it('to be a function')
        });
    });
    describe('toBuffer', function () {
        it('should pass the output buffer of the jshell command to the callback', function (done) {
            jshell('echo', 'foo').toBuffer(function (err, data) {
                expect(err, 'to be null');
                expect(data, 'to equal', new Buffer('foo\n'));
                done();
            });
        });
    });
    describe('toString', function () {
        describe('given no arguments', function () {
            it('should return a string representing the command pipeline', function () {
                expect(jshell('echo', 'foo').pipe('grep', 'foo').toString(), 'to equal', 'echo foo | grep foo');
            });
        });

        describe('given a callback', function () {
            it('should pass the output string of the jshell command to the callback', function (done) {
                jshell('echo', 'foo').toString(function (err, data) {
                    expect(err, 'to be null');
                    expect(data, 'to equal', 'foo\n');
                    done();
                });
            });
        });
    });
    describe('lines', function () {
        it('should pass the output lines of the jshell command to the callback', function (done) {
            jshell('echo', 'foo').lines(function (err, data) {
                expect(err, 'to be null');
                expect(data, 'to equal', ['foo']);
                done();
            });
        });
    });
    describe('pipe', function () {
        it('should pipe output to grep', function (done) {
            jshell('echo', 'foo').pipe('grep', 'foo').lines(function (err, data) {
                expect(err, 'to be null');
                expect(data, 'to equal', ['foo']);
                done();
            });
        });
        it('should pipe output to grep with args', function (done) {
            jshell('echo', 'foo').pipe('grep', '-v', 'foo').lines(function (err, data) {
                expect(err, 'to be null');
                expect(data, 'to equal', []);
                done();
            });
        });
        it('should pipe output to a writable stream', function (done) {
            var writableStream = new WritableMemoryStream();
            jshell('echo', 'foo').pipe('grep', 'foo').pipe(writableStream);
            writableStream.on('finish', function () {
                expect(writableStream.buffer.toString(), 'to equal', 'foo\n');
                done();
            });
        });
    });
    describe('quoting of arguments', function () {
        it('quotes arguments that contains spaces', function () {
            expect(
                jshell('ssh', 'foo.example.com', jshell('cat', '/data/logs/foo.log').pipe('grep', 'lorem ipsum').toString()).toString(),
                'to equal',
                'ssh foo.example.com "cat /data/logs/foo.log | grep \\"lorem ipsum\\""'
            );
        });
        it('supports multiple levels of quoting', function () {
            expect(
                jshell('ssh', 'foo.example.com', jshell('ssh', 'bar.example.com', jshell('cat', '/data/logs/foo.log').pipe('grep', 'lorem ipsum').toString()).toString()).toString(),
                'to equal',
                'ssh foo.example.com "ssh bar.example.com \\"cat /data/logs/foo.log | grep \\\\"lorem ipsum\\\\"\\""'
            );
        });
    });
    describe.skip('backticks', function () {
        it('should be able to consume a pipe of commands as arguments', function (done) {
            // echo `echo bar`
            jshell().pipe('echo', jshell('echo', 'bar')).lines(function (err, data) {
                expect(data, 'to equal', ['bar']);
                done();
            });
        });
    });
    describe.skip('and', function () {
        it('should execute commands in sequence with the && operator', function (done) {
            jshell('echo', 'foo').and('echo', 'bar').lines(function (err, data) {
                expect(data, 'to equal', ['foo', 'bar']);
                done();
            });
        });
    });
});
