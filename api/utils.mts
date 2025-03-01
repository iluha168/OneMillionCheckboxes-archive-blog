import { Image, decode } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

export interface Point {
    x: number
    y: number
}

export class Converter2D {
    size: Point
    constructor(size: Point){
        this.size = size
    }

    get size1D(){
        return this.size.x * this.size.y
    }

    from2Dto1D({x, y}: Point): number {
        if(x < 0 || x >= this.size.x || y < 0 || y >= this.size.y)
            throw RangeError(`${x} is not in range [0; ${this.size.x}) or ${y} is not in range [0; ${this.size.y})`)
        return y*this.size.x+x
    }

    from1Dto2D(i: number): Point {
        if(i < 0 || i >= this.size1D)
            throw RangeError()
        const x = i % this.size.x
        const y = (i - x)/this.size.x
        return {x,y}
    }

    random1D(): number {
        return Math.floor(Math.random()*this.size1D)
    }
}

async function loadPng(path: string): Promise<Image> {
    return await decode(await Deno.readFile(path), true) as Image
}

export async function loadPngRGBnnnAsBits(bitsPerChannel: number, path: string): Promise<Image> {
    const img = await loadPng(path)
    const maxPixelValue = (1 << bitsPerChannel) - 1
    img.bitmap = new Uint8ClampedArray(
        Array.from(
            // Get rid of alpha channel
            img.bitmap.filter((_, i) => i%4 !== 3)
        )
        .flatMap(channel =>
            // Here we convert 8bits per byte to bitsPerChannel bits per byte
            Math.round(rebase(channel, 0, 255, 0, maxPixelValue))
            .toString(2)
            .padStart(bitsPerChannel, '0')
            // Here we split each byte into bits and store them in different bytes
            .split('')
            .map(n => parseInt(n,2))
        )
    )
    return img
}

export async function loadImgMonochromeAsBits(path: string): Promise<Image> {
    const img = await loadPng(path)
    img.bitmap = img.bitmap
        .filter((_, i) => i%4 === 0)
        .map(v => v === 0? 0 : 1)
    return img
}

export function rebase(value: number, oldA: number, oldB: number, newA: number, newB: number){
    return (value-oldA)/(oldB-oldA)*(newB-newA)+newA
}

export function sleep(ms: number){
    return new Promise(r => setTimeout(r, ms))
}