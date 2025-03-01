import { ApplicationCommandOption, ApplicationCommandTypes, Bot, CreateApplicationCommand, DiscordApplicationCommand, InteractionTypes } from "https://deno.land/x/discordeno@18.0.1/mod.ts"
import { InteractionWrapper } from "./cmds-helpers.mts"

export type CMDCallback = (intr: InteractionWrapper) => Promise<unknown>
export type CMDIndex = Map<string, CMD>

export interface CMD {
    AppCmdObject?: CreateApplicationCommand
    AppCmdOption?: ApplicationCommandOption
    [ApplicationCommandTypes.ChatInput]?: CMDCallback
}

export function updateGlobalApplicationCommands(bot: Bot, payload: CreateApplicationCommand[]){
    return bot.rest.runMethod<DiscordApplicationCommand[]>(
        bot.rest,
        "PUT",
        bot.constants.routes.COMMANDS(bot.applicationId),
        payload.map(data => bot.transformers.reverse.createApplicationCommand(bot,data))
    )
}

// Command groups
export async function createCommandGroup(dir: string, relativeDir: string): Promise<[CMDIndex, CreateApplicationCommand[]]>{
    const cmdsIndex: CMDIndex = new Map
    const descriptors: CreateApplicationCommand[] = []
    for await(const entry of Deno.readDir(dir)){
        if(!entry.isFile) continue
        const module: {cmd?: CMD} = await import(relativeDir+entry.name)
        if(!module.cmd) continue
        if(!module.cmd.AppCmdObject) throw new Error('Not an application command')
        descriptors.push(module.cmd.AppCmdObject)
        cmdsIndex.set(module.cmd.AppCmdObject.name, module.cmd)
    }
    return [cmdsIndex, descriptors]
}

export async function createCommandSubGroup(dir: string, relativeDir: string): Promise<[CMDIndex, ApplicationCommandOption[]]>{
    const cmdsIndex: CMDIndex = new Map
    const descriptors: ApplicationCommandOption[] = []
    for await(const entry of Deno.readDir(dir)){
        if(!entry.isFile) continue
        const module: {cmd?: CMD} = await import(relativeDir+entry.name)
        if(!module.cmd) continue
        if(!module.cmd.AppCmdOption) throw new Error('Not an application command option')
        descriptors.push(module.cmd.AppCmdOption)
        cmdsIndex.set(module.cmd.AppCmdOption.name, module.cmd)
    }
    return [cmdsIndex, descriptors]
}

function executeCmdInteraction(cmd: CMD, intr: InteractionWrapper){
    switch(intr.interaction.type){
        case InteractionTypes.ApplicationCommand:
            if(!cmd[ApplicationCommandTypes.ChatInput]) throw new Error('Not an application command callback')
            return cmd[ApplicationCommandTypes.ChatInput](intr)
        case InteractionTypes.MessageComponent:
        case InteractionTypes.ApplicationCommandAutocomplete:
        case InteractionTypes.ModalSubmit:
        default:
            throw new Error('Unknown interaction type')
    }
}

export function routeCommandGroup(cmds: CMDIndex, intr: InteractionWrapper): ReturnType<CMDCallback> {
    if(!intr.interaction.data) throw intr
    const cmd = cmds.get(intr.interaction.data.name)
    if(!cmd) throw new Error("Could not find command "+intr.interaction.data.name)
    return executeCmdInteraction(cmd, intr)
}

export function routeCommandSubGroup(cmds: CMDIndex, intr: InteractionWrapper): ReturnType<CMDCallback> {
    const subCmdName = intr.interaction.data?.options?.[0].name
    if(!subCmdName) throw intr
    const cmd = cmds.get(subCmdName)
    if(!cmd) throw new Error("Could not find command "+subCmdName)
    return executeCmdInteraction(cmd, intr)
}