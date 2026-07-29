export type GraphQlQuery = {
    query: string,
    variables?: Record<string, unknown> | null
}