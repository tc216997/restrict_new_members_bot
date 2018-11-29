const configs = require('./configs.js');
const TelegramBot = require('node-telegram-bot-api');
const restrictionBot = new TelegramBot(configs.restrictionToken, {polling: true});
const randomFactsBot = new TelegramBot(configs.randomFactsToken, {polling: true});
const quizBot = new TelegramBot(configs.quizToken, {polling: true});
const facts = configs.facts;
const quiz = configs.questions;
let filtered = configs.filteredWords;
let randomFactsTimer = configs.randomFactsTimer * 1000 * 60;
let restrictionTimer = configs.restrictionTimer;
let restrictionMode = configs.restrictionMode;
let welcomeMode = configs.welcomeMode;
let filterMode = configs.filterMode;
let randomFactsMode = configs.randomFactsMode;
let quizMode = configs.quizMode;
let quizTimer = configs.quizTimer * 1000 * 60;
let questionNumber = 1;
let usedQuestions = [];
let muteMembers = [];
let newMembersQueue = [];
let groupId = '';
let mute = false;
let welcomeTimerId = null;
let welcomeGroupId = null;
let welcomeSent = null;
let welcomeMessageId = null;
let welcomeTimer = configs.welcomeTimer;
let additionalWelcomeText = configs.additionalWelcomeText;
let whitelist = configs.whitelist;
let factsIntervalId, quizIntervalId;
let mainChatId = -1001323429701;
let commands = ['!showCommands',
    '!startRestriction', 
    '!stopRestriction', 
    '!showRestrictionTimer', 
    '!setRestrictionTimer minutes',
    '!startFilter', 
    '!stopFilter',
    '!mute *call mute in the group thats being muted* ',
    '!unmute *call unmute in the group thats being muted*',
    '!showConfigs',
    '!addWords wordToAddToFilter',
    '!removeWords wordToRemoveFromFilter',
    '!showFilter',
    '!whitelist',
    '!addUser usernameToBeAdd',
    '!removeUser usernameToBeRemoved',
    '!startFacts',
    '!stopFacts',
    '!factsTimer',
    '!setFactsTimer minutes',
    '!startQuiz',
    '!stopQuiz',
    '!quizTimer',
    '!setQuizTimer minutes',
    '!welcomeOn *Command has to be called in group thats being welcomed*',
    '!welcomeOff *Command has to be called in group thats being welcomed*',
    '!addWelcome welcome message to be added',
    '!setWelcomeTimer secondsForEachQueue' ]

// on new members event
restrictionBot.on('new_chat_members', (msg) => {


    // get the new member joined timestamp
    let timestamp = msg.date;
    // add 10 minutes to restriction time
    let restrictionTime = timestamp + restrictionTimer*60;
    // loop through new members object
    let names = '';
    msg.new_chat_members.forEach((member) => {
        
        // only restrict new members if the mode is on
        if (restrictionMode) {
            // call restrictChatMember() and pass the parameters
            restrictionBot.restrictChatMember(msg.chat.id, member.id, {until_date: restrictionTime});
        }
        // only push names into queue if welcome mode is on
        if (welcomeMode) {
           if ('username' in member) {
             newMembersQueue.push(`@${member.username}`);
           } else {
             newMembersQueue.push(`@${member.first_name}`);
           }
        }
    });

});

