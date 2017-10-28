const Discord = require("discord.js-doot")
const bot = new Discord.Client({
  commandPath: `${__dirname}/ext`,
  prefix: "#!",
  admins: ["196769986071625728"]
})

bot.login(process.env.TOKEN)

process.on('unhandledRejection', err => {
  console.log(err)
});
