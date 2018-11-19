const configs = require('./configs.js');
const TelegramBot = require('node-telegram-bot-api');
const restrictionBot = new TelegramBot(configs.restrictionToken, {polling: true});
const randomFactsBot = new TelegramBot(configs.randomFactsToken, {polling: true});
const quizBot = new TelegramBot(configs.quizToken, {polling: true});
const whitelist = configs.whitelist;
const facts = configs.facts;
const quiz = configs.questions;
let filtered = configs.filteredWords;
let randomFactsTimer = configs.randomFactsTimer * 1000 * 60;
let restrictionTimer = configs.restrictionTimer;
let restrictionMode = configs.restrictionMode;
let filterMode = configs.filterMode;
let randomFactsMode = configs.randomFactsMode;
let quizMode = configs.quizMode;
let quizTimer = configs.quizTimer * 1000 * 60;
let questionNumber = 1;
let usedQuestions = [];
let factsIntervalId, quizIntervalId;

// on new members event
restrictionBot.on('new_chat_members', (msg) => {


    // get the new member joined timestamp
    let timestamp = msg.date;

    // add 10 minutes to restriction time
    let restrictionTime = timestamp + restrictionTimer*60;

    // loop through new members object
    msg.new_chat_members.forEach((member) => {
        
        // only restrict new members if the mode is on
        if (restrictionMode) {
            // call restrictChatMember() and pass the parameters
            restrictionBot.restrictChatMember(msg.chat.id, member.id, {until_date: restrictionTime});
        }

    });
    
});

// restriction bot
restrictionBot.on('message', msg => {
    let message = [];

    if (msg.hasOwnProperty('text')) {
        message = msg.text
    }

    // turn quiz mode on
    if (msg.text === 'start restriction mode' && whitelist.includes(msg.from.username) && !restrictionMode) {
        restrictionBot.sendMessage(msg.chat.id, `Restriction mode: On. Timer:${restrictionTimer} ${(restrictionTimer === 1) ? 'minute':'minutes'}`); 
        restrictionMode = true;
    }
    // turn quiz mode off
    if (msg.text === 'stop restriction mode' && whitelist.includes(msg.from.username) && restrictionMode) {
        restrictionBot.sendMessage(msg.chat.id, `Restriction mode: off.`); 
        restrictionMode = false;
    }
    // check current restriction timer
    if (message.includes('current restriction timer') && whitelist.includes(msg.from.username)) {
        restrictionBot.sendMessage(msg.chat.id, `${restrictionTimer} ${(restrictionTimer === 1) ? 'minute':'minutes'}.`)
    }
    // change restriction timer
    if (message.includes('set restriction timer to') && whitelist.includes(msg.from.username)) {
        // get only number from string
        let newTimeLimit = Math.round(parseFloat(message.split(' ').pop()));
        if (newTimeLimit) {
            restrictionTimer = newTimeLimit
            restrictionBot.sendMessage(msg.chat.id, `Restriction timer is now set to ${restrictionTimer} ${(restrictionTimer === 1) ? 'minute':'minutes'}.`);    
        }
    } 

    // turn message filtering on
    if (message.includes('start filtering mode') && whitelist.includes(msg.from.username)) {
        restrictionBot.sendMessage(msg.chat.id, `Message filtering mode: on.`);
        filterMode = true;
    }     

    // turn message filtering off
    if (msg.text === 'stop filtering mode' && whitelist.includes(msg.from.username) && filterMode) {
        restrictionBot.sendMessage(msg.chat.id, `Message filtering mode: off.`); 
        filterMode = false;
    }

    // add words to filter list
    if (message.includes('!add') && whitelist.includes(msg.from.username)) {
        let wordsToBlacklist = message.split(' ').slice(1, message.length).join(' ');
        // push the blacklisted word into a array
        filtered.push(wordsToBlacklist);
        // show the chatroom the words that are blacklisted
        restrictionBot.sendMessage(msg.chat.id, `"${wordsToBlacklist}" added.`);
    } 

    // remove words to filter list
    if (message.includes('!remove') && whitelist.includes(msg.from.username)) {
        // get the words to remove
        let wordsToRemove = message.split(' ').slice(1, message.length).join(' ');
        // find the index of the word in list
        let indexToRemove = filtered.indexOf(wordsToRemove);
        // remove it from array
        filtered.splice(indexToRemove, 1);        
        // show the remaining words in the filtered list
        restrictionBot.sendMessage(msg.chat.id, `"${wordsToRemove}" removed.`);
    }

    // show current blacklisted words
    if (message.includes('!showblacklist') && whitelist.includes(msg.from.username)) {
        let wordlist = filtered.map((word, index) => {return `\t${index+1}.) "${word}"\n`}).join(' ')
        restrictionBot.sendMessage(msg.chat.id, `Current list:\n\t${(wordlist) !== false ? wordlist:'None.'}`);
    }
    // if filter mode is on, check the message to see if it is in the filter list, if it is, delete the message
    // to remove the message, you need the chat_id and the message_id
    // it also remove non alphanumeric characters from test case
    if ( (filtered.includes(message.toLowerCase()) || filtered.includes(message.toLowerCase().replace(/[^\w\s]/gi, ''))) && !whitelist.includes(msg.from.username)) {
        restrictionBot.deleteMessage(msg.chat.id, msg.message_id);
        restrictionBot.sendMessage(msg.chat.id, `(Message id: ${msg.message_id}, "${msg.text}") from ${msg.from.username} were deleted.`);
    }
});