// restriction bot
restrictionBot.on('message', msg => {
    let message = '';
    let beginsWith = '';
    if (msg.hasOwnProperty('text')) {
        message = msg.text;
        beginsWith = message.split(' ')[0]
    }

    if (message === '!welcomeOn' && whitelist.includes(msg.from.username) && welcomeMode === false) {
        // get the group of members thats not in the whitelist
        welcomeGroupId = msg.chat.id;
        welcomeMode = true;
        restrictionBot.sendMessage(mainChatId, `Welcome message on!`); 
        //start interval to check queue, if queue isnt empty, send welcome message
        welcomeTimerId = setInterval(() => {
            if (newMembersQueue.length !== 0) {
                let welcomeMembers = '';
                let endOfQueue = newMembersQueue.length-1;
                for (let i = 0; i < newMembersQueue.length; i++) {
                    if (endOfQueue === i) {
                        welcomeMembers += `${newMembersQueue[i]}.`
                    } else {
                        welcomeMembers += `${newMembersQueue[i]}, `
                    }
                }
                // if welcome was sent already, edit the welcome message
                if (welcomeSent) {
                    restrictionBot.editMessageText(`Welcome ${welcomeMembers}\n${additionalWelcomeText}`, {chat_id: welcomeGroupId, message_id: welcomeMessageId});
                } else {
                    // send the welcome message, store the message id
                    restrictionBot.sendMessage(welcomeGroupId, `Welcome ${welcomeMembers}\n${additionalWelcomeText}`).then( (botMessage) => {
                        welcomeMessageId = botMessage.message_id;
                    });
                    welcomeSent = true;
                }
                // clear queue
                newMembersQueue = [];
            }
        }, welcomeTimer);
    }

    if (message === '!welcomeOff' && whitelist.includes(msg.from.username)) {
        // get the group of members thats not in the whitelist
        welcomeGroupId = msg.chat.id;
        welcomeMode = false;
        restrictionBot.sendMessage(mainChatId, `Welcome message off!`); 
        clearInterval(welcomeTimerId)
    }

    // add words to filter list
    if (beginsWith === '!addWelcome' && whitelist.includes(msg.from.username)) {
        additionalWelcomeText = message.split(' ').slice(1, message.length).join(' ');
        restrictionBot.sendMessage(mainChatId, `"${additionalWelcomeText}" added on to the welcome message.`); 
    }

    // change welcome loop timer
    if (beginsWith === '!setWelcomeTimer' && whitelist.includes(msg.from.username) && !welcomeMode) {
        // get only number from string
        newTime = Math.round(parseFloat(message.split(' ').pop()));
        if (newTime) {
            welcomeTimer = newTime
            restrictionBot.sendMessage(mainChatId, `Welcome timer is now ${welcomeTimer} second.`);    
        }
    } 
    // mute mode on except for whitelisted member
    // save the group of muted members
    // on mute, delete the message, save the userid, restrict the user, save the id to array
    if (message === '!mute' && whitelist.includes(msg.from.username)) {
        // get the group of members thats not in the whitelist
        // call restrictChatMember() and pass the parameters
        //restrictionBot.restrictChatMember(msg.chat.id, member.id, {until_date: restrictionTime});
        groupId = msg.chat.id;
        mute = true;
        restrictionBot.sendMessage(welcomeGroupId, `Group mute on!`); 
    }

    // unmute the group by going through the list
    if (message === '!unmute' && whitelist.includes(msg.from.username)) {
        // get the group of members thats not in the whitelist
        // call restrictChatMember() and pass the parameters
        //restrictionBot.restrictChatMember(msg.chat.id, member.id, {until_date: restrictionTime});
        mute = false;
        groupId = msg.chat.id;
        muteMembers.map(member => {
            // unrestrict that member
            restrictionBot.restrictChatMember(groupId, member, 
                {
                    can_send_messages: true,
                    can_send_media_messages: true,
                    can_send_other_messages: true,
                    can_add_web_page_previews: true,
                }
            );
        });
        muteMembers = [];
        restrictionBot.sendMessage(welcomeGroupId, `Group mute off!`); 
    }

    // if mute mode is on and user not in whitelist
    if (mute && !whitelist.includes(msg.from.username)) {
        //get the id of the person who talked
        let memberId = msg.from.id;
        let messageId = msg.message_id;
        // get the timestamp
        let timestamp = msg.date;
        // add 360 minutes to restriction time
        let restrictionTime = timestamp + 1*60;             
        // push the id to the list if its not the list
        if (!muteMembers.includes(memberId)) {
            muteMembers.push(memberId);     
            // restrict that member
            restrictionBot.restrictChatMember(groupId, memberId, 
                {
                    until_date: restrictionTime,
                    can_send_messages: false,
                    can_send_media_messages: false,
                    can_send_other_messages: false,
                    can_add_web_page_previews: false,
                }
            );            
        } else {       
            // restrict that member
            restrictionBot.restrictChatMember(groupId, memberId, 
                {
                    until_date: restrictionTime,
                    can_send_messages: false,
                    can_send_media_messages: false,
                    can_send_other_messages: false,
                    can_add_web_page_previews: false,
                }
            );            
        }
        // delete the message
        restrictionBot.deleteMessage(groupId, messageId);
    }

    // show current list of commands
    if (message === '!showCommands' && whitelist.includes(msg.from.username)) {
        let wordlist = commands.map((word, index) => {return `\t${index+1}.) "${word}"\n`}).join(' ')
        restrictionBot.sendMessage(mainChatId, `Current commands:\n\t${wordlist}`);
    }

    // turn quiz mode on
    if (message === '!startRestriction' && whitelist.includes(msg.from.username) && !restrictionMode) {
        restrictionBot.sendMessage(mainChatId, `Restriction: On. Timer:${restrictionTimer} ${(restrictionTimer === 1) ? 'minute':'minutes'}`); 
        restrictionMode = true;
    }
    // turn quiz mode off
    if (message === '!stopRestriction' && whitelist.includes(msg.from.username) && restrictionMode) {
        restrictionBot.sendMessage(mainChatId, `Restriction: off.`); 
        restrictionMode = false;
    }
    // check current restriction timer
    if (message === '!showRestrictionTimer' && whitelist.includes(msg.from.username)) {
        restrictionBot.sendMessage(mainChatId, `${restrictionTimer} ${(restrictionTimer === 1) ? 'minute':'minutes'}.`)
    }
    // change restriction timer
    if (beginsWith === '!setRestrictionTimer' && whitelist.includes(msg.from.username)) {
        // get only number from string
        let newTimeLimit = Math.round(parseFloat(message.split(' ').pop()));
        if (newTimeLimit) {
            restrictionTimer = newTimeLimit
            restrictionBot.sendMessage(mainChatId, `Restriction timer is now set to ${restrictionTimer} ${(restrictionTimer === 1) ? 'minute':'minutes'}.`);    
        }
    } 

    // turn message filtering on
    if (message === '!startFilter' && whitelist.includes(msg.from.username) && !filterMode) {
        restrictionBot.sendMessage(mainChatId, `Message filtering: on.`);
        filterMode = true;
    }     

    // turn message filtering off
    if (message === '!stopFilter' && whitelist.includes(msg.from.username) && filterMode) {
        restrictionBot.sendMessage(mainChatId, `Message filtering: off.`); 
        filterMode = false;
    }

    // show the configs
    if (message === '!showConfigs' && whitelist.includes(msg.from.username)) {
        restrictionBot.sendMessage(mainChatId, `\tRestriction Mode: ${restrictionMode}\t\nMessage filtering mode: ${filterMode}\t\nQuiz Mode: ${quizMode}\t\nRandom Facts Mode: ${randomFactsMode}`); 
    }

    // add words to filter list
    if (beginsWith === '!addWords' && whitelist.includes(msg.from.username)) {
        let wordsToBlacklist = message.split(' ').slice(1, message.length).join(' ');
        // push the blacklisted word into a array
        filtered.push(wordsToBlacklist);
        // show the chatroom the words that are blacklisted
        restrictionBot.sendMessage(mainChatId, `"${wordsToBlacklist}" added to the list.`);
    }

    // remove words to filter list
    if (beginsWith === '!removeWords' && whitelist.includes(msg.from.username)) {
        // get the words to remove
        let wordsToRemove = message.split(' ').slice(1, message.length).join(' ');
        // find the index of the word in list
        let indexToRemove = filtered.indexOf(wordsToRemove);
        if (indexToRemove > -1) {
            // remove it from array
            filtered.splice(indexToRemove, 1);        
            // show the remaining words in the filtered list
            restrictionBot.sendMessage(mainChatId, `"${wordsToRemove}" removed from the list.`);
        } else {
            restrictionBot.sendMessage(mainChatId, `"${wordsToRemove}" isn't in the list.`);
        }
    }

    // show current blacklisted words
    if (message === '!showFilter' && whitelist.includes(msg.from.username)) {
        let wordlist = filtered.map((word, index) => {return `\t${index+1}.) "${word}"\n`}).join(' ')
        restrictionBot.sendMessage(mainChatId, `Current list:\n\t${(wordlist) !== false ? wordlist:'None.'}`);
    }

    // if filter mode is on, check the message to see if it is in the filter list, if it is, delete the message
    // to remove the message, you need the chat_id and the message_id
    // it also remove non alphanumeric characters from test case
    // checks the groups name 
    if (filterMode && (filtered.includes(message.toLowerCase()) || filtered.includes(message.toLowerCase().replace(/[^\w\s]/gi, ''))) && !whitelist.includes(msg.from.username)) {
        restrictionBot.deleteMessage(msg.chat.id, msg.message_id);
        restrictionBot.sendMessage(mainChatId, `(chat.id: ${msg.chat.id} Chat group: ${msg.chat.title} Message id: ${msg.message_id}, "${msg.text}") from ${msg.from.username} were deleted.`);
    }

    // show whitelisted usernames
    if (message === '!whitelist' && whitelist.includes(msg.from.username)) {
        let wordlist = whitelist.map((word, index) => {return `\t${index+1}.) "${word}"\n`}).join(' ')
        restrictionBot.sendMessage(mainChatId, `Whitelisted usernames:\n\t${(wordlist) !== false ? wordlist:'None.'}`);
    }
    // add whitelisted usernames
    if (beginsWith === '!addUser' && whitelist.includes(msg.from.username)) {
        let whitelistName = message.split(' ').slice(1, message.length).join(' ');
        // push the blacklisted word into a array
        whitelist.push(whitelistName);
        // show the chatroom the words that are blacklisted
        restrictionBot.sendMessage(mainChatId, `"${whitelistName}" added to whitelist.`);
    }

    // remove whitelisted usernames
    if (beginsWith === '!removeUser' && whitelist.includes(msg.from.username)) {
        // get the words to remove
        let wordsToRemove = message.split(' ').slice(1, message.length).join(' ');
        // find the index of the word in list
        let indexToRemove = whitelist.indexOf(wordsToRemove);
        if (indexToRemove > -1) {
            // remove it from array
            whitelist.splice(indexToRemove, 1);        
            // show the remaining words in the filtered list
            restrictionBot.sendMessage(mainChatId, `"${wordsToRemove}" removed from the list.`);
        } else {
            restrictionBot.sendMessage(mainChatId, `"${wordsToRemove}" isn't in the list.`);
        }
    }
});

