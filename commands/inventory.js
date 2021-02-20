module.exports = {
    run: fct,
    conf: {
        command: "inventory",
        aliases: ["inv"],
        help: "Affiche le nombre de bolducs du joueurs."
    }
}

async function fct (message, args, client, db) {
    let target = message.member,
        phrase = 'Vous possédez actuellement'
    if (message.mentions.members.first()) {
        target = message.mentions.members.first()
        phrase = target.displayName + ' possède'
    }

    let inventory = await db.collection('members').findOne({id: target.id})
    if (!inventory) return message.channel.send("Ce joueur n'a pas d'inventaire.")
    let diff = (inventory.dailyBenefit || 0) - (inventory.dailyLoss || 0),
        dailyVar = Math.round(inventory.bolducs * 1000 / (inventory.bolducs - diff)) / 10 - 100,
        percent = inventory.bolducs - diff === 0 ? '' : ` / ${dailyVar > 0 ? '+' : ''}${dailyVar}%`
    message.channel.send(`${phrase} ${inventory.bolducs} Bolduc${inventory.bolducs > 1 ? 's' : ''} <:1B:805427963972943882>\n(Variation journalière : ${diff > 0 ? '+' :''}${diff}${percent})`)
}