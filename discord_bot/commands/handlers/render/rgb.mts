import { ApplicationCommandOptionTypes, ApplicationCommandTypes } from "https://deno.land/x/discordeno@18.0.1/mod.ts"
import { CMD } from "../../cmds-handler.mts"

export const cmd: CMD = {
	AppCmdOption: {
		name: "rgb",
		description: "Renders a colourful image from checkboxes. 1 pixel = n*3 checkboxes, or n*4 with alpha.",
		type: ApplicationCommandOptionTypes.SubCommand,
        options: ["red","green","blue","alpha"].map((name, i, a) => ({
            name: name[0],
            type: ApplicationCommandOptionTypes.Integer,
            description: `The amount of bits in the ${name} channel.`,
            minValue: 1,
            maxValue: 8,
            required: i < a.length-1
        }))
	},

	[ApplicationCommandTypes.ChatInput]: async intr => {
        const bitsPerChannels = [intr.options.r, intr.options.g, intr.options.b] as number[]
        if(typeof intr.options.a === "number")
            bitsPerChannels.push(intr.options.a)
        await intr.reply({
            content: `Your RGB${bitsPerChannels.join('')} image:`,
            file: {
                name: "rgb.png",
                blob: new Blob([
                    await intr.omcBot.checkboxes
                        .renderImg(bitsPerChannels)
                        .encode(3)
                ])
            }
        })
	}
}