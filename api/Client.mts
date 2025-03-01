import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";
import { yeast } from "./yeast.mts";
import { rebase, sleep } from "./utils.mts";

export const SITE_DOMAIN = "onemillioncheckboxes.com"

export enum PacketTypes {
    HEARTBEAT_REQ = 2,
    HEARTBEAT_ACK = 3,
    SUBSCRIBE = 5,
    SID_UPDATE = 40,
    CHECKBOX_UPDATE = 42,
}

interface FullState {
    full_state: string,
    count: number,
    timestamp: number
}

export interface PacketsClientbound {
    [PacketTypes.HEARTBEAT_REQ]: null
    [PacketTypes.HEARTBEAT_ACK]: string
    [PacketTypes.SID_UPDATE]: {sid: string}
    [PacketTypes.CHECKBOX_UPDATE]:
        ["batched_bit_toggles", [number[], number[], number]] |
        ["full_state", FullState]
}

export interface PacketsServerbound {
    [PacketTypes.HEARTBEAT_REQ]: string
    [PacketTypes.HEARTBEAT_ACK]: null
    [PacketTypes.SUBSCRIBE]: null
    [PacketTypes.CHECKBOX_UPDATE]: ["toggle_bit", {index: number}]
}

export class EventIncomingMessage extends Event {
    packetData: unknown
    constructor(type: string, packetData: unknown){
        super(type)
        this.packetData = packetData
    }
}

export class CheckboxField {
    bytes = new Uint8Array(1e6/8)
    private lastUpdateTimestamp = 0

    update(state: FullState){
        if(this.lastUpdateTimestamp > state.timestamp)
            return
        this.lastUpdateTimestamp = state.timestamp
        const decoded = atob(state.full_state)
        this.bytes = new Uint8Array(decoded.length)
        for(let i = 0; i < decoded.length; i++)
            this.bytes[i] = decoded.charCodeAt(i)
    }

    get(at: number){
        return (this.bytes[Math.floor(at/8)] & 1 << 7 - at%8) != 0
    }

    set(at: number, value: boolean){
        if(at < 0 || at >= 1e6)
            throw new RangeError()
        const bytePos = Math.floor(at/8)
        const inBytePos = 1 << (7 - at % 8)
        if(value){
            this.bytes[bytePos] |= inBytePos
        } else {
            this.bytes[bytePos] &= ~inBytePos
        }
    }

    get size(){
        return this.bytes.length*8
    }

    renderImg(bitsPerChannels: number[]): Image {
        const sideLen = Math.floor(Math.sqrt(Math.floor(1000000/bitsPerChannels.reduce((a,b)=>a+b, 0))))
        const img = new Image(sideLen, sideLen)
        const maxPixelValues = bitsPerChannels.map(bpc => (1 << bpc) - 1)

        const nextBit = () => Number(this.get(nextBit.i++))
        nextBit.i = 0

        const nextByte = (size: number) => {
            let acc = 0
            for(let i = 0; i < size; i++)
                acc = (acc << 1) + nextBit()    
            return acc
        }

        switch(bitsPerChannels.length){
            case 1: // Monochrome
                for(let outI = 0; outI < img.bitmap.length; outI += 4){
                    const brightness = rebase(nextByte(bitsPerChannels[0]), 0, maxPixelValues[0], 0, 255)
                    for(let i = 0; i < 3; i++)
                        img.bitmap[outI + i] = brightness
                    img.bitmap[outI + 3] = 255
                }
            break
            case 2: // Alpha-monochrome
                for(let outI = 0; outI < img.bitmap.length; outI += 4){
                    const brightness = rebase(nextByte(bitsPerChannels[0]), 0, maxPixelValues[0], 0, 255)
                    for(let i = 0; i < 3; i++)
                        img.bitmap[outI + i] = brightness
                    img.bitmap[outI + 3] = rebase(nextByte(bitsPerChannels[1]), 0, maxPixelValues[1], 0, 255)
                }
            break
            case 3: // RGB
                for(let outI = 0; outI < img.bitmap.length; outI += 4){
                    for(let i = 0; i < bitsPerChannels.length; i++)
                        img.bitmap[outI + i] = rebase(nextByte(bitsPerChannels[i]), 0, maxPixelValues[i], 0, 255)
                    img.bitmap[outI + 3] = 255
                }
            break
            case 4: // RGBA
                for(let outI = 0; outI < img.bitmap.length; outI += 4)
                    for(let i = 0; i < bitsPerChannels.length; i++)
                        img.bitmap[outI + i] = rebase(nextByte(bitsPerChannels[i]), 0, maxPixelValues[i], 0, 255)
            break
            default:
                throw new Error("Unsupported channels amount.")
        }
        return img
    }
}

