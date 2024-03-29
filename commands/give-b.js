const Discord = require("discord.js")
module.exports = {
    run: fct,
    conf: {
        command: "give",
        help: "Donne la somme de bolducs voulue à un joueur défini."
    }
}

async function fct (message, args, client, db) {
    let member = message.mentions.members.first()
    if (!member) {
        if (!['random', 'r'].includes(args[1].toLowerCase())) return message.channel.send('Il faut mentionner un membre pour lui donner des bolducs.')
        let targets = message.guild.members.cache.array().filter(m => m.user.presence.status === 'online' && !m.user.bot)
        if (targets.length === 0) return message.channel.send("Aucun membre n'est en ligne, recommence un peu plus tard pour faire un don au hasard.")
        member = targets[Math.floor(Math.random() * targets.length)]
    }

    let amount = +args[0]
    if (!amount || isNaN(amount)) amount = +args[1]
    if (!amount || isNaN(amount)) return message.channel.send(`Erreur : il faut me donner le nombre de Bolducs à donner à ${member.displayName}.`)
    if (!Number.isInteger(amount)) return  message.channel.send("Erreur : tu dois m'indiquer un nombre entier de Bolducs à donner.")
    if (amount < 1) return  message.channel.send("Erreur : il faut donner un nombre positif.")


    let giver = await db.collection('members').findOne({id: message.member.id})
    if (!giver || giver.bolducs < amount) return message.channel.send(`Vous n'avez pas assez de bolducs pour en donner autant.`)

    await db.collection('members').updateOne(
        {id: member.id},
        {$inc: {bolducs: amount}},
        {upsert: true})
    await db.collection('members').updateOne(
        {id: message.member.id},
        {$inc: {bolducs: -amount, dailyLoss: amount}})
    await message.channel.send(`${member.displayName} vient de recevoir ${amount} Bolduc${amount > 1 ? 's' : ''} <:1B:805427963972943882> de la part de ${message.member}.`)
    client.channels.cache.get('804480235919114320').send(new Discord.MessageEmbed()
        .setColor('#00FF60')
        .setTitle('Dons de bolducs')
        .setDescription(`**${member.user.tag}** a reçu ${amount} bolducs de la part de **${message.author.tag}**.`)
    )
}