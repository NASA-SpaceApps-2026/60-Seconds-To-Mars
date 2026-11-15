import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, CameraOff, Check, LoaderCircle, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { CADET_ROLES, cadetDisplayName, cadetRoleLabel } from '../data/cadetRoles';
import { tr } from '../i18n/core';
import { playButtonClick, playSuccess } from '../utils/soundEffects';
import MissionPatch from './MissionPatchLogo';
import { DefaultHelmetArt } from './CadetFramedAvatar';

const PHOTO_SIZE = 256;

type Stage = 'loading' | 'live' | 'captured' | 'nocam';

/** Nitidez suave (unsharp 3x3) sobre el lienzo ya dibujado. Todo ocurre en el navegador. */
function sharpen(ctx: CanvasRenderingContext2D, size: number, amount = 0.35) {
  const img = ctx.getImageData(0, 0, size, size);
  const src = img.data;
  const out = new Uint8ClampedArray(src);
  const w = size * 4;
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const i = y * w + x * 4;
      for (let c = 0; c < 3; c++) {
        const center = src[i + c];
        const blur = (src[i - 4 + c] + src[i + 4 + c] + src[i - w + c] + src[i + w + c]) / 4;
        out[i + c] = center + (center - blur) * amount;
      }
    }
  }
  img.data.set(out);
  ctx.putImageData(img, 0, 0);
}

/**
 * Credencial de Cadete con la webcam. 100 % local: la imagen se procesa en un <canvas>, se guarda como
 * dataURL en el store (y en localStorage de este navegador) y NUNCA se envía a ningún servidor ni API.
 */
