'use strict'

const nfetch = require('node-fetch')
const config = require('./config')

const holidayMap = {}

holidayMap['2020118'] = { channel: `${config.slackChannel}`, text: '_The Munch-Bot kindly presents:_ *Karfreitag*\n\n' }
holidayMap['2020313'] = { channel: `${config.slackChannel}`, text: '_The Munch-Bot kindly presents:_ *Ostermontag*\n\n' }
holidayMap['2020401'] = { channel: `${config.slackChannel}`, text: '_The Munch-Bot kindly presents:_ *Tag der Arbeit*\n\n' }
holidayMap['2020421'] = { channel: `${config.slackChannel}`, text: '_The Munch-Bot kindly presents:_ *Himmelfahrt*\n\n' }
holidayMap['2020501'] = { channel: `${config.slackChannel}`, text: '_The Munch-Bot kindly presents:_ *Pfingsmontag*\n\n' }
holidayMap['20201125'] = { channel: `${config.slackChannel}`, text: '_The Munch-Bot kindly presents:_ *Weihnachten*\n\n' }

const aggregateCategories = [
  { id: 1, name: 'Essentia', kategorie: /essentia/i },
  { id: 2, name: 'Tagesgericht', kategorie: /tagesgericht/i },
  { id: 3, name: 'Aktion', kategorie: /aktion/i },
  { id: 4, name: 'Vegetarisch', kategorie: /vegetarisch/i },
  { id: 5, name: 'Spezial', kategorie: /spezial/i },
  { id: 6, name: 'Counter', kategorie: /counter/i },
  { id: 7, name: 'Suppe/Eintopf', kategorie: /suppe|eintopf/i },
  { id: 8, name: 'Salat', kategorie: /salat/i },
  { id: 9, name: 'Dessert', kategorie: /dessert/i },
  { id: 10, name: 'ABEND', kategorie: /abend/i },
  { id: 1000, name: 'Unbekannt', kategorie: /./ }
]

exports.handler = async () => {
  console.log(`start munch-bot with channel ${config.slackChannel}`)

  if (!isHoliday()) {
    const weekday = new Date().getDay()
    if (weekday < 1 || weekday > 5) {
      console.log('Today is no workday! I will enjoy the weekend!')
      return
    }

    console.log('fetch menu from pace')
    const fetchOptions =
        {
          headers: {
            Referer: 'https://pace.berlin/',
            Accept: 'application/json',
            apiKey: '606a6a5f837e92551fa1f85d9311553dd3b4afd7'
          }
        }
    return nfetch(`https://api.pace.berlin/api/foodfinder/list/de/all/1?_=${new Date().getTime()}`, fetchOptions)
      .then(res => res.json())
      .then(json => slackMenues(extractMenueMessage(json, 'papa'), extractMenueMessage(json, 'canteen')))
      .catch(err => console.log(err, err.stack))
  }
}

function isHoliday () {
  const today = new Date()
  const todayString = today.getFullYear() + '' + today.getMonth() + '' + today.getDate()
  if (todayString in holidayMap) {
    console.log('found holiday ')
    sendSlack(JSON.stringify(holidayMap[todayString]))
    return true
  }

  return false
}

function extractMenueMessage (json, outletName) {
  console.log('extract menu and create slack json')
  const today = new Date()
  const dayKey = `${today.getFullYear()}-${fmt(today.getMonth() + 1)}-${fmt(today.getDate())}`

  console.log('extract menu with day -> ' + dayKey)
  const gerichte = json.data.filter(({ outlet, date, mealtime }) =>
    outlet === outletName &&
    date === dayKey &&
    mealtime === 'Mittagessen'
  )

  if (!gerichte || gerichte.length === 0) {
    console.log('no meals are found for today: ' + JSON.stringify(json))
    slackMessage('Unfortunately PACE does not provide food information today :hankey:')
    throw new Error('No meals found for ' + dayKey)
  }

  const foundMeals = extractCategoriesWithMeals(gerichte.filter(({ outlet }) => outlet === outletName))

  return foundMeals.map(category => {
    const kategorie = `\n\n_${category.name}_\n`
    const meals = category.meals.map(meal => ` • \`<https://api.pace.berlin/foodfinder?lang=de&outlet={meal.outlet}|${meal.name}>\` _${meal.price}_`).join('\n')
    return `${kategorie}${meals}`
  }).join('\n')
}

function extractCategoriesWithMeals (gerichte) {
  const formattedMeals = []
  for (const gericht of gerichte) {
    if (!gericht) continue

    const price = getPrice(gericht.ProductPrice)
    if (!price) continue

    const kategorieID = gericht.MenuName
    const aggregateCategory = aggregateCategories
      .find(aggregateCategory => aggregateCategory.kategorie.test(kategorieID))

    if (!formattedMeals.some(category => category.kategorieId === aggregateCategory.id)) {
      formattedMeals.push({ kategorieId: aggregateCategory.id, name: aggregateCategory.name, meals: [] })
    }

    formattedMeals
      .find(category => category.kategorieId === aggregateCategory.id)
      .meals.push({ name: removeLinebreak(fixDoubleQuotes(gericht.GastDesc)), outlet: gericht.outlet, price })
  }

  return formattedMeals
}

function getPrice (info) {
  if (!info) {
    return
  }

  return printPrice(info)
  // let price
  // if (info.ProductPrice) {
  //   price = printPrice(info.ProductPrice)
  //   if (info.gaestepreisDecimal2) { // maybe not needed anymore
  //     price += ' / Menü: ' + printPrice(info.gaestepreisDecimal2)
  //   }
  // } else if (info.price3Decimal2 && info.price4Decimal2) { // maybe not needed anymore
  //   price = 'klein: ' + printPrice(info.price3Decimal2) + ' / groß: ' + printPrice(info.price4Decimal2)
  // }

  // return price
}

function calculate350 (price) {
  let result
  const floatPrice = parseFloat(price)
  if (floatPrice * 0.55 <= 3.50) {
    result = floatPrice * 0.45
  } else {
    result = floatPrice - 3.50
  }
  return parseFloat(result).toFixed(2)
}

function printPrice (price) {
  return `${price}€ ` + '(*' + calculate350(price) + '€*)'
}

function fixDoubleQuotes (gericht) {
  return gericht.replace(/"/g, '\\"')
}

function removeLinebreak (gericht) {
  return gericht.replace(/ ?\r?\n ?|\r/gm, ' ')
}

function fmt (str) {
  return ('0' + str).slice(-2)
}

function slackMessage (message) {
  const today = new Date()
  const todayString = today.getDate() + '.' + (today.getMonth() + 1) + '.' + today.getFullYear()
  const headerChannel = `_The Munch-Bot kindly presents (${todayString}):_`
  const bodyChannel = JSON.stringify({ channel: config.slackChannel, text: `${headerChannel}\n\n${message}` })
  sendSlack(bodyChannel)
}

function slackMenues (messagePapa, messageCanteen) {
  const today = new Date()
  const todayString = today.getDate() + '.' + (today.getMonth() + 1) + '.' + today.getFullYear()
  console.log('create body message now with footer and body')
  const footer = '\n_Preisangabe_: In Klammern mit Zuschuss von 3.50€\n_Source_: <https://pace.berlin/|PACE>\n\n*Do you have questions, comments or improvements? Feel free to ask questions here.*'
  const headerChannel = `_The Munch-Bot kindly presents:_ *Das Menü von heute (${todayString})*`
  const bodyChannel = JSON.stringify({ channel: config.slackChannel, text: `${headerChannel}\n\n\n*------Papa-----*${messagePapa}\n\n\n*------Canteen-----*${messageCanteen}\n${footer}` })

  console.log('send to slack now with message: ' + bodyChannel)
  sendSlack(bodyChannel)
}

function sendSlack (body) {
  console.log('send to slack now with message: ' + body)
  nfetch(
    'https://hooks.slack.com/services/' + config.slackIntegrationHookToken,
    { method: 'POST', body: body }
  ).then(function (res) {
    if (!res.ok) {
      res.text().then(text => {
        console.log('Response from Slack not ok', res.status, res.statusText, text)
      })
      throw Error(res.statusText)
    }
    console.log('Successfully sent to slack')
  }).catch(err => console.log('Error talking to slack', err, err.stack))
}
