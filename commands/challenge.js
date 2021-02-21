const Discord = require("discord.js")
module.exports = {
    run: async (message, args, client, db) => {
        switch ((args[0] || '').toLowerCase()) {
            case "cancel":
            case "c":
                await cancel (message, args, client, db)
                break
            case "liste":
            case "list":
            case "l":
                await list (message, args, client, db)
                break
            case "accept":
            case "a":
                await accept (message, args, client, db)
                break
            default:
                await start (message, args, client, db)
                break
        }
    },
    conf: {
        command: "challenge",
        aliases: ["chlg"],
        help: "Défie n'importe quel autre joueur dans un 50-50 pour remporter la somme misée par les 2 joueurs (1 seul challenge à la fois par joueur)."
    }
}


async function start (message, args, client, db) {
    let challenge = await db.collection('challenges').findOne({id: message.member.id})
    if (challenge) return message.channel.send("Vous ne pouvez pas lancer deux challenges en même temps, demandez à un membre d'accepter votre premier challenge ou annulez le avant d'en lancer un nouveau.")
    if (!args[0] || isNaN(args[0])) return message.channel.send('Il faut me donner la somme de bolducs que vous souhaitez mettre en jeux pour ce challenge.')
    if (Number.isInteger(args[0]) || args[0] <= 0) return message.channel.send('Le nombre de bolducs mis en jeux doit être un entier positif.')

    let memberInfo = await db.collection('members').findOne({id: message.member.id})
    if (!memberInfo || memberInfo.bolducs < args[0]) return message.channel.send("Vous n'avez pas assez de bolducs pour lancer ce défi.")

    await db.collection('members').updateOne({id: message.member.id}, {$inc: {bolducs: -args[0], dailyLoss: +args[0]}})
    await db.collection('challenges').insertOne({id: message.member.id, amount: +args[0]})
    message.channel.send(`Vous venez de lancer un challenge de ${args[0]} Bolduc${args[0] > 1 ? 's' : ''} <:1B:805427963972943882>`)
}
async function list (message, args, client, db) {
    let challengers = [],
        challenges = await db.collection('challenges').find()
        challenges = await challenges.toArray()
    if (challenges.length === 0) return message.channel.send("Aucun challenge n'est lancé pour le moment.")
        challenges = challenges.sort((a, b) => {return b.amount - a.amount})

    for (let c of challenges) {
        let member = message.guild.members.cache.get(c.id)
        challengers.push((member.displayName + "                                ").substring(0, 34) + c.amount)
    }


    await message.channel.send(new Discord.MessageEmbed()
        .setColor("#f5a61f")
        .setTitle("Voici la liste des challenges en cours :")
        .setDescription("```" + challengers.join("\n") + "```")
    )
}
async function accept (message, args, client, db) {
    // Accepte un défis lancé par un autre joueur
    let challenger = message.mentions.members.first()

    if (challenger) {
        let challenge = await db.collection('challenges').findOne({id: challenger.id})
        if (!challenge) return message.channel.send("Le membre que vous avez mentionné n'a pas lancé de challenge.")
        await draw (message, db, challenge, client)
    }
    else {
        let challenges = await db.collection('challenges').find()
            challenges = await challenges.toArray()
        if (challenges.length > 1) return message.channel.send('Plusieurs challenges sont en cours, il faut me mentionner le membre dont tu souhaite accepter le défi.')
        await draw (message, db, challenges[0], client)
    }
}
async function cancel (message, args, client, db) {
    // annule un challenge que l'on a lancé
    let challenge = await db.collection('challenges').findOne({id: message.member.id})
    if (!challenge) return message.channel.send("Vous n'avez lancé aucun challenge, il n'y a rien à annuler.")

    await db.collection('members').updateOne({id: message.member.id}, {$inc: {bolducs: challenge.amount, dailyLoss: -challenge.amount}})
    await db.collection('challenges').deleteOne({id:message.member.id})
    message.channel.send('Votre challenge est annulé.')
}

async function draw (message, db, challenge, client) {
    if (challenge.id === message.member.id) return message.channel.send('Vous ne pouvez pas vous défier vous-même.')
    let opponent = await message.guild.members.fetch(challenge.id)
    if (!opponent) message.channel.send("Le membre ayant lancé ce défi semble avoir quitté le serveur, le défi vient d'être supprimé.")
    let memberInfo = await db.collection('members').findOne({id: message.member.id})
    if (!memberInfo || memberInfo.bolducs < challenge.amount) return message.channel.send("Vous n'avez pas assez de bolducs pour accepter ce défi.")


    await db.collection('members').updateOne({id: message.member.id}, {$inc: {bolducs: -challenge.amount, dailyLoss: challenge.amount}})
    await message.channel.send(`Vous venez d'accepter le challenge de ${opponent}.`)

    setTimeout(async () => {
        let result = Math.random(), winner, looser
        if (result < 0.5) {
            winner = opponent
            looser = message.member
        }
        else {
            winner = message.member
            looser = opponent
        }

        await db.collection('challenges').deleteOne({id: challenge.id})
        await db.collection('members').updateOne({id: winner.id}, {$inc: {bolducs: (challenge.amount*2), dailyBenefit: (challenge.amount*2)}})


        await message.channel.send(`${winner} à remporté les Bolducs ! Soit ${challenge.amount*2} Bolducs <:1B:805427963972943882>`)
        client.channels.cache.get('804480235919114320').send(new Discord.MessageEmbed()
            .setColor('#FF3B00')
            .setTitle('Challenge')
            .setDescription(`**${winner.user.tag}** a remporté ${challenge.amount*2} bolducs en gagnant le défi contre **${looser.user.tag}**.`)
        )
    }, 6000)
}