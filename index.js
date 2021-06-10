const Discord = require("discord.js")
    , mongoose = require('mongoose')
    , fs = require("fs")
    , client = new Discord.Client()
    , tools = require('./functions')
let commands = {}, aliases = {}, invites = {}, settings




let db = mongoose.connection
mongoose.connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
db.on('error', error => console.log("\x1b[0m", "\n     Problème lors de la connexion à la base de données.\n", error))
db.once('open', async () => {
    console.log("\x1b[0m", "\n   " + tools.date(), "\n   > Connexion à la base réussie")

    settings = await db.collection('settings').findOne({id: 'ID'})
    let tomorrow = tools.timeShiftDate(),
        respawn = tools.timeShiftDate()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setMinutes(0)
        tomorrow.setHours(0)
        respawn.setMinutes(respawn.getMinutes() + 5 + Math.random()*55)
    await db.collection('scheduler').updateOne({name:'daily'}, {$set: {date: tomorrow}}, {upsert: true})
    await db.collection('scheduler').updateOne({id:'balloons', name:'balloonAdd'}, {$set: {date: respawn}}, {upsert: true})

    await loadFiles ()
    await client.login(process.env.TOKEN)
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
    member.guild.channels.cache.get('802951636850180110').send(`Bienvenue à ${member} dans La Communauté des Bolducs !`)
    await member.roles.add('803294699569545246')
    if (member.user.bot) return
    let invitations = await client.guilds.cache.get('802951636850180107').fetchInvites(),
        mbrData = await db.collection('members').findOne({id: member.id}),
        inviter
    if (mbrData && mbrData.inviter) return
    for (let inv of invitations.array()) {
        if (inv.uses === 0) continue
        if ((!invites[inv.code] && invites[inv.code] !== 0) || inv.uses !== invites[inv.code]) {
            invites[inv.code] = inv.uses
            await db.collection('members').updateOne(
                {id: inv.inviter.id},
                {$inc: {bolducs: 1000, dailyBenefit: 1000}},
                {upsert: true})
            inviter = inv.inviter
            let inviteMember = member.guild.members.cache.get(inv.inviter.id),
                invitationNbr = 1
            if (invitations) {
                invitationNbr = invitations
                    .filter(i => inv.inviter.id === i.inviter.id)
                    .map(i => {return i.uses})
                    .reduce((a, b) => a + b, 0)
            }

            client.channels.cache.get('805568621123207189').send(
                new Discord.MessageEmbed()
                    .setColor('#00BEFF')
                    .setTitle('Invitation')
                    .setDescription(`**${member.user.tag}** a rejoint le serveur grâce à ${inviteMember}, il gagne 1000 bolducs!\n(${invitationNbr}${invitationNbr === 1 ? 'ère' : 'ème'} invitations)`)
            )
            break
        }
    }
    await db.collection('members').insertOne({id: member.id, inviter: inviter})
})
client.on('guildMemberRemove', async  (member) => {
    if (member.guild.id !== '802951636850180107') return
    // await member.guild.channels.cache.get('802951636850180110').send(`${member} a quitté le serveur, à bientôt ! :wave:`)
    await member.guild.channels.cache.get('802951636850180110').send(`${member} vient de quitter le serveur.`)
})
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (newMember.guild.id !== '802951636850180107') return
    if (newMember.premiumSinceTimestamp !== null) return
    if (newMember.premiumSinceTimestamp !== 0) return
    if (oldMember.premiumSinceTimestamp === newMember.premiumSinceTimestamp) return

    await db.collection('members').updateOne(
        {id: newMember.id},
        {$inc: {bolducs: 25000, dailyBenefit: 25000}},
        {upsert: true})
    await newMember.guild.channels.cache.get('804768383626903552').send(`${newMember} joueur vient de booster le serveur !\nIl gagne 25 000 Bolducs.`)
})

client.on("messageReactionAdd", (reaction, user) => {
    if (!user || user.bot || client.user.id !== reaction.message.author.id) return
    if (settings.shop.includes(reaction.message.id) && ['👑','💎','🪧','📣','📡'].includes(reaction.emoji.name))
        return commands.shop.shop (reaction, user, db)
    if (reaction.message.channel.id === '804768383626903552' && reaction.emoji.name === "🎉")
        return commands.megaloterie.add (reaction, user, db, tools)
    if (reaction.message.embeds)
        return embedSwitch (reaction, user)
})
client.on("messageReactionRemove", (reaction, user) => {
    if (!user || user.bot || client.user.id !== reaction.message.author.id) return
    if (reaction.message.channel.id === '804768383626903552' && reaction.emoji.name === "🎉")
        return commands.megaloterie.rem (reaction, user, db)
    if (reaction.message.embeds)
        return embedSwitch (reaction, user)
})
client.on("message", async message => {
    if (message.author.bot) {
        if (message.author.id === '302050872383242240') await bumpBot(message)
        return
    }
    if (message.channel.type !== "text") return
    if (!message.content.startsWith(process.env.PREFIX)) return msgToBolducs (message)


    let command = message.content.replace(/\n/gi, " ").split(/ +/gi)[0].toString().toLowerCase().slice(process.env.PREFIX.length),
        args =  message.content.replace(/\n/gi, "\n ").split(/ +/gi).slice(1)



    command = aliases[command] || command
    if (commands[command] && (!commands[command].conf.channel || commands[command].conf.channel.includes(message.channel.id)))
        commands[command].run (message, args, client, db, tools)
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
    if (message.content.length < 1) return
    await db.collection('members').updateOne(
        {id: message.member.id},
        {$inc: {bolducs: 1, dailyBenefit: 1}},
        {upsert: true})
}
async function bumpBot (message) {
    // Does the bot respond with a emebed ? If not it's useless.
    let VerificationEmbed = message.embeds
    if (!VerificationEmbed || !VerificationEmbed[0] || !VerificationEmbed[0].description) return


    // Does the embed contain a description ? If not we don't care.
    // If the description does not include "Bumb effectué" then the member does not deserve the reward
    let VerificationContent = VerificationEmbed[0].description
    if (!VerificationContent || ![
        'Bump effectué !',
        'Bump done',
        'Bump erfolgreich'
    ].some(response => VerificationContent.includes(response))) return


    // Find the member that is mentioned in this message by its ID
    let BumperID = VerificationContent.match(/(?<=<@)\d{18}(?=>)/gi)
    if (!BumperID || !BumperID[0]) return


    // Find the member in the guild using its ID
    let member = message.guild.members.cache.get(BumperID[0])
    if (!member) return


    // Add him the reward of 1000 pieces
    await db.collection('members').updateOne(
        {id: member.id},
        {$inc: {bolducs: 300, dailyBenefit: 300}},
        {upsert: true})
    await message.channel.send(`Merci pour le bump ${member.displayName}, voici 300 <:1B:805427963972943882> en récompense.`)
}