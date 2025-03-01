import { Client, Converter2D, loadImgMonochromeAsBits, loadPngRGBnnnAsBits, sleep } from "../../mod.mts";

const BITS_PER_CHANNEL = 1
const CHANNELS_PER_PIXEL = 1 // 3 for rgb
const BITS_PER_PIXEL = CHANNELS_PER_PIXEL*BITS_PER_CHANNEL
const sideLen = Math.floor(Math.sqrt(Math.floor(1000000/BITS_PER_PIXEL)))

//const target = await loadPngRGBnnnAsChecks(BITS_PER_CHANNEL, "target.png")
const target = await loadImgMonochromeAsBits("target.png")

const MapConv = new Converter2D({x: sideLen*BITS_PER_PIXEL, y: sideLen})
const ImgConv = new Converter2D({x: target.width*BITS_PER_PIXEL, y: target.height})

function imgPosToMapPos(imgPos: number){
    const tmp = ImgConv.from1Dto2D(imgPos)
    // Offset
    tmp.x += 140*BITS_PER_PIXEL
    tmp.y += 760
    return MapConv.from2Dto1D(tmp)
}

const client = new Client()
client.addEventListener("error", console.error)
await client.connect()

for(;;){
    const notCorrect = Array(ImgConv.size1D)
        .fill(null)
        .map((_, imgPos) => imgPosToMapPos(imgPos))
        .filter((mapPos, imgPos) => Number(client.checkboxes.get(mapPos)) !== target.bitmap[imgPos])
        
    if(notCorrect.length === 0){
        await sleep(500)
        continue
    }

    const at = notCorrect[Math.floor(Math.random()*notCorrect.length)]
    console.log(`Toggling at ${at}. Progress: ${ImgConv.size1D-notCorrect.length}/${ImgConv.size1D} ${Math.round(100*(1-notCorrect.length/ImgConv.size1D))}%`)
    client.toggleBit(at)
    await sleep(140)
}