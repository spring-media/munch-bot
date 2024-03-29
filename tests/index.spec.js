jest.mock('node-fetch')
const nfetch = require('node-fetch')
const fs = require('fs')

// const log = console.log
console.log = () => {}

describe('index', () => {
  it('should print the menu', async () => {
    jest.useFakeTimers('modern')
    jest.setSystemTime(new Date(2021, 8, 9))

    process.env.SLACK_CHANNEL = 'channelID'
    process.env.SLACK_TOKEN = 'SlackToken'

    nfetch
      .mockResolvedValueOnce({ json: () => JSON.parse(fs.readFileSync('tests/example/example-2021-09-09.json', 'utf8')) })
      .mockResolvedValueOnce({ ok: true })

    const index = require('../src/index')
    await index.handler()
    const slackCall = nfetch.mock.calls[1]
    const slackPost = JSON.parse(slackCall[1].body)
    delete slackCall[1].body
    expect(slackCall).toMatchSnapshot()
    expect(slackPost).toMatchSnapshot()
  })
})
