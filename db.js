'use strict'

const fs = require('node:fs')
const path = require('node:path')
const Database = require('better-sqlite3')

const dataDir = path.join(__dirname, 'data')
fs.mkdirSync(dataDir, { recursive: true })

const databasePath = process.env.DATABASE_PATH || path.join(dataDir, 'quotes.sqlite')
const db = new Database(databasePath)

db.pragma('journal_mode = WAL')

db.prepare(`
  CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote TEXT NOT NULL,
    author TEXT NOT NULL,
    created_date TEXT NOT NULL DEFAULT (datetime('now'))
  )
`).run()

const insertQuoteStatement = db.prepare(`
  INSERT INTO quotes (quote, author)
  VALUES (@quote, @author)
`)

const getQuoteStatement = db.prepare(`
  SELECT id, quote, author, created_date
  FROM quotes
  WHERE id = ?
`)

const listQuotesStatement = db.prepare(`
  SELECT id, quote, author, created_date
  FROM quotes
  ORDER BY datetime(created_date) DESC, id DESC
  LIMIT ? OFFSET ?
`)

const countQuotesStatement = db.prepare(`
  SELECT COUNT(*) AS total
  FROM quotes
`)

const deleteQuoteStatement = db.prepare(`
  DELETE FROM quotes
  WHERE id = ?
`)

function createQuote(input) {
  const result = insertQuoteStatement.run(input)

  return getQuoteStatement.get(result.lastInsertRowid)
}

function deleteQuote(id) {
  const quote = getQuoteStatement.get(id)

  if (!quote) {
    return null
  }

  deleteQuoteStatement.run(id)

  return quote
}

function listQuotes({ page, limit }) {
  const offset = (page - 1) * limit
  const total = countQuotesStatement.get().total
  const quotes = listQuotesStatement.all(limit, offset)

  return {
    data: quotes,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit)
    }
  }
}

function closeDatabase() {
  db.close()
}

module.exports = {
  closeDatabase,
  createQuote,
  deleteQuote,
  listQuotes
}
