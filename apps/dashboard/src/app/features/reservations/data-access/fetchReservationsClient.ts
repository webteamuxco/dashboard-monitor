import type { ReservationPoint } from "../domain/ReservationPoint";

export async function fetchReservationsClient(
  projectId: string,
  windowMinutes: number,
): Promise<ReservationPoint[]> {
  const params = new URLSearchParams({
    projectId,
    windowMinutes: String(windowMinutes),
  });
  const res = await fetch(`/api/reservations?${params.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed with status ${res.status}`);
  }

  const payload = (await res.json()) as { data: ReservationPoint[] };
  return payload.data;
}
