'use strict'

const { z } = require('zod')

const createQuoteSchema = z.object({
  quote: z.string().trim().min(1).max(1000),
  author: z.string().trim().min(1).max(120)
})

const tokenRequestSchema = z.object({
  grant_type: z.literal('client_credentials').default('client_credentials'),
  client_id: z.string().trim().min(1),
  client_secret: z.string().min(1),
  scope: z.string().trim().min(1).optional()
})

const listQuotesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10)
})

const quoteParamsSchema = z.object({
  id: z.coerce.number().int().min(1)
})

module.exports = {
  createQuoteSchema,
  listQuotesQuerySchema,
  quoteParamsSchema,
  tokenRequestSchema
}
