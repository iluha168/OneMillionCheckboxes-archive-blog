import { CheckboxField } from "../api/mod.mts";

const CHUNK_SIZE = 1e8
const TD = new TextDecoder()

function* readLines(path: string): Generator<string, void, undefined> {
    const bytes = Deno.readFileSync(path)
    let str = ""
    for(let i = 0; i < bytes.length; i += CHUNK_SIZE){
        const lines = (str+TD.decode(bytes.subarray(i, i+CHUNK_SIZE))).split("\n")
        str = lines.pop() ?? ""
        yield* lines
    }
    yield* str.split('\n')
}

type LogEntry = [Date, number, boolean]

class LogWriter {
    current = new CheckboxField()
    private f: Deno.FsFile

    private i = 0
    private buf: BigUint64Array = new BigUint64Array(1e6)

    public static instance = new LogWriter('omcb_log.bin')

    constructor(path: string){
        this.f = Deno.openSync(path, {write: true, truncate: true, create: true})
    }

    write(log: LogEntry){
        if(this.current.get(log[1]) === log[2]){
            //console.warn(`Redundant log detected at checkbox #${log[1]}: it is already "${log[2]}"`)
            return
        }
        this.current.set(log[1], log[2])

        this.buf[this.i] = (BigInt(+log[0]/1e3) << 32n) | (BigInt(log[1]) << 1n) | BigInt(log[2])
        if(++this.i >= this.buf.length)
            this.flush()
    }

    get latestWrittenDate(){
        return new Date(Number(this.buf[this.i] >> 32n)*1e3)
    }

    private flush(){
        const toWrite = new Uint8Array(this.buf.buffer, 0, this.i*this.buf.BYTES_PER_ELEMENT)
        if(this.f.writeSync(toWrite) !== toWrite.length)
            throw new Error("Failed to write to file")
        this.i = 0
    }

    close(){
        this.flush()
        this.f.close()
    }
}

function compressEpoch(name: string){
    const logsReader = (function* (){
        const logFiles = (Array.from(Deno.readDirSync(`data/${name}`)))
            .filter(entry => entry.isFile && entry.name.match(/logs\..*\.txt/))
            .map(file => file.name)
            .sort()
        for(const file of logFiles){
            console.debug("<logsReader> Reading file", file)
            for(const line of readLines(`data/${name}/${file}`)){
                const [time, iStr, vStr] = line.split('|')
                yield [new Date(time+'Z'), parseInt(iStr, 10), Boolean(parseInt(vStr, 2))] as LogEntry
            }
        }
    })();

    {
    const {value: firstLog} = logsReader.next()
    if(!firstLog) throw new Error("No logs found?!")

    const initial = new CheckboxField()
    initial.bytes = Deno.readFileSync(`data/${name}/initial.db`)

    console.debug(`[${name}] Writing initial.db`)
    for(let i = 0; i < 1e6; i++)
        LogWriter.instance.write([firstLog[0], i, initial.get(i)])
    LogWriter.instance.write(firstLog)
    console.debug(`[${name}] Finished writing initial.db`)
    }

    console.debug(`[${name}] Writing logs.txt`)
    for(const log of logsReader)
        LogWriter.instance.write(log)
    console.debug(`[${name}] Finished writing logs.txt`)

    {
    const finalDate = LogWriter.instance.latestWrittenDate
    const final = new CheckboxField()
    final.bytes = Deno.readFileSync(`data/${name}/final.db`)

    console.debug(`[${name}] Writing final.db`)
    for(let i = 0; i < 1e6; i++)
        LogWriter.instance.write([finalDate, i, final.get(i)])
    console.debug(`[${name}] Finished writing final.db`)
    }
}

setInterval(async () => {
    Deno.writeFileSync(
        'current.png',
        await LogWriter.instance.current.renderImg([1]).encode()
    )
}, 10000)

compressEpoch('pre-crash')
compressEpoch('post-crash-pre-sunset')
compressEpoch('post-sunset')

LogWriter.instance.close()
Deno.exit()
