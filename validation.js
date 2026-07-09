'use strict'

function formatIssues(error) {
  return error.issues.map((issue) => ({
    path: issue.path.length ? issue.path.join('.') : 'root',
    message: issue.message,
    code: issue.code
  }))
}

function validateRequest(schemas) {
  return async (request, reply) => {
    const sources = {
      body: request.body,
      query: request.query,
      params: request.params
    }

    const validated = {}

    for (const [source, schema] of Object.entries(schemas)) {
      const result = schema.safeParse(sources[source])

      if (!result.success) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: formatIssues(result.error)
        })
      }

      validated[source] = result.data
    }

    request.validated = validated
  }
}

module.exports = {
  validateRequest
}
