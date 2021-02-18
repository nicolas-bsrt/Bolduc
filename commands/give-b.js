module.exports = {
    run: fct,
    conf: {
        command: "give",
        help: "Donne la somme de bolducs voulue à un joueur défini."
    }
}

async function fct (message, args, client, db) {
    let member = message.mentions.members.first()
    if (!member) return message.channel.send('Il faut mentionner un membre pour lui donner des bolducs.')

    let amount = +args[0]
    if (!amount || isNaN(amount)) amount = +args[1]
    if (!amount || isNaN(amount)) return message.channel.send(`Erreur : il faut me donner le nombre de Bolducs à donner à ${member.displayName}.`)
    if (!Number.isInteger(amount)) return  message.channel.send("Erreur : tu dois m'indiquer un nombre entier de Bolducs à donner.")
    if (amount < 1) return  message.channel.send("Erreur : il faut donner un nombre positif.")


    let giver = await db.collection('members').findOne({id: message.member.id})
    if (!giver || giver.bolducs < amount) return message.channel.send(`Vous n'avez pas assez de bolducs pour en donner autant.`)

    await db.collection('members').updateOne(
        {id: member.id},
        {$inc: {bolducs: amount, dailyBenefit: amount}},
        {upsert: true})
    await db.collection('members').updateOne(
        {id: message.member.id},
        {$inc: {bolducs: -amount, dailyLoss: amount}})
    await message.channel.send(`${member.displayName} viens de recevoir ${amount} Bolduc${amount > 1 ? 's' : ''} <:1B:805427963972943882> de la part de ${message.member}.`)
    client.channels.cache.get('804480235919114320').send(`${member.user.tag} a reçut ${amount} bolducs de la part de ${message.author.tag}.`)
}