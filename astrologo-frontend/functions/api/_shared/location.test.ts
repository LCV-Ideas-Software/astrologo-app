import { describe, expect, it, vi } from 'vitest';
import { resolveBirthPlace } from './location';

const results = [
  {
    id: 3451190,
    name: 'Rio de Janeiro',
    latitude: -22.90642,
    longitude: -43.18223,
    elevation: 12,
    timezone: 'America/Sao_Paulo',
    country_code: 'BR',
    country: 'Brasil',
    admin1: 'Rio de Janeiro',
  },
  {
    id: 123,
    name: 'Rio de Janeiro',
    latitude: -20,
    longitude: -40,
    timezone: 'America/Sao_Paulo',
    country_code: 'BR',
    country: 'Brasil',
    admin1: 'Outro estado',
  },
] as const;

describe('resolução server-authoritative do local de nascimento', () => {
  it('não escolhe silenciosamente o primeiro resultado quando há homônimos', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ results }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      );
    const resolution = await resolveBirthPlace('Rio de Janeiro', undefined, fetchMock);

    expect(resolution.status).toBe('selection-required');
    if (resolution.status !== 'selection-required') throw new Error('deveria exigir seleção');
    expect(resolution.candidates.map(({ providerResultId }) => providerResultId)).toEqual([3451190, 123]);
  });

  it('reconsulta o provedor e aceita somente o ID selecionado presente na resposta', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify(results[0]), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      );
    const resolution = await resolveBirthPlace('Rio de Janeiro', 3451190, fetchMock);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    const requestedUrl = fetchMock.mock.calls[0]?.[0];
    expect(requestedUrl).toBeInstanceOf(URL);
    expect((requestedUrl as URL).pathname).toBe('/v1/get');
    expect((requestedUrl as URL).searchParams.get('id')).toBe('3451190');

    expect(resolution).toEqual({
      status: 'resolved',
      place: {
        provider: 'open-meteo',
        providerResultId: 3451190,
        displayLabel: 'Rio de Janeiro, Brasil',
        latitudeDeg: -22.90642,
        longitudeDeg: -43.18223,
        elevationMeters: 12,
        timeZoneIana: 'America/Sao_Paulo',
        countryCode: 'BR',
      },
    });
  });

  it('não aceita coordenadas ou timezone enviados pelo navegador', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ results }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      );
    const resolution = await resolveBirthPlace('Rio de Janeiro', 999, fetchMock);
    expect(resolution.status).toBe('not-found');
  });

  it('falha fechado quando o provedor não responde', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error('offline'));
    await expect(resolveBirthPlace('Rio de Janeiro', 3451190, fetchMock)).resolves.toEqual({
      status: 'provider-unavailable',
    });
  });
});
