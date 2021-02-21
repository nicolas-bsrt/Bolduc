const Discord = require("discord.js")
module.exports = {
    run: async (message, args, client, db, tools, megaLottery) => {
        switch ((args[0] || '').toLowerCase()) {
            case "cancel":
            case "c":
                await cancel (message, args, client, db)
                break
            case "accept":
            case "a":
                await accept (message, args, client, db, tools)
                break
            case "remove":
            case "r":
                await remove (message, args, client, db)
                break
            default:
                await start (message, args, client, db, (megaLottery?2:1))
                break
        }
    },
    conf: {
        command: "loterie",
        aliases: ["lot"],
        help: "Lance un challenge acceptable par plusieurs joueur qui débutera à la fin du temps défini (en minutes)(définir la somme mise en jeu)."
    }
}
let lotteryStore = {}


async function start (message, args, client, db) {
    let challenge = await db.collection('lotteries').findOne({id: message.member.id, type: 'lottery'})
    if (challenge) return message.channel.send("Vous ne pouvez pas lancer deux loteries en même temps, attendez sa fin ou annulez la avant d'en lancer une nouvelle.")

    if (!args[0] || isNaN(args[0]) || 0 > args[0]) return message.channel.send('Il faut me donner la durée de la loterie (en minutes).')
    if (args[0] > 1440) return message.channel.send('La lotterie ne peut pas durer plus de 24h.')
    if (!args[1] || isNaN(args[1])) return message.channel.send('Il faut me donner la somme de bolducs que vous souhaitez mettre en jeux pour cette loterie.')
    if (Number.isInteger(args[1]) || args[1] < 0) return message.channel.send('Le nombre de bolducs mis en jeux doit être un entier positif.')

    let memberInfo = await db.collection('members').findOne({id: message.member.id})
    if (!memberInfo || memberInfo.bolducs < args[0]) return message.channel.send("Vous n'avez pas assez de bolducs pour lancer cette loterie.")

    await db.collection('members').updateOne({id: message.member.id}, {$inc: {bolducs: -args[1], dailyLoss: +args[1]}})
    await db.collection('lotteries').insertOne({id: message.member.id, type: 'lottery', amount: +args[1], entrants: [message.member.id], start: (new Date().getTime() + args[0]*60000)})

    message.channel.send(`Vous venez de lancer une loterie de ${args[1]} Bolduc${args[1] > 1 ? 's' : ''} <:1B:805427963972943882>`)
    lotteryStore[message.member.id] = setTimeout(draw, 60000*(+args[0]), message, db, client)
}
async function accept (message, args, client, db, tools) {
    // accepte la lotterie lancé par un autre joueur
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
        if (!lottery) return message.channel.send("Le membre que vous avez mentionné n'a pas lancé de lotterie.")
        if (!lottery.entrants.includes(message.member.id)) return message.channel.send("Vous n'êtes pas inscrit à la lotterie lancée par le membre mentionné.")
        lID = lottery.id
    }
    else {
        lottery = await db.collection('lotteries').find({entrants: message.member.id, type: 'lottery'})
        lottery = await lottery.toArray()
        if (lottery.length > 1) return message.channel.send("Vous êtes inscrit à plus d'une lotterie, il faut me mentionner le membre qui a lancé la lotterie pour vous en désinscrire.")
        lID = lottery[0].id
    }


    await db.collection('lotteries').updateOne({id: lID, type: 'lottery'}, {$pull: {entrants: message.member.id}})
    message.channel.send(`J'annule votre participation à la loterie de ${challenger.displayName}.`)
    await db.collection('members').updateOne({id: message.member.id}, {$inc: {bolducs: lottery.amount, dailyLoss: -lottery.amount}})
}
async function cancel (message, args, client, db) {
    // annule une lotterie qu'on a lancé
    let lottery = await db.collection('lotteries').findOne({id: message.member.id, type: 'lottery'})
    if (!lottery) return message.channel.send("Vous n'avez lancé aucune lotterie, vous ne pouvez rien annuler.")

    await deleteAndGiveBack (db, lottery)
    message.channel.send('La lotterie est annulé, les paris ont été reversés aux participants.')
}
async function deleteAndGiveBack (db, lottery) {
    await db.collection('lotteries').deleteOne({id: lottery.id, type: 'lottery'})
    await db.collection('members').updateMany({id: {$in: lottery.entrants}}, {$inc: {bolducs: lottery.amount, dailyLoss: -lottery.amount}})
}


async function draw (message, db, client) {
    delete lotteryStore[message.member.id]
    let lottery = await db.collection('lotteries').findOne({id: message.member.id, type: 'lottery'}),
        winner,
        entrants = lottery.entrants.length

    let opponent = await message.guild.members.fetch(lottery.id)
    if (!opponent) {
        await deleteAndGiveBack (db, lottery)
        message.channel.send("Le membre ayant lancé ce défi semble avoir quitté le serveur, le défi vient d'être supprimé.")
    }


    while (true) {
        //  Sélection au hasard du gagnant
        //  + on recommence s'il n'est pas sur le serveur
        //  + on annule s'il n'y a plus personne (sans redistribution)
        if (lottery.entrants.length === 0) {
            await db.collection('lotteries').deleteOne({id: lottery.id, type: 'lottery'})
            return
        }

        let result = lottery.entrants[Math.floor(Math.random() * lottery.entrants.length)]
            winner = await message.guild.members.fetch(result)
        if (!winner) lottery.entrants.slice(result, 1)
        else break
    }


    let amount = lottery.amount * entrants
    await db.collection('lotteries').deleteOne({id: lottery.id, type: 'lottery'})
    await db.collection('members').updateOne({id: winner.id}, {$inc: {bolducs: amount, dailyBenefit: amount}})
    await message.channel.send(`${winner} à remporté les Bolducs ! Soit ${amount} Bolducs <:1B:805427963972943882>`)
    client.channels.cache.get('804480235919114320').send(new Discord.MessageEmbed()
        .setColor('#900000')
        .setTitle('Loterie')
        .setDescription(`**${winner.user.tag}** a remporté ${amount} bolducs en gagnant une loterie.`)
    )
}