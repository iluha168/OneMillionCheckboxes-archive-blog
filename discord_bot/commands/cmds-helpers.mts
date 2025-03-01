import { Bot, Interaction, InteractionCallbackData, InteractionResponse, InteractionResponseTypes, sendFollowupMessage, sendInteractionResponse, editOriginalInteractionResponse, getOriginalInteractionResponse } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { Client as OMCClient } from "../../api/mod.mts";

export class InteractionWrapper {
    static NoGuildError = new Error('Interaction called outside a guild')

    bot: Bot
    interaction: Interaction
    options: Record<string,unknown>
    omcBot: OMCClient
    constructor(bot: Bot, intr: Interaction, omcBot: OMCClient){
        this.bot = bot
        this.interaction = intr
        this.omcBot = omcBot
        const optionsToParse =
            intr.data?.options?.[0]?.options ?? intr.data?.options
        this.options = Object.fromEntries(optionsToParse?.map(opt => [opt.name, opt.value]) ?? [])
    }

    #respond(resp: InteractionResponse){
        return sendInteractionResponse(this.bot, this.interaction.id, this.interaction.token, resp)
    }

    defer(){
        return this.#respond({
            type: InteractionResponseTypes.DeferredChannelMessageWithSource
        })
    }

    reply(msg: InteractionCallbackData){
        return this.#respond({
            type: InteractionResponseTypes.ChannelMessageWithSource,
            data: msg
        })
    }

    edit(msg: InteractionCallbackData){
        return editOriginalInteractionResponse(this.bot, this.interaction.token, msg)
    }

    followUp(msg: InteractionCallbackData){
        return sendFollowupMessage(this.bot, this.interaction.token, {
            type: InteractionResponseTypes.ChannelMessageWithSource,
            data: msg
        })
    }

    getOriginalMsg(){
        return getOriginalInteractionResponse(this.bot, this.interaction.token)
    }
}