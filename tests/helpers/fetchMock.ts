import { vi } from "vitest";

type FetchMock = ReturnType<typeof vi.fn>;

/** Stubs `fetch` with a 200 `{ data }` envelope, the BFF success shape. */
export function mockOk(data: unknown): FetchMock {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ data }),
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Stubs `fetch` with a failure carrying the BFF `{ error }` shape. */
export function mockError(status: number, error?: string): FetchMock {
  const fetchMock = vi.fn(async () => ({
    ok: false,
    status,
    json: async () => (error ? { error } : {}),
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Stubs `fetch` with a failure whose body is not JSON at all. */
export function mockUnparseableError(status: number): FetchMock {
  const fetchMock = vi.fn(async () => ({
    ok: false,
    status,
    json: async () => {
      throw new Error("not json");
    },
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** The URL the last `fetch` call was made against. */
export function calledUrl(fetchMock: FetchMock): string {
  return fetchMock.mock.calls.at(-1)?.[0] as string;
}

/** The query params of the last `fetch` call, as a plain object. */
export function calledParams(fetchMock: FetchMock): Record<string, string> {
  const url = calledUrl(fetchMock);
  const query = url.slice(url.indexOf("?") + 1);
  return Object.fromEntries(new URLSearchParams(query));
}

/** The `RequestInit` of the last `fetch` call. */
export function calledInit(fetchMock: FetchMock): RequestInit {
  return fetchMock.mock.calls.at(-1)?.[1] as RequestInit;
}
