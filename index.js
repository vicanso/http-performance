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
const disableStats = {
  request: false,
  response: false,
};
const emitter = new EventEmitter();

function disable(type) {
  disableStats[type] = true;
}

function enable(type) {
  disableStats[type] = false;
}

/**
 * Get the body bytes
 */
function getBytes(res) {
  if (res && res.client && res.client) {
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
    category: 'request',
  };
  statsData.requesting += 1;
  let done = false;
  const complete = () => {
    if (done) {
      return;
    }
    done = true;
    statsData.requesting -= 1;
    timePoints.close = Date.now();
    const timing = {
      socket: timePoints.socket - timePoints.start,
    };
    // dns use time
    if (timePoints.lookup) {
      timing.dns = timePoints.lookup - timePoints.socket;
    }
    // tcp connect time
    if (timePoints.connect) {
      timing.tcp = timePoints.connect - (timePoints.lookup || timePoints.socket);
      // tls connect time
      if (timePoints.secureConnect) {
        timing.tls = timePoints.secureConnect - timePoints.connect;
      }
      // wait for server process
      if (timePoints.data) {
        timing.processing = timePoints.data - (timePoints.secureConnect || timePoints.connect);
      }
    } else if (timePoints.data) {
      // reuse the socket
      timing.processing = timePoints.data - timePoints.socket;
    }
    // transfer data timg
    if (timePoints.data) {
      timing.transfer = timePoints.close - timePoints.data;
    }
    timing.all = timePoints.close - timePoints.start;
    const status = (this.res && this.res.statusCode) || 0;
    Object.assign(result, {
      requesting: statsData.requesting,
      method: this.method,
      /* eslint no-underscore-dangle:0 */
      host: this._headers && this._headers.host,
      url: this.path,
      /* eslint no-bitwise:0 */
      type: status / 100 | 0,
      status,
      bytes: getBytes(this.res),
      timing,
    });
    emitter.emit('stats', result, this);
  };
  timePoints.start = Date.now();
  this.once('socket', (socket) => {
    timePoints.socket = Date.now();
    // tcp(connect) tls(secureConnect)
    const events = 'connect data secureConnect'.split(' ');
    events.forEach((event) => {
      socket.once(event, () => {
        timePoints[event] = Date.now();
      });
    });
    socket.once('lookup', (err, ip, addressType) => {
      timePoints.lookup = Date.now();
      if (!err) {
        result.dns = {
          ip,
          addressType,
        };
      }
    });
    // if the socket will reuse(keepalive), the free event will be emit
    const endEvents = 'end free'.split(' ');
    endEvents.forEach(event => socket.once(event, complete));
  });
  this.once('close', complete);
}


/**
 * http response stats
 */
function responseStats() {
  // add responsing
  statsData.responsing += 1;
  const startedAt = Date.now();
  this.once('socket', (socket) => {
    const socketUse = Date.now() - startedAt;
    socket.once('close', () => {
      statsData.responsing -= 1;
      const status = this.statusCode || 0;
      const result = {
        category: 'response',
        method: this.req.method,
        timing: {
          all: Date.now() - startedAt,
          socket: socketUse,
        },
        /* eslint no-bitwise:0 */
        type: status / 100 | 0,
        status: this.statusCode,
        url: this.req && this.req.originalUrl,
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
    if (!disableStats.response) {
      responseStats.apply(this);
    }
    return;
  }
  if (!disableStats.request) {
    requestStats.apply(this);
  }
}
util.inherits(WrapOutgoingMessage, OutgoingMessage);


httpOutgoing.OutgoingMessage = WrapOutgoingMessage;

emitter.disable = disable;
emitter.enable = enable;

module.exports = emitter;
