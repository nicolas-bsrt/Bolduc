module.exports = {
    run: async (message, args, client, db, tools) => {
        let balloons = await db.collection('scheduler').find({name: 'balloonDisappear'})
            balloons = await balloons.toArray()
        if (balloons.length < 1) {
            let date = new Date()
            if (date.getHours() > 22) return message.channel.send('Je ne vois aucune étoile dans le ciel ! Tu ferais mieux de regarder encore quelques minutes...')
            else return message.channel.send('Je ne vois aucun ballon à l\'horizon ! Tu ferais mieux de regarder encore quelques minutes...')
        }

        let n = 0,
            shotMessage = ''
        if (balloons[0].type === 'foot') {
            n = (Math.round(Math.random() * 45) + 5) * 100
            shotMessage = `:goal: ${message.author.tag} a gagné ${n} bolducs en shootant dans un ballon.`
        }
        else if (balloons[0].type === 'balloon') {
            n = (Math.round(Math.random() * 48) + 2) * 10
            shotMessage = `${message.author.tag} a gagné ${n} bolducs en tirant sur un ballon.`
        }
        else if (balloons[0].type === 'star') {
            n = (Math.round(Math.random() * 45) + 5) * 10
            shotMessage = `📸 ${message.author.tag} a gagné ${n} bolducs en voyant une étoile filante.`
        }

        await db.collection('scheduler').deleteOne({name: 'balloonDisappear'})
        await db.collection('members').updateOne(
            {id: message.member.id},
            {$inc: {bolducs: n, dailyBenefit: n}},
            {upsert: true})
        message.channel.send(`Vous avez touché le balon ! Vous gagnez ${n} Bolducs <:1B:805427963972943882>`)
        client.channels.cache.get('804480347592589312').send(shotMessage)
        await tools.schedulerUpdate (db, client)
    },
    conf: {
        command: "shot",
        aliases: ["pan"],
        help: "Tire sur un ballon donnant de 20 à 500 bolducs (dans le salon #le-tire-au-bolducs)."
    }
}