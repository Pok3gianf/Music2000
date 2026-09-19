import { AudioAnalysisMeta } from '../types';

export const EQ_FREQUENCIES = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
export const EQ_FREQ_LABELS = ['60', '170', '310', '600', '1k', '3k', '6k', '12k', '14k', '16k'];

export const EQ_PRESETS: Record<string, number[]> = {
  Plano: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Graves Potentes': [6, 5, 4, 2, 0, -1, -1, 0, 1, 2],
  'Voces Claras': [-2, -1, 0, 2, 4, 5, 4, 2, 1, 0],
  Acústico: [4, 3, 2, 1, 2, 2, 3, 4, 4, 3],
  Electrónica: [5, 4, 2, 0, -2, 2, 3, 4, 5, 5],
  'Rock Clásico': [4, 3, 1, 0, -1, 1, 3, 4, 4, 3],
  'Pop Pastel': [3, 2, 0, 1, 3, 3, 2, 3, 4, 4],
};

class AudioEngine {
  private ctx: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private pannerNode: StereoPannerNode | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isInitialized = false;
  private currentSpeed = 1.0;
  private currentPitch = 0; // semitones (-12 to 12)

  public init(audioEl: HTMLAudioElement): void {
    if (this.isInitialized && this.audioElement === audioEl) return;
    this.audioElement = audioEl;

    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();

      // Create filter chain for 10 bands
      this.filters = EQ_FREQUENCIES.map((freq, idx) => {
        const filter = this.ctx!.createBiquadFilter();
        if (idx === 0) {
          filter.type = 'lowshelf';
        } else if (idx === EQ_FREQUENCIES.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
          filter.Q.value = 1.4;
        }
        filter.frequency.value = freq;
        filter.gain.value = 0;
        return filter;
      });

      // Panner
      if (this.ctx.createStereoPanner) {
        this.pannerNode = this.ctx.createStereoPanner();
      }

      // Gain (Master Volume)
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = 0.8;

      // Analyser for spectrum and waveform
      this.analyserNode = this.ctx.createAnalyser();
      this.analyserNode.fftSize = 64; // 32 frequency bins
      this.analyserNode.smoothingTimeConstant = 0.82;

      // MediaElement source
      this.sourceNode = this.ctx.createMediaElementSource(audioEl);

      // Connect source -> filter0 -> filter1 ... -> filter9 -> panner -> gain -> analyser -> destination
      let lastNode: AudioNode = this.sourceNode;
      for (const filter of this.filters) {
        lastNode.connect(filter);
        lastNode = filter;
      }

      if (this.pannerNode) {
        lastNode.connect(this.pannerNode);
        lastNode = this.pannerNode;
      }

      lastNode.connect(this.gainNode);
      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.ctx.destination);

