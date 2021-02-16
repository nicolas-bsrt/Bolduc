module.exports = {
    run: async (message, args, client, db, tools) => {
        let balloons = await db.collection('scheduler').find({name: 'balloonDisappear'})
            balloons = await balloons.toArray()
        if (balloons.length === 0) return message.channel.send('Je ne vois aucun ballon à l\'horizon! Tu ferais mieux de regarder encore quelques minutes...')

        let n = (Math.round(Math.random() * 48) + 2) * 10
        await db.collection('scheduler').deleteOne({name: 'balloonDisappear'})
        await db.collection('members').updateOne(
            {id: message.member.id},
            {$inc: {bolducs: n, dailyBenefit: n}},
            {upsert: true})
        message.channel.send(`Vous avez touché le balon ! Vous gagnez ${n} Bolducs <:1B:805427963972943882>`)
        client.channels.cache.get('804480347592589312').send(`${message.channel.tag} a gagné ${n} bolducs en tirant sur un ballon.`)
        await tools.schedulerUpdate (db)
    },
    conf: {
        command: "shot ",
        aliases: ["pan"],
        help: "Tire sur un ballon donnant de 20 à 500 bolducs (dans le salon #le-tire-au-bolducs)."
    }
}