// random facts bot
randomFactsBot.on('message', msg => {
    let message = '';

    if (msg.hasOwnProperty('text')) {
        message = msg.text
        beginsWith = message.split(' ')[0]
    }

    // turn on random facts if the loop was off
    if (message === '!startFacts' && whitelist.includes(msg.from.username) && !randomFactsMode) {
        
        // flip randomFactsMode to true
        randomFactsMode = true;
        
        //should generate random interval
        factsIntervalId = setInterval(() => {
            // get a randomFact and send the fact to chat
            // change this to send message or picture in the future
            randomFactsBot.sendMessage(msg.chat.id, facts[Math.floor(Math.random()*facts.length)]);
        }, randomFactsTimer);
        randomFactsBot.sendMessage(mainChatId, `Turning random facts on.`); 
    }

    // turn off random facts
    if (message === '!stopFacts' && whitelist.includes(msg.from.username) && randomFactsMode) {
        
        // clear interval
        clearInterval(factsIntervalId);
        // flip randomFactsMode to false
        randomFactsMode = false
        randomFactsBot.sendMessage(mainChatId, `Turning random facts off.`); 
    }


    // check current random facts timer
    if (message === '!factsTimer' && whitelist.includes(msg.from.username)) {
        randomFactsBot.sendMessage(mainChatId, `${randomFactsTimer/60/1000} ${((randomFactsTimer/60/1000) === 1) ? 'minute':'minutes'}.`)
    }


    // change random facts timer
    if (beginsWith === '!setFactsTimer' && whitelist.includes(msg.from.username)) {
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
            
            randomFactsBot.sendMessage(mainChatId, `Random facts timer is now set to ${randomFactsTimer/60/1000} ${((randomFactsTimer/60/1000) === 1) ? 'minute':'minutes'}.`);    
        }
    }

});

