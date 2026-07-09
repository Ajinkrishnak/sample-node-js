'use strict'

require('dotenv/config')

const fastify = require('fastify')({
  logger: true
})
const { createBearerAuth } = require('./auth')
const { createQuoteSchema, listQuotesQuerySchema, quoteParamsSchema } = require('./schemas')
const { validateRequest } = require('./validation')
const { closeDatabase, createQuote, deleteQuote, listQuotes } = require('./db')

fastify.addHook('onRequest', createBearerAuth())
fastify.decorateRequest('validated', null)

fastify.get('/', async () => {
  return {
    service: 'Inspirational Quotes API',
    routes: {
      health: 'GET /health',
      list_quotes: 'GET /quotes?page=1&limit=10',
      create_quote: 'POST /quotes',
      delete_quote: 'DELETE /quotes/:id'
    }
  }
})

fastify.get('/health', async () => {
  return {
    status: 'ok',
    uptime: process.uptime()
  }
})

fastify.get('/quotes', {
  preHandler: validateRequest({
    query: listQuotesQuerySchema
  })
}, async (request) => {
  return await listQuotes(request.validated.query)
})

fastify.post('/quotes', {
  preHandler: validateRequest({
    body: createQuoteSchema
  })
}, async (request, reply) => {
  const quote = await createQuote(request.validated.body)

  return reply.code(201).send({
    data: quote
  })
})

fastify.delete('/quotes/:id', {
  preHandler: validateRequest({
    params: quoteParamsSchema
  })
}, async (request, reply) => {
  const quote = await deleteQuote(request.validated.params.id)

  if (!quote) {
    return reply.code(404).send({
      error: 'Quote not found'
    })
  }

  return {
    data: quote
  }
})

fastify.addHook('onClose', async () => {
  await closeDatabase()
})

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000
    const host = process.env.HOST || '127.0.0.1'

    await fastify.listen({ port, host })
  } catch (error) {
    fastify.log.error(error)
    process.exit(1)
  }
}

start()
