import { ApplicationCommandTypes } from "https://deno.land/x/discordeno@18.0.1/mod.ts"
import { CMD } from "../cmds-handler.mts"

export const cmd: CMD = {
	AppCmdObject: {
		name: "ping",
		description: "Pong!",
	},

	[ApplicationCommandTypes.ChatInput]: async intr => {
		let time = Date.now()
		await intr.defer()
		time = Date.now() - time
		await intr.edit({
			content: `🏓\nHTTP: ${time}ms`
		})
	}
}