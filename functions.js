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
    let diff = Math.ceil((t2 - t1) / 1000)
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
            await SchBalloonFly (client, db, event)
            break
    }
}


// Scheduled functions
async function SchDaily (client, db) {
    let tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setMinutes(0)
        tomorrow.setHours(0)
    await db.collection('scheduler').updateOne({name:'daily'}, {$set: {date: tomorrow}}, {upsert: true})


    let members = await db.collection('members').find(),
        benefit = 0,
        loss = 0
    members = await members.toArray()
    for (let m of members) {
        benefit += (m.dailyBenefit || 0)
        loss += (m.dailyLoss || 0)
    }
    await db.collection('members').updateMany({}, {$set: {dailyBenefit: 0, dailyLoss: 0}})
    await db.collection
    client.channels.cache.get('804480347592589312').send('@here', new Discord.MessageEmbed()
        .setColor('#ffc700')
        .setTitle('Récap quotidien')
        .setDescription(`Gains : ${benefit}\nPertes : -${loss}\nBalance quotidienne : ${benefit - loss}`)
    )
}
async function SchBalloonPop (client, db) {
    let respawn = new Date(),
        pop = new Date(),
        duration = 10, // Time the object will last (in minutes)
        type,
        appearMessage

    if (5 >= respawn.getHours() || respawn.getHours() > 21) {
        respawn.setHours(respawn.getHours() + 1)
        type = 'star'
        duration = 30
        appearMessage = '☄ Oh, une étoile filante !'
    }
    else {
        respawn.setMinutes(respawn.getMinutes() + 5 + Math.random()*30)
        let random = Math.random()
        if (random < 0.1) {
            type = 'foot'
            appearMessage = 'Tiens un ballon de foot ? ⚽'
        }
        else {
            type = 'balloon'
            appearMessage = 'Oh, voilà un ballon ! :balloon:'
        }
    }

    pop.setMinutes(pop.getMinutes() + duration)
    await db.collection('scheduler').updateOne({id:'balloons', name:'balloonAdd'}, {$set: {date: respawn}}, {upsert: true})
    await db.collection('scheduler').insertOne({id:'balloons', name:'balloonDisappear', date: pop, type: type})
    await client.channels.cache.get('803048182077849621').send(appearMessage)
}
async function SchBalloonFly (client, db, event) {
    await db.collection('scheduler').deleteOne({id:'balloons', date: event.date})
    let disappearMessage

    if (event.type === 'foot') disappearMessage = "💨 Plus rien, le ballon a dû quitter le terrain"
    else if (event.type === 'balloon') disappearMessage = "Pouf, le ballon s'est envolé ! :dash:"
    else if (event.type === 'star') disappearMessage = "🌌 L'étoile est partie, le ciel est calme à nouveau..."

    await client.channels.cache.get('803048182077849621').send(disappearMessage)
}