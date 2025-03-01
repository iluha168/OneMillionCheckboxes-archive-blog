import { ApplicationCommandOptionTypes, ApplicationCommandTypes, InteractionCallbackData, sendMessage } from "https://deno.land/x/discordeno@18.0.1/mod.ts"
import { CMD } from "../cmds-handler.mts"
import { FRAME_INTERVAL_MS, frames } from "../../recording.mts";
import { sleep } from "../../../api/utils.mts";
import { CheckboxField } from "../../../api/mod.mts";

const FPS = 60

export const cmd: CMD = {
	AppCmdObject: {
		name: "timelapse",
		description: `Renders a timelapse over a given time. By default, it is faster than the real time by ${FPS*FRAME_INTERVAL_MS/1000} times.`,
		type: ApplicationCommandTypes.ChatInput,
        options: [{
			name: "time",
			description: "Defines the timeframe of the timelapse.",
			type: ApplicationCommandOptionTypes.Integer,
			required: true,
			choices: [[
				[ "5 minutes", 60*5 ] as [string, number],
				["10 minutes", 60*10] as [string, number],
				["20 minutes", 60*20] as [string, number],
				["30 minutes", 60*30] as [string, number],
				["40 minutes", 60*40] as [string, number],
				["50 minutes", 60*50] as [string, number],
				["1 hour" , 60*60*1] as [string, number],
				//["2 hours", 60*60*2] as [string, number],
				//["3 hours", 60*60*3] as [string, number],
				//["4 hours", 60*60*4] as [string, number],
				//["5 hours", 60*60*5] as [string, number],
				//["6 hours", 60*60*6] as [string, number],
			]]
			.flatMap(array =>
				array.map(([name, time]) => [`-${name} -> present`, -time] as [string, number])
					.concat(
				array.map(([name, time]) => [`present -> +${name}`, +time] as [string, number])
					)
			)
			.map(([name, value]) => ({name, value}))
		}, {
			name: "speed",
			description: "Speed up the timelapse even further. `1` is default, `2` is twice as fast.",
			type: ApplicationCommandOptionTypes.Integer,
			minValue: 0,
			maxValue: 100,
			required: false,
		},
		...
			["ch1","g","b","a"].map((name, i) => ({
				name,
				description: `The amount of bits in the channel #${i+1}.`,
				type: ApplicationCommandOptionTypes.Integer,
				minValue: 1,
				maxValue: 8,
				required: false,
				choices: []
			}))
		]
	},

	[ApplicationCommandTypes.ChatInput]: async intr => {
		const bitsPerChannels: number[] = []
		for(const chName of ["ch1","g","b","a"]){
			const ch = intr.options[chName]
			if(typeof ch === "number")
            	bitsPerChannels.push(ch)
		}

		if(bitsPerChannels.length <= 0)
			bitsPerChannels.push(1)
		
		await intr.defer()

		let msg = await intr.getOriginalMsg().catch(() => null)
		if(msg === null)
			return await intr.edit({
				content: "Not enough permissions, or, perhaps, the command was called outside a channel?"
			})

		async function editOrNewMsg(data: InteractionCallbackData) {
			try {
				await intr.edit(data)
			} catch {
				msg = await sendMessage(intr.bot, msg!.channelId, Object.assign({}, data, {
					messageReference: {
						failIfNotExists: false,
						guildId: msg!.guildId,
						channelId: msg!.channelId,
						messageId: msg!.id
					}
				}))
			}
		}

		let timelapseRealTimeS = intr.options.time as number
		const speed = (intr.options.speed as number|undefined) ?? 1
		const framesAmount = Math.abs(timelapseRealTimeS)*1000 / FRAME_INTERVAL_MS

		if(framesAmount > 1000 || framesAmount <= 1)
			return await editOrNewMsg({
				content: `Sorry, I will not even attempt to render a video with ${framesAmount} frames 💀.\nChange the timeframe and/or speed.`
			})

		if(timelapseRealTimeS > 0){
			await editOrNewMsg({
				content: `Booting up the time machine... ETA: <t:${Math.floor(Date.now()/1000 + timelapseRealTimeS)}:R>.`
			})
			await sleep(timelapseRealTimeS*1000)
			timelapseRealTimeS *= -1
		} else if(framesAmount > frames.length){
			return await editOrNewMsg({
				content: "Sorry, I have not yet recorded enough data for this timeframe."
			})
		}

		await editOrNewMsg({
			content: "Started generating video..."
		})
		
		const {width, height} = intr.omcBot.checkboxes.renderImg(bitsPerChannels)
		const ffmpeg = new Deno.Command("ffmpeg", {
			args: `-f rawvideo -pixel_format rgba -r ${FPS} -video_size ${width}x${height} -i - -pix_fmt yuv420p -f matroska -`.split(" "),
			stdin: "piped",
			stdout: "piped",
			stderr: "null",
		}).spawn()
		
		const ffmpegReaderLoop = (async () => {
			const reader = ffmpeg.stdout.getReader()
			const chunks: Uint8Array[] = []
			for(;;){
				const {done, value} = await reader.read()
				if(value) chunks.push(value)
				if(done) break
			}
			return chunks
		})();

		{// Render frames
			const ffmpegIn = ffmpeg.stdin.getWriter()
			const checkboxes = new CheckboxField()

			for(let i = frames.length - framesAmount; i < frames.length; i += speed){
				checkboxes.bytes = frames[i]
				ffmpegIn.write(new Uint8Array(
					checkboxes.renderImg(bitsPerChannels).bitmap
				))
				if(i/speed % 80 === 0)
					// Do some other tasks on the event loop and come back
					await sleep(0)
			}
			ffmpegIn.releaseLock()
			ffmpeg.stdin.close()
		}

		const video = new Blob(await ffmpegReaderLoop)
		const videoMB = Math.ceil(video.size/(1024*1024))
		
		if(videoMB > 25)
			return await editOrNewMsg({
				content: `Hey <@${intr.interaction.user.id}>, your timelapse has been rendered. However, its size (~${videoMB}MB) exceeded Discord's upload limit.`,
				allowedMentions: {
					users: [intr.interaction.user.id]
				}
			})

		await editOrNewMsg({
			content: `Hey <@${intr.interaction.user.id}>, your timelapse is ready:`,
			file: {
				name: "timelapse.mp4",
				blob: video
			},
			allowedMentions: {
				users: [intr.interaction.user.id]
			}
		}).catch(e => {
			console.error(e)
			Deno.writeFile(`./failed_timelapse_${Date.now()}.mkv`, video.stream())
		})
	}
}