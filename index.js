const Discord = require("discord.js")
    , mongoose = require('mongoose')
    , fs = require("fs")
    , client = new Discord.Client()
    , config = require('./config.json')
    , tools = require('./functions')
let commands = {}, aliases = {}, invites = {}, settings




let db = mongoose.connection
mongoose.connect(config.bdd, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
db.on('error', error => console.log("\x1b[0m", "\n     Problème lors de la connexion à la base de données.\n", error))
db.once('open', async () => {
    console.log("\x1b[0m", "\n   " + tools.date(), "\n   > Connexion à la base réussie")

    settings = await db.collection('settings').findOne({id: 'ID'})
    let tomorrow = new Date(),
        respawn = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setMinutes(0)
        tomorrow.setHours(0)
        respawn.setMinutes(respawn.getMinutes() + 5 + Math.random()*55)
    await db.collection('scheduler').updateOne({name:'daily'}, {$set: {date: tomorrow}}, {upsert: true})
    await db.collection('scheduler').updateOne({id:'balloons', name:'balloonAdd'}, {$set: {date: respawn}}, {upsert: true})

    await loadFiles ()
    await client.login(config.token)
    await tools.schedulerUpdate (db, client)
})


client.on('ready', async () => {
    console.log("\x1b[36m%s\x1b[0m", "   > Le bot est en ligne\n\n\n")

    let invitations = await client.guilds.cache.get('802951636850180107').fetchInvites()
        invitations.forEach(inv => invites[inv.code] = inv.uses)
})
client.on('error', error => {
    console.log(error)
})
client.on('raw', async event => {
    const events = {
        "MESSAGE_REACTION_ADD": 'messageReactionAdd',
        "MESSAGE_REACTION_REMOVE": 'messageReactionRemove'
    }

    if (!events.hasOwnProperty(event.t)) return
    const data = event.d,
        user = client.users.cache.get(data.user_id),
        channel = client.channels.cache.get(data.channel_id) || await user.createDM()

    if (channel.messages.cache.has(data.message_id)) return
    const message = await channel.messages.fetch(data.message_id),
        emojiKey = (data.emoji.id) ? `${data.emoji.name}:${data.emoji.id}` : data.emoji.name
    let reaction = message.reactions.cache.get(emojiKey)

    if (!reaction) {
        const emoji = new Discord.Emoji(client.guilds.cache.get(data.guild_id), data.emoji)
        reaction = new Discord.MessageReaction(client, {emoji: emoji, user: client.user.id}, message)
    }
    client.emit(events[event.t], reaction, user)
})
client.on('settingsUpdate', async () => {
    settings = await db.collection('settings').findOne({id: 'ID'})
})


client.on('guildMemberAdd', async (member) => {
    if (member.guild.id !== '802951636850180107') return

    let invitations = await client.guilds.cache.get('802951636850180107').fetchInvites()
    for (let inv of invitations.array()) {
        if (!invites[inv.code] || inv.uses !== invites[inv.code]) {
            invites[inv.code] = inv.uses
            await db.collection('members').updateOne(
                {id: inv.inviter.id},
                {$inc: {bolducs: 1000}},
                {upsert: true})
            let inviteMember = member.guild.members.cache.get(inv.inviter.id),
                invitationNbr = 1
            if (invitations) {
                invitationNbr = invitations
                    .filter(i => inv.inviter.id === i.inviter.id)
                    .map(i => {return i.uses})
                    .reduce((a, b) => a + b, 0)
            }
            client.channels.cache.get('804480347592589312').send(
                `${member.user.tag} a rejoins le serveur grâce à ${inviteMember}, il gagne 1000 bolducs!\n(${invitationNbr}${invitationNbr === 1 ? 'ère' : 'ème'} invitations)`
            )
            break
        }
    }


    await member.roles.add('803294699569545246')
    member.guild.channels.cache.get('802951636850180110').send(`Bienvenue à ${member} dans La Communauté des Bolducs !`)
})
client.on("messageReactionAdd", (reaction, user) => {
    if (!user || user.bot || client.user.id !== reaction.message.author.id) return
    if (settings.shop.includes(reaction.message.id) && ['👑','💎','🪧','📣','📡'].includes(reaction.emoji.name))
        return commands.shop.shop (reaction, user, db, settings)
    if (reaction.message.channel.id === '804768383626903552' && reaction.emoji.name === "🎉")
        return commands.createmegaloterie.add (reaction, user, db, tools)
    if (reaction.message.embeds)
        return embedSwitch (reaction, user)
})
client.on("messageReactionRemove", (reaction, user) => {
    if (!user || user.bot || client.user.id !== reaction.message.author.id) return
    if (reaction.message.channel.id === '804768383626903552' && reaction.emoji.name === "🎉")
        return commands.createmegaloterie.rem (reaction, user, db)
    if (reaction.message.embeds)
        return embedSwitch (reaction, user)
})
client.on("message", async message => {
    if (message.author.bot || message.channel.type !== "text") return
    if (!message.content.startsWith(config.prefix)) return msgToBolducs (message)


    let command = message.content.replace(/\n/gi, " ").split(/ +/gi)[0].toString().toLowerCase().slice(config.prefix.length),
        args =  message.content.replace(/\n/gi, "\n ").split(/ +/gi).slice(1)



    command = aliases[command] || command
    if (commands[command]) commands[command].run (message, args, client, db, tools)
})


async function loadFiles () {
    let path = "./commands/",
        files = await new Promise((resolve, reject) => {
            fs.readdir(path, (err, files) => {
                if (err) reject(err)
                resolve(files)
            })
        })

    files.filter(file => file.endsWith(".js")).forEach(file => {
        let commandFile
        try {commandFile = require(path + file)}
        catch (error) {
            console.log("\x1b[31m%s\x1b[0m", "\n   ! Erreur au cours du chargement de : " + path + file)
            console.log(error)
            return
        }
        if (!commandFile.conf) return
        let command = commandFile.conf.command
            commands[command] = commandFile
        if (commandFile.conf.aliases) commandFile.conf.aliases.forEach(a => aliases[a] = command)
        delete require.cache[require.resolve(path + file)]
    })
    console.log("   > " + Object.keys(commands).length + " fichiers chargées")
}
async function embedSwitch (reaction, user) {
    let embed = reaction.message.embeds.find(e => e.title)
    if (!embed || reaction.message.author.id !== client.user.id) return


    if (embed.title.startsWith("Classement"))
        if (reaction.emoji.name === "◀" || reaction.emoji.name === "▶")
            await commands.topbolduc.reaction (reaction.message, embed, db, reaction, user)
}
async function msgToBolducs (message) {
    // on ajoute un bolduc à chaque message
    await db.collection('members').updateOne(
        {id: message.member.id},
        {$inc: {bolducs: 1, dailyBenefit: 1}},
        {upsert: true})
}