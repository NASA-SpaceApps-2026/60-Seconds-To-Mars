import { useState } from 'react';
import { NASA_LOGO_URL, USE_OFFICIAL_NASA_LOGO } from '../config/branding';
import MissionPatch from './MissionPatchLogo';

/**
 * Logo de la cabecera. Con USE_OFFICIAL_NASA_LOGO carga el "Meatball" oficial desde Wikimedia;
 * si está desactivado o la imagen no carga (sin conexión), muestra el parche de misión original.
 * Ver src/config/branding.ts antes de presentar el proyecto.
 */
export default function NasaLogo({ size = 58 }: { size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!USE_OFFICIAL_NASA_LOGO || failed) return <MissionPatch size={size} />;
  return (
    <img
      src={NASA_LOGO_URL}
      alt="NASA"
      width={Math.round(size * 1.2)}
      height={size}
      onError={() => setFailed(true)}
      className="shrink-0 object-contain drop-shadow-sm"
      style={{ width: Math.round(size * 1.2), height: size }}
      referrerPolicy="no-referrer"
    />
  );
}