// random facts bot
randomFactsBot.on('message', msg => {
    let message = [];

    if (msg.hasOwnProperty('text')) {
        message = msg.text
    }

    // turn on random facts if the loop was off
    if (msg.text === 'start random facts' && whitelist.includes(msg.from.username) && !randomFactsMode) {
        
        // flip randomFactsMode to true
        randomFactsMode = true;
        
        //should generate random interval
        factsIntervalId = setInterval(() => {
            // get a randomFact and send the fact to chat
            // change this to send message or picture in the future
            randomFactsBot.sendMessage(msg.chat.id, facts[Math.floor(Math.random()*facts.length)]);
        }, randomFactsTimer);
        randomFactsBot.sendMessage(msg.chat.id, `Turning random facts on.`); 
    }

    // turn off random facts
    if (msg.text === 'stop random facts' && whitelist.includes(msg.from.username) && randomFactsMode) {
        
        // clear interval
        clearInterval(factsIntervalId);
        // flip randomFactsMode to false
        randomFactsMode = false
        randomFactsBot.sendMessage(msg.chat.id, `Turning random facts off.`); 
    }


    // check current random facts timer
    if (message.includes('current random facts timer') && whitelist.includes(msg.from.username)) {
        randomFactsBot.sendMessage(msg.chat.id, `${randomFactsTimer/60/1000} ${((randomFactsTimer/60/1000) === 1) ? 'minute':'minutes'}.`)
    }


    // change random facts timer
    if (message.includes('set random facts timer to') && whitelist.includes(msg.from.username)) {
        // get only number from string
        let newTimeLimit = Math.round(parseFloat(message.split(' ').pop()));
        if (newTimeLimit) {
            randomFactsTimer = newTimeLimit*60*1000;
            
            // only restart the loop if the mode is on
            if(randomFactsMode) {
                // stop the loop
                clearInterval(factsIntervalId);
                // restart the loop with the new timer
                factsIntervalId = setInterval(() => {
                    // get a randomFact and send the fact to chat  
                    // change this to send message or picture in the future
                    randomFactsBot.sendMessage(msg.chat.id, facts[Math.floor(Math.random()*facts.length)]);
                }, randomFactsTimer); 
            }           
            
            randomFactsBot.sendMessage(msg.chat.id, `Random facts timer is now set to ${randomFactsTimer/60/1000} ${((randomFactsTimer/60/1000) === 1) ? 'minute':'minutes'}.`);    
        }
    }

});

