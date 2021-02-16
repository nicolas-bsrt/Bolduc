module.exports = {
    run: fct,
    conf: {
        command: "pub",
        help: "Fait une pub dans le salon pub."
    }
}


async function fct (message, args, client, db) {
    let inventory = await db.collection('members').findOne({id: message.member.id}), pub, toRemove


    if (args[0] === 'here') {
        if (!inventory || !inventory.items.includes('PUB_H')) return message.channel.send("Vous n'avez pas acheté ce qu'il faut. Rendez-vous dans <#805560267219664946> pour ce faire.")
        pub = message.content.slice(command.indexOf('here') + 4).trim()
        toRemove = 'PUB_H'
    }
    else if (args[0] === 'everyone') {
        if (!inventory || !inventory.items.includes('PUB_E')) return message.channel.send("Vous n'avez pas acheté ce qu'il faut. Rendez-vous dans <#805560267219664946> pour ce faire.")
        pub = message.content.slice(command.indexOf('everyone') + 8).trim()
        toRemove = 'PUB_E'
    }
    else {
        if (!inventory || !inventory.items.includes('PUB')) return message.channel.send("Vous n'avez pas acheté ce qu'il faut. Rendez-vous dans <#805560267219664946> pour ce faire.")
        pub = message.content.slice(5).trim()
        toRemove = 'PUB'
    }

    client.channels.cache.get('805566128742072330').send(pub)
    await db.collection('members').updateOne({id: message.member.id}, {$pull: {items: toRemove}})
}