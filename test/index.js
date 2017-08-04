'use strict';
const assert = require('assert');
const httpPerf = require('..');

const http = require('http');
const express = require('express');
const Agent = require('agentkeepalive');

httpPerf.enable('response');

describe('http-performance', () => {
  it('should get request performance', function (done) {
    this.timeout(10 * 1000);
    httpPerf.once('stats', (stats) => {
      assert.equal(stats.category, 'request');
      assert(stats.dns.ip);
      assert.equal(stats.dns.addressType, '4');
      assert.equal(stats.url, '/');
      assert.equal(stats.host, 'www.baidu.com');
      assert.equal(stats.method, 'GET');
      assert.equal(stats.status, 200);
      assert.equal(stats.type, 2);
      assert(stats.bytes);
      assert(stats.timing);
      done();
    });
    http.get('http://www.baidu.com/');
  });

  it('shold get request with keepalive agent', function (done) {
    this.timeout(10 * 1000);
    const keepaliveAgent = new Agent({
      maxSockets: 100,
      maxFreeSockets: 10,
      timeout: 60000,
      freeSocketKeepAliveTimeout: 30000, // free socket keepalive for 30 seconds
    });
    function doRequest() {
      return new Promise((resolve, reject) => {
        const options = {
          host: 'wwww.baidu.com',
          port: 80,
          path: '/',
          method: 'GET',
          agent: keepaliveAgent,
        };
        const req = http.request(options, (res) => {
          res.setEncoding('utf8');
          let str = '';
          res.on('data', (chunk) => {
            str += chunk;
          });
          res.on('end', () => {
            resolve(str, res);
          });
        });
        req.on('error', reject);
        req.end();
      });
    }
    let count = 0;
    const check = (stats) => {
      count += 1;
      if (count === 1) {
        assert(stats.dns);
        assert(stats.timing.tcp);
      } else {
        assert(!stats.dns);
        assert(!stats.timing.tcp);
      }
      if (count === 2) {
        httpPerf.removeListener('stats', check);
        done();
      }
    };
    httpPerf.on('stats', check);
    doRequest().then(() => doRequest()).catch(done);
  });

  it('should get response performance', function (done) {
    this.timeout(5000);
    const app = express();
    app.use((req, res, next) => setTimeout(next, 1000));
    app.use((req, res) => {
      res.json({
        message: 'hello world',
      });
    });

    const server = app.listen();

    httpPerf.on('stats', (stats) => {
      if (stats.category !== 'response') {
        return;
      }
      assert.equal(stats.method, 'GET');
      assert.equal(stats.status, 200);
      assert.equal(stats.type, 2);
      server.close();
      done();
    });

    const url = `http://127.0.0.1:${server.address().port}`;
    http.get(url);
  });

  it('should get request performance', function (done) {
    this.timeout(5000);
    httpPerf.disable('request');
    let count = 0;
    httpPerf.once('stats', () => {
      if (count === 1) {
        done();
      }
    });
    http.get('http://www.baidu.com/', () => {
      count += 1;
      httpPerf.enable('request');
      http.get('http://www.baidu.com/');
    });
  });
});