      this.isInitialized = true;
    } catch (err) {
      console.warn('Web Audio initialization note (normal before user interaction):', err);
    }
  }

  public ensureContext(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setFilterGain(index: number, gainDb: number): void {
    if (this.filters[index] && this.ctx) {
      this.filters[index].gain.setTargetAtTime(gainDb, this.ctx.currentTime, 0.05);
    }
  }

  public setAllFilterGains(gains: number[]): void {
    gains.forEach((g, idx) => {
      this.setFilterGain(idx, g);
    });
  }

  public setVolume(vol0to100: number): void {
    const v = Math.max(0, Math.min(1, vol0to100 / 100));
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
    }
    if (this.audioElement) {
      this.audioElement.volume = v;
    }
  }

  public setBalance(panMinus100to100: number): void {
    const p = Math.max(-1, Math.min(1, panMinus100to100 / 100));
    if (this.pannerNode && this.ctx) {
      this.pannerNode.pan.setTargetAtTime(p, this.ctx.currentTime, 0.05);
    }
  }

  public setPitch(semitones: number): void {
    this.currentPitch = semitones;
    this.updatePlaybackRate();
  }

  public setSpeed(rate: number): void {
    this.currentSpeed = rate;
    this.updatePlaybackRate();
  }

  private updatePlaybackRate(): void {
    if (this.audioElement) {
      // Pitch adjustment in semitones: 2^(semitones / 12)
      const pitchRatio = Math.pow(2, this.currentPitch / 12);
      const effectiveRate = Math.max(0.25, Math.min(8.0, this.currentSpeed * pitchRatio));
      this.audioElement.playbackRate = effectiveRate;
    }
  }

  public getFrequencyData(outputArray: Uint8Array): void {
    if (this.analyserNode) {
      this.analyserNode.getByteFrequencyData(outputArray as unknown as Uint8Array<ArrayBuffer>);
    }
  }

  public getTimeDomainData(outputArray: Uint8Array): void {
    if (this.analyserNode) {
      this.analyserNode.getByteTimeDomainData(outputArray as unknown as Uint8Array<ArrayBuffer>);
    }
  }

  public getSampleRate(): number | null {
    return this.ctx ? this.ctx.sampleRate : null;
  }

  public getAnalysisMetrics(isPlaying: boolean, songDurationMs: number): AudioAnalysisMeta {
    const sampleRate = this.ctx ? this.ctx.sampleRate : 44100;
    let peakDb = '-inf';
    let lufsDb = '-inf';

    if (isPlaying && this.analyserNode) {
      const buffer = new Uint8Array(this.analyserNode.fftSize);
      this.analyserNode.getByteTimeDomainData(buffer);
      let sumSq = 0;
      let maxDev = 0;
      for (let i = 0; i < buffer.length; i++) {
        const norm = (buffer[i] - 128) / 128;
        sumSq += norm * norm;
        if (Math.abs(norm) > maxDev) {
          maxDev = Math.abs(norm);
        }
      }
      const rms = Math.sqrt(sumSq / buffer.length);
      const peakVal = Math.max(0.0001, maxDev);
      const db = 20 * Math.log10(peakVal);
      peakDb = `${db.toFixed(1)} dB`;
      const lufs = 20 * Math.log10(Math.max(0.0001, rms)) - 0.691;
      lufsDb = `${lufs.toFixed(1)} LU`;
    }

    return {
      duration: songDurationMs,
      sample_rate: sampleRate,
      bitrate: 320,
      codec: 'MPEG-4 AAC / PCM',
      channels: 2,
      peak: isPlaying ? peakDb : '-14.2 dB',
      lufs: isPlaying ? lufsDb : '-18.4 LUFS',
      bpm: '124 BPM',
    };
  }
}

export const audioEngine = new AudioEngine();

/**
 * Creates a synthetic musical audio track using Web Audio API offline rendering.
 * Produces crisp, beautiful lo-fi / synth tunes so audio playback works immediately!
 */
