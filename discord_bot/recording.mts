import { Client as OMCClient } from "../api/mod.mts";

export const FRAME_INTERVAL_MS = 5000
export const FRAMES_MAX_STORED = 1*60*60*1000 / FRAME_INTERVAL_MS // 1 hour

export const frames: Uint8Array<ArrayBuffer>[] = []

export function startRecording(OMCBot: OMCClient) {
    setInterval(() => {

        frames.push(new Uint8Array(OMCBot.checkboxes.bytes))
        if(frames.length > FRAMES_MAX_STORED)
            frames.shift()

    }, FRAME_INTERVAL_MS)
}

export function getTimeStoredMS(): number {
    return frames.length * FRAME_INTERVAL_MS
}
