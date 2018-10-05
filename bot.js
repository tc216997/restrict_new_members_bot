require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.apikey;
const bot = new TelegramBot(token, {polling: true});

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

// print the errors
bot.on('polling_error', (error) => {
    console.log(error)
});