export async function generateSyntheticTrackBlob(style: 'lofi' | 'ambient' | 'synth' | 'jazz'): Promise<{ blobUrl: string; durationMs: number; blob: Blob }> {
  const sampleRate = 44100;
  const durationSec = 45; // 45 seconds loopable
  const totalSamples = sampleRate * durationSec;
  const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate);

  // Master bus
  const master = offlineCtx.createGain();
  master.gain.value = 0.7;
  master.connect(offlineCtx.destination);

  // Reverb simulation using delay
  const delay = offlineCtx.createDelay();
  delay.delayTime.value = 0.28;
  const delayFeedback = offlineCtx.createGain();
  delayFeedback.gain.value = 0.35;
  delay.connect(delayFeedback);
  delayFeedback.connect(delay);
  delay.connect(master);

  // Chord progression chords in Hz
  const progression = style === 'lofi'
    ? [
        [261.63, 329.63, 392.00, 493.88], // Cmaj7
        [220.00, 261.63, 329.63, 392.00], // Am7
        [174.61, 220.00, 261.63, 329.63], // Fmaj7
        [196.00, 246.94, 293.66, 349.23], // G7
      ]
    : [
        [146.83, 220.00, 261.63, 329.63], // Dm7
        [174.61, 220.00, 261.63, 329.63], // Fmaj7
        [130.81, 196.00, 246.94, 293.66], // Cmaj
        [164.81, 246.94, 293.66, 349.23], // Em7
      ];

  const barTime = 3.6; // seconds per chord
  const numLoops = Math.ceil(durationSec / (barTime * progression.length));

  for (let loop = 0; loop < numLoops; loop++) {
    progression.forEach((chord, chordIdx) => {
      const chordStart = (loop * progression.length + chordIdx) * barTime;
      if (chordStart >= durationSec) return;

      // Electric piano / Pad
      chord.forEach((freq) => {
        const osc = offlineCtx.createOscillator();
        osc.type = style === 'synth' ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(freq, chordStart);

        const gain = offlineCtx.createGain();
        gain.gain.setValueAtTime(0.001, chordStart);
        gain.gain.linearRampToValueAtTime(0.09, chordStart + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, chordStart + barTime - 0.05);

        // Lowpass filter for warm vintage corporate pastel vibe
        const lpf = offlineCtx.createBiquadFilter();
        lpf.type = 'lowpass';
        lpf.frequency.value = style === 'synth' ? 1800 : 950;

        osc.connect(gain);
        gain.connect(lpf);
        lpf.connect(master);
        lpf.connect(delay);

        osc.start(chordStart);
        osc.stop(chordStart + barTime);
      });

      // Bass note
      const bassOsc = offlineCtx.createOscillator();
      bassOsc.type = 'triangle';
      bassOsc.frequency.setValueAtTime(chord[0] / 2, chordStart);

      const bassGain = offlineCtx.createGain();
      bassGain.gain.setValueAtTime(0.001, chordStart);
      bassGain.gain.linearRampToValueAtTime(0.25, chordStart + 0.05);
      bassGain.gain.exponentialRampToValueAtTime(0.001, chordStart + barTime - 0.1);

      bassOsc.connect(bassGain);
      bassGain.connect(master);
      bassOsc.start(chordStart);
      bassOsc.stop(chordStart + barTime);

      // Drum beat (soft kick and hi-hat)
      const beatInterval = barTime / 4;
      for (let beat = 0; beat < 4; beat++) {
        const beatTime = chordStart + beat * beatInterval;
        if (beatTime >= durationSec) continue;

        // Kick on 0 and 2
        if (beat === 0 || beat === 2) {
          const kickOsc = offlineCtx.createOscillator();
          kickOsc.frequency.setValueAtTime(130, beatTime);
          kickOsc.frequency.exponentialRampToValueAtTime(38, beatTime + 0.12);

          const kickGain = offlineCtx.createGain();
          kickGain.gain.setValueAtTime(0.35, beatTime);
          kickGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.14);

          kickOsc.connect(kickGain);
          kickGain.connect(master);
          kickOsc.start(beatTime);
          kickOsc.stop(beatTime + 0.15);
        }

        // Snare/Clap on 1 and 3
        if (beat === 1 || beat === 3) {
          const snareOsc = offlineCtx.createOscillator();
          snareOsc.type = 'triangle';
          snareOsc.frequency.setValueAtTime(180, beatTime);
          snareOsc.frequency.exponentialRampToValueAtTime(60, beatTime + 0.08);

          const snareGain = offlineCtx.createGain();
          snareGain.gain.setValueAtTime(0.18, beatTime);
          snareGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.1);

          snareOsc.connect(snareGain);
          snareGain.connect(master);
          snareOsc.start(beatTime);
          snareOsc.stop(beatTime + 0.12);
        }

        // Hihat
        const hatOsc = offlineCtx.createOscillator();
        hatOsc.type = 'sine';
        hatOsc.frequency.setValueAtTime(7500, beatTime);
        const hatGain = offlineCtx.createGain();
        hatGain.gain.setValueAtTime(0.04, beatTime);
        hatGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.04);
        hatOsc.connect(hatGain);
        hatGain.connect(master);
        hatOsc.start(beatTime);
        hatOsc.stop(beatTime + 0.05);
      }
    });
  }

  const renderedBuffer = await offlineCtx.startRendering();
  const wavBlob = audioBufferToWavBlob(renderedBuffer);
  const blobUrl = URL.createObjectURL(wavBlob);

  return { blobUrl, durationMs: durationSec * 1000, blob: wavBlob };
}

/**
 * Converts an AudioBuffer into a WAV Blob
 */
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const channels: Float32Array[] = [];
  let sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    out.setUint16(pos, data, true);
    pos += 2;
  }
  function setUint32(data: number) {
    out.setUint32(pos, data, true);
    pos += 4;
  }

  // RIFF identifier
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  // fmt sub-chunk
  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // subchunk1size (16 for PCM)
  setUint16(1); // PCM format
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan); // byte rate
  setUint16(numOfChan * 2); // block align
  setUint16(16); // bits per sample

  // data sub-chunk
  setUint32(0x61746164); // "data" chunk
  setUint32(length - pos - 4);

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out], { type: 'audio/wav' });
}
