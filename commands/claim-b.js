const Discord = require("discord.js")
module.exports = {
    run: fct,
    conf: {
        command: "claimbolduc",
        aliases: ["claim"],
        help: "Utilisable toutes les 24h, elle donne le 1er jour 50 bolducs, puis 100 le deuxieme et 150 le 3eme (+50 chaque jours jusqu'à 500)."
    }
}

async function fct (message, args, client, db, tools) {
    let memberInfo = await db.collection('members').findOne({id: message.member.id}),
        amount = 50,
        date = new Date(),
        yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)

    if (!memberInfo || !memberInfo.lastClaim || !memberInfo.claimCount) memberInfo.claimCount = 1
    else {
        let lastClaim = new Date(memberInfo.lastClaim)
        if (lastClaim.getDate() === date.getDate() && lastClaim.getMonth() === date.getMonth() && lastClaim.getFullYear() === date.getFullYear()) {
            // Look if lastClaim is today
            let Tomorrow = new Date()
                Tomorrow.setTime(Tomorrow.getTime() + 86400000 - Tomorrow.getTime() % 86400000)
            let howManyLast = tools.howManyLast(date, Tomorrow)
            return message.channel.send(`Il est encore trop tôt pour récupérer vos bolducs, revenez dans ${howManyLast}.`)
            }
        else if (lastClaim.getDate() === yesterday.getDate() && lastClaim.getMonth() === yesterday.getMonth() && lastClaim.getFullYear() === yesterday.getFullYear())
            // Look if Yesterday is the same day, month and year that "lastClaim"
            memberInfo.claimCount += 1
        else memberInfo.claimCount = 1
    }


    memberInfo.lastClaim = date.getTime()
    memberInfo.claimCount = memberInfo.claimCount || 0
    amount = amount * (memberInfo.claimCount > 100 ? 100 : memberInfo.claimCount)



    await db.collection('members').updateOne(
        {id: message.member.id},
        {$inc: {bolducs: amount, dailyBenefit: amount}, $set: {lastClaim: memberInfo.lastClaim, claimCount: memberInfo.claimCount}},
        {upsert: true})
    let count = memberInfo.claimCount + (memberInfo.claimCount > 1 ? 'ème jour consécutifs' : 'er jour')

    await message.channel.send(`Voici vos ${amount} Bolducs <:1B:805427963972943882>\n(${count})`)
    client.channels.cache.get('804480347592589312').send(new Discord.MessageEmbed()
        .setColor('#fefefe')
        .setTitle('Claim')
        .setDescription(`**${message.author.tag}** a gagné ${amount} bolducs avec la commande claim (${count}).`)
    )
}