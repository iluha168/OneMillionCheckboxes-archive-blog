import { createCommandGroup, routeCommandGroup, updateGlobalApplicationCommands } from "./commands/cmds-handler.mts"
import { GatewayIntents, createBot, startBot } from "https://deno.land/x/discordeno@18.0.1/mod.ts"
import { Client as OMCClient } from "../api/mod.mts"
import { InteractionWrapper } from "./commands/cmds-helpers.mts"
import env from "./env.mts"
import { startRecording } from "./recording.mts";

const [cmdIndex, descriptors] = await createCommandGroup('./commands/handlers/','./handlers/')

const OMCBot = new OMCClient()
OMCBot.addEventListener("error", console.error)
await OMCBot.connect()
startRecording(OMCBot)

await startBot(createBot({
    token: env.DISCORD_BOT_TOKEN,
    intents: GatewayIntents.Guilds,
    events: {
        ready: async (bot) => {
            console.log('Logged in', descriptors)
            await updateGlobalApplicationCommands(bot, descriptors)
        },

        interactionCreate: (bot, interaction) => {
            const intr = new InteractionWrapper(bot, interaction, OMCBot)
            if([1007707952502808746n].includes(intr.interaction.user.id))
                return intr.reply({
                    content: `Sorry, <@${intr.interaction.user.id}>, but you are banned from using this bot!`
                })
            routeCommandGroup(cmdIndex, intr)
        }
    }
}))
