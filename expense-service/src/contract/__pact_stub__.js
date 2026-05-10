/**
 * Minimal stub for @pact-foundation/pact used in unit/coverage runs.
 * Mirrors the booking-service stub exactly.
 */

'use strict';

const Matchers = {
  like: (value) => value,
  term: ({ generate }) => generate,
  eachLike: (value) => [value],
  somethingLike: (value) => value,
  integer: (value) => value,
  decimal: (value) => value,
  string: (value) => value,
  boolean: (value) => value,
};

function asynchronousBodyHandler(handlerFn) {
  return async (message) => handlerFn(message);
}

class MessageConsumerPact {
  constructor(_opts) {
    this._content = null;
  }
  given(_state) { return this; }
  expectsToReceive(_desc) { return this; }
  withContent(content) { this._content = content; return this; }
  withMetadata(_meta) { return this; }
  verify(handler) {
    if (!this._content) return Promise.resolve();
    return handler(this._content);
  }
}

module.exports = {
  Matchers,
  asynchronousBodyHandler,
  MessageConsumerPact,
};
