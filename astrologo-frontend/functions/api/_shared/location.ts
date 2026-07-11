import { fetchWithTimeout } from './externalFetch';

export interface ResolvedBirthPlace {
  readonly provider: 'open-meteo';
  readonly providerResultId: number;
  readonly displayLabel: string;
  readonly latitudeDeg: number;
  readonly longitudeDeg: number;
  readonly elevationMeters: number | null;
  readonly timeZoneIana: string;
  readonly countryCode: string;
}

export type BirthPlaceCandidate = ResolvedBirthPlace;

export type BirthPlaceResolution =
  | { readonly status: 'resolved'; readonly place: ResolvedBirthPlace }
  | { readonly status: 'selection-required'; readonly candidates: readonly BirthPlaceCandidate[] }
  | { readonly status: 'not-found' }
  | { readonly status: 'provider-unavailable' };

interface OpenMeteoGeocodingResult {
  readonly id?: number;
  readonly name?: string;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly elevation?: number;
  readonly timezone?: string;
  readonly country_code?: string;
  readonly country?: string;
  readonly admin1?: string;
  readonly admin2?: string;
}

const nonEmpty = (value: string | undefined): value is string => Boolean(value?.trim());

const toCandidate = (result: OpenMeteoGeocodingResult): BirthPlaceCandidate | null => {
  const { id, latitude, longitude, name, timezone, country_code: countryCode } = result;
  if (
    typeof id !== 'number' ||
    !Number.isInteger(id) ||
    typeof latitude !== 'number' ||
    !Number.isFinite(latitude) ||
    typeof longitude !== 'number' ||
    !Number.isFinite(longitude) ||
    !nonEmpty(name) ||
    !nonEmpty(timezone) ||
    !nonEmpty(countryCode)
  ) {
    return null;
  }
  const labelParts = [name, result.admin2, result.admin1, result.country].filter(nonEmpty);
  return {
    provider: 'open-meteo',
    providerResultId: id,
    displayLabel: [...new Set(labelParts)].join(', '),
    latitudeDeg: latitude,
    longitudeDeg: longitude,
    elevationMeters: Number.isFinite(result.elevation) ? (result.elevation ?? null) : null,
    timeZoneIana: timezone,
    countryCode,
  };
};

export async function resolveBirthPlace(
  searchLabel: string,
  selectedProviderResultId?: number,
  fetchImpl: typeof fetch = fetch,
): Promise<BirthPlaceResolution> {
  const endpoint = new URL(
    selectedProviderResultId === undefined
      ? 'https://geocoding-api.open-meteo.com/v1/search'
      : 'https://geocoding-api.open-meteo.com/v1/get',
  );
  if (selectedProviderResultId === undefined) {
    endpoint.searchParams.set('name', searchLabel);
    endpoint.searchParams.set('count', '10');
  } else {
    endpoint.searchParams.set('id', String(selectedProviderResultId));
  }
  endpoint.searchParams.set('language', 'pt');
  endpoint.searchParams.set('format', 'json');

  let response: Response;
  try {
    response = await fetchWithTimeout(endpoint, {}, fetchImpl);
  } catch {
    return { status: 'provider-unavailable' };
  }
  if (!response.ok) return { status: 'provider-unavailable' };

  const payload = (await response.json()) as
    | OpenMeteoGeocodingResult
    | { results?: readonly OpenMeteoGeocodingResult[] };
  if (selectedProviderResultId !== undefined) {
    const selected = toCandidate(payload as OpenMeteoGeocodingResult);
    return selected?.providerResultId === selectedProviderResultId
      ? { status: 'resolved', place: selected }
      : { status: 'not-found' };
  }

  const searchPayload = payload as { results?: readonly OpenMeteoGeocodingResult[] };
  const candidates = (searchPayload.results ?? [])
    .map(toCandidate)
    .filter((item): item is BirthPlaceCandidate => item !== null);
  if (candidates.length === 0) return { status: 'not-found' };

  return candidates.length === 1
    ? { status: 'resolved', place: candidates[0] as BirthPlaceCandidate }
    : { status: 'selection-required', candidates };
}