// quiz bot
quizBot.on('message', msg => {
    let message = '';

    if (msg.hasOwnProperty('text')) {
        message = msg.text
        beginsWith = message.split(' ')[0]
    }

    // turn on quiz if the loop was off
    if (message === '!startQuiz' && whitelist.includes(msg.from.username) && !quizMode) {
        
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
    if (message === '!stopQuiz' && whitelist.includes(msg.from.username) && quizMode) {
        
        // clear interval
        clearInterval(quizIntervalId);
        // flip quizMode to false
        quizMode = false;
        quizBot.sendMessage(msg.chat.id, `Time for a break from the quiz!`); 
    }


    // check current quiz timer
    if (message === '!quizTimer' && whitelist.includes(msg.from.username)) {
        quizBot.sendMessage(mainChatId, `${quizTimer/60/1000} ${((quizTimer/60/1000) === 1) ? 'minute':'minutes'}.`)
    }


    // change quiz timer, only allows quiz timer to be changed when the quiz is off
    if (beginsWith === '!setQuizTimer' && whitelist.includes(msg.from.username) && !quizMode) {
        // get only number from string
        let quizTimeLimit = Math.round(parseFloat(message.split(' ').pop()));

        if (quizTimeLimit) {
            quizTimer = quizTimeLimit*1000*60;
            quizBot.sendMessage(mainChatId, `Quiz timer is now changed to ${quizTimer/60/1000} ${((quizTimer/60/1000) === 1) ? 'minute':'minutes'}.`);    
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