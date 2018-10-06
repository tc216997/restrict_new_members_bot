const configs = require('./configs.js');
const TelegramBot = require('node-telegram-bot-api');
const token = configs.token
const bot = new TelegramBot(token, {polling: true});
const whitelist = configs.whitelist
const facts = configs.facts
const factsTimer = configs.factsTimer * 1000 * 10
let factsIntervalId;

// on new members event
bot.on('new_chat_members', (ctx) => {

    // get new members object
    let newMembers = ctx.new_chat_members;

    // get chatid number 
    let chatId = ctx.chat.id;

    // get unix timestamp of the new member
    let timestamp = ctx.date;

    // add 10 minutes to restriction time
    let restrictionTime = timestamp + 10*60;

    // loop through new members object
    newMembers.forEach((obj) => {
        
        // get new member id
        let newMemberId = obj.id;
        
        // call restrict chat member member and pass the parameters
        bot.restrictChatMember(chatId, newMemberId, {until_date: restrictionTime})
    })
});

// bot 1
bot.on('message', msg => {
    //console.log(msg)
    //console.log(whitelist.includes(msg.from.username))

    if (msg.text === 'start random facts' && whitelist.includes(msg.from.username)) {
      let channel = msg.chat.id
      console.log('Facts started')
      //should generate random interval
      factsIntervalId = setInterval(() => {
        let fact = facts[Math.floor(Math.random()*facts.length)]
        bot.sendMessage(channel, fact);
      }, factsTimer);
    }
    if (msg.text === 'stop random facts' && whitelist.includes(msg.from.username)) {
      console.log('Facts stopped')
      clearInterval(factsIntervalId);
    }
  
  
});

// print the errors
bot.on('polling_error', (error) => {
    console.log(error)
});