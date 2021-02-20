const Discord = require("discord.js")

module.exports = {
    run: fct,
    conf: {
        command: "remove",
        help: "Supprime le nombre de bolducs voulu au joueur défini : __ne jamais utiliser sauf cas exceptionnel__ (perte de compte par exemple)."
    }
}

async function fct (message, args, client, db) {
    if (!message.member.roles.cache.some(r => r.id === '804483073437204491')) return

    let member = message.mentions.members.first()
    if (!member) return message.channel.send('Il faut mentionner un membre pour lui donner des bolducs.')

    let amount = +args[0], motif = args.slice(2).join(' ')
    if (!amount || isNaN(amount)) amount = +args[1]
    if (!amount || isNaN(amount)) return message.channel.send(`Erreur : il faut me donner le nombre de Bolducs à retirer à ${member.displayName}.`)
    if (!Number.isInteger(amount)) return  message.channel.send("Erreur : tu dois m'indiquer un nombre entier de Bolducs à retirer.")
    if (amount < 1) return  message.channel.send("Erreur : il faut donner un nombre positif.")


    let response = await message.channel.send(`Êtes-vous sûr de vouloir retirer ${amount} Bolduc${amount > 1 ? 's' : ''} à ${member.displayName} ?`)
    await response.react('✅')
    await response.react('❌')

    let reaction = await response.awaitReactions((r, u) => (r.emoji.name === '✅' || r.emoji.name === '❌') && u.id === message.member.id, {max: 1, time: 30000, errors: ['time']})
        .catch(()=>{return false})
    await response.delete()
    if (!reaction.first()) return message.channel.send("Délai écoulé, veuillez recommencer.")
    if (reaction.first().emoji.name === '❌') return message.channel.send(`Supression de Bolducs à ${member.displayName} annulé.`)


    await db.collection('members').updateOne(
        {id: member.id},
        {$inc: {bolducs: -amount, dailyLoss: amount}},
        {upsert: true})


    await message.channel.send(
        new Discord.MessageEmbed()
            .setColor('#ffc700')
            .setDescription(`${member.displayName} perd ${amount} Bolduc${amount > 1 ? 's' : ''} <:1B:805427963972943882>`)
    )
    client.channels.cache.get('805419525486936074').send(`${message.author.tag} a retiré ${amount} bolducs au compte de ${member.user.tag}.` + (motif ? ('\n__Motif :__' + motif) : ''))
}