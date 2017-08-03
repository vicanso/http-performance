# http-performance

I use `httpstat` to test my rest api's performance and then I want to write a module to get the performance of `http`.

The moudle can get the request and response of `http`, including `dns`, `method`, `url` and so on.

[![Build Status](https://travis-ci.org/vicanso/http-performance.svg?branch=master)](https://travis-ci.org/vicanso/http-performance)
[![Coverage Status](https://img.shields.io/coveralls/vicanso/http-performance/master.svg?style=flat)](https://coveralls.io/r/vicanso/http-performance?branch=master)
[![npm](http://img.shields.io/npm/v/http-performance.svg?style=flat-square)](https://www.npmjs.org/package/http-performance)
[![Github Releases](https://img.shields.io/npm/dm/http-performance.svg?style=flat-square)](https://github.com/vicanso/http-performance)

## API

```js
// please require the module first
const httpPerf = require('http-performance');
const http = require('http');
httpPerf.on('stats', (stats) => {
/*  { type: 'request',
  dns: { ip: '14.215.177.38', addressType: 4 },
  requesting: 0,
  method: 'GET',
  host: 'www.baidu.com',
  url: '/',
  status: 200,
  bytes: 15358,
  timing: { socket: 9, dns: 2, tcp: 6, processing: 13, transfer: 5, all: 35 } }
*/
  console.info(stats);
});
http.get('http://www.baidu.com/');
```


```js
// please require the module first
const httpPerf = require('http-performance');
const http = require('http');
const express = require('express');
httpPerf.on('stats', (stats) => {
  if (stats.type !== 'response') {
    return;
  }
/* { type: 'response',
  method: 'GET',
  timing: { all: 1013, socket: 0 },
  status: 200,
  url: '/',
  bytes: 60,
  responsing: 0 }
*/
  console.info(stats);
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
```

### disable/enable

- type The http type, 'request' or 'response'

Diable or enable the http stats type, default is enabled.

```js
const httpPerf = require('http-performance');
httpPerf.disable('request');
httpPerf.enable('request');
```

## License

MIT
