'use strict';

const util = require('util');
/* eslint import/no-extraneous-dependencies:0 import/no-unresolved:0 */
const httpOutgoing = require('_http_outgoing');
const EventEmitter = require('events');

const OutgoingMessage = httpOutgoing.OutgoingMessage;
const statsData = {
  requesting: 0,
  responsing: 0,
};
const emitter = new EventEmitter();

/**
 * Get the body bytes
 */
function getBytes(res) {
  if (res.client && res.client) {
    return res.client.bytesRead;
  }
  return -1;
}

/**
 * http request stats
 */
function requestStats() {
  const timePoints = {};
  const result = {
    type: 'request',
  };
  statsData.requesting += 1;
  this.once('close', () => {
    statsData.requesting -= 1;
    timePoints.close = Date.now();
    const timing = {};
    // dns use time
    if (timePoints.lookup) {
      timing.dns = timePoints.lookup - timePoints.start;
    }
    // tcp connect time
    if (timePoints.connect) {
      timing.tcp = timePoints.connect - (timePoints.lookup || timePoints.start);
      // tls connect time
      if (timePoints.secureConnect) {
        timing.tls = timePoints.secureConnect - timePoints.connect;
      }
      // wait for server process
      timing.processing = timePoints.data - (timePoints.secureConnect || timePoints.connect);
      // transfer data timg
      timing.transfer = timePoints.close - timePoints.data;
    }
    Object.assign(result, {
      requesting: statsData.requesting,
      method: this.method,
      url: this.path,
      status: (this.res && this.res.statusCode) || -1,
      bytes: getBytes(this.res),
      timing,
    });
    emitter.emit('stats', result, this);
  });
  this.once('socket', (socket) => {
    timePoints.start = Date.now();
    const events = 'connect data secureConnect'.split(' ');
    events.forEach((event) => {
      socket.once(event, () => {
        timePoints[event] = Date.now();
      });
    });
    socket.once('lookup', (err, ip, addressType, host) => {
      timePoints.lookup = Date.now();
      if (!err) {
        result.dns = {
          ip,
          addressType,
          host,
        };
      }
    });
  });
}


/**
 * http response stats
 */
function responseStats() {
  // add responsing
  statsData.responsing += 1;
  this.once('socket', (socket) => {
    const startedAt = Date.now();
    socket.once('close', () => {
      statsData.responsing -= 1;
      const result = {
        type: 'response',
        method: this.req.method,
        use: Date.now() - startedAt,
        status: this.statusCode,
        url: this.req.originalUrl,
        bytes: getBytes(this.req),
        responsing: statsData.responsing,
      };
      emitter.emit('stats', result, this);
    });
  });
}

function WrapOutgoingMessage() {
  OutgoingMessage.call(this);
  if (this.constructor.name === 'ServerResponse') {
    responseStats.apply(this);
    return;
  }
  requestStats.apply(this);
}
util.inherits(WrapOutgoingMessage, OutgoingMessage);


httpOutgoing.OutgoingMessage = WrapOutgoingMessage;

module.exports = emitter;
