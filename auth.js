'use strict'

const crypto = require('node:crypto')

const TOKEN_ENV_VAR = 'API_BEARER_TOKEN'

function extractBearerToken(header) {
  if (typeof header !== 'string') {
    return null
  }

  const [scheme, token, ...extraParts] = header.trim().split(/\s+/)

  if (scheme.toLowerCase() !== 'bearer' || !token || extraParts.length > 0) {
    return null
  }

  return token
}

function tokensMatch(providedToken, expectedToken) {
  const provided = Buffer.from(providedToken)
  const expected = Buffer.from(expectedToken)

  if (provided.length !== expected.length) {
    return false
  }

  return crypto.timingSafeEqual(provided, expected)
}

function createBearerAuth({ token = process.env[TOKEN_ENV_VAR] } = {}) {
  if (!token) {
    throw new Error(`${TOKEN_ENV_VAR} is required`)
  }

  return async (request, reply) => {
    const providedToken = extractBearerToken(request.headers.authorization)

    if (!providedToken || !tokensMatch(providedToken, token)) {
      return reply
        .code(401)
        .header('WWW-Authenticate', 'Bearer')
        .send({
          error: 'Unauthorized'
        })
    }
  }
}

module.exports = {
  createBearerAuth
}
