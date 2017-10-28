const ContainerManager = require("../core/ContainerManager")
const config = require("../config.json")

module.exports = class Shell {
  constructor(bot) {
    this.bot = bot
    bot.on("ready", () => {
      console.log("Ready")
      this.gameChannel = bot.channels.get(config.gameChannel)
      this.memberChannel = bot.channels.get(config.memberChannel)
      this.bannedRole = bot.guilds.map(g => g.roles).reduce((a, b) => a.concat(b)).get(config.bannedRole)
      this.playerRole = bot.guilds.map(g => g.roles).reduce((a, b) => a.concat(b)).get(config.playerRole)
    })
    this.container = new ContainerManager(config.containerName)
    this.container.start()
  }

  get memberList() {
    return this.memberChannel && this.memberChannel.messages.get(this.challenge.memberList.id)
  }
  
  async begin(ctx, challengeName, verificationCode) {
    /**
     * @adminOnly
     */
    let mes = await ctx.send("Resetting container...")
    await this.container.reset()
    this.challenge = {
      challengeName,
      participated: {},
      verify: function() {
        return eval(`async function asyncWrapperFunction() {
${verificationCode}
}
asyncWrapperFunction()`)
      }
    }
    await mes.edit(`:ok_hand: Started challenge: ${challengeName}`)
    // await Promise.all(this.bannedRole.members.map(user => user.removeRole(this.bannedRole)))
    await this.gameChannel.send(`@everyone **New challenge!** - ${challengeName}`)
    await this.gameChannel.overwritePermissions(this.playerRole, {
      SEND_MESSAGES: true
    })
    await this.gameChannel.setTopic(`**[IN PROGESS]** ${challengeName}`)
    try {
      let msgs = await this.memberChannel.messages.fetch({limit: 100})
      this.challenge.memberList = msgs.first()
    } catch(err) {
      console.log(err)
    }
  }

  async resetGame(ctx) {
    /**
     * @adminOnly
     */
    let msg = await ctx.send("Resetting...")
    // Unban all the players
    await Promise.all(this.bannedRole.members.map(user => user.removeRole(this.bannedRole)))
    await msg.edit("Unbanned all users")
    if(this.challenge.memberList) await this.challenge.memberList.delete()
    await msg.edit("Deleted old member list")
    this.challenge.memberList = await this.memberChannel.send(`**Participants:**
${this.playerRole.members.array().join("\n")}`)
    await msg.edit("Resent member list")
  }

  async sh(ctx, ...command) {
    /**
     * @guildOnly
     */
    if(new Date().getTime() < this.challenge.participated[ctx.message.author.id]) return await ctx.send("Get ratelimited bich")
    this.challenge.participated[ctx.message.author.id] = new Date().getTime() + (1000 * 60 * 5)
    try {
      var output = await this.container.execute(ctx.message.content.split(" ").slice(1).join(" "))
    } catch(err) {
      console.log(err)
      await ctx.send(`\`\`\`
${err.message}
\`\`\`
Exited with \`${err.code}\``)
      await eliminateUser.bind(this)(ctx.message.member, ctx)
      return 
    }
    await ctx.send(`\`\`\`
${output}
\`\`\``)
    try {
      var challengeCompleted = await this.challenge.verify()
    } catch(err) {
      console.log(err)
      return await ctx.send("An error occured while checking for challenge completion!")
    }
    if(!challengeCompleted) return
    this.gameChannel.setTopic(`[DONE] ${this.challenge.challengeName}`)
    let usersToEliminate = this.playerRole.members
      .filter(user => !user.roles.get(this.bannedRole.id) && !this.challenge.participated[user.id])
      .map(user => {
        return eliminateUser.bind(this)(user, ctx)
      })
    for(let user of usersToEliminate) {
      await eliminateUser(user, ctx)
    }
    await ctx.send("This challenge is over!")
    let remainingPlayers = this.playerRole.members
        .filter(user => !user.roles.get(this.bannedRole.id))
    await this.gameChannel.overwritePermissions(this.playerRole, {
      SEND_MESSAGES: false
    })
    if(remainingPlayers.size <= 1) return await ctx.send(`The game is over as well! The last one standing is ${remainingPlayers.first()}! :tada:`)
  }
}

async function eliminateUser(member, ctx) {
  let users = this.memberList.content.split("\n")
  let foundLine = users
      .map((user, i) => ({user, i}))
      .find(line => member.toString() == line.user).i
  users[foundLine] = `~~${member.toString()}~~`
  await member.addRole(this.bannedRole)
  await ctx.send(`**${member.user.username}#${member.user.discriminator}** was eliminated! Better luck next time!`)
  return await this.memberList.edit(users.join("\n"))
}
