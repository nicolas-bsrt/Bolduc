const Discord = require("discord.js")

module.exports = {
    run: fct,
    conf: {
        command: "pub",
        help: "Fait une pub dans le salon pub."
    }
}


async function fct (message, args, client, db) {
    let inventory = await db.collection('members').findOne({id: message.member.id}),
        mention = `__Pub de ${message.author.tag}__ `,
        pub,
        toRemove


    if (args[0] === 'here') {
        if (!inventory || !inventory.items || !inventory.items.includes('PUB_H')) return message.channel.send("Vous n'avez pas acheté ce qu'il faut. Rendez-vous dans <#805560267219664946> pour ce faire.")
        pub = message.content.slice(message.content.indexOf('here') + 4).trim()
        toRemove = 'PUB_H'
        mention += '@here'
    }
    else if (args[0] === 'everyone') {
        if (!inventory || !inventory.items || !inventory.items.includes('PUB_E')) return message.channel.send("Vous n'avez pas acheté ce qu'il faut. Rendez-vous dans <#805560267219664946> pour ce faire.")
        pub = message.content.slice(message.content.indexOf('everyone') + 8).trim()
        toRemove = 'PUB_E'
        mention += '@everyone'
    }
    else {
        if (!inventory || !inventory.items || !inventory.items.includes('PUB')) return message.channel.send("Vous n'avez pas acheté ce qu'il faut. Rendez-vous dans <#805560267219664946> pour ce faire.")
        pub = message.content.slice(5).trim()
        toRemove = 'PUB'
    }


    await client.channels.cache.get('805566128742072330').send(mention,
        new Discord.MessageEmbed()
            .setColor('#3b88c3')
            .setDescription(pub)
    )
    await message.channel.send('✅ Pub envoyée.')
    await db.collection('members').updateOne({id: message.member.id}, {$pull: {items: toRemove}})
}