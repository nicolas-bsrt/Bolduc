const Discord = require("discord.js")
module.exports = {
    run: async (message, args, client, db, tools) => {
        switch ((args[0] || '').toLowerCase()) {
            case "cancel":
            case "c":
                await cancel (message, args, client, db)
                break
            case "accept":
            case "a":
                await accept (message, args, client, db, tools)
                break
            case "liste":
            case "list":
            case "l":
                await list (message, args, client, db)
                break
            case "remove":
            case "r":
                await remove (message, args, client, db)
                break
            default:
                await start (message, args, client, db, tools)
                break
        }
    },
    conf: {
        command: "loterie",
        aliases: ["lot"],
        help: "Lance un challenge acceptable par plusieurs joueur qui débutera à la fin du temps défini (en minutes)(définir la somme mise en jeu)."
    }
}


async function start (message, args, client, db, tools) {
    let challenge = await db.collection('lotteries').findOne({id: message.member.id, type: 'lottery'})
    if (challenge) return message.channel.send("Vous ne pouvez pas lancer deux loteries en même temps, attendez sa fin ou annulez la avant d'en lancer une nouvelle.")

    if (!args[0] || isNaN(args[0]) || 0 > args[0]) return message.channel.send('Il faut me donner la durée de la loterie (en minutes).')
    if (args[0] > 1440) return message.channel.send('La loterie ne peut pas durer plus de 24h.')
    if (!args[1] || isNaN(args[1])) return message.channel.send('Il faut me donner la somme de bolducs que vous souhaitez mettre en jeux pour cette loterie.')
    if (Number.isInteger(args[1]) || args[1] < 0) return message.channel.send('Le nombre de bolducs mis en jeux doit être un entier positif.')

    let memberInfo = await db.collection('members').findOne({id: message.member.id})
    if (!memberInfo || memberInfo.bolducs < args[1]) return message.channel.send("Vous n'avez pas assez de bolducs pour lancer cette loterie.")

    let time = new Date(); time.setTime(time.getTime() + args[0]*60000)
    await db.collection('members').updateOne({id: message.member.id}, {$inc: {bolducs: -args[1], dailyLoss: +args[1]}})
    await db.collection('lotteries').insertOne({id: message.member.id, type: 'lottery', amount: +args[1], entrants: [message.member.id], start: time})
    await db.collection('scheduler').insertOne({id: message.author.id, name: 'LotteryDraw', date: time, channel: message.channel.id})
    message.channel.send(`Vous venez de lancer une loterie de ${args[1]} Bolduc${args[1] > 1 ? 's' : ''} <:1B:805427963972943882>`)
    await tools.schedulerUpdate (db, client)
}
async function list (message, args, client, db) {
    let challengers = [],
        challenges = await db.collection('lotteries').find()
        challenges = await challenges.toArray()
        challenges = challenges.filter(c => c.type !== 'megaLottery')
    if (challenges.length === 0) return message.channel.send("Aucune loterie n'est lancée pour le moment.")
        challenges = challenges.sort((a, b) => {return b.amount - a.amount})

    for (let c of challenges) {
        let member = message.guild.members.cache.get(c.id)
        challengers.push((member.displayName + "                                ").substring(0, 34) + c.amount)
    }

    await message.channel.send(new Discord.MessageEmbed()
        .setColor("#f5a61f")
        .setTitle("Voici la liste des loteries en cours :")
        .setDescription("```" + challengers.join("\n") + "```")
    )
}
async function accept (message, args, client, db, tools) {
    // accepte la loterie lancé par un autre joueur
    let challenger = message.mentions.members.first(),
        lottery

    if (challenger) {
        lottery = await db.collection('lotteries').findOne({id: challenger.id, type: 'lottery'})
        if (!lottery) return message.channel.send("Le membre que vous avez mentionné n'a pas lancé de loterie.")
    }
    else {
        let lotteries = await db.collection('lotteries').find({type: 'lottery'})
            lotteries = await lotteries.toArray()
        if (lotteries.length > 1) return message.channel.send('Plusieurs loteries sont en cours, il faut me mentionner le membre dont tu souhaite accepter le défi.')

        lottery = lotteries[0]
        challenger = await message.guild.members.fetch(lottery.id)
    }

    if (lottery.entrants.includes(message.member.id)) return message.channel.send("Vous êtes déjà inscrit à cette loterie, inutile de s'y inscrire une deuxième fois.")
    let memberInfo = await db.collection('members').findOne({id: message.member.id})
    if (!memberInfo || memberInfo.bolducs < lottery.amount) return message.channel.send("Vous n'avez pas assez de bolducs pour vous inscrire à cette à loterie.")

    await db.collection('members').updateOne({id: message.member.id}, {$inc: {bolducs: -lottery.amount, dailyLoss: lottery.amount}})
    await db.collection('lotteries').updateOne({id: challenger.id, type: 'lottery'}, {$push: {entrants: message.member.id}})
    await message.channel.send(`Vous venez d'accepter la loterie de ${challenger.displayName}, début dans ${tools.howManyLast(new Date().getTime(), lottery.start)}.`)

}


async function remove (message, args, client, db) {
    let challenger = message.mentions.members.first(),
        lID, lottery


    if (challenger) {
        lottery = await db.collection('lotteries').findOne({id: challenger.id, type: 'lottery'})
        if (!lottery) return message.channel.send("Le membre que vous avez mentionné n'a pas lancé de loterie.")
        if (!lottery.entrants.includes(message.member.id)) return message.channel.send("Vous n'êtes pas inscrit à la loterie lancée par le membre mentionné.")
        lID = lottery.id
    }
    else {
        lottery = await db.collection('lotteries').find({entrants: message.member.id, type: 'lottery'})
        lottery = await lottery.toArray()
        if (lottery.length > 1) return message.channel.send("Vous êtes inscrit à plus d'une loterie, il faut me mentionner le membre qui a lancé la loterie pour vous en désinscrire.")
        lID = lottery[0].id
    }


    await db.collection('lotteries').updateOne({id: lID, type: 'lottery'}, {$pull: {entrants: message.member.id}})
    message.channel.send(`J'annule votre participation à la loterie de ${challenger.displayName}.`)
    await db.collection('members').updateOne({id: message.member.id}, {$inc: {bolducs: lottery.amount, dailyLoss: -lottery.amount}})
}
async function cancel (message, args, client, db) {
    // annule une loterie qu'on a lancé
    let lottery = await db.collection('lotteries').findOne({id: message.member.id, type: 'lottery'})
    if (!lottery) return message.channel.send("Vous n'avez lancé aucune loterie, vous ne pouvez rien annuler.")

    await db.collection('scheduler').deleteOne({id: lottery.id, name: 'LotteryDraw'})
    await db.collection('lotteries').deleteOne({id: lottery.id, type: 'lottery'})
    await db.collection('members').updateMany({id: {$in: lottery.entrants}}, {$inc: {bolducs: lottery.amount, dailyLoss: -lottery.amount}})

    message.channel.send('La loterie est annulé, les paris ont été reversés aux participants.')
}