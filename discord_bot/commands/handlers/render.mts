import { ApplicationCommandTypes } from "https://deno.land/x/discordeno@18.0.1/mod.ts"
import { CMD, createCommandSubGroup, routeCommandSubGroup } from "../cmds-handler.mts"

const [cmdIndex, options] = await createCommandSubGroup('./commands/handlers/render','./handlers/render/')

export const cmd: CMD = {
	AppCmdObject: {
		name: "render",
		type: ApplicationCommandTypes.ChatInput,
		description: "Render all checkboxes as an image.",
		options
	},

	[ApplicationCommandTypes.ChatInput]: intr => {
		return routeCommandSubGroup(cmdIndex, intr)
	}
}