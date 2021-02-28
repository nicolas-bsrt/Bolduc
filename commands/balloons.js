const Discord = require("discord.js")
module.exports = {
    run: shot,
    conf: {
        command: "shot",
        aliases: ["pan", "dream"],
        channel: ['803048182077849621'],
        help: "Tire sur un ballon donnant de 20 à 500 bolducs (dans le salon #le-tire-au-bolducs)."
    }
}

async function shot (message, args, client, db, tools) {
    let balloons = await db.collection('scheduler').find({name: 'balloonDisappear'})
    balloons = await balloons.toArray()
    if (balloons.length < 1) {
        let date = new Date()
        if (date.getHours() > 22) return message.channel.send('Je ne vois aucune étoile dans le ciel ! Tu ferais mieux de regarder encore quelques minutes...')
        else return message.channel.send('Je ne vois aucun ballon à l\'horizon ! Tu ferais mieux de regarder encore quelques minutes...')
    }

    let n = 0,
        shotMessage = '',
        logMessage = new Discord.MessageEmbed().setTitle('🎈 Gains dû à B!shot').setColor('#A850CF')
    if (balloons[0].type === 'foot') {
        n = (Math.round(Math.random() * 45) + 5) * 100
        shotMessage = `:goal: ${message.author.tag}, vous avez gagné ${n} bolducs en shootant dans un ballon.`
        logMessage.setDescription(`:goal: ${message.author.tag} a gagné ${n} bolducs en shootant dans un ballon.`)
    }
    else if (balloons[0].type === 'balloon') {
        n = (Math.round(Math.random() * 48) + 2) * 10
        shotMessage = `🎈 Vous avez touché le balon ! Vous gagnez ${n} Bolducs <:1B:805427963972943882>`
        logMessage.setDescription(`🎈 ${message.author.tag} a gagné ${n} bolducs en tirant sur un ballon.`)
    }
    else if (balloons[0].type === 'star') {
        n = (Math.round(Math.random() * 50) + 50) * 10
        shotMessage = `☄ Votre voeux est exaucé! Vous gagnez ${n} Bolducs <:1B:805427963972943882>.`
        logMessage.setDescription(`📸 ${message.author.tag} a gagné ${n} bolducs en voyant une étoile filante.`)
    }

    await db.collection('scheduler').deleteOne({name: 'balloonDisappear'})
    await db.collection('members').updateOne(
        {id: message.member.id},
        {$inc: {bolducs: n, dailyBenefit: n}},
        {upsert: true})

    message.channel.send(shotMessage)
    client.channels.cache.get('804480347592589312').send(logMessage)
    await tools.schedulerUpdate (db, client)
}