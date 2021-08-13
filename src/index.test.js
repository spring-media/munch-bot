jest.mock('node-fetch')
const nfetch = require('node-fetch')
const fs = require('fs')

// const log = console.log
console.log = () => {}

describe('index', () => {
  it('should print the menu', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2019, 10, 15))

    process.env.SLACK_CHANNEL = 'channelID'
    process.env.SLACK_TOKEN = 'SlackToken'

    nfetch
      .mockResolvedValueOnce({ json: () => JSON.parse(fs.readFileSync('src/tests/example-2019-11-15.json', 'utf8')) })
      .mockResolvedValueOnce({ ok: true })

    const index = require('./index')
    await index.handler()
    const slackCall = nfetch.mock.calls[1]
    const slackPost = JSON.parse(slackCall[1].body)
    delete slackCall[1].body
    expect(slackCall).toMatchSnapshot()
    expect(slackPost).toMatchSnapshot()
  })
})
