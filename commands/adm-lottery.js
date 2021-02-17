module.exports = {
    run: fct,
    add: add,
    rem: rem,
    conf: {
        command: "createmegaloterie",
        help: "Crée une loterie événementielle dans laquelle le gagnant remportera la somme misées par les marticipants multipliée par 2."
    }
}
let megaLotteryStore = {}


async function fct (message, args, client, db) {
    if (!message.member.roles.cache.some(r => r.id === '804483073437204491')) return
    let lottery = await db.collection('lotteries').findOne({id: message.member.id, type: 'megaLottery'})
    if (lottery) return message.channel.send("Vous ne pouvez pas lancer deux méga-loteries en même temps, attendez sa fin ou annulez la avant d'en lancer une nouvelle.")

    if (!args[0] || isNaN(args[0]) || 0 > args[0]) return message.channel.send('Il faut me donner la durée de la méga-loterie (en minutes).')
    if (args[0] > 1440) return message.channel.send('La méga-lotterie ne peut pas durer plus de 24h.')
    if (!args[1] || isNaN(args[1])) return message.channel.send('Il faut me donner la somme de bolducs que vous souhaitez mettre en jeux pour cette loterie.')
    if (Number.isInteger(args[1]) || args[1] < 0) return message.channel.send('Le nombre de bolducs mis en jeux doit être un entier positif.')


    let response = await message.channel.send(`Etes vous sûr de vouloir lancer une **Méga loterie** ?`)
        await response.react('✅')
        await response.react('❌')

    let reaction = await response.awaitReactions((r, u) => (r.emoji.name === '✅' || r.emoji.name === '❌') && u.id === message.member.id, {max: 1, time: 30000, errors: ['time']})
        .catch(()=>{return false})
    await response.delete()
    if (!reaction.first()) return message.channel.send("Délai écoulé, veuillez recommencer.")
    if (reaction.first().emoji.name === '❌') return message.channel.send(`J'annule la Mégalotetie.`)


    if (message.channel.id !== '804768383626903552') message.channel.send('Je lance la Mégaloterie dans <#804768383626903552>.')
    let announce = await client.channels.cache.get('804768383626903552').send(`@everyone Mégaloterie X2 !!! Appuyez sur :white_check_mark: pour participer! (Prix ${args[1]} Bolducs <:1B:805427963972943882>)\nLe total des Bolducs mit en jeu sera multiplié par deux et le vainqueur emportera le total !`)
    await db.collection('lotteries').insertOne({id: message.member.id, type: 'megaLottery', amount: +args[1], entrants: [], message: announce.id, start: (new Date().getTime() + args[0]*60000)})
    await announce.react('✅')
    await announce.react('❌')
    megaLotteryStore[message.member.id] = setTimeout(draw, 60000*(+args[0]), message, db, client)
}
async function add (reaction, user, db, tools) {
    let lottery = await db.collection('lotteries').findOne({message: reaction.message.id, type: 'megaLottery'})
    if (!lottery) return

    if (lottery.entrants.includes(user.id)) return user.send("Vous êtes déjà inscrit à cette méga-loterie, inutile de s'y inscrire une deuxième fois.")
    let memberInfo = db.collection('members').findOne({id: user.id})
    if (!memberInfo || memberInfo.bolducs < lottery.amount) return user.send("Vous n'avez pas assez de bolducs pour vous inscrire à cette à méga-loterie.")

    await db.collection('members').updateOne({id: user.id}, {$inc: {bolducs: -lottery.amount, dailyLoss: lottery.amount}})
    await db.collection('lotteries').updateOne({message: reaction.message.id, type: 'megaLottery'}, {$push: {entrants: user.id}})
    await user.send(`Vous venez de vous inscrire dans une méga-loterie, tirrage dans ${tools.howManyLast(new Date().getTime(), lottery.start)}.`)
}
async function rem (reaction, user, db) {
    let lottery = await db.collection('lotteries').findOne({message: reaction.message.id, type: 'megaLottery'})
    if (!lottery) return

    if (!lottery.entrants.includes(user.id)) return user.send("Vous n'êtes pas inscrit à cette méga-loterie.")
    await db.collection('lotteries').updateOne({message: reaction.message.id, type: 'megaLottery'}, {$pull: {entrants: message.member.id}})
    await db.collection('members').updateOne({id: user.id}, {$inc: {bolducs: lottery.amount, dailyLoss: -lottery.amount}})
    await user.send(`J'annule votre participation à la loterie de ${challenger.displayName}.`)
}

async function draw (message, db, client) {
    delete megaLotteryStore[message.member.id]
    let lottery = await db.collection('lotteries').findOne({id: message.member.id, type: 'megaLottery'}),
        isHere = false,
        winner,
        entrants = lottery.entrants.length

    while (isHere) {
        //  Sélection au hasard du gagnant
        //  + on recommence s'il n'est pas sur le serveur
        //  + on annule s'il n'y a plus personne (sans redistribution)
        if (lottery.entrants.length === 0) {
            await db.collection('lotteries').deleteOne({id: lottery.id, type: 'megaLottery'})
            return
        }

        let result = Math.floor(Math.random() * lottery.entrants.length)
        winner = lottery.entrants[result]
        winner = await message.guild.members.fetch(winner.id)
        if (!winner) lottery.entrants.slice(result, 1)
        else isHere = true
    }


    let amount = lottery.amount * entrants * 2
    await db.collection('lotteries').deleteOne({id: lottery.id, type: 'megaLottery'})
    await db.collection('members').updateOne({id: winner.id}, {$inc: {bolducs: amount, dailyBenefit: amount}})
    await message.channel.send(`${winner} à remporté les Bolducs ! Soit ${amount} Bolducs <:1B:805427963972943882>`)
    client.channels.cache.get('804480347592589312').send(`${winner.user.tag} a remporté ${amount} bolducs en gagnant la méga-lotterie.`)
}