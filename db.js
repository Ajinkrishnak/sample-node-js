'use strict'

require('dotenv/config')

const fs = require('node:fs')
const path = require('node:path')
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3')
const { PrismaClient } = require('@prisma/client')

const dataDir = path.join(__dirname, 'data')
fs.mkdirSync(dataDir, { recursive: true })

function resolveDatabaseUrl() {
  if (process.env.DATABASE_PATH) {
    return `file:${path.resolve(process.env.DATABASE_PATH)}`
  }

  return process.env.DATABASE_URL || 'file:./data/quotes.sqlite'
}

const adapter = new PrismaBetterSqlite3({
  url: resolveDatabaseUrl()
})
const prisma = new PrismaClient({
  adapter
})

function getCurrentTimestamp() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

function serializeQuote(quote) {
  return {
    id: quote.id,
    quote: quote.quote,
    author: quote.author,
    created_date: quote.createdDate
  }
}

async function createQuote(input) {
  const quote = await prisma.quote.create({
    data: {
      ...input,
      createdDate: getCurrentTimestamp()
    }
  })

  return serializeQuote(quote)
}

async function deleteQuote(id) {
  const quote = await prisma.quote.findUnique({
    where: {
      id
    }
  })

  if (!quote) {
    return null
  }

  await prisma.quote.delete({
    where: {
      id
    }
  })

  return serializeQuote(quote)
}

async function listQuotes({ page, limit }) {
  const offset = (page - 1) * limit
  const [total, quotes] = await prisma.$transaction([
    prisma.quote.count(),
    prisma.quote.findMany({
      orderBy: [
        {
          createdDate: 'desc'
        },
        {
          id: 'desc'
        }
      ],
      skip: offset,
      take: limit
    })
  ])

  return {
    data: quotes.map(serializeQuote),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit)
    }
  }
}

async function closeDatabase() {
  await prisma.$disconnect()
}

module.exports = {
  closeDatabase,
  createQuote,
  deleteQuote,
  listQuotes
}
