import { RestApiClient, ApiError } from '../ApiClient';

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response;
}

describe('RestApiClient', () => {
  it('GETs with auth header and parses JSON', async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse(200, { value: [1] }));
    const client = new RestApiClient('http://srv/Col', 'tok', fetchFn, () => Promise.resolve());
    const result = await client.get<{ value: number[] }>('/_apis/projects?api-version=6.0');
    expect(result).toEqual({ value: [1] });
    expect(fetchFn).toHaveBeenCalledWith('http://srv/Col/_apis/projects?api-version=6.0', {
      headers: { Authorization: 'Bearer tok', Accept: 'application/json' },
    });
  });

  it('POSTs a JSON body with content-type', async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const client = new RestApiClient('http://srv', 'tok', fetchFn, () => Promise.resolve());
    const result = await client.post<{ ok: boolean }>('/_apis/wit/wiql?api-version=6.0', { query: 'SELECT' });
    expect(result).toEqual({ ok: true });
    expect(fetchFn).toHaveBeenCalledWith('http://srv/_apis/wit/wiql?api-version=6.0', {
      method: 'POST',
      headers: { Authorization: 'Bearer tok', Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'SELECT' }),
    });
  });

  it('retries on 429 then succeeds', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(429, {}))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const client = new RestApiClient('http://srv', 'tok', fetchFn, () => Promise.resolve());
    expect(await client.get('/x')).toEqual({ ok: true });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('throws ApiError with status on 403 without retrying', async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse(403, {}));
    const client = new RestApiClient('http://srv', 'tok', fetchFn, () => Promise.resolve());
    await expect(client.get('/x')).rejects.toThrow(ApiError);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
