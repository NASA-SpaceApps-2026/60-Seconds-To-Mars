/**
 * Distancia Tierra-Marte aproximada para una fecha (órbitas circulares coplanarias con
 * longitudes medias J2000). Error típico < 15 %: suficiente para enseñar el orden de magnitud
 * y el retraso de la luz (entre ~3 y ~22 minutos).
 */
const AU_KM = 149_597_870.7;
const LIGHT_KM_S = 299_792.458;
const J2000_MS = Date.UTC(2000, 0, 1, 12);

export interface EarthMarsLink {
  distanceMillionKm: number;
  lightDelayMinutes: number;
}

export function earthMarsLink(date: Date = new Date()): EarthMarsLink {
  const d = (date.getTime() - J2000_MS) / 86_400_000;
  const rad = (deg: number) => ((((deg % 360) + 360) % 360) * Math.PI) / 180;
  const lEarth = rad(100.464 + 0.9856474 * d);
  const lMars = rad(355.453 + 0.5240208 * d);
  const rE = 1.0;
  const rM = 1.5237;
  const au = Math.sqrt(rE * rE + rM * rM - 2 * rE * rM * Math.cos(lMars - lEarth));
  const km = au * AU_KM;
  return { distanceMillionKm: km / 1e6, lightDelayMinutes: km / LIGHT_KM_S / 60 };
}
