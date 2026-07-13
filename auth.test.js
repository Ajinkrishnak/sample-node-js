'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { createAuth, signJwt, verifyJwt } = require('./auth')

const baseConfig = {
  jwtSecret: 'test-jwt-secret',
  clientId: 'quotes-api-client',
  clientSecret: 'test-client-secret',
  accessTokenTtlSeconds: 60,
  now: () => 1700000000000
}

function createReply() {
  return {
    statusCode: null,
    headers: {},
    body: null,
    code(statusCode) {
      this.statusCode = statusCode
      return this
    },
    header(name, value) {
      this.headers[name] = value
      return this
    },
    send(body) {
      this.body = body
      return body
    }
  }
}

test('issues a short-lived JWT for valid client credentials', () => {
  const auth = createAuth(baseConfig)
  const token = auth.issueAccessToken({
    client_id: 'quotes-api-client',
    client_secret: 'test-client-secret'
  })

  assert.equal(token.token_type, 'Bearer')
  assert.equal(token.expires_in, 60)
  assert.equal(token.scope, 'quotes:read quotes:write')

  const claims = verifyJwt(token.access_token, {
    secret: baseConfig.jwtSecret,
    now: baseConfig.now
  })
  assert.equal(claims.sub, 'quotes-api-client')
  assert.equal(claims.scope, 'quotes:read quotes:write')
  assert.equal(claims.exp - claims.iat, 60)
})

test('does not issue a token for invalid client credentials', () => {
  const auth = createAuth(baseConfig)
  const token = auth.issueAccessToken({
    client_id: 'quotes-api-client',
    client_secret: 'wrong-secret'
  })

  assert.equal(token, null)
})

test('rejects protected requests without a valid bearer JWT', async () => {
  const auth = createAuth(baseConfig)
  const reply = createReply()

  await auth.authenticateRequest({
    method: 'GET',
    url: '/quotes',
    headers: {}
  }, reply)

  assert.equal(reply.statusCode, 401)
  assert.equal(reply.headers['WWW-Authenticate'], 'Bearer error="invalid_token"')
  assert.deepEqual(reply.body, {
    error: 'Unauthorized'
  })
})

test('accepts protected requests with a valid bearer JWT', async () => {
  const auth = createAuth(baseConfig)
  const token = auth.issueAccessToken({
    client_id: 'quotes-api-client',
    client_secret: 'test-client-secret'
  })
  const request = {
    method: 'GET',
    url: '/quotes?page=1',
    headers: {
      authorization: `Bearer ${token.access_token}`
    }
  }
  const reply = createReply()

  await auth.authenticateRequest(request, reply)

  assert.equal(reply.statusCode, null)
  assert.equal(request.auth.sub, 'quotes-api-client')
})

test('rejects expired JWTs', () => {
  const token = signJwt({
    sub: 'quotes-api-client'
  }, {
    secret: 'test-jwt-secret',
    expiresInSeconds: 60,
    now: () => 1700000000000
  })

  const claims = verifyJwt(token, {
    secret: 'test-jwt-secret',
    now: () => 1700000061000
  })

  assert.equal(claims, null)
})
