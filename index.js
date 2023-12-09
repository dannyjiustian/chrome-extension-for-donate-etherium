const { MetaMaskInpageProvider } = require('@metamask/inpage-provider')
const PortStream = require('extension-port-stream')
const detect = require('browser-detect')
const browser = detect()
const config = require('./config.json')

module.exports = function createMetaMaskProvider () {
  let provider
  try {
    let currentMetaMaskId = getMetaMaskId()
    const metamaskPort = chrome.runtime.connect(currentMetaMaskId)
    const pluginStream = new PortStream(metamaskPort)
    provider = new MetaMaskInpageProvider(pluginStream)
 } catch (e) {
    console.dir(`Metamask connect error `, e)
    throw e
  }
  return provider
}

function getMetaMaskId () {
  // console.log(browser)
  switch (browser && browser.name) {
    case 'chrome':
      console.log(browser.name) 
      console.log(config.CHROME_ID)
      return config.CHROME_ID
    case 'firefox':
      console.log(browser.name)
      console.log(config.FIREFOX_ID)
      return config.FIREFOX_ID
    case 'edge':
      console.log(browser.name)
      console.log(config.EDGE_ID)
      return config.EDGE_ID
    default:
      console.log(browser.name)
      console.log("Another")
      return config.CHROME_ID
  }
  // return config.EDGE_ID
}

