/*global describe, it*/
var expect = require('unexpected');
var jshell = require('../lib/index');

describe('jshell', function () {
    it('should be a function', function () {
        expect(jshell, 'to be a function');
    });
    it('should return an object with a lines method', function () {
        expect(jshell('echo', 'foo').lines, 'to be a function');
        // expect(jshell('echo', 'foo'), 'to satisfy', {
        //     lines: expect.it('to be a function')
        // });
    });
    it('should return an object with a pipe method', function () {
        expect(jshell('echo', 'foo').pipe, 'to be a function');
        // expect(jshell('echo', 'foo'), 'to satisfy', {
        //     pipe: expect.it('to be a function')
        // });
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
    });
});
