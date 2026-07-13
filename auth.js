'use strict'

const crypto = require('node:crypto')
const jwt = require('jsonwebtoken')

const JWT_SECRET_ENV_VAR = 'AUTH_JWT_SECRET'
const CLIENT_ID_ENV_VAR = 'AUTH_CLIENT_ID'
const CLIENT_SECRET_ENV_VAR = 'AUTH_CLIENT_SECRET'
const ACCESS_TOKEN_TTL_ENV_VAR = 'AUTH_ACCESS_TOKEN_TTL_SECONDS'

const DEFAULT_ISSUER = 'quotes-api'
const DEFAULT_AUDIENCE = 'quotes-api'
const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 15 * 60
const PUBLIC_ROUTES = new Set([
  'GET /',
  'GET /health',
  'POST /auth/token'
])

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

function valuesMatch(providedValue, expectedValue) {
  const provided = Buffer.from(String(providedValue))
  const expected = Buffer.from(String(expectedValue))

  if (provided.length !== expected.length) {
    return false
  }

  return crypto.timingSafeEqual(provided, expected)
}

function signJwt(payload, {
  secret,
  expiresInSeconds,
  issuer = DEFAULT_ISSUER,
  audience = DEFAULT_AUDIENCE,
  now = () => Date.now()
}) {
  const issuedAt = Math.floor(now() / 1000)

  return jwt.sign({
    ...payload,
    iat: issuedAt
  }, secret, {
    algorithm: 'HS256',
    audience,
    expiresIn: expiresInSeconds,
    issuer,
    jwtid: crypto.randomUUID()
  })
}

function verifyJwt(token, {
  secret,
  issuer = DEFAULT_ISSUER,
  audience = DEFAULT_AUDIENCE,
  now = () => Date.now()
}) {
  if (typeof token !== 'string') {
    return null
  }

  try {
    const claims = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      audience,
      clockTimestamp: Math.floor(now() / 1000),
      issuer
    })

    return typeof claims === 'object' ? claims : null
  } catch {
    return null
  }
}

function resolvePositiveInteger(value, fallback) {
  const number = Number(value)

  if (!Number.isInteger(number) || number < 1) {
    return fallback
  }

  return number
}

function isPublicRoute(request) {
  const path = new URL(request.url, 'http://localhost').pathname

  return PUBLIC_ROUTES.has(`${request.method} ${path}`)
}

function createAuth({
  jwtSecret = process.env[JWT_SECRET_ENV_VAR],
  clientId = process.env[CLIENT_ID_ENV_VAR],
  clientSecret = process.env[CLIENT_SECRET_ENV_VAR],
  accessTokenTtlSeconds = resolvePositiveInteger(
    process.env[ACCESS_TOKEN_TTL_ENV_VAR],
    DEFAULT_ACCESS_TOKEN_TTL_SECONDS
  ),
  issuer = DEFAULT_ISSUER,
  audience = DEFAULT_AUDIENCE,
  now = () => Date.now()
} = {}) {
  if (!jwtSecret) {
    throw new Error(`${JWT_SECRET_ENV_VAR} is required`)
  }

  if (!clientId) {
    throw new Error(`${CLIENT_ID_ENV_VAR} is required`)
  }

  if (!clientSecret) {
    throw new Error(`${CLIENT_SECRET_ENV_VAR} is required`)
  }

  function issueAccessToken({ client_id: providedClientId, client_secret: providedClientSecret, scope }) {
    if (!valuesMatch(providedClientId, clientId) || !valuesMatch(providedClientSecret, clientSecret)) {
      return null
    }

    const accessToken = signJwt({
      sub: clientId,
      scope: scope || 'quotes:read quotes:write'
    }, {
      secret: jwtSecret,
      expiresInSeconds: accessTokenTtlSeconds,
      issuer,
      audience,
      now
    })

    return {
      token_type: 'Bearer',
      access_token: accessToken,
      expires_in: accessTokenTtlSeconds,
      scope: scope || 'quotes:read quotes:write'
    }
  }

  async function authenticateRequest(request, reply) {
    if (isPublicRoute(request)) {
      return
    }

    const providedToken = extractBearerToken(request.headers.authorization)
    const claims = providedToken
      ? verifyJwt(providedToken, {
        secret: jwtSecret,
        issuer,
        audience,
        now
      })
      : null

    if (!claims) {
      return reply
        .code(401)
        .header('WWW-Authenticate', 'Bearer error="invalid_token"')
        .send({
          error: 'Unauthorized'
        })
    }

    request.auth = claims
  }

  return {
    authenticateRequest,
    issueAccessToken
  }
}

module.exports = {
  createAuth,
  signJwt,
  verifyJwt
}
