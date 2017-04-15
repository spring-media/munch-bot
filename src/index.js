'use strict';

const cheerio = require('cheerio');
const nfetch = require('node-fetch');
const config = require('./config');

const holidayMap = {};
holidayMap["2017317"] = {"channel": "#general", "text": "_The Munch-Bot kindly presents:_ *Ostereier!!!* :hatching_chick:\n\nFrohe Ostern allen Kollegen!"};
holidayMap["201741"] = {"channel": "#general", "text": "_The Munch-Bot kindly presents:_ *Tag der Arbeit!!!* :hatching_chick:\n\n"};
holidayMap["2017425"] = {"channel": "#general", "text": "_The Munch-Bot kindly presents:_ *Himmelfahrt!!!* :hatching_chick:\n\n"};



exports.handler = function () {
    if (!isHoliday()) {
        const weekday = new Date().getDay();
        if (weekday < 1 || weekday > 5) {
            console.log('Today is no workday! I will enjoy the weekend!');
            return;
        }
    
        nfetch(`http://pace.webspeiseplan.de/index.php?model=meals&outlet=4&plusTage=0`)
            .then(res => res.json())
            .then(json => slackMenues(extractMenueMessage(json)))
            .catch(err => console.log(err, err.stack));  
    }  
};

function isHoliday() {
    const today = new Date();    
    const todayString = today.getFullYear() + "" + today.getMonth() + "" + today.getDate();

    if (todayString in holidayMap) {
        console.log("found holiday ");
        sendSlack(JSON.stringify(holidayMap[todayString]));
        return true;
    }

    return false;
}

function extractMenueMessage(json) {

    const today = new Date();
    const dayKey = `${today.getFullYear()}-${fmt(today.getMonth() + 1)}-${fmt(today.getDate())}`;

    return json.data[dayKey]
        .map(meal => meal.html)
        .map(html => cheerio.load(html))
        .map(selector => formatMeal(selector))
        .join('\n');
}

function formatMeal(selector) {
    const gericht = selector('.gerichtname').text();
    let preis = selector('.gerichtpreis').text();
    let kategorie = selector('.kategorie').text().trim();
    if (kategorie) {
        kategorie = `\n\n_${kategorie}_\n`
    }

    if (preis) {
        preis = `(_${preis}_)`
    }

    return `${kategorie}• \`${gericht}\` ${preis}`
}

function fmt(str) {
    return ('0' + str).slice(-2);
}

function slackMenues(message) {
    const footer = "Quelle: <http://pace.webspeiseplan.de/?standort=1&outlet=4|PACE>"
    const body = `{"channel": "#general", "text": "_The Munch-Bot kindly presents:_ *Das Menü von heute:*\n\n${message}\n${footer}"}`;

    sendSlack(body);
}

function sendSlack(body) {
    nfetch(
        'https://hooks.slack.com/services/' + config.slackIntegrationHookToken,
        {method: 'POST', body: body}
    ).then(function (res) {
        return res.text();
    }).catch(err=>console.log('Error talking to slack', err, err.stack));
}