'use strict'

const nfetch = require('node-fetch')
const config = require('./config')

const holidayMap = {
  '2021-10-03': { title: '*Tag der deutschen Einheit*' },
  '2021-12-25': { title: '*Weihnachten*' },
  '2022-03-08': { title: '*Internationaler Frauentag*' },
  '2022-04-15': { title: '*Karfreitag*' },
  '2022-04-18': { title: '*Ostermontag*' },
  '2022-05-26': { title: '*Christi Himmelfahrt*' },
  '2022-06-06': { title: '*Pfingstmontag*' },
  '2022-10-03': { title: '*Tag der Deutschen Einhei*' },
  '2022-12-25': { title: '*Weihnachten*' }
}

const menuNameMatcher = (regex) => ({ MenuName: menuName = '' } = {}) => regex.test(menuName)
const menuNameExtract = (regex, group = 0) => ({ MenuName: menuName = '' } = {}) => (menuName.match(regex) || [])[1 + group]

// order is important for matching (sorted by id on posting)
const aggregateGroups = [
  { id: 11, name: 'DINER', matcher: menuNameMatcher(/diner/i) },
  { id: 12, name: 'ABEND', matcher: menuNameMatcher(/abend/i) },
  { id: 7, name: 'Counter', matcher: menuNameMatcher(/counter/i), extraInfo: menuNameExtract(/counter (.+)_/i) },
  { id: 1, name: 'Essentia', matcher: menuNameMatcher(/essentia/i) },
  { id: 2, name: 'Tagesgericht', matcher: menuNameMatcher(/tagesgericht/i) },
  { id: 3, name: 'Aktion', matcher: menuNameMatcher(/aktion/i) },
  { id: 4, name: 'Vegetarisch/Vegan', matcher: menuNameMatcher(/vegetarisch|vegan|vegi|gemueseteller/i) },
  { id: 6, name: 'Spezial', matcher: menuNameMatcher(/spezial/i) },
  { id: 8, name: 'Suppe/Eintopf', matcher: menuNameMatcher(/suppe|eintopf/i), extraInfo: menuNameExtract(/(gross|klein)/i) },
  { id: 9, name: 'Salat', matcher: menuNameMatcher(/salat/i) },
  { id: 10, name: 'Dessert', matcher: menuNameMatcher(/dessert|suess|fruchtig/i), extraInfo: menuNameExtract(/(gross|klein)_/i) },
  { id: 50, name: 'Sonstiges', matcher: menuNameMatcher(/bowl|saefte|wurst|beilage|gemuese|obst/i) },
  { id: 1000, name: 'Unbekannt', matcher: menuNameMatcher(/.*/) }
]

exports.handler = async () => {
  console.log(`start munch-bot with channel ${config.slackChannel}`)

  if (await isHoliday()) {
    return
  }

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

async function isHoliday () {
  const today = new Date()
  const todayString = `${today.getFullYear()}-${fmt(today.getMonth() + 1)}-${fmt(today.getDate())}`
  if (todayString in holidayMap) {
    console.log('found holiday ')
    await slackMessage(holidayMap[todayString])
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
    throw new Error('No meals found for ' + dayKey)
  }

  const foundMeals = extractGroupsWithMeals(gerichte.filter(({ outlet }) => outlet === outletName))

  return foundMeals.map(group => {
    const kategorie = `\n\n_${group.name}_\n`
    const meals = group.meals.map(meal => ` • \`<https://api.pace.berlin/foodfinder?lang=de&outlet=${meal.outlet}|${
      meal.extraInfo ? `(${meal.extraInfo}) ` : ''
    }${meal.name}>\` _${meal.price}_`).join('\n')
    return `${kategorie}${meals}`
  }).join('\n')
}

function extractGroupsWithMeals (gerichte) {
  const formattedMeals = []
  for (const gericht of gerichte) {
    if (!gericht) continue

    const price = getPrice(gericht.ProductPrice)
    if (!price) continue

    const aggregateGroup = aggregateGroups.find(aggregateGroup => aggregateGroup.matcher(gericht))

    let formattedMeal = formattedMeals.find(group => group.id === aggregateGroup.id)
    if (!formattedMeal) {
      formattedMeal = { id: aggregateGroup.id, name: aggregateGroup.name, meals: [] }
      formattedMeals.push(formattedMeal)
    }

    const extraInfo = aggregateGroup.extraInfo && aggregateGroup.extraInfo(gericht)

    formattedMeal.meals.push({
      outlet: gericht.outlet,
      name: removeLinebreak(fixDoubleQuotes(gericht.GastDesc)),
      extraInfo,
      price
    })
  }

  formattedMeals.sort((a, b) => a.id - b.id)

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

function slackMessage ({ title = '', message = '' }) {
  const headerChannel = `_The Munch-Bot kindly presents:_ ${title}`
  const bodyChannel = JSON.stringify({ channel: config.slackChannel, text: `${headerChannel}\n\n${message}` })
  return sendSlack(bodyChannel)
}

function slackMenues (messagePapa, messageCanteen) {
  const today = new Date()
  const todayString = today.getDate() + '.' + (today.getMonth() + 1) + '.' + today.getFullYear()
  console.log('create body message now with footer and body')
  const footer = '\n_Preisangabe_: In Klammern mit Zuschuss von 3.50€\n_Source_: <https://pace.berlin/|PACE>\n\n*Do you have questions, comments or improvements? Feel free to ask questions here.*'
  const headerChannel = `_The Munch-Bot kindly presents:_ *Das Menü von heute (${todayString})*`
  const bodyChannel = JSON.stringify({ channel: config.slackChannel, text: `${headerChannel}\n\n\n*------Papa-----*${messagePapa}\n\n\n*------Canteen-----*${messageCanteen}\n${footer}` })
  return sendSlack(bodyChannel)
}

function sendSlack (body) {
  console.log('send to slack now with message: ' + body)
  return nfetch(
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
