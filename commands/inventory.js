module.exports = {
    run: fct,
    conf: {
        command: "inventory",
        aliases: ["inv"],
        help: "Affiche le nombre de bolducs du joueurs."
    }
}

async function fct (message, args, client, db) {
    let inventory = await db.collection('members').findOne({id: message.member.id})
    if (!inventory) return message.channel.send("Ce joueur n'a pas d'inventaire.")
    let diff = inventory.dailyBenefit - inventory.dailyLoss
    message.channel.send(`Vous possédez actuellement ${inventory.bolducs} Bolduc${inventory.bolducs > 1 ? 's' : ''} <:1B:805427963972943882> (${diff > 0 ? '+' :''}${diff})`)
}