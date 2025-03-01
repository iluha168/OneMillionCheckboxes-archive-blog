import { Client, Converter2D, sleep } from "../../mod.mts";

let target = new Uint8ClampedArray()

const MapConv = new Converter2D({x: 1000, y: 1000})
const ImgConv = new Converter2D({x: 158, y: 158})

function imgPosToMapPos(imgPos: number){
    const tmp = ImgConv.from1Dto2D(imgPos)
    // Offset
    tmp.x += 132
    tmp.y += 742
    return MapConv.from2Dto1D(tmp)
}

setInterval(() => {
    target = client.checkboxes
        .renderImg([1])
        .resize(ImgConv.size.x, ImgConv.size.y)
        .bitmap
        .filter((_, i) => i%4 === 0)
        .map(v => v === 0? 0 : 1)
}, 1000)

const client = new Client()
client.addEventListener("error", console.error)
await client.connect()

for(;;){
    const notCorrect = Array(ImgConv.size1D)
        .fill(null)
        .map((_, imgPos) => imgPosToMapPos(imgPos))
        .filter((mapPos, imgPos) => Number(client.checkboxes.get(mapPos)) !== target[imgPos])
        
    if(notCorrect.length === 0){
        await sleep(500)
        continue
    }

    const at = notCorrect[Math.floor(Math.random()*notCorrect.length)]
    console.log(`Toggling at ${at}. Progress: ${ImgConv.size1D-notCorrect.length}/${ImgConv.size1D} ${Math.round(100*(1-notCorrect.length/ImgConv.size1D))}%`)
    client.toggleBit(at)
    await sleep(130)
}