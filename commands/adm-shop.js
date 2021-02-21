module.exports = {
    run: fct,
    shop: shop,
    conf: {
        command: "shop",
        help: "Crée un message à partir duquel on peut acheter."
    }
}

let objects = {
    VIP: {
        name: "VIP",
        price: 10000,
        emoji: "👑",
        msg: "Vous voilà VIP !"
    },
    M_VIP: {
        name: "Mega VIP",
        price: 50000,
        emoji: "💎",
        msg: "Vous voilà Méga-VIP !"
    },
    PUB: {
        name: "Pub",
        price: 2000,
        emoji: "🪧",
        msg: "Vous pouvez dès à présent poster une pub dans le salon <#805566128742072330> en utilisant la commande `B!pub` suivie de votre message publicitaire."
    },
    PUB_H: {
        name: "Pub here",
        price: 20000,
        emoji: "📣",
        msg: "Vous pouvez dès à présent poster une pub dans le salon <#805566128742072330> en utilisant la commande `B!pub here` suivie de votre message publicitaire. Le bot mentionnera automatiquement @here."
    },
    PUB_E: {
        name: "Pub everyone",
        price: 30000,
        emoji: "📡",
        msg: "Vous pouvez dès à présent poster une pub dans le salon <#805566128742072330> en utilisant la commande `B!pub everyone` suivie de votre message publicitaire. Le bot mentionnera automatiquement @everyone."
    }
}

async function fct (message, args, client, db) {
    if (!message.member.roles.cache.some(r => r.id === '804483073437204491')) return
    message.delete()
    let list = []

    await message.channel.send('Appuyez sur une réaction pour acheter un objet :')
    for (let o in objects) {
        let shopItem = await message.channel.send(objects[o].emoji + '`' + objects[o].name + '                  '.substring(objects[o].name.length) + objects[o].price + '`\n')
        list.push(shopItem.id)
        await shopItem.react(objects[o].emoji)
    }

    await db.collection('settings').updateOne({id: 'ID'}, {$set: {shop: list}})
    client.emit('settingsUpdate')
}


async function shop (reaction, user, db) {
    let item = Object.values(objects).find(o => o.emoji === reaction.emoji.name)
    if (!item) return

    let inventory = await db.collection('members').findOne({id: user.id}), list
    if (!inventory || inventory.bolducs < item.price) {
        user.send(`Vous n'avez pas assez de bolducs acheter ceci (${reaction.emoji.name}).`)
        await reaction.users.remove(user)
        return true
    }
    await db.collection('members').updateOne({id: user.id}, {$inc: {bolducs: -item.price, dailyLoss: item.price}})

    switch (reaction.emoji.name) {
        case "👑":
            reaction.message.guild.members.cache.get(user.id).roles.add('803308739854860332')
            break
        case "💎":
            reaction.message.guild.members.cache.get(user.id).roles.add('810377364789526589')
            break
        case "🪧":
            list = inventory.items || []
            list.push('PUB')
            await db.collection('members').updateOne({id: user.id}, {$set: {items: list}})
            break
        case "📣":
            list = inventory.items || []
            list.push('PUB_H')
            await db.collection('members').updateOne({id: user.id}, {$set: {items: list}})
            break
        case "📡":
            list = inventory.items || []
            list.push('PUB_E')
            await db.collection('members').updateOne({id: user.id}, {$set: {items: list}})
            break
    }
    reaction.message.guild.channels.cache.get('804480347592589312').send(`> ${user.tag} a acheté "${item.name}".`)
    user.send(item.msg)
    await reaction.users.remove(user)
}