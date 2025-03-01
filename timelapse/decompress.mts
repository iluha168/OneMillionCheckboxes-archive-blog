using binFile = Deno.openSync(
    'omcb_log.bin',
    {create: false, read: true}
)

const TES = new TextEncoderStream()
TES.readable.pipeTo(
    Deno.openSync('omcb_log.bin.txt', {create: true, write: true, truncate: true}).writable
)

const buffer = new Uint8Array(8)
const dv = new DataView(buffer.buffer)

const TESW = TES.writable.getWriter()

for(;;){
    const readResult = await binFile.read(buffer)
    if(readResult === null)
        break
    if(readResult !== buffer.length)
        throw new Error("Not enough data")

    const log = dv.getBigUint64(0, true)
    const time = new Date(Number(log >> 32n)*1e3)
    const index = (log & 0xFFFFFFFEn) >> 1n
    const value = log & 1n

    // Reconstruct
    await TESW.write(`${time.toISOString().slice(0,19)}|${index}|${value}\n`)
}

TESW.releaseLock()
await TESW.close()
