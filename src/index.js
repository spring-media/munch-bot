'use strict';

const nfetch = require('node-fetch');
const config = require('./config');

const holidayMap = {};
//3.10.
holidayMap["20180903"] = {"channel": "#general", "text": "_The Munch-Bot kindly presents:_ *Tag der deutschen Einheit!!!*\n\n"};

const gerichtsKategorien = {
  3: 'Essentia',
  7: 'Tagesgericht',
  27: 'Aktionstresen',
  8: 'Vegetarisch',
  33: 'Suppen und Eintöpfe',
  5: 'Spezial',
  25: 'Dessert'
}

exports.handler = function () {
    console.log(`start munch-bot with channel ${config.slackChannel}`)

    if (!isHoliday()) {
        const weekday = new Date().getDay();
        if (weekday < 1 || weekday > 5) {
            console.log('Today is no workday! I will enjoy the weekend!');
            return;
        }
        console.log("fetch menu from pace")
        const fetchOptions =
        {
          headers: {
            Referer: 'https://pace.webspeiseplan.de/Menu',
          }
        }
        nfetch(`https://pace.webspeiseplan.de/index.php?token=fc2ab5cbcc451ed9b0a290b5b558b059&model=menu&location=1&languagetype=1`, fetchOptions)
            .then(res => res.json())
            .then(json => slackMenues(extractMenueMessage(json)))
            .catch(err => console.log(err, err.stack));
    }

    console.log("finish munch-bot")
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
    console.log("extract menu and create slack json")
    const today = new Date();
    const dayKey = `${today.getFullYear()}-${fmt(today.getMonth() + 1)}-${fmt(today.getDate())}`;

    console.log("extract menu with day -> " + dayKey)
    const gerichte = json.content
                      .map(item => item.speiseplanGerichtData
                                    .filter(gerichtData => gerichtData.speiseplanAdvancedGericht.datum.startsWith(dayKey)))
                      .filter(array => array.length !== 0)
    const formattedMeals =  formatMeal(gerichte)

    return formattedMeals.map(item => {
      const kategorie = `\n\n_${gerichtsKategorien[item.kategorie]}_\n`
      const meals = item.meals.map( meal => `• \`<http://pace.webspeiseplan.de/Meal/${meal.id}|${meal.name}>\` _${meal.price}_`).join('\n')
      return `${kategorie} ${meals}`
    }).join('\n')
}

function calculate350(price) {
  let result;
  var floatPrice = parseFloat(price);
  if (floatPrice * 0.55 <= 3.50) {
    result = floatPrice * 0.45
  } else {
    result = floatPrice - 3.50
  }
  return parseFloat(result).toFixed(2)
}

function printPrice(price) {
  return`${price}€ ` + "(*"+calculate350(price)+"€*)"
}

function formatMeal(gerichte) {
  let formattedMeals = []
  for(const gericht of gerichte[0]){
    const info = gericht.zusatzinformationen
    let price;
    if(info.mitarbeiterpreisDecimal2){
      price = printPrice(info.mitarbeiterpreisDecimal2)
      if(info.gaestepreisDecimal2){
        price += ` / Menü: `+printPrice(info.gaestepreisDecimal2)
      }
    } else if(info.price3Decimal2 && info.price4Decimal2){
      price = `klein: `+printPrice(info.price3Decimal2)+` / groß: `+printPrice(info.price4Decimal2)
    }

    const kategorieID = gericht.speiseplanAdvancedGericht.gerichtkategorieID
    if(!formattedMeals.some(meal => meal.kategorie === kategorieID)){
      formattedMeals.push({kategorie: kategorieID, meals: []})
    }
    formattedMeals
      .find(meal => meal.kategorie === kategorieID)
      .meals.push({name: fixDoubleQuotes(gericht.speiseplanAdvancedGericht.gerichtname), id: gericht.speiseplanAdvancedGericht.id, price})
  }

  return formattedMeals;
}

function fixDoubleQuotes(gericht) {
  return gericht.replace(/"/g, '\\"');
}

function fmt(str) {
    return ('0' + str).slice(-2);
}

function slackMenues(message) {
    console.log("create body message now with footer and body")
    const footer = "\n_Preisangabe_: In Klammern mit Zuschuss von 3.50€\n_Quelle_: <http://pace.webspeiseplan.de/Menu|PACE>"
    const body = `{"channel": "${config.slackChannel}", "text": "_The Munch-Bot kindly presents:_ *Das Menü von heute:*\n\n${message}\n${footer}"}`;

    console.log("send to slack now with message: " + body)
    sendSlack(body);
}

function sendSlack(body) {
    console.log("send to slack now with message: " + body)
    nfetch(
        'https://hooks.slack.com/services/' + config.slackIntegrationHookToken,
        {method: 'POST', body: body}
    ).then(function (res) {
        if (!res.ok) {
            res.text().then(text => {
                console.log('Response from Slack not ok', res.status, res.statusText, text);
            })
            throw Error(res.statusText);
        }
        console.log('Successfully sent to slack');
    }).catch(err=>console.log('Error talking to slack', err, err.stack));
}
