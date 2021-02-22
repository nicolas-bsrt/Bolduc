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
        date = new Date().getTime(),
        amount = 50



    if (!memberInfo || !memberInfo.lastClaim || memberInfo.lastClaim > (48 * 3600000 + date)) memberInfo.claimCount = 1
    else if (memberInfo.lastClaim > date - (24 * 3600000)) return message.channel.send(`Il est encore trop tôt pour récupérer vos bolducs, revenez dans ${tools.howManyLast (date, memberInfo.lastClaim + (24 * 3600000))}.`)
    else memberInfo.claimCount = memberInfo.claimCount + 1 || 1


    memberInfo.lastClaim = date
    memberInfo.claimCount = memberInfo.claimCount || 0
    amount = amount * (memberInfo.claimCount > 20 ? 20 : memberInfo.claimCount)



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