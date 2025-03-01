import { CheckboxField } from "../api/mod.mts";

const FPS = 60
const REAL_SECONDS_PER_FRAME = 100n

const checkboxes = new CheckboxField()
const bitsPerChannels = [8,8,8,8]
const {width, height} = checkboxes.renderImg(bitsPerChannels)

const ffmpeg = new Deno.Command("ffmpeg", {
    args: `-f rawvideo -pixel_format rgba -r ${FPS} -video_size ${width}x${height} -i - -pix_fmt yuv420p -f matroska -vf scale=width=-1:height=1000:sws_flags=neighbor -`.split(" "),
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
}).spawn()
ffmpeg.stderr.pipeTo(Deno.stderr.writable)
ffmpeg.stdout.pipeTo(Deno.openSync(
    `lapse${bitsPerChannels.join('')}.mp4`,
    {create: true, truncate: true, write: true}
).writable)

const logs = new BigUint64Array(Deno.readFileSync('omcb_log.bin').buffer)

const ffmpegIn = ffmpeg.stdin.getWriter()

let lastTime = 1719428440n
for(const log of logs){
    const time = log >> 32n
    const index = Number((log & 0xFFFFFFFEn) >> 1n)
    const value = Boolean(log & 1n)

    checkboxes.set(index, value)

    if(time - lastTime > REAL_SECONDS_PER_FRAME){
        await ffmpegIn.write(new Uint8Array(
            checkboxes.renderImg(bitsPerChannels).bitmap.buffer
        ))
        lastTime = time
    }
}

ffmpegIn.releaseLock()
await ffmpeg.stdin.close()
