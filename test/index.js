'use strict';
const assert = require('assert');
const httpPerf = require('..');

const http = require('http');
const express = require('express');

describe('http-performance', () => {
  it('should get request performance', (done) => {
    httpPerf.once('stats', (stats) => {
      assert.equal(stats.type, 'request');
      assert(stats.dns.ip)
      assert.equal(stats.dns.addressType, '4');
      assert.equal(stats.dns.host, 'www.baidu.com');
      assert.equal(stats.url, '/');
      assert.equal(stats.requesting, 0);
      assert.equal(stats.method, 'GET');
      assert.equal(stats.status, 200);
      assert(stats.bytes);
      assert(stats.timing);
      done();
    });
    http.get('http://www.baidu.com/');
  });

  it('should get response performance', (done) => {
    httpPerf.on('stats', (stats) => {
      if (stats.type !== 'response') {
        return;
      }
      assert.equal(stats.method, 'GET');
      assert.equal(stats.status, 200);
      assert.equal(stats.responsing, 0);
      server.close();
      done();
    });
    const app = express();
    app.use((req, res, next) => setTimeout(next, 1000));
    app.use((req, res) => {
      res.json({
        message: 'hello world',
      });
    });

    const server = app.listen();
    const url = `http://127.0.0.1:${server.address().port}`;
    http.get(url);
  });
});