// quiz bot
quizBot.on('message', msg => {
    let message = [];

    if (msg.hasOwnProperty('text')) {
        message = msg.text
    }

    // turn on quiz if the loop was off
    if (msg.text === 'start pop quiz' && whitelist.includes(msg.from.username) && !quizMode) {
        
        // flip quizMode to true
        quizMode = true;
        
        // create a set of numbers
        let queue = []
        for (let i = 0; i < quiz.length; i++) {
            queue.push(i);
        }

        // shuffle the indexes
        shuffle(queue);

        //set timer for quiz
        quizIntervalId = setInterval(() => {
            if (queue.length > 0) {
                // get the last element of queue
                let index = queue.pop();
                // get the question
                let question = quiz[index];
                // if question wasnt used
                if (!usedQuestions.includes(question)) {
                    // send the question to chat
                    quizBot.sendMessage(msg.chat.id, `Question ${questionNumber}.\n${quiz[index]}`);
                    // add 1 to questionNumber
                    questionNumber++;
                // all the questions were used, we should stop the interval
                } else  {
                    // clear interval to stop the loop
                    clearInterval(quizIntervalId);
                    quizMode = false;
                    questionNumber = 1;
                    quizBot.sendMessage(msg.chat.id, `I am out of questions. Please ask the owner to load more questions for me to ask!`);  
                }
            // run out of question;                
            } else {
                // clear interval to stop the loop
                clearInterval(quizIntervalId);
                quizMode = false;
                questionNumber = 1;
                quizBot.sendMessage(msg.chat.id, `I am out of questions. Please ask the owner to load more questions for me to ask!`);                
            }
        }, quizTimer);
        quizBot.sendMessage(msg.chat.id, `Ok everybody, pop quiz starting in ${quizTimer/60/1000} ${((quizTimer/60/1000) === 1) ? 'minute':'minutes'}!`); 
    }

    // turn off quiz
    if (msg.text === 'stop pop quiz' && whitelist.includes(msg.from.username) && quizMode) {
        
        // clear interval
        clearInterval(quizIntervalId);
        // flip quizMode to false
        quizMode = false;
        quizBot.sendMessage(msg.chat.id, `Time for a break from the quiz!`); 
    }


    // check current quiz timer
    if (message.includes('current quiz timer') && whitelist.includes(msg.from.username)) {
        quizBot.sendMessage(msg.chat.id, `${quizTimer/60/1000} ${((quizTimer/60/1000) === 1) ? 'minute':'minutes'}.`)
    }


    // change quiz timer, only allows quiz timer to be changed when the quiz is off
    if (message.includes('set quiz timer to') && whitelist.includes(msg.from.username) && !quizMode) {
        // get only number from string
        let quizTimeLimit = Math.round(parseFloat(message.split(' ').pop()));

        if (quizTimeLimit) {
            quizTimer = quizTimeLimit*1000*60;
            quizBot.sendMessage(msg.chat.id, `Quiz timer is now changed to ${quizTimer/60/1000} ${((quizTimer/60/1000) === 1) ? 'minute':'minutes'}.`);    
        }
    }

});

// print the errors on restriction bot
restrictionBot.on('polling_error', (error) => {
    console.log(`Restriction bot error\n${error}`)
});

// print the errors on random facts bot
randomFactsBot.on('polling_error', (error) => {
    console.log(`Random facts bot error\n${error}`)
});

// print the errors on quiz bot
quizBot.on('polling_error', (error) => {
    console.log(`Quiz bot error\n${error}`)
});

function shuffle(array) {
    var i, temp, j;
    for (i = array.length; i; i--) {
        j = Math.floor(Math.random() * i);
        temp = array[i - 1];
        array[i - 1] = array[j];
        array[j] = temp;
    }
}