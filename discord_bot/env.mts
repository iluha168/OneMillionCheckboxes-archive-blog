import { config } from "https://deno.land/x/dotenv@v3.2.0/mod.ts"

interface ENV {
    DISCORD_BOT_TOKEN: string
}
const env = config() as unknown as ENV

export default env
