import { Client, Converter2D, loadImgMonochromeAsBits, loadPngRGBnnnAsBits, sleep } from "../../mod.mts";

const BITS_PER_CHANNEL = 1
const CHANNELS_PER_PIXEL = 1 // 3 for rgb
const BITS_PER_PIXEL = CHANNELS_PER_PIXEL*BITS_PER_CHANNEL
const sideLen = Math.floor(Math.sqrt(Math.floor(1000000/BITS_PER_PIXEL)))
const CLIENTS_COUNT = 100

//const target = await loadPngRGBnnnAsChecks(BITS_PER_CHANNEL, "target.png")
const target = await loadImgMonochromeAsBits("target.png")

const MapConv = new Converter2D({x: sideLen*BITS_PER_PIXEL, y: sideLen})
const ImgConv = new Converter2D({x: target.width*BITS_PER_PIXEL, y: target.height})

function imgPosToMapPos(imgPos: number){
    const tmp = ImgConv.from1Dto2D(imgPos)
    // Offset
    tmp.x += 0*BITS_PER_PIXEL
    tmp.y += 0
    return MapConv.from2Dto1D(tmp)
}

const clients: Client[] = []
{
    const loginTasks: Promise<void>[] = []
    for(let i = 0; i < CLIENTS_COUNT; i++){
        const client = new Client()
        client.addEventListener("error", console.error)
        clients.push(client)

        const login = async () => {
            console.log(`Client #${i} is logging in\r`)
            await client.connect()
            console.log(`Client #${i} has logged in\r`)
        }
        
        loginTasks.push(
            loginTasks.length > 15?
            loginTasks.shift()!.then(login) :
            login()
        )
    }
    await Promise.all(loginTasks)
}

for(;;){
    let notCorrect = Array(ImgConv.size1D)
        .fill(null)
        .map((_, imgPos) => imgPosToMapPos(imgPos))
        .filter((mapPos, imgPos) => Number(clients[0].checkboxes.get(mapPos)) !== target.bitmap[imgPos])
    
    {
        const correctCount = ImgConv.size1D-notCorrect.length
        console.log(`Progress: ${correctCount}/${ImgConv.size1D} ${Math.round(100*(correctCount/ImgConv.size1D))}%`)
    }

    if(notCorrect.length === 0){
        await sleep(500)
        continue
    }

    notCorrect = notCorrect
        .sort(() => Math.random()*2 - 1) //shuffle
        .slice(0, CLIENTS_COUNT)

    for(const [clientI, at] of notCorrect.entries())
        clients[clientI].toggleBit(at)
    await sleep(400)
}