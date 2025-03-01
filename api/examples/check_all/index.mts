import { Client, sleep } from "../../mod.mts";

const client = new Client()
client.addEventListener("error", console.error)
await client.connect()

for(;;){
    const i = Math.floor(Math.random()*1e6)

    if(client.checkboxes.get(i))
        continue

    console.log(`Toggling at ${i}.`)
    client.toggleBit(i)
    await sleep(140)
}