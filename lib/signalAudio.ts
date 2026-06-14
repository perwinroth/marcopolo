"use client";

import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import type { SignalType } from "./signals";
import {
    nativeEndHoldHaptics,
    nativePlaySignalHaptics,
    nativeStartHoldHaptics,
    nativeTickHoldHaptics,
} from "./native/signalFeedback";

export type SignalPlaybackState = "marco-sent" | "marco-received" | "polo-sent";

let audioCtx: AudioContext | null = null;
let holdSelectionActive = false;
let lastHoldSelectionTick = 0;
let holdImpactCount = 0;

async function nativePulse(duration: number) {
    try {
        if (Capacitor.isNativePlatform()) {
            await Haptics.vibrate({ duration });
        }
    } catch {
        // Ignore native pulse failures and let other feedback run.
    }
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

async function getCtx() {
    if (typeof window === "undefined") return null;
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioCtx) {
        audioCtx = new AudioCtx();
    }
    if (audioCtx.state === "suspended") {
        await audioCtx.resume();
    }
    return audioCtx;
}

export async function primeSignalAudio() {
    const ctx = await getCtx();
    if (!ctx) return;
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.connect(gain);
    osc.start();
    osc.stop(ctx.currentTime + 0.01);
}

function envelope(
    gain: GainNode,
    time: number,
    {
        attack = 0.01,
        decay = 0.18,
        peak = 0.18,
        end = 0.0001,
    }: { attack?: number; decay?: number; peak?: number; end?: number } = {}
) {
    gain.gain.cancelScheduledValues(time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(clamp(peak, 0.0001, 1), time + attack);
    gain.gain.exponentialRampToValueAtTime(clamp(end, 0.0001, 1), time + attack + decay);
}

function tone(
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
) {
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
}

function filteredNoise(
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
) {
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
}

function makeMaster(ctx: AudioContext) {
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
}

async function impact(style: ImpactStyle) {
    try {
        if (Capacitor.isNativePlatform()) {
            await Haptics.impact({ style });
            return;
        }
    } catch {
        // Fall through to browser vibration when native haptics fails.
    }

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        const duration = style === ImpactStyle.Heavy ? 40 : style === ImpactStyle.Medium ? 26 : 16;
        navigator.vibrate(duration);
    }
}

export async function startSignalHoldHaptics() {
    lastHoldSelectionTick = Date.now();
    holdImpactCount = 0;
    if (await nativeStartHoldHaptics()) {
        return;
    }
    try {
        if (Capacitor.isNativePlatform()) {
            holdSelectionActive = true;
            await Haptics.selectionStart();
            await Haptics.selectionChanged();
            await nativePulse(18);
            await Haptics.impact({ style: ImpactStyle.Light });
            return;
        }
    } catch {
        holdSelectionActive = false;
    }

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(12);
    }
}

export async function tickSignalHoldHaptics() {
    const now = Date.now();
    if (now - lastHoldSelectionTick < 240) return;
    lastHoldSelectionTick = now;
    if (await nativeTickHoldHaptics(Math.min(1, holdImpactCount / 3 + 0.34))) {
        holdImpactCount += 1;
        return;
    }

    try {
        if (Capacitor.isNativePlatform() && holdSelectionActive) {
            await Haptics.selectionChanged();
            holdImpactCount += 1;
            if (holdImpactCount === 2) {
                await nativePulse(12);
                await Haptics.impact({ style: ImpactStyle.Light });
            }
            return;
        }
    } catch {
        holdSelectionActive = false;
    }

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(10);
    }
}

export async function endSignalHoldHaptics() {
    if (await nativeEndHoldHaptics()) {
        holdSelectionActive = false;
        holdImpactCount = 0;
        return;
    }
    try {
        if (Capacitor.isNativePlatform() && holdSelectionActive) {
            await Haptics.selectionEnd();
        }
    } catch {
        // Ignore haptic teardown failures.
    }
    holdSelectionActive = false;
    holdImpactCount = 0;
}

