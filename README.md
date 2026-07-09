# Inspirational Quotes API

A simple backend for storing and listing inspirational quotes.

Built with:

- Node.js
- Fastify
- Zod validation
- SQLite using Prisma

## Requirements

- Node.js 24 or newer
- npm

## Setup

```sh
npm install
npm run prisma:generate
npm run prisma:push
```

## Run

Development mode with file watching:

```sh
npm run dev
```

Production-style start:

```sh
npm start
```

The API runs at:

```text
http://127.0.0.1:3000
```

You can change the host or port with environment variables:

```sh
HOST=127.0.0.1 PORT=4000 npm start
```

## Database

The app uses Prisma with a local SQLite database:

```text
data/quotes.sqlite
```

The default connection string is:

```text
DATABASE_URL="file:./data/quotes.sqlite"
```

You can copy `.env.example` to `.env` and change `DATABASE_URL` if needed. The Prisma schema is defined in:

```text
prisma/schema.prisma
```

Sync the database schema with:

```sh
npm run prisma:push
```

The `quotes` model maps to this SQLite table:

```sql
CREATE TABLE quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote TEXT NOT NULL,
  author TEXT NOT NULL,
  created_date TEXT NOT NULL
);
```

The generated SQLite files are ignored by Git.

## API Routes

### Health Check

```http
GET /health
```

Example:

```sh
curl http://127.0.0.1:3000/health
```

Response:

```json
{
  "status": "ok",
  "uptime": 12.34
}
```

### Create Quote

```http
POST /quotes
```

Request body:

```json
{
  "quote": "Stay hungry, stay foolish.",
  "author": "Steve Jobs"
}
```

Validation rules:

- `quote`: required string, 1 to 1000 characters
- `author`: required string, 1 to 120 characters

Example:

```sh
curl -X POST http://127.0.0.1:3000/quotes \
  -H "Content-Type: application/json" \
  -d '{"quote":"Stay hungry, stay foolish.","author":"Steve Jobs"}'
```

Success response:

```json
{
  "data": {
    "id": 1,
    "quote": "Stay hungry, stay foolish.",
    "author": "Steve Jobs",
    "created_date": "2026-07-08 09:13:20"
  }
}
```

### List Quotes

```http
GET /quotes?page=1&limit=10
```

Query parameters:

- `page`: optional page number, minimum `1`, default `1`
- `limit`: optional items per page, minimum `1`, maximum `100`, default `10`

Example:

```sh
curl "http://127.0.0.1:3000/quotes?page=1&limit=10"
```

Response:

```json
{
  "data": [
    {
      "id": 1,
      "quote": "Stay hungry, stay foolish.",
      "author": "Steve Jobs",
      "created_date": "2026-07-08 09:13:20"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "total_pages": 1
  }
}
```

### Delete Quote

```http
DELETE /quotes/:id
```

Path parameters:

- `id`: required quote id, minimum `1`

Example:

```sh
curl -X DELETE http://127.0.0.1:3000/quotes/1
```

Success response:

```json
{
  "data": {
    "id": 1,
    "quote": "Stay hungry, stay foolish.",
    "author": "Steve Jobs",
    "created_date": "2026-07-08 09:13:20"
  }
}
```

Missing quotes return `404`:

```json
{
  "error": "Quote not found"
}
```

## Validation Errors

Requests are validated with [Zod](https://zod.dev/).

Invalid requests return `400`:

```json
{
  "error": "Validation failed",
  "details": [
    {
      "path": "quote",
      "message": "Too small: expected string to have >=1 characters",
      "code": "too_small"
    }
  ]
}
```
