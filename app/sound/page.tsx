"use client";

import { useRef } from "react";

type SignalId = "heart" | "wind" | "fist" | "hand" | "sphere" | "eye";
type StateId = "marco-sent" | "marco-received" | "polo-sent";

const signals: Array<{
    id: SignalId;
    title: string;
    note: string;
}> = [
    { id: "heart", title: "Heart", note: "A clear thump thump, thump thump heartbeat." },
    { id: "wind", title: "Wind", note: "A softer mail-send style swoosh, with almost no metallic pitch." },
    { id: "fist", title: "Fist", note: "Knocking on glass with a hard contact and short rattle." },
    { id: "hand", title: "Hand", note: "A quick tingleing sparkle that rides with the wave." },
    { id: "sphere", title: "Sphere", note: "A tennis-ball-like pop and bounce." },
    { id: "eye", title: "Eye", note: "Tiny blink sparkle." },
];

const states: Array<{ id: StateId; label: string }> = [
    { id: "marco-sent", label: "Marco sent" },
    { id: "marco-received", label: "Marco received" },
    { id: "polo-sent", label: "Polo sent" },
];

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

export default function SoundPage() {
    const audioCtxRef = useRef<AudioContext | null>(null);

    const getCtx = async () => {
        const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) {
            throw new Error("Web Audio is not supported in this browser.");
        }
        if (!audioCtxRef.current) {
            audioCtxRef.current = new AudioCtx();
        }
        if (audioCtxRef.current.state === "suspended") {
            await audioCtxRef.current.resume();
        }
        return audioCtxRef.current;
    };

    const envelope = (
        gain: GainNode,
        time: number,
        {
            attack = 0.01,
            decay = 0.18,
            peak = 0.18,
            end = 0.0001,
        }: { attack?: number; decay?: number; peak?: number; end?: number } = {}
    ) => {
        gain.gain.cancelScheduledValues(time);
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(clamp(peak, 0.0001, 1), time + attack);
        gain.gain.exponentialRampToValueAtTime(clamp(end, 0.0001, 1), time + attack + decay);
    };

    const tone = (
        ctx: AudioContext,
        destination: AudioNode,
        {
            type = "sine",
            freq = 440,
            start = 0,
            duration = 0.2,
            gain = 0.1,
            attack = 0.01,
            decay = 0.18,
            detune = 0,
        }: {
            type?: OscillatorType;
            freq?: number;
            start?: number;
            duration?: number;
            gain?: number;
            attack?: number;
            decay?: number;
            detune?: number;
        }
    ) => {
        const osc = ctx.createOscillator();
        const amp = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        osc.detune.setValueAtTime(detune, ctx.currentTime + start);
        osc.connect(amp);
        amp.connect(destination);
        envelope(amp, ctx.currentTime + start, { attack, decay, peak: gain });
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
    };

    const filteredNoise = (
        ctx: AudioContext,
        destination: AudioNode,
        {
            start = 0,
            duration = 0.16,
            gain = 0.06,
            lowpass = 1800,
            highpass = 300,
            attack = 0.005,
        }: {
            start?: number;
            duration?: number;
            gain?: number;
            lowpass?: number;
            highpass?: number;
            attack?: number;
        }
    ) => {
        const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i += 1) {
            data[i] = Math.random() * 2 - 1;
        }
        const source = ctx.createBufferSource();
        const hp = ctx.createBiquadFilter();
        const lp = ctx.createBiquadFilter();
        const amp = ctx.createGain();
        hp.type = "highpass";
        hp.frequency.value = highpass;
        lp.type = "lowpass";
        lp.frequency.value = lowpass;
        source.buffer = buffer;
        source.connect(hp);
        hp.connect(lp);
        lp.connect(amp);
        amp.connect(destination);
        envelope(amp, ctx.currentTime + start, { attack, decay: duration, peak: gain });
        source.start(ctx.currentTime + start);
        source.stop(ctx.currentTime + start + duration);
    };

    const makeMaster = (ctx: AudioContext) => {
        const master = ctx.createGain();
        master.gain.value = 0.8;
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -24;
        compressor.knee.value = 20;
        compressor.ratio.value = 10;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.2;
        master.connect(compressor);
        compressor.connect(ctx.destination);
        return master;
    };

    const playSignal = async (signal: SignalId, state: StateId) => {
        const ctx = await getCtx();
        const master = makeMaster(ctx);
        const now = ctx.currentTime;

        if (signal === "heart") {
            const beatFreq = state === "marco-received" ? 54 : 58;
            const beatGain = state === "marco-received" ? 0.19 : 0.16;
            const beat = (start: number, stronger = false) => {
                tone(ctx, master, {
                    type: "triangle",
                    freq: stronger ? beatFreq - 2 : beatFreq,
                    start,
                    duration: stronger ? 0.12 : 0.095,
                    gain: stronger ? beatGain + 0.01 : beatGain - 0.01,
                    attack: 0.001,
                    decay: stronger ? 0.085 : 0.065,
                });
                filteredNoise(ctx, master, {
                    start: start + 0.004,
                    duration: stronger ? 0.03 : 0.024,
                    gain: stronger ? 0.014 : 0.011,
                    lowpass: 340,
                    highpass: 20,
                });
                tone(ctx, master, {
                    type: "sine",
                    freq: stronger ? 32 : 36,
                    start,
                    duration: stronger ? 0.18 : 0.15,
                    gain: stronger ? 0.055 : 0.045,
                    attack: 0.001,
                    decay: stronger ? 0.13 : 0.11,
                });
            };

            beat(0, false);
            beat(0.14, true);
            beat(0.42, false);
            beat(0.56, true);
        }

        if (signal === "wind") {
            filteredNoise(ctx, master, { duration: 0.42, gain: 0.034, lowpass: 1800, highpass: 220, attack: 0.06 });
            filteredNoise(ctx, master, { start: 0.1, duration: 0.24, gain: 0.018, lowpass: 1200, highpass: 180, attack: 0.05 });
            tone(ctx, master, { type: "sine", freq: 260, start: 0.16, duration: 0.14, gain: 0.004, attack: 0.03, decay: 0.1 });
            tone(ctx, master, { type: "sine", freq: 340, start: 0.23, duration: 0.16, gain: 0.005, attack: 0.025, decay: 0.12 });
        }

        if (signal === "fist") {
            tone(ctx, master, { type: "triangle", freq: 180, start: 0, duration: 0.07, gain: 0.06, attack: 0.001, decay: 0.05 });
            filteredNoise(ctx, master, { start: 0, duration: 0.045, gain: 0.03, lowpass: 3000, highpass: 700 });
            tone(ctx, master, { type: "sine", freq: 900, start: 0.005, duration: 0.03, gain: 0.012, attack: 0.001, decay: 0.025 });
            if (state !== "marco-received") {
                filteredNoise(ctx, master, { start: 0.1, duration: 0.03, gain: 0.018, lowpass: 2400, highpass: 600 });
                filteredNoise(ctx, master, { start: 0.145, duration: 0.028, gain: 0.014, lowpass: 2200, highpass: 600 });
            }
        }

        if (signal === "hand") {
            tone(ctx, master, { type: "triangle", freq: 1318, start: 0, duration: 0.055, gain: 0.026, attack: 0.002, decay: 0.038 });
            tone(ctx, master, { type: "triangle", freq: 1567, start: 0.035, duration: 0.05, gain: 0.024, attack: 0.002, decay: 0.035 });
            tone(ctx, master, { type: "triangle", freq: 1760, start: 0.068, duration: 0.045, gain: 0.022, attack: 0.002, decay: 0.032 });
            tone(ctx, master, { type: "triangle", freq: 1975, start: 0.098, duration: 0.04, gain: 0.02, attack: 0.002, decay: 0.03 });
            tone(ctx, master, { type: "sine", freq: 2489, start: 0.02, duration: 0.03, gain: 0.008, attack: 0.002, decay: 0.022 });
        }

        if (signal === "sphere") {
            tone(ctx, master, { type: "sine", freq: 210, start: 0, duration: 0.09, gain: 0.06, attack: 0.002, decay: 0.07 });
            filteredNoise(ctx, master, { start: 0.004, duration: 0.03, gain: 0.012, lowpass: 1800, highpass: 200 });
            tone(ctx, master, { type: "sine", freq: 300, start: 0.1, duration: 0.08, gain: 0.034, attack: 0.002, decay: 0.06 });
            tone(ctx, master, { type: "triangle", freq: 420, start: 0.17, duration: 0.07, gain: 0.02, attack: 0.002, decay: 0.05 });
        }

        if (signal === "eye") {
            tone(ctx, master, { type: "triangle", freq: 1320, start: 0, duration: 0.05, gain: 0.02, attack: 0.002, decay: 0.04 });
            tone(ctx, master, { type: "sine", freq: 1760, start: 0.04, duration: 0.08, gain: 0.016, attack: 0.002, decay: 0.06 });
            if (state === "marco-received") {
                tone(ctx, master, { type: "triangle", freq: 990, start: 0.09, duration: 0.06, gain: 0.014, attack: 0.002, decay: 0.05 });
            }
        }

        // Disconnect master after playback.
        setTimeout(() => {
            master.disconnect();
        }, Math.max(500, (ctx.currentTime - now) * 1000 + 700));
    };

    return (
        <main className="min-h-screen bg-[#0b1220] px-6 py-14 text-white sm:px-8 lg:px-12">
            <div className="mx-auto max-w-6xl">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-white/45">
                    Sound studies
                </p>
                <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.06em] sm:text-6xl">
                    Signal sounds before we commit them to the app.
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-7 text-white/60 sm:text-lg">
                    These are synthetic previews, not final mastered audio assets. The goal is to approve each signal&apos;s sound character first.
                </p>
            </div>

            <div className="mx-auto mt-10 grid max-w-6xl gap-6 md:grid-cols-2 xl:grid-cols-3">
                {signals.map((signal) => (
                    <section
                        key={signal.id}
                        className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(8,15,30,0.98))] p-5 shadow-[0_24px_64px_rgba(2,6,23,0.42)]"
                    >
                        <h2 className="text-2xl font-semibold tracking-[-0.04em]">{signal.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-white/60">{signal.note}</p>
                        <div className="mt-5 space-y-3">
                            {states.map((state) => (
                                <button
                                    key={state.id}
                                    onClick={() => void playSignal(signal.id, state.id)}
                                    className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/8"
                                >
                                    <span className="text-sm font-medium text-white/88">{state.label}</span>
                                    <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/68">
                                        Play
                                    </span>
                                </button>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </main>
    );
}