export class Client extends EventTarget {
    private ws: WebSocket | undefined = undefined;
    private sid: string | null = null
    public readonly checkboxes = new CheckboxField()

    constructor(){
        super()
        this.addPacketListener(PacketTypes.CHECKBOX_UPDATE, data => {
            switch(data[0]){
                case "batched_bit_toggles":
                    for(const turnOn of data[1][0])
                        this.checkboxes.set(turnOn, true)
                    for(const turnOff of data[1][1])
                        this.checkboxes.set(turnOff, false)
                    break
                case "full_state":
                    this.checkboxes.update(data[1])
                    break
                default:
                    this.dispatchEvent(new ErrorEvent("error", {
                        message: "Unknown checkbox update sub-type: "+data[0]
                    }))
            }
        })
        this.addPacketListener(PacketTypes.SID_UPDATE, data => this.sid = data.sid)
        this.addPacketListener(PacketTypes.HEARTBEAT_REQ, () => {
            this.#send(PacketTypes.HEARTBEAT_ACK, null)
        })
    }

    async connect(){
        if(this.sid === null){
            const data: {
                maxPayload: number, pingInterval: number, pingTimeout: number, sid: string, upgrades: string[]
            } = await fetch(`https://${SITE_DOMAIN}/socket.io/?EIO=4&transport=polling&t=${yeast()}`)
                .then(r => r.text())
                .then(txt => txt.slice(1))
                .then(JSON.parse)
            this.sid = data.sid
            await fetch(`https://${SITE_DOMAIN}/socket.io/?EIO=4&transport=polling&t=${yeast()}&sid=${this.sid}`, {
                method: "POST",
                body: PacketTypes.SID_UPDATE.toString()
            })
            .then(r => r.text())
            .then(txt => {
                if(txt !== "ok")
                    throw new Error("Unauthorized: "+txt)
            })
            const state: FullState = await fetch(`https://${SITE_DOMAIN}/api/initial-state`).then(r => r.json())
            this.checkboxes.update(state)
        }
        this.ws = new WebSocket(`wss://${SITE_DOMAIN}/socket.io/?EIO=4&transport=websocket&sid=${this.sid}`)
        await new Promise<void>(finishedConnecting => {
            this.ws!.onmessage = ({data}: {data: string}) => {
                //console.log("⬇️", data)
                const packetID: PacketTypes = parseInt(data, 10)
                const stringData = data.slice(packetID.toString().length)
                let parsedData: PacketsClientbound[keyof PacketsClientbound]
                if(stringData === "")
                    parsedData = null
                else try {
                    parsedData = JSON.parse(stringData)
                } catch {
                    parsedData = stringData
                }
                if(PacketTypes[packetID] === undefined)
                    this.dispatchEvent(new ErrorEvent("error", {
                        message: "Unknown packet type "+packetID
                    }))
                this.dispatchEvent(new EventIncomingMessage("packet"+packetID, parsedData))
            }
            this.ws!.onerror = event => {
                this.dispatchEvent(new ErrorEvent("error", {
                    message: event instanceof ErrorEvent? event.message : (event+"")
                }))
            } 
            this.ws!.onclose = async () => {
                this.sid = null
                // Attempt to reconnect
                await sleep(1000)
                try {
                    await this.connect()
                } catch(err) {
                    this.dispatchEvent(new ErrorEvent("error", {
                        message: err+""
                    }))
                }
            }
            this.addPacketListener(PacketTypes.HEARTBEAT_ACK, () => {
                this.#send(PacketTypes.SUBSCRIBE, null)
                finishedConnecting()
            }, {once: true})
            this.ws!.onopen = () => {
                this.#send(PacketTypes.HEARTBEAT_REQ, "probe")
            }
        })
    }

    #send<T extends keyof PacketsServerbound>(type: T, data: PacketsServerbound[T]){
        if(this.ws!.readyState !== this.ws!.OPEN)
            return this.dispatchEvent(new CloseEvent("error", {
                reason: "Tried to send data while WebSocket is closed"
            }))
        let body: string
        if(data === null)
            body = ""
        else if(typeof data === "string")
            body = data
        else
            body = JSON.stringify(data)
        //console.log("⬆️", type+body)
        this.ws!.send(type+body)
    }

    addPacketListener<T extends keyof PacketsClientbound>(type: T, listener: (data: PacketsClientbound[T]) => unknown, options?: AddEventListenerOptions){
        this.addEventListener("packet"+type, e => {
            listener((e as EventIncomingMessage).packetData as PacketsClientbound[T])
        }, options)
    }

    toggleBit(at: number){
        this.checkboxes.set(at, !this.checkboxes.get(at))
        this.#send(PacketTypes.CHECKBOX_UPDATE, [
            "toggle_bit",
            {index: at}
        ])
    }
}
