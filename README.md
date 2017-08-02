# http-performance

I use `httpstat` to test my rest api's performance

## API

```js
// please require the module first
const httpPerf = require('http-performance');
const http = require('http');
httpPerf.on('stats', (stats) => {
  //   { type: 'request',
  // dns: { ip: '14.215.177.37', addressType: 4, host: 'www.baidu.com' },
  // requesting: 1,
  // method: 'GET',
  // url: '/',
  // status: 200,
  // bytes: 15358,
  // timing: { dns: 13, tcp: 10, processing: 31, transfer: 2 } }
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
// { type: 'response',
//   method: 'GET',
//   use: 1019,
//   status: 200,
//   url: '/',
//   bytes: 60,
//   responsing:
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

## License

MIT
