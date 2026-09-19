import React from 'react';
import {
  Sliders,
  ExternalLink,
  Volume2,
  Minimize2,
  RotateCcw,
} from 'lucide-react';
import { EQ_FREQ_LABELS, EQ_PRESETS } from '../utils/audioEngine';

interface EqualizerPanelProps {
  eqBands: number[];
  onChangeBand: (index: number, val: number) => void;
  onApplyPreset: (presetName: string) => void;
  volume: number;
  onChangeVolume: (val: number) => void;
  balance: number;
  onChangeBalance: (val: number) => void;
  pitch: number;
  onChangePitch: (val: number) => void;
  continueAlways: boolean;
  onToggleContinueAlways: () => void;
  isDetached: boolean;
  onToggleDetach: () => void;
  accentColor: string;
}

export const EqualizerPanel: React.FC<EqualizerPanelProps> = ({
  eqBands,
  onChangeBand,
  onApplyPreset,
  volume,
  onChangeVolume,
  balance,
  onChangeBalance,
  pitch,
  onChangePitch,
  continueAlways,
  onToggleContinueAlways,
  isDetached,
  onToggleDetach,
  accentColor,
}) => {
  const handleResetBands = () => {
    onApplyPreset('Plano');
  };

  const content = (
    <div className="flex flex-col select-none">
      {/* Top bar of Equalizer */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center text-white"
            style={{ backgroundColor: accentColor }}
          >
            <Sliders className="w-3.5 h-3.5" />
          </div>
          <span className="font-extrabold text-xs uppercase tracking-wider">
            Ecualizador Gráfico de 10 Bandas
          </span>

          {/* EQ Presets Selector */}
          <select
            onChange={(e) => onApplyPreset(e.target.value)}
            className="ml-2 px-2 py-1 rounded-md text-xs font-semibold border outline-none cursor-pointer"
            style={{
              backgroundColor: 'var(--panel-bg)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-color)',
            }}
            defaultValue="Plano"
          >
            {Object.keys(EQ_PRESETS).map((pName) => (
              <option key={pName} value={pName}>
                {pName}
              </option>
            ))}
          </select>

          <button
            onClick={handleResetBands}
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-opacity"
            title="Restablecer EQ a 0 dB"
            aria-label="Restablecer EQ a 0 dB"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={continueAlways}
              onChange={onToggleContinueAlways}
              className="accent-emerald-500 rounded cursor-pointer"
            />
            <span className="opacity-80">Continuar Siempre</span>
          </label>

          <button
            onClick={onToggleDetach}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-semibold hover:opacity-90 active:scale-95 transition-all cursor-pointer"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--panel-bg)',
            }}
          >
            {isDetached ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Acoplar EQ</span>
              </>
            ) : (
              <>
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Desacoplar EQ</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Auxiliary sliders: Volume, Balance, Pitch */}
      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-2.5 rounded-xl border"
        style={{
          backgroundColor: 'var(--panel-bg)',
          borderColor: 'var(--border-color)',
        }}
      >
        {/* Volume */}
        <div className="flex items-center gap-2 text-xs">
          <Volume2 className="w-4 h-4 opacity-70 shrink-0" />
          <span className="w-12 font-medium opacity-80">Volumen</span>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => onChangeVolume(Number(e.target.value))}
            className="flex-1 accent-emerald-500 h-1.5 cursor-pointer"
          />
          <span className="w-8 font-mono text-right opacity-70">{volume}%</span>
        </div>

        {/* Balance */}
        <div className="flex items-center gap-2 text-xs">
          <span className="w-12 font-medium opacity-80">Balance</span>
          <input
            type="range"
            min={-100}
            max={100}
            value={balance}
            onChange={(e) => onChangeBalance(Number(e.target.value))}
            className="flex-1 accent-emerald-500 h-1.5 cursor-pointer"
          />
          <span className="w-12 font-mono text-right opacity-70">
            {balance === 0 ? 'Centro' : balance < 0 ? `I ${Math.abs(balance)}` : `D ${balance}`}
          </span>
        </div>

        {/* Pitch */}
        <div className="flex items-center gap-2 text-xs">
          <span className="w-12 font-medium opacity-80">Tono</span>
          <input
            type="range"
            min={-12}
            max={12}
            value={pitch}
            onChange={(e) => onChangePitch(Number(e.target.value))}
            className="flex-1 accent-emerald-500 h-1.5 cursor-pointer"
          />
          <span className="w-12 font-mono text-right opacity-70">
            {pitch > 0 ? `+${pitch}` : pitch} st
          </span>
        </div>
      </div>

      {/* 10 Vertical EQ Band Fader Sliders */}
      <div
        className="p-3 rounded-xl border flex items-center justify-between gap-1 overflow-x-auto"
        style={{
          backgroundColor: 'var(--panel-bg)',
          borderColor: 'var(--border-color)',
        }}
      >
        {EQ_FREQ_LABELS.map((freqLabel, idx) => {
          const val = eqBands[idx] || 0;
          return (
            <div key={freqLabel} className="flex-1 flex flex-col items-center min-w-[38px] group">
              {/* dB value tooltip */}
              <span
                className="text-[10px] font-mono font-bold mb-1 opacity-60 group-hover:opacity-100 transition-opacity"
                style={{ color: val !== 0 ? accentColor : undefined }}
              >
                {val > 0 ? `+${val}` : val}
              </span>

              {/* Vertical Slider */}
              <div className="h-28 flex items-center justify-center my-1">
                <input
                  type="range"
                  min={-12}
                  max={12}
                  value={val}
                  onChange={(e) => onChangeBand(idx, Number(e.target.value))}
                  className="h-24 w-1.5 appearance-none rounded-lg outline-none cursor-pointer"
                  style={{
                    writingMode: 'vertical-lr',
                    direction: 'rtl',
                    accentColor: accentColor,
                    backgroundColor: 'var(--slider-groove)',
                  }}
                  title={`${freqLabel} Hz: ${val > 0 ? `+${val}` : val} dB`}
                />
              </div>

              {/* Frequency Label */}
              <span className="text-[11px] font-bold opacity-75 mt-1">{freqLabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (isDetached) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div
          className="w-full max-w-3xl rounded-2xl p-5 shadow-2xl border transition-all"
          style={{
            backgroundColor: 'var(--panel-bg)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-color)',
          }}
        >
          {content}
        </div>
      </div>
    );
  }

  return (
    <div
      className="border-t p-3 transition-colors duration-200"
      style={{
        backgroundColor: 'var(--eq-bg)',
        borderColor: 'var(--border-color)',
        color: 'var(--text-color)',
      }}
    >
      {content}
    </div>
  );
};
