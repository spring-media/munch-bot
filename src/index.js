'use strict';

const cheerio = require('cheerio');
const nfetch = require('node-fetch');
const config = require('./config');
const puppeteer = require('puppeteer');
const util = require('util')

const holidayMap = {};
//31.03
holidayMap["2018230"] = {"channel": "#general", "text": "_The Munch-Bot kindly presents:_ *Karfreitag!!!*\n\n"};
//02.04.
holidayMap["20180302"] = {"channel": "#general", "text": "_The Munch-Bot kindly presents:_ *Ostern!!!* :egg: \n\n"};
//1.5.
holidayMap["20180401"] = {"channel": "#general", "text": "_The Munch-Bot kindly presents:_ *Tag der Arbeit!!!*\n\n"};
//10.5.
holidayMap["20180410"] = {"channel": "#general", "text": "_The Munch-Bot kindly presents:_ *Himmelfahrt!!!* :beers:\n\n"};
//21.5.
holidayMap["20180421"] = {"channel": "#general", "text": "_The Munch-Bot kindly presents:_ *Pfingsten!!!*\n\n"};
//3.10.
holidayMap["20180903"] = {"channel": "#general", "text": "_The Munch-Bot kindly presents:_ *Tag der deutschen Einheit!!!*\n\n"};

exports.handler = async function () {
    console.log("start munch-bot")
    if (!isHoliday()) {
      const weekday = new Date().getDay();
      if (weekday < 1 || weekday > 5) {
          console.log('Today is no workday! I will enjoy the weekend!');
          return;
      }
      const menu = await fetchMenu();
      const formattedMenu = await formatMenu(menu);

      slackMenues(formattedMenu);
    }
    console.log("finish munch-bot")
}

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

async function fetchMenu() {
  console.log("fetch menu from pace")
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://pace.webspeiseplan.de/Menu');

  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('location', 1);
    localStorage.setItem('outlet', 4);
    localStorage.setItem('inited', true);
    localStorage.setItem('initialFilterRequest', true);
  });
  await page.reload();
  await page.waitForSelector('.price', {timeout: 10000});

  const mealsWrapper = await page.$$('.meal');
  const menu = await Promise.all(mealsWrapper.map(async meal => createMeal(meal)));
  await page.close()
  await browser.close()
  return menu;
}

async function createMeal(meal){
  let output = {};
    const category = await meal.$('.categoryName');
    const categoryName = await (await category.getProperty('innerText')).jsonValue();
    output.category = categoryName;

    const mealNameWrapper = await meal.$('.mealNameWrapper');
    const mealName = await (await mealNameWrapper.getProperty('innerText')).jsonValue();
    output.name = mealName;

    const pricesWrapper = await meal.$$('.price');
    const prices = await Promise.all(pricesWrapper.map(async price => {
      return (await price.getProperty('innerText')).jsonValue();
    }))
    output.price = prices.join(' / ');
    return output;
}

function formatMenu(meals) {
  let formattedMeals = [];
  for(const meal of meals){
    if(!formattedMeals.some(item => item.category === meal.category)){
      formattedMeals.push({category: meal.category, meals: []});
    }
    formattedMeals.find(item => item.category === meal.category).meals.push({name: meal.name, price: meal.price});
  }

  const menu = formattedMeals.map(item => {
    const category = `\n\n_${item.category}_\n`;
    const meals = item.meals.map( meal => `• \`${meal.name}\` (_${meal.price}_)`).join('\n');
    return `${category} \n ${meals}`;
  });

  return menu.join('\n\n')
}

function fmt(str) {
    return ('0' + str).slice(-2);
}

function slackMenues(message) {
    console.log("create body message now with footer and body")
    const footer = "Quelle: <https://pace.webspeiseplan.de/Menu>"
    const body = `{"channel": "${config.slackChannel}", "text": "_The Munch-Bot kindly presents:_ *Das Menü von heute:*\n\n${message}\n${footer}"}`;
    sendSlack(body);
}

function sendSlack(body) {
    console.log("send to slack "+config.slackIntegrationHookToken+" now with message: " + body)
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
