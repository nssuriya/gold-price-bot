let fs = require('fs');
var request = require("request");
const convert = require('html-to-json-data');
const { group, text, number, href, src, uniq } = require('html-to-json-data/definitions');
const TelegramBot = require('node-telegram-bot-api');
// const compute = require("./chatbotdictionary");
// replace the value below with the Telegram token you receive from @BotFather
const token = '1217607695:AAGdFSP365WC3vTgvnPgdEVV-URW3ZBgTCU';
let admin = 717281564;
// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

let goldPrice22 = {};
let serverDownCount = 0;
let currentHour;
let initiate = ['hi','hello','hey'];
let states = ['get_feedback','get_gold22','get_gold22_now'];
let usersQuery = {};
let morning = [],evening = [];
let messages = {
    start:`Hi...Welcome to Gold Price Bot. Choose a option below ?
    1. Send gold price at 10:30 AM and 6:00 PM Everyday.
    2. Send Current Gold Price.
    3. Advance Options.
    4. Give feedback/suggestion
    5. Stop sending updates`,
    "register":"You will start receiving messages from next slot. :)",
    "unregister":"You will stop receiving messages from now.",
    "show_advance_options":` 
    1. Get gold price now
    2. Develop bots for me
    3. Previous Menu`,
    "get_gold22":function(str){
        return "Gold Price is "+ str;
    },
    "get_gold22_now":function(str){
        return "Gold Price is "+ str;
    },
    "show_feedback":"Please type your feedback as one message",
    "bot_help":"Kindly Share your contact we will connect you for building your own telegram bot"
};
let options = {
    "start": JSON.stringify({ inline_keyboard: [[
        { text: '1', callback_data: 'register' },
        { text: '2', callback_data: 'get_gold22' },
        { text: '3', callback_data: 'show_advance_options' },
        { text: '4', callback_data: 'show_feedback'},
        { text: '5', callback_data: 'unregister'}
    ]]}),
    "show_advance_options": JSON.stringify({ inline_keyboard: [[
        { text: '1', callback_data: 'get_gold22_now' },
        { text: '2', callback_data: 'bot_help' },
        { text: '3', callback_data: 'start' },
    ]]}),
    get_gold22:"get_gold22",
    register:"register",
    "show_feedback":"show_feedback",
    unregister:"unregister",
    bot_help:JSON.stringify({
        keyboard: [
          [{text: 'Contact', request_contact: true}],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
    })
}
bot.on('callback_query', (callbackQuery) => {
    let chatid = callbackQuery.message.chat.id;
    let firstname = callbackQuery.message.chat.first_name;
    let response = callbackQuery.data.split("|");
    let nextStep = response[0];

    if(options[nextStep] == "get_gold22"){
        let hours = Object.keys(goldPrice22);
        let price = goldPrice22["currentprice"];
        if(price){
            bot.sendMessage(chatid,messages[nextStep](price))
            log(1,"ADMIN","SENT","GOLDPRICE",chatid);
        }
        else{
            bot.sendMessage(chatid,"Please try after sometime");
            log(2,"PRICENOTFOUND");
        }

    }
    else if(options[nextStep] == "register"){
        register(chatid,firstname);
        log(1,chatid,"REQUEST","REGISTER","ADMIN");

    }
    else if(options[nextStep] == "unregister"){
        unregister(chatid,firstname);
        log(1,chatid,"REQUEST","UNREGISTER","ADMIN");
    }
    else if(options[nextStep] == "get_gold22_now"){
        bot.sendMessage(chatid,"Please wait we are fetching the live price...");
        getGoldPrice22.then(function(price){
            bot.sendMessage(chatid,messages[nextStep](price));
            log(1,"ADMIN","SENT","CURRENTGOLDPRICE",chatid);
        });
    }
    else if(options[nextStep] == "show_feedback"){
        bot.sendMessage(chatid,messages[nextStep]);
        usersQuery[chatid] = usersQuery[chatid] || {};
        usersQuery[chatid]["state"] = "get_feedback";
    }
    else {
        log(1,"ADMIN","SENT","OPTIONS-"+nextStep,chatid);
        bot.sendMessage(chatid,messages[nextStep],{reply_markup:options[nextStep]});
    }
});

bot.on('message', (msg) => {
    let chatid = msg.chat.id;
    usersQuery[chatid] = usersQuery[chatid] || {};
    usersQuery[chatid].incorrectMessage = usersQuery[chatid].incorrectMessage || 0;
    let userState = usersQuery[chatid].state;
    //Initiate messages
    if(usersQuery[chatid].incorrectMessage <= 5 && states.indexOf(userState) == -1){
        usersQuery[chatid]["state"] = "1";
        bot.sendMessage(chatid, messages.start,{reply_markup:options['start']});
        if(initiate.indexOf(msg.text) == -1){
            usersQuery[chatid].incorrectMessage = usersQuery[chatid].incorrectMessage + 1;
            log(1,chatid,"SENT",msg.text,"ADMIN");
        }
    }
    // actions
    else if(usersQuery[chatid]["state"]=="get_feedback"){
        savefeedback(chatid,msg.text);
        usersQuery[chatid]["state"] = "1";
    }
    //wrong query
    else{
        usersQuery[chatid].incorrectMessage = usersQuery[chatid].incorrectMessage + 1;
        log(1,chatid,"SENT",msg.text,"ADMIN");
        if (usersQuery[chatid].incorrectMessage >= 10){
            usersQuery[chatid].incorrectMessageTimer = Date.now();
            resetIncorrectMessageTimer(chatid);
            if(usersQuery[chatid].incorrectMessage >= 12 && usersQuery[chatid].incorrectMessage <= 20){
                bot.sendMessage(chatid, "Bot is putting you under ignore list for 15 minutes");
            } else {
                // no reply needed
            }
        }
    }
});

 
//LOGS DATA IN THE FILE 
// DIFFERENT FORMATS
// USER|ACTION|DATA|TO|TIME
// 77788|SENT|GOLDPRICE|ADMIN|12121456591
// 77788|REQUEST|GOLDPRICE|ADMIN|12121456591
// ADMIN|SENT|GOLDPRICE|77788|12121456591
// 77788|REGISTER|GOLDPRICE|ADMIN|12121456591
// BATCH PROCESS STARTED - TIME
// BATCH PROCESS ENDED - TIME
function log(option,user,action,data,to){
    let log ='';
    if(option==1)
    log = user+"|"+action+"|"+data+"|"+to+"|"+Date.now()+"\n";
    else{ // user is the string sent 
        log = user+"|"+Date.now()+"\n";
    }
    fs.appendFile('daily.log',log,function(){
       //do nothing   
    });
}
//registering for 10:30 AM and 6:00 PM
function register(chatid,name){
    var config = JSON.parse(fs.readFileSync('data.json', 'utf8'));
    // count check deliberately not coded
    if(!config["registered"][chatid]) {
        config["registered"][chatid] = name;
        config.registered.count = Object.keys(config.registered).length-2;
        adminUpdate(chatid+" has registered to gold bot ");
        bot.sendMessage(chatid,messages["register"]);
        bot.sendMessage(chatid,"This bot can support only "+(config.registered.maxCount-config.registered.count)+" more users");
    }
    else {
        bot.sendMessage(chatid,"User already registered");
    }
    fs.writeFile("data.json",JSON.stringify(config, null, 2),function(){
        //do nothing
    });
}
function unregister(chatid,name){
    var config = JSON.parse(fs.readFileSync('data.json', 'utf8'));
    if(config["registered"][chatid]) {
        delete config["registered"][chatid];
        adminUpdate(chatid+" has un registered from gold bot ");
        config.registered.count = Object.keys(config.registered).length-2;
        bot.sendMessage(chatid,messages["unregister"]);
    }
    else {
        bot.sendMessage(chatid,"User not registered");
    }
    fs.writeFile("data.json",JSON.stringify(config, null, 2),function(){
        //do nothing
    });
}

function savefeedback(chatid,message){
    var config = JSON.parse(fs.readFileSync('data.json', 'utf8'));
    config["feedbacks"][chatid] = config["feedbacks"][chatid] || {};
    config["feedbacks"][chatid]["feedback"] = config["feedbacks"][chatid]["feedback"] || [];
    if(config["feedbacks"][chatid]["feedback"].length <= 10){
        config["feedbacks"][chatid]["feedback"].push(message);
        log(1,chatid,"SENT","FEEDBACK","ADMIN");
        bot.sendMessage(chatid,"Thanks for your feedback");
    }else{
        bot.sendMessage(chatid,"Thanks for your feedback! Current we dont accept more than 10 feedbacks");
    }
    fs.writeFile("data.json",JSON.stringify(config, null, 2),function(){
        //do nothing
    });
}
function saveSentStatus(){
    return new Promise((resolve,reject)=>{
        var config = JSON.parse(fs.readFileSync('data.json', 'utf8'));
        config["MORNING"] = morning;
        config["EVENING"] = evening;
        fs.writeFile("data.json",JSON.stringify(config, null, 2),function(){
            //do nothing
            resolve();
        });
    });
}

function getSentStatus(){
    var config = JSON.parse(fs.readFileSync('data.json', 'utf8'));
    morning = config["MORNING"];
    evening = config["EVENING"];
}
// when the server starts
getSentStatus();
//Run at the given time 
function setSendGoldPriceTimer(){

    let sendGoldPriceTimer = setInterval(function(){
        let {hour,min} = getCurrentTime();
        if(hour === 10) {
            if(min === 29 ||min === 30||min === 31){
                log(2,"BATCH_MORNING_GOLDPRICE_STARTED");
                //sending the price to registered users
                var config = JSON.parse(fs.readFileSync('data.json', 'utf8'));
                for(users in config.registered){
                    if(goldPrice22["currentprice"] && morning.indexOf(users) == -1) {
                        bot.sendMessage(users,messages["get_gold22"](goldPrice22["currentprice"]));
                        morning.push(users);
                    } 
                    else {
                        getGoldPrice22().then(function(price){
                            goldPrice22["currentprice"] = price;
                            goldPrice22[hour] = price;
                            currentHour = hour;
                        })
                    }
                }
            }
        }
        if(hour === 18) {
            if(min === 0 ||min === 1||min === 2){
                //sending the price to registered users
                var config = JSON.parse(fs.readFileSync('data.json', 'utf8'));
                log(2,"BATCH_EVENING_GOLDPRICE_STARTED");
                for(users in config.registered){
                    if(goldPrice22["currentprice"] && evening.indexOf(users) == -1) {
                        bot.sendMessage(users,messages["get_gold22"](goldPrice22["currentprice"]));
                        evening.push(users);
                    } 
                    else {
                        getGoldPrice22().then(function(price){
                            goldPrice22["currentprice"] = price;
                            goldPrice22[hour] = price;
                            currentHour = hour;
                        })
                    }
                }
            }
        }
        if(currentHour!=hour){
            getGoldPrice22().then(function(price){
                goldPrice22["currentprice"] = price;
                goldPrice22[hour] = price;
                currentHour = hour;
            })
        }
        if(hour > 23){
            clearInterval(backupTimer);
            clearInterval(sendGoldPriceTimer);
            setSuperTimer();
        }
        console.log("sendGoldPriceTimer is running");
    },20000);
}
function setBackupTimer(){
    let backupTimer = setInterval(function(){
        console.log("backupTimer is running");
        serverDownCount = 0;
        saveSentStatus().then(function(){
            log(2,"BACKUP_DONE");
            getSentStatus();
        })
    },(60000*15));
}
function setSuperTimer(){
    let superTimer = setInterval(function(){
        log(2,"STARTINGSERVER");
        setBackupTimer();
        setSendGoldPriceTimer();
        morning=[];
        evening=[];
    },(60000*60*8));
}

function getCurrentTime(){
    var currentTime = new Date();
    var currentOffset = currentTime.getTimezoneOffset();
    var ISTOffset = 330;   // IST offset UTC +5:30 
    var ISTTime = new Date(currentTime.getTime() + (ISTOffset + currentOffset)*60000);
    var hour = ISTTime.getHours()
    var min = ISTTime.getMinutes()
    return { hour,min }
}
async function getGoldPrice22(){
    var options = {
        'method': 'GET',
        'url': 'https://www.goodreturns.in/gold-rates/chennai.html',
        'headers': {
        }
      };
    return new Promise((resolve,reject)=>{
        if(serverDownCount < 2) {
            request(options, function (error, response) {
                if (error) {
                    serverDownCount++;
                    throw new Error(error);
                }
                const html = convert(response.body, {
                    page: 'TEST',
                    data: text('#current-price'),
                });
    
            resolve(html.data.split("\n")[0])
          });
        }
        else{
            log(2,"SERVERCONNECTIONFAILED");
            resolve(goldPrice22["current"]);
        }
    });
}

function resetIncorrectMessageTimer(chatid){
    log(1,"ADMIN","RESETWRONGQUERY","",chatid);
    setTimeout(function(){
        if(Date.now()-usersQuery[chatid].incorrectMessageTimer > (15*60000)) {
            usersQuery[chatid].incorrectMessage = 0;
        }
    },(60000*16))
}

bot.on('contact', (msg) => {
    var config = JSON.parse(fs.readFileSync('data.json', 'utf8'));
    let contact = msg.contact;
    config["contacts"][contact.user_id] = contact.phone_number;
    adminUpdate(contact.first_name+" has shared their number to gold bot "+contact.phone_number);
    fs.writeFile("data.json",JSON.stringify(config, null, 2),function(){
        //do nothing
    });
});

// send updates to admin
function adminUpdate(message){
    bot.sendMessage(admin,message);
}

setSendGoldPriceTimer();
setBackupTimer();



process.on("uncaughtException", (err) => {
    log(2,"uncaughtException|"+process.pid+"|"+err);
});
  
process.on("unhandledRejection", (err, promise) => {
    log(2,"unhandledRejection|"+process.pid+"|"+err);
});
  
process.on("SIGINT", () => {
    log(2,"SIGINT|"+process.pid);
    process.exit(0);
});