export default function CadetCameraModal({ onClose }: { onClose: () => void }) {
  const savedPhoto = useGameStore((s) => s.cadetPhoto);
  const savedName = useGameStore((s) => s.cadetName);
  const savedRole = useGameStore((s) => s.cadetRole);
  const setCadetProfile = useGameStore((s) => s.setCadetProfile);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  /** false tras cerrar: si el permiso llega tarde, la cámara se apaga en el acto. */
  const aliveRef = useRef(true);
  const [stage, setStage] = useState<Stage>('loading');
  const [photo, setPhoto] = useState<string | null>(savedPhoto);
  const [name, setName] = useState(savedName);
  const [role, setRole] = useState(savedRole);

  /** Apaga TODAS las pistas: el piloto de la webcam se apaga al instante. */
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setStage('loading');
    if (!navigator.mediaDevices?.getUserMedia) {
      setStage('nocam');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 512 }, height: { ideal: 512 } },
        audio: false,
      });
      if (!aliveRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        await v.play().catch(() => undefined);
      }
      setStage('live');
    } catch {
      if (aliveRef.current) setStage('nocam');
    }
  }, [stopCamera]);

  // Si ya había foto se enseña; si no, se enciende la cámara. Al desmontar SIEMPRE se apaga.
  useEffect(() => {
    aliveRef.current = true;
    if (!savedPhoto) void startCamera();
    else setStage('captured');
    return () => {
      aliveRef.current = false;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ESC cierra
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const close = () => {
    aliveRef.current = false;
    stopCamera();
    onClose();
  };

  const capture = () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c || !v.videoWidth) return;
    const side = Math.min(v.videoWidth, v.videoHeight);
    const sx = (v.videoWidth - side) / 2;
    const sy = (v.videoHeight - side) / 2;
    c.width = PHOTO_SIZE;
    c.height = PHOTO_SIZE;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.save();
    // Espejo horizontal: la foto queda igual que la vista previa
    ctx.translate(PHOTO_SIZE, 0);
    ctx.scale(-1, 1);
    ctx.filter = 'contrast(1.08) saturate(1.06) brightness(1.03)';
    ctx.drawImage(v, sx, sy, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
    ctx.restore();
    sharpen(ctx, PHOTO_SIZE);
    setPhoto(c.toDataURL('image/jpeg', 0.85));
    stopCamera();
    setStage('captured');
    playSuccess();
  };

  const retake = () => {
    playButtonClick();
    setPhoto(null);
    void startCamera();
  };

  const confirm = () => {
    playButtonClick();
    stopCamera();
    setCadetProfile(photo, name.trim() || tr('CADETE', 'CADET'), role);
    onClose();
  };

  const display = cadetDisplayName(name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/75 p-4 backdrop-blur-sm" onClick={close}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={tr('Credencial de Cadete', 'Cadet Badge')}
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative my-auto w-full max-w-3xl overflow-hidden rounded-2xl border-2 border-slate-200 bg-white text-left shadow-2xl"
      >
        <div className="h-1.5 w-full bg-nasa-blue" />
        <div className="h-1 w-full bg-nasa-red" />
        <header className="flex items-start gap-3 px-4 pt-3 sm:px-6 sm:pt-4">
          <MissionPatch size={48} className="hidden h-12 w-auto shrink-0 sm:block" />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs font-bold tracking-[0.2em] text-slate-500">ARES-IV // {tr('REGISTRO DE TRIPULACIÓN', 'CREW REGISTRATION')}</p>
            <h2 className="font-display text-xl font-black leading-tight text-nasa-blue sm:text-2xl">{tr('Credencial de Cadete', 'Cadet Badge')}</h2>
          </div>
          <button type="button" onClick={close} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-nasa-blue" aria-label={tr('Cerrar', 'Close')}>
            <X className="h-6 w-6" />
          </button>
        </header>

        <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-[auto_1fr] md:items-center">
          {/* ---- Visor del casco con la cámara en vivo / foto / casco ilustrado ---- */}
          <div className="flex flex-col items-center">
            <div className="relative rounded-full bg-gradient-to-br from-white via-slate-200 to-slate-400 p-2.5 shadow-xl">
              <div className="rounded-full bg-nasa-blue p-1">
                <div className="relative h-[clamp(12rem,32dvh,16rem)] w-[clamp(12rem,32dvh,16rem)] overflow-hidden rounded-full bg-slate-900">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className={`h-full w-full scale-x-[-1] object-cover ${stage === 'live' ? '' : 'hidden'}`}
                  />
                  {stage === 'captured' && photo && <img src={photo} alt={display} className="h-full w-full object-cover" />}
                  {stage === 'nocam' && <DefaultHelmetArt className="h-full w-full" />}
                  {stage === 'loading' && (
                    <div className="grid h-full w-full place-items-center text-sky-300">
                      <LoaderCircle className="h-10 w-10 animate-spin" />
                    </div>
                  )}
                  {/* Guía para centrar la cara */}
                  {stage === 'live' && (
                    <span className="pointer-events-none absolute left-1/2 top-[46%] h-[62%] w-[48%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-dashed border-white/60" />
                  )}
                  {/* Reflejo curvo del visor */}
                  <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_28%_20%,rgba(255,255,255,0.5),transparent_30%),linear-gradient(160deg,transparent_55%,rgba(14,165,233,0.25))]" />
                  <span className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_0_3px_rgba(255,255,255,0.35),inset_0_-14px_26px_rgba(2,6,23,0.5)]" />
                </div>
              </div>
              {/* Emblema de la misión en el casco */}
              <span className="absolute -bottom-1 -right-1 grid h-14 w-14 place-items-center rounded-full border-2 border-white bg-white shadow-md">
                <MissionPatch size={52} className="h-12 w-auto" />
              </span>
              <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-nasa-red" />
            </div>
            {/* Vista previa de la placa de la credencial */}
            <div className="mt-3 w-[clamp(12rem,32dvh,16rem)] rounded-md border border-slate-300 bg-gradient-to-b from-white to-slate-200 px-2 py-1 text-center shadow-sm">
              <p className="truncate font-mono text-base font-black tracking-wider text-slate-900">{display}</p>
              <p className="truncate text-xs font-semibold text-nasa-blue">{cadetRoleLabel(role)}</p>
            </div>
            <canvas ref={canvasRef} className="hidden" aria-hidden />
          </div>

          {/* ---- Datos y acciones ---- */}
          <div className="flex min-w-0 flex-col gap-3">
            {stage === 'nocam' && (
              <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-sm text-amber-900">
                <CameraOff className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                {tr(
                  'No hay cámara o no diste permiso. ¡No pasa nada! Usaremos un casco ilustrado y puedes guardar tu nombre y tu puesto.',
                  "No camera or no permission. That's fine! We'll use an illustrated helmet and you can still save your name and role.",
                )}
              </p>
            )}
            <label className="flex flex-col gap-1">
              <span className="text-sm font-bold text-slate-700">{tr('Nombre en la placa del traje', 'Name on the suit plate')}</span>
              <input
                type="text"
                maxLength={14}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tr('Ej. YERAY', 'E.g. ALEX')}
                className="rounded-lg border-2 border-slate-300 bg-white px-3 py-2 font-mono text-lg font-bold uppercase tracking-wider text-slate-900 outline-none focus:border-nasa-blue"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-bold text-slate-700">{tr('Puesto en la tripulación', 'Crew role')}</span>
              <select
                value={CADET_ROLES.find((r) => r.es === role || r.en === role)?.es ?? role}
                onChange={(e) => setRole(e.target.value)}
                className="rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-base font-semibold text-slate-900 outline-none focus:border-nasa-blue"
              >
                {CADET_ROLES.map((r) => (
                  <option key={r.es} value={r.es}>
                    {tr(r.es, r.en)}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap gap-2 pt-1">
              {stage === 'live' && (
                <button
                  type="button"
                  onClick={capture}
                  className="font-display flex flex-1 items-center justify-center gap-2 rounded-xl bg-nasa-red px-4 py-3 text-base font-black tracking-wider text-white shadow transition hover:brightness-110"
                >
                  <Camera className="h-5 w-5" /> {tr('CAPTURAR FOTO DE CADETE', 'TAKE CADET PHOTO')}
                </button>
              )}
              {(stage === 'captured' || stage === 'nocam') && (
                <button
                  type="button"
                  onClick={retake}
                  className="flex items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-nasa-blue hover:text-nasa-blue"
                >
                  <RotateCcw className="h-4 w-4" /> {stage === 'nocam' ? tr('Probar cámara otra vez', 'Try camera again') : tr('Repetir foto', 'Retake photo')}
                </button>
              )}
              {stage !== 'live' && stage !== 'loading' && (
                <button
                  type="button"
                  onClick={confirm}
                  className="font-display flex flex-1 items-center justify-center gap-2 rounded-xl bg-nasa-blue px-4 py-3 text-base font-black tracking-wider text-white shadow transition hover:brightness-110"
                >
                  <Check className="h-5 w-5" /> {tr('Confirmar Credencial', 'Confirm Badge')}
                </button>
              )}
            </div>
            <p className="flex items-start gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-nasa-blue" strokeWidth={1.75} />
              {tr(
                'Tu foto se queda solo en este navegador: no se envía a internet ni a ninguna IA.',
                'Your photo stays only in this browser: it is never sent to the internet or to any AI.',
              )}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
