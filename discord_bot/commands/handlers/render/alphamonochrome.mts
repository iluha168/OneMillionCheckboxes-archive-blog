import { ApplicationCommandOptionTypes, ApplicationCommandTypes } from "https://deno.land/x/discordeno@18.0.1/mod.ts"
import { CMD } from "../../cmds-handler.mts"

export const cmd: CMD = {
	AppCmdOption: {
		name: "alphamonochrome",
		description: "Renders a black-&-white image with transparency from checkboxes. 1 pixel = n+a checkboxes.",
		type: ApplicationCommandOptionTypes.SubCommand,
        options: [{
            name: "n",
            type: ApplicationCommandOptionTypes.Integer,
            description: "The bitdepth of the gray channel. Default 1.",
            minValue: 1,
            maxValue: 8,
            required: false
        }, {
            name: "a",
            type: ApplicationCommandOptionTypes.Integer,
            description: "The bitdepth of the alpha channel. Default 1.",
            minValue: 1,
            maxValue: 8,
            required: false
        }]
	},

	[ApplicationCommandTypes.ChatInput]: async intr => {
        await intr.reply({
            content: "Your black-&-white image with transparency:",
            file: {
                name: "alphamonochrome.png",
                blob: new Blob([
                    await intr.omcBot.checkboxes
                        .renderImg([
                            (intr.options.n as number|undefined) ?? 1,
                            (intr.options.a as number|undefined) ?? 1,
                        ])
                        .encode(3)
                ])
            }
        })
	}
}