export async function playSignalHaptics(signal: SignalType, state: SignalPlaybackState) {
    if (await nativePlaySignalHaptics(signal, state)) {
        return;
    }
    const native = Capacitor.isNativePlatform();

    if (signal === "fist") {
        if (state === "marco-received") {
            if (native) {
                await nativePulse(22);
                await Haptics.notification({ type: NotificationType.Warning });
            }
            await impact(ImpactStyle.Medium);
            setTimeout(() => void impact(ImpactStyle.Heavy), 130);
            return;
        }
        if (native) {
            await nativePulse(26);
            await Haptics.notification({ type: NotificationType.Success });
        }
        await impact(ImpactStyle.Heavy);
        setTimeout(() => void impact(ImpactStyle.Light), 100);
        setTimeout(() => void impact(ImpactStyle.Light), 180);
        return;
    }

    if (signal === "finger") {
        const delays = state === "polo-sent" ? [0, 200, 410] : [0, 180, 360];
        delays.forEach((delay, index) => {
            setTimeout(() => void impact(index === delays.length - 1 ? ImpactStyle.Medium : ImpactStyle.Light), delay);
        });
        return;
    }

    if (signal === "heart") {
        if (state === "marco-received") {
            if (native) {
                await nativePulse(24);
                await Haptics.notification({ type: NotificationType.Warning });
            }
            [0, 140, 420, 560].forEach((delay, index) => {
                setTimeout(() => void impact(index % 2 === 0 ? ImpactStyle.Medium : ImpactStyle.Heavy), delay);
            });
            return;
        }
        if (native) {
            await nativePulse(20);
            await Haptics.notification({ type: NotificationType.Success });
        }
        await impact(ImpactStyle.Medium);
        setTimeout(() => void impact(ImpactStyle.Medium), 140);
        return;
    }

    if (signal === "hand") {
        if (native) {
            await nativePulse(16);
            await Haptics.notification({ type: state === "marco-received" ? NotificationType.Warning : NotificationType.Success });
        }
        [0, 55, 110, 155].forEach((delay) => setTimeout(() => void impact(ImpactStyle.Light), delay));
        return;
    }

    if (signal === "wind") {
        if (native) {
            await nativePulse(14);
            await Haptics.notification({ type: state === "marco-received" ? NotificationType.Warning : NotificationType.Success });
        }
        await impact(ImpactStyle.Light);
        return;
    }

    if (signal === "sphere") {
        if (native) {
            await nativePulse(18);
            await Haptics.notification({ type: state === "marco-received" ? NotificationType.Warning : NotificationType.Success });
        }
        await impact(ImpactStyle.Medium);
        return;
    }

    if (signal === "eye") {
        if (native) {
            await nativePulse(14);
            await Haptics.notification({ type: state === "marco-received" ? NotificationType.Warning : NotificationType.Success });
        }
        await impact(ImpactStyle.Light);
        return;
    }
}

export async function playSignalSound(signal: SignalType, state: SignalPlaybackState) {
    const ctx = await getCtx();
    if (!ctx) return;
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
    }

    if (signal === "finger") {
        tone(ctx, master, { type: "triangle", freq: 190, start: 0, duration: 0.1, gain: 0.055, attack: 0.002, decay: 0.08 });
        filteredNoise(ctx, master, { start: 0.002, duration: 0.03, gain: 0.014, lowpass: 1800, highpass: 250 });
        tone(ctx, master, { type: "triangle", freq: 200, start: 0.18, duration: 0.095, gain: 0.05, attack: 0.002, decay: 0.08 });
        filteredNoise(ctx, master, { start: 0.182, duration: 0.03, gain: 0.013, lowpass: 1800, highpass: 250 });
        tone(ctx, master, { type: "triangle", freq: state === "polo-sent" ? 215 : 205, start: 0.36, duration: 0.11, gain: 0.06, attack: 0.002, decay: 0.09 });
        filteredNoise(ctx, master, { start: 0.362, duration: 0.034, gain: 0.016, lowpass: 1900, highpass: 250 });
    }

    setTimeout(() => {
        master.disconnect();
    }, Math.max(700, (ctx.currentTime - now) * 1000 + 1200));
}
