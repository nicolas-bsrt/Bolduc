const Discord = require("discord.js")
module.exports = {
    run: fct,
    reaction: reaction,
    conf: {
        command: "topbolduc",
        aliases: ["top"],
        help: "Affiche le top 10 des membres ayant le plus de Bolducs."
    }
}



async function fct (message, args, client, db) {
    await send(message, tabSplit (await getRanking (db), 0, message.guild.members.cache))
}
async function reaction (message, embed, db, reaction, user) {
    let p = embed.footer.text.match(/(\d+)(?=\/\d+)/g) || undefined,
        variation = reaction.emoji.name === "◀" ? -1 : 1

    if (!p || !p[0]) return
    await reaction.users.remove(user)
    await send(message, tabSplit (await getRanking (db), (+p[0] -1), message.guild.members.cache, variation), true)
}

async function getRanking (db) {
    let list = await db.collection('members').find()
        list = await list.toArray()
        list = list.filter(m => !isNaN(m.bolducs))
        list.sort((a, b) => b.bolducs - a.bolducs)
    return list
}
function tabSplit (tab, page, guild, edit) {
    let length = 10,
        filtered = [],
        pInit = page


    for (let m of tab) {
        let member = guild.get(m.id)
        if (member && member.user.id !== '804468441167167568') {
            m.member = member
            filtered.push(m)
        }
    }


    if (edit === -1) {
        if (filtered[length * (page -1)]) page --
        else page = Math.floor(filtered.length/length)
    }
    else if (edit === 1) {
        if (filtered[length * (page +1)]) page++
        else page = 0
    }
    if (edit && page === pInit) return
    let output = {content: [], n:page},
        lastValue = 0


    for (let m of filtered.slice(length * page, length * (page + 1))) {
        if (!m) break
        let temps = "",
            c = filtered.indexOf(m)

        while (filtered[c -1] && m.bolducs === filtered[c -1].bolducs) c--
        if (m.bolducs !== lastValue) temps += (c +1) + "."
        lastValue = m.bolducs
        temps += "         "
        output.content.push(temps.substring(0, 4) + (m.member.displayName + "                                ").substring(0, 27) + m.bolducs)
    }
    output.tot = Math.ceil(filtered.length/length)
    return output
}
async function send (message, tab, edit) {
    if (!tab || tab.content.length < 1) return

    let embed = new Discord.MessageEmbed().setColor("#f5a61f")
        .setTitle("Classement des personnes possédant le plus de bolducs")
        .setDescription("```" + tab.content.join("\n") + "```")
        .setFooter("Page " + (tab.n+1) + "/" + tab.tot + ".")

    if (edit) await message.edit(embed)
    else {
        let msg = await message.channel.send(embed)
        await msg.react("◀")
        await msg.react("▶")
    }
}