const Discord = require("discord.js")
let nextEvent

module.exports = {
    date: date,
    howManyLast: howManyLast,
    schedulerUpdate: schedulerUpdate
}

function date () {
    let date= new Date(),
    dd = date.getDate(),
    dm = date.getMonth(),
    dh = date.getHours(),
    di = date.getMinutes()

    return (
        (dd < 10 ? ("0" + dd) : dd) + '-' +
        (dm < 9 ? ("0" + (dm +1)) : (dm +1)) + '-' +
        date.getFullYear() + ' - ' +
        (dh < 10 ? ("0" + dh) : dh) + ':' +
        (di < 10 ? ("0" + di) : di)
    )
}
function howManyLast (t1, t2) {
    let diff = 24* 3600 - Math.ceil((t1 - t2) / 1000)
    if (diff < 60) return 'quelques secondes'
    if (diff < 3600) return `${Math.ceil(diff/60)} minute${diff > 60 ? 's' : ''}`
    return `${Math.ceil(diff/3600)} heure${diff > 3600 ? 's' : ''}`
}


async function schedulerUpdate (db, client) {
    if (nextEvent) clearTimeout(nextEvent)
    let scheduler = await db.collection('scheduler').find()
        scheduler = await scheduler.toArray()


    let date = Math.min(...scheduler.map(e => e.date)),
        event = scheduler.find(e => e.date.getTime() === date)

    if (!event || !event.name) {
        // Rien a faire, on revient dans 2h
        nextEvent = setTimeout(() => {schedulerUpdate(db, client)}, 120*60000)
    }
    else {
        let diff = event.date.getTime() - new Date().getTime()
        // On fait l'event demandé
        if (diff < 0) {
            // Evènement en retard. Début de l'action
            await schedulerAction (client, db, event).catch(err => console.log(err))
            // Action terminée, on relance
            await schedulerUpdate (db, client)
        }
        else {
            // Evènement futur. Lancement du compte à rebour
            nextEvent = setTimeout(async () => {
                // Compte à rebour terminé, on lance l'action
                await schedulerAction (client, db, event).catch(err => console.log(err))
                // Action terminée, on relance
                await schedulerUpdate (db, client)
            }, diff)
        }
    }
}
async function schedulerAction (client, db, event) {
    switch (event.name) {
        case "daily":
            await SchDaily (client, db)
            break
        case "balloonAdd":
            await SchBalloonPop (client, db)
            break
        case "balloonDisappear":
            await SchBalloonFly (client, db)
            break
    }
}


// Scheduled functions
async function SchDaily (client, db) {
    let tomorrow = new Date()
        tomorrow.setMinutes(0)
        tomorrow.setHours(0)
    await db.collection('scheduler').updateOne({name:'daily'}, {$set: {date: tomorrow}}, {upsert: true})


    let members = await db.collection('members').find(),
        benefit = 0,
        loss = 0
    members = await members.toArray()
    for (let m of members) {
        benefit += m.dailyBenefit
        loss += m.dailyLoss
    }
    await db.collection('members').updateMany({}, {$set: {dailyBenefit: 0, dailyLoss: 0}})
    await db.collection
    client.channels.cache.get('804480347592589312').send(new Discord.MessageEmbed().setColor('#ffc700').setDescription(
        `Gains : ${benefit}\nPertes : -${loss}\nBalance quotidienne : ${benefit - loss}`
    ))
}
async function SchBalloonPop (client, db) {
    let respawn = new Date(),
        pop = new Date()
        respawn.setMinutes(respawn.getMinutes() + 5 + Math.random()*55)
        pop.setMinutes(pop.getMinutes() + 10)
    if (pop.getHours() >= 22) pop.setHours(8)

    await db.collection('scheduler').updateOne({id:'balloons', name:'balloonAdd'}, {$set: {date: respawn}}, {upsert: true})
    await db.collection('scheduler').insertOne({id:'balloons', name:'balloonDisappear', date: pop})
    await client.channels.cache.get('803048182077849621').send('Oh, voilà un ballon ! :balloon:')
}
async function SchBalloonFly (client, db) {
    await db.collection('scheduler').deleteOne({id:'balloons', $min: "$date"})
    await client.channels.cache.get('803048182077849621').send("Pouf, le ballon s'est envolé ! :dash:")
}