module.exports = {
    run: run,
    conf: {
        command: "clean",
        aliases: ["clear"],
        help: "Supprime x message dans ce salon."
    }
}


async function run (message, args) {
    if (!message.member.roles.cache.some(r => r.id === '802951934406557738')) return

    let nbr = args.join("")
    if (nbr === "" || nbr === undefined || isNaN(nbr)) return message.channel.send("❌ Il faut indiquer le nombre de message à supprimer et écrire la commande ainsi `!clean x` (x étant le nombre de message à supprimer).")
    if (nbr < 1) return message.channel.send("❌ Le nombre de message à supprimer doit être supérieur à 0.")

    let nbSupp = 0,
        nbLoop = Math.ceil(nbr/100),
        chan = message.channel
    try {
        await message.delete()
    }
    catch (e) {
        await message.channel.send("Je n'ai pas la permission de gérer les messages de ce salon, je ne peux donc rien supprimer.")
        return
    }
    for (let  k = 0; k < nbLoop; k++) {
        let cpt = (nbr-(k*100) < 100 ? (nbr-(k*100)) : 100), msg
        try {
            msg = await chan.bulkDelete(cpt, true)
        } catch (e) {break}
        nbSupp += msg.size
        if (msg.size < 100) break
        }

    try {
        let mess = await chan.send("🗑️ Vous venez de supprimer " + nbSupp + " messages")
        await mess.delete({timeout: 5000})
        }
    catch (e) {}
}