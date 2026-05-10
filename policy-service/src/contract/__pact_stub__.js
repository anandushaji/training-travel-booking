/**
 * Minimal stub for @pact-foundation/pact used in unit/coverage runs.
 * The real pact library requires many optional native dependencies that may
 * not be installed in a dev environment. This stub provides just enough API
 * surface so the MessageConsumerPact contract tests can execute their handler
 * logic without writing actual pact files.
 *
 * When CONTRACT_TESTS=true the real pact library is used (see moduleNameMapper).
 */

'use strict';

// ── Matchers ──────────────────────────────────────────────────────────────────
// In the stub, matchers are identity-passthrough so test handlers receive
// the actual sample values defined in the spec.
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

// ── asynchronousBodyHandler ───────────────────────────────────────────────────
function asynchronousBodyHandler(handlerFn) {
  return async (message) => handlerFn(message);
}

// ── MessageConsumerPact ───────────────────────────────────────────────────────
class MessageConsumerPact {
  constructor(_opts) {
    this._content = null;
  }
  given(_state) { return this; }
  expectsToReceive(_desc) { return this; }
  withContent(content) { this._content = content; return this; }
  withMetadata(_meta) { return this; }
  /**
   * Calls the provided handler with the stored content so the assertions
   * inside the handler run as normal Jest expectations.
   */
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
