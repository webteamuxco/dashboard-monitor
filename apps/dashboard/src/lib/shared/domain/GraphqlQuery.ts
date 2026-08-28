export type GraphQlQuery = {
    query: string,
    variables?: Record<string, unknown> | null
}

// Identity template tag: returns the string unchanged. Its only purpose is to
// mark the literal as a GraphQL document so the language server configured in
// graphql.config.yml highlights and validates it against the Strapi schema.
export const gql = String.raw;