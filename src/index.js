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
  { id: 1, name: 'Essentia', kategorie: [43, 44, 45, 121] },
  { id: 2, name: 'Tagesgericht', kategorie: [46, 47] },
  { id: 3, name: 'Aktion', kategorie: [48] },
  { id: 4, name: 'Vegetarisch', kategorie: [49] },
  { id: 5, name: 'Spezial', kategorie: [50, 51, 52] },
  { id: 6, name: 'Suppe/Eintopf', kategorie: [53, 54, 55, 57] },
  { id: 7, name: 'Dessert', kategorie: [58, 56] }
]
const unknownCategory = { id: 1000, name: 'Unbekannt', kategorie: [] }

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
      .then(json => slackMenues(extractMenueMessage(json)))
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

function extractMenueMessage (json) {
  console.log('extract menu and create slack json')
  const today = new Date()
  const dayKey = `${today.getFullYear()}-${fmt(today.getMonth() + 1)}-${fmt(today.getDate())}`

  console.log('extract menu with day -> ' + dayKey)
  const gerichte = json.content
    .filter(item => item.speiseplanAdvanced.outletID === 4)
    .map(item => item.speiseplanGerichtData
      .filter(gerichtData => gerichtData.speiseplanAdvancedGericht.datum.startsWith(dayKey)))
    .filter(array => array.length !== 0)

  if (!gerichte || gerichte.length === 0) {
    console.log('no meals are found for today: ' + JSON.stringify(json))
    slackMessage('Unfortunately PACE does not provide food information today :hankey:')
    throw new Error('No meals found for ' + dayKey)
  }

  const foundMeals = extractCategoriesWithMeals(gerichte)

  return foundMeals.map(category => {
    const kategorie = `\n\n_${category.name}_\n`
    const meals = category.meals.map(meal => ` • \`<http://pace.webspeiseplan.de/Meal/${meal.id}|${meal.name}>\` _${meal.price}_`).join('\n')
    return `${kategorie}${meals}`
  }).join('\n')
}

function extractCategoriesWithMeals (gerichte) {
  const formattedMeals = []
  for (const gericht of gerichte[0]) {
    if (!gericht) continue

    const price = getPrice(gericht.zusatzinformationen)
    if (!price) continue

    const kategorieID = gericht.speiseplanAdvancedGericht.gerichtkategorieID
    let aggregateCategory = aggregateCategories
      .find(aggregateCategory => aggregateCategory.kategorie
        .find(id => id === kategorieID)
      )

    if (!aggregateCategory) {
      console.log('categoryId not found: ' + kategorieID)
      aggregateCategory = unknownCategory
    }

    if (!formattedMeals.some(category => category.kategorieId === aggregateCategory.id)) {
      formattedMeals.push({ kategorieId: aggregateCategory.id, name: aggregateCategory.name, meals: [] })
    }

    formattedMeals
      .find(category => category.kategorieId === aggregateCategory.id)
      .meals.push({ name: removeLinebreak(fixDoubleQuotes(gericht.speiseplanAdvancedGericht.gerichtname)), id: gericht.speiseplanAdvancedGericht.id, price })
  }

  return formattedMeals
}

function getPrice (info) {
  if (!info) {
    return
  }

  let price
  if (info.mitarbeiterpreisDecimal2) {
    price = printPrice(info.mitarbeiterpreisDecimal2)
    if (info.gaestepreisDecimal2) { // maybe not needed anymore
      price += ' / Menü: ' + printPrice(info.gaestepreisDecimal2)
    }
  } else if (info.price3Decimal2 && info.price4Decimal2) { // maybe not needed anymore
    price = 'klein: ' + printPrice(info.price3Decimal2) + ' / groß: ' + printPrice(info.price4Decimal2)
  }

  return price
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

function slackMenues (message) {
  const today = new Date()
  const todayString = today.getDate() + '.' + (today.getMonth() + 1) + '.' + today.getFullYear()
  console.log('create body message now with footer and body')
  const footer = '\n_Preisangabe_: In Klammern mit Zuschuss von 3.50€\n_Quelle_: <http://pace.webspeiseplan.de/Menu|PACE>\n\n*Do you have questions, comments or improvements? Feel free to ask questions here.*'
  const headerChannel = `_The Munch-Bot kindly presents:_ *Das Menü von heute (${todayString})*`
  const bodyChannel = JSON.stringify({ channel: config.slackChannel, text: `${headerChannel}\n\n${message}\n${footer}` })

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
