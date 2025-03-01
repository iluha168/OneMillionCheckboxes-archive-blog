import { ApplicationCommandOptionTypes, ApplicationCommandTypes } from "https://deno.land/x/discordeno@18.0.1/mod.ts"
import { CMD } from "../../cmds-handler.mts"

export const cmd: CMD = {
	AppCmdOption: {
		name: "monochrome",
		description: "Renders a black-&-white image of checkboxes. 1 pixel = n checkboxes.",
		type: ApplicationCommandOptionTypes.SubCommand,
        options: [{
            name: "n",
            type: ApplicationCommandOptionTypes.Integer,
            description: "The bitdepth. Default 1.",
            minValue: 1,
            maxValue: 8,
            required: false
        }]
	},

	[ApplicationCommandTypes.ChatInput]: async intr => {
        await intr.reply({
            content: "Your black-&-white image:",
            file: {
                name: "monochrome.png",
                blob: new Blob([
                    await intr.omcBot.checkboxes
                        .renderImg([
                            (intr.options.n as number|undefined) ?? 1
                        ])
                        .encode(3)
                ])
            }
        })
	}
}