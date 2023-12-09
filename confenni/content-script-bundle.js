(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const createProvider = require("../..");
const Web3 = require("web3");

const provider = createProvider();
const web3 = new Web3(provider);

let recipientAddress = null,
  senderAddress = null;

const loadExtensionCSS = (url) => {
  var cssUrl = chrome.runtime.getURL(url);

  var link = document.createElement("link");
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = cssUrl;

  document.head.appendChild(link);
};

const loadExtensionJavascript = (url) => {
  var jsUrl = chrome.runtime.getURL(url);

  var script = document.createElement("script");
  script.type = "module";
  script.href = jsUrl;
  script.crossOrigin = true;

  document.head.appendChild(script);
};

var rootElement = document.querySelector("#root");

// If not, create a new div element with id 'root' and append it to the body
if (!rootElement) {
  rootElement = document.createElement("div");
  rootElement.id = "root";
  document.body.appendChild(rootElement);
  loadExtensionCSS("./css/content-script.css");
}

// Connect to metamask
const connectToMetaMask = () => {
  return provider
    .request({ method: "eth_requestAccounts" })
    .then(loadAccounts)
    .catch((error) => {
      console.error("Error requesting accounts:", error);
    });
};

// Load Account from Metamask
const loadAccounts = () => {
  return web3.eth.getAccounts().then((accounts) => {
    if (accounts && accounts.length) {
      // console.log(accounts)
      return accounts[0];
    } else {
      return null;
    }
  });
};

// Function to slice the address and display a shortened version
const sliceAddress = (address) => {
  return `${address.slice(0, 7)}....${address.slice(-6)}`;
};

//Get current accessed url
var url = window.location.href;

if (url.toString() !== null || url.toString() !== "") {
  // Fetch current url to check in the database
  fetch("http://localhost:3000/v1/articles/check_urls", {
    method: "POST",
    body: JSON.stringify({ article_urls: url }),
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.status === true) {
        if (checkDOI(data.data[0])) {
          createButton();
          recipientAddress = data.data[0].wallet_address;
        }
      }
    })
    .catch((error) => {
      console.error("Error sending or receiving data:", error);
    });
} else {
  console.log("Url is invalid");
}

// CHECK DOI IN WEBPAGE
const checkDOI = async (data) => {
  const doiToFind = data.article_doi;

  try {
    const response = await fetch(url);
    const htmlContent = await response.text();

    const result = htmlContent.includes(doiToFind);
    return result;
  } catch (error) {
    console.error("Error during fetch:", error);
    return false;
  }
};

// CREATE DONATE BUTTON
const createButton = () => {
  const button = document.createElement("button");
  button.textContent = "Donate to this article";
  button.id = "confennix_donate_button";

  document.body.appendChild(button);
  // Add a function to the button
  button.addEventListener("click", showModal);
};

const showModal = () => {
  const donateSnap = document.querySelector("#donate-snap");
  const closeDonateSnap = document.querySelector("#closeDonate");
  const addressWallet = document.querySelector("#address-crypto");
  const connectWallet = document.querySelector("#connectWallet");
  const donationAmount = document.querySelector("#amount");
  const donationMessage = document.querySelector("#message");
  const sendNow = document.querySelector("#sendNow");
  const body = document.querySelector("body");

  const checkWallet = () => {
    connectToMetaMask()
      .then((account) => {
        if (account) {
          senderAddress = account;
          // Remove the click event listener after successfully connecting
          connectWallet.removeEventListener("click", this);
          // Display the connected account in addressWallet
          addressWallet.innerHTML = sliceAddress(account);
          connectWallet.classList.remove("visible");
          connectWallet.classList.add("invisible");
          sendNow.disabled = false;
        }
      })
      .catch((error) => {
        console.error("Error connecting to MetaMask:", error);
      });
  };

  // Function to handle the donation process
  const donateProcess = async () => {
    if (
      donationAmount.value !== null &&
      donationAmount.value !== "" &&
      recipientAddress !== null
    ) {
      try {
        // console.log(donationAmount.value)
        // console.log(senderAddress)
        // console.log(recipientAddress)

        const gasPrice = await web3.eth.getGasPrice();

        // Adjust gas price and gas limit if needed
        const gasPriceWei = web3.utils.toWei("25", "gwei"); // Example: increase gas price
        const gasLimit = 500000; // Example: adjust gas limit

        const transactionObject = {
          from: senderAddress,
          to: recipientAddress,
          value: web3.utils.toWei(donationAmount.value, "ether"),
          gasPrice: gasPriceWei,
          gas: gasLimit,
        };

        const transactionHash = await web3.eth.sendTransaction(
          transactionObject
        );

        if (transactionHash) {
          console.log(`Transaction successful! Transaction Hash : `);
          console.log(transactionHash);

          body.classList.remove("overflow-hidden");
          donateSnap.classList.add("invisible", "opacity-0");
          donateSnap.classList.remove("visible", "opacity-100");
          connectWallet.removeEventListener("click", checkWallet);
          sendNow.removeEventListener("click", donateProcess);
          donationAmount.value = "";
          donationMessage.value = "";
        }
      } catch (error) {
        // Log any errors
        console.error("Error sending transaction:", error);

        if (error.message.includes("insufficient funds")) {
          console.error(
            "Insufficient funds. Please make sure your account has enough Ether."
          );
        }
      }
    }
  };

  // Function to process the donation after connecting the wallet
  const process = async () => {
    // Hide the "Connect Wallet" button, show the sender's address, and enable "Send Now" button
    connectWallet.classList.remove("visible");
    connectWallet.classList.add("invisible");
    sendNow.disabled = false;

    if (senderAddress !== null) {
      sendNow.addEventListener("click", donateProcess);
    }
  };

  // Run check wallet
  checkWallet();

  // Show the "Connect Wallet" button and disable "Send Now" button
  body.classList.add("overflow-hidden");
  donateSnap.classList.remove("invisible", "opacity-0");
  donateSnap.classList.add("visible", "opacity-100");
  donationAmount.value = "";
  donationMessage.value = "";
  donateSnap.style.zIndex = "99999";
  addressWallet.innerHTML = "Not Connect";
  sendNow.disabled = true;

  closeDonateSnap.addEventListener("click", function () {
    body.classList.remove("overflow-hidden");
    donateSnap.classList.add("invisible", "opacity-0");
    donateSnap.classList.remove("visible", "opacity-100");
    sendNow.disabled = true;
    donationAmount.value = "";
    donationMessage.value = "";
    connectWallet.removeEventListener("click", checkWallet);
    sendNow.removeEventListener("click", donateProcess);
  });

  connectWallet.addEventListener("click", checkWallet);

  sendNow.addEventListener("click", donateProcess);
};

},{"../..":3,"web3":78}],2:[function(require,module,exports){
module.exports={
  "CHROME_ID": "nkbihfbeogaeaoehlefnkodbefgpgknn",
  "FIREFOX_ID": "webextension@metamask.io",
  "EDGE_ID":  "ejbalbakoplchlghecdalmeeeajnimhm"
}

},{}],3:[function(require,module,exports){
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


},{"./config.json":2,"@metamask/inpage-provider":5,"browser-detect":16,"extension-port-stream":27}],4:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pump_1 = __importDefault(require("pump"));
const json_rpc_engine_1 = require("json-rpc-engine");
const json_rpc_middleware_stream_1 = require("json-rpc-middleware-stream");
const object_multiplex_1 = __importDefault(require("@metamask/object-multiplex"));
const safe_event_emitter_1 = __importDefault(require("@metamask/safe-event-emitter"));
const fast_deep_equal_1 = __importDefault(require("fast-deep-equal"));
const eth_rpc_errors_1 = require("eth-rpc-errors");
const is_stream_1 = require("is-stream");
const messages_1 = __importDefault(require("./messages"));
const siteMetadata_1 = __importDefault(require("./siteMetadata"));
const utils_1 = require("./utils");
class MetaMaskInpageProvider extends safe_event_emitter_1.default {
    /**
     * @param connectionStream - A Node.js duplex stream
     * @param options - An options bag
     * @param options.jsonRpcStreamName - The name of the internal JSON-RPC stream.
     * Default: metamask-provider
     * @param options.logger - The logging API to use. Default: console
     * @param options.maxEventListeners - The maximum number of event
     * listeners. Default: 100
     * @param options.shouldSendMetadata - Whether the provider should
     * send page metadata. Default: true
     */
    constructor(connectionStream, { jsonRpcStreamName = 'metamask-provider', logger = console, maxEventListeners = 100, shouldSendMetadata = true, } = {}) {
        if (!is_stream_1.duplex(connectionStream)) {
            throw new Error(messages_1.default.errors.invalidDuplexStream());
        }
        if (typeof maxEventListeners !== 'number' ||
            typeof shouldSendMetadata !== 'boolean') {
            throw new Error(messages_1.default.errors.invalidOptions(maxEventListeners, shouldSendMetadata));
        }
        validateLoggerObject(logger);
        super();
        this._log = logger;
        this.isMetaMask = true;
        this.setMaxListeners(maxEventListeners);
        // private state
        this._state = {
            sentWarnings: {
                // methods
                enable: false,
                experimentalMethods: false,
                send: false,
                // events
                events: {
                    close: false,
                    data: false,
                    networkChanged: false,
                    notification: false,
                },
            },
            accounts: null,
            isConnected: false,
            isUnlocked: false,
            initialized: false,
            isPermanentlyDisconnected: false,
        };
        this._metamask = this._getExperimentalApi();
        // public state
        this.selectedAddress = null;
        this.networkVersion = null;
        this.chainId = null;
        // bind functions (to prevent consumers from making unbound calls)
        this._handleAccountsChanged = this._handleAccountsChanged.bind(this);
        this._handleConnect = this._handleConnect.bind(this);
        this._handleChainChanged = this._handleChainChanged.bind(this);
        this._handleDisconnect = this._handleDisconnect.bind(this);
        this._handleStreamDisconnect = this._handleStreamDisconnect.bind(this);
        this._handleUnlockStateChanged = this._handleUnlockStateChanged.bind(this);
        this._sendSync = this._sendSync.bind(this);
        this._rpcRequest = this._rpcRequest.bind(this);
        this._warnOfDeprecation = this._warnOfDeprecation.bind(this);
        this.enable = this.enable.bind(this);
        this.request = this.request.bind(this);
        this.send = this.send.bind(this);
        this.sendAsync = this.sendAsync.bind(this);
        // setup connectionStream multiplexing
        const mux = new object_multiplex_1.default();
        pump_1.default(connectionStream, mux, connectionStream, this._handleStreamDisconnect.bind(this, 'MetaMask'));
        // ignore phishing warning message (handled elsewhere)
        mux.ignoreStream('phishing');
        // setup own event listeners
        // EIP-1193 connect
        this.on('connect', () => {
            this._state.isConnected = true;
        });
        // setup RPC connection
        const jsonRpcConnection = json_rpc_middleware_stream_1.createStreamMiddleware();
        pump_1.default(jsonRpcConnection.stream, mux.createStream(jsonRpcStreamName), jsonRpcConnection.stream, this._handleStreamDisconnect.bind(this, 'MetaMask RpcProvider'));
        // handle RPC requests via dapp-side rpc engine
        const rpcEngine = new json_rpc_engine_1.JsonRpcEngine();
        rpcEngine.push(json_rpc_engine_1.createIdRemapMiddleware());
        rpcEngine.push(utils_1.createErrorMiddleware(this._log));
        rpcEngine.push(jsonRpcConnection.middleware);
        this._rpcEngine = rpcEngine;
        this._initializeState();
        // handle JSON-RPC notifications
        jsonRpcConnection.events.on('notification', (payload) => {
            const { method, params } = payload;
            if (method === 'metamask_accountsChanged') {
                this._handleAccountsChanged(params);
            }
            else if (method === 'metamask_unlockStateChanged') {
                this._handleUnlockStateChanged(params);
            }
            else if (method === 'metamask_chainChanged') {
                this._handleChainChanged(params);
            }
            else if (utils_1.EMITTED_NOTIFICATIONS.includes(method)) {
                // deprecated
                // emitted here because that was the original order
                this.emit('data', payload);
                this.emit('message', {
                    type: method,
                    data: params,
                });
                // deprecated
                this.emit('notification', payload.params.result);
            }
            else if (method === 'METAMASK_STREAM_FAILURE') {
                connectionStream.destroy(new Error(messages_1.default.errors.permanentlyDisconnected()));
            }
        });
        // miscellanea
        // send website metadata
        if (shouldSendMetadata) {
            if (document.readyState === 'complete') {
                siteMetadata_1.default(this._rpcEngine, this._log);
            }
            else {
                const domContentLoadedHandler = () => {
                    siteMetadata_1.default(this._rpcEngine, this._log);
                    window.removeEventListener('DOMContentLoaded', domContentLoadedHandler);
                };
                window.addEventListener('DOMContentLoaded', domContentLoadedHandler);
            }
        }
    }
    //====================
    // Public Methods
    //====================
    /**
     * Returns whether the provider can process RPC requests.
     */
    isConnected() {
        return this._state.isConnected;
    }
    /**
     * Submits an RPC request for the given method, with the given params.
     * Resolves with the result of the method call, or rejects on error.
     *
     * @param args - The RPC request arguments.
     * @param args.method - The RPC method name.
     * @param args.params - The parameters for the RPC method.
     * @returns A Promise that resolves with the result of the RPC method,
     * or rejects if an error is encountered.
     */
    async request(args) {
        if (!args || typeof args !== 'object' || Array.isArray(args)) {
            throw eth_rpc_errors_1.ethErrors.rpc.invalidRequest({
                message: messages_1.default.errors.invalidRequestArgs(),
                data: args,
            });
        }
        const { method, params } = args;
        if (typeof method !== 'string' || method.length === 0) {
            throw eth_rpc_errors_1.ethErrors.rpc.invalidRequest({
                message: messages_1.default.errors.invalidRequestMethod(),
                data: args,
            });
        }
        if (params !== undefined && !Array.isArray(params) &&
            (typeof params !== 'object' || params === null)) {
            throw eth_rpc_errors_1.ethErrors.rpc.invalidRequest({
                message: messages_1.default.errors.invalidRequestParams(),
                data: args,
            });
        }
        return new Promise((resolve, reject) => {
            this._rpcRequest({ method, params }, utils_1.getRpcPromiseCallback(resolve, reject));
        });
    }
    /**
     * Submits an RPC request per the given JSON-RPC request object.
     *
     * @param payload - The RPC request object.
     * @param cb - The callback function.
     */
    sendAsync(payload, callback) {
        this._rpcRequest(payload, callback);
    }
    /**
     * We override the following event methods so that we can warn consumers
     * about deprecated events:
     *   addListener, on, once, prependListener, prependOnceListener
     */
    addListener(eventName, listener) {
        this._warnOfDeprecation(eventName);
        return super.addListener(eventName, listener);
    }
    on(eventName, listener) {
        this._warnOfDeprecation(eventName);
        return super.on(eventName, listener);
    }
    once(eventName, listener) {
        this._warnOfDeprecation(eventName);
        return super.once(eventName, listener);
    }
    prependListener(eventName, listener) {
        this._warnOfDeprecation(eventName);
        return super.prependListener(eventName, listener);
    }
    prependOnceListener(eventName, listener) {
        this._warnOfDeprecation(eventName);
        return super.prependOnceListener(eventName, listener);
    }
    //====================
    // Private Methods
    //====================
    /**
     * Constructor helper.
     * Populates initial state by calling 'metamask_getProviderState' and emits
     * necessary events.
     */
    async _initializeState() {
        try {
            const { accounts, chainId, isUnlocked, networkVersion, } = await this.request({
                method: 'metamask_getProviderState',
            });
            // indicate that we've connected, for EIP-1193 compliance
            this.emit('connect', { chainId });
            this._handleChainChanged({ chainId, networkVersion });
            this._handleUnlockStateChanged({ accounts, isUnlocked });
            this._handleAccountsChanged(accounts);
        }
        catch (error) {
            this._log.error('MetaMask: Failed to get initial state. Please report this bug.', error);
        }
        finally {
            this._state.initialized = true;
            this.emit('_initialized');
        }
    }
    /**
     * Internal RPC method. Forwards requests to background via the RPC engine.
     * Also remap ids inbound and outbound.
     *
     * @param payload - The RPC request object.
     * @param callback - The consumer's callback.
     */
    _rpcRequest(payload, callback) {
        let cb = callback;
        if (!Array.isArray(payload)) {
            if (!payload.jsonrpc) {
                payload.jsonrpc = '2.0';
            }
            if (payload.method === 'eth_accounts' ||
                payload.method === 'eth_requestAccounts') {
                // handle accounts changing
                cb = (err, res) => {
                    this._handleAccountsChanged(res.result || [], payload.method === 'eth_accounts');
                    callback(err, res);
                };
            }
            return this._rpcEngine.handle(payload, cb);
        }
        return this._rpcEngine.handle(payload, cb);
    }
    /**
     * When the provider becomes connected, updates internal state and emits
     * required events. Idempotent.
     *
     * @param chainId - The ID of the newly connected chain.
     * @emits MetaMaskInpageProvider#connect
     */
    _handleConnect(chainId) {
        if (!this._state.isConnected) {
            this._state.isConnected = true;
            this.emit('connect', { chainId });
            this._log.debug(messages_1.default.info.connected(chainId));
        }
    }
    /**
     * When the provider becomes disconnected, updates internal state and emits
     * required events. Idempotent with respect to the isRecoverable parameter.
     *
     * Error codes per the CloseEvent status codes as required by EIP-1193:
     * https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent#Status_codes
     *
     * @param isRecoverable - Whether the disconnection is recoverable.
     * @param errorMessage - A custom error message.
     * @emits MetaMaskInpageProvider#disconnect
     */
    _handleDisconnect(isRecoverable, errorMessage) {
        if (this._state.isConnected ||
            (!this._state.isPermanentlyDisconnected && !isRecoverable)) {
            this._state.isConnected = false;
            let error;
            if (isRecoverable) {
                error = new eth_rpc_errors_1.EthereumRpcError(1013, // Try again later
                errorMessage || messages_1.default.errors.disconnected());
                this._log.debug(error);
            }
            else {
                error = new eth_rpc_errors_1.EthereumRpcError(1011, // Internal error
                errorMessage || messages_1.default.errors.permanentlyDisconnected());
                this._log.error(error);
                this.chainId = null;
                this.networkVersion = null;
                this._state.accounts = null;
                this.selectedAddress = null;
                this._state.isUnlocked = false;
                this._state.isPermanentlyDisconnected = true;
            }
            this.emit('disconnect', error);
            this.emit('close', error); // deprecated
        }
    }
    /**
     * Called when connection is lost to critical streams.
     *
     * @emits MetamaskInpageProvider#disconnect
     */
    _handleStreamDisconnect(streamName, error) {
        utils_1.logStreamDisconnectWarning(this._log, streamName, error, this);
        this._handleDisconnect(false, error ? error.message : undefined);
    }
    /**
     * Upon receipt of a new chainId and networkVersion, emits corresponding
     * events and sets relevant public state.
     * Does nothing if neither the chainId nor the networkVersion are different
     * from existing values.
     *
     * @emits MetamaskInpageProvider#chainChanged
     * @param networkInfo - An object with network info.
     * @param networkInfo.chainId - The latest chain ID.
     * @param networkInfo.networkVersion - The latest network ID.
     */
    _handleChainChanged({ chainId, networkVersion, } = {}) {
        if (!chainId || typeof chainId !== 'string' || !chainId.startsWith('0x') ||
            !networkVersion || typeof networkVersion !== 'string') {
            this._log.error('MetaMask: Received invalid network parameters. Please report this bug.', { chainId, networkVersion });
            return;
        }
        if (networkVersion === 'loading') {
            this._handleDisconnect(true);
        }
        else {
            this._handleConnect(chainId);
            if (chainId !== this.chainId) {
                this.chainId = chainId;
                if (this._state.initialized) {
                    this.emit('chainChanged', this.chainId);
                }
            }
            if (networkVersion !== this.networkVersion) {
                this.networkVersion = networkVersion;
                if (this._state.initialized) {
                    this.emit('networkChanged', this.networkVersion);
                }
            }
        }
    }
    /**
     * Called when accounts may have changed. Diffs the new accounts value with
     * the current one, updates all state as necessary, and emits the
     * accountsChanged event.
     *
     * @param accounts - The new accounts value.
     * @param isEthAccounts - Whether the accounts value was returned by
     * a call to eth_accounts.
     */
    _handleAccountsChanged(accounts, isEthAccounts = false) {
        let _accounts = accounts;
        if (!Array.isArray(accounts)) {
            this._log.error('MetaMask: Received invalid accounts parameter. Please report this bug.', accounts);
            _accounts = [];
        }
        for (const account of accounts) {
            if (typeof account !== 'string') {
                this._log.error('MetaMask: Received non-string account. Please report this bug.', accounts);
                _accounts = [];
                break;
            }
        }
        // emit accountsChanged if anything about the accounts array has changed
        if (!fast_deep_equal_1.default(this._state.accounts, _accounts)) {
            // we should always have the correct accounts even before eth_accounts
            // returns
            if (isEthAccounts && this._state.accounts !== null) {
                this._log.error(`MetaMask: 'eth_accounts' unexpectedly updated accounts. Please report this bug.`, _accounts);
            }
            this._state.accounts = _accounts;
            // handle selectedAddress
            if (this.selectedAddress !== _accounts[0]) {
                this.selectedAddress = _accounts[0] || null;
            }
            // finally, after all state has been updated, emit the event
            if (this._state.initialized) {
                this.emit('accountsChanged', _accounts);
            }
        }
    }
    /**
     * Upon receipt of a new isUnlocked state, sets relevant public state.
     * Calls the accounts changed handler with the received accounts, or an empty
     * array.
     *
     * Does nothing if the received value is equal to the existing value.
     * There are no lock/unlock events.
     *
     * @param opts - Options bag.
     * @param opts.accounts - The exposed accounts, if any.
     * @param opts.isUnlocked - The latest isUnlocked value.
     */
    _handleUnlockStateChanged({ accounts, isUnlocked, } = {}) {
        if (typeof isUnlocked !== 'boolean') {
            this._log.error('MetaMask: Received invalid isUnlocked parameter. Please report this bug.');
            return;
        }
        if (isUnlocked !== this._state.isUnlocked) {
            this._state.isUnlocked = isUnlocked;
            this._handleAccountsChanged(accounts || []);
        }
    }
    /**
     * Warns of deprecation for the given event, if applicable.
     */
    _warnOfDeprecation(eventName) {
        if (this._state.sentWarnings.events[eventName] === false) {
            this._log.warn(messages_1.default.warnings.events[eventName]);
            this._state.sentWarnings.events[eventName] = true;
        }
    }
    /**
     * Constructor helper.
     * Gets experimental _metamask API as Proxy, so that we can warn consumers
     * about its experiment nature.
     */
    _getExperimentalApi() {
        return new Proxy({
            /**
             * Determines if MetaMask is unlocked by the user.
             *
             * @returns Promise resolving to true if MetaMask is currently unlocked
             */
            isUnlocked: async () => {
                if (!this._state.initialized) {
                    await new Promise((resolve) => {
                        this.on('_initialized', () => resolve());
                    });
                }
                return this._state.isUnlocked;
            },
            /**
             * Make a batch RPC request.
             */
            requestBatch: async (requests) => {
                if (!Array.isArray(requests)) {
                    throw eth_rpc_errors_1.ethErrors.rpc.invalidRequest({
                        message: 'Batch requests must be made with an array of request objects.',
                        data: requests,
                    });
                }
                return new Promise((resolve, reject) => {
                    this._rpcRequest(requests, utils_1.getRpcPromiseCallback(resolve, reject));
                });
            },
        }, {
            get: (obj, prop, ...args) => {
                if (!this._state.sentWarnings.experimentalMethods) {
                    this._log.warn(messages_1.default.warnings.experimentalMethods);
                    this._state.sentWarnings.experimentalMethods = true;
                }
                return Reflect.get(obj, prop, ...args);
            },
        });
    }
    //====================
    // Deprecated Methods
    //====================
    /**
     * Equivalent to: ethereum.request('eth_requestAccounts')
     *
     * @deprecated Use request({ method: 'eth_requestAccounts' }) instead.
     * @returns A promise that resolves to an array of addresses.
     */
    enable() {
        if (!this._state.sentWarnings.enable) {
            this._log.warn(messages_1.default.warnings.enableDeprecation);
            this._state.sentWarnings.enable = true;
        }
        return new Promise((resolve, reject) => {
            try {
                this._rpcRequest({ method: 'eth_requestAccounts', params: [] }, utils_1.getRpcPromiseCallback(resolve, reject));
            }
            catch (error) {
                reject(error);
            }
        });
    }
    send(methodOrPayload, callbackOrArgs) {
        if (!this._state.sentWarnings.send) {
            this._log.warn(messages_1.default.warnings.sendDeprecation);
            this._state.sentWarnings.send = true;
        }
        if (typeof methodOrPayload === 'string' &&
            (!callbackOrArgs || Array.isArray(callbackOrArgs))) {
            return new Promise((resolve, reject) => {
                try {
                    this._rpcRequest({ method: methodOrPayload, params: callbackOrArgs }, utils_1.getRpcPromiseCallback(resolve, reject, false));
                }
                catch (error) {
                    reject(error);
                }
            });
        }
        else if (methodOrPayload &&
            typeof methodOrPayload === 'object' &&
            typeof callbackOrArgs === 'function') {
            return this._rpcRequest(methodOrPayload, callbackOrArgs);
        }
        return this._sendSync(methodOrPayload);
    }
    /**
     * Internal backwards compatibility method, used in send.
     *
     * @deprecated
     */
    _sendSync(payload) {
        let result;
        switch (payload.method) {
            case 'eth_accounts':
                result = this.selectedAddress ? [this.selectedAddress] : [];
                break;
            case 'eth_coinbase':
                result = this.selectedAddress || null;
                break;
            case 'eth_uninstallFilter':
                this._rpcRequest(payload, utils_1.NOOP);
                result = true;
                break;
            case 'net_version':
                result = this.networkVersion || null;
                break;
            default:
                throw new Error(messages_1.default.errors.unsupportedSync(payload.method));
        }
        return {
            id: payload.id,
            jsonrpc: payload.jsonrpc,
            result,
        };
    }
}
exports.default = MetaMaskInpageProvider;
function validateLoggerObject(logger) {
    if (logger !== console) {
        if (typeof logger === 'object') {
            const methodKeys = ['log', 'warn', 'error', 'debug', 'info', 'trace'];
            for (const key of methodKeys) {
                if (typeof logger[key] !== 'function') {
                    throw new Error(messages_1.default.errors.invalidLoggerMethod(key));
                }
            }
            return;
        }
        throw new Error(messages_1.default.errors.invalidLoggerObject());
    }
}

},{"./messages":7,"./siteMetadata":9,"./utils":10,"@metamask/object-multiplex":13,"@metamask/safe-event-emitter":14,"eth-rpc-errors":24,"fast-deep-equal":28,"is-stream":33,"json-rpc-engine":40,"json-rpc-middleware-stream":44,"pump":48}],5:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shimWeb3 = exports.setGlobalProvider = exports.MetaMaskInpageProvider = exports.initializeProvider = void 0;
const MetaMaskInpageProvider_1 = __importDefault(require("./MetaMaskInpageProvider"));
exports.MetaMaskInpageProvider = MetaMaskInpageProvider_1.default;
const initializeProvider_1 = require("./initializeProvider");
Object.defineProperty(exports, "initializeProvider", { enumerable: true, get: function () { return initializeProvider_1.initializeProvider; } });
Object.defineProperty(exports, "setGlobalProvider", { enumerable: true, get: function () { return initializeProvider_1.setGlobalProvider; } });
const shimWeb3_1 = __importDefault(require("./shimWeb3"));
exports.shimWeb3 = shimWeb3_1.default;

},{"./MetaMaskInpageProvider":4,"./initializeProvider":6,"./shimWeb3":8}],6:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setGlobalProvider = exports.initializeProvider = void 0;
const MetaMaskInpageProvider_1 = __importDefault(require("./MetaMaskInpageProvider"));
const shimWeb3_1 = __importDefault(require("./shimWeb3"));
/**
 * Initializes a MetaMaskInpageProvider and (optionally) assigns it as window.ethereum.
 *
 * @param options - An options bag.
 * @param options.connectionStream - A Node.js stream.
 * @param options.jsonRpcStreamName - The name of the internal JSON-RPC stream.
 * @param options.maxEventListeners - The maximum number of event listeners.
 * @param options.shouldSendMetadata - Whether the provider should send page metadata.
 * @param options.shouldSetOnWindow - Whether the provider should be set as window.ethereum.
 * @param options.shouldShimWeb3 - Whether a window.web3 shim should be injected.
 * @returns The initialized provider (whether set or not).
 */
function initializeProvider({ connectionStream, jsonRpcStreamName, logger = console, maxEventListeners = 100, shouldSendMetadata = true, shouldSetOnWindow = true, shouldShimWeb3 = false, }) {
    let provider = new MetaMaskInpageProvider_1.default(connectionStream, {
        jsonRpcStreamName,
        logger,
        maxEventListeners,
        shouldSendMetadata,
    });
    provider = new Proxy(provider, {
        // some common libraries, e.g. web3@1.x, mess with our API
        deleteProperty: () => true,
    });
    if (shouldSetOnWindow) {
        setGlobalProvider(provider);
    }
    if (shouldShimWeb3) {
        shimWeb3_1.default(provider, logger);
    }
    return provider;
}
exports.initializeProvider = initializeProvider;
/**
 * Sets the given provider instance as window.ethereum and dispatches the
 * 'ethereum#initialized' event on window.
 *
 * @param providerInstance - The provider instance.
 */
function setGlobalProvider(providerInstance) {
    window.ethereum = providerInstance;
    window.dispatchEvent(new Event('ethereum#initialized'));
}
exports.setGlobalProvider = setGlobalProvider;

},{"./MetaMaskInpageProvider":4,"./shimWeb3":8}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const messages = {
    errors: {
        disconnected: () => 'MetaMask: Disconnected from chain. Attempting to connect.',
        permanentlyDisconnected: () => 'MetaMask: Disconnected from MetaMask background. Page reload required.',
        sendSiteMetadata: () => `MetaMask: Failed to send site metadata. This is an internal error, please report this bug.`,
        unsupportedSync: (method) => `MetaMask: The MetaMask Ethereum provider does not support synchronous methods like ${method} without a callback parameter.`,
        invalidDuplexStream: () => 'Must provide a Node.js-style duplex stream.',
        invalidOptions: (maxEventListeners, shouldSendMetadata) => `Invalid options. Received: { maxEventListeners: ${maxEventListeners}, shouldSendMetadata: ${shouldSendMetadata} }`,
        invalidRequestArgs: () => `Expected a single, non-array, object argument.`,
        invalidRequestMethod: () => `'args.method' must be a non-empty string.`,
        invalidRequestParams: () => `'args.params' must be an object or array if provided.`,
        invalidLoggerObject: () => `'args.logger' must be an object if provided.`,
        invalidLoggerMethod: (method) => `'args.logger' must include required method '${method}'.`,
    },
    info: {
        connected: (chainId) => `MetaMask: Connected to chain with ID "${chainId}".`,
    },
    warnings: {
        // deprecated methods
        enableDeprecation: `MetaMask: 'ethereum.enable()' is deprecated and may be removed in the future. Please use the 'eth_requestAccounts' RPC method instead.\nFor more information, see: https://eips.ethereum.org/EIPS/eip-1102`,
        sendDeprecation: `MetaMask: 'ethereum.send(...)' is deprecated and may be removed in the future. Please use 'ethereum.sendAsync(...)' or 'ethereum.request(...)' instead.\nFor more information, see: https://eips.ethereum.org/EIPS/eip-1193`,
        // deprecated events
        events: {
            close: `MetaMask: The event 'close' is deprecated and may be removed in the future. Please use 'disconnect' instead.\nFor more information, see: https://eips.ethereum.org/EIPS/eip-1193#disconnect`,
            data: `MetaMask: The event 'data' is deprecated and will be removed in the future. Use 'message' instead.\nFor more information, see: https://eips.ethereum.org/EIPS/eip-1193#message`,
            networkChanged: `MetaMask: The event 'networkChanged' is deprecated and may be removed in the future. Use 'chainChanged' instead.\nFor more information, see: https://eips.ethereum.org/EIPS/eip-1193#chainchanged`,
            notification: `MetaMask: The event 'notification' is deprecated and may be removed in the future. Use 'message' instead.\nFor more information, see: https://eips.ethereum.org/EIPS/eip-1193#message`,
        },
        // misc
        experimentalMethods: `MetaMask: 'ethereum._metamask' exposes non-standard, experimental methods. They may be removed or changed without warning.`,
    },
};
exports.default = messages;

},{}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * If no existing window.web3 is found, this function injects a web3 "shim" to
 * not break dapps that rely on window.web3.currentProvider.
 *
 * @param provider - The provider to set as window.web3.currentProvider.
 * @param log - The logging API to use.
 */
function shimWeb3(provider, log = console) {
    let loggedCurrentProvider = false;
    let loggedMissingProperty = false;
    if (!window.web3) {
        const SHIM_IDENTIFIER = '__isMetaMaskShim__';
        let web3Shim = { currentProvider: provider };
        Object.defineProperty(web3Shim, SHIM_IDENTIFIER, {
            value: true,
            enumerable: true,
            configurable: false,
            writable: false,
        });
        web3Shim = new Proxy(web3Shim, {
            get: (target, property, ...args) => {
                if (property === 'currentProvider' && !loggedCurrentProvider) {
                    loggedCurrentProvider = true;
                    log.warn('You are accessing the MetaMask window.web3.currentProvider shim. This property is deprecated; use window.ethereum instead. For details, see: https://docs.metamask.io/guide/provider-migration.html#replacing-window-web3');
                }
                else if (property !== SHIM_IDENTIFIER && !loggedMissingProperty) {
                    loggedMissingProperty = true;
                    log.error(`MetaMask no longer injects web3. For details, see: https://docs.metamask.io/guide/provider-migration.html#replacing-window-web3`);
                    provider.request({ method: 'metamask_logWeb3ShimUsage' })
                        .catch((error) => {
                        log.debug('MetaMask: Failed to log web3 shim usage.', error);
                    });
                }
                return Reflect.get(target, property, ...args);
            },
            set: (...args) => {
                log.warn('You are accessing the MetaMask window.web3 shim. This object is deprecated; use window.ethereum instead. For details, see: https://docs.metamask.io/guide/provider-migration.html#replacing-window-web3');
                return Reflect.set(...args);
            },
        });
        Object.defineProperty(window, 'web3', {
            value: web3Shim,
            enumerable: false,
            configurable: true,
            writable: true,
        });
    }
}
exports.default = shimWeb3;

},{}],9:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const messages_1 = __importDefault(require("./messages"));
const utils_1 = require("./utils");
/**
 * Sends site metadata over an RPC request.
 *
 * @param engine - The JSON RPC Engine to send metadata over.
 * @param log - The logging API to use.
 */
async function sendSiteMetadata(engine, log) {
    try {
        const domainMetadata = await getSiteMetadata();
        // call engine.handle directly to avoid normal RPC request handling
        engine.handle({
            jsonrpc: '2.0',
            id: 1,
            method: 'metamask_sendDomainMetadata',
            params: domainMetadata,
        }, utils_1.NOOP);
    }
    catch (error) {
        log.error({
            message: messages_1.default.errors.sendSiteMetadata(),
            originalError: error,
        });
    }
}
exports.default = sendSiteMetadata;
/**
 * Gets site metadata and returns it
 *
 */
async function getSiteMetadata() {
    return {
        name: getSiteName(window),
        icon: await getSiteIcon(window),
    };
}
/**
 * Extracts a name for the site from the DOM
 */
function getSiteName(windowObject) {
    const { document } = windowObject;
    const siteName = document.querySelector('head > meta[property="og:site_name"]');
    if (siteName) {
        return siteName.content;
    }
    const metaTitle = document.querySelector('head > meta[name="title"]');
    if (metaTitle) {
        return metaTitle.content;
    }
    if (document.title && document.title.length > 0) {
        return document.title;
    }
    return window.location.hostname;
}
/**
 * Extracts an icon for the site from the DOM
 * @returns an icon URL
 */
async function getSiteIcon(windowObject) {
    const { document } = windowObject;
    const icons = document.querySelectorAll('head > link[rel~="icon"]');
    for (const icon of icons) {
        if (icon && await imgExists(icon.href)) {
            return icon.href;
        }
    }
    return null;
}
/**
 * Returns whether the given image URL exists
 * @param url - the url of the image
 * @returns Whether the image exists.
 */
function imgExists(url) {
    return new Promise((resolve, reject) => {
        try {
            const img = document.createElement('img');
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
        }
        catch (e) {
            reject(e);
        }
    });
}

},{"./messages":7,"./utils":10}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMITTED_NOTIFICATIONS = exports.NOOP = exports.logStreamDisconnectWarning = exports.getRpcPromiseCallback = exports.createErrorMiddleware = void 0;
const eth_rpc_errors_1 = require("eth-rpc-errors");
// utility functions
/**
 * json-rpc-engine middleware that logs RPC errors and and validates req.method.
 *
 * @param log - The logging API to use.
 * @returns  json-rpc-engine middleware function
 */
function createErrorMiddleware(log) {
    return (req, res, next) => {
        // json-rpc-engine will terminate the request when it notices this error
        if (typeof req.method !== 'string' || !req.method) {
            res.error = eth_rpc_errors_1.ethErrors.rpc.invalidRequest({
                message: `The request 'method' must be a non-empty string.`,
                data: req,
            });
        }
        next((done) => {
            const { error } = res;
            if (!error) {
                return done();
            }
            log.error(`MetaMask - RPC Error: ${error.message}`, error);
            return done();
        });
    };
}
exports.createErrorMiddleware = createErrorMiddleware;
// resolve response.result or response, reject errors
const getRpcPromiseCallback = (resolve, reject, unwrapResult = true) => (error, response) => {
    if (error || response.error) {
        reject(error || response.error);
    }
    else {
        !unwrapResult || Array.isArray(response)
            ? resolve(response)
            : resolve(response.result);
    }
};
exports.getRpcPromiseCallback = getRpcPromiseCallback;
/**
 * Logs a stream disconnection error. Emits an 'error' if given an
 * EventEmitter that has listeners for the 'error' event.
 *
 * @param log - The logging API to use.
 * @param remoteLabel - The label of the disconnected stream.
 * @param error - The associated error to log.
 * @param emitter - The logging API to use.
 */
function logStreamDisconnectWarning(log, remoteLabel, error, emitter) {
    let warningMsg = `MetaMask: Lost connection to "${remoteLabel}".`;
    if (error === null || error === void 0 ? void 0 : error.stack) {
        warningMsg += `\n${error.stack}`;
    }
    log.warn(warningMsg);
    if (emitter && emitter.listenerCount('error') > 0) {
        emitter.emit('error', warningMsg);
    }
}
exports.logStreamDisconnectWarning = logStreamDisconnectWarning;
const NOOP = () => undefined;
exports.NOOP = NOOP;
// constants
exports.EMITTED_NOTIFICATIONS = [
    'eth_subscription',
];

},{"eth-rpc-errors":24}],11:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectMultiplex = void 0;
const readable_stream_1 = require("readable-stream");
const end_of_stream_1 = __importDefault(require("end-of-stream"));
const once_1 = __importDefault(require("once"));
const Substream_1 = require("./Substream");
const IGNORE_SUBSTREAM = Symbol('IGNORE_SUBSTREAM');
class ObjectMultiplex extends readable_stream_1.Duplex {
    constructor(opts = {}) {
        super(Object.assign(Object.assign({}, opts), { objectMode: true }));
        this._substreams = {};
    }
    createStream(name) {
        // validate name
        if (!name) {
            throw new Error('ObjectMultiplex - name must not be empty');
        }
        if (this._substreams[name]) {
            throw new Error(`ObjectMultiplex - Substream for name "${name}" already exists`);
        }
        // create substream
        const substream = new Substream_1.Substream({ parent: this, name });
        this._substreams[name] = substream;
        // listen for parent stream to end
        anyStreamEnd(this, (_error) => {
            return substream.destroy(_error || undefined);
        });
        return substream;
    }
    // ignore streams (dont display orphaned data warning)
    ignoreStream(name) {
        // validate name
        if (!name) {
            throw new Error('ObjectMultiplex - name must not be empty');
        }
        if (this._substreams[name]) {
            throw new Error(`ObjectMultiplex - Substream for name "${name}" already exists`);
        }
        // set
        this._substreams[name] = IGNORE_SUBSTREAM;
    }
    _read() {
        return undefined;
    }
    _write(chunk, _encoding, callback) {
        const { name, data } = chunk;
        if (!name) {
            console.warn(`ObjectMultiplex - malformed chunk without name "${chunk}"`);
            return callback();
        }
        // get corresponding substream
        const substream = this._substreams[name];
        if (!substream) {
            console.warn(`ObjectMultiplex - orphaned data for stream "${name}"`);
            return callback();
        }
        // push data into substream
        if (substream !== IGNORE_SUBSTREAM) {
            substream.push(data);
        }
        return callback();
    }
}
exports.ObjectMultiplex = ObjectMultiplex;
// util
function anyStreamEnd(stream, _cb) {
    const cb = once_1.default(_cb);
    end_of_stream_1.default(stream, { readable: false }, cb);
    end_of_stream_1.default(stream, { writable: false }, cb);
}

},{"./Substream":12,"end-of-stream":20,"once":45,"readable-stream":57}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Substream = void 0;
const readable_stream_1 = require("readable-stream");
class Substream extends readable_stream_1.Duplex {
    constructor({ parent, name }) {
        super({ objectMode: true });
        this._parent = parent;
        this._name = name;
    }
    /**
     * Explicitly sets read operations to a no-op.
     */
    _read() {
        return undefined;
    }
    /**
     * Called when data should be written to this writable stream.
     *
     * @param chunk - Arbitrary object to write
     * @param encoding - Encoding to use when writing payload
     * @param callback - Called when writing is complete or an error occurs
     */
    _write(chunk, _encoding, callback) {
        this._parent.push({
            name: this._name,
            data: chunk,
        });
        callback();
    }
}
exports.Substream = Substream;

},{"readable-stream":57}],13:[function(require,module,exports){
"use strict";
const ObjectMultiplex_1 = require("./ObjectMultiplex");
module.exports = ObjectMultiplex_1.ObjectMultiplex;

},{"./ObjectMultiplex":11}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
function safeApply(handler, context, args) {
    try {
        Reflect.apply(handler, context, args);
    }
    catch (err) {
        // Throw error after timeout so as not to interrupt the stack
        setTimeout(() => {
            throw err;
        });
    }
}
function arrayClone(arr) {
    const n = arr.length;
    const copy = new Array(n);
    for (let i = 0; i < n; i += 1) {
        copy[i] = arr[i];
    }
    return copy;
}
class SafeEventEmitter extends events_1.EventEmitter {
    emit(type, ...args) {
        let doError = type === 'error';
        const events = this._events;
        if (events !== undefined) {
            doError = doError && events.error === undefined;
        }
        else if (!doError) {
            return false;
        }
        // If there is no 'error' event listener then throw.
        if (doError) {
            let er;
            if (args.length > 0) {
                [er] = args;
            }
            if (er instanceof Error) {
                // Note: The comments on the `throw` lines are intentional, they show
                // up in Node's output if this results in an unhandled exception.
                throw er; // Unhandled 'error' event
            }
            // At least give some kind of context to the user
            const err = new Error(`Unhandled error.${er ? ` (${er.message})` : ''}`);
            err.context = er;
            throw err; // Unhandled 'error' event
        }
        const handler = events[type];
        if (handler === undefined) {
            return false;
        }
        if (typeof handler === 'function') {
            safeApply(handler, this, args);
        }
        else {
            const len = handler.length;
            const listeners = arrayClone(handler);
            for (let i = 0; i < len; i += 1) {
                safeApply(listeners[i], this, args);
            }
        }
        return true;
    }
}
exports.default = SafeEventEmitter;

},{"events":26}],15:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],16:[function(require,module,exports){
(function (process){(function (){
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global.browserDetect = factory());
}(this, (function () { 'use strict';

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */

    var __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };

    var browsers = [
        ['firefox', /Firefox\/([0-9\.]+)(?:\s|$)/],
        ['opera', /Opera\/([0-9\.]+)(?:\s|$)/],
        ['opera', /OPR\/([0-9\.]+)(:?\s|$)$/],
        ['edge', /Edge\/([0-9\._]+)/],
        ['ie', /Trident\/7\.0.*rv\:([0-9\.]+)\).*Gecko$/],
        ['ie', /MSIE\s([0-9\.]+);.*Trident\/[4-7].0/],
        ['ie', /MSIE\s(7\.0)/],
        ['safari', /Version\/([0-9\._]+).*Safari/],
        ['chrome', /(?!Chrom.*OPR)Chrom(?:e|ium)\/([0-9\.]+)(:?\s|$)/],
        ['bb10', /BB10;\sTouch.*Version\/([0-9\.]+)/],
        ['android', /Android\s([0-9\.]+)/],
        ['ios', /Version\/([0-9\._]+).*Mobile.*Safari.*/],
        ['yandexbrowser', /YaBrowser\/([0-9\._]+)/],
        ['crios', /CriOS\/([0-9\.]+)(:?\s|$)/]
    ];
    var os = [
        'Windows Phone',
        'Android',
        'CentOS',
        { name: 'Chrome OS', pattern: 'CrOS' },
        'Debian',
        'Fedora',
        'FreeBSD',
        'Gentoo',
        'Haiku',
        'Kubuntu',
        'Linux Mint',
        'OpenBSD',
        'Red Hat',
        'SuSE',
        'Ubuntu',
        'Xubuntu',
        'Cygwin',
        'Symbian OS',
        'hpwOS',
        'webOS ',
        'webOS',
        'Tablet OS',
        'Tizen',
        'Linux',
        'Mac OS X',
        'Macintosh',
        'Mac',
        'Windows 98;',
        'Windows '
    ];
    var osVersions = {
        '10.0': '10',
        '6.4': '10 Technical Preview',
        '6.3': '8.1',
        '6.2': '8',
        '6.1': 'Server 2008 R2 / 7',
        '6.0': 'Server 2008 / Vista',
        '5.2': 'Server 2003 / XP 64-bit',
        '5.1': 'XP',
        '5.01': '2000 SP1',
        '5.0': '2000',
        '4.0': 'NT',
        '4.90': 'ME'
    };

    var mobileRegExp = new RegExp(['(android|bb\\d+|meego).+mobile|avantgo|bada\\/|blackberry|blazer|',
        'compal|elaine|fennec|hiptop|iemobile|ip(hone|od|ad)|iris|kindle|lge |maemo|',
        'midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)',
        '\\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\\.(browser|link)|vodafone|',
        'wap|windows ce|xda|xiino'].join(''), 'i');
    var mobilePrefixRegExp = new RegExp(['1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\\-)|',
        'ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\\-m|r |s )|',
        'avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\\-(n|u)|c55\\/|capi|ccwa|cdm\\-|',
        'cell|chtm|cldc|cmd\\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\\-s|devi|dica|dmob|do(c|p)o|',
        'ds(12|\\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\\-|_)|',
        'g1 u|g560|gene|gf\\-5|g\\-mo|go(\\.w|od)|gr(ad|un)|haie|hcit|hd\\-(m|p|t)|hei\\-|',
        'hi(pt|ta)|hp( i|ip)|hs\\-c|ht(c(\\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\\-(20|go|ma)|',
        'i230|iac( |\\-|\\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|',
        'kddi|keji|kgt( |\\/)|klon|kpt |kwc\\-|kyo(c|k)|le(no|xi)|lg( g|\\/(k|l|u)|50|54|\\-[a-w])',
        '|libw|lynx|m1\\-w|m3ga|m50\\/|ma(te|ui|xo)|mc(01|21|ca)|m\\-cr|me(rc|ri)|mi(o8|oa|ts)|',
        'mmef|mo(01|02|bi|de|do|t(\\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|',
        'n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|',
        'op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\\-2|',
        'po(ck|rt|se)|prox|psio|pt\\-g|qa\\-a|qc(07|12|21|32|60|\\-[2-7]|i\\-)|qtek|r380|r600|',
        'raks|rim9|ro(ve|zo)|s55\\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\\-|oo|p\\-)|sdk\\/|',
        'se(c(\\-|0|1)|47|mc|nd|ri)|sgh\\-|shar|sie(\\-|m)|k\\-0|sl(45|id)|sm(al|ar|b3|it|t5)|',
        'so(ft|ny)|sp(01|h\\-|v\\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\\-|tdg\\-|',
        'tel(i|m)|tim\\-|t\\-mo|to(pl|sh)|ts(70|m\\-|m3|m5)|tx\\-9|up(\\.b|g1|si)|utst|v400|v750|',
        'veri|vi(rg|te)|vk(40|5[0-3]|\\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|',
        'w3c(\\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\\-|your|zeto|zte\\-'].join(''), 'i');

    var Detector = /** @class */ (function () {
        function Detector(userAgent, navigator, process) {
            this.navigator = navigator;
            this.process = process;
            this.userAgent = userAgent
                ? userAgent
                : this.navigator ? (navigator.userAgent || navigator.vendor) : '';
        }
        Detector.prototype.detect = function () {
            if (this.process && !this.userAgent) {
                var version = this.process.version.slice(1).split('.').slice(0, 3);
                var versionTail = Array.prototype.slice.call(version, 1).join('') || '0';
                return {
                    name: 'node',
                    version: version.join('.'),
                    versionNumber: parseFloat(version[0] + "." + versionTail),
                    mobile: false,
                    os: this.process.platform
                };
            }
            if (!this.userAgent)
                this.handleMissingError();
            return __assign({}, this.checkBrowser(), this.checkMobile(), this.checkOs());
        };
        Detector.prototype.checkBrowser = function () {
            var _this = this;
            return browsers
                .filter(function (definition) { return definition[1].test(_this.userAgent); })
                .map(function (definition) {
                var match = definition[1].exec(_this.userAgent);
                var version = match && match[1].split(/[._]/).slice(0, 3);
                var versionTails = Array.prototype.slice.call(version, 1).join('') || '0';
                if (version && version.length < 3)
                    Array.prototype.push.apply(version, version.length === 1 ? [0, 0] : [0]);
                return {
                    name: String(definition[0]),
                    version: version.join('.'),
                    versionNumber: Number(version[0] + "." + versionTails)
                };
            })
                .shift();
        };
        Detector.prototype.checkMobile = function () {
            var agentPrefix = this.userAgent.substr(0, 4);
            var mobile = mobileRegExp.test(this.userAgent) || mobilePrefixRegExp.test(agentPrefix);
            return { mobile: mobile };
        };
        Detector.prototype.checkOs = function () {
            var _this = this;
            return os
                .map(function (definition) {
                var name = definition.name || definition;
                var pattern = _this.getOsPattern(definition);
                return {
                    name: name,
                    pattern: pattern,
                    value: RegExp("\\b" + pattern.replace(/([ -])(?!$)/g, '$1?') + "(?:x?[\\d._]+|[ \\w.]*)", 'i').exec(_this.userAgent)
                };
            })
                .filter(function (definition) { return definition.value; })
                .map(function (definition) {
                var os$$1 = definition.value[0] || '';
                var osSuffix;
                if (definition.pattern &&
                    definition.name &&
                    /^Win/i.test(os$$1) &&
                    !/^Windows Phone /i.test(os$$1) &&
                    (osSuffix = osVersions[os$$1.replace(/[^\d.]/g, '')]))
                    os$$1 = "Windows " + osSuffix;
                if (definition.pattern && definition.name)
                    os$$1 = os$$1.replace(RegExp(definition.pattern, 'i'), definition.name);
                os$$1 = os$$1
                    .replace(/ ce$/i, ' CE')
                    .replace(/\bhpw/i, 'web')
                    .replace(/\bMacintosh\b/, 'Mac OS')
                    .replace(/_PowerPC\b/i, ' OS')
                    .replace(/\b(OS X) [^ \d]+/i, '$1')
                    .replace(/\bMac (OS X)\b/, '$1')
                    .replace(/\/(\d)/, ' $1')
                    .replace(/_/g, '.')
                    .replace(/(?: BePC|[ .]*fc[ \d.]+)$/i, '')
                    .replace(/\bx86\.64\b/gi, 'x86_64')
                    .replace(/\b(Windows Phone) OS\b/, '$1')
                    .replace(/\b(Chrome OS \w+) [\d.]+\b/, '$1')
                    .split(' on ')[0]
                    .trim();
                os$$1 = /^(?:webOS|i(?:OS|P))/.test(os$$1)
                    ? os$$1
                    : (os$$1.charAt(0).toUpperCase() + os$$1.slice(1));
                return { os: os$$1 };
            })
                .shift();
        };
        Detector.prototype.getOsPattern = function (definition) {
            var definitionInterface = definition;
            return (typeof definition === 'string'
                ? definition
                : undefined) ||
                definitionInterface.pattern ||
                definitionInterface.name;
        };
        Detector.prototype.handleMissingError = function () {
            throw new Error('Please give user-agent.\n> browser(navigator.userAgent or res.headers[\'user-agent\']).');
        };
        return Detector;
    }());

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var _global = createCommonjsModule(function (module) {
    // https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
    var global = module.exports = typeof window != 'undefined' && window.Math == Math
      ? window : typeof self != 'undefined' && self.Math == Math ? self
      // eslint-disable-next-line no-new-func
      : Function('return this')();
    if (typeof __g == 'number') __g = global; // eslint-disable-line no-undef
    });

    var _core = createCommonjsModule(function (module) {
    var core = module.exports = { version: '2.5.7' };
    if (typeof __e == 'number') __e = core; // eslint-disable-line no-undef
    });
    var _core_1 = _core.version;

    var _isObject = function (it) {
      return typeof it === 'object' ? it !== null : typeof it === 'function';
    };

    var _anObject = function (it) {
      if (!_isObject(it)) throw TypeError(it + ' is not an object!');
      return it;
    };

    var _fails = function (exec) {
      try {
        return !!exec();
      } catch (e) {
        return true;
      }
    };

    // Thank's IE8 for his funny defineProperty
    var _descriptors = !_fails(function () {
      return Object.defineProperty({}, 'a', { get: function () { return 7; } }).a != 7;
    });

    var document = _global.document;
    // typeof document.createElement is 'object' in old IE
    var is = _isObject(document) && _isObject(document.createElement);
    var _domCreate = function (it) {
      return is ? document.createElement(it) : {};
    };

    var _ie8DomDefine = !_descriptors && !_fails(function () {
      return Object.defineProperty(_domCreate('div'), 'a', { get: function () { return 7; } }).a != 7;
    });

    // 7.1.1 ToPrimitive(input [, PreferredType])

    // instead of the ES6 spec version, we didn't implement @@toPrimitive case
    // and the second argument - flag - preferred type is a string
    var _toPrimitive = function (it, S) {
      if (!_isObject(it)) return it;
      var fn, val;
      if (S && typeof (fn = it.toString) == 'function' && !_isObject(val = fn.call(it))) return val;
      if (typeof (fn = it.valueOf) == 'function' && !_isObject(val = fn.call(it))) return val;
      if (!S && typeof (fn = it.toString) == 'function' && !_isObject(val = fn.call(it))) return val;
      throw TypeError("Can't convert object to primitive value");
    };

    var dP = Object.defineProperty;

    var f = _descriptors ? Object.defineProperty : function defineProperty(O, P, Attributes) {
      _anObject(O);
      P = _toPrimitive(P, true);
      _anObject(Attributes);
      if (_ie8DomDefine) try {
        return dP(O, P, Attributes);
      } catch (e) { /* empty */ }
      if ('get' in Attributes || 'set' in Attributes) throw TypeError('Accessors not supported!');
      if ('value' in Attributes) O[P] = Attributes.value;
      return O;
    };

    var _objectDp = {
    	f: f
    };

    var _propertyDesc = function (bitmap, value) {
      return {
        enumerable: !(bitmap & 1),
        configurable: !(bitmap & 2),
        writable: !(bitmap & 4),
        value: value
      };
    };

    var _hide = _descriptors ? function (object, key, value) {
      return _objectDp.f(object, key, _propertyDesc(1, value));
    } : function (object, key, value) {
      object[key] = value;
      return object;
    };

    var hasOwnProperty = {}.hasOwnProperty;
    var _has = function (it, key) {
      return hasOwnProperty.call(it, key);
    };

    var id = 0;
    var px = Math.random();
    var _uid = function (key) {
      return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
    };

    var _redefine = createCommonjsModule(function (module) {
    var SRC = _uid('src');
    var TO_STRING = 'toString';
    var $toString = Function[TO_STRING];
    var TPL = ('' + $toString).split(TO_STRING);

    _core.inspectSource = function (it) {
      return $toString.call(it);
    };

    (module.exports = function (O, key, val, safe) {
      var isFunction = typeof val == 'function';
      if (isFunction) _has(val, 'name') || _hide(val, 'name', key);
      if (O[key] === val) return;
      if (isFunction) _has(val, SRC) || _hide(val, SRC, O[key] ? '' + O[key] : TPL.join(String(key)));
      if (O === _global) {
        O[key] = val;
      } else if (!safe) {
        delete O[key];
        _hide(O, key, val);
      } else if (O[key]) {
        O[key] = val;
      } else {
        _hide(O, key, val);
      }
    // add fake Function#toString for correct work wrapped methods / constructors with methods like LoDash isNative
    })(Function.prototype, TO_STRING, function toString() {
      return typeof this == 'function' && this[SRC] || $toString.call(this);
    });
    });

    var _aFunction = function (it) {
      if (typeof it != 'function') throw TypeError(it + ' is not a function!');
      return it;
    };

    // optional / simple context binding

    var _ctx = function (fn, that, length) {
      _aFunction(fn);
      if (that === undefined) return fn;
      switch (length) {
        case 1: return function (a) {
          return fn.call(that, a);
        };
        case 2: return function (a, b) {
          return fn.call(that, a, b);
        };
        case 3: return function (a, b, c) {
          return fn.call(that, a, b, c);
        };
      }
      return function (/* ...args */) {
        return fn.apply(that, arguments);
      };
    };

    var PROTOTYPE = 'prototype';

    var $export = function (type, name, source) {
      var IS_FORCED = type & $export.F;
      var IS_GLOBAL = type & $export.G;
      var IS_STATIC = type & $export.S;
      var IS_PROTO = type & $export.P;
      var IS_BIND = type & $export.B;
      var target = IS_GLOBAL ? _global : IS_STATIC ? _global[name] || (_global[name] = {}) : (_global[name] || {})[PROTOTYPE];
      var exports = IS_GLOBAL ? _core : _core[name] || (_core[name] = {});
      var expProto = exports[PROTOTYPE] || (exports[PROTOTYPE] = {});
      var key, own, out, exp;
      if (IS_GLOBAL) source = name;
      for (key in source) {
        // contains in native
        own = !IS_FORCED && target && target[key] !== undefined;
        // export native or passed
        out = (own ? target : source)[key];
        // bind timers to global for call from export context
        exp = IS_BIND && own ? _ctx(out, _global) : IS_PROTO && typeof out == 'function' ? _ctx(Function.call, out) : out;
        // extend global
        if (target) _redefine(target, key, out, type & $export.U);
        // export
        if (exports[key] != out) _hide(exports, key, exp);
        if (IS_PROTO && expProto[key] != out) expProto[key] = out;
      }
    };
    _global.core = _core;
    // type bitmap
    $export.F = 1;   // forced
    $export.G = 2;   // global
    $export.S = 4;   // static
    $export.P = 8;   // proto
    $export.B = 16;  // bind
    $export.W = 32;  // wrap
    $export.U = 64;  // safe
    $export.R = 128; // real proto method for `library`
    var _export = $export;

    var toString = {}.toString;

    var _cof = function (it) {
      return toString.call(it).slice(8, -1);
    };

    // fallback for non-array-like ES3 and non-enumerable old V8 strings

    // eslint-disable-next-line no-prototype-builtins
    var _iobject = Object('z').propertyIsEnumerable(0) ? Object : function (it) {
      return _cof(it) == 'String' ? it.split('') : Object(it);
    };

    // 7.2.1 RequireObjectCoercible(argument)
    var _defined = function (it) {
      if (it == undefined) throw TypeError("Can't call method on  " + it);
      return it;
    };

    // 7.1.13 ToObject(argument)

    var _toObject = function (it) {
      return Object(_defined(it));
    };

    // 7.1.4 ToInteger
    var ceil = Math.ceil;
    var floor = Math.floor;
    var _toInteger = function (it) {
      return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
    };

    // 7.1.15 ToLength

    var min = Math.min;
    var _toLength = function (it) {
      return it > 0 ? min(_toInteger(it), 0x1fffffffffffff) : 0; // pow(2, 53) - 1 == 9007199254740991
    };

    // 7.2.2 IsArray(argument)

    var _isArray = Array.isArray || function isArray(arg) {
      return _cof(arg) == 'Array';
    };

    var _shared = createCommonjsModule(function (module) {
    var SHARED = '__core-js_shared__';
    var store = _global[SHARED] || (_global[SHARED] = {});

    (module.exports = function (key, value) {
      return store[key] || (store[key] = value !== undefined ? value : {});
    })('versions', []).push({
      version: _core.version,
      mode: 'global',
      copyright: '© 2018 Denis Pushkarev (zloirock.ru)'
    });
    });

    var _wks = createCommonjsModule(function (module) {
    var store = _shared('wks');

    var Symbol = _global.Symbol;
    var USE_SYMBOL = typeof Symbol == 'function';

    var $exports = module.exports = function (name) {
      return store[name] || (store[name] =
        USE_SYMBOL && Symbol[name] || (USE_SYMBOL ? Symbol : _uid)('Symbol.' + name));
    };

    $exports.store = store;
    });

    var SPECIES = _wks('species');

    var _arraySpeciesConstructor = function (original) {
      var C;
      if (_isArray(original)) {
        C = original.constructor;
        // cross-realm fallback
        if (typeof C == 'function' && (C === Array || _isArray(C.prototype))) C = undefined;
        if (_isObject(C)) {
          C = C[SPECIES];
          if (C === null) C = undefined;
        }
      } return C === undefined ? Array : C;
    };

    // 9.4.2.3 ArraySpeciesCreate(originalArray, length)


    var _arraySpeciesCreate = function (original, length) {
      return new (_arraySpeciesConstructor(original))(length);
    };

    // 0 -> Array#forEach
    // 1 -> Array#map
    // 2 -> Array#filter
    // 3 -> Array#some
    // 4 -> Array#every
    // 5 -> Array#find
    // 6 -> Array#findIndex





    var _arrayMethods = function (TYPE, $create) {
      var IS_MAP = TYPE == 1;
      var IS_FILTER = TYPE == 2;
      var IS_SOME = TYPE == 3;
      var IS_EVERY = TYPE == 4;
      var IS_FIND_INDEX = TYPE == 6;
      var NO_HOLES = TYPE == 5 || IS_FIND_INDEX;
      var create = $create || _arraySpeciesCreate;
      return function ($this, callbackfn, that) {
        var O = _toObject($this);
        var self = _iobject(O);
        var f = _ctx(callbackfn, that, 3);
        var length = _toLength(self.length);
        var index = 0;
        var result = IS_MAP ? create($this, length) : IS_FILTER ? create($this, 0) : undefined;
        var val, res;
        for (;length > index; index++) if (NO_HOLES || index in self) {
          val = self[index];
          res = f(val, index, O);
          if (TYPE) {
            if (IS_MAP) result[index] = res;   // map
            else if (res) switch (TYPE) {
              case 3: return true;             // some
              case 5: return val;              // find
              case 6: return index;            // findIndex
              case 2: result.push(val);        // filter
            } else if (IS_EVERY) return false; // every
          }
        }
        return IS_FIND_INDEX ? -1 : IS_SOME || IS_EVERY ? IS_EVERY : result;
      };
    };

    var _strictMethod = function (method, arg) {
      return !!method && _fails(function () {
        // eslint-disable-next-line no-useless-call
        arg ? method.call(null, function () { /* empty */ }, 1) : method.call(null);
      });
    };

    var $filter = _arrayMethods(2);

    _export(_export.P + _export.F * !_strictMethod([].filter, true), 'Array', {
      // 22.1.3.7 / 15.4.4.20 Array.prototype.filter(callbackfn [, thisArg])
      filter: function filter(callbackfn /* , thisArg */) {
        return $filter(this, callbackfn, arguments[1]);
      }
    });

    var filter = _core.Array.filter;

    var $map = _arrayMethods(1);

    _export(_export.P + _export.F * !_strictMethod([].map, true), 'Array', {
      // 22.1.3.15 / 15.4.4.19 Array.prototype.map(callbackfn [, thisArg])
      map: function map(callbackfn /* , thisArg */) {
        return $map(this, callbackfn, arguments[1]);
      }
    });

    var map = _core.Array.map;

    var _stringWs = '\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003' +
      '\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF';

    var space = '[' + _stringWs + ']';
    var non = '\u200b\u0085';
    var ltrim = RegExp('^' + space + space + '*');
    var rtrim = RegExp(space + space + '*$');

    var exporter = function (KEY, exec, ALIAS) {
      var exp = {};
      var FORCE = _fails(function () {
        return !!_stringWs[KEY]() || non[KEY]() != non;
      });
      var fn = exp[KEY] = FORCE ? exec(trim) : _stringWs[KEY];
      if (ALIAS) exp[ALIAS] = fn;
      _export(_export.P + _export.F * FORCE, 'String', exp);
    };

    // 1 -> String#trimLeft
    // 2 -> String#trimRight
    // 3 -> String#trim
    var trim = exporter.trim = function (string, TYPE) {
      string = String(_defined(string));
      if (TYPE & 1) string = string.replace(ltrim, '');
      if (TYPE & 2) string = string.replace(rtrim, '');
      return string;
    };

    var _stringTrim = exporter;

    // 21.1.3.25 String.prototype.trim()
    _stringTrim('trim', function ($trim) {
      return function trim() {
        return $trim(this, 3);
      };
    });

    var trim$1 = _core.String.trim;

    var injectableNavigator = typeof window !== 'undefined'
        ? window.navigator
        : undefined;
    var injectableProcess = typeof process !== 'undefined'
        ? process
        : undefined;
    function browserDetect (userAgent) {
        var detector = new Detector(userAgent, injectableNavigator, injectableProcess);
        return detector.detect();
    }

    return browserDetect;

})));


}).call(this)}).call(this,require('_process'))
},{"_process":47}],17:[function(require,module,exports){

},{}],18:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":15,"buffer":18,"ieee754":30}],19:[function(require,module,exports){
(function (Buffer){(function (){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.

function isArray(arg) {
  if (Array.isArray) {
    return Array.isArray(arg);
  }
  return objectToString(arg) === '[object Array]';
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = Buffer.isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}

}).call(this)}).call(this,{"isBuffer":require("../../is-buffer/index.js")})
},{"../../is-buffer/index.js":32}],20:[function(require,module,exports){
(function (process){(function (){
var once = require('once');

var noop = function() {};

var isRequest = function(stream) {
	return stream.setHeader && typeof stream.abort === 'function';
};

var isChildProcess = function(stream) {
	return stream.stdio && Array.isArray(stream.stdio) && stream.stdio.length === 3
};

var eos = function(stream, opts, callback) {
	if (typeof opts === 'function') return eos(stream, null, opts);
	if (!opts) opts = {};

	callback = once(callback || noop);

	var ws = stream._writableState;
	var rs = stream._readableState;
	var readable = opts.readable || (opts.readable !== false && stream.readable);
	var writable = opts.writable || (opts.writable !== false && stream.writable);
	var cancelled = false;

	var onlegacyfinish = function() {
		if (!stream.writable) onfinish();
	};

	var onfinish = function() {
		writable = false;
		if (!readable) callback.call(stream);
	};

	var onend = function() {
		readable = false;
		if (!writable) callback.call(stream);
	};

	var onexit = function(exitCode) {
		callback.call(stream, exitCode ? new Error('exited with error code: ' + exitCode) : null);
	};

	var onerror = function(err) {
		callback.call(stream, err);
	};

	var onclose = function() {
		process.nextTick(onclosenexttick);
	};

	var onclosenexttick = function() {
		if (cancelled) return;
		if (readable && !(rs && (rs.ended && !rs.destroyed))) return callback.call(stream, new Error('premature close'));
		if (writable && !(ws && (ws.ended && !ws.destroyed))) return callback.call(stream, new Error('premature close'));
	};

	var onrequest = function() {
		stream.req.on('finish', onfinish);
	};

	if (isRequest(stream)) {
		stream.on('complete', onfinish);
		stream.on('abort', onclose);
		if (stream.req) onrequest();
		else stream.on('request', onrequest);
	} else if (writable && !ws) { // legacy streams
		stream.on('end', onlegacyfinish);
		stream.on('close', onlegacyfinish);
	}

	if (isChildProcess(stream)) stream.on('exit', onexit);

	stream.on('end', onend);
	stream.on('finish', onfinish);
	if (opts.error !== false) stream.on('error', onerror);
	stream.on('close', onclose);

	return function() {
		cancelled = true;
		stream.removeListener('complete', onfinish);
		stream.removeListener('abort', onclose);
		stream.removeListener('request', onrequest);
		if (stream.req) stream.req.removeListener('finish', onfinish);
		stream.removeListener('end', onlegacyfinish);
		stream.removeListener('close', onlegacyfinish);
		stream.removeListener('finish', onfinish);
		stream.removeListener('exit', onexit);
		stream.removeListener('end', onend);
		stream.removeListener('error', onerror);
		stream.removeListener('close', onclose);
	};
};

module.exports = eos;

}).call(this)}).call(this,require('_process'))
},{"_process":47,"once":45}],21:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthereumProviderError = exports.EthereumRpcError = void 0;
const fast_safe_stringify_1 = require("fast-safe-stringify");
/**
 * Error subclass implementing JSON RPC 2.0 errors and Ethereum RPC errors
 * per EIP-1474.
 * Permits any integer error code.
 */
class EthereumRpcError extends Error {
    constructor(code, message, data) {
        if (!Number.isInteger(code)) {
            throw new Error('"code" must be an integer.');
        }
        if (!message || typeof message !== 'string') {
            throw new Error('"message" must be a nonempty string.');
        }
        super(message);
        this.code = code;
        if (data !== undefined) {
            this.data = data;
        }
    }
    /**
     * Returns a plain object with all public class properties.
     */
    serialize() {
        const serialized = {
            code: this.code,
            message: this.message,
        };
        if (this.data !== undefined) {
            serialized.data = this.data;
        }
        if (this.stack) {
            serialized.stack = this.stack;
        }
        return serialized;
    }
    /**
     * Return a string representation of the serialized error, omitting
     * any circular references.
     */
    toString() {
        return fast_safe_stringify_1.default(this.serialize(), stringifyReplacer, 2);
    }
}
exports.EthereumRpcError = EthereumRpcError;
/**
 * Error subclass implementing Ethereum Provider errors per EIP-1193.
 * Permits integer error codes in the [ 1000 <= 4999 ] range.
 */
class EthereumProviderError extends EthereumRpcError {
    /**
     * Create an Ethereum Provider JSON-RPC error.
     * `code` must be an integer in the 1000 <= 4999 range.
     */
    constructor(code, message, data) {
        if (!isValidEthProviderCode(code)) {
            throw new Error('"code" must be an integer such that: 1000 <= code <= 4999');
        }
        super(code, message, data);
    }
}
exports.EthereumProviderError = EthereumProviderError;
// Internal
function isValidEthProviderCode(code) {
    return Number.isInteger(code) && code >= 1000 && code <= 4999;
}
function stringifyReplacer(_, value) {
    if (value === '[Circular]') {
        return undefined;
    }
    return value;
}

},{"fast-safe-stringify":29}],22:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorValues = exports.errorCodes = void 0;
exports.errorCodes = {
    rpc: {
        invalidInput: -32000,
        resourceNotFound: -32001,
        resourceUnavailable: -32002,
        transactionRejected: -32003,
        methodNotSupported: -32004,
        limitExceeded: -32005,
        parse: -32700,
        invalidRequest: -32600,
        methodNotFound: -32601,
        invalidParams: -32602,
        internal: -32603,
    },
    provider: {
        userRejectedRequest: 4001,
        unauthorized: 4100,
        unsupportedMethod: 4200,
        disconnected: 4900,
        chainDisconnected: 4901,
    },
};
exports.errorValues = {
    '-32700': {
        standard: 'JSON RPC 2.0',
        message: 'Invalid JSON was received by the server. An error occurred on the server while parsing the JSON text.',
    },
    '-32600': {
        standard: 'JSON RPC 2.0',
        message: 'The JSON sent is not a valid Request object.',
    },
    '-32601': {
        standard: 'JSON RPC 2.0',
        message: 'The method does not exist / is not available.',
    },
    '-32602': {
        standard: 'JSON RPC 2.0',
        message: 'Invalid method parameter(s).',
    },
    '-32603': {
        standard: 'JSON RPC 2.0',
        message: 'Internal JSON-RPC error.',
    },
    '-32000': {
        standard: 'EIP-1474',
        message: 'Invalid input.',
    },
    '-32001': {
        standard: 'EIP-1474',
        message: 'Resource not found.',
    },
    '-32002': {
        standard: 'EIP-1474',
        message: 'Resource unavailable.',
    },
    '-32003': {
        standard: 'EIP-1474',
        message: 'Transaction rejected.',
    },
    '-32004': {
        standard: 'EIP-1474',
        message: 'Method not supported.',
    },
    '-32005': {
        standard: 'EIP-1474',
        message: 'Request limit exceeded.',
    },
    '4001': {
        standard: 'EIP-1193',
        message: 'User rejected the request.',
    },
    '4100': {
        standard: 'EIP-1193',
        message: 'The requested account and/or method has not been authorized by the user.',
    },
    '4200': {
        standard: 'EIP-1193',
        message: 'The requested method is not supported by this Ethereum provider.',
    },
    '4900': {
        standard: 'EIP-1193',
        message: 'The provider is disconnected from all chains.',
    },
    '4901': {
        standard: 'EIP-1193',
        message: 'The provider is disconnected from the specified chain.',
    },
};

},{}],23:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ethErrors = void 0;
const classes_1 = require("./classes");
const utils_1 = require("./utils");
const error_constants_1 = require("./error-constants");
exports.ethErrors = {
    rpc: {
        /**
         * Get a JSON RPC 2.0 Parse (-32700) error.
         */
        parse: (arg) => getEthJsonRpcError(error_constants_1.errorCodes.rpc.parse, arg),
        /**
         * Get a JSON RPC 2.0 Invalid Request (-32600) error.
         */
        invalidRequest: (arg) => getEthJsonRpcError(error_constants_1.errorCodes.rpc.invalidRequest, arg),
        /**
         * Get a JSON RPC 2.0 Invalid Params (-32602) error.
         */
        invalidParams: (arg) => getEthJsonRpcError(error_constants_1.errorCodes.rpc.invalidParams, arg),
        /**
         * Get a JSON RPC 2.0 Method Not Found (-32601) error.
         */
        methodNotFound: (arg) => getEthJsonRpcError(error_constants_1.errorCodes.rpc.methodNotFound, arg),
        /**
         * Get a JSON RPC 2.0 Internal (-32603) error.
         */
        internal: (arg) => getEthJsonRpcError(error_constants_1.errorCodes.rpc.internal, arg),
        /**
         * Get a JSON RPC 2.0 Server error.
         * Permits integer error codes in the [ -32099 <= -32005 ] range.
         * Codes -32000 through -32004 are reserved by EIP-1474.
         */
        server: (opts) => {
            if (!opts || typeof opts !== 'object' || Array.isArray(opts)) {
                throw new Error('Ethereum RPC Server errors must provide single object argument.');
            }
            const { code } = opts;
            if (!Number.isInteger(code) || code > -32005 || code < -32099) {
                throw new Error('"code" must be an integer such that: -32099 <= code <= -32005');
            }
            return getEthJsonRpcError(code, opts);
        },
        /**
         * Get an Ethereum JSON RPC Invalid Input (-32000) error.
         */
        invalidInput: (arg) => getEthJsonRpcError(error_constants_1.errorCodes.rpc.invalidInput, arg),
        /**
         * Get an Ethereum JSON RPC Resource Not Found (-32001) error.
         */
        resourceNotFound: (arg) => getEthJsonRpcError(error_constants_1.errorCodes.rpc.resourceNotFound, arg),
        /**
         * Get an Ethereum JSON RPC Resource Unavailable (-32002) error.
         */
        resourceUnavailable: (arg) => getEthJsonRpcError(error_constants_1.errorCodes.rpc.resourceUnavailable, arg),
        /**
         * Get an Ethereum JSON RPC Transaction Rejected (-32003) error.
         */
        transactionRejected: (arg) => getEthJsonRpcError(error_constants_1.errorCodes.rpc.transactionRejected, arg),
        /**
         * Get an Ethereum JSON RPC Method Not Supported (-32004) error.
         */
        methodNotSupported: (arg) => getEthJsonRpcError(error_constants_1.errorCodes.rpc.methodNotSupported, arg),
        /**
         * Get an Ethereum JSON RPC Limit Exceeded (-32005) error.
         */
        limitExceeded: (arg) => getEthJsonRpcError(error_constants_1.errorCodes.rpc.limitExceeded, arg),
    },
    provider: {
        /**
         * Get an Ethereum Provider User Rejected Request (4001) error.
         */
        userRejectedRequest: (arg) => {
            return getEthProviderError(error_constants_1.errorCodes.provider.userRejectedRequest, arg);
        },
        /**
         * Get an Ethereum Provider Unauthorized (4100) error.
         */
        unauthorized: (arg) => {
            return getEthProviderError(error_constants_1.errorCodes.provider.unauthorized, arg);
        },
        /**
         * Get an Ethereum Provider Unsupported Method (4200) error.
         */
        unsupportedMethod: (arg) => {
            return getEthProviderError(error_constants_1.errorCodes.provider.unsupportedMethod, arg);
        },
        /**
         * Get an Ethereum Provider Not Connected (4900) error.
         */
        disconnected: (arg) => {
            return getEthProviderError(error_constants_1.errorCodes.provider.disconnected, arg);
        },
        /**
         * Get an Ethereum Provider Chain Not Connected (4901) error.
         */
        chainDisconnected: (arg) => {
            return getEthProviderError(error_constants_1.errorCodes.provider.chainDisconnected, arg);
        },
        /**
         * Get a custom Ethereum Provider error.
         */
        custom: (opts) => {
            if (!opts || typeof opts !== 'object' || Array.isArray(opts)) {
                throw new Error('Ethereum Provider custom errors must provide single object argument.');
            }
            const { code, message, data } = opts;
            if (!message || typeof message !== 'string') {
                throw new Error('"message" must be a nonempty string');
            }
            return new classes_1.EthereumProviderError(code, message, data);
        },
    },
};
// Internal
function getEthJsonRpcError(code, arg) {
    const [message, data] = parseOpts(arg);
    return new classes_1.EthereumRpcError(code, message || utils_1.getMessageFromCode(code), data);
}
function getEthProviderError(code, arg) {
    const [message, data] = parseOpts(arg);
    return new classes_1.EthereumProviderError(code, message || utils_1.getMessageFromCode(code), data);
}
function parseOpts(arg) {
    if (arg) {
        if (typeof arg === 'string') {
            return [arg];
        }
        else if (typeof arg === 'object' && !Array.isArray(arg)) {
            const { message, data } = arg;
            if (message && typeof message !== 'string') {
                throw new Error('Must specify string message.');
            }
            return [message || undefined, data];
        }
    }
    return [];
}

},{"./classes":21,"./error-constants":22,"./utils":25}],24:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessageFromCode = exports.serializeError = exports.EthereumProviderError = exports.EthereumRpcError = exports.ethErrors = exports.errorCodes = void 0;
const classes_1 = require("./classes");
Object.defineProperty(exports, "EthereumRpcError", { enumerable: true, get: function () { return classes_1.EthereumRpcError; } });
Object.defineProperty(exports, "EthereumProviderError", { enumerable: true, get: function () { return classes_1.EthereumProviderError; } });
const utils_1 = require("./utils");
Object.defineProperty(exports, "serializeError", { enumerable: true, get: function () { return utils_1.serializeError; } });
Object.defineProperty(exports, "getMessageFromCode", { enumerable: true, get: function () { return utils_1.getMessageFromCode; } });
const errors_1 = require("./errors");
Object.defineProperty(exports, "ethErrors", { enumerable: true, get: function () { return errors_1.ethErrors; } });
const error_constants_1 = require("./error-constants");
Object.defineProperty(exports, "errorCodes", { enumerable: true, get: function () { return error_constants_1.errorCodes; } });

},{"./classes":21,"./error-constants":22,"./errors":23,"./utils":25}],25:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeError = exports.isValidCode = exports.getMessageFromCode = exports.JSON_RPC_SERVER_ERROR_MESSAGE = void 0;
const error_constants_1 = require("./error-constants");
const classes_1 = require("./classes");
const FALLBACK_ERROR_CODE = error_constants_1.errorCodes.rpc.internal;
const FALLBACK_MESSAGE = 'Unspecified error message. This is a bug, please report it.';
const FALLBACK_ERROR = {
    code: FALLBACK_ERROR_CODE,
    message: getMessageFromCode(FALLBACK_ERROR_CODE),
};
exports.JSON_RPC_SERVER_ERROR_MESSAGE = 'Unspecified server error.';
/**
 * Gets the message for a given code, or a fallback message if the code has
 * no corresponding message.
 */
function getMessageFromCode(code, fallbackMessage = FALLBACK_MESSAGE) {
    if (Number.isInteger(code)) {
        const codeString = code.toString();
        if (hasKey(error_constants_1.errorValues, codeString)) {
            return error_constants_1.errorValues[codeString].message;
        }
        if (isJsonRpcServerError(code)) {
            return exports.JSON_RPC_SERVER_ERROR_MESSAGE;
        }
    }
    return fallbackMessage;
}
exports.getMessageFromCode = getMessageFromCode;
/**
 * Returns whether the given code is valid.
 * A code is only valid if it has a message.
 */
function isValidCode(code) {
    if (!Number.isInteger(code)) {
        return false;
    }
    const codeString = code.toString();
    if (error_constants_1.errorValues[codeString]) {
        return true;
    }
    if (isJsonRpcServerError(code)) {
        return true;
    }
    return false;
}
exports.isValidCode = isValidCode;
/**
 * Serializes the given error to an Ethereum JSON RPC-compatible error object.
 * Merely copies the given error's values if it is already compatible.
 * If the given error is not fully compatible, it will be preserved on the
 * returned object's data.originalError property.
 */
function serializeError(error, { fallbackError = FALLBACK_ERROR, shouldIncludeStack = false, } = {}) {
    var _a, _b;
    if (!fallbackError ||
        !Number.isInteger(fallbackError.code) ||
        typeof fallbackError.message !== 'string') {
        throw new Error('Must provide fallback error with integer number code and string message.');
    }
    if (error instanceof classes_1.EthereumRpcError) {
        return error.serialize();
    }
    const serialized = {};
    if (error &&
        typeof error === 'object' &&
        !Array.isArray(error) &&
        hasKey(error, 'code') &&
        isValidCode(error.code)) {
        const _error = error;
        serialized.code = _error.code;
        if (_error.message && typeof _error.message === 'string') {
            serialized.message = _error.message;
            if (hasKey(_error, 'data')) {
                serialized.data = _error.data;
            }
        }
        else {
            serialized.message = getMessageFromCode(serialized.code);
            serialized.data = { originalError: assignOriginalError(error) };
        }
    }
    else {
        serialized.code = fallbackError.code;
        const message = (_a = error) === null || _a === void 0 ? void 0 : _a.message;
        serialized.message = (message && typeof message === 'string'
            ? message
            : fallbackError.message);
        serialized.data = { originalError: assignOriginalError(error) };
    }
    const stack = (_b = error) === null || _b === void 0 ? void 0 : _b.stack;
    if (shouldIncludeStack && error && stack && typeof stack === 'string') {
        serialized.stack = stack;
    }
    return serialized;
}
exports.serializeError = serializeError;
// Internal
function isJsonRpcServerError(code) {
    return code >= -32099 && code <= -32000;
}
function assignOriginalError(error) {
    if (error && typeof error === 'object' && !Array.isArray(error)) {
        return Object.assign({}, error);
    }
    return error;
}
function hasKey(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}

},{"./classes":21,"./error-constants":22}],26:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var R = typeof Reflect === 'object' ? Reflect : null
var ReflectApply = R && typeof R.apply === 'function'
  ? R.apply
  : function ReflectApply(target, receiver, args) {
    return Function.prototype.apply.call(target, receiver, args);
  }

var ReflectOwnKeys
if (R && typeof R.ownKeys === 'function') {
  ReflectOwnKeys = R.ownKeys
} else if (Object.getOwnPropertySymbols) {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target)
      .concat(Object.getOwnPropertySymbols(target));
  };
} else {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target);
  };
}

function ProcessEmitWarning(warning) {
  if (console && console.warn) console.warn(warning);
}

var NumberIsNaN = Number.isNaN || function NumberIsNaN(value) {
  return value !== value;
}

function EventEmitter() {
  EventEmitter.init.call(this);
}
module.exports = EventEmitter;
module.exports.once = once;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._eventsCount = 0;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

function checkListener(listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
  }
}

Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
  enumerable: true,
  get: function() {
    return defaultMaxListeners;
  },
  set: function(arg) {
    if (typeof arg !== 'number' || arg < 0 || NumberIsNaN(arg)) {
      throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + '.');
    }
    defaultMaxListeners = arg;
  }
});

EventEmitter.init = function() {

  if (this._events === undefined ||
      this._events === Object.getPrototypeOf(this)._events) {
    this._events = Object.create(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
};

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || NumberIsNaN(n)) {
    throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + '.');
  }
  this._maxListeners = n;
  return this;
};

function _getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return _getMaxListeners(this);
};

EventEmitter.prototype.emit = function emit(type) {
  var args = [];
  for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
  var doError = (type === 'error');

  var events = this._events;
  if (events !== undefined)
    doError = (doError && events.error === undefined);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    var er;
    if (args.length > 0)
      er = args[0];
    if (er instanceof Error) {
      // Note: The comments on the `throw` lines are intentional, they show
      // up in Node's output if this results in an unhandled exception.
      throw er; // Unhandled 'error' event
    }
    // At least give some kind of context to the user
    var err = new Error('Unhandled error.' + (er ? ' (' + er.message + ')' : ''));
    err.context = er;
    throw err; // Unhandled 'error' event
  }

  var handler = events[type];

  if (handler === undefined)
    return false;

  if (typeof handler === 'function') {
    ReflectApply(handler, this, args);
  } else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      ReflectApply(listeners[i], this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  checkListener(listener);

  events = target._events;
  if (events === undefined) {
    events = target._events = Object.create(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener !== undefined) {
      target.emit('newListener', type,
                  listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (existing === undefined) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
        prepend ? [listener, existing] : [existing, listener];
      // If we've already got an array, just append.
    } else if (prepend) {
      existing.unshift(listener);
    } else {
      existing.push(listener);
    }

    // Check for listener leak
    m = _getMaxListeners(target);
    if (m > 0 && existing.length > m && !existing.warned) {
      existing.warned = true;
      // No error code for this since it is a Warning
      // eslint-disable-next-line no-restricted-syntax
      var w = new Error('Possible EventEmitter memory leak detected. ' +
                          existing.length + ' ' + String(type) + ' listeners ' +
                          'added. Use emitter.setMaxListeners() to ' +
                          'increase limit');
      w.name = 'MaxListenersExceededWarning';
      w.emitter = target;
      w.type = type;
      w.count = existing.length;
      ProcessEmitWarning(w);
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    if (arguments.length === 0)
      return this.listener.call(this.target);
    return this.listener.apply(this.target, arguments);
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = onceWrapper.bind(state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  checkListener(listener);
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      checkListener(listener);
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      checkListener(listener);

      events = this._events;
      if (events === undefined)
        return this;

      list = events[type];
      if (list === undefined)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = Object.create(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else {
          spliceOne(list, position);
        }

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener !== undefined)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (events === undefined)
        return this;

      // not listening for removeListener, no need to emit
      if (events.removeListener === undefined) {
        if (arguments.length === 0) {
          this._events = Object.create(null);
          this._eventsCount = 0;
        } else if (events[type] !== undefined) {
          if (--this._eventsCount === 0)
            this._events = Object.create(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = Object.keys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = Object.create(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners !== undefined) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (events === undefined)
    return [];

  var evlistener = events[type];
  if (evlistener === undefined)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ?
    unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events !== undefined) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener !== undefined) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
};

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function spliceOne(list, index) {
  for (; index + 1 < list.length; index++)
    list[index] = list[index + 1];
  list.pop();
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function once(emitter, name) {
  return new Promise(function (resolve, reject) {
    function errorListener(err) {
      emitter.removeListener(name, resolver);
      reject(err);
    }

    function resolver() {
      if (typeof emitter.removeListener === 'function') {
        emitter.removeListener('error', errorListener);
      }
      resolve([].slice.call(arguments));
    };

    eventTargetAgnosticAddListener(emitter, name, resolver, { once: true });
    if (name !== 'error') {
      addErrorHandlerIfEventEmitter(emitter, errorListener, { once: true });
    }
  });
}

function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
  if (typeof emitter.on === 'function') {
    eventTargetAgnosticAddListener(emitter, 'error', handler, flags);
  }
}

function eventTargetAgnosticAddListener(emitter, name, listener, flags) {
  if (typeof emitter.on === 'function') {
    if (flags.once) {
      emitter.once(name, listener);
    } else {
      emitter.on(name, listener);
    }
  } else if (typeof emitter.addEventListener === 'function') {
    // EventTarget does not have `error` event semantics like Node
    // EventEmitters, we do not listen for `error` events here.
    emitter.addEventListener(name, function wrapListener(arg) {
      // IE does not have builtin `{ once: true }` support so we
      // have to do it manually.
      if (flags.once) {
        emitter.removeEventListener(name, wrapListener);
      }
      listener(arg);
    });
  } else {
    throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof emitter);
  }
}

},{}],27:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
const stream_1 = require("stream");
module.exports = class PortDuplexStream extends stream_1.Duplex {
    /**
     * @param port - An instance of WebExtensions Runtime.Port. See:
     * {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/Port}
     */
    constructor(port) {
        super({ objectMode: true });
        this._port = port;
        this._port.onMessage.addListener((msg) => this._onMessage(msg));
        this._port.onDisconnect.addListener(() => this._onDisconnect());
    }
    /**
     * Callback triggered when a message is received from
     * the remote Port associated with this Stream.
     *
     * @param msg - Payload from the onMessage listener of the port
     */
    _onMessage(msg) {
        if (Buffer.isBuffer(msg)) {
            // delete msg._isBuffer;
            const data = Buffer.from(msg);
            this.push(data);
        }
        else {
            this.push(msg);
        }
    }
    /**
     * Callback triggered when the remote Port associated with this Stream
     * disconnects.
     */
    _onDisconnect() {
        this.destroy();
    }
    /**
     * Explicitly sets read operations to a no-op.
     */
    _read() {
        return undefined;
    }
    /**
     * Called internally when data should be written to this writable stream.
     *
     * @param msg - Arbitrary object to write
     * @param encoding - Encoding to use when writing payload
     * @param cb - Called when writing is complete or an error occurs
     */
    _write(msg, _encoding, cb) {
        try {
            if (Buffer.isBuffer(msg)) {
                const data = msg.toJSON();
                data._isBuffer = true;
                this._port.postMessage(data);
            }
            else {
                this._port.postMessage(msg);
            }
        }
        catch (error) {
            return cb(new Error('PortDuplexStream - disconnected'));
        }
        return cb();
    }
};

}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":18,"stream":59}],28:[function(require,module,exports){
'use strict';

var isArray = Array.isArray;
var keyList = Object.keys;
var hasProp = Object.prototype.hasOwnProperty;

module.exports = function equal(a, b) {
  if (a === b) return true;

  if (a && b && typeof a == 'object' && typeof b == 'object') {
    var arrA = isArray(a)
      , arrB = isArray(b)
      , i
      , length
      , key;

    if (arrA && arrB) {
      length = a.length;
      if (length != b.length) return false;
      for (i = length; i-- !== 0;)
        if (!equal(a[i], b[i])) return false;
      return true;
    }

    if (arrA != arrB) return false;

    var dateA = a instanceof Date
      , dateB = b instanceof Date;
    if (dateA != dateB) return false;
    if (dateA && dateB) return a.getTime() == b.getTime();

    var regexpA = a instanceof RegExp
      , regexpB = b instanceof RegExp;
    if (regexpA != regexpB) return false;
    if (regexpA && regexpB) return a.toString() == b.toString();

    var keys = keyList(a);
    length = keys.length;

    if (length !== keyList(b).length)
      return false;

    for (i = length; i-- !== 0;)
      if (!hasProp.call(b, keys[i])) return false;

    for (i = length; i-- !== 0;) {
      key = keys[i];
      if (!equal(a[key], b[key])) return false;
    }

    return true;
  }

  return a!==a && b!==b;
};

},{}],29:[function(require,module,exports){
module.exports = stringify
stringify.default = stringify
stringify.stable = deterministicStringify
stringify.stableStringify = deterministicStringify

var arr = []
var replacerStack = []

// Regular stringify
function stringify (obj, replacer, spacer) {
  decirc(obj, '', [], undefined)
  var res
  if (replacerStack.length === 0) {
    res = JSON.stringify(obj, replacer, spacer)
  } else {
    res = JSON.stringify(obj, replaceGetterValues(replacer), spacer)
  }
  while (arr.length !== 0) {
    var part = arr.pop()
    if (part.length === 4) {
      Object.defineProperty(part[0], part[1], part[3])
    } else {
      part[0][part[1]] = part[2]
    }
  }
  return res
}
function decirc (val, k, stack, parent) {
  var i
  if (typeof val === 'object' && val !== null) {
    for (i = 0; i < stack.length; i++) {
      if (stack[i] === val) {
        var propertyDescriptor = Object.getOwnPropertyDescriptor(parent, k)
        if (propertyDescriptor.get !== undefined) {
          if (propertyDescriptor.configurable) {
            Object.defineProperty(parent, k, { value: '[Circular]' })
            arr.push([parent, k, val, propertyDescriptor])
          } else {
            replacerStack.push([val, k])
          }
        } else {
          parent[k] = '[Circular]'
          arr.push([parent, k, val])
        }
        return
      }
    }
    stack.push(val)
    // Optimize for Arrays. Big arrays could kill the performance otherwise!
    if (Array.isArray(val)) {
      for (i = 0; i < val.length; i++) {
        decirc(val[i], i, stack, val)
      }
    } else {
      var keys = Object.keys(val)
      for (i = 0; i < keys.length; i++) {
        var key = keys[i]
        decirc(val[key], key, stack, val)
      }
    }
    stack.pop()
  }
}

// Stable-stringify
function compareFunction (a, b) {
  if (a < b) {
    return -1
  }
  if (a > b) {
    return 1
  }
  return 0
}

function deterministicStringify (obj, replacer, spacer) {
  var tmp = deterministicDecirc(obj, '', [], undefined) || obj
  var res
  if (replacerStack.length === 0) {
    res = JSON.stringify(tmp, replacer, spacer)
  } else {
    res = JSON.stringify(tmp, replaceGetterValues(replacer), spacer)
  }
  while (arr.length !== 0) {
    var part = arr.pop()
    if (part.length === 4) {
      Object.defineProperty(part[0], part[1], part[3])
    } else {
      part[0][part[1]] = part[2]
    }
  }
  return res
}

function deterministicDecirc (val, k, stack, parent) {
  var i
  if (typeof val === 'object' && val !== null) {
    for (i = 0; i < stack.length; i++) {
      if (stack[i] === val) {
        var propertyDescriptor = Object.getOwnPropertyDescriptor(parent, k)
        if (propertyDescriptor.get !== undefined) {
          if (propertyDescriptor.configurable) {
            Object.defineProperty(parent, k, { value: '[Circular]' })
            arr.push([parent, k, val, propertyDescriptor])
          } else {
            replacerStack.push([val, k])
          }
        } else {
          parent[k] = '[Circular]'
          arr.push([parent, k, val])
        }
        return
      }
    }
    if (typeof val.toJSON === 'function') {
      return
    }
    stack.push(val)
    // Optimize for Arrays. Big arrays could kill the performance otherwise!
    if (Array.isArray(val)) {
      for (i = 0; i < val.length; i++) {
        deterministicDecirc(val[i], i, stack, val)
      }
    } else {
      // Create a temporary object in the required way
      var tmp = {}
      var keys = Object.keys(val).sort(compareFunction)
      for (i = 0; i < keys.length; i++) {
        var key = keys[i]
        deterministicDecirc(val[key], key, stack, val)
        tmp[key] = val[key]
      }
      if (parent !== undefined) {
        arr.push([parent, k, val])
        parent[k] = tmp
      } else {
        return tmp
      }
    }
    stack.pop()
  }
}

// wraps replacer function to handle values we couldn't replace
// and mark them as [Circular]
function replaceGetterValues (replacer) {
  replacer = replacer !== undefined ? replacer : function (k, v) { return v }
  return function (key, val) {
    if (replacerStack.length > 0) {
      for (var i = 0; i < replacerStack.length; i++) {
        var part = replacerStack[i]
        if (part[1] === key && part[0] === val) {
          val = '[Circular]'
          replacerStack.splice(i, 1)
          break
        }
      }
    }
    return replacer.call(this, key, val)
  }
}

},{}],30:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],31:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],32:[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],33:[function(require,module,exports){
'use strict';

const isStream = stream =>
	stream !== null &&
	typeof stream === 'object' &&
	typeof stream.pipe === 'function';

isStream.writable = stream =>
	isStream(stream) &&
	stream.writable !== false &&
	typeof stream._write === 'function' &&
	typeof stream._writableState === 'object';

isStream.readable = stream =>
	isStream(stream) &&
	stream.readable !== false &&
	typeof stream._read === 'function' &&
	typeof stream._readableState === 'object';

isStream.duplex = stream =>
	isStream.writable(stream) &&
	isStream.readable(stream);

isStream.transform = stream =>
	isStream.duplex(stream) &&
	typeof stream._transform === 'function' &&
	typeof stream._transformState === 'object';

module.exports = isStream;

},{}],34:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],35:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonRpcEngine = void 0;
const safe_event_emitter_1 = __importDefault(require("@metamask/safe-event-emitter"));
const eth_rpc_errors_1 = require("eth-rpc-errors");
/**
 * A JSON-RPC request and response processor.
 * Give it a stack of middleware, pass it requests, and get back responses.
 */
class JsonRpcEngine extends safe_event_emitter_1.default {
    constructor() {
        super();
        this._middleware = [];
    }
    /**
     * Add a middleware function to the engine's middleware stack.
     *
     * @param middleware - The middleware function to add.
     */
    push(middleware) {
        this._middleware.push(middleware);
    }
    handle(req, cb) {
        if (cb && typeof cb !== 'function') {
            throw new Error('"callback" must be a function if provided.');
        }
        if (Array.isArray(req)) {
            if (cb) {
                return this._handleBatch(req, cb);
            }
            return this._handleBatch(req);
        }
        if (cb) {
            return this._handle(req, cb);
        }
        return this._promiseHandle(req);
    }
    /**
     * Returns this engine as a middleware function that can be pushed to other
     * engines.
     *
     * @returns This engine as a middleware function.
     */
    asMiddleware() {
        return async (req, res, next, end) => {
            try {
                const [middlewareError, isComplete, returnHandlers,] = await JsonRpcEngine._runAllMiddleware(req, res, this._middleware);
                if (isComplete) {
                    await JsonRpcEngine._runReturnHandlers(returnHandlers);
                    return end(middlewareError);
                }
                return next(async (handlerCallback) => {
                    try {
                        await JsonRpcEngine._runReturnHandlers(returnHandlers);
                    }
                    catch (error) {
                        return handlerCallback(error);
                    }
                    return handlerCallback();
                });
            }
            catch (error) {
                return end(error);
            }
        };
    }
    async _handleBatch(reqs, cb) {
        // The order here is important
        try {
            // 2. Wait for all requests to finish, or throw on some kind of fatal
            // error
            const responses = await Promise.all(
            // 1. Begin executing each request in the order received
            reqs.map(this._promiseHandle.bind(this)));
            // 3. Return batch response
            if (cb) {
                return cb(null, responses);
            }
            return responses;
        }
        catch (error) {
            if (cb) {
                return cb(error);
            }
            throw error;
        }
    }
    /**
     * A promise-wrapped _handle.
     */
    _promiseHandle(req) {
        return new Promise((resolve) => {
            this._handle(req, (_err, res) => {
                // There will always be a response, and it will always have any error
                // that is caught and propagated.
                resolve(res);
            });
        });
    }
    /**
     * Ensures that the request object is valid, processes it, and passes any
     * error and the response object to the given callback.
     *
     * Does not reject.
     */
    async _handle(callerReq, cb) {
        if (!callerReq ||
            Array.isArray(callerReq) ||
            typeof callerReq !== 'object') {
            const error = new eth_rpc_errors_1.EthereumRpcError(eth_rpc_errors_1.errorCodes.rpc.invalidRequest, `Requests must be plain objects. Received: ${typeof callerReq}`, { request: callerReq });
            return cb(error, { id: undefined, jsonrpc: '2.0', error });
        }
        if (typeof callerReq.method !== 'string') {
            const error = new eth_rpc_errors_1.EthereumRpcError(eth_rpc_errors_1.errorCodes.rpc.invalidRequest, `Must specify a string method. Received: ${typeof callerReq.method}`, { request: callerReq });
            return cb(error, { id: callerReq.id, jsonrpc: '2.0', error });
        }
        const req = Object.assign({}, callerReq);
        const res = {
            id: req.id,
            jsonrpc: req.jsonrpc,
        };
        let error = null;
        try {
            await this._processRequest(req, res);
        }
        catch (_error) {
            // A request handler error, a re-thrown middleware error, or something
            // unexpected.
            error = _error;
        }
        if (error) {
            // Ensure no result is present on an errored response
            delete res.result;
            if (!res.error) {
                res.error = eth_rpc_errors_1.serializeError(error);
            }
        }
        return cb(error, res);
    }
    /**
     * For the given request and response, runs all middleware and their return
     * handlers, if any, and ensures that internal request processing semantics
     * are satisfied.
     */
    async _processRequest(req, res) {
        const [error, isComplete, returnHandlers,] = await JsonRpcEngine._runAllMiddleware(req, res, this._middleware);
        // Throw if "end" was not called, or if the response has neither a result
        // nor an error.
        JsonRpcEngine._checkForCompletion(req, res, isComplete);
        // The return handlers should run even if an error was encountered during
        // middleware processing.
        await JsonRpcEngine._runReturnHandlers(returnHandlers);
        // Now we re-throw the middleware processing error, if any, to catch it
        // further up the call chain.
        if (error) {
            throw error;
        }
    }
    /**
     * Serially executes the given stack of middleware.
     *
     * @returns An array of any error encountered during middleware execution,
     * a boolean indicating whether the request was completed, and an array of
     * middleware-defined return handlers.
     */
    static async _runAllMiddleware(req, res, middlewareStack) {
        const returnHandlers = [];
        let error = null;
        let isComplete = false;
        // Go down stack of middleware, call and collect optional returnHandlers
        for (const middleware of middlewareStack) {
            [error, isComplete] = await JsonRpcEngine._runMiddleware(req, res, middleware, returnHandlers);
            if (isComplete) {
                break;
            }
        }
        return [error, isComplete, returnHandlers.reverse()];
    }
    /**
     * Runs an individual middleware.
     *
     * @returns An array of any error encountered during middleware exection,
     * and a boolean indicating whether the request should end.
     */
    static _runMiddleware(req, res, middleware, returnHandlers) {
        return new Promise((resolve) => {
            const end = (err) => {
                const error = err || res.error;
                if (error) {
                    res.error = eth_rpc_errors_1.serializeError(error);
                }
                // True indicates that the request should end
                resolve([error, true]);
            };
            const next = (returnHandler) => {
                if (res.error) {
                    end(res.error);
                }
                else {
                    if (returnHandler) {
                        if (typeof returnHandler !== 'function') {
                            end(new eth_rpc_errors_1.EthereumRpcError(eth_rpc_errors_1.errorCodes.rpc.internal, `JsonRpcEngine: "next" return handlers must be functions. ` +
                                `Received "${typeof returnHandler}" for request:\n${jsonify(req)}`, { request: req }));
                        }
                        returnHandlers.push(returnHandler);
                    }
                    // False indicates that the request should not end
                    resolve([null, false]);
                }
            };
            try {
                middleware(req, res, next, end);
            }
            catch (error) {
                end(error);
            }
        });
    }
    /**
     * Serially executes array of return handlers. The request and response are
     * assumed to be in their scope.
     */
    static async _runReturnHandlers(handlers) {
        for (const handler of handlers) {
            await new Promise((resolve, reject) => {
                handler((err) => (err ? reject(err) : resolve()));
            });
        }
    }
    /**
     * Throws an error if the response has neither a result nor an error, or if
     * the "isComplete" flag is falsy.
     */
    static _checkForCompletion(req, res, isComplete) {
        if (!('result' in res) && !('error' in res)) {
            throw new eth_rpc_errors_1.EthereumRpcError(eth_rpc_errors_1.errorCodes.rpc.internal, `JsonRpcEngine: Response has no error or result for request:\n${jsonify(req)}`, { request: req });
        }
        if (!isComplete) {
            throw new eth_rpc_errors_1.EthereumRpcError(eth_rpc_errors_1.errorCodes.rpc.internal, `JsonRpcEngine: Nothing ended request:\n${jsonify(req)}`, { request: req });
        }
    }
}
exports.JsonRpcEngine = JsonRpcEngine;
function jsonify(request) {
    return JSON.stringify(request, null, 2);
}

},{"@metamask/safe-event-emitter":14,"eth-rpc-errors":24}],36:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAsyncMiddleware = void 0;
/**
 * JsonRpcEngine only accepts callback-based middleware directly.
 * createAsyncMiddleware exists to enable consumers to pass in async middleware
 * functions.
 *
 * Async middleware have no "end" function. Instead, they "end" if they return
 * without calling "next". Rather than passing in explicit return handlers,
 * async middleware can simply await "next", and perform operations on the
 * response object when execution resumes.
 *
 * To accomplish this, createAsyncMiddleware passes the async middleware a
 * wrapped "next" function. That function calls the internal JsonRpcEngine
 * "next" function with a return handler that resolves a promise when called.
 *
 * The return handler will always be called. Its resolution of the promise
 * enables the control flow described above.
 */
function createAsyncMiddleware(asyncMiddleware) {
    return async (req, res, next, end) => {
        // nextPromise is the key to the implementation
        // it is resolved by the return handler passed to the
        // "next" function
        let resolveNextPromise;
        const nextPromise = new Promise((resolve) => {
            resolveNextPromise = resolve;
        });
        let returnHandlerCallback = null;
        let nextWasCalled = false;
        // This will be called by the consumer's async middleware.
        const asyncNext = async () => {
            nextWasCalled = true;
            // We pass a return handler to next(). When it is called by the engine,
            // the consumer's async middleware will resume executing.
            // eslint-disable-next-line node/callback-return
            next((runReturnHandlersCallback) => {
                // This callback comes from JsonRpcEngine._runReturnHandlers
                returnHandlerCallback = runReturnHandlersCallback;
                resolveNextPromise();
            });
            await nextPromise;
        };
        try {
            await asyncMiddleware(req, res, asyncNext);
            if (nextWasCalled) {
                await nextPromise; // we must wait until the return handler is called
                returnHandlerCallback(null);
            }
            else {
                end(null);
            }
        }
        catch (error) {
            if (returnHandlerCallback) {
                returnHandlerCallback(error);
            }
            else {
                end(error);
            }
        }
    };
}
exports.createAsyncMiddleware = createAsyncMiddleware;

},{}],37:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createScaffoldMiddleware = void 0;
function createScaffoldMiddleware(handlers) {
    return (req, res, next, end) => {
        const handler = handlers[req.method];
        // if no handler, return
        if (handler === undefined) {
            return next();
        }
        // if handler is fn, call as middleware
        if (typeof handler === 'function') {
            return handler(req, res, next, end);
        }
        // if handler is some other value, use as result
        res.result = handler;
        return end();
    };
}
exports.createScaffoldMiddleware = createScaffoldMiddleware;

},{}],38:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUniqueId = void 0;
// uint32 (two's complement) max
// more conservative than Number.MAX_SAFE_INTEGER
const MAX = 4294967295;
let idCounter = Math.floor(Math.random() * MAX);
function getUniqueId() {
    idCounter = (idCounter + 1) % MAX;
    return idCounter;
}
exports.getUniqueId = getUniqueId;

},{}],39:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIdRemapMiddleware = void 0;
const getUniqueId_1 = require("./getUniqueId");
function createIdRemapMiddleware() {
    return (req, res, next, _end) => {
        const originalId = req.id;
        const newId = getUniqueId_1.getUniqueId();
        req.id = newId;
        res.id = newId;
        next((done) => {
            req.id = originalId;
            res.id = originalId;
            done();
        });
    };
}
exports.createIdRemapMiddleware = createIdRemapMiddleware;

},{"./getUniqueId":38}],40:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./idRemapMiddleware"), exports);
__exportStar(require("./createAsyncMiddleware"), exports);
__exportStar(require("./createScaffoldMiddleware"), exports);
__exportStar(require("./getUniqueId"), exports);
__exportStar(require("./JsonRpcEngine"), exports);
__exportStar(require("./mergeMiddleware"), exports);

},{"./JsonRpcEngine":35,"./createAsyncMiddleware":36,"./createScaffoldMiddleware":37,"./getUniqueId":38,"./idRemapMiddleware":39,"./mergeMiddleware":41}],41:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeMiddleware = void 0;
const JsonRpcEngine_1 = require("./JsonRpcEngine");
function mergeMiddleware(middlewareStack) {
    const engine = new JsonRpcEngine_1.JsonRpcEngine();
    middlewareStack.forEach((middleware) => engine.push(middleware));
    return engine.asMiddleware();
}
exports.mergeMiddleware = mergeMiddleware;

},{"./JsonRpcEngine":35}],42:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const readable_stream_1 = require("readable-stream");
/**
 * Takes a JsonRpcEngine and returns a Duplex stream wrapping it.
 *
 * @param opts - Options bag.
 * @param opts.engine - The JsonRpcEngine to wrap in a stream.
 * @returns The stream wrapping the engine.
 */
function createEngineStream(opts) {
    if (!opts || !opts.engine) {
        throw new Error('Missing engine parameter!');
    }
    const { engine } = opts;
    const stream = new readable_stream_1.Duplex({ objectMode: true, read, write });
    // forward notifications
    if (engine.on) {
        engine.on('notification', (message) => {
            stream.push(message);
        });
    }
    return stream;
    function read() {
        return undefined;
    }
    function write(req, _encoding, cb) {
        engine.handle(req, (_err, res) => {
            stream.push(res);
        });
        cb();
    }
}
exports.default = createEngineStream;

},{"readable-stream":57}],43:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const safe_event_emitter_1 = __importDefault(require("@metamask/safe-event-emitter"));
const readable_stream_1 = require("readable-stream");
/**
 * Creates a JsonRpcEngine middleware with an associated Duplex stream and
 * EventEmitter. The middleware, and by extension stream, assume that middleware
 * parameters are properly formatted. No runtime type checking or validation is
 * performed.
 *
 * @returns The event emitter, middleware, and stream.
 */
function createStreamMiddleware() {
    const idMap = {};
    const stream = new readable_stream_1.Duplex({
        objectMode: true,
        read: readNoop,
        write: processMessage,
    });
    const events = new safe_event_emitter_1.default();
    const middleware = (req, res, next, end) => {
        // write req to stream
        stream.push(req);
        // register request on id map
        idMap[req.id] = { req, res, next, end };
    };
    return { events, middleware, stream };
    function readNoop() {
        return false;
    }
    function processMessage(res, _encoding, cb) {
        let err;
        try {
            const isNotification = !res.id;
            if (isNotification) {
                processNotification(res);
            }
            else {
                processResponse(res);
            }
        }
        catch (_err) {
            err = _err;
        }
        // continue processing stream
        cb(err);
    }
    function processResponse(res) {
        const context = idMap[res.id];
        if (!context) {
            throw new Error(`StreamMiddleware - Unknown response id "${res.id}"`);
        }
        delete idMap[res.id];
        // copy whole res onto original res
        Object.assign(context.res, res);
        // run callback on empty stack,
        // prevent internal stream-handler from catching errors
        setTimeout(context.end);
    }
    function processNotification(res) {
        events.emit('notification', res);
    }
}
exports.default = createStreamMiddleware;

},{"@metamask/safe-event-emitter":14,"readable-stream":57}],44:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStreamMiddleware = exports.createEngineStream = void 0;
const createEngineStream_1 = __importDefault(require("./createEngineStream"));
exports.createEngineStream = createEngineStream_1.default;
const createStreamMiddleware_1 = __importDefault(require("./createStreamMiddleware"));
exports.createStreamMiddleware = createStreamMiddleware_1.default;

},{"./createEngineStream":42,"./createStreamMiddleware":43}],45:[function(require,module,exports){
var wrappy = require('wrappy')
module.exports = wrappy(once)
module.exports.strict = wrappy(onceStrict)

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  })

  Object.defineProperty(Function.prototype, 'onceStrict', {
    value: function () {
      return onceStrict(this)
    },
    configurable: true
  })
})

function once (fn) {
  var f = function () {
    if (f.called) return f.value
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  f.called = false
  return f
}

function onceStrict (fn) {
  var f = function () {
    if (f.called)
      throw new Error(f.onceError)
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  var name = fn.name || 'Function wrapped with `once`'
  f.onceError = name + " shouldn't be called more than once"
  f.called = false
  return f
}

},{"wrappy":79}],46:[function(require,module,exports){
(function (process){(function (){
'use strict';

if (!process.version ||
    process.version.indexOf('v0.') === 0 ||
    process.version.indexOf('v1.') === 0 && process.version.indexOf('v1.8.') !== 0) {
  module.exports = { nextTick: nextTick };
} else {
  module.exports = process
}

function nextTick(fn, arg1, arg2, arg3) {
  if (typeof fn !== 'function') {
    throw new TypeError('"callback" argument must be a function');
  }
  var len = arguments.length;
  var args, i;
  switch (len) {
  case 0:
  case 1:
    return process.nextTick(fn);
  case 2:
    return process.nextTick(function afterTickOne() {
      fn.call(null, arg1);
    });
  case 3:
    return process.nextTick(function afterTickTwo() {
      fn.call(null, arg1, arg2);
    });
  case 4:
    return process.nextTick(function afterTickThree() {
      fn.call(null, arg1, arg2, arg3);
    });
  default:
    args = new Array(len - 1);
    i = 0;
    while (i < args.length) {
      args[i++] = arguments[i];
    }
    return process.nextTick(function afterTick() {
      fn.apply(null, args);
    });
  }
}


}).call(this)}).call(this,require('_process'))
},{"_process":47}],47:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],48:[function(require,module,exports){
(function (process){(function (){
var once = require('once')
var eos = require('end-of-stream')
var fs = require('fs') // we only need fs to get the ReadStream and WriteStream prototypes

var noop = function () {}
var ancient = /^v?\.0/.test(process.version)

var isFn = function (fn) {
  return typeof fn === 'function'
}

var isFS = function (stream) {
  if (!ancient) return false // newer node version do not need to care about fs is a special way
  if (!fs) return false // browser
  return (stream instanceof (fs.ReadStream || noop) || stream instanceof (fs.WriteStream || noop)) && isFn(stream.close)
}

var isRequest = function (stream) {
  return stream.setHeader && isFn(stream.abort)
}

var destroyer = function (stream, reading, writing, callback) {
  callback = once(callback)

  var closed = false
  stream.on('close', function () {
    closed = true
  })

  eos(stream, {readable: reading, writable: writing}, function (err) {
    if (err) return callback(err)
    closed = true
    callback()
  })

  var destroyed = false
  return function (err) {
    if (closed) return
    if (destroyed) return
    destroyed = true

    if (isFS(stream)) return stream.close(noop) // use close for fs streams to avoid fd leaks
    if (isRequest(stream)) return stream.abort() // request.destroy just do .end - .abort is what we want

    if (isFn(stream.destroy)) return stream.destroy()

    callback(err || new Error('stream was destroyed'))
  }
}

var call = function (fn) {
  fn()
}

var pipe = function (from, to) {
  return from.pipe(to)
}

var pump = function () {
  var streams = Array.prototype.slice.call(arguments)
  var callback = isFn(streams[streams.length - 1] || noop) && streams.pop() || noop

  if (Array.isArray(streams[0])) streams = streams[0]
  if (streams.length < 2) throw new Error('pump requires two streams per minimum')

  var error
  var destroys = streams.map(function (stream, i) {
    var reading = i < streams.length - 1
    var writing = i > 0
    return destroyer(stream, reading, writing, function (err) {
      if (!error) error = err
      if (err) destroys.forEach(call)
      if (reading) return
      destroys.forEach(call)
      callback(error)
    })
  })

  return streams.reduce(pipe)
}

module.exports = pump

}).call(this)}).call(this,require('_process'))
},{"_process":47,"end-of-stream":20,"fs":17,"once":45}],49:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

'use strict';

/*<replacement>*/

var pna = require('process-nextick-args');
/*</replacement>*/

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    keys.push(key);
  }return keys;
};
/*</replacement>*/

module.exports = Duplex;

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');

util.inherits(Duplex, Readable);

{
  // avoid scope creep, the keys array can then be collected
  var keys = objectKeys(Writable.prototype);
  for (var v = 0; v < keys.length; v++) {
    var method = keys[v];
    if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
  }
}

function Duplex(options) {
  if (!(this instanceof Duplex)) return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false) this.readable = false;

  if (options && options.writable === false) this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false) this.allowHalfOpen = false;

  this.once('end', onend);
}

Object.defineProperty(Duplex.prototype, 'writableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function () {
    return this._writableState.highWaterMark;
  }
});

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended) return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  pna.nextTick(onEndNT, this);
}

function onEndNT(self) {
  self.end();
}

Object.defineProperty(Duplex.prototype, 'destroyed', {
  get: function () {
    if (this._readableState === undefined || this._writableState === undefined) {
      return false;
    }
    return this._readableState.destroyed && this._writableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (this._readableState === undefined || this._writableState === undefined) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
    this._writableState.destroyed = value;
  }
});

Duplex.prototype._destroy = function (err, cb) {
  this.push(null);
  this.end();

  pna.nextTick(cb, err);
};
},{"./_stream_readable":51,"./_stream_writable":53,"core-util-is":19,"inherits":31,"process-nextick-args":46}],50:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

'use strict';

module.exports = PassThrough;

var Transform = require('./_stream_transform');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough)) return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function (chunk, encoding, cb) {
  cb(null, chunk);
};
},{"./_stream_transform":52,"core-util-is":19,"inherits":31}],51:[function(require,module,exports){
(function (process,global){(function (){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

/*<replacement>*/

var pna = require('process-nextick-args');
/*</replacement>*/

module.exports = Readable;

/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/

/*<replacement>*/
var Duplex;
/*</replacement>*/

Readable.ReadableState = ReadableState;

/*<replacement>*/
var EE = require('events').EventEmitter;

var EElistenerCount = function (emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

/*<replacement>*/
var Stream = require('./internal/streams/stream');
/*</replacement>*/

/*<replacement>*/

var Buffer = require('safe-buffer').Buffer;
var OurUint8Array = global.Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}

/*</replacement>*/

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var debugUtil = require('util');
var debug = void 0;
if (debugUtil && debugUtil.debuglog) {
  debug = debugUtil.debuglog('stream');
} else {
  debug = function () {};
}
/*</replacement>*/

var BufferList = require('./internal/streams/BufferList');
var destroyImpl = require('./internal/streams/destroy');
var StringDecoder;

util.inherits(Readable, Stream);

var kProxyEvents = ['error', 'close', 'destroy', 'pause', 'resume'];

function prependListener(emitter, event, fn) {
  // Sadly this is not cacheable as some libraries bundle their own
  // event emitter implementation with them.
  if (typeof emitter.prependListener === 'function') return emitter.prependListener(event, fn);

  // This is a hack to make sure that our error handler is attached before any
  // userland ones.  NEVER DO THIS. This is here only because this code needs
  // to continue to work with older versions of Node.js that do not include
  // the prependListener() method. The goal is to eventually remove this hack.
  if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);else if (isArray(emitter._events[event])) emitter._events[event].unshift(fn);else emitter._events[event] = [fn, emitter._events[event]];
}

function ReadableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream.
  // These options can be provided separately as readableXXX and writableXXX.
  var isDuplex = stream instanceof Duplex;

  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  if (isDuplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  var readableHwm = options.readableHighWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;

  if (hwm || hwm === 0) this.highWaterMark = hwm;else if (isDuplex && (readableHwm || readableHwm === 0)) this.highWaterMark = readableHwm;else this.highWaterMark = defaultHwm;

  // cast to ints.
  this.highWaterMark = Math.floor(this.highWaterMark);

  // A linked list is used to store data chunks instead of an array because the
  // linked list can remove elements from the beginning faster than
  // array.shift()
  this.buffer = new BufferList();
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the event 'readable'/'data' is emitted
  // immediately, or on a later tick.  We set this to true at first, because
  // any actions that shouldn't happen until "later" should generally also
  // not happen before the first read call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;
  this.resumeScheduled = false;

  // has it been destroyed
  this.destroyed = false;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  if (!(this instanceof Readable)) return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  if (options) {
    if (typeof options.read === 'function') this._read = options.read;

    if (typeof options.destroy === 'function') this._destroy = options.destroy;
  }

  Stream.call(this);
}

Object.defineProperty(Readable.prototype, 'destroyed', {
  get: function () {
    if (this._readableState === undefined) {
      return false;
    }
    return this._readableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._readableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
  }
});

Readable.prototype.destroy = destroyImpl.destroy;
Readable.prototype._undestroy = destroyImpl.undestroy;
Readable.prototype._destroy = function (err, cb) {
  this.push(null);
  cb(err);
};

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function (chunk, encoding) {
  var state = this._readableState;
  var skipChunkCheck;

  if (!state.objectMode) {
    if (typeof chunk === 'string') {
      encoding = encoding || state.defaultEncoding;
      if (encoding !== state.encoding) {
        chunk = Buffer.from(chunk, encoding);
        encoding = '';
      }
      skipChunkCheck = true;
    }
  } else {
    skipChunkCheck = true;
  }

  return readableAddChunk(this, chunk, encoding, false, skipChunkCheck);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function (chunk) {
  return readableAddChunk(this, chunk, null, true, false);
};

function readableAddChunk(stream, chunk, encoding, addToFront, skipChunkCheck) {
  var state = stream._readableState;
  if (chunk === null) {
    state.reading = false;
    onEofChunk(stream, state);
  } else {
    var er;
    if (!skipChunkCheck) er = chunkInvalid(state, chunk);
    if (er) {
      stream.emit('error', er);
    } else if (state.objectMode || chunk && chunk.length > 0) {
      if (typeof chunk !== 'string' && !state.objectMode && Object.getPrototypeOf(chunk) !== Buffer.prototype) {
        chunk = _uint8ArrayToBuffer(chunk);
      }

      if (addToFront) {
        if (state.endEmitted) stream.emit('error', new Error('stream.unshift() after end event'));else addChunk(stream, state, chunk, true);
      } else if (state.ended) {
        stream.emit('error', new Error('stream.push() after EOF'));
      } else {
        state.reading = false;
        if (state.decoder && !encoding) {
          chunk = state.decoder.write(chunk);
          if (state.objectMode || chunk.length !== 0) addChunk(stream, state, chunk, false);else maybeReadMore(stream, state);
        } else {
          addChunk(stream, state, chunk, false);
        }
      }
    } else if (!addToFront) {
      state.reading = false;
    }
  }

  return needMoreData(state);
}

function addChunk(stream, state, chunk, addToFront) {
  if (state.flowing && state.length === 0 && !state.sync) {
    stream.emit('data', chunk);
    stream.read(0);
  } else {
    // update the buffer info.
    state.length += state.objectMode ? 1 : chunk.length;
    if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);

    if (state.needReadable) emitReadable(stream);
  }
  maybeReadMore(stream, state);
}

function chunkInvalid(state, chunk) {
  var er;
  if (!_isUint8Array(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}

// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
}

Readable.prototype.isPaused = function () {
  return this._readableState.flowing === false;
};

// backwards compatibility.
Readable.prototype.setEncoding = function (enc) {
  if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
  return this;
};

// Don't raise the hwm > 8MB
var MAX_HWM = 0x800000;
function computeNewHighWaterMark(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2 to prevent increasing hwm excessively in
    // tiny amounts
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
  }
  return n;
}

// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function howMuchToRead(n, state) {
  if (n <= 0 || state.length === 0 && state.ended) return 0;
  if (state.objectMode) return 1;
  if (n !== n) {
    // Only flow one buffer at a time
    if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
  }
  // If we're asking for more than the current hwm, then raise the hwm.
  if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
  if (n <= state.length) return n;
  // Don't have enough
  if (!state.ended) {
    state.needReadable = true;
    return 0;
  }
  return state.length;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function (n) {
  debug('read', n);
  n = parseInt(n, 10);
  var state = this._readableState;
  var nOrig = n;

  if (n !== 0) state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0) endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  } else if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0) state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
    // If _read pushed data synchronously, then `reading` will be false,
    // and we need to re-evaluate how much data we can return to the user.
    if (!state.reading) n = howMuchToRead(nOrig, state);
  }

  var ret;
  if (n > 0) ret = fromList(n, state);else ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  } else {
    state.length -= n;
  }

  if (state.length === 0) {
    // If we have nothing in the buffer, then we want to know
    // as soon as we *do* get something into the buffer.
    if (!state.ended) state.needReadable = true;

    // If we tried to read() past the EOF, then emit end on the next tick.
    if (nOrig !== n && state.ended) endReadable(this);
  }

  if (ret !== null) this.emit('data', ret);

  return ret;
};

function onEofChunk(stream, state) {
  if (state.ended) return;
  if (state.decoder) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // emit 'readable' now to make sure it gets picked up.
  emitReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    if (state.sync) pna.nextTick(emitReadable_, stream);else emitReadable_(stream);
  }
}

function emitReadable_(stream) {
  debug('emit readable');
  stream.emit('readable');
  flow(stream);
}

// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    pna.nextTick(maybeReadMore_, stream, state);
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;else len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function (n) {
  this.emit('error', new Error('_read() is not implemented'));
};

Readable.prototype.pipe = function (dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

  var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;

  var endFn = doEnd ? onend : unpipe;
  if (state.endEmitted) pna.nextTick(endFn);else src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable, unpipeInfo) {
    debug('onunpipe');
    if (readable === src) {
      if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
        unpipeInfo.hasUnpiped = true;
        cleanup();
      }
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  var cleanedUp = false;
  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', unpipe);
    src.removeListener('data', ondata);

    cleanedUp = true;

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
  }

  // If the user pushes more data while we're writing to dest then we'll end up
  // in ondata again. However, we only want to increase awaitDrain once because
  // dest will only emit one 'drain' event for the multiple writes.
  // => Introduce a guard on increasing awaitDrain.
  var increasedAwaitDrain = false;
  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    increasedAwaitDrain = false;
    var ret = dest.write(chunk);
    if (false === ret && !increasedAwaitDrain) {
      // If the user unpiped during `dest.write()`, it is possible
      // to get stuck in a permanently paused state if that write
      // also returned false.
      // => Check whether `dest` is still a piping destination.
      if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
        debug('false write response, pause', src._readableState.awaitDrain);
        src._readableState.awaitDrain++;
        increasedAwaitDrain = true;
      }
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EElistenerCount(dest, 'error') === 0) dest.emit('error', er);
  }

  // Make sure our error handler is attached before userland ones.
  prependListener(dest, 'error', onerror);

  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function () {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain) state.awaitDrain--;
    if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}

Readable.prototype.unpipe = function (dest) {
  var state = this._readableState;
  var unpipeInfo = { hasUnpiped: false };

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0) return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes) return this;

    if (!dest) dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest) dest.emit('unpipe', this, unpipeInfo);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var i = 0; i < len; i++) {
      dests[i].emit('unpipe', this, unpipeInfo);
    }return this;
  }

  // try to find the right one.
  var index = indexOf(state.pipes, dest);
  if (index === -1) return this;

  state.pipes.splice(index, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1) state.pipes = state.pipes[0];

  dest.emit('unpipe', this, unpipeInfo);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function (ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  if (ev === 'data') {
    // Start flowing on next tick if stream isn't explicitly paused
    if (this._readableState.flowing !== false) this.resume();
  } else if (ev === 'readable') {
    var state = this._readableState;
    if (!state.endEmitted && !state.readableListening) {
      state.readableListening = state.needReadable = true;
      state.emittedReadable = false;
      if (!state.reading) {
        pna.nextTick(nReadingNextTick, this);
      } else if (state.length) {
        emitReadable(this);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

function nReadingNextTick(self) {
  debug('readable nexttick read 0');
  self.read(0);
}

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function () {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    state.flowing = true;
    resume(this, state);
  }
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    pna.nextTick(resume_, stream, state);
  }
}

function resume_(stream, state) {
  if (!state.reading) {
    debug('resume read 0');
    stream.read(0);
  }

  state.resumeScheduled = false;
  state.awaitDrain = 0;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading) stream.read(0);
}

Readable.prototype.pause = function () {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (false !== this._readableState.flowing) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  while (state.flowing && stream.read() !== null) {}
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function (stream) {
  var _this = this;

  var state = this._readableState;
  var paused = false;

  stream.on('end', function () {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length) _this.push(chunk);
    }

    _this.push(null);
  });

  stream.on('data', function (chunk) {
    debug('wrapped data');
    if (state.decoder) chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;

    var ret = _this.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (this[i] === undefined && typeof stream[i] === 'function') {
      this[i] = function (method) {
        return function () {
          return stream[method].apply(stream, arguments);
        };
      }(i);
    }
  }

  // proxy certain important events.
  for (var n = 0; n < kProxyEvents.length; n++) {
    stream.on(kProxyEvents[n], this.emit.bind(this, kProxyEvents[n]));
  }

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  this._read = function (n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return this;
};

Object.defineProperty(Readable.prototype, 'readableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function () {
    return this._readableState.highWaterMark;
  }
});

// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromList(n, state) {
  // nothing buffered
  if (state.length === 0) return null;

  var ret;
  if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
    // read it all, truncate the list
    if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.head.data;else ret = state.buffer.concat(state.length);
    state.buffer.clear();
  } else {
    // read part of list
    ret = fromListPartial(n, state.buffer, state.decoder);
  }

  return ret;
}

// Extracts only enough buffered data to satisfy the amount requested.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromListPartial(n, list, hasStrings) {
  var ret;
  if (n < list.head.data.length) {
    // slice is the same for buffers and strings
    ret = list.head.data.slice(0, n);
    list.head.data = list.head.data.slice(n);
  } else if (n === list.head.data.length) {
    // first chunk is a perfect match
    ret = list.shift();
  } else {
    // result spans more than one buffer
    ret = hasStrings ? copyFromBufferString(n, list) : copyFromBuffer(n, list);
  }
  return ret;
}

// Copies a specified amount of characters from the list of buffered data
// chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function copyFromBufferString(n, list) {
  var p = list.head;
  var c = 1;
  var ret = p.data;
  n -= ret.length;
  while (p = p.next) {
    var str = p.data;
    var nb = n > str.length ? str.length : n;
    if (nb === str.length) ret += str;else ret += str.slice(0, n);
    n -= nb;
    if (n === 0) {
      if (nb === str.length) {
        ++c;
        if (p.next) list.head = p.next;else list.head = list.tail = null;
      } else {
        list.head = p;
        p.data = str.slice(nb);
      }
      break;
    }
    ++c;
  }
  list.length -= c;
  return ret;
}

// Copies a specified amount of bytes from the list of buffered data chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function copyFromBuffer(n, list) {
  var ret = Buffer.allocUnsafe(n);
  var p = list.head;
  var c = 1;
  p.data.copy(ret);
  n -= p.data.length;
  while (p = p.next) {
    var buf = p.data;
    var nb = n > buf.length ? buf.length : n;
    buf.copy(ret, ret.length - n, 0, nb);
    n -= nb;
    if (n === 0) {
      if (nb === buf.length) {
        ++c;
        if (p.next) list.head = p.next;else list.head = list.tail = null;
      } else {
        list.head = p;
        p.data = buf.slice(nb);
      }
      break;
    }
    ++c;
  }
  list.length -= c;
  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0) throw new Error('"endReadable()" called on non-empty stream');

  if (!state.endEmitted) {
    state.ended = true;
    pna.nextTick(endReadableNT, state, stream);
  }
}

function endReadableNT(state, stream) {
  // Check that we didn't get one last unshift.
  if (!state.endEmitted && state.length === 0) {
    state.endEmitted = true;
    stream.readable = false;
    stream.emit('end');
  }
}

function indexOf(xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}
}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./_stream_duplex":49,"./internal/streams/BufferList":54,"./internal/streams/destroy":55,"./internal/streams/stream":56,"_process":47,"core-util-is":19,"events":26,"inherits":31,"isarray":34,"process-nextick-args":46,"safe-buffer":58,"string_decoder/":75,"util":17}],52:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

'use strict';

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);

function afterTransform(er, data) {
  var ts = this._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb) {
    return this.emit('error', new Error('write callback called multiple times'));
  }

  ts.writechunk = null;
  ts.writecb = null;

  if (data != null) // single equals check for both `null` and `undefined`
    this.push(data);

  cb(er);

  var rs = this._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    this._read(rs.highWaterMark);
  }
}

function Transform(options) {
  if (!(this instanceof Transform)) return new Transform(options);

  Duplex.call(this, options);

  this._transformState = {
    afterTransform: afterTransform.bind(this),
    needTransform: false,
    transforming: false,
    writecb: null,
    writechunk: null,
    writeencoding: null
  };

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  if (options) {
    if (typeof options.transform === 'function') this._transform = options.transform;

    if (typeof options.flush === 'function') this._flush = options.flush;
  }

  // When the writable side finishes, then flush out anything remaining.
  this.on('prefinish', prefinish);
}

function prefinish() {
  var _this = this;

  if (typeof this._flush === 'function') {
    this._flush(function (er, data) {
      done(_this, er, data);
    });
  } else {
    done(this, null, null);
  }
}

Transform.prototype.push = function (chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function (chunk, encoding, cb) {
  throw new Error('_transform() is not implemented');
};

Transform.prototype._write = function (chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function (n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};

Transform.prototype._destroy = function (err, cb) {
  var _this2 = this;

  Duplex.prototype._destroy.call(this, err, function (err2) {
    cb(err2);
    _this2.emit('close');
  });
};

function done(stream, er, data) {
  if (er) return stream.emit('error', er);

  if (data != null) // single equals check for both `null` and `undefined`
    stream.push(data);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  if (stream._writableState.length) throw new Error('Calling transform done when ws.length != 0');

  if (stream._transformState.transforming) throw new Error('Calling transform done when still transforming');

  return stream.push(null);
}
},{"./_stream_duplex":49,"core-util-is":19,"inherits":31}],53:[function(require,module,exports){
(function (process,global,setImmediate){(function (){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, encoding, cb), and it'll handle all
// the drain event emission and buffering.

'use strict';

/*<replacement>*/

var pna = require('process-nextick-args');
/*</replacement>*/

module.exports = Writable;

/* <replacement> */
function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
  this.next = null;
}

// It seems a linked list but it is not
// there will be only 2 of these for each stream
function CorkedRequest(state) {
  var _this = this;

  this.next = null;
  this.entry = null;
  this.finish = function () {
    onCorkedFinish(_this, state);
  };
}
/* </replacement> */

/*<replacement>*/
var asyncWrite = !process.browser && ['v0.10', 'v0.9.'].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : pna.nextTick;
/*</replacement>*/

/*<replacement>*/
var Duplex;
/*</replacement>*/

Writable.WritableState = WritableState;

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var internalUtil = {
  deprecate: require('util-deprecate')
};
/*</replacement>*/

/*<replacement>*/
var Stream = require('./internal/streams/stream');
/*</replacement>*/

/*<replacement>*/

var Buffer = require('safe-buffer').Buffer;
var OurUint8Array = global.Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}

/*</replacement>*/

var destroyImpl = require('./internal/streams/destroy');

util.inherits(Writable, Stream);

function nop() {}

function WritableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream.
  // These options can be provided separately as readableXXX and writableXXX.
  var isDuplex = stream instanceof Duplex;

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  if (isDuplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  var writableHwm = options.writableHighWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;

  if (hwm || hwm === 0) this.highWaterMark = hwm;else if (isDuplex && (writableHwm || writableHwm === 0)) this.highWaterMark = writableHwm;else this.highWaterMark = defaultHwm;

  // cast to ints.
  this.highWaterMark = Math.floor(this.highWaterMark);

  // if _final has been called
  this.finalCalled = false;

  // drain event flag.
  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // has it been destroyed
  this.destroyed = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function (er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.bufferedRequest = null;
  this.lastBufferedRequest = null;

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;

  // count buffered requests
  this.bufferedRequestCount = 0;

  // allocate the first CorkedRequest, there is always
  // one allocated and free to use, and we maintain at most two
  this.corkedRequestsFree = new CorkedRequest(this);
}

WritableState.prototype.getBuffer = function getBuffer() {
  var current = this.bufferedRequest;
  var out = [];
  while (current) {
    out.push(current);
    current = current.next;
  }
  return out;
};

(function () {
  try {
    Object.defineProperty(WritableState.prototype, 'buffer', {
      get: internalUtil.deprecate(function () {
        return this.getBuffer();
      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.', 'DEP0003')
    });
  } catch (_) {}
})();

// Test _writableState for inheritance to account for Duplex streams,
// whose prototype chain only points to Readable.
var realHasInstance;
if (typeof Symbol === 'function' && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] === 'function') {
  realHasInstance = Function.prototype[Symbol.hasInstance];
  Object.defineProperty(Writable, Symbol.hasInstance, {
    value: function (object) {
      if (realHasInstance.call(this, object)) return true;
      if (this !== Writable) return false;

      return object && object._writableState instanceof WritableState;
    }
  });
} else {
  realHasInstance = function (object) {
    return object instanceof this;
  };
}

function Writable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, too.
  // `realHasInstance` is necessary because using plain `instanceof`
  // would return false, as no `_writableState` property is attached.

  // Trying to use the custom `instanceof` for Writable here will also break the
  // Node.js LazyTransform implementation, which has a non-trivial getter for
  // `_writableState` that would lead to infinite recursion.
  if (!realHasInstance.call(Writable, this) && !(this instanceof Duplex)) {
    return new Writable(options);
  }

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  if (options) {
    if (typeof options.write === 'function') this._write = options.write;

    if (typeof options.writev === 'function') this._writev = options.writev;

    if (typeof options.destroy === 'function') this._destroy = options.destroy;

    if (typeof options.final === 'function') this._final = options.final;
  }

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function () {
  this.emit('error', new Error('Cannot pipe, not readable'));
};

function writeAfterEnd(stream, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  pna.nextTick(cb, er);
}

// Checks that a user-supplied chunk is valid, especially for the particular
// mode the stream is in. Currently this means that `null` is never accepted
// and undefined/non-string values are only allowed in object mode.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  var er = false;

  if (chunk === null) {
    er = new TypeError('May not write null values to stream');
  } else if (typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  if (er) {
    stream.emit('error', er);
    pna.nextTick(cb, er);
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function (chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;
  var isBuf = !state.objectMode && _isUint8Array(chunk);

  if (isBuf && !Buffer.isBuffer(chunk)) {
    chunk = _uint8ArrayToBuffer(chunk);
  }

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (isBuf) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;

  if (typeof cb !== 'function') cb = nop;

  if (state.ended) writeAfterEnd(this, cb);else if (isBuf || validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, isBuf, chunk, encoding, cb);
  }

  return ret;
};

Writable.prototype.cork = function () {
  var state = this._writableState;

  state.corked++;
};

Writable.prototype.uncork = function () {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;

    if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
  }
};

Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
  // node::ParseEncoding() requires lower case.
  if (typeof encoding === 'string') encoding = encoding.toLowerCase();
  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new TypeError('Unknown encoding: ' + encoding);
  this._writableState.defaultEncoding = encoding;
  return this;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
    chunk = Buffer.from(chunk, encoding);
  }
  return chunk;
}

Object.defineProperty(Writable.prototype, 'writableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function () {
    return this._writableState.highWaterMark;
  }
});

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, isBuf, chunk, encoding, cb) {
  if (!isBuf) {
    var newChunk = decodeChunk(state, chunk, encoding);
    if (chunk !== newChunk) {
      isBuf = true;
      encoding = 'buffer';
      chunk = newChunk;
    }
  }
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret) state.needDrain = true;

  if (state.writing || state.corked) {
    var last = state.lastBufferedRequest;
    state.lastBufferedRequest = {
      chunk: chunk,
      encoding: encoding,
      isBuf: isBuf,
      callback: cb,
      next: null
    };
    if (last) {
      last.next = state.lastBufferedRequest;
    } else {
      state.bufferedRequest = state.lastBufferedRequest;
    }
    state.bufferedRequestCount += 1;
  } else {
    doWrite(stream, state, false, len, chunk, encoding, cb);
  }

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  --state.pendingcb;

  if (sync) {
    // defer the callback if we are being called synchronously
    // to avoid piling up things on the stack
    pna.nextTick(cb, er);
    // this can emit finish, and it will always happen
    // after error
    pna.nextTick(finishMaybe, stream, state);
    stream._writableState.errorEmitted = true;
    stream.emit('error', er);
  } else {
    // the caller expect this to happen before if
    // it is async
    cb(er);
    stream._writableState.errorEmitted = true;
    stream.emit('error', er);
    // this can emit finish, but finish must
    // always follow error
    finishMaybe(stream, state);
  }
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er) onwriteError(stream, state, sync, er, cb);else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(state);

    if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
      clearBuffer(stream, state);
    }

    if (sync) {
      /*<replacement>*/
      asyncWrite(afterWrite, stream, state, finished, cb);
      /*</replacement>*/
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished) onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}

// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;
  var entry = state.bufferedRequest;

  if (stream._writev && entry && entry.next) {
    // Fast case, write everything using _writev()
    var l = state.bufferedRequestCount;
    var buffer = new Array(l);
    var holder = state.corkedRequestsFree;
    holder.entry = entry;

    var count = 0;
    var allBuffers = true;
    while (entry) {
      buffer[count] = entry;
      if (!entry.isBuf) allBuffers = false;
      entry = entry.next;
      count += 1;
    }
    buffer.allBuffers = allBuffers;

    doWrite(stream, state, true, state.length, buffer, '', holder.finish);

    // doWrite is almost always async, defer these to save a bit of time
    // as the hot path ends with doWrite
    state.pendingcb++;
    state.lastBufferedRequest = null;
    if (holder.next) {
      state.corkedRequestsFree = holder.next;
      holder.next = null;
    } else {
      state.corkedRequestsFree = new CorkedRequest(state);
    }
    state.bufferedRequestCount = 0;
  } else {
    // Slow case, write chunks one-by-one
    while (entry) {
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;

      doWrite(stream, state, false, len, chunk, encoding, cb);
      entry = entry.next;
      state.bufferedRequestCount--;
      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        break;
      }
    }

    if (entry === null) state.lastBufferedRequest = null;
  }

  state.bufferedRequest = entry;
  state.bufferProcessing = false;
}

Writable.prototype._write = function (chunk, encoding, cb) {
  cb(new Error('_write() is not implemented'));
};

Writable.prototype._writev = null;

Writable.prototype.end = function (chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished) endWritable(this, state, cb);
};

function needFinish(state) {
  return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
}
function callFinal(stream, state) {
  stream._final(function (err) {
    state.pendingcb--;
    if (err) {
      stream.emit('error', err);
    }
    state.prefinished = true;
    stream.emit('prefinish');
    finishMaybe(stream, state);
  });
}
function prefinish(stream, state) {
  if (!state.prefinished && !state.finalCalled) {
    if (typeof stream._final === 'function') {
      state.pendingcb++;
      state.finalCalled = true;
      pna.nextTick(callFinal, stream, state);
    } else {
      state.prefinished = true;
      stream.emit('prefinish');
    }
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(state);
  if (need) {
    prefinish(stream, state);
    if (state.pendingcb === 0) {
      state.finished = true;
      stream.emit('finish');
    }
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished) pna.nextTick(cb);else stream.once('finish', cb);
  }
  state.ended = true;
  stream.writable = false;
}

function onCorkedFinish(corkReq, state, err) {
  var entry = corkReq.entry;
  corkReq.entry = null;
  while (entry) {
    var cb = entry.callback;
    state.pendingcb--;
    cb(err);
    entry = entry.next;
  }
  if (state.corkedRequestsFree) {
    state.corkedRequestsFree.next = corkReq;
  } else {
    state.corkedRequestsFree = corkReq;
  }
}

Object.defineProperty(Writable.prototype, 'destroyed', {
  get: function () {
    if (this._writableState === undefined) {
      return false;
    }
    return this._writableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._writableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._writableState.destroyed = value;
  }
});

Writable.prototype.destroy = destroyImpl.destroy;
Writable.prototype._undestroy = destroyImpl.undestroy;
Writable.prototype._destroy = function (err, cb) {
  this.end();
  cb(err);
};
}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("timers").setImmediate)
},{"./_stream_duplex":49,"./internal/streams/destroy":55,"./internal/streams/stream":56,"_process":47,"core-util-is":19,"inherits":31,"process-nextick-args":46,"safe-buffer":58,"timers":76,"util-deprecate":77}],54:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Buffer = require('safe-buffer').Buffer;
var util = require('util');

function copyBuffer(src, target, offset) {
  src.copy(target, offset);
}

module.exports = function () {
  function BufferList() {
    _classCallCheck(this, BufferList);

    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  BufferList.prototype.push = function push(v) {
    var entry = { data: v, next: null };
    if (this.length > 0) this.tail.next = entry;else this.head = entry;
    this.tail = entry;
    ++this.length;
  };

  BufferList.prototype.unshift = function unshift(v) {
    var entry = { data: v, next: this.head };
    if (this.length === 0) this.tail = entry;
    this.head = entry;
    ++this.length;
  };

  BufferList.prototype.shift = function shift() {
    if (this.length === 0) return;
    var ret = this.head.data;
    if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
    --this.length;
    return ret;
  };

  BufferList.prototype.clear = function clear() {
    this.head = this.tail = null;
    this.length = 0;
  };

  BufferList.prototype.join = function join(s) {
    if (this.length === 0) return '';
    var p = this.head;
    var ret = '' + p.data;
    while (p = p.next) {
      ret += s + p.data;
    }return ret;
  };

  BufferList.prototype.concat = function concat(n) {
    if (this.length === 0) return Buffer.alloc(0);
    if (this.length === 1) return this.head.data;
    var ret = Buffer.allocUnsafe(n >>> 0);
    var p = this.head;
    var i = 0;
    while (p) {
      copyBuffer(p.data, ret, i);
      i += p.data.length;
      p = p.next;
    }
    return ret;
  };

  return BufferList;
}();

if (util && util.inspect && util.inspect.custom) {
  module.exports.prototype[util.inspect.custom] = function () {
    var obj = util.inspect({ length: this.length });
    return this.constructor.name + ' ' + obj;
  };
}
},{"safe-buffer":58,"util":17}],55:[function(require,module,exports){
'use strict';

/*<replacement>*/

var pna = require('process-nextick-args');
/*</replacement>*/

// undocumented cb() API, needed for core, not for public API
function destroy(err, cb) {
  var _this = this;

  var readableDestroyed = this._readableState && this._readableState.destroyed;
  var writableDestroyed = this._writableState && this._writableState.destroyed;

  if (readableDestroyed || writableDestroyed) {
    if (cb) {
      cb(err);
    } else if (err && (!this._writableState || !this._writableState.errorEmitted)) {
      pna.nextTick(emitErrorNT, this, err);
    }
    return this;
  }

  // we set destroyed to true before firing error callbacks in order
  // to make it re-entrance safe in case destroy() is called within callbacks

  if (this._readableState) {
    this._readableState.destroyed = true;
  }

  // if this is a duplex stream mark the writable part as destroyed as well
  if (this._writableState) {
    this._writableState.destroyed = true;
  }

  this._destroy(err || null, function (err) {
    if (!cb && err) {
      pna.nextTick(emitErrorNT, _this, err);
      if (_this._writableState) {
        _this._writableState.errorEmitted = true;
      }
    } else if (cb) {
      cb(err);
    }
  });

  return this;
}

function undestroy() {
  if (this._readableState) {
    this._readableState.destroyed = false;
    this._readableState.reading = false;
    this._readableState.ended = false;
    this._readableState.endEmitted = false;
  }

  if (this._writableState) {
    this._writableState.destroyed = false;
    this._writableState.ended = false;
    this._writableState.ending = false;
    this._writableState.finished = false;
    this._writableState.errorEmitted = false;
  }
}

function emitErrorNT(self, err) {
  self.emit('error', err);
}

module.exports = {
  destroy: destroy,
  undestroy: undestroy
};
},{"process-nextick-args":46}],56:[function(require,module,exports){
module.exports = require('events').EventEmitter;

},{"events":26}],57:[function(require,module,exports){
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = exports;
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

},{"./lib/_stream_duplex.js":49,"./lib/_stream_passthrough.js":50,"./lib/_stream_readable.js":51,"./lib/_stream_transform.js":52,"./lib/_stream_writable.js":53}],58:[function(require,module,exports){
/* eslint-disable node/no-deprecated-api */
var buffer = require('buffer')
var Buffer = buffer.Buffer

// alternative to using Object.keys for old browsers
function copyProps (src, dst) {
  for (var key in src) {
    dst[key] = src[key]
  }
}
if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
  module.exports = buffer
} else {
  // Copy properties from require('buffer')
  copyProps(buffer, exports)
  exports.Buffer = SafeBuffer
}

function SafeBuffer (arg, encodingOrOffset, length) {
  return Buffer(arg, encodingOrOffset, length)
}

// Copy static methods from Buffer
copyProps(Buffer, SafeBuffer)

SafeBuffer.from = function (arg, encodingOrOffset, length) {
  if (typeof arg === 'number') {
    throw new TypeError('Argument must not be a number')
  }
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.alloc = function (size, fill, encoding) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  var buf = Buffer(size)
  if (fill !== undefined) {
    if (typeof encoding === 'string') {
      buf.fill(fill, encoding)
    } else {
      buf.fill(fill)
    }
  } else {
    buf.fill(0)
  }
  return buf
}

SafeBuffer.allocUnsafe = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return Buffer(size)
}

SafeBuffer.allocUnsafeSlow = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return buffer.SlowBuffer(size)
}

},{"buffer":18}],59:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = require('events').EventEmitter;
var inherits = require('inherits');

inherits(Stream, EE);
Stream.Readable = require('readable-stream/lib/_stream_readable.js');
Stream.Writable = require('readable-stream/lib/_stream_writable.js');
Stream.Duplex = require('readable-stream/lib/_stream_duplex.js');
Stream.Transform = require('readable-stream/lib/_stream_transform.js');
Stream.PassThrough = require('readable-stream/lib/_stream_passthrough.js');
Stream.finished = require('readable-stream/lib/internal/streams/end-of-stream.js')
Stream.pipeline = require('readable-stream/lib/internal/streams/pipeline.js')

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":26,"inherits":60,"readable-stream/lib/_stream_duplex.js":62,"readable-stream/lib/_stream_passthrough.js":63,"readable-stream/lib/_stream_readable.js":64,"readable-stream/lib/_stream_transform.js":65,"readable-stream/lib/_stream_writable.js":66,"readable-stream/lib/internal/streams/end-of-stream.js":70,"readable-stream/lib/internal/streams/pipeline.js":72}],60:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      })
    }
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      var TempCtor = function () {}
      TempCtor.prototype = superCtor.prototype
      ctor.prototype = new TempCtor()
      ctor.prototype.constructor = ctor
    }
  }
}

},{}],61:[function(require,module,exports){
'use strict';

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

var codes = {};

function createErrorType(code, message, Base) {
  if (!Base) {
    Base = Error;
  }

  function getMessage(arg1, arg2, arg3) {
    if (typeof message === 'string') {
      return message;
    } else {
      return message(arg1, arg2, arg3);
    }
  }

  var NodeError =
  /*#__PURE__*/
  function (_Base) {
    _inheritsLoose(NodeError, _Base);

    function NodeError(arg1, arg2, arg3) {
      return _Base.call(this, getMessage(arg1, arg2, arg3)) || this;
    }

    return NodeError;
  }(Base);

  NodeError.prototype.name = Base.name;
  NodeError.prototype.code = code;
  codes[code] = NodeError;
} // https://github.com/nodejs/node/blob/v10.8.0/lib/internal/errors.js


function oneOf(expected, thing) {
  if (Array.isArray(expected)) {
    var len = expected.length;
    expected = expected.map(function (i) {
      return String(i);
    });

    if (len > 2) {
      return "one of ".concat(thing, " ").concat(expected.slice(0, len - 1).join(', '), ", or ") + expected[len - 1];
    } else if (len === 2) {
      return "one of ".concat(thing, " ").concat(expected[0], " or ").concat(expected[1]);
    } else {
      return "of ".concat(thing, " ").concat(expected[0]);
    }
  } else {
    return "of ".concat(thing, " ").concat(String(expected));
  }
} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith


function startsWith(str, search, pos) {
  return str.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith


function endsWith(str, search, this_len) {
  if (this_len === undefined || this_len > str.length) {
    this_len = str.length;
  }

  return str.substring(this_len - search.length, this_len) === search;
} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes


function includes(str, search, start) {
  if (typeof start !== 'number') {
    start = 0;
  }

  if (start + search.length > str.length) {
    return false;
  } else {
    return str.indexOf(search, start) !== -1;
  }
}

createErrorType('ERR_INVALID_OPT_VALUE', function (name, value) {
  return 'The value "' + value + '" is invalid for option "' + name + '"';
}, TypeError);
createErrorType('ERR_INVALID_ARG_TYPE', function (name, expected, actual) {
  // determiner: 'must be' or 'must not be'
  var determiner;

  if (typeof expected === 'string' && startsWith(expected, 'not ')) {
    determiner = 'must not be';
    expected = expected.replace(/^not /, '');
  } else {
    determiner = 'must be';
  }

  var msg;

  if (endsWith(name, ' argument')) {
    // For cases like 'first argument'
    msg = "The ".concat(name, " ").concat(determiner, " ").concat(oneOf(expected, 'type'));
  } else {
    var type = includes(name, '.') ? 'property' : 'argument';
    msg = "The \"".concat(name, "\" ").concat(type, " ").concat(determiner, " ").concat(oneOf(expected, 'type'));
  }

  msg += ". Received type ".concat(typeof actual);
  return msg;
}, TypeError);
createErrorType('ERR_STREAM_PUSH_AFTER_EOF', 'stream.push() after EOF');
createErrorType('ERR_METHOD_NOT_IMPLEMENTED', function (name) {
  return 'The ' + name + ' method is not implemented';
});
createErrorType('ERR_STREAM_PREMATURE_CLOSE', 'Premature close');
createErrorType('ERR_STREAM_DESTROYED', function (name) {
  return 'Cannot call ' + name + ' after a stream was destroyed';
});
createErrorType('ERR_MULTIPLE_CALLBACK', 'Callback called multiple times');
createErrorType('ERR_STREAM_CANNOT_PIPE', 'Cannot pipe, not readable');
createErrorType('ERR_STREAM_WRITE_AFTER_END', 'write after end');
createErrorType('ERR_STREAM_NULL_VALUES', 'May not write null values to stream', TypeError);
createErrorType('ERR_UNKNOWN_ENCODING', function (arg) {
  return 'Unknown encoding: ' + arg;
}, TypeError);
createErrorType('ERR_STREAM_UNSHIFT_AFTER_END_EVENT', 'stream.unshift() after end event');
module.exports.codes = codes;

},{}],62:[function(require,module,exports){
(function (process){(function (){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

'use strict';

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
};
/*</replacement>*/

module.exports = Duplex;
var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');
require('inherits')(Duplex, Readable);
{
  // Allow the keys array to be GC'ed.
  var keys = objectKeys(Writable.prototype);
  for (var v = 0; v < keys.length; v++) {
    var method = keys[v];
    if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
  }
}
function Duplex(options) {
  if (!(this instanceof Duplex)) return new Duplex(options);
  Readable.call(this, options);
  Writable.call(this, options);
  this.allowHalfOpen = true;
  if (options) {
    if (options.readable === false) this.readable = false;
    if (options.writable === false) this.writable = false;
    if (options.allowHalfOpen === false) {
      this.allowHalfOpen = false;
      this.once('end', onend);
    }
  }
}
Object.defineProperty(Duplex.prototype, 'writableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.highWaterMark;
  }
});
Object.defineProperty(Duplex.prototype, 'writableBuffer', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState && this._writableState.getBuffer();
  }
});
Object.defineProperty(Duplex.prototype, 'writableLength', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.length;
  }
});

// the no-half-open enforcer
function onend() {
  // If the writable side ended, then we're ok.
  if (this._writableState.ended) return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  process.nextTick(onEndNT, this);
}
function onEndNT(self) {
  self.end();
}
Object.defineProperty(Duplex.prototype, 'destroyed', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    if (this._readableState === undefined || this._writableState === undefined) {
      return false;
    }
    return this._readableState.destroyed && this._writableState.destroyed;
  },
  set: function set(value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (this._readableState === undefined || this._writableState === undefined) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
    this._writableState.destroyed = value;
  }
});
}).call(this)}).call(this,require('_process'))
},{"./_stream_readable":64,"./_stream_writable":66,"_process":47,"inherits":60}],63:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

'use strict';

module.exports = PassThrough;
var Transform = require('./_stream_transform');
require('inherits')(PassThrough, Transform);
function PassThrough(options) {
  if (!(this instanceof PassThrough)) return new PassThrough(options);
  Transform.call(this, options);
}
PassThrough.prototype._transform = function (chunk, encoding, cb) {
  cb(null, chunk);
};
},{"./_stream_transform":65,"inherits":60}],64:[function(require,module,exports){
(function (process,global){(function (){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

module.exports = Readable;

/*<replacement>*/
var Duplex;
/*</replacement>*/

Readable.ReadableState = ReadableState;

/*<replacement>*/
var EE = require('events').EventEmitter;
var EElistenerCount = function EElistenerCount(emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

/*<replacement>*/
var Stream = require('./internal/streams/stream');
/*</replacement>*/

var Buffer = require('buffer').Buffer;
var OurUint8Array = (typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {}).Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}

/*<replacement>*/
var debugUtil = require('util');
var debug;
if (debugUtil && debugUtil.debuglog) {
  debug = debugUtil.debuglog('stream');
} else {
  debug = function debug() {};
}
/*</replacement>*/

var BufferList = require('./internal/streams/buffer_list');
var destroyImpl = require('./internal/streams/destroy');
var _require = require('./internal/streams/state'),
  getHighWaterMark = _require.getHighWaterMark;
var _require$codes = require('../errors').codes,
  ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE,
  ERR_STREAM_PUSH_AFTER_EOF = _require$codes.ERR_STREAM_PUSH_AFTER_EOF,
  ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
  ERR_STREAM_UNSHIFT_AFTER_END_EVENT = _require$codes.ERR_STREAM_UNSHIFT_AFTER_END_EVENT;

// Lazy loaded to improve the startup performance.
var StringDecoder;
var createReadableStreamAsyncIterator;
var from;
require('inherits')(Readable, Stream);
var errorOrDestroy = destroyImpl.errorOrDestroy;
var kProxyEvents = ['error', 'close', 'destroy', 'pause', 'resume'];
function prependListener(emitter, event, fn) {
  // Sadly this is not cacheable as some libraries bundle their own
  // event emitter implementation with them.
  if (typeof emitter.prependListener === 'function') return emitter.prependListener(event, fn);

  // This is a hack to make sure that our error handler is attached before any
  // userland ones.  NEVER DO THIS. This is here only because this code needs
  // to continue to work with older versions of Node.js that do not include
  // the prependListener() method. The goal is to eventually remove this hack.
  if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);else if (Array.isArray(emitter._events[event])) emitter._events[event].unshift(fn);else emitter._events[event] = [fn, emitter._events[event]];
}
function ReadableState(options, stream, isDuplex) {
  Duplex = Duplex || require('./_stream_duplex');
  options = options || {};

  // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream.
  // These options can be provided separately as readableXXX and writableXXX.
  if (typeof isDuplex !== 'boolean') isDuplex = stream instanceof Duplex;

  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;
  if (isDuplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  this.highWaterMark = getHighWaterMark(this, options, 'readableHighWaterMark', isDuplex);

  // A linked list is used to store data chunks instead of an array because the
  // linked list can remove elements from the beginning faster than
  // array.shift()
  this.buffer = new BufferList();
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the event 'readable'/'data' is emitted
  // immediately, or on a later tick.  We set this to true at first, because
  // any actions that shouldn't happen until "later" should generally also
  // not happen before the first read call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;
  this.resumeScheduled = false;
  this.paused = true;

  // Should close be emitted on destroy. Defaults to true.
  this.emitClose = options.emitClose !== false;

  // Should .destroy() be called after 'end' (and potentially 'finish')
  this.autoDestroy = !!options.autoDestroy;

  // has it been destroyed
  this.destroyed = false;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;
  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}
function Readable(options) {
  Duplex = Duplex || require('./_stream_duplex');
  if (!(this instanceof Readable)) return new Readable(options);

  // Checking for a Stream.Duplex instance is faster here instead of inside
  // the ReadableState constructor, at least with V8 6.5
  var isDuplex = this instanceof Duplex;
  this._readableState = new ReadableState(options, this, isDuplex);

  // legacy
  this.readable = true;
  if (options) {
    if (typeof options.read === 'function') this._read = options.read;
    if (typeof options.destroy === 'function') this._destroy = options.destroy;
  }
  Stream.call(this);
}
Object.defineProperty(Readable.prototype, 'destroyed', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    if (this._readableState === undefined) {
      return false;
    }
    return this._readableState.destroyed;
  },
  set: function set(value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._readableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
  }
});
Readable.prototype.destroy = destroyImpl.destroy;
Readable.prototype._undestroy = destroyImpl.undestroy;
Readable.prototype._destroy = function (err, cb) {
  cb(err);
};

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function (chunk, encoding) {
  var state = this._readableState;
  var skipChunkCheck;
  if (!state.objectMode) {
    if (typeof chunk === 'string') {
      encoding = encoding || state.defaultEncoding;
      if (encoding !== state.encoding) {
        chunk = Buffer.from(chunk, encoding);
        encoding = '';
      }
      skipChunkCheck = true;
    }
  } else {
    skipChunkCheck = true;
  }
  return readableAddChunk(this, chunk, encoding, false, skipChunkCheck);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function (chunk) {
  return readableAddChunk(this, chunk, null, true, false);
};
function readableAddChunk(stream, chunk, encoding, addToFront, skipChunkCheck) {
  debug('readableAddChunk', chunk);
  var state = stream._readableState;
  if (chunk === null) {
    state.reading = false;
    onEofChunk(stream, state);
  } else {
    var er;
    if (!skipChunkCheck) er = chunkInvalid(state, chunk);
    if (er) {
      errorOrDestroy(stream, er);
    } else if (state.objectMode || chunk && chunk.length > 0) {
      if (typeof chunk !== 'string' && !state.objectMode && Object.getPrototypeOf(chunk) !== Buffer.prototype) {
        chunk = _uint8ArrayToBuffer(chunk);
      }
      if (addToFront) {
        if (state.endEmitted) errorOrDestroy(stream, new ERR_STREAM_UNSHIFT_AFTER_END_EVENT());else addChunk(stream, state, chunk, true);
      } else if (state.ended) {
        errorOrDestroy(stream, new ERR_STREAM_PUSH_AFTER_EOF());
      } else if (state.destroyed) {
        return false;
      } else {
        state.reading = false;
        if (state.decoder && !encoding) {
          chunk = state.decoder.write(chunk);
          if (state.objectMode || chunk.length !== 0) addChunk(stream, state, chunk, false);else maybeReadMore(stream, state);
        } else {
          addChunk(stream, state, chunk, false);
        }
      }
    } else if (!addToFront) {
      state.reading = false;
      maybeReadMore(stream, state);
    }
  }

  // We can push more data if we are below the highWaterMark.
  // Also, if we have no data yet, we can stand some more bytes.
  // This is to work around cases where hwm=0, such as the repl.
  return !state.ended && (state.length < state.highWaterMark || state.length === 0);
}
function addChunk(stream, state, chunk, addToFront) {
  if (state.flowing && state.length === 0 && !state.sync) {
    state.awaitDrain = 0;
    stream.emit('data', chunk);
  } else {
    // update the buffer info.
    state.length += state.objectMode ? 1 : chunk.length;
    if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);
    if (state.needReadable) emitReadable(stream);
  }
  maybeReadMore(stream, state);
}
function chunkInvalid(state, chunk) {
  var er;
  if (!_isUint8Array(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new ERR_INVALID_ARG_TYPE('chunk', ['string', 'Buffer', 'Uint8Array'], chunk);
  }
  return er;
}
Readable.prototype.isPaused = function () {
  return this._readableState.flowing === false;
};

// backwards compatibility.
Readable.prototype.setEncoding = function (enc) {
  if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
  var decoder = new StringDecoder(enc);
  this._readableState.decoder = decoder;
  // If setEncoding(null), decoder.encoding equals utf8
  this._readableState.encoding = this._readableState.decoder.encoding;

  // Iterate over current buffer to convert already stored Buffers:
  var p = this._readableState.buffer.head;
  var content = '';
  while (p !== null) {
    content += decoder.write(p.data);
    p = p.next;
  }
  this._readableState.buffer.clear();
  if (content !== '') this._readableState.buffer.push(content);
  this._readableState.length = content.length;
  return this;
};

// Don't raise the hwm > 1GB
var MAX_HWM = 0x40000000;
function computeNewHighWaterMark(n) {
  if (n >= MAX_HWM) {
    // TODO(ronag): Throw ERR_VALUE_OUT_OF_RANGE.
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2 to prevent increasing hwm excessively in
    // tiny amounts
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
  }
  return n;
}

// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function howMuchToRead(n, state) {
  if (n <= 0 || state.length === 0 && state.ended) return 0;
  if (state.objectMode) return 1;
  if (n !== n) {
    // Only flow one buffer at a time
    if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
  }
  // If we're asking for more than the current hwm, then raise the hwm.
  if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
  if (n <= state.length) return n;
  // Don't have enough
  if (!state.ended) {
    state.needReadable = true;
    return 0;
  }
  return state.length;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function (n) {
  debug('read', n);
  n = parseInt(n, 10);
  var state = this._readableState;
  var nOrig = n;
  if (n !== 0) state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 && state.needReadable && ((state.highWaterMark !== 0 ? state.length >= state.highWaterMark : state.length > 0) || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
    return null;
  }
  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0) endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  } else if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0) state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
    // If _read pushed data synchronously, then `reading` will be false,
    // and we need to re-evaluate how much data we can return to the user.
    if (!state.reading) n = howMuchToRead(nOrig, state);
  }
  var ret;
  if (n > 0) ret = fromList(n, state);else ret = null;
  if (ret === null) {
    state.needReadable = state.length <= state.highWaterMark;
    n = 0;
  } else {
    state.length -= n;
    state.awaitDrain = 0;
  }
  if (state.length === 0) {
    // If we have nothing in the buffer, then we want to know
    // as soon as we *do* get something into the buffer.
    if (!state.ended) state.needReadable = true;

    // If we tried to read() past the EOF, then emit end on the next tick.
    if (nOrig !== n && state.ended) endReadable(this);
  }
  if (ret !== null) this.emit('data', ret);
  return ret;
};
function onEofChunk(stream, state) {
  debug('onEofChunk');
  if (state.ended) return;
  if (state.decoder) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;
  if (state.sync) {
    // if we are sync, wait until next tick to emit the data.
    // Otherwise we risk emitting data in the flow()
    // the readable code triggers during a read() call
    emitReadable(stream);
  } else {
    // emit 'readable' now to make sure it gets picked up.
    state.needReadable = false;
    if (!state.emittedReadable) {
      state.emittedReadable = true;
      emitReadable_(stream);
    }
  }
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  debug('emitReadable', state.needReadable, state.emittedReadable);
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    process.nextTick(emitReadable_, stream);
  }
}
function emitReadable_(stream) {
  var state = stream._readableState;
  debug('emitReadable_', state.destroyed, state.length, state.ended);
  if (!state.destroyed && (state.length || state.ended)) {
    stream.emit('readable');
    state.emittedReadable = false;
  }

  // The stream needs another readable event if
  // 1. It is not flowing, as the flow mechanism will take
  //    care of it.
  // 2. It is not ended.
  // 3. It is below the highWaterMark, so we can schedule
  //    another readable later.
  state.needReadable = !state.flowing && !state.ended && state.length <= state.highWaterMark;
  flow(stream);
}

// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    process.nextTick(maybeReadMore_, stream, state);
  }
}
function maybeReadMore_(stream, state) {
  // Attempt to read more data if we should.
  //
  // The conditions for reading more data are (one of):
  // - Not enough data buffered (state.length < state.highWaterMark). The loop
  //   is responsible for filling the buffer with enough data if such data
  //   is available. If highWaterMark is 0 and we are not in the flowing mode
  //   we should _not_ attempt to buffer any extra data. We'll get more data
  //   when the stream consumer calls read() instead.
  // - No data in the buffer, and the stream is in flowing mode. In this mode
  //   the loop below is responsible for ensuring read() is called. Failing to
  //   call read here would abort the flow and there's no other mechanism for
  //   continuing the flow if the stream consumer has just subscribed to the
  //   'data' event.
  //
  // In addition to the above conditions to keep reading data, the following
  // conditions prevent the data from being read:
  // - The stream has ended (state.ended).
  // - There is already a pending 'read' operation (state.reading). This is a
  //   case where the the stream has called the implementation defined _read()
  //   method, but they are processing the call asynchronously and have _not_
  //   called push() with new data. In this case we skip performing more
  //   read()s. The execution ends in this method again after the _read() ends
  //   up calling push() with more data.
  while (!state.reading && !state.ended && (state.length < state.highWaterMark || state.flowing && state.length === 0)) {
    var len = state.length;
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function (n) {
  errorOrDestroy(this, new ERR_METHOD_NOT_IMPLEMENTED('_read()'));
};
Readable.prototype.pipe = function (dest, pipeOpts) {
  var src = this;
  var state = this._readableState;
  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);
  var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;
  var endFn = doEnd ? onend : unpipe;
  if (state.endEmitted) process.nextTick(endFn);else src.once('end', endFn);
  dest.on('unpipe', onunpipe);
  function onunpipe(readable, unpipeInfo) {
    debug('onunpipe');
    if (readable === src) {
      if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
        unpipeInfo.hasUnpiped = true;
        cleanup();
      }
    }
  }
  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);
  var cleanedUp = false;
  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', unpipe);
    src.removeListener('data', ondata);
    cleanedUp = true;

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
  }
  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    var ret = dest.write(chunk);
    debug('dest.write', ret);
    if (ret === false) {
      // If the user unpiped during `dest.write()`, it is possible
      // to get stuck in a permanently paused state if that write
      // also returned false.
      // => Check whether `dest` is still a piping destination.
      if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
        debug('false write response, pause', state.awaitDrain);
        state.awaitDrain++;
      }
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EElistenerCount(dest, 'error') === 0) errorOrDestroy(dest, er);
  }

  // Make sure our error handler is attached before userland ones.
  prependListener(dest, 'error', onerror);

  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);
  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }
  return dest;
};
function pipeOnDrain(src) {
  return function pipeOnDrainFunctionResult() {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain) state.awaitDrain--;
    if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}
Readable.prototype.unpipe = function (dest) {
  var state = this._readableState;
  var unpipeInfo = {
    hasUnpiped: false
  };

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0) return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes) return this;
    if (!dest) dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest) dest.emit('unpipe', this, unpipeInfo);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    for (var i = 0; i < len; i++) dests[i].emit('unpipe', this, {
      hasUnpiped: false
    });
    return this;
  }

  // try to find the right one.
  var index = indexOf(state.pipes, dest);
  if (index === -1) return this;
  state.pipes.splice(index, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1) state.pipes = state.pipes[0];
  dest.emit('unpipe', this, unpipeInfo);
  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function (ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);
  var state = this._readableState;
  if (ev === 'data') {
    // update readableListening so that resume() may be a no-op
    // a few lines down. This is needed to support once('readable').
    state.readableListening = this.listenerCount('readable') > 0;

    // Try start flowing on next tick if stream isn't explicitly paused
    if (state.flowing !== false) this.resume();
  } else if (ev === 'readable') {
    if (!state.endEmitted && !state.readableListening) {
      state.readableListening = state.needReadable = true;
      state.flowing = false;
      state.emittedReadable = false;
      debug('on readable', state.length, state.reading);
      if (state.length) {
        emitReadable(this);
      } else if (!state.reading) {
        process.nextTick(nReadingNextTick, this);
      }
    }
  }
  return res;
};
Readable.prototype.addListener = Readable.prototype.on;
Readable.prototype.removeListener = function (ev, fn) {
  var res = Stream.prototype.removeListener.call(this, ev, fn);
  if (ev === 'readable') {
    // We need to check if there is someone still listening to
    // readable and reset the state. However this needs to happen
    // after readable has been emitted but before I/O (nextTick) to
    // support once('readable', fn) cycles. This means that calling
    // resume within the same tick will have no
    // effect.
    process.nextTick(updateReadableListening, this);
  }
  return res;
};
Readable.prototype.removeAllListeners = function (ev) {
  var res = Stream.prototype.removeAllListeners.apply(this, arguments);
  if (ev === 'readable' || ev === undefined) {
    // We need to check if there is someone still listening to
    // readable and reset the state. However this needs to happen
    // after readable has been emitted but before I/O (nextTick) to
    // support once('readable', fn) cycles. This means that calling
    // resume within the same tick will have no
    // effect.
    process.nextTick(updateReadableListening, this);
  }
  return res;
};
function updateReadableListening(self) {
  var state = self._readableState;
  state.readableListening = self.listenerCount('readable') > 0;
  if (state.resumeScheduled && !state.paused) {
    // flowing needs to be set to true now, otherwise
    // the upcoming resume will not flow.
    state.flowing = true;

    // crude way to check if we should resume
  } else if (self.listenerCount('data') > 0) {
    self.resume();
  }
}
function nReadingNextTick(self) {
  debug('readable nexttick read 0');
  self.read(0);
}

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function () {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    // we flow only if there is no one listening
    // for readable, but we still have to call
    // resume()
    state.flowing = !state.readableListening;
    resume(this, state);
  }
  state.paused = false;
  return this;
};
function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    process.nextTick(resume_, stream, state);
  }
}
function resume_(stream, state) {
  debug('resume', state.reading);
  if (!state.reading) {
    stream.read(0);
  }
  state.resumeScheduled = false;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading) stream.read(0);
}
Readable.prototype.pause = function () {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (this._readableState.flowing !== false) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  this._readableState.paused = true;
  return this;
};
function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  while (state.flowing && stream.read() !== null);
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function (stream) {
  var _this = this;
  var state = this._readableState;
  var paused = false;
  stream.on('end', function () {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length) _this.push(chunk);
    }
    _this.push(null);
  });
  stream.on('data', function (chunk) {
    debug('wrapped data');
    if (state.decoder) chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;
    var ret = _this.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (this[i] === undefined && typeof stream[i] === 'function') {
      this[i] = function methodWrap(method) {
        return function methodWrapReturnFunction() {
          return stream[method].apply(stream, arguments);
        };
      }(i);
    }
  }

  // proxy certain important events.
  for (var n = 0; n < kProxyEvents.length; n++) {
    stream.on(kProxyEvents[n], this.emit.bind(this, kProxyEvents[n]));
  }

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  this._read = function (n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };
  return this;
};
if (typeof Symbol === 'function') {
  Readable.prototype[Symbol.asyncIterator] = function () {
    if (createReadableStreamAsyncIterator === undefined) {
      createReadableStreamAsyncIterator = require('./internal/streams/async_iterator');
    }
    return createReadableStreamAsyncIterator(this);
  };
}
Object.defineProperty(Readable.prototype, 'readableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState.highWaterMark;
  }
});
Object.defineProperty(Readable.prototype, 'readableBuffer', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState && this._readableState.buffer;
  }
});
Object.defineProperty(Readable.prototype, 'readableFlowing', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState.flowing;
  },
  set: function set(state) {
    if (this._readableState) {
      this._readableState.flowing = state;
    }
  }
});

// exposed for testing purposes only.
Readable._fromList = fromList;
Object.defineProperty(Readable.prototype, 'readableLength', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState.length;
  }
});

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromList(n, state) {
  // nothing buffered
  if (state.length === 0) return null;
  var ret;
  if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
    // read it all, truncate the list
    if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.first();else ret = state.buffer.concat(state.length);
    state.buffer.clear();
  } else {
    // read part of list
    ret = state.buffer.consume(n, state.decoder);
  }
  return ret;
}
function endReadable(stream) {
  var state = stream._readableState;
  debug('endReadable', state.endEmitted);
  if (!state.endEmitted) {
    state.ended = true;
    process.nextTick(endReadableNT, state, stream);
  }
}
function endReadableNT(state, stream) {
  debug('endReadableNT', state.endEmitted, state.length);

  // Check that we didn't get one last unshift.
  if (!state.endEmitted && state.length === 0) {
    state.endEmitted = true;
    stream.readable = false;
    stream.emit('end');
    if (state.autoDestroy) {
      // In case of duplex streams we need a way to detect
      // if the writable side is ready for autoDestroy as well
      var wState = stream._writableState;
      if (!wState || wState.autoDestroy && wState.finished) {
        stream.destroy();
      }
    }
  }
}
if (typeof Symbol === 'function') {
  Readable.from = function (iterable, opts) {
    if (from === undefined) {
      from = require('./internal/streams/from');
    }
    return from(Readable, iterable, opts);
  };
}
function indexOf(xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}
}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../errors":61,"./_stream_duplex":62,"./internal/streams/async_iterator":67,"./internal/streams/buffer_list":68,"./internal/streams/destroy":69,"./internal/streams/from":71,"./internal/streams/state":73,"./internal/streams/stream":74,"_process":47,"buffer":18,"events":26,"inherits":60,"string_decoder/":75,"util":17}],65:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

'use strict';

module.exports = Transform;
var _require$codes = require('../errors').codes,
  ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
  ERR_MULTIPLE_CALLBACK = _require$codes.ERR_MULTIPLE_CALLBACK,
  ERR_TRANSFORM_ALREADY_TRANSFORMING = _require$codes.ERR_TRANSFORM_ALREADY_TRANSFORMING,
  ERR_TRANSFORM_WITH_LENGTH_0 = _require$codes.ERR_TRANSFORM_WITH_LENGTH_0;
var Duplex = require('./_stream_duplex');
require('inherits')(Transform, Duplex);
function afterTransform(er, data) {
  var ts = this._transformState;
  ts.transforming = false;
  var cb = ts.writecb;
  if (cb === null) {
    return this.emit('error', new ERR_MULTIPLE_CALLBACK());
  }
  ts.writechunk = null;
  ts.writecb = null;
  if (data != null)
    // single equals check for both `null` and `undefined`
    this.push(data);
  cb(er);
  var rs = this._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    this._read(rs.highWaterMark);
  }
}
function Transform(options) {
  if (!(this instanceof Transform)) return new Transform(options);
  Duplex.call(this, options);
  this._transformState = {
    afterTransform: afterTransform.bind(this),
    needTransform: false,
    transforming: false,
    writecb: null,
    writechunk: null,
    writeencoding: null
  };

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;
  if (options) {
    if (typeof options.transform === 'function') this._transform = options.transform;
    if (typeof options.flush === 'function') this._flush = options.flush;
  }

  // When the writable side finishes, then flush out anything remaining.
  this.on('prefinish', prefinish);
}
function prefinish() {
  var _this = this;
  if (typeof this._flush === 'function' && !this._readableState.destroyed) {
    this._flush(function (er, data) {
      done(_this, er, data);
    });
  } else {
    done(this, null, null);
  }
}
Transform.prototype.push = function (chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function (chunk, encoding, cb) {
  cb(new ERR_METHOD_NOT_IMPLEMENTED('_transform()'));
};
Transform.prototype._write = function (chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function (n) {
  var ts = this._transformState;
  if (ts.writechunk !== null && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};
Transform.prototype._destroy = function (err, cb) {
  Duplex.prototype._destroy.call(this, err, function (err2) {
    cb(err2);
  });
};
function done(stream, er, data) {
  if (er) return stream.emit('error', er);
  if (data != null)
    // single equals check for both `null` and `undefined`
    stream.push(data);

  // TODO(BridgeAR): Write a test for these two error cases
  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  if (stream._writableState.length) throw new ERR_TRANSFORM_WITH_LENGTH_0();
  if (stream._transformState.transforming) throw new ERR_TRANSFORM_ALREADY_TRANSFORMING();
  return stream.push(null);
}
},{"../errors":61,"./_stream_duplex":62,"inherits":60}],66:[function(require,module,exports){
(function (process,global){(function (){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, encoding, cb), and it'll handle all
// the drain event emission and buffering.

'use strict';

module.exports = Writable;

/* <replacement> */
function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
  this.next = null;
}

// It seems a linked list but it is not
// there will be only 2 of these for each stream
function CorkedRequest(state) {
  var _this = this;
  this.next = null;
  this.entry = null;
  this.finish = function () {
    onCorkedFinish(_this, state);
  };
}
/* </replacement> */

/*<replacement>*/
var Duplex;
/*</replacement>*/

Writable.WritableState = WritableState;

/*<replacement>*/
var internalUtil = {
  deprecate: require('util-deprecate')
};
/*</replacement>*/

/*<replacement>*/
var Stream = require('./internal/streams/stream');
/*</replacement>*/

var Buffer = require('buffer').Buffer;
var OurUint8Array = (typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {}).Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}
var destroyImpl = require('./internal/streams/destroy');
var _require = require('./internal/streams/state'),
  getHighWaterMark = _require.getHighWaterMark;
var _require$codes = require('../errors').codes,
  ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE,
  ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
  ERR_MULTIPLE_CALLBACK = _require$codes.ERR_MULTIPLE_CALLBACK,
  ERR_STREAM_CANNOT_PIPE = _require$codes.ERR_STREAM_CANNOT_PIPE,
  ERR_STREAM_DESTROYED = _require$codes.ERR_STREAM_DESTROYED,
  ERR_STREAM_NULL_VALUES = _require$codes.ERR_STREAM_NULL_VALUES,
  ERR_STREAM_WRITE_AFTER_END = _require$codes.ERR_STREAM_WRITE_AFTER_END,
  ERR_UNKNOWN_ENCODING = _require$codes.ERR_UNKNOWN_ENCODING;
var errorOrDestroy = destroyImpl.errorOrDestroy;
require('inherits')(Writable, Stream);
function nop() {}
function WritableState(options, stream, isDuplex) {
  Duplex = Duplex || require('./_stream_duplex');
  options = options || {};

  // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream,
  // e.g. options.readableObjectMode vs. options.writableObjectMode, etc.
  if (typeof isDuplex !== 'boolean') isDuplex = stream instanceof Duplex;

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;
  if (isDuplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  this.highWaterMark = getHighWaterMark(this, options, 'writableHighWaterMark', isDuplex);

  // if _final has been called
  this.finalCalled = false;

  // drain event flag.
  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // has it been destroyed
  this.destroyed = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function (er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;
  this.bufferedRequest = null;
  this.lastBufferedRequest = null;

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;

  // Should close be emitted on destroy. Defaults to true.
  this.emitClose = options.emitClose !== false;

  // Should .destroy() be called after 'finish' (and potentially 'end')
  this.autoDestroy = !!options.autoDestroy;

  // count buffered requests
  this.bufferedRequestCount = 0;

  // allocate the first CorkedRequest, there is always
  // one allocated and free to use, and we maintain at most two
  this.corkedRequestsFree = new CorkedRequest(this);
}
WritableState.prototype.getBuffer = function getBuffer() {
  var current = this.bufferedRequest;
  var out = [];
  while (current) {
    out.push(current);
    current = current.next;
  }
  return out;
};
(function () {
  try {
    Object.defineProperty(WritableState.prototype, 'buffer', {
      get: internalUtil.deprecate(function writableStateBufferGetter() {
        return this.getBuffer();
      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.', 'DEP0003')
    });
  } catch (_) {}
})();

// Test _writableState for inheritance to account for Duplex streams,
// whose prototype chain only points to Readable.
var realHasInstance;
if (typeof Symbol === 'function' && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] === 'function') {
  realHasInstance = Function.prototype[Symbol.hasInstance];
  Object.defineProperty(Writable, Symbol.hasInstance, {
    value: function value(object) {
      if (realHasInstance.call(this, object)) return true;
      if (this !== Writable) return false;
      return object && object._writableState instanceof WritableState;
    }
  });
} else {
  realHasInstance = function realHasInstance(object) {
    return object instanceof this;
  };
}
function Writable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, too.
  // `realHasInstance` is necessary because using plain `instanceof`
  // would return false, as no `_writableState` property is attached.

  // Trying to use the custom `instanceof` for Writable here will also break the
  // Node.js LazyTransform implementation, which has a non-trivial getter for
  // `_writableState` that would lead to infinite recursion.

  // Checking for a Stream.Duplex instance is faster here instead of inside
  // the WritableState constructor, at least with V8 6.5
  var isDuplex = this instanceof Duplex;
  if (!isDuplex && !realHasInstance.call(Writable, this)) return new Writable(options);
  this._writableState = new WritableState(options, this, isDuplex);

  // legacy.
  this.writable = true;
  if (options) {
    if (typeof options.write === 'function') this._write = options.write;
    if (typeof options.writev === 'function') this._writev = options.writev;
    if (typeof options.destroy === 'function') this._destroy = options.destroy;
    if (typeof options.final === 'function') this._final = options.final;
  }
  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function () {
  errorOrDestroy(this, new ERR_STREAM_CANNOT_PIPE());
};
function writeAfterEnd(stream, cb) {
  var er = new ERR_STREAM_WRITE_AFTER_END();
  // TODO: defer error events consistently everywhere, not just the cb
  errorOrDestroy(stream, er);
  process.nextTick(cb, er);
}

// Checks that a user-supplied chunk is valid, especially for the particular
// mode the stream is in. Currently this means that `null` is never accepted
// and undefined/non-string values are only allowed in object mode.
function validChunk(stream, state, chunk, cb) {
  var er;
  if (chunk === null) {
    er = new ERR_STREAM_NULL_VALUES();
  } else if (typeof chunk !== 'string' && !state.objectMode) {
    er = new ERR_INVALID_ARG_TYPE('chunk', ['string', 'Buffer'], chunk);
  }
  if (er) {
    errorOrDestroy(stream, er);
    process.nextTick(cb, er);
    return false;
  }
  return true;
}
Writable.prototype.write = function (chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;
  var isBuf = !state.objectMode && _isUint8Array(chunk);
  if (isBuf && !Buffer.isBuffer(chunk)) {
    chunk = _uint8ArrayToBuffer(chunk);
  }
  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }
  if (isBuf) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;
  if (typeof cb !== 'function') cb = nop;
  if (state.ending) writeAfterEnd(this, cb);else if (isBuf || validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, isBuf, chunk, encoding, cb);
  }
  return ret;
};
Writable.prototype.cork = function () {
  this._writableState.corked++;
};
Writable.prototype.uncork = function () {
  var state = this._writableState;
  if (state.corked) {
    state.corked--;
    if (!state.writing && !state.corked && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
  }
};
Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
  // node::ParseEncoding() requires lower case.
  if (typeof encoding === 'string') encoding = encoding.toLowerCase();
  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new ERR_UNKNOWN_ENCODING(encoding);
  this._writableState.defaultEncoding = encoding;
  return this;
};
Object.defineProperty(Writable.prototype, 'writableBuffer', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState && this._writableState.getBuffer();
  }
});
function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
    chunk = Buffer.from(chunk, encoding);
  }
  return chunk;
}
Object.defineProperty(Writable.prototype, 'writableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.highWaterMark;
  }
});

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, isBuf, chunk, encoding, cb) {
  if (!isBuf) {
    var newChunk = decodeChunk(state, chunk, encoding);
    if (chunk !== newChunk) {
      isBuf = true;
      encoding = 'buffer';
      chunk = newChunk;
    }
  }
  var len = state.objectMode ? 1 : chunk.length;
  state.length += len;
  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret) state.needDrain = true;
  if (state.writing || state.corked) {
    var last = state.lastBufferedRequest;
    state.lastBufferedRequest = {
      chunk: chunk,
      encoding: encoding,
      isBuf: isBuf,
      callback: cb,
      next: null
    };
    if (last) {
      last.next = state.lastBufferedRequest;
    } else {
      state.bufferedRequest = state.lastBufferedRequest;
    }
    state.bufferedRequestCount += 1;
  } else {
    doWrite(stream, state, false, len, chunk, encoding, cb);
  }
  return ret;
}
function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (state.destroyed) state.onwrite(new ERR_STREAM_DESTROYED('write'));else if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}
function onwriteError(stream, state, sync, er, cb) {
  --state.pendingcb;
  if (sync) {
    // defer the callback if we are being called synchronously
    // to avoid piling up things on the stack
    process.nextTick(cb, er);
    // this can emit finish, and it will always happen
    // after error
    process.nextTick(finishMaybe, stream, state);
    stream._writableState.errorEmitted = true;
    errorOrDestroy(stream, er);
  } else {
    // the caller expect this to happen before if
    // it is async
    cb(er);
    stream._writableState.errorEmitted = true;
    errorOrDestroy(stream, er);
    // this can emit finish, but finish must
    // always follow error
    finishMaybe(stream, state);
  }
}
function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}
function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;
  if (typeof cb !== 'function') throw new ERR_MULTIPLE_CALLBACK();
  onwriteStateUpdate(state);
  if (er) onwriteError(stream, state, sync, er, cb);else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(state) || stream.destroyed;
    if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
      clearBuffer(stream, state);
    }
    if (sync) {
      process.nextTick(afterWrite, stream, state, finished, cb);
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}
function afterWrite(stream, state, finished, cb) {
  if (!finished) onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}

// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;
  var entry = state.bufferedRequest;
  if (stream._writev && entry && entry.next) {
    // Fast case, write everything using _writev()
    var l = state.bufferedRequestCount;
    var buffer = new Array(l);
    var holder = state.corkedRequestsFree;
    holder.entry = entry;
    var count = 0;
    var allBuffers = true;
    while (entry) {
      buffer[count] = entry;
      if (!entry.isBuf) allBuffers = false;
      entry = entry.next;
      count += 1;
    }
    buffer.allBuffers = allBuffers;
    doWrite(stream, state, true, state.length, buffer, '', holder.finish);

    // doWrite is almost always async, defer these to save a bit of time
    // as the hot path ends with doWrite
    state.pendingcb++;
    state.lastBufferedRequest = null;
    if (holder.next) {
      state.corkedRequestsFree = holder.next;
      holder.next = null;
    } else {
      state.corkedRequestsFree = new CorkedRequest(state);
    }
    state.bufferedRequestCount = 0;
  } else {
    // Slow case, write chunks one-by-one
    while (entry) {
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;
      doWrite(stream, state, false, len, chunk, encoding, cb);
      entry = entry.next;
      state.bufferedRequestCount--;
      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        break;
      }
    }
    if (entry === null) state.lastBufferedRequest = null;
  }
  state.bufferedRequest = entry;
  state.bufferProcessing = false;
}
Writable.prototype._write = function (chunk, encoding, cb) {
  cb(new ERR_METHOD_NOT_IMPLEMENTED('_write()'));
};
Writable.prototype._writev = null;
Writable.prototype.end = function (chunk, encoding, cb) {
  var state = this._writableState;
  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }
  if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending) endWritable(this, state, cb);
  return this;
};
Object.defineProperty(Writable.prototype, 'writableLength', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.length;
  }
});
function needFinish(state) {
  return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
}
function callFinal(stream, state) {
  stream._final(function (err) {
    state.pendingcb--;
    if (err) {
      errorOrDestroy(stream, err);
    }
    state.prefinished = true;
    stream.emit('prefinish');
    finishMaybe(stream, state);
  });
}
function prefinish(stream, state) {
  if (!state.prefinished && !state.finalCalled) {
    if (typeof stream._final === 'function' && !state.destroyed) {
      state.pendingcb++;
      state.finalCalled = true;
      process.nextTick(callFinal, stream, state);
    } else {
      state.prefinished = true;
      stream.emit('prefinish');
    }
  }
}
function finishMaybe(stream, state) {
  var need = needFinish(state);
  if (need) {
    prefinish(stream, state);
    if (state.pendingcb === 0) {
      state.finished = true;
      stream.emit('finish');
      if (state.autoDestroy) {
        // In case of duplex streams we need a way to detect
        // if the readable side is ready for autoDestroy as well
        var rState = stream._readableState;
        if (!rState || rState.autoDestroy && rState.endEmitted) {
          stream.destroy();
        }
      }
    }
  }
  return need;
}
function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished) process.nextTick(cb);else stream.once('finish', cb);
  }
  state.ended = true;
  stream.writable = false;
}
function onCorkedFinish(corkReq, state, err) {
  var entry = corkReq.entry;
  corkReq.entry = null;
  while (entry) {
    var cb = entry.callback;
    state.pendingcb--;
    cb(err);
    entry = entry.next;
  }

  // reuse the free corkReq.
  state.corkedRequestsFree.next = corkReq;
}
Object.defineProperty(Writable.prototype, 'destroyed', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    if (this._writableState === undefined) {
      return false;
    }
    return this._writableState.destroyed;
  },
  set: function set(value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._writableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._writableState.destroyed = value;
  }
});
Writable.prototype.destroy = destroyImpl.destroy;
Writable.prototype._undestroy = destroyImpl.undestroy;
Writable.prototype._destroy = function (err, cb) {
  cb(err);
};
}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../errors":61,"./_stream_duplex":62,"./internal/streams/destroy":69,"./internal/streams/state":73,"./internal/streams/stream":74,"_process":47,"buffer":18,"inherits":60,"util-deprecate":77}],67:[function(require,module,exports){
(function (process){(function (){
'use strict';

var _Object$setPrototypeO;
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
var finished = require('./end-of-stream');
var kLastResolve = Symbol('lastResolve');
var kLastReject = Symbol('lastReject');
var kError = Symbol('error');
var kEnded = Symbol('ended');
var kLastPromise = Symbol('lastPromise');
var kHandlePromise = Symbol('handlePromise');
var kStream = Symbol('stream');
function createIterResult(value, done) {
  return {
    value: value,
    done: done
  };
}
function readAndResolve(iter) {
  var resolve = iter[kLastResolve];
  if (resolve !== null) {
    var data = iter[kStream].read();
    // we defer if data is null
    // we can be expecting either 'end' or
    // 'error'
    if (data !== null) {
      iter[kLastPromise] = null;
      iter[kLastResolve] = null;
      iter[kLastReject] = null;
      resolve(createIterResult(data, false));
    }
  }
}
function onReadable(iter) {
  // we wait for the next tick, because it might
  // emit an error with process.nextTick
  process.nextTick(readAndResolve, iter);
}
function wrapForNext(lastPromise, iter) {
  return function (resolve, reject) {
    lastPromise.then(function () {
      if (iter[kEnded]) {
        resolve(createIterResult(undefined, true));
        return;
      }
      iter[kHandlePromise](resolve, reject);
    }, reject);
  };
}
var AsyncIteratorPrototype = Object.getPrototypeOf(function () {});
var ReadableStreamAsyncIteratorPrototype = Object.setPrototypeOf((_Object$setPrototypeO = {
  get stream() {
    return this[kStream];
  },
  next: function next() {
    var _this = this;
    // if we have detected an error in the meanwhile
    // reject straight away
    var error = this[kError];
    if (error !== null) {
      return Promise.reject(error);
    }
    if (this[kEnded]) {
      return Promise.resolve(createIterResult(undefined, true));
    }
    if (this[kStream].destroyed) {
      // We need to defer via nextTick because if .destroy(err) is
      // called, the error will be emitted via nextTick, and
      // we cannot guarantee that there is no error lingering around
      // waiting to be emitted.
      return new Promise(function (resolve, reject) {
        process.nextTick(function () {
          if (_this[kError]) {
            reject(_this[kError]);
          } else {
            resolve(createIterResult(undefined, true));
          }
        });
      });
    }

    // if we have multiple next() calls
    // we will wait for the previous Promise to finish
    // this logic is optimized to support for await loops,
    // where next() is only called once at a time
    var lastPromise = this[kLastPromise];
    var promise;
    if (lastPromise) {
      promise = new Promise(wrapForNext(lastPromise, this));
    } else {
      // fast path needed to support multiple this.push()
      // without triggering the next() queue
      var data = this[kStream].read();
      if (data !== null) {
        return Promise.resolve(createIterResult(data, false));
      }
      promise = new Promise(this[kHandlePromise]);
    }
    this[kLastPromise] = promise;
    return promise;
  }
}, _defineProperty(_Object$setPrototypeO, Symbol.asyncIterator, function () {
  return this;
}), _defineProperty(_Object$setPrototypeO, "return", function _return() {
  var _this2 = this;
  // destroy(err, cb) is a private API
  // we can guarantee we have that here, because we control the
  // Readable class this is attached to
  return new Promise(function (resolve, reject) {
    _this2[kStream].destroy(null, function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(createIterResult(undefined, true));
    });
  });
}), _Object$setPrototypeO), AsyncIteratorPrototype);
var createReadableStreamAsyncIterator = function createReadableStreamAsyncIterator(stream) {
  var _Object$create;
  var iterator = Object.create(ReadableStreamAsyncIteratorPrototype, (_Object$create = {}, _defineProperty(_Object$create, kStream, {
    value: stream,
    writable: true
  }), _defineProperty(_Object$create, kLastResolve, {
    value: null,
    writable: true
  }), _defineProperty(_Object$create, kLastReject, {
    value: null,
    writable: true
  }), _defineProperty(_Object$create, kError, {
    value: null,
    writable: true
  }), _defineProperty(_Object$create, kEnded, {
    value: stream._readableState.endEmitted,
    writable: true
  }), _defineProperty(_Object$create, kHandlePromise, {
    value: function value(resolve, reject) {
      var data = iterator[kStream].read();
      if (data) {
        iterator[kLastPromise] = null;
        iterator[kLastResolve] = null;
        iterator[kLastReject] = null;
        resolve(createIterResult(data, false));
      } else {
        iterator[kLastResolve] = resolve;
        iterator[kLastReject] = reject;
      }
    },
    writable: true
  }), _Object$create));
  iterator[kLastPromise] = null;
  finished(stream, function (err) {
    if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
      var reject = iterator[kLastReject];
      // reject if we are waiting for data in the Promise
      // returned by next() and store the error
      if (reject !== null) {
        iterator[kLastPromise] = null;
        iterator[kLastResolve] = null;
        iterator[kLastReject] = null;
        reject(err);
      }
      iterator[kError] = err;
      return;
    }
    var resolve = iterator[kLastResolve];
    if (resolve !== null) {
      iterator[kLastPromise] = null;
      iterator[kLastResolve] = null;
      iterator[kLastReject] = null;
      resolve(createIterResult(undefined, true));
    }
    iterator[kEnded] = true;
  });
  stream.on('readable', onReadable.bind(null, iterator));
  return iterator;
};
module.exports = createReadableStreamAsyncIterator;
}).call(this)}).call(this,require('_process'))
},{"./end-of-stream":70,"_process":47}],68:[function(require,module,exports){
'use strict';

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
var _require = require('buffer'),
  Buffer = _require.Buffer;
var _require2 = require('util'),
  inspect = _require2.inspect;
var custom = inspect && inspect.custom || 'inspect';
function copyBuffer(src, target, offset) {
  Buffer.prototype.copy.call(src, target, offset);
}
module.exports = /*#__PURE__*/function () {
  function BufferList() {
    _classCallCheck(this, BufferList);
    this.head = null;
    this.tail = null;
    this.length = 0;
  }
  _createClass(BufferList, [{
    key: "push",
    value: function push(v) {
      var entry = {
        data: v,
        next: null
      };
      if (this.length > 0) this.tail.next = entry;else this.head = entry;
      this.tail = entry;
      ++this.length;
    }
  }, {
    key: "unshift",
    value: function unshift(v) {
      var entry = {
        data: v,
        next: this.head
      };
      if (this.length === 0) this.tail = entry;
      this.head = entry;
      ++this.length;
    }
  }, {
    key: "shift",
    value: function shift() {
      if (this.length === 0) return;
      var ret = this.head.data;
      if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
      --this.length;
      return ret;
    }
  }, {
    key: "clear",
    value: function clear() {
      this.head = this.tail = null;
      this.length = 0;
    }
  }, {
    key: "join",
    value: function join(s) {
      if (this.length === 0) return '';
      var p = this.head;
      var ret = '' + p.data;
      while (p = p.next) ret += s + p.data;
      return ret;
    }
  }, {
    key: "concat",
    value: function concat(n) {
      if (this.length === 0) return Buffer.alloc(0);
      var ret = Buffer.allocUnsafe(n >>> 0);
      var p = this.head;
      var i = 0;
      while (p) {
        copyBuffer(p.data, ret, i);
        i += p.data.length;
        p = p.next;
      }
      return ret;
    }

    // Consumes a specified amount of bytes or characters from the buffered data.
  }, {
    key: "consume",
    value: function consume(n, hasStrings) {
      var ret;
      if (n < this.head.data.length) {
        // `slice` is the same for buffers and strings.
        ret = this.head.data.slice(0, n);
        this.head.data = this.head.data.slice(n);
      } else if (n === this.head.data.length) {
        // First chunk is a perfect match.
        ret = this.shift();
      } else {
        // Result spans more than one buffer.
        ret = hasStrings ? this._getString(n) : this._getBuffer(n);
      }
      return ret;
    }
  }, {
    key: "first",
    value: function first() {
      return this.head.data;
    }

    // Consumes a specified amount of characters from the buffered data.
  }, {
    key: "_getString",
    value: function _getString(n) {
      var p = this.head;
      var c = 1;
      var ret = p.data;
      n -= ret.length;
      while (p = p.next) {
        var str = p.data;
        var nb = n > str.length ? str.length : n;
        if (nb === str.length) ret += str;else ret += str.slice(0, n);
        n -= nb;
        if (n === 0) {
          if (nb === str.length) {
            ++c;
            if (p.next) this.head = p.next;else this.head = this.tail = null;
          } else {
            this.head = p;
            p.data = str.slice(nb);
          }
          break;
        }
        ++c;
      }
      this.length -= c;
      return ret;
    }

    // Consumes a specified amount of bytes from the buffered data.
  }, {
    key: "_getBuffer",
    value: function _getBuffer(n) {
      var ret = Buffer.allocUnsafe(n);
      var p = this.head;
      var c = 1;
      p.data.copy(ret);
      n -= p.data.length;
      while (p = p.next) {
        var buf = p.data;
        var nb = n > buf.length ? buf.length : n;
        buf.copy(ret, ret.length - n, 0, nb);
        n -= nb;
        if (n === 0) {
          if (nb === buf.length) {
            ++c;
            if (p.next) this.head = p.next;else this.head = this.tail = null;
          } else {
            this.head = p;
            p.data = buf.slice(nb);
          }
          break;
        }
        ++c;
      }
      this.length -= c;
      return ret;
    }

    // Make sure the linked list only shows the minimal necessary information.
  }, {
    key: custom,
    value: function value(_, options) {
      return inspect(this, _objectSpread(_objectSpread({}, options), {}, {
        // Only inspect one level.
        depth: 0,
        // It should not recurse.
        customInspect: false
      }));
    }
  }]);
  return BufferList;
}();
},{"buffer":18,"util":17}],69:[function(require,module,exports){
(function (process){(function (){
'use strict';

// undocumented cb() API, needed for core, not for public API
function destroy(err, cb) {
  var _this = this;
  var readableDestroyed = this._readableState && this._readableState.destroyed;
  var writableDestroyed = this._writableState && this._writableState.destroyed;
  if (readableDestroyed || writableDestroyed) {
    if (cb) {
      cb(err);
    } else if (err) {
      if (!this._writableState) {
        process.nextTick(emitErrorNT, this, err);
      } else if (!this._writableState.errorEmitted) {
        this._writableState.errorEmitted = true;
        process.nextTick(emitErrorNT, this, err);
      }
    }
    return this;
  }

  // we set destroyed to true before firing error callbacks in order
  // to make it re-entrance safe in case destroy() is called within callbacks

  if (this._readableState) {
    this._readableState.destroyed = true;
  }

  // if this is a duplex stream mark the writable part as destroyed as well
  if (this._writableState) {
    this._writableState.destroyed = true;
  }
  this._destroy(err || null, function (err) {
    if (!cb && err) {
      if (!_this._writableState) {
        process.nextTick(emitErrorAndCloseNT, _this, err);
      } else if (!_this._writableState.errorEmitted) {
        _this._writableState.errorEmitted = true;
        process.nextTick(emitErrorAndCloseNT, _this, err);
      } else {
        process.nextTick(emitCloseNT, _this);
      }
    } else if (cb) {
      process.nextTick(emitCloseNT, _this);
      cb(err);
    } else {
      process.nextTick(emitCloseNT, _this);
    }
  });
  return this;
}
function emitErrorAndCloseNT(self, err) {
  emitErrorNT(self, err);
  emitCloseNT(self);
}
function emitCloseNT(self) {
  if (self._writableState && !self._writableState.emitClose) return;
  if (self._readableState && !self._readableState.emitClose) return;
  self.emit('close');
}
function undestroy() {
  if (this._readableState) {
    this._readableState.destroyed = false;
    this._readableState.reading = false;
    this._readableState.ended = false;
    this._readableState.endEmitted = false;
  }
  if (this._writableState) {
    this._writableState.destroyed = false;
    this._writableState.ended = false;
    this._writableState.ending = false;
    this._writableState.finalCalled = false;
    this._writableState.prefinished = false;
    this._writableState.finished = false;
    this._writableState.errorEmitted = false;
  }
}
function emitErrorNT(self, err) {
  self.emit('error', err);
}
function errorOrDestroy(stream, err) {
  // We have tests that rely on errors being emitted
  // in the same tick, so changing this is semver major.
  // For now when you opt-in to autoDestroy we allow
  // the error to be emitted nextTick. In a future
  // semver major update we should change the default to this.

  var rState = stream._readableState;
  var wState = stream._writableState;
  if (rState && rState.autoDestroy || wState && wState.autoDestroy) stream.destroy(err);else stream.emit('error', err);
}
module.exports = {
  destroy: destroy,
  undestroy: undestroy,
  errorOrDestroy: errorOrDestroy
};
}).call(this)}).call(this,require('_process'))
},{"_process":47}],70:[function(require,module,exports){
// Ported from https://github.com/mafintosh/end-of-stream with
// permission from the author, Mathias Buus (@mafintosh).

'use strict';

var ERR_STREAM_PREMATURE_CLOSE = require('../../../errors').codes.ERR_STREAM_PREMATURE_CLOSE;
function once(callback) {
  var called = false;
  return function () {
    if (called) return;
    called = true;
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    callback.apply(this, args);
  };
}
function noop() {}
function isRequest(stream) {
  return stream.setHeader && typeof stream.abort === 'function';
}
function eos(stream, opts, callback) {
  if (typeof opts === 'function') return eos(stream, null, opts);
  if (!opts) opts = {};
  callback = once(callback || noop);
  var readable = opts.readable || opts.readable !== false && stream.readable;
  var writable = opts.writable || opts.writable !== false && stream.writable;
  var onlegacyfinish = function onlegacyfinish() {
    if (!stream.writable) onfinish();
  };
  var writableEnded = stream._writableState && stream._writableState.finished;
  var onfinish = function onfinish() {
    writable = false;
    writableEnded = true;
    if (!readable) callback.call(stream);
  };
  var readableEnded = stream._readableState && stream._readableState.endEmitted;
  var onend = function onend() {
    readable = false;
    readableEnded = true;
    if (!writable) callback.call(stream);
  };
  var onerror = function onerror(err) {
    callback.call(stream, err);
  };
  var onclose = function onclose() {
    var err;
    if (readable && !readableEnded) {
      if (!stream._readableState || !stream._readableState.ended) err = new ERR_STREAM_PREMATURE_CLOSE();
      return callback.call(stream, err);
    }
    if (writable && !writableEnded) {
      if (!stream._writableState || !stream._writableState.ended) err = new ERR_STREAM_PREMATURE_CLOSE();
      return callback.call(stream, err);
    }
  };
  var onrequest = function onrequest() {
    stream.req.on('finish', onfinish);
  };
  if (isRequest(stream)) {
    stream.on('complete', onfinish);
    stream.on('abort', onclose);
    if (stream.req) onrequest();else stream.on('request', onrequest);
  } else if (writable && !stream._writableState) {
    // legacy streams
    stream.on('end', onlegacyfinish);
    stream.on('close', onlegacyfinish);
  }
  stream.on('end', onend);
  stream.on('finish', onfinish);
  if (opts.error !== false) stream.on('error', onerror);
  stream.on('close', onclose);
  return function () {
    stream.removeListener('complete', onfinish);
    stream.removeListener('abort', onclose);
    stream.removeListener('request', onrequest);
    if (stream.req) stream.req.removeListener('finish', onfinish);
    stream.removeListener('end', onlegacyfinish);
    stream.removeListener('close', onlegacyfinish);
    stream.removeListener('finish', onfinish);
    stream.removeListener('end', onend);
    stream.removeListener('error', onerror);
    stream.removeListener('close', onclose);
  };
}
module.exports = eos;
},{"../../../errors":61}],71:[function(require,module,exports){
module.exports = function () {
  throw new Error('Readable.from is not available in the browser')
};

},{}],72:[function(require,module,exports){
// Ported from https://github.com/mafintosh/pump with
// permission from the author, Mathias Buus (@mafintosh).

'use strict';

var eos;
function once(callback) {
  var called = false;
  return function () {
    if (called) return;
    called = true;
    callback.apply(void 0, arguments);
  };
}
var _require$codes = require('../../../errors').codes,
  ERR_MISSING_ARGS = _require$codes.ERR_MISSING_ARGS,
  ERR_STREAM_DESTROYED = _require$codes.ERR_STREAM_DESTROYED;
function noop(err) {
  // Rethrow the error if it exists to avoid swallowing it
  if (err) throw err;
}
function isRequest(stream) {
  return stream.setHeader && typeof stream.abort === 'function';
}
function destroyer(stream, reading, writing, callback) {
  callback = once(callback);
  var closed = false;
  stream.on('close', function () {
    closed = true;
  });
  if (eos === undefined) eos = require('./end-of-stream');
  eos(stream, {
    readable: reading,
    writable: writing
  }, function (err) {
    if (err) return callback(err);
    closed = true;
    callback();
  });
  var destroyed = false;
  return function (err) {
    if (closed) return;
    if (destroyed) return;
    destroyed = true;

    // request.destroy just do .end - .abort is what we want
    if (isRequest(stream)) return stream.abort();
    if (typeof stream.destroy === 'function') return stream.destroy();
    callback(err || new ERR_STREAM_DESTROYED('pipe'));
  };
}
function call(fn) {
  fn();
}
function pipe(from, to) {
  return from.pipe(to);
}
function popCallback(streams) {
  if (!streams.length) return noop;
  if (typeof streams[streams.length - 1] !== 'function') return noop;
  return streams.pop();
}
function pipeline() {
  for (var _len = arguments.length, streams = new Array(_len), _key = 0; _key < _len; _key++) {
    streams[_key] = arguments[_key];
  }
  var callback = popCallback(streams);
  if (Array.isArray(streams[0])) streams = streams[0];
  if (streams.length < 2) {
    throw new ERR_MISSING_ARGS('streams');
  }
  var error;
  var destroys = streams.map(function (stream, i) {
    var reading = i < streams.length - 1;
    var writing = i > 0;
    return destroyer(stream, reading, writing, function (err) {
      if (!error) error = err;
      if (err) destroys.forEach(call);
      if (reading) return;
      destroys.forEach(call);
      callback(error);
    });
  });
  return streams.reduce(pipe);
}
module.exports = pipeline;
},{"../../../errors":61,"./end-of-stream":70}],73:[function(require,module,exports){
'use strict';

var ERR_INVALID_OPT_VALUE = require('../../../errors').codes.ERR_INVALID_OPT_VALUE;
function highWaterMarkFrom(options, isDuplex, duplexKey) {
  return options.highWaterMark != null ? options.highWaterMark : isDuplex ? options[duplexKey] : null;
}
function getHighWaterMark(state, options, duplexKey, isDuplex) {
  var hwm = highWaterMarkFrom(options, isDuplex, duplexKey);
  if (hwm != null) {
    if (!(isFinite(hwm) && Math.floor(hwm) === hwm) || hwm < 0) {
      var name = isDuplex ? duplexKey : 'highWaterMark';
      throw new ERR_INVALID_OPT_VALUE(name, hwm);
    }
    return Math.floor(hwm);
  }

  // Default value
  return state.objectMode ? 16 : 16 * 1024;
}
module.exports = {
  getHighWaterMark: getHighWaterMark
};
},{"../../../errors":61}],74:[function(require,module,exports){
arguments[4][56][0].apply(exports,arguments)
},{"dup":56,"events":26}],75:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

/*<replacement>*/

var Buffer = require('safe-buffer').Buffer;
/*</replacement>*/

var isEncoding = Buffer.isEncoding || function (encoding) {
  encoding = '' + encoding;
  switch (encoding && encoding.toLowerCase()) {
    case 'hex':case 'utf8':case 'utf-8':case 'ascii':case 'binary':case 'base64':case 'ucs2':case 'ucs-2':case 'utf16le':case 'utf-16le':case 'raw':
      return true;
    default:
      return false;
  }
};

function _normalizeEncoding(enc) {
  if (!enc) return 'utf8';
  var retried;
  while (true) {
    switch (enc) {
      case 'utf8':
      case 'utf-8':
        return 'utf8';
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return 'utf16le';
      case 'latin1':
      case 'binary':
        return 'latin1';
      case 'base64':
      case 'ascii':
      case 'hex':
        return enc;
      default:
        if (retried) return; // undefined
        enc = ('' + enc).toLowerCase();
        retried = true;
    }
  }
};

// Do not cache `Buffer.isEncoding` when checking encoding names as some
// modules monkey-patch it to support additional encodings
function normalizeEncoding(enc) {
  var nenc = _normalizeEncoding(enc);
  if (typeof nenc !== 'string' && (Buffer.isEncoding === isEncoding || !isEncoding(enc))) throw new Error('Unknown encoding: ' + enc);
  return nenc || enc;
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters.
exports.StringDecoder = StringDecoder;
function StringDecoder(encoding) {
  this.encoding = normalizeEncoding(encoding);
  var nb;
  switch (this.encoding) {
    case 'utf16le':
      this.text = utf16Text;
      this.end = utf16End;
      nb = 4;
      break;
    case 'utf8':
      this.fillLast = utf8FillLast;
      nb = 4;
      break;
    case 'base64':
      this.text = base64Text;
      this.end = base64End;
      nb = 3;
      break;
    default:
      this.write = simpleWrite;
      this.end = simpleEnd;
      return;
  }
  this.lastNeed = 0;
  this.lastTotal = 0;
  this.lastChar = Buffer.allocUnsafe(nb);
}

StringDecoder.prototype.write = function (buf) {
  if (buf.length === 0) return '';
  var r;
  var i;
  if (this.lastNeed) {
    r = this.fillLast(buf);
    if (r === undefined) return '';
    i = this.lastNeed;
    this.lastNeed = 0;
  } else {
    i = 0;
  }
  if (i < buf.length) return r ? r + this.text(buf, i) : this.text(buf, i);
  return r || '';
};

StringDecoder.prototype.end = utf8End;

// Returns only complete characters in a Buffer
StringDecoder.prototype.text = utf8Text;

// Attempts to complete a partial non-UTF-8 character using bytes from a Buffer
StringDecoder.prototype.fillLast = function (buf) {
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
  this.lastNeed -= buf.length;
};

// Checks the type of a UTF-8 byte, whether it's ASCII, a leading byte, or a
// continuation byte. If an invalid byte is detected, -2 is returned.
function utf8CheckByte(byte) {
  if (byte <= 0x7F) return 0;else if (byte >> 5 === 0x06) return 2;else if (byte >> 4 === 0x0E) return 3;else if (byte >> 3 === 0x1E) return 4;
  return byte >> 6 === 0x02 ? -1 : -2;
}

// Checks at most 3 bytes at the end of a Buffer in order to detect an
// incomplete multi-byte UTF-8 character. The total number of bytes (2, 3, or 4)
// needed to complete the UTF-8 character (if applicable) are returned.
function utf8CheckIncomplete(self, buf, i) {
  var j = buf.length - 1;
  if (j < i) return 0;
  var nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 1;
    return nb;
  }
  if (--j < i || nb === -2) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 2;
    return nb;
  }
  if (--j < i || nb === -2) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) {
      if (nb === 2) nb = 0;else self.lastNeed = nb - 3;
    }
    return nb;
  }
  return 0;
}

// Validates as many continuation bytes for a multi-byte UTF-8 character as
// needed or are available. If we see a non-continuation byte where we expect
// one, we "replace" the validated continuation bytes we've seen so far with
// a single UTF-8 replacement character ('\ufffd'), to match v8's UTF-8 decoding
// behavior. The continuation byte check is included three times in the case
// where all of the continuation bytes for a character exist in the same buffer.
// It is also done this way as a slight performance increase instead of using a
// loop.
function utf8CheckExtraBytes(self, buf, p) {
  if ((buf[0] & 0xC0) !== 0x80) {
    self.lastNeed = 0;
    return '\ufffd';
  }
  if (self.lastNeed > 1 && buf.length > 1) {
    if ((buf[1] & 0xC0) !== 0x80) {
      self.lastNeed = 1;
      return '\ufffd';
    }
    if (self.lastNeed > 2 && buf.length > 2) {
      if ((buf[2] & 0xC0) !== 0x80) {
        self.lastNeed = 2;
        return '\ufffd';
      }
    }
  }
}

// Attempts to complete a multi-byte UTF-8 character using bytes from a Buffer.
function utf8FillLast(buf) {
  var p = this.lastTotal - this.lastNeed;
  var r = utf8CheckExtraBytes(this, buf, p);
  if (r !== undefined) return r;
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, p, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, p, 0, buf.length);
  this.lastNeed -= buf.length;
}

// Returns all complete UTF-8 characters in a Buffer. If the Buffer ended on a
// partial character, the character's bytes are buffered until the required
// number of bytes are available.
function utf8Text(buf, i) {
  var total = utf8CheckIncomplete(this, buf, i);
  if (!this.lastNeed) return buf.toString('utf8', i);
  this.lastTotal = total;
  var end = buf.length - (total - this.lastNeed);
  buf.copy(this.lastChar, 0, end);
  return buf.toString('utf8', i, end);
}

// For UTF-8, a replacement character is added when ending on a partial
// character.
function utf8End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + '\ufffd';
  return r;
}

// UTF-16LE typically needs two bytes per character, but even if we have an even
// number of bytes available, we need to check if we end on a leading/high
// surrogate. In that case, we need to wait for the next two bytes in order to
// decode the last character properly.
function utf16Text(buf, i) {
  if ((buf.length - i) % 2 === 0) {
    var r = buf.toString('utf16le', i);
    if (r) {
      var c = r.charCodeAt(r.length - 1);
      if (c >= 0xD800 && c <= 0xDBFF) {
        this.lastNeed = 2;
        this.lastTotal = 4;
        this.lastChar[0] = buf[buf.length - 2];
        this.lastChar[1] = buf[buf.length - 1];
        return r.slice(0, -1);
      }
    }
    return r;
  }
  this.lastNeed = 1;
  this.lastTotal = 2;
  this.lastChar[0] = buf[buf.length - 1];
  return buf.toString('utf16le', i, buf.length - 1);
}

// For UTF-16LE we do not explicitly append special replacement characters if we
// end on a partial character, we simply let v8 handle that.
function utf16End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) {
    var end = this.lastTotal - this.lastNeed;
    return r + this.lastChar.toString('utf16le', 0, end);
  }
  return r;
}

function base64Text(buf, i) {
  var n = (buf.length - i) % 3;
  if (n === 0) return buf.toString('base64', i);
  this.lastNeed = 3 - n;
  this.lastTotal = 3;
  if (n === 1) {
    this.lastChar[0] = buf[buf.length - 1];
  } else {
    this.lastChar[0] = buf[buf.length - 2];
    this.lastChar[1] = buf[buf.length - 1];
  }
  return buf.toString('base64', i, buf.length - n);
}

function base64End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + this.lastChar.toString('base64', 0, 3 - this.lastNeed);
  return r;
}

// Pass bytes on through for single-byte encodings (e.g. ascii, latin1, hex)
function simpleWrite(buf) {
  return buf.toString(this.encoding);
}

function simpleEnd(buf) {
  return buf && buf.length ? this.write(buf) : '';
}
},{"safe-buffer":58}],76:[function(require,module,exports){
(function (setImmediate,clearImmediate){(function (){
var nextTick = require('process/browser.js').nextTick;
var apply = Function.prototype.apply;
var slice = Array.prototype.slice;
var immediateIds = {};
var nextImmediateId = 0;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) { timeout.close(); };

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// That's not how node.js implements it but the exposed api is the same.
exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
  var id = nextImmediateId++;
  var args = arguments.length < 2 ? false : slice.call(arguments, 1);

  immediateIds[id] = true;

  nextTick(function onNextTick() {
    if (immediateIds[id]) {
      // fn.call() is faster so we optimize for the common use-case
      // @see http://jsperf.com/call-apply-segu
      if (args) {
        fn.apply(null, args);
      } else {
        fn.call(null);
      }
      // Prevent ids from leaking
      exports.clearImmediate(id);
    }
  });

  return id;
};

exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
  delete immediateIds[id];
};
}).call(this)}).call(this,require("timers").setImmediate,require("timers").clearImmediate)
},{"process/browser.js":47,"timers":76}],77:[function(require,module,exports){
(function (global){(function (){

/**
 * Module exports.
 */

module.exports = deprecate;

/**
 * Mark that a method should not be used.
 * Returns a modified function which warns once by default.
 *
 * If `localStorage.noDeprecation = true` is set, then it is a no-op.
 *
 * If `localStorage.throwDeprecation = true` is set, then deprecated functions
 * will throw an Error when invoked.
 *
 * If `localStorage.traceDeprecation = true` is set, then deprecated functions
 * will invoke `console.trace()` instead of `console.error()`.
 *
 * @param {Function} fn - the function to deprecate
 * @param {String} msg - the string to print to the console when `fn` is invoked
 * @returns {Function} a new "deprecated" version of `fn`
 * @api public
 */

function deprecate (fn, msg) {
  if (config('noDeprecation')) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (config('throwDeprecation')) {
        throw new Error(msg);
      } else if (config('traceDeprecation')) {
        console.trace(msg);
      } else {
        console.warn(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
}

/**
 * Checks `localStorage` for boolean values for the given `name`.
 *
 * @param {String} name
 * @returns {Boolean}
 * @api private
 */

function config (name) {
  // accessing global.localStorage can trigger a DOMException in sandboxed iframes
  try {
    if (!global.localStorage) return false;
  } catch (_) {
    return false;
  }
  var val = global.localStorage[name];
  if (null == val) return false;
  return String(val).toLowerCase() === 'true';
}

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],78:[function(require,module,exports){
(function (setImmediate){(function (){
/*! For license information please see web3.min.js.LICENSE.txt */
!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports.Web3=t():e.Web3=t()}(this,(()=>(()=>{var e={7256:(e,t)=>{"use strict";function r(e){if(Array.isArray(e)){const t=[];let n=0;for(let i=0;i<e.length;i++){const o=r(e[i]);t.push(o),n+=o.length}return h(o(n,192),...t)}const t=g(e);return 1===t.length&&t[0]<128?t:h(o(t.length,128),t)}function n(e,t,r){if(r>e.length)throw new Error("invalid RLP (safeSlice): end slice of Uint8Array out-of-bounds");return e.slice(t,r)}function i(e){if(0===e[0])throw new Error("invalid RLP: extra zeros");return d(u(e))}function o(e,t){if(e<56)return Uint8Array.from([e+t]);const r=p(e),n=p(t+55+r.length/2);return Uint8Array.from(l(n+r))}function s(e,t=!1){if(null==e||0===e.length)return Uint8Array.from([]);const r=a(g(e));if(t)return r;if(0!==r.remainder.length)throw new Error("invalid RLP: remainder must be zero");return r.data}function a(e){let t,r,o,s,c;const u=[],d=e[0];if(d<=127)return{data:e.slice(0,1),remainder:e.slice(1)};if(d<=183){if(t=d-127,o=128===d?Uint8Array.from([]):n(e,1,t),2===t&&o[0]<128)throw new Error("invalid RLP encoding: invalid prefix, single byte < 0x80 are not prefixed");return{data:o,remainder:e.slice(t)}}if(d<=191){if(r=d-182,e.length-1<r)throw new Error("invalid RLP: not enough bytes for string length");if(t=i(n(e,1,r)),t<=55)throw new Error("invalid RLP: expected string length to be greater than 55");return o=n(e,r,t+r),{data:o,remainder:e.slice(t+r)}}if(d<=247){for(t=d-191,s=n(e,1,t);s.length;)c=a(s),u.push(c.data),s=c.remainder;return{data:u,remainder:e.slice(t)}}{if(r=d-246,t=i(n(e,1,r)),t<56)throw new Error("invalid RLP: encoded list too short");const o=r+t;if(o>e.length)throw new Error("invalid RLP: total length is larger than the data");for(s=n(e,r,o);s.length;)c=a(s),u.push(c.data),s=c.remainder;return{data:u,remainder:e.slice(o)}}}Object.defineProperty(t,"__esModule",{value:!0}),t.RLP=t.utils=t.decode=t.encode=void 0,t.encode=r,t.decode=s;const c=Array.from({length:256},((e,t)=>t.toString(16).padStart(2,"0")));function u(e){let t="";for(let r=0;r<e.length;r++)t+=c[e[r]];return t}function d(e){const t=Number.parseInt(e,16);if(Number.isNaN(t))throw new Error("Invalid byte sequence");return t}function l(e){if("string"!=typeof e)throw new TypeError("hexToBytes: expected string, got "+typeof e);if(e.length%2)throw new Error("hexToBytes: received invalid unpadded hex");const t=new Uint8Array(e.length/2);for(let r=0;r<t.length;r++){const n=2*r;t[r]=d(e.slice(n,n+2))}return t}function h(...e){if(1===e.length)return e[0];const t=e.reduce(((e,t)=>e+t.length),0),r=new Uint8Array(t);for(let t=0,n=0;t<e.length;t++){const i=e[t];r.set(i,n),n+=i.length}return r}function f(e){return(new TextEncoder).encode(e)}function p(e){if(e<0)throw new Error("Invalid integer as argument, must be unsigned!");const t=e.toString(16);return t.length%2?`0${t}`:t}function m(e){return e.length>=2&&"0"===e[0]&&"x"===e[1]}function g(e){if(e instanceof Uint8Array)return e;if("string"==typeof e)return m(e)?l((t="string"!=typeof(r=e)?r:m(r)?r.slice(2):r).length%2?`0${t}`:t):f(e);var t,r;if("number"==typeof e||"bigint"==typeof e)return e?l(p(e)):Uint8Array.from([]);if(null==e)return Uint8Array.from([]);throw new Error("toBytes: received unsupported type "+typeof e)}t.utils={bytesToHex:u,concatBytes:h,hexToBytes:l,utf8ToBytes:f},t.RLP={encode:r,decode:s}},5887:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.createCurve=t.getHash=void 0;const n=r(1377),i=r(64),o=r(7851);function s(e){return{hash:e,hmac:(t,...r)=>(0,n.hmac)(e,t,(0,i.concatBytes)(...r)),randomBytes:i.randomBytes}}t.getHash=s,t.createCurve=function(e,t){const r=t=>(0,o.weierstrass)({...e,...s(t)});return Object.freeze({...r(t),create:r})}},1465:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.validateBasic=t.wNAF=void 0;const n=r(9530),i=r(4323),o=BigInt(0),s=BigInt(1);t.wNAF=function(e,t){const r=(e,t)=>{const r=t.negate();return e?r:t},n=e=>({windows:Math.ceil(t/e)+1,windowSize:2**(e-1)});return{constTimeNegate:r,unsafeLadder(t,r){let n=e.ZERO,i=t;for(;r>o;)r&s&&(n=n.add(i)),i=i.double(),r>>=s;return n},precomputeWindow(e,t){const{windows:r,windowSize:i}=n(t),o=[];let s=e,a=s;for(let e=0;e<r;e++){a=s,o.push(a);for(let e=1;e<i;e++)a=a.add(s),o.push(a);s=a.double()}return o},wNAF(t,i,o){const{windows:a,windowSize:c}=n(t);let u=e.ZERO,d=e.BASE;const l=BigInt(2**t-1),h=2**t,f=BigInt(t);for(let e=0;e<a;e++){const t=e*c;let n=Number(o&l);o>>=f,n>c&&(n-=h,o+=s);const a=t,p=t+Math.abs(n)-1,m=e%2!=0,g=n<0;0===n?d=d.add(r(m,i[a])):u=u.add(r(g,i[p]))}return{p:u,f:d}},wNAFCached(e,t,r,n){const i=e._WINDOW_SIZE||1;let o=t.get(e);return o||(o=this.precomputeWindow(e,i),1!==i&&t.set(e,n(o))),this.wNAF(i,o,r)}}},t.validateBasic=function(e){return(0,n.validateField)(e.Fp),(0,i.validateObject)(e,{n:"bigint",h:"bigint",Gx:"field",Gy:"field"},{nBitLength:"isSafeInteger",nByteLength:"isSafeInteger"}),Object.freeze({...(0,n.nLength)(e.n,e.nBitLength),...e,p:e.Fp.ORDER})}},1322:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.createHasher=t.isogenyMap=t.hash_to_field=t.expand_message_xof=t.expand_message_xmd=void 0;const n=r(9530),i=r(4323),o=i.bytesToNumberBE;function s(e,t){if(e<0||e>=1<<8*t)throw new Error(`bad I2OSP call: value=${e} length=${t}`);const r=Array.from({length:t}).fill(0);for(let n=t-1;n>=0;n--)r[n]=255&e,e>>>=8;return new Uint8Array(r)}function a(e,t){const r=new Uint8Array(e.length);for(let n=0;n<e.length;n++)r[n]=e[n]^t[n];return r}function c(e){if(!(e instanceof Uint8Array))throw new Error("Uint8Array expected")}function u(e){if(!Number.isSafeInteger(e))throw new Error("number expected")}function d(e,t,r,n){c(e),c(t),u(r),t.length>255&&(t=n((0,i.concatBytes)((0,i.utf8ToBytes)("H2C-OVERSIZE-DST-"),t)));const{outputLen:o,blockLen:d}=n,l=Math.ceil(r/o);if(l>255)throw new Error("Invalid xmd length");const h=(0,i.concatBytes)(t,s(t.length,1)),f=s(0,d),p=s(r,2),m=new Array(l),g=n((0,i.concatBytes)(f,e,p,s(0,1),h));m[0]=n((0,i.concatBytes)(g,s(1,1),h));for(let e=1;e<=l;e++){const t=[a(g,m[e-1]),s(e+1,1),h];m[e]=n((0,i.concatBytes)(...t))}return(0,i.concatBytes)(...m).slice(0,r)}function l(e,t,r,n,o){if(c(e),c(t),u(r),t.length>255){const e=Math.ceil(2*n/8);t=o.create({dkLen:e}).update((0,i.utf8ToBytes)("H2C-OVERSIZE-DST-")).update(t).digest()}if(r>65535||t.length>255)throw new Error("expand_message_xof: invalid lenInBytes");return o.create({dkLen:r}).update(e).update(s(r,2)).update(t).update(s(t.length,1)).digest()}function h(e,t,r){(0,i.validateObject)(r,{DST:"string",p:"bigint",m:"isSafeInteger",k:"isSafeInteger",hash:"hash"});const{p:s,k:a,m:h,hash:f,expand:p,DST:m}=r;c(e),u(t);const g=function(e){if(e instanceof Uint8Array)return e;if("string"==typeof e)return(0,i.utf8ToBytes)(e);throw new Error("DST must be Uint8Array or string")}(m),y=s.toString(2).length,v=Math.ceil((y+a)/8),b=t*h*v;let E;if("xmd"===p)E=d(e,g,b,f);else if("xof"===p)E=l(e,g,b,a,f);else{if("_internal_pass"!==p)throw new Error('expand must be "xmd" or "xof"');E=e}const _=new Array(t);for(let e=0;e<t;e++){const t=new Array(h);for(let r=0;r<h;r++){const i=v*(r+e*h),a=E.subarray(i,i+v);t[r]=(0,n.mod)(o(a),s)}_[e]=t}return _}t.expand_message_xmd=d,t.expand_message_xof=l,t.hash_to_field=h,t.isogenyMap=function(e,t){const r=t.map((e=>Array.from(e).reverse()));return(t,n)=>{const[i,o,s,a]=r.map((r=>r.reduce(((r,n)=>e.add(e.mul(r,t),n)))));return t=e.div(i,o),n=e.mul(n,e.div(s,a)),{x:t,y:n}}},t.createHasher=function(e,t,r){if("function"!=typeof t)throw new Error("mapToCurve() must be defined");return{hashToCurve(n,i){const o=h(n,2,{...r,DST:r.DST,...i}),s=e.fromAffine(t(o[0])),a=e.fromAffine(t(o[1])),c=s.add(a).clearCofactor();return c.assertValidity(),c},encodeToCurve(n,i){const o=h(n,1,{...r,DST:r.encodeDST,...i}),s=e.fromAffine(t(o[0])).clearCofactor();return s.assertValidity(),s}}}},9530:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.hashToPrivateScalar=t.FpSqrtEven=t.FpSqrtOdd=t.Field=t.nLength=t.FpIsSquare=t.FpDiv=t.FpInvertBatch=t.FpPow=t.validateField=t.isNegativeLE=t.FpSqrt=t.tonelliShanks=t.invert=t.pow2=t.pow=t.mod=void 0;const n=r(4323),i=BigInt(0),o=BigInt(1),s=BigInt(2),a=BigInt(3),c=BigInt(4),u=BigInt(5),d=BigInt(8);function l(e,t){const r=e%t;return r>=i?r:t+r}function h(e,t,r){if(r<=i||t<i)throw new Error("Expected power/modulo > 0");if(r===o)return i;let n=o;for(;t>i;)t&o&&(n=n*e%r),e=e*e%r,t>>=o;return n}function f(e,t){if(e===i||t<=i)throw new Error(`invert: expected positive integers, got n=${e} mod=${t}`);let r=l(e,t),n=t,s=i,a=o,c=o,u=i;for(;r!==i;){const e=n/r,t=n%r,i=s-c*e,o=a-u*e;n=r,r=t,s=c,a=u,c=i,u=o}if(n!==o)throw new Error("invert: does not exist");return l(s,t)}function p(e){const t=(e-o)/s;let r,n,a;for(r=e-o,n=0;r%s===i;r/=s,n++);for(a=s;a<e&&h(a,t,e)!==e-o;a++);if(1===n){const t=(e+o)/c;return function(e,r){const n=e.pow(r,t);if(!e.eql(e.sqr(n),r))throw new Error("Cannot find square root");return n}}const u=(r+o)/s;return function(e,i){if(e.pow(i,t)===e.neg(e.ONE))throw new Error("Cannot find square root");let s=n,c=e.pow(e.mul(e.ONE,a),r),d=e.pow(i,u),l=e.pow(i,r);for(;!e.eql(l,e.ONE);){if(e.eql(l,e.ZERO))return e.ZERO;let t=1;for(let r=e.sqr(l);t<s&&!e.eql(r,e.ONE);t++)r=e.sqr(r);const r=e.pow(c,o<<BigInt(s-t-1));c=e.sqr(r),d=e.mul(d,r),l=e.mul(l,c),s=t}return d}}function m(e){if(e%c===a){const t=(e+o)/c;return function(e,r){const n=e.pow(r,t);if(!e.eql(e.sqr(n),r))throw new Error("Cannot find square root");return n}}if(e%d===u){const t=(e-u)/d;return function(e,r){const n=e.mul(r,s),i=e.pow(n,t),o=e.mul(r,i),a=e.mul(e.mul(o,s),i),c=e.mul(o,e.sub(a,e.ONE));if(!e.eql(e.sqr(c),r))throw new Error("Cannot find square root");return c}}return p(e)}BigInt(9),BigInt(16),t.mod=l,t.pow=h,t.pow2=function(e,t,r){let n=e;for(;t-- >i;)n*=n,n%=r;return n},t.invert=f,t.tonelliShanks=p,t.FpSqrt=m,t.isNegativeLE=(e,t)=>(l(e,t)&o)===o;const g=["create","isValid","is0","neg","inv","sqrt","sqr","eql","add","sub","mul","pow","div","addN","subN","mulN","sqrN"];function y(e,t,r){if(r<i)throw new Error("Expected power > 0");if(r===i)return e.ONE;if(r===o)return t;let n=e.ONE,s=t;for(;r>i;)r&o&&(n=e.mul(n,s)),s=e.sqr(s),r>>=o;return n}function v(e,t){const r=new Array(t.length),n=t.reduce(((t,n,i)=>e.is0(n)?t:(r[i]=t,e.mul(t,n))),e.ONE),i=e.inv(n);return t.reduceRight(((t,n,i)=>e.is0(n)?t:(r[i]=e.mul(t,r[i]),e.mul(t,n))),i),r}function b(e,t){const r=void 0!==t?t:e.toString(2).length;return{nBitLength:r,nByteLength:Math.ceil(r/8)}}t.validateField=function(e){const t=g.reduce(((e,t)=>(e[t]="function",e)),{ORDER:"bigint",MASK:"bigint",BYTES:"isSafeInteger",BITS:"isSafeInteger"});return(0,n.validateObject)(e,t)},t.FpPow=y,t.FpInvertBatch=v,t.FpDiv=function(e,t,r){return e.mul(t,"bigint"==typeof r?f(r,e.ORDER):e.inv(r))},t.FpIsSquare=function(e){const t=(e.ORDER-o)/s;return r=>{const n=e.pow(r,t);return e.eql(n,e.ZERO)||e.eql(n,e.ONE)}},t.nLength=b,t.Field=function(e,t,r=!1,s={}){if(e<=i)throw new Error(`Expected Fp ORDER > 0, got ${e}`);const{nBitLength:a,nByteLength:c}=b(e,t);if(c>2048)throw new Error("Field lengths over 2048 bytes are not supported");const u=m(e),d=Object.freeze({ORDER:e,BITS:a,BYTES:c,MASK:(0,n.bitMask)(a),ZERO:i,ONE:o,create:t=>l(t,e),isValid:t=>{if("bigint"!=typeof t)throw new Error("Invalid field element: expected bigint, got "+typeof t);return i<=t&&t<e},is0:e=>e===i,isOdd:e=>(e&o)===o,neg:t=>l(-t,e),eql:(e,t)=>e===t,sqr:t=>l(t*t,e),add:(t,r)=>l(t+r,e),sub:(t,r)=>l(t-r,e),mul:(t,r)=>l(t*r,e),pow:(e,t)=>y(d,e,t),div:(t,r)=>l(t*f(r,e),e),sqrN:e=>e*e,addN:(e,t)=>e+t,subN:(e,t)=>e-t,mulN:(e,t)=>e*t,inv:t=>f(t,e),sqrt:s.sqrt||(e=>u(d,e)),invertBatch:e=>v(d,e),cmov:(e,t,r)=>r?t:e,toBytes:e=>r?(0,n.numberToBytesLE)(e,c):(0,n.numberToBytesBE)(e,c),fromBytes:e=>{if(e.length!==c)throw new Error(`Fp.fromBytes: expected ${c}, got ${e.length}`);return r?(0,n.bytesToNumberLE)(e):(0,n.bytesToNumberBE)(e)}});return Object.freeze(d)},t.FpSqrtOdd=function(e,t){if(!e.isOdd)throw new Error("Field doesn't have isOdd");const r=e.sqrt(t);return e.isOdd(r)?r:e.neg(r)},t.FpSqrtEven=function(e,t){if(!e.isOdd)throw new Error("Field doesn't have isOdd");const r=e.sqrt(t);return e.isOdd(r)?e.neg(r):r},t.hashToPrivateScalar=function(e,t,r=!1){const i=(e=(0,n.ensureBytes)("privateHash",e)).length,s=b(t).nByteLength+8;if(s<24||i<s||i>1024)throw new Error(`hashToPrivateScalar: expected ${s}-1024 bytes of input, got ${i}`);return l(r?(0,n.bytesToNumberLE)(e):(0,n.bytesToNumberBE)(e),t-o)+o}},4323:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.validateObject=t.createHmacDrbg=t.bitMask=t.bitSet=t.bitGet=t.bitLen=t.utf8ToBytes=t.equalBytes=t.concatBytes=t.ensureBytes=t.numberToVarBytesBE=t.numberToBytesLE=t.numberToBytesBE=t.bytesToNumberLE=t.bytesToNumberBE=t.hexToBytes=t.hexToNumber=t.numberToHexUnpadded=t.bytesToHex=void 0;const r=BigInt(0),n=BigInt(1),i=BigInt(2),o=e=>e instanceof Uint8Array,s=Array.from({length:256},((e,t)=>t.toString(16).padStart(2,"0")));function a(e){if(!o(e))throw new Error("Uint8Array expected");let t="";for(let r=0;r<e.length;r++)t+=s[e[r]];return t}function c(e){const t=e.toString(16);return 1&t.length?`0${t}`:t}function u(e){if("string"!=typeof e)throw new Error("hex string expected, got "+typeof e);return BigInt(""===e?"0":`0x${e}`)}function d(e){if("string"!=typeof e)throw new Error("hex string expected, got "+typeof e);if(e.length%2)throw new Error("hex string is invalid: unpadded "+e.length);const t=new Uint8Array(e.length/2);for(let r=0;r<t.length;r++){const n=2*r,i=e.slice(n,n+2),o=Number.parseInt(i,16);if(Number.isNaN(o)||o<0)throw new Error("invalid byte sequence");t[r]=o}return t}function l(...e){const t=new Uint8Array(e.reduce(((e,t)=>e+t.length),0));let r=0;return e.forEach((e=>{if(!o(e))throw new Error("Uint8Array expected");t.set(e,r),r+=e.length})),t}t.bytesToHex=a,t.numberToHexUnpadded=c,t.hexToNumber=u,t.hexToBytes=d,t.bytesToNumberBE=function(e){return u(a(e))},t.bytesToNumberLE=function(e){if(!o(e))throw new Error("Uint8Array expected");return u(a(Uint8Array.from(e).reverse()))},t.numberToBytesBE=(e,t)=>d(e.toString(16).padStart(2*t,"0")),t.numberToBytesLE=(e,r)=>(0,t.numberToBytesBE)(e,r).reverse(),t.numberToVarBytesBE=e=>d(c(e)),t.ensureBytes=function(e,t,r){let n;if("string"==typeof t)try{n=d(t)}catch(r){throw new Error(`${e} must be valid hex string, got "${t}". Cause: ${r}`)}else{if(!o(t))throw new Error(`${e} must be hex string or Uint8Array`);n=Uint8Array.from(t)}const i=n.length;if("number"==typeof r&&i!==r)throw new Error(`${e} expected ${r} bytes, got ${i}`);return n},t.concatBytes=l,t.equalBytes=function(e,t){if(e.length!==t.length)return!1;for(let r=0;r<e.length;r++)if(e[r]!==t[r])return!1;return!0},t.utf8ToBytes=function(e){if("string"!=typeof e)throw new Error("utf8ToBytes expected string, got "+typeof e);return(new TextEncoder).encode(e)},t.bitLen=function(e){let t;for(t=0;e>r;e>>=n,t+=1);return t},t.bitGet=(e,t)=>e>>BigInt(t)&n,t.bitSet=(e,t,i)=>e|(i?n:r)<<BigInt(t),t.bitMask=e=>(i<<BigInt(e-1))-n;const h=e=>new Uint8Array(e),f=e=>Uint8Array.from(e);t.createHmacDrbg=function(e,t,r){if("number"!=typeof e||e<2)throw new Error("hashLen must be a number");if("number"!=typeof t||t<2)throw new Error("qByteLen must be a number");if("function"!=typeof r)throw new Error("hmacFn must be a function");let n=h(e),i=h(e),o=0;const s=()=>{n.fill(1),i.fill(0),o=0},a=(...e)=>r(i,n,...e),c=(e=h())=>{i=a(f([0]),e),n=a(),0!==e.length&&(i=a(f([1]),e),n=a())},u=()=>{if(o++>=1e3)throw new Error("drbg: tried 1000 values");let e=0;const r=[];for(;e<t;){n=a();const t=n.slice();r.push(t),e+=n.length}return l(...r)};return(e,t)=>{let r;for(s(),c(e);!(r=t(u()));)c();return s(),r}};const p={bigint:e=>"bigint"==typeof e,function:e=>"function"==typeof e,boolean:e=>"boolean"==typeof e,string:e=>"string"==typeof e,isSafeInteger:e=>Number.isSafeInteger(e),array:e=>Array.isArray(e),field:(e,t)=>t.Fp.isValid(e),hash:e=>"function"==typeof e&&Number.isSafeInteger(e.outputLen)};t.validateObject=function(e,t,r={}){const n=(t,r,n)=>{const i=p[r];if("function"!=typeof i)throw new Error(`Invalid validator "${r}", expected function`);const o=e[t];if(!(n&&void 0===o||i(o,e)))throw new Error(`Invalid param ${String(t)}=${o} (${typeof o}), expected ${r}`)};for(const[e,r]of Object.entries(t))n(e,r,!1);for(const[e,t]of Object.entries(r))n(e,t,!0);return e}},7851:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.mapToCurveSimpleSWU=t.SWUFpSqrtRatio=t.weierstrass=t.weierstrassPoints=t.DER=void 0;const n=r(9530),i=r(4323),o=r(4323),s=r(1465),{bytesToNumberBE:a,hexToBytes:c}=i;t.DER={Err:class extends Error{constructor(e=""){super(e)}},_parseInt(e){const{Err:r}=t.DER;if(e.length<2||2!==e[0])throw new r("Invalid signature integer tag");const n=e[1],i=e.subarray(2,n+2);if(!n||i.length!==n)throw new r("Invalid signature integer: wrong length");if(128&i[0])throw new r("Invalid signature integer: negative");if(0===i[0]&&!(128&i[1]))throw new r("Invalid signature integer: unnecessary leading zero");return{d:a(i),l:e.subarray(n+2)}},toSig(e){const{Err:r}=t.DER,n="string"==typeof e?c(e):e;if(!(n instanceof Uint8Array))throw new Error("ui8a expected");let i=n.length;if(i<2||48!=n[0])throw new r("Invalid signature tag");if(n[1]!==i-2)throw new r("Invalid signature: incorrect length");const{d:o,l:s}=t.DER._parseInt(n.subarray(2)),{d:a,l:u}=t.DER._parseInt(s);if(u.length)throw new r("Invalid signature: left bytes after parsing");return{r:o,s:a}},hexFromSig(e){const t=e=>8&Number.parseInt(e[0],16)?"00"+e:e,r=e=>{const t=e.toString(16);return 1&t.length?`0${t}`:t},n=t(r(e.s)),i=t(r(e.r)),o=n.length/2,s=i.length/2,a=r(o),c=r(s);return`30${r(s+o+4)}02${c}${i}02${a}${n}`}};const u=BigInt(0),d=BigInt(1),l=BigInt(2),h=BigInt(3),f=BigInt(4);function p(e){const t=function(e){const t=(0,s.validateBasic)(e);i.validateObject(t,{a:"field",b:"field"},{allowedPrivateKeyLengths:"array",wrapPrivateKey:"boolean",isTorsionFree:"function",clearCofactor:"function",allowInfinityPoint:"boolean",fromBytes:"function",toBytes:"function"});const{endo:r,Fp:n,a:o}=t;if(r){if(!n.eql(o,n.ZERO))throw new Error("Endomorphism can only be defined for Koblitz curves that have a=0");if("object"!=typeof r||"bigint"!=typeof r.beta||"function"!=typeof r.splitScalar)throw new Error("Expected endomorphism with beta: bigint and splitScalar: function")}return Object.freeze({...t})}(e),{Fp:r}=t,a=t.toBytes||((e,t,n)=>{const o=t.toAffine();return i.concatBytes(Uint8Array.from([4]),r.toBytes(o.x),r.toBytes(o.y))}),c=t.fromBytes||(e=>{const t=e.subarray(1);return{x:r.fromBytes(t.subarray(0,r.BYTES)),y:r.fromBytes(t.subarray(r.BYTES,2*r.BYTES))}});function l(e){const{a:n,b:i}=t,o=r.sqr(e),s=r.mul(o,e);return r.add(r.add(s,r.mul(e,n)),i)}if(!r.eql(r.sqr(t.Gy),l(t.Gx)))throw new Error("bad generator point: equation left != right");function f(e){return"bigint"==typeof e&&u<e&&e<t.n}function p(e){if(!f(e))throw new Error("Expected valid bigint: 0 < bigint < curve.n")}function m(e){const{allowedPrivateKeyLengths:r,nByteLength:s,wrapPrivateKey:a,n:c}=t;if(r&&"bigint"!=typeof e){if(e instanceof Uint8Array&&(e=i.bytesToHex(e)),"string"!=typeof e||!r.includes(e.length))throw new Error("Invalid key");e=e.padStart(2*s,"0")}let u;try{u="bigint"==typeof e?e:i.bytesToNumberBE((0,o.ensureBytes)("private key",e,s))}catch(t){throw new Error(`private key must be ${s} bytes, hex or bigint, not ${typeof e}`)}return a&&(u=n.mod(u,c)),p(u),u}const g=new Map;function y(e){if(!(e instanceof v))throw new Error("ProjectivePoint expected")}class v{constructor(e,t,n){if(this.px=e,this.py=t,this.pz=n,null==e||!r.isValid(e))throw new Error("x required");if(null==t||!r.isValid(t))throw new Error("y required");if(null==n||!r.isValid(n))throw new Error("z required")}static fromAffine(e){const{x:t,y:n}=e||{};if(!e||!r.isValid(t)||!r.isValid(n))throw new Error("invalid affine point");if(e instanceof v)throw new Error("projective point not allowed");const i=e=>r.eql(e,r.ZERO);return i(t)&&i(n)?v.ZERO:new v(t,n,r.ONE)}get x(){return this.toAffine().x}get y(){return this.toAffine().y}static normalizeZ(e){const t=r.invertBatch(e.map((e=>e.pz)));return e.map(((e,r)=>e.toAffine(t[r]))).map(v.fromAffine)}static fromHex(e){const t=v.fromAffine(c((0,o.ensureBytes)("pointHex",e)));return t.assertValidity(),t}static fromPrivateKey(e){return v.BASE.multiply(m(e))}_setWindowSize(e){this._WINDOW_SIZE=e,g.delete(this)}assertValidity(){if(this.is0()){if(t.allowInfinityPoint)return;throw new Error("bad point: ZERO")}const{x:e,y:n}=this.toAffine();if(!r.isValid(e)||!r.isValid(n))throw new Error("bad point: x or y not FE");const i=r.sqr(n),o=l(e);if(!r.eql(i,o))throw new Error("bad point: equation left != right");if(!this.isTorsionFree())throw new Error("bad point: not in prime-order subgroup")}hasEvenY(){const{y:e}=this.toAffine();if(r.isOdd)return!r.isOdd(e);throw new Error("Field doesn't support isOdd")}equals(e){y(e);const{px:t,py:n,pz:i}=this,{px:o,py:s,pz:a}=e,c=r.eql(r.mul(t,a),r.mul(o,i)),u=r.eql(r.mul(n,a),r.mul(s,i));return c&&u}negate(){return new v(this.px,r.neg(this.py),this.pz)}double(){const{a:e,b:n}=t,i=r.mul(n,h),{px:o,py:s,pz:a}=this;let c=r.ZERO,u=r.ZERO,d=r.ZERO,l=r.mul(o,o),f=r.mul(s,s),p=r.mul(a,a),m=r.mul(o,s);return m=r.add(m,m),d=r.mul(o,a),d=r.add(d,d),c=r.mul(e,d),u=r.mul(i,p),u=r.add(c,u),c=r.sub(f,u),u=r.add(f,u),u=r.mul(c,u),c=r.mul(m,c),d=r.mul(i,d),p=r.mul(e,p),m=r.sub(l,p),m=r.mul(e,m),m=r.add(m,d),d=r.add(l,l),l=r.add(d,l),l=r.add(l,p),l=r.mul(l,m),u=r.add(u,l),p=r.mul(s,a),p=r.add(p,p),l=r.mul(p,m),c=r.sub(c,l),d=r.mul(p,f),d=r.add(d,d),d=r.add(d,d),new v(c,u,d)}add(e){y(e);const{px:n,py:i,pz:o}=this,{px:s,py:a,pz:c}=e;let u=r.ZERO,d=r.ZERO,l=r.ZERO;const f=t.a,p=r.mul(t.b,h);let m=r.mul(n,s),g=r.mul(i,a),b=r.mul(o,c),E=r.add(n,i),_=r.add(s,a);E=r.mul(E,_),_=r.add(m,g),E=r.sub(E,_),_=r.add(n,o);let A=r.add(s,c);return _=r.mul(_,A),A=r.add(m,b),_=r.sub(_,A),A=r.add(i,o),u=r.add(a,c),A=r.mul(A,u),u=r.add(g,b),A=r.sub(A,u),l=r.mul(f,_),u=r.mul(p,b),l=r.add(u,l),u=r.sub(g,l),l=r.add(g,l),d=r.mul(u,l),g=r.add(m,m),g=r.add(g,m),b=r.mul(f,b),_=r.mul(p,_),g=r.add(g,b),b=r.sub(m,b),b=r.mul(f,b),_=r.add(_,b),m=r.mul(g,_),d=r.add(d,m),m=r.mul(A,_),u=r.mul(E,u),u=r.sub(u,m),m=r.mul(E,g),l=r.mul(A,l),l=r.add(l,m),new v(u,d,l)}subtract(e){return this.add(e.negate())}is0(){return this.equals(v.ZERO)}wNAF(e){return E.wNAFCached(this,g,e,(e=>{const t=r.invertBatch(e.map((e=>e.pz)));return e.map(((e,r)=>e.toAffine(t[r]))).map(v.fromAffine)}))}multiplyUnsafe(e){const n=v.ZERO;if(e===u)return n;if(p(e),e===d)return this;const{endo:i}=t;if(!i)return E.unsafeLadder(this,e);let{k1neg:o,k1:s,k2neg:a,k2:c}=i.splitScalar(e),l=n,h=n,f=this;for(;s>u||c>u;)s&d&&(l=l.add(f)),c&d&&(h=h.add(f)),f=f.double(),s>>=d,c>>=d;return o&&(l=l.negate()),a&&(h=h.negate()),h=new v(r.mul(h.px,i.beta),h.py,h.pz),l.add(h)}multiply(e){p(e);let n,i,o=e;const{endo:s}=t;if(s){const{k1neg:e,k1:t,k2neg:a,k2:c}=s.splitScalar(o);let{p:u,f:d}=this.wNAF(t),{p:l,f:h}=this.wNAF(c);u=E.constTimeNegate(e,u),l=E.constTimeNegate(a,l),l=new v(r.mul(l.px,s.beta),l.py,l.pz),n=u.add(l),i=d.add(h)}else{const{p:e,f:t}=this.wNAF(o);n=e,i=t}return v.normalizeZ([n,i])[0]}multiplyAndAddUnsafe(e,t,r){const n=v.BASE,i=(e,t)=>t!==u&&t!==d&&e.equals(n)?e.multiply(t):e.multiplyUnsafe(t),o=i(this,t).add(i(e,r));return o.is0()?void 0:o}toAffine(e){const{px:t,py:n,pz:i}=this,o=this.is0();null==e&&(e=o?r.ONE:r.inv(i));const s=r.mul(t,e),a=r.mul(n,e),c=r.mul(i,e);if(o)return{x:r.ZERO,y:r.ZERO};if(!r.eql(c,r.ONE))throw new Error("invZ was invalid");return{x:s,y:a}}isTorsionFree(){const{h:e,isTorsionFree:r}=t;if(e===d)return!0;if(r)return r(v,this);throw new Error("isTorsionFree() has not been declared for the elliptic curve")}clearCofactor(){const{h:e,clearCofactor:r}=t;return e===d?this:r?r(v,this):this.multiplyUnsafe(t.h)}toRawBytes(e=!0){return this.assertValidity(),a(v,this,e)}toHex(e=!0){return i.bytesToHex(this.toRawBytes(e))}}v.BASE=new v(t.Gx,t.Gy,r.ONE),v.ZERO=new v(r.ZERO,r.ONE,r.ZERO);const b=t.nBitLength,E=(0,s.wNAF)(v,t.endo?Math.ceil(b/2):b);return{CURVE:t,ProjectivePoint:v,normPrivateKeyToScalar:m,weierstrassEquation:l,isWithinCurveOrder:f}}function m(e,t){const r=e.ORDER;let n=u;for(let e=r-d;e%l===u;e/=l)n+=d;const i=n,o=(r-d)/l**i,s=(o-d)/l,a=l**i-d,c=l**(i-d),p=e.pow(t,o),m=e.pow(t,(o+d)/l);let g=(t,r)=>{let n=p,o=e.pow(r,a),u=e.sqr(o);u=e.mul(u,r);let h=e.mul(t,u);h=e.pow(h,s),h=e.mul(h,o),o=e.mul(h,r),u=e.mul(h,t);let f=e.mul(u,o);h=e.pow(f,c);let g=e.eql(h,e.ONE);o=e.mul(u,m),h=e.mul(f,n),u=e.cmov(o,u,g),f=e.cmov(h,f,g);for(let t=i;t>d;t--){let r=l**(t-l),i=e.pow(f,r);const s=e.eql(i,e.ONE);o=e.mul(u,n),n=e.mul(n,n),i=e.mul(f,n),u=e.cmov(o,u,s),f=e.cmov(i,f,s)}return{isValid:g,value:u}};if(e.ORDER%f===h){const r=(e.ORDER-h)/f,n=e.sqrt(e.neg(t));g=(t,i)=>{let o=e.sqr(i);const s=e.mul(t,i);o=e.mul(o,s);let a=e.pow(o,r);a=e.mul(a,s);const c=e.mul(a,n),u=e.mul(e.sqr(a),i),d=e.eql(u,t);return{isValid:d,value:e.cmov(c,a,d)}}}return g}t.weierstrassPoints=p,t.weierstrass=function(e){const r=function(e){const t=(0,s.validateBasic)(e);return i.validateObject(t,{hash:"hash",hmac:"function",randomBytes:"function"},{bits2int:"function",bits2int_modN:"function",lowS:"boolean"}),Object.freeze({lowS:!0,...t})}(e),{Fp:a,n:c}=r,l=a.BYTES+1,h=2*a.BYTES+1;function f(e){return n.mod(e,c)}function m(e){return n.invert(e,c)}const{ProjectivePoint:g,normPrivateKeyToScalar:y,weierstrassEquation:v,isWithinCurveOrder:b}=p({...r,toBytes(e,t,r){const n=t.toAffine(),o=a.toBytes(n.x),s=i.concatBytes;return r?s(Uint8Array.from([t.hasEvenY()?2:3]),o):s(Uint8Array.from([4]),o,a.toBytes(n.y))},fromBytes(e){const t=e.length,r=e[0],n=e.subarray(1);if(t!==l||2!==r&&3!==r){if(t===h&&4===r)return{x:a.fromBytes(n.subarray(0,a.BYTES)),y:a.fromBytes(n.subarray(a.BYTES,2*a.BYTES))};throw new Error(`Point of length ${t} was invalid. Expected ${l} compressed bytes or ${h} uncompressed bytes`)}{const e=i.bytesToNumberBE(n);if(!(u<(o=e)&&o<a.ORDER))throw new Error("Point is not on curve");const t=v(e);let s=a.sqrt(t);return 1==(1&r)!=((s&d)===d)&&(s=a.neg(s)),{x:e,y:s}}var o}}),E=e=>i.bytesToHex(i.numberToBytesBE(e,r.nByteLength));function _(e){return e>c>>d}const A=(e,t,r)=>i.bytesToNumberBE(e.slice(t,r));class T{constructor(e,t,r){this.r=e,this.s=t,this.recovery=r,this.assertValidity()}static fromCompact(e){const t=r.nByteLength;return e=(0,o.ensureBytes)("compactSignature",e,2*t),new T(A(e,0,t),A(e,t,2*t))}static fromDER(e){const{r,s:n}=t.DER.toSig((0,o.ensureBytes)("DER",e));return new T(r,n)}assertValidity(){if(!b(this.r))throw new Error("r must be 0 < r < CURVE.n");if(!b(this.s))throw new Error("s must be 0 < s < CURVE.n")}addRecoveryBit(e){return new T(this.r,this.s,e)}recoverPublicKey(e){const{r:t,s:n,recovery:i}=this,s=P((0,o.ensureBytes)("msgHash",e));if(null==i||![0,1,2,3].includes(i))throw new Error("recovery id invalid");const c=2===i||3===i?t+r.n:t;if(c>=a.ORDER)throw new Error("recovery id 2 or 3 invalid");const u=0==(1&i)?"02":"03",d=g.fromHex(u+E(c)),l=m(c),h=f(-s*l),p=f(n*l),y=g.BASE.multiplyAndAddUnsafe(d,h,p);if(!y)throw new Error("point at infinify");return y.assertValidity(),y}hasHighS(){return _(this.s)}normalizeS(){return this.hasHighS()?new T(this.r,f(-this.s),this.recovery):this}toDERRawBytes(){return i.hexToBytes(this.toDERHex())}toDERHex(){return t.DER.hexFromSig({r:this.r,s:this.s})}toCompactRawBytes(){return i.hexToBytes(this.toCompactHex())}toCompactHex(){return E(this.r)+E(this.s)}}const I={isValidPrivateKey(e){try{return y(e),!0}catch(e){return!1}},normPrivateKeyToScalar:y,randomPrivateKey:()=>{const e=r.randomBytes(a.BYTES+8),t=n.hashToPrivateScalar(e,c);return i.numberToBytesBE(t,r.nByteLength)},precompute:(e=8,t=g.BASE)=>(t._setWindowSize(e),t.multiply(BigInt(3)),t)};function R(e){const t=e instanceof Uint8Array,r="string"==typeof e,n=(t||r)&&e.length;return t?n===l||n===h:r?n===2*l||n===2*h:e instanceof g}const w=r.bits2int||function(e){const t=i.bytesToNumberBE(e),n=8*e.length-r.nBitLength;return n>0?t>>BigInt(n):t},P=r.bits2int_modN||function(e){return f(w(e))},x=i.bitMask(r.nBitLength);function S(e){if("bigint"!=typeof e)throw new Error("bigint expected");if(!(u<=e&&e<x))throw new Error(`bigint expected < 2^${r.nBitLength}`);return i.numberToBytesBE(e,r.nByteLength)}const O={lowS:r.lowS,prehash:!1},C={lowS:r.lowS,prehash:!1};return g.BASE._setWindowSize(8),{CURVE:r,getPublicKey:function(e,t=!0){return g.fromPrivateKey(e).toRawBytes(t)},getSharedSecret:function(e,t,r=!0){if(R(e))throw new Error("first arg must be private key");if(!R(t))throw new Error("second arg must be public key");return g.fromHex(t).multiply(y(e)).toRawBytes(r)},sign:function(e,t,n=O){const{seed:s,k2sig:c}=function(e,t,n=O){if(["recovered","canonical"].some((e=>e in n)))throw new Error("sign() legacy options not supported");const{hash:s,randomBytes:c}=r;let{lowS:l,prehash:h,extraEntropy:p}=n;null==l&&(l=!0),e=(0,o.ensureBytes)("msgHash",e),h&&(e=(0,o.ensureBytes)("prehashed msgHash",s(e)));const v=P(e),E=y(t),A=[S(E),S(v)];if(null!=p){const e=!0===p?c(a.BYTES):p;A.push((0,o.ensureBytes)("extraEntropy",e,a.BYTES))}const I=i.concatBytes(...A),R=v;return{seed:I,k2sig:function(e){const t=w(e);if(!b(t))return;const r=m(t),n=g.BASE.multiply(t).toAffine(),i=f(n.x);if(i===u)return;const o=f(r*f(R+i*E));if(o===u)return;let s=(n.x===i?0:2)|Number(n.y&d),a=o;return l&&_(o)&&(a=function(e){return _(e)?f(-e):e}(o),s^=1),new T(i,a,s)}}}(e,t,n);return i.createHmacDrbg(r.hash.outputLen,r.nByteLength,r.hmac)(s,c)},verify:function(e,n,i,s=C){const a=e;if(n=(0,o.ensureBytes)("msgHash",n),i=(0,o.ensureBytes)("publicKey",i),"strict"in s)throw new Error("options.strict was renamed to lowS");const{lowS:c,prehash:u}=s;let d,l;try{if("string"==typeof a||a instanceof Uint8Array)try{d=T.fromDER(a)}catch(e){if(!(e instanceof t.DER.Err))throw e;d=T.fromCompact(a)}else{if("object"!=typeof a||"bigint"!=typeof a.r||"bigint"!=typeof a.s)throw new Error("PARSE");{const{r:e,s:t}=a;d=new T(e,t)}}l=g.fromHex(i)}catch(e){if("PARSE"===e.message)throw new Error("signature must be Signature instance, Uint8Array or hex string");return!1}if(c&&d.hasHighS())return!1;u&&(n=r.hash(n));const{r:h,s:p}=d,y=P(n),v=m(p),b=f(y*v),E=f(h*v),_=g.BASE.multiplyAndAddUnsafe(l,b,E)?.toAffine();return!!_&&f(_.x)===h},ProjectivePoint:g,Signature:T,utils:I}},t.SWUFpSqrtRatio=m,t.mapToCurveSimpleSWU=function(e,t){if(n.validateField(e),!e.isValid(t.A)||!e.isValid(t.B)||!e.isValid(t.Z))throw new Error("mapToCurveSimpleSWU: invalid opts");const r=m(e,t.Z);if(!e.isOdd)throw new Error("Fp.isOdd is not implemented!");return n=>{let i,o,s,a,c,u,d,l;i=e.sqr(n),i=e.mul(i,t.Z),o=e.sqr(i),o=e.add(o,i),s=e.add(o,e.ONE),s=e.mul(s,t.B),a=e.cmov(t.Z,e.neg(o),!e.eql(o,e.ZERO)),a=e.mul(a,t.A),o=e.sqr(s),u=e.sqr(a),c=e.mul(u,t.A),o=e.add(o,c),o=e.mul(o,s),u=e.mul(u,a),c=e.mul(u,t.B),o=e.add(o,c),d=e.mul(i,s);const{isValid:h,value:f}=r(o,u);l=e.mul(i,n),l=e.mul(l,f),d=e.cmov(d,s,h),l=e.cmov(l,f,h);const p=e.isOdd(n)===e.isOdd(l);return l=e.cmov(e.neg(l),l,p),d=e.div(d,a),{x:d,y:l}}}},8358:(e,t,r)=>{"use strict";var n;Object.defineProperty(t,"__esModule",{value:!0}),t.encodeToCurve=t.hashToCurve=t.schnorr=t.secp256k1=void 0;const i=r(6053),o=r(64),s=r(9530),a=r(7851),c=r(4323),u=r(1322),d=r(5887),l=BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),h=BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),f=BigInt(1),p=BigInt(2),m=(e,t)=>(e+t/p)/t;function g(e){const t=l,r=BigInt(3),n=BigInt(6),i=BigInt(11),o=BigInt(22),a=BigInt(23),c=BigInt(44),u=BigInt(88),d=e*e*e%t,h=d*d*e%t,f=(0,s.pow2)(h,r,t)*h%t,m=(0,s.pow2)(f,r,t)*h%t,g=(0,s.pow2)(m,p,t)*d%t,v=(0,s.pow2)(g,i,t)*g%t,b=(0,s.pow2)(v,o,t)*v%t,E=(0,s.pow2)(b,c,t)*b%t,_=(0,s.pow2)(E,u,t)*E%t,A=(0,s.pow2)(_,c,t)*b%t,T=(0,s.pow2)(A,r,t)*h%t,I=(0,s.pow2)(T,a,t)*v%t,R=(0,s.pow2)(I,n,t)*d%t,w=(0,s.pow2)(R,p,t);if(!y.eql(y.sqr(w),e))throw new Error("Cannot find square root");return w}const y=(0,s.Field)(l,void 0,void 0,{sqrt:g});t.secp256k1=(0,d.createCurve)({a:BigInt(0),b:BigInt(7),Fp:y,n:h,Gx:BigInt("55066263022277343669578718895168534326250603453777594175500187360389116729240"),Gy:BigInt("32670510020758816978083085130507043184471273380659243275938904335757337482424"),h:BigInt(1),lowS:!0,endo:{beta:BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),splitScalar:e=>{const t=h,r=BigInt("0x3086d221a7d46bcde86c90e49284eb15"),n=-f*BigInt("0xe4437ed6010e88286f547fa90abfe4c3"),i=BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"),o=r,a=BigInt("0x100000000000000000000000000000000"),c=m(o*e,t),u=m(-n*e,t);let d=(0,s.mod)(e-c*r-u*i,t),l=(0,s.mod)(-c*n-u*o,t);const p=d>a,g=l>a;if(p&&(d=t-d),g&&(l=t-l),d>a||l>a)throw new Error("splitScalar: Endomorphism failed, k="+e);return{k1neg:p,k1:d,k2neg:g,k2:l}}}},i.sha256);const v=BigInt(0),b=e=>"bigint"==typeof e&&v<e&&e<l,E={};function _(e,...t){let r=E[e];if(void 0===r){const t=(0,i.sha256)(Uint8Array.from(e,(e=>e.charCodeAt(0))));r=(0,c.concatBytes)(t,t),E[e]=r}return(0,i.sha256)((0,c.concatBytes)(r,...t))}const A=e=>e.toRawBytes(!0).slice(1),T=e=>(0,c.numberToBytesBE)(e,32),I=e=>(0,s.mod)(e,l),R=e=>(0,s.mod)(e,h),w=t.secp256k1.ProjectivePoint;function P(e){let r=t.secp256k1.utils.normPrivateKeyToScalar(e),n=w.fromPrivateKey(r);return{scalar:n.hasEvenY()?r:R(-r),bytes:A(n)}}function x(e){if(!b(e))throw new Error("bad x: need 0 < x < p");const t=I(e*e);let r=g(I(t*e+BigInt(7)));r%p!==v&&(r=I(-r));const n=new w(e,r,f);return n.assertValidity(),n}function S(...e){return R((0,c.bytesToNumberBE)(_("BIP0340/challenge",...e)))}function O(e,t,r){const n=(0,c.ensureBytes)("signature",e,64),i=(0,c.ensureBytes)("message",t),o=(0,c.ensureBytes)("publicKey",r,32);try{const e=x((0,c.bytesToNumberBE)(o)),t=(0,c.bytesToNumberBE)(n.subarray(0,32));if(!b(t))return!1;const r=(0,c.bytesToNumberBE)(n.subarray(32,64));if(!("bigint"==typeof(d=r)&&v<d&&d<h))return!1;const l=S(T(t),A(e),i),f=(s=e,a=r,u=R(-l),w.BASE.multiplyAndAddUnsafe(s,a,u));return!(!f||!f.hasEvenY()||f.toAffine().x!==t)}catch(e){return!1}var s,a,u,d}t.schnorr={getPublicKey:function(e){return P(e).bytes},sign:function(e,t,r=(0,o.randomBytes)(32)){const n=(0,c.ensureBytes)("message",e),{bytes:i,scalar:s}=P(t),a=(0,c.ensureBytes)("auxRand",r,32),u=T(s^(0,c.bytesToNumberBE)(_("BIP0340/aux",a))),d=_("BIP0340/nonce",u,i,n),l=R((0,c.bytesToNumberBE)(d));if(l===v)throw new Error("sign failed: k is zero");const{bytes:h,scalar:f}=P(l),p=S(h,i,n),m=new Uint8Array(64);if(m.set(h,0),m.set(T(R(f+p*s)),32),!O(m,n,i))throw new Error("sign: Invalid signature produced");return m},verify:O,utils:{randomPrivateKey:t.secp256k1.utils.randomPrivateKey,lift_x:x,pointToBytes:A,numberToBytesBE:c.numberToBytesBE,bytesToNumberBE:c.bytesToNumberBE,taggedHash:_,mod:s.mod}};const C=u.isogenyMap(y,[["0x8e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38daaaaa8c7","0x7d3d4c80bc321d5b9f315cea7fd44c5d595d2fc0bf63b92dfff1044f17c6581","0x534c328d23f234e6e2a413deca25caece4506144037c40314ecbd0b53d9dd262","0x8e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38daaaaa88c"],["0xd35771193d94918a9ca34ccbb7b640dd86cd409542f8487d9fe6b745781eb49b","0xedadc6f64383dc1df7c4b2d51b54225406d36b641f5e41bbc52a56612a8c6d14","0x0000000000000000000000000000000000000000000000000000000000000001"],["0x4bda12f684bda12f684bda12f684bda12f684bda12f684bda12f684b8e38e23c","0xc75e0c32d5cb7c0fa9d0a54b12a0a6d5647ab046d686da6fdffc90fc201d71a3","0x29a6194691f91a73715209ef6512e576722830a201be2018a765e85a9ecee931","0x2f684bda12f684bda12f684bda12f684bda12f684bda12f684bda12f38e38d84"],["0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffff93b","0x7a06534bb8bdb49fd5e9e6632722c2989467c1bfc8e8d978dfb425d2685c2573","0x6484aa716545ca2cf3a70c3fa8fe337e0a3d21162f0d6299a7bf8192bfd2a76f","0x0000000000000000000000000000000000000000000000000000000000000001"]].map((e=>e.map((e=>BigInt(e)))))),B=(0,a.mapToCurveSimpleSWU)(y,{A:BigInt("0x3f8731abdd661adca08a5558f0f5d272e953d363cb6f0e5d405447c01a444533"),B:BigInt("1771"),Z:y.create(BigInt("-11"))});n=u.createHasher(t.secp256k1.ProjectivePoint,(e=>{const{x:t,y:r}=B(y.create(e[0]));return C(t,r)}),{DST:"secp256k1_XMD:SHA-256_SSWU_RO_",encodeDST:"secp256k1_XMD:SHA-256_SSWU_NU_",p:y.ORDER,m:1,k:128,expand:"xmd",hash:i.sha256}),t.hashToCurve=n.hashToCurve,t.encodeToCurve=n.encodeToCurve},3525:(e,t)=>{"use strict";function r(e){if(!Number.isSafeInteger(e)||e<0)throw new Error(`Wrong positive integer: ${e}`)}function n(e){if("boolean"!=typeof e)throw new Error(`Expected boolean, not ${e}`)}function i(e,...t){if(!(e instanceof Uint8Array))throw new TypeError("Expected Uint8Array");if(t.length>0&&!t.includes(e.length))throw new TypeError(`Expected Uint8Array of length ${t}, not of length=${e.length}`)}function o(e){if("function"!=typeof e||"function"!=typeof e.create)throw new Error("Hash should be wrapped by utils.wrapConstructor");r(e.outputLen),r(e.blockLen)}function s(e,t=!0){if(e.destroyed)throw new Error("Hash instance has been destroyed");if(t&&e.finished)throw new Error("Hash#digest() has already been called")}function a(e,t){i(e);const r=t.outputLen;if(e.length<r)throw new Error(`digestInto() expects output buffer of length at least ${r}`)}Object.defineProperty(t,"__esModule",{value:!0}),t.output=t.exists=t.hash=t.bytes=t.bool=t.number=void 0,t.number=r,t.bool=n,t.bytes=i,t.hash=o,t.exists=s,t.output=a;const c={number:r,bool:n,bytes:i,hash:o,exists:s,output:a};t.default=c},9350:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.SHA2=void 0;const n=r(3525),i=r(64);class o extends i.Hash{constructor(e,t,r,n){super(),this.blockLen=e,this.outputLen=t,this.padOffset=r,this.isLE=n,this.finished=!1,this.length=0,this.pos=0,this.destroyed=!1,this.buffer=new Uint8Array(e),this.view=(0,i.createView)(this.buffer)}update(e){n.default.exists(this);const{view:t,buffer:r,blockLen:o}=this,s=(e=(0,i.toBytes)(e)).length;for(let n=0;n<s;){const a=Math.min(o-this.pos,s-n);if(a!==o)r.set(e.subarray(n,n+a),this.pos),this.pos+=a,n+=a,this.pos===o&&(this.process(t,0),this.pos=0);else{const t=(0,i.createView)(e);for(;o<=s-n;n+=o)this.process(t,n)}}return this.length+=e.length,this.roundClean(),this}digestInto(e){n.default.exists(this),n.default.output(e,this),this.finished=!0;const{buffer:t,view:r,blockLen:o,isLE:s}=this;let{pos:a}=this;t[a++]=128,this.buffer.subarray(a).fill(0),this.padOffset>o-a&&(this.process(r,0),a=0);for(let e=a;e<o;e++)t[e]=0;!function(e,t,r,n){if("function"==typeof e.setBigUint64)return e.setBigUint64(t,r,n);const i=BigInt(32),o=BigInt(4294967295),s=Number(r>>i&o),a=Number(r&o),c=n?4:0,u=n?0:4;e.setUint32(t+c,s,n),e.setUint32(t+u,a,n)}(r,o-8,BigInt(8*this.length),s),this.process(r,0);const c=(0,i.createView)(e),u=this.outputLen;if(u%4)throw new Error("_sha2: outputLen should be aligned to 32bit");const d=u/4,l=this.get();if(d>l.length)throw new Error("_sha2: outputLen bigger than state");for(let e=0;e<d;e++)c.setUint32(4*e,l[e],s)}digest(){const{buffer:e,outputLen:t}=this;this.digestInto(e);const r=e.slice(0,t);return this.destroy(),r}_cloneInto(e){e||(e=new this.constructor),e.set(...this.get());const{blockLen:t,buffer:r,length:n,finished:i,destroyed:o,pos:s}=this;return e.length=n,e.pos=s,e.finished=i,e.destroyed=o,n%t&&e.buffer.set(r),e}}t.SHA2=o},1655:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.add=t.toBig=t.split=t.fromBig=void 0;const r=BigInt(2**32-1),n=BigInt(32);function i(e,t=!1){return t?{h:Number(e&r),l:Number(e>>n&r)}:{h:0|Number(e>>n&r),l:0|Number(e&r)}}function o(e,t=!1){let r=new Uint32Array(e.length),n=new Uint32Array(e.length);for(let o=0;o<e.length;o++){const{h:s,l:a}=i(e[o],t);[r[o],n[o]]=[s,a]}return[r,n]}function s(e,t,r,n){const i=(t>>>0)+(n>>>0);return{h:e+r+(i/2**32|0)|0,l:0|i}}t.fromBig=i,t.split=o,t.toBig=(e,t)=>BigInt(e>>>0)<<n|BigInt(t>>>0),t.add=s;const a={fromBig:i,split:o,toBig:t.toBig,shrSH:(e,t,r)=>e>>>r,shrSL:(e,t,r)=>e<<32-r|t>>>r,rotrSH:(e,t,r)=>e>>>r|t<<32-r,rotrSL:(e,t,r)=>e<<32-r|t>>>r,rotrBH:(e,t,r)=>e<<64-r|t>>>r-32,rotrBL:(e,t,r)=>e>>>r-32|t<<64-r,rotr32H:(e,t)=>t,rotr32L:(e,t)=>e,rotlSH:(e,t,r)=>e<<r|t>>>32-r,rotlSL:(e,t,r)=>t<<r|e>>>32-r,rotlBH:(e,t,r)=>t<<r-32|e>>>64-r,rotlBL:(e,t,r)=>e<<r-32|t>>>64-r,add:s,add3L:(e,t,r)=>(e>>>0)+(t>>>0)+(r>>>0),add3H:(e,t,r,n)=>t+r+n+(e/2**32|0)|0,add4L:(e,t,r,n)=>(e>>>0)+(t>>>0)+(r>>>0)+(n>>>0),add4H:(e,t,r,n,i)=>t+r+n+i+(e/2**32|0)|0,add5H:(e,t,r,n,i,o)=>t+r+n+i+o+(e/2**32|0)|0,add5L:(e,t,r,n,i)=>(e>>>0)+(t>>>0)+(r>>>0)+(n>>>0)+(i>>>0)};t.default=a},825:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.crypto=void 0,t.crypto="object"==typeof globalThis&&"crypto"in globalThis?globalThis.crypto:void 0},1377:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.hmac=void 0;const n=r(3525),i=r(64);class o extends i.Hash{constructor(e,t){super(),this.finished=!1,this.destroyed=!1,n.default.hash(e);const r=(0,i.toBytes)(t);if(this.iHash=e.create(),"function"!=typeof this.iHash.update)throw new TypeError("Expected instance of class which extends utils.Hash");this.blockLen=this.iHash.blockLen,this.outputLen=this.iHash.outputLen;const o=this.blockLen,s=new Uint8Array(o);s.set(r.length>o?e.create().update(r).digest():r);for(let e=0;e<s.length;e++)s[e]^=54;this.iHash.update(s),this.oHash=e.create();for(let e=0;e<s.length;e++)s[e]^=106;this.oHash.update(s),s.fill(0)}update(e){return n.default.exists(this),this.iHash.update(e),this}digestInto(e){n.default.exists(this),n.default.bytes(e,this.outputLen),this.finished=!0,this.iHash.digestInto(e),this.oHash.update(e),this.oHash.digestInto(e),this.destroy()}digest(){const e=new Uint8Array(this.oHash.outputLen);return this.digestInto(e),e}_cloneInto(e){e||(e=Object.create(Object.getPrototypeOf(this),{}));const{oHash:t,iHash:r,finished:n,destroyed:i,blockLen:o,outputLen:s}=this;return e.finished=n,e.destroyed=i,e.blockLen=o,e.outputLen=s,e.oHash=t._cloneInto(e.oHash),e.iHash=r._cloneInto(e.iHash),e}destroy(){this.destroyed=!0,this.oHash.destroy(),this.iHash.destroy()}}t.hmac=(e,t,r)=>new o(e,t).update(r).digest(),t.hmac.create=(e,t)=>new o(e,t)},9179:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.pbkdf2Async=t.pbkdf2=void 0;const n=r(3525),i=r(1377),o=r(64);function s(e,t,r,s){n.default.hash(e);const a=(0,o.checkOpts)({dkLen:32,asyncTick:10},s),{c,dkLen:u,asyncTick:d}=a;if(n.default.number(c),n.default.number(u),n.default.number(d),c<1)throw new Error("PBKDF2: iterations (c) should be >= 1");const l=(0,o.toBytes)(t),h=(0,o.toBytes)(r),f=new Uint8Array(u),p=i.hmac.create(e,l),m=p._cloneInto().update(h);return{c,dkLen:u,asyncTick:d,DK:f,PRF:p,PRFSalt:m}}function a(e,t,r,n,i){return e.destroy(),t.destroy(),n&&n.destroy(),i.fill(0),r}t.pbkdf2=function(e,t,r,n){const{c:i,dkLen:c,DK:u,PRF:d,PRFSalt:l}=s(e,t,r,n);let h;const f=new Uint8Array(4),p=(0,o.createView)(f),m=new Uint8Array(d.outputLen);for(let e=1,t=0;t<c;e++,t+=d.outputLen){const r=u.subarray(t,t+d.outputLen);p.setInt32(0,e,!1),(h=l._cloneInto(h)).update(f).digestInto(m),r.set(m.subarray(0,r.length));for(let e=1;e<i;e++){d._cloneInto(h).update(m).digestInto(m);for(let e=0;e<r.length;e++)r[e]^=m[e]}}return a(d,l,u,h,m)},t.pbkdf2Async=async function(e,t,r,n){const{c:i,dkLen:c,asyncTick:u,DK:d,PRF:l,PRFSalt:h}=s(e,t,r,n);let f;const p=new Uint8Array(4),m=(0,o.createView)(p),g=new Uint8Array(l.outputLen);for(let e=1,t=0;t<c;e++,t+=l.outputLen){const r=d.subarray(t,t+l.outputLen);m.setInt32(0,e,!1),(f=h._cloneInto(f)).update(p).digestInto(g),r.set(g.subarray(0,r.length)),await(0,o.asyncLoop)(i-1,u,(e=>{l._cloneInto(f).update(g).digestInto(g);for(let e=0;e<r.length;e++)r[e]^=g[e]}))}return a(l,h,d,f,g)}},2739:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.scryptAsync=t.scrypt=void 0;const n=r(3525),i=r(6053),o=r(9179),s=r(64),a=(e,t)=>e<<t|e>>>32-t;function c(e,t,r,n,i,o){let s=e[t++]^r[n++],c=e[t++]^r[n++],u=e[t++]^r[n++],d=e[t++]^r[n++],l=e[t++]^r[n++],h=e[t++]^r[n++],f=e[t++]^r[n++],p=e[t++]^r[n++],m=e[t++]^r[n++],g=e[t++]^r[n++],y=e[t++]^r[n++],v=e[t++]^r[n++],b=e[t++]^r[n++],E=e[t++]^r[n++],_=e[t++]^r[n++],A=e[t++]^r[n++],T=s,I=c,R=u,w=d,P=l,x=h,S=f,O=p,C=m,B=g,N=y,k=v,M=b,D=E,L=_,F=A;for(let e=0;e<8;e+=2)P^=a(T+M|0,7),C^=a(P+T|0,9),M^=a(C+P|0,13),T^=a(M+C|0,18),B^=a(x+I|0,7),D^=a(B+x|0,9),I^=a(D+B|0,13),x^=a(I+D|0,18),L^=a(N+S|0,7),R^=a(L+N|0,9),S^=a(R+L|0,13),N^=a(S+R|0,18),w^=a(F+k|0,7),O^=a(w+F|0,9),k^=a(O+w|0,13),F^=a(k+O|0,18),I^=a(T+w|0,7),R^=a(I+T|0,9),w^=a(R+I|0,13),T^=a(w+R|0,18),S^=a(x+P|0,7),O^=a(S+x|0,9),P^=a(O+S|0,13),x^=a(P+O|0,18),k^=a(N+B|0,7),C^=a(k+N|0,9),B^=a(C+k|0,13),N^=a(B+C|0,18),M^=a(F+L|0,7),D^=a(M+F|0,9),L^=a(D+M|0,13),F^=a(L+D|0,18);i[o++]=s+T|0,i[o++]=c+I|0,i[o++]=u+R|0,i[o++]=d+w|0,i[o++]=l+P|0,i[o++]=h+x|0,i[o++]=f+S|0,i[o++]=p+O|0,i[o++]=m+C|0,i[o++]=g+B|0,i[o++]=y+N|0,i[o++]=v+k|0,i[o++]=b+M|0,i[o++]=E+D|0,i[o++]=_+L|0,i[o++]=A+F|0}function u(e,t,r,n,i){let o=n+0,s=n+16*i;for(let n=0;n<16;n++)r[s+n]=e[t+16*(2*i-1)+n];for(let n=0;n<i;n++,o+=16,t+=16)c(r,s,e,t,r,o),n>0&&(s+=16),c(r,o,e,t+=16,r,s)}function d(e,t,r){const a=(0,s.checkOpts)({dkLen:32,asyncTick:10,maxmem:1073742848},r),{N:c,r:u,p:d,dkLen:l,asyncTick:h,maxmem:f,onProgress:p}=a;if(n.default.number(c),n.default.number(u),n.default.number(d),n.default.number(l),n.default.number(h),n.default.number(f),void 0!==p&&"function"!=typeof p)throw new Error("progressCb should be function");const m=128*u,g=m/4;if(c<=1||0!=(c&c-1)||c>=2**(m/8)||c>2**32)throw new Error("Scrypt: N must be larger than 1, a power of 2, less than 2^(128 * r / 8) and less than 2^32");if(d<0||d>137438953440/m)throw new Error("Scrypt: p must be a positive integer less than or equal to ((2^32 - 1) * 32) / (128 * r)");if(l<0||l>137438953440)throw new Error("Scrypt: dkLen should be positive integer less than or equal to (2^32 - 1) * 32");const y=m*(c+d);if(y>f)throw new Error(`Scrypt: parameters too large, ${y} (128 * r * (N + p)) > ${f} (maxmem)`);const v=(0,o.pbkdf2)(i.sha256,e,t,{c:1,dkLen:m*d}),b=(0,s.u32)(v),E=(0,s.u32)(new Uint8Array(m*c)),_=(0,s.u32)(new Uint8Array(m));let A=()=>{};if(p){const e=2*c*d,t=Math.max(Math.floor(e/1e4),1);let r=0;A=()=>{r++,!p||r%t&&r!==e||p(r/e)}}return{N:c,r:u,p:d,dkLen:l,blockSize32:g,V:E,B32:b,B:v,tmp:_,blockMixCb:A,asyncTick:h}}function l(e,t,r,n,s){const a=(0,o.pbkdf2)(i.sha256,e,r,{c:1,dkLen:t});return r.fill(0),n.fill(0),s.fill(0),a}t.scrypt=function(e,t,r){const{N:n,r:i,p:o,dkLen:s,blockSize32:a,V:c,B32:h,B:f,tmp:p,blockMixCb:m}=d(e,t,r);for(let e=0;e<o;e++){const t=a*e;for(let e=0;e<a;e++)c[e]=h[t+e];for(let e=0,t=0;e<n-1;e++)u(c,t,c,t+=a,i),m();u(c,(n-1)*a,h,t,i),m();for(let e=0;e<n;e++){const e=h[t+a-16]%n;for(let r=0;r<a;r++)p[r]=h[t+r]^c[e*a+r];u(p,0,h,t,i),m()}}return l(e,s,f,c,p)},t.scryptAsync=async function(e,t,r){const{N:n,r:i,p:o,dkLen:a,blockSize32:c,V:h,B32:f,B:p,tmp:m,blockMixCb:g,asyncTick:y}=d(e,t,r);for(let e=0;e<o;e++){const t=c*e;for(let e=0;e<c;e++)h[e]=f[t+e];let r=0;await(0,s.asyncLoop)(n-1,y,(e=>{u(h,r,h,r+=c,i),g()})),u(h,(n-1)*c,f,t,i),g(),await(0,s.asyncLoop)(n,y,(e=>{const r=f[t+c-16]%n;for(let e=0;e<c;e++)m[e]=f[t+e]^h[r*c+e];u(m,0,f,t,i),g()}))}return l(e,a,p,h,m)}},6053:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.sha224=t.sha256=void 0;const n=r(9350),i=r(64),o=(e,t,r)=>e&t^e&r^t&r,s=new Uint32Array([1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298]),a=new Uint32Array([1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225]),c=new Uint32Array(64);class u extends n.SHA2{constructor(){super(64,32,8,!1),this.A=0|a[0],this.B=0|a[1],this.C=0|a[2],this.D=0|a[3],this.E=0|a[4],this.F=0|a[5],this.G=0|a[6],this.H=0|a[7]}get(){const{A:e,B:t,C:r,D:n,E:i,F:o,G:s,H:a}=this;return[e,t,r,n,i,o,s,a]}set(e,t,r,n,i,o,s,a){this.A=0|e,this.B=0|t,this.C=0|r,this.D=0|n,this.E=0|i,this.F=0|o,this.G=0|s,this.H=0|a}process(e,t){for(let r=0;r<16;r++,t+=4)c[r]=e.getUint32(t,!1);for(let e=16;e<64;e++){const t=c[e-15],r=c[e-2],n=(0,i.rotr)(t,7)^(0,i.rotr)(t,18)^t>>>3,o=(0,i.rotr)(r,17)^(0,i.rotr)(r,19)^r>>>10;c[e]=o+c[e-7]+n+c[e-16]|0}let{A:r,B:n,C:a,D:u,E:d,F:l,G:h,H:f}=this;for(let e=0;e<64;e++){const t=f+((0,i.rotr)(d,6)^(0,i.rotr)(d,11)^(0,i.rotr)(d,25))+((p=d)&l^~p&h)+s[e]+c[e]|0,m=((0,i.rotr)(r,2)^(0,i.rotr)(r,13)^(0,i.rotr)(r,22))+o(r,n,a)|0;f=h,h=l,l=d,d=u+t|0,u=a,a=n,n=r,r=t+m|0}var p;r=r+this.A|0,n=n+this.B|0,a=a+this.C|0,u=u+this.D|0,d=d+this.E|0,l=l+this.F|0,h=h+this.G|0,f=f+this.H|0,this.set(r,n,a,u,d,l,h,f)}roundClean(){c.fill(0)}destroy(){this.set(0,0,0,0,0,0,0,0),this.buffer.fill(0)}}class d extends u{constructor(){super(),this.A=-1056596264,this.B=914150663,this.C=812702999,this.D=-150054599,this.E=-4191439,this.F=1750603025,this.G=1694076839,this.H=-1090891868,this.outputLen=28}}t.sha256=(0,i.wrapConstructor)((()=>new u)),t.sha224=(0,i.wrapConstructor)((()=>new d))},125:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.shake256=t.shake128=t.keccak_512=t.keccak_384=t.keccak_256=t.keccak_224=t.sha3_512=t.sha3_384=t.sha3_256=t.sha3_224=t.Keccak=t.keccakP=void 0;const n=r(3525),i=r(1655),o=r(64),[s,a,c]=[[],[],[]],u=BigInt(0),d=BigInt(1),l=BigInt(2),h=BigInt(7),f=BigInt(256),p=BigInt(113);for(let e=0,t=d,r=1,n=0;e<24;e++){[r,n]=[n,(2*r+3*n)%5],s.push(2*(5*n+r)),a.push((e+1)*(e+2)/2%64);let i=u;for(let e=0;e<7;e++)t=(t<<d^(t>>h)*p)%f,t&l&&(i^=d<<(d<<BigInt(e))-d);c.push(i)}const[m,g]=i.default.split(c,!0),y=(e,t,r)=>r>32?i.default.rotlBH(e,t,r):i.default.rotlSH(e,t,r),v=(e,t,r)=>r>32?i.default.rotlBL(e,t,r):i.default.rotlSL(e,t,r);function b(e,t=24){const r=new Uint32Array(10);for(let n=24-t;n<24;n++){for(let t=0;t<10;t++)r[t]=e[t]^e[t+10]^e[t+20]^e[t+30]^e[t+40];for(let t=0;t<10;t+=2){const n=(t+8)%10,i=(t+2)%10,o=r[i],s=r[i+1],a=y(o,s,1)^r[n],c=v(o,s,1)^r[n+1];for(let r=0;r<50;r+=10)e[t+r]^=a,e[t+r+1]^=c}let t=e[2],i=e[3];for(let r=0;r<24;r++){const n=a[r],o=y(t,i,n),c=v(t,i,n),u=s[r];t=e[u],i=e[u+1],e[u]=o,e[u+1]=c}for(let t=0;t<50;t+=10){for(let n=0;n<10;n++)r[n]=e[t+n];for(let n=0;n<10;n++)e[t+n]^=~r[(n+2)%10]&r[(n+4)%10]}e[0]^=m[n],e[1]^=g[n]}r.fill(0)}t.keccakP=b;class E extends o.Hash{constructor(e,t,r,i=!1,s=24){if(super(),this.blockLen=e,this.suffix=t,this.outputLen=r,this.enableXOF=i,this.rounds=s,this.pos=0,this.posOut=0,this.finished=!1,this.destroyed=!1,n.default.number(r),0>=this.blockLen||this.blockLen>=200)throw new Error("Sha3 supports only keccak-f1600 function");this.state=new Uint8Array(200),this.state32=(0,o.u32)(this.state)}keccak(){b(this.state32,this.rounds),this.posOut=0,this.pos=0}update(e){n.default.exists(this);const{blockLen:t,state:r}=this,i=(e=(0,o.toBytes)(e)).length;for(let n=0;n<i;){const o=Math.min(t-this.pos,i-n);for(let t=0;t<o;t++)r[this.pos++]^=e[n++];this.pos===t&&this.keccak()}return this}finish(){if(this.finished)return;this.finished=!0;const{state:e,suffix:t,pos:r,blockLen:n}=this;e[r]^=t,0!=(128&t)&&r===n-1&&this.keccak(),e[n-1]^=128,this.keccak()}writeInto(e){n.default.exists(this,!1),n.default.bytes(e),this.finish();const t=this.state,{blockLen:r}=this;for(let n=0,i=e.length;n<i;){this.posOut>=r&&this.keccak();const o=Math.min(r-this.posOut,i-n);e.set(t.subarray(this.posOut,this.posOut+o),n),this.posOut+=o,n+=o}return e}xofInto(e){if(!this.enableXOF)throw new Error("XOF is not possible for this instance");return this.writeInto(e)}xof(e){return n.default.number(e),this.xofInto(new Uint8Array(e))}digestInto(e){if(n.default.output(e,this),this.finished)throw new Error("digest() was already called");return this.writeInto(e),this.destroy(),e}digest(){return this.digestInto(new Uint8Array(this.outputLen))}destroy(){this.destroyed=!0,this.state.fill(0)}_cloneInto(e){const{blockLen:t,suffix:r,outputLen:n,rounds:i,enableXOF:o}=this;return e||(e=new E(t,r,n,o,i)),e.state32.set(this.state32),e.pos=this.pos,e.posOut=this.posOut,e.finished=this.finished,e.rounds=i,e.suffix=r,e.outputLen=n,e.enableXOF=o,e.destroyed=this.destroyed,e}}t.Keccak=E;const _=(e,t,r)=>(0,o.wrapConstructor)((()=>new E(t,e,r)));t.sha3_224=_(6,144,28),t.sha3_256=_(6,136,32),t.sha3_384=_(6,104,48),t.sha3_512=_(6,72,64),t.keccak_224=_(1,144,28),t.keccak_256=_(1,136,32),t.keccak_384=_(1,104,48),t.keccak_512=_(1,72,64);const A=(e,t,r)=>(0,o.wrapConstructorWithOpts)(((n={})=>new E(t,e,void 0===n.dkLen?r:n.dkLen,!0)));t.shake128=A(31,168,16),t.shake256=A(31,136,32)},2540:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.sha384=t.sha512_256=t.sha512_224=t.sha512=t.SHA512=void 0;const n=r(9350),i=r(1655),o=r(64),[s,a]=i.default.split(["0x428a2f98d728ae22","0x7137449123ef65cd","0xb5c0fbcfec4d3b2f","0xe9b5dba58189dbbc","0x3956c25bf348b538","0x59f111f1b605d019","0x923f82a4af194f9b","0xab1c5ed5da6d8118","0xd807aa98a3030242","0x12835b0145706fbe","0x243185be4ee4b28c","0x550c7dc3d5ffb4e2","0x72be5d74f27b896f","0x80deb1fe3b1696b1","0x9bdc06a725c71235","0xc19bf174cf692694","0xe49b69c19ef14ad2","0xefbe4786384f25e3","0x0fc19dc68b8cd5b5","0x240ca1cc77ac9c65","0x2de92c6f592b0275","0x4a7484aa6ea6e483","0x5cb0a9dcbd41fbd4","0x76f988da831153b5","0x983e5152ee66dfab","0xa831c66d2db43210","0xb00327c898fb213f","0xbf597fc7beef0ee4","0xc6e00bf33da88fc2","0xd5a79147930aa725","0x06ca6351e003826f","0x142929670a0e6e70","0x27b70a8546d22ffc","0x2e1b21385c26c926","0x4d2c6dfc5ac42aed","0x53380d139d95b3df","0x650a73548baf63de","0x766a0abb3c77b2a8","0x81c2c92e47edaee6","0x92722c851482353b","0xa2bfe8a14cf10364","0xa81a664bbc423001","0xc24b8b70d0f89791","0xc76c51a30654be30","0xd192e819d6ef5218","0xd69906245565a910","0xf40e35855771202a","0x106aa07032bbd1b8","0x19a4c116b8d2d0c8","0x1e376c085141ab53","0x2748774cdf8eeb99","0x34b0bcb5e19b48a8","0x391c0cb3c5c95a63","0x4ed8aa4ae3418acb","0x5b9cca4f7763e373","0x682e6ff3d6b2b8a3","0x748f82ee5defb2fc","0x78a5636f43172f60","0x84c87814a1f0ab72","0x8cc702081a6439ec","0x90befffa23631e28","0xa4506cebde82bde9","0xbef9a3f7b2c67915","0xc67178f2e372532b","0xca273eceea26619c","0xd186b8c721c0c207","0xeada7dd6cde0eb1e","0xf57d4f7fee6ed178","0x06f067aa72176fba","0x0a637dc5a2c898a6","0x113f9804bef90dae","0x1b710b35131c471b","0x28db77f523047d84","0x32caab7b40c72493","0x3c9ebe0a15c9bebc","0x431d67c49c100d4c","0x4cc5d4becb3e42b6","0x597f299cfc657e2a","0x5fcb6fab3ad6faec","0x6c44198c4a475817"].map((e=>BigInt(e)))),c=new Uint32Array(80),u=new Uint32Array(80);class d extends n.SHA2{constructor(){super(128,64,16,!1),this.Ah=1779033703,this.Al=-205731576,this.Bh=-1150833019,this.Bl=-2067093701,this.Ch=1013904242,this.Cl=-23791573,this.Dh=-1521486534,this.Dl=1595750129,this.Eh=1359893119,this.El=-1377402159,this.Fh=-1694144372,this.Fl=725511199,this.Gh=528734635,this.Gl=-79577749,this.Hh=1541459225,this.Hl=327033209}get(){const{Ah:e,Al:t,Bh:r,Bl:n,Ch:i,Cl:o,Dh:s,Dl:a,Eh:c,El:u,Fh:d,Fl:l,Gh:h,Gl:f,Hh:p,Hl:m}=this;return[e,t,r,n,i,o,s,a,c,u,d,l,h,f,p,m]}set(e,t,r,n,i,o,s,a,c,u,d,l,h,f,p,m){this.Ah=0|e,this.Al=0|t,this.Bh=0|r,this.Bl=0|n,this.Ch=0|i,this.Cl=0|o,this.Dh=0|s,this.Dl=0|a,this.Eh=0|c,this.El=0|u,this.Fh=0|d,this.Fl=0|l,this.Gh=0|h,this.Gl=0|f,this.Hh=0|p,this.Hl=0|m}process(e,t){for(let r=0;r<16;r++,t+=4)c[r]=e.getUint32(t),u[r]=e.getUint32(t+=4);for(let e=16;e<80;e++){const t=0|c[e-15],r=0|u[e-15],n=i.default.rotrSH(t,r,1)^i.default.rotrSH(t,r,8)^i.default.shrSH(t,r,7),o=i.default.rotrSL(t,r,1)^i.default.rotrSL(t,r,8)^i.default.shrSL(t,r,7),s=0|c[e-2],a=0|u[e-2],d=i.default.rotrSH(s,a,19)^i.default.rotrBH(s,a,61)^i.default.shrSH(s,a,6),l=i.default.rotrSL(s,a,19)^i.default.rotrBL(s,a,61)^i.default.shrSL(s,a,6),h=i.default.add4L(o,l,u[e-7],u[e-16]),f=i.default.add4H(h,n,d,c[e-7],c[e-16]);c[e]=0|f,u[e]=0|h}let{Ah:r,Al:n,Bh:o,Bl:d,Ch:l,Cl:h,Dh:f,Dl:p,Eh:m,El:g,Fh:y,Fl:v,Gh:b,Gl:E,Hh:_,Hl:A}=this;for(let e=0;e<80;e++){const t=i.default.rotrSH(m,g,14)^i.default.rotrSH(m,g,18)^i.default.rotrBH(m,g,41),T=i.default.rotrSL(m,g,14)^i.default.rotrSL(m,g,18)^i.default.rotrBL(m,g,41),I=m&y^~m&b,R=g&v^~g&E,w=i.default.add5L(A,T,R,a[e],u[e]),P=i.default.add5H(w,_,t,I,s[e],c[e]),x=0|w,S=i.default.rotrSH(r,n,28)^i.default.rotrBH(r,n,34)^i.default.rotrBH(r,n,39),O=i.default.rotrSL(r,n,28)^i.default.rotrBL(r,n,34)^i.default.rotrBL(r,n,39),C=r&o^r&l^o&l,B=n&d^n&h^d&h;_=0|b,A=0|E,b=0|y,E=0|v,y=0|m,v=0|g,({h:m,l:g}=i.default.add(0|f,0|p,0|P,0|x)),f=0|l,p=0|h,l=0|o,h=0|d,o=0|r,d=0|n;const N=i.default.add3L(x,O,B);r=i.default.add3H(N,P,S,C),n=0|N}({h:r,l:n}=i.default.add(0|this.Ah,0|this.Al,0|r,0|n)),({h:o,l:d}=i.default.add(0|this.Bh,0|this.Bl,0|o,0|d)),({h:l,l:h}=i.default.add(0|this.Ch,0|this.Cl,0|l,0|h)),({h:f,l:p}=i.default.add(0|this.Dh,0|this.Dl,0|f,0|p)),({h:m,l:g}=i.default.add(0|this.Eh,0|this.El,0|m,0|g)),({h:y,l:v}=i.default.add(0|this.Fh,0|this.Fl,0|y,0|v)),({h:b,l:E}=i.default.add(0|this.Gh,0|this.Gl,0|b,0|E)),({h:_,l:A}=i.default.add(0|this.Hh,0|this.Hl,0|_,0|A)),this.set(r,n,o,d,l,h,f,p,m,g,y,v,b,E,_,A)}roundClean(){c.fill(0),u.fill(0)}destroy(){this.buffer.fill(0),this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0)}}t.SHA512=d;class l extends d{constructor(){super(),this.Ah=-1942145080,this.Al=424955298,this.Bh=1944164710,this.Bl=-1982016298,this.Ch=502970286,this.Cl=855612546,this.Dh=1738396948,this.Dl=1479516111,this.Eh=258812777,this.El=2077511080,this.Fh=2011393907,this.Fl=79989058,this.Gh=1067287976,this.Gl=1780299464,this.Hh=286451373,this.Hl=-1848208735,this.outputLen=28}}class h extends d{constructor(){super(),this.Ah=573645204,this.Al=-64227540,this.Bh=-1621794909,this.Bl=-934517566,this.Ch=596883563,this.Cl=1867755857,this.Dh=-1774684391,this.Dl=1497426621,this.Eh=-1775747358,this.El=-1467023389,this.Fh=-1101128155,this.Fl=1401305490,this.Gh=721525244,this.Gl=746961066,this.Hh=246885852,this.Hl=-2117784414,this.outputLen=32}}class f extends d{constructor(){super(),this.Ah=-876896931,this.Al=-1056596264,this.Bh=1654270250,this.Bl=914150663,this.Ch=-1856437926,this.Cl=812702999,this.Dh=355462360,this.Dl=-150054599,this.Eh=1731405415,this.El=-4191439,this.Fh=-1900787065,this.Fl=1750603025,this.Gh=-619958771,this.Gl=1694076839,this.Hh=1203062813,this.Hl=-1090891868,this.outputLen=48}}t.sha512=(0,o.wrapConstructor)((()=>new d)),t.sha512_224=(0,o.wrapConstructor)((()=>new l)),t.sha512_256=(0,o.wrapConstructor)((()=>new h)),t.sha384=(0,o.wrapConstructor)((()=>new f))},64:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.randomBytes=t.wrapConstructorWithOpts=t.wrapConstructor=t.checkOpts=t.Hash=t.concatBytes=t.toBytes=t.utf8ToBytes=t.asyncLoop=t.nextTick=t.hexToBytes=t.bytesToHex=t.isLE=t.rotr=t.createView=t.u32=t.u8=void 0;const n=r(825);if(t.u8=e=>new Uint8Array(e.buffer,e.byteOffset,e.byteLength),t.u32=e=>new Uint32Array(e.buffer,e.byteOffset,Math.floor(e.byteLength/4)),t.createView=e=>new DataView(e.buffer,e.byteOffset,e.byteLength),t.rotr=(e,t)=>e<<32-t|e>>>t,t.isLE=68===new Uint8Array(new Uint32Array([287454020]).buffer)[0],!t.isLE)throw new Error("Non little-endian hardware is not supported");const i=Array.from({length:256},((e,t)=>t.toString(16).padStart(2,"0")));function o(e){if("string"!=typeof e)throw new TypeError("utf8ToBytes expected string, got "+typeof e);return(new TextEncoder).encode(e)}function s(e){if("string"==typeof e&&(e=o(e)),!(e instanceof Uint8Array))throw new TypeError(`Expected input type is Uint8Array (got ${typeof e})`);return e}t.bytesToHex=function(e){if(!(e instanceof Uint8Array))throw new Error("Uint8Array expected");let t="";for(let r=0;r<e.length;r++)t+=i[e[r]];return t},t.hexToBytes=function(e){if("string"!=typeof e)throw new TypeError("hexToBytes: expected string, got "+typeof e);if(e.length%2)throw new Error("hexToBytes: received invalid unpadded hex");const t=new Uint8Array(e.length/2);for(let r=0;r<t.length;r++){const n=2*r,i=e.slice(n,n+2),o=Number.parseInt(i,16);if(Number.isNaN(o)||o<0)throw new Error("Invalid byte sequence");t[r]=o}return t},t.nextTick=async()=>{},t.asyncLoop=async function(e,r,n){let i=Date.now();for(let o=0;o<e;o++){n(o);const e=Date.now()-i;e>=0&&e<r||(await(0,t.nextTick)(),i+=e)}},t.utf8ToBytes=o,t.toBytes=s,t.concatBytes=function(...e){if(!e.every((e=>e instanceof Uint8Array)))throw new Error("Uint8Array list expected");if(1===e.length)return e[0];const t=e.reduce(((e,t)=>e+t.length),0),r=new Uint8Array(t);for(let t=0,n=0;t<e.length;t++){const i=e[t];r.set(i,n),n+=i.length}return r},t.Hash=class{clone(){return this._cloneInto()}},t.checkOpts=function(e,t){if(void 0!==t&&("object"!=typeof t||(r=t,"[object Object]"!==Object.prototype.toString.call(r)||r.constructor!==Object)))throw new TypeError("Options should be object or undefined");var r;return Object.assign(e,t)},t.wrapConstructor=function(e){const t=t=>e().update(s(t)).digest(),r=e();return t.outputLen=r.outputLen,t.blockLen=r.blockLen,t.create=()=>e(),t},t.wrapConstructorWithOpts=function(e){const t=(t,r)=>e(r).update(s(t)).digest(),r=e({});return t.outputLen=r.outputLen,t.blockLen=r.blockLen,t.create=t=>e(t),t},t.randomBytes=function(e=32){if(n.crypto&&"function"==typeof n.crypto.getRandomValues)return n.crypto.getRandomValues(new Uint8Array(e));throw new Error("crypto.getRandomValues must be defined")}},1238:(e,t)=>{var r;r=function(e){e.version="1.2.2";var t=function(){for(var e=0,t=new Array(256),r=0;256!=r;++r)e=1&(e=1&(e=1&(e=1&(e=1&(e=1&(e=1&(e=1&(e=r)?-306674912^e>>>1:e>>>1)?-306674912^e>>>1:e>>>1)?-306674912^e>>>1:e>>>1)?-306674912^e>>>1:e>>>1)?-306674912^e>>>1:e>>>1)?-306674912^e>>>1:e>>>1)?-306674912^e>>>1:e>>>1)?-306674912^e>>>1:e>>>1,t[r]=e;return"undefined"!=typeof Int32Array?new Int32Array(t):t}(),r=function(e){var t=0,r=0,n=0,i="undefined"!=typeof Int32Array?new Int32Array(4096):new Array(4096);for(n=0;256!=n;++n)i[n]=e[n];for(n=0;256!=n;++n)for(r=e[n],t=256+n;t<4096;t+=256)r=i[t]=r>>>8^e[255&r];var o=[];for(n=1;16!=n;++n)o[n-1]="undefined"!=typeof Int32Array?i.subarray(256*n,256*n+256):i.slice(256*n,256*n+256);return o}(t),n=r[0],i=r[1],o=r[2],s=r[3],a=r[4],c=r[5],u=r[6],d=r[7],l=r[8],h=r[9],f=r[10],p=r[11],m=r[12],g=r[13],y=r[14];e.table=t,e.bstr=function(e,r){for(var n=-1^r,i=0,o=e.length;i<o;)n=n>>>8^t[255&(n^e.charCodeAt(i++))];return~n},e.buf=function(e,r){for(var v=-1^r,b=e.length-15,E=0;E<b;)v=y[e[E++]^255&v]^g[e[E++]^v>>8&255]^m[e[E++]^v>>16&255]^p[e[E++]^v>>>24]^f[e[E++]]^h[e[E++]]^l[e[E++]]^d[e[E++]]^u[e[E++]]^c[e[E++]]^a[e[E++]]^s[e[E++]]^o[e[E++]]^i[e[E++]]^n[e[E++]]^t[e[E++]];for(b+=15;E<b;)v=v>>>8^t[255&(v^e[E++])];return~v},e.str=function(e,r){for(var n=-1^r,i=0,o=e.length,s=0,a=0;i<o;)(s=e.charCodeAt(i++))<128?n=n>>>8^t[255&(n^s)]:s<2048?n=(n=n>>>8^t[255&(n^(192|s>>6&31))])>>>8^t[255&(n^(128|63&s))]:s>=55296&&s<57344?(s=64+(1023&s),a=1023&e.charCodeAt(i++),n=(n=(n=(n=n>>>8^t[255&(n^(240|s>>8&7))])>>>8^t[255&(n^(128|s>>2&63))])>>>8^t[255&(n^(128|a>>6&15|(3&s)<<4))])>>>8^t[255&(n^(128|63&a))]):n=(n=(n=n>>>8^t[255&(n^(224|s>>12&15))])>>>8^t[255&(n^(128|s>>6&63))])>>>8^t[255&(n^(128|63&s))];return~n}},"undefined"==typeof DO_NOT_EXPORT_CRC?r(t):r({})},6279:(e,t,r)=>{var n="undefined"!=typeof globalThis&&globalThis||"undefined"!=typeof self&&self||void 0!==r.g&&r.g,i=function(){function e(){this.fetch=!1,this.DOMException=n.DOMException}return e.prototype=n,new e}();!function(e){!function(t){var r=void 0!==e&&e||"undefined"!=typeof self&&self||void 0!==r&&r,n="URLSearchParams"in r,i="Symbol"in r&&"iterator"in Symbol,o="FileReader"in r&&"Blob"in r&&function(){try{return new Blob,!0}catch(e){return!1}}(),s="FormData"in r,a="ArrayBuffer"in r;if(a)var c=["[object Int8Array]","[object Uint8Array]","[object Uint8ClampedArray]","[object Int16Array]","[object Uint16Array]","[object Int32Array]","[object Uint32Array]","[object Float32Array]","[object Float64Array]"],u=ArrayBuffer.isView||function(e){return e&&c.indexOf(Object.prototype.toString.call(e))>-1};function d(e){if("string"!=typeof e&&(e=String(e)),/[^a-z0-9\-#$%&'*+.^_`|~!]/i.test(e)||""===e)throw new TypeError('Invalid character in header field name: "'+e+'"');return e.toLowerCase()}function l(e){return"string"!=typeof e&&(e=String(e)),e}function h(e){var t={next:function(){var t=e.shift();return{done:void 0===t,value:t}}};return i&&(t[Symbol.iterator]=function(){return t}),t}function f(e){this.map={},e instanceof f?e.forEach((function(e,t){this.append(t,e)}),this):Array.isArray(e)?e.forEach((function(e){this.append(e[0],e[1])}),this):e&&Object.getOwnPropertyNames(e).forEach((function(t){this.append(t,e[t])}),this)}function p(e){if(e.bodyUsed)return Promise.reject(new TypeError("Already read"));e.bodyUsed=!0}function m(e){return new Promise((function(t,r){e.onload=function(){t(e.result)},e.onerror=function(){r(e.error)}}))}function g(e){var t=new FileReader,r=m(t);return t.readAsArrayBuffer(e),r}function y(e){if(e.slice)return e.slice(0);var t=new Uint8Array(e.byteLength);return t.set(new Uint8Array(e)),t.buffer}function v(){return this.bodyUsed=!1,this._initBody=function(e){var t;this.bodyUsed=this.bodyUsed,this._bodyInit=e,e?"string"==typeof e?this._bodyText=e:o&&Blob.prototype.isPrototypeOf(e)?this._bodyBlob=e:s&&FormData.prototype.isPrototypeOf(e)?this._bodyFormData=e:n&&URLSearchParams.prototype.isPrototypeOf(e)?this._bodyText=e.toString():a&&o&&(t=e)&&DataView.prototype.isPrototypeOf(t)?(this._bodyArrayBuffer=y(e.buffer),this._bodyInit=new Blob([this._bodyArrayBuffer])):a&&(ArrayBuffer.prototype.isPrototypeOf(e)||u(e))?this._bodyArrayBuffer=y(e):this._bodyText=e=Object.prototype.toString.call(e):this._bodyText="",this.headers.get("content-type")||("string"==typeof e?this.headers.set("content-type","text/plain;charset=UTF-8"):this._bodyBlob&&this._bodyBlob.type?this.headers.set("content-type",this._bodyBlob.type):n&&URLSearchParams.prototype.isPrototypeOf(e)&&this.headers.set("content-type","application/x-www-form-urlencoded;charset=UTF-8"))},o&&(this.blob=function(){var e=p(this);if(e)return e;if(this._bodyBlob)return Promise.resolve(this._bodyBlob);if(this._bodyArrayBuffer)return Promise.resolve(new Blob([this._bodyArrayBuffer]));if(this._bodyFormData)throw new Error("could not read FormData body as blob");return Promise.resolve(new Blob([this._bodyText]))},this.arrayBuffer=function(){return this._bodyArrayBuffer?p(this)||(ArrayBuffer.isView(this._bodyArrayBuffer)?Promise.resolve(this._bodyArrayBuffer.buffer.slice(this._bodyArrayBuffer.byteOffset,this._bodyArrayBuffer.byteOffset+this._bodyArrayBuffer.byteLength)):Promise.resolve(this._bodyArrayBuffer)):this.blob().then(g)}),this.text=function(){var e,t,r,n=p(this);if(n)return n;if(this._bodyBlob)return e=this._bodyBlob,r=m(t=new FileReader),t.readAsText(e),r;if(this._bodyArrayBuffer)return Promise.resolve(function(e){for(var t=new Uint8Array(e),r=new Array(t.length),n=0;n<t.length;n++)r[n]=String.fromCharCode(t[n]);return r.join("")}(this._bodyArrayBuffer));if(this._bodyFormData)throw new Error("could not read FormData body as text");return Promise.resolve(this._bodyText)},s&&(this.formData=function(){return this.text().then(_)}),this.json=function(){return this.text().then(JSON.parse)},this}f.prototype.append=function(e,t){e=d(e),t=l(t);var r=this.map[e];this.map[e]=r?r+", "+t:t},f.prototype.delete=function(e){delete this.map[d(e)]},f.prototype.get=function(e){return e=d(e),this.has(e)?this.map[e]:null},f.prototype.has=function(e){return this.map.hasOwnProperty(d(e))},f.prototype.set=function(e,t){this.map[d(e)]=l(t)},f.prototype.forEach=function(e,t){for(var r in this.map)this.map.hasOwnProperty(r)&&e.call(t,this.map[r],r,this)},f.prototype.keys=function(){var e=[];return this.forEach((function(t,r){e.push(r)})),h(e)},f.prototype.values=function(){var e=[];return this.forEach((function(t){e.push(t)})),h(e)},f.prototype.entries=function(){var e=[];return this.forEach((function(t,r){e.push([r,t])})),h(e)},i&&(f.prototype[Symbol.iterator]=f.prototype.entries);var b=["DELETE","GET","HEAD","OPTIONS","POST","PUT"];function E(e,t){if(!(this instanceof E))throw new TypeError('Please use the "new" operator, this DOM object constructor cannot be called as a function.');var r,n,i=(t=t||{}).body;if(e instanceof E){if(e.bodyUsed)throw new TypeError("Already read");this.url=e.url,this.credentials=e.credentials,t.headers||(this.headers=new f(e.headers)),this.method=e.method,this.mode=e.mode,this.signal=e.signal,i||null==e._bodyInit||(i=e._bodyInit,e.bodyUsed=!0)}else this.url=String(e);if(this.credentials=t.credentials||this.credentials||"same-origin",!t.headers&&this.headers||(this.headers=new f(t.headers)),this.method=(n=(r=t.method||this.method||"GET").toUpperCase(),b.indexOf(n)>-1?n:r),this.mode=t.mode||this.mode||null,this.signal=t.signal||this.signal,this.referrer=null,("GET"===this.method||"HEAD"===this.method)&&i)throw new TypeError("Body not allowed for GET or HEAD requests");if(this._initBody(i),!("GET"!==this.method&&"HEAD"!==this.method||"no-store"!==t.cache&&"no-cache"!==t.cache)){var o=/([?&])_=[^&]*/;o.test(this.url)?this.url=this.url.replace(o,"$1_="+(new Date).getTime()):this.url+=(/\?/.test(this.url)?"&":"?")+"_="+(new Date).getTime()}}function _(e){var t=new FormData;return e.trim().split("&").forEach((function(e){if(e){var r=e.split("="),n=r.shift().replace(/\+/g," "),i=r.join("=").replace(/\+/g," ");t.append(decodeURIComponent(n),decodeURIComponent(i))}})),t}function A(e,t){if(!(this instanceof A))throw new TypeError('Please use the "new" operator, this DOM object constructor cannot be called as a function.');t||(t={}),this.type="default",this.status=void 0===t.status?200:t.status,this.ok=this.status>=200&&this.status<300,this.statusText=void 0===t.statusText?"":""+t.statusText,this.headers=new f(t.headers),this.url=t.url||"",this._initBody(e)}E.prototype.clone=function(){return new E(this,{body:this._bodyInit})},v.call(E.prototype),v.call(A.prototype),A.prototype.clone=function(){return new A(this._bodyInit,{status:this.status,statusText:this.statusText,headers:new f(this.headers),url:this.url})},A.error=function(){var e=new A(null,{status:0,statusText:""});return e.type="error",e};var T=[301,302,303,307,308];A.redirect=function(e,t){if(-1===T.indexOf(t))throw new RangeError("Invalid status code");return new A(null,{status:t,headers:{location:e}})},t.DOMException=r.DOMException;try{new t.DOMException}catch(e){t.DOMException=function(e,t){this.message=e,this.name=t;var r=Error(e);this.stack=r.stack},t.DOMException.prototype=Object.create(Error.prototype),t.DOMException.prototype.constructor=t.DOMException}function I(e,n){return new Promise((function(i,s){var c=new E(e,n);if(c.signal&&c.signal.aborted)return s(new t.DOMException("Aborted","AbortError"));var u=new XMLHttpRequest;function d(){u.abort()}u.onload=function(){var e,t,r={status:u.status,statusText:u.statusText,headers:(e=u.getAllResponseHeaders()||"",t=new f,e.replace(/\r?\n[\t ]+/g," ").split("\r").map((function(e){return 0===e.indexOf("\n")?e.substr(1,e.length):e})).forEach((function(e){var r=e.split(":"),n=r.shift().trim();if(n){var i=r.join(":").trim();t.append(n,i)}})),t)};r.url="responseURL"in u?u.responseURL:r.headers.get("X-Request-URL");var n="response"in u?u.response:u.responseText;setTimeout((function(){i(new A(n,r))}),0)},u.onerror=function(){setTimeout((function(){s(new TypeError("Network request failed"))}),0)},u.ontimeout=function(){setTimeout((function(){s(new TypeError("Network request failed"))}),0)},u.onabort=function(){setTimeout((function(){s(new t.DOMException("Aborted","AbortError"))}),0)},u.open(c.method,function(e){try{return""===e&&r.location.href?r.location.href:e}catch(t){return e}}(c.url),!0),"include"===c.credentials?u.withCredentials=!0:"omit"===c.credentials&&(u.withCredentials=!1),"responseType"in u&&(o?u.responseType="blob":a&&c.headers.get("Content-Type")&&-1!==c.headers.get("Content-Type").indexOf("application/octet-stream")&&(u.responseType="arraybuffer")),!n||"object"!=typeof n.headers||n.headers instanceof f?c.headers.forEach((function(e,t){u.setRequestHeader(t,e)})):Object.getOwnPropertyNames(n.headers).forEach((function(e){u.setRequestHeader(e,l(n.headers[e]))})),c.signal&&(c.signal.addEventListener("abort",d),u.onreadystatechange=function(){4===u.readyState&&c.signal.removeEventListener("abort",d)}),u.send(void 0===c._bodyInit?null:c._bodyInit)}))}I.polyfill=!0,r.fetch||(r.fetch=I,r.Headers=f,r.Request=E,r.Response=A),t.Headers=f,t.Request=E,t.Response=A,t.fetch=I}({})}(i),i.fetch.ponyfill=!0,delete i.fetch.polyfill;var o=n.fetch?n:i;(t=o.fetch).default=o.fetch,t.fetch=o.fetch,t.Headers=o.Headers,t.Request=o.Request,t.Response=o.Response,e.exports=t},2699:e=>{"use strict";var t,r="object"==typeof Reflect?Reflect:null,n=r&&"function"==typeof r.apply?r.apply:function(e,t,r){return Function.prototype.apply.call(e,t,r)};t=r&&"function"==typeof r.ownKeys?r.ownKeys:Object.getOwnPropertySymbols?function(e){return Object.getOwnPropertyNames(e).concat(Object.getOwnPropertySymbols(e))}:function(e){return Object.getOwnPropertyNames(e)};var i=Number.isNaN||function(e){return e!=e};function o(){o.init.call(this)}e.exports=o,e.exports.once=function(e,t){return new Promise((function(r,n){function i(r){e.removeListener(t,o),n(r)}function o(){"function"==typeof e.removeListener&&e.removeListener("error",i),r([].slice.call(arguments))}m(e,t,o,{once:!0}),"error"!==t&&function(e,t,r){"function"==typeof e.on&&m(e,"error",t,{once:!0})}(e,i)}))},o.EventEmitter=o,o.prototype._events=void 0,o.prototype._eventsCount=0,o.prototype._maxListeners=void 0;var s=10;function a(e){if("function"!=typeof e)throw new TypeError('The "listener" argument must be of type Function. Received type '+typeof e)}function c(e){return void 0===e._maxListeners?o.defaultMaxListeners:e._maxListeners}function u(e,t,r,n){var i,o,s,u;if(a(r),void 0===(o=e._events)?(o=e._events=Object.create(null),e._eventsCount=0):(void 0!==o.newListener&&(e.emit("newListener",t,r.listener?r.listener:r),o=e._events),s=o[t]),void 0===s)s=o[t]=r,++e._eventsCount;else if("function"==typeof s?s=o[t]=n?[r,s]:[s,r]:n?s.unshift(r):s.push(r),(i=c(e))>0&&s.length>i&&!s.warned){s.warned=!0;var d=new Error("Possible EventEmitter memory leak detected. "+s.length+" "+String(t)+" listeners added. Use emitter.setMaxListeners() to increase limit");d.name="MaxListenersExceededWarning",d.emitter=e,d.type=t,d.count=s.length,u=d,console&&console.warn&&console.warn(u)}return e}function d(){if(!this.fired)return this.target.removeListener(this.type,this.wrapFn),this.fired=!0,0===arguments.length?this.listener.call(this.target):this.listener.apply(this.target,arguments)}function l(e,t,r){var n={fired:!1,wrapFn:void 0,target:e,type:t,listener:r},i=d.bind(n);return i.listener=r,n.wrapFn=i,i}function h(e,t,r){var n=e._events;if(void 0===n)return[];var i=n[t];return void 0===i?[]:"function"==typeof i?r?[i.listener||i]:[i]:r?function(e){for(var t=new Array(e.length),r=0;r<t.length;++r)t[r]=e[r].listener||e[r];return t}(i):p(i,i.length)}function f(e){var t=this._events;if(void 0!==t){var r=t[e];if("function"==typeof r)return 1;if(void 0!==r)return r.length}return 0}function p(e,t){for(var r=new Array(t),n=0;n<t;++n)r[n]=e[n];return r}function m(e,t,r,n){if("function"==typeof e.on)n.once?e.once(t,r):e.on(t,r);else{if("function"!=typeof e.addEventListener)throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type '+typeof e);e.addEventListener(t,(function i(o){n.once&&e.removeEventListener(t,i),r(o)}))}}Object.defineProperty(o,"defaultMaxListeners",{enumerable:!0,get:function(){return s},set:function(e){if("number"!=typeof e||e<0||i(e))throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received '+e+".");s=e}}),o.init=function(){void 0!==this._events&&this._events!==Object.getPrototypeOf(this)._events||(this._events=Object.create(null),this._eventsCount=0),this._maxListeners=this._maxListeners||void 0},o.prototype.setMaxListeners=function(e){if("number"!=typeof e||e<0||i(e))throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received '+e+".");return this._maxListeners=e,this},o.prototype.getMaxListeners=function(){return c(this)},o.prototype.emit=function(e){for(var t=[],r=1;r<arguments.length;r++)t.push(arguments[r]);var i="error"===e,o=this._events;if(void 0!==o)i=i&&void 0===o.error;else if(!i)return!1;if(i){var s;if(t.length>0&&(s=t[0]),s instanceof Error)throw s;var a=new Error("Unhandled error."+(s?" ("+s.message+")":""));throw a.context=s,a}var c=o[e];if(void 0===c)return!1;if("function"==typeof c)n(c,this,t);else{var u=c.length,d=p(c,u);for(r=0;r<u;++r)n(d[r],this,t)}return!0},o.prototype.addListener=function(e,t){return u(this,e,t,!1)},o.prototype.on=o.prototype.addListener,o.prototype.prependListener=function(e,t){return u(this,e,t,!0)},o.prototype.once=function(e,t){return a(t),this.on(e,l(this,e,t)),this},o.prototype.prependOnceListener=function(e,t){return a(t),this.prependListener(e,l(this,e,t)),this},o.prototype.removeListener=function(e,t){var r,n,i,o,s;if(a(t),void 0===(n=this._events))return this;if(void 0===(r=n[e]))return this;if(r===t||r.listener===t)0==--this._eventsCount?this._events=Object.create(null):(delete n[e],n.removeListener&&this.emit("removeListener",e,r.listener||t));else if("function"!=typeof r){for(i=-1,o=r.length-1;o>=0;o--)if(r[o]===t||r[o].listener===t){s=r[o].listener,i=o;break}if(i<0)return this;0===i?r.shift():function(e,t){for(;t+1<e.length;t++)e[t]=e[t+1];e.pop()}(r,i),1===r.length&&(n[e]=r[0]),void 0!==n.removeListener&&this.emit("removeListener",e,s||t)}return this},o.prototype.off=o.prototype.removeListener,o.prototype.removeAllListeners=function(e){var t,r,n;if(void 0===(r=this._events))return this;if(void 0===r.removeListener)return 0===arguments.length?(this._events=Object.create(null),this._eventsCount=0):void 0!==r[e]&&(0==--this._eventsCount?this._events=Object.create(null):delete r[e]),this;if(0===arguments.length){var i,o=Object.keys(r);for(n=0;n<o.length;++n)"removeListener"!==(i=o[n])&&this.removeAllListeners(i);return this.removeAllListeners("removeListener"),this._events=Object.create(null),this._eventsCount=0,this}if("function"==typeof(t=r[e]))this.removeListener(e,t);else if(void 0!==t)for(n=t.length-1;n>=0;n--)this.removeListener(e,t[n]);return this},o.prototype.listeners=function(e){return h(this,e,!0)},o.prototype.rawListeners=function(e){return h(this,e,!1)},o.listenerCount=function(e,t){return"function"==typeof e.listenerCount?e.listenerCount(t):f.call(e,t)},o.prototype.listenerCount=f,o.prototype.eventNames=function(){return this._eventsCount>0?t(this._events):[]}},7475:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>i});var n=null;"undefined"!=typeof WebSocket?n=WebSocket:"undefined"!=typeof MozWebSocket?n=MozWebSocket:void 0!==r.g?n=r.g.WebSocket||r.g.MozWebSocket:"undefined"!=typeof window?n=window.WebSocket||window.MozWebSocket:"undefined"!=typeof self&&(n=self.WebSocket||self.MozWebSocket);const i=n},4406:e=>{var t,r,n=e.exports={};function i(){throw new Error("setTimeout has not been defined")}function o(){throw new Error("clearTimeout has not been defined")}function s(e){if(t===setTimeout)return setTimeout(e,0);if((t===i||!t)&&setTimeout)return t=setTimeout,setTimeout(e,0);try{return t(e,0)}catch(r){try{return t.call(null,e,0)}catch(r){return t.call(this,e,0)}}}!function(){try{t="function"==typeof setTimeout?setTimeout:i}catch(e){t=i}try{r="function"==typeof clearTimeout?clearTimeout:o}catch(e){r=o}}();var a,c=[],u=!1,d=-1;function l(){u&&a&&(u=!1,a.length?c=a.concat(c):d=-1,c.length&&h())}function h(){if(!u){var e=s(l);u=!0;for(var t=c.length;t;){for(a=c,c=[];++d<t;)a&&a[d].run();d=-1,t=c.length}a=null,u=!1,function(e){if(r===clearTimeout)return clearTimeout(e);if((r===o||!r)&&clearTimeout)return r=clearTimeout,clearTimeout(e);try{r(e)}catch(t){try{return r.call(null,e)}catch(t){return r.call(this,e)}}}(e)}}function f(e,t){this.fun=e,this.array=t}function p(){}n.nextTick=function(e){var t=new Array(arguments.length-1);if(arguments.length>1)for(var r=1;r<arguments.length;r++)t[r-1]=arguments[r];c.push(new f(e,t)),1!==c.length||u||s(h)},f.prototype.run=function(){this.fun.apply(null,this.array)},n.title="browser",n.browser=!0,n.env={},n.argv=[],n.version="",n.versions={},n.on=p,n.addListener=p,n.once=p,n.off=p,n.removeListener=p,n.removeAllListeners=p,n.emit=p,n.prependListener=p,n.prependOnceListener=p,n.listeners=function(e){return[]},n.binding=function(e){throw new Error("process.binding is not supported")},n.cwd=function(){return"/"},n.chdir=function(e){throw new Error("process.chdir is not supported")},n.umask=function(){return 0}},6985:function(e,t,r){var n=r(4406);!function(e,t){"use strict";if(!e.setImmediate){var r,i,o,s,a,c=1,u={},d=!1,l=e.document,h=Object.getPrototypeOf&&Object.getPrototypeOf(e);h=h&&h.setTimeout?h:e,"[object process]"==={}.toString.call(e.process)?r=function(e){n.nextTick((function(){p(e)}))}:function(){if(e.postMessage&&!e.importScripts){var t=!0,r=e.onmessage;return e.onmessage=function(){t=!1},e.postMessage("","*"),e.onmessage=r,t}}()?(s="setImmediate$"+Math.random()+"$",a=function(t){t.source===e&&"string"==typeof t.data&&0===t.data.indexOf(s)&&p(+t.data.slice(s.length))},e.addEventListener?e.addEventListener("message",a,!1):e.attachEvent("onmessage",a),r=function(t){e.postMessage(s+t,"*")}):e.MessageChannel?((o=new MessageChannel).port1.onmessage=function(e){p(e.data)},r=function(e){o.port2.postMessage(e)}):l&&"onreadystatechange"in l.createElement("script")?(i=l.documentElement,r=function(e){var t=l.createElement("script");t.onreadystatechange=function(){p(e),t.onreadystatechange=null,i.removeChild(t),t=null},i.appendChild(t)}):r=function(e){setTimeout(p,0,e)},h.setImmediate=function(e){"function"!=typeof e&&(e=new Function(""+e));for(var t=new Array(arguments.length-1),n=0;n<t.length;n++)t[n]=arguments[n+1];var i={callback:e,args:t};return u[c]=i,r(c),c++},h.clearImmediate=f}function f(e){delete u[e]}function p(e){if(d)setTimeout(p,0,e);else{var t=u[e];if(t){d=!0;try{!function(e){var t=e.callback,r=e.args;switch(r.length){case 0:t();break;case 1:t(r[0]);break;case 2:t(r[0],r[1]);break;case 3:t(r[0],r[1],r[2]);break;default:t.apply(void 0,r)}}(t)}finally{f(e),d=!1}}}}}("undefined"==typeof self?void 0===r.g?this:r.g:self)},9937:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0});const n=r(8381);t.default={encodeEventSignature:n.encodeEventSignature,encodeFunctionCall:n.encodeFunctionCall,encodeFunctionSignature:n.encodeFunctionSignature,encodeParameter:n.encodeParameter,encodeParameters:n.encodeParameters,decodeParameter:n.decodeParameter,decodeParameters:n.decodeParameters,decodeLog:n.decodeLog}},1186:function(e,t,r){"use strict";var n=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.initAccountsForContext=void 0;const i=r(9970),o=r(9634),s=r(6637),a=r(9247);t.initAccountsForContext=e=>{const t=(t,r)=>n(void 0,void 0,void 0,(function*(){const n=yield(0,s.prepareTransactionForSigning)(t,e),c=(0,o.format)({format:"bytes"},r,i.ETH_DATA_FORMAT);return(0,a.signTransaction)(n,c)})),r=e=>{const r=(0,a.privateKeyToAccount)(e);return Object.assign(Object.assign({},r),{signTransaction:e=>n(void 0,void 0,void 0,(function*(){return t(e,r.privateKey)}))})},c=(e,r,i)=>n(void 0,void 0,void 0,(function*(){var o;const s=yield(0,a.decrypt)(e,r,null===(o=null==i?void 0:i.nonStrict)||void 0===o||o);return Object.assign(Object.assign({},s),{signTransaction:e=>n(void 0,void 0,void 0,(function*(){return t(e,s.privateKey)}))})})),u=()=>{const e=(0,a.create)();return Object.assign(Object.assign({},e),{signTransaction:r=>n(void 0,void 0,void 0,(function*(){return t(r,e.privateKey)}))})},d=new a.Wallet({create:u,privateKeyToAccount:r,decrypt:c});return{signTransaction:t,create:u,privateKeyToAccount:r,decrypt:c,recoverTransaction:a.recoverTransaction,hashMessage:a.hashMessage,sign:a.sign,recover:a.recover,encrypt:a.encrypt,wallet:d}}},9913:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.Web3PkgInfo=void 0,t.Web3PkgInfo={version:"4.2.2"}},9375:function(e,t,r){"use strict";var n=this&&this.__createBinding||(Object.create?function(e,t,r,n){void 0===n&&(n=r);var i=Object.getOwnPropertyDescriptor(t,r);i&&!("get"in i?!t.__esModule:i.writable||i.configurable)||(i={enumerable:!0,get:function(){return t[r]}}),Object.defineProperty(e,n,i)}:function(e,t,r,n){void 0===n&&(n=r),e[n]=t[r]}),i=this&&this.__setModuleDefault||(Object.create?function(e,t){Object.defineProperty(e,"default",{enumerable:!0,value:t})}:function(e,t){e.default=t}),o=this&&this.__importStar||function(e){if(e&&e.__esModule)return e;var t={};if(null!=e)for(var r in e)"default"!==r&&Object.prototype.hasOwnProperty.call(e,r)&&n(t,e,r);return i(t,e),t},s=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.Web3=void 0;const a=r(6527),c=r(6637),u=s(r(3211)),d=r(1698),l=r(9910),h=r(9757),f=r(9820),p=o(r(9634)),m=r(9634),g=r(5071),y=s(r(9937)),v=r(1186),b=r(9913);class E extends a.Web3Context{constructor(e){var t;((0,m.isNullish)(e)||"string"==typeof e&&""===e.trim()||"string"!=typeof e&&!(0,a.isSupportedProvider)(e)&&!e.provider)&&console.warn("NOTE: web3.js is running without provider. You need to pass a provider in order to interact with the network!");let r={};"string"==typeof e||(0,a.isSupportedProvider)(e)?r.provider=e:r=e||{},r.registeredSubscriptions=Object.assign(Object.assign({},c.registeredSubscriptions),null!==(t=r.registeredSubscriptions)&&void 0!==t?t:{}),super(r);const n=(0,v.initAccountsForContext)(this);this._wallet=n.wallet,this._accountProvider=n,this.utils=p;const i=this;class o extends u.default{constructor(e,t,r){if("object"==typeof t&&"object"==typeof r)throw new g.InvalidMethodParamsError("Should not provide options at both 2nd and 3rd parameters");if((0,m.isNullish)(t))super(e,r,i.getContextObject());else if("object"==typeof t)super(e,t,i.getContextObject());else{if("string"!=typeof t)throw new g.InvalidMethodParamsError;super(e,t,null!=r?r:{},i.getContextObject())}super.subscribeToContextEvents(i)}}const s=i.use(c.Web3Eth);this.eth=Object.assign(s,{ens:i.use(d.ENS,d.registryAddresses.main),Iban:l.Iban,net:i.use(f.Net),personal:i.use(h.Personal),Contract:o,abi:y.default,accounts:n})}}t.Web3=E,E.version=b.Web3PkgInfo.version,E.utils=p,E.modules={Web3Eth:c.Web3Eth,Iban:l.Iban,Net:f.Net,ENS:d.ENS,Personal:h.Personal},t.default=E},5809:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.ZodError=t.quotelessJson=t.ZodIssueCode=void 0;const n=r(3133);t.ZodIssueCode=n.util.arrayToEnum(["invalid_type","invalid_literal","custom","invalid_union","invalid_union_discriminator","invalid_enum_value","unrecognized_keys","invalid_arguments","invalid_return_type","invalid_date","invalid_string","too_small","too_big","invalid_intersection_types","not_multiple_of","not_finite"]),t.quotelessJson=e=>JSON.stringify(e,null,2).replace(/"([^"]+)":/g,"$1:");class i extends Error{constructor(e){super(),this.issues=[],this.addIssue=e=>{this.issues=[...this.issues,e]},this.addIssues=(e=[])=>{this.issues=[...this.issues,...e]};const t=new.target.prototype;Object.setPrototypeOf?Object.setPrototypeOf(this,t):this.__proto__=t,this.name="ZodError",this.issues=e}get errors(){return this.issues}format(e){const t=e||function(e){return e.message},r={_errors:[]},n=e=>{for(const i of e.issues)if("invalid_union"===i.code)i.unionErrors.map(n);else if("invalid_return_type"===i.code)n(i.returnTypeError);else if("invalid_arguments"===i.code)n(i.argumentsError);else if(0===i.path.length)r._errors.push(t(i));else{let e=r,n=0;for(;n<i.path.length;){const r=i.path[n];n===i.path.length-1?(e[r]=e[r]||{_errors:[]},e[r]._errors.push(t(i))):e[r]=e[r]||{_errors:[]},e=e[r],n++}}};return n(this),r}toString(){return this.message}get message(){return JSON.stringify(this.issues,n.util.jsonStringifyReplacer,2)}get isEmpty(){return 0===this.issues.length}flatten(e=(e=>e.message)){const t={},r=[];for(const n of this.issues)n.path.length>0?(t[n.path[0]]=t[n.path[0]]||[],t[n.path[0]].push(e(n))):r.push(e(n));return{formErrors:r,fieldErrors:t}}get formErrors(){return this.flatten()}}t.ZodError=i,i.create=e=>new i(e)},1909:function(e,t,r){"use strict";var n=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.getErrorMap=t.setErrorMap=t.defaultErrorMap=void 0;const i=n(r(6013));t.defaultErrorMap=i.default;let o=i.default;t.setErrorMap=function(e){o=e},t.getErrorMap=function(){return o}},4474:function(e,t,r){"use strict";var n=this&&this.__createBinding||(Object.create?function(e,t,r,n){void 0===n&&(n=r),Object.defineProperty(e,n,{enumerable:!0,get:function(){return t[r]}})}:function(e,t,r,n){void 0===n&&(n=r),e[n]=t[r]}),i=this&&this.__exportStar||function(e,t){for(var r in e)"default"===r||Object.prototype.hasOwnProperty.call(t,r)||n(t,e,r)};Object.defineProperty(t,"__esModule",{value:!0}),i(r(1909),t),i(r(4735),t),i(r(1832),t),i(r(3133),t),i(r(1176),t),i(r(5809),t)},3682:(e,t)=>{"use strict";var r;Object.defineProperty(t,"__esModule",{value:!0}),t.errorUtil=void 0,(r=t.errorUtil||(t.errorUtil={})).errToObj=e=>"string"==typeof e?{message:e}:e||{},r.toString=e=>"string"==typeof e?e:null==e?void 0:e.message},4735:function(e,t,r){"use strict";var n=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.isAsync=t.isValid=t.isDirty=t.isAborted=t.OK=t.DIRTY=t.INVALID=t.ParseStatus=t.addIssueToContext=t.EMPTY_PATH=t.makeIssue=void 0;const i=r(1909),o=n(r(6013));t.makeIssue=e=>{const{data:t,path:r,errorMaps:n,issueData:i}=e,o=[...r,...i.path||[]],s={...i,path:o};let a="";const c=n.filter((e=>!!e)).slice().reverse();for(const e of c)a=e(s,{data:t,defaultError:a}).message;return{...i,path:o,message:i.message||a}},t.EMPTY_PATH=[],t.addIssueToContext=function(e,r){const n=(0,t.makeIssue)({issueData:r,data:e.data,path:e.path,errorMaps:[e.common.contextualErrorMap,e.schemaErrorMap,(0,i.getErrorMap)(),o.default].filter((e=>!!e))});e.common.issues.push(n)};class s{constructor(){this.value="valid"}dirty(){"valid"===this.value&&(this.value="dirty")}abort(){"aborted"!==this.value&&(this.value="aborted")}static mergeArray(e,r){const n=[];for(const i of r){if("aborted"===i.status)return t.INVALID;"dirty"===i.status&&e.dirty(),n.push(i.value)}return{status:e.value,value:n}}static async mergeObjectAsync(e,t){const r=[];for(const e of t)r.push({key:await e.key,value:await e.value});return s.mergeObjectSync(e,r)}static mergeObjectSync(e,r){const n={};for(const i of r){const{key:r,value:o}=i;if("aborted"===r.status)return t.INVALID;if("aborted"===o.status)return t.INVALID;"dirty"===r.status&&e.dirty(),"dirty"===o.status&&e.dirty(),"__proto__"===r.value||void 0===o.value&&!i.alwaysSet||(n[r.value]=o.value)}return{status:e.value,value:n}}}t.ParseStatus=s,t.INVALID=Object.freeze({status:"aborted"}),t.DIRTY=e=>({status:"dirty",value:e}),t.OK=e=>({status:"valid",value:e}),t.isAborted=e=>"aborted"===e.status,t.isDirty=e=>"dirty"===e.status,t.isValid=e=>"valid"===e.status,t.isAsync=e=>"undefined"!=typeof Promise&&e instanceof Promise},1832:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0})},3133:(e,t)=>{"use strict";var r;Object.defineProperty(t,"__esModule",{value:!0}),t.getParsedType=t.ZodParsedType=t.objectUtil=t.util=void 0,function(e){e.assertEqual=e=>e,e.assertIs=function(e){},e.assertNever=function(e){throw new Error},e.arrayToEnum=e=>{const t={};for(const r of e)t[r]=r;return t},e.getValidEnumValues=t=>{const r=e.objectKeys(t).filter((e=>"number"!=typeof t[t[e]])),n={};for(const e of r)n[e]=t[e];return e.objectValues(n)},e.objectValues=t=>e.objectKeys(t).map((function(e){return t[e]})),e.objectKeys="function"==typeof Object.keys?e=>Object.keys(e):e=>{const t=[];for(const r in e)Object.prototype.hasOwnProperty.call(e,r)&&t.push(r);return t},e.find=(e,t)=>{for(const r of e)if(t(r))return r},e.isInteger="function"==typeof Number.isInteger?e=>Number.isInteger(e):e=>"number"==typeof e&&isFinite(e)&&Math.floor(e)===e,e.joinValues=function(e,t=" | "){return e.map((e=>"string"==typeof e?`'${e}'`:e)).join(t)},e.jsonStringifyReplacer=(e,t)=>"bigint"==typeof t?t.toString():t}(r=t.util||(t.util={})),(t.objectUtil||(t.objectUtil={})).mergeShapes=(e,t)=>({...e,...t}),t.ZodParsedType=r.arrayToEnum(["string","nan","number","integer","float","boolean","date","bigint","symbol","function","undefined","null","array","object","unknown","promise","void","never","map","set"]),t.getParsedType=e=>{switch(typeof e){case"undefined":return t.ZodParsedType.undefined;case"string":return t.ZodParsedType.string;case"number":return isNaN(e)?t.ZodParsedType.nan:t.ZodParsedType.number;case"boolean":return t.ZodParsedType.boolean;case"function":return t.ZodParsedType.function;case"bigint":return t.ZodParsedType.bigint;case"symbol":return t.ZodParsedType.symbol;case"object":return Array.isArray(e)?t.ZodParsedType.array:null===e?t.ZodParsedType.null:e.then&&"function"==typeof e.then&&e.catch&&"function"==typeof e.catch?t.ZodParsedType.promise:"undefined"!=typeof Map&&e instanceof Map?t.ZodParsedType.map:"undefined"!=typeof Set&&e instanceof Set?t.ZodParsedType.set:"undefined"!=typeof Date&&e instanceof Date?t.ZodParsedType.date:t.ZodParsedType.object;default:return t.ZodParsedType.unknown}}},6750:function(e,t,r){"use strict";var n=this&&this.__createBinding||(Object.create?function(e,t,r,n){void 0===n&&(n=r),Object.defineProperty(e,n,{enumerable:!0,get:function(){return t[r]}})}:function(e,t,r,n){void 0===n&&(n=r),e[n]=t[r]}),i=this&&this.__setModuleDefault||(Object.create?function(e,t){Object.defineProperty(e,"default",{enumerable:!0,value:t})}:function(e,t){e.default=t}),o=this&&this.__importStar||function(e){if(e&&e.__esModule)return e;var t={};if(null!=e)for(var r in e)"default"!==r&&Object.prototype.hasOwnProperty.call(e,r)&&n(t,e,r);return i(t,e),t},s=this&&this.__exportStar||function(e,t){for(var r in e)"default"===r||Object.prototype.hasOwnProperty.call(t,r)||n(t,e,r)};Object.defineProperty(t,"__esModule",{value:!0}),t.z=void 0;const a=o(r(4474));t.z=a,s(r(4474),t),t.default=a},6013:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0});const n=r(3133),i=r(5809);t.default=(e,t)=>{let r;switch(e.code){case i.ZodIssueCode.invalid_type:r=e.received===n.ZodParsedType.undefined?"Required":`Expected ${e.expected}, received ${e.received}`;break;case i.ZodIssueCode.invalid_literal:r=`Invalid literal value, expected ${JSON.stringify(e.expected,n.util.jsonStringifyReplacer)}`;break;case i.ZodIssueCode.unrecognized_keys:r=`Unrecognized key(s) in object: ${n.util.joinValues(e.keys,", ")}`;break;case i.ZodIssueCode.invalid_union:r="Invalid input";break;case i.ZodIssueCode.invalid_union_discriminator:r=`Invalid discriminator value. Expected ${n.util.joinValues(e.options)}`;break;case i.ZodIssueCode.invalid_enum_value:r=`Invalid enum value. Expected ${n.util.joinValues(e.options)}, received '${e.received}'`;break;case i.ZodIssueCode.invalid_arguments:r="Invalid function arguments";break;case i.ZodIssueCode.invalid_return_type:r="Invalid function return type";break;case i.ZodIssueCode.invalid_date:r="Invalid date";break;case i.ZodIssueCode.invalid_string:"object"==typeof e.validation?"includes"in e.validation?(r=`Invalid input: must include "${e.validation.includes}"`,"number"==typeof e.validation.position&&(r=`${r} at one or more positions greater than or equal to ${e.validation.position}`)):"startsWith"in e.validation?r=`Invalid input: must start with "${e.validation.startsWith}"`:"endsWith"in e.validation?r=`Invalid input: must end with "${e.validation.endsWith}"`:n.util.assertNever(e.validation):r="regex"!==e.validation?`Invalid ${e.validation}`:"Invalid";break;case i.ZodIssueCode.too_small:r="array"===e.type?`Array must contain ${e.exact?"exactly":e.inclusive?"at least":"more than"} ${e.minimum} element(s)`:"string"===e.type?`String must contain ${e.exact?"exactly":e.inclusive?"at least":"over"} ${e.minimum} character(s)`:"number"===e.type?`Number must be ${e.exact?"exactly equal to ":e.inclusive?"greater than or equal to ":"greater than "}${e.minimum}`:"date"===e.type?`Date must be ${e.exact?"exactly equal to ":e.inclusive?"greater than or equal to ":"greater than "}${new Date(Number(e.minimum))}`:"Invalid input";break;case i.ZodIssueCode.too_big:r="array"===e.type?`Array must contain ${e.exact?"exactly":e.inclusive?"at most":"less than"} ${e.maximum} element(s)`:"string"===e.type?`String must contain ${e.exact?"exactly":e.inclusive?"at most":"under"} ${e.maximum} character(s)`:"number"===e.type?`Number must be ${e.exact?"exactly":e.inclusive?"less than or equal to":"less than"} ${e.maximum}`:"bigint"===e.type?`BigInt must be ${e.exact?"exactly":e.inclusive?"less than or equal to":"less than"} ${e.maximum}`:"date"===e.type?`Date must be ${e.exact?"exactly":e.inclusive?"smaller than or equal to":"smaller than"} ${new Date(Number(e.maximum))}`:"Invalid input";break;case i.ZodIssueCode.custom:r="Invalid input";break;case i.ZodIssueCode.invalid_intersection_types:r="Intersection results could not be merged";break;case i.ZodIssueCode.not_multiple_of:r=`Number must be a multiple of ${e.multipleOf}`;break;case i.ZodIssueCode.not_finite:r="Number must be finite";break;default:r=t.defaultError,n.util.assertNever(e)}return{message:r}}},1176:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.date=t.boolean=t.bigint=t.array=t.any=t.coerce=t.ZodFirstPartyTypeKind=t.late=t.ZodSchema=t.Schema=t.custom=t.ZodReadonly=t.ZodPipeline=t.ZodBranded=t.BRAND=t.ZodNaN=t.ZodCatch=t.ZodDefault=t.ZodNullable=t.ZodOptional=t.ZodTransformer=t.ZodEffects=t.ZodPromise=t.ZodNativeEnum=t.ZodEnum=t.ZodLiteral=t.ZodLazy=t.ZodFunction=t.ZodSet=t.ZodMap=t.ZodRecord=t.ZodTuple=t.ZodIntersection=t.ZodDiscriminatedUnion=t.ZodUnion=t.ZodObject=t.ZodArray=t.ZodVoid=t.ZodNever=t.ZodUnknown=t.ZodAny=t.ZodNull=t.ZodUndefined=t.ZodSymbol=t.ZodDate=t.ZodBoolean=t.ZodBigInt=t.ZodNumber=t.ZodString=t.ZodType=void 0,t.NEVER=t.void=t.unknown=t.union=t.undefined=t.tuple=t.transformer=t.symbol=t.string=t.strictObject=t.set=t.record=t.promise=t.preprocess=t.pipeline=t.ostring=t.optional=t.onumber=t.oboolean=t.object=t.number=t.nullable=t.null=t.never=t.nativeEnum=t.nan=t.map=t.literal=t.lazy=t.intersection=t.instanceof=t.function=t.enum=t.effect=t.discriminatedUnion=void 0;const n=r(1909),i=r(3682),o=r(4735),s=r(3133),a=r(5809);class c{constructor(e,t,r,n){this._cachedPath=[],this.parent=e,this.data=t,this._path=r,this._key=n}get path(){return this._cachedPath.length||(this._key instanceof Array?this._cachedPath.push(...this._path,...this._key):this._cachedPath.push(...this._path,this._key)),this._cachedPath}}const u=(e,t)=>{if((0,o.isValid)(t))return{success:!0,data:t.value};if(!e.common.issues.length)throw new Error("Validation failed but no issues detected.");return{success:!1,get error(){if(this._error)return this._error;const t=new a.ZodError(e.common.issues);return this._error=t,this._error}}};function d(e){if(!e)return{};const{errorMap:t,invalid_type_error:r,required_error:n,description:i}=e;if(t&&(r||n))throw new Error('Can\'t use "invalid_type_error" or "required_error" in conjunction with custom error map.');return t?{errorMap:t,description:i}:{errorMap:(e,t)=>"invalid_type"!==e.code?{message:t.defaultError}:void 0===t.data?{message:null!=n?n:t.defaultError}:{message:null!=r?r:t.defaultError},description:i}}class l{constructor(e){this.spa=this.safeParseAsync,this._def=e,this.parse=this.parse.bind(this),this.safeParse=this.safeParse.bind(this),this.parseAsync=this.parseAsync.bind(this),this.safeParseAsync=this.safeParseAsync.bind(this),this.spa=this.spa.bind(this),this.refine=this.refine.bind(this),this.refinement=this.refinement.bind(this),this.superRefine=this.superRefine.bind(this),this.optional=this.optional.bind(this),this.nullable=this.nullable.bind(this),this.nullish=this.nullish.bind(this),this.array=this.array.bind(this),this.promise=this.promise.bind(this),this.or=this.or.bind(this),this.and=this.and.bind(this),this.transform=this.transform.bind(this),this.brand=this.brand.bind(this),this.default=this.default.bind(this),this.catch=this.catch.bind(this),this.describe=this.describe.bind(this),this.pipe=this.pipe.bind(this),this.readonly=this.readonly.bind(this),this.isNullable=this.isNullable.bind(this),this.isOptional=this.isOptional.bind(this)}get description(){return this._def.description}_getType(e){return(0,s.getParsedType)(e.data)}_getOrReturnCtx(e,t){return t||{common:e.parent.common,data:e.data,parsedType:(0,s.getParsedType)(e.data),schemaErrorMap:this._def.errorMap,path:e.path,parent:e.parent}}_processInputParams(e){return{status:new o.ParseStatus,ctx:{common:e.parent.common,data:e.data,parsedType:(0,s.getParsedType)(e.data),schemaErrorMap:this._def.errorMap,path:e.path,parent:e.parent}}}_parseSync(e){const t=this._parse(e);if((0,o.isAsync)(t))throw new Error("Synchronous parse encountered promise.");return t}_parseAsync(e){const t=this._parse(e);return Promise.resolve(t)}parse(e,t){const r=this.safeParse(e,t);if(r.success)return r.data;throw r.error}safeParse(e,t){var r;const n={common:{issues:[],async:null!==(r=null==t?void 0:t.async)&&void 0!==r&&r,contextualErrorMap:null==t?void 0:t.errorMap},path:(null==t?void 0:t.path)||[],schemaErrorMap:this._def.errorMap,parent:null,data:e,parsedType:(0,s.getParsedType)(e)},i=this._parseSync({data:e,path:n.path,parent:n});return u(n,i)}async parseAsync(e,t){const r=await this.safeParseAsync(e,t);if(r.success)return r.data;throw r.error}async safeParseAsync(e,t){const r={common:{issues:[],contextualErrorMap:null==t?void 0:t.errorMap,async:!0},path:(null==t?void 0:t.path)||[],schemaErrorMap:this._def.errorMap,parent:null,data:e,parsedType:(0,s.getParsedType)(e)},n=this._parse({data:e,path:r.path,parent:r}),i=await((0,o.isAsync)(n)?n:Promise.resolve(n));return u(r,i)}refine(e,t){const r=e=>"string"==typeof t||void 0===t?{message:t}:"function"==typeof t?t(e):t;return this._refinement(((t,n)=>{const i=e(t),o=()=>n.addIssue({code:a.ZodIssueCode.custom,...r(t)});return"undefined"!=typeof Promise&&i instanceof Promise?i.then((e=>!!e||(o(),!1))):!!i||(o(),!1)}))}refinement(e,t){return this._refinement(((r,n)=>!!e(r)||(n.addIssue("function"==typeof t?t(r,n):t),!1)))}_refinement(e){return new Y({schema:this,typeName:ae.ZodEffects,effect:{type:"refinement",refinement:e}})}superRefine(e){return this._refinement(e)}optional(){return $.create(this,this._def)}nullable(){return ee.create(this,this._def)}nullish(){return this.nullable().optional()}array(){return N.create(this,this._def)}promise(){return X.create(this,this._def)}or(e){return D.create([this,e],this._def)}and(e){return H.create(this,e,this._def)}transform(e){return new Y({...d(this._def),schema:this,typeName:ae.ZodEffects,effect:{type:"transform",transform:e}})}default(e){const t="function"==typeof e?e:()=>e;return new te({...d(this._def),innerType:this,defaultValue:t,typeName:ae.ZodDefault})}brand(){return new ie({typeName:ae.ZodBranded,type:this,...d(this._def)})}catch(e){const t="function"==typeof e?e:()=>e;return new re({...d(this._def),innerType:this,catchValue:t,typeName:ae.ZodCatch})}describe(e){return new(0,this.constructor)({...this._def,description:e})}pipe(e){return oe.create(this,e)}readonly(){return se.create(this)}isOptional(){return this.safeParse(void 0).success}isNullable(){return this.safeParse(null).success}}t.ZodType=l,t.Schema=l,t.ZodSchema=l;const h=/^c[^\s-]{8,}$/i,f=/^[a-z][a-z0-9]*$/,p=/[0-9A-HJKMNP-TV-Z]{26}/,m=/^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i,g=/^(?!\.)(?!.*\.\.)([A-Z0-9_+-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i,y=/^(\p{Extended_Pictographic}|\p{Emoji_Component})+$/u,v=/^(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))$/,b=/^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$/;class E extends l{constructor(){super(...arguments),this._regex=(e,t,r)=>this.refinement((t=>e.test(t)),{validation:t,code:a.ZodIssueCode.invalid_string,...i.errorUtil.errToObj(r)}),this.nonempty=e=>this.min(1,i.errorUtil.errToObj(e)),this.trim=()=>new E({...this._def,checks:[...this._def.checks,{kind:"trim"}]}),this.toLowerCase=()=>new E({...this._def,checks:[...this._def.checks,{kind:"toLowerCase"}]}),this.toUpperCase=()=>new E({...this._def,checks:[...this._def.checks,{kind:"toUpperCase"}]})}_parse(e){if(this._def.coerce&&(e.data=String(e.data)),this._getType(e)!==s.ZodParsedType.string){const t=this._getOrReturnCtx(e);return(0,o.addIssueToContext)(t,{code:a.ZodIssueCode.invalid_type,expected:s.ZodParsedType.string,received:t.parsedType}),o.INVALID}const t=new o.ParseStatus;let r;for(const u of this._def.checks)if("min"===u.kind)e.data.length<u.value&&(r=this._getOrReturnCtx(e,r),(0,o.addIssueToContext)(r,{code:a.ZodIssueCode.too_small,minimum:u.value,type:"string",inclusive:!0,exact:!1,message:u.message}),t.dirty());else if("max"===u.kind)e.data.length>u.value&&(r=this._getOrReturnCtx(e,r),(0,o.addIssueToContext)(r,{code:a.ZodIssueCode.too_big,maximum:u.value,type:"string",inclusive:!0,exact:!1,message:u.message}),t.dirty());else if("length"===u.kind){const n=e.data.length>u.value,i=e.data.length<u.value;(n||i)&&(r=this._getOrReturnCtx(e,r),n?(0,o.addIssueToContext)(r,{code:a.ZodIssueCode.too_big,maximum:u.value,type:"string",inclusive:!0,exact:!0,message:u.message}):i&&(0,o.addIssueToContext)(r,{code:a.ZodIssueCode.too_small,minimum:u.value,type:"string",inclusive:!0,exact:!0,message:u.message}),t.dirty())}else if("email"===u.kind)g.test(e.data)||(r=this._getOrReturnCtx(e,r),(0,o.addIssueToContext)(r,{validation:"email",code:a.ZodIssueCode.invalid_string,message:u.message}),t.dirty());else if("emoji"===u.kind)y.test(e.data)||(r=this._getOrReturnCtx(e,r),(0,o.addIssueToContext)(r,{validation:"emoji",code:a.ZodIssueCode.invalid_string,message:u.message}),t.dirty());else if("uuid"===u.kind)m.test(e.data)||(r=this._getOrReturnCtx(e,r),(0,o.addIssueToContext)(r,{validation:"uuid",code:a.ZodIssueCode.invalid_string,message:u.message}),t.dirty());else if("cuid"===u.kind)h.test(e.data)||(r=this._getOrReturnCtx(e,r),(0,o.addIssueToContext)(r,{validation:"cuid",code:a.ZodIssueCode.invalid_string,message:u.message}),t.dirty());else if("cuid2"===u.kind)f.test(e.data)||(r=this._getOrReturnCtx(e,r),(0,o.addIssueToContext)(r,{validation:"cuid2",code:a.ZodIssueCode.invalid_string,message:u.message}),t.dirty());else if("ulid"===u.kind)p.test(e.data)||(r=this._getOrReturnCtx(e,r),(0,o.addIssueToContext)(r,{validation:"ulid",code:a.ZodIssueCode.invalid_string,message:u.message}),t.dirty());else if("url"===u.kind)try{new URL(e.data)}catch(n){r=this._getOrReturnCtx(e,r),(0,o.addIssueToContext)(r,{validation:"url",code:a.ZodIssueCode.invalid_string,message:u.message}),t.dirty()}else"regex"===u.kind?(u.regex.lastIndex=0,u.regex.test(e.data)||(r=this._getOrReturnCtx(e,r),(0,o.addIssueToContext)(r,{validation:"regex",code:a.ZodIssueCode.invalid_string,message:u.message}),t.dirty())):"trim"===u.kind?e.data=e.data.trim():"includes"===u.kind?e.data.includes(u.value,u.position)||(r=this._getOrReturnCtx(e,r),(0,o.addIssueToContext)(r,{code:a.ZodIssueCode.invalid_string,validation:{includes:u.value,position:u.position},message:u.message}),t.dirty()):"toLowerCase"===u.kind?e.data=e.data.toLowerCase():"toUpperCase"===u.kind?e.data=e.data.toUpperCase():"startsWith"===u.kind?e.data.startsWith(u.value)||(r=this._getOrReturnCtx(e,r),(0,o.addIssueToContext)(r,{code:a.ZodIssueCode.invalid_string,validation:{startsWith:u.value},message:u.message}),t.dirty()):"endsWith"===u.kind?e.data.endsWith(u.value)||(r=this._getOrReturnCtx(e,r),(0,o.addIssueToContext)(r,{code:a.ZodIssueCode.invalid_string,validation:{endsWith:u.value},message:u.message}),t.dirty()):"datetime"===u.kind?((c=u).precision?c.offset?new RegExp(`^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{${c.precision}}(([+-]\\d{2}(:?\\d{2})?)|Z)$`):new RegExp(`^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{${c.precision}}Z$`):0===c.precision?c.offset?new RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(([+-]\\d{2}(:?\\d{2})?)|Z)$"):new RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$"):c.offset?new RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?(([+-]\\d{2}(:?\\d{2})?)|Z)$"):new RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?Z$")).test(e.data)||(r=this._getOrReturnCtx(e,r),(0,o.addIssueToContext)(r,{code:a.ZodIssueCode.invalid_string,validation:"datetime",message:u.message}),t.dirty()):"ip"===u.kind?(n=e.data,("v4"!==(i=u.version)&&i||!v.test(n))&&("v6"!==i&&i||!b.test(n))&&(r=this._getOrReturnCtx(e,r),(0,o.addIssueToContext)(r,{validation:"ip",code:a.ZodIssueCode.invalid_string,message:u.message}),t.dirty())):s.util.assertNever(u);var n,i,c;return{status:t.value,value:e.data}}_addCheck(e){return new E({...this._def,checks:[...this._def.checks,e]})}email(e){return this._addCheck({kind:"email",...i.errorUtil.errToObj(e)})}url(e){return this._addCheck({kind:"url",...i.errorUtil.errToObj(e)})}emoji(e){return this._addCheck({kind:"emoji",...i.errorUtil.errToObj(e)})}uuid(e){return this._addCheck({kind:"uuid",...i.errorUtil.errToObj(e)})}cuid(e){return this._addCheck({kind:"cuid",...i.errorUtil.errToObj(e)})}cuid2(e){return this._addCheck({kind:"cuid2",...i.errorUtil.errToObj(e)})}ulid(e){return this._addCheck({kind:"ulid",...i.errorUtil.errToObj(e)})}ip(e){return this._addCheck({kind:"ip",...i.errorUtil.errToObj(e)})}datetime(e){var t;return"string"==typeof e?this._addCheck({kind:"datetime",precision:null,offset:!1,message:e}):this._addCheck({kind:"datetime",precision:void 0===(null==e?void 0:e.precision)?null:null==e?void 0:e.precision,offset:null!==(t=null==e?void 0:e.offset)&&void 0!==t&&t,...i.errorUtil.errToObj(null==e?void 0:e.message)})}regex(e,t){return this._addCheck({kind:"regex",regex:e,...i.errorUtil.errToObj(t)})}includes(e,t){return this._addCheck({kind:"includes",value:e,position:null==t?void 0:t.position,...i.errorUtil.errToObj(null==t?void 0:t.message)})}startsWith(e,t){return this._addCheck({kind:"startsWith",value:e,...i.errorUtil.errToObj(t)})}endsWith(e,t){return this._addCheck({kind:"endsWith",value:e,...i.errorUtil.errToObj(t)})}min(e,t){return this._addCheck({kind:"min",value:e,...i.errorUtil.errToObj(t)})}max(e,t){return this._addCheck({kind:"max",value:e,...i.errorUtil.errToObj(t)})}length(e,t){return this._addCheck({kind:"length",value:e,...i.errorUtil.errToObj(t)})}get isDatetime(){return!!this._def.checks.find((e=>"datetime"===e.kind))}get isEmail(){return!!this._def.checks.find((e=>"email"===e.kind))}get isURL(){return!!this._def.checks.find((e=>"url"===e.kind))}get isEmoji(){return!!this._def.checks.find((e=>"emoji"===e.kind))}get isUUID(){return!!this._def.checks.find((e=>"uuid"===e.kind))}get isCUID(){return!!this._def.checks.find((e=>"cuid"===e.kind))}get isCUID2(){return!!this._def.checks.find((e=>"cuid2"===e.kind))}get isULID(){return!!this._def.checks.find((e=>"ulid"===e.kind))}get isIP(){return!!this._def.checks.find((e=>"ip"===e.kind))}get minLength(){let e=null;for(const t of this._def.checks)"min"===t.kind&&(null===e||t.value>e)&&(e=t.value);return e}get maxLength(){let e=null;for(const t of this._def.checks)"max"===t.kind&&(null===e||t.value<e)&&(e=t.value);return e}}function _(e,t){const r=(e.toString().split(".")[1]||"").length,n=(t.toString().split(".")[1]||"").length,i=r>n?r:n;return parseInt(e.toFixed(i).replace(".",""))%parseInt(t.toFixed(i).replace(".",""))/Math.pow(10,i)}t.ZodString=E,E.create=e=>{var t;return new E({checks:[],typeName:ae.ZodString,coerce:null!==(t=null==e?void 0:e.coerce)&&void 0!==t&&t,...d(e)})};class A extends l{constructor(){super(...arguments),this.min=this.gte,this.max=this.lte,this.step=this.multipleOf}_parse(e){if(this._def.coerce&&(e.data=Number(e.data)),this._getType(e)!==s.ZodParsedType.number){const t=this._getOrReturnCtx(e);return(0,o.addIssueToContext)(t,{code:a.ZodIssueCode.invalid_type,expected:s.ZodParsedType.number,received:t.parsedType}),o.INVALID}let t;const r=new o.ParseStatus;for(const n of this._def.checks)"int"===n.kind?s.util.isInteger(e.data)||(t=this._getOrReturnCtx(e,t),(0,o.addIssueToContext)(t,{code:a.ZodIssueCode.invalid_type,expected:"integer",received:"float",message:n.message}),r.dirty()):"min"===n.kind?(n.inclusive?e.data<n.value:e.data<=n.value)&&(t=this._getOrReturnCtx(e,t),(0,o.addIssueToContext)(t,{code:a.ZodIssueCode.too_small,minimum:n.value,type:"number",inclusive:n.inclusive,exact:!1,message:n.message}),r.dirty()):"max"===n.kind?(n.inclusive?e.data>n.value:e.data>=n.value)&&(t=this._getOrReturnCtx(e,t),(0,o.addIssueToContext)(t,{code:a.ZodIssueCode.too_big,maximum:n.value,type:"number",inclusive:n.inclusive,exact:!1,message:n.message}),r.dirty()):"multipleOf"===n.kind?0!==_(e.data,n.value)&&(t=this._getOrReturnCtx(e,t),(0,o.addIssueToContext)(t,{code:a.ZodIssueCode.not_multiple_of,multipleOf:n.value,message:n.message}),r.dirty()):"finite"===n.kind?Number.isFinite(e.data)||(t=this._getOrReturnCtx(e,t),(0,o.addIssueToContext)(t,{code:a.ZodIssueCode.not_finite,message:n.message}),r.dirty()):s.util.assertNever(n);return{status:r.value,value:e.data}}gte(e,t){return this.setLimit("min",e,!0,i.errorUtil.toString(t))}gt(e,t){return this.setLimit("min",e,!1,i.errorUtil.toString(t))}lte(e,t){return this.setLimit("max",e,!0,i.errorUtil.toString(t))}lt(e,t){return this.setLimit("max",e,!1,i.errorUtil.toString(t))}setLimit(e,t,r,n){return new A({...this._def,checks:[...this._def.checks,{kind:e,value:t,inclusive:r,message:i.errorUtil.toString(n)}]})}_addCheck(e){return new A({...this._def,checks:[...this._def.checks,e]})}int(e){return this._addCheck({kind:"int",message:i.errorUtil.toString(e)})}positive(e){return this._addCheck({kind:"min",value:0,inclusive:!1,message:i.errorUtil.toString(e)})}negative(e){return this._addCheck({kind:"max",value:0,inclusive:!1,message:i.errorUtil.toString(e)})}nonpositive(e){return this._addCheck({kind:"max",value:0,inclusive:!0,message:i.errorUtil.toString(e)})}nonnegative(e){return this._addCheck({kind:"min",value:0,inclusive:!0,message:i.errorUtil.toString(e)})}multipleOf(e,t){return this._addCheck({kind:"multipleOf",value:e,message:i.errorUtil.toString(t)})}finite(e){return this._addCheck({kind:"finite",message:i.errorUtil.toString(e)})}safe(e){return this._addCheck({kind:"min",inclusive:!0,value:Number.MIN_SAFE_INTEGER,message:i.errorUtil.toString(e)})._addCheck({kind:"max",inclusive:!0,value:Number.MAX_SAFE_INTEGER,message:i.errorUtil.toString(e)})}get minValue(){let e=null;for(const t of this._def.checks)"min"===t.kind&&(null===e||t.value>e)&&(e=t.value);return e}get maxValue(){let e=null;for(const t of this._def.checks)"max"===t.kind&&(null===e||t.value<e)&&(e=t.value);return e}get isInt(){return!!this._def.checks.find((e=>"int"===e.kind||"multipleOf"===e.kind&&s.util.isInteger(e.value)))}get isFinite(){let e=null,t=null;for(const r of this._def.checks){if("finite"===r.kind||"int"===r.kind||"multipleOf"===r.kind)return!0;"min"===r.kind?(null===t||r.value>t)&&(t=r.value):"max"===r.kind&&(null===e||r.value<e)&&(e=r.value)}return Number.isFinite(t)&&Number.isFinite(e)}}t.ZodNumber=A,A.create=e=>new A({checks:[],typeName:ae.ZodNumber,coerce:(null==e?void 0:e.coerce)||!1,...d(e)});class T extends l{constructor(){super(...arguments),this.min=this.gte,this.max=this.lte}_parse(e){if(this._def.coerce&&(e.data=BigInt(e.data)),this._getType(e)!==s.ZodParsedType.bigint){const t=this._getOrReturnCtx(e);return(0,o.addIssueToContext)(t,{code:a.ZodIssueCode.invalid_type,expected:s.ZodParsedType.bigint,received:t.parsedType}),o.INVALID}let t;const r=new o.ParseStatus;for(const n of this._def.checks)"min"===n.kind?(n.inclusive?e.data<n.value:e.data<=n.value)&&(t=this._getOrReturnCtx(e,t),(0,o.addIssueToContext)(t,{code:a.ZodIssueCode.too_small,type:"bigint",minimum:n.value,inclusive:n.inclusive,message:n.message}),r.dirty()):"max"===n.kind?(n.inclusive?e.data>n.value:e.data>=n.value)&&(t=this._getOrReturnCtx(e,t),(0,o.addIssueToContext)(t,{code:a.ZodIssueCode.too_big,type:"bigint",maximum:n.value,inclusive:n.inclusive,message:n.message}),r.dirty()):"multipleOf"===n.kind?e.data%n.value!==BigInt(0)&&(t=this._getOrReturnCtx(e,t),(0,o.addIssueToContext)(t,{code:a.ZodIssueCode.not_multiple_of,multipleOf:n.value,message:n.message}),r.dirty()):s.util.assertNever(n);return{status:r.value,value:e.data}}gte(e,t){return this.setLimit("min",e,!0,i.errorUtil.toString(t))}gt(e,t){return this.setLimit("min",e,!1,i.errorUtil.toString(t))}lte(e,t){return this.setLimit("max",e,!0,i.errorUtil.toString(t))}lt(e,t){return this.setLimit("max",e,!1,i.errorUtil.toString(t))}setLimit(e,t,r,n){return new T({...this._def,checks:[...this._def.checks,{kind:e,value:t,inclusive:r,message:i.errorUtil.toString(n)}]})}_addCheck(e){return new T({...this._def,checks:[...this._def.checks,e]})}positive(e){return this._addCheck({kind:"min",value:BigInt(0),inclusive:!1,message:i.errorUtil.toString(e)})}negative(e){return this._addCheck({kind:"max",value:BigInt(0),inclusive:!1,message:i.errorUtil.toString(e)})}nonpositive(e){return this._addCheck({kind:"max",value:BigInt(0),inclusive:!0,message:i.errorUtil.toString(e)})}nonnegative(e){return this._addCheck({kind:"min",value:BigInt(0),inclusive:!0,message:i.errorUtil.toString(e)})}multipleOf(e,t){return this._addCheck({kind:"multipleOf",value:e,message:i.errorUtil.toString(t)})}get minValue(){let e=null;for(const t of this._def.checks)"min"===t.kind&&(null===e||t.value>e)&&(e=t.value);return e}get maxValue(){let e=null;for(const t of this._def.checks)"max"===t.kind&&(null===e||t.value<e)&&(e=t.value);return e}}t.ZodBigInt=T,T.create=e=>{var t;return new T({checks:[],typeName:ae.ZodBigInt,coerce:null!==(t=null==e?void 0:e.coerce)&&void 0!==t&&t,...d(e)})};class I extends l{_parse(e){if(this._def.coerce&&(e.data=Boolean(e.data)),this._getType(e)!==s.ZodParsedType.boolean){const t=this._getOrReturnCtx(e);return(0,o.addIssueToContext)(t,{code:a.ZodIssueCode.invalid_type,expected:s.ZodParsedType.boolean,received:t.parsedType}),o.INVALID}return(0,o.OK)(e.data)}}t.ZodBoolean=I,I.create=e=>new I({typeName:ae.ZodBoolean,coerce:(null==e?void 0:e.coerce)||!1,...d(e)});class R extends l{_parse(e){if(this._def.coerce&&(e.data=new Date(e.data)),this._getType(e)!==s.ZodParsedType.date){const t=this._getOrReturnCtx(e);return(0,o.addIssueToContext)(t,{code:a.ZodIssueCode.invalid_type,expected:s.ZodParsedType.date,received:t.parsedType}),o.INVALID}if(isNaN(e.data.getTime())){const t=this._getOrReturnCtx(e);return(0,o.addIssueToContext)(t,{code:a.ZodIssueCode.invalid_date}),o.INVALID}const t=new o.ParseStatus;let r;for(const n of this._def.checks)"min"===n.kind?e.data.getTime()<n.value&&(r=this._getOrReturnCtx(e,r),(0,o.addIssueToContext)(r,{code:a.ZodIssueCode.too_small,message:n.message,inclusive:!0,exact:!1,minimum:n.value,type:"date"}),t.dirty()):"max"===n.kind?e.data.getTime()>n.value&&(r=this._getOrReturnCtx(e,r),(0,o.addIssueToContext)(r,{code:a.ZodIssueCode.too_big,message:n.message,inclusive:!0,exact:!1,maximum:n.value,type:"date"}),t.dirty()):s.util.assertNever(n);return{status:t.value,value:new Date(e.data.getTime())}}_addCheck(e){return new R({...this._def,checks:[...this._def.checks,e]})}min(e,t){return this._addCheck({kind:"min",value:e.getTime(),message:i.errorUtil.toString(t)})}max(e,t){return this._addCheck({kind:"max",value:e.getTime(),message:i.errorUtil.toString(t)})}get minDate(){let e=null;for(const t of this._def.checks)"min"===t.kind&&(null===e||t.value>e)&&(e=t.value);return null!=e?new Date(e):null}get maxDate(){let e=null;for(const t of this._def.checks)"max"===t.kind&&(null===e||t.value<e)&&(e=t.value);return null!=e?new Date(e):null}}t.ZodDate=R,R.create=e=>new R({checks:[],coerce:(null==e?void 0:e.coerce)||!1,typeName:ae.ZodDate,...d(e)});class w extends l{_parse(e){if(this._getType(e)!==s.ZodParsedType.symbol){const t=this._getOrReturnCtx(e);return(0,o.addIssueToContext)(t,{code:a.ZodIssueCode.invalid_type,expected:s.ZodParsedType.symbol,received:t.parsedType}),o.INVALID}return(0,o.OK)(e.data)}}t.ZodSymbol=w,w.create=e=>new w({typeName:ae.ZodSymbol,...d(e)});class P extends l{_parse(e){if(this._getType(e)!==s.ZodParsedType.undefined){const t=this._getOrReturnCtx(e);return(0,o.addIssueToContext)(t,{code:a.ZodIssueCode.invalid_type,expected:s.ZodParsedType.undefined,received:t.parsedType}),o.INVALID}return(0,o.OK)(e.data)}}t.ZodUndefined=P,P.create=e=>new P({typeName:ae.ZodUndefined,...d(e)});class x extends l{_parse(e){if(this._getType(e)!==s.ZodParsedType.null){const t=this._getOrReturnCtx(e);return(0,o.addIssueToContext)(t,{code:a.ZodIssueCode.invalid_type,expected:s.ZodParsedType.null,received:t.parsedType}),o.INVALID}return(0,o.OK)(e.data)}}t.ZodNull=x,x.create=e=>new x({typeName:ae.ZodNull,...d(e)});class S extends l{constructor(){super(...arguments),this._any=!0}_parse(e){return(0,o.OK)(e.data)}}t.ZodAny=S,S.create=e=>new S({typeName:ae.ZodAny,...d(e)});class O extends l{constructor(){super(...arguments),this._unknown=!0}_parse(e){return(0,o.OK)(e.data)}}t.ZodUnknown=O,O.create=e=>new O({typeName:ae.ZodUnknown,...d(e)});class C extends l{_parse(e){const t=this._getOrReturnCtx(e);return(0,o.addIssueToContext)(t,{code:a.ZodIssueCode.invalid_type,expected:s.ZodParsedType.never,received:t.parsedType}),o.INVALID}}t.ZodNever=C,C.create=e=>new C({typeName:ae.ZodNever,...d(e)});class B extends l{_parse(e){if(this._getType(e)!==s.ZodParsedType.undefined){const t=this._getOrReturnCtx(e);return(0,o.addIssueToContext)(t,{code:a.ZodIssueCode.invalid_type,expected:s.ZodParsedType.void,received:t.parsedType}),o.INVALID}return(0,o.OK)(e.data)}}t.ZodVoid=B,B.create=e=>new B({typeName:ae.ZodVoid,...d(e)});class N extends l{_parse(e){const{ctx:t,status:r}=this._processInputParams(e),n=this._def;if(t.parsedType!==s.ZodParsedType.array)return(0,o.addIssueToContext)(t,{code:a.ZodIssueCode.invalid_type,expected:s.ZodParsedType.array,received:t.parsedType}),o.INVALID;if(null!==n.exactLength){const e=t.data.length>n.exactLength.value,i=t.data.length<n.exactLength.value;(e||i)&&((0,o.addIssueToContext)(t,{code:e?a.ZodIssueCode.too_big:a.ZodIssueCode.too_small,minimum:i?n.exactLength.value:void 0,maximum:e?n.exactLength.value:void 0,type:"array",inclusive:!0,exact:!0,message:n.exactLength.message}),r.dirty())}if(null!==n.minLength&&t.data.length<n.minLength.value&&((0,o.addIssueToContext)(t,{code:a.ZodIssueCode.too_small,minimum:n.minLength.value,type:"array",inclusive:!0,exact:!1,message:n.minLength.message}),r.dirty()),null!==n.maxLength&&t.data.length>n.maxLength.value&&((0,o.addIssueToContext)(t,{code:a.ZodIssueCode.too_big,maximum:n.maxLength.value,type:"array",inclusive:!0,exact:!1,message:n.maxLength.message}),r.dirty()),t.common.async)return Promise.all([...t.data].map(((e,r)=>n.type._parseAsync(new c(t,e,t.path,r))))).then((e=>o.ParseStatus.mergeArray(r,e)));const i=[...t.data].map(((e,r)=>n.type._parseSync(new c(t,e,t.path,r))));return o.ParseStatus.mergeArray(r,i)}get element(){return this._def.type}min(e,t){return new N({...this._def,minLength:{value:e,message:i.errorUtil.toString(t)}})}max(e,t){return new N({...this._def,maxLength:{value:e,message:i.errorUtil.toString(t)}})}length(e,t){return new N({...this._def,exactLength:{value:e,message:i.errorUtil.toString(t)}})}nonempty(e){return this.min(1,e)}}function k(e){if(e instanceof M){const t={};for(const r in e.shape){const n=e.shape[r];t[r]=$.create(k(n))}return new M({...e._def,shape:()=>t})}return e instanceof N?new N({...e._def,type:k(e.element)}):e instanceof $?$.create(k(e.unwrap())):e instanceof ee?ee.create(k(e.unwrap())):e instanceof U?U.create(e.items.map((e=>k(e)))):e}t.ZodArray=N,N.create=(e,t)=>new N({type:e,minLength:null,maxLength:null,exactLength:null,typeName:ae.ZodArray,...d(t)});class M extends l{constructor(){super(...arguments),this._cached=null,this.nonstrict=this.passthrough,this.augment=this.extend}_getCached(){if(null!==this._cached)return this._cached;const e=this._def.shape(),t=s.util.objectKeys(e);return this._cached={shape:e,keys:t}}_parse(e){if(this._getType(e)!==s.ZodParsedType.object){const t=this._getOrReturnCtx(e);return(0,o.addIssueToContext)(t,{code:a.ZodIssueCode.invalid_type,expected:s.ZodParsedType.object,received:t.parsedType}),o.INVALID}const{status:t,ctx:r}=this._processInputParams(e),{shape:n,keys:i}=this._getCached(),u=[];if(!(this._def.catchall instanceof C&&"strip"===this._def.unknownKeys))for(const e in r.data)i.includes(e)||u.push(e);const d=[];for(const e of i){const t=n[e],i=r.data[e];d.push({key:{status:"valid",value:e},value:t._parse(new c(r,i,r.path,e)),alwaysSet:e in r.data})}if(this._def.catchall instanceof C){const e=this._def.unknownKeys;if("passthrough"===e)for(const e of u)d.push({key:{status:"valid",value:e},value:{status:"valid",value:r.data[e]}});else if("strict"===e)u.length>0&&((0,o.addIssueToContext)(r,{code:a.ZodIssueCode.unrecognized_keys,keys:u}),t.dirty());else if("strip"!==e)throw new Error("Internal ZodObject error: invalid unknownKeys value.")}else{const e=this._def.catchall;for(const t of u){const n=r.data[t];d.push({key:{status:"valid",value:t},value:e._parse(new c(r,n,r.path,t)),alwaysSet:t in r.data})}}return r.common.async?Promise.resolve().then((async()=>{const e=[];for(const t of d){const r=await t.key;e.push({key:r,value:await t.value,alwaysSet:t.alwaysSet})}return e})).then((e=>o.ParseStatus.mergeObjectSync(t,e))):o.ParseStatus.mergeObjectSync(t,d)}get shape(){return this._def.shape()}strict(e){return i.errorUtil.errToObj,new M({...this._def,unknownKeys:"strict",...void 0!==e?{errorMap:(t,r)=>{var n,o,s,a;const c=null!==(s=null===(o=(n=this._def).errorMap)||void 0===o?void 0:o.call(n,t,r).message)&&void 0!==s?s:r.defaultError;return"unrecognized_keys"===t.code?{message:null!==(a=i.errorUtil.errToObj(e).message)&&void 0!==a?a:c}:{message:c}}}:{}})}strip(){return new M({...this._def,unknownKeys:"strip"})}passthrough(){return new M({...this._def,unknownKeys:"passthrough"})}extend(e){return new M({...this._def,shape:()=>({...this._def.shape(),...e})})}merge(e){return new M({unknownKeys:e._def.unknownKeys,catchall:e._def.catchall,shape:()=>({...this._def.shape(),...e._def.shape()}),typeName:ae.ZodObject})}setKey(e,t){return this.augment({[e]:t})}catchall(e){return new M({...this._def,catchall:e})}pick(e){const t={};return s.util.objectKeys(e).forEach((r=>{e[r]&&this.shape[r]&&(t[r]=this.shape[r])})),new M({...this._def,shape:()=>t})}omit(e){const t={};return s.util.objectKeys(this.shape).forEach((r=>{e[r]||(t[r]=this.shape[r])})),new M({...this._def,shape:()=>t})}deepPartial(){return k(this)}partial(e){const t={};return s.util.objectKeys(this.shape).forEach((r=>{const n=this.shape[r];e&&!e[r]?t[r]=n:t[r]=n.optional()})),new M({...this._def,shape:()=>t})}required(e){const t={};return s.util.objectKeys(this.shape).forEach((r=>{if(e&&!e[r])t[r]=this.shape[r];else{let e=this.shape[r];for(;e instanceof $;)e=e._def.innerType;t[r]=e}})),new M({...this._def,shape:()=>t})}keyof(){return K(s.util.objectKeys(this.shape))}}t.ZodObject=M,M.create=(e,t)=>new M({shape:()=>e,unknownKeys:"strip",catchall:C.create(),typeName:ae.ZodObject,...d(t)}),M.strictCreate=(e,t)=>new M({shape:()=>e,unknownKeys:"strict",catchall:C.create(),typeName:ae.ZodObject,...d(t)}),M.lazycreate=(e,t)=>new M({shape:e,unknownKeys:"strip",catchall:C.create(),typeName:ae.ZodObject,...d(t)});class D extends l{_parse(e){const{ctx:t}=this._processInputParams(e),r=this._def.options;if(t.common.async)return Promise.all(r.map((async e=>{const r={...t,common:{...t.common,issues:[]},parent:null};return{result:await e._parseAsync({data:t.data,path:t.path,parent:r}),ctx:r}}))).then((function(e){for(const t of e)if("valid"===t.result.status)return t.result;for(const r of e)if("dirty"===r.result.status)return t.common.issues.push(...r.ctx.common.issues),r.result;const r=e.map((e=>new a.ZodError(e.ctx.common.issues)));return(0,o.addIssueToContext)(t,{code:a.ZodIssueCode.invalid_union,unionErrors:r}),o.INVALID}));{let e;const n=[];for(const i of r){const r={...t,common:{...t.common,issues:[]},parent:null},o=i._parseSync({data:t.data,path:t.path,parent:r});if("valid"===o.status)return o;"dirty"!==o.status||e||(e={result:o,ctx:r}),r.common.issues.length&&n.push(r.common.issues)}if(e)return t.common.issues.push(...e.ctx.common.issues),e.result;const i=n.map((e=>new a.ZodError(e)));return(0,o.addIssueToContext)(t,{code:a.ZodIssueCode.invalid_union,unionErrors:i}),o.INVALID}}get options(){return this._def.options}}t.ZodUnion=D,D.create=(e,t)=>new D({options:e,typeName:ae.ZodUnion,...d(t)});const L=e=>e instanceof q?L(e.schema):e instanceof Y?L(e.innerType()):e instanceof z?[e.value]:e instanceof Q?e.options:e instanceof J?Object.keys(e.enum):e instanceof te?L(e._def.innerType):e instanceof P?[void 0]:e instanceof x?[null]:null;class F extends l{_parse(e){const{ctx:t}=this._processInputParams(e);if(t.parsedType!==s.ZodParsedType.object)return(0,o.addIssueToContext)(t,{code:a.ZodIssueCode.invalid_type,expected:s.ZodParsedType.object,received:t.parsedType}),o.INVALID;const r=this.discriminator,n=t.data[r],i=this.optionsMap.get(n);return i?t.common.async?i._parseAsync({data:t.data,path:t.path,parent:t}):i._parseSync({data:t.data,path:t.path,parent:t}):((0,o.addIssueToContext)(t,{code:a.ZodIssueCode.invalid_union_discriminator,options:Array.from(this.optionsMap.keys()),path:[r]}),o.INVALID)}get discriminator(){return this._def.discriminator}get options(){return this._def.options}get optionsMap(){return this._def.optionsMap}static create(e,t,r){const n=new Map;for(const r of t){const t=L(r.shape[e]);if(!t)throw new Error(`A discriminator value for key \`${e}\` could not be extracted from all schema options`);for(const i of t){if(n.has(i))throw new Error(`Discriminator property ${String(e)} has duplicate value ${String(i)}`);n.set(i,r)}}return new F({typeName:ae.ZodDiscriminatedUnion,discriminator:e,options:t,optionsMap:n,...d(r)})}}function j(e,t){const r=(0,s.getParsedType)(e),n=(0,s.getParsedType)(t);if(e===t)return{valid:!0,data:e};if(r===s.ZodParsedType.object&&n===s.ZodParsedType.object){const r=s.util.objectKeys(t),n=s.util.objectKeys(e).filter((e=>-1!==r.indexOf(e))),i={...e,...t};for(const r of n){const n=j(e[r],t[r]);if(!n.valid)return{valid:!1};i[r]=n.data}return{valid:!0,data:i}}if(r===s.ZodParsedType.array&&n===s.ZodParsedType.array){if(e.length!==t.length)return{valid:!1};const r=[];for(let n=0;n<e.length;n++){const i=j(e[n],t[n]);if(!i.valid)return{valid:!1};r.push(i.data)}return{valid:!0,data:r}}return r===s.ZodParsedType.date&&n===s.ZodParsedType.date&&+e==+t?{valid:!0,data:e}:{valid:!1}}t.ZodDiscriminatedUnion=F;class H extends l{_parse(e){const{status:t,ctx:r}=this._processInputParams(e),n=(e,n)=>{if((0,o.isAborted)(e)||(0,o.isAborted)(n))return o.INVALID;const i=j(e.value,n.value);return i.valid?(((0,o.isDirty)(e)||(0,o.isDirty)(n))&&t.dirty(),{status:t.value,value:i.data}):((0,o.addIssueToContext)(r,{code:a.ZodIssueCode.invalid_intersection_types}),o.INVALID)};return r.common.async?Promise.all([this._def.left._parseAsync({data:r.data,path:r.path,parent:r}),this._def.right._parseAsync({data:r.data,path:r.path,parent:r})]).then((([e,t])=>n(e,t))):n(this._def.left._parseSync({data:r.data,path:r.path,parent:r}),this._def.right._parseSync({data:r.data,path:r.path,parent:r}))}}t.ZodIntersection=H,H.create=(e,t,r)=>new H({left:e,right:t,typeName:ae.ZodIntersection,...d(r)});class U extends l{_parse(e){const{status:t,ctx:r}=this._processInputParams(e);if(r.parsedType!==s.ZodParsedType.array)return(0,o.addIssueToContext)(r,{code:a.ZodIssueCode.invalid_type,expected:s.ZodParsedType.array,received:r.parsedType}),o.INVALID;if(r.data.length<this._def.items.length)return(0,o.addIssueToContext)(r,{code:a.ZodIssueCode.too_small,minimum:this._def.items.length,inclusive:!0,exact:!1,type:"array"}),o.INVALID;!this._def.rest&&r.data.length>this._def.items.length&&((0,o.addIssueToContext)(r,{code:a.ZodIssueCode.too_big,maximum:this._def.items.length,inclusive:!0,exact:!1,type:"array"}),t.dirty());const n=[...r.data].map(((e,t)=>{const n=this._def.items[t]||this._def.rest;return n?n._parse(new c(r,e,r.path,t)):null})).filter((e=>!!e));return r.common.async?Promise.all(n).then((e=>o.ParseStatus.mergeArray(t,e))):o.ParseStatus.mergeArray(t,n)}get items(){return this._def.items}rest(e){return new U({...this._def,rest:e})}}t.ZodTuple=U,U.create=(e,t)=>{if(!Array.isArray(e))throw new Error("You must pass an array of schemas to z.tuple([ ... ])");return new U({items:e,typeName:ae.ZodTuple,rest:null,...d(t)})};class G extends l{get keySchema(){return this._def.keyType}get valueSchema(){return this._def.valueType}_parse(e){const{status:t,ctx:r}=this._processInputParams(e);if(r.parsedType!==s.ZodParsedType.object)return(0,o.addIssueToContext)(r,{code:a.ZodIssueCode.invalid_type,expected:s.ZodParsedType.object,received:r.parsedType}),o.INVALID;const n=[],i=this._def.keyType,u=this._def.valueType;for(const e in r.data)n.push({key:i._parse(new c(r,e,r.path,e)),value:u._parse(new c(r,r.data[e],r.path,e))});return r.common.async?o.ParseStatus.mergeObjectAsync(t,n):o.ParseStatus.mergeObjectSync(t,n)}get element(){return this._def.valueType}static create(e,t,r){return new G(t instanceof l?{keyType:e,valueType:t,typeName:ae.ZodRecord,...d(r)}:{keyType:E.create(),valueType:e,typeName:ae.ZodRecord,...d(t)})}}t.ZodRecord=G;class V extends l{get keySchema(){return this._def.keyType}get valueSchema(){return this._def.valueType}_parse(e){const{status:t,ctx:r}=this._processInputParams(e);if(r.parsedType!==s.ZodParsedType.map)return(0,o.addIssueToContext)(r,{code:a.ZodIssueCode.invalid_type,expected:s.ZodParsedType.map,received:r.parsedType}),o.INVALID;const n=this._def.keyType,i=this._def.valueType,u=[...r.data.entries()].map((([e,t],o)=>({key:n._parse(new c(r,e,r.path,[o,"key"])),value:i._parse(new c(r,t,r.path,[o,"value"]))})));if(r.common.async){const e=new Map;return Promise.resolve().then((async()=>{for(const r of u){const n=await r.key,i=await r.value;if("aborted"===n.status||"aborted"===i.status)return o.INVALID;"dirty"!==n.status&&"dirty"!==i.status||t.dirty(),e.set(n.value,i.value)}return{status:t.value,value:e}}))}{const e=new Map;for(const r of u){const n=r.key,i=r.value;if("aborted"===n.status||"aborted"===i.status)return o.INVALID;"dirty"!==n.status&&"dirty"!==i.status||t.dirty(),e.set(n.value,i.value)}return{status:t.value,value:e}}}}t.ZodMap=V,V.create=(e,t,r)=>new V({valueType:t,keyType:e,typeName:ae.ZodMap,...d(r)});class Z extends l{_parse(e){const{status:t,ctx:r}=this._processInputParams(e);if(r.parsedType!==s.ZodParsedType.set)return(0,o.addIssueToContext)(r,{code:a.ZodIssueCode.invalid_type,expected:s.ZodParsedType.set,received:r.parsedType}),o.INVALID;const n=this._def;null!==n.minSize&&r.data.size<n.minSize.value&&((0,o.addIssueToContext)(r,{code:a.ZodIssueCode.too_small,minimum:n.minSize.value,type:"set",inclusive:!0,exact:!1,message:n.minSize.message}),t.dirty()),null!==n.maxSize&&r.data.size>n.maxSize.value&&((0,o.addIssueToContext)(r,{code:a.ZodIssueCode.too_big,maximum:n.maxSize.value,type:"set",inclusive:!0,exact:!1,message:n.maxSize.message}),t.dirty());const i=this._def.valueType;function u(e){const r=new Set;for(const n of e){if("aborted"===n.status)return o.INVALID;"dirty"===n.status&&t.dirty(),r.add(n.value)}return{status:t.value,value:r}}const d=[...r.data.values()].map(((e,t)=>i._parse(new c(r,e,r.path,t))));return r.common.async?Promise.all(d).then((e=>u(e))):u(d)}min(e,t){return new Z({...this._def,minSize:{value:e,message:i.errorUtil.toString(t)}})}max(e,t){return new Z({...this._def,maxSize:{value:e,message:i.errorUtil.toString(t)}})}size(e,t){return this.min(e,t).max(e,t)}nonempty(e){return this.min(1,e)}}t.ZodSet=Z,Z.create=(e,t)=>new Z({valueType:e,minSize:null,maxSize:null,typeName:ae.ZodSet,...d(t)});class W extends l{constructor(){super(...arguments),this.validate=this.implement}_parse(e){const{ctx:t}=this._processInputParams(e);if(t.parsedType!==s.ZodParsedType.function)return(0,o.addIssueToContext)(t,{code:a.ZodIssueCode.invalid_type,expected:s.ZodParsedType.function,received:t.parsedType}),o.INVALID;function r(e,r){return(0,o.makeIssue)({data:e,path:t.path,errorMaps:[t.common.contextualErrorMap,t.schemaErrorMap,(0,n.getErrorMap)(),n.defaultErrorMap].filter((e=>!!e)),issueData:{code:a.ZodIssueCode.invalid_arguments,argumentsError:r}})}function i(e,r){return(0,o.makeIssue)({data:e,path:t.path,errorMaps:[t.common.contextualErrorMap,t.schemaErrorMap,(0,n.getErrorMap)(),n.defaultErrorMap].filter((e=>!!e)),issueData:{code:a.ZodIssueCode.invalid_return_type,returnTypeError:r}})}const c={errorMap:t.common.contextualErrorMap},u=t.data;if(this._def.returns instanceof X){const e=this;return(0,o.OK)((async function(...t){const n=new a.ZodError([]),o=await e._def.args.parseAsync(t,c).catch((e=>{throw n.addIssue(r(t,e)),n})),s=await Reflect.apply(u,this,o);return await e._def.returns._def.type.parseAsync(s,c).catch((e=>{throw n.addIssue(i(s,e)),n}))}))}{const e=this;return(0,o.OK)((function(...t){const n=e._def.args.safeParse(t,c);if(!n.success)throw new a.ZodError([r(t,n.error)]);const o=Reflect.apply(u,this,n.data),s=e._def.returns.safeParse(o,c);if(!s.success)throw new a.ZodError([i(o,s.error)]);return s.data}))}}parameters(){return this._def.args}returnType(){return this._def.returns}args(...e){return new W({...this._def,args:U.create(e).rest(O.create())})}returns(e){return new W({...this._def,returns:e})}implement(e){return this.parse(e)}strictImplement(e){return this.parse(e)}static create(e,t,r){return new W({args:e||U.create([]).rest(O.create()),returns:t||O.create(),typeName:ae.ZodFunction,...d(r)})}}t.ZodFunction=W;class q extends l{get schema(){return this._def.getter()}_parse(e){const{ctx:t}=this._processInputParams(e);return this._def.getter()._parse({data:t.data,path:t.path,parent:t})}}t.ZodLazy=q,q.create=(e,t)=>new q({getter:e,typeName:ae.ZodLazy,...d(t)});class z extends l{_parse(e){if(e.data!==this._def.value){const t=this._getOrReturnCtx(e);return(0,o.addIssueToContext)(t,{received:t.data,code:a.ZodIssueCode.invalid_literal,expected:this._def.value}),o.INVALID}return{status:"valid",value:e.data}}get value(){return this._def.value}}function K(e,t){return new Q({values:e,typeName:ae.ZodEnum,...d(t)})}t.ZodLiteral=z,z.create=(e,t)=>new z({value:e,typeName:ae.ZodLiteral,...d(t)});class Q extends l{_parse(e){if("string"!=typeof e.data){const t=this._getOrReturnCtx(e),r=this._def.values;return(0,o.addIssueToContext)(t,{expected:s.util.joinValues(r),received:t.parsedType,code:a.ZodIssueCode.invalid_type}),o.INVALID}if(-1===this._def.values.indexOf(e.data)){const t=this._getOrReturnCtx(e),r=this._def.values;return(0,o.addIssueToContext)(t,{received:t.data,code:a.ZodIssueCode.invalid_enum_value,options:r}),o.INVALID}return(0,o.OK)(e.data)}get options(){return this._def.values}get enum(){const e={};for(const t of this._def.values)e[t]=t;return e}get Values(){const e={};for(const t of this._def.values)e[t]=t;return e}get Enum(){const e={};for(const t of this._def.values)e[t]=t;return e}extract(e){return Q.create(e)}exclude(e){return Q.create(this.options.filter((t=>!e.includes(t))))}}t.ZodEnum=Q,Q.create=K;class J extends l{_parse(e){const t=s.util.getValidEnumValues(this._def.values),r=this._getOrReturnCtx(e);if(r.parsedType!==s.ZodParsedType.string&&r.parsedType!==s.ZodParsedType.number){const e=s.util.objectValues(t);return(0,o.addIssueToContext)(r,{expected:s.util.joinValues(e),received:r.parsedType,code:a.ZodIssueCode.invalid_type}),o.INVALID}if(-1===t.indexOf(e.data)){const e=s.util.objectValues(t);return(0,o.addIssueToContext)(r,{received:r.data,code:a.ZodIssueCode.invalid_enum_value,options:e}),o.INVALID}return(0,o.OK)(e.data)}get enum(){return this._def.values}}t.ZodNativeEnum=J,J.create=(e,t)=>new J({values:e,typeName:ae.ZodNativeEnum,...d(t)});class X extends l{unwrap(){return this._def.type}_parse(e){const{ctx:t}=this._processInputParams(e);if(t.parsedType!==s.ZodParsedType.promise&&!1===t.common.async)return(0,o.addIssueToContext)(t,{code:a.ZodIssueCode.invalid_type,expected:s.ZodParsedType.promise,received:t.parsedType}),o.INVALID;const r=t.parsedType===s.ZodParsedType.promise?t.data:Promise.resolve(t.data);return(0,o.OK)(r.then((e=>this._def.type.parseAsync(e,{path:t.path,errorMap:t.common.contextualErrorMap}))))}}t.ZodPromise=X,X.create=(e,t)=>new X({type:e,typeName:ae.ZodPromise,...d(t)});class Y extends l{innerType(){return this._def.schema}sourceType(){return this._def.schema._def.typeName===ae.ZodEffects?this._def.schema.sourceType():this._def.schema}_parse(e){const{status:t,ctx:r}=this._processInputParams(e),n=this._def.effect||null,i={addIssue:e=>{(0,o.addIssueToContext)(r,e),e.fatal?t.abort():t.dirty()},get path(){return r.path}};if(i.addIssue=i.addIssue.bind(i),"preprocess"===n.type){const e=n.transform(r.data,i);return r.common.issues.length?{status:"dirty",value:r.data}:r.common.async?Promise.resolve(e).then((e=>this._def.schema._parseAsync({data:e,path:r.path,parent:r}))):this._def.schema._parseSync({data:e,path:r.path,parent:r})}if("refinement"===n.type){const e=e=>{const t=n.refinement(e,i);if(r.common.async)return Promise.resolve(t);if(t instanceof Promise)throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");return e};if(!1===r.common.async){const n=this._def.schema._parseSync({data:r.data,path:r.path,parent:r});return"aborted"===n.status?o.INVALID:("dirty"===n.status&&t.dirty(),e(n.value),{status:t.value,value:n.value})}return this._def.schema._parseAsync({data:r.data,path:r.path,parent:r}).then((r=>"aborted"===r.status?o.INVALID:("dirty"===r.status&&t.dirty(),e(r.value).then((()=>({status:t.value,value:r.value}))))))}if("transform"===n.type){if(!1===r.common.async){const e=this._def.schema._parseSync({data:r.data,path:r.path,parent:r});if(!(0,o.isValid)(e))return e;const s=n.transform(e.value,i);if(s instanceof Promise)throw new Error("Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.");return{status:t.value,value:s}}return this._def.schema._parseAsync({data:r.data,path:r.path,parent:r}).then((e=>(0,o.isValid)(e)?Promise.resolve(n.transform(e.value,i)).then((e=>({status:t.value,value:e}))):e))}s.util.assertNever(n)}}t.ZodEffects=Y,t.ZodTransformer=Y,Y.create=(e,t,r)=>new Y({schema:e,typeName:ae.ZodEffects,effect:t,...d(r)}),Y.createWithPreprocess=(e,t,r)=>new Y({schema:t,effect:{type:"preprocess",transform:e},typeName:ae.ZodEffects,...d(r)});class $ extends l{_parse(e){return this._getType(e)===s.ZodParsedType.undefined?(0,o.OK)(void 0):this._def.innerType._parse(e)}unwrap(){return this._def.innerType}}t.ZodOptional=$,$.create=(e,t)=>new $({innerType:e,typeName:ae.ZodOptional,...d(t)});class ee extends l{_parse(e){return this._getType(e)===s.ZodParsedType.null?(0,o.OK)(null):this._def.innerType._parse(e)}unwrap(){return this._def.innerType}}t.ZodNullable=ee,ee.create=(e,t)=>new ee({innerType:e,typeName:ae.ZodNullable,...d(t)});class te extends l{_parse(e){const{ctx:t}=this._processInputParams(e);let r=t.data;return t.parsedType===s.ZodParsedType.undefined&&(r=this._def.defaultValue()),this._def.innerType._parse({data:r,path:t.path,parent:t})}removeDefault(){return this._def.innerType}}t.ZodDefault=te,te.create=(e,t)=>new te({innerType:e,typeName:ae.ZodDefault,defaultValue:"function"==typeof t.default?t.default:()=>t.default,...d(t)});class re extends l{_parse(e){const{ctx:t}=this._processInputParams(e),r={...t,common:{...t.common,issues:[]}},n=this._def.innerType._parse({data:r.data,path:r.path,parent:{...r}});return(0,o.isAsync)(n)?n.then((e=>({status:"valid",value:"valid"===e.status?e.value:this._def.catchValue({get error(){return new a.ZodError(r.common.issues)},input:r.data})}))):{status:"valid",value:"valid"===n.status?n.value:this._def.catchValue({get error(){return new a.ZodError(r.common.issues)},input:r.data})}}removeCatch(){return this._def.innerType}}t.ZodCatch=re,re.create=(e,t)=>new re({innerType:e,typeName:ae.ZodCatch,catchValue:"function"==typeof t.catch?t.catch:()=>t.catch,...d(t)});class ne extends l{_parse(e){if(this._getType(e)!==s.ZodParsedType.nan){const t=this._getOrReturnCtx(e);return(0,o.addIssueToContext)(t,{code:a.ZodIssueCode.invalid_type,expected:s.ZodParsedType.nan,received:t.parsedType}),o.INVALID}return{status:"valid",value:e.data}}}t.ZodNaN=ne,ne.create=e=>new ne({typeName:ae.ZodNaN,...d(e)}),t.BRAND=Symbol("zod_brand");class ie extends l{_parse(e){const{ctx:t}=this._processInputParams(e),r=t.data;return this._def.type._parse({data:r,path:t.path,parent:t})}unwrap(){return this._def.type}}t.ZodBranded=ie;class oe extends l{_parse(e){const{status:t,ctx:r}=this._processInputParams(e);if(r.common.async)return(async()=>{const e=await this._def.in._parseAsync({data:r.data,path:r.path,parent:r});return"aborted"===e.status?o.INVALID:"dirty"===e.status?(t.dirty(),(0,o.DIRTY)(e.value)):this._def.out._parseAsync({data:e.value,path:r.path,parent:r})})();{const e=this._def.in._parseSync({data:r.data,path:r.path,parent:r});return"aborted"===e.status?o.INVALID:"dirty"===e.status?(t.dirty(),{status:"dirty",value:e.value}):this._def.out._parseSync({data:e.value,path:r.path,parent:r})}}static create(e,t){return new oe({in:e,out:t,typeName:ae.ZodPipeline})}}t.ZodPipeline=oe;class se extends l{_parse(e){const t=this._def.innerType._parse(e);return(0,o.isValid)(t)&&(t.value=Object.freeze(t.value)),t}}var ae;t.ZodReadonly=se,se.create=(e,t)=>new se({innerType:e,typeName:ae.ZodReadonly,...d(t)}),t.custom=(e,t={},r)=>e?S.create().superRefine(((n,i)=>{var o,s;if(!e(n)){const e="function"==typeof t?t(n):"string"==typeof t?{message:t}:t,a=null===(s=null!==(o=e.fatal)&&void 0!==o?o:r)||void 0===s||s,c="string"==typeof e?{message:e}:e;i.addIssue({code:"custom",...c,fatal:a})}})):S.create(),t.late={object:M.lazycreate},function(e){e.ZodString="ZodString",e.ZodNumber="ZodNumber",e.ZodNaN="ZodNaN",e.ZodBigInt="ZodBigInt",e.ZodBoolean="ZodBoolean",e.ZodDate="ZodDate",e.ZodSymbol="ZodSymbol",e.ZodUndefined="ZodUndefined",e.ZodNull="ZodNull",e.ZodAny="ZodAny",e.ZodUnknown="ZodUnknown",e.ZodNever="ZodNever",e.ZodVoid="ZodVoid",e.ZodArray="ZodArray",e.ZodObject="ZodObject",e.ZodUnion="ZodUnion",e.ZodDiscriminatedUnion="ZodDiscriminatedUnion",e.ZodIntersection="ZodIntersection",e.ZodTuple="ZodTuple",e.ZodRecord="ZodRecord",e.ZodMap="ZodMap",e.ZodSet="ZodSet",e.ZodFunction="ZodFunction",e.ZodLazy="ZodLazy",e.ZodLiteral="ZodLiteral",e.ZodEnum="ZodEnum",e.ZodEffects="ZodEffects",e.ZodNativeEnum="ZodNativeEnum",e.ZodOptional="ZodOptional",e.ZodNullable="ZodNullable",e.ZodDefault="ZodDefault",e.ZodCatch="ZodCatch",e.ZodPromise="ZodPromise",e.ZodBranded="ZodBranded",e.ZodPipeline="ZodPipeline",e.ZodReadonly="ZodReadonly"}(ae=t.ZodFirstPartyTypeKind||(t.ZodFirstPartyTypeKind={})),t.instanceof=(e,r={message:`Input not instance of ${e.name}`})=>(0,t.custom)((t=>t instanceof e),r);const ce=E.create;t.string=ce;const ue=A.create;t.number=ue;const de=ne.create;t.nan=de;const le=T.create;t.bigint=le;const he=I.create;t.boolean=he;const fe=R.create;t.date=fe;const pe=w.create;t.symbol=pe;const me=P.create;t.undefined=me;const ge=x.create;t.null=ge;const ye=S.create;t.any=ye;const ve=O.create;t.unknown=ve;const be=C.create;t.never=be;const Ee=B.create;t.void=Ee;const _e=N.create;t.array=_e;const Ae=M.create;t.object=Ae;const Te=M.strictCreate;t.strictObject=Te;const Ie=D.create;t.union=Ie;const Re=F.create;t.discriminatedUnion=Re;const we=H.create;t.intersection=we;const Pe=U.create;t.tuple=Pe;const xe=G.create;t.record=xe;const Se=V.create;t.map=Se;const Oe=Z.create;t.set=Oe;const Ce=W.create;t.function=Ce;const Be=q.create;t.lazy=Be;const Ne=z.create;t.literal=Ne;const ke=Q.create;t.enum=ke;const Me=J.create;t.nativeEnum=Me;const De=X.create;t.promise=De;const Le=Y.create;t.effect=Le,t.transformer=Le;const Fe=$.create;t.optional=Fe;const je=ee.create;t.nullable=je;const He=Y.createWithPreprocess;t.preprocess=He;const Ue=oe.create;t.pipeline=Ue,t.ostring=()=>ce().optional(),t.onumber=()=>ue().optional(),t.oboolean=()=>he().optional(),t.coerce={string:e=>E.create({...e,coerce:!0}),number:e=>A.create({...e,coerce:!0}),boolean:e=>I.create({...e,coerce:!0}),bigint:e=>T.create({...e,coerce:!0}),date:e=>R.create({...e,coerce:!0})},t.NEVER=o.INVALID},3072:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.decrypt=t.encrypt=void 0;const n=r(825),i=r(6540),o={web:n.crypto};function s(e,t,r){if(!r.startsWith("aes-"))throw new Error(`AES submodule doesn't support mode ${r}`);if(16!==t.length)throw new Error("AES: wrong IV length");if(r.startsWith("aes-128")&&16!==e.length||r.startsWith("aes-256")&&32!==e.length)throw new Error("AES: wrong key length")}async function a(e,t,r){if(!o.web)throw new Error("Browser crypto not available.");let n;if(["aes-128-cbc","aes-256-cbc"].includes(e)&&(n="cbc"),["aes-128-ctr","aes-256-ctr"].includes(e)&&(n="ctr"),!n)throw new Error("AES: unsupported mode");return[await o.web.subtle.importKey("raw",t,{name:`AES-${n.toUpperCase()}`,length:8*t.length},!0,["encrypt","decrypt"]),{name:`aes-${n}`,iv:r,counter:r,length:128}]}async function c(e,t,r,n="aes-128-ctr",c=!0){if(s(t,r,n),o.web){const[i,s]=await a(n,t,r),u=await o.web.subtle.encrypt(s,i,e);let d=new Uint8Array(u);return c||"aes-cbc"!==s.name||e.length%16||(d=d.slice(0,-16)),d}if(o.node){const s=o.node.createCipheriv(n,t,r);return s.setAutoPadding(c),(0,i.concatBytes)(s.update(e),s.final())}throw new Error("The environment doesn't have AES module")}t.encrypt=c,t.decrypt=async function(e,t,r,n="aes-128-ctr",u=!0){if(s(t,r,n),o.web){const[s,d]=await a(n,t,r);if(!u&&"aes-cbc"===d.name){const o=await async function(e,t,r,n){const i=e.slice(-16);for(let e=0;e<16;e++)i[e]^=16^r[e];return(await c(i,t,r,n)).slice(0,16)}(e,t,r,n);e=(0,i.concatBytes)(e,o)}const l=await o.web.subtle.decrypt(d,s,e),h=new Uint8Array(l);if("aes-cbc"===d.name){const o=await c(h,t,r,n);if(!(0,i.equalsBytes)(o,e))throw new Error("AES: wrong padding")}return h}if(o.node){const s=o.node.createDecipheriv(n,t,r);return s.setAutoPadding(u),(0,i.concatBytes)(s.update(e),s.final())}throw new Error("The environment doesn't have AES module")}},7423:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.keccak512=t.keccak384=t.keccak256=t.keccak224=void 0;const n=r(125),i=r(6540);t.keccak224=(0,i.wrapHash)(n.keccak_224),t.keccak256=(()=>{const e=(0,i.wrapHash)(n.keccak_256);return e.create=n.keccak_256.create,e})(),t.keccak384=(0,i.wrapHash)(n.keccak_384),t.keccak512=(0,i.wrapHash)(n.keccak_512)},8109:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.pbkdf2Sync=t.pbkdf2=void 0;const n=r(9179),i=r(6053),o=r(2540),s=r(6540);t.pbkdf2=async function(e,t,r,a,c){if(!["sha256","sha512"].includes(c))throw new Error("Only sha256 and sha512 are supported");return(0,s.assertBytes)(e),(0,s.assertBytes)(t),(0,n.pbkdf2Async)("sha256"===c?i.sha256:o.sha512,e,t,{c:r,dkLen:a})},t.pbkdf2Sync=function(e,t,r,a,c){if(!["sha256","sha512"].includes(c))throw new Error("Only sha256 and sha512 are supported");return(0,s.assertBytes)(e),(0,s.assertBytes)(t),(0,n.pbkdf2)("sha256"===c?i.sha256:o.sha512,e,t,{c:r,dkLen:a})}},7002:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.scryptSync=t.scrypt=void 0;const n=r(2739),i=r(6540);t.scrypt=async function(e,t,r,o,s,a,c){return(0,i.assertBytes)(e),(0,i.assertBytes)(t),(0,n.scryptAsync)(e,t,{N:r,r:s,p:o,dkLen:a,onProgress:c})},t.scryptSync=function(e,t,r,o,s,a,c){return(0,i.assertBytes)(e),(0,i.assertBytes)(t),(0,n.scrypt)(e,t,{N:r,r:s,p:o,dkLen:a,onProgress:c})}},5473:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.secp256k1=void 0;var n=r(8358);Object.defineProperty(t,"secp256k1",{enumerable:!0,get:function(){return n.secp256k1}})},6540:function(e,t,r){"use strict";e=r.nmd(e);var n=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.crypto=t.wrapHash=t.equalsBytes=t.hexToBytes=t.bytesToUtf8=t.utf8ToBytes=t.createView=t.concatBytes=t.toHex=t.bytesToHex=t.assertBytes=t.assertBool=void 0;const i=n(r(3525)),o=r(64),s=i.default.bool;t.assertBool=s;const a=i.default.bytes;t.assertBytes=a;var c=r(64);Object.defineProperty(t,"bytesToHex",{enumerable:!0,get:function(){return c.bytesToHex}}),Object.defineProperty(t,"toHex",{enumerable:!0,get:function(){return c.bytesToHex}}),Object.defineProperty(t,"concatBytes",{enumerable:!0,get:function(){return c.concatBytes}}),Object.defineProperty(t,"createView",{enumerable:!0,get:function(){return c.createView}}),Object.defineProperty(t,"utf8ToBytes",{enumerable:!0,get:function(){return c.utf8ToBytes}}),t.bytesToUtf8=function(e){if(!(e instanceof Uint8Array))throw new TypeError("bytesToUtf8 expected Uint8Array, got "+typeof e);return(new TextDecoder).decode(e)},t.hexToBytes=function(e){const t=e.startsWith("0x")?e.substring(2):e;return(0,o.hexToBytes)(t)},t.equalsBytes=function(e,t){if(e.length!==t.length)return!1;for(let r=0;r<e.length;r++)if(e[r]!==t[r])return!1;return!0},t.wrapHash=function(e){return t=>(i.default.bytes(t),e(t))},t.crypto=(()=>{const t="object"==typeof self&&"crypto"in self?self.crypto:void 0,r="function"==typeof e.require&&e.require.bind(e);return{node:r&&!t?r("crypto"):void 0,web:t}})()},3687:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.keccak512=t.keccak384=t.keccak256=t.keccak224=void 0;const n=r(125),i=r(5487);t.keccak224=(0,i.wrapHash)(n.keccak_224),t.keccak256=(()=>{const e=(0,i.wrapHash)(n.keccak_256);return e.create=n.keccak_256.create,e})(),t.keccak384=(0,i.wrapHash)(n.keccak_384),t.keccak512=(0,i.wrapHash)(n.keccak_512)},1341:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.getRandomBytes=t.getRandomBytesSync=void 0;const n=r(64);t.getRandomBytesSync=function(e){return(0,n.randomBytes)(e)},t.getRandomBytes=async function(e){return(0,n.randomBytes)(e)}},5487:function(e,t,r){"use strict";e=r.nmd(e);var n=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.crypto=t.wrapHash=t.equalsBytes=t.hexToBytes=t.bytesToUtf8=t.utf8ToBytes=t.createView=t.concatBytes=t.toHex=t.bytesToHex=t.assertBytes=t.assertBool=void 0;const i=n(r(3525)),o=r(64),s=i.default.bool;t.assertBool=s;const a=i.default.bytes;t.assertBytes=a;var c=r(64);Object.defineProperty(t,"bytesToHex",{enumerable:!0,get:function(){return c.bytesToHex}}),Object.defineProperty(t,"toHex",{enumerable:!0,get:function(){return c.bytesToHex}}),Object.defineProperty(t,"concatBytes",{enumerable:!0,get:function(){return c.concatBytes}}),Object.defineProperty(t,"createView",{enumerable:!0,get:function(){return c.createView}}),Object.defineProperty(t,"utf8ToBytes",{enumerable:!0,get:function(){return c.utf8ToBytes}}),t.bytesToUtf8=function(e){if(!(e instanceof Uint8Array))throw new TypeError("bytesToUtf8 expected Uint8Array, got "+typeof e);return(new TextDecoder).decode(e)},t.hexToBytes=function(e){const t=e.startsWith("0x")?e.substring(2):e;return(0,o.hexToBytes)(t)},t.equalsBytes=function(e,t){if(e.length!==t.length)return!1;for(let r=0;r<e.length;r++)if(e[r]!==t[r])return!1;return!0},t.wrapHash=function(e){return t=>(i.default.bytes(t),e(t))},t.crypto=(()=>{const t="object"==typeof self&&"crypto"in self?self.crypto:void 0,r="function"==typeof e.require&&e.require.bind(e);return{node:r&&!t?r("crypto"):void 0,web:t}})()},4488:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.keccak512=t.keccak384=t.keccak256=t.keccak224=void 0;const n=r(125),i=r(7737);t.keccak224=(0,i.wrapHash)(n.keccak_224),t.keccak256=(()=>{const e=(0,i.wrapHash)(n.keccak_256);return e.create=n.keccak_256.create,e})(),t.keccak384=(0,i.wrapHash)(n.keccak_384),t.keccak512=(0,i.wrapHash)(n.keccak_512)},7737:function(e,t,r){"use strict";e=r.nmd(e);var n=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.crypto=t.wrapHash=t.equalsBytes=t.hexToBytes=t.bytesToUtf8=t.utf8ToBytes=t.createView=t.concatBytes=t.toHex=t.bytesToHex=t.assertBytes=t.assertBool=void 0;const i=n(r(3525)),o=r(64),s=i.default.bool;t.assertBool=s;const a=i.default.bytes;t.assertBytes=a;var c=r(64);Object.defineProperty(t,"bytesToHex",{enumerable:!0,get:function(){return c.bytesToHex}}),Object.defineProperty(t,"toHex",{enumerable:!0,get:function(){return c.bytesToHex}}),Object.defineProperty(t,"concatBytes",{enumerable:!0,get:function(){return c.concatBytes}}),Object.defineProperty(t,"createView",{enumerable:!0,get:function(){return c.createView}}),Object.defineProperty(t,"utf8ToBytes",{enumerable:!0,get:function(){return c.utf8ToBytes}}),t.bytesToUtf8=function(e){if(!(e instanceof Uint8Array))throw new TypeError("bytesToUtf8 expected Uint8Array, got "+typeof e);return(new TextDecoder).decode(e)},t.hexToBytes=function(e){const t=e.startsWith("0x")?e.substring(2):e;return(0,o.hexToBytes)(t)},t.equalsBytes=function(e,t){if(e.length!==t.length)return!1;for(let r=0;r<e.length;r++)if(e[r]!==t[r])return!1;return!0},t.wrapHash=function(e){return t=>(i.default.bytes(t),e(t))},t.crypto=(()=>{const t="object"==typeof self&&"crypto"in self?self.crypto:void 0,r="function"==typeof e.require&&e.require.bind(e);return{node:r&&!t?r("crypto"):void 0,web:t}})()},6608:(e,t)=>{"use strict";function r(e){return function(e){let t=0;return()=>e[t++]}(function(e){let t=0;function r(){return e[t++]<<8|e[t++]}let n=r(),i=1,o=[0,1];for(let e=1;e<n;e++)o.push(i+=r());let s=r(),a=t;t+=s;let c=0,u=0;function d(){return 0==c&&(u=u<<8|e[t++],c=8),u>>--c&1}const l=2**31,h=l>>>1,f=l-1;let p=0;for(let e=0;e<31;e++)p=p<<1|d();let m=[],g=0,y=l;for(;;){let e=Math.floor(((p-g+1)*i-1)/y),t=0,r=n;for(;r-t>1;){let n=t+r>>>1;e<o[n]?r=n:t=n}if(0==t)break;m.push(t);let s=g+Math.floor(y*o[t]/i),a=g+Math.floor(y*o[t+1]/i)-1;for(;0==((s^a)&h);)p=p<<1&f|d(),s=s<<1&f,a=a<<1&f|1;for(;s&~a&536870912;)p=p&h|p<<1&f>>>1|d(),s=s<<1^h,a=(a^h)<<1|h|1;g=s,y=1+a-s}let v=n-4;return m.map((t=>{switch(t-v){case 3:return v+65792+(e[a++]<<16|e[a++]<<8|e[a++]);case 2:return v+256+(e[a++]<<8|e[a++]);case 1:return v+e[a++];default:return t-1}}))}(function(e){let t=[];[..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"].forEach(((e,r)=>t[e.charCodeAt(0)]=r));let r=e.length,n=new Uint8Array(6*r>>3);for(let i=0,o=0,s=0,a=0;i<r;i++)a=a<<6|t[e.charCodeAt(i)],s+=6,s>=8&&(n[o++]=a>>(s-=8));return n}(e)))}function n(e){return 1&e?~e>>1:e>>1}function i(e,t){let r=Array(e);for(let i=0,o=0;i<e;i++)r[i]=o+=n(t());return r}function o(e,t=0){let r=[];for(;;){let n=e(),i=e();if(!i)break;t+=n;for(let e=0;e<i;e++)r.push(t+e);t+=i+1}return r}function s(e){return c((()=>{let t=o(e);if(t.length)return t}))}function a(e){let t=[];for(;;){let r=e();if(0==r)break;t.push(d(r,e))}for(;;){let r=e()-1;if(r<0)break;t.push(l(r,e))}return t.flat()}function c(e){let t=[];for(;;){let r=e(t.length);if(!r)break;t.push(r)}return t}function u(e,t,r){let n=Array(e).fill().map((()=>[]));for(let o=0;o<t;o++)i(e,r).forEach(((e,t)=>n[t].push(e)));return n}function d(e,t){let r=1+t(),n=t(),i=c(t);return u(i.length,1+e,t).flatMap(((e,t)=>{let[o,...s]=e;return Array(i[t]).fill().map(((e,t)=>{let i=t*n;return[o+t*r,s.map((e=>e+i))]}))}))}function l(e,t){return u(1+t(),1+e,t).map((e=>[e[0],e.slice(1)]))}Object.defineProperty(t,"__esModule",{value:!0});var h=r("AEIRrQh1DccBuQJ+APkBMQDiASoAnADQAHQAngBmANQAaACKAEQAgwBJAHcAOQA9ACoANQAmAGMAHgAvACgAJQAWACwAGQAjAB8ALwAVACgAEQAdAAkAHAARABgAFwA7ACcALAAtADcAEwApABAAHQAfABAAGAAeABsAFwAUBLoF3QEXE7k3ygXaALgArkYBbgCsCAPMAK6GNjY2NjFiAQ0ODBDyAAQHRgbrOAVeBV8APTI5B/a9GAUNz8gAFQPPBeelYALMCjYCjqgCht8/lW+QAsXSAoP5ASbmEADytAFIAjSUCkaWAOoA6QocAB7bwM8TEkSkBCJ+AQQCQBjED/IQBjDwDASIbgwDxAeuBzQAsgBwmO+snIYAYgaaAioG8AAiAEIMmhcCqgLKQiDWCMIwA7gCFAIA9zRyqgCohB8AHgQsAt4dASQAwBnUBQEQIFM+CZ4JjyUiIVbATOqDSQAaABMAHAAVclsAKAAVAE71HN89+gI5X8qc5jUKFyRfVAJfPfMAGgATABwAFXIgY0CeAMPyACIAQAzMFsKqAgHavwViBekC0KYCxLcCClMjpGwUehp0TPwAwhRuAugAEjQ0kBfQmAKBggETIgDEFG4C6AASNAFPUCyYTBEDLgIFMBDecB60Ad5KAHgyEn4COBYoAy4uwD5yAEDoAfwsAM4OqLwBImqIALgMAAwCAIraUAUi3HIeAKgu2AGoBgYGBgYrNAOiAG4BCiA+9Dd7BB8eALEBzgIoAgDmMhJ6OvpQtzOoLjVPBQAGAS4FYAVftr8FcDtkQhlBWEiee5pmZqH/EhoDzA4s+H4qBKpSAlpaAnwisi4BlqqsPGIDTB4EimgQANgCBrJGNioCBzACQGQAcgFoJngAiiQgAJwBUL4ALnAeAbbMAz40KEoEWgF2YAZsAmwA+FAeAzAIDABQSACyAABkAHoAMrwGDvr2IJSGBgAQKAAwALoiTgHYAeIOEjiXf4HvABEAGAA7AEQAPzp3gNrHEGYQYwgFTRBMc0EVEgKzD60L7BEcDNgq0tPfADSwB/IDWgfyA1oDWgfyB/IDWgfyA1oDWgNaA1ocEfAh2scQZg9PBHQFlQWSBN0IiiZQEYgHLwjZVBR0JRxOA0wBAyMsSSM7mjMSJUlME00KCAM2SWyufT8DTjGyVPyQqQPSMlY5cwgFHngSpwAxD3ojNbxOhXpOcacKUk+1tYZJaU5uAsU6rz//CigJmm/Cd1UGRBAeJ6gQ+gw2AbgBPg3wS9sE9AY+BMwfgBkcD9CVnwioLeAM8CbmLqSAXSP4KoYF8Ev3POALUFFrD1wLaAnmOmaBUQMkARAijgrgDTwIcBD2CsxuDegRSAc8A9hJnQCoBwQLFB04FbgmE2KvCww5egb+GvkLkiayEyx6/wXWGiQGUAEsGwIA0i7qhbNaNFwfT2IGBgsoI8oUq1AjDShAunhLGh4HGCWsApRDc0qKUTkeliH5PEANaS4WUX8H+DwIGVILhDyhRq5FERHVPpA9SyJMTC8EOIIsMieOCdIPiAy8fHUBXAkkCbQMdBM0ERo3yAg8BxwwlycnGAgkRphgnQT6ogP2E9QDDgVCCUQHFgO4HDATMRUsBRCBJ9oC9jbYLrYCklaDARoFzg8oH+IQU0fjDuwIngJoA4Yl7gAwFSQAGiKeCEZmAGKP21MILs4IympvI3cDahTqZBF2B5QOWgeqHDYVwhzkcMteDoYLKKayCV4BeAmcAWIE5ggMNV6MoyBEZ1aLWxieIGRBQl3/AjQMaBWiRMCHewKOD24SHgE4AXYHPA0EAnoR8BFuEJgI7oYHNbgz+zooBFIhhiAUCioDUmzRCyom/Az7bAGmEmUDDzRAd/FnrmC5JxgABxwyyEFjIfQLlU/QDJ8axBhFVDEZ5wfCA/Ya9iftQVoGAgOmBhY6UDPxBMALbAiOCUIATA6mGgfaGG0KdIzTATSOAbqcA1qUhgJykgY6Bw4Aag6KBXzoACACqgimAAgA0gNaADwCsAegABwAiEQBQAMqMgEk6AKSA5YINM4BmDIB9iwEHsYMGAD6Om5NAsO0AoBtZqUF4FsCkQJMOAFQKAQIUUpUA7J05ADeAE4GFuJKARiuTc4d5kYB4nIuAMoA/gAIOAcIRAHQAfZwALoBYgs0CaW2uAFQ7CwAhgAYbgHaAowA4AA4AIL0AVYAUAVc/AXWAlJMARQ0Gy5aZAG+AyIBNgEQAHwGzpCozAoiBHAH1gIQHhXkAu8xB7gEAyLiE9BCyAK94VgAMhkKOwqqCqlgXmM2CTR1PVMAER+rPso/UQVUO1Y7WztWO1s7VjtbO1Y7WztWO1sDmsLlwuUKb19IYe4MqQ3XRMs6TBPeYFRgNRPLLboUxBXRJVkZQBq/Jwgl51UMDwct1mYzCC80eBe/AEIpa4NEY4keMwpOHOpTlFT7LR4AtEulM7INrxsYREMFSnXwYi0WEQolAmSEAmJFXlCyAF43IwKh+gJomwJmDAKfhzgeDgJmPgJmKQRxBIIDfxYDfpU5CTl6GjmFOiYmAmwgAjI5OA0CbcoCbbHyjQI2akguAWoA4QDkAE0IB5sMkAEBDsUAELgCdzICdqVCAnlORgJ4vSBf3kWxRvYCfEICessCfQwCfPNIA0iAZicALhhJW0peGBpKzwLRBALQz0sqA4hSA4fpRMiRNQLypF0GAwOxS9FMMCgG0k1PTbICi0ICitvEHgogRmoIugKOOgKOX0OahAKO3AKOX3tRt1M4AA1S11SIApP+ApMPAOwAH1UhVbJV0wksHimYiTLkeGlFPjwCl6IC77VYJKsAXCgClpICln+fAKxZr1oMhFAAPgKWuAKWUVxHXNQCmc4CmWdczV0KHAKcnjnFOqACnBkCn54CnruNACASNC0SAp30Ap6VALhAYTdh8gKe1gKgcQGsAp6iIgKeUahjy2QqKC4CJ7ICJoECoP4CoE/aAqYyAqXRAqgCAIACp/Vof2i0AAZMah9q1AKs5gKssQKtagKtBQJXIAJV3wKx5NoDH1FsmgKywBACsusabONtZm1LYgMl0AK2Xz5CbpMDKUgCuGECuUoYArktenA5cOQCvRwDLbUDMhQCvotyBQMzdAK+HXMlc1ICw84CwwdzhXROOEh04wM8qgADPJ0DPcICxX8CxkoCxhOMAshsVALIRwLJUgLJMQJkoALd1Xh8ZHixeShL0wMYpmcFAmH3GfaVJ3sOXpVevhQCz24Cz28yTlbV9haiAMmwAs92ASztA04Vfk4IAtwqAtuNAtJSA1JfA1NiAQQDVY+AjEIDzhnwY0h4AoLRg5AC2soC2eGEE4RMpz8DhqgAMgNkEYZ0XPwAWALfaALeu3Z6AuIy7RcB8zMqAfSeAfLVigLr9gLpc3wCAur8AurnAPxKAbwC7owC65+WrZcGAu5CA4XjmHxw43GkAvMGAGwDjhmZlgL3FgORcQOSigL3mwL53AL4aZofmq6+OpshA52GAv79AR4APJ8fAJ+2AwWQA6ZtA6bcANTIAwZtoYuiCAwDDEwBIAEiB3AGZLxqCAC+BG7CFI4ethAAGng8ACYDNrIDxAwQA4yCAWYqJACM8gAkAOamCqKUCLoGIqbIBQCuBRjCBfAkREUEFn8Fbz5FRzJCKEK7X3gYX8MAlswFOQCQUyCbwDstYDkYutYONhjNGJDJ/QVeBV8FXgVfBWoFXwVeBV8FXgVfBV4FXwVeBV9NHAjejG4JCQkKa17wMgTQA7gGNsLCAMIErsIA7kcwFrkFTT5wPndCRkK9X3w+X+8AWBgzsgCNBcxyzAOm7kaBRC0qCzIdLj08fnTfccH4GckscAFy13U3HgVmBXHJyMm/CNZQYgcHBwqDXoSSxQA6P4gAChbYBuy0KgwAjMoSAwgUAOVsJEQrJlFCuELDSD8qXy5gPS4/KgnIRAUKSz9KPn8+iD53PngCkELDUElCX9JVVnFUETNyWzYCcQASdSZf5zpBIgluogppKjJDJC1CskLDMswIzANf0BUmNRAPEAMGAQYpfqTfcUE0UR7JssmzCWzI0tMKZ0FmD+wQqhgAk5QkTEIsG7BtQM4/Cjo/Sj53QkYcDhEkU05zYjM0Wui8GQqE9CQyQkYcZA9REBU6W0pJPgs7SpwzCogiNEJGG/wPWikqHzc4BwyPaPBlCnhk0GASYDQqdQZKYCBACSIlYLoNCXIXbFVgVBgIBQZk7mAcYJxghGC6YFJgmG8WHga8FdxcsLxhC0MdsgHCMtTICSYcByMKJQGAAnMBNjecWYcCAZEKv04hAOsqdJUR0RQErU3xAaICjqNWBUdmAP4ARBEHOx1egRKsEysmwbZOAFYTOwMAHBO+NVsC2RJLbBEiAN9VBnwEESVhADgAvQKhLgsWdrIgAWIBjQoDA+D0FgaxBlEGwAAky1ywYRC7aBOQCy1GDsIBwgEpCU4DYQUvLy8nJSYoMxktDSgTlABbAnVel1CcCHUmBA94TgHadRbVWCcgsLdN8QcYBVNmAP4ARBEHgQYNK3MRjhKsPzc0zrZdFBIAZsMSAGpKblAoIiLGADgAvQKhLi1CFdUClxiCAVDCWM90eY7epaIO/KAVRBvzEuASDQ8iAwHOCUEQmgwXMhM9EgBCALrVAQkAqwDoAJuRNgAbAGIbzTVzfTEUyAIXCUIrStroIyUSG4QCggTIEbHxcwA+QDQOrT8u1agjB8IQABBBLtUYIAB9suEjD8IhThzUqHclAUQqZiMC8qAPBFPz6x9sDMMNAQhDCkUABccLRAJSDcIIww1DLtWoMQrDCUMPkhroBCIOwgyYCCILwhZCAKcQwgsFGKd74wA7cgtCDEMAAq0JwwUi1/UMBQ110QaCAAfCEmIYEsMBCADxCAAAexViDRbSG/x2F8IYQgAuwgLyqMIAHsICXCcxhgABwgAC6hVDFcIr8qPCz6hCCgKlJ1IAAmIA5+QZwqViFb/LAPsaggioBRH/dwDfwqfCGOIBGsKjknl5BwKpoooAEsINGxIAA5oAbcINAAvCp0IIGkICwQionNEPAgfHqUIFAOGCL71txQNPAAPyABXCAAcCAAnCAGmSABrCAA7CCRjCjnAWAgABYgAOcgAuUiUABsIAF8IIKAANUQC6wi0AA8IADqIq8gCyYQAcIgAbwgAB8gqoAAXNCxwV4gAHogBCwgEJAGnCAAuCAB3CAAjCCagABdEAbqYZ3ACYCCgABdEAAUIAB+IAHaIIKAAGoQAJggAbMgBtIgDmwocACGIACEIAFMIDAGkCCSgABtEA45IACUILqA7L+2YAB0IAbqNATwBOAArCCwADQgAJtAM+AAciABmCAAISpwIACiIACkIACgKn8gbCAAkiAAMSABBCBwAUQgARcgAPkgAN8gANwgAZEg0WIgAVQgBuoha6AcIAwQATQgBpMhEA4VIAAkIABFkAF4IFIgAG1wAYwgQlAYIvWQBATAC2DwcUDHkALzF3AasMCGUCcyoTBgQQDnZSc2YxkCYFhxsFaTQ9A6gKuwYI3wAdAwIKdQF9eU5ZGygDVgIcRQEzBgp6TcSCWYFHADAAOAgAAgAAAFoR4gCClzMBMgB97BQYOU0IUQBeDAAIVwEOkdMAf0IEJ6wAYQDdHACcbz4mkgDUcrgA1tsBHQ/JfHoiH10kENgBj5eyKVpaVE8ZQ8mQAAAAhiM+RzAy5xieVgB5ATAsNylJIBYDN1wE/sz1AFJs4wBxAngCRhGBOs54NTXcAgEMFxkmCxsOsrMAAAMCBAICABnRAgAqAQAFBQUFBQUEBAQEBAQDBAUGBwgDBAQEBAMBASEAigCNAJI8AOcAuADZAKFDAL8ArwCqAKUA6wCjANcAoADkAQUBAADEAH4AXwDPANEBAADbAO8AjQCmAS4A5wDcANkKAAgOMTrZ2dnZu8Xh0tXTSDccAU8BWTRMAVcBZgFlAVgBSVBISm0SAVAaDA8KOT0SDQAmEyosLjE9Pz9CQkJDRBNFBSNWVlZWWFhXWC5ZWlxbWyJiZmZlZ2Ypa211dHd3d3d3d3l5eXl5eXl5eXl5e3t8e3phAEPxAEgAmQB3ADEAZfcAjQBWAFYANgJz7gCKAAT39wBjAJLxAJ4ATgBhAGP+/q8AhACEAGgAVQCwACMAtQCCAj0CQAD7AOYA/QD9AOcA/gDoAOgA5wDlAC4CeAFQAT8BPQFTAT0BPQE9ATgBNwE3ATcBGwFXFgAwDwcAAFIeER0KHB0VAI0AlQClAFAAaR8CMAB1AG4AlgMSAyQxAx5IRU4wAJACTgDGAlYCoQC/ApMCkwKTApMCkwKTAogCkwKTApMCkwKTApMCkgKSApUCnQKUApMCkwKRApECkQKQAnIB0QKUApoCkwKTApIbfhACAPsKA5oCXgI3HAFRFToC3RYPMBgBSzwYUpYBeKlBAWZeAQIDPEwBAwCWMB4flnEAMGcAcAA1AJADm8yS8LWLYQzBMhXJARgIpNx7MQsEKmEBuQDkhYeGhYeFiImJhYqNi4WMj42HjomPiZCFkYWShZORlIWVhZaJl4WYhZmFmoWbipyPnYmehQCJK6cAigRCBD8EQQREBEIESARFBEAERgRIBEcEQwRFBEgAqgOOANBYANYCEwD9YQD9ASAA/QD7APsA/AD72wOLKmzFAP0A+wD7APwA+yMAkGEA/QCQASAA/QCQAvMA/QCQ2wOLKmzFIwD+YQEgAP0A/QD7APsA/AD7AP4A+wD7APwA+9sDiypsxSMAkGEBIAD9AJAA/QCQAvMA/QCQ2wOLKmzFIwJKAT0CUQFAAlLIA6UC8wOl2wOLKmzFIwCQYQEgA6UAkAOlAJAC8wOlAJDbA4sqbMUjBDcAkAQ4AJANlDh0JwEzAJAHRXUKKgEEAM1hCQBbYQAFGjkJAJAJRN8AUAkAkAkAnW0/6mOd3brkH5dB9mNQ/eNThoJ1CP8EZzy46pMulzRpOAZDJDXL2yXaVtAh1MxM82zfnsL/FXSaOaxJlgv345IW0Dfon3fzkx0WByY6wfCroENsWq/bORcfBvtlWbGzP5ju+gqE1DjyFssbkkSeqLAdrCkLOfItA7XNe1PctDPFKoNd/aZ6IQq6JTB6IrDBZ5/nJIbTHMeaaIWRoDvc42ORs9KtvcQWZd+Nv1D2C/hrzaOrFUjpItLWRI4x3GmzQqZbVH5LoCEJpk3hzt1pmM7bPitwOPG8gTKLVFszSrDZyLmfq8LkwkSUhIQlN4nFJUEhU2N7NBTOGk4Y2q9A2M7ps8jcevOKfycp9u3DyCe9hCt7i5HV8U5pm5LnVnKnyzbIyAN/LU4aqT3JK+e9JsdusAsUCgAuCnc4IwbgPBg4EPGOv5gR8D+96c8fLb09f7L6ON2k+Zxe/Y0AYoZIZ8yuu1At7f70iuSFoFmyPpwDU/4lQ+mHkFmq/CwtE7A979KNdD8zaHSx4HoxWsM8vl+2brNxN0QtIUvOfNGAYyv1R5DaM1JAR0C+Ugp6/cNq4pUDyDPKJjFeP4/L1TBoOJak3PVlmDCi/1oF8k1mnzTCz15BdAvmFjQrjide74m2NW1NG/qRrzhbNwwejlhnPfRn4mIfYmXzj5Fbu3C2TUpnYg+djp65dxZJ8XhwUqJ8JYrrR4WtrHKdKjz0i77K+QitukOAZSfFIwvBr1GKYpSukYTqF4gNtgaNDqh78ZDH4Qerglo3VpTLT0wOglaX6bDNhfs04jHVcMfCHwIb+y5bAaBvh2RARFYEjxjr1xTfU09JEjdY1vfcPrPVmnBBSDPj9TcZ1V/Dz8fvy0WLWZM0JPbRL0hLSPeVoC8hgQIGaeE6AYVZnnqm62/wt00pDl5Nw/nDo+bF1tC4qo5DryXVn8ffL3kuT51e+VcBTGiibvP+vqX50dppfxyNORSr48S5WXV8fzcsgjRQH6zjl+nuUYFVloiEnZOPDpHD/7ILh3JuFCdvAi2ANXYXjTDA5Up6YLihbc7d+dBlI9+mdgr8m8+3/Dp26W/Jssn7b9/pOEP4i+/9TsPI9m2NfNKwEI35mqKV+HpZ+W69Y8sM/sIA9Ltvhd+evQTUUfSkYxki28/CBT0cT96HrlrSrE+V9RzhskX0CsDsCfHffBVybkxmHOFOgaUurWNQ2AcZbi1WjkZzYArWZBHFd1SYwtqQ0DIZt7OV40ewQxCr/LgxAc8dLJeAJFseWJq9XiOp21hLv/HhsFbYbg3zCR8JmonZjhuKYrS/KJc30vnOL2CM+GfogNWug2DstZPzauCNeeD8zlP8wxPyfLHYQB/J+wQE3aDpXH/5tdIQpLn3JXNJYZFiXInGB7FqxRxHYJ/re/lHprE5sngUMm11uOIA3bbtkk06I8DYxuwPD+e4sAeNfor0DkWmiCQFiNptkmiD2xGO1kIKGr/Tuu4bHe6z2NaS7Ih0c+Gpv+QbLY9ea122BXNSitM41sxUSlnWl+uJBIFoLqt66v/VfGIQos2lzhOOLDuScVxcyrqH3/FI4vaYB0b8gFHLXtxyX/9JpUCYNwlLZ1v5CeB99l0F795R5wl5UHRq1OYyKqsoIY07wJz2CT0TOf5/JRBPtJIIk5pOJ60SHayS9kMSKbI3fLLYztsY3B4MlSyoEfc9gL4yJVrPo+OGGunCK4p15UbCArJP/PQgUWDW4l+2P/tCqRRy2flIZL/nVeY/vyAfILUM5qEGfcFXXXrAit7skwDEFnD7mL1ATtyrz7HcodhzP7gShFhazIPm7X0+mTCeSWfrOr5WcvJfip19JRRLfXjuQpQjcNCuXo8kqkxQ68ukJQoxlnfjevc0WcKnGpUvyY54eJTS1IRWDqfHANukJLw56ts5yS6Nea7IrL6/78aKmZsch4Q694ujxgx5+0PhlGpzWimajpvkBOOUQlHLkJorzqu4e768L9nJtZWYturb7dsBxjzlNhd/gZcBuRgIUSdgZjg7Rx+f/zLcs4mAa3qDbJNUQVNbSg+dm0L3KH1uhesTPaErVYjZ8Isvfr+zfiX3DT0PlaOv+hdGvLUIlKSEcYHPMs0NtTGzyqMe74yciNFdAVZVzol/XtLsEqivKqfW7zWTCNCvZkPnnBlMv3UHW5RNNEJfuyR3MvYH/9E6gcts5GAwKIgCaBQ+V2Eh9O0IJkxFksPI1V9obqDKCpmPM55mLd+VQgRqgD+9XvsUxjbh/AXXPxOpc0FXFyJzc85aa1VQZa90LAWR4oinrBaOBr8DymCpFbdXMTn7Cv18S0hMR7T/o5VkRqN1g1/dvaDdZsRArO3bopkfee4efLF+hyVdcX4u3aNGTkWvLRafW+sXPktA1lla4UkSB7uJIULfxy/RAflk2miyw9xq9uVGgCNzqCv4iX+AUchfMkZdEgRZ9TZ+1CPTH2jXjMXjFl/+bEPzSjM7zPKKWhyZUgQG1lpp+DNz+Zz+85kD59q99U5R4B3vuI9WenCWqroy2U2Ruq6I+di5N/v9SmYnqJ5H1HLWCbIg6iVrn3s2gFBVFhrc1zzNqoFe275K3Jy1T0Mc5yeE1iRwO2b1L/j/S8jyvGDz6B3NMFEHErGHMM2+oJ5LobazyWEitdgMjQnsd0cjYrCqRpx8idpfwRq6hz/LleX6obpuJh/AGIu4sxD35hwkIEr5ShH8xro7tTDYK1GPHGylK6rp7NCG0lMr7YqwziMUBwXv0zPW667f3/IRLJRD7mkuwUP6mpkxyVjNlcBiAX12r//+WTuzWxsue7bsjRp7xFjpR2tRLqGHLvjYt3TpeybR82K61iLn+pOSWDfUv/HU8ecBtML+Gbz0v9vmlxSgZeBBzbGeP1KSqsH14ZM2kibgDhbS21hIALSOYFCE9LY+2CNvtzT2QuSJMiKP3zwvvs+/JkDwTg0jHVE0XH//U0nu5HKQtCL2KGDQYUgT7qIMVN/OoWqEz1oeG4wG7InZg47NE7rfHB2i7rkpYCUzaPfVtDYgTEPNpa8gXHI2Pp8A6YB8OYHkXDZMMcOL3rJD0Hxk+mRlsSJ12/7T52IcFst5zRc7uDJtQTXBdm9GvsvyXcBbMfKXWqsDSeEnFyPUXZGTafti4a0it8SN1qXxzBmzj+gVZ/FojNy+x73AuuqtJ/oaMZF6m5kbW6ItpfnUT/BrQunS+gLjTTUz0d8jTMpAfFQ40RQi9uM5qdFYzqk85hqSH1zsPOhiO5CN+hNZvL/RIs7m7LyLDuV80ZtyHHqVEngTVPBctHQhmcPjM30m1veDmHCXEpjybWAbgj3TqLUPNazzdHgxYmNuT7trWFcGOi7iTeL5YeK2yp2H98yoLN+skqhffZI/5n/ivceo44wJRY8bzC6DGwdgkMOulYhzW5m6OKyK2Mg+E3YE19L8ngE08TdAuNu0mIzd6kw0i03zzm4oqfVSZjZyxXnBhvt0v89EmnArya/UvHQrdQxBDAJagK2y+OqgBqzQ4FnUeiKfb7HFoUvFSknWhwq58TpBlVRZ0B0A7QWz7X4GLHcbdh5kFI/PKJ91OEh/kmnMEdh+Z23myFH8sXjR/KaHttrpz80N+bl0HM17RX48UjUWslrYHYW7oiHVgcGqTBoTrqK4JYwTTArFO1/APJ8DnEYf+wD92Dw15a9wrPxyJA88yYcv9RypzXLKAWmMuE0KAtIGjfKx1GbRQIq0AkttuRpBO7p4SGrTZuAOat3hTxXEcIKh3HgC1d88K7bz1+Jsi+y7tL/7zc0ZxCBB3hSxvP90GkUp1Lm2wuESafZyFy4Opir+o3gMWtDSuLF3LRHXTUGkKQtvARnwam8BuKv8Q2fHH/cEwPCQd3dhzgri8eTezRsQoGz6ha+S4E7ZzDB/LXwl04vA70NeVsf5rmv1TLvcQSNIBk3U6Qh6Bm+0905B91hopTLnTJRWZkUmbckEw0woG81azyw6LZaBL5Qx2HPvd3LHGLpN6mPZlto50NwW2zFOkgoPKV1gr142teD9aok2HNkPMepl3NIi78ShnAlJCzjZplteUoqz0+iUEOym1LZGGFHMBkc6/5f+sRCCFZZW6KrEby64o/ZfefQAPP6b5ko2fuujIv7uonIKXN6XiJsZmcOeGxteQ+b/ope3Z1HFeXYoW1AJrU/OiCpsyQP1Pr1BdQKFzS0oYnLCAweSnIh7qMFMRBMY7BcnJ5oskUbbRNiosqMzCYUAZPbo8tjCCsCBm5SoGcTHBMXcE+yQpl/OfBkcTw3oa4X7V+ohEh/Zkcv0cqc8sY40IsOW6lLiIrvYND/exZbRlOMgaHvb/QQKaY0k6Aamee2o3LVARCbIP4RoSd7u3CXkG+Iz6iFLfsN38F9xU4n3ueeVgiRs3jw70SMWu1QzDdiLsKtU1qvaLhv7dUbnLimdqYG+pa2aRZ8A6Q9JSr3yTs1MiAvfFHPQJTiqpI/hVUMmL6gPj6eL7lH0IkLCNcaogBA0TGfO0wO6ddf8Fju0L3YbRrWe8J3IewsNBCbpC2b6etQRJnSGLuWDiFoBez9hJHw6+bMQQGQS8YV/kzQ5AFHEqPaMgOjyR5zaHtlOBI4mjo8gdNItHUHQ7Bzq/E/xV1B+L0uoRcLIEj4hcv0yWQTwWLHzoFrvEZPygABpc4rnVjhfcBw5wOvaVVtgiG5qjklrTY1ZaXHkasyVYBd+lgo6zEHMumfK8XR2eD0cVn5w8l1uxGz2ACwtFob/CTV/TUx1kCKp+QROanLrNBiSPTxAf1eOFE+JifgAJ+pyrFqS/0wKlPWUVKlB2Bhu1Ggx2cvfdiR49VIsgBNnE75pf5lpFaQuz8+VPreUd/HLlW8kDSr25AnETsVRrOycLBPYD9/j/7Z0KKdOjtrM71AT+VsjD3D97aUDP5WrHp1DWghsk/lS/hp2VMwo0eqoEerLL/4/SlmyjStwWVDqF6jHC89niCwr1tMSe8GxeC9wjzMKmE7ZtdHOWqqc1OoTI24eVQc++crbyxSU4TxiB+vWoaAUpYQxZ06KKIPq6EvN/rN4DZ0/tQWYVqZ3FTIftPBfIuOWX3PonIKTUArpSvfmQRpkWD00wc3AQS98i4ZYaUbI+DGv90tuEKRjb2ocfdddC21YGUATYQmzelz7JqWBAQqKrWYdWEJlfPeRFZHtUm2MaISZsoOvURowxJKveGRegmBiKZ3d1cMFioJL33RoIKT0eDeK8FH/ybAhZU5TQIsWYmjyeT7EOLL5xZuRPf4qRIo6bbLtFOV6SX60fR8Smys/u1D5DjkmHJyr/woVAvBP2dxGo9gH1LgIm8XlFF1KSYvfj+0w7aTEfoFpcO+Jv3Ssbv8wwkED5JEC+jdln2dzToPNRtWiPbRb8f8G4aZX1j/2Vdbu7jM3gAVD5BKR+yJaOwLtwJodwjWu5di47tnNs9ahpnCUzVMObQfbTqMNs64MGANlgyihKjhwZ6p1Jsnro0/SfkOk6wx+HgUB6Mz9cUiF7KrJkhxnOVjCCcqPZglIojIRoDtkd2AkLNZC88GdP2qZV/1N6PBAe+fpgWZ36oHnewQ8CHdXcxbwQVjOn8U3qD9+e7FzWpg135vgdEMZ9fH5agDnNzdjKFZQ4tDsJs/S6Lk8FqjFJpHMjaRU6FI/DBDM0g+RRkxNoUvm14JAn5dgd6aVHt1aMkSXiJVenbm2FfrIEaFKHtm1erv1BJ5056ULL8AMGLmHav4yxg6F6n5oBq7bdP6zEr6f+QTDJ/KE1XfoG24JvVk2GL7Fb+me27otVFnq1e/2wEuqv6X+2zLQuJQszy5YJi/M5888fMy34L6z8ykD5sCHgzliAoAtEeoaFmnPT63kOYrZWspxYzqQBu/QKNyQ8e4QwKJUCVazmIUp6/zpLA3bWH2ch7QZN0rzWGxMRl3K1osWeETxL95TZSG/atM8LB9B92/71+g9UGWDPfD+lu/KdOQ85rocuHe91/gHA/iprG9PZ2juX49kaRxZ+1/sB3Ck35eWYBFsmCl0wC4QZWX5c5QMuSAEz1CJj0JWArSReV4D/vrgLw+EyhBB6aA4+B34PdlDaTLpm9q9Pkl+bzVWrSO+7uVrIECzsvk8RcmfmNSJretRcoI7ZcIfAqwciU9nJ8O4u1EgkcMOzC/MM2l6OYZRrGcqXCitp4LPXruVPzeD402JGV9grZyz9wJolMLC/YCcWs9CjiWv+DNRLaoSgD5M8T4PzmG8cXYM4jPo5SG1wY3QK/4wzVPrc33wI+AcGI//yXgvyBjocGrl768DMaYCGglwIit4r6t6ulwhwHJ4KeV3VHjspXXG4DIlDR2HNFvPaqkBViIvr433qZPuUINp6oi1LyVVC+EE1j6+wab8uPMeAo6e9uWYequvZynhnYazrvrDQJVkK3KZRoSR5BHi6vOC+AVCujMiQ1GVzGDZ4RFv8jFm7z5CU0iPH2JeXqUzqaKKP4P7osPkcIL99Y7fP3l+TzeFXO2kSpLIJW51oEY8DRIhqexGnxj0nmtGOseStuViIE2mJge45LENf77xjuI7egRNpzthNiajnuqikg0aQS1JqlIZf+hwSUlOp8BEQ0y3xiTOJkohBP3eyYiPDlZpFY88EWOpp4+hC/tQdhrQ56h2VJ2XA6vhPAbj+wH6iA2XYuTvRV25N8wNPQuA0Vzzem2ADZPFK2vr8l0I3GTV3fUN4S6FFYygW2Pu98f+lsgPf67rwVCbgMFAACW3P10GbxnK3SNuNK+VlPRiL7U3dK1o3spH/MFfDkgXuXjxDTxJrYctqHdwUg4rhUCNA13lGjuhJDatpFb/mExsBWS46aLFtROqVm8xQNPXK6A2rRfazJSWpIyh+FMmorXPXYnHQ7YLOmD4B5QTI8rzp7OomiarnaFs5syYjQ0ucc7g1/JzT446IFlDtpUL7DP9bLRCLJryUvi5R71/qX7ycqRSwunQ7+tfJz44Na3aJNszaMEZ/BV4iOGopabYdmvAPe+kIdGCNq5Q8fg8Ld0VNNXV0ZiiGej7zSA+pexy6wKC5k4rZa0k+qaN8bKq3oJWMQCSGaK7PrwMvA8t8BZTzjDqXcFTAIeRtl0SdlGSuAziVXItFcgAkeqwuNsbsrUZFcU6KUZLmvG415kHa0AwMFW2cNSUvPR0U9iCPh0nyslT92B5slYXiDWeSXvxHXItvjI8z5KCIVTIHqGZsbDBTr7WdHzcUAI1ipR86H3o0p2wPhfp7xg9oWOxWIK4a5BWdaV9OAPc0XuvlbwitCVtZDzZxGhIOl77ZgrRYR7LZQFE+Ih23hW3gI914ekkjgbKCi2bsqSAvij6GGj5p+k6evQtJp3qVh9vg+jiJvFCGcKBCITMWpqHZNKfE6IT0dKntS0rhu0DB5D9qIS0/RboNLsx2DlRMlx1QIBeBpHJNKdCL9uWM9eS7RJXKNOpraULtutuJYOl0apdE4LxfsyRSZb6fJkd51SHrI7lLB4vEg4fifJ1dqcWSeY4DgcyjrUcymK+gd3o+qj+3gHKWlLVdMUr3IeF8aClYBq+eeCV9Y7n1Ye8yL7rEvxY7jAlLwucKQ51pu59N8we8XwrbXPChBHXP4LnD3kDwQ85w1DKghtwvpO609fZOrPq8Q7GOOAjHhfR5VqvpoFne8oMHbCrWb1L0IdATo+h1PFeLLI8wc+FEyftLvskCdOtxKfAx3IEJXzBfWTKq5viKP/uu99dxnEpoNJhRtjSZGwOTWr7Ys44++P58O+nkYxd1Gcqm8G3Gh7AHSCxiPNyJWijI/lECrKrAXgBqkRShvdkd7IfoqUlziFDiglx+jdHnmRVmGnk3p/3n78M/HkzFUGZOS07cPnPn9jAnBWl4qDrB1ECf9idIKOdkJTKcZ690nuLW2yDsqwNpgrlT+wx2gv+Engha74lfVqbwqS15FRwuFDfq3bVCZcPy78TL2pH/DOdHeL9MFAtyybQNwHaO781rnJZAhR4M+AYWoSoa0EjQ99xivreM+FKwd7Jp/FC2vvvcq1z3RnRau/BM5KGkBPBSUBOzTNdfaJS/PWTDb1jRSgn2MuY3pVZbY9peHBVI3Ce/u70hg4f7MCVeAjYJfzTkDVLuB6jyjZs5Kko3u39ozgLK4LuwSbUrNIU5cl6Bs3De62AE084XRsm64Gs5W1ofxsWIZ9cYl8PNa5zQHl9ls5aiIKN0rHIIzBnLr03Kle2qq+n/gLDAzvF89vdZCvUFEHRoi9n33O3i49UWyeHP+ZAeRf+psM867nfqON092zE4Pj7AbLtvIUFJFr1y9Le0CL2flc7LUqbgGzOw4/q3vA/cJO5JeI8S+8bc1Y7pqYSzoEWSFn5G7EoPHTGHPMU6SeLKEeli+i8dHY3lWxSrIOU2y0TNo1SeRYewhVx05OXeVDf0xhHNckqp0arRk+bgToeSaHbVZ5nj3IH3m2oayt3sXY78qSPcDpc/5C7VXDRj6bROvvBG5JCsKl/yeMPAUn1flMsmr/FaFdb7gVUXnhLa+/Ilj87PpCC6rILQ6wkIP1ywEg0PztSEzbsJoRwQzDaxkiTN27YDnsy/YKfe6jKcqZWs64skzUAHIt+nXxju0dUVtbCSDAUXYw78Yd4bJKuYU8gbzLzgL4XIUC2HcPIVCUYvM7cybOBFVBdeGR4cOVB7QbGnohTRpiPrGqi1a8QXFBYqENawROuR43OG8dl+Jx4TpwAoi2kkPXW7b/ARSs4DO/z4H6oTIUpN3+/K6Iuc49C4/Uf1NxQTEE91VP8RnLKTpxjywMe2VxM1l4YGXSFY80HUAKIdqczBnnLMPklFV8mrr5hFDypn5TAT00ruU6AjDPNvncoVzX4ac6wAzTwrNH7oz1XLH1wzjQs5k7hcNLbznXQGB7M+rXxKtZXPrz1Ar+OxYGDkJvElknZsHD/IcxRd7ujmmLYpDDbverynroCnSKVQWEGjHL57PaI/WokvhYRpPMk4ni2EUhjDuIF+IU2R0fs40i+66bw8sz8OzyC2eFAxxicd2n5Juta2eWa9KtObD7xLmPvtK+8cjQt+NLjcZCTt+Ss9p1od0bklVgaIV1qJbWxUOr6iUzLDzFefYxAtyRcBr53IaDB25n60KQdhroQWMUpuWSUpELSFxiu4vgQeRoEZe78/ua3TlrszB8sLVZoecnV9YMYz+HkZA/pLqbFhzurB52Wl/WEM6sVk4q04OnzWZFi76JkcGgeeUyYUIwhCDMdIfTUdD4wQpYm3LBw0sp33CVK2q305jeyzgGnBzSMXjesm4XjcEhhrjPSLtwqqoaFCqD5DlHYhoTVafWtBUQXoNfDk19IFxq8sImCcqgMhOToIZUO2530aasY908dMX2nTMFjgv+lapdI8k/e0a7pFw6X3Tgf0m99bbCpOzVgRu2Dw/13CehVfFj+8BeKP6SZV4g/qiX42NWP568PzMajFm2ANmKtHjEIAIc2hc1iecBR9elGP4LmAQwAVmZT8kWc7JSY0ag583ch/Z16krGrjn2YdIaa22egy4/niU6m0WAG3K/yP65cfL//CP+JzcnoLHQFb/KJQeBrEbR1/IKo+YOFXWIQ8ghNxYdMwa49NeXzFqFOIXTmk3w/v5KneS8sGHiPGACh0DE9a1uLAochB79g3IqYObhlswemMucZnAE7dBkp5OAfToa5gHFbIPcec0fVWEOOLftQXsuffyv3wo1LWDDm+SyNMWgSEWtjMyYkjLjTkUtmj7DQlfbpHf38lDvoEN9d2ALxnWCjph4jvfEIRbHvltKbvE2BiYlz45mnJPeFrwZcBny3k0/pyXNrSbEIWvvZw14Y0Fqy4tba1Fu0yNNYaf47jfnz7VCCxKsrJz5oz3F8jXUdQqFu+gDq6EzvKDipXf/3NmcsCC74VB3OgHPgN7W9cU54pjGFDMfifl3m5Vhy21uk1U2nYCrddrifkpwGLYmLSSQAAjC6M3yB1fc6KHpgDnMXh2bYX2ns+Qma+DBgyCkZ0TqZK8Mp2Sryx7HdMM74X9hrwYhQbwlK+zgATAXRzQyS+hK4OTnP17/cyJ2WzY6DChYWGJYXGCnEdMswF5VTYQdSyTpdLXYuh+x2Qr7DR3H2x+YdP0qsLAzYJIWKwrrKkpBgWCmgNCn5t+QbWqf/LoLuvjgDFLtMoxNK5axIA9kammelvwh5ZI52ktrEm/OVEESPQPZGHAIhP7oWDBnGnuzG45XOTpZWsxwNO4UiyxH8riTvQq4JVq5GwX3yqVCbSR0ef/gVYDgiYaiD2EAAxuEPKyXTp/HhL96eVTpaDqFEoV2x1PP/UMcs/XqeGc1gZQG1ot6YxaIEWHanYavH9YdLFjlyU5yrYALVg/sxBjT39oD+BIXvf4LTbvvvpX3srxckEX1XAM9s2uajUTlpPq32mcx4T+sibdQEHQV2WmgwMhbYovh7WWTPfLF03ZbV5a+ElsSIyH6kgJ8+D6aN/6f+ZstkZOYZYx9GbagcrEqwNblz0iZ9NTyvIAeNn3Oup7rtyD4wVE0PoqcnR/LoSK1s1esmOGPjs3zHB8xW4iL8IrhqAJfsWNBYW9TGR11C3KZJaN7MP4O5Ykmpvw94hHzVmsYA68RQdFYfPlFOgCNBoSdy5ODcv11l9bLs135M4okEc4/e8hQczcz2PWipIVSBxa/5sr9xyTFbjG4xm8f4LmrAhD1uEDGrFDl/6X7Nw7/WZPW7fZJGYN8eZ68Td5KGfJyKjD+pTysvTi+8Q8R0L9wKAxAUrYswdvAuiNeenxSplQZjYTxbcH/wP97fOY215SozY3UDRhv7lomztURB2O2UriTX3oAiTKoInkHQietZyhBQ9wMTVHgMrxOP5T/0gN14eFTz0m2D6/iJMbXYGHdIkKEGV2Voa8k/hVNvAVAZKrDEXthUxotwYkYysTDk8j27XEVy+4a30jopuAp5+/xWYb0ne6lwKZwR3j6kDXroOOtrHqWlkJHSWLoPEQJQo/ARzR8UBZSckmeBPn3gJwY62Zo2dyy1AyRRDQBFAJKH9KX+7auP8U8XDo7mMSzq5ZxmaJ5bLpNg4ZM7938SAjMHcu1yB4+lkHnVLnIp86AOPgigH+ZFDRq1QuKWK3pK5JkLDJdakj176NCbjXDASt1h/t1p+GHyKbAoevHSnHuPfoBmQ3nJrDjOhPfwVYi8V5r0KB8BsrfFu8BvhYCbNrvCVnd4Q8RktqIR/ZilioC6g3++L7PHzuXa8NFSF5zd+ISzGLTjrfaKXsBFCkkK0ksSDbl91yXUghMFOskQBeUoo7o3wuIsE29goRIORuJ4b1jSumvR0gR8B21iyW1G4FqHkZOlWz9zq5FnaJX1WbeAxe2DfGSAnw4cqDwg3LFalk6eH89Sdc41Fr6voEa0hfwdkb54yOM7WevDugT1FRzEqdg9zZZ44ZAKGH3ZyqFve3SE4UDN6tLmIFTdIwMrtYRXWBQDB7vvqOuYj7cN31av64+jg/g1uce+am3TOl0cUUL6s0l35FJ9p8vJcG+G8lAFqC0pdmd/aaWYpqDLvB5LEasLMgbPN2N+Wvkh6HYxPOrZEfoxQX/67AzcWOR0K3eYGOgQhyWL7cwKGlxmY/E2b8CKi6Ssgok+7B+zTtq/DXmaDAHRnwbwvCDJ9pITO5RQgBuprEWT0avZv7QjbzITYD8Fzgy4TSYG3z9tLso0Z7MfgHDLKU+kHrzxWkBPwJRydKMXG4AaCA7mlAmjzpNhGOrMGZGZlHSjPbmO5jPd/lKBrViZ0BaXMmqaFOwA/f03O04qQX6MSVA37+SA5Pne/KP7caLJKuOCJXoXpzArUrYesMVc/RXnOv03YrwKgPlR2SjpqIycyulmodZBy6gVc1jA9y6lJqWgR6SY6tc24sVcYuh2GaTeikYJnhr2d6BiL3oLx8M8wuJBdI3FRVIIAx4XougScOw2xWgwUoSYKeLUHc310kVBzSE/vFeHAjlUil8KZftctMgwGjwrhMbjDbK4rB32fTe9jnsqijdp5kOwkD9+klel+lNh3joAFQ");const f=new Map([[8217,"apostrophe"],[8260,"fraction slash"],[12539,"middle dot"]]);function p(e){return`{${function(e){return e.toString(16).toUpperCase().padStart(2,"0")}(e)}}`}function m(e){let t=[];for(let r=0,n=e.length;r<n;){let n=e.codePointAt(r);r+=n<65536?1:2,t.push(n)}return t}function g(e){let t=e.length;if(t<4096)return String.fromCodePoint(...e);let r=[];for(let n=0;n<t;)r.push(String.fromCodePoint(...e.slice(n,n+=4096)));return r.join("")}function y(e,t){let r=e.length,n=r-t.length;for(let i=0;0==n&&i<r;i++)n=e[i]-t[i];return n}var v=r("AEUDTAHBCFQATQDRADAAcgAgADQAFAAsABQAHwAOACQADQARAAoAFwAHABIACAAPAAUACwAFAAwABAAQAAMABwAEAAoABQAIAAIACgABAAQAFAALAAIACwABAAIAAQAHAAMAAwAEAAsADAAMAAwACgANAA0AAwAKAAkABAAdAAYAZwDSAdsDJgC0CkMB8xhZAqfoC190UGcThgBurwf7PT09Pb09AjgJum8OjDllxHYUKXAPxzq6tABAxgK8ysUvWAgMPT09PT09PSs6LT2HcgWXWwFLoSMEEEl5RFVMKvO0XQ8ExDdJMnIgsj26PTQyy8FfEQ8AY8IPAGcEbwRwBHEEcgRzBHQEdQR2BHcEeAR6BHsEfAR+BIAEgfndBQoBYgULAWIFDAFiBNcE2ATZBRAFEQUvBdALFAsVDPcNBw13DYcOMA4xDjMB4BllHI0B2grbAMDpHLkQ7QHVAPRNQQFnGRUEg0yEB2uaJF8AJpIBpob5AERSMAKNoAXqaQLUBMCzEiACnwRZEkkVsS7tANAsBG0RuAQLEPABv9HICTUBXigPZwRBApMDOwAamhtaABqEAY8KvKx3LQ4ArAB8UhwEBAVSagD8AEFZADkBIadVj2UMUgx5Il4ANQC9AxIB1BlbEPMAs30CGxlXAhwZKQIECBc6EbsCoxngzv7UzRQA8M0BawL6ZwkN7wABAD33OQRcsgLJCjMCjqUChtw/km+NAsXPAoP2BT84PwURAK0RAvptb6cApQS/OMMey5HJS84UdxpxTPkCogVFITaTOwERAK5pAvkNBOVyA7q3BKlOJSALAgUIBRcEdASpBXqzABXFSWZOawLCOqw//AolCZdvv3dSBkEQGyelEPcMMwG1ATsN7UvYBPEGOwTJH30ZGQ/NlZwIpS3dDO0m4y6hgFoj9SqDBe1L9DzdC01RaA9ZC2UJ4zpjgU4DIQENIosK3Q05CG0Q8wrJaw3lEUUHOQPVSZoApQcBCxEdNRW1JhBirAsJOXcG+xr2C48mrxMpevwF0xohBk0BKRr/AM8u54WwWjFcHE9fBgMLJSPHFKhQIA0lQLd4SBobBxUlqQKRQ3BKh1E2HpMh9jw9DWYuE1F8B/U8BRlPC4E8nkarRQ4R0j6NPUgiSUwsBDV/LC8niwnPD4UMuXxyAVkJIQmxDHETMREXN8UIOQcZLZckJxUIIUaVYJoE958D8xPRAwsFPwlBBxMDtRwtEy4VKQUNgSTXAvM21S6zAo9WgAEXBcsPJR/fEFBH4A7pCJsCZQODJesALRUhABcimwhDYwBfj9hTBS7LCMdqbCN0A2cU52ERcweRDlcHpxwzFb8c4XDIXguGCCijrwlbAXUJmQFfBOMICTVbjKAgQWdTi1gYmyBhQT9d/AIxDGUVn0S9h3gCiw9rEhsBNQFzBzkNAQJ3Ee0RaxCVCOuGBDW1M/g6JQRPIYMgEQonA09szgsnJvkM+GkBoxJiAww0PXfuZ6tgtiQX/QcZMsVBYCHxC5JPzQycGsEYQlQuGeQHvwPzGvMn6kFXBf8DowMTOk0z7gS9C2kIiwk/AEkOoxcH1xhqCnGM0AExiwG3mQNXkYMCb48GNwcLAGcLhwV55QAdAqcIowAFAM8DVwA5Aq0HnQAZAIVBAT0DJy8BIeUCjwOTCDHLAZUvAfMpBBvDDBUA9zduSgLDsQKAamaiBd1YAo4CSTUBTSUEBU5HUQOvceEA2wBLBhPfRwEVq0rLGuNDAd9vKwDHAPsABTUHBUEBzQHzbQC3AV8LMQmis7UBTekpAIMAFWsB1wKJAN0ANQB/8QFTAE0FWfkF0wJPSQERMRgrV2EBuwMfATMBDQB5BsuNpckHHwRtB9MCEBsV4QLvLge1AQMi3xPNQsUCvd5VoWACZIECYkJbTa9bNyACofcCaJgCZgkCn4Q4GwsCZjsCZiYEbgR/A38TA36SOQY5dxc5gjojIwJsHQIyNjgKAm3HAm2u74ozZ0UrAWcA3gDhAEoFB5gMjQD+C8IADbUCdy8CdqI/AnlLQwJ4uh1c20WuRtcCfD8CesgCfQkCfPAFWQUgSABIfWMkAoFtAoAAAoAFAn+uSVhKWxUXSswC0QEC0MxLJwOITwOH5kTFkTIC8qFdAwMDrkvOTC0lA89NTE2vAos/AorYwRsHHUNnBbcCjjcCjlxAl4ECjtkCjlx4UbRTNQpS1FSFApP7ApMMAOkAHFUeVa9V0AYsGymVhjLheGZFOzkCl58C77JYIagAWSUClo8ClnycAKlZrFoJgU0AOwKWtQKWTlxEXNECmcsCmWRcyl0HGQKcmznCOp0CnBYCn5sCnriKAB0PMSoPAp3xAp6SALU9YTRh7wKe0wKgbgGpAp6fHwKeTqVjyGQnJSsCJ68CJn4CoPsCoEwCot0CocQCpi8Cpc4Cp/8AfQKn8mh8aLEAA0lqHGrRAqzjAqyuAq1nAq0CAlcdAlXcArHh1wMfTmyXArK9DQKy6Bds4G1jbUhfAyXNArZcOz9ukAMpRQK4XgK5RxUCuSp3cDZw4QK9GQK72nCWAzIRAr6IcgIDM3ECvhpzInNPAsPLAsMEc4J0SzVFdOADPKcDPJoDPb8CxXwCxkcCxhCJAshpUQLIRALJTwLJLgJknQLd0nh5YXiueSVL0AMYo2cCAmH0GfOVJHsLXpJeuxECz2sCz2wvS1PS8xOfAMatAs9zASnqA04SfksFAtwnAtuKAtJPA1JcA1NfAQEDVYyAiT8AyxbtYEWCHILTgs6DjQLaxwLZ3oQQhEmnPAOGpQAvA2QOhnFZ+QBVAt9lAt64c3cC4i/tFAHzMCcB9JsB8tKHAuvzAulweQLq+QLq5AD5RwG5Au6JAuuclqqXAwLuPwOF4Jh5cOBxoQLzAwBpA44WmZMC9xMDkW4DkocC95gC+dkC+GaaHJqruzebHgOdgwL++gEbADmfHJ+zAwWNA6ZqA6bZANHFAwZqoYiiBQkDDEkCwAA/AwDhQRdTARHzA2sHl2cFAJMtK7evvdsBiZkUfxEEOQH7KQUhDp0JnwCS/SlXxQL3AZ0AtwW5AG8LbUEuFCaNLgFDAYD8AbUmAHUDDgRtACwCFgyhAAAKAj0CagPdA34EkQEgRQUhfAoABQBEABMANhICdwEABdUDa+8KxQIA9wqfJ7+xt+UBkSFBQgHpFH8RNMCJAAQAGwBaAkUChIsABjpTOpSNbQC4Oo860ACNOME63AClAOgAywE6gTo7Ofw5+Tt2iTpbO56JOm85GAFWATMBbAUvNV01njWtNWY1dTW2NcU1gjWRNdI14TWeNa017jX9NbI1wTYCNhE1xjXVNhY2JzXeNe02LjY9Ni41LSE2OjY9Njw2yTcIBJA8VzY4Nt03IDcPNsogN4k3MAoEsDxnNiQ3GTdsOo03IULUQwdC4EMLHA8PCZsobShRVQYA6X8A6bABFCnXAukBowC9BbcAbwNzBL8MDAMMAQgDAAkKCwsLCQoGBAVVBI/DvwDz9b29kaUCb0QtsRTNLt4eGBcSHAMZFhYZEhYEARAEBUEcQRxBHEEcQRxBHEEaQRxBHEFCSTxBPElISUhBNkM2QTYbNklISVmBVIgBFLWZAu0BhQCjBcEAbykBvwGJAaQcEZ0ePCklMAAhMvAIMAL54gC7Bm8EescjzQMpARQpKgDUABavAj626xQAJP0A3etzuf4NNRA7efy2Z9NQrCnC0OSyANz5BBIbJ5IFDR6miIavYS6tprjjmuKebxm5C74Q225X1pkaYYPb6f1DK4k3xMEBb9S2WMjEibTNWhsRJIA+vwNVEiXTE5iXs/wezV66oFLfp9NZGYW+Gk19J2+bCT6Ye2w6LDYdgzKMUabk595eLBCXANz9HUpWbATq9vqXVx9XDg+Pc9Xp4+bsS005SVM/BJBM4687WUuf+Uj9dEi8aDNaPxtpbDxcG1THTImUMZq4UCaaNYpsVqraNyKLJXDYsFZ/5jl7bLRtO88t7P3xZaAxhb5OdPMXqsSkp1WCieG8jXm1U99+blvLlXzPCS+M93VnJCiK+09LfaSaBAVBomyDgJua8dfUzR7ga34IvR2Nvj+A9heJ6lsl1KG4NkI1032Cnff1m1wof2B9oHJK4bi6JkEdSqeNeiuo6QoZZincoc73/TH9SXF8sCE7XyuYyW8WSgbGFCjPV0ihLKhdPs08Tx82fYAkLLc4I2wdl4apY7GU5lHRFzRWJep7Ww3wbeA3qmd59/86P4xuNaqDpygXt6M85glSBHOCGgJDnt+pN9bK7HApMguX6+06RZNjzVmcZJ+wcUrJ9//bpRNxNuKpNl9uFds+S9tdx7LaM5ZkIrPj6nIU9mnbFtVbs9s/uLgl8MVczAwet+iOEzzBlYW7RCMgE6gyNLeq6+1tIx4dpgZnd0DksJS5f+JNDpwwcPNXaaVspq1fbQajOrJgK0ofKtJ1Ne90L6VO4MOl5S886p7u6xo7OLjG8TGL+HU1JXGJgppg4nNbNJ5nlzSpuPYy21JUEcUA94PoFiZfjZue+QnyQ80ekOuZVkxx4g+cvhJfHgNl4hy1/a6+RKcKlar/J29y//EztlbVPHVUeQ1zX86eQVAjR/M3dA9w4W8LfaXp4EgM85wOWasli837PzVMOnsLzR+k3o75/lRPAJSE1xAKQzEi5v10ke+VBvRt1cwQRMd+U5mLCTGVd6XiZtgBG5cDi0w22GKcVNvHiu5LQbZEDVtz0onn7k5+heuKXVsZtSzilkLRAUmjMXEMB3J9YC50XBxPiz53SC+EhnPl9WsKCv92SM/OFFIMJZYfl0WW8tIO3UxYcwdMAj7FSmgrsZ2aAZO03BOhP1bNNZItyXYQFTpC3SG1VuPDqH9GkiCDmE+JwxyIVSO5siDErAOpEXFgjy6PQtOVDj+s6e1r8heWVvmZnTciuf4EiNZzCAd7SOMhXERIOlsHIMG399i9aLTy3m2hRLZjJVDNLS53iGIK11dPqQt0zBDyg6qc7YqkDm2M5Ve6dCWCaCbTXX2rToaIgz6+zh4lYUi/+6nqcFMAkQJKHYLK0wYk5N9szV6xihDbDDFr45lN1K4aCXBq/FitPSud9gLt5ZVn+ZqGX7cwm2z5EGMgfFpIFyhGGuDPmso6TItTMwny+7uPnLCf4W6goFQFV0oQSsc9VfMmVLcLr6ZetDZbaSFTLqnSO/bIPjA3/zAUoqgGFAEQS4IhuMzEp2I3jJzbzkk/IEmyax+rhZTwd6f+CGtwPixu8IvzACquPWPREu9ZvGkUzpRwvRRuaNN6cr0W1wWits9ICdYJ7ltbgMiSL3sTPeufgNcVqMVWFkCPDH4jG2jA0XcVgQj62Cb29v9f/z/+2KbYvIv/zzjpQAPkliaVDzNrW57TZ/ZOyZD0nlfMmAIBIAGAI0D3k/mdN4xr9v85ZbZbbqfH2jGd5hUqNZWwl5SPfoGmfElmazUIeNL1j/mkF7VNAzTq4jNt8JoQ11NQOcmhprXoxSxfRGJ9LDEOAQ+dmxAQH90iti9e2u/MoeuaGcDTHoC+xsmEeWmxEKefQuIzHbpw5Tc5cEocboAD09oipWQhtTO1wivf/O+DRe2rpl/E9wlrzBorjJsOeG1B/XPW4EaJEFdNlECEZga5ZoGRHXgYouGRuVkm8tDESiEyFNo+3s5M5puSdTyUL2llnINVHEt91XUNW4ewdMgJ4boJfEyt/iY5WXqbA+A2Fkt5Z0lutiWhe9nZIyIUjyXDC3UsaG1t+eNx6z4W/OYoTB7A6x+dNSTOi9AInctbESqm5gvOLww7OWXPrmHwVZasrl4eD113pm+JtT7JVOvnCXqdzzdTRHgJ0PiGTFYW5Gvt9R9LD6Lzfs0v/TZZHSmyVNq7viIHE6DBK7Qp07Iz55EM8SYtQvZf/obBniTWi5C2/ovHfw4VndkE5XYdjOhCMRjDeOEfXeN/CwfGduiUIfsoFeUxXeQXba7c7972XNv8w+dTjjUM0QeNAReW+J014dKAD/McQYXT7c0GQPIkn3Ll6R7gGjuiQoZD0TEeEqQpKoZ15g/0OPQI17QiSv9AUROa/V/TQN3dvLArec3RrsYlvBm1b8LWzltdugsC50lNKYLEp2a+ZZYqPejULRlOJh5zj/LVMyTDvwKhMxxwuDkxJ1QpoNI0OTWLom4Z71SNzI9TV1iXJrIu9Wcnd+MCaAw8o1jSXd94YU/1gnkrC9BUEOtQvEIQ7g0i6h+KL2JKk8Ydl7HruvgWMSAmNe+LshGhV4qnWHhO9/RIPQzY1tHRj2VqOyNsDpK0cww+56AdDC4gsWwY0XxoucIWIqs/GcwnWqlaT0KPr8mbK5U94/301i1WLt4YINTVvCFBrFZbIbY8eycOdeJ2teD5IfPLCRg7jjcFTwlMFNl9zdh/o3E/hHPwj7BWg0MU09pPrBLbrCgm54A6H+I6v27+jL5gkjWg/iYdks9jbfVP5y/n0dlgWEMlKasl7JvFZd56LfybW1eeaVO0gxTfXZwD8G4SI116yx7UKVRgui6Ya1YpixqXeNLc8IxtAwCU5IhwQgn+NqHnRaDv61CxKhOq4pOX7M6pkA+Pmpd4j1vn6ACUALoLLc4vpXci8VidLxzm7qFBe7s+quuJs6ETYmnpgS3LwSZxPIltgBDXz8M1k/W2ySNv2f9/NPhxLGK2D21dkHeSGmenRT3Yqcdl0m/h3OYr8V+lXNYGf8aCCpd4bWjE4QIPj7vUKN4Nrfs7ML6Y2OyS830JCnofg/k7lpFpt4SqZc5HGg1HCOrHvOdC8bP6FGDbE/VV0mX4IakzbdS/op+Kt3G24/8QbBV7y86sGSQ/vZzU8FXs7u6jIvwchsEP2BpIhW3G8uWNwa3HmjfH/ZjhhCWvluAcF+nMf14ClKg5hGgtPLJ98ueNAkc5Hs2WZlk2QHvfreCK1CCGO6nMZVSb99VM/ajr8WHTte9JSmkXq/i/U943HEbdzW6Re/S88dKgg8pGOLlAeNiqrcLkUR3/aClFpMXcOUP3rmETcWSfMXZE3TUOi8i+fqRnTYLflVx/Vb/6GJ7eIRZUA6k3RYR3iFSK9c4iDdNwJuZL2FKz/IK5VimcNWEqdXjSoxSgmF0UPlDoUlNrPcM7ftmA8Y9gKiqKEHuWN+AZRIwtVSxye2Kf8rM3lhJ5XcBXU9n4v0Oy1RU2M+4qM8AQPVwse8ErNSob5oFPWxuqZnVzo1qB/IBxkM3EVUKFUUlO3e51259GgNcJbCmlvrdjtoTW7rChm1wyCKzpCTwozUUEOIcWLneRLgMXh+SjGSFkAllzbGS5HK7LlfCMRNRDSvbQPjcXaenNYxCvu2Qyznz6StuxVj66SgI0T8B6/sfHAJYZaZ78thjOSIFumNWLQbeZixDCCC+v0YBtkxiBB3jefHqZ/dFHU+crbj6OvS1x/JDD7vlm7zOVPwpUC01nhxZuY/63E7g");function b(e){return e>>24&255}function E(e){return 16777215&e}const _=new Map(s(v).flatMap(((e,t)=>e.map((e=>[e,t+1<<24]))))),A=new Set(o(v)),T=new Map,I=new Map;for(let[e,t]of a(v)){if(!A.has(e)&&2==t.length){let[r,n]=t,i=I.get(r);i||(i=new Map,I.set(r,i)),i.set(n,e)}T.set(e,t.reverse())}const R=44032,w=4352,P=4449,x=4519;function S(e){return e>=R&&e<55204}function O(e,t){if(e>=w&&e<4371&&t>=P&&t<4470)return R+588*(e-w)+28*(t-P);if(S(e)&&t>x&&t<4547&&(e-R)%28==0)return e+(t-x);{let r=I.get(e);return r&&(r=r.get(t),r)?r:-1}}function C(e){let t=[],r=[],n=!1;function i(e){let r=_.get(e);r&&(n=!0,e|=r),t.push(e)}for(let n of e)for(;;){if(n<128)t.push(n);else if(S(n)){let e=n-R,t=e%588/28|0,r=e%28;i(w+(e/588|0)),i(P+t),r>0&&i(x+r)}else{let e=T.get(n);e?r.push(...e):i(n)}if(!r.length)break;n=r.pop()}if(n&&t.length>1){let e=b(t[0]);for(let r=1;r<t.length;r++){let n=b(t[r]);if(0==n||e<=n){e=n;continue}let i=r-1;for(;;){let r=t[i+1];if(t[i+1]=t[i],t[i]=r,!i)break;if(e=b(t[--i]),e<=n)break}e=b(t[r])}}return t}function B(e){return C(e).map(E)}function N(e){return function(e){let t=[],r=[],n=-1,i=0;for(let o of e){let e=b(o),s=E(o);if(-1==n)0==e?n=s:t.push(s);else if(i>0&&i>=e)0==e?(t.push(n,...r),r.length=0,n=s):r.push(s),i=e;else{let o=O(n,s);o>=0?n=o:0==i&&0==e?(t.push(n),n=s):(r.push(s),i=e)}}return n>=0&&t.push(n,...r),t}(C(e))}const k=65039,M=".";function D(){return new Set(o(h))}const L=new Map(a(h)),F=D(),j=D(),H=D(),U=D(),G=s(h);function V(){return new Set([o(h).map((e=>G[e])),o(h)].flat(2))}const Z=h(),W=c((e=>{let t=c(h).map((e=>e+96));if(t.length){let r=e>=Z;t[0]-=32,t=g(t),r&&(t=`Restricted[${t}]`);let n=V(),i=V(),o=[...n,...i].sort(((e,t)=>e-t));return{N:t,P:n,M:h()-1,R:r,V:new Set(o)}}})),q=D(),z=new Map;[...q,...D()].sort(((e,t)=>e-t)).map(((e,t,r)=>{let n=h(),i=r[t]=n?r[t-n]:{V:[],M:new Map};i.V.push(e),q.has(e)||z.set(e,i)}));for(let{V:e,M:t}of new Set(z.values())){let r=[];for(let t of e){let e=W.filter((e=>e.V.has(t))),n=r.find((({G:t})=>e.some((e=>t.has(e)))));n||(n={G:new Set,V:[]},r.push(n)),n.V.push(t),e.forEach((e=>n.G.add(e)))}let n=r.flatMap((({G:e})=>[...e]));for(let{G:e,V:i}of r){let r=new Set(n.filter((t=>!e.has(t))));for(let e of i)t.set(e,r)}}let K=new Set,Q=new Set;for(let e of W)for(let t of e.V)(K.has(t)?Q:K).add(t);for(let e of K)z.has(e)||Q.has(e)||z.set(e,1);const J=new Set([...K,...B(K)]),X=o(h),Y=function e(t){let r=c((()=>{let t=o(h).map((e=>X[e]));if(t.length)return e(t)})).sort(((e,t)=>t.Q.size-e.Q.size)),n=h(),i=n%3;n=n/3|0;let s=1&n;return n>>=1,{B:r,V:i,F:s,S:1&n,C:2&n,Q:new Set(t)}}([]);class $ extends Array{get is_emoji(){return!0}}function ee(e,t=p){let r=[];ne(e[0])&&r.push("◌");let n=0,i=e.length;for(let o=0;o<i;o++){let i=e[o];ie(i)&&(r.push(g(e.slice(n,o))),r.push(t(i)),n=o+1)}return r.push(g(e.slice(n,i))),r.join("")}function te(e){return(ie(e)?"":`"${ee([e])}" `)+p(e)}function re(e){for(let t=e.lastIndexOf(95);t>0;)if(95!==e[--t])throw new Error("underscore allowed only at start")}function ne(e){return j.has(e)}function ie(e){return H.has(e)}function oe(e,t){let r=0;return e.split(M).map((e=>{let n,i=m(e),o={input:i,offset:r};r+=i.length+1;try{let e,r=o.tokens=de(i,N),s=r.length;if(!s)throw new Error("empty label");{let i=r[0],a=s>1||i.is_emoji;if(!a&&i.every((e=>e<128)))n=i,re(n),function(e){if(e.length>=4&&45==e[2]&&45==e[3])throw new Error("invalid label extension")}(n),e="ASCII";else if(a&&(o.emoji=!0,i=r.flatMap((e=>e.is_emoji?[]:e))),n=r.flatMap((e=>!t&&e.is_emoji?le(e):e)),re(n),i.length){if(j.has(n[0]))throw ue("leading combining mark");for(let e=1;e<s;e++){let t=r[e];if(!t.is_emoji&&j.has(t[0]))throw ue(`emoji + combining mark: "${g(r[e-1])} + ${ee([t[0]])}"`)}!function(e){let t=e[0],r=f.get(t);if(r)throw ue(`leading ${r}`);let n=e.length,i=-1;for(let o=1;o<n;o++){t=e[o];let n=f.get(t);if(n){if(i==o)throw ue(`${r} + ${n}`);i=o+1,r=n}}if(i==n)throw ue(`trailing ${r}`)}(n);let t=[...new Set(i)],[o]=function(e){let t=W;for(let r of e){let e=t.filter((e=>e.V.has(r)));if(!e.length)throw t===W?ae(r):ce(t[0],r);if(t=e,1==e.length)break}return t}(t);!function(e,t){let{V:r,M:n}=e;for(let n of t)if(!r.has(n))throw ce(e,n);if(n>=0)for(let r=1,i=B(t).length;r<i;r++)if(j.has(t[r])){let o=r+1;for(;o<i&&j.has(t[o]);)o++;if(o-r>n)throw new Error(`too many combining marks: ${e.N} "${g(t.slice(r-1,o))}" (${o-r}/${n})`);r=o}}(o,i),function(e,t){let r,n=[];for(let e of t){let t=z.get(e);if(1===t)return;if(t){let n=t.M.get(e);if(r=r?r.filter((e=>n.has(e))):[...n],!r.length)return}else n.push(e)}if(r)for(let t of r)if(n.every((e=>t.V.has(e))))throw new Error(`whole-script confusable: ${e.N}/${t.N}`)}(o,t),e=o.N}else e="Emoji"}o.type=e}catch(e){o.error=e}return o.output=n,o}))}function se(e){return e.map((({input:t,error:r,output:n})=>{if(r){let n=r.message;throw new Error(1==e.length?n:`Invalid label "${ee(t)}": ${n}`)}return g(n)})).join(M)}function ae(e){return new Error(`disallowed character: ${te(e)}`)}function ce(e,t){let r=te(t),n=W.find((e=>e.P.has(t)));return n&&(r=`${n.N} ${r}`),new Error(`illegal mixture: ${e.N} + ${r}`)}function ue(e){return new Error(`illegal placement: ${e}`)}function de(e,t){let r=[],n=[];for(e=e.slice().reverse();e.length;){let i=he(e);if(i)n.length&&(r.push(t(n)),n=[]),r.push(i);else{let t=e.pop();if(J.has(t))n.push(t);else{let e=L.get(t);if(e)n.push(...e);else if(!F.has(t))throw ae(t)}}}return n.length&&r.push(t(n)),r}function le(e){return e.filter((e=>e!=k))}function he(e,t){let r,n,i=Y,o=[],s=e.length;for(t&&(t.length=0);s;){let a=e[--s];if(i=i.B.find((e=>e.Q.has(a))),!i)break;if(i.S)n=a;else if(i.C&&a===n)break;o.push(a),i.F&&(o.push(k),s>0&&e[s-1]==k&&s--),i.V&&(r=fe(o,i),t&&t.push(...e.slice(s).reverse()),e.length=s)}return r}function fe(e,t){let r=$.from(e);return 2==t.V&&r.splice(1,1),r}const pe="valid",me="mapped",ge="ignored";function ye(e){return e==pe||e==me}function ve(e){return e.some((e=>U.has(e)))}function be(e){for(let t=0;t<e.length;t++)if(e[t].type==pe){let r=t+1;for(;r<e.length&&e[r].type==pe;)r++;e.splice(t,r-t,{type:pe,cps:e.slice(t,r).flatMap((e=>e.cps))})}return e}t.ens_beautify=function(e){let t=oe(e,!0);for(let{type:e,output:r,error:n}of t)if(!n&&"Greek"!==e){let e=0;for(;;){let t=r.indexOf(958,e);if(t<0)break;r[t]=926,e=t+1}}return se(t)},t.ens_emoji=function(){let e=[];return function t(r,n,i){if(r.S)i=n[n.length-1];else if(r.C&&i===n[n.length-1])return;r.F&&n.push(k),r.V&&e.push(fe(n,r));for(let e of r.B)for(let r of e.Q)t(e,[...n,r],i)}(Y,[]),e.sort(y)},t.ens_normalize=function(e){return se(oe(e))},t.ens_normalize_fragment=function(e,t){let r=t?B:N;return e.split(M).map((e=>g(de(m(e),r).flatMap((e=>e.is_emoji?le(e):e))))).join(M)},t.ens_split=oe,t.ens_tokenize=function e(t,{nf:r=!0}={}){let n=m(t).reverse(),i=[],o=[];for(;n.length;){let e=he(n,i);if(e)o.push({type:"emoji",emoji:e,input:i.slice(),cps:le(e)});else{let e=n.pop();if(46==e)o.push({type:"stop",cp:e});else if(J.has(e))o.push({type:pe,cps:[e]});else if(F.has(e))o.push({type:ge,cp:e});else{let t=L.get(e);t?o.push({type:me,cp:e,cps:t.slice()}):o.push({type:"disallowed",cp:e})}}}if(r)for(let t=0,r=-1;t<o.length;t++){let n=o[t];if(ye(n.type))if(ve(n.cps)){let n=t+1;for(let e=n;e<o.length;e++){let{type:t,cps:r}=o[e];if(ye(t)){if(!ve(r))break;n=e+1}else if(t!==ge)break}r<0&&(r=t);let i=o.slice(r,n),s=i.flatMap((e=>ye(e.type)?e.cps:[])),a=N(s);y(a,s)?(o.splice(r,n-r,{type:"nfc",input:s,cps:a,tokens0:be(i),tokens:e(g(a),{nf:!1})}),t=r):t=n-1,r=-1}else r=t;else n.type!==ge&&(r=-1)}return be(o)},t.is_combining_mark=ne,t.nfc=N,t.nfd=B,t.safe_str_from_cps=ee,t.should_escape=ie},1732:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.outputSyncingFormatter=t.outputPostFormatter=t.inputPostFormatter=t.outputBlockFormatter=t.outputTransactionReceiptFormatter=t.outputLogFormatter=t.inputLogFormatter=t.inputTopicFormatter=t.outputTransactionFormatter=t.inputSignFormatter=t.inputTransactionFormatter=t.inputCallFormatter=t.txInputOptionsFormatter=t.inputAddressFormatter=t.inputDefaultBlockNumberFormatter=t.inputBlockNumberFormatter=t.outputBigIntegerFormatter=t.outputProofFormatter=t.inputStorageKeysFormatter=void 0;const n=r(5071),i=r(9910),o=r(9970),s=r(9634),a=r(7345);t.inputStorageKeysFormatter=e=>e.map((e=>(0,s.numberToHex)(e))),t.outputProofFormatter=e=>({address:(0,s.toChecksumAddress)(e.address),nonce:(0,s.hexToNumberString)(e.nonce),balance:(0,s.hexToNumberString)(e.balance)}),t.outputBigIntegerFormatter=e=>(0,s.toNumber)(e),t.inputBlockNumberFormatter=e=>{if(!(0,a.isNullish)(e))return"string"==typeof e&&(0,a.isBlockTag)(e)?e:"genesis"===e?"0x0":"string"==typeof e&&(0,s.isHexStrict)(e)?e.toLowerCase():(0,s.numberToHex)(e)},t.inputDefaultBlockNumberFormatter=(e,r)=>e?(0,t.inputBlockNumberFormatter)(e):(0,t.inputBlockNumberFormatter)(r),t.inputAddressFormatter=e=>{if(i.Iban.isValid(e)&&i.Iban.isDirect(e))return new i.Iban(e).toAddress().toLowerCase();if((0,s.isAddress)(e))return`0x${e.toLowerCase().replace("0x","")}`;throw new n.FormatterError(`Provided address ${e} is invalid, the capitalization checksum test failed, or it's an indirect IBAN address which can't be converted.`)},t.txInputOptionsFormatter=e=>{var r;const i=Object.assign({},e);if(e.to&&(i.to=(0,t.inputAddressFormatter)(e.to)),e.data&&e.input)throw new n.FormatterError('You can\'t have "data" and "input" as properties of transactions at the same time, please use either "data" or "input" instead.');if(!e.input&&e.data&&(i.input=e.data,delete i.data),e.input&&!e.input.startsWith("0x")&&(i.input=`0x${e.input}`),i.input&&!(0,s.isHexStrict)(i.input))throw new n.FormatterError("The input field must be HEX encoded data.");return(e.gas||e.gasLimit)&&(i.gas=(0,s.toNumber)(null!==(r=e.gas)&&void 0!==r?r:e.gasLimit)),(e.maxPriorityFeePerGas||e.maxFeePerGas)&&delete i.gasPrice,["gasPrice","gas","value","maxPriorityFeePerGas","maxFeePerGas","nonce","chainId"].filter((e=>!(0,a.isNullish)(i[e]))).forEach((e=>{i[e]=(0,s.numberToHex)(i[e])})),i},t.inputCallFormatter=(e,r)=>{var n;const i=(0,t.txInputOptionsFormatter)(e),o=null!==(n=i.from)&&void 0!==n?n:r;return o&&(i.from=(0,t.inputAddressFormatter)(o)),i},t.inputTransactionFormatter=(e,r)=>{var i;const o=(0,t.txInputOptionsFormatter)(e);if("number"!=typeof o.from&&(!o.from||"object"!=typeof o.from)){if(o.from=null!==(i=o.from)&&void 0!==i?i:r,!e.from&&"number"!=typeof e.from)throw new n.FormatterError('The send transactions "from" field must be defined!');o.from=(0,t.inputAddressFormatter)(e.from)}return o},t.inputSignFormatter=e=>(0,s.isHexStrict)(e)?e:(0,s.utf8ToHex)(e),t.outputTransactionFormatter=e=>{const r=Object.assign({},e);return e.blockNumber&&(r.blockNumber=(0,s.hexToNumber)(e.blockNumber)),e.transactionIndex&&(r.transactionIndex=(0,s.hexToNumber)(e.transactionIndex)),r.nonce=(0,s.hexToNumber)(e.nonce),r.gas=(0,s.hexToNumber)(e.gas),e.gasPrice&&(r.gasPrice=(0,t.outputBigIntegerFormatter)(e.gasPrice)),e.maxFeePerGas&&(r.maxFeePerGas=(0,t.outputBigIntegerFormatter)(e.maxFeePerGas)),e.maxPriorityFeePerGas&&(r.maxPriorityFeePerGas=(0,t.outputBigIntegerFormatter)(e.maxPriorityFeePerGas)),e.type&&(r.type=(0,s.hexToNumber)(e.type)),r.value=(0,t.outputBigIntegerFormatter)(e.value),e.to&&(0,s.isAddress)(e.to)?r.to=(0,s.toChecksumAddress)(e.to):r.to=void 0,e.from&&(r.from=(0,s.toChecksumAddress)(e.from)),r},t.inputTopicFormatter=e=>{if((0,a.isNullish)(e))return null;const t=String(e);return(0,a.isHex)(t)?t:(0,s.fromUtf8)(t)},t.inputLogFormatter=e=>{var r;const n=(0,a.isNullish)(e)?{}:(0,s.mergeDeep)({},e);return(0,a.isNullish)(n.fromBlock)&&(n.fromBlock=o.BlockTags.LATEST),n.fromBlock=(0,t.inputBlockNumberFormatter)(n.fromBlock),(0,a.isNullish)(n.toBlock)||(n.toBlock=(0,t.inputBlockNumberFormatter)(n.toBlock)),n.topics=null!==(r=n.topics)&&void 0!==r?r:[],n.topics=n.topics.map((e=>Array.isArray(e)?e.map(t.inputTopicFormatter):(0,t.inputTopicFormatter)(e))),n.address&&(n.address=Array.isArray(n.address)?n.address.map((e=>(0,t.inputAddressFormatter)(e))):(0,t.inputAddressFormatter)(n.address)),n},t.outputLogFormatter=e=>{const t=Object.assign({},e),r="string"==typeof e.logIndex?e.logIndex:(0,s.numberToHex)(e.logIndex);if("string"==typeof e.blockHash&&"string"==typeof e.transactionHash){const n=(0,s.sha3Raw)(`${e.blockHash.replace("0x","")}${e.transactionHash.replace("0x","")}${r.replace("0x","")}`);t.id=`log_${n.replace("0x","").slice(0,8)}`}else e.id||(t.id=void 0);return e.blockNumber&&(0,s.isHexStrict)(e.blockNumber)&&(t.blockNumber=(0,s.hexToNumber)(e.blockNumber)),e.transactionIndex&&(0,s.isHexStrict)(e.transactionIndex)&&(t.transactionIndex=(0,s.hexToNumber)(e.transactionIndex)),e.logIndex&&(0,s.isHexStrict)(e.logIndex)&&(t.logIndex=(0,s.hexToNumber)(e.logIndex)),e.address&&(t.address=(0,s.toChecksumAddress)(e.address)),t},t.outputTransactionReceiptFormatter=e=>{if("object"!=typeof e)throw new n.FormatterError(`Received receipt is invalid: ${String(e)}`);const r=Object.assign({},e);return e.blockNumber&&(r.blockNumber=(0,s.hexToNumber)(e.blockNumber)),e.transactionIndex&&(r.transactionIndex=(0,s.hexToNumber)(e.transactionIndex)),r.cumulativeGasUsed=(0,s.hexToNumber)(e.cumulativeGasUsed),r.gasUsed=(0,s.hexToNumber)(e.gasUsed),e.logs&&Array.isArray(e.logs)&&(r.logs=e.logs.map(t.outputLogFormatter)),e.effectiveGasPrice&&(r.effectiveGasPrice=(0,s.hexToNumber)(e.effectiveGasPrice)),e.contractAddress&&(r.contractAddress=(0,s.toChecksumAddress)(e.contractAddress)),e.status&&(r.status=Boolean(parseInt(e.status,10))),r},t.outputBlockFormatter=e=>{const r=Object.assign({},e);return r.gasLimit=(0,s.hexToNumber)(e.gasLimit),r.gasUsed=(0,s.hexToNumber)(e.gasUsed),r.size=(0,s.hexToNumber)(e.size),r.timestamp=(0,s.hexToNumber)(e.timestamp),e.number&&(r.number=(0,s.hexToNumber)(e.number)),e.difficulty&&(r.difficulty=(0,t.outputBigIntegerFormatter)(e.difficulty)),e.totalDifficulty&&(r.totalDifficulty=(0,t.outputBigIntegerFormatter)(e.totalDifficulty)),e.transactions&&Array.isArray(e.transactions)&&(r.transactions=e.transactions.map(t.outputTransactionFormatter)),e.miner&&(r.miner=(0,s.toChecksumAddress)(e.miner)),e.baseFeePerGas&&(r.baseFeePerGas=(0,t.outputBigIntegerFormatter)(e.baseFeePerGas)),r},t.inputPostFormatter=e=>{var t;const r=Object.assign({},e);return e.ttl&&(r.ttl=(0,s.numberToHex)(e.ttl)),e.workToProve&&(r.workToProve=(0,s.numberToHex)(e.workToProve)),e.priority&&(r.priority=(0,s.numberToHex)(e.priority)),e.topics&&!Array.isArray(e.topics)&&(r.topics=e.topics?[e.topics]:[]),r.topics=null===(t=r.topics)||void 0===t?void 0:t.map((e=>e.startsWith("0x")?e:(0,s.fromUtf8)(e))),r},t.outputPostFormatter=e=>{var t;const r=Object.assign({},e);return e.expiry&&(r.expiry=(0,s.hexToNumber)(e.expiry)),e.sent&&(r.sent=(0,s.hexToNumber)(e.sent)),e.ttl&&(r.ttl=(0,s.hexToNumber)(e.ttl)),e.workProved&&(r.workProved=(0,s.hexToNumber)(e.workProved)),e.topics||(r.topics=[]),r.topics=null===(t=r.topics)||void 0===t?void 0:t.map(s.toUtf8),r},t.outputSyncingFormatter=e=>{const t=Object.assign({},e);return t.startingBlock=(0,s.hexToNumber)(e.startingBlock),t.currentBlock=(0,s.hexToNumber)(e.currentBlock),t.highestBlock=(0,s.hexToNumber)(e.highestBlock),e.knownStates&&(t.knownStates=(0,s.hexToNumber)(e.knownStates)),e.pulledStates&&(t.pulledStates=(0,s.hexToNumber)(e.pulledStates)),t}},6527:function(e,t,r){"use strict";var n=this&&this.__createBinding||(Object.create?function(e,t,r,n){void 0===n&&(n=r);var i=Object.getOwnPropertyDescriptor(t,r);i&&!("get"in i?!t.__esModule:i.writable||i.configurable)||(i={enumerable:!0,get:function(){return t[r]}}),Object.defineProperty(e,n,i)}:function(e,t,r,n){void 0===n&&(n=r),e[n]=t[r]}),i=this&&this.__setModuleDefault||(Object.create?function(e,t){Object.defineProperty(e,"default",{enumerable:!0,value:t})}:function(e,t){e.default=t}),o=this&&this.__exportStar||function(e,t){for(var r in e)"default"===r||Object.prototype.hasOwnProperty.call(t,r)||n(t,e,r)},s=this&&this.__importStar||function(e){if(e&&e.__esModule)return e;var t={};if(null!=e)for(var r in e)"default"!==r&&Object.prototype.hasOwnProperty.call(e,r)&&n(t,e,r);return i(t,e),t};Object.defineProperty(t,"__esModule",{value:!0}),t.formatters=void 0,o(r(6171),t),o(r(8441),t),o(r(860),t),o(r(1819),t),o(r(8174),t),o(r(8202),t),o(r(7003),t),o(r(8165),t),o(r(1732),t),o(r(4738),t),o(r(8976),t),t.formatters=s(r(1732))},8165:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0})},7003:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.isSupportSubscriptions=t.isSupportedProvider=t.isLegacySendAsyncProvider=t.isLegacySendProvider=t.isEIP1193Provider=t.isLegacyRequestProvider=t.isMetaMaskProvider=t.isWeb3Provider=void 0;const n=r(9970);t.isWeb3Provider=e=>n.Web3BaseProvider.isWeb3Provider(e),t.isMetaMaskProvider=e=>"string"!=typeof e&&"request"in e&&"AsyncFunction"===e.request.constructor.name&&"isMetaMask"in e&&e.isMetaMask,t.isLegacyRequestProvider=e=>"string"!=typeof e&&"request"in e&&"Function"===e.request.constructor.name,t.isEIP1193Provider=e=>"string"!=typeof e&&"request"in e&&"AsyncFunction"===e.request.constructor.name,t.isLegacySendProvider=e=>"string"!=typeof e&&"send"in e,t.isLegacySendAsyncProvider=e=>"string"!=typeof e&&"sendAsync"in e,t.isSupportedProvider=e=>e&&((0,t.isWeb3Provider)(e)||(0,t.isEIP1193Provider)(e)||(0,t.isLegacyRequestProvider)(e)||(0,t.isLegacySendAsyncProvider)(e)||(0,t.isLegacySendProvider)(e)),t.isSupportSubscriptions=e=>e&&"supportsSubscriptions"in e?e.supportsSubscriptions():!(!e||"string"==typeof e||!("on"in e))},8202:function(e,t,r){"use strict";var n=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.Web3BatchRequest=t.DEFAULT_BATCH_REQUEST_TIMEOUT=void 0;const i=r(9634),o=r(5071);t.DEFAULT_BATCH_REQUEST_TIMEOUT=1e3,t.Web3BatchRequest=class{constructor(e){this._requestManager=e,this._requests=new Map}get requests(){return[...this._requests.values()].map((e=>e.payload))}add(e){const t=i.jsonRpc.toPayload(e),r=new i.Web3DeferredPromise;return this._requests.set(t.id,{payload:t,promise:r}),r}execute(e){var r;return n(this,void 0,void 0,(function*(){if(0===this.requests.length)return Promise.resolve([]);const n=new i.Web3DeferredPromise({timeout:null!==(r=null==e?void 0:e.timeout)&&void 0!==r?r:t.DEFAULT_BATCH_REQUEST_TIMEOUT,eagerStart:!0,timeoutMessage:"Batch request timeout"});return this._processBatchRequest(n).catch((e=>n.reject(e))),n.catch((e=>{e instanceof o.OperationTimeoutError&&this._abortAllRequests("Batch request timeout"),n.reject(e)})),n}))}_processBatchRequest(e){var t,r;return n(this,void 0,void 0,(function*(){const n=yield this._requestManager.sendBatch([...this._requests.values()].map((e=>e.payload)));if(n.length!==this._requests.size)throw this._abortAllRequests("Invalid batch response"),new o.ResponseError(n,`Batch request size mismatch the results size. Requests: ${this._requests.size}, Responses: ${n.length}`);const s=this.requests.map((e=>e.id)).map(Number).sort(((e,t)=>e-t)),a=n.map((e=>e.id)).map(Number).sort(((e,t)=>e-t));if(JSON.stringify(s)!==JSON.stringify(a))throw this._abortAllRequests("Invalid batch response"),new o.ResponseError(n,`Batch request mismatch the results. Requests: [${s.join()}], Responses: [${a.join()}]`);for(const e of n)i.jsonRpc.isResponseWithResult(e)?null===(t=this._requests.get(e.id))||void 0===t||t.promise.resolve(e.result):i.jsonRpc.isResponseWithError(e)&&(null===(r=this._requests.get(e.id))||void 0===r||r.promise.reject(e.error));e.resolve(n)}))}_abortAllRequests(e){for(const{promise:t}of this._requests.values())t.reject(new o.OperationAbortError(e))}}},6171:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.Web3Config=t.Web3ConfigEvent=void 0;const n=r(5071),i=r(9634),o=r(8976);var s;!function(e){e.CONFIG_CHANGE="CONFIG_CHANGE"}(s=t.Web3ConfigEvent||(t.Web3ConfigEvent={}));class a extends o.Web3EventEmitter{constructor(e){super(),this.config={handleRevert:!1,defaultAccount:void 0,defaultBlock:"latest",transactionBlockTimeout:50,transactionConfirmationBlocks:24,transactionPollingInterval:1e3,transactionPollingTimeout:75e4,transactionReceiptPollingInterval:void 0,transactionSendTimeout:75e4,transactionConfirmationPollingInterval:void 0,blockHeaderTimeout:10,maxListenersWarningThreshold:100,contractDataInputFill:"input",defaultNetworkId:void 0,defaultChain:"mainnet",defaultHardfork:"london",defaultCommon:void 0,defaultTransactionType:"0x2",defaultMaxPriorityFeePerGas:(0,i.toHex)(25e8),enableExperimentalFeatures:{useSubscriptionWhenCheckingBlockTimeout:!1,useRpcCallSpecification:!1},transactionBuilder:void 0,transactionTypeParser:void 0},this.setConfig(null!=e?e:{})}setConfig(e){Object.assign(this.config,e)}get handleRevert(){return this.config.handleRevert}set handleRevert(e){this._triggerConfigChange("handleRevert",e),this.config.handleRevert=e}get contractDataInputFill(){return this.config.contractDataInputFill}set contractDataInputFill(e){this._triggerConfigChange("contractDataInputFill",e),this.config.contractDataInputFill=e}get defaultAccount(){return this.config.defaultAccount}set defaultAccount(e){this._triggerConfigChange("defaultAccount",e),this.config.defaultAccount=e}get defaultBlock(){return this.config.defaultBlock}set defaultBlock(e){this._triggerConfigChange("defaultBlock",e),this.config.defaultBlock=e}get transactionSendTimeout(){return this.config.transactionSendTimeout}set transactionSendTimeout(e){this._triggerConfigChange("transactionSendTimeout",e),this.config.transactionSendTimeout=e}get transactionBlockTimeout(){return this.config.transactionBlockTimeout}set transactionBlockTimeout(e){this._triggerConfigChange("transactionBlockTimeout",e),this.config.transactionBlockTimeout=e}get transactionConfirmationBlocks(){return this.config.transactionConfirmationBlocks}set transactionConfirmationBlocks(e){this._triggerConfigChange("transactionConfirmationBlocks",e),this.config.transactionConfirmationBlocks=e}get transactionPollingInterval(){return this.config.transactionPollingInterval}set transactionPollingInterval(e){this._triggerConfigChange("transactionPollingInterval",e),this.config.transactionPollingInterval=e,this.transactionReceiptPollingInterval=e,this.transactionConfirmationPollingInterval=e}get transactionPollingTimeout(){return this.config.transactionPollingTimeout}set transactionPollingTimeout(e){this._triggerConfigChange("transactionPollingTimeout",e),this.config.transactionPollingTimeout=e}get transactionReceiptPollingInterval(){return this.config.transactionReceiptPollingInterval}set transactionReceiptPollingInterval(e){this._triggerConfigChange("transactionReceiptPollingInterval",e),this.config.transactionReceiptPollingInterval=e}get transactionConfirmationPollingInterval(){return this.config.transactionConfirmationPollingInterval}set transactionConfirmationPollingInterval(e){this._triggerConfigChange("transactionConfirmationPollingInterval",e),this.config.transactionConfirmationPollingInterval=e}get blockHeaderTimeout(){return this.config.blockHeaderTimeout}set blockHeaderTimeout(e){this._triggerConfigChange("blockHeaderTimeout",e),this.config.blockHeaderTimeout=e}get enableExperimentalFeatures(){return this.config.enableExperimentalFeatures}set enableExperimentalFeatures(e){this._triggerConfigChange("enableExperimentalFeatures",e),this.config.enableExperimentalFeatures=e}get maxListenersWarningThreshold(){return this.config.maxListenersWarningThreshold}set maxListenersWarningThreshold(e){this._triggerConfigChange("maxListenersWarningThreshold",e),this.setMaxListenerWarningThreshold(e),this.config.maxListenersWarningThreshold=e}get defaultNetworkId(){return this.config.defaultNetworkId}set defaultNetworkId(e){this._triggerConfigChange("defaultNetworkId",e),this.config.defaultNetworkId=e}get defaultChain(){return this.config.defaultChain}set defaultChain(e){if(!(0,i.isNullish)(this.config.defaultCommon)&&!(0,i.isNullish)(this.config.defaultCommon.baseChain)&&e!==this.config.defaultCommon.baseChain)throw new n.ConfigChainMismatchError(this.config.defaultChain,e);this._triggerConfigChange("defaultChain",e),this.config.defaultChain=e}get defaultHardfork(){return this.config.defaultHardfork}set defaultHardfork(e){if(!(0,i.isNullish)(this.config.defaultCommon)&&!(0,i.isNullish)(this.config.defaultCommon.hardfork)&&e!==this.config.defaultCommon.hardfork)throw new n.ConfigHardforkMismatchError(this.config.defaultCommon.hardfork,e);this._triggerConfigChange("defaultHardfork",e),this.config.defaultHardfork=e}get defaultCommon(){return this.config.defaultCommon}set defaultCommon(e){if(!(0,i.isNullish)(this.config.defaultHardfork)&&!(0,i.isNullish)(e)&&!(0,i.isNullish)(e.hardfork)&&this.config.defaultHardfork!==e.hardfork)throw new n.ConfigHardforkMismatchError(this.config.defaultHardfork,e.hardfork);if(!(0,i.isNullish)(this.config.defaultChain)&&!(0,i.isNullish)(e)&&!(0,i.isNullish)(e.baseChain)&&this.config.defaultChain!==e.baseChain)throw new n.ConfigChainMismatchError(this.config.defaultChain,e.baseChain);this._triggerConfigChange("defaultCommon",e),this.config.defaultCommon=e}get defaultTransactionType(){return this.config.defaultTransactionType}set defaultTransactionType(e){this._triggerConfigChange("defaultTransactionType",e),this.config.defaultTransactionType=e}get defaultMaxPriorityFeePerGas(){return this.config.defaultMaxPriorityFeePerGas}set defaultMaxPriorityFeePerGas(e){this._triggerConfigChange("defaultMaxPriorityFeePerGas",e),this.config.defaultMaxPriorityFeePerGas=e}get transactionBuilder(){return this.config.transactionBuilder}set transactionBuilder(e){this._triggerConfigChange("transactionBuilder",e),this.config.transactionBuilder=e}get transactionTypeParser(){return this.config.transactionTypeParser}set transactionTypeParser(e){this._triggerConfigChange("transactionTypeParser",e),this.config.transactionTypeParser=e}_triggerConfigChange(e,t){this.emit(s.CONFIG_CHANGE,{name:e,oldValue:this.config[e],newValue:t})}}t.Web3Config=a},8174:function(e,t,r){"use strict";var n=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.Web3EthPluginBase=t.Web3PluginBase=t.Web3Context=void 0;const i=r(9634),o=r(5071),s=r(7003),a=r(6171),c=r(8441),u=r(860),d=r(8202);class l extends a.Web3Config{constructor(e){var t;if(super(),this.providers=c.Web3RequestManager.providers,(0,i.isNullish)(e)||"string"==typeof e&&""!==e.trim()||(0,s.isSupportedProvider)(e))return this._requestManager=new c.Web3RequestManager(e),void(this._subscriptionManager=new u.Web3SubscriptionManager(this._requestManager,{}));const{config:r,provider:n,requestManager:o,subscriptionManager:a,registeredSubscriptions:d,accountProvider:l,wallet:h}=e;this.setConfig(null!=r?r:{}),this._requestManager=null!=o?o:new c.Web3RequestManager(n,null===(t=null==r?void 0:r.enableExperimentalFeatures)||void 0===t?void 0:t.useSubscriptionWhenCheckingBlockTimeout),this._subscriptionManager=a||new u.Web3SubscriptionManager(this.requestManager,null!=d?d:{}),l&&(this._accountProvider=l),h&&(this._wallet=h)}get requestManager(){return this._requestManager}get subscriptionManager(){return this._subscriptionManager}get wallet(){return this._wallet}get accountProvider(){return this._accountProvider}static fromContextObject(...e){return new this(...e.reverse())}getContextObject(){var e;return{config:this.config,provider:this.provider,requestManager:this.requestManager,subscriptionManager:this.subscriptionManager,registeredSubscriptions:null===(e=this.subscriptionManager)||void 0===e?void 0:e.registeredSubscriptions,providers:this.providers,wallet:this.wallet,accountProvider:this.accountProvider}}use(e,...t){const r=new e(...[...t,this.getContextObject()]);return this.on(a.Web3ConfigEvent.CONFIG_CHANGE,(e=>{r.setConfig({[e.name]:e.newValue})})),r}link(e){this.setConfig(e.config),this._requestManager=e.requestManager,this.provider=e.provider,this._subscriptionManager=e.subscriptionManager,this._wallet=e.wallet,this._accountProvider=e._accountProvider,e.on(a.Web3ConfigEvent.CONFIG_CHANGE,(e=>{this.setConfig({[e.name]:e.newValue})}))}registerPlugin(e){if(void 0!==this[e.pluginNamespace])throw new o.ExistingPluginNamespaceError(e.pluginNamespace);const t={[e.pluginNamespace]:e};t[e.pluginNamespace].link(this),Object.assign(this,t)}get provider(){return this.currentProvider}set provider(e){this.requestManager.setProvider(e)}get currentProvider(){return this.requestManager.provider}set currentProvider(e){this.requestManager.setProvider(e)}get givenProvider(){return l.givenProvider}setProvider(e){return this.provider=e,!0}get BatchRequest(){return d.Web3BatchRequest.bind(void 0,this._requestManager)}extend(e){var t;return e.property&&!this[e.property]&&(this[e.property]={}),null===(t=e.methods)||void 0===t||t.forEach((t=>{const r=(...e)=>n(this,void 0,void 0,(function*(){return this.requestManager.send({method:t.call,params:e})}));e.property?this[e.property][t.name]=r:this[t.name]=r})),this}}t.Web3Context=l,l.providers=c.Web3RequestManager.providers;class h extends l{}t.Web3PluginBase=h,t.Web3EthPluginBase=class extends h{}},8976:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.Web3EventEmitter=void 0;const n=r(9634);t.Web3EventEmitter=class{constructor(){this._emitter=new n.EventEmitter}on(e,t){this._emitter.on(e,t)}once(e,t){this._emitter.once(e,t)}off(e,t){this._emitter.off(e,t)}emit(e,t){this._emitter.emit(e,t)}listenerCount(e){return this._emitter.listenerCount(e)}listeners(e){return this._emitter.listeners(e)}eventNames(){return this._emitter.eventNames()}removeAllListeners(){return this._emitter.removeAllListeners()}setMaxListenerWarningThreshold(e){this._emitter.setMaxListeners(e)}getMaxListeners(){return this._emitter.getMaxListeners()}}},4738:function(e,t,r){"use strict";var n,i=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.Web3PromiEvent=void 0;const o=r(8976);class s extends o.Web3EventEmitter{constructor(e){super(),this[n]="Promise",this._promise=new Promise(e)}then(e,t){return i(this,void 0,void 0,(function*(){return this._promise.then(e,t)}))}catch(e){return i(this,void 0,void 0,(function*(){return this._promise.catch(e)}))}finally(e){return i(this,void 0,void 0,(function*(){return this._promise.finally(e)}))}on(e,t){return super.on(e,t),this}once(e,t){return super.once(e,t),this}}t.Web3PromiEvent=s,n=Symbol.toStringTag},8441:function(e,t,r){"use strict";var n=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))},i=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.Web3RequestManager=t.Web3RequestManagerEvent=void 0;const o=r(5071),s=i(r(2636)),a=i(r(1161)),c=r(9634),u=r(7003),d=r(8976);var l;!function(e){e.PROVIDER_CHANGED="PROVIDER_CHANGED",e.BEFORE_PROVIDER_CHANGE="BEFORE_PROVIDER_CHANGE"}(l=t.Web3RequestManagerEvent||(t.Web3RequestManagerEvent={}));const h={HttpProvider:s.default,WebsocketProvider:a.default},f=e=>{var t;if(Array.isArray(e.params)){const r=e.params[0];if(r.input&&!r.data)return Object.assign(Object.assign({},e),{params:[Object.assign(Object.assign({},r),{data:null!==(t=r.data)&&void 0!==t?t:r.input})]})}return e};class p extends d.Web3EventEmitter{constructor(e,t){super(),(0,c.isNullish)(e)||this.setProvider(e),this.useRpcCallSpecification=t}static get providers(){return h}get provider(){return this._provider}get providers(){return h}setProvider(e){let t;if(e&&"string"==typeof e&&this.providers)if(/^http(s)?:\/\//i.test(e))t=new this.providers.HttpProvider(e);else{if(!/^ws(s)?:\/\//i.test(e))throw new o.ProviderError(`Can't autodetect provider for "${e}"`);t=new this.providers.WebsocketProvider(e)}else t=(0,c.isNullish)(e)?void 0:e;return this.emit(l.BEFORE_PROVIDER_CHANGE,this._provider),this._provider=t,this.emit(l.PROVIDER_CHANGED,this._provider),!0}send(e){return n(this,void 0,void 0,(function*(){const t=yield this._sendRequest(e);if(c.jsonRpc.isResponseWithResult(t))return t.result;throw new o.ResponseError(t)}))}sendBatch(e){return n(this,void 0,void 0,(function*(){return yield this._sendRequest(e)}))}_sendRequest(e){return n(this,void 0,void 0,(function*(){const{provider:t}=this;if((0,c.isNullish)(t))throw new o.ProviderError("Provider not available. Use `.setProvider` or `.provider=` to initialize the provider.");let r=c.jsonRpc.isBatchRequest(e)?c.jsonRpc.toBatchPayload(e):c.jsonRpc.toPayload(e);if((0,u.isMetaMaskProvider)(t)&&"eth_sendTransaction"===r.method&&(r=c.jsonRpc.isBatchRequest(r)?r.map((e=>f(e))):f(r)),(0,u.isWeb3Provider)(t)){let e;try{e=yield t.request(r)}catch(t){e=t}return this._processJsonRpcResponse(r,e,{legacy:!1,error:!1})}if((0,u.isEIP1193Provider)(t))return t.request(r).then((e=>this._processJsonRpcResponse(r,e,{legacy:!0,error:!1}))).catch((e=>this._processJsonRpcResponse(r,e,{legacy:!0,error:!0})));if((0,u.isLegacyRequestProvider)(t))return new Promise(((e,n)=>{const i=e=>n(this._processJsonRpcResponse(r,e,{legacy:!0,error:!0})),o=t=>e(this._processJsonRpcResponse(r,t,{legacy:!0,error:!1})),s=t.request(r,((e,t)=>e?i(e):o(t)));(0,c.isPromise)(s)&&s.then(o).catch(i)}));if((0,u.isLegacySendProvider)(t))return new Promise(((e,n)=>{t.send(r,((t,i)=>{if(t)return n(this._processJsonRpcResponse(r,t,{legacy:!0,error:!0}));if((0,c.isNullish)(i))throw new o.ResponseError("",'Got a "nullish" response from provider.');return e(this._processJsonRpcResponse(r,i,{legacy:!0,error:!1}))}))}));if((0,u.isLegacySendAsyncProvider)(t))return t.sendAsync(r).then((e=>this._processJsonRpcResponse(r,e,{legacy:!0,error:!1}))).catch((e=>this._processJsonRpcResponse(r,e,{legacy:!0,error:!0})));throw new o.ProviderError("Provider does not have a request or send method to use.")}))}_processJsonRpcResponse(e,t,{legacy:r,error:n}){if((0,c.isNullish)(t))return this._buildResponse(e,null,n);if(c.jsonRpc.isResponseWithError(t)){if(this.useRpcCallSpecification&&(0,c.isResponseRpcError)(t)){const e=t;if(o.rpcErrorsMap.get(e.error.code))throw new(0,o.rpcErrorsMap.get(e.error.code).error)(e);throw new o.RpcError(e)}if(!p._isReverted(t))throw new o.InvalidResponseError(t,e)}if(c.jsonRpc.isResponseWithResult(t))return t;if(t instanceof Error)throw p._isReverted(t),t;if(!r&&c.jsonRpc.isBatchRequest(e)&&c.jsonRpc.isBatchResponse(t))return t;if(r&&!n&&c.jsonRpc.isBatchRequest(e))return t;if(r&&n&&c.jsonRpc.isBatchRequest(e))throw t;if(r&&!c.jsonRpc.isResponseWithError(t)&&!c.jsonRpc.isResponseWithResult(t))return this._buildResponse(e,t,n);if(c.jsonRpc.isBatchRequest(e)&&!Array.isArray(t))throw new o.ResponseError(t,"Got normal response for a batch request.");if(!c.jsonRpc.isBatchRequest(e)&&Array.isArray(t))throw new o.ResponseError(t,"Got batch response for a normal request.");if((c.jsonRpc.isResponseWithError(t)||c.jsonRpc.isResponseWithResult(t))&&!c.jsonRpc.isBatchRequest(e)&&t.id&&e.id!==t.id)throw new o.InvalidResponseError(t);throw new o.ResponseError(t,"Invalid response")}static _isReverted(e){let t;if(c.jsonRpc.isResponseWithError(e)?t=e.error:e instanceof Error&&(t=e),null==t?void 0:t.message.includes("revert"))throw new o.ContractExecutionError(t);return!1}_buildResponse(e,t,r){const n={jsonrpc:"2.0",id:c.jsonRpc.isBatchRequest(e)?e[0].id:"id"in e?e.id:null};return r?Object.assign(Object.assign({},n),{error:t}):Object.assign(Object.assign({},n),{result:t})}}t.Web3RequestManager=p},860:function(e,t,r){"use strict";var n=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.Web3SubscriptionManager=void 0;const i=r(9970),o=r(5071),s=r(9634),a=r(7003),c=r(8441);t.Web3SubscriptionManager=class{constructor(e,t,r=!1){this.requestManager=e,this.registeredSubscriptions=t,this.tolerateUnlinkedSubscription=r,this._subscriptions=new Map,this.requestManager.on(c.Web3RequestManagerEvent.BEFORE_PROVIDER_CHANGE,(()=>n(this,void 0,void 0,(function*(){yield this.unsubscribe()})))),this.requestManager.on(c.Web3RequestManagerEvent.PROVIDER_CHANGED,(()=>{this.clear(),this.listenToProviderEvents()})),this.listenToProviderEvents()}listenToProviderEvents(){const e=this.requestManager.provider;this.requestManager.provider&&("function"!=typeof(null==e?void 0:e.supportsSubscriptions)||(null==e?void 0:e.supportsSubscriptions()))&&"function"==typeof this.requestManager.provider.on&&("function"==typeof this.requestManager.provider.request?this.requestManager.provider.on("message",(e=>this.messageListener(e))):e.on("data",(e=>this.messageListener(e))))}messageListener(e){var t,r,n;if(!e)throw new o.SubscriptionError("Should not call messageListener with no data. Type was");const i=(null===(t=e.params)||void 0===t?void 0:t.subscription)||(null===(r=e.data)||void 0===r?void 0:r.subscription)||(null===(n=e.id)||void 0===n?void 0:n.toString(16));if(i){const t=this._subscriptions.get(i);null==t||t.processSubscriptionData(e)}}subscribe(e,t,r=i.DEFAULT_RETURN_FORMAT){return n(this,void 0,void 0,(function*(){const n=this.registeredSubscriptions[e];if(!n)throw new o.SubscriptionError("Invalid subscription type");const i=new n(null!=t?t:void 0,{subscriptionManager:this,returnFormat:r});return yield this.addSubscription(i),i}))}get subscriptions(){return this._subscriptions}addSubscription(e){return n(this,void 0,void 0,(function*(){if(!this.requestManager.provider)throw new o.ProviderError("Provider not available");if(!this.supportsSubscriptions())throw new o.SubscriptionError("The current provider does not support subscriptions");if(e.id&&this._subscriptions.has(e.id))throw new o.SubscriptionError(`Subscription with id "${e.id}" already exists`);if(yield e.sendSubscriptionRequest(),(0,s.isNullish)(e.id))throw new o.SubscriptionError("Subscription is not subscribed yet.");return this._subscriptions.set(e.id,e),e.id}))}removeSubscription(e){return n(this,void 0,void 0,(function*(){const{id:t}=e;if((0,s.isNullish)(t))throw new o.SubscriptionError("Subscription is not subscribed yet. Or, had already been unsubscribed but not through the Subscription Manager.");if(!this._subscriptions.has(t)&&!this.tolerateUnlinkedSubscription)throw new o.SubscriptionError(`Subscription with id "${t.toString()}" does not exists`);return yield e.sendUnsubscribeRequest(),this._subscriptions.delete(t),t}))}unsubscribe(e){return n(this,void 0,void 0,(function*(){const t=[];for(const[r,n]of this.subscriptions.entries())(!e||"function"==typeof e&&e({id:r,sub:n}))&&t.push(this.removeSubscription(n));return Promise.all(t)}))}clear(){this._subscriptions.clear()}supportsSubscriptions(){return!(0,s.isNullish)(this.requestManager.provider)&&(0,a.isSupportSubscriptions)(this.requestManager.provider)}}},1819:function(e,t,r){"use strict";var n=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.Web3Subscription=void 0;const i=r(9970),o=r(9634),s=r(5071),a=r(860),c=r(8976);class u extends c.Web3EventEmitter{constructor(e,t){var r;super(),this.args=e;const{requestManager:n}=t,{subscriptionManager:o}=t;if(n&&o)throw new s.SubscriptionError("Only requestManager or subscriptionManager should be provided at Subscription constructor");if(!n&&!o)throw new s.SubscriptionError("Either requestManager or subscriptionManager should be provided at Subscription constructor");this._subscriptionManager=n?new a.Web3SubscriptionManager(n,{},!0):o,this._returnFormat=null!==(r=null==t?void 0:t.returnFormat)&&void 0!==r?r:i.DEFAULT_RETURN_FORMAT}get id(){return this._id}get lastBlock(){return this._lastBlock}subscribe(){return n(this,void 0,void 0,(function*(){return this._subscriptionManager.addSubscription(this)}))}processSubscriptionData(e){var t,r;(null==e?void 0:e.data)?this._processSubscriptionResult(null!==(r=null===(t=null==e?void 0:e.data)||void 0===t?void 0:t.result)&&void 0!==r?r:null==e?void 0:e.data):e&&o.jsonRpc.isResponseWithNotification(e)&&this._processSubscriptionResult(null==e?void 0:e.params.result)}sendSubscriptionRequest(){return n(this,void 0,void 0,(function*(){return this._id=yield this._subscriptionManager.requestManager.send({method:"eth_subscribe",params:this._buildSubscriptionParams()}),this.emit("connected",this._id),this._id}))}get returnFormat(){return this._returnFormat}get subscriptionManager(){return this._subscriptionManager}resubscribe(){return n(this,void 0,void 0,(function*(){yield this.unsubscribe(),yield this.subscribe()}))}unsubscribe(){return n(this,void 0,void 0,(function*(){this.id&&(yield this._subscriptionManager.removeSubscription(this))}))}sendUnsubscribeRequest(){return n(this,void 0,void 0,(function*(){yield this._subscriptionManager.requestManager.send({method:"eth_unsubscribe",params:[this.id]}),this._id=void 0}))}formatSubscriptionResult(e){return e}_processSubscriptionResult(e){this.emit("data",this.formatSubscriptionResult(e))}_processSubscriptionError(e){this.emit("error",e)}_buildSubscriptionParams(){throw new Error("Implement in the child class")}}t.Web3Subscription=u},7639:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.ERR_TX_RECEIPT_MISSING_OR_BLOCKHASH_NULL=t.ERR_TX_POLLING_TIMEOUT=t.ERR_TX_DATA_AND_INPUT=t.ERR_TX_UNSUPPORTED_TYPE=t.ERR_TX_UNSUPPORTED_EIP_1559=t.ERR_TX_UNABLE_TO_POPULATE_NONCE=t.ERR_TX_INVALID_NONCE_OR_CHAIN_ID=t.ERR_TX_INVALID_OBJECT=t.ERR_TX_INVALID_LEGACY_FEE_MARKET=t.ERR_TX_INVALID_FEE_MARKET_GAS_PRICE=t.ERR_TX_INVALID_FEE_MARKET_GAS=t.ERR_TX_INVALID_LEGACY_GAS=t.ERR_TX_MISSING_GAS=t.ERR_TX_MISSING_CHAIN_INFO=t.ERR_TX_INVALID_CHAIN_INFO=t.ERR_TX_CHAIN_ID_MISMATCH=t.ERR_TX_MISSING_CUSTOM_CHAIN_ID=t.ERR_TX_MISSING_CUSTOM_CHAIN=t.ERR_TX_INVALID_CALL=t.ERR_TX_INVALID_SENDER=t.ERR_RAW_TX_UNDEFINED=t.ERR_TX_OUT_OF_GAS=t.ERR_TX_REVERT_WITHOUT_REASON=t.ERR_TX_CONTRACT_NOT_STORED=t.ERR_TX_NO_CONTRACT_ADDRESS=t.ERR_TX_REVERT_TRANSACTION=t.ERR_TX_REVERT_INSTRUCTION=t.ERR_TX=t.ERR_CONTRACT_TX_DATA_AND_INPUT=t.ERR_CONTRACT_EXECUTION_REVERTED=t.ERR_CONTRACT_INSTANTIATION=t.ERR_CONTRACT_MISSING_FROM_ADDRESS=t.ERR_CONTRACT_MISSING_ADDRESS=t.ERR_CONTRACT_MISSING_DEPLOY_DATA=t.ERR_CONTRACT_RESERVED_EVENT=t.ERR_CONTRACT_EVENT_NOT_EXISTS=t.ERR_CONTRACT_REQUIRED_CALLBACK=t.ERR_CONTRACT_ABI_MISSING=t.ERR_CONTRACT_RESOLVER_MISSING=t.ERR_CONTRACT=t.ERR_INVALID_METHOD_PARAMS=t.ERR_EXISTING_PLUGIN_NAMESPACE=t.ERR_ABI_ENCODING=t.ERR_OPERATION_ABORT=t.ERR_OPERATION_TIMEOUT=t.ERR_METHOD_NOT_IMPLEMENTED=t.ERR_FORMATTERS=t.ERR_PARAM=t.ERR_INVALID_RESPONSE=t.ERR_RESPONSE=void 0,t.ERR_INVALID_NUMBER=t.ERR_INVALID_BYTES=t.ERR_INVALID_STRING=t.ERR_ENS_NETWORK_NOT_SYNCED=t.ERR_ENS_UNSUPPORTED_NETWORK=t.ERR_ENS_CHECK_INTERFACE_SUPPORT=t.JSONRPC_ERR_CHAIN_DISCONNECTED=t.JSONRPC_ERR_DISCONNECTED=t.JSONRPC_ERR_UNSUPPORTED_METHOD=t.JSONRPC_ERR_UNAUTHORIZED=t.JSONRPC_ERR_REJECTED_REQUEST=t.GENESIS_BLOCK_NUMBER=t.ERR_INVALID_SIGNATURE=t.ERR_SIGNATURE_FAILED=t.ERR_PBKDF2_ITERATIONS=t.ERR_INVALID_KEYSTORE=t.ERR_IV_LENGTH=t.ERR_INVALID_PASSWORD=t.ERR_KEY_VERSION_UNSUPPORTED=t.ERR_KEY_DERIVATION_FAIL=t.ERR_UNSUPPORTED_KDF=t.ERR_INVALID_PRIVATE_KEY=t.ERR_PRIVATE_KEY_LENGTH=t.ERR_WS_PROVIDER=t.ERR_SUBSCRIPTION=t.ERR_INVALID_CLIENT=t.ERR_INVALID_PROVIDER=t.ERR_PROVIDER=t.ERR_REQ_ALREADY_SENT=t.ERR_CONN_PENDING_REQUESTS=t.ERR_CONN_MAX_ATTEMPTS=t.ERR_CONN_CLOSE=t.ERR_CONN_NOT_OPEN=t.ERR_CONN_TIMEOUT=t.ERR_CONN_INVALID=t.ERR_CONN=t.ERR_TX_GAS_MISMATCH_INNER_ERROR=t.ERR_TX_MISSING_GAS_INNER_ERROR=t.ERR_TX_INVALID_PROPERTIES_FOR_TYPE=t.ERR_TX_REVERT_TRANSACTION_CUSTOM_ERROR=t.ERR_TX_INVALID_RECEIVER=t.ERR_TX_HARDFORK_MISMATCH=t.ERR_TX_CHAIN_MISMATCH=t.ERR_TX_GAS_MISMATCH=t.ERR_TX_SIGNING=t.ERR_TX_BLOCK_TIMEOUT=t.ERR_TX_SEND_TIMEOUT=t.ERR_TX_NOT_FOUND=t.ERR_TX_LOCAL_WALLET_NOT_AVAILABLE=t.ERR_TX_RECEIPT_MISSING_BLOCK_NUMBER=void 0,t.ERR_RPC_NOT_SUPPORTED=t.ERR_RPC_LIMIT_EXCEEDED=t.ERR_RPC_UNSUPPORTED_METHOD=t.ERR_RPC_TRANSACTION_REJECTED=t.ERR_RPC_UNAVAILABLE_RESOURCE=t.ERR_RPC_MISSING_RESOURCE=t.ERR_RPC_INVALID_INPUT=t.ERR_RPC_INTERNAL_ERROR=t.ERR_RPC_INVALID_PARAMS=t.ERR_RPC_INVALID_METHOD=t.ERR_RPC_INVALID_REQUEST=t.ERR_RPC_INVALID_JSON=t.ERR_SCHEMA_FORMAT=t.ERR_CORE_CHAIN_MISMATCH=t.ERR_CORE_HARDFORK_MISMATCH=t.ERR_VALIDATION=t.ERR_INVALID_NIBBLE_WIDTH=t.ERR_INVALID_TYPE_ABI=t.ERR_INVALID_BLOCK=t.ERR_INVALID_LARGE_VALUE=t.ERR_INVALID_SIZE=t.ERR_INVALID_UNSIGNED_INTEGER=t.ERR_INVALID_BOOLEAN=t.ERR_INVALID_TYPE=t.ERR_INVALID_HEX=t.ERR_INVALID_ADDRESS=t.ERR_INVALID_UNIT=void 0,t.ERR_RESPONSE=100,t.ERR_INVALID_RESPONSE=101,t.ERR_PARAM=200,t.ERR_FORMATTERS=201,t.ERR_METHOD_NOT_IMPLEMENTED=202,t.ERR_OPERATION_TIMEOUT=203,t.ERR_OPERATION_ABORT=204,t.ERR_ABI_ENCODING=205,t.ERR_EXISTING_PLUGIN_NAMESPACE=206,t.ERR_INVALID_METHOD_PARAMS=207,t.ERR_CONTRACT=300,t.ERR_CONTRACT_RESOLVER_MISSING=301,t.ERR_CONTRACT_ABI_MISSING=302,t.ERR_CONTRACT_REQUIRED_CALLBACK=303,t.ERR_CONTRACT_EVENT_NOT_EXISTS=304,t.ERR_CONTRACT_RESERVED_EVENT=305,t.ERR_CONTRACT_MISSING_DEPLOY_DATA=306,t.ERR_CONTRACT_MISSING_ADDRESS=307,t.ERR_CONTRACT_MISSING_FROM_ADDRESS=308,t.ERR_CONTRACT_INSTANTIATION=309,t.ERR_CONTRACT_EXECUTION_REVERTED=310,t.ERR_CONTRACT_TX_DATA_AND_INPUT=311,t.ERR_TX=400,t.ERR_TX_REVERT_INSTRUCTION=401,t.ERR_TX_REVERT_TRANSACTION=402,t.ERR_TX_NO_CONTRACT_ADDRESS=403,t.ERR_TX_CONTRACT_NOT_STORED=404,t.ERR_TX_REVERT_WITHOUT_REASON=405,t.ERR_TX_OUT_OF_GAS=406,t.ERR_RAW_TX_UNDEFINED=407,t.ERR_TX_INVALID_SENDER=408,t.ERR_TX_INVALID_CALL=409,t.ERR_TX_MISSING_CUSTOM_CHAIN=410,t.ERR_TX_MISSING_CUSTOM_CHAIN_ID=411,t.ERR_TX_CHAIN_ID_MISMATCH=412,t.ERR_TX_INVALID_CHAIN_INFO=413,t.ERR_TX_MISSING_CHAIN_INFO=414,t.ERR_TX_MISSING_GAS=415,t.ERR_TX_INVALID_LEGACY_GAS=416,t.ERR_TX_INVALID_FEE_MARKET_GAS=417,t.ERR_TX_INVALID_FEE_MARKET_GAS_PRICE=418,t.ERR_TX_INVALID_LEGACY_FEE_MARKET=419,t.ERR_TX_INVALID_OBJECT=420,t.ERR_TX_INVALID_NONCE_OR_CHAIN_ID=421,t.ERR_TX_UNABLE_TO_POPULATE_NONCE=422,t.ERR_TX_UNSUPPORTED_EIP_1559=423,t.ERR_TX_UNSUPPORTED_TYPE=424,t.ERR_TX_DATA_AND_INPUT=425,t.ERR_TX_POLLING_TIMEOUT=426,t.ERR_TX_RECEIPT_MISSING_OR_BLOCKHASH_NULL=427,t.ERR_TX_RECEIPT_MISSING_BLOCK_NUMBER=428,t.ERR_TX_LOCAL_WALLET_NOT_AVAILABLE=429,t.ERR_TX_NOT_FOUND=430,t.ERR_TX_SEND_TIMEOUT=431,t.ERR_TX_BLOCK_TIMEOUT=432,t.ERR_TX_SIGNING=433,t.ERR_TX_GAS_MISMATCH=434,t.ERR_TX_CHAIN_MISMATCH=435,t.ERR_TX_HARDFORK_MISMATCH=436,t.ERR_TX_INVALID_RECEIVER=437,t.ERR_TX_REVERT_TRANSACTION_CUSTOM_ERROR=438,t.ERR_TX_INVALID_PROPERTIES_FOR_TYPE=439,t.ERR_TX_MISSING_GAS_INNER_ERROR=440,t.ERR_TX_GAS_MISMATCH_INNER_ERROR=441,t.ERR_CONN=500,t.ERR_CONN_INVALID=501,t.ERR_CONN_TIMEOUT=502,t.ERR_CONN_NOT_OPEN=503,t.ERR_CONN_CLOSE=504,t.ERR_CONN_MAX_ATTEMPTS=505,t.ERR_CONN_PENDING_REQUESTS=506,t.ERR_REQ_ALREADY_SENT=507,t.ERR_PROVIDER=600,t.ERR_INVALID_PROVIDER=601,t.ERR_INVALID_CLIENT=602,t.ERR_SUBSCRIPTION=603,t.ERR_WS_PROVIDER=604,t.ERR_PRIVATE_KEY_LENGTH=701,t.ERR_INVALID_PRIVATE_KEY=702,t.ERR_UNSUPPORTED_KDF=703,t.ERR_KEY_DERIVATION_FAIL=704,t.ERR_KEY_VERSION_UNSUPPORTED=705,t.ERR_INVALID_PASSWORD=706,t.ERR_IV_LENGTH=707,t.ERR_INVALID_KEYSTORE=708,t.ERR_PBKDF2_ITERATIONS=709,t.ERR_SIGNATURE_FAILED=801,t.ERR_INVALID_SIGNATURE=802,t.GENESIS_BLOCK_NUMBER="0x0",t.JSONRPC_ERR_REJECTED_REQUEST=4001,t.JSONRPC_ERR_UNAUTHORIZED=4100,t.JSONRPC_ERR_UNSUPPORTED_METHOD=4200,t.JSONRPC_ERR_DISCONNECTED=4900,t.JSONRPC_ERR_CHAIN_DISCONNECTED=4901,t.ERR_ENS_CHECK_INTERFACE_SUPPORT=901,t.ERR_ENS_UNSUPPORTED_NETWORK=902,t.ERR_ENS_NETWORK_NOT_SYNCED=903,t.ERR_INVALID_STRING=1001,t.ERR_INVALID_BYTES=1002,t.ERR_INVALID_NUMBER=1003,t.ERR_INVALID_UNIT=1004,t.ERR_INVALID_ADDRESS=1005,t.ERR_INVALID_HEX=1006,t.ERR_INVALID_TYPE=1007,t.ERR_INVALID_BOOLEAN=1008,t.ERR_INVALID_UNSIGNED_INTEGER=1009,t.ERR_INVALID_SIZE=1010,t.ERR_INVALID_LARGE_VALUE=1011,t.ERR_INVALID_BLOCK=1012,t.ERR_INVALID_TYPE_ABI=1013,t.ERR_INVALID_NIBBLE_WIDTH=1014,t.ERR_VALIDATION=1100,t.ERR_CORE_HARDFORK_MISMATCH=1101,t.ERR_CORE_CHAIN_MISMATCH=1102,t.ERR_SCHEMA_FORMAT=1200,t.ERR_RPC_INVALID_JSON=-32700,t.ERR_RPC_INVALID_REQUEST=-32600,t.ERR_RPC_INVALID_METHOD=-32601,t.ERR_RPC_INVALID_PARAMS=-32602,t.ERR_RPC_INTERNAL_ERROR=-32603,t.ERR_RPC_INVALID_INPUT=-32e3,t.ERR_RPC_MISSING_RESOURCE=-32001,t.ERR_RPC_UNAVAILABLE_RESOURCE=-32002,t.ERR_RPC_TRANSACTION_REJECTED=-32003,t.ERR_RPC_UNSUPPORTED_METHOD=-32004,t.ERR_RPC_LIMIT_EXCEEDED=-32005,t.ERR_RPC_NOT_SUPPORTED=-32006},8105:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.PBKDF2IterationsError=t.IVLengthError=t.InvalidPasswordError=t.KeyStoreVersionError=t.KeyDerivationError=t.InvalidKdfError=t.InvalidSignatureError=t.InvalidPrivateKeyError=t.PrivateKeyLengthError=void 0;const n=r(7639),i=r(3685);class o extends i.BaseWeb3Error{constructor(){super("Private key must be 32 bytes."),this.code=n.ERR_PRIVATE_KEY_LENGTH}}t.PrivateKeyLengthError=o;class s extends i.BaseWeb3Error{constructor(){super("Invalid Private Key, Not a valid string or uint8Array"),this.code=n.ERR_INVALID_PRIVATE_KEY}}t.InvalidPrivateKeyError=s;class a extends i.BaseWeb3Error{constructor(e){super(`"${e}"`),this.code=n.ERR_INVALID_SIGNATURE}}t.InvalidSignatureError=a;class c extends i.BaseWeb3Error{constructor(){super("Invalid key derivation function"),this.code=n.ERR_UNSUPPORTED_KDF}}t.InvalidKdfError=c;class u extends i.BaseWeb3Error{constructor(){super("Key derivation failed - possibly wrong password"),this.code=n.ERR_KEY_DERIVATION_FAIL}}t.KeyDerivationError=u;class d extends i.BaseWeb3Error{constructor(){super("Unsupported key store version"),this.code=n.ERR_KEY_VERSION_UNSUPPORTED}}t.KeyStoreVersionError=d;class l extends i.BaseWeb3Error{constructor(){super("Password cannot be empty"),this.code=n.ERR_INVALID_PASSWORD}}t.InvalidPasswordError=l;class h extends i.BaseWeb3Error{constructor(){super("Initialization vector must be 16 bytes"),this.code=n.ERR_IV_LENGTH}}t.IVLengthError=h;class f extends i.BaseWeb3Error{constructor(){super("c > 1000, pbkdf2 is less secure with less iterations"),this.code=n.ERR_PBKDF2_ITERATIONS}}t.PBKDF2IterationsError=f},3789:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.RequestAlreadySentError=t.PendingRequestsOnReconnectingError=t.MaxAttemptsReachedOnReconnectingError=t.ConnectionCloseError=t.ConnectionNotOpenError=t.ConnectionTimeoutError=t.InvalidConnectionError=t.ConnectionError=void 0;const n=r(7639),i=r(3685);class o extends i.BaseWeb3Error{constructor(e,t){super(e),this.code=n.ERR_CONN,t&&(this.errorCode=t.code,this.errorReason=t.reason)}toJSON(){return Object.assign(Object.assign({},super.toJSON()),{errorCode:this.errorCode,errorReason:this.errorReason})}}t.ConnectionError=o,t.InvalidConnectionError=class extends o{constructor(e,t){super(`CONNECTION ERROR: Couldn't connect to node ${e}.`,t),this.host=e,this.code=n.ERR_CONN_INVALID}toJSON(){return Object.assign(Object.assign({},super.toJSON()),{host:this.host})}},t.ConnectionTimeoutError=class extends o{constructor(e){super(`CONNECTION TIMEOUT: timeout of ${e}ms achieved`),this.duration=e,this.code=n.ERR_CONN_TIMEOUT}toJSON(){return Object.assign(Object.assign({},super.toJSON()),{duration:this.duration})}},t.ConnectionNotOpenError=class extends o{constructor(e){super("Connection not open",e),this.code=n.ERR_CONN_NOT_OPEN}},t.ConnectionCloseError=class extends o{constructor(e){var t,r;super(`CONNECTION ERROR: The connection got closed with the close code ${null!==(t=null==e?void 0:e.code)&&void 0!==t?t:""} and the following reason string ${null!==(r=null==e?void 0:e.reason)&&void 0!==r?r:""}`,e),this.code=n.ERR_CONN_CLOSE}},t.MaxAttemptsReachedOnReconnectingError=class extends o{constructor(e){super(`Maximum number of reconnect attempts reached! (${e})`),this.code=n.ERR_CONN_MAX_ATTEMPTS}},t.PendingRequestsOnReconnectingError=class extends o{constructor(){super("CONNECTION ERROR: Provider started to reconnect before the response got received!"),this.code=n.ERR_CONN_PENDING_REQUESTS}},t.RequestAlreadySentError=class extends o{constructor(e){super(`Request already sent with following id: ${e}`),this.code=n.ERR_REQ_ALREADY_SENT}}},510:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.ContractTransactionDataAndInputError=t.ContractExecutionError=t.Eip838ExecutionError=t.ContractInstantiationError=t.ContractNoFromAddressDefinedError=t.ContractNoAddressDefinedError=t.ContractMissingDeployDataError=t.ContractReservedEventError=t.ContractEventDoesNotExistError=t.ContractOnceRequiresCallbackError=t.ContractMissingABIError=t.ResolverMethodMissingError=t.Web3ContractError=void 0;const n=r(7639),i=r(3685);class o extends i.BaseWeb3Error{constructor(e,t){super(e),this.code=n.ERR_CONTRACT,this.receipt=t}}t.Web3ContractError=o;class s extends i.BaseWeb3Error{constructor(e,t){super(`The resolver at ${e} does not implement requested method: "${t}".`),this.address=e,this.name=t,this.code=n.ERR_CONTRACT_RESOLVER_MISSING}toJSON(){return Object.assign(Object.assign({},super.toJSON()),{address:this.address,name:this.name})}}t.ResolverMethodMissingError=s;class a extends i.BaseWeb3Error{constructor(){super("You must provide the json interface of the contract when instantiating a contract object."),this.code=n.ERR_CONTRACT_ABI_MISSING}}t.ContractMissingABIError=a;class c extends i.BaseWeb3Error{constructor(){super("Once requires a callback as the second parameter."),this.code=n.ERR_CONTRACT_REQUIRED_CALLBACK}}t.ContractOnceRequiresCallbackError=c;class u extends i.BaseWeb3Error{constructor(e){super(`Event "${e}" doesn't exist in this contract.`),this.eventName=e,this.code=n.ERR_CONTRACT_EVENT_NOT_EXISTS}toJSON(){return Object.assign(Object.assign({},super.toJSON()),{eventName:this.eventName})}}t.ContractEventDoesNotExistError=u;class d extends i.BaseWeb3Error{constructor(e){super(`Event "${e}" doesn't exist in this contract.`),this.type=e,this.code=n.ERR_CONTRACT_RESERVED_EVENT}toJSON(){return Object.assign(Object.assign({},super.toJSON()),{type:this.type})}}t.ContractReservedEventError=d;class l extends i.BaseWeb3Error{constructor(){super('No "data" specified in neither the given options, nor the default options.'),this.code=n.ERR_CONTRACT_MISSING_DEPLOY_DATA}}t.ContractMissingDeployDataError=l;class h extends i.BaseWeb3Error{constructor(){super("This contract object doesn't have address set yet, please set an address first."),this.code=n.ERR_CONTRACT_MISSING_ADDRESS}}t.ContractNoAddressDefinedError=h;class f extends i.BaseWeb3Error{constructor(){super('No "from" address specified in neither the given options, nor the default options.'),this.code=n.ERR_CONTRACT_MISSING_FROM_ADDRESS}}t.ContractNoFromAddressDefinedError=f;class p extends i.BaseWeb3Error{constructor(){super(...arguments),this.code=n.ERR_CONTRACT_INSTANTIATION}}t.ContractInstantiationError=p;class m extends o{constructor(e){if(super(e.message||"Error"),this.name="name"in e&&e.name||this.constructor.name,this.stack="stack"in e&&e.stack||void 0,this.code=e.code,"object"==typeof e.data){let t;t="originalError"in e.data?e.data.originalError:e.data,this.data=t.data,this.innerError=new m(t)}else this.data=e.data}setDecodedProperties(e,t,r){this.errorName=e,this.errorSignature=t,this.errorArgs=r}toJSON(){let e=Object.assign(Object.assign({},super.toJSON()),{data:this.data});return this.errorName&&(e=Object.assign(Object.assign({},e),{errorName:this.errorName,errorSignature:this.errorSignature,errorArgs:this.errorArgs})),e}}t.Eip838ExecutionError=m,t.ContractExecutionError=class extends o{constructor(e){super("Error happened while trying to execute a function inside a smart contract"),this.code=n.ERR_CONTRACT_EXECUTION_REVERTED,this.innerError=new m(e)}};class g extends i.InvalidValueError{constructor(e){var t,r;super(`data: ${null!==(t=e.data)&&void 0!==t?t:"undefined"}, input: ${null!==(r=e.input)&&void 0!==r?r:"undefined"}`,'You can\'t have "data" and "input" as properties of a contract at the same time, please use either "data" or "input" instead.'),this.code=n.ERR_CONTRACT_TX_DATA_AND_INPUT}}t.ContractTransactionDataAndInputError=g},3628:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.ConfigChainMismatchError=t.ConfigHardforkMismatchError=void 0;const n=r(3685),i=r(7639);class o extends n.BaseWeb3Error{constructor(e,t){super(`Web3Config hardfork doesnt match in defaultHardfork ${e} and common.hardfork ${t}`),this.code=i.ERR_CORE_HARDFORK_MISMATCH}}t.ConfigHardforkMismatchError=o;class s extends n.BaseWeb3Error{constructor(e,t){super(`Web3Config chain doesnt match in defaultHardfork ${e} and common.hardfork ${t}`),this.code=i.ERR_CORE_HARDFORK_MISMATCH}}t.ConfigChainMismatchError=s},1591:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.ENSNetworkNotSyncedError=t.ENSUnsupportedNetworkError=t.ENSCheckInterfaceSupportError=void 0;const n=r(7639),i=r(3685);class o extends i.BaseWeb3Error{constructor(e){super(`ENS resolver check interface support error. "${e}"`),this.code=n.ERR_ENS_CHECK_INTERFACE_SUPPORT}}t.ENSCheckInterfaceSupportError=o;class s extends i.BaseWeb3Error{constructor(e){super(`ENS is not supported on network ${e}`),this.code=n.ERR_ENS_UNSUPPORTED_NETWORK}}t.ENSUnsupportedNetworkError=s;class a extends i.BaseWeb3Error{constructor(){super("Network not synced"),this.code=n.ERR_ENS_NETWORK_NOT_SYNCED}}t.ENSNetworkNotSyncedError=a},7297:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.ExistingPluginNamespaceError=t.AbiError=t.OperationAbortError=t.OperationTimeoutError=t.MethodNotImplementedError=t.FormatterError=t.InvalidMethodParamsError=t.InvalidNumberOfParamsError=void 0;const n=r(7639),i=r(3685);class o extends i.BaseWeb3Error{constructor(e,t,r){super(`Invalid number of parameters for "${r}". Got "${e}" expected "${t}"!`),this.got=e,this.expected=t,this.method=r,this.code=n.ERR_PARAM}toJSON(){return Object.assign(Object.assign({},super.toJSON()),{got:this.got,expected:this.expected,method:this.method})}}t.InvalidNumberOfParamsError=o;class s extends i.BaseWeb3Error{constructor(e){super(`Invalid parameters passed. "${void 0!==e?e:""}"`),this.hint=e,this.code=n.ERR_INVALID_METHOD_PARAMS}toJSON(){return Object.assign(Object.assign({},super.toJSON()),{hint:this.hint})}}t.InvalidMethodParamsError=s;class a extends i.BaseWeb3Error{constructor(){super(...arguments),this.code=n.ERR_FORMATTERS}}t.FormatterError=a;class c extends i.BaseWeb3Error{constructor(){super("The method you're trying to call is not implemented."),this.code=n.ERR_METHOD_NOT_IMPLEMENTED}}t.MethodNotImplementedError=c;class u extends i.BaseWeb3Error{constructor(){super(...arguments),this.code=n.ERR_OPERATION_TIMEOUT}}t.OperationTimeoutError=u;class d extends i.BaseWeb3Error{constructor(){super(...arguments),this.code=n.ERR_OPERATION_ABORT}}t.OperationAbortError=d;class l extends i.BaseWeb3Error{constructor(e,t){super(e),this.code=n.ERR_ABI_ENCODING,this.props=null!=t?t:{}}}t.AbiError=l;class h extends i.BaseWeb3Error{constructor(e){super(`A plugin with the namespace: ${e} has already been registered.`),this.code=n.ERR_EXISTING_PLUGIN_NAMESPACE}}t.ExistingPluginNamespaceError=h},7108:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.Web3WSProviderError=t.SubscriptionError=t.InvalidClientError=t.InvalidProviderError=t.ProviderError=void 0;const n=r(7639),i=r(3685);class o extends i.BaseWeb3Error{constructor(){super(...arguments),this.code=n.ERR_PROVIDER}}t.ProviderError=o;class s extends i.BaseWeb3Error{constructor(e){super(`Provider with url "${e}" is not set or invalid`),this.clientUrl=e,this.code=n.ERR_INVALID_PROVIDER}}t.InvalidProviderError=s;class a extends i.BaseWeb3Error{constructor(e){super(`Client URL "${e}" is invalid.`),this.code=n.ERR_INVALID_CLIENT}}t.InvalidClientError=a;class c extends i.BaseWeb3Error{constructor(){super(...arguments),this.code=n.ERR_SUBSCRIPTION}}t.SubscriptionError=c;class u extends i.BaseWeb3Error{constructor(){super(...arguments),this.code=n.ERR_WS_PROVIDER}}t.Web3WSProviderError=u},9491:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.InvalidResponseError=t.ResponseError=void 0;const n=r(3685),i=r(7639),o=e=>(e=>!(Array.isArray(e)||"2.0"!==e.jsonrpc||!e||void 0!==e.result&&null!==e.result||!("error"in e)||"number"!=typeof e.id&&"string"!=typeof e.id))(e)?e.error.message:"";class s extends n.BaseWeb3Error{constructor(e,t,r){var n;let s;super(null!=t?t:`Returned error: ${Array.isArray(e)?e.map((e=>o(e))).join(","):o(e)}`),this.code=i.ERR_RESPONSE,t||(this.data=Array.isArray(e)?e.map((e=>{var t;return null===(t=e.error)||void 0===t?void 0:t.data})):null===(n=null==e?void 0:e.error)||void 0===n?void 0:n.data),this.request=r,"error"in e?s=e.error:e instanceof Array&&(s=e.map((e=>e.error))),this.innerError=s}toJSON(){return Object.assign(Object.assign({},super.toJSON()),{data:this.data,request:this.request})}}t.ResponseError=s,t.InvalidResponseError=class extends s{constructor(e,t){let r;super(e,void 0,t),this.code=i.ERR_INVALID_RESPONSE,"error"in e?r=e.error:e instanceof Array&&(r=e.map((e=>e.error))),this.innerError=r}}},4032:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.RpcErrorMessages=t.genericRpcErrorMessageTemplate=void 0;const n=r(7639);t.genericRpcErrorMessageTemplate="An Rpc error has occured with a code of *code*",t.RpcErrorMessages={[n.ERR_RPC_INVALID_JSON]:{message:"Parse error",description:"Invalid JSON"},[n.ERR_RPC_INVALID_REQUEST]:{message:"Invalid request",description:"JSON is not a valid request object\t"},[n.ERR_RPC_INVALID_METHOD]:{message:"Method not found",description:"Method does not exist\t"},[n.ERR_RPC_INVALID_PARAMS]:{message:"Invalid params",description:"Invalid method parameters"},[n.ERR_RPC_INTERNAL_ERROR]:{message:"Internal error",description:"Internal JSON-RPC error"},[n.ERR_RPC_INVALID_INPUT]:{message:"Invalid input",description:"Missing or invalid parameters"},[n.ERR_RPC_MISSING_RESOURCE]:{message:"Resource not found",description:"Requested resource not found"},[n.ERR_RPC_UNAVAILABLE_RESOURCE]:{message:"Resource unavailable",description:"Requested resource not available"},[n.ERR_RPC_TRANSACTION_REJECTED]:{message:"Transaction rejected",description:"Transaction creation failed"},[n.ERR_RPC_UNSUPPORTED_METHOD]:{message:"Method not supported",description:"Method is not implemented"},[n.ERR_RPC_LIMIT_EXCEEDED]:{message:"Limit exceeded",description:"Request exceeds defined limit"},[n.ERR_RPC_NOT_SUPPORTED]:{message:"JSON-RPC version not supported",description:"Version of JSON-RPC protocol is not supported"},[n.JSONRPC_ERR_REJECTED_REQUEST]:{name:"User Rejected Request",message:"The user rejected the request."},[n.JSONRPC_ERR_UNAUTHORIZED]:{name:"Unauthorized",message:"The requested method and/or account has not been authorized by the user."},[n.JSONRPC_ERR_UNSUPPORTED_METHOD]:{name:"Unsupported Method",message:"The Provider does not support the requested method."},[n.JSONRPC_ERR_DISCONNECTED]:{name:"Disconnected",message:"The Provider is disconnected from all chains."},[n.JSONRPC_ERR_CHAIN_DISCONNECTED]:{name:"Chain Disconnected",message:"The Provider is not connected to the requested chain."},"0-999":{name:"",message:"Not used."},1e3:{name:"Normal Closure",message:"The connection successfully completed the purpose for which it was created."},1001:{name:"Going Away",message:"The endpoint is going away, either because of a server failure or because the browser is navigating away from the page that opened the connection."},1002:{name:"Protocol error",message:"The endpoint is terminating the connection due to a protocol error."},1003:{name:"Unsupported Data",message:"The connection is being terminated because the endpoint received data of a type it cannot accept. (For example, a text-only endpoint received binary data.)"},1004:{name:"Reserved",message:"Reserved. A meaning might be defined in the future."},1005:{name:"No Status Rcvd",message:"Reserved. Indicates that no status code was provided even though one was expected."},1006:{name:"Abnormal Closure",message:"Reserved. Indicates that a connection was closed abnormally (that is, with no close frame being sent) when a status code is expected."},1007:{name:"Invalid frame payload data",message:"The endpoint is terminating the connection because a message was received that contained inconsistent data (e.g., non-UTF-8 data within a text message)."},1008:{name:"Policy Violation",message:"The endpoint is terminating the connection because it received a message that violates its policy. This is a generic status code, used when codes 1003 and 1009 are not suitable."},1009:{name:"Message Too Big",message:"The endpoint is terminating the connection because a data frame was received that is too large."},1010:{name:"Mandatory Ext.",message:"The client is terminating the connection because it expected the server to negotiate one or more extension, but the server didn't."},1011:{name:"Internal Error",message:"The server is terminating the connection because it encountered an unexpected condition that prevented it from fulfilling the request."},1012:{name:"Service Restart",message:"The server is terminating the connection because it is restarting."},1013:{name:"Try Again Later",message:"The server is terminating the connection due to a temporary condition, e.g. it is overloaded and is casting off some of its clients."},1014:{name:"Bad Gateway",message:"The server was acting as a gateway or proxy and received an invalid response from the upstream server. This is similar to 502 HTTP Status Code."},1015:{name:"TLS handshake",message:"Reserved. Indicates that the connection was closed due to a failure to perform a TLS handshake (e.g., the server certificate can't be verified)."},"1016-2999":{name:"",message:"For definition by future revisions of the WebSocket Protocol specification, and for definition by extension specifications."},"3000-3999":{name:"",message:"For use by libraries, frameworks, and applications. These status codes are registered directly with IANA. The interpretation of these codes is undefined by the WebSocket protocol."},"4000-4999":{name:"",message:"For private use, and thus can't be registered. Such codes can be used by prior agreements between WebSocket applications. The interpretation of these codes is undefined by the WebSocket protocol."}}},655:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.rpcErrorsMap=t.LimitExceededError=t.TransactionRejectedError=t.VersionNotSupportedError=t.ResourcesNotFoundError=t.ResourceUnavailableError=t.MethodNotSupported=t.InvalidInputError=t.InternalError=t.InvalidParamsError=t.MethodNotFoundError=t.InvalidRequestError=t.ParseError=t.EIP1193ProviderRpcError=t.RpcError=void 0;const n=r(3685),i=r(7639),o=r(4032);class s extends n.BaseWeb3Error{constructor(e,t){super(null!=t?t:o.genericRpcErrorMessageTemplate.replace("*code*",e.error.code.toString())),this.code=e.error.code,this.id=e.id,this.jsonrpc=e.jsonrpc,this.jsonRpcError=e.error}toJSON(){return Object.assign(Object.assign({},super.toJSON()),{error:this.jsonRpcError,id:this.id,jsonRpc:this.jsonrpc})}}t.RpcError=s;class a extends n.BaseWeb3Error{constructor(e,t){var r,n,i,s;if(e)if(null===(r=o.RpcErrorMessages[e])||void 0===r?void 0:r.message)super(o.RpcErrorMessages[e].message);else{const t=Object.keys(o.RpcErrorMessages).find((t=>"string"==typeof t&&e>=parseInt(t.split("-")[0],10)&&e<=parseInt(t.split("-")[1],10)));super(null!==(i=null===(n=o.RpcErrorMessages[null!=t?t:""])||void 0===n?void 0:n.message)&&void 0!==i?i:o.genericRpcErrorMessageTemplate.replace("*code*",null!==(s=null==e?void 0:e.toString())&&void 0!==s?s:'""'))}else super();this.code=e,this.data=t}}t.EIP1193ProviderRpcError=a;class c extends s{constructor(e){super(e,o.RpcErrorMessages[i.ERR_RPC_INVALID_JSON].message),this.code=i.ERR_RPC_INVALID_JSON}}t.ParseError=c;class u extends s{constructor(e){super(e,o.RpcErrorMessages[i.ERR_RPC_INVALID_REQUEST].message),this.code=i.ERR_RPC_INVALID_REQUEST}}t.InvalidRequestError=u;class d extends s{constructor(e){super(e,o.RpcErrorMessages[i.ERR_RPC_INVALID_METHOD].message),this.code=i.ERR_RPC_INVALID_METHOD}}t.MethodNotFoundError=d;class l extends s{constructor(e){super(e,o.RpcErrorMessages[i.ERR_RPC_INVALID_PARAMS].message),this.code=i.ERR_RPC_INVALID_PARAMS}}t.InvalidParamsError=l;class h extends s{constructor(e){super(e,o.RpcErrorMessages[i.ERR_RPC_INTERNAL_ERROR].message),this.code=i.ERR_RPC_INTERNAL_ERROR}}t.InternalError=h;class f extends s{constructor(e){super(e,o.RpcErrorMessages[i.ERR_RPC_INVALID_INPUT].message),this.code=i.ERR_RPC_INVALID_INPUT}}t.InvalidInputError=f;class p extends s{constructor(e){super(e,o.RpcErrorMessages[i.ERR_RPC_UNSUPPORTED_METHOD].message),this.code=i.ERR_RPC_UNSUPPORTED_METHOD}}t.MethodNotSupported=p;class m extends s{constructor(e){super(e,o.RpcErrorMessages[i.ERR_RPC_UNAVAILABLE_RESOURCE].message),this.code=i.ERR_RPC_UNAVAILABLE_RESOURCE}}t.ResourceUnavailableError=m;class g extends s{constructor(e){super(e,o.RpcErrorMessages[i.ERR_RPC_MISSING_RESOURCE].message),this.code=i.ERR_RPC_MISSING_RESOURCE}}t.ResourcesNotFoundError=g;class y extends s{constructor(e){super(e,o.RpcErrorMessages[i.ERR_RPC_NOT_SUPPORTED].message),this.code=i.ERR_RPC_NOT_SUPPORTED}}t.VersionNotSupportedError=y;class v extends s{constructor(e){super(e,o.RpcErrorMessages[i.ERR_RPC_TRANSACTION_REJECTED].message),this.code=i.ERR_RPC_TRANSACTION_REJECTED}}t.TransactionRejectedError=v;class b extends s{constructor(e){super(e,o.RpcErrorMessages[i.ERR_RPC_LIMIT_EXCEEDED].message),this.code=i.ERR_RPC_LIMIT_EXCEEDED}}t.LimitExceededError=b,t.rpcErrorsMap=new Map,t.rpcErrorsMap.set(i.ERR_RPC_INVALID_JSON,{error:c}),t.rpcErrorsMap.set(i.ERR_RPC_INVALID_REQUEST,{error:u}),t.rpcErrorsMap.set(i.ERR_RPC_INVALID_METHOD,{error:d}),t.rpcErrorsMap.set(i.ERR_RPC_INVALID_PARAMS,{error:l}),t.rpcErrorsMap.set(i.ERR_RPC_INTERNAL_ERROR,{error:h}),t.rpcErrorsMap.set(i.ERR_RPC_INVALID_INPUT,{error:f}),t.rpcErrorsMap.set(i.ERR_RPC_UNSUPPORTED_METHOD,{error:p}),t.rpcErrorsMap.set(i.ERR_RPC_UNAVAILABLE_RESOURCE,{error:m}),t.rpcErrorsMap.set(i.ERR_RPC_TRANSACTION_REJECTED,{error:v}),t.rpcErrorsMap.set(i.ERR_RPC_MISSING_RESOURCE,{error:g}),t.rpcErrorsMap.set(i.ERR_RPC_NOT_SUPPORTED,{error:y}),t.rpcErrorsMap.set(i.ERR_RPC_LIMIT_EXCEEDED,{error:b})},1066:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.SchemaFormatError=void 0;const n=r(7639),i=r(3685);class o extends i.BaseWeb3Error{constructor(e){super(`Format for the type ${e} is unsupported`),this.type=e,this.code=n.ERR_SCHEMA_FORMAT}toJSON(){return Object.assign(Object.assign({},super.toJSON()),{type:this.type})}}t.SchemaFormatError=o},1075:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.SignatureError=void 0;const n=r(7639),i=r(3685);class o extends i.InvalidValueError{constructor(){super(...arguments),this.code=n.ERR_SIGNATURE_FAILED}}t.SignatureError=o},8450:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.InvalidPropertiesForTransactionTypeError=t.LocalWalletNotAvailableError=t.TransactionSigningError=t.TransactionReceiptMissingBlockNumberError=t.TransactionMissingReceiptOrBlockHashError=t.TransactionBlockTimeoutError=t.TransactionPollingTimeoutError=t.TransactionSendTimeoutError=t.TransactionDataAndInputError=t.UnsupportedTransactionTypeError=t.Eip1559NotSupportedError=t.UnableToPopulateNonceError=t.InvalidNonceOrChainIdError=t.InvalidTransactionObjectError=t.UnsupportedFeeMarketError=t.Eip1559GasPriceError=t.InvalidMaxPriorityFeePerGasOrMaxFeePerGas=t.InvalidGasOrGasPrice=t.TransactionGasMismatchError=t.TransactionGasMismatchInnerError=t.MissingGasError=t.MissingGasInnerError=t.MissingChainOrHardforkError=t.CommonOrChainAndHardforkError=t.HardforkMismatchError=t.ChainMismatchError=t.ChainIdMismatchError=t.MissingCustomChainIdError=t.MissingCustomChainError=t.InvalidTransactionCall=t.InvalidTransactionWithReceiver=t.InvalidTransactionWithSender=t.TransactionNotFound=t.UndefinedRawTransactionError=t.TransactionOutOfGasError=t.TransactionRevertedWithoutReasonError=t.ContractCodeNotStoredError=t.NoContractAddressFoundError=t.TransactionRevertWithCustomError=t.TransactionRevertInstructionError=t.RevertInstructionError=t.TransactionError=void 0;const n=r(7639),i=r(3685);class o extends i.BaseWeb3Error{constructor(e,t){super(e),this.receipt=t,this.code=n.ERR_TX}toJSON(){return Object.assign(Object.assign({},super.toJSON()),{receipt:this.receipt})}}t.TransactionError=o;class s extends i.BaseWeb3Error{constructor(e,t){super(`Your request got reverted with the following reason string: ${e}`),this.reason=e,this.signature=t,this.code=n.ERR_TX_REVERT_INSTRUCTION}toJSON(){return Object.assign(Object.assign({},super.toJSON()),{reason:this.reason,signature:this.signature})}}t.RevertInstructionError=s;class a extends i.BaseWeb3Error{constructor(e,t,r,o){super("Transaction has been reverted by the EVM"+(void 0===r?"":`:\n ${i.BaseWeb3Error.convertToString(r)}`)),this.reason=e,this.signature=t,this.receipt=r,this.data=o,this.code=n.ERR_TX_REVERT_TRANSACTION}toJSON(){return Object.assign(Object.assign({},super.toJSON()),{reason:this.reason,signature:this.signature,receipt:this.receipt,data:this.data})}}t.TransactionRevertInstructionError=a,t.TransactionRevertWithCustomError=class extends a{constructor(e,t,r,i,o,s,a){super(e),this.reason=e,this.customErrorName=t,this.customErrorDecodedSignature=r,this.customErrorArguments=i,this.signature=o,this.receipt=s,this.data=a,this.code=n.ERR_TX_REVERT_TRANSACTION_CUSTOM_ERROR}toJSON(){return Object.assign(Object.assign({},super.toJSON()),{reason:this.reason,customErrorName:this.customErrorName,customErrorDecodedSignature:this.customErrorDecodedSignature,customErrorArguments:this.customErrorArguments,signature:this.signature,receipt:this.receipt,data:this.data})}},t.NoContractAddressFoundError=class extends o{constructor(e){super("The transaction receipt didn't contain a contract address.",e),this.code=n.ERR_TX_NO_CONTRACT_ADDRESS}toJSON(){return Object.assign(Object.assign({},super.toJSON()),{receipt:this.receipt})}},t.ContractCodeNotStoredError=class extends o{constructor(e){super("The contract code couldn't be stored, please check your gas limit.",e),this.code=n.ERR_TX_CONTRACT_NOT_STORED}},t.TransactionRevertedWithoutReasonError=class extends o{constructor(e){super("Transaction has been reverted by the EVM"+(void 0===e?"":`:\n ${i.BaseWeb3Error.convertToString(e)}`),e),this.code=n.ERR_TX_REVERT_WITHOUT_REASON}},t.TransactionOutOfGasError=class extends o{constructor(e){super(`Transaction ran out of gas. Please provide more gas:\n ${JSON.stringify(e,void 0,2)}`,e),this.code=n.ERR_TX_OUT_OF_GAS}},t.UndefinedRawTransactionError=class extends o{constructor(){super("Raw transaction undefined"),this.code=n.ERR_RAW_TX_UNDEFINED}},t.TransactionNotFound=class extends o{constructor(){super("Transaction not found"),this.code=n.ERR_TX_NOT_FOUND}};class c extends i.InvalidValueError{constructor(e){super(e,"invalid transaction with invalid sender"),this.code=n.ERR_TX_INVALID_SENDER}}t.InvalidTransactionWithSender=c;class u extends i.InvalidValueError{constructor(e){super(e,"invalid transaction with invalid receiver"),this.code=n.ERR_TX_INVALID_RECEIVER}}t.InvalidTransactionWithReceiver=u;class d extends i.InvalidValueError{constructor(e){super(e,"invalid transaction call"),this.code=n.ERR_TX_INVALID_CALL}}t.InvalidTransactionCall=d;class l extends i.InvalidValueError{constructor(){super("MissingCustomChainError","If tx.common is provided it must have tx.common.customChain"),this.code=n.ERR_TX_MISSING_CUSTOM_CHAIN}}t.MissingCustomChainError=l;class h extends i.InvalidValueError{constructor(){super("MissingCustomChainIdError","If tx.common is provided it must have tx.common.customChain and tx.common.customChain.chainId"),this.code=n.ERR_TX_MISSING_CUSTOM_CHAIN_ID}}t.MissingCustomChainIdError=h;class f extends i.InvalidValueError{constructor(e){super(JSON.stringify(e),"Chain Id doesnt match in tx.chainId tx.common.customChain.chainId"),this.code=n.ERR_TX_CHAIN_ID_MISMATCH}}t.ChainIdMismatchError=f;class p extends i.InvalidValueError{constructor(e){super(JSON.stringify(e),"Chain doesnt match in tx.chain tx.common.basechain"),this.code=n.ERR_TX_CHAIN_MISMATCH}}t.ChainMismatchError=p;class m extends i.InvalidValueError{constructor(e){super(JSON.stringify(e),"hardfork doesnt match in tx.hardfork tx.common.hardfork"),this.code=n.ERR_TX_HARDFORK_MISMATCH}}t.HardforkMismatchError=m;class g extends i.InvalidValueError{constructor(){super("CommonOrChainAndHardforkError","Please provide the common object or the chain and hardfork property but not all together."),this.code=n.ERR_TX_INVALID_CHAIN_INFO}}t.CommonOrChainAndHardforkError=g;class y extends i.InvalidValueError{constructor(e){var t,r;super("MissingChainOrHardforkError",`When specifying chain and hardfork, both values must be defined. Received "chain": ${null!==(t=e.chain)&&void 0!==t?t:"undefined"}, "hardfork": ${null!==(r=e.hardfork)&&void 0!==r?r:"undefined"}`),this.code=n.ERR_TX_MISSING_CHAIN_INFO}}t.MissingChainOrHardforkError=y;class v extends i.BaseWeb3Error{constructor(){super('Missing properties in transaction, either define "gas" and "gasPrice" for type 0 transactions or "gas", "maxPriorityFeePerGas" and "maxFeePerGas" for type 2 transactions'),this.code=n.ERR_TX_MISSING_GAS_INNER_ERROR}}t.MissingGasInnerError=v;class b extends i.InvalidValueError{constructor(e){var t,r,i,o;super(`gas: ${null!==(t=e.gas)&&void 0!==t?t:"undefined"}, gasPrice: ${null!==(r=e.gasPrice)&&void 0!==r?r:"undefined"}, maxPriorityFeePerGas: ${null!==(i=e.maxPriorityFeePerGas)&&void 0!==i?i:"undefined"}, maxFeePerGas: ${null!==(o=e.maxFeePerGas)&&void 0!==o?o:"undefined"}`,'"gas" is missing'),this.code=n.ERR_TX_MISSING_GAS,this.innerError=new v}}t.MissingGasError=b;class E extends i.BaseWeb3Error{constructor(){super('Missing properties in transaction, either define "gas" and "gasPrice" for type 0 transactions or "gas", "maxPriorityFeePerGas" and "maxFeePerGas" for type 2 transactions, not both'),this.code=n.ERR_TX_GAS_MISMATCH_INNER_ERROR}}t.TransactionGasMismatchInnerError=E;class _ extends i.InvalidValueError{constructor(e){var t,r,i,o;super(`gas: ${null!==(t=e.gas)&&void 0!==t?t:"undefined"}, gasPrice: ${null!==(r=e.gasPrice)&&void 0!==r?r:"undefined"}, maxPriorityFeePerGas: ${null!==(i=e.maxPriorityFeePerGas)&&void 0!==i?i:"undefined"}, maxFeePerGas: ${null!==(o=e.maxFeePerGas)&&void 0!==o?o:"undefined"}`,"transaction must specify legacy or fee market gas properties, not both"),this.code=n.ERR_TX_GAS_MISMATCH,this.innerError=new E}}t.TransactionGasMismatchError=_;class A extends i.InvalidValueError{constructor(e){var t,r;super(`gas: ${null!==(t=e.gas)&&void 0!==t?t:"undefined"}, gasPrice: ${null!==(r=e.gasPrice)&&void 0!==r?r:"undefined"}`,"Gas or gasPrice is lower than 0"),this.code=n.ERR_TX_INVALID_LEGACY_GAS}}t.InvalidGasOrGasPrice=A;class T extends i.InvalidValueError{constructor(e){var t,r;super(`maxPriorityFeePerGas: ${null!==(t=e.maxPriorityFeePerGas)&&void 0!==t?t:"undefined"}, maxFeePerGas: ${null!==(r=e.maxFeePerGas)&&void 0!==r?r:"undefined"}`,"maxPriorityFeePerGas or maxFeePerGas is lower than 0"),this.code=n.ERR_TX_INVALID_FEE_MARKET_GAS}}t.InvalidMaxPriorityFeePerGasOrMaxFeePerGas=T;class I extends i.InvalidValueError{constructor(e){super(e,"eip-1559 transactions don't support gasPrice"),this.code=n.ERR_TX_INVALID_FEE_MARKET_GAS_PRICE}}t.Eip1559GasPriceError=I;class R extends i.InvalidValueError{constructor(e){var t,r;super(`maxPriorityFeePerGas: ${null!==(t=e.maxPriorityFeePerGas)&&void 0!==t?t:"undefined"}, maxFeePerGas: ${null!==(r=e.maxFeePerGas)&&void 0!==r?r:"undefined"}`,"pre-eip-1559 transaction don't support maxFeePerGas/maxPriorityFeePerGas"),this.code=n.ERR_TX_INVALID_LEGACY_FEE_MARKET}}t.UnsupportedFeeMarketError=R;class w extends i.InvalidValueError{constructor(e){super(e,"invalid transaction object"),this.code=n.ERR_TX_INVALID_OBJECT}}t.InvalidTransactionObjectError=w;class P extends i.InvalidValueError{constructor(e){var t,r;super(`nonce: ${null!==(t=e.nonce)&&void 0!==t?t:"undefined"}, chainId: ${null!==(r=e.chainId)&&void 0!==r?r:"undefined"}`,"Nonce or chainId is lower than 0"),this.code=n.ERR_TX_INVALID_NONCE_OR_CHAIN_ID}}t.InvalidNonceOrChainIdError=P;class x extends i.InvalidValueError{constructor(){super("UnableToPopulateNonceError","unable to populate nonce, no from address available"),this.code=n.ERR_TX_UNABLE_TO_POPULATE_NONCE}}t.UnableToPopulateNonceError=x;class S extends i.InvalidValueError{constructor(){super("Eip1559NotSupportedError","Network doesn't support eip-1559"),this.code=n.ERR_TX_UNSUPPORTED_EIP_1559}}t.Eip1559NotSupportedError=S;class O extends i.InvalidValueError{constructor(e){super(e,"unsupported transaction type"),this.code=n.ERR_TX_UNSUPPORTED_TYPE}}t.UnsupportedTransactionTypeError=O;class C extends i.InvalidValueError{constructor(e){var t,r;super(`data: ${null!==(t=e.data)&&void 0!==t?t:"undefined"}, input: ${null!==(r=e.input)&&void 0!==r?r:"undefined"}`,'You can\'t have "data" and "input" as properties of transactions at the same time, please use either "data" or "input" instead.'),this.code=n.ERR_TX_DATA_AND_INPUT}}t.TransactionDataAndInputError=C;class B extends i.BaseWeb3Error{constructor(e){super(`The connected Ethereum Node did not respond within ${e.numberOfSeconds} seconds, please make sure your transaction was properly sent and you are connected to a healthy Node. Be aware that transaction might still be pending or mined!\n\tTransaction Hash: ${e.transactionHash?e.transactionHash.toString():"not available"}`),this.code=n.ERR_TX_SEND_TIMEOUT}}function N(e){return`Please make sure your transaction was properly sent and there are no previous pending transaction for the same account. However, be aware that it might still be mined!\n\tTransaction Hash: ${e?e.toString():"not available"}`}t.TransactionSendTimeoutError=B;class k extends i.BaseWeb3Error{constructor(e){super(`Transaction was not mined within ${e.numberOfSeconds} seconds. ${N(e.transactionHash)}`),this.code=n.ERR_TX_POLLING_TIMEOUT}}t.TransactionPollingTimeoutError=k;class M extends i.BaseWeb3Error{constructor(e){super(`Transaction started at ${e.starterBlockNumber} but was not mined within ${e.numberOfBlocks} blocks. ${N(e.transactionHash)}`),this.code=n.ERR_TX_BLOCK_TIMEOUT}}t.TransactionBlockTimeoutError=M;class D extends i.InvalidValueError{constructor(e){var t,r;super(`receipt: ${JSON.stringify(e.receipt)}, blockHash: ${null===(t=e.blockHash)||void 0===t?void 0:t.toString()}, transactionHash: ${null===(r=e.transactionHash)||void 0===r?void 0:r.toString()}`,"Receipt missing or blockHash null"),this.code=n.ERR_TX_RECEIPT_MISSING_OR_BLOCKHASH_NULL}}t.TransactionMissingReceiptOrBlockHashError=D;class L extends i.InvalidValueError{constructor(e){super(`receipt: ${JSON.stringify(e.receipt)}`,"Receipt missing block number"),this.code=n.ERR_TX_RECEIPT_MISSING_BLOCK_NUMBER}}t.TransactionReceiptMissingBlockNumberError=L;class F extends i.BaseWeb3Error{constructor(e){super(`Invalid signature. "${e}"`),this.code=n.ERR_TX_SIGNING}}t.TransactionSigningError=F;class j extends i.InvalidValueError{constructor(){super("LocalWalletNotAvailableError","Attempted to index account in local wallet, but no wallet is available"),this.code=n.ERR_TX_LOCAL_WALLET_NOT_AVAILABLE}}t.LocalWalletNotAvailableError=j;class H extends i.BaseWeb3Error{constructor(e,t){const r=[];e.forEach((e=>r.push(e.keyword))),super(`The following properties are invalid for the transaction type ${t}: ${r.join(", ")}`),this.code=n.ERR_TX_INVALID_PROPERTIES_FOR_TYPE}}t.InvalidPropertiesForTransactionTypeError=H},4618:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.InvalidTypeAbiInputError=t.InvalidBlockError=t.InvalidLargeValueError=t.InvalidSizeError=t.InvalidUnsignedIntegerError=t.InvalidBooleanError=t.InvalidTypeError=t.NibbleWidthError=t.HexProcessingError=t.InvalidUnitError=t.InvalidStringError=t.InvalidAddressError=t.InvalidNumberError=t.InvalidBytesError=void 0;const n=r(7639),i=r(3685);class o extends i.InvalidValueError{constructor(e){super(e,"can not parse as byte data"),this.code=n.ERR_INVALID_BYTES}}t.InvalidBytesError=o;class s extends i.InvalidValueError{constructor(e){super(e,"can not parse as number data"),this.code=n.ERR_INVALID_NUMBER}}t.InvalidNumberError=s;class a extends i.InvalidValueError{constructor(e){super(e,"invalid ethereum address"),this.code=n.ERR_INVALID_ADDRESS}}t.InvalidAddressError=a;class c extends i.InvalidValueError{constructor(e){super(e,"not a valid string"),this.code=n.ERR_INVALID_STRING}}t.InvalidStringError=c;class u extends i.InvalidValueError{constructor(e){super(e,"invalid unit"),this.code=n.ERR_INVALID_UNIT}}t.InvalidUnitError=u;class d extends i.InvalidValueError{constructor(e){super(e,"can not be converted to hex"),this.code=n.ERR_INVALID_HEX}}t.HexProcessingError=d;class l extends i.InvalidValueError{constructor(e){super(e,"value greater than the nibble width"),this.code=n.ERR_INVALID_NIBBLE_WIDTH}}t.NibbleWidthError=l;class h extends i.InvalidValueError{constructor(e){super(e,"invalid type, type not supported"),this.code=n.ERR_INVALID_TYPE}}t.InvalidTypeError=h;class f extends i.InvalidValueError{constructor(e){super(e,"not a valid boolean."),this.code=n.ERR_INVALID_BOOLEAN}}t.InvalidBooleanError=f;class p extends i.InvalidValueError{constructor(e){super(e,"not a valid unsigned integer."),this.code=n.ERR_INVALID_UNSIGNED_INTEGER}}t.InvalidUnsignedIntegerError=p;class m extends i.InvalidValueError{constructor(e){super(e,"invalid size given."),this.code=n.ERR_INVALID_SIZE}}t.InvalidSizeError=m;class g extends i.InvalidValueError{constructor(e){super(e,"value is larger than size."),this.code=n.ERR_INVALID_LARGE_VALUE}}t.InvalidLargeValueError=g;class y extends i.InvalidValueError{constructor(e){super(e,"invalid string given"),this.code=n.ERR_INVALID_BLOCK}}t.InvalidBlockError=y;class v extends i.InvalidValueError{constructor(e){super(e,"components found but type is not tuple"),this.code=n.ERR_INVALID_TYPE_ABI}}t.InvalidTypeAbiInputError=v},5071:function(e,t,r){"use strict";var n=this&&this.__createBinding||(Object.create?function(e,t,r,n){void 0===n&&(n=r);var i=Object.getOwnPropertyDescriptor(t,r);i&&!("get"in i?!t.__esModule:i.writable||i.configurable)||(i={enumerable:!0,get:function(){return t[r]}}),Object.defineProperty(e,n,i)}:function(e,t,r,n){void 0===n&&(n=r),e[n]=t[r]}),i=this&&this.__exportStar||function(e,t){for(var r in e)"default"===r||Object.prototype.hasOwnProperty.call(t,r)||n(t,e,r)};Object.defineProperty(t,"__esModule",{value:!0}),i(r(7639),t),i(r(3685),t),i(r(8105),t),i(r(3789),t),i(r(510),t),i(r(1591),t),i(r(7297),t),i(r(7108),t),i(r(1075),t),i(r(8450),t),i(r(4618),t),i(r(9491),t),i(r(3628),t),i(r(655),t),i(r(4032),t),i(r(1066),t)},3685:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.InvalidValueError=t.BaseWeb3Error=void 0;class r extends Error{constructor(e,t){super(e),this.innerError=t,this.name=this.constructor.name,"function"==typeof Error.captureStackTrace?Error.captureStackTrace(new.target.constructor):this.stack=(new Error).stack}static convertToString(e,t=!1){if(null==e)return"undefined";const r=JSON.stringify(e,((e,t)=>"bigint"==typeof t?t.toString():t));return t&&["bigint","string"].includes(typeof e)?r.replace(/['\\"]+/g,""):r}toJSON(){return{name:this.name,code:this.code,message:this.message,innerError:this.innerError}}}t.BaseWeb3Error=r,t.InvalidValueError=class extends r{constructor(e,t){super(`Invalid value given "${r.convertToString(e,!0)}". Error: ${t}.`),this.name=this.constructor.name}}},9722:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.encodeErrorSignature=void 0;const n=r(9634),i=r(5071),o=r(1583);t.encodeErrorSignature=e=>{if("string"!=typeof e&&!(0,o.isAbiErrorFragment)(e))throw new i.AbiError("Invalid parameter value in encodeErrorSignature");let t;return t=!e||"function"!=typeof e&&"object"!=typeof e?e:(0,o.jsonInterfaceMethodToString)(e),(0,n.sha3Raw)(t)}},5893:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.encodeEventSignature=void 0;const n=r(9634),i=r(5071),o=r(1583);t.encodeEventSignature=e=>{if("string"!=typeof e&&!(0,o.isAbiEventFragment)(e))throw new i.AbiError("Invalid parameter value in encodeEventSignature");let t;return t=!e||"function"!=typeof e&&"object"!=typeof e?e:(0,o.jsonInterfaceMethodToString)(e),(0,n.sha3Raw)(t)}},3249:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.encodeFunctionCall=t.encodeFunctionSignature=void 0;const n=r(5071),i=r(9634),o=r(1583),s=r(4566);t.encodeFunctionSignature=e=>{if("string"!=typeof e&&!(0,o.isAbiFunctionFragment)(e))throw new n.AbiError("Invalid parameter value in encodeFunctionSignature");let t;return t=!e||"function"!=typeof e&&"object"!=typeof e?e:(0,o.jsonInterfaceMethodToString)(e),(0,i.sha3Raw)(t).slice(0,10)},t.encodeFunctionCall=(e,r)=>{var i;if(!(0,o.isAbiFunctionFragment)(e))throw new n.AbiError("Invalid parameter value in encodeFunctionCall");return`${(0,t.encodeFunctionSignature)(e)}${(0,s.encodeParameters)(null!==(i=e.inputs)&&void 0!==i?i:[],null!=r?r:[]).replace("0x","")}`}},734:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.decodeLog=void 0;const n=r(4566),i=["bool","string","int","uint","address","fixed","ufixed"];t.decodeLog=(e,t,r)=>{const o=Array.isArray(r)?r:[r],s={},a={};for(const[t,r]of e.entries())r.indexed?s[t]=r:a[t]=r;const c=t?(0,n.decodeParametersWith)(Object.values(a),t,!0):{__length__:0},u=o.length-Object.keys(s).length,d=Object.values(s).map(((e,t)=>{return i.some((t=>e.type.startsWith(t)))?(r=e.type,s=o[t+u],"string"===r?s:(0,n.decodeParameter)(r,s)):o[t+u];var r,s})),l={__length__:0};let h=0,f=0;for(const[t,r]of e.entries())l[t]="string"===r.type?"":void 0,s[t]&&(l[t]=d[h],h+=1),a[t]&&(l[t]=c[String(f)],f+=1),r.name&&(l[r.name]=l[t]),l.__length__+=1;return l}},4566:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.decodeParameter=t.decodeParameters=t.decodeParametersWith=t.encodeParameter=t.encodeParameters=void 0;const n=r(5071),i=r(6729),o=r(4581);t.encodeParameters=(e,t)=>(0,o.encodeParameters)(e,t),t.encodeParameter=(e,r)=>(0,t.encodeParameters)([e],[r]),t.decodeParametersWith=(e,t,r)=>{try{if(e.length>0&&(!t||"0x"===t||"0X"===t))throw new n.AbiError("Returned values aren't valid, did it run Out of Gas? You might also see this error if you are not using the correct ABI for the contract you are retrieving data from, requesting data from a block number that does not exist, or querying a node which is not fully synced.");return(0,i.decodeParameters)(e,`0x${t.replace(/0x/i,"")}`,r)}catch(e){throw new n.AbiError(`Parameter decoding error: ${e.message}`,{internalErr:e})}},t.decodeParameters=(e,r)=>(0,t.decodeParametersWith)(e,r,!1),t.decodeParameter=(e,r)=>(0,t.decodeParameters)([e],r)[0]},1691:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.decodeAddress=t.encodeAddress=void 0;const n=r(5071),i=r(9634),o=r(7345),s=r(3852),a=s.WORD_SIZE-20;t.encodeAddress=function(e,t){if("string"!=typeof t)throw new n.AbiError("address type expects string as input type",{value:t,name:e.name,type:e.type});let r=t.toLowerCase();if(r.startsWith("0x")||(r=`0x${r}`),!(0,o.isAddress)(r))throw new n.AbiError("provided input is not valid address",{value:t,name:e.name,type:e.type});const i=o.utils.hexToUint8Array(r),c=(0,s.alloc)(s.WORD_SIZE);return c.set(i,a),{dynamic:!1,encoded:c}},t.decodeAddress=function(e,t){const r=t.subarray(a,s.WORD_SIZE);if(20!==r.length)throw new n.AbiError("Invalid decoding input, not enough bytes to decode address",{bytes:t});const c=o.utils.uint8ArrayToHexString(r);return{result:(0,i.toChecksumAddress)(c),encoded:t.subarray(s.WORD_SIZE),consumed:s.WORD_SIZE}}},7064:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.decodeArray=t.encodeArray=void 0;const n=r(5071),i=r(9634),o=r(5555),s=r(3852),a=r(8809),c=r(5433);t.encodeArray=function(e,t){if(!Array.isArray(t))throw new n.AbiError("Expected value to be array",{abi:e,values:t});const{size:r,param:a}=(0,s.extractArrayType)(e),u=t.map((e=>(0,o.encodeParamFromAbiParameter)(a,e))),d=-1===r,l=u.length>0&&u[0].dynamic;if(!d&&t.length!==r)throw new n.AbiError("Given arguments count doesn't match array length",{arrayLength:r,argumentsLength:t.length});if(d||l){const e=(0,c.encodeDynamicParams)(u);if(d){const t=(0,o.encodeNumber)({type:"uint256",name:""},u.length).encoded;return{dynamic:!0,encoded:u.length>0?(0,i.uint8ArrayConcat)(t,e):t}}return{dynamic:!0,encoded:e}}return{dynamic:!1,encoded:(0,i.uint8ArrayConcat)(...u.map((e=>e.encoded)))}},t.decodeArray=function(e,t){let{size:r,param:n}=(0,s.extractArrayType)(e),i=0;const c=[];let u=t;if(-1===r){const e=(0,a.decodeNumber)({type:"uint32",name:""},t);r=Number(e.result),i=e.consumed,u=e.encoded}if((0,s.isDynamic)(n)){for(let e=0;e<r;e+=1){const t=(0,a.decodeNumber)({type:"uint32",name:""},u.subarray(e*s.WORD_SIZE));i+=t.consumed;const r=(0,o.decodeParamFromAbiParameter)(n,u.subarray(Number(t.result)));i+=r.consumed,c.push(r.result)}return{result:c,encoded:u.subarray(i),consumed:i}}for(let e=0;e<r;e+=1){const e=(0,o.decodeParamFromAbiParameter)(n,t.subarray(i));i+=e.consumed,c.push(e.result)}return{result:c,encoded:t.subarray(i),consumed:i}}},2252:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.decodeBool=t.encodeBoolean=void 0;const n=r(5071),i=r(9634),o=r(3852),s=r(8809);t.encodeBoolean=function(e,t){let r;try{r=(0,i.toBool)(t)}catch(r){if(r instanceof n.InvalidBooleanError)throw new n.AbiError("provided input is not valid boolean value",{type:e.type,value:t,name:e.name})}return(0,s.encodeNumber)({type:"uint8",name:""},Number(r))},t.decodeBool=function(e,t){const r=(0,s.decodeNumber)({type:"uint8",name:""},t);if(r.result>1||r.result<0)throw new n.AbiError("Invalid boolean value encoded",{boolBytes:t.subarray(0,o.WORD_SIZE),numberResult:r});return{result:r.result===BigInt(1),encoded:r.encoded,consumed:o.WORD_SIZE}}},7144:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.decodeBytes=t.encodeBytes=void 0;const n=r(5071),i=r(9634),o=r(7345),s=r(3852),a=r(8809);t.encodeBytes=function(e,t){if("string"==typeof t&&t.length%2!=0&&(t+="0"),!(0,o.isBytes)(t))throw new n.AbiError("provided input is not valid bytes value",{type:e.type,value:t,name:e.name});const r=(0,i.bytesToUint8Array)(t),[,c]=e.type.split("bytes");if(c){if(Number(c)>32||Number(c)<1)throw new n.AbiError("invalid bytes type. Static byte type can have between 1 and 32 bytes",{type:e.type});if(Number(c)<r.length)throw new n.AbiError("provided input size is different than type size",{type:e.type,value:t,name:e.name});const i=(0,s.alloc)(s.WORD_SIZE);return i.set(r),{dynamic:!1,encoded:i}}const u=Math.ceil(r.length/s.WORD_SIZE),d=(0,s.alloc)(s.WORD_SIZE+u*s.WORD_SIZE);return d.set((0,a.encodeNumber)({type:"uint32",name:""},r.length).encoded),d.set(r,s.WORD_SIZE),{dynamic:!0,encoded:d}},t.decodeBytes=function(e,t){const[,r]=e.type.split("bytes");let o=Number(r),c=t,u=1,d=0;if(!o){const e=(0,a.decodeNumber)({type:"uint32",name:""},c);o=Number(e.result),d+=e.consumed,c=e.encoded,u=Math.ceil(o/s.WORD_SIZE)}if(o>t.length)throw new n.AbiError("there is not enough data to decode",{type:e.type,encoded:t,size:o});return{result:(0,i.bytesToHex)(c.subarray(0,o)),encoded:c.subarray(u*s.WORD_SIZE),consumed:d+u*s.WORD_SIZE}}},5555:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.decodeParamFromAbiParameter=t.encodeParamFromAbiParameter=t.decodeArray=t.encodeArray=t.decodeTuple=t.encodeTuple=t.decodeString=t.encodeString=t.decodeNumber=t.encodeNumber=t.decodeBytes=t.encodeBytes=t.decodeBool=t.encodeBoolean=t.decodeAddress=t.encodeAddress=void 0;const n=r(1691),i=r(2252),o=r(7144),s=r(8809),a=r(8574),c=r(4759),u=r(7064);var d=r(1691);Object.defineProperty(t,"encodeAddress",{enumerable:!0,get:function(){return d.encodeAddress}}),Object.defineProperty(t,"decodeAddress",{enumerable:!0,get:function(){return d.decodeAddress}});var l=r(2252);Object.defineProperty(t,"encodeBoolean",{enumerable:!0,get:function(){return l.encodeBoolean}}),Object.defineProperty(t,"decodeBool",{enumerable:!0,get:function(){return l.decodeBool}});var h=r(7144);Object.defineProperty(t,"encodeBytes",{enumerable:!0,get:function(){return h.encodeBytes}}),Object.defineProperty(t,"decodeBytes",{enumerable:!0,get:function(){return h.decodeBytes}});var f=r(8809);Object.defineProperty(t,"encodeNumber",{enumerable:!0,get:function(){return f.encodeNumber}}),Object.defineProperty(t,"decodeNumber",{enumerable:!0,get:function(){return f.decodeNumber}});var p=r(8574);Object.defineProperty(t,"encodeString",{enumerable:!0,get:function(){return p.encodeString}}),Object.defineProperty(t,"decodeString",{enumerable:!0,get:function(){return p.decodeString}});var m=r(4759);Object.defineProperty(t,"encodeTuple",{enumerable:!0,get:function(){return m.encodeTuple}}),Object.defineProperty(t,"decodeTuple",{enumerable:!0,get:function(){return m.decodeTuple}});var g=r(7064);Object.defineProperty(t,"encodeArray",{enumerable:!0,get:function(){return g.encodeArray}}),Object.defineProperty(t,"decodeArray",{enumerable:!0,get:function(){return g.decodeArray}}),t.encodeParamFromAbiParameter=function(e,t){if("string"===e.type)return(0,a.encodeString)(e,t);if("bool"===e.type)return(0,i.encodeBoolean)(e,t);if("address"===e.type)return(0,n.encodeAddress)(e,t);if("tuple"===e.type)return(0,c.encodeTuple)(e,t);if(e.type.endsWith("]"))return(0,u.encodeArray)(e,t);if(e.type.startsWith("bytes"))return(0,o.encodeBytes)(e,t);if(e.type.startsWith("uint")||e.type.startsWith("int"))return(0,s.encodeNumber)(e,t);throw new Error("Unsupported")},t.decodeParamFromAbiParameter=function(e,t){if("string"===e.type)return(0,a.decodeString)(e,t);if("bool"===e.type)return(0,i.decodeBool)(e,t);if("address"===e.type)return(0,n.decodeAddress)(e,t);if("tuple"===e.type)return(0,c.decodeTuple)(e,t);if(e.type.endsWith("]"))return(0,u.decodeArray)(e,t);if(e.type.startsWith("bytes"))return(0,o.decodeBytes)(e,t);if(e.type.startsWith("uint")||e.type.startsWith("int"))return(0,s.decodeNumber)(e,t);throw new Error("Unsupported")}},8809:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.decodeNumber=t.encodeNumber=void 0;const n=r(5071),i=r(9634),o=r(7345),s=r(3852),a=r(5978),c=BigInt(1)<<BigInt(256);function u(e,t=s.WORD_SIZE){let r;return r=e<0?(c+e).toString(16):e.toString(16),r=(0,i.padLeft)(r,2*t),o.utils.hexToUint8Array(r)}t.encodeNumber=function(e,t){let r;try{r=(0,i.toBigInt)(t)}catch(r){throw new n.AbiError("provided input is not number value",{type:e.type,value:t,name:e.name})}const o=a.numberLimits.get(e.type);if(!o)throw new n.AbiError("provided abi contains invalid number datatype",{type:e.type});if(r<o.min)throw new n.AbiError("provided input is less then minimum for given type",{type:e.type,value:t,name:e.name,minimum:o.min.toString()});if(r>o.max)throw new n.AbiError("provided input is greater then maximum for given type",{type:e.type,value:t,name:e.name,maximum:o.max.toString()});return{dynamic:!1,encoded:u(r)}},t.decodeNumber=function(e,t){if(t.length<s.WORD_SIZE)throw new n.AbiError("Not enough bytes left to decode",{param:e,bytesLeft:t.length});const r=t.subarray(0,s.WORD_SIZE),i=a.numberLimits.get(e.type);if(!i)throw new n.AbiError("provided abi contains invalid number datatype",{type:e.type});const u=function(e,t){const r=o.utils.uint8ArrayToHexString(e),n=BigInt(r);return n<=t?n:n-c}(r,i.max);if(u<i.min)throw new n.AbiError("decoded value is less then minimum for given type",{type:e.type,value:u,name:e.name,minimum:i.min.toString()});if(u>i.max)throw new n.AbiError("decoded value is greater then maximum for given type",{type:e.type,value:u,name:e.name,maximum:i.max.toString()});return{result:u,encoded:t.subarray(s.WORD_SIZE),consumed:s.WORD_SIZE}}},5978:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.numberLimits=void 0,t.numberLimits=new Map;let r=BigInt(256);for(let e=8;e<=256;e+=8)t.numberLimits.set(`uint${e}`,{min:BigInt(0),max:r-BigInt(1)}),t.numberLimits.set(`int${e}`,{min:-r/BigInt(2),max:r/BigInt(2)-BigInt(1)}),r*=BigInt(256);t.numberLimits.set("int",t.numberLimits.get("int256")),t.numberLimits.set("uint",t.numberLimits.get("uint256"))},8574:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.decodeString=t.encodeString=void 0;const n=r(5071),i=r(9634),o=r(7144);t.encodeString=function(e,t){if("string"!=typeof t)throw new n.AbiError("invalid input, should be string",{input:t});const r=(0,i.utf8ToBytes)(t);return(0,o.encodeBytes)({type:"bytes",name:""},r)},t.decodeString=function(e,t){const r=(0,o.decodeBytes)({type:"bytes",name:""},t);return{result:(0,i.hexToUtf8)(r.result),encoded:r.encoded,consumed:r.consumed}}},4759:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.decodeTuple=t.encodeTuple=void 0;const n=r(5071),i=r(9634),o=r(5555),s=r(5433),a=r(3852),c=r(8809);t.encodeTuple=function(e,t){var r,a,c;let u=!1;if(!Array.isArray(t)&&"object"!=typeof t)throw new n.AbiError("param must be either Array or Object",{param:e,input:t});const d=t,l=[];for(let i=0;i<(null!==(a=null===(r=e.components)||void 0===r?void 0:r.length)&&void 0!==a?a:0);i+=1){const r=e.components[i];let s;if(Array.isArray(d)){if(i>=d.length)throw new n.AbiError("input param length missmatch",{param:e,input:t});s=(0,o.encodeParamFromAbiParameter)(r,d[i])}else{const i=d[null!==(c=r.name)&&void 0!==c?c:""];if(null==i)throw new n.AbiError("missing input defined in abi",{param:e,input:t,paramName:r.name});s=(0,o.encodeParamFromAbiParameter)(r,i)}s.dynamic&&(u=!0),l.push(s)}return u?{dynamic:!0,encoded:(0,s.encodeDynamicParams)(l)}:{dynamic:!1,encoded:(0,i.uint8ArrayConcat)(...l.map((e=>e.encoded)))}},t.decodeTuple=function(e,t){const r={__length__:0};let n=0;if(!e.components)return{result:r,encoded:t,consumed:n};let i=0;for(const[s,u]of e.components.entries()){let e;if((0,a.isDynamic)(u)){const r=(0,c.decodeNumber)({type:"uint32",name:""},t.subarray(n));e=(0,o.decodeParamFromAbiParameter)(u,t.subarray(Number(r.result))),n+=r.consumed,i+=e.consumed}else e=(0,o.decodeParamFromAbiParameter)(u,t.subarray(n)),n+=e.consumed;r.__length__+=1,r[s]=e.result,u.name&&""!==u.name&&(r[u.name]=e.result)}return{encoded:t.subarray(n+i),result:r,consumed:n+i}}},5433:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.encodeDynamicParams=void 0;const n=r(9634),i=r(3852),o=r(8809);t.encodeDynamicParams=function(e){let t=0,r=0;const s=[],a=[];for(const r of e)r.dynamic?t+=i.WORD_SIZE:t+=r.encoded.length;for(const n of e)n.dynamic?(s.push((0,o.encodeNumber)({type:"uint256",name:""},t+r)),a.push(n),r+=n.encoded.length):s.push(n);return(0,n.uint8ArrayConcat)(...s.map((e=>e.encoded)),...a.map((e=>e.encoded)))}},6729:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.decodeParameters=void 0;const n=r(7345),i=r(4759),o=r(3852);t.decodeParameters=function(e,t,r){const s=(0,o.toAbiParams)(e),a=n.utils.hexToUint8Array(t);return(0,i.decodeTuple)({type:"tuple",name:"",components:s},a).result}},4581:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.encodeParameters=void 0;const n=r(5071),i=r(7345),o=r(5555),s=r(3852);t.encodeParameters=function(e,t){if(e.length!==t.length)throw new n.AbiError("Invalid number of values received for given ABI",{expected:e.length,received:t.length});const r=(0,s.toAbiParams)(e);return i.utils.uint8ArrayToHexString((0,o.encodeTuple)({type:"tuple",name:"",components:r},t).encoded)}},3852:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.isDynamic=t.extractArrayType=t.toAbiParams=t.isAbiParameter=t.convertExternalAbiParameter=t.allocUnsafe=t.alloc=t.WORD_SIZE=void 0;const n=r(3879),i=r(5071),o=r(9634),s=r(1583);function a(e){var t,r;return Object.assign(Object.assign({},e),{name:null!==(t=e.name)&&void 0!==t?t:"",components:null===(r=e.components)||void 0===r?void 0:r.map((e=>a(e)))})}function c(e){return!(0,o.isNullish)(e)&&"object"==typeof e&&!(0,o.isNullish)(e.type)&&"string"==typeof e.type}function u(e){const t=e.type.lastIndexOf("["),r=e.type.substring(0,t),n=e.type.substring(t);let o=-1;if("[]"!==n&&(o=Number(n.slice(1,-1)),isNaN(o)))throw new i.AbiError("Invalid fixed array size",{size:n});return{param:{type:r,name:"",components:e.components},size:o}}t.WORD_SIZE=32,t.alloc=function(e=0){var t;if(void 0!==(null===(t=globalThis.Buffer)||void 0===t?void 0:t.alloc)){const t=globalThis.Buffer.alloc(e);return new Uint8Array(t.buffer,t.byteOffset,t.byteLength)}return new Uint8Array(e)},t.allocUnsafe=function(e=0){var t;if(void 0!==(null===(t=globalThis.Buffer)||void 0===t?void 0:t.allocUnsafe)){const t=globalThis.Buffer.allocUnsafe(e);return new Uint8Array(t.buffer,t.byteOffset,t.byteLength)}return new Uint8Array(e)},t.convertExternalAbiParameter=a,t.isAbiParameter=c,t.toAbiParams=function(e){return e.map((e=>{var t;if(c(e))return e;if("string"==typeof e)return a((0,n.parseAbiParameter)(e.replace(/tuple/,"")));if((0,s.isSimplifiedStructFormat)(e)){const r=Object.keys(e)[0],n=(0,s.mapStructNameAndType)(r);return n.name=null!==(t=n.name)&&void 0!==t?t:"",Object.assign(Object.assign({},n),{components:(0,s.mapStructToCoderFormat)(e[r])})}throw new i.AbiError("Invalid abi")}))},t.extractArrayType=u,t.isDynamic=function e(t){var r,n;return!("string"!==t.type&&"bytes"!==t.type&&!t.type.endsWith("[]"))||("tuple"===t.type?null!==(n=null===(r=t.components)||void 0===r?void 0:r.some(e))&&void 0!==n&&n:!!t.type.endsWith("]")&&e(u(t).param))}},5610:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.decodeContractErrorData=void 0;const n=r(9722),i=r(4566),o=r(1583);t.decodeContractErrorData=(e,t)=>{if(null==t?void 0:t.data){let r,s,a;try{const c=t.data.slice(0,10),u=e.find((e=>(0,n.encodeErrorSignature)(e).startsWith(c)));(null==u?void 0:u.inputs)&&(r=u.name,s=(0,o.jsonInterfaceMethodToString)(u),a=(0,i.decodeParameters)([...u.inputs],t.data.substring(10)))}catch(e){console.error(e)}r&&t.setDecodedProperties(r,s,a)}}},6329:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.getMessage=void 0;const n=r(9634),i=r(4581),o=/^\w+/,s=/^(.*)\[([0-9]*?)]$/,a=(e,t,r=[])=>{const n=t.match(o)[0];return r.includes(n)?r:e.types[n]?[n,...e.types[n].reduce(((t,r)=>[...t,...a(e,r.type,t).filter((e=>!t.includes(e)))]),[])]:r},c=(e,t)=>(0,n.keccak256)(((e,t)=>{const[r,...n]=a(e,t);return[r,...n.sort()].map((t=>`${t}(${e.types[t].map((e=>`${e.type} ${e.name}`))})`)).join("")})(e,t)),u=(e,t,r)=>(0,n.keccak256)(l(e,t,r));t.getMessage=(e,t)=>{const r=`0x1901${u(e,"EIP712Domain",e.domain).substring(2)}${u(e,e.primaryType,e.message).substring(2)}`;return t?(0,n.keccak256)(r):r};const d=(e,t,r)=>{const o=t.match(s);if(o){const t=o[1],s=Number(o[2])||void 0;if(!Array.isArray(r))throw new Error("Cannot encode data: value is not of array type");if(s&&r.length!==s)throw new Error(`Cannot encode data: expected length of ${s}, but got ${r.length}`);const a=r.map((r=>d(e,t,r))),c=a.map((e=>e[0])),u=a.map((e=>e[1]));return["bytes32",(0,n.keccak256)((0,i.encodeParameters)(c,u))]}return e.types[t]?["bytes32",u(e,t,r)]:"string"===t||"bytes"===t?["bytes32",(0,n.keccak256)(r)]:[t,r]},l=(e,t,r)=>{const[o,s]=e.types[t].reduce((([t,i],o)=>{if((0,n.isNullish)(r[o.name])||(0,n.isNullish)(r[o.name]))throw new Error(`Cannot encode data: missing data for '${o.name}'`);const s=r[o.name],[a,c]=d(e,o.type,s);return[[...t,a],[...i,c]]}),[["bytes32"],[c(e,t)]]);return(0,i.encodeParameters)(o,s)}},8381:function(e,t,r){"use strict";var n=this&&this.__createBinding||(Object.create?function(e,t,r,n){void 0===n&&(n=r);var i=Object.getOwnPropertyDescriptor(t,r);i&&!("get"in i?!t.__esModule:i.writable||i.configurable)||(i={enumerable:!0,get:function(){return t[r]}}),Object.defineProperty(e,n,i)}:function(e,t,r,n){void 0===n&&(n=r),e[n]=t[r]}),i=this&&this.__exportStar||function(e,t){for(var r in e)"default"===r||Object.prototype.hasOwnProperty.call(t,r)||n(t,e,r)};Object.defineProperty(t,"__esModule",{value:!0}),t.getEncodedEip712Data=void 0,i(r(9722),t),i(r(5893),t),i(r(3249),t),i(r(734),t),i(r(4566),t),i(r(1583),t),i(r(5610),t);var o=r(6329);Object.defineProperty(t,"getEncodedEip712Data",{enumerable:!0,get:function(){return o.getMessage}})},1583:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.jsonInterfaceMethodToString=t.flattenTypes=t.formatParam=t.formatOddHexstrings=t.isOddHexstring=t.mapTypes=t.mapStructToCoderFormat=t.mapStructNameAndType=t.isSimplifiedStructFormat=t.isAbiConstructorFragment=t.isAbiFunctionFragment=t.isAbiEventFragment=t.isAbiErrorFragment=t.isAbiFragment=void 0;const n=r(5071),i=r(9634);t.isAbiFragment=e=>!(0,i.isNullish)(e)&&"object"==typeof e&&!(0,i.isNullish)(e.type)&&["function","event","constructor","error"].includes(e.type),t.isAbiErrorFragment=e=>!(0,i.isNullish)(e)&&"object"==typeof e&&!(0,i.isNullish)(e.type)&&"error"===e.type,t.isAbiEventFragment=e=>!(0,i.isNullish)(e)&&"object"==typeof e&&!(0,i.isNullish)(e.type)&&"event"===e.type,t.isAbiFunctionFragment=e=>!(0,i.isNullish)(e)&&"object"==typeof e&&!(0,i.isNullish)(e.type)&&"function"===e.type,t.isAbiConstructorFragment=e=>!(0,i.isNullish)(e)&&"object"==typeof e&&!(0,i.isNullish)(e.type)&&"constructor"===e.type,t.isSimplifiedStructFormat=e=>"object"==typeof e&&void 0===e.components&&void 0===e.name,t.mapStructNameAndType=e=>e.includes("[]")?{type:"tuple[]",name:e.slice(0,-2)}:{type:"tuple",name:e},t.mapStructToCoderFormat=e=>{const r=[];for(const n of Object.keys(e)){const i=e[n];"object"==typeof i?r.push(Object.assign(Object.assign({},(0,t.mapStructNameAndType)(n)),{components:(0,t.mapStructToCoderFormat)(i)})):r.push({name:n,type:e[n]})}return r},t.mapTypes=e=>{const r=[];for(const n of e){let e=n;if("object"==typeof n&&(e=Object.assign({},n)),"object"==typeof n&&"function"===n.type&&(e=Object.assign(Object.assign({},n),{type:"bytes24"})),(0,t.isSimplifiedStructFormat)(e)){const n=Object.keys(e)[0];r.push(Object.assign(Object.assign({},(0,t.mapStructNameAndType)(n)),{components:(0,t.mapStructToCoderFormat)(e[n])}))}else r.push(e)}return r},t.isOddHexstring=e=>"string"==typeof e&&/^(-)?0x[0-9a-f]*$/i.test(e)&&e.length%2==1,t.formatOddHexstrings=e=>(0,t.isOddHexstring)(e)?`0x0${e.substring(2)}`:e,t.formatParam=(e,r)=>{var n;const o="object"!=typeof r||Array.isArray(r)?r:Object.assign({},r);if(o instanceof BigInt)return o.toString(10);if(/^bytes([0-9]*)\[\]$/.exec(e)||/^(u?int)([0-9]*)\[\]$/.exec(e))return[...o].map((r=>(0,t.formatParam)(e.replace("[]",""),r)));let s=/^(u?int)([0-9]*)$/.exec(e);if(s){const e=parseInt(null!==(n=s[2])&&void 0!==n?n:"256",10);if(e/8<o.length)return(0,i.leftPad)(o,e)}if(s=/^bytes([0-9]*)$/.exec(e),s){const e=o instanceof Uint8Array?(0,i.toHex)(o):o,r=parseInt(s[1],10);if(r){let n=2*r;o.startsWith("0x")&&(n+=2);const s=e.length<n?(0,i.rightPad)(o,2*r):e;return(0,t.formatOddHexstrings)(s)}return(0,t.formatOddHexstrings)(e)}return o},t.flattenTypes=(e,r)=>{const i=[];return r.forEach((r=>{if("object"==typeof r.components){if(!r.type.startsWith("tuple"))throw new n.AbiError(`Invalid value given "${r.type}". Error: components found but type is not tuple.`);const o=r.type.indexOf("["),s=o>=0?r.type.substring(o):"",a=(0,t.flattenTypes)(e,r.components);Array.isArray(a)&&e?i.push(`tuple(${a.join(",")})${s}`):e?i.push(`(${a.join()})`):i.push(`(${a.join(",")})${s}`)}else i.push(r.type)})),i},t.jsonInterfaceMethodToString=e=>{var r,n,i,o;return(0,t.isAbiErrorFragment)(e)||(0,t.isAbiEventFragment)(e)||(0,t.isAbiFunctionFragment)(e)?(null===(r=e.name)||void 0===r?void 0:r.includes("("))?e.name:`${null!==(n=e.name)&&void 0!==n?n:""}(${(0,t.flattenTypes)(!1,null!==(i=e.inputs)&&void 0!==i?i:[]).join(",")})`:`(${(0,t.flattenTypes)(!1,null!==(o=e.inputs)&&void 0!==o?o:[]).join(",")})`}},1560:function(e,t,r){"use strict";var n=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.decrypt=t.create=t.privateKeyToAccount=t.encrypt=t.privateKeyToPublicKey=t.privateKeyToAddress=t.recover=t.recoverTransaction=t.signTransaction=t.sign=t.hashMessage=t.parseAndValidatePrivateKey=void 0;const i=r(3072),o=r(8109),s=r(7002),a=r(5071),c=r(9634),u=r(7345),d=r(4555),l=r(5774),h=r(7668);t.parseAndValidatePrivateKey=(e,t)=>{let r;if(!t&&"string"==typeof e&&(0,u.isHexStrict)(e)&&66!==e.length)throw new a.PrivateKeyLengthError;try{r=e instanceof Uint8Array?e:(0,c.bytesToUint8Array)(e)}catch(e){throw new a.InvalidPrivateKeyError}if(!t&&32!==r.byteLength)throw new a.PrivateKeyLengthError;return r},t.hashMessage=e=>{const t=(0,u.isHexStrict)(e)?e:(0,c.utf8ToHex)(e),r=(0,c.hexToBytes)(t),n=(0,c.hexToBytes)((0,c.fromUtf8)(`Ethereum Signed Message:\n${r.byteLength}`)),i=(0,c.uint8ArrayConcat)(n,r);return(0,c.sha3Raw)(i)},t.sign=(e,r)=>{const n=(0,t.parseAndValidatePrivateKey)(r),i=(0,t.hashMessage)(e),o=d.secp256k1.sign(i.substring(2),n),s=o.toCompactRawBytes(),a=o.r.toString(16).padStart(64,"0"),u=o.s.toString(16).padStart(64,"0"),l=o.recovery+27;return{message:e,messageHash:i,v:(0,c.numberToHex)(l),r:`0x${a}`,s:`0x${u}`,signature:`${(0,c.bytesToHex)(s)}${l.toString(16)}`}},t.signTransaction=(e,t)=>n(void 0,void 0,void 0,(function*(){const r=e.sign((0,c.hexToBytes)(t));if((0,u.isNullish)(r.v)||(0,u.isNullish)(r.r)||(0,u.isNullish)(r.s))throw new a.TransactionSigningError("Signer Error");const n=r.validate(!0);if(n.length>0){let e="Signer Error ";for(const t of n)e+=`${e} ${t}.`;throw new a.TransactionSigningError(e)}const i=(0,c.bytesToHex)(r.serialize()),o=(0,c.sha3Raw)(i);return{messageHash:(0,c.bytesToHex)(r.getMessageToSign(!0)),v:`0x${r.v.toString(16)}`,r:`0x${r.r.toString(16).padStart(64,"0")}`,s:`0x${r.s.toString(16).padStart(64,"0")}`,rawTransaction:i,transactionHash:(0,c.bytesToHex)(o)}})),t.recoverTransaction=e=>{if((0,u.isNullish)(e))throw new a.UndefinedRawTransactionError;const t=h.TransactionFactory.fromSerializedData((0,c.hexToBytes)(e));return(0,c.toChecksumAddress)(t.getSenderAddress().toString())},t.recover=(e,r,n,i,o)=>{if("object"==typeof e){const r=`${e.r}${e.s.slice(2)}${e.v.slice(2)}`;return(0,t.recover)(e.messageHash,r,n)}if("string"==typeof r&&"string"==typeof n&&!(0,u.isNullish)(i)){const s=`${n}${i.slice(2)}${r.slice(2)}`;return(0,t.recover)(e,s,o)}if((0,u.isNullish)(r))throw new a.InvalidSignatureError("signature string undefined");const s=n?e:(0,t.hashMessage)(e);let l=parseInt(r.substring(130),16);l>26&&(l-=27);const h=d.secp256k1.Signature.fromCompact(r.slice(2,130)).addRecoveryBit(l).recoverPublicKey(s.replace("0x","")).toRawBytes(!1),f=(0,c.sha3Raw)(h.subarray(1));return(0,c.toChecksumAddress)(`0x${f.slice(-40)}`)},t.privateKeyToAddress=e=>{const r=(0,t.parseAndValidatePrivateKey)(e),n=d.secp256k1.getPublicKey(r,!1),i=(0,c.sha3Raw)(n.slice(1)).slice(-40);return(0,c.toChecksumAddress)(`0x${i}`)},t.privateKeyToPublicKey=(e,r)=>{const n=(0,t.parseAndValidatePrivateKey)(e);return`0x${(0,c.bytesToHex)(d.secp256k1.getPublicKey(n,r)).slice(4)}`},t.encrypt=(e,r,d)=>n(void 0,void 0,void 0,(function*(){var n,l,h,f,p,m,g;const y=(0,t.parseAndValidatePrivateKey)(e);let v;if(v=(null==d?void 0:d.salt)?"string"==typeof d.salt?(0,c.hexToBytes)(d.salt):d.salt:(0,c.randomBytes)(32),!((0,u.isString)(r)||r instanceof Uint8Array))throw new a.InvalidPasswordError;const b="string"==typeof r?(0,c.hexToBytes)((0,c.utf8ToHex)(r)):r;let E;if(null==d?void 0:d.iv){if(E="string"==typeof d.iv?(0,c.hexToBytes)(d.iv):d.iv,16!==E.length)throw new a.IVLengthError}else E=(0,c.randomBytes)(16);const _=null!==(n=null==d?void 0:d.kdf)&&void 0!==n?n:"scrypt";let A,T;if("pbkdf2"===_){if(T={dklen:null!==(l=null==d?void 0:d.dklen)&&void 0!==l?l:32,salt:(0,c.bytesToHex)(v).replace("0x",""),c:null!==(h=null==d?void 0:d.c)&&void 0!==h?h:262144,prf:"hmac-sha256"},T.c<1e3)throw new a.PBKDF2IterationsError;A=(0,o.pbkdf2Sync)(b,v,T.c,T.dklen,"sha256")}else{if("scrypt"!==_)throw new a.InvalidKdfError;T={n:null!==(f=null==d?void 0:d.n)&&void 0!==f?f:8192,r:null!==(p=null==d?void 0:d.r)&&void 0!==p?p:8,p:null!==(m=null==d?void 0:d.p)&&void 0!==m?m:1,dklen:null!==(g=null==d?void 0:d.dklen)&&void 0!==g?g:32,salt:(0,c.bytesToHex)(v).replace("0x","")},A=(0,s.scryptSync)(b,v,T.n,T.p,T.r,T.dklen)}const I=yield(0,i.encrypt)(y,A.slice(0,16),E,"aes-128-ctr"),R=(0,c.bytesToHex)(I).slice(2),w=(0,c.sha3Raw)((0,c.uint8ArrayConcat)(A.slice(16,32),I)).replace("0x","");return{version:3,id:(0,c.uuidV4)(),address:(0,t.privateKeyToAddress)(y).toLowerCase().replace("0x",""),crypto:{ciphertext:R,cipherparams:{iv:(0,c.bytesToHex)(E).replace("0x","")},cipher:"aes-128-ctr",kdf:_,kdfparams:T,mac:w}}})),t.privateKeyToAccount=(e,r)=>{const i=(0,t.parseAndValidatePrivateKey)(e,r);return{address:(0,t.privateKeyToAddress)(i),privateKey:(0,c.bytesToHex)(i),signTransaction:e=>{throw new a.TransactionSigningError("Do not have network access to sign the transaction")},sign:e=>(0,t.sign)("string"==typeof e?e:JSON.stringify(e),i),encrypt:(e,r)=>n(void 0,void 0,void 0,(function*(){return(0,t.encrypt)(i,e,r)}))}},t.create=()=>{const e=d.secp256k1.utils.randomPrivateKey();return(0,t.privateKeyToAccount)(`${(0,c.bytesToHex)(e)}`)},t.decrypt=(e,r,d)=>n(void 0,void 0,void 0,(function*(){const n="object"==typeof e?e:JSON.parse(d?e.toLowerCase():e);if(u.validator.validateJSONSchema(l.keyStoreSchema,n),3!==n.version)throw new a.KeyStoreVersionError;const h="string"==typeof r?(0,c.hexToBytes)((0,c.utf8ToHex)(r)):r;let f;if(u.validator.validate(["bytes"],[h]),"scrypt"===n.crypto.kdf){const e=n.crypto.kdfparams,t="string"==typeof e.salt?(0,c.hexToBytes)(e.salt):e.salt;f=(0,s.scryptSync)(h,t,e.n,e.p,e.r,e.dklen)}else{if("pbkdf2"!==n.crypto.kdf)throw new a.InvalidKdfError;{const e=n.crypto.kdfparams,t="string"==typeof e.salt?(0,c.hexToBytes)(e.salt):e.salt;f=(0,o.pbkdf2Sync)(h,t,e.c,e.dklen,"sha256")}}const p=(0,c.hexToBytes)(n.crypto.ciphertext);if((0,c.sha3Raw)((0,c.uint8ArrayConcat)(f.slice(16,32),p)).replace("0x","")!==n.crypto.mac)throw new a.KeyDerivationError;const m=yield(0,i.decrypt)((0,c.hexToBytes)(n.crypto.ciphertext),f.slice(0,16),(0,c.hexToBytes)(n.crypto.cipherparams.iv));return(0,t.privateKeyToAccount)(m)}))},7634:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"goerli",chainId:5,networkId:5,defaultHardfork:"merge",consensus:{type:"poa",algorithm:"clique",clique:{period:15,epoch:3e4}},comment:"Cross-client PoA test network",url:"https://github.com/goerli/testnet",genesis:{timestamp:"0x5c51a607",gasLimit:10485760,difficulty:1,nonce:"0x0000000000000000",extraData:"0x22466c6578692069732061207468696e6722202d204166726900000000000000e0a2bd4258d2768837baa26a28fe71dc079f84c70000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"},hardforks:[{name:"chainstart",block:0,forkHash:"0xa3f5ab08"},{name:"homestead",block:0,forkHash:"0xa3f5ab08"},{name:"tangerineWhistle",block:0,forkHash:"0xa3f5ab08"},{name:"spuriousDragon",block:0,forkHash:"0xa3f5ab08"},{name:"byzantium",block:0,forkHash:"0xa3f5ab08"},{name:"constantinople",block:0,forkHash:"0xa3f5ab08"},{name:"petersburg",block:0,forkHash:"0xa3f5ab08"},{name:"istanbul",block:1561651,forkHash:"0xc25efa5c"},{name:"berlin",block:4460644,forkHash:"0x757a1c47"},{name:"london",block:5062605,forkHash:"0xb8c6299d"},{"//_comment":"The forkHash will remain same as mergeForkIdTransition is post merge, terminal block: https://goerli.etherscan.io/block/7382818",name:"merge",ttd:"10790000",block:7382819,forkHash:"0xb8c6299d"},{name:"mergeForkIdTransition",block:null,forkHash:null},{name:"shanghai",block:null,forkHash:null}],bootstrapNodes:[],dnsNetworks:["enrtree://AKA3AM6LPBYEUDMVNU3BSVQJ5AD45Y7YPOHJLEF6W26QOE4VTUDPE@all.goerli.ethdisco.net"]}},3233:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"mainnet",chainId:1,networkId:1,defaultHardfork:"merge",consensus:{type:"pow",algorithm:"ethash",ethash:{}},comment:"The Ethereum main chain",url:"https://ethstats.net/",genesis:{gasLimit:5e3,difficulty:17179869184,nonce:"0x0000000000000042",extraData:"0x11bbe8db4e347b4e8c937c1c8370e4b5ed33adb3db69cbdb7a38e1e50b1b82fa"},hardforks:[{name:"chainstart",block:0,forkHash:"0xfc64ec04"},{name:"homestead",block:115e4,forkHash:"0x97c2c34c"},{name:"dao",block:192e4,forkHash:"0x91d1f948"},{name:"tangerineWhistle",block:2463e3,forkHash:"0x7a64da13"},{name:"spuriousDragon",block:2675e3,forkHash:"0x3edd5b10"},{name:"byzantium",block:437e4,forkHash:"0xa00bc324"},{name:"constantinople",block:728e4,forkHash:"0x668db0af"},{name:"petersburg",block:728e4,forkHash:"0x668db0af"},{name:"istanbul",block:9069e3,forkHash:"0x879d6e30"},{name:"muirGlacier",block:92e5,forkHash:"0xe029e991"},{name:"berlin",block:12244e3,forkHash:"0x0eb440f6"},{name:"london",block:12965e3,forkHash:"0xb715077d"},{name:"arrowGlacier",block:13773e3,forkHash:"0x20c327fc"},{name:"grayGlacier",block:1505e4,forkHash:"0xf0afd0e3"},{"//_comment":"The forkHash will remain same as mergeForkIdTransition is post merge, terminal block: https://etherscan.io/block/15537393",name:"merge",ttd:"58750000000000000000000",block:15537394,forkHash:"0xf0afd0e3"},{name:"mergeForkIdTransition",block:null,forkHash:null},{name:"shanghai",block:null,forkHash:null}],bootstrapNodes:[],dnsNetworks:["enrtree://AKA3AM6LPBYEUDMVNU3BSVQJ5AD45Y7YPOHJLEF6W26QOE4VTUDPE@all.mainnet.ethdisco.net"]}},5077:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"sepolia",chainId:11155111,networkId:11155111,defaultHardfork:"merge",consensus:{type:"pow",algorithm:"ethash",ethash:{}},comment:"PoW test network to replace Ropsten",url:"https://github.com/ethereum/go-ethereum/pull/23730",genesis:{timestamp:"0x6159af19",gasLimit:3e7,difficulty:131072,nonce:"0x0000000000000000",extraData:"0x5365706f6c69612c20417468656e732c204174746963612c2047726565636521"},hardforks:[{name:"chainstart",block:0,forkHash:"0xfe3366e7"},{name:"homestead",block:0,forkHash:"0xfe3366e7"},{name:"tangerineWhistle",block:0,forkHash:"0xfe3366e7"},{name:"spuriousDragon",block:0,forkHash:"0xfe3366e7"},{name:"byzantium",block:0,forkHash:"0xfe3366e7"},{name:"constantinople",block:0,forkHash:"0xfe3366e7"},{name:"petersburg",block:0,forkHash:"0xfe3366e7"},{name:"istanbul",block:0,forkHash:"0xfe3366e7"},{name:"muirGlacier",block:0,forkHash:"0xfe3366e7"},{name:"berlin",block:0,forkHash:"0xfe3366e7"},{name:"london",block:0,forkHash:"0xfe3366e7"},{"//_comment":"The forkHash will remain same as mergeForkIdTransition is post merge, terminal block: https://sepolia.etherscan.io/block/1450408",name:"merge",ttd:"17000000000000000",block:1450409,forkHash:"0xfe3366e7"},{name:"mergeForkIdTransition",block:1735371,forkHash:"0xb96cbd13"},{name:"shanghai",block:null,timestamp:"1677557088",forkHash:"0xf7f9bc08"}],bootstrapNodes:[],dnsNetworks:["enrtree://AKA3AM6LPBYEUDMVNU3BSVQJ5AD45Y7YPOHJLEF6W26QOE4VTUDPE@all.sepolia.ethdisco.net"]}},6664:function(e,t,r){"use strict";var n=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.Common=void 0;const i=n(r(1238)),o=r(9634),s=r(850),a=r(2290),c=n(r(7634)),u=n(r(3233)),d=n(r(5077)),l=r(5257),h=r(4443),f=r(9137),{buf:p}=i.default;class m extends o.EventEmitter{constructor(e){var t,r;super(),this._eips=[],this._customChains=null!==(t=e.customChains)&&void 0!==t?t:[],this._chainParams=this.setChain(e.chain),this.DEFAULT_HARDFORK=null!==(r=this._chainParams.defaultHardfork)&&void 0!==r?r:h.Hardfork.Merge,this.HARDFORK_CHANGES=this.hardforks().map((e=>[e.name,f.hardforks[e.name]])),this._hardfork=this.DEFAULT_HARDFORK,void 0!==e.hardfork&&this.setHardfork(e.hardfork),e.eips&&this.setEIPs(e.eips)}static custom(e,t={}){var r;const n=null!==(r=t.baseChain)&&void 0!==r?r:"mainnet",i=Object.assign({},m._getChainParams(n));if(i.name="custom-chain","string"!=typeof e)return new m(Object.assign({chain:Object.assign(Object.assign({},i),e)},t));if(e===h.CustomChain.PolygonMainnet)return m.custom({name:h.CustomChain.PolygonMainnet,chainId:137,networkId:137},t);if(e===h.CustomChain.PolygonMumbai)return m.custom({name:h.CustomChain.PolygonMumbai,chainId:80001,networkId:80001},t);if(e===h.CustomChain.ArbitrumRinkebyTestnet)return m.custom({name:h.CustomChain.ArbitrumRinkebyTestnet,chainId:421611,networkId:421611},t);if(e===h.CustomChain.ArbitrumOne)return m.custom({name:h.CustomChain.ArbitrumOne,chainId:42161,networkId:42161},t);if(e===h.CustomChain.xDaiChain)return m.custom({name:h.CustomChain.xDaiChain,chainId:100,networkId:100},t);if(e===h.CustomChain.OptimisticKovan)return m.custom({name:h.CustomChain.OptimisticKovan,chainId:69,networkId:69},Object.assign({hardfork:h.Hardfork.Berlin},t));if(e===h.CustomChain.OptimisticEthereum)return m.custom({name:h.CustomChain.OptimisticEthereum,chainId:10,networkId:10},Object.assign({hardfork:h.Hardfork.Berlin},t));throw new Error(`Custom chain ${e} not supported`)}static fromGethGenesis(e,{chain:t,eips:r,genesisHash:n,hardfork:i,mergeForkIdPostMerge:o}){var s;const c=(0,a.parseGethGenesis)(e,t,o),u=new m({chain:null!==(s=c.name)&&void 0!==s?s:"custom",customChains:[c],eips:r,hardfork:null!=i?i:c.hardfork});return void 0!==n&&u.setForkHashes(n),u}static isSupportedChainId(e){const t=this._getInitializedChains();return Boolean(t.names[e.toString()])}static _getChainParams(e,t){let r=e;const n=this._getInitializedChains(t);if("number"==typeof r||"bigint"==typeof r){if(r=r.toString(),n.names[r])return n[n.names[r]];throw new Error(`Chain with ID ${r} not supported`)}if(void 0!==n[r])return n[r];throw new Error(`Chain with name ${r} not supported`)}setChain(e){if("number"==typeof e||"bigint"==typeof e||"string"==typeof e)this._chainParams=m._getChainParams(e,this._customChains);else{if("object"!=typeof e)throw new Error("Wrong input format");{if(this._customChains.length>0)throw new Error("Chain must be a string, number, or bigint when initialized with customChains passed in");const t=["networkId","genesis","hardforks","bootstrapNodes"];for(const r of t)if(!(r in e))throw new Error(`Missing required chain parameter: ${r}`);this._chainParams=e}}for(const e of this.hardforks())if(void 0===e.block)throw new Error("Hardfork cannot have undefined block number");return this._chainParams}setHardfork(e){let t=!1;for(const r of this.HARDFORK_CHANGES)r[0]===e&&(this._hardfork!==e&&(this._hardfork=e,this.emit("hardforkChanged",e)),t=!0);if(!t)throw new Error(`Hardfork with name ${e} not supported`)}getHardforkByBlockNumber(e,t,r){const n=(0,a.toType)(e,s.TypeOutput.BigInt),i=(0,a.toType)(t,s.TypeOutput.BigInt),o=(0,a.toType)(r,s.TypeOutput.Number),c=this.hardforks().filter((e=>null!==e.block||null!==e.ttd&&void 0!==e.ttd||void 0!==e.timestamp)),u=c.findIndex((e=>null!==e.ttd&&void 0!==e.ttd));if(c.slice(u+1).findIndex((e=>null!==e.ttd&&void 0!==e.ttd))>=0)throw Error("More than one merge hardforks found with ttd specified");let d=c.findIndex((e=>null!==e.block&&e.block>n||void 0!==o&&Number(e.timestamp)>o));if(-1===d)d=c.length;else if(0===d)throw Error("Must have at least one hardfork at block 0");if(void 0===o&&(d-=c.slice(0,d).reverse().findIndex((e=>null!==e.block||void 0!==e.ttd))),d-=1,null===c[d].block&&void 0===c[d].timestamp)(null==i||BigInt(c[d].ttd)>i)&&(d-=1);else if(u>=0&&null!=i){if(d>=u&&BigInt(c[u].ttd)>i)throw Error("Maximum HF determined by total difficulty is lower than the block number HF");if(d<u&&BigInt(c[u].ttd)<=i)throw Error("HF determined by block number is lower than the minimum total difficulty HF")}const l=d;for(;d<c.length-1&&c[d].block===c[d+1].block&&c[d].timestamp===c[d+1].timestamp;d+=1);if(o){if(c.slice(0,l).reduce(((e,t)=>{var r;return Math.max(Number(null!==(r=t.timestamp)&&void 0!==r?r:"0"),e)}),0)>o)throw Error("Maximum HF determined by timestamp is lower than the block number/ttd HF");if(c.slice(d+1).reduce(((e,t)=>{var r;return Math.min(Number(null!==(r=t.timestamp)&&void 0!==r?r:o),e)}),o)<o)throw Error("Maximum HF determined by block number/ttd is lower than timestamp HF")}return c[d].name}setHardforkByBlockNumber(e,t,r){const n=this.getHardforkByBlockNumber(e,t,r);return this.setHardfork(n),n}_getHardfork(e){const t=this.hardforks();for(const r of t)if(r.name===e)return r;return null}setEIPs(e=[]){for(const t of e){if(!(t in l.EIPs))throw new Error(`${t} not supported`);const r=this.gteHardfork(l.EIPs[t].minimumHardfork);if(!r)throw new Error(`${t} cannot be activated on hardfork ${this.hardfork()}, minimumHardfork: ${r}`);if(void 0!==l.EIPs[t].requiredEIPs)for(const r of l.EIPs[t].requiredEIPs)if(!e.includes(r)&&!this.isActivatedEIP(r))throw new Error(`${t} requires EIP ${r}, but is not included in the EIP list`)}this._eips=e}param(e,t){let r;for(const n of this._eips)if(r=this.paramByEIP(e,t,n),void 0!==r)return r;return this.paramByHardfork(e,t,this._hardfork)}paramByHardfork(e,t,r){let n=null;for(const i of this.HARDFORK_CHANGES){if("eips"in i[1]){const r=i[1].eips;for(const i of r){const r=this.paramByEIP(e,t,i);n="bigint"==typeof r?r:n}}else{if(void 0===i[1][e])throw new Error(`Topic ${e} not defined`);void 0!==i[1][e][t]&&(n=i[1][e][t].v)}if(i[0]===r)break}return BigInt(null!=n?n:0)}paramByEIP(e,t,r){if(!(r in l.EIPs))throw new Error(`${r} not supported`);const n=l.EIPs[r];if(!(e in n))throw new Error(`Topic ${e} not defined`);if(void 0===n[e][t])return;const i=n[e][t].v;return BigInt(i)}paramByBlock(e,t,r,n,i){const o=this.getHardforkByBlockNumber(r,n,i);return this.paramByHardfork(e,t,o)}isActivatedEIP(e){if(this.eips().includes(e))return!0;for(const t of this.HARDFORK_CHANGES){const r=t[1];if(this.gteHardfork(r.name)&&"eips"in r&&r.eips.includes(e))return!0}return!1}hardforkIsActiveOnBlock(e,t){const r=(0,a.toType)(t,s.TypeOutput.BigInt),n=null!=e?e:this._hardfork,i=this.hardforkBlock(n);return"bigint"==typeof i&&i!==BigInt(0)&&r>=i}activeOnBlock(e){return this.hardforkIsActiveOnBlock(null,e)}hardforkGteHardfork(e,t){const r=null!=e?e:this._hardfork,n=this.hardforks();let i=-1,o=-1,s=0;for(const e of n)e.name===r&&(i=s),e.name===t&&(o=s),s+=1;return i>=o&&-1!==o}gteHardfork(e){return this.hardforkGteHardfork(null,e)}hardforkBlock(e){var t;const r=null!=e?e:this._hardfork,n=null===(t=this._getHardfork(r))||void 0===t?void 0:t.block;return null==n?null:BigInt(n)}hardforkTimestamp(e){var t;const r=null!=e?e:this._hardfork,n=null===(t=this._getHardfork(r))||void 0===t?void 0:t.timestamp;return null==n?null:BigInt(n)}eipBlock(e){for(const t of this.HARDFORK_CHANGES){const r=t[1];if("eips"in r&&r.eips.includes(e))return this.hardforkBlock("number"==typeof t[0]?String(t[0]):t[0])}return null}hardforkTTD(e){var t;const r=null!=e?e:this._hardfork,n=null===(t=this._getHardfork(r))||void 0===t?void 0:t.ttd;return null==n?null:BigInt(n)}isHardforkBlock(e,t){const r=(0,a.toType)(e,s.TypeOutput.BigInt),n=null!=t?t:this._hardfork,i=this.hardforkBlock(n);return"bigint"==typeof i&&i!==BigInt(0)&&i===r}nextHardforkBlockOrTimestamp(e){var t,r;const n=null!=e?e:this._hardfork,i=this.hardforks();let o=i.findIndex((e=>e.name===n));if(n===h.Hardfork.Merge&&(o-=1),o<0)return null;let s=null!==(t=i[o].timestamp)&&void 0!==t?t:i[o].block;s=null!=s?Number(s):null;const a=i.slice(o+1).find((e=>{var t;let r=null!==(t=e.timestamp)&&void 0!==t?t:e.block;return r=null!=r?Number(r):null,e.name!==h.Hardfork.Merge&&null!=r&&r!==s}));if(void 0===a)return null;const c=null!==(r=a.timestamp)&&void 0!==r?r:a.block;return null==c?null:BigInt(c)}nextHardforkBlock(e){const t=null!=e?e:this._hardfork;let r=this.hardforkBlock(t);if(null===r&&t===h.Hardfork.Merge){const e=this.hardforks(),t=e.findIndex((e=>null!==e.ttd&&void 0!==e.ttd));if(t<0)throw Error("Merge hardfork should have been found");r=this.hardforkBlock(e[t-1].name)}return null===r?null:this.hardforks().reduce(((e,t)=>{const n=BigInt(null===t.block||void 0!==t.ttd&&null!==t.ttd?0:t.block);return n>r&&null===e?n:e}),null)}isNextHardforkBlock(e,t){const r=(0,a.toType)(e,s.TypeOutput.BigInt),n=null!=t?t:this._hardfork,i=this.nextHardforkBlock(n);return null!==i&&i===r}_calcForkHash(e,t){let r=new Uint8Array,n=0;for(const t of this.hardforks()){const{block:i,timestamp:s,name:a}=t;let c=null!=s?s:i;if(c=null!==c?Number(c):null,"number"==typeof c&&0!==c&&c!==n&&a!==h.Hardfork.Merge){const e=(0,o.hexToBytes)(c.toString(16).padStart(16,"0"));r=(0,o.uint8ArrayConcat)(r,e),n=c}if(t.name===e)break}const i=(0,o.uint8ArrayConcat)(t,r);return(0,o.bytesToHex)((0,a.intToUint8Array)(p(i)>>>0))}forkHash(e,t){const r=null!=e?e:this._hardfork,n=this._getHardfork(r);if(null===n||null===(null==n?void 0:n.block)&&void 0===(null==n?void 0:n.timestamp)&&void 0===(null==n?void 0:n.ttd))throw new Error("No fork hash calculation possible for future hardfork");if(null!==(null==n?void 0:n.forkHash)&&void 0!==(null==n?void 0:n.forkHash))return n.forkHash;if(!t)throw new Error("genesisHash required for forkHash calculation");return this._calcForkHash(r,t)}hardforkForForkHash(e){const t=this.hardforks().filter((t=>t.forkHash===e));return t.length>=1?t[t.length-1]:null}setForkHashes(e){var t;for(const r of this.hardforks()){const n=null!==(t=r.timestamp)&&void 0!==t?t:r.block;null!==r.forkHash&&void 0!==r.forkHash||null==n&&void 0===r.ttd||(r.forkHash=this.forkHash(r.name,e))}}genesis(){return this._chainParams.genesis}hardforks(){return this._chainParams.hardforks}bootstrapNodes(){return this._chainParams.bootstrapNodes}dnsNetworks(){return this._chainParams.dnsNetworks}hardfork(){return this._hardfork}chainId(){return BigInt(this._chainParams.chainId)}chainName(){return this._chainParams.name}networkId(){return BigInt(this._chainParams.networkId)}eips(){return this._eips}consensusType(){const e=this.hardfork();let t;for(const r of this.HARDFORK_CHANGES)if("consensus"in r[1]&&(t=r[1].consensus.type),r[0]===e)break;return null!=t?t:this._chainParams.consensus.type}consensusAlgorithm(){const e=this.hardfork();let t;for(const r of this.HARDFORK_CHANGES)if("consensus"in r[1]&&(t=r[1].consensus.algorithm),r[0]===e)break;return null!=t?t:this._chainParams.consensus.algorithm}consensusConfig(){var e;const t=this.hardfork();let r;for(const e of this.HARDFORK_CHANGES)if("consensus"in e[1]&&(r=e[1].consensus[e[1].consensus.algorithm]),e[0]===t)break;return null!==(e=null!=r?r:this._chainParams.consensus[this.consensusAlgorithm()])&&void 0!==e?e:{}}copy(){const e=Object.assign(Object.create(Object.getPrototypeOf(this)),this);return e.removeAllListeners(),e}static _getInitializedChains(e){const t={};for(const[e,r]of Object.entries(h.Chain))t[r]=e.toLowerCase();const r={mainnet:u.default,goerli:c.default,sepolia:d.default};if(e)for(const n of e){const{name:e}=n;t[n.chainId.toString()]=e,r[e]=n}return r.names=t,r}}t.Common=m},2819:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"EIP-1153",number:1153,comment:"Transient Storage",url:"https://eips.ethereum.org/EIPS/eip-1153",status:"Review",minimumHardfork:"chainstart",requiredEIPs:[],gasConfig:{},gasPrices:{tstore:{v:100,d:"Base fee of the TSTORE opcode"},tload:{v:100,d:"Base fee of the TLOAD opcode"}},vm:{},pow:{}}},4013:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"EIP-1559",number:1559,comment:"Fee market change for ETH 1.0 chain",url:"https://eips.ethereum.org/EIPS/eip-1559",status:"Final",minimumHardfork:"berlin",requiredEIPs:[2930],gasConfig:{baseFeeMaxChangeDenominator:{v:8,d:"Maximum base fee change denominator"},elasticityMultiplier:{v:2,d:"Maximum block gas target elasticity"},initialBaseFee:{v:1e9,d:"Initial base fee on first EIP1559 block"}},gasPrices:{},vm:{},pow:{}}},1933:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"EIP-2315",number:2315,comment:"Simple subroutines for the EVM",url:"https://eips.ethereum.org/EIPS/eip-2315",status:"Draft",minimumHardfork:"istanbul",gasConfig:{},gasPrices:{beginsub:{v:2,d:"Base fee of the BEGINSUB opcode"},returnsub:{v:5,d:"Base fee of the RETURNSUB opcode"},jumpsub:{v:10,d:"Base fee of the JUMPSUB opcode"}},vm:{},pow:{}}},4638:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"EIP-2537",number:2537,comment:"BLS12-381 precompiles",url:"https://eips.ethereum.org/EIPS/eip-2537",status:"Draft",minimumHardfork:"chainstart",gasConfig:{},gasPrices:{Bls12381G1AddGas:{v:600,d:"Gas cost of a single BLS12-381 G1 addition precompile-call"},Bls12381G1MulGas:{v:12e3,d:"Gas cost of a single BLS12-381 G1 multiplication precompile-call"},Bls12381G2AddGas:{v:4500,d:"Gas cost of a single BLS12-381 G2 addition precompile-call"},Bls12381G2MulGas:{v:55e3,d:"Gas cost of a single BLS12-381 G2 multiplication precompile-call"},Bls12381PairingBaseGas:{v:115e3,d:"Base gas cost of BLS12-381 pairing check"},Bls12381PairingPerPairGas:{v:23e3,d:"Per-pair gas cost of BLS12-381 pairing check"},Bls12381MapG1Gas:{v:5500,d:"Gas cost of BLS12-381 map field element to G1"},Bls12381MapG2Gas:{v:11e4,d:"Gas cost of BLS12-381 map field element to G2"},Bls12381MultiExpGasDiscount:{v:[[1,1200],[2,888],[3,764],[4,641],[5,594],[6,547],[7,500],[8,453],[9,438],[10,423],[11,408],[12,394],[13,379],[14,364],[15,349],[16,334],[17,330],[18,326],[19,322],[20,318],[21,314],[22,310],[23,306],[24,302],[25,298],[26,294],[27,289],[28,285],[29,281],[30,277],[31,273],[32,269],[33,268],[34,266],[35,265],[36,263],[37,262],[38,260],[39,259],[40,257],[41,256],[42,254],[43,253],[44,251],[45,250],[46,248],[47,247],[48,245],[49,244],[50,242],[51,241],[52,239],[53,238],[54,236],[55,235],[56,233],[57,232],[58,231],[59,229],[60,228],[61,226],[62,225],[63,223],[64,222],[65,221],[66,220],[67,219],[68,219],[69,218],[70,217],[71,216],[72,216],[73,215],[74,214],[75,213],[76,213],[77,212],[78,211],[79,211],[80,210],[81,209],[82,208],[83,208],[84,207],[85,206],[86,205],[87,205],[88,204],[89,203],[90,202],[91,202],[92,201],[93,200],[94,199],[95,199],[96,198],[97,197],[98,196],[99,196],[100,195],[101,194],[102,193],[103,193],[104,192],[105,191],[106,191],[107,190],[108,189],[109,188],[110,188],[111,187],[112,186],[113,185],[114,185],[115,184],[116,183],[117,182],[118,182],[119,181],[120,180],[121,179],[122,179],[123,178],[124,177],[125,176],[126,176],[127,175],[128,174]],d:"Discount gas costs of calls to the MultiExp precompiles with `k` (point, scalar) pair"}},vm:{},pow:{}}},6906:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"EIP-2565",number:2565,comment:"ModExp gas cost",url:"https://eips.ethereum.org/EIPS/eip-2565",status:"Final",minimumHardfork:"byzantium",gasConfig:{},gasPrices:{modexpGquaddivisor:{v:3,d:"Gquaddivisor from modexp precompile for gas calculation"}},vm:{},pow:{}}},3399:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"EIP-2718",comment:"Typed Transaction Envelope",url:"https://eips.ethereum.org/EIPS/eip-2718",status:"Final",minimumHardfork:"chainstart",gasConfig:{},gasPrices:{},vm:{},pow:{}}},7387:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"EIP-2929",comment:"Gas cost increases for state access opcodes",url:"https://eips.ethereum.org/EIPS/eip-2929",status:"Final",minimumHardfork:"chainstart",gasConfig:{},gasPrices:{coldsload:{v:2100,d:"Gas cost of the first read of storage from a given location (per transaction)"},coldaccountaccess:{v:2600,d:"Gas cost of the first read of a given address (per transaction)"},warmstorageread:{v:100,d:"Gas cost of reading storage locations which have already loaded 'cold'"},sstoreCleanGasEIP2200:{v:2900,d:"Once per SSTORE operation from clean non-zero to something else"},sstoreNoopGasEIP2200:{v:100,d:"Once per SSTORE operation if the value doesn't change"},sstoreDirtyGasEIP2200:{v:100,d:"Once per SSTORE operation if a dirty value is changed"},sstoreInitRefundEIP2200:{v:19900,d:"Once per SSTORE operation for resetting to the original zero value"},sstoreCleanRefundEIP2200:{v:4900,d:"Once per SSTORE operation for resetting to the original non-zero value"},call:{v:0,d:"Base fee of the CALL opcode"},callcode:{v:0,d:"Base fee of the CALLCODE opcode"},delegatecall:{v:0,d:"Base fee of the DELEGATECALL opcode"},staticcall:{v:0,d:"Base fee of the STATICCALL opcode"},balance:{v:0,d:"Base fee of the BALANCE opcode"},extcodesize:{v:0,d:"Base fee of the EXTCODESIZE opcode"},extcodecopy:{v:0,d:"Base fee of the EXTCODECOPY opcode"},extcodehash:{v:0,d:"Base fee of the EXTCODEHASH opcode"},sload:{v:0,d:"Base fee of the SLOAD opcode"},sstore:{v:0,d:"Base fee of the SSTORE opcode"}},vm:{},pow:{}}},6299:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"EIP-2930",comment:"Optional access lists",url:"https://eips.ethereum.org/EIPS/eip-2930",status:"Final",minimumHardfork:"istanbul",requiredEIPs:[2718,2929],gasConfig:{},gasPrices:{accessListStorageKeyCost:{v:1900,d:"Gas cost per storage key in an Access List transaction"},accessListAddressCost:{v:2400,d:"Gas cost per storage key in an Access List transaction"}},vm:{},pow:{}}},1073:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"EIP-3198",number:3198,comment:"BASEFEE opcode",url:"https://eips.ethereum.org/EIPS/eip-3198",status:"Final",minimumHardfork:"london",gasConfig:{},gasPrices:{basefee:{v:2,d:"Gas cost of the BASEFEE opcode"}},vm:{},pow:{}}},634:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"EIP-3529",comment:"Reduction in refunds",url:"https://eips.ethereum.org/EIPS/eip-3529",status:"Final",minimumHardfork:"berlin",requiredEIPs:[2929],gasConfig:{maxRefundQuotient:{v:5,d:"Maximum refund quotient; max tx refund is min(tx.gasUsed/maxRefundQuotient, tx.gasRefund)"}},gasPrices:{selfdestructRefund:{v:0,d:"Refunded following a selfdestruct operation"},sstoreClearRefundEIP2200:{v:4800,d:"Once per SSTORE operation for clearing an originally existing storage slot"}},vm:{},pow:{}}},3829:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"EIP-3540",number:3540,comment:"EVM Object Format (EOF) v1",url:"https://eips.ethereum.org/EIPS/eip-3540",status:"Review",minimumHardfork:"london",requiredEIPs:[3541],gasConfig:{},gasPrices:{},vm:{},pow:{}}},5729:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"EIP-3541",comment:"Reject new contracts starting with the 0xEF byte",url:"https://eips.ethereum.org/EIPS/eip-3541",status:"Final",minimumHardfork:"berlin",requiredEIPs:[],gasConfig:{},gasPrices:{},vm:{},pow:{}}},8958:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"EIP-3554",comment:"Reduction in refunds",url:"Difficulty Bomb Delay to December 1st 2021",status:"Final",minimumHardfork:"muirGlacier",requiredEIPs:[],gasConfig:{},gasPrices:{},vm:{},pow:{difficultyBombDelay:{v:95e5,d:"the amount of blocks to delay the difficulty bomb with"}}}},8334:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"EIP-3607",number:3607,comment:"Reject transactions from senders with deployed code",url:"https://eips.ethereum.org/EIPS/eip-3607",status:"Final",minimumHardfork:"chainstart",requiredEIPs:[],gasConfig:{},gasPrices:{},vm:{},pow:{}}},3412:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"EIP-3651",number:3198,comment:"Warm COINBASE",url:"https://eips.ethereum.org/EIPS/eip-3651",status:"Review",minimumHardfork:"london",requiredEIPs:[2929],gasConfig:{},gasPrices:{},vm:{},pow:{}}},6337:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"EIP-3670",number:3670,comment:"EOF - Code Validation",url:"https://eips.ethereum.org/EIPS/eip-3670",status:"Review",minimumHardfork:"london",requiredEIPs:[3540],gasConfig:{},gasPrices:{},vm:{},pow:{}}},2610:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"EIP-3675",number:3675,comment:"Upgrade consensus to Proof-of-Stake",url:"https://eips.ethereum.org/EIPS/eip-3675",status:"Final",minimumHardfork:"london",requiredEIPs:[],gasConfig:{},gasPrices:{},vm:{},pow:{}}},7619:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"EIP-3855",number:3855,comment:"PUSH0 instruction",url:"https://eips.ethereum.org/EIPS/eip-3855",status:"Review",minimumHardfork:"chainstart",requiredEIPs:[],gasConfig:{},gasPrices:{push0:{v:2,d:"Base fee of the PUSH0 opcode"}},vm:{},pow:{}}},8018:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"EIP-3860",number:3860,comment:"Limit and meter initcode",url:"https://eips.ethereum.org/EIPS/eip-3860",status:"Review",minimumHardfork:"spuriousDragon",requiredEIPs:[],gasConfig:{},gasPrices:{initCodeWordCost:{v:2,d:"Gas to pay for each word (32 bytes) of initcode when creating a contract"}},vm:{maxInitCodeSize:{v:49152,d:"Maximum length of initialization code when creating a contract"}},pow:{}}},6779:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"EIP-4345",number:4345,comment:"Difficulty Bomb Delay to June 2022",url:"https://eips.ethereum.org/EIPS/eip-4345",status:"Final",minimumHardfork:"london",gasConfig:{},gasPrices:{},vm:{},pow:{difficultyBombDelay:{v:107e5,d:"the amount of blocks to delay the difficulty bomb with"}}}},623:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"EIP-4399",number:4399,comment:"Supplant DIFFICULTY opcode with PREVRANDAO",url:"https://eips.ethereum.org/EIPS/eip-4399",status:"Review",minimumHardfork:"london",requiredEIPs:[],gasConfig:{},gasPrices:{},vm:{},pow:{}}},797:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"EIP-5133",number:5133,comment:"Delaying Difficulty Bomb to mid-September 2022",url:"https://eips.ethereum.org/EIPS/eip-5133",status:"Draft",minimumHardfork:"grayGlacier",gasConfig:{},gasPrices:{},vm:{},pow:{difficultyBombDelay:{v:114e5,d:"the amount of blocks to delay the difficulty bomb with"}}}},5257:function(e,t,r){"use strict";var n=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.EIPs=void 0;const i=n(r(2819)),o=n(r(4013)),s=n(r(1933)),a=n(r(4638)),c=n(r(6906)),u=n(r(3399)),d=n(r(7387)),l=n(r(6299)),h=n(r(1073)),f=n(r(634)),p=n(r(3829)),m=n(r(5729)),g=n(r(8958)),y=n(r(8334)),v=n(r(3412)),b=n(r(6337)),E=n(r(2610)),_=n(r(7619)),A=n(r(8018)),T=n(r(6779)),I=n(r(623)),R=n(r(797));t.EIPs={1153:i.default,1559:o.default,2315:s.default,2537:a.default,2565:c.default,2718:u.default,2929:d.default,2930:l.default,3198:h.default,3529:f.default,3540:p.default,3541:m.default,3554:g.default,3607:y.default,3651:v.default,3670:b.default,3675:E.default,3855:_.default,3860:A.default,4345:T.default,4399:I.default,5133:R.default}},4443:(e,t)=>{"use strict";var r,n,i,o,s;Object.defineProperty(t,"__esModule",{value:!0}),t.CustomChain=t.ConsensusAlgorithm=t.ConsensusType=t.Hardfork=t.Chain=void 0,(s=t.Chain||(t.Chain={}))[s.Mainnet=1]="Mainnet",s[s.Goerli=5]="Goerli",s[s.Sepolia=11155111]="Sepolia",(o=t.Hardfork||(t.Hardfork={})).Chainstart="chainstart",o.Homestead="homestead",o.Dao="dao",o.TangerineWhistle="tangerineWhistle",o.SpuriousDragon="spuriousDragon",o.Byzantium="byzantium",o.Constantinople="constantinople",o.Petersburg="petersburg",o.Istanbul="istanbul",o.MuirGlacier="muirGlacier",o.Berlin="berlin",o.London="london",o.ArrowGlacier="arrowGlacier",o.GrayGlacier="grayGlacier",o.MergeForkIdTransition="mergeForkIdTransition",o.Merge="merge",o.Shanghai="shanghai",o.ShardingForkDev="shardingFork",(i=t.ConsensusType||(t.ConsensusType={})).ProofOfStake="pos",i.ProofOfWork="pow",i.ProofOfAuthority="poa",(n=t.ConsensusAlgorithm||(t.ConsensusAlgorithm={})).Ethash="ethash",n.Clique="clique",n.Casper="casper",(r=t.CustomChain||(t.CustomChain={})).PolygonMainnet="polygon-mainnet",r.PolygonMumbai="polygon-mumbai",r.ArbitrumRinkebyTestnet="arbitrum-rinkeby-testnet",r.ArbitrumOne="arbitrum-one",r.xDaiChain="x-dai-chain",r.OptimisticKovan="optimistic-kovan",r.OptimisticEthereum="optimistic-ethereum"},3923:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"arrowGlacier",comment:"HF to delay the difficulty bomb",url:"https://github.com/ethereum/execution-specs/blob/master/network-upgrades/mainnet-upgrades/arrow-glacier.md",status:"Final",eips:[4345],gasConfig:{},gasPrices:{},vm:{},pow:{}}},9126:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"berlin",comment:"HF targeted for July 2020 following the Muir Glacier HF",url:"https://eips.ethereum.org/EIPS/eip-2070",status:"Final",eips:[2565,2929,2718,2930]}},7251:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"byzantium",comment:"Hardfork with new precompiles, instructions and other protocol changes",url:"https://eips.ethereum.org/EIPS/eip-609",status:"Final",gasConfig:{},gasPrices:{modexpGquaddivisor:{v:20,d:"Gquaddivisor from modexp precompile for gas calculation"},ecAdd:{v:500,d:"Gas costs for curve addition precompile"},ecMul:{v:4e4,d:"Gas costs for curve multiplication precompile"},ecPairing:{v:1e5,d:"Base gas costs for curve pairing precompile"},ecPairingWord:{v:8e4,d:"Gas costs regarding curve pairing precompile input length"},revert:{v:0,d:"Base fee of the REVERT opcode"},staticcall:{v:700,d:"Base fee of the STATICCALL opcode"},returndatasize:{v:2,d:"Base fee of the RETURNDATASIZE opcode"},returndatacopy:{v:3,d:"Base fee of the RETURNDATACOPY opcode"}},vm:{},pow:{minerReward:{v:"3000000000000000000",d:"the amount a miner get rewarded for mining a block"},difficultyBombDelay:{v:3e6,d:"the amount of blocks to delay the difficulty bomb with"}}}},9454:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"chainstart",comment:"Start of the Ethereum main chain",url:"",status:"",gasConfig:{minGasLimit:{v:5e3,d:"Minimum the gas limit may ever be"},gasLimitBoundDivisor:{v:1024,d:"The bound divisor of the gas limit, used in update calculations"},maxRefundQuotient:{v:2,d:"Maximum refund quotient; max tx refund is min(tx.gasUsed/maxRefundQuotient, tx.gasRefund)"}},gasPrices:{base:{v:2,d:"Gas base cost, used e.g. for ChainID opcode (Istanbul)"},tierStep:{v:[0,2,3,5,8,10,20],d:"Once per operation, for a selection of them"},exp:{v:10,d:"Base fee of the EXP opcode"},expByte:{v:10,d:"Times ceil(log256(exponent)) for the EXP instruction"},sha3:{v:30,d:"Base fee of the SHA3 opcode"},sha3Word:{v:6,d:"Once per word of the SHA3 operation's data"},sload:{v:50,d:"Base fee of the SLOAD opcode"},sstoreSet:{v:2e4,d:"Once per SSTORE operation if the zeroness changes from zero"},sstoreReset:{v:5e3,d:"Once per SSTORE operation if the zeroness does not change from zero"},sstoreRefund:{v:15e3,d:"Once per SSTORE operation if the zeroness changes to zero"},jumpdest:{v:1,d:"Base fee of the JUMPDEST opcode"},log:{v:375,d:"Base fee of the LOG opcode"},logData:{v:8,d:"Per byte in a LOG* operation's data"},logTopic:{v:375,d:"Multiplied by the * of the LOG*, per LOG transaction. e.g. LOG0 incurs 0 * c_txLogTopicGas, LOG4 incurs 4 * c_txLogTopicGas"},create:{v:32e3,d:"Base fee of the CREATE opcode"},call:{v:40,d:"Base fee of the CALL opcode"},callStipend:{v:2300,d:"Free gas given at beginning of call"},callValueTransfer:{v:9e3,d:"Paid for CALL when the value transfor is non-zero"},callNewAccount:{v:25e3,d:"Paid for CALL when the destination address didn't exist prior"},selfdestructRefund:{v:24e3,d:"Refunded following a selfdestruct operation"},memory:{v:3,d:"Times the address of the (highest referenced byte in memory + 1). NOTE: referencing happens on read, write and in instructions such as RETURN and CALL"},quadCoeffDiv:{v:512,d:"Divisor for the quadratic particle of the memory cost equation"},createData:{v:200,d:""},tx:{v:21e3,d:"Per transaction. NOTE: Not payable on data of calls between transactions"},txCreation:{v:32e3,d:"The cost of creating a contract via tx"},txDataZero:{v:4,d:"Per byte of data attached to a transaction that equals zero. NOTE: Not payable on data of calls between transactions"},txDataNonZero:{v:68,d:"Per byte of data attached to a transaction that is not equal to zero. NOTE: Not payable on data of calls between transactions"},copy:{v:3,d:"Multiplied by the number of 32-byte words that are copied (round up) for any *COPY operation and added"},ecRecover:{v:3e3,d:""},sha256:{v:60,d:""},sha256Word:{v:12,d:""},ripemd160:{v:600,d:""},ripemd160Word:{v:120,d:""},identity:{v:15,d:""},identityWord:{v:3,d:""},stop:{v:0,d:"Base fee of the STOP opcode"},add:{v:3,d:"Base fee of the ADD opcode"},mul:{v:5,d:"Base fee of the MUL opcode"},sub:{v:3,d:"Base fee of the SUB opcode"},div:{v:5,d:"Base fee of the DIV opcode"},sdiv:{v:5,d:"Base fee of the SDIV opcode"},mod:{v:5,d:"Base fee of the MOD opcode"},smod:{v:5,d:"Base fee of the SMOD opcode"},addmod:{v:8,d:"Base fee of the ADDMOD opcode"},mulmod:{v:8,d:"Base fee of the MULMOD opcode"},signextend:{v:5,d:"Base fee of the SIGNEXTEND opcode"},lt:{v:3,d:"Base fee of the LT opcode"},gt:{v:3,d:"Base fee of the GT opcode"},slt:{v:3,d:"Base fee of the SLT opcode"},sgt:{v:3,d:"Base fee of the SGT opcode"},eq:{v:3,d:"Base fee of the EQ opcode"},iszero:{v:3,d:"Base fee of the ISZERO opcode"},and:{v:3,d:"Base fee of the AND opcode"},or:{v:3,d:"Base fee of the OR opcode"},xor:{v:3,d:"Base fee of the XOR opcode"},not:{v:3,d:"Base fee of the NOT opcode"},byte:{v:3,d:"Base fee of the BYTE opcode"},address:{v:2,d:"Base fee of the ADDRESS opcode"},balance:{v:20,d:"Base fee of the BALANCE opcode"},origin:{v:2,d:"Base fee of the ORIGIN opcode"},caller:{v:2,d:"Base fee of the CALLER opcode"},callvalue:{v:2,d:"Base fee of the CALLVALUE opcode"},calldataload:{v:3,d:"Base fee of the CALLDATALOAD opcode"},calldatasize:{v:2,d:"Base fee of the CALLDATASIZE opcode"},calldatacopy:{v:3,d:"Base fee of the CALLDATACOPY opcode"},codesize:{v:2,d:"Base fee of the CODESIZE opcode"},codecopy:{v:3,d:"Base fee of the CODECOPY opcode"},gasprice:{v:2,d:"Base fee of the GASPRICE opcode"},extcodesize:{v:20,d:"Base fee of the EXTCODESIZE opcode"},extcodecopy:{v:20,d:"Base fee of the EXTCODECOPY opcode"},blockhash:{v:20,d:"Base fee of the BLOCKHASH opcode"},coinbase:{v:2,d:"Base fee of the COINBASE opcode"},timestamp:{v:2,d:"Base fee of the TIMESTAMP opcode"},number:{v:2,d:"Base fee of the NUMBER opcode"},difficulty:{v:2,d:"Base fee of the DIFFICULTY opcode"},gaslimit:{v:2,d:"Base fee of the GASLIMIT opcode"},pop:{v:2,d:"Base fee of the POP opcode"},mload:{v:3,d:"Base fee of the MLOAD opcode"},mstore:{v:3,d:"Base fee of the MSTORE opcode"},mstore8:{v:3,d:"Base fee of the MSTORE8 opcode"},sstore:{v:0,d:"Base fee of the SSTORE opcode"},jump:{v:8,d:"Base fee of the JUMP opcode"},jumpi:{v:10,d:"Base fee of the JUMPI opcode"},pc:{v:2,d:"Base fee of the PC opcode"},msize:{v:2,d:"Base fee of the MSIZE opcode"},gas:{v:2,d:"Base fee of the GAS opcode"},push:{v:3,d:"Base fee of the PUSH opcode"},dup:{v:3,d:"Base fee of the DUP opcode"},swap:{v:3,d:"Base fee of the SWAP opcode"},callcode:{v:40,d:"Base fee of the CALLCODE opcode"},return:{v:0,d:"Base fee of the RETURN opcode"},invalid:{v:0,d:"Base fee of the INVALID opcode"},selfdestruct:{v:0,d:"Base fee of the SELFDESTRUCT opcode"}},vm:{stackLimit:{v:1024,d:"Maximum size of VM stack allowed"},callCreateDepth:{v:1024,d:"Maximum depth of call/create stack"},maxExtraDataSize:{v:32,d:"Maximum size extra data may be after Genesis"}},pow:{minimumDifficulty:{v:131072,d:"The minimum that the difficulty may ever be"},difficultyBoundDivisor:{v:2048,d:"The bound divisor of the difficulty, used in the update calculations"},durationLimit:{v:13,d:"The decision boundary on the blocktime duration used to determine whether difficulty should go up or not"},epochDuration:{v:3e4,d:"Duration between proof-of-work epochs"},timebombPeriod:{v:1e5,d:"Exponential difficulty timebomb period"},minerReward:{v:"5000000000000000000",d:"the amount a miner get rewarded for mining a block"},difficultyBombDelay:{v:0,d:"the amount of blocks to delay the difficulty bomb with"}}}},1353:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"constantinople",comment:"Postponed hardfork including EIP-1283 (SSTORE gas metering changes)",url:"https://eips.ethereum.org/EIPS/eip-1013",status:"Final",gasConfig:{},gasPrices:{netSstoreNoopGas:{v:200,d:"Once per SSTORE operation if the value doesn't change"},netSstoreInitGas:{v:2e4,d:"Once per SSTORE operation from clean zero"},netSstoreCleanGas:{v:5e3,d:"Once per SSTORE operation from clean non-zero"},netSstoreDirtyGas:{v:200,d:"Once per SSTORE operation from dirty"},netSstoreClearRefund:{v:15e3,d:"Once per SSTORE operation for clearing an originally existing storage slot"},netSstoreResetRefund:{v:4800,d:"Once per SSTORE operation for resetting to the original non-zero value"},netSstoreResetClearRefund:{v:19800,d:"Once per SSTORE operation for resetting to the original zero value"},shl:{v:3,d:"Base fee of the SHL opcode"},shr:{v:3,d:"Base fee of the SHR opcode"},sar:{v:3,d:"Base fee of the SAR opcode"},extcodehash:{v:400,d:"Base fee of the EXTCODEHASH opcode"},create2:{v:32e3,d:"Base fee of the CREATE2 opcode"}},vm:{},pow:{minerReward:{v:"2000000000000000000",d:"The amount a miner gets rewarded for mining a block"},difficultyBombDelay:{v:5e6,d:"the amount of blocks to delay the difficulty bomb with"}}}},3810:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"dao",comment:"DAO rescue hardfork",url:"https://eips.ethereum.org/EIPS/eip-779",status:"Final",gasConfig:{},gasPrices:{},vm:{},pow:{}}},6257:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"grayGlacier",comment:"Delaying the difficulty bomb to Mid September 2022",url:"https://github.com/ethereum/execution-specs/blob/master/network-upgrades/mainnet-upgrades/gray-glacier.md",status:"Draft",eips:[5133],gasConfig:{},gasPrices:{},vm:{},pow:{}}},7446:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"homestead",comment:"Homestead hardfork with protocol and network changes",url:"https://eips.ethereum.org/EIPS/eip-606",status:"Final",gasConfig:{},gasPrices:{delegatecall:{v:40,d:"Base fee of the DELEGATECALL opcode"}},vm:{},pow:{}}},9137:function(e,t,r){"use strict";var n=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.hardforks=void 0;const i=n(r(9454)),o=n(r(3810)),s=n(r(7446)),a=n(r(7458)),c=n(r(2546)),u=n(r(7251)),d=n(r(1353)),l=n(r(5338)),h=n(r(9597)),f=n(r(7931)),p=n(r(9126)),m=n(r(1233)),g=n(r(2761)),y=n(r(3923)),v=n(r(6257)),b=n(r(6697)),E=n(r(6668));t.hardforks={chainstart:i.default,homestead:s.default,dao:o.default,tangerineWhistle:a.default,spuriousDragon:c.default,byzantium:u.default,constantinople:d.default,petersburg:l.default,istanbul:h.default,muirGlacier:f.default,berlin:p.default,london:m.default,shanghai:g.default,arrowGlacier:y.default,grayGlacier:v.default,mergeForkIdTransition:b.default,merge:E.default}},9597:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"istanbul",comment:"HF targeted for December 2019 following the Constantinople/Petersburg HF",url:"https://eips.ethereum.org/EIPS/eip-1679",status:"Final",gasConfig:{},gasPrices:{blake2Round:{v:1,d:"Gas cost per round for the Blake2 F precompile"},ecAdd:{v:150,d:"Gas costs for curve addition precompile"},ecMul:{v:6e3,d:"Gas costs for curve multiplication precompile"},ecPairing:{v:45e3,d:"Base gas costs for curve pairing precompile"},ecPairingWord:{v:34e3,d:"Gas costs regarding curve pairing precompile input length"},txDataNonZero:{v:16,d:"Per byte of data attached to a transaction that is not equal to zero. NOTE: Not payable on data of calls between transactions"},sstoreSentryGasEIP2200:{v:2300,d:"Minimum gas required to be present for an SSTORE call, not consumed"},sstoreNoopGasEIP2200:{v:800,d:"Once per SSTORE operation if the value doesn't change"},sstoreDirtyGasEIP2200:{v:800,d:"Once per SSTORE operation if a dirty value is changed"},sstoreInitGasEIP2200:{v:2e4,d:"Once per SSTORE operation from clean zero to non-zero"},sstoreInitRefundEIP2200:{v:19200,d:"Once per SSTORE operation for resetting to the original zero value"},sstoreCleanGasEIP2200:{v:5e3,d:"Once per SSTORE operation from clean non-zero to something else"},sstoreCleanRefundEIP2200:{v:4200,d:"Once per SSTORE operation for resetting to the original non-zero value"},sstoreClearRefundEIP2200:{v:15e3,d:"Once per SSTORE operation for clearing an originally existing storage slot"},balance:{v:700,d:"Base fee of the BALANCE opcode"},extcodehash:{v:700,d:"Base fee of the EXTCODEHASH opcode"},chainid:{v:2,d:"Base fee of the CHAINID opcode"},selfbalance:{v:5,d:"Base fee of the SELFBALANCE opcode"},sload:{v:800,d:"Base fee of the SLOAD opcode"}},vm:{},pow:{}}},1233:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"london",comment:"HF targeted for July 2021 following the Berlin fork",url:"https://github.com/ethereum/eth1.0-specs/blob/master/network-upgrades/mainnet-upgrades/london.md",status:"Final",eips:[1559,3198,3529,3541]}},6668:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"merge",comment:"Hardfork to upgrade the consensus mechanism to Proof-of-Stake",url:"https://github.com/ethereum/execution-specs/blob/master/network-upgrades/mainnet-upgrades/merge.md",status:"Final",consensus:{type:"pos",algorithm:"casper",casper:{}},eips:[3675,4399]}},6697:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"mergeForkIdTransition",comment:"Pre-merge hardfork to fork off non-upgraded clients",url:"https://eips.ethereum.org/EIPS/eip-3675",status:"Draft",eips:[]}},7931:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"muirGlacier",comment:"HF to delay the difficulty bomb",url:"https://eips.ethereum.org/EIPS/eip-2384",status:"Final",gasConfig:{},gasPrices:{},vm:{},pow:{difficultyBombDelay:{v:9e6,d:"the amount of blocks to delay the difficulty bomb with"}}}},5338:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"petersburg",comment:"Aka constantinopleFix, removes EIP-1283, activate together with or after constantinople",url:"https://eips.ethereum.org/EIPS/eip-1716",status:"Final",gasConfig:{},gasPrices:{netSstoreNoopGas:{v:null,d:"Removed along EIP-1283"},netSstoreInitGas:{v:null,d:"Removed along EIP-1283"},netSstoreCleanGas:{v:null,d:"Removed along EIP-1283"},netSstoreDirtyGas:{v:null,d:"Removed along EIP-1283"},netSstoreClearRefund:{v:null,d:"Removed along EIP-1283"},netSstoreResetRefund:{v:null,d:"Removed along EIP-1283"},netSstoreResetClearRefund:{v:null,d:"Removed along EIP-1283"}},vm:{},pow:{}}},2761:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"shanghai",comment:"Next feature hardfork after the merge hardfork having withdrawals, warm coinbase, push0, limit/meter initcode",url:"https://github.com/ethereum/execution-specs/blob/master/network-upgrades/mainnet-upgrades/shanghai.md",status:"Final",eips:[3651,3855,3860,4895]}},2546:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"spuriousDragon",comment:"HF with EIPs for simple replay attack protection, EXP cost increase, state trie clearing, contract code size limit",url:"https://eips.ethereum.org/EIPS/eip-607",status:"Final",gasConfig:{},gasPrices:{expByte:{v:50,d:"Times ceil(log256(exponent)) for the EXP instruction"}},vm:{maxCodeSize:{v:24576,d:"Maximum length of contract code"}},pow:{}}},7458:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default={name:"tangerineWhistle",comment:"Hardfork with gas cost changes for IO-heavy operations",url:"https://eips.ethereum.org/EIPS/eip-608",status:"Final",gasConfig:{},gasPrices:{sload:{v:200,d:"Once per SLOAD operation"},call:{v:700,d:"Once per CALL operation & message call transaction"},extcodesize:{v:700,d:"Base fee of the EXTCODESIZE opcode"},extcodecopy:{v:700,d:"Base fee of the EXTCODECOPY opcode"},balance:{v:400,d:"Base fee of the BALANCE opcode"},delegatecall:{v:700,d:"Base fee of the DELEGATECALL opcode"},callcode:{v:700,d:"Base fee of the CALLCODE opcode"},selfdestruct:{v:5e3,d:"Base fee of the SELFDESTRUCT opcode"}},vm:{},pow:{}}},8317:function(e,t,r){"use strict";var n=this&&this.__createBinding||(Object.create?function(e,t,r,n){void 0===n&&(n=r);var i=Object.getOwnPropertyDescriptor(t,r);i&&!("get"in i?!t.__esModule:i.writable||i.configurable)||(i={enumerable:!0,get:function(){return t[r]}}),Object.defineProperty(e,n,i)}:function(e,t,r,n){void 0===n&&(n=r),e[n]=t[r]}),i=this&&this.__exportStar||function(e,t){for(var r in e)"default"===r||Object.prototype.hasOwnProperty.call(t,r)||n(t,e,r)};Object.defineProperty(t,"__esModule",{value:!0}),i(r(6664),t),i(r(4443),t),i(r(850),t),i(r(2290),t)},850:(e,t)=>{"use strict";var r;Object.defineProperty(t,"__esModule",{value:!0}),t.TypeOutput=void 0,(r=t.TypeOutput||(t.TypeOutput={}))[r.Number=0]="Number",r[r.BigInt=1]="BigInt",r[r.Uint8Array=2]="Uint8Array",r[r.PrefixedHexString=3]="PrefixedHexString"},2290:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.toType=t.ecrecover=t.bigIntToUnpaddedUint8Array=t.bigIntToHex=t.unpadUint8Array=t.stripZeros=t.setLengthLeft=t.assertIsUint8Array=t.zeros=t.bigIntToUint8Array=t.uint8ArrayToBigInt=t.toUint8Array=t.intToUint8Array=t.padToEven=t.parseGethGenesis=t.stripHexPrefix=void 0;const n=r(7345),i=r(9634),o=r(4555),s=r(4443),a=r(850);t.stripHexPrefix=e=>{if("string"!=typeof e)throw new Error("[stripHexPrefix] input must be type 'string', received "+typeof e);return(0,n.isHexPrefixed)(e)?e.slice(2):e};const c=function(e){if(!Number.isSafeInteger(e)||e<0)throw new Error(`Received an invalid integer type: ${e}`);return`0x${e.toString(16)}`};function u(e){let t=e;if("string"!=typeof t)throw new Error("[padToEven] value must be type 'string', received "+typeof t);return t.length%2&&(t=`0${t}`),t}function d(e){const t=(0,i.bytesToHex)(e);return"0x"===t?BigInt(0):BigInt(t)}function l(e){return(0,t.toUint8Array)(`0x${e.toString(16)}`)}function h(e){if(!(e instanceof Uint8Array))throw new Error(`This method only supports Uint8Array but input was: ${e}`)}function f(e){let t=e[0];for(;e.length>0&&"0"===t.toString();)t=(e=e.slice(1))[0];return e}t.parseGethGenesis=function(e,r,i){try{if(["config","difficulty","gasLimit","alloc"].some((t=>!(t in e))))throw new Error("Invalid format, expected geth genesis fields missing");return void 0!==r&&(e.name=r),function(e,r=!0){var i,o;const{name:a,config:u,difficulty:d,mixHash:l,gasLimit:h,coinbase:f,baseFeePerGas:p}=e;let{extraData:m,timestamp:g,nonce:y}=e;const v=Number(g),{chainId:b}=u;if(""===m&&(m="0x"),(0,n.isHexPrefixed)(g)||(g=c(parseInt(g))),18!==y.length&&(y=function(e){return e&&"0x0"!==e?(0,n.isHexPrefixed)(e)?`0x${(0,t.stripHexPrefix)(e).padStart(16,"0")}`:`0x${e.padStart(16,"0")}`:"0x0000000000000000"}(y)),u.eip155Block!==u.eip158Block)throw new Error("EIP155 block number must equal EIP 158 block number since both are part of SpuriousDragon hardfork and the client only supports activating the full hardfork");const E={name:a,chainId:b,networkId:b,genesis:{timestamp:g,gasLimit:parseInt(h),difficulty:parseInt(d),nonce:y,extraData:m,mixHash:l,coinbase:f,baseFeePerGas:p},hardfork:void 0,hardforks:[],bootstrapNodes:[],consensus:void 0!==u.clique?{type:"poa",algorithm:"clique",clique:{period:null!==(i=u.clique.period)&&void 0!==i?i:u.clique.blockperiodseconds,epoch:null!==(o=u.clique.epoch)&&void 0!==o?o:u.clique.epochlength}}:{type:"pow",algorithm:"ethash",ethash:{}}},_={[s.Hardfork.Homestead]:{name:"homesteadBlock"},[s.Hardfork.Dao]:{name:"daoForkBlock"},[s.Hardfork.TangerineWhistle]:{name:"eip150Block"},[s.Hardfork.SpuriousDragon]:{name:"eip155Block"},[s.Hardfork.Byzantium]:{name:"byzantiumBlock"},[s.Hardfork.Constantinople]:{name:"constantinopleBlock"},[s.Hardfork.Petersburg]:{name:"petersburgBlock"},[s.Hardfork.Istanbul]:{name:"istanbulBlock"},[s.Hardfork.MuirGlacier]:{name:"muirGlacierBlock"},[s.Hardfork.Berlin]:{name:"berlinBlock"},[s.Hardfork.London]:{name:"londonBlock"},[s.Hardfork.MergeForkIdTransition]:{name:"mergeForkBlock",postMerge:r},[s.Hardfork.Shanghai]:{name:"shanghaiTime",postMerge:!0,isTimestamp:!0},[s.Hardfork.ShardingForkDev]:{name:"shardingForkTime",postMerge:!0,isTimestamp:!0}},A=Object.keys(_).reduce(((e,t)=>(e[_[t].name]=t,e)),{}),T=Object.keys(u).filter((e=>void 0!==A[e]&&void 0!==u[e]&&null!==u[e]));if(E.hardforks=T.map((e=>({name:A[e],block:!0===_[A[e]].isTimestamp||"number"!=typeof u[e]?null:u[e],timestamp:!0===_[A[e]].isTimestamp&&"number"==typeof u[e]?u[e]:void 0}))).filter((e=>null!==e.block||void 0!==e.timestamp)),E.hardforks.sort(((e,t)=>{var r,n;return(null!==(r=e.block)&&void 0!==r?r:1/0)-(null!==(n=t.block)&&void 0!==n?n:1/0)})),E.hardforks.sort(((e,t)=>{var r,n;return(null!==(r=e.timestamp)&&void 0!==r?r:v)-(null!==(n=t.timestamp)&&void 0!==n?n:v)})),void 0!==u.terminalTotalDifficulty){const e={name:s.Hardfork.Merge,ttd:u.terminalTotalDifficulty,block:null},t=E.hardforks.findIndex((e=>{var t;return!0===(null===(t=_[e.name])||void 0===t?void 0:t.postMerge)}));-1!==t?E.hardforks.splice(t,0,e):E.hardforks.push(e)}const I=E.hardforks.length>0?E.hardforks.slice(-1)[0]:void 0;return E.hardfork=null==I?void 0:I.name,E.hardforks.unshift({name:s.Hardfork.Chainstart,block:0}),E}(e,i)}catch(e){throw new Error(`Error parsing parameters file: ${e.message}`)}},t.padToEven=u,t.intToUint8Array=function(e){const t=c(e);return(0,i.hexToBytes)(`0x${u(t.slice(2))}`)},t.toUint8Array=function(e){if(null==e)return new Uint8Array;if(e instanceof Uint8Array)return e;if(Array.isArray(e))return Uint8Array.from(e);if("string"==typeof e){if(!(0,n.isHexString)(e))throw new Error(`Cannot convert string to Uint8Array. only supports 0x-prefixed hex strings and this string was given: ${e}`);return(0,i.hexToBytes)(u((0,t.stripHexPrefix)(e)))}if("number"==typeof e)return(0,t.toUint8Array)((0,i.numberToHex)(e));if("bigint"==typeof e){if(e<BigInt(0))throw new Error(`Cannot convert negative bigint to Uint8Array. Given: ${e}`);let r=e.toString(16);return r.length%2&&(r=`0${r}`),(0,t.toUint8Array)(`0x${r}`)}if(e.toArray)return Uint8Array.from(e.toArray());throw new Error("invalid type")},t.uint8ArrayToBigInt=d,t.bigIntToUint8Array=l,t.zeros=function(e){return new Uint8Array(e).fill(0)},t.assertIsUint8Array=h,t.setLengthLeft=function(e,r){return h(e),function(e,r,n){const i=(0,t.zeros)(r);return e.length<r?(i.set(e,r-e.length),i):e.subarray(-r)}(e,r)},t.stripZeros=f,t.unpadUint8Array=function(e){return h(e),f(e)},t.bigIntToHex=e=>`0x${e.toString(16)}`,t.bigIntToUnpaddedUint8Array=function(e){return(0,t.unpadUint8Array)(l(e))},t.ecrecover=function(e,t,r,n,i){const s=function(e,t){return e===BigInt(0)||e===BigInt(1)?e:void 0===t?e-BigInt(27):e-(t*BigInt(2)+BigInt(35))}(t,i);if(!function(e){return e===BigInt(0)||e===BigInt(1)}(s))throw new Error("Invalid signature v value");return new o.secp256k1.Signature(d(r),d(n)).addRecoveryBit(Number(s)).recoverPublicKey(e).toRawBytes(!1).slice(1)},t.toType=function(e,r){if(null===e)return null;if(void 0===e)return;if("string"==typeof e&&!(0,n.isHexString)(e))throw new Error(`A string must be provided with a 0x-prefix, given: ${e}`);if("number"==typeof e&&!Number.isSafeInteger(e))throw new Error("The provided number is greater than MAX_SAFE_INTEGER (please use an alternative input type)");const o=(0,t.toUint8Array)(e);switch(r){case a.TypeOutput.Uint8Array:return o;case a.TypeOutput.BigInt:return d(o);case a.TypeOutput.Number:{const e=d(o);if(e>BigInt(Number.MAX_SAFE_INTEGER))throw new Error("The provided number is greater than MAX_SAFE_INTEGER (please use an alternative output type)");return Number(e)}case a.TypeOutput.PrefixedHexString:return(0,i.bytesToHex)(o);default:throw new Error("unknown outputType")}}},9247:function(e,t,r){"use strict";var n=this&&this.__createBinding||(Object.create?function(e,t,r,n){void 0===n&&(n=r);var i=Object.getOwnPropertyDescriptor(t,r);i&&!("get"in i?!t.__esModule:i.writable||i.configurable)||(i={enumerable:!0,get:function(){return t[r]}}),Object.defineProperty(e,n,i)}:function(e,t,r,n){void 0===n&&(n=r),e[n]=t[r]}),i=this&&this.__exportStar||function(e,t){for(var r in e)"default"===r||Object.prototype.hasOwnProperty.call(t,r)||n(t,e,r)};Object.defineProperty(t,"__esModule",{value:!0}),i(r(8632),t),i(r(1560),t),i(r(4874),t),i(r(5774),t),i(r(8317),t),i(r(9275),t)},5774:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.keyStoreSchema=void 0,t.keyStoreSchema={type:"object",required:["crypto","id","version","address"],properties:{crypto:{type:"object",required:["cipher","ciphertext","cipherparams","kdf","kdfparams","mac"],properties:{cipher:{type:"string"},ciphertext:{type:"string"},cipherparams:{type:"object"},kdf:{type:"string"},kdfparams:{type:"object"},salt:{type:"string"},mac:{type:"string"}}},id:{type:"string"},version:{type:"number"},address:{type:"string"}}}},7592:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.Address=void 0;const n=r(7423),i=r(9634),o=r(4555),s=r(2290);class a{constructor(e){if(20!==e.length)throw new Error("Invalid address length");this.buf=e}static zero(){return new a((0,s.zeros)(20))}equals(e){return(0,i.uint8ArrayEquals)(this.buf,e.buf)}isZero(){return this.equals(a.zero())}toString(){return(0,i.bytesToHex)(this.buf)}toArray(){return this.buf}static publicToAddress(e,t=!1){let r=e;if((0,s.assertIsUint8Array)(r),t&&64!==r.length&&(r=o.secp256k1.ProjectivePoint.fromHex(r).toRawBytes(!1).slice(1)),64!==r.length)throw new Error("Expected pubKey to be of length 64");return(0,n.keccak256)(r).slice(-20)}}t.Address=a},915:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.BaseTransaction=void 0;const n=r(9634),i=r(4555),o=r(2290),s=r(6664),a=r(4443),c=r(9964),u=r(7592),d=r(4562);t.BaseTransaction=class{constructor(e,t){var r,n;this.cache={hash:void 0,dataFee:void 0},this.activeCapabilities=[],this.DEFAULT_CHAIN=a.Chain.Mainnet,this.DEFAULT_HARDFORK=a.Hardfork.Merge;const{nonce:i,gasLimit:s,to:c,value:l,data:h,v:f,r:p,s:m,type:g}=e;this._type=Number((0,o.uint8ArrayToBigInt)((0,o.toUint8Array)(g))),this.txOptions=t;const y=(0,o.toUint8Array)(""===c?"0x":c),v=(0,o.toUint8Array)(""===f?"0x":f),b=(0,o.toUint8Array)(""===p?"0x":p),E=(0,o.toUint8Array)(""===m?"0x":m);this.nonce=(0,o.uint8ArrayToBigInt)((0,o.toUint8Array)(""===i?"0x":i)),this.gasLimit=(0,o.uint8ArrayToBigInt)((0,o.toUint8Array)(""===s?"0x":s)),this.to=y.length>0?new u.Address(y):void 0,this.value=(0,o.uint8ArrayToBigInt)((0,o.toUint8Array)(""===l?"0x":l)),this.data=(0,o.toUint8Array)(""===h?"0x":h),this.v=v.length>0?(0,o.uint8ArrayToBigInt)(v):void 0,this.r=b.length>0?(0,o.uint8ArrayToBigInt)(b):void 0,this.s=E.length>0?(0,o.uint8ArrayToBigInt)(E):void 0,this._validateCannotExceedMaxInteger({value:this.value,r:this.r,s:this.s}),this._validateCannotExceedMaxInteger({gasLimit:this.gasLimit},64),this._validateCannotExceedMaxInteger({nonce:this.nonce},64,!0);const _=void 0===this.to||null===this.to,A=null!==(r=t.allowUnlimitedInitCodeSize)&&void 0!==r&&r,T=null!==(n=t.common)&&void 0!==n?n:this._getCommon();_&&T.isActivatedEIP(3860)&&!A&&(0,d.checkMaxInitCodeSize)(T,this.data.length)}get type(){return this._type}supports(e){return this.activeCapabilities.includes(e)}validate(e=!1){const t=[];return this.getBaseFee()>this.gasLimit&&t.push(`gasLimit is too low. given ${this.gasLimit}, need at least ${this.getBaseFee()}`),this.isSigned()&&!this.verifySignature()&&t.push("Invalid Signature"),e?t:0===t.length}_validateYParity(){const{v:e}=this;if(void 0!==e&&e!==BigInt(0)&&e!==BigInt(1)){const e=this._errorMsg("The y-parity of the transaction should either be 0 or 1");throw new Error(e)}}_validateHighS(){const{s:e}=this;if(this.common.gteHardfork("homestead")&&void 0!==e&&e>i.SECP256K1_ORDER_DIV_2){const e=this._errorMsg("Invalid Signature: s-values greater than secp256k1n/2 are considered invalid");throw new Error(e)}}getBaseFee(){const e=this.common.param("gasPrices","tx");let t=this.getDataFee();if(e&&(t+=e),this.common.gteHardfork("homestead")&&this.toCreationAddress()){const e=this.common.param("gasPrices","txCreation");e&&(t+=e)}return t}getDataFee(){const e=this.common.param("gasPrices","txDataZero"),t=this.common.param("gasPrices","txDataNonZero");let r=BigInt(0);for(let n=0;n<this.data.length;n+=1)0===this.data[n]?r+=e:r+=t;if((void 0===this.to||null===this.to)&&this.common.isActivatedEIP(3860)){const e=BigInt(Math.ceil(this.data.length/32));r+=this.common.param("gasPrices","initCodeWordCost")*e}return r}toCreationAddress(){return void 0===this.to||0===this.to.buf.length}isSigned(){const{v:e,r:t,s:r}=this;return void 0!==e&&void 0!==t&&void 0!==r}verifySignature(){try{const e=this.getSenderPublicKey();return 0!==(0,o.unpadUint8Array)(e).length}catch(e){return!1}}getSenderAddress(){return new u.Address(u.Address.publicToAddress(this.getSenderPublicKey()))}sign(e){if(32!==e.length){const e=this._errorMsg("Private key must be 32 bytes in length.");throw new Error(e)}let t=!1;0===this.type&&this.common.gteHardfork("spuriousDragon")&&!this.supports(c.Capability.EIP155ReplayProtection)&&(this.activeCapabilities.push(c.Capability.EIP155ReplayProtection),t=!0);const r=this.getMessageToSign(!0),{v:n,r:i,s:o}=this._ecsign(r,e),s=this._processSignature(n,i,o);if(t){const e=this.activeCapabilities.indexOf(c.Capability.EIP155ReplayProtection);e>-1&&this.activeCapabilities.splice(e,1)}return s}_getCommon(e,t){var r;if(void 0!==t){const r=(0,o.uint8ArrayToBigInt)((0,o.toUint8Array)(t));if(e){if(e.chainId()!==r){const e=this._errorMsg("The chain ID does not match the chain ID of Common");throw new Error(e)}return e.copy()}return s.Common.isSupportedChainId(r)?new s.Common({chain:r,hardfork:this.DEFAULT_HARDFORK}):s.Common.custom({name:"custom-chain",networkId:r,chainId:r},{baseChain:this.DEFAULT_CHAIN,hardfork:this.DEFAULT_HARDFORK})}return null!==(r=null==e?void 0:e.copy())&&void 0!==r?r:new s.Common({chain:this.DEFAULT_CHAIN,hardfork:this.DEFAULT_HARDFORK})}_validateCannotExceedMaxInteger(e,t=256,r=!1){for(const[n,o]of Object.entries(e))switch(t){case 64:if(r){if(void 0!==o&&o>=i.MAX_UINT64){const e=this._errorMsg(`${n} cannot equal or exceed MAX_UINT64 (2^64-1), given ${o}`);throw new Error(e)}}else if(void 0!==o&&o>i.MAX_UINT64){const e=this._errorMsg(`${n} cannot exceed MAX_UINT64 (2^64-1), given ${o}`);throw new Error(e)}break;case 256:if(r){if(void 0!==o&&o>=i.MAX_INTEGER){const e=this._errorMsg(`${n} cannot equal or exceed MAX_INTEGER (2^256-1), given ${o}`);throw new Error(e)}}else if(void 0!==o&&o>i.MAX_INTEGER){const e=this._errorMsg(`${n} cannot exceed MAX_INTEGER (2^256-1), given ${o}`);throw new Error(e)}break;default:{const e=this._errorMsg("unimplemented bits value");throw new Error(e)}}}static _validateNotArray(e){const t=["nonce","gasPrice","gasLimit","to","value","data","v","r","s","type","baseFee","maxFeePerGas","chainId"];for(const[r,n]of Object.entries(e))if(t.includes(r)&&Array.isArray(n))throw new Error(`${r} cannot be an array`)}_getSharedErrorPostfix(){let e="";try{e=this.isSigned()?(0,n.bytesToHex)(this.hash()):"not available (unsigned)"}catch(t){e="error"}let t="";try{t=this.isSigned().toString()}catch(t){e="error"}let r="";try{r=this.common.hardfork()}catch(e){r="error"}let i=`tx type=${this.type} hash=${e} nonce=${this.nonce} value=${this.value} `;return i+=`signed=${t} hf=${r}`,i}_ecsign(e,t,r){const n=i.secp256k1.sign(e,t),o=n.toCompactRawBytes();return{r:o.subarray(0,32),s:o.subarray(32,64),v:void 0===r?BigInt(n.recovery+27):BigInt(n.recovery+35)+BigInt(r)*BigInt(2)}}static fromSerializedTx(e,t={}){}static fromTxData(e,t={}){}}},4555:function(e,t,r){"use strict";var n,i=this&&this.__createBinding||(Object.create?function(e,t,r,n){void 0===n&&(n=r);var i=Object.getOwnPropertyDescriptor(t,r);i&&!("get"in i?!t.__esModule:i.writable||i.configurable)||(i={enumerable:!0,get:function(){return t[r]}}),Object.defineProperty(e,n,i)}:function(e,t,r,n){void 0===n&&(n=r),e[n]=t[r]}),o=this&&this.__setModuleDefault||(Object.create?function(e,t){Object.defineProperty(e,"default",{enumerable:!0,value:t})}:function(e,t){e.default=t}),s=this&&this.__importStar||function(e){if(e&&e.__esModule)return e;var t={};if(null!=e)for(var r in e)"default"!==r&&Object.prototype.hasOwnProperty.call(e,r)&&i(t,e,r);return o(t,e),t};Object.defineProperty(t,"__esModule",{value:!0}),t.SECP256K1_ORDER_DIV_2=t.SECP256K1_ORDER=t.MAX_INTEGER=t.MAX_UINT64=t.secp256k1=void 0;const a=s(r(5473));t.secp256k1=null!==(n=a.secp256k1)&&void 0!==n?n:a,t.MAX_UINT64=BigInt("0xffffffffffffffff"),t.MAX_INTEGER=BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"),t.SECP256K1_ORDER=t.secp256k1.CURVE.n,t.SECP256K1_ORDER_DIV_2=t.SECP256K1_ORDER/BigInt(2)},6135:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.FeeMarketEIP1559Transaction=void 0;const n=r(7423),i=r(7345),o=r(7256),s=r(9634),a=r(4555),c=r(915),u=r(4562),d=r(2290),l=(0,s.hexToBytes)(2..toString(16).padStart(2,"0"));class h extends c.BaseTransaction{constructor(e,t={}){var r;super(Object.assign(Object.assign({},e),{type:2}),t),this.DEFAULT_HARDFORK="london";const{chainId:n,accessList:i,maxFeePerGas:o,maxPriorityFeePerGas:s}=e;if(this.common=this._getCommon(t.common,n),this.chainId=this.common.chainId(),!this.common.isActivatedEIP(1559))throw new Error("EIP-1559 not enabled on Common");this.activeCapabilities=this.activeCapabilities.concat([1559,2718,2930]);const l=(0,u.getAccessListData)(null!=i?i:[]);if(this.accessList=l.accessList,this.AccessListJSON=l.AccessListJSON,(0,u.verifyAccessList)(this.accessList),this.maxFeePerGas=(0,d.uint8ArrayToBigInt)((0,d.toUint8Array)(""===o?"0x":o)),this.maxPriorityFeePerGas=(0,d.uint8ArrayToBigInt)((0,d.toUint8Array)(""===s?"0x":s)),this._validateCannotExceedMaxInteger({maxFeePerGas:this.maxFeePerGas,maxPriorityFeePerGas:this.maxPriorityFeePerGas}),c.BaseTransaction._validateNotArray(e),this.gasLimit*this.maxFeePerGas>a.MAX_INTEGER){const e=this._errorMsg("gasLimit * maxFeePerGas cannot exceed MAX_INTEGER (2^256-1)");throw new Error(e)}if(this.maxFeePerGas<this.maxPriorityFeePerGas){const e=this._errorMsg("maxFeePerGas cannot be less than maxPriorityFeePerGas (The total must be the larger of the two)");throw new Error(e)}this._validateYParity(),this._validateHighS(),(null===(r=null==t?void 0:t.freeze)||void 0===r||r)&&Object.freeze(this)}static fromTxData(e,t={}){return new h(e,t)}static fromSerializedTx(e,t={}){if(!(0,s.uint8ArrayEquals)(e.subarray(0,1),l))throw new Error(`Invalid serialized tx input: not an EIP-1559 transaction (wrong tx type, expected: 2, received: ${(0,s.bytesToHex)(e.subarray(0,1))}`);const r=o.RLP.decode(e.subarray(1));if(!Array.isArray(r))throw new Error("Invalid serialized tx input: must be array");return h.fromValuesArray(r,t)}static fromValuesArray(e,t={}){if(9!==e.length&&12!==e.length)throw new Error("Invalid EIP-1559 transaction. Only expecting 9 values (for unsigned tx) or 12 values (for signed tx).");const[r,n,o,s,a,c,u,l,f,p,m,g]=e;return this._validateNotArray({chainId:r,v:p}),(0,i.validateNoLeadingZeroes)({nonce:n,maxPriorityFeePerGas:o,maxFeePerGas:s,gasLimit:a,value:u,v:p,r:m,s:g}),new h({chainId:(0,d.uint8ArrayToBigInt)(r),nonce:n,maxPriorityFeePerGas:o,maxFeePerGas:s,gasLimit:a,to:c,value:u,data:l,accessList:null!=f?f:[],v:void 0!==p?(0,d.uint8ArrayToBigInt)(p):void 0,r:m,s:g},t)}getDataFee(){if(this.cache.dataFee&&this.cache.dataFee.hardfork===this.common.hardfork())return this.cache.dataFee.value;let e=super.getDataFee();return e+=BigInt((0,u.getDataFeeEIP2930)(this.accessList,this.common)),Object.isFrozen(this)&&(this.cache.dataFee={value:e,hardfork:this.common.hardfork()}),e}getUpfrontCost(e=BigInt(0)){const t=this.maxPriorityFeePerGas,r=this.maxFeePerGas-e,n=(t<r?t:r)+e;return this.gasLimit*n+this.value}raw(){return[(0,d.bigIntToUnpaddedUint8Array)(this.chainId),(0,d.bigIntToUnpaddedUint8Array)(this.nonce),(0,d.bigIntToUnpaddedUint8Array)(this.maxPriorityFeePerGas),(0,d.bigIntToUnpaddedUint8Array)(this.maxFeePerGas),(0,d.bigIntToUnpaddedUint8Array)(this.gasLimit),void 0!==this.to?this.to.buf:Uint8Array.from([]),(0,d.bigIntToUnpaddedUint8Array)(this.value),this.data,this.accessList,void 0!==this.v?(0,d.bigIntToUnpaddedUint8Array)(this.v):Uint8Array.from([]),void 0!==this.r?(0,d.bigIntToUnpaddedUint8Array)(this.r):Uint8Array.from([]),void 0!==this.s?(0,d.bigIntToUnpaddedUint8Array)(this.s):Uint8Array.from([])]}serialize(){const e=this.raw();return(0,s.uint8ArrayConcat)(l,o.RLP.encode(e))}getMessageToSign(e=!0){const t=this.raw().slice(0,9),r=(0,s.uint8ArrayConcat)(l,o.RLP.encode(t));return e?(0,n.keccak256)(r):r}hash(){if(!this.isSigned()){const e=this._errorMsg("Cannot call hash method if transaction is not signed");throw new Error(e)}return Object.isFrozen(this)?(this.cache.hash||(this.cache.hash=(0,n.keccak256)(this.serialize())),this.cache.hash):(0,n.keccak256)(this.serialize())}getMessageToVerifySignature(){return this.getMessageToSign()}getSenderPublicKey(){if(!this.isSigned()){const e=this._errorMsg("Cannot call this method if transaction is not signed");throw new Error(e)}const e=this.getMessageToVerifySignature(),{v:t,r,s:n}=this;this._validateHighS();try{return(0,d.ecrecover)(e,t+BigInt(27),(0,d.bigIntToUnpaddedUint8Array)(r),(0,d.bigIntToUnpaddedUint8Array)(n))}catch(e){const t=this._errorMsg("Invalid Signature");throw new Error(t)}}_processSignature(e,t,r){const n=Object.assign(Object.assign({},this.txOptions),{common:this.common});return h.fromTxData({chainId:this.chainId,nonce:this.nonce,maxPriorityFeePerGas:this.maxPriorityFeePerGas,maxFeePerGas:this.maxFeePerGas,gasLimit:this.gasLimit,to:this.to,value:this.value,data:this.data,accessList:this.accessList,v:e-BigInt(27),r:(0,d.uint8ArrayToBigInt)(t),s:(0,d.uint8ArrayToBigInt)(r)},n)}toJSON(){const e=(0,u.getAccessListJSON)(this.accessList);return{chainId:(0,d.bigIntToHex)(this.chainId),nonce:(0,d.bigIntToHex)(this.nonce),maxPriorityFeePerGas:(0,d.bigIntToHex)(this.maxPriorityFeePerGas),maxFeePerGas:(0,d.bigIntToHex)(this.maxFeePerGas),gasLimit:(0,d.bigIntToHex)(this.gasLimit),to:void 0!==this.to?this.to.toString():void 0,value:(0,d.bigIntToHex)(this.value),data:(0,s.bytesToHex)(this.data),accessList:e,v:void 0!==this.v?(0,d.bigIntToHex)(this.v):void 0,r:void 0!==this.r?(0,d.bigIntToHex)(this.r):void 0,s:void 0!==this.s?(0,d.bigIntToHex)(this.s):void 0}}errorStr(){let e=this._getSharedErrorPostfix();return e+=` maxFeePerGas=${this.maxFeePerGas} maxPriorityFeePerGas=${this.maxPriorityFeePerGas}`,e}_errorMsg(e){return`${e} (${this.errorStr()})`}}t.FeeMarketEIP1559Transaction=h},9013:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.AccessListEIP2930Transaction=void 0;const n=r(7423),i=r(7345),o=r(7256),s=r(9634),a=r(4555),c=r(4562),u=r(2290),d=r(915),l=(0,s.hexToBytes)(1..toString(16).padStart(2,"0"));class h extends d.BaseTransaction{constructor(e,t={}){var r;super(Object.assign(Object.assign({},e),{type:1}),t),this.DEFAULT_HARDFORK="berlin";const{chainId:n,accessList:i,gasPrice:o}=e;if(this.common=this._getCommon(t.common,n),this.chainId=this.common.chainId(),!this.common.isActivatedEIP(2930))throw new Error("EIP-2930 not enabled on Common");this.activeCapabilities=this.activeCapabilities.concat([2718,2930]);const s=(0,c.getAccessListData)(null!=i?i:[]);if(this.accessList=s.accessList,this.AccessListJSON=s.AccessListJSON,(0,c.verifyAccessList)(this.accessList),this.gasPrice=(0,u.uint8ArrayToBigInt)((0,u.toUint8Array)(""===o?"0x":o)),this._validateCannotExceedMaxInteger({gasPrice:this.gasPrice}),d.BaseTransaction._validateNotArray(e),this.gasPrice*this.gasLimit>a.MAX_INTEGER){const e=this._errorMsg("gasLimit * gasPrice cannot exceed MAX_INTEGER");throw new Error(e)}this._validateYParity(),this._validateHighS(),(null===(r=null==t?void 0:t.freeze)||void 0===r||r)&&Object.freeze(this)}static fromTxData(e,t={}){return new h(e,t)}static fromSerializedTx(e,t={}){if(!(0,s.uint8ArrayEquals)(e.subarray(0,1),l))throw new Error(`Invalid serialized tx input: not an EIP-2930 transaction (wrong tx type, expected: 1, received: ${(0,s.bytesToHex)(e.subarray(0,1))}`);const r=o.RLP.decode(Uint8Array.from(e.subarray(1)));if(!Array.isArray(r))throw new Error("Invalid serialized tx input: must be array");return h.fromValuesArray(r,t)}static fromValuesArray(e,t={}){if(8!==e.length&&11!==e.length)throw new Error("Invalid EIP-2930 transaction. Only expecting 8 values (for unsigned tx) or 11 values (for signed tx).");const[r,n,o,s,a,c,d,l,f,p,m]=e;return this._validateNotArray({chainId:r,v:f}),(0,i.validateNoLeadingZeroes)({nonce:n,gasPrice:o,gasLimit:s,value:c,v:f,r:p,s:m}),new h({chainId:(0,u.uint8ArrayToBigInt)(r),nonce:n,gasPrice:o,gasLimit:s,to:a,value:c,data:d,accessList:null!=l?l:[],v:void 0!==f?(0,u.uint8ArrayToBigInt)(f):void 0,r:p,s:m},t)}getDataFee(){if(this.cache.dataFee&&this.cache.dataFee.hardfork===this.common.hardfork())return this.cache.dataFee.value;let e=super.getDataFee();return e+=BigInt((0,c.getDataFeeEIP2930)(this.accessList,this.common)),Object.isFrozen(this)&&(this.cache.dataFee={value:e,hardfork:this.common.hardfork()}),e}getUpfrontCost(){return this.gasLimit*this.gasPrice+this.value}raw(){return[(0,u.bigIntToUnpaddedUint8Array)(this.chainId),(0,u.bigIntToUnpaddedUint8Array)(this.nonce),(0,u.bigIntToUnpaddedUint8Array)(this.gasPrice),(0,u.bigIntToUnpaddedUint8Array)(this.gasLimit),void 0!==this.to?this.to.buf:Uint8Array.from([]),(0,u.bigIntToUnpaddedUint8Array)(this.value),this.data,this.accessList,void 0!==this.v?(0,u.bigIntToUnpaddedUint8Array)(this.v):Uint8Array.from([]),void 0!==this.r?(0,u.bigIntToUnpaddedUint8Array)(this.r):Uint8Array.from([]),void 0!==this.s?(0,u.bigIntToUnpaddedUint8Array)(this.s):Uint8Array.from([])]}serialize(){const e=this.raw();return(0,s.uint8ArrayConcat)(l,o.RLP.encode(e))}getMessageToSign(e=!0){const t=this.raw().slice(0,8),r=(0,s.uint8ArrayConcat)(l,o.RLP.encode(t));return e?(0,n.keccak256)(r):r}hash(){if(!this.isSigned()){const e=this._errorMsg("Cannot call hash method if transaction is not signed");throw new Error(e)}return Object.isFrozen(this)?(this.cache.hash||(this.cache.hash=(0,n.keccak256)(this.serialize())),this.cache.hash):(0,n.keccak256)(this.serialize())}getMessageToVerifySignature(){return this.getMessageToSign()}getSenderPublicKey(){if(!this.isSigned()){const e=this._errorMsg("Cannot call this method if transaction is not signed");throw new Error(e)}const e=this.getMessageToVerifySignature(),{v:t,r,s:n}=this;this._validateHighS();try{return(0,u.ecrecover)(e,t+BigInt(27),(0,u.bigIntToUnpaddedUint8Array)(r),(0,u.bigIntToUnpaddedUint8Array)(n))}catch(e){const t=this._errorMsg("Invalid Signature");throw new Error(t)}}_processSignature(e,t,r){const n=Object.assign(Object.assign({},this.txOptions),{common:this.common});return h.fromTxData({chainId:this.chainId,nonce:this.nonce,gasPrice:this.gasPrice,gasLimit:this.gasLimit,to:this.to,value:this.value,data:this.data,accessList:this.accessList,v:e-BigInt(27),r:(0,u.uint8ArrayToBigInt)(t),s:(0,u.uint8ArrayToBigInt)(r)},n)}toJSON(){const e=(0,c.getAccessListJSON)(this.accessList);return{chainId:(0,u.bigIntToHex)(this.chainId),nonce:(0,u.bigIntToHex)(this.nonce),gasPrice:(0,u.bigIntToHex)(this.gasPrice),gasLimit:(0,u.bigIntToHex)(this.gasLimit),to:void 0!==this.to?this.to.toString():void 0,value:(0,u.bigIntToHex)(this.value),data:(0,s.bytesToHex)(this.data),accessList:e,v:void 0!==this.v?(0,u.bigIntToHex)(this.v):void 0,r:void 0!==this.r?(0,u.bigIntToHex)(this.r):void 0,s:void 0!==this.s?(0,u.bigIntToHex)(this.s):void 0}}errorStr(){var e,t;let r=this._getSharedErrorPostfix();return r+=` gasPrice=${this.gasPrice} accessListCount=${null!==(t=null===(e=this.accessList)||void 0===e?void 0:e.length)&&void 0!==t?t:0}`,r}_errorMsg(e){return`${e} (${this.errorStr()})`}}t.AccessListEIP2930Transaction=h},9275:function(e,t,r){"use strict";var n=this&&this.__createBinding||(Object.create?function(e,t,r,n){void 0===n&&(n=r);var i=Object.getOwnPropertyDescriptor(t,r);i&&!("get"in i?!t.__esModule:i.writable||i.configurable)||(i={enumerable:!0,get:function(){return t[r]}}),Object.defineProperty(e,n,i)}:function(e,t,r,n){void 0===n&&(n=r),e[n]=t[r]}),i=this&&this.__setModuleDefault||(Object.create?function(e,t){Object.defineProperty(e,"default",{enumerable:!0,value:t})}:function(e,t){e.default=t}),o=this&&this.__importStar||function(e){if(e&&e.__esModule)return e;var t={};if(null!=e)for(var r in e)"default"!==r&&Object.prototype.hasOwnProperty.call(e,r)&&n(t,e,r);return i(t,e),t},s=this&&this.__exportStar||function(e,t){for(var r in e)"default"===r||Object.prototype.hasOwnProperty.call(t,r)||n(t,e,r)};Object.defineProperty(t,"__esModule",{value:!0}),t.txUtils=t.BaseTransaction=t.TransactionFactory=t.Transaction=t.AccessListEIP2930Transaction=t.FeeMarketEIP1559Transaction=void 0;var a=r(6135);Object.defineProperty(t,"FeeMarketEIP1559Transaction",{enumerable:!0,get:function(){return a.FeeMarketEIP1559Transaction}});var c=r(9013);Object.defineProperty(t,"AccessListEIP2930Transaction",{enumerable:!0,get:function(){return c.AccessListEIP2930Transaction}});var u=r(5381);Object.defineProperty(t,"Transaction",{enumerable:!0,get:function(){return u.Transaction}});var d=r(7668);Object.defineProperty(t,"TransactionFactory",{enumerable:!0,get:function(){return d.TransactionFactory}});var l=r(915);Object.defineProperty(t,"BaseTransaction",{enumerable:!0,get:function(){return l.BaseTransaction}}),t.txUtils=o(r(4562)),s(r(9964),t)},5381:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.Transaction=void 0;const n=r(7256),i=r(7423),o=r(9634),s=r(7345),a=r(2290),c=r(4555),u=r(915),d=r(9964);function l(e,t){const r=Number(e),n=2*Number(t);return r===n+35||r===n+36}class h extends u.BaseTransaction{constructor(e,t={}){var r;if(super(Object.assign(Object.assign({},e),{type:0}),t),this.common=this._validateTxV(this.v,t.common),this.gasPrice=(0,a.uint8ArrayToBigInt)((0,a.toUint8Array)(""===e.gasPrice?"0x":e.gasPrice)),this.gasPrice*this.gasLimit>c.MAX_INTEGER){const e=this._errorMsg("gas limit * gasPrice cannot exceed MAX_INTEGER (2^256-1)");throw new Error(e)}this._validateCannotExceedMaxInteger({gasPrice:this.gasPrice}),u.BaseTransaction._validateNotArray(e),this.common.gteHardfork("spuriousDragon")&&(this.isSigned()?l(this.v,this.common.chainId())&&this.activeCapabilities.push(d.Capability.EIP155ReplayProtection):this.activeCapabilities.push(d.Capability.EIP155ReplayProtection)),(null===(r=null==t?void 0:t.freeze)||void 0===r||r)&&Object.freeze(this)}static fromTxData(e,t={}){return new h(e,t)}static fromSerializedTx(e,t={}){const r=n.RLP.decode(e);if(!Array.isArray(r))throw new Error("Invalid serialized tx input. Must be array");return this.fromValuesArray(r,t)}static fromValuesArray(e,t={}){if(6!==e.length&&9!==e.length)throw new Error("Invalid transaction. Only expecting 6 values (for unsigned tx) or 9 values (for signed tx).");const[r,n,i,o,a,c,u,d,l]=e;return(0,s.validateNoLeadingZeroes)({nonce:r,gasPrice:n,gasLimit:i,value:a,v:u,r:d,s:l}),new h({nonce:r,gasPrice:n,gasLimit:i,to:o,value:a,data:c,v:u,r:d,s:l},t)}raw(){return[(0,a.bigIntToUnpaddedUint8Array)(this.nonce),(0,a.bigIntToUnpaddedUint8Array)(this.gasPrice),(0,a.bigIntToUnpaddedUint8Array)(this.gasLimit),void 0!==this.to?this.to.buf:Uint8Array.from([]),(0,a.bigIntToUnpaddedUint8Array)(this.value),this.data,void 0!==this.v?(0,a.bigIntToUnpaddedUint8Array)(this.v):Uint8Array.from([]),void 0!==this.r?(0,a.bigIntToUnpaddedUint8Array)(this.r):Uint8Array.from([]),void 0!==this.s?(0,a.bigIntToUnpaddedUint8Array)(this.s):Uint8Array.from([])]}serialize(){return n.RLP.encode(this.raw())}_getMessageToSign(){const e=[(0,a.bigIntToUnpaddedUint8Array)(this.nonce),(0,a.bigIntToUnpaddedUint8Array)(this.gasPrice),(0,a.bigIntToUnpaddedUint8Array)(this.gasLimit),void 0!==this.to?this.to.buf:Uint8Array.from([]),(0,a.bigIntToUnpaddedUint8Array)(this.value),this.data];return this.supports(d.Capability.EIP155ReplayProtection)&&(e.push((0,a.toUint8Array)(this.common.chainId())),e.push((0,a.unpadUint8Array)((0,a.toUint8Array)(0))),e.push((0,a.unpadUint8Array)((0,a.toUint8Array)(0)))),e}getMessageToSign(e=!0){const t=this._getMessageToSign();return e?(0,i.keccak256)(n.RLP.encode(t)):t}getDataFee(){return this.cache.dataFee&&this.cache.dataFee.hardfork===this.common.hardfork()?this.cache.dataFee.value:(Object.isFrozen(this)&&(this.cache.dataFee={value:super.getDataFee(),hardfork:this.common.hardfork()}),super.getDataFee())}getUpfrontCost(){return this.gasLimit*this.gasPrice+this.value}hash(){if(!this.isSigned()){const e=this._errorMsg("Cannot call hash method if transaction is not signed");throw new Error(e)}return Object.isFrozen(this)?(this.cache.hash||(this.cache.hash=(0,i.keccak256)(n.RLP.encode(this.raw()))),this.cache.hash):(0,i.keccak256)(n.RLP.encode(this.raw()))}getMessageToVerifySignature(){if(!this.isSigned()){const e=this._errorMsg("This transaction is not signed");throw new Error(e)}const e=this._getMessageToSign();return(0,i.keccak256)(n.RLP.encode(e))}getSenderPublicKey(){const e=this.getMessageToVerifySignature(),{v:t,r,s:n}=this;this._validateHighS();try{return(0,a.ecrecover)(e,t,(0,a.bigIntToUnpaddedUint8Array)(r),(0,a.bigIntToUnpaddedUint8Array)(n),this.supports(d.Capability.EIP155ReplayProtection)?this.common.chainId():void 0)}catch(e){const t=this._errorMsg("Invalid Signature");throw new Error(t)}}_processSignature(e,t,r){let n=e;this.supports(d.Capability.EIP155ReplayProtection)&&(n+=this.common.chainId()*BigInt(2)+BigInt(8));const i=Object.assign(Object.assign({},this.txOptions),{common:this.common});return h.fromTxData({nonce:this.nonce,gasPrice:this.gasPrice,gasLimit:this.gasLimit,to:this.to,value:this.value,data:this.data,v:n,r:(0,a.uint8ArrayToBigInt)(t),s:(0,a.uint8ArrayToBigInt)(r)},i)}toJSON(){return{nonce:(0,a.bigIntToHex)(this.nonce),gasPrice:(0,a.bigIntToHex)(this.gasPrice),gasLimit:(0,a.bigIntToHex)(this.gasLimit),to:void 0!==this.to?this.to.toString():void 0,value:(0,a.bigIntToHex)(this.value),data:(0,o.bytesToHex)(this.data),v:void 0!==this.v?(0,a.bigIntToHex)(this.v):void 0,r:void 0!==this.r?(0,a.bigIntToHex)(this.r):void 0,s:void 0!==this.s?(0,a.bigIntToHex)(this.s):void 0}}_validateTxV(e,t){let r;const n=void 0!==e?Number(e):void 0;if(void 0!==n&&n<37&&27!==n&&28!==n)throw new Error(`Legacy txs need either v = 27/28 or v >= 37 (EIP-155 replay protection), got v = ${n}`);if(void 0!==n&&0!==n&&(!t||t.gteHardfork("spuriousDragon"))&&27!==n&&28!==n)if(t){if(!l(BigInt(n),t.chainId()))throw new Error(`Incompatible EIP155-based V ${n} and chain id ${t.chainId()}. See the Common parameter of the Transaction constructor to set the chain id.`)}else{let e;e=(n-35)%2==0?35:36,r=BigInt(n-e)/BigInt(2)}return this._getCommon(t,r)}errorStr(){let e=this._getSharedErrorPostfix();return e+=` gasPrice=${this.gasPrice}`,e}_errorMsg(e){return`${e} (${this.errorStr()})`}}t.Transaction=h},7668:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.TransactionFactory=void 0;const n=r(2290),i=r(6135),o=r(9013),s=r(5381),a=new Map;class c{constructor(){}static typeToInt(e){return Number((0,n.uint8ArrayToBigInt)((0,n.toUint8Array)(e)))}static registerTransactionType(e,t){const r=c.typeToInt(e);a.set(r,t)}static fromTxData(e,t={}){if(!("type"in e)||void 0===e.type)return s.Transaction.fromTxData(e,t);const r=c.typeToInt(e.type);if(0===r)return s.Transaction.fromTxData(e,t);if(1===r)return o.AccessListEIP2930Transaction.fromTxData(e,t);if(2===r)return i.FeeMarketEIP1559Transaction.fromTxData(e,t);const n=a.get(r);if(null==n?void 0:n.fromTxData)return n.fromTxData(e,t);throw new Error(`Tx instantiation with type ${r} not supported`)}static fromSerializedData(e,t={}){if(!(e[0]<=127))return s.Transaction.fromSerializedTx(e,t);switch(e[0]){case 1:return o.AccessListEIP2930Transaction.fromSerializedTx(e,t);case 2:return i.FeeMarketEIP1559Transaction.fromSerializedTx(e,t);default:{const r=a.get(Number(e[0]));if(null==r?void 0:r.fromSerializedTx)return r.fromSerializedTx(e,t);throw new Error(`TypedTransaction with ID ${e[0]} unknown`)}}}static fromBlockBodyData(e,t={}){if(e instanceof Uint8Array)return this.fromSerializedData(e,t);if(Array.isArray(e))return s.Transaction.fromValuesArray(e,t);throw new Error("Cannot decode transaction: unknown type input")}}t.TransactionFactory=c},9964:(e,t)=>{"use strict";function r(e){if(0===e.length)return!0;const t=e[0];return!!Array.isArray(t)}var n;Object.defineProperty(t,"__esModule",{value:!0}),t.isAccessList=t.isAccessListUint8Array=t.Capability=void 0,(n=t.Capability||(t.Capability={}))[n.EIP155ReplayProtection=155]="EIP155ReplayProtection",n[n.EIP1559FeeMarket=1559]="EIP1559FeeMarket",n[n.EIP2718TypedTransaction=2718]="EIP2718TypedTransaction",n[n.EIP2930AccessLists=2930]="EIP2930AccessLists",t.isAccessListUint8Array=r,t.isAccessList=function(e){return!r(e)}},4562:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.getDataFeeEIP2930=t.getAccessListJSON=t.verifyAccessList=t.getAccessListData=t.checkMaxInitCodeSize=void 0;const n=r(9634),i=r(2290),o=r(9964);t.checkMaxInitCodeSize=(e,t)=>{const r=e.param("vm","maxInitCodeSize");if(r&&BigInt(t)>r)throw new Error(`the initcode size of this transaction is too large: it is ${t} while the max is ${e.param("vm","maxInitCodeSize")}`)},t.getAccessListData=e=>{let t,r;if((0,o.isAccessList)(e)){t=e;const n=[];for(let t=0;t<e.length;t+=1){const r=e[t],o=(0,i.toUint8Array)(r.address),s=[];for(let e=0;e<r.storageKeys.length;e+=1)s.push((0,i.toUint8Array)(r.storageKeys[e]));n.push([o,s])}r=n}else{r=null!=e?e:[];const i=[];for(let e=0;e<r.length;e+=1){const t=r[e],o=(0,n.bytesToHex)(t[0]),s=[];for(let e=0;e<t[1].length;e+=1)s.push((0,n.bytesToHex)(t[1][e]));const a={address:o,storageKeys:s};i.push(a)}t=i}return{AccessListJSON:t,accessList:r}},t.verifyAccessList=e=>{for(let t=0;t<e.length;t+=1){const r=e[t],n=r[0],i=r[1];if(void 0!==r[2])throw new Error("Access list item cannot have 3 elements. It can only have an address, and an array of storage slots.");if(20!==n.length)throw new Error("Invalid EIP-2930 transaction: address length should be 20 bytes");for(let e=0;e<i.length;e+=1)if(32!==i[e].length)throw new Error("Invalid EIP-2930 transaction: storage slot length should be 32 bytes")}},t.getAccessListJSON=e=>{const t=[];for(let r=0;r<e.length;r+=1){const o=e[r],s={address:(0,n.bytesToHex)((0,i.setLengthLeft)(o[0],20)),storageKeys:[]},a=o&&o[1];for(let e=0;e<a.length;e+=1){const t=a[e];s.storageKeys.push((0,n.bytesToHex)((0,i.setLengthLeft)(t,32)))}t.push(s)}return t},t.getDataFeeEIP2930=(e,t)=>{const r=t.param("gasPrices","accessListStorageKeyCost"),n=t.param("gasPrices","accessListAddressCost");let i=0;for(let t=0;t<e.length;t+=1)i+=e[t][1].length;return e.length*Number(n)+i*Number(r)}},4874:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0})},8632:function(e,t,r){"use strict";var n=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.Wallet=void 0;const i=r(9970),o=r(7345);class s extends i.Web3BaseWallet{constructor(){super(...arguments),this._addressMap=new Map,this._defaultKeyName="web3js_wallet"}static getStorage(){let e;try{e=window.localStorage;const t="__storage_test__";return e.setItem(t,t),e.removeItem(t),e}catch(t){return!t||22!==t.code&&1014!==t.code&&"QuotaExceededError"!==t.name&&"NS_ERROR_DOM_QUOTA_REACHED"!==t.name||(0,o.isNullish)(e)||0===e.length?void 0:e}}create(e){for(let t=0;t<e;t+=1)this.add(this._accountProvider.create());return this}add(e){var t;if("string"==typeof e)return this.add(this._accountProvider.privateKeyToAccount(e));let r=this.length;return this.get(e.address)&&(console.warn(`Account ${e.address.toLowerCase()} already exists.`),r=null!==(t=this._addressMap.get(e.address.toLowerCase()))&&void 0!==t?t:r),this._addressMap.set(e.address.toLowerCase(),r),this[r]=e,this}get(e){if("string"==typeof e){const t=this._addressMap.get(e.toLowerCase());return(0,o.isNullish)(t)?void 0:this[t]}return this[e]}remove(e){if("string"==typeof e){const t=this._addressMap.get(e.toLowerCase());return!(0,o.isNullish)(t)&&(this._addressMap.delete(e.toLowerCase()),this.splice(t,1),!0)}return!!this[e]&&(this.splice(e,1),!0)}clear(){return this._addressMap.clear(),this.length=0,this}encrypt(e,t){return n(this,void 0,void 0,(function*(){return Promise.all(this.map((r=>n(this,void 0,void 0,(function*(){return r.encrypt(e,t)})))))}))}decrypt(e,t,r){return n(this,void 0,void 0,(function*(){const i=yield Promise.all(e.map((e=>n(this,void 0,void 0,(function*(){return this._accountProvider.decrypt(e,t,r)})))));for(const e of i)this.add(e);return this}))}save(e,t){return n(this,void 0,void 0,(function*(){const r=s.getStorage();if(!r)throw new Error("Local storage not available.");return r.setItem(null!=t?t:this._defaultKeyName,JSON.stringify(yield this.encrypt(e))),!0}))}load(e,t){return n(this,void 0,void 0,(function*(){const r=s.getStorage();if(!r)throw new Error("Local storage not available.");const n=r.getItem(null!=t?t:this._defaultKeyName);return n&&(yield this.decrypt(JSON.parse(n)||[],e)),this}))}}t.Wallet=s},6658:function(e,t,r){"use strict";var n=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.Contract=void 0;const i=r(6527),o=r(5071),s=r(6637),a=r(8381),c=r(9970),u=r(9634),d=r(7345),l=r(5537),h=r(7388),f=r(3948),p={logs:h.LogsSubscription,newHeads:s.NewHeadsSubscription,newBlockHeaders:s.NewHeadsSubscription};class m extends i.Web3Context{constructor(e,t,r,n,s){var a,l,h;const g=(0,f.isContractInitOptions)(t)?t:(0,f.isContractInitOptions)(r)?r:void 0;let y,v;if(y=(0,f.isWeb3ContractContext)(t)?t:(0,f.isWeb3ContractContext)(r)?r:n,v="object"==typeof t&&"provider"in t?t.provider:"object"==typeof r&&"provider"in r?r.provider:"object"==typeof n&&"provider"in n?n.provider:m.givenProvider,super(Object.assign(Object.assign({},y),{provider:v,registeredSubscriptions:p})),this.syncWithContext=!1,this._functions={},!(0,d.isNullish)(g)&&!(0,d.isNullish)(g.data)&&!(0,d.isNullish)(g.input)&&"both"!==this.config.contractDataInputFill)throw new o.ContractTransactionDataAndInputError({data:g.data,input:g.input});this._overloadedMethodAbis=new Map;const b=(0,u.isDataFormat)(n)?n:(0,u.isDataFormat)(r)?r:null!=s?s:c.DEFAULT_RETURN_FORMAT,E="string"==typeof t?t:void 0;"both"===this.config.contractDataInputFill?this._dataInputFill=this.config.contractDataInputFill:this._dataInputFill=null!==(a=null==g?void 0:g.dataInputFill)&&void 0!==a?a:this.config.contractDataInputFill,this._parseAndSetJsonInterface(e,b),(0,d.isNullish)(E)||this._parseAndSetAddress(E,b),this.options={address:E,jsonInterface:this._jsonInterface,gas:null!==(l=null==g?void 0:g.gas)&&void 0!==l?l:null==g?void 0:g.gasLimit,gasPrice:null==g?void 0:g.gasPrice,from:null==g?void 0:g.from,input:null==g?void 0:g.input,data:null==g?void 0:g.data},this.syncWithContext=null!==(h=null==g?void 0:g.syncWithContext)&&void 0!==h&&h,y instanceof i.Web3Context&&this.subscribeToContextEvents(y),Object.defineProperty(this.options,"address",{set:e=>this._parseAndSetAddress(e,b),get:()=>this._address}),Object.defineProperty(this.options,"jsonInterface",{set:e=>this._parseAndSetJsonInterface(e,b),get:()=>this._jsonInterface})}get events(){return this._events}get methods(){return this._methods}clone(){let e;return e=this.options.address?new m([...this._jsonInterface,...this._errorsInterface],this.options.address,{gas:this.options.gas,gasPrice:this.options.gasPrice,from:this.options.from,input:this.options.input,data:this.options.data,provider:this.currentProvider,syncWithContext:this.syncWithContext,dataInputFill:this._dataInputFill},this.getContextObject()):new m([...this._jsonInterface,...this._errorsInterface],{gas:this.options.gas,gasPrice:this.options.gasPrice,from:this.options.from,input:this.options.input,data:this.options.data,provider:this.currentProvider,syncWithContext:this.syncWithContext,dataInputFill:this._dataInputFill},this.getContextObject()),this.context&&e.subscribeToContextEvents(this.context),e}deploy(e){var t,r,i;let s=this._jsonInterface.find((e=>"constructor"===e.type));s||(s={type:"constructor",inputs:[],stateMutability:""});const a=(0,u.format)({format:"bytes"},null!==(t=null==e?void 0:e.input)&&void 0!==t?t:this.options.input,c.DEFAULT_RETURN_FORMAT),d=(0,u.format)({format:"bytes"},null!==(r=null==e?void 0:e.data)&&void 0!==r?r:this.options.data,c.DEFAULT_RETURN_FORMAT);if(!(a&&"0x"!==a.trim()||d&&"0x"!==d.trim()))throw new o.Web3ContractError("contract creation without any data provided.");const h=null!==(i=null==e?void 0:e.arguments)&&void 0!==i?i:[],f=Object.assign(Object.assign({},this.options),{input:a,data:d}),p=null!=a?a:d;return{arguments:h,send:e=>{const t=Object.assign({},e);return this._contractMethodDeploySend(s,h,t,f)},estimateGas:(e,t=c.DEFAULT_RETURN_FORMAT)=>n(this,void 0,void 0,(function*(){const r=Object.assign({},e);return this._contractMethodEstimateGas({abi:s,params:h,returnFormat:t,options:r,contractOptions:f})})),encodeABI:()=>(0,l.encodeMethodABI)(s,h,(0,u.format)({format:"bytes"},p,c.DEFAULT_RETURN_FORMAT))}}getPastEvents(e,t,r){var i;return n(this,void 0,void 0,(function*(){const n="string"==typeof e?e:s.ALL_EVENTS,a="string"==typeof e||(0,u.isDataFormat)(e)?(0,u.isDataFormat)(t)?{}:t:e,d=(0,u.isDataFormat)(e)?e:(0,u.isDataFormat)(t)?t:null!=r?r:c.DEFAULT_RETURN_FORMAT,h="allEvents"===n||n===s.ALL_EVENTS?s.ALL_EVENTS_ABI:this._jsonInterface.find((e=>"name"in e&&e.name===n));if(!h)throw new o.Web3ContractError(`Event ${n} not found.`);const{fromBlock:f,toBlock:p,topics:m,address:g}=(0,l.encodeEventABI)(this.options,h,null!=a?a:{}),y=(yield(0,s.getLogs)(this,{fromBlock:f,toBlock:p,topics:m,address:g},d)).map((e=>"string"==typeof e?e:(0,s.decodeEventABI)(h,e,this._jsonInterface,d))),v=null!==(i=null==a?void 0:a.filter)&&void 0!==i?i:{},b=Object.keys(v);return b.length>0?y.filter((e=>"string"==typeof e||b.every((t=>{var r;if(Array.isArray(v[t]))return v[t].some((r=>String(e.returnValues[t]).toUpperCase()===String(r).toUpperCase()));const n=null===(r=h.inputs)||void 0===r?void 0:r.filter((e=>e.name===t))[0];return!(!(null==n?void 0:n.indexed)||"string"!==n.type||(0,u.keccak256)(v[t])!==String(e.returnValues[t]))||String(e.returnValues[t]).toUpperCase()===String(v[t]).toUpperCase()})))):y}))}_parseAndSetAddress(e,t=c.DEFAULT_RETURN_FORMAT){this._address=e?(0,u.toChecksumAddress)((0,u.format)({format:"address"},e,t)):e}_parseAndSetJsonInterface(e,t=c.DEFAULT_RETURN_FORMAT){var r,n,i,o,u;this._functions={},this._methods={},this._events={};let d=[];const l=e.filter((e=>"error"!==e.type)),h=e.filter((e=>(0,a.isAbiErrorFragment)(e)));for(const e of l){const s=Object.assign(Object.assign({},e),{signature:""});if((0,a.isAbiFunctionFragment)(s)){const e=(0,a.jsonInterfaceMethodToString)(s),t=(0,a.encodeFunctionSignature)(e);s.signature=t,s.constant=null!==(n=null!==(r="view"===s.stateMutability)&&void 0!==r?r:"pure"===s.stateMutability)&&void 0!==n?n:s.constant,s.payable=null!==(i="payable"===s.stateMutability)&&void 0!==i?i:s.payable,this._overloadedMethodAbis.set(s.name,[...null!==(o=this._overloadedMethodAbis.get(s.name))&&void 0!==o?o:[],s]);const c=null!==(u=this._overloadedMethodAbis.get(s.name))&&void 0!==u?u:[],d=this._createContractMethod(c,h);this._functions[e]={signature:t,method:d},this._methods[s.name]=this._functions[e].method,this._methods[e]=this._functions[e].method,this._methods[t]=this._functions[e].method}else if((0,a.isAbiEventFragment)(s)){const e=(0,a.jsonInterfaceMethodToString)(s),r=(0,a.encodeEventSignature)(e),n=this._createContractEvent(s,t);s.signature=r,e in this._events&&"bound"!==s.name||(this._events[e]=n),this._events[s.name]=n,this._events[r]=n}d=[...d,s]}this._events.allEvents=this._createContractEvent(s.ALL_EVENTS_ABI,t),this._jsonInterface=[...d],this._errorsInterface=h}_getAbiParams(e,t){var r;try{return d.utils.transformJsonDataToAbiFormat(null!==(r=e.inputs)&&void 0!==r?r:[],t)}catch(t){throw new o.Web3ContractError(`Invalid parameters for method ${e.name}: ${t.message}`)}}_createContractMethod(e,t){const r=e[e.length-1];return(...e)=>{var i,o;let s;const a=null!==(i=this._overloadedMethodAbis.get(r.name))&&void 0!==i?i:[];let u=a[0];const h=t,f=a.filter((t=>{var r;return(null!==(r=t.inputs)&&void 0!==r?r:[]).length===e.length}));if(1===a.length||0===f.length)s=this._getAbiParams(u,e),d.validator.validate(null!==(o=r.inputs)&&void 0!==o?o:[],s);else{const t=[];for(const r of f)try{s=this._getAbiParams(r,e),d.validator.validate(r.inputs,s),u=r;break}catch(e){t.push(e)}if(t.length===f.length)throw new d.Web3ValidatorError(t)}const p={arguments:s,call:(e,t)=>n(this,void 0,void 0,(function*(){return this._contractMethodCall(u,s,h,e,t)})),send:e=>this._contractMethodSend(u,s,h,e),estimateGas:(e,t=c.DEFAULT_RETURN_FORMAT)=>n(this,void 0,void 0,(function*(){return this._contractMethodEstimateGas({abi:u,params:s,returnFormat:t,options:e})})),encodeABI:()=>(0,l.encodeMethodABI)(u,s),createAccessList:(e,t)=>n(this,void 0,void 0,(function*(){return this._contractMethodCreateAccessList(u,s,h,e,t)}))};return u.stateMutability,p}}_contractMethodCall(e,t,r,i,u){var d;return n(this,void 0,void 0,(function*(){const n=(0,f.getEthTxCallParams)({abi:e,params:t,options:Object.assign(Object.assign({},i),{dataInputFill:this._dataInputFill}),contractOptions:Object.assign(Object.assign({},this.options),{from:null!==(d=this.options.from)&&void 0!==d?d:this.config.defaultAccount})});try{const t=yield(0,s.call)(this,n,u,c.DEFAULT_RETURN_FORMAT);return(0,l.decodeMethodReturn)(e,t)}catch(e){throw e instanceof o.ContractExecutionError&&(0,a.decodeContractErrorData)(r,e.innerError),e}}))}_contractMethodCreateAccessList(e,t,r,i,u){var d;return n(this,void 0,void 0,(function*(){const n=(0,f.getCreateAccessListParams)({abi:e,params:t,options:Object.assign(Object.assign({},i),{dataInputFill:this.config.contractDataInputFill}),contractOptions:Object.assign(Object.assign({},this.options),{from:null!==(d=this.options.from)&&void 0!==d?d:this.config.defaultAccount})});try{return(0,s.createAccessList)(this,n,u,c.DEFAULT_RETURN_FORMAT)}catch(e){throw e instanceof o.ContractExecutionError&&(0,a.decodeContractErrorData)(r,e.innerError),e}}))}_contractMethodSend(e,t,r,n,i){var u,d;let l=null!=i?i:this.options;l=Object.assign(Object.assign({},l),{input:void 0,from:null!==(d=null!==(u=l.from)&&void 0!==u?u:this.defaultAccount)&&void 0!==d?d:void 0});const h=(0,f.getSendTxParams)({abi:e,params:t,options:Object.assign(Object.assign({},n),{dataInputFill:this.config.contractDataInputFill}),contractOptions:l}),p=(0,s.sendTransaction)(this,h,c.DEFAULT_RETURN_FORMAT,{checkRevertBeforeSending:!1,contractAbi:this._jsonInterface});return p.on("error",(e=>{e instanceof o.ContractExecutionError&&(0,a.decodeContractErrorData)(r,e.innerError)})),p}_contractMethodDeploySend(e,t,r,n){var i,a;let u=null!=n?n:this.options;u=Object.assign(Object.assign({},u),{from:null!==(a=null!==(i=u.from)&&void 0!==i?i:this.defaultAccount)&&void 0!==a?a:void 0});const d=(0,f.getSendTxParams)({abi:e,params:t,options:Object.assign(Object.assign({},r),{dataInputFill:this.config.contractDataInputFill}),contractOptions:u});return(0,s.sendTransaction)(this,d,c.DEFAULT_RETURN_FORMAT,{transactionResolver:e=>{if(e.status===BigInt(0))throw new o.Web3ContractError("code couldn't be stored",e);const t=this.clone();return t.options.address=e.contractAddress,t},contractAbi:this._jsonInterface,checkRevertBeforeSending:!1})}_contractMethodEstimateGas({abi:e,params:t,returnFormat:r,options:i,contractOptions:o}){return n(this,void 0,void 0,(function*(){const n=(0,f.getEstimateGasParams)({abi:e,params:t,options:Object.assign(Object.assign({},i),{dataInputFill:this.config.contractDataInputFill}),contractOptions:null!=o?o:this.options});return(0,s.estimateGas)(this,n,c.BlockTags.LATEST,r)}))}_createContractEvent(e,t=c.DEFAULT_RETURN_FORMAT){return(...r)=>{var n;const{topics:i,fromBlock:s}=(0,l.encodeEventABI)(this.options,e,r[0]),a=new h.LogsSubscription({address:this.options.address,topics:i,abi:e,jsonInterface:this._jsonInterface},{subscriptionManager:this.subscriptionManager,returnFormat:t});return(0,d.isNullish)(s)||this.getPastEvents(e.name,{fromBlock:s,topics:i},t).then((e=>{e.forEach((e=>a.emit("data",e)))})).catch((e=>{a.emit("error",new o.SubscriptionError("Failed to get past events.",e))})),null===(n=this.subscriptionManager)||void 0===n||n.addSubscription(a).catch((e=>{a.emit("error",new o.SubscriptionError("Failed to subscribe.",e))})),a}}subscribeToContextEvents(e){const t=this;this.context=e,t.syncWithContext&&e.on(i.Web3ConfigEvent.CONFIG_CHANGE,(e=>{t.setConfig({[e.name]:e.newValue})}))}}t.Contract=m},5537:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.decodeMethodReturn=t.encodeMethodABI=t.encodeEventABI=t.decodeEventABI=void 0;const n=r(9634),i=r(9970),o=r(8381),s=r(6637),a=r(5071);var c=r(6637);Object.defineProperty(t,"decodeEventABI",{enumerable:!0,get:function(){return c.decodeEventABI}}),t.encodeEventABI=({address:e},t,r)=>{var a,c;const u=null==r?void 0:r.topics,d=null!==(a=null==r?void 0:r.filter)&&void 0!==a?a:{},l={};if((0,n.isNullish)(null==r?void 0:r.fromBlock)||(l.fromBlock=(0,n.format)(s.blockSchema.properties.number,null==r?void 0:r.fromBlock,{number:i.FMT_NUMBER.HEX,bytes:i.FMT_BYTES.HEX})),(0,n.isNullish)(null==r?void 0:r.toBlock)||(l.toBlock=(0,n.format)(s.blockSchema.properties.number,null==r?void 0:r.toBlock,{number:i.FMT_NUMBER.HEX,bytes:i.FMT_BYTES.HEX})),u&&Array.isArray(u))l.topics=[...u];else if(l.topics=[],!t||t.anonymous||[s.ALL_EVENTS,"allEvents"].includes(t.name)||l.topics.push(null!==(c=t.signature)&&void 0!==c?c:(0,o.encodeEventSignature)((0,o.jsonInterfaceMethodToString)(t))),![s.ALL_EVENTS,"allEvents"].includes(t.name)&&t.inputs)for(const e of t.inputs){if(!e.indexed)continue;const t=d[e.name];t?Array.isArray(t)?l.topics.push(t.map((t=>(0,o.encodeParameter)(e.type,t)))):"string"===e.type?l.topics.push((0,n.keccak256)(t)):l.topics.push((0,o.encodeParameter)(e.type,t)):l.topics.push(null)}return l.topics.length||delete l.topics,e&&(l.address=e.toLowerCase()),l},t.encodeMethodABI=(e,t,r)=>{const n=Array.isArray(e.inputs)?e.inputs.length:0;if(n!==t.length)throw new a.Web3ContractError(`The number of arguments is not matching the methods required number. You need to pass ${n} arguments.`);const i=(0,o.encodeParameters)(Array.isArray(e.inputs)?e.inputs:[],t).replace("0x","");if((0,o.isAbiConstructorFragment)(e)){if(!r)throw new a.Web3ContractError("The contract has no contract data option set. This is necessary to append the constructor parameters.");return r.startsWith("0x")?`${r}${i}`:`0x${r}${i}`}return`${(0,o.encodeFunctionSignature)(e)}${i}`},t.decodeMethodReturn=(e,t)=>{if("constructor"===e.type)return t;if(!t)return null;const r=t.length>=2?t.slice(2):t;if(!e.outputs)return null;const n=(0,o.decodeParameters)([...e.outputs],r);return 1===n.__length__?n[0]:n}},3211:function(e,t,r){"use strict";var n=this&&this.__createBinding||(Object.create?function(e,t,r,n){void 0===n&&(n=r);var i=Object.getOwnPropertyDescriptor(t,r);i&&!("get"in i?!t.__esModule:i.writable||i.configurable)||(i={enumerable:!0,get:function(){return t[r]}}),Object.defineProperty(e,n,i)}:function(e,t,r,n){void 0===n&&(n=r),e[n]=t[r]}),i=this&&this.__exportStar||function(e,t){for(var r in e)"default"===r||Object.prototype.hasOwnProperty.call(t,r)||n(t,e,r)};Object.defineProperty(t,"__esModule",{value:!0});const o=r(6658);i(r(5537),t),i(r(6658),t),i(r(7388),t),i(r(3951),t),t.default=o.Contract},7388:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.LogsSubscription=void 0;const n=r(6527),i=r(6637);class o extends n.Web3Subscription{constructor(e,t){super(e,t),this.address=e.address,this.topics=e.topics,this.abi=e.abi,this.jsonInterface=e.jsonInterface}_buildSubscriptionParams(){return["logs",{address:this.address,topics:this.topics}]}formatSubscriptionResult(e){return(0,i.decodeEventABI)(this.abi,e,this.jsonInterface,super.returnFormat)}}t.LogsSubscription=o},3951:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0})},3948:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.getCreateAccessListParams=t.isWeb3ContractContext=t.isContractInitOptions=t.getEstimateGasParams=t.getEthTxCallParams=t.getSendTxParams=void 0;const n=r(5071),i=r(9634),o=r(5537),s=(e,t,r,n)=>{var s,a;const c={};return(0,i.isNullish)(e.data)&&"both"!==n||(c.data=(0,o.encodeMethodABI)(t,r,null!==(s=e.data)&&void 0!==s?s:e.input)),(0,i.isNullish)(e.input)&&"both"!==n||(c.input=(0,o.encodeMethodABI)(t,r,null!==(a=e.input)&&void 0!==a?a:e.data)),(0,i.isNullish)(c.input)&&(0,i.isNullish)(c.data)&&(c[n]=(0,o.encodeMethodABI)(t,r)),{data:c.data,input:c.input}};t.getSendTxParams=({abi:e,params:t,options:r,contractOptions:o})=>{var a,c,u;if(!(null!==(u=null!==(c=null!==(a=null==r?void 0:r.input)&&void 0!==a?a:null==r?void 0:r.data)&&void 0!==c?c:o.input)&&void 0!==u?u:o.data)&&!(null==r?void 0:r.to)&&!o.address)throw new n.Web3ContractError("Contract address not specified");if(!(null==r?void 0:r.from)&&!o.from)throw new n.Web3ContractError('Contract "from" address not specified');let d=(0,i.mergeDeep)({to:o.address,gas:o.gas,gasPrice:o.gasPrice,from:o.from,input:o.input,maxPriorityFeePerGas:o.maxPriorityFeePerGas,maxFeePerGas:o.maxFeePerGas,data:o.data},r);const l=s(d,e,t,null==r?void 0:r.dataInputFill);return d=Object.assign(Object.assign({},d),{data:l.data,input:l.input}),d},t.getEthTxCallParams=({abi:e,params:t,options:r,contractOptions:o})=>{if(!(null==r?void 0:r.to)&&!o.address)throw new n.Web3ContractError("Contract address not specified");let a=(0,i.mergeDeep)({to:o.address,gas:o.gas,gasPrice:o.gasPrice,from:o.from,input:o.input,maxPriorityFeePerGas:o.maxPriorityFeePerGas,maxFeePerGas:o.maxFeePerGas,data:o.data},r);const c=s(a,e,t,null==r?void 0:r.dataInputFill);return a=Object.assign(Object.assign({},a),{data:c.data,input:c.input}),a},t.getEstimateGasParams=({abi:e,params:t,options:r,contractOptions:n})=>{let o=(0,i.mergeDeep)({to:n.address,gas:n.gas,gasPrice:n.gasPrice,from:n.from,input:n.input,data:n.data},r);const a=s(o,e,t,null==r?void 0:r.dataInputFill);return o=Object.assign(Object.assign({},o),{data:a.data,input:a.input}),o},t.isContractInitOptions=e=>"object"==typeof e&&!(0,i.isNullish)(e)&&["input","data","from","gas","gasPrice","gasLimit","address","jsonInterface","syncWithContext","dataInputFill"].some((t=>t in e)),t.isWeb3ContractContext=e=>"object"==typeof e&&!(0,i.isNullish)(e)&&!(0,t.isContractInitOptions)(e),t.getCreateAccessListParams=({abi:e,params:t,options:r,contractOptions:o})=>{if(!(null==r?void 0:r.to)&&!o.address)throw new n.Web3ContractError("Contract address not specified");if(!(null==r?void 0:r.from)&&!o.from)throw new n.Web3ContractError('Contract "from" address not specified');let a=(0,i.mergeDeep)({to:o.address,gas:o.gas,gasPrice:o.gasPrice,from:o.from,input:o.input,maxPriorityFeePerGas:o.maxPriorityFeePerGas,maxFeePerGas:o.maxFeePerGas,data:o.data},r);const c=s(a,e,t,null==r?void 0:r.dataInputFill);return a=Object.assign(Object.assign({},a),{data:c.data,input:c.input}),a}},6919:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.ENSRegistryAbi=void 0,t.ENSRegistryAbi=[{anonymous:!1,inputs:[{indexed:!0,internalType:"bytes32",name:"node",type:"bytes32"},{indexed:!0,internalType:"bytes32",name:"label",type:"bytes32"},{indexed:!1,internalType:"address",name:"owner",type:"address"}],name:"NewOwner",type:"event"},{anonymous:!1,inputs:[{indexed:!0,internalType:"bytes32",name:"node",type:"bytes32"},{indexed:!1,internalType:"address",name:"resolver",type:"address"}],name:"NewResolver",type:"event"},{anonymous:!1,inputs:[{indexed:!0,internalType:"bytes32",name:"node",type:"bytes32"},{indexed:!1,internalType:"address",name:"owner",type:"address"}],name:"Transfer",type:"event"},{inputs:[{internalType:"address",name:"owner",type:"address"},{internalType:"address",name:"operator",type:"address"}],name:"isApprovedForAll",outputs:[{internalType:"bool",name:"",type:"bool"}],stateMutability:"view",type:"function"},{inputs:[{internalType:"bytes32",name:"node",type:"bytes32"}],name:"owner",outputs:[{internalType:"address",name:"",type:"address"}],stateMutability:"view",type:"function"},{inputs:[{internalType:"bytes32",name:"node",type:"bytes32"}],name:"recordExists",outputs:[{internalType:"bool",name:"",type:"bool"}],stateMutability:"view",type:"function"},{inputs:[{internalType:"bytes32",name:"node",type:"bytes32"}],name:"resolver",outputs:[{internalType:"address",name:"",type:"address"}],stateMutability:"view",type:"function"},{inputs:[{internalType:"bytes32",name:"node",type:"bytes32"}],name:"ttl",outputs:[{internalType:"uint64",name:"",type:"uint64"}],stateMutability:"view",type:"function"}]},172:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.PublicResolverAbi=void 0,t.PublicResolverAbi=[{anonymous:!1,inputs:[{indexed:!0,internalType:"bytes32",name:"node",type:"bytes32"},{indexed:!1,internalType:"address",name:"a",type:"address"}],name:"AddrChanged",type:"event"},{anonymous:!1,inputs:[{indexed:!0,internalType:"bytes32",name:"node",type:"bytes32"},{indexed:!1,internalType:"uint256",name:"coinType",type:"uint256"},{indexed:!1,internalType:"bytes",name:"newAddress",type:"bytes"}],name:"AddressChanged",type:"event"},{anonymous:!1,inputs:[{indexed:!0,internalType:"address",name:"owner",type:"address"},{indexed:!0,internalType:"address",name:"operator",type:"address"},{indexed:!1,internalType:"bool",name:"approved",type:"bool"}],name:"ApprovalForAll",type:"event"},{anonymous:!1,inputs:[{indexed:!0,internalType:"bytes32",name:"node",type:"bytes32"},{indexed:!1,internalType:"bytes",name:"hash",type:"bytes"}],name:"ContenthashChanged",type:"event"},{anonymous:!1,inputs:[{indexed:!0,internalType:"bytes32",name:"node",type:"bytes32"},{indexed:!1,internalType:"bytes",name:"name",type:"bytes"},{indexed:!1,internalType:"uint16",name:"resource",type:"uint16"},{indexed:!1,internalType:"bytes",name:"record",type:"bytes"}],name:"DNSRecordChanged",type:"event"},{anonymous:!1,inputs:[{indexed:!0,internalType:"bytes32",name:"node",type:"bytes32"},{indexed:!1,internalType:"bytes",name:"name",type:"bytes"},{indexed:!1,internalType:"uint16",name:"resource",type:"uint16"}],name:"DNSRecordDeleted",type:"event"},{anonymous:!1,inputs:[{indexed:!0,internalType:"bytes32",name:"node",type:"bytes32"}],name:"DNSZoneCleared",type:"event"},{anonymous:!1,inputs:[{indexed:!0,internalType:"bytes32",name:"node",type:"bytes32"},{indexed:!1,internalType:"bytes",name:"lastzonehash",type:"bytes"},{indexed:!1,internalType:"bytes",name:"zonehash",type:"bytes"}],name:"DNSZonehashChanged",type:"event"},{anonymous:!1,inputs:[{indexed:!0,internalType:"bytes32",name:"node",type:"bytes32"},{indexed:!0,internalType:"bytes4",name:"interfaceID",type:"bytes4"},{indexed:!1,internalType:"address",name:"implementer",type:"address"}],name:"InterfaceChanged",type:"event"},{anonymous:!1,inputs:[{indexed:!0,internalType:"bytes32",name:"node",type:"bytes32"},{indexed:!1,internalType:"string",name:"name",type:"string"}],name:"NameChanged",type:"event"},{anonymous:!1,inputs:[{indexed:!0,internalType:"bytes32",name:"node",type:"bytes32"},{indexed:!1,internalType:"bytes32",name:"x",type:"bytes32"},{indexed:!1,internalType:"bytes32",name:"y",type:"bytes32"}],name:"PubkeyChanged",type:"event"},{anonymous:!1,inputs:[{indexed:!0,internalType:"bytes32",name:"node",type:"bytes32"},{indexed:!0,internalType:"string",name:"indexedKey",type:"string"},{indexed:!1,internalType:"string",name:"key",type:"string"}],name:"TextChanged",type:"event"},{inputs:[{internalType:"bytes32",name:"node",type:"bytes32"},{internalType:"uint256",name:"contentTypes",type:"uint256"}],name:"ABI",outputs:[{internalType:"uint256",name:"",type:"uint256"},{internalType:"bytes",name:"",type:"bytes"}],stateMutability:"view",type:"function"},{inputs:[{internalType:"bytes32",name:"node",type:"bytes32"}],name:"addr",outputs:[{internalType:"address payable",name:"",type:"address"}],stateMutability:"view",type:"function"},{inputs:[{internalType:"bytes32",name:"node",type:"bytes32"},{internalType:"uint256",name:"coinType",type:"uint256"}],name:"addr",outputs:[{internalType:"bytes",name:"",type:"bytes"}],stateMutability:"view",type:"function"},{inputs:[{internalType:"bytes32",name:"node",type:"bytes32"}],name:"contenthash",outputs:[{internalType:"bytes",name:"",type:"bytes"}],stateMutability:"view",type:"function"},{inputs:[{internalType:"bytes32",name:"node",type:"bytes32"},{internalType:"bytes32",name:"name",type:"bytes32"},{internalType:"uint16",name:"resource",type:"uint16"}],name:"dnsRecord",outputs:[{internalType:"bytes",name:"",type:"bytes"}],stateMutability:"view",type:"function"},{inputs:[{internalType:"bytes32",name:"node",type:"bytes32"},{internalType:"bytes32",name:"name",type:"bytes32"}],name:"hasDNSRecords",outputs:[{internalType:"bool",name:"",type:"bool"}],stateMutability:"view",type:"function"},{inputs:[{internalType:"bytes32",name:"node",type:"bytes32"},{internalType:"bytes4",name:"interfaceID",type:"bytes4"}],name:"interfaceImplementer",outputs:[{internalType:"address",name:"",type:"address"}],stateMutability:"view",type:"function"},{inputs:[{internalType:"address",name:"account",type:"address"},{internalType:"address",name:"operator",type:"address"}],name:"isApprovedForAll",outputs:[{internalType:"bool",name:"",type:"bool"}],stateMutability:"view",type:"function"},{inputs:[{internalType:"bytes32",name:"node",type:"bytes32"}],name:"name",outputs:[{internalType:"string",name:"",type:"string"}],stateMutability:"view",type:"function"},{inputs:[{internalType:"bytes32",name:"node",type:"bytes32"}],name:"pubkey",outputs:[{internalType:"bytes32",name:"x",type:"bytes32"},{internalType:"bytes32",name:"y",type:"bytes32"}],stateMutability:"view",type:"function"},{inputs:[{internalType:"bytes4",name:"interfaceID",type:"bytes4"}],name:"supportsInterface",outputs:[{internalType:"bool",name:"",type:"bool"}],stateMutability:"view",type:"function"},{inputs:[{internalType:"bytes32",name:"node",type:"bytes32"},{internalType:"string",name:"key",type:"string"}],name:"text",outputs:[{internalType:"string",name:"",type:"string"}],stateMutability:"view",type:"function"},{inputs:[{internalType:"bytes32",name:"node",type:"bytes32"}],name:"zonehash",outputs:[{internalType:"bytes",name:"",type:"bytes"}],stateMutability:"view",type:"function"}]},8677:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.networkIds=t.registryAddresses=t.methodsInInterface=t.interfaceIds=void 0,t.interfaceIds={addr:"0x3b3b57de",name:"0x691f3431",abi:"0x2203ab56",pubkey:"0xc8690233",text:"0x59d1d43c",contenthash:"0xbc1c58d1"},t.methodsInInterface={setAddr:"addr",addr:"addr",setPubkey:"pubkey",pubkey:"pubkey",setContenthash:"contenthash",contenthash:"contenthash"},t.registryAddresses={main:"0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",goerli:"0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e"},t.networkIds={"0x1":"main","0x5":"goerli"}},9142:function(e,t,r){"use strict";var n=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.ENS=void 0;const i=r(6527),o=r(5071),s=r(6637),a=r(9820),c=r(9970),u=r(8677),d=r(67),l=r(8067);class h extends i.Web3Context{constructor(e,t){super(null!=t?t:""),this.registryAddress=null!=e?e:u.registryAddresses.main,this._registry=new d.Registry(this.getContextObject(),e),this._resolver=new l.Resolver(this._registry)}getResolver(e){return n(this,void 0,void 0,(function*(){return this._registry.getResolver(e)}))}recordExists(e){return n(this,void 0,void 0,(function*(){return this._registry.recordExists(e)}))}getTTL(e){return n(this,void 0,void 0,(function*(){return this._registry.getTTL(e)}))}getOwner(e){return n(this,void 0,void 0,(function*(){return this._registry.getOwner(e)}))}getAddress(e,t=60){return n(this,void 0,void 0,(function*(){return this._resolver.getAddress(e,t)}))}getPubkey(e){return n(this,void 0,void 0,(function*(){return this._resolver.getPubkey(e)}))}getContenthash(e){return n(this,void 0,void 0,(function*(){return this._resolver.getContenthash(e)}))}checkNetwork(){return n(this,void 0,void 0,(function*(){const e=Date.now()/1e3;if(!this._lastSyncCheck||e-this._lastSyncCheck>3600){const t=yield(0,s.isSyncing)(this);if("boolean"!=typeof t||t)throw new o.ENSNetworkNotSyncedError;this._lastSyncCheck=e}if(this._detectedAddress)return this._detectedAddress;const t=yield(0,a.getId)(this,Object.assign(Object.assign({},c.DEFAULT_RETURN_FORMAT),{number:c.FMT_NUMBER.HEX})),r=u.registryAddresses[u.networkIds[t]];if(void 0===r)throw new o.ENSUnsupportedNetworkError(t);return this._detectedAddress=r,this._detectedAddress}))}supportsInterface(e,t){return n(this,void 0,void 0,(function*(){return this._resolver.supportsInterface(e,t)}))}get events(){return this._registry.events}}t.ENS=h},1698:function(e,t,r){"use strict";var n=this&&this.__createBinding||(Object.create?function(e,t,r,n){void 0===n&&(n=r);var i=Object.getOwnPropertyDescriptor(t,r);i&&!("get"in i?!t.__esModule:i.writable||i.configurable)||(i={enumerable:!0,get:function(){return t[r]}}),Object.defineProperty(e,n,i)}:function(e,t,r,n){void 0===n&&(n=r),e[n]=t[r]}),i=this&&this.__exportStar||function(e,t){for(var r in e)"default"===r||Object.prototype.hasOwnProperty.call(t,r)||n(t,e,r)};Object.defineProperty(t,"__esModule",{value:!0}),t.registryAddresses=void 0;const o=r(8677);Object.defineProperty(t,"registryAddresses",{enumerable:!0,get:function(){return o.registryAddresses}}),i(r(9142),t)},67:function(e,t,r){"use strict";var n=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.Registry=void 0;const i=r(3211),o=r(6919),s=r(172),a=r(8677),c=r(8196);t.Registry=class{constructor(e,t){this.contract=new i.Contract(o.ENSRegistryAbi,null!=t?t:a.registryAddresses.main,e),this.context=e}getOwner(e){return n(this,void 0,void 0,(function*(){try{return this.contract.methods.owner((0,c.namehash)(e)).call()}catch(e){throw new Error}}))}getTTL(e){return n(this,void 0,void 0,(function*(){try{return this.contract.methods.ttl((0,c.namehash)(e)).call()}catch(e){throw new Error}}))}recordExists(e){return n(this,void 0,void 0,(function*(){try{return this.contract.methods.recordExists((0,c.namehash)(e)).call()}catch(e){throw new Error}}))}getResolver(e){return n(this,void 0,void 0,(function*(){try{return this.contract.methods.resolver((0,c.namehash)(e)).call().then((e=>{if("string"==typeof e)return new i.Contract(s.PublicResolverAbi,e,this.context);throw new Error}))}catch(e){throw new Error}}))}get events(){return this.contract.events}}},8067:function(e,t,r){"use strict";var n=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.Resolver=void 0;const i=r(5071),o=r(9634),s=r(7345),a=r(8677),c=r(8196);t.Resolver=class{constructor(e){this.registry=e}getResolverContractAdapter(e){return n(this,void 0,void 0,(function*(){return this.registry.getResolver(e)}))}checkInterfaceSupport(e,t){var r,s;return n(this,void 0,void 0,(function*(){if((0,o.isNullish)(a.interfaceIds[t]))throw new i.ResolverMethodMissingError(null!==(r=e.options.address)&&void 0!==r?r:"",t);if(!(yield e.methods.supportsInterface(a.interfaceIds[t]).call()))throw new i.ResolverMethodMissingError(null!==(s=e.options.address)&&void 0!==s?s:"",t)}))}supportsInterface(e,t){var r;return n(this,void 0,void 0,(function*(){const n=yield this.getResolverContractAdapter(e);let i=t;if(!(0,s.isHexStrict)(i)){if(i=null!==(r=(0,o.sha3)(t))&&void 0!==r?r:"",""===t)throw new Error("Invalid interface Id");i=i.slice(0,10)}return n.methods.supportsInterface(i).call()}))}getAddress(e,t=60){return n(this,void 0,void 0,(function*(){const r=yield this.getResolverContractAdapter(e);return yield this.checkInterfaceSupport(r,a.methodsInInterface.addr),r.methods.addr((0,c.namehash)(e),t).call()}))}getPubkey(e){return n(this,void 0,void 0,(function*(){const t=yield this.getResolverContractAdapter(e);return yield this.checkInterfaceSupport(t,a.methodsInInterface.pubkey),t.methods.pubkey((0,c.namehash)(e)).call()}))}getContenthash(e){return n(this,void 0,void 0,(function*(){const t=yield this.getResolverContractAdapter(e);return yield this.checkInterfaceSupport(t,a.methodsInInterface.contenthash),t.methods.contenthash((0,c.namehash)(e)).call()}))}}},8196:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.namehash=t.normalize=void 0;const n=r(9634),i=r(6608);t.normalize=e=>(0,i.ens_normalize)(e),t.namehash=e=>{let r="";for(let e=0;e<32;e+=1)r+="00";if(e){const i=(0,t.normalize)(e).split(".");for(let e=i.length-1;e>=0;e-=1){const t=(0,n.sha3Raw)(i[e]).slice(2);r=(0,n.sha3Raw)(`0x${r}${t}`).slice(2)}}return`0x${r}`}},5609:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.Iban=void 0;const n=r(9634),i=r(7345),o=r(5071);class s{constructor(e){if(this.toAddress=()=>{if(this.isDirect()){const e=this._iban.slice(4),t=s._parseInt(e,36),r=(0,n.leftPad)(t,40);return(0,n.toChecksumAddress)(r)}throw new Error("Iban is indirect and cannot be converted. Must be length of 34 or 35")},!s.isIndirect(e)&&!s.isDirect(e))throw new Error("Invalid IBAN was provided");this._iban=e}static isDirect(e){return 34===e.length||35===e.length}isDirect(){return s.isDirect(this._iban)}static isIndirect(e){return 20===e.length}isIndirect(){return s.isIndirect(this._iban)}static isValid(e){return/^XE[0-9]{2}(ETH[0-9A-Z]{13}|[0-9A-Z]{30,31})$/.test(e)&&1===s._mod9710(s._iso13616Prepare(e))}isValid(){return s.isValid(this._iban)}static fromBban(e){const t=`0${(98-this._mod9710(this._iso13616Prepare(`XE00${e}`))).toString()}`.slice(-2);return new s(`XE${t}${e}`)}static createIndirect(e){return s.fromBban(`ETH${e.institution}${e.identifier}`)}static fromAddress(e){if(!(0,i.isAddress)(e))throw new o.InvalidAddressError(e);const t=BigInt((0,n.hexToNumber)(e)).toString(36),r=(0,n.leftPad)(t,15);return s.fromBban(r.toUpperCase())}static toIban(e){return s.fromAddress(e).toString()}client(){return this.isIndirect()?this._iban.slice(11):""}checksum(){return this._iban.slice(2,4)}institution(){return this.isIndirect()?this._iban.slice(7,11):""}toString(){return this._iban}}t.Iban=s,s._iso13616Prepare=e=>{const t="A".charCodeAt(0),r="Z".charCodeAt(0),n=e.toUpperCase();return`${n.slice(4)}${n.slice(0,4)}`.split("").map((e=>{const n=e.charCodeAt(0);return n>=t&&n<=r?n-t+10:e})).join("")},s._parseInt=(e,t)=>[...e].reduce(((e,r)=>BigInt(parseInt(r,t))+BigInt(t)*e),BigInt(0)),s._mod9710=e=>{let t,r=e;for(;r.length>2;)t=r.slice(0,9),r=`${(parseInt(t,10)%97).toString()}${r.slice(t.length)}`;return parseInt(r,10)%97},s.toAddress=e=>new s(e).toAddress()},9910:function(e,t,r){"use strict";var n=this&&this.__createBinding||(Object.create?function(e,t,r,n){void 0===n&&(n=r);var i=Object.getOwnPropertyDescriptor(t,r);i&&!("get"in i?!t.__esModule:i.writable||i.configurable)||(i={enumerable:!0,get:function(){return t[r]}}),Object.defineProperty(e,n,i)}:function(e,t,r,n){void 0===n&&(n=r),e[n]=t[r]}),i=this&&this.__exportStar||function(e,t){for(var r in e)"default"===r||Object.prototype.hasOwnProperty.call(t,r)||n(t,e,r)};Object.defineProperty(t,"__esModule",{value:!0});const o=r(5609);i(r(5609),t),i(r(1965),t),t.default=o.Iban},1965:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0})},9757:function(e,t,r){"use strict";var n=this&&this.__createBinding||(Object.create?function(e,t,r,n){void 0===n&&(n=r);var i=Object.getOwnPropertyDescriptor(t,r);i&&!("get"in i?!t.__esModule:i.writable||i.configurable)||(i={enumerable:!0,get:function(){return t[r]}}),Object.defineProperty(e,n,i)}:function(e,t,r,n){void 0===n&&(n=r),e[n]=t[r]}),i=this&&this.__exportStar||function(e,t){for(var r in e)"default"===r||Object.prototype.hasOwnProperty.call(t,r)||n(t,e,r)};Object.defineProperty(t,"__esModule",{value:!0});const o=r(9638);i(r(9638),t),t.default=o.Personal},9638:function(e,t,r){"use strict";var n=this&&this.__createBinding||(Object.create?function(e,t,r,n){void 0===n&&(n=r);var i=Object.getOwnPropertyDescriptor(t,r);i&&!("get"in i?!t.__esModule:i.writable||i.configurable)||(i={enumerable:!0,get:function(){return t[r]}}),Object.defineProperty(e,n,i)}:function(e,t,r,n){void 0===n&&(n=r),e[n]=t[r]}),i=this&&this.__setModuleDefault||(Object.create?function(e,t){Object.defineProperty(e,"default",{enumerable:!0,value:t})}:function(e,t){e.default=t}),o=this&&this.__importStar||function(e){if(e&&e.__esModule)return e;var t={};if(null!=e)for(var r in e)"default"!==r&&Object.prototype.hasOwnProperty.call(e,r)&&n(t,e,r);return i(t,e),t},s=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.Personal=void 0;const a=r(6527),c=o(r(706));class u extends a.Web3Context{getAccounts(){return s(this,void 0,void 0,(function*(){return c.getAccounts(this.requestManager)}))}newAccount(e){return s(this,void 0,void 0,(function*(){return c.newAccount(this.requestManager,e)}))}unlockAccount(e,t,r){return s(this,void 0,void 0,(function*(){return c.unlockAccount(this.requestManager,e,t,r)}))}lockAccount(e){return s(this,void 0,void 0,(function*(){return c.lockAccount(this.requestManager,e)}))}importRawKey(e,t){return s(this,void 0,void 0,(function*(){return c.importRawKey(this.requestManager,e,t)}))}sendTransaction(e,t){return s(this,void 0,void 0,(function*(){return c.sendTransaction(this.requestManager,e,t)}))}signTransaction(e,t){return s(this,void 0,void 0,(function*(){return c.signTransaction(this.requestManager,e,t)}))}sign(e,t,r){return s(this,void 0,void 0,(function*(){return c.sign(this.requestManager,e,t,r)}))}ecRecover(e,t){return s(this,void 0,void 0,(function*(){return c.ecRecover(this.requestManager,e,t)}))}}t.Personal=u},706:function(e,t,r){"use strict";var n=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.ecRecover=t.sign=t.signTransaction=t.sendTransaction=t.importRawKey=t.lockAccount=t.unlockAccount=t.newAccount=t.getAccounts=void 0;const i=r(9634),o=r(6637),s=r(9970),a=r(7345),c=r(1181);t.getAccounts=e=>n(void 0,void 0,void 0,(function*(){return(yield c.personalRpcMethods.getAccounts(e)).map(i.toChecksumAddress)})),t.newAccount=(e,t)=>n(void 0,void 0,void 0,(function*(){a.validator.validate(["string"],[t]);const r=yield c.personalRpcMethods.newAccount(e,t);return(0,i.toChecksumAddress)(r)})),t.unlockAccount=(e,t,r,i)=>n(void 0,void 0,void 0,(function*(){return a.validator.validate(["address","string","uint"],[t,r,i]),c.personalRpcMethods.unlockAccount(e,t,r,i)})),t.lockAccount=(e,t)=>n(void 0,void 0,void 0,(function*(){return a.validator.validate(["address"],[t]),c.personalRpcMethods.lockAccount(e,t)})),t.importRawKey=(e,t,r)=>n(void 0,void 0,void 0,(function*(){return a.validator.validate(["string","string"],[t,r]),c.personalRpcMethods.importRawKey(e,t,r)})),t.sendTransaction=(e,t,r)=>n(void 0,void 0,void 0,(function*(){const n=(0,o.formatTransaction)(t,s.ETH_DATA_FORMAT);return c.personalRpcMethods.sendTransaction(e,n,r)})),t.signTransaction=(e,t,r)=>n(void 0,void 0,void 0,(function*(){const n=(0,o.formatTransaction)(t,s.ETH_DATA_FORMAT);return c.personalRpcMethods.signTransaction(e,n,r)})),t.sign=(e,t,r,o)=>n(void 0,void 0,void 0,(function*(){a.validator.validate(["string","address","string"],[t,r,o]);const n=(0,a.isHexStrict)(t)?t:(0,i.utf8ToHex)(t);return c.personalRpcMethods.sign(e,n,r,o)})),t.ecRecover=(e,t,r)=>n(void 0,void 0,void 0,(function*(){a.validator.validate(["string","string"],[t,r]);const n=(0,a.isHexStrict)(t)?t:(0,i.utf8ToHex)(t);return c.personalRpcMethods.ecRecover(e,n,r)}))},9326:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.NUMBER_DATA_FORMAT=t.ALL_EVENTS_ABI=t.ALL_EVENTS=void 0;const n=r(9970);t.ALL_EVENTS="ALLEVENTS",t.ALL_EVENTS_ABI={name:t.ALL_EVENTS,signature:"",type:"event",inputs:[]},t.NUMBER_DATA_FORMAT={bytes:n.FMT_BYTES.HEX,number:n.FMT_NUMBER.NUMBER}},6637:function(e,t,r){"use strict";var n=this&&this.__createBinding||(Object.create?function(e,t,r,n){void 0===n&&(n=r);var i=Object.getOwnPropertyDescriptor(t,r);i&&!("get"in i?!t.__esModule:i.writable||i.configurable)||(i={enumerable:!0,get:function(){return t[r]}}),Object.defineProperty(e,n,i)}:function(e,t,r,n){void 0===n&&(n=r),e[n]=t[r]}),i=this&&this.__exportStar||function(e,t){for(var r in e)"default"===r||Object.prototype.hasOwnProperty.call(t,r)||n(t,e,r)};Object.defineProperty(t,"__esModule",{value:!0}),t.transactionBuilder=t.detectTransactionType=void 0,r(6985);const o=r(1435);i(r(1435),t),i(r(7543),t),i(r(1922),t),i(r(9326),t),i(r(4832),t),i(r(8650),t),i(r(3222),t),i(r(5140),t),i(r(1258),t),i(r(7460),t);var s=r(7350);Object.defineProperty(t,"detectTransactionType",{enumerable:!0,get:function(){return s.detectTransactionType}});var a=r(223);Object.defineProperty(t,"transactionBuilder",{enumerable:!0,get:function(){return a.transactionBuilder}}),t.default=o.Web3Eth},3222:function(e,t,r){"use strict";var n=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))},i=this&&this.__rest||function(e,t){var r={};for(var n in e)Object.prototype.hasOwnProperty.call(e,n)&&t.indexOf(n)<0&&(r[n]=e[n]);if(null!=e&&"function"==typeof Object.getOwnPropertySymbols){var i=0;for(n=Object.getOwnPropertySymbols(e);i<n.length;i++)t.indexOf(n[i])<0&&Object.prototype.propertyIsEnumerable.call(e,n[i])&&(r[n[i]]=e[n[i]])}return r};Object.defineProperty(t,"__esModule",{value:!0}),t.signTypedData=t.createAccessList=t.getFeeHistory=t.getProof=t.getChainId=t.getLogs=t.estimateGas=t.call=t.signTransaction=t.sign=t.sendSignedTransaction=t.sendTransaction=t.getTransactionCount=t.getTransactionReceipt=t.getTransactionFromBlock=t.getPendingTransactions=t.getTransaction=t.getUncle=t.getBlockUncleCount=t.getBlockTransactionCount=t.getBlock=t.getCode=t.getStorageAt=t.getBalance=t.getBlockNumber=t.getGasPrice=t.getHashRate=t.isMining=t.getCoinbase=t.isSyncing=t.getProtocolVersion=void 0;const o=r(9970),s=r(6527),a=r(9634),c=r(9247),u=r(7345),d=r(5071),l=r(1181),h=r(5900),f=r(1922),p=r(223),m=r(5140),g=r(8425),y=r(4745),v=r(9326),b=r(7322);t.getProtocolVersion=e=>n(void 0,void 0,void 0,(function*(){return l.ethRpcMethods.getProtocolVersion(e.requestManager)})),t.isSyncing=e=>n(void 0,void 0,void 0,(function*(){return l.ethRpcMethods.getSyncing(e.requestManager)})),t.getCoinbase=e=>n(void 0,void 0,void 0,(function*(){return l.ethRpcMethods.getCoinbase(e.requestManager)})),t.isMining=e=>n(void 0,void 0,void 0,(function*(){return l.ethRpcMethods.getMining(e.requestManager)})),t.getHashRate=function(e,t){return n(this,void 0,void 0,(function*(){const r=yield l.ethRpcMethods.getHashRate(e.requestManager);return(0,a.format)({format:"uint"},r,t)}))},t.getGasPrice=function(e,t){return n(this,void 0,void 0,(function*(){const r=yield l.ethRpcMethods.getGasPrice(e.requestManager);return(0,a.format)({format:"uint"},r,t)}))},t.getBlockNumber=function(e,t){return n(this,void 0,void 0,(function*(){const r=yield l.ethRpcMethods.getBlockNumber(e.requestManager);return(0,a.format)({format:"uint"},r,t)}))},t.getBalance=function(e,t,r=e.defaultBlock,i){return n(this,void 0,void 0,(function*(){const n=(0,u.isBlockTag)(r)?r:(0,a.format)({format:"uint"},r,o.ETH_DATA_FORMAT),s=yield l.ethRpcMethods.getBalance(e.requestManager,t,n);return(0,a.format)({format:"uint"},s,i)}))},t.getStorageAt=function(e,t,r,i=e.defaultBlock,s){return n(this,void 0,void 0,(function*(){const n=(0,a.format)({format:"uint"},r,o.ETH_DATA_FORMAT),c=(0,u.isBlockTag)(i)?i:(0,a.format)({format:"uint"},i,o.ETH_DATA_FORMAT),d=yield l.ethRpcMethods.getStorageAt(e.requestManager,t,n,c);return(0,a.format)({format:"bytes"},d,s)}))},t.getCode=function(e,t,r=e.defaultBlock,i){return n(this,void 0,void 0,(function*(){const n=(0,u.isBlockTag)(r)?r:(0,a.format)({format:"uint"},r,o.ETH_DATA_FORMAT),s=yield l.ethRpcMethods.getCode(e.requestManager,t,n);return(0,a.format)({format:"bytes"},s,i)}))},t.getBlock=function(e,t=e.defaultBlock,r=!1,i){return n(this,void 0,void 0,(function*(){let n;if((0,u.isBytes)(t)){const i=(0,a.format)({format:"bytes32"},t,o.ETH_DATA_FORMAT);n=yield l.ethRpcMethods.getBlockByHash(e.requestManager,i,r)}else{const i=(0,u.isBlockTag)(t)?t:(0,a.format)({format:"uint"},t,o.ETH_DATA_FORMAT);n=yield l.ethRpcMethods.getBlockByNumber(e.requestManager,i,r)}return(0,a.format)(f.blockSchema,n,i)}))},t.getBlockTransactionCount=function(e,t=e.defaultBlock,r){return n(this,void 0,void 0,(function*(){let n;if((0,u.isBytes)(t)){const r=(0,a.format)({format:"bytes32"},t,o.ETH_DATA_FORMAT);n=yield l.ethRpcMethods.getBlockTransactionCountByHash(e.requestManager,r)}else{const r=(0,u.isBlockTag)(t)?t:(0,a.format)({format:"uint"},t,o.ETH_DATA_FORMAT);n=yield l.ethRpcMethods.getBlockTransactionCountByNumber(e.requestManager,r)}return(0,a.format)({format:"uint"},n,r)}))},t.getBlockUncleCount=function(e,t=e.defaultBlock,r){return n(this,void 0,void 0,(function*(){let n;if((0,u.isBytes)(t)){const r=(0,a.format)({format:"bytes32"},t,o.ETH_DATA_FORMAT);n=yield l.ethRpcMethods.getUncleCountByBlockHash(e.requestManager,r)}else{const r=(0,u.isBlockTag)(t)?t:(0,a.format)({format:"uint"},t,o.ETH_DATA_FORMAT);n=yield l.ethRpcMethods.getUncleCountByBlockNumber(e.requestManager,r)}return(0,a.format)({format:"uint"},n,r)}))},t.getUncle=function(e,t=e.defaultBlock,r,i){return n(this,void 0,void 0,(function*(){const n=(0,a.format)({format:"uint"},r,o.ETH_DATA_FORMAT);let s;if((0,u.isBytes)(t)){const r=(0,a.format)({format:"bytes32"},t,o.ETH_DATA_FORMAT);s=yield l.ethRpcMethods.getUncleByBlockHashAndIndex(e.requestManager,r,n)}else{const r=(0,u.isBlockTag)(t)?t:(0,a.format)({format:"uint"},t,o.ETH_DATA_FORMAT);s=yield l.ethRpcMethods.getUncleByBlockNumberAndIndex(e.requestManager,r,n)}return(0,a.format)(f.blockSchema,s,i)}))},t.getTransaction=function(e,t,r){return n(this,void 0,void 0,(function*(){const n=(0,a.format)({format:"bytes32"},t,o.DEFAULT_RETURN_FORMAT),i=yield l.ethRpcMethods.getTransactionByHash(e.requestManager,n);return(0,u.isNullish)(i)?i:(0,m.formatTransaction)(i,r,{fillInputAndData:!0})}))},t.getPendingTransactions=function(e,t){return n(this,void 0,void 0,(function*(){return(yield l.ethRpcMethods.getPendingTransactions(e.requestManager)).map((e=>(0,m.formatTransaction)(e,t,{fillInputAndData:!0})))}))},t.getTransactionFromBlock=function(e,t=e.defaultBlock,r,i){return n(this,void 0,void 0,(function*(){const n=(0,a.format)({format:"uint"},r,o.ETH_DATA_FORMAT);let s;if((0,u.isBytes)(t)){const r=(0,a.format)({format:"bytes32"},t,o.ETH_DATA_FORMAT);s=yield l.ethRpcMethods.getTransactionByBlockHashAndIndex(e.requestManager,r,n)}else{const r=(0,u.isBlockTag)(t)?t:(0,a.format)({format:"uint"},t,o.ETH_DATA_FORMAT);s=yield l.ethRpcMethods.getTransactionByBlockNumberAndIndex(e.requestManager,r,n)}return(0,u.isNullish)(s)?s:(0,m.formatTransaction)(s,i,{fillInputAndData:!0})}))},t.getTransactionReceipt=function(e,t,r){return n(this,void 0,void 0,(function*(){const n=(0,a.format)({format:"bytes32"},t,o.DEFAULT_RETURN_FORMAT),i=yield l.ethRpcMethods.getTransactionReceipt(e.requestManager,n);return(0,u.isNullish)(i)?i:(0,a.format)(f.transactionReceiptSchema,i,r)}))},t.getTransactionCount=function(e,t,r=e.defaultBlock,i){return n(this,void 0,void 0,(function*(){const n=(0,u.isBlockTag)(r)?r:(0,a.format)({format:"uint"},r,o.ETH_DATA_FORMAT),s=yield l.ethRpcMethods.getTransactionCount(e.requestManager,t,n);return(0,a.format)({format:"uint"},s,i)}))},t.sendTransaction=function(e,t,r,i={checkRevertBeforeSending:!0}){const c=new s.Web3PromiEvent(((s,d)=>{setImmediate((()=>{(()=>{n(this,void 0,void 0,(function*(){const n=new b.SendTxHelper({web3Context:e,promiEvent:c,options:i,returnFormat:r});let l=(0,m.formatTransaction)(Object.assign(Object.assign({},t),{from:(0,p.getTransactionFromOrToAttr)("from",e,t),to:(0,p.getTransactionFromOrToAttr)("to",e,t)}),o.ETH_DATA_FORMAT);try{let i;l=yield n.populateGasPrice({transaction:t,transactionFormatted:l}),yield n.checkRevertBeforeSending(l),n.emitSending(l),e.wallet&&!(0,u.isNullish)(l.from)&&(i=e.wallet.get(l.from));const o=yield n.signAndSend({wallet:i,tx:l}),c=(0,a.format)({format:"bytes32"},o,r);n.emitSent(l),n.emitTransactionHash(c);const d=yield(0,y.waitForTransactionReceipt)(e,o,r),h=n.getReceiptWithEvents((0,a.format)(f.transactionReceiptSchema,d,r));n.emitReceipt(h),s(yield n.handleResolve({receipt:h,tx:l})),n.emitConfirmation({receipt:h,transactionHash:o})}catch(e){d(yield n.handleError({error:e,tx:l}))}}))})()}))}));return c},t.sendSignedTransaction=function(e,t,r,u={checkRevertBeforeSending:!0}){const d=new s.Web3PromiEvent(((s,h)=>{setImmediate((()=>{(()=>{n(this,void 0,void 0,(function*(){const p=new b.SendTxHelper({web3Context:e,promiEvent:d,options:u,returnFormat:r}),m=(0,a.format)({format:"bytes"},t,o.ETH_DATA_FORMAT),v=c.TransactionFactory.fromSerializedData((0,a.bytesToUint8Array)((0,a.hexToBytes)(m))),E=Object.assign(Object.assign({},v.toJSON()),{from:v.getSenderAddress().toString()});try{const{v:t,r:o,s:c}=E,u=i(E,["v","r","s"]);yield p.checkRevertBeforeSending(u),p.emitSending(m);const d=yield(0,g.trySendTransaction)(e,(()=>n(this,void 0,void 0,(function*(){return l.ethRpcMethods.sendRawTransaction(e.requestManager,m)}))));p.emitSent(m);const h=(0,a.format)({format:"bytes32"},d,r);p.emitTransactionHash(h);const v=yield(0,y.waitForTransactionReceipt)(e,d,r),b=p.getReceiptWithEvents((0,a.format)(f.transactionReceiptSchema,v,r));p.emitReceipt(b),s(yield p.handleResolve({receipt:b,tx:E})),p.emitConfirmation({receipt:b,transactionHash:d})}catch(e){h(yield p.handleError({error:e,tx:E}))}}))})()}))}));return d},t.sign=function(e,t,r,i){var s;return n(this,void 0,void 0,(function*(){const n=(0,a.format)({format:"bytes"},t,o.DEFAULT_RETURN_FORMAT);if(null===(s=e.wallet)||void 0===s?void 0:s.get(r)){const t=e.wallet.get(r).sign(n);return(0,a.format)(f.SignatureObjectSchema,t,i)}if("number"==typeof r)throw new d.SignatureError(t,'RPC method "eth_sign" does not support index signatures');const c=yield l.ethRpcMethods.sign(e.requestManager,r,n);return(0,a.format)({format:"bytes"},c,i)}))},t.signTransaction=function(e,t,r){return n(this,void 0,void 0,(function*(){const n=yield l.ethRpcMethods.signTransaction(e.requestManager,(0,m.formatTransaction)(t,o.ETH_DATA_FORMAT));return(0,u.isString)(n)?(0,h.decodeSignedTransaction)(n,r,{fillInputAndData:!0}):{raw:(0,a.format)({format:"bytes"},n.raw,r),tx:(0,m.formatTransaction)(n.tx,r,{fillInputAndData:!0})}}))},t.call=function(e,t,r=e.defaultBlock,i){return n(this,void 0,void 0,(function*(){const n=(0,u.isBlockTag)(r)?r:(0,a.format)({format:"uint"},r,o.ETH_DATA_FORMAT),s=yield l.ethRpcMethods.call(e.requestManager,(0,m.formatTransaction)(t,o.ETH_DATA_FORMAT),n);return(0,a.format)({format:"bytes"},s,i)}))},t.estimateGas=function(e,t,r=e.defaultBlock,i){return n(this,void 0,void 0,(function*(){const n=(0,m.formatTransaction)(t,o.ETH_DATA_FORMAT),s=(0,u.isBlockTag)(r)?r:(0,a.format)({format:"uint"},r,o.ETH_DATA_FORMAT),c=yield l.ethRpcMethods.estimateGas(e.requestManager,n,s);return(0,a.format)({format:"uint"},c,i)}))},t.getLogs=function(e,t,r){return n(this,void 0,void 0,(function*(){let{toBlock:n,fromBlock:i}=t;(0,u.isNullish)(n)||"number"!=typeof n&&"bigint"!=typeof n||(n=(0,a.numberToHex)(n)),(0,u.isNullish)(i)||"number"!=typeof i&&"bigint"!=typeof i||(i=(0,a.numberToHex)(i));const o=Object.assign(Object.assign({},t),{fromBlock:i,toBlock:n});return(yield l.ethRpcMethods.getLogs(e.requestManager,o)).map((e=>"string"==typeof e?e:(0,a.format)(f.logSchema,e,r)))}))},t.getChainId=function(e,t){return n(this,void 0,void 0,(function*(){const r=yield l.ethRpcMethods.getChainId(e.requestManager);return(0,a.format)({format:"uint"},r,t)}))},t.getProof=function(e,t,r,i=e.defaultBlock,s){return n(this,void 0,void 0,(function*(){const n=r.map((e=>(0,a.format)({format:"bytes"},e,o.ETH_DATA_FORMAT))),c=(0,u.isBlockTag)(i)?i:(0,a.format)({format:"uint"},i,o.ETH_DATA_FORMAT),d=yield l.ethRpcMethods.getProof(e.requestManager,t,n,c);return(0,a.format)(f.accountSchema,d,s)}))},t.getFeeHistory=function(e,t,r=e.defaultBlock,i,s){return n(this,void 0,void 0,(function*(){const n=(0,a.format)({format:"uint"},t,o.ETH_DATA_FORMAT),c=(0,u.isBlockTag)(r)?r:(0,a.format)({format:"uint"},r,o.ETH_DATA_FORMAT),d=(0,a.format)({type:"array",items:{format:"uint"}},i,v.NUMBER_DATA_FORMAT),h=yield l.ethRpcMethods.getFeeHistory(e.requestManager,n,c,d);return(0,a.format)(f.feeHistorySchema,h,s)}))},t.createAccessList=function(e,t,r=e.defaultBlock,i){return n(this,void 0,void 0,(function*(){const n=(0,u.isBlockTag)(r)?r:(0,a.format)({format:"uint"},r,o.ETH_DATA_FORMAT),s=yield l.ethRpcMethods.createAccessList(e.requestManager,(0,m.formatTransaction)(t,o.ETH_DATA_FORMAT),n);return(0,a.format)(f.accessListResultSchema,s,i)}))},t.signTypedData=function(e,t,r,i,o){return n(this,void 0,void 0,(function*(){const n=yield l.ethRpcMethods.signTypedData(e.requestManager,t,r,i);return(0,a.format)({format:"bytes"},n,o)}))}},1922:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.accountSchema=t.storageProofSchema=t.feeHistorySchema=t.SignatureObjectSchema=t.transactionReceiptSchema=t.syncSchema=t.logSchema=t.blockHeaderSchema=t.withdrawalsSchema=t.blockSchema=t.transactionInfoSchema=t.transactionSchema=t.customChainSchema=t.hardforkSchema=t.chainSchema=t.accessListResultSchema=t.accessListSchema=t.accessListItemSchema=void 0,t.accessListItemSchema={type:"object",properties:{address:{format:"address"},storageKeys:{type:"array",items:{format:"bytes32"}}}},t.accessListSchema={type:"array",items:Object.assign({},t.accessListItemSchema)},t.accessListResultSchema={type:"object",properties:{accessList:Object.assign({},t.accessListSchema),gasUsed:{type:"string"}}},t.chainSchema={type:"string",enum:["goerli","kovan","mainnet","rinkeby","ropsten","sepolia"]},t.hardforkSchema={type:"string",enum:["arrowGlacier","berlin","byzantium","chainstart","constantinople","dao","homestead","istanbul","london","merge","muirGlacier","petersburg","shanghai","spuriousDragon","tangerineWhistle"]},t.customChainSchema={type:"object",properties:{name:{format:"string"},networkId:{format:"uint"},chainId:{format:"uint"}}},t.transactionSchema={type:"object",properties:{from:{format:"address"},to:{oneOf:[{format:"address"},{type:"null"}]},value:{format:"uint"},gas:{format:"uint"},gasPrice:{format:"uint"},effectiveGasPrice:{format:"uint"},type:{format:"uint"},maxFeePerGas:{format:"uint"},maxPriorityFeePerGas:{format:"uint"},accessList:Object.assign({},t.accessListSchema),data:{format:"bytes"},input:{format:"bytes"},nonce:{format:"uint"},chain:Object.assign({},t.chainSchema),hardfork:Object.assign({},t.hardforkSchema),chainId:{format:"uint"},networkId:{format:"uint"},common:{type:"object",properties:{customChain:Object.assign({},t.customChainSchema),baseChain:Object.assign({},t.chainSchema),hardfork:Object.assign({},t.hardforkSchema)}},gasLimit:{format:"uint"},v:{format:"uint"},r:{format:"bytes32"},s:{format:"bytes32"}}},t.transactionInfoSchema={type:"object",properties:Object.assign(Object.assign({},t.transactionSchema.properties),{blockHash:{format:"bytes32"},blockNumber:{format:"uint"},hash:{format:"bytes32"},transactionIndex:{format:"uint"},from:{format:"address"},to:{oneOf:[{format:"address"},{type:"null"}]},value:{format:"uint"},gas:{format:"uint"},gasPrice:{format:"uint"},effectiveGasPrice:{format:"uint"},type:{format:"uint"},maxFeePerGas:{format:"uint"},maxPriorityFeePerGas:{format:"uint"},accessList:Object.assign({},t.accessListSchema),data:{format:"bytes"},input:{format:"bytes"},nonce:{format:"uint"},gasLimit:{format:"uint"},v:{format:"uint"},r:{format:"bytes32"},s:{format:"bytes32"}})},t.blockSchema={type:"object",properties:{parentHash:{format:"bytes32"},sha3Uncles:{format:"bytes32"},miner:{format:"bytes"},stateRoot:{format:"bytes32"},transactionsRoot:{format:"bytes32"},receiptsRoot:{format:"bytes32"},logsBloom:{format:"bytes256"},difficulty:{format:"uint"},number:{format:"uint"},gasLimit:{format:"uint"},gasUsed:{format:"uint"},timestamp:{format:"uint"},extraData:{format:"bytes"},mixHash:{format:"bytes32"},nonce:{format:"uint"},totalDifficulty:{format:"uint"},baseFeePerGas:{format:"uint"},size:{format:"uint"},transactions:{oneOf:[{type:"array",items:Object.assign({},t.transactionInfoSchema)},{type:"array",items:{format:"bytes32"}}]},uncles:{type:"array",items:{format:"bytes32"}},hash:{format:"bytes32"}}},t.withdrawalsSchema={type:"object",properties:{index:{format:"uint"},validatorIndex:{format:"uint"},address:{format:"address"},amount:{format:"uint"}}},t.blockHeaderSchema={type:"object",properties:{author:{format:"bytes32"},hash:{format:"bytes32"},parentHash:{format:"bytes32"},receiptsRoot:{format:"bytes32"},miner:{format:"bytes"},stateRoot:{format:"bytes32"},transactionsRoot:{format:"bytes32"},withdrawalsRoot:{format:"bytes32"},logsBloom:{format:"bytes256"},difficulty:{format:"uint"},totalDifficulty:{format:"uint"},number:{format:"uint"},gasLimit:{format:"uint"},gasUsed:{format:"uint"},timestamp:{format:"uint"},extraData:{format:"bytes"},nonce:{format:"uint"},sha3Uncles:{format:"bytes32"},size:{format:"uint"},baseFeePerGas:{format:"uint"},excessDataGas:{format:"uint"},mixHash:{format:"bytes32"},transactions:{type:"array",items:{format:"bytes32"}},uncles:{type:"array",items:{format:"bytes32"}},withdrawals:{type:"array",items:Object.assign({},t.withdrawalsSchema)}}},t.logSchema={type:"object",properties:{removed:{format:"bool"},logIndex:{format:"uint"},transactionIndex:{format:"uint"},transactionHash:{format:"bytes32"},blockHash:{format:"bytes32"},blockNumber:{format:"uint"},address:{format:"address"},data:{format:"bytes"},topics:{type:"array",items:{format:"bytes32"}}}},t.syncSchema={type:"object",properties:{startingBlock:{format:"string"},currentBlock:{format:"string"},highestBlock:{format:"string"},knownStates:{format:"string"},pulledStates:{format:"string"}}},t.transactionReceiptSchema={type:"object",properties:{transactionHash:{format:"bytes32"},transactionIndex:{format:"uint"},blockHash:{format:"bytes32"},blockNumber:{format:"uint"},from:{format:"address"},to:{format:"address"},cumulativeGasUsed:{format:"uint"},gasUsed:{format:"uint"},effectiveGasPrice:{format:"uint"},contractAddress:{format:"address"},logs:{type:"array",items:Object.assign({},t.logSchema)},logsBloom:{format:"bytes"},root:{format:"bytes"},status:{format:"uint"},type:{format:"uint"}}},t.SignatureObjectSchema={type:"object",properties:{messageHash:{format:"bytes"},r:{format:"bytes32"},s:{format:"bytes32"},v:{format:"bytes"},message:{format:"bytes"},signature:{format:"bytes"}}},t.feeHistorySchema={type:"object",properties:{oldestBlock:{format:"uint"},baseFeePerGas:{type:"array",items:{format:"uint"}},reward:{type:"array",items:{type:"array",items:{format:"uint"}}},gasUsedRatio:{type:"array",items:{type:"number"}}}},t.storageProofSchema={type:"object",properties:{key:{format:"bytes32"},value:{format:"uint"},proof:{type:"array",items:{format:"bytes32"}}}},t.accountSchema={type:"object",properties:{balance:{format:"uint"},codeHash:{format:"bytes32"},nonce:{format:"uint"},storageHash:{format:"bytes32"},accountProof:{type:"array",items:{format:"bytes32"}},storageProof:{type:"array",items:Object.assign({},t.storageProofSchema)}}}},4832:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0})},5900:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.decodeSignedTransaction=void 0;const n=r(9634),i=r(9247),o=r(7350),s=r(5140);t.decodeSignedTransaction=function(e,t,r={fillInputAndData:!1}){return{raw:(0,n.format)({format:"bytes"},e,t),tx:(0,s.formatTransaction)(Object.assign(Object.assign({},i.TransactionFactory.fromSerializedData((0,n.hexToBytes)(e)).toJSON()),{hash:(0,n.bytesToHex)((0,n.keccak256)((0,n.hexToBytes)(e))),type:(0,o.detectRawTransactionType)((0,n.hexToBytes)(e))}),t,{fillInputAndData:r.fillInputAndData})}}},7543:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.decodeEventABI=void 0;const n=r(9634),i=r(9970),o=r(8381),s=r(1922),a=r(9326);t.decodeEventABI=(e,t,r,c=i.DEFAULT_RETURN_FORMAT)=>{var u,d,l,h,f;let p=Object.assign({},e);const m=(0,n.format)(s.logSchema,t,c);if([a.ALL_EVENTS,"allEvents"].includes(p.name)){p=r.find((e=>e.signature===t.topics[0]))||{anonymous:!0}}if(p.inputs=null!==(d=null!==(u=p.inputs)&&void 0!==u?u:e.inputs)&&void 0!==d?d:[],!p.anonymous){let e=0;(null!==(l=p.inputs)&&void 0!==l?l:[]).forEach((t=>{t.indexed&&(e+=1)})),e>0&&(null==t?void 0:t.topics)&&(null==t?void 0:t.topics.length)!==e+1&&(p=Object.assign(Object.assign({},p),{anonymous:!0,inputs:[]}))}const g=p.anonymous?t.topics:(null!==(h=t.topics)&&void 0!==h?h:[]).slice(1);return Object.assign(Object.assign({},m),{returnValues:(0,o.decodeLog)([...null!==(f=p.inputs)&&void 0!==f?f:[]],t.data,g),event:p.name,signature:!p.anonymous&&t.topics&&0!==t.topics.length&&t.topics[0]?t.topics[0]:void 0,raw:{data:t.data,topics:t.topics}})}},7350:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.detectRawTransactionType=t.detectTransactionType=t.defaultTransactionTypeParser=void 0;const n=r(9634),i=r(9970),o=r(7345),s=r(5071),a={type:"object",properties:{accessList:{type:"null"},maxFeePerGas:{type:"null"},maxPriorityFeePerGas:{type:"null"}}},c={type:"object",properties:{maxFeePerGas:{type:"null"},maxPriorityFeePerGas:{type:"null"}}},u={type:"object",properties:{gasPrice:{type:"null"}}},d=(e,t,r)=>{try{o.validator.validateJSONSchema(e,t)}catch(e){if(e instanceof o.Web3ValidatorError)throw new s.InvalidPropertiesForTransactionTypeError(e.errors,r);throw e}};t.defaultTransactionTypeParser=e=>{var t,r;const s=e;if(!(0,o.isNullish)(s.type)){let e;switch(s.type){case"0x0":e=a;break;case"0x1":e=c;break;case"0x2":e=u;break;default:return(0,n.format)({format:"uint"},s.type,i.ETH_DATA_FORMAT)}return d(e,s,s.type),(0,n.format)({format:"uint"},s.type,i.ETH_DATA_FORMAT)}if(!(0,o.isNullish)(s.maxFeePerGas)||!(0,o.isNullish)(s.maxPriorityFeePerGas))return d(u,s,"0x2"),"0x2";if(!(0,o.isNullish)(s.accessList))return d(c,s,"0x1"),"0x1";const l=null!==(t=s.hardfork)&&void 0!==t?t:null===(r=s.common)||void 0===r?void 0:r.hardfork;if(!(0,o.isNullish)(l)){const e=Object.keys(i.HardforksOrdered).indexOf(l);if(e>=Object.keys(i.HardforksOrdered).indexOf("london"))return(0,o.isNullish)(s.gasPrice)?"0x2":"0x0";if(e===Object.keys(i.HardforksOrdered).indexOf("berlin"))return"0x0"}return(0,o.isNullish)(s.gasPrice)?void 0:(d(a,s,"0x0"),"0x0")},t.detectTransactionType=(e,r)=>{var n;return(null!==(n=null==r?void 0:r.transactionTypeParser)&&void 0!==n?n:t.defaultTransactionTypeParser)(e)},t.detectRawTransactionType=e=>e[0]>127?"0x0":(0,n.toHex)(e[0])},5140:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.formatTransaction=void 0;const n=r(9970),i=r(7345),o=r(9634),s=r(5071),a=r(1922);t.formatTransaction=function(e,t=n.DEFAULT_RETURN_FORMAT,r={transactionSchema:a.transactionInfoSchema,fillInputAndData:!1}){var c,u;let d=(0,o.mergeDeep)({},e);if((0,i.isNullish)(null==e?void 0:e.common)||(d.common=Object.assign({},e.common),(0,i.isNullish)(null===(c=e.common)||void 0===c?void 0:c.customChain)||(d.common.customChain=Object.assign({},e.common.customChain))),d=(0,o.format)(null!==(u=r.transactionSchema)&&void 0!==u?u:a.transactionInfoSchema,d,t),!(0,i.isNullish)(d.data)&&!(0,i.isNullish)(d.input)&&(0,o.toHex)(d.data)!==(0,o.toHex)(d.input))throw new s.TransactionDataAndInputError({data:(0,o.bytesToHex)(d.data),input:(0,o.bytesToHex)(d.input)});return r.fillInputAndData&&((0,i.isNullish)(d.data)?(0,i.isNullish)(d.input)||(d.data=d.input):d.input=d.data),(0,i.isNullish)(d.gasLimit)||(d.gas=d.gasLimit,delete d.gasLimit),d}},4429:function(e,t,r){"use strict";var n=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.getRevertReason=t.parseTransactionError=void 0;const i=r(5071),o=r(8381),s=r(9970),a=r(3222);t.parseTransactionError=(e,t)=>{var r,n,s,a;if(e instanceof i.ContractExecutionError&&e.innerError instanceof i.Eip838ExecutionError){if(void 0!==t){const i=t.filter((e=>(0,o.isAbiErrorFragment)(e)));return(0,o.decodeContractErrorData)(i,e.innerError),{reason:e.innerError.message,signature:null===(r=e.innerError.data)||void 0===r?void 0:r.slice(0,10),data:null===(n=e.innerError.data)||void 0===n?void 0:n.substring(10),customErrorName:e.innerError.errorName,customErrorDecodedSignature:e.innerError.errorSignature,customErrorArguments:e.innerError.errorArgs}}return{reason:e.innerError.message,signature:null===(s=e.innerError.data)||void 0===s?void 0:s.slice(0,10),data:null===(a=e.innerError.data)||void 0===a?void 0:a.substring(10)}}if(e instanceof i.InvalidResponseError&&!Array.isArray(e.innerError)&&void 0!==e.innerError)return e.innerError.message;throw e},t.getRevertReason=function(e,r,i,o=s.DEFAULT_RETURN_FORMAT){return n(this,void 0,void 0,(function*(){try{return void(yield(0,a.call)(e,r,e.defaultBlock,o))}catch(e){return(0,t.parseTransactionError)(e,i)}}))}},1882:function(e,t,r){"use strict";var n=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.getTransactionError=void 0;const i=r(5071),o=r(4429);t.getTransactionError=function(e,t,r,s,a,c){return n(this,void 0,void 0,(function*(){let n,u=c;if(void 0===u&&(void 0!==s?u=(0,o.parseTransactionError)(s):e.handleRevert&&void 0!==t&&(u=yield(0,o.getRevertReason)(e,t,a))),void 0===u)n=new i.TransactionRevertedWithoutReasonError(r);else if("string"==typeof u)n=new i.TransactionRevertInstructionError(u,void 0,r);else if(void 0!==u.customErrorName&&void 0!==u.customErrorDecodedSignature&&void 0!==u.customErrorArguments){const e=u;n=new i.TransactionRevertWithCustomError(e.reason,e.customErrorName,e.customErrorDecodedSignature,e.customErrorArguments,e.signature,r,e.data)}else n=new i.TransactionRevertInstructionError(u.reason,u.signature,r,u.data);return n}))}},8736:function(e,t,r){"use strict";var n=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.getTransactionGasPricing=void 0;const i=r(7345),o=r(5071),s=r(9634),a=r(3222),c=r(223);t.getTransactionGasPricing=function(e,t,r){return n(this,void 0,void 0,(function*(){const u=(0,c.getTransactionType)(e,t);if(!(0,i.isNullish)(u)){if(u.startsWith("-"))throw new o.UnsupportedTransactionTypeError(u);if(Number(u)<0||Number(u)>127)throw new o.UnsupportedTransactionTypeError(u);if((0,i.isNullish)(e.gasPrice)&&("0x0"===u||"0x1"===u))return{gasPrice:yield(0,a.getGasPrice)(t,r),maxPriorityFeePerGas:void 0,maxFeePerGas:void 0};if("0x2"===u)return Object.assign({gasPrice:void 0},yield function(e,t,r){var c,u,d;return n(this,void 0,void 0,(function*(){const n=yield(0,a.getBlock)(t,t.defaultBlock,!1,r);if((0,i.isNullish)(n.baseFeePerGas))throw new o.Eip1559NotSupportedError;if(!(0,i.isNullish)(e.gasPrice)){const t=(0,s.format)({format:"uint"},e.gasPrice,r);return{maxPriorityFeePerGas:t,maxFeePerGas:t}}return{maxPriorityFeePerGas:(0,s.format)({format:"uint"},null!==(c=e.maxPriorityFeePerGas)&&void 0!==c?c:t.defaultMaxPriorityFeePerGas,r),maxFeePerGas:(0,s.format)({format:"uint"},null!==(u=e.maxFeePerGas)&&void 0!==u?u:BigInt(n.baseFeePerGas)*BigInt(2)+BigInt(null!==(d=e.maxPriorityFeePerGas)&&void 0!==d?d:t.defaultMaxPriorityFeePerGas),r)}}))}(e,t,r))}}))}},1258:function(e,t,r){"use strict";var n=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.prepareTransactionForSigning=void 0;const i=r(9970),o=r(9634),s=r(9247),a=r(7345),c=r(8650),u=r(5140),d=r(223);t.prepareTransactionForSigning=(e,t,r,l=!1,h=!0)=>n(void 0,void 0,void 0,(function*(){const n=yield(0,d.transactionBuilder)({transaction:e,web3Context:t,privateKey:r,fillGasPrice:l,fillGasLimit:h}),f=(0,u.formatTransaction)(n,i.ETH_DATA_FORMAT);return(0,c.validateTransactionForSigning)(f),s.TransactionFactory.fromTxData((e=>{var t,r;return{nonce:e.nonce,gasPrice:e.gasPrice,gasLimit:null!==(t=e.gasLimit)&&void 0!==t?t:e.gas,to:e.to,value:e.value,data:null!==(r=e.data)&&void 0!==r?r:e.input,type:e.type,chainId:e.chainId,accessList:e.accessList,maxPriorityFeePerGas:e.maxPriorityFeePerGas,maxFeePerGas:e.maxFeePerGas}})(f),((e,t)=>{var r,n,i,c,u,d,l,h,f,p,m,g,y,v,b,E,_,A;let T;if(((0,a.isNullish)(e.chain)||(0,a.isNullish)(e.hardfork))&&(0,a.isNullish)(e.common))t.defaultCommon?(T=t.defaultCommon,(0,a.isNullish)(T.hardfork)&&(T.hardfork=null!==(r=e.hardfork)&&void 0!==r?r:t.defaultHardfork),(0,a.isNullish)(T.baseChain)&&(T.baseChain=t.defaultChain)):T=s.Common.custom({name:"custom-network",chainId:(0,o.toNumber)(e.chainId),networkId:(0,a.isNullish)(e.networkId)?void 0:(0,o.toNumber)(e.networkId),defaultHardfork:null!==(n=e.hardfork)&&void 0!==n?n:t.defaultHardfork},{baseChain:t.defaultChain});else{const r=null!==(d=null!==(u=null===(c=null===(i=null==e?void 0:e.common)||void 0===i?void 0:i.customChain)||void 0===c?void 0:c.name)&&void 0!==u?u:e.chain)&&void 0!==d?d:"custom-network",n=(0,o.toNumber)(null!==(f=null===(h=null===(l=null==e?void 0:e.common)||void 0===l?void 0:l.customChain)||void 0===h?void 0:h.chainId)&&void 0!==f?f:null==e?void 0:e.chainId),a=(0,o.toNumber)(null!==(g=null===(m=null===(p=null==e?void 0:e.common)||void 0===p?void 0:p.customChain)||void 0===m?void 0:m.networkId)&&void 0!==g?g:null==e?void 0:e.networkId),I=null!==(b=null!==(v=null===(y=null==e?void 0:e.common)||void 0===y?void 0:y.hardfork)&&void 0!==v?v:null==e?void 0:e.hardfork)&&void 0!==b?b:t.defaultHardfork,R=null!==(A=null!==(_=null===(E=e.common)||void 0===E?void 0:E.baseChain)&&void 0!==_?_:e.chain)&&void 0!==A?A:t.defaultChain;n&&a&&r&&(T=s.Common.custom({name:r,chainId:n,networkId:a,defaultHardfork:I},{baseChain:R}))}return{common:T}})(f,t))}))},4659:function(e,t,r){"use strict";var n=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.rejectIfBlockTimeout=void 0;const i=r(9634),o=r(5071),s=r(9326),a=r(3222);function c(e,t,r){const c=e.transactionPollingInterval,[u,d]=(0,i.rejectIfConditionAtInterval)((()=>n(this,void 0,void 0,(function*(){let n;try{n=yield(0,a.getBlockNumber)(e,s.NUMBER_DATA_FORMAT)}catch(e){return void console.warn("An error happen while trying to get the block number",e)}const i=n-t;if(i>=e.transactionBlockTimeout)return new o.TransactionBlockTimeoutError({starterBlockNumber:t,numberOfBlocks:i,transactionHash:r})}))),c);return[d,{clean:()=>{clearInterval(u)}}]}t.rejectIfBlockTimeout=function(e,t){var r,i;return n(this,void 0,void 0,(function*(){const{provider:u}=e.requestManager;let d;const l=yield(0,a.getBlockNumber)(e,s.NUMBER_DATA_FORMAT);return d=(null===(i=(r=u).supportsSubscriptions)||void 0===i?void 0:i.call(r))&&e.enableExperimentalFeatures.useSubscriptionWhenCheckingBlockTimeout?yield function(e,t,r){var i;return n(this,void 0,void 0,(function*(){let n,s,a=!0;function u(n,i){i&&console.warn("error happened at subscription. So revert to polling...",i),s.clean(),a=!1;const[o,u]=c(e,t,r);s.clean=u.clean,o.catch((e=>n(e)))}try{n=yield null===(i=e.subscriptionManager)||void 0===i?void 0:i.subscribe("newHeads"),s={clean:()=>{var t;n.id&&(null===(t=e.subscriptionManager)||void 0===t||t.removeSubscription(n).then((()=>{})).catch((()=>{})))}}}catch(n){return c(e,t,r)}return[new Promise(((i,s)=>{try{n.on("data",(n=>{if(a=!1,!(null==n?void 0:n.number))return;const i=Number(BigInt(n.number)-BigInt(t));i>=e.transactionBlockTimeout&&s(new o.TransactionBlockTimeoutError({starterBlockNumber:t,numberOfBlocks:i,transactionHash:r}))})),n.on("error",(e=>{u(s,e)}))}catch(e){u(s,e)}setTimeout((()=>{a&&u(s)}),1e3*e.blockHeaderTimeout)})),s]}))}(e,l,t):c(e,l,t),d}))}},7322:function(e,t,r){"use strict";var n=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.SendTxHelper=void 0;const i=r(9970),o=r(7345),s=r(5071),a=r(1181),c=r(8736),u=r(8425),d=r(2117),l=r(9326),h=r(1882),f=r(4429),p=r(7543);t.SendTxHelper=class{constructor({options:e,web3Context:t,promiEvent:r,returnFormat:n}){this.options={checkRevertBeforeSending:!0},this.options=e,this.web3Context=t,this.promiEvent=r,this.returnFormat=n}getReceiptWithEvents(e){var t,r;const n=Object.assign({},null!=e?e:{});if((null===(t=this.options)||void 0===t?void 0:t.contractAbi)&&n.logs&&n.logs.length>0){n.events={};for(const e of n.logs){const t=(0,p.decodeEventABI)(l.ALL_EVENTS_ABI,e,null===(r=this.options)||void 0===r?void 0:r.contractAbi,this.returnFormat);t.event&&(n.events[t.event]=t)}}return n}checkRevertBeforeSending(e){return n(this,void 0,void 0,(function*(){if(!1!==this.options.checkRevertBeforeSending){const t=yield(0,f.getRevertReason)(this.web3Context,e,this.options.contractAbi);if(void 0!==t)throw yield(0,h.getTransactionError)(this.web3Context,e,void 0,void 0,this.options.contractAbi,t)}}))}emitSending(e){this.promiEvent.listenerCount("sending")>0&&this.promiEvent.emit("sending",e)}populateGasPrice({transactionFormatted:e,transaction:t}){var r;return n(this,void 0,void 0,(function*(){let n=e;return!(null===(r=this.options)||void 0===r?void 0:r.ignoreGasPricing)&&(0,o.isNullish)(e.gasPrice)&&((0,o.isNullish)(t.maxPriorityFeePerGas)||(0,o.isNullish)(t.maxFeePerGas))&&(n=Object.assign(Object.assign({},e),yield(0,c.getTransactionGasPricing)(e,this.web3Context,i.ETH_DATA_FORMAT))),n}))}signAndSend({wallet:e,tx:t}){return n(this,void 0,void 0,(function*(){if(e){const r=yield e.signTransaction(t);return(0,u.trySendTransaction)(this.web3Context,(()=>n(this,void 0,void 0,(function*(){return a.ethRpcMethods.sendRawTransaction(this.web3Context.requestManager,r.rawTransaction)}))),r.transactionHash)}return(0,u.trySendTransaction)(this.web3Context,(()=>n(this,void 0,void 0,(function*(){return a.ethRpcMethods.sendTransaction(this.web3Context.requestManager,t)}))))}))}emitSent(e){this.promiEvent.listenerCount("sent")>0&&this.promiEvent.emit("sent",e)}emitTransactionHash(e){this.promiEvent.listenerCount("transactionHash")>0&&this.promiEvent.emit("transactionHash",e)}emitReceipt(e){this.promiEvent.listenerCount("receipt")>0&&this.promiEvent.emit("receipt",e)}handleError({error:e,tx:t}){var r;return n(this,void 0,void 0,(function*(){let n=e;return n instanceof s.ContractExecutionError&&this.web3Context.handleRevert&&(n=yield(0,h.getTransactionError)(this.web3Context,t,void 0,void 0,null===(r=this.options)||void 0===r?void 0:r.contractAbi)),(n instanceof s.InvalidResponseError||n instanceof s.ContractExecutionError||n instanceof s.TransactionRevertWithCustomError||n instanceof s.TransactionRevertedWithoutReasonError||n instanceof s.TransactionRevertInstructionError)&&this.promiEvent.listenerCount("error")>0&&this.promiEvent.emit("error",n),n}))}emitConfirmation({receipt:e,transactionHash:t}){this.promiEvent.listenerCount("confirmation")>0&&(0,d.watchTransactionForConfirmations)(this.web3Context,this.promiEvent,e,t,this.returnFormat)}handleResolve({receipt:e,tx:t}){var r,i,o;return n(this,void 0,void 0,(function*(){if(null===(r=this.options)||void 0===r?void 0:r.transactionResolver)return null===(i=this.options)||void 0===i?void 0:i.transactionResolver(e);if(e.status===BigInt(0)){const r=yield(0,h.getTransactionError)(this.web3Context,t,e,void 0,null===(o=this.options)||void 0===o?void 0:o.contractAbi);throw this.promiEvent.listenerCount("error")>0&&this.promiEvent.emit("error",r),r}return e}))}}},223:function(e,t,r){"use strict";var n=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.transactionBuilder=t.defaultTransactionBuilder=t.getTransactionType=t.getTransactionNonce=t.getTransactionFromOrToAttr=void 0;const i=r(9970),o=r(9247),s=r(9820),a=r(7345),c=r(5071),u=r(9634),d=r(9326),l=r(3222),h=r(7350),f=r(1922),p=r(8736);function m(e){var r,o;return n(this,void 0,void 0,(function*(){let n=(0,u.format)(f.transactionSchema,e.transaction,i.DEFAULT_RETURN_FORMAT);if((0,a.isNullish)(n.from)&&(n.from=(0,t.getTransactionFromOrToAttr)("from",e.web3Context,void 0,e.privateKey)),(0,a.isNullish)(n.nonce)&&(n.nonce=yield(0,t.getTransactionNonce)(e.web3Context,n.from,i.ETH_DATA_FORMAT)),(0,a.isNullish)(n.value)&&(n.value="0x0"),(0,a.isNullish)(n.data))(0,a.isNullish)(n.input)?n.input="0x":n.input.startsWith("0x")||(n.input=`0x${n.input}`);else{if(!(0,a.isNullish)(n.input)&&n.data!==n.input)throw new c.TransactionDataAndInputError({data:(0,u.bytesToHex)(n.data),input:(0,u.bytesToHex)(n.input)});n.data.startsWith("0x")||(n.data=`0x${n.data}`)}if((0,a.isNullish)(n.common)){if(e.web3Context.defaultCommon){const t=e.web3Context.defaultCommon,r=t.customChain.chainId,i=t.customChain.networkId,o=t.customChain.name;n.common=Object.assign(Object.assign({},t),{customChain:{chainId:r,networkId:i,name:o}})}(0,a.isNullish)(n.chain)&&(n.chain=e.web3Context.defaultChain),(0,a.isNullish)(n.hardfork)&&(n.hardfork=e.web3Context.defaultHardfork)}if((0,a.isNullish)(n.chainId)&&(0,a.isNullish)(null===(r=n.common)||void 0===r?void 0:r.customChain.chainId)&&(n.chainId=yield(0,l.getChainId)(e.web3Context,i.ETH_DATA_FORMAT)),(0,a.isNullish)(n.networkId)&&(n.networkId=null!==(o=e.web3Context.defaultNetworkId)&&void 0!==o?o:yield(0,s.getId)(e.web3Context,i.ETH_DATA_FORMAT)),(0,a.isNullish)(n.gasLimit)&&!(0,a.isNullish)(n.gas)&&(n.gasLimit=n.gas),n.type=(0,t.getTransactionType)(n,e.web3Context),!(0,a.isNullish)(n.accessList)||"0x1"!==n.type&&"0x2"!==n.type||(n.accessList=[]),e.fillGasPrice&&(n=Object.assign(Object.assign({},n),yield(0,p.getTransactionGasPricing)(n,e.web3Context,i.ETH_DATA_FORMAT))),(0,a.isNullish)(n.gas)&&(0,a.isNullish)(n.gasLimit)&&e.fillGasLimit){const t=yield(0,l.estimateGas)(e.web3Context,n,"latest",i.ETH_DATA_FORMAT);n=Object.assign(Object.assign({},n),{gas:(0,u.format)({format:"uint"},t,i.ETH_DATA_FORMAT)})}return n}))}t.getTransactionFromOrToAttr=(e,t,r,n)=>{if(void 0!==r&&e in r&&void 0!==r[e]){if("string"==typeof r[e]&&(0,a.isAddress)(r[e]))return r[e];if(!(0,a.isHexStrict)(r[e])&&(0,a.isNumber)(r[e])){if(t.wallet){const n=t.wallet.get((0,u.format)({format:"uint"},r[e],d.NUMBER_DATA_FORMAT));if(!(0,a.isNullish)(n))return n.address;throw new c.LocalWalletNotAvailableError}throw new c.LocalWalletNotAvailableError}throw"from"===e?new c.InvalidTransactionWithSender(r.from):new c.InvalidTransactionWithReceiver(r.to)}if("from"===e){if(!(0,a.isNullish)(n))return(0,o.privateKeyToAddress)(n);if(!(0,a.isNullish)(t.defaultAccount))return t.defaultAccount}},t.getTransactionNonce=(e,t,r=i.DEFAULT_RETURN_FORMAT)=>n(void 0,void 0,void 0,(function*(){if((0,a.isNullish)(t))throw new c.UnableToPopulateNonceError;return(0,l.getTransactionCount)(e,t,e.defaultBlock,r)})),t.getTransactionType=(e,t)=>{const r=(0,h.detectTransactionType)(e,t);return(0,a.isNullish)(r)?(0,a.isNullish)(t.defaultTransactionType)?void 0:(0,u.format)({format:"uint"},t.defaultTransactionType,i.ETH_DATA_FORMAT):r},t.defaultTransactionBuilder=m,t.transactionBuilder=e=>n(void 0,void 0,void 0,(function*(){var t;return(null!==(t=e.web3Context.transactionBuilder)&&void 0!==t?t:m)(Object.assign(Object.assign({},e),{transaction:e.transaction}))}))},8425:function(e,t,r){"use strict";var n=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.trySendTransaction=void 0;const i=r(9634),o=r(5071),s=r(4659);t.trySendTransaction=function(e,t,r){return n(this,void 0,void 0,(function*(){const[n,a]=(0,i.rejectIfTimeout)(e.transactionSendTimeout,new o.TransactionSendTimeoutError({numberOfSeconds:e.transactionSendTimeout/1e3,transactionHash:r})),[c,u]=yield(0,s.rejectIfBlockTimeout)(e,r);try{return yield Promise.race([t(),a,c])}finally{clearTimeout(n),u.clean()}}))}},4745:function(e,t,r){"use strict";var n=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.waitForTransactionReceipt=void 0;const i=r(5071),o=r(9634),s=r(4659),a=r(3222);t.waitForTransactionReceipt=function(e,t,r){var c;return n(this,void 0,void 0,(function*(){const u=null!==(c=e.transactionReceiptPollingInterval)&&void 0!==c?c:e.transactionPollingInterval,[d,l]=(0,o.pollTillDefinedAndReturnIntervalId)((()=>n(this,void 0,void 0,(function*(){try{return(0,a.getTransactionReceipt)(e,t,r)}catch(e){return void console.warn("An error happen while trying to get the transaction receipt",e)}}))),u),[h,f]=(0,o.rejectIfTimeout)(e.transactionPollingTimeout,new i.TransactionPollingTimeoutError({numberOfSeconds:e.transactionPollingTimeout/1e3,transactionHash:t})),[p,m]=yield(0,s.rejectIfBlockTimeout)(e,t);try{return yield Promise.race([d,f,p])}finally{h&&clearTimeout(h),l&&clearInterval(l),m.clean()}}))}},8002:function(e,t,r){"use strict";var n=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.watchTransactionByPolling=void 0;const i=r(9634),o=r(1181),s=r(1922);t.watchTransactionByPolling=({web3Context:e,transactionReceipt:t,transactionPromiEvent:r,returnFormat:a})=>{var c;let u=1;const d=setInterval((()=>{n(void 0,void 0,void 0,(function*(){u>=e.transactionConfirmationBlocks&&clearInterval(d);const n=yield o.ethRpcMethods.getBlockByNumber(e.requestManager,(0,i.numberToHex)(BigInt(t.blockNumber)+BigInt(u)),!1);(null==n?void 0:n.hash)&&(u+=1,r.emit("confirmation",{confirmations:(0,i.format)({format:"uint"},u,a),receipt:(0,i.format)(s.transactionReceiptSchema,t,a),latestBlockHash:(0,i.format)({format:"bytes32"},n.hash,a)}))}))}),null!==(c=e.transactionReceiptPollingInterval)&&void 0!==c?c:e.transactionPollingInterval)}},2539:function(e,t,r){"use strict";var n=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.watchTransactionBySubscription=void 0;const i=r(9634),o=r(1922),s=r(8002);t.watchTransactionBySubscription=({web3Context:e,transactionReceipt:t,transactionPromiEvent:r,returnFormat:a})=>{let c,u=!0;setImmediate((()=>{var d;null===(d=e.subscriptionManager)||void 0===d||d.subscribe("newHeads").then((d=>{d.on("data",(s=>n(void 0,void 0,void 0,(function*(){var n;if(u=!1,!(null==s?void 0:s.number)||c===(null==s?void 0:s.parentHash))return;c=null==s?void 0:s.parentHash;const l=BigInt(s.number)-BigInt(t.blockNumber)+BigInt(1);r.emit("confirmation",{confirmations:(0,i.format)({format:"uint"},l,a),receipt:(0,i.format)(o.transactionReceiptSchema,t,a),latestBlockHash:(0,i.format)({format:"bytes32"},s.parentHash,a)}),l>=e.transactionConfirmationBlocks&&(yield null===(n=e.subscriptionManager)||void 0===n?void 0:n.removeSubscription(d))})))),d.on("error",(()=>n(void 0,void 0,void 0,(function*(){var n;yield null===(n=e.subscriptionManager)||void 0===n?void 0:n.removeSubscription(d),u=!1,(0,s.watchTransactionByPolling)({web3Context:e,transactionReceipt:t,transactionPromiEvent:r,returnFormat:a})}))))})).catch((()=>{u=!1,(0,s.watchTransactionByPolling)({web3Context:e,transactionReceipt:t,transactionPromiEvent:r,returnFormat:a})}))})),setTimeout((()=>{u&&(0,s.watchTransactionByPolling)({web3Context:e,transactionReceipt:t,transactionPromiEvent:r,returnFormat:a})}),1e3*e.blockHeaderTimeout)}},2117:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.watchTransactionForConfirmations=void 0;const n=r(9634),i=r(7345),o=r(5071),s=r(1922),a=r(8002),c=r(2539);t.watchTransactionForConfirmations=function(e,t,r,u,d){if((0,i.isNullish)(r)||(0,i.isNullish)(r.blockHash))throw new o.TransactionMissingReceiptOrBlockHashError({receipt:r,blockHash:(0,n.format)({format:"bytes32"},null==r?void 0:r.blockHash,d),transactionHash:(0,n.format)({format:"bytes32"},u,d)});if(!r.blockNumber)throw new o.TransactionReceiptMissingBlockNumberError({receipt:r});t.emit("confirmation",{confirmations:(0,n.format)({format:"uint"},1,d),receipt:(0,n.format)(s.transactionReceiptSchema,r,d),latestBlockHash:(0,n.format)({format:"bytes32"},r.blockHash,d)});const l=e.requestManager.provider;l&&"supportsSubscriptions"in l&&l.supportsSubscriptions()?(0,c.watchTransactionBySubscription)({web3Context:e,transactionReceipt:r,transactionPromiEvent:t,returnFormat:d}):(0,a.watchTransactionByPolling)({web3Context:e,transactionReceipt:r,transactionPromiEvent:t,returnFormat:d})}},8650:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.validateTransactionForSigning=t.validateGas=t.validateFeeMarketGas=t.validateLegacyGas=t.validateHardfork=t.validateBaseChain=t.validateChainInfo=t.validateCustomChainInfo=t.validateTransactionCall=t.isTransactionCall=t.validateTransactionWithSender=t.isTransactionWithSender=t.isTransactionLegacyUnsigned=t.isTransaction2930Unsigned=t.isTransaction1559Unsigned=t.isAccessList=t.isAccessListEntry=t.isBaseTransaction=void 0;const n=r(9970),i=r(7345),o=r(5071),s=r(5140);function a(e){return!(!(0,i.isNullish)(e.to)&&!(0,i.isAddress)(e.to)||!(0,i.isHexStrict)(e.type)&&!(0,i.isNullish)(e.type)&&2!==e.type.length||!(0,i.isHexStrict)(e.nonce)||!(0,i.isHexStrict)(e.gas)||!(0,i.isHexStrict)(e.value)||!(0,i.isHexStrict)(e.input)||e.chainId&&!(0,i.isHexStrict)(e.chainId))}function c(e){return!(!(0,i.isNullish)(e.address)&&!(0,i.isAddress)(e.address)||!(0,i.isNullish)(e.storageKeys)&&!e.storageKeys.every((e=>(0,i.isHexString32Bytes)(e))))}function u(e){return!(!Array.isArray(e)||!e.every((e=>c(e))))}function d(e){return!!(a(e)&&(0,i.isHexStrict)(e.maxFeePerGas)&&(0,i.isHexStrict)(e.maxPriorityFeePerGas)&&u(e.accessList))}function l(e){return!!a(e)&&!!(0,i.isHexStrict)(e.gasPrice)&&!!u(e.accessList)}function h(e){return!!a(e)&&!!(0,i.isHexStrict)(e.gasPrice)}function f(e){return!!(0,i.isAddress)(e.from)&&!!a(e)&&!!(d(e)||l(e)||h(e))}function p(e){return!(!(0,i.isNullish)(e.from)&&!(0,i.isAddress)(e.from)||!(0,i.isAddress)(e.to)||!(0,i.isNullish)(e.gas)&&!(0,i.isHexStrict)(e.gas)||!(0,i.isNullish)(e.gasPrice)&&!(0,i.isHexStrict)(e.gasPrice)||!(0,i.isNullish)(e.value)&&!(0,i.isHexStrict)(e.value)||!(0,i.isNullish)(e.data)&&!(0,i.isHexStrict)(e.data)||!(0,i.isNullish)(e.input)&&!(0,i.isHexStrict)(e.input)||!(0,i.isNullish)(e.type)||d(e)||l(e))}t.isBaseTransaction=a,t.isAccessListEntry=c,t.isAccessList=u,t.isTransaction1559Unsigned=d,t.isTransaction2930Unsigned=l,t.isTransactionLegacyUnsigned=h,t.isTransactionWithSender=f,t.validateTransactionWithSender=function(e){if(!f(e))throw new o.InvalidTransactionWithSender(e)},t.isTransactionCall=p,t.validateTransactionCall=function(e){if(!p(e))throw new o.InvalidTransactionCall(e)},t.validateCustomChainInfo=e=>{if(!(0,i.isNullish)(e.common)){if((0,i.isNullish)(e.common.customChain))throw new o.MissingCustomChainError;if((0,i.isNullish)(e.common.customChain.chainId))throw new o.MissingCustomChainIdError;if(!(0,i.isNullish)(e.chainId)&&e.chainId!==e.common.customChain.chainId)throw new o.ChainIdMismatchError({txChainId:e.chainId,customChainId:e.common.customChain.chainId})}},t.validateChainInfo=e=>{if(!(0,i.isNullish)(e.common)&&!(0,i.isNullish)(e.chain)&&!(0,i.isNullish)(e.hardfork))throw new o.CommonOrChainAndHardforkError;if(!(0,i.isNullish)(e.chain)&&(0,i.isNullish)(e.hardfork)||!(0,i.isNullish)(e.hardfork)&&(0,i.isNullish)(e.chain))throw new o.MissingChainOrHardforkError({chain:e.chain,hardfork:e.hardfork})},t.validateBaseChain=e=>{if(!(0,i.isNullish)(e.common)&&!(0,i.isNullish)(e.common.baseChain)&&!(0,i.isNullish)(e.chain)&&e.chain!==e.common.baseChain)throw new o.ChainMismatchError({txChain:e.chain,baseChain:e.common.baseChain})},t.validateHardfork=e=>{if(!(0,i.isNullish)(e.common)&&!(0,i.isNullish)(e.common.hardfork)&&!(0,i.isNullish)(e.hardfork)&&e.hardfork!==e.common.hardfork)throw new o.HardforkMismatchError({txHardfork:e.hardfork,commonHardfork:e.common.hardfork})},t.validateLegacyGas=e=>{if((0,i.isNullish)(e.gas)||!(0,i.isUInt)(e.gas)||(0,i.isNullish)(e.gasPrice)||!(0,i.isUInt)(e.gasPrice))throw new o.InvalidGasOrGasPrice({gas:e.gas,gasPrice:e.gasPrice});if(!(0,i.isNullish)(e.maxFeePerGas)||!(0,i.isNullish)(e.maxPriorityFeePerGas))throw new o.UnsupportedFeeMarketError({maxFeePerGas:e.maxFeePerGas,maxPriorityFeePerGas:e.maxPriorityFeePerGas})},t.validateFeeMarketGas=e=>{if(!(0,i.isNullish)(e.gasPrice)&&"0x2"===e.type)throw new o.Eip1559GasPriceError(e.gasPrice);if("0x0"===e.type||"0x1"===e.type)throw new o.UnsupportedFeeMarketError({maxFeePerGas:e.maxFeePerGas,maxPriorityFeePerGas:e.maxPriorityFeePerGas});if((0,i.isNullish)(e.maxFeePerGas)||!(0,i.isUInt)(e.maxFeePerGas)||(0,i.isNullish)(e.maxPriorityFeePerGas)||!(0,i.isUInt)(e.maxPriorityFeePerGas))throw new o.InvalidMaxPriorityFeePerGasOrMaxFeePerGas({maxPriorityFeePerGas:e.maxPriorityFeePerGas,maxFeePerGas:e.maxFeePerGas})},t.validateGas=e=>{const r=!(0,i.isNullish)(e.gas)||!(0,i.isNullish)(e.gasLimit),n=r&&!(0,i.isNullish)(e.gasPrice),s=r&&!(0,i.isNullish)(e.maxPriorityFeePerGas)&&!(0,i.isNullish)(e.maxFeePerGas);if(!n&&!s)throw new o.MissingGasError({gas:e.gas,gasPrice:e.gasPrice,maxPriorityFeePerGas:e.maxPriorityFeePerGas,maxFeePerGas:e.maxFeePerGas});if(n&&s)throw new o.TransactionGasMismatchError({gas:e.gas,gasPrice:e.gasPrice,maxPriorityFeePerGas:e.maxPriorityFeePerGas,maxFeePerGas:e.maxFeePerGas});(n?t.validateLegacyGas:t.validateFeeMarketGas)(e),(!(0,i.isNullish)(e.type)&&e.type>"0x1"?t.validateFeeMarketGas:t.validateLegacyGas)(e)},t.validateTransactionForSigning=(e,r)=>{if(!(0,i.isNullish)(r))return void r(e);if("object"!=typeof e||(0,i.isNullish)(e))throw new o.InvalidTransactionObjectError(e);(0,t.validateCustomChainInfo)(e),(0,t.validateChainInfo)(e),(0,t.validateBaseChain)(e),(0,t.validateHardfork)(e);const a=(0,s.formatTransaction)(e,n.ETH_DATA_FORMAT);if((0,t.validateGas)(a),(0,i.isNullish)(a.nonce)||(0,i.isNullish)(a.chainId)||a.nonce.startsWith("-")||a.chainId.startsWith("-"))throw new o.InvalidNonceOrChainIdError({nonce:e.nonce,chainId:e.chainId})}},1435:function(e,t,r){"use strict";var n=this&&this.__createBinding||(Object.create?function(e,t,r,n){void 0===n&&(n=r);var i=Object.getOwnPropertyDescriptor(t,r);i&&!("get"in i?!t.__esModule:i.writable||i.configurable)||(i={enumerable:!0,get:function(){return t[r]}}),Object.defineProperty(e,n,i)}:function(e,t,r,n){void 0===n&&(n=r),e[n]=t[r]}),i=this&&this.__setModuleDefault||(Object.create?function(e,t){Object.defineProperty(e,"default",{enumerable:!0,value:t})}:function(e,t){e.default=t}),o=this&&this.__importStar||function(e){if(e&&e.__esModule)return e;var t={};if(null!=e)for(var r in e)"default"!==r&&Object.prototype.hasOwnProperty.call(e,r)&&n(t,e,r);return i(t,e),t},s=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.Web3Eth=t.registeredSubscriptions=void 0;const a=r(9970),c=r(6527),u=r(5071),d=r(9634),l=r(1181),h=o(r(3222)),f=r(7460);t.registeredSubscriptions={logs:f.LogsSubscription,newPendingTransactions:f.NewPendingTransactionsSubscription,newHeads:f.NewHeadsSubscription,syncing:f.SyncingSubscription,pendingTransactions:f.NewPendingTransactionsSubscription,newBlockHeaders:f.NewHeadsSubscription};class p extends c.Web3Context{constructor(e){"string"==typeof e||(0,c.isSupportedProvider)(e)?super({provider:e,registeredSubscriptions:t.registeredSubscriptions}):e.registeredSubscriptions?super(e):super(Object.assign(Object.assign({},e),{registeredSubscriptions:t.registeredSubscriptions}))}getProtocolVersion(){return s(this,void 0,void 0,(function*(){return l.ethRpcMethods.getProtocolVersion(this.requestManager)}))}isSyncing(){return s(this,void 0,void 0,(function*(){return l.ethRpcMethods.getSyncing(this.requestManager)}))}getCoinbase(){return s(this,void 0,void 0,(function*(){return l.ethRpcMethods.getCoinbase(this.requestManager)}))}isMining(){return s(this,void 0,void 0,(function*(){return l.ethRpcMethods.getMining(this.requestManager)}))}getHashrate(e=a.DEFAULT_RETURN_FORMAT){return s(this,void 0,void 0,(function*(){return this.getHashRate(e)}))}getHashRate(e=a.DEFAULT_RETURN_FORMAT){return s(this,void 0,void 0,(function*(){return h.getHashRate(this,e)}))}getGasPrice(e=a.DEFAULT_RETURN_FORMAT){return s(this,void 0,void 0,(function*(){return h.getGasPrice(this,e)}))}getAccounts(){var e;return s(this,void 0,void 0,(function*(){return(null!==(e=yield l.ethRpcMethods.getAccounts(this.requestManager))&&void 0!==e?e:[]).map((e=>(0,d.toChecksumAddress)(e)))}))}getBlockNumber(e=a.DEFAULT_RETURN_FORMAT){return s(this,void 0,void 0,(function*(){return h.getBlockNumber(this,e)}))}getBalance(e,t=this.defaultBlock,r=a.DEFAULT_RETURN_FORMAT){return s(this,void 0,void 0,(function*(){return h.getBalance(this,e,t,r)}))}getStorageAt(e,t,r=this.defaultBlock,n=a.DEFAULT_RETURN_FORMAT){return s(this,void 0,void 0,(function*(){return h.getStorageAt(this,e,t,r,n)}))}getCode(e,t=this.defaultBlock,r=a.DEFAULT_RETURN_FORMAT){return s(this,void 0,void 0,(function*(){return h.getCode(this,e,t,r)}))}getBlock(e=this.defaultBlock,t=!1,r=a.DEFAULT_RETURN_FORMAT){return s(this,void 0,void 0,(function*(){return h.getBlock(this,e,t,r)}))}getBlockTransactionCount(e=this.defaultBlock,t=a.DEFAULT_RETURN_FORMAT){return s(this,void 0,void 0,(function*(){return h.getBlockTransactionCount(this,e,t)}))}getBlockUncleCount(e=this.defaultBlock,t=a.DEFAULT_RETURN_FORMAT){return s(this,void 0,void 0,(function*(){return h.getBlockUncleCount(this,e,t)}))}getUncle(e=this.defaultBlock,t,r=a.DEFAULT_RETURN_FORMAT){return s(this,void 0,void 0,(function*(){return h.getUncle(this,e,t,r)}))}getTransaction(e,t=a.DEFAULT_RETURN_FORMAT){return s(this,void 0,void 0,(function*(){const r=yield h.getTransaction(this,e,t);if(!r)throw new u.TransactionNotFound;return r}))}getPendingTransactions(e=a.DEFAULT_RETURN_FORMAT){return s(this,void 0,void 0,(function*(){return h.getPendingTransactions(this,e)}))}getTransactionFromBlock(e=this.defaultBlock,t,r=a.DEFAULT_RETURN_FORMAT){return s(this,void 0,void 0,(function*(){return h.getTransactionFromBlock(this,e,t,r)}))}getTransactionReceipt(e,t=a.DEFAULT_RETURN_FORMAT){return s(this,void 0,void 0,(function*(){const r=yield h.getTransactionReceipt(this,e,t);if(!r)throw new u.TransactionNotFound;return r}))}getTransactionCount(e,t=this.defaultBlock,r=a.DEFAULT_RETURN_FORMAT){return s(this,void 0,void 0,(function*(){return h.getTransactionCount(this,e,t,r)}))}sendTransaction(e,t=a.DEFAULT_RETURN_FORMAT,r){return h.sendTransaction(this,e,t,r)}sendSignedTransaction(e,t=a.DEFAULT_RETURN_FORMAT,r){return h.sendSignedTransaction(this,e,t,r)}sign(e,t,r=a.DEFAULT_RETURN_FORMAT){return s(this,void 0,void 0,(function*(){return h.sign(this,e,t,r)}))}signTransaction(e,t=a.DEFAULT_RETURN_FORMAT){return s(this,void 0,void 0,(function*(){return h.signTransaction(this,e,t)}))}call(e,t=this.defaultBlock,r=a.DEFAULT_RETURN_FORMAT){return s(this,void 0,void 0,(function*(){return h.call(this,e,t,r)}))}estimateGas(e,t=this.defaultBlock,r=a.DEFAULT_RETURN_FORMAT){return s(this,void 0,void 0,(function*(){return h.estimateGas(this,e,t,r)}))}getPastLogs(e,t=a.DEFAULT_RETURN_FORMAT){return s(this,void 0,void 0,(function*(){return h.getLogs(this,e,t)}))}getWork(){return s(this,void 0,void 0,(function*(){return l.ethRpcMethods.getWork(this.requestManager)}))}submitWork(e,t,r){return s(this,void 0,void 0,(function*(){return l.ethRpcMethods.submitWork(this.requestManager,e,t,r)}))}requestAccounts(){return s(this,void 0,void 0,(function*(){return l.ethRpcMethods.requestAccounts(this.requestManager)}))}getChainId(e=a.DEFAULT_RETURN_FORMAT){return s(this,void 0,void 0,(function*(){return h.getChainId(this,e)}))}getNodeInfo(){return s(this,void 0,void 0,(function*(){return l.ethRpcMethods.getNodeInfo(this.requestManager)}))}getProof(e,t,r=this.defaultBlock,n=a.DEFAULT_RETURN_FORMAT){return s(this,void 0,void 0,(function*(){return h.getProof(this,e,t,r,n)}))}getFeeHistory(e,t=this.defaultBlock,r,n=a.DEFAULT_RETURN_FORMAT){return s(this,void 0,void 0,(function*(){return h.getFeeHistory(this,e,t,r,n)}))}createAccessList(e,t=this.defaultBlock,r=a.DEFAULT_RETURN_FORMAT){return s(this,void 0,void 0,(function*(){return h.createAccessList(this,e,t,r)}))}signTypedData(e,t,r=!1,n=a.DEFAULT_RETURN_FORMAT){return s(this,void 0,void 0,(function*(){return h.signTypedData(this,e,t,r,n)}))}subscribe(e,t,r=a.DEFAULT_RETURN_FORMAT){var n;return s(this,void 0,void 0,(function*(){const i=yield null===(n=this.subscriptionManager)||void 0===n?void 0:n.subscribe(e,t,r);return i instanceof f.LogsSubscription&&"logs"===e&&"object"==typeof t&&!(0,d.isNullish)(t.fromBlock)&&Number.isFinite(Number(t.fromBlock))&&setImmediate((()=>{this.getPastLogs(t).then((e=>{for(const t of e)i._processSubscriptionResult(t)})).catch((e=>{i._processSubscriptionError(e)}))})),i}))}static shouldClearSubscription({sub:e}){return!(e instanceof f.SyncingSubscription)}clearSubscriptions(e=!1){var t;return null===(t=this.subscriptionManager)||void 0===t?void 0:t.unsubscribe(e?p.shouldClearSubscription:void 0)}}t.Web3Eth=p},7460:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.SyncingSubscription=t.NewHeadsSubscription=t.NewPendingTransactionsSubscription=t.LogsSubscription=void 0;const n=r(9634),i=r(6527),o=r(1922);class s extends i.Web3Subscription{_buildSubscriptionParams(){return["logs",this.args]}formatSubscriptionResult(e){return(0,n.format)(o.logSchema,e,super.returnFormat)}}t.LogsSubscription=s;class a extends i.Web3Subscription{_buildSubscriptionParams(){return["newPendingTransactions"]}formatSubscriptionResult(e){return(0,n.format)({format:"string"},e,super.returnFormat)}}t.NewPendingTransactionsSubscription=a;class c extends i.Web3Subscription{_buildSubscriptionParams(){return["newHeads"]}formatSubscriptionResult(e){return(0,n.format)(o.blockHeaderSchema,e,super.returnFormat)}}t.NewHeadsSubscription=c;class u extends i.Web3Subscription{_buildSubscriptionParams(){return["syncing"]}_processSubscriptionResult(e){if("boolean"==typeof e)this.emit("changed",e);else{const t=Object.fromEntries(Object.entries(e.status).map((([e,t])=>[e.charAt(0).toLowerCase()+e.substring(1),t])));this.emit("changed",e.syncing),this.emit("data",(0,n.format)(o.syncSchema,t,super.returnFormat))}}}t.SyncingSubscription=u},9820:function(e,t,r){"use strict";var n=this&&this.__createBinding||(Object.create?function(e,t,r,n){void 0===n&&(n=r);var i=Object.getOwnPropertyDescriptor(t,r);i&&!("get"in i?!t.__esModule:i.writable||i.configurable)||(i={enumerable:!0,get:function(){return t[r]}}),Object.defineProperty(e,n,i)}:function(e,t,r,n){void 0===n&&(n=r),e[n]=t[r]}),i=this&&this.__exportStar||function(e,t){for(var r in e)"default"===r||Object.prototype.hasOwnProperty.call(t,r)||n(t,e,r)};Object.defineProperty(t,"__esModule",{value:!0});const o=r(2491);i(r(2491),t),i(r(7961),t),t.default=o.Net},2491:function(e,t,r){"use strict";var n=this&&this.__createBinding||(Object.create?function(e,t,r,n){void 0===n&&(n=r);var i=Object.getOwnPropertyDescriptor(t,r);i&&!("get"in i?!t.__esModule:i.writable||i.configurable)||(i={enumerable:!0,get:function(){return t[r]}}),Object.defineProperty(e,n,i)}:function(e,t,r,n){void 0===n&&(n=r),e[n]=t[r]}),i=this&&this.__setModuleDefault||(Object.create?function(e,t){Object.defineProperty(e,"default",{enumerable:!0,value:t})}:function(e,t){e.default=t}),o=this&&this.__importStar||function(e){if(e&&e.__esModule)return e;var t={};if(null!=e)for(var r in e)"default"!==r&&Object.prototype.hasOwnProperty.call(e,r)&&n(t,e,r);return i(t,e),t},s=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.Net=void 0;const a=r(6527),c=r(9970),u=o(r(7961));class d extends a.Web3Context{getId(e=c.DEFAULT_RETURN_FORMAT){return s(this,void 0,void 0,(function*(){return u.getId(this,e)}))}getPeerCount(e=c.DEFAULT_RETURN_FORMAT){return s(this,void 0,void 0,(function*(){return u.getPeerCount(this,e)}))}isListening(){return s(this,void 0,void 0,(function*(){return u.isListening(this)}))}}t.Net=d},7961:function(e,t,r){"use strict";var n=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.isListening=t.getPeerCount=t.getId=void 0;const i=r(9634),o=r(1181);t.getId=function(e,t){return n(this,void 0,void 0,(function*(){const r=yield o.netRpcMethods.getId(e.requestManager);return(0,i.format)({format:"uint"},r,t)}))},t.getPeerCount=function(e,t){return n(this,void 0,void 0,(function*(){const r=yield o.netRpcMethods.getPeerCount(e.requestManager);return(0,i.format)({format:"uint"},r,t)}))},t.isListening=e=>n(void 0,void 0,void 0,(function*(){return o.netRpcMethods.isListening(e.requestManager)}))},2636:function(e,t,r){"use strict";var n=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))},i=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.HttpProvider=void 0;const o=i(r(6279)),s=r(9970),a=r(5071);class c extends s.Web3BaseProvider{constructor(e,t){if(super(),!c.validateClientUrl(e))throw new a.InvalidClientError(e);this.clientUrl=e,this.httpProviderOptions=t}static validateClientUrl(e){return"string"==typeof e&&/^http(s)?:\/\//i.test(e)}getStatus(){throw new a.MethodNotImplementedError}supportsSubscriptions(){return!1}request(e,t){var r;return n(this,void 0,void 0,(function*(){const n=Object.assign(Object.assign({},null===(r=this.httpProviderOptions)||void 0===r?void 0:r.providerOptions),t),i=yield(0,o.default)(this.clientUrl,Object.assign(Object.assign({},n),{method:"POST",headers:Object.assign(Object.assign({},n.headers),{"Content-Type":"application/json"}),body:JSON.stringify(e)}));if(!i.ok)throw new a.ResponseError(yield i.json());return yield i.json()}))}on(){throw new a.MethodNotImplementedError}removeListener(){throw new a.MethodNotImplementedError}once(){throw new a.MethodNotImplementedError}removeAllListeners(){throw new a.MethodNotImplementedError}connect(){throw new a.MethodNotImplementedError}disconnect(){throw new a.MethodNotImplementedError}reset(){throw new a.MethodNotImplementedError}reconnect(){throw new a.MethodNotImplementedError}}t.default=c,t.HttpProvider=c},1161:function(e,t,r){"use strict";var n=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.WebSocketProvider=void 0;const i=n(r(7475)),o=r(9634),s=r(5071);class a extends o.SocketProvider{constructor(e,t,r){super(e,t,r)}_validateProviderPath(e){return"string"==typeof e&&/^ws(s)?:\/\//i.test(e)}getStatus(){if(this._socketConnection&&!(0,o.isNullish)(this._socketConnection))switch(this._socketConnection.readyState){case this._socketConnection.CONNECTING:return"connecting";case this._socketConnection.OPEN:return"connected";default:return"disconnected"}return"disconnected"}_openSocketConnection(){this._socketConnection=new i.default(this._socketPath,void 0,this._socketOptions&&0===Object.keys(this._socketOptions).length?void 0:this._socketOptions)}_closeSocketConnection(e,t){var r;null===(r=this._socketConnection)||void 0===r||r.close(e,t)}_sendToSocket(e){var t;if("disconnected"===this.getStatus())throw new s.ConnectionNotOpenError;null===(t=this._socketConnection)||void 0===t||t.send(JSON.stringify(e))}_parseResponses(e){return this.chunkResponseParser.parseResponse(e.data)}_addSocketListeners(){var e,t,r,n;null===(e=this._socketConnection)||void 0===e||e.addEventListener("open",this._onOpenHandler),null===(t=this._socketConnection)||void 0===t||t.addEventListener("message",this._onMessageHandler),null===(r=this._socketConnection)||void 0===r||r.addEventListener("close",(e=>this._onCloseHandler(e))),null===(n=this._socketConnection)||void 0===n||n.addEventListener("error",this._onErrorHandler)}_removeSocketListeners(){var e,t,r;null===(e=this._socketConnection)||void 0===e||e.removeEventListener("message",this._onMessageHandler),null===(t=this._socketConnection)||void 0===t||t.removeEventListener("open",this._onOpenHandler),null===(r=this._socketConnection)||void 0===r||r.removeEventListener("close",this._onCloseHandler)}_onCloseEvent(e){var t;!this._reconnectOptions.autoReconnect||[1e3,1001].includes(e.code)&&e.wasClean?(this._clearQueues(e),this._removeSocketListeners(),this._onDisconnect(e.code,e.reason),null===(t=this._socketConnection)||void 0===t||t.removeEventListener("error",this._onErrorHandler)):this._reconnect()}}t.default=a,t.WebSocketProvider=a},9298:function(e,t,r){"use strict";var n=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.getNodeInfo=t.getProof=t.getChainId=t.requestAccounts=t.getPendingTransactions=t.getFeeHistory=t.submitHashrate=t.submitWork=t.getWork=t.getLogs=t.getFilterLogs=t.getFilterChanges=t.uninstallFilter=t.newPendingTransactionFilter=t.newBlockFilter=t.newFilter=t.compileSerpent=t.compileLLL=t.compileSolidity=t.getCompilers=t.getUncleByBlockNumberAndIndex=t.getUncleByBlockHashAndIndex=t.getTransactionReceipt=t.getTransactionByBlockNumberAndIndex=t.getTransactionByBlockHashAndIndex=t.getTransactionByHash=t.getBlockByNumber=t.getBlockByHash=t.estimateGas=t.call=t.sendRawTransaction=t.sendTransaction=t.signTransaction=t.sign=t.getCode=t.getUncleCountByBlockNumber=t.getUncleCountByBlockHash=t.getBlockTransactionCountByNumber=t.getBlockTransactionCountByHash=t.getTransactionCount=t.getStorageAt=t.getBalance=t.getBlockNumber=t.getAccounts=t.getGasPrice=t.getHashRate=t.getMining=t.getCoinbase=t.getSyncing=t.getProtocolVersion=void 0,t.signTypedData=t.createAccessList=void 0;const i=r(7345);t.getProtocolVersion=function(e){return n(this,void 0,void 0,(function*(){return e.send({method:"eth_protocolVersion",params:[]})}))},t.getSyncing=function(e){return n(this,void 0,void 0,(function*(){return e.send({method:"eth_syncing",params:[]})}))},t.getCoinbase=function(e){return n(this,void 0,void 0,(function*(){return e.send({method:"eth_coinbase",params:[]})}))},t.getMining=function(e){return n(this,void 0,void 0,(function*(){return e.send({method:"eth_mining",params:[]})}))},t.getHashRate=function(e){return n(this,void 0,void 0,(function*(){return e.send({method:"eth_hashrate",params:[]})}))},t.getGasPrice=function(e){return n(this,void 0,void 0,(function*(){return e.send({method:"eth_gasPrice",params:[]})}))},t.getAccounts=function(e){return n(this,void 0,void 0,(function*(){return e.send({method:"eth_accounts",params:[]})}))},t.getBlockNumber=function(e){return n(this,void 0,void 0,(function*(){return e.send({method:"eth_blockNumber",params:[]})}))},t.getBalance=function(e,t,r){return n(this,void 0,void 0,(function*(){return i.validator.validate(["address","blockNumberOrTag"],[t,r]),e.send({method:"eth_getBalance",params:[t,r]})}))},t.getStorageAt=function(e,t,r,o){return n(this,void 0,void 0,(function*(){return i.validator.validate(["address","hex","blockNumberOrTag"],[t,r,o]),e.send({method:"eth_getStorageAt",params:[t,r,o]})}))},t.getTransactionCount=function(e,t,r){return n(this,void 0,void 0,(function*(){return i.validator.validate(["address","blockNumberOrTag"],[t,r]),e.send({method:"eth_getTransactionCount",params:[t,r]})}))},t.getBlockTransactionCountByHash=function(e,t){return n(this,void 0,void 0,(function*(){return i.validator.validate(["bytes32"],[t]),e.send({method:"eth_getBlockTransactionCountByHash",params:[t]})}))},t.getBlockTransactionCountByNumber=function(e,t){return n(this,void 0,void 0,(function*(){return i.validator.validate(["blockNumberOrTag"],[t]),e.send({method:"eth_getBlockTransactionCountByNumber",params:[t]})}))},t.getUncleCountByBlockHash=function(e,t){return n(this,void 0,void 0,(function*(){return i.validator.validate(["bytes32"],[t]),e.send({method:"eth_getUncleCountByBlockHash",params:[t]})}))},t.getUncleCountByBlockNumber=function(e,t){return n(this,void 0,void 0,(function*(){return i.validator.validate(["blockNumberOrTag"],[t]),e.send({method:"eth_getUncleCountByBlockNumber",params:[t]})}))},t.getCode=function(e,t,r){return n(this,void 0,void 0,(function*(){return i.validator.validate(["address","blockNumberOrTag"],[t,r]),e.send({method:"eth_getCode",params:[t,r]})}))},t.sign=function(e,t,r){return n(this,void 0,void 0,(function*(){return i.validator.validate(["address","hex"],[t,r]),e.send({method:"eth_sign",params:[t,r]})}))},t.signTransaction=function(e,t){return n(this,void 0,void 0,(function*(){return e.send({method:"eth_signTransaction",params:[t]})}))},t.sendTransaction=function(e,t){return n(this,void 0,void 0,(function*(){return e.send({method:"eth_sendTransaction",params:[t]})}))},t.sendRawTransaction=function(e,t){return n(this,void 0,void 0,(function*(){return i.validator.validate(["hex"],[t]),e.send({method:"eth_sendRawTransaction",params:[t]})}))},t.call=function(e,t,r){return n(this,void 0,void 0,(function*(){return i.validator.validate(["blockNumberOrTag"],[r]),e.send({method:"eth_call",params:[t,r]})}))},t.estimateGas=function(e,t,r){return n(this,void 0,void 0,(function*(){return i.validator.validate(["blockNumberOrTag"],[r]),e.send({method:"eth_estimateGas",params:[t,r]})}))},t.getBlockByHash=function(e,t,r){return n(this,void 0,void 0,(function*(){return i.validator.validate(["bytes32","bool"],[t,r]),e.send({method:"eth_getBlockByHash",params:[t,r]})}))},t.getBlockByNumber=function(e,t,r){return n(this,void 0,void 0,(function*(){return i.validator.validate(["blockNumberOrTag","bool"],[t,r]),e.send({method:"eth_getBlockByNumber",params:[t,r]})}))},t.getTransactionByHash=function(e,t){return n(this,void 0,void 0,(function*(){return i.validator.validate(["bytes32"],[t]),e.send({method:"eth_getTransactionByHash",params:[t]})}))},t.getTransactionByBlockHashAndIndex=function(e,t,r){return n(this,void 0,void 0,(function*(){return i.validator.validate(["bytes32","hex"],[t,r]),e.send({method:"eth_getTransactionByBlockHashAndIndex",params:[t,r]})}))},t.getTransactionByBlockNumberAndIndex=function(e,t,r){return n(this,void 0,void 0,(function*(){return i.validator.validate(["blockNumberOrTag","hex"],[t,r]),e.send({method:"eth_getTransactionByBlockNumberAndIndex",params:[t,r]})}))},t.getTransactionReceipt=function(e,t){return n(this,void 0,void 0,(function*(){return i.validator.validate(["bytes32"],[t]),e.send({method:"eth_getTransactionReceipt",params:[t]})}))},t.getUncleByBlockHashAndIndex=function(e,t,r){return n(this,void 0,void 0,(function*(){return i.validator.validate(["bytes32","hex"],[t,r]),e.send({method:"eth_getUncleByBlockHashAndIndex",params:[t,r]})}))},t.getUncleByBlockNumberAndIndex=function(e,t,r){return n(this,void 0,void 0,(function*(){return i.validator.validate(["blockNumberOrTag","hex"],[t,r]),e.send({method:"eth_getUncleByBlockNumberAndIndex",params:[t,r]})}))},t.getCompilers=function(e){return n(this,void 0,void 0,(function*(){return e.send({method:"eth_getCompilers",params:[]})}))},t.compileSolidity=function(e,t){return n(this,void 0,void 0,(function*(){return i.validator.validate(["string"],[t]),e.send({method:"eth_compileSolidity",params:[t]})}))},t.compileLLL=function(e,t){return n(this,void 0,void 0,(function*(){return i.validator.validate(["string"],[t]),e.send({method:"eth_compileLLL",params:[t]})}))},t.compileSerpent=function(e,t){return n(this,void 0,void 0,(function*(){return i.validator.validate(["string"],[t]),e.send({method:"eth_compileSerpent",params:[t]})}))},t.newFilter=function(e,t){return n(this,void 0,void 0,(function*(){return i.validator.validate(["filter"],[t]),e.send({method:"eth_newFilter",params:[t]})}))},t.newBlockFilter=function(e){return n(this,void 0,void 0,(function*(){return e.send({method:"eth_newBlockFilter",params:[]})}))},t.newPendingTransactionFilter=function(e){return n(this,void 0,void 0,(function*(){return e.send({method:"eth_newPendingTransactionFilter",params:[]})}))},t.uninstallFilter=function(e,t){return n(this,void 0,void 0,(function*(){return i.validator.validate(["hex"],[t]),e.send({method:"eth_uninstallFilter",params:[t]})}))},t.getFilterChanges=function(e,t){return n(this,void 0,void 0,(function*(){return i.validator.validate(["hex"],[t]),e.send({method:"eth_getFilterChanges",params:[t]})}))},t.getFilterLogs=function(e,t){return n(this,void 0,void 0,(function*(){return i.validator.validate(["hex"],[t]),e.send({method:"eth_getFilterLogs",params:[t]})}))},t.getLogs=function(e,t){return n(this,void 0,void 0,(function*(){return i.validator.validate(["filter"],[t]),e.send({method:"eth_getLogs",params:[t]})}))},t.getWork=function(e){return n(this,void 0,void 0,(function*(){return e.send({method:"eth_getWork",params:[]})}))},t.submitWork=function(e,t,r,o){return n(this,void 0,void 0,(function*(){return i.validator.validate(["bytes8","bytes32","bytes32"],[t,r,o]),e.send({method:"eth_submitWork",params:[t,r,o]})}))},t.submitHashrate=function(e,t,r){return n(this,void 0,void 0,(function*(){return i.validator.validate(["bytes32","bytes32"],[t,r]),e.send({method:"eth_submitHashrate",params:[t,r]})}))},t.getFeeHistory=function(e,t,r,o){return n(this,void 0,void 0,(function*(){i.validator.validate(["hex","blockNumberOrTag"],[t,r]);for(const e of o)i.validator.validate(["number"],[e]);return e.send({method:"eth_feeHistory",params:[t,r,o]})}))},t.getPendingTransactions=function(e){return n(this,void 0,void 0,(function*(){return e.send({method:"eth_pendingTransactions",params:[]})}))},t.requestAccounts=function(e){return n(this,void 0,void 0,(function*(){return e.send({method:"eth_requestAccounts",params:[]})}))},t.getChainId=function(e){return n(this,void 0,void 0,(function*(){return e.send({method:"eth_chainId",params:[]})}))},t.getProof=function(e,t,r,o){return n(this,void 0,void 0,(function*(){return i.validator.validate(["address","bytes32[]","blockNumberOrTag"],[t,r,o]),e.send({method:"eth_getProof",params:[t,r,o]})}))},t.getNodeInfo=function(e){return n(this,void 0,void 0,(function*(){return e.send({method:"web3_clientVersion",params:[]})}))},t.createAccessList=function(e,t,r){return n(this,void 0,void 0,(function*(){return i.validator.validate(["blockNumberOrTag"],[r]),e.send({method:"eth_createAccessList",params:[t,r]})}))},t.signTypedData=function(e,t,r,o=!1){return n(this,void 0,void 0,(function*(){return i.validator.validate(["address"],[t]),e.send({method:"eth_signTypedData"+(o?"":"_v4"),params:[t,r]})}))}},1181:function(e,t,r){"use strict";var n=this&&this.__createBinding||(Object.create?function(e,t,r,n){void 0===n&&(n=r);var i=Object.getOwnPropertyDescriptor(t,r);i&&!("get"in i?!t.__esModule:i.writable||i.configurable)||(i={enumerable:!0,get:function(){return t[r]}}),Object.defineProperty(e,n,i)}:function(e,t,r,n){void 0===n&&(n=r),e[n]=t[r]}),i=this&&this.__setModuleDefault||(Object.create?function(e,t){Object.defineProperty(e,"default",{enumerable:!0,value:t})}:function(e,t){e.default=t}),o=this&&this.__importStar||function(e){if(e&&e.__esModule)return e;var t={};if(null!=e)for(var r in e)"default"!==r&&Object.prototype.hasOwnProperty.call(e,r)&&n(t,e,r);return i(t,e),t};Object.defineProperty(t,"__esModule",{value:!0}),t.personalRpcMethods=t.netRpcMethods=t.ethRpcMethods=void 0;const s=o(r(9298));t.ethRpcMethods=s;const a=o(r(9960));t.netRpcMethods=a;const c=o(r(6745));t.personalRpcMethods=c},9960:function(e,t){"use strict";var r=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.isListening=t.getPeerCount=t.getId=void 0,t.getId=function(e){return r(this,void 0,void 0,(function*(){return e.send({method:"net_version",params:[]})}))},t.getPeerCount=function(e){return r(this,void 0,void 0,(function*(){return e.send({method:"net_peerCount",params:[]})}))},t.isListening=function(e){return r(this,void 0,void 0,(function*(){return e.send({method:"net_listening",params:[]})}))}},6745:function(e,t){"use strict";var r=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.ecRecover=t.sign=t.signTransaction=t.sendTransaction=t.importRawKey=t.lockAccount=t.unlockAccount=t.newAccount=t.getAccounts=void 0,t.getAccounts=e=>r(void 0,void 0,void 0,(function*(){return e.send({method:"personal_listAccounts",params:[]})})),t.newAccount=(e,t)=>r(void 0,void 0,void 0,(function*(){return e.send({method:"personal_newAccount",params:[t]})})),t.unlockAccount=(e,t,n,i)=>r(void 0,void 0,void 0,(function*(){return e.send({method:"personal_unlockAccount",params:[t,n,i]})})),t.lockAccount=(e,t)=>r(void 0,void 0,void 0,(function*(){return e.send({method:"personal_lockAccount",params:[t]})})),t.importRawKey=(e,t,n)=>r(void 0,void 0,void 0,(function*(){return e.send({method:"personal_importRawKey",params:[t,n]})})),t.sendTransaction=(e,t,n)=>r(void 0,void 0,void 0,(function*(){return e.send({method:"personal_sendTransaction",params:[t,n]})})),t.signTransaction=(e,t,n)=>r(void 0,void 0,void 0,(function*(){return e.send({method:"personal_signTransaction",params:[t,n]})})),t.sign=(e,t,n,i)=>r(void 0,void 0,void 0,(function*(){return e.send({method:"personal_sign",params:[t,n,i]})})),t.ecRecover=(e,t,n)=>r(void 0,void 0,void 0,(function*(){return e.send({method:"personal_ecRecover",params:[t,n]})}))},6325:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0})},5529:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0})},2453:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0})},2856:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0})},6877:(e,t)=>{"use strict";var r,n;Object.defineProperty(t,"__esModule",{value:!0}),t.ETH_DATA_FORMAT=t.DEFAULT_RETURN_FORMAT=t.FMT_BYTES=t.FMT_NUMBER=void 0,function(e){e.NUMBER="NUMBER_NUMBER",e.HEX="NUMBER_HEX",e.STR="NUMBER_STR",e.BIGINT="NUMBER_BIGINT"}(r=t.FMT_NUMBER||(t.FMT_NUMBER={})),function(e){e.HEX="BYTES_HEX",e.UINT8ARRAY="BYTES_UINT8ARRAY"}(n=t.FMT_BYTES||(t.FMT_BYTES={})),t.DEFAULT_RETURN_FORMAT={number:r.BIGINT,bytes:n.HEX},t.ETH_DATA_FORMAT={number:r.HEX,bytes:n.HEX}},9779:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0})},1517:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0})},8223:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0})},4205:(e,t)=>{"use strict";var r,n;Object.defineProperty(t,"__esModule",{value:!0}),t.HardforksOrdered=t.BlockTags=void 0,(n=t.BlockTags||(t.BlockTags={})).EARLIEST="earliest",n.LATEST="latest",n.PENDING="pending",n.SAFE="safe",n.FINALIZED="finalized",(r=t.HardforksOrdered||(t.HardforksOrdered={})).chainstart="chainstart",r.frontier="frontier",r.homestead="homestead",r.dao="dao",r.tangerineWhistle="tangerineWhistle",r.spuriousDragon="spuriousDragon",r.byzantium="byzantium",r.constantinople="constantinople",r.petersburg="petersburg",r.istanbul="istanbul",r.muirGlacier="muirGlacier",r.berlin="berlin",r.london="london",r.altair="altair",r.arrowGlacier="arrowGlacier",r.grayGlacier="grayGlacier",r.bellatrix="bellatrix",r.merge="merge",r.capella="capella",r.shanghai="shanghai"},9970:function(e,t,r){"use strict";var n=this&&this.__createBinding||(Object.create?function(e,t,r,n){void 0===n&&(n=r);var i=Object.getOwnPropertyDescriptor(t,r);i&&!("get"in i?!t.__esModule:i.writable||i.configurable)||(i={enumerable:!0,get:function(){return t[r]}}),Object.defineProperty(e,n,i)}:function(e,t,r,n){void 0===n&&(n=r),e[n]=t[r]}),i=this&&this.__exportStar||function(e,t){for(var r in e)"default"===r||Object.prototype.hasOwnProperty.call(t,r)||n(t,e,r)};Object.defineProperty(t,"__esModule",{value:!0}),i(r(9779),t),i(r(6325),t),i(r(2453),t),i(r(2856),t),i(r(5529),t),i(r(6877),t),i(r(4205),t),i(r(1517),t),i(r(8223),t),i(r(2196),t),i(r(8887),t),i(r(8173),t),i(r(1040),t),i(r(5640),t),i(r(1436),t),i(r(4933),t)},2196:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0})},8887:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.TypedArray=void 0,t.TypedArray=Object.getPrototypeOf(Uint8Array)},8173:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0})},1040:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0})},5640:function(e,t){"use strict";var r=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.Web3BaseProvider=void 0;const n=Symbol.for("web3/base-provider");class i{static isWeb3Provider(e){return e instanceof i||Boolean(e&&e[n])}get[n](){return!0}send(e,t){this.request(e).then((e=>{t(null,e)})).catch((e=>{t(e)}))}sendAsync(e){return r(this,void 0,void 0,(function*(){return this.request(e)}))}asEIP1193Provider(){const e=Object.create(this),t=e.request;return e.request=function(e){return r(this,void 0,void 0,(function*(){return(yield t(e)).result}))},e.asEIP1193Provider=void 0,e}}t.Web3BaseProvider=i},1436:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.Web3BaseWallet=void 0,t.Web3BaseWallet=class extends Array{constructor(e){super(),this._accountProvider=e}}},4933:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0})},4108:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.ChunkResponseParser=void 0;const n=r(5071);t.ChunkResponseParser=class{constructor(e,t){this.eventEmitter=e,this.autoReconnect=t}clearQueues(){"function"==typeof this._clearQueues&&this._clearQueues()}onError(e){this._clearQueues=e}parseResponse(e){const t=[];return e.replace(/\}[\n\r]?\{/g,"}|--|{").replace(/\}\][\n\r]?\[\{/g,"}]|--|[{").replace(/\}[\n\r]?\[\{/g,"}|--|[{").replace(/\}\][\n\r]?\{/g,"}]|--|{").split("|--|").forEach((e=>{let r,i=e;this.lastChunk&&(i=this.lastChunk+i);try{r=JSON.parse(i)}catch(e){return this.lastChunk=i,this.lastChunkTimeout&&clearTimeout(this.lastChunkTimeout),void(this.lastChunkTimeout=setTimeout((()=>{this.autoReconnect||(this.clearQueues(),this.eventEmitter.emit("error",new n.InvalidResponseError({id:1,jsonrpc:"2.0",error:{code:2,message:"Chunk timeout"}})))}),15e3))}clearTimeout(this.lastChunkTimeout),this.lastChunk=void 0,r&&t.push(r)})),t}}},7086:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.toBool=t.toChecksumAddress=t.toWei=t.fromWei=t.toBigInt=t.toNumber=t.toHex=t.toAscii=t.hexToAscii=t.fromAscii=t.asciiToHex=t.hexToString=t.utf8ToBytes=t.toUtf8=t.hexToUtf8=t.stringToHex=t.fromUtf8=t.utf8ToHex=t.hexToNumberString=t.fromDecimal=t.numberToHex=t.toDecimal=t.hexToNumber=t.hexToBytes=t.bytesToHex=t.bytesToUint8Array=t.ethUnitMap=void 0;const n=r(3687),i=r(5487),o=r(7345),s=r(5071);t.ethUnitMap={noether:BigInt(0),wei:BigInt(1),kwei:BigInt(1e3),Kwei:BigInt(1e3),babbage:BigInt(1e3),femtoether:BigInt(1e3),mwei:BigInt(1e6),Mwei:BigInt(1e6),lovelace:BigInt(1e6),picoether:BigInt(1e6),gwei:BigInt(1e9),Gwei:BigInt(1e9),shannon:BigInt(1e9),nanoether:BigInt(1e9),nano:BigInt(1e9),szabo:BigInt(1e12),microether:BigInt(1e12),micro:BigInt(1e12),finney:BigInt(1e15),milliether:BigInt(1e15),milli:BigInt(1e15),ether:BigInt("1000000000000000000"),kether:BigInt("1000000000000000000000"),grand:BigInt("1000000000000000000000"),mether:BigInt("1000000000000000000000000"),gether:BigInt("1000000000000000000000000000"),tether:BigInt("1000000000000000000000000000000")},t.bytesToUint8Array=e=>{if(o.validator.validate(["bytes"],[e]),e instanceof Uint8Array)return e;if(Array.isArray(e))return new Uint8Array(e);if("string"==typeof e)return o.utils.hexToUint8Array(e);throw new s.InvalidBytesError(e)};const{uint8ArrayToHexString:a}=o.utils;t.bytesToHex=e=>a((0,t.bytesToUint8Array)(e)),t.hexToBytes=e=>"string"==typeof e&&"0x"!==e.slice(0,2).toLowerCase()?(0,t.bytesToUint8Array)(`0x${e}`):(0,t.bytesToUint8Array)(e),t.hexToNumber=e=>(o.validator.validate(["hex"],[e]),o.utils.hexToNumber(e)),t.toDecimal=t.hexToNumber,t.numberToHex=(e,t)=>{"bigint"!=typeof e&&o.validator.validate(["int"],[e]);let r=o.utils.numberToHex(e);return t&&(r.startsWith("-")||r.length%2!=1?r.length%2==0&&r.startsWith("-")&&(r="-0x0".concat(r.slice(3))):r="0x0".concat(r.slice(2))),r},t.fromDecimal=t.numberToHex,t.hexToNumberString=e=>(0,t.hexToNumber)(e).toString(),t.utf8ToHex=e=>{o.validator.validate(["string"],[e]);let r=e.replace(/^(?:\u0000)/,"");return r=r.replace(/(?:\u0000)$/,""),(0,t.bytesToHex)((new TextEncoder).encode(r))},t.fromUtf8=t.utf8ToHex,t.stringToHex=t.utf8ToHex,t.hexToUtf8=e=>(0,i.bytesToUtf8)((0,t.hexToBytes)(e)),t.toUtf8=e=>"string"==typeof e?(0,t.hexToUtf8)(e):(o.validator.validate(["bytes"],[e]),(0,i.bytesToUtf8)(e)),t.utf8ToBytes=i.utf8ToBytes,t.hexToString=t.hexToUtf8,t.asciiToHex=e=>{o.validator.validate(["string"],[e]);let t="";for(let r=0;r<e.length;r+=1){const n=e.charCodeAt(r).toString(16);t+=n.length%2!=0?`0${n}`:n}return`0x${t}`},t.fromAscii=t.asciiToHex,t.hexToAscii=e=>new TextDecoder("ascii").decode((0,t.hexToBytes)(e)),t.toAscii=t.hexToAscii,t.toHex=(e,r)=>{if("string"==typeof e&&(0,o.isAddress)(e))return r?"address":`0x${e.toLowerCase().replace(/^0x/i,"")}`;if("boolean"==typeof e)return r?"bool":e?"0x01":"0x00";if("number"==typeof e)return r?e<0?"int256":"uint256":(0,t.numberToHex)(e);if("bigint"==typeof e)return r?"bigint":(0,t.numberToHex)(e);if("object"==typeof e&&e)return r?"string":(0,t.utf8ToHex)(JSON.stringify(e));if("string"==typeof e){if(e.startsWith("-0x")||e.startsWith("-0X"))return r?"int256":(0,t.numberToHex)(e);if((0,o.isHexStrict)(e))return r?"bytes":e;if((0,o.isHex)(e)&&!(0,o.isInt)(e))return r?"bytes":`0x${e}`;if(!Number.isFinite(e))return r?"string":(0,t.utf8ToHex)(e)}throw new s.HexProcessingError(e)},t.toNumber=e=>{if("number"==typeof e)return e;if("bigint"==typeof e)return e>=Number.MIN_SAFE_INTEGER&&e<=Number.MAX_SAFE_INTEGER?Number(e):e;if("string"==typeof e&&(0,o.isHexStrict)(e))return(0,t.hexToNumber)(e);try{return(0,t.toNumber)(BigInt(e))}catch(t){throw new s.InvalidNumberError(e)}},t.toBigInt=e=>{if("number"==typeof e)return BigInt(e);if("bigint"==typeof e)return e;if("string"==typeof e&&(0,o.isHex)(e))return e.startsWith("-")?-BigInt(e.substring(1)):BigInt(e);throw new s.InvalidNumberError(e)},t.fromWei=(e,r)=>{const n=t.ethUnitMap[r];if(!n)throw new s.InvalidUnitError(r);const i=String((0,t.toNumber)(e)),o=n.toString().length-1;if(o<=0)return i.toString();const a=i.padStart(o,"0"),c=a.slice(0,-o),u=a.slice(-o).replace(/\.?0+$/,"");return""===c?`0.${u}`:""===u?c:`${c}.${u}`},t.toWei=(e,r)=>{o.validator.validate(["number"],[e]);const n=t.ethUnitMap[r];if(!n)throw new s.InvalidUnitError(r);const[i,a]=String("string"!=typeof e||(0,o.isHexStrict)(e)?(0,t.toNumber)(e):e).split(".").concat(""),c=BigInt(`${i}${a}`)*n,u=n.toString().length-1,d=Math.min(a.length,u);return 0===d?c.toString():c.toString().padStart(d,"0").slice(0,-d)},t.toChecksumAddress=e=>{if(!(0,o.isAddress)(e,!1))throw new s.InvalidAddressError(e);const r=e.toLowerCase().replace(/^0x/i,""),i=o.utils.uint8ArrayToHexString((0,n.keccak256)((0,t.utf8ToBytes)(r)));if((0,o.isNullish)(i)||"0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"===i)return"";let a="0x";const c=i.replace(/^0x/i,"");for(let e=0;e<r.length;e+=1)parseInt(c[e],16)>7?a+=r[e].toUpperCase():a+=r[e];return a},t.toBool=e=>{if("boolean"==typeof e)return e;if("number"==typeof e&&(0===e||1===e))return Boolean(e);if("bigint"==typeof e&&(e===BigInt(0)||e===BigInt(1)))return Boolean(e);if("string"==typeof e&&!(0,o.isHexStrict)(e)&&("1"===e||"0"===e||"false"===e||"true"===e))return"true"===e||"false"!==e&&Boolean(Number(e));if("string"==typeof e&&(0,o.isHexStrict)(e)&&("0x1"===e||"0x0"===e))return Boolean((0,t.toNumber)(e));throw new s.InvalidBooleanError(e)}},8512:function(e,t,r){"use strict";var n=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.EventEmitter=void 0;const i=r(2699);class o extends EventTarget{constructor(){super(...arguments),this._listeners={},this.maxListeners=Number.MAX_SAFE_INTEGER}on(e,t){return this.addEventListener(e,t),this}once(e,t){const r=i=>n(this,void 0,void 0,(function*(){this.off(e,r),yield t(i)}));return this.on(e,r)}off(e,t){return this.removeEventListener(e,t),this}emit(e,t){const r=new CustomEvent(e,{detail:t});return super.dispatchEvent(r)}listenerCount(e){const t=this._listeners[e];return t?t.length:0}listeners(e){return this._listeners[e].map((e=>e[0]))||[]}eventNames(){return Object.keys(this._listeners)}removeAllListeners(){return Object.keys(this._listeners).forEach((e=>{this._listeners[e].forEach((t=>{super.removeEventListener(e,t[1])}))})),this._listeners={},this}setMaxListeners(e){return this.maxListeners=e,this}getMaxListeners(){return this.maxListeners}addEventListener(e,t){const r=(e=>t=>e(t.detail))(t);super.addEventListener(e,r),this._listeners[e]||(this._listeners[e]=[]),this._listeners[e].push([t,r])}removeEventListener(e,t){const r=this._listeners[e];if(r){const n=r.findIndex((e=>e[0]===t));-1!==n&&(super.removeEventListener(e,r[n][1]),r.splice(n,1))}}}let s;s="undefined"==typeof window?i.EventEmitter:o,t.EventEmitter=class extends s{}},3065:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.format=t.convert=t.convertScalarValue=t.isDataFormat=void 0;const n=r(5071),i=r(9970),o=r(7345),s=r(7086),a=r(7151),c=r(2557),u=r(7541),{parseBaseType:d}=o.utils;t.isDataFormat=e=>"object"==typeof e&&!(0,o.isNullish)(e)&&"number"in e&&"bytes"in e;const l=(e,t,r=[])=>{let n,i=Object.assign({},e);for(const e of t){if(i.oneOf&&n){const e=r.find((function(e){return this===e[0]}),null!=n?n:"");e&&e[0]===n&&(i=i.oneOf[e[1]])}if(!i.properties&&!i.items)return;if(i.properties)i=i.properties[e];else if(i.items&&i.items.properties){const t=i.items.properties;if(!t)return;i=t[e]}else i.items&&(0,o.isObject)(i.items)?i=i.items:i.items&&Array.isArray(i.items)&&(i=i.items[parseInt(e,10)]);i&&e&&(n=e)}return i};t.convertScalarValue=(e,t,r)=>{try{const{baseType:o,baseTypeSize:a}=d(t);if("int"===o||"uint"===o)switch(r.number){case i.FMT_NUMBER.NUMBER:return Number((0,s.toBigInt)(e));case i.FMT_NUMBER.HEX:return(0,s.numberToHex)((0,s.toBigInt)(e));case i.FMT_NUMBER.STR:return(0,s.toBigInt)(e).toString();case i.FMT_NUMBER.BIGINT:return(0,s.toBigInt)(e);default:throw new n.FormatterError(`Invalid format: ${String(r.number)}`)}if("bytes"===o){let t;switch(a?"string"==typeof e?t=(0,c.padLeft)(e,2*a):e instanceof Uint8Array&&(t=(0,u.uint8ArrayConcat)(new Uint8Array(a-e.length),e)):t=e,r.bytes){case i.FMT_BYTES.HEX:return(0,s.bytesToHex)((0,s.bytesToUint8Array)(t));case i.FMT_BYTES.UINT8ARRAY:return(0,s.bytesToUint8Array)(t);default:throw new n.FormatterError(`Invalid format: ${String(r.bytes)}`)}}}catch(t){return e}return e},t.convert=(e,r,n,i,s=[])=>{var a,c;if(!(0,o.isObject)(e)&&!Array.isArray(e))return(0,t.convertScalarValue)(e,null==r?void 0:r.format,i);const u=e;for(const[e,d]of Object.entries(u)){n.push(e);const h=l(r,n,s);if((0,o.isNullish)(h))delete u[e],n.pop();else if((0,o.isObject)(d))(0,t.convert)(d,r,n,i),n.pop();else{if(Array.isArray(d)){let l=h;if(void 0!==(null==h?void 0:h.oneOf)&&h.oneOf.forEach(((t,r)=>{var n,i;!Array.isArray(null==h?void 0:h.items)&&("object"==typeof d[0]&&"object"===(null===(n=null==t?void 0:t.items)||void 0===n?void 0:n.type)||"string"==typeof d[0]&&"object"!==(null===(i=null==t?void 0:t.items)||void 0===i?void 0:i.type))&&(l=t,s.push([e,r]))})),(0,o.isNullish)(null==l?void 0:l.items)){delete u[e],n.pop();continue}if((0,o.isObject)(l.items)&&!(0,o.isNullish)(l.items.format)){for(let r=0;r<d.length;r+=1)u[e][r]=(0,t.convertScalarValue)(d[r],null===(a=null==l?void 0:l.items)||void 0===a?void 0:a.format,i);n.pop();continue}if(!Array.isArray(null==l?void 0:l.items)&&"object"===(null===(c=null==l?void 0:l.items)||void 0===c?void 0:c.type)){for(const e of d)(0,t.convert)(e,r,n,i,s);n.pop();continue}if(Array.isArray(null==l?void 0:l.items)){for(let r=0;r<d.length;r+=1)u[e][r]=(0,t.convertScalarValue)(d[r],l.items[r].format,i);n.pop();continue}}u[e]=(0,t.convertScalarValue)(d,h.format,i),n.pop()}}return u},t.format=(e,r,i)=>{let s;s=(0,o.isObject)(r)?(0,a.mergeDeep)({},r):Array.isArray(r)?[...r]:r;const c=(0,o.isObject)(e)?e:o.utils.ethAbiToJsonSchema(e);if(!c.properties&&!c.items&&!c.format)throw new n.FormatterError("Invalid json schema for formatting");return(0,t.convert)(s,c,[],i)}},3561:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.getStorageSlotNumForLongString=t.soliditySha3Raw=t.soliditySha3=t.encodePacked=t.processSolidityEncodePackedArgs=t.keccak256=t.keccak256Wrapper=t.sha3Raw=t.sha3=void 0;const n=r(3687),i=r(5487),o=r(5071),s=r(7345),a=r(7086),c=r(2557),u="0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";t.sha3=e=>{let t;t="string"==typeof e?e.startsWith("0x")&&(0,s.isHexStrict)(e)?(0,a.hexToBytes)(e):(0,i.utf8ToBytes)(e):e;const r=(0,a.bytesToHex)((0,n.keccak256)(t));return r===u?void 0:r},t.sha3Raw=e=>{const r=(0,t.sha3)(e);return(0,s.isNullish)(r)?u:r},t.keccak256Wrapper=e=>{let t;return t="bigint"==typeof e||"number"==typeof e?(0,i.utf8ToBytes)(e.toString()):Array.isArray(e)?new Uint8Array(e):"string"!=typeof e||(0,s.isHexStrict)(e)?(0,a.bytesToUint8Array)(e):(0,i.utf8ToBytes)(e),(0,a.bytesToHex)((0,n.keccak256)(t))},t.keccak256=t.keccak256Wrapper;const d=(e,t)=>{const r=/^(\d+).*$/.exec(e.slice(t));return r?parseInt(r[1],10):0},l=e=>e.toString(2).length,h=(e,t)=>{const r=t.toString();if("string"===e){if("string"==typeof t)return(0,a.utf8ToHex)(t);throw new o.InvalidStringError(t)}if("bool"===e||"boolean"===e){if("boolean"==typeof t)return t?"01":"00";throw new o.InvalidBooleanError(t)}if("address"===e){if(!(0,s.isAddress)(r))throw new o.InvalidAddressError(r);return r}const n=(e=>e.startsWith("int[")?`int256${e.slice(3)}`:"int"===e?"int256":e.startsWith("uint[")?`uint256'${e.slice(4)}`:"uint"===e?"uint256":e)(e);if(e.startsWith("uint")){const e=d(n,"uint".length);if(e%8||e<8||e>256)throw new o.InvalidSizeError(r);const t=(0,a.toNumber)(r);if(l(t)>e)throw new o.InvalidLargeValueError(r);if(t<BigInt(0))throw new o.InvalidUnsignedIntegerError(r);return e?(0,c.leftPad)(t.toString(16),e/8*2):t.toString(16)}if(e.startsWith("int")){const t=d(n,"int".length);if(t%8||t<8||t>256)throw new o.InvalidSizeError(e);const i=(0,a.toNumber)(r);if(l(i)>t)throw new o.InvalidLargeValueError(r);return i<BigInt(0)?(0,c.toTwosComplement)(i.toString(),t/8*2):t?(0,c.leftPad)(i.toString(16),t/4):i.toString(16)}if("bytes"===n){if(r.replace(/^0x/i,"").length%2!=0)throw new o.InvalidBytesError(r);return r}if(e.startsWith("bytes")){if(r.replace(/^0x/i,"").length%2!=0)throw new o.InvalidBytesError(r);const t=d(e,"bytes".length);if(!t||t<1||t>64||t<r.replace(/^0x/i,"").length/2)throw new o.InvalidBytesError(r);return(0,c.rightPad)(r,2*t)}return""};t.processSolidityEncodePackedArgs=e=>{const[t,r]=(e=>{if(Array.isArray(e))throw new Error("Autodetection of array types is not supported.");let t,r;if("object"==typeof e&&("t"in e||"type"in e)&&("v"in e||"value"in e))t="t"in e?e.t:e.type,r="v"in e?e.v:e.value,t="bigint"===t.toLowerCase()?"int":t;else{if("bigint"==typeof e)return["int",e];t=(0,a.toHex)(e,!0),r=(0,a.toHex)(e),t.startsWith("int")||t.startsWith("uint")||(t="bytes")}return!t.startsWith("int")&&!t.startsWith("uint")||"string"!=typeof r||/^(-)?0x/i.test(r)||(r=(0,a.toBigInt)(r)),[t,r]})(e);return Array.isArray(r)?r.map((e=>h(t,e).replace("0x",""))).join(""):h(t,r).replace("0x","")},t.encodePacked=(...e)=>`0x${Array.prototype.slice.call(e).map(t.processSolidityEncodePackedArgs).join("").toLowerCase()}`,t.soliditySha3=(...e)=>(0,t.sha3)((0,t.encodePacked)(...e)),t.soliditySha3Raw=(...e)=>(0,t.sha3Raw)((0,t.encodePacked)(...e)),t.getStorageSlotNumForLongString=e=>(0,t.sha3)(`0x${("number"==typeof e?e.toString():e).padStart(64,"0")}`)},9634:function(e,t,r){"use strict";var n=this&&this.__createBinding||(Object.create?function(e,t,r,n){void 0===n&&(n=r);var i=Object.getOwnPropertyDescriptor(t,r);i&&!("get"in i?!t.__esModule:i.writable||i.configurable)||(i={enumerable:!0,get:function(){return t[r]}}),Object.defineProperty(e,n,i)}:function(e,t,r,n){void 0===n&&(n=r),e[n]=t[r]}),i=this&&this.__setModuleDefault||(Object.create?function(e,t){Object.defineProperty(e,"default",{enumerable:!0,value:t})}:function(e,t){e.default=t}),o=this&&this.__exportStar||function(e,t){for(var r in e)"default"===r||Object.prototype.hasOwnProperty.call(t,r)||n(t,e,r)},s=this&&this.__importStar||function(e){if(e&&e.__esModule)return e;var t={};if(null!=e)for(var r in e)"default"!==r&&Object.prototype.hasOwnProperty.call(e,r)&&n(t,e,r);return i(t,e),t};Object.defineProperty(t,"__esModule",{value:!0}),t.jsonRpc=void 0,o(r(7086),t),o(r(8512),t),o(r(4578),t),o(r(3065),t),o(r(3561),t),o(r(4822),t),o(r(2557),t),o(r(7151),t),o(r(3718),t),o(r(9250),t),t.jsonRpc=s(r(9250)),o(r(6982),t),o(r(4108),t),o(r(7717),t),o(r(997),t),o(r(222),t),o(r(7541),t)},9250:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.isBatchRequest=t.toBatchPayload=t.toPayload=t.setRequestIdStart=t.isBatchResponse=t.isValidResponse=t.validateResponse=t.isSubscriptionResult=t.isResponseWithNotification=t.isResponseWithError=t.isResponseWithResult=t.isResponseRpcError=void 0;const n=r(7345),i=r(5071),o=r(7717);let s;t.isResponseRpcError=e=>{const t=e.error.code;return i.rpcErrorsMap.has(t)||t>=-32099&&t<=-32e3},t.isResponseWithResult=e=>!Array.isArray(e)&&!!e&&"2.0"===e.jsonrpc&&"result"in e&&(0,n.isNullish)(e.error)&&("number"==typeof e.id||"string"==typeof e.id),t.isResponseWithError=e=>!Array.isArray(e)&&"2.0"===e.jsonrpc&&!!e&&(0,n.isNullish)(e.result)&&"error"in e&&("number"==typeof e.id||"string"==typeof e.id),t.isResponseWithNotification=e=>!(Array.isArray(e)||!e||"2.0"!==e.jsonrpc||(0,n.isNullish)(e.params)||(0,n.isNullish)(e.method)),t.isSubscriptionResult=e=>!Array.isArray(e)&&!!e&&"2.0"===e.jsonrpc&&"id"in e&&"result"in e,t.validateResponse=e=>(0,t.isResponseWithResult)(e)||(0,t.isResponseWithError)(e),t.isValidResponse=e=>Array.isArray(e)?e.every(t.validateResponse):(0,t.validateResponse)(e),t.isBatchResponse=e=>Array.isArray(e)&&e.length>0&&(0,t.isValidResponse)(e),t.setRequestIdStart=e=>{s=e},t.toPayload=e=>{var t,r,n,i;return void 0!==s&&(s+=1),{jsonrpc:null!==(t=e.jsonrpc)&&void 0!==t?t:"2.0",id:null!==(n=null!==(r=e.id)&&void 0!==r?r:s)&&void 0!==n?n:(0,o.uuidV4)(),method:e.method,params:null!==(i=e.params)&&void 0!==i?i:void 0}},t.toBatchPayload=e=>e.map((e=>(0,t.toPayload)(e))),t.isBatchRequest=e=>Array.isArray(e)&&e.length>0},7151:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.mergeDeep=void 0;const n=r(9970),i=r(7345),o=e=>!("object"!=typeof e||(0,i.isNullish)(e)||Array.isArray(e)||e instanceof n.TypedArray);t.mergeDeep=(e,...r)=>{const s=e;if(!o(s))return s;for(const e of r)for(const r in e)o(e[r])?(s[r]||(s[r]={}),(0,t.mergeDeep)(s[r],e[r])):!(0,i.isNullish)(e[r])&&Object.hasOwnProperty.call(e,r)&&(Array.isArray(e[r])||e[r]instanceof n.TypedArray?s[r]=e[r].slice(0):s[r]=e[r]);return s}},3718:function(e,t,r){"use strict";var n=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.rejectIfConditionAtInterval=t.rejectIfTimeout=t.pollTillDefined=t.pollTillDefinedAndReturnIntervalId=t.waitWithTimeout=t.isPromise=void 0;const i=r(7345);function o(e,t,r){return n(this,void 0,void 0,(function*(){let n;const i=yield Promise.race([e instanceof Promise?e:e(),new Promise(((e,i)=>{n=setTimeout((()=>r?i(r):e(void 0)),t)}))]);if(n&&clearTimeout(n),i instanceof Error)throw i;return i}))}function s(e,t){let r;return[new Promise(((s,a)=>{r=setInterval(function c(){return(()=>{n(this,void 0,void 0,(function*(){try{const n=yield o(e,t);(0,i.isNullish)(n)||(clearInterval(r),s(n))}catch(e){clearInterval(r),a(e)}}))})(),c}(),t)})),r]}t.isPromise=function(e){return("object"==typeof e||"function"==typeof e)&&"function"==typeof e.then},t.waitWithTimeout=o,t.pollTillDefinedAndReturnIntervalId=s,t.pollTillDefined=function(e,t){return n(this,void 0,void 0,(function*(){return s(e,t)[0]}))},t.rejectIfTimeout=function(e,t){let r;const n=new Promise(((n,i)=>{r=setTimeout((()=>{i(t)}),e)}));return[r,n]},t.rejectIfConditionAtInterval=function(e,t){let r;const i=new Promise(((i,o)=>{r=setInterval((()=>{(()=>{n(this,void 0,void 0,(function*(){const t=yield e();t&&(clearInterval(r),o(t))}))})()}),t)}));return[r,i]}},4822:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.randomHex=t.randomBytes=void 0;const n=r(1341),i=r(7086);t.randomBytes=e=>(0,n.getRandomBytesSync)(e),t.randomHex=e=>(0,i.bytesToHex)((0,t.randomBytes)(e))},222:function(e,t,r){"use strict";var n=this&&this.__createBinding||(Object.create?function(e,t,r,n){void 0===n&&(n=r);var i=Object.getOwnPropertyDescriptor(t,r);i&&!("get"in i?!t.__esModule:i.writable||i.configurable)||(i={enumerable:!0,get:function(){return t[r]}}),Object.defineProperty(e,n,i)}:function(e,t,r,n){void 0===n&&(n=r),e[n]=t[r]}),i=this&&this.__setModuleDefault||(Object.create?function(e,t){Object.defineProperty(e,"default",{enumerable:!0,value:t})}:function(e,t){e.default=t}),o=this&&this.__importStar||function(e){if(e&&e.__esModule)return e;var t={};if(null!=e)for(var r in e)"default"!==r&&Object.prototype.hasOwnProperty.call(e,r)&&n(t,e,r);return i(t,e),t},s=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.SocketProvider=void 0;const a=r(5071),c=r(997),u=r(4108),d=r(4578),l=r(6982),h=o(r(9250)),f={autoReconnect:!0,delay:5e3,maxAttempts:5};class p extends c.Eip1193Provider{constructor(e,t,r){if(super(),this._connectionStatus="connecting",this._onMessageHandler=this._onMessage.bind(this),this._onOpenHandler=this._onConnect.bind(this),this._onCloseHandler=this._onCloseEvent.bind(this),this._onErrorHandler=this._onError.bind(this),!this._validateProviderPath(e))throw new a.InvalidClientError(e);this._socketPath=e,this._socketOptions=t,this._reconnectOptions=Object.assign(Object.assign({},f),null!=r?r:{}),this._pendingRequestsQueue=new Map,this._sentRequestsQueue=new Map,this._init(),this.connect(),this.chunkResponseParser=new u.ChunkResponseParser(this._eventEmitter,this._reconnectOptions.autoReconnect),this.chunkResponseParser.onError((()=>{this._clearQueues()})),this.isReconnecting=!1}get SocketConnection(){return this._socketConnection}_init(){this._reconnectAttempts=0}connect(){try{this._openSocketConnection(),this._connectionStatus="connecting",this._addSocketListeners()}catch(e){if(!this.isReconnecting)throw this._connectionStatus="disconnected",e&&e.message?new a.ConnectionError(`Error while connecting to ${this._socketPath}. Reason: ${e.message}`):new a.InvalidClientError(this._socketPath);setImmediate((()=>{this._reconnect()}))}}_validateProviderPath(e){return!!e}supportsSubscriptions(){return!0}on(e,t){this._eventEmitter.on(e,t)}once(e,t){this._eventEmitter.once(e,t)}removeListener(e,t){this._eventEmitter.removeListener(e,t)}_onDisconnect(e,t){this._connectionStatus="disconnected",super._onDisconnect(e,t)}disconnect(e,t){const r=null!=e?e:1e3;this._removeSocketListeners(),"disconnected"!==this.getStatus()&&this._closeSocketConnection(r,t),this._onDisconnect(r,t)}removeAllListeners(e){this._eventEmitter.removeAllListeners(e)}_onError(e){this.isReconnecting?this._reconnect():this._eventEmitter.emit("error",e)}reset(){this._sentRequestsQueue.clear(),this._pendingRequestsQueue.clear(),this._init(),this._removeSocketListeners(),this._addSocketListeners()}_reconnect(){this.isReconnecting||(this.isReconnecting=!0,this._sentRequestsQueue.size>0&&this._sentRequestsQueue.forEach(((e,t)=>{e.deferredPromise.reject(new a.PendingRequestsOnReconnectingError),this._sentRequestsQueue.delete(t)})),this._reconnectAttempts<this._reconnectOptions.maxAttempts?(this._reconnectAttempts+=1,setTimeout((()=>{this._removeSocketListeners(),this.connect(),this.isReconnecting=!1}),this._reconnectOptions.delay)):(this.isReconnecting=!1,this._clearQueues(),this._removeSocketListeners(),this._eventEmitter.emit("error",new a.MaxAttemptsReachedOnReconnectingError(this._reconnectOptions.maxAttempts))))}request(e){return s(this,void 0,void 0,(function*(){if((0,d.isNullish)(this._socketConnection))throw new Error("Connection is undefined");"disconnected"===this.getStatus()&&this.connect();const t=h.isBatchRequest(e)?e[0].id:e.id;if(!t)throw new a.Web3WSProviderError("Request Id not defined");if(this._sentRequestsQueue.has(t))throw new a.RequestAlreadySentError(t);const r=new l.Web3DeferredPromise;r.catch((e=>{this._eventEmitter.emit("error",e)}));const n={payload:e,deferredPromise:r};if("connecting"===this.getStatus())return this._pendingRequestsQueue.set(t,n),n.deferredPromise;this._sentRequestsQueue.set(t,n);try{this._sendToSocket(n.payload)}catch(e){this._sentRequestsQueue.delete(t),this._eventEmitter.emit("error",e)}return r}))}_onConnect(){this._connectionStatus="connected",this._reconnectAttempts=0,super._onConnect(),this._sendPendingRequests()}_sendPendingRequests(){for(const[e,t]of this._pendingRequestsQueue.entries())this._sendToSocket(t.payload),this._pendingRequestsQueue.delete(e),this._sentRequestsQueue.set(e,t)}_onMessage(e){const t=this._parseResponses(e);if(!(0,d.isNullish)(t)&&0!==t.length)for(const e of t){if(h.isResponseWithNotification(e)&&e.method.endsWith("_subscription"))return void this._eventEmitter.emit("message",e);const t=h.isBatchResponse(e)?e[0].id:e.id,r=this._sentRequestsQueue.get(t);if(!r)return;(h.isBatchResponse(e)||h.isResponseWithResult(e)||h.isResponseWithError(e))&&(this._eventEmitter.emit("message",e),r.deferredPromise.resolve(e)),this._sentRequestsQueue.delete(t)}}_clearQueues(e){this._pendingRequestsQueue.size>0&&this._pendingRequestsQueue.forEach(((t,r)=>{t.deferredPromise.reject(new a.ConnectionNotOpenError(e)),this._pendingRequestsQueue.delete(r)})),this._sentRequestsQueue.size>0&&this._sentRequestsQueue.forEach(((t,r)=>{t.deferredPromise.reject(new a.ConnectionNotOpenError(e)),this._sentRequestsQueue.delete(r)})),this._removeSocketListeners()}}t.SocketProvider=p},2557:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.fromTwosComplement=t.toTwosComplement=t.leftPad=t.rightPad=t.padRight=t.padLeft=void 0;const n=r(5071),i=r(7345),o=r(7086);t.padLeft=(e,t,r="0")=>"string"==typeof e?(0,i.isHexStrict)(e)?i.utils.padLeft(e,t,r):e.padStart(t,r):(i.validator.validate(["int"],[e]),i.utils.padLeft(e,t,r)),t.padRight=(e,t,r="0")=>{if("string"==typeof e&&!(0,i.isHexStrict)(e))return e.padEnd(t,r);i.validator.validate(["int"],[e]);const n="string"==typeof e&&(0,i.isHexStrict)(e)?e:(0,o.numberToHex)(e),s=n.startsWith("-")?3:2;return n.padEnd(t+s,r)},t.rightPad=t.padRight,t.leftPad=t.padLeft,t.toTwosComplement=(e,r=64)=>{i.validator.validate(["int"],[e]);const s=(0,o.toNumber)(e);if(s>=0)return(0,t.padLeft)((0,o.toHex)(s),r);const a=(0,i.bigintPower)(BigInt(2),BigInt(4*r));if(-s>=a)throw new n.NibbleWidthError(`value: ${e}, nibbleWidth: ${r}`);const c=BigInt(s)+a;return(0,t.padLeft)((0,o.numberToHex)(c),r)},t.fromTwosComplement=(e,t=64)=>{i.validator.validate(["int"],[e]);const r=(0,o.toNumber)(e);if(r<0)return r;const s=Math.ceil(Math.log(Number(r))/Math.log(2));if(s>4*t)throw new n.NibbleWidthError(`value: "${e}", nibbleWidth: "${t}"`);if(4*t!==s)return r;const a=(0,i.bigintPower)(BigInt(2),BigInt(t)*BigInt(4));return(0,o.toNumber)(BigInt(r)-a)}},7541:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.uint8ArrayEquals=t.uint8ArrayConcat=void 0,t.uint8ArrayConcat=function(...e){const t=e.reduce(((e,t)=>e+t.length),0),r=new Uint8Array(t);let n=0;for(const t of e)r.set(t,n),n+=t.length;return r},t.uint8ArrayEquals=function(e,t){if(e===t)return!0;if(e.byteLength!==t.byteLength)return!1;for(let r=0;r<e.byteLength;r+=1)if(e[r]!==t[r])return!1;return!0}},7717:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.uuidV4=void 0;const n=r(7086),i=r(4822);t.uuidV4=()=>{const e=(0,i.randomBytes)(16);e[6]=15&e[6]|64,e[8]=63&e[8]|128;const t=(0,n.bytesToHex)(e);return[t.substring(2,10),t.substring(10,14),t.substring(14,18),t.substring(18,22),t.substring(22,34)].join("-")}},4578:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.isNullish=t.compareBlockNumbers=t.isTopicInBloom=t.isTopic=t.isContractAddressInBloom=t.isUserEthereumAddressInBloom=t.isInBloom=t.isBloom=t.isAddress=t.checkAddressCheckSum=t.isHex=t.isHexStrict=void 0;const n=r(5071),i=r(7345),o=r(9970);t.isHexStrict=i.isHexStrict,t.isHex=i.isHex,t.checkAddressCheckSum=i.checkAddressCheckSum,t.isAddress=i.isAddress,t.isBloom=i.isBloom,t.isInBloom=i.isInBloom,t.isUserEthereumAddressInBloom=i.isUserEthereumAddressInBloom,t.isContractAddressInBloom=i.isContractAddressInBloom,t.isTopic=i.isTopic,t.isTopicInBloom=i.isTopicInBloom,t.compareBlockNumbers=(e,t)=>{const r="string"==typeof e&&(0,i.isBlockTag)(e),s="string"==typeof t&&(0,i.isBlockTag)(t);if(e===t||("earliest"===e||0===e)&&("earliest"===t||0===t))return 0;if("earliest"===e&&t>0)return-1;if("earliest"===t&&e>0)return 1;if(r&&s){const r={[o.BlockTags.EARLIEST]:1,[o.BlockTags.FINALIZED]:2,[o.BlockTags.SAFE]:3,[o.BlockTags.LATEST]:4,[o.BlockTags.PENDING]:5};return r[e]<r[t]?-1:1}if(r&&!s||!r&&s)throw new n.InvalidBlockError("Cannot compare blocktag with provided non-blocktag input.");const a=BigInt(e),c=BigInt(t);return a<c?-1:a===c?0:1},t.isNullish=i.isNullish},6982:function(e,t,r){"use strict";var n,i=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.Web3DeferredPromise=void 0;const o=r(5071);t.Web3DeferredPromise=class{constructor({timeout:e,eagerStart:t,timeoutMessage:r}={timeout:0,eagerStart:!1,timeoutMessage:"DeferredPromise timed out"}){this[n]="Promise",this._state="pending",this._promise=new Promise(((e,t)=>{this._resolve=e,this._reject=t})),this._timeoutMessage=r,this._timeoutInterval=e,t&&this.startTimer()}get state(){return this._state}then(e,t){return i(this,void 0,void 0,(function*(){return this._promise.then(e,t)}))}catch(e){return i(this,void 0,void 0,(function*(){return this._promise.catch(e)}))}finally(e){return i(this,void 0,void 0,(function*(){return this._promise.finally(e)}))}resolve(e){this._resolve(e),this._state="fulfilled",this._clearTimeout()}reject(e){this._reject(e),this._state="rejected",this._clearTimeout()}startTimer(){this._timeoutInterval&&this._timeoutInterval>0&&(this._timeoutId=setTimeout(this._checkTimeout.bind(this),this._timeoutInterval))}_checkTimeout(){"pending"===this._state&&this._timeoutId&&this.reject(new o.OperationTimeoutError(this._timeoutMessage))}_clearTimeout(){this._timeoutId&&clearTimeout(this._timeoutId)}},n=Symbol.toStringTag},997:function(e,t,r){"use strict";var n=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(i,o){function s(e){try{c(n.next(e))}catch(e){o(e)}}function a(e){try{c(n.throw(e))}catch(e){o(e)}}function c(e){var t;e.done?i(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,a)}c((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0}),t.Eip1193Provider=void 0;const i=r(9970),o=r(2699),s=r(5071),a=r(9250);class c extends i.Web3BaseProvider{constructor(){super(...arguments),this._eventEmitter=new o.EventEmitter,this._chainId="",this._accounts=[]}_getChainId(){var e;return n(this,void 0,void 0,(function*(){const t=yield this.request((0,a.toPayload)({method:"eth_chainId",params:[]}));return null!==(e=null==t?void 0:t.result)&&void 0!==e?e:""}))}_getAccounts(){var e;return n(this,void 0,void 0,(function*(){const t=yield this.request((0,a.toPayload)({method:"eth_accounts",params:[]}));return null!==(e=null==t?void 0:t.result)&&void 0!==e?e:[]}))}_onConnect(){Promise.all([this._getChainId().then((e=>{e!==this._chainId&&(this._chainId=e,this._eventEmitter.emit("chainChanged",this._chainId))})).catch((e=>{console.error(e)})),this._getAccounts().then((e=>{this._accounts.length===e.length&&e.every((t=>e.includes(t)))||(this._accounts=e,this._onAccountsChanged())})).catch((e=>{console.error(e)}))]).then((()=>this._eventEmitter.emit("connect",{chainId:this._chainId}))).catch((e=>{console.error(e)}))}_onDisconnect(e,t){this._eventEmitter.emit("disconnect",new s.EIP1193ProviderRpcError(e,t))}_onAccountsChanged(){this._eventEmitter.emit("accountsChanged",this._accounts)}}t.Eip1193Provider=c},1438:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.VALID_ETH_BASE_TYPES=void 0,t.VALID_ETH_BASE_TYPES=["bool","int","uint","bytes","string","address","tuple"]},3637:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.validator=void 0;const n=r(7985);t.validator=new n.Web3Validator},356:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.Web3ValidatorError=void 0;const n=r(5071),i=e=>e.message?e.message:"unspecified error";class o extends n.BaseWeb3Error{constructor(e){super(),this.code=n.ERR_VALIDATION,this.errors=e,super.message=`Web3 validator found ${e.length} error[s]:\n${this._compileErrors().join("\n")}`}_compileErrors(){return this.errors.map(i)}}t.Web3ValidatorError=o},2677:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0});const n=r(2681),i=r(6660),o=r(5191),s=r(4416),a=r(3921),c=r(5164),u=r(7420),d=r(6378),l={address:e=>(0,n.isAddress)(e),bloom:e=>(0,o.isBloom)(e),blockNumber:e=>(0,i.isBlockNumber)(e),blockTag:e=>(0,i.isBlockTag)(e),blockNumberOrTag:e=>(0,i.isBlockNumberOrTag)(e),bool:e=>(0,s.isBoolean)(e),bytes:e=>(0,a.isBytes)(e),filter:e=>(0,c.isFilterObject)(e),hex:e=>(0,u.isHexStrict)(e),uint:e=>(0,d.isUInt)(e),int:e=>(0,d.isInt)(e),number:e=>(0,d.isNumber)(e),string:e=>(0,u.isString)(e)};for(let e=8;e<=256;e+=8)l[`int${e}`]=t=>(0,d.isInt)(t,{bitSize:e}),l[`uint${e}`]=t=>(0,d.isUInt)(t,{bitSize:e});for(let e=1;e<=32;e+=1)l[`bytes${e}`]=t=>(0,a.isBytes)(t,{size:e});l.bytes256=l.bytes,t.default=l},7345:function(e,t,r){"use strict";var n=this&&this.__createBinding||(Object.create?function(e,t,r,n){void 0===n&&(n=r);var i=Object.getOwnPropertyDescriptor(t,r);i&&!("get"in i?!t.__esModule:i.writable||i.configurable)||(i={enumerable:!0,get:function(){return t[r]}}),Object.defineProperty(e,n,i)}:function(e,t,r,n){void 0===n&&(n=r),e[n]=t[r]}),i=this&&this.__setModuleDefault||(Object.create?function(e,t){Object.defineProperty(e,"default",{enumerable:!0,value:t})}:function(e,t){e.default=t}),o=this&&this.__exportStar||function(e,t){for(var r in e)"default"===r||Object.prototype.hasOwnProperty.call(t,r)||n(t,e,r)},s=this&&this.__importStar||function(e){if(e&&e.__esModule)return e;var t={};if(null!=e)for(var r in e)"default"!==r&&Object.prototype.hasOwnProperty.call(e,r)&&n(t,e,r);return i(t,e),t};Object.defineProperty(t,"__esModule",{value:!0}),t.utils=void 0,o(r(7985),t),o(r(3637),t),o(r(5421),t),t.utils=s(r(8171)),o(r(356),t),o(r(1438),t),o(r(1851),t)},5421:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0})},8171:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.hexToUint8Array=t.uint8ArrayToHexString=t.padLeft=t.numberToHex=t.hexToNumber=t.codePointToInt=t.transformJsonDataToAbiFormat=t.fetchArrayElement=t.ethAbiToJsonSchema=t.abiSchemaToJsonSchema=t.parseBaseType=void 0;const n=r(5071),i=r(1438),o=r(1283),s=r(7420),a=r(356),c=["hex","number","blockNumber","blockNumberOrTag","filter","bloom"];t.parseBaseType=e=>{let t,r=e.replace(/ /,""),n=!1,o=[];if(e.includes("[")&&(r=r.slice(0,r.indexOf("[")),o=[...e.matchAll(/(?:\[(\d*)\])/g)].map((e=>parseInt(e[1],10))).map((e=>Number.isNaN(e)?-1:e)),n=o.length>0),i.VALID_ETH_BASE_TYPES.includes(r))return{baseType:r,isArray:n,baseTypeSize:t,arraySizes:o};if(r.startsWith("int"))t=parseInt(r.substring(3),10),r="int";else if(r.startsWith("uint"))t=parseInt(e.substring(4),10),r="uint";else{if(!r.startsWith("bytes"))return{baseType:void 0,isArray:!1,baseTypeSize:void 0,arraySizes:o};t=parseInt(r.substring(5),10),r="bytes"}return{baseType:r,isArray:n,baseTypeSize:t,arraySizes:o}};const u=(e,r={})=>{if(Object.keys(r).includes("type"))throw new a.Web3ValidatorError([{keyword:"eth",message:'Either "eth" or "type" can be presented in schema',params:{eth:e},instancePath:"",schemaPath:""}]);const{baseType:n,baseTypeSize:i}=(0,t.parseBaseType)(e);if(!n&&!c.includes(e))throw new a.Web3ValidatorError([{keyword:"eth",message:`Eth data type "${e}" is not valid`,params:{eth:e},instancePath:"",schemaPath:""}]);if(n){if("tuple"===n)throw new Error('"tuple" type is not implemented directly.');return{format:`${n}${null!=i?i:""}`,required:!0}}return e?{format:e,required:!0}:{}};t.abiSchemaToJsonSchema=(e,r="/0")=>{const n={type:"array",items:[],maxItems:e.length,minItems:e.length};for(const[i,s]of e.entries()){let e,a,c=[];(0,o.isAbiParameterSchema)(s)?(e=s.type,a=s.name,c=s.components):"string"==typeof s?(e=s,a=`${r}/${i}`):Array.isArray(s)&&(s[0]&&"string"==typeof s[0]&&s[0].startsWith("tuple")&&!Array.isArray(s[0])&&s[1]&&Array.isArray(s[1])?(e=s[0],a=`${r}/${i}`,c=s[1]):(e="tuple",a=`${r}/${i}`,c=s));const{baseType:d,isArray:l,arraySizes:h}=(0,t.parseBaseType)(e);let f,p=n;for(let e=h.length-1;e>0;e-=1)f={type:"array",items:[],maxItems:h[e],minItems:h[e]},h[e]<0&&(delete f.maxItems,delete f.minItems),Array.isArray(p.items)?0===p.items.length?p.items=f:p.items.push(f):p.items=[p.items,f],p=f;if("tuple"!==d||l)if("tuple"===d&&l){const e=h[0],r={$id:a,type:"array",items:(0,t.abiSchemaToJsonSchema)(c,a),maxItems:e,minItems:e};e<0&&(delete r.maxItems,delete r.minItems),p.items.push(r)}else if(l){const e=h[0],t={type:"array",$id:a,items:u(String(d)),minItems:e,maxItems:e};e<0&&(delete t.maxItems,delete t.minItems),p.items.push(t)}else Array.isArray(p.items)?p.items.push(Object.assign({$id:a},u(e))):p.items.items.push(Object.assign({$id:a},u(e)));else{const e=(0,t.abiSchemaToJsonSchema)(c,a);e.$id=a,p.items.push(e)}p=n}return n},t.ethAbiToJsonSchema=e=>(0,t.abiSchemaToJsonSchema)(e),t.fetchArrayElement=(e,r)=>1===r?e:(0,t.fetchArrayElement)(e[0],r-1),t.transformJsonDataToAbiFormat=(e,r,n)=>{const i=[];for(const[s,a]of e.entries()){let e,c,u=[];(0,o.isAbiParameterSchema)(a)?(e=a.type,c=a.name,u=a.components):"string"==typeof a?e=a:Array.isArray(a)&&(a[1]&&Array.isArray(a[1])?(e=a[0],u=a[1]):(e="tuple",u=a));const{baseType:d,isArray:l,arraySizes:h}=(0,t.parseBaseType)(e),f=Array.isArray(r)?r[s]:r[c];if("tuple"!==d||l)if("tuple"===d&&l){const e=[];for(const r of f)if(h.length>1){const i=(0,t.fetchArrayElement)(r,h.length-1),o=[];for(const e of i)o.push((0,t.transformJsonDataToAbiFormat)(u,e,n));e.push(o)}else e.push((0,t.transformJsonDataToAbiFormat)(u,r,n));i.push(e)}else i.push(f);else i.push((0,t.transformJsonDataToAbiFormat)(u,f,n))}return(n=null!=n?n:[]).push(...i),n},t.codePointToInt=e=>{if(e>=48&&e<=57)return e-48;if(e>=65&&e<=70)return e-55;if(e>=97&&e<=102)return e-87;throw new Error(`Invalid code point: ${e}`)},t.hexToNumber=e=>{if(!(0,s.isHexStrict)(e))throw new Error("Invalid hex string");const[t,r]=e.startsWith("-")?[!0,e.slice(1)]:[!1,e],n=BigInt(r);return n>Number.MAX_SAFE_INTEGER?t?-n:n:n<Number.MIN_SAFE_INTEGER?n:t?-1*Number(n):Number(n)},t.numberToHex=e=>{if(("number"==typeof e||"bigint"==typeof e)&&e<0)return`-0x${e.toString(16).slice(1)}`;if(("number"==typeof e||"bigint"==typeof e)&&e>=0)return`0x${e.toString(16)}`;if("string"==typeof e&&(0,s.isHexStrict)(e)){const[t,r]=e.startsWith("-")?[!0,e.slice(1)]:[!1,e];return`${t?"-":""}0x${r.split(/^(-)?0(x|X)/).slice(-1)[0].replace(/^0+/,"").toLowerCase()}`}if("string"==typeof e&&!(0,s.isHexStrict)(e))return(0,t.numberToHex)(BigInt(e));throw new n.InvalidNumberError(e)},t.padLeft=(e,r,n="0")=>{if("string"==typeof e&&!(0,s.isHexStrict)(e))return e.padStart(r,n);const i="string"==typeof e&&(0,s.isHexStrict)(e)?e:(0,t.numberToHex)(e),[o,a]=i.startsWith("-")?["-0x",i.slice(3)]:["0x",i.slice(2)];return`${o}${a.padStart(r,n)}`},t.uint8ArrayToHexString=function(e){let t="0x";for(const r of e){const e=r.toString(16);t+=1===e.length?`0${e}`:e}return t},t.hexToUint8Array=function(e){let t;if(t=e.toLowerCase().startsWith("0x")?e.slice(2):e,t.length%2!=0)throw new n.InvalidBytesError(`hex string has odd length: ${e}`);const r=new Uint8Array(Math.ceil(t.length/2));for(let e=0;e<r.length;e+=1){const n=parseInt(t.substring(2*e,2*e+2),16);r[e]=n}return r}},1283:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.isAbiParameterSchema=void 0,t.isAbiParameterSchema=e=>"object"==typeof e&&"type"in e&&"name"in e},2681:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.isAddress=t.checkAddressCheckSum=void 0;const n=r(4488),i=r(7737),o=r(8171),s=r(7420);t.checkAddressCheckSum=e=>{if(!/^(0x)?[0-9a-f]{40}$/i.test(e))return!1;const t=e.slice(2),r=(0,i.utf8ToBytes)(t.toLowerCase()),s=(0,o.uint8ArrayToHexString)((0,n.keccak256)(r)).slice(2);for(let e=0;e<40;e+=1)if(parseInt(s[e],16)>7&&t[e].toUpperCase()!==t[e]||parseInt(s[e],16)<=7&&t[e].toLowerCase()!==t[e])return!1;return!0},t.isAddress=(e,r=!0)=>{if("string"!=typeof e&&!(e instanceof Uint8Array))return!1;let n;return n=e instanceof Uint8Array?(0,o.uint8ArrayToHexString)(e):"string"!=typeof e||(0,s.isHexStrict)(e)||e.toLowerCase().startsWith("0x")?e:`0x${e}`,!!/^(0x)?[0-9a-f]{40}$/i.test(n)&&(!(!/^(0x|0X)?[0-9a-f]{40}$/.test(n)&&!/^(0x|0X)?[0-9A-F]{40}$/.test(n))||!r||(0,t.checkAddressCheckSum)(n))}},6660:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.isBlockNumberOrTag=t.isBlockTag=t.isBlockNumber=void 0;const n=r(9970),i=r(6378);t.isBlockNumber=e=>(0,i.isUInt)(e),t.isBlockTag=e=>Object.values(n.BlockTags).includes(e),t.isBlockNumberOrTag=e=>(0,t.isBlockTag)(e)||(0,t.isBlockNumber)(e)},5191:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.isContractAddressInBloom=t.isUserEthereumAddressInBloom=t.isInBloom=t.isBloom=void 0;const n=r(4488),i=r(8171),o=r(2681),s=r(7420);t.isBloom=e=>!("string"!=typeof e||!/^(0x)?[0-9a-f]{512}$/i.test(e)||!/^(0x)?[0-9a-f]{512}$/.test(e)&&!/^(0x)?[0-9A-F]{512}$/.test(e)),t.isInBloom=(e,r)=>{if("string"==typeof r&&!(0,s.isHexStrict)(r))return!1;if(!(0,t.isBloom)(e))return!1;const o="string"==typeof r?(0,i.hexToUint8Array)(r):r,a=(0,i.uint8ArrayToHexString)((0,n.keccak256)(o)).slice(2);for(let t=0;t<12;t+=4){const r=(parseInt(a.slice(t,t+2),16)<<8)+parseInt(a.slice(t+2,t+4),16)&2047,n=1<<r%4;if(((0,i.codePointToInt)(e.charCodeAt(e.length-1-Math.floor(r/4)))&n)!==n)return!1}return!0},t.isUserEthereumAddressInBloom=(e,r)=>{if(!(0,t.isBloom)(e))return!1;if(!(0,o.isAddress)(r))return!1;const n=(0,i.padLeft)(r,64);return(0,t.isInBloom)(e,n)},t.isContractAddressInBloom=(e,r)=>!!(0,t.isBloom)(e)&&!!(0,o.isAddress)(r)&&(0,t.isInBloom)(e,r)},4416:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.isBoolean=void 0;const n=r(7420);t.isBoolean=e=>!!["number","string","boolean"].includes(typeof e)&&("boolean"==typeof e||("string"!=typeof e||(0,n.isHexStrict)(e)?"string"==typeof e&&(0,n.isHexStrict)(e)?"0x1"===e||"0x0"===e:1===e||0===e:"1"===e||"0"===e))},3921:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.isBytes=t.isUint8Array=void 0;const n=r(8171),i=r(7420);t.isUint8Array=e=>e instanceof Uint8Array,t.isBytes=(e,t={abiType:"bytes"})=>{if(!("string"==typeof e||Array.isArray(e)||e instanceof Uint8Array))return!1;if("string"==typeof e&&(0,i.isHexStrict)(e)&&e.startsWith("-"))return!1;if("string"==typeof e&&!(0,i.isHexStrict)(e))return!1;let r;if("string"==typeof e){if(e.length%2!=0)return!1;r=(0,n.hexToUint8Array)(e)}else if(Array.isArray(e)){if(e.some((e=>e<0||e>255||!Number.isInteger(e))))return!1;r=new Uint8Array(e)}else r=e;if(null==t?void 0:t.abiType){const{baseTypeSize:e}=(0,n.parseBaseType)(t.abiType);return!e||r.length===e}return!(null==t?void 0:t.size)||r.length===(null==t?void 0:t.size)}},1478:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.isValidEthBaseType=void 0;const n=r(8171);t.isValidEthBaseType=e=>{const{baseType:t,baseTypeSize:r}=(0,n.parseBaseType)(e);return!!t&&(t===e||("int"!==t&&"uint"!==t||!r||r<=256&&r%8==0)&&("bytes"!==t||!r||r>=1&&r<=32))}},5164:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.isFilterObject=void 0;const n=r(2681),i=r(6660),o=r(2102),s=r(5702);t.isFilterObject=e=>{const t=["fromBlock","toBlock","address","topics","blockHash"];if((0,o.isNullish)(e)||"object"!=typeof e)return!1;if(!Object.keys(e).every((e=>t.includes(e))))return!1;if(!(0,o.isNullish)(e.fromBlock)&&!(0,i.isBlockNumberOrTag)(e.fromBlock)||!(0,o.isNullish)(e.toBlock)&&!(0,i.isBlockNumberOrTag)(e.toBlock))return!1;if(!(0,o.isNullish)(e.address))if(Array.isArray(e.address)){if(!e.address.every((e=>(0,n.isAddress)(e))))return!1}else if(!(0,n.isAddress)(e.address))return!1;return!(!(0,o.isNullish)(e.topics)&&!e.topics.every((e=>!!(0,o.isNullish)(e)||(Array.isArray(e)?e.every((e=>(0,s.isTopic)(e))):!!(0,s.isTopic)(e)))))}},1851:function(e,t,r){"use strict";var n=this&&this.__createBinding||(Object.create?function(e,t,r,n){void 0===n&&(n=r);var i=Object.getOwnPropertyDescriptor(t,r);i&&!("get"in i?!t.__esModule:i.writable||i.configurable)||(i={enumerable:!0,get:function(){return t[r]}}),Object.defineProperty(e,n,i)}:function(e,t,r,n){void 0===n&&(n=r),e[n]=t[r]}),i=this&&this.__exportStar||function(e,t){for(var r in e)"default"===r||Object.prototype.hasOwnProperty.call(t,r)||n(t,e,r)};Object.defineProperty(t,"__esModule",{value:!0}),i(r(2681),t),i(r(6660),t),i(r(5191),t),i(r(4416),t),i(r(3921),t),i(r(1478),t),i(r(5164),t),i(r(6378),t),i(r(7420),t),i(r(5702),t),i(r(2102),t)},6378:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.isNumber=t.isInt=t.isUInt=t.bigintPower=t.isBigInt=void 0;const n=r(8171),i=r(7420);t.isBigInt=e=>"bigint"==typeof e,t.bigintPower=(e,t)=>{let r=e;for(let n=1;n<t;n+=1)r*=e;return r},t.isUInt=(e,r={abiType:"uint"})=>{if(!["number","string","bigint"].includes(typeof e)||"string"==typeof e&&0===e.length)return!1;let o;if(null==r?void 0:r.abiType){const{baseTypeSize:e}=(0,n.parseBaseType)(r.abiType);e&&(o=e)}else r.bitSize&&(o=r.bitSize);const s=(0,t.bigintPower)(BigInt(2),BigInt(null!=o?o:256))-BigInt(1);try{const t="string"==typeof e&&(0,i.isHexStrict)(e)?BigInt((0,n.hexToNumber)(e)):BigInt(e);return t>=0&&t<=s}catch(e){return!1}},t.isInt=(e,r={abiType:"int"})=>{if(!["number","string","bigint"].includes(typeof e))return!1;if("number"==typeof e&&e>Number.MAX_SAFE_INTEGER)return!1;let o;if(null==r?void 0:r.abiType){const{baseTypeSize:e,baseType:t}=(0,n.parseBaseType)(r.abiType);if("int"!==t)return!1;e&&(o=e)}else r.bitSize&&(o=r.bitSize);const s=(0,t.bigintPower)(BigInt(2),BigInt((null!=o?o:256)-1)),a=BigInt(-1)*(0,t.bigintPower)(BigInt(2),BigInt((null!=o?o:256)-1));try{const t="string"==typeof e&&(0,i.isHexStrict)(e)?BigInt((0,n.hexToNumber)(e)):BigInt(e);return t>=a&&t<=s}catch(e){return!1}},t.isNumber=e=>!!(0,t.isInt)(e)||!("string"!=typeof e||!/[0-9.]/.test(e)||e.indexOf(".")!==e.lastIndexOf("."))||"number"==typeof e},2102:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.isObject=t.isNullish=void 0;const n=r(9970);t.isNullish=e=>null==e,t.isObject=e=>!("object"!=typeof e||(0,t.isNullish)(e)||Array.isArray(e)||e instanceof n.TypedArray)},7420:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.validateNoLeadingZeroes=t.isHexPrefixed=t.isHexString32Bytes=t.isHexString8Bytes=t.isHex=t.isHexString=t.isHexStrict=t.isString=void 0,t.isString=e=>"string"==typeof e,t.isHexStrict=e=>"string"==typeof e&&/^((-)?0x[0-9a-f]+|(0x))$/i.test(e),t.isHexString=function(e,t){return!("string"!=typeof e||!e.match(/^0x[0-9A-Fa-f]*$/)||void 0!==t&&t>0&&e.length!==2+2*t)},t.isHex=e=>"number"==typeof e||"bigint"==typeof e||"string"==typeof e&&/^((-0x|0x|-)?[0-9a-f]+|(0x))$/i.test(e),t.isHexString8Bytes=(e,r=!0)=>r?(0,t.isHexStrict)(e)&&18===e.length:(0,t.isHex)(e)&&16===e.length,t.isHexString32Bytes=(e,r=!0)=>r?(0,t.isHexStrict)(e)&&66===e.length:(0,t.isHex)(e)&&64===e.length,t.isHexPrefixed=function(e){if("string"!=typeof e)throw new Error("[isHexPrefixed] input must be type 'string', received type "+typeof e);return e.startsWith("0x")},t.validateNoLeadingZeroes=function(e){for(const[t,r]of Object.entries(e))if(void 0!==r&&r.length>0&&0===r[0])throw new Error(`${t} cannot have leading zeroes, received: ${r.toString()}`)}},5702:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.isTopicInBloom=t.isTopic=void 0;const n=r(5191);t.isTopic=e=>!("string"!=typeof e||!/^(0x)?[0-9a-f]{64}$/i.test(e)||!/^(0x)?[0-9a-f]{64}$/.test(e)&&!/^(0x)?[0-9A-F]{64}$/.test(e)),t.isTopicInBloom=(e,r)=>!!(0,n.isBloom)(e)&&!!(0,t.isTopic)(r)&&(0,n.isInBloom)(e,r)},1714:function(e,t,r){"use strict";var n=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.Validator=void 0;const i=r(5071),o=r(6750),s=r(356),a=n(r(2677)),c=e=>{if((!(null==e?void 0:e.type)||"object"===(null==e?void 0:e.type))&&(null==e?void 0:e.properties)){const t={};for(const r of Object.keys(e.properties)){const n=c(e.properties[r]);n&&(t[r]=n)}return Array.isArray(e.required)?o.z.object(t).partial().required(e.required.reduce(((e,t)=>Object.assign(Object.assign({},e),{[t]:!0})),{})):o.z.object(t).partial()}if("array"===(null==e?void 0:e.type)&&(null==e?void 0:e.items)){if(Array.isArray(e.items)&&e.items.length>0){const t=[];for(const r of e.items){const e=c(r);e&&t.push(e)}return o.z.tuple(t)}return o.z.array(c(e.items))}if(e.oneOf&&Array.isArray(e.oneOf))return o.z.union(e.oneOf.map((e=>c(e))));if(null==e?void 0:e.format){if(!a.default[e.format])throw new i.SchemaFormatError(e.format);return o.z.any().refine(a.default[e.format],(t=>({params:{value:t,format:e.format}})))}return(null==e?void 0:e.type)&&"object"!==(null==e?void 0:e.type)&&"function"==typeof o.z[String(e.type)]?o.z[String(e.type)]():o.z.object({data:o.z.any()}).partial()};class u{static factory(){return u.validatorInstance||(u.validatorInstance=new u),u.validatorInstance}validate(e,t,r){var n,i;const o=c(e).safeParse(t);if(!o.success){const e=this.convertErrors(null!==(i=null===(n=o.error)||void 0===n?void 0:n.issues)&&void 0!==i?i:[]);if(e){if(null==r?void 0:r.silent)return e;throw new s.Web3ValidatorError(e)}}}convertErrors(e){if(e&&Array.isArray(e)&&e.length>0)return e.map((e=>{var t;let r,n,i,s;s=e.path.join("/");const a=String(e.path[e.path.length-1]),c=e.path.join("/");if(e.code===o.ZodIssueCode.too_big)n="maxItems",s=`${c}/maxItems`,i={limit:e.maximum},r=`must NOT have more than ${e.maximum} items`;else if(e.code===o.ZodIssueCode.too_small)n="minItems",s=`${c}/minItems`,i={limit:e.minimum},r=`must NOT have fewer than ${e.minimum} items`;else if(e.code===o.ZodIssueCode.custom){const{value:n,format:o}=null!==(t=e.params)&&void 0!==t?t:{};r=void 0===n?`value at "/${s}" is required`:`value "${"object"==typeof n?JSON.stringify(n):n}" at "/${s}" must pass "${o}" validation`,i={value:n}}return{keyword:null!=n?n:a,instancePath:c?`/${c}`:"",schemaPath:s?`#${s}`:"#",params:null!=i?i:{value:e.message},message:null!=r?r:e.message}}))}}t.Validator=u},7985:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.Web3Validator=void 0;const n=r(1714),i=r(8171),o=r(356);t.Web3Validator=class{constructor(){this._validator=n.Validator.factory()}validateJSONSchema(e,t,r){return this._validator.validate(e,t,r)}validate(e,t,r={silent:!1}){var n,s;const a=(0,i.ethAbiToJsonSchema)(e);if(!Array.isArray(a.items)||0!==(null===(n=a.items)||void 0===n?void 0:n.length)||0!==t.length){if(Array.isArray(a.items)&&0===(null===(s=a.items)||void 0===s?void 0:s.length)&&0!==t.length)throw new o.Web3ValidatorError([{instancePath:"/0",schemaPath:"/",keyword:"required",message:"empty schema against data can not be validated",params:t}]);return this._validator.validate(a,t,r)}}}},3879:(e,t,r)=>{"use strict";function n(e,t){return e.exec(t)?.groups}r.r(t),r.d(t,{BaseError:()=>u,narrow:()=>d,parseAbi:()=>M,parseAbiItem:()=>D,parseAbiParameter:()=>L,parseAbiParameters:()=>F});var i=/^bytes([1-9]|1[0-9]|2[0-9]|3[0-2])?$/,o=/^u?int(8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?$/,s=/^\(.+?\).*?$/,a=Object.defineProperty,c=(e,t,r)=>(((e,t,r)=>{t in e?a(e,t,{enumerable:!0,configurable:!0,writable:!0,value:r}):e[t]=r})(e,"symbol"!=typeof t?t+"":t,r),r),u=class extends Error{constructor(e,t={}){const r=t.cause instanceof u?t.cause.details:t.cause?.message?t.cause.message:t.details,n=t.cause instanceof u&&t.cause.docsPath||t.docsPath;super([e||"An error occurred.","",...t.metaMessages?[...t.metaMessages,""]:[],...n?[`Docs: https://abitype.dev${n}`]:[],...r?[`Details: ${r}`]:[],"Version: abitype@0.7.1"].join("\n")),c(this,"details"),c(this,"docsPath"),c(this,"metaMessages"),c(this,"shortMessage"),c(this,"name","AbiTypeError"),t.cause&&(this.cause=t.cause),this.details=r,this.docsPath=n,this.metaMessages=t.metaMessages,this.shortMessage=e}};function d(e){return e}var l=/^error (?<name>[a-zA-Z0-9_]+)\((?<parameters>.*?)\)$/,h=/^event (?<name>[a-zA-Z0-9_]+)\((?<parameters>.*?)\)$/,f=/^function (?<name>[a-zA-Z0-9_]+)\((?<parameters>.*?)\)(?: (?<scope>external|public{1}))?(?: (?<stateMutability>pure|view|nonpayable|payable{1}))?(?: returns \((?<returns>.*?)\))?$/,p=/^struct (?<name>[a-zA-Z0-9_]+) \{(?<properties>.*?)\}$/;function m(e){return p.test(e)}function g(e){return n(p,e)}var y=/^constructor\((?<parameters>.*?)\)(?:\s(?<stateMutability>payable{1}))?$/,v=/^fallback\(\)$/,b=/^receive\(\) external payable$/,E=new Set(["memory","indexed","storage","calldata"]),_=new Set(["indexed"]),A=new Set(["calldata","memory","storage"]),T=new Map([["address",{type:"address"}],["bool",{type:"bool"}],["bytes",{type:"bytes"}],["bytes32",{type:"bytes32"}],["int",{type:"int256"}],["int256",{type:"int256"}],["string",{type:"string"}],["uint",{type:"uint256"}],["uint8",{type:"uint8"}],["uint16",{type:"uint16"}],["uint24",{type:"uint24"}],["uint32",{type:"uint32"}],["uint64",{type:"uint64"}],["uint96",{type:"uint96"}],["uint112",{type:"uint112"}],["uint160",{type:"uint160"}],["uint192",{type:"uint192"}],["uint256",{type:"uint256"}],["address owner",{type:"address",name:"owner"}],["address to",{type:"address",name:"to"}],["bool approved",{type:"bool",name:"approved"}],["bytes _data",{type:"bytes",name:"_data"}],["bytes data",{type:"bytes",name:"data"}],["bytes signature",{type:"bytes",name:"signature"}],["bytes32 hash",{type:"bytes32",name:"hash"}],["bytes32 r",{type:"bytes32",name:"r"}],["bytes32 root",{type:"bytes32",name:"root"}],["bytes32 s",{type:"bytes32",name:"s"}],["string name",{type:"string",name:"name"}],["string symbol",{type:"string",name:"symbol"}],["string tokenURI",{type:"string",name:"tokenURI"}],["uint tokenId",{type:"uint256",name:"tokenId"}],["uint8 v",{type:"uint8",name:"v"}],["uint256 balance",{type:"uint256",name:"balance"}],["uint256 tokenId",{type:"uint256",name:"tokenId"}],["uint256 value",{type:"uint256",name:"value"}],["event:address indexed from",{type:"address",name:"from",indexed:!0}],["event:address indexed to",{type:"address",name:"to",indexed:!0}],["event:uint indexed tokenId",{type:"uint256",name:"tokenId",indexed:!0}],["event:uint256 indexed tokenId",{type:"uint256",name:"tokenId",indexed:!0}]]);function I(e,t={}){if(function(e){return f.test(e)}(e)){const r=function(e){return n(f,e)}(e);if(!r)throw new u("Invalid function signature.",{details:e});const i=S(r.parameters),o=[],s=i.length;for(let e=0;e<s;e++)o.push(x(i[e],{modifiers:A,structs:t,type:"function"}));const a=[];if(r.returns){const e=S(r.returns),n=e.length;for(let r=0;r<n;r++)a.push(x(e[r],{modifiers:A,structs:t,type:"function"}))}return{name:r.name,type:"function",stateMutability:r.stateMutability??"nonpayable",inputs:o,outputs:a}}if(function(e){return h.test(e)}(e)){const r=function(e){return n(h,e)}(e);if(!r)throw new u("Invalid event signature.",{details:e});const i=S(r.parameters),o=[],s=i.length;for(let e=0;e<s;e++)o.push(x(i[e],{modifiers:_,structs:t,type:"event"}));return{name:r.name,type:"event",inputs:o}}if(function(e){return l.test(e)}(e)){const r=function(e){return n(l,e)}(e);if(!r)throw new u("Invalid error signature.",{details:e});const i=S(r.parameters),o=[],s=i.length;for(let e=0;e<s;e++)o.push(x(i[e],{structs:t,type:"error"}));return{name:r.name,type:"error",inputs:o}}if(function(e){return y.test(e)}(e)){const r=function(e){return n(y,e)}(e);if(!r)throw new u("Invalid constructor signature.",{details:e});const i=S(r.parameters),o=[],s=i.length;for(let e=0;e<s;e++)o.push(x(i[e],{structs:t,type:"constructor"}));return{type:"constructor",stateMutability:r.stateMutability??"nonpayable",inputs:o}}if(function(e){return v.test(e)}(e))return{type:"fallback"};if(function(e){return b.test(e)}(e))return{type:"receive",stateMutability:"payable"};throw new u("Unknown signature.",{details:e})}var R=/^(?<type>[a-zA-Z0-9_]+?)(?<array>(?:\[\d*?\])+?)?(?:\s(?<modifier>calldata|indexed|memory|storage{1}))?(?:\s(?<name>[a-zA-Z0-9_]+))?$/,w=/^\((?<type>.+?)\)(?<array>(?:\[\d*?\])+?)?(?:\s(?<modifier>calldata|indexed|memory|storage{1}))?(?:\s(?<name>[a-zA-Z0-9_]+))?$/,P=/^u?int$/;function x(e,t){const r=function(e,t){return t?`${t}:${e}`:e}(e,t?.type);if(T.has(r))return T.get(r);const a=s.test(e),c=n(a?w:R,e);if(!c)throw new u("Invalid ABI parameter.",{details:e});if(c.name&&function(e){return"address"===e||"bool"===e||"function"===e||"string"===e||"tuple"===e||i.test(e)||o.test(e)||C.test(e)}(c.name))throw new u("Invalid ABI parameter.",{details:e,metaMessages:[`"${c.name}" is a protected Solidity keyword. More info: https://docs.soliditylang.org/en/latest/cheatsheet.html`]});const d=c.name?{name:c.name}:{},l="indexed"===c.modifier?{indexed:!0}:{},h=t?.structs??{};let f,p={};if(a){f="tuple";const e=S(c.type),t=[],r=e.length;for(let n=0;n<r;n++)t.push(x(e[n],{structs:h}));p={components:t}}else if(c.type in h)f="tuple",p={components:h[c.type]};else if(P.test(c.type))f=`${c.type}256`;else if(f=c.type,"struct"!==t?.type&&!O(f))throw new u("Unknown type.",{metaMessages:[`Type "${f}" is not a valid ABI type.`]});if(c.modifier){if(!t?.modifiers?.has?.(c.modifier))throw new u("Invalid ABI parameter.",{details:e,metaMessages:[`Modifier "${c.modifier}" not allowed${t?.type?` in "${t.type}" type`:""}.`]});if(A.has(c.modifier)&&!function(e,t){return t||"bytes"===e||"string"===e||"tuple"===e}(f,!!c.array))throw new u("Invalid ABI parameter.",{details:e,metaMessages:[`Modifier "${c.modifier}" not allowed${t?.type?` in "${t.type}" type`:""}.`,`Data location can only be specified for array, struct, or mapping types, but "${c.modifier}" was given.`]})}const m={type:`${f}${c.array??""}`,...d,...l,...p};return T.set(r,m),m}function S(e,t=[],r="",n=0){if(""===e){if(""===r)return t;if(0!==n)throw new u("Unbalanced parentheses.",{metaMessages:[`"${r.trim()}" has too many ${n>0?"opening":"closing"} parentheses.`],details:`Depth "${n}"`});return[...t,r.trim()]}const i=e.length;for(let o=0;o<i;o++){const i=e[o],s=e.slice(o+1);switch(i){case",":return 0===n?S(s,[...t,r.trim()]):S(s,t,`${r}${i}`,n);case"(":return S(s,t,`${r}${i}`,n+1);case")":return S(s,t,`${r}${i}`,n-1);default:return S(s,t,`${r}${i}`,n)}}return[]}function O(e){return"address"===e||"bool"===e||"function"===e||"string"===e||i.test(e)||o.test(e)}var C=/^(?:after|alias|anonymous|apply|auto|byte|calldata|case|catch|constant|copyof|default|defined|error|event|external|false|final|function|immutable|implements|in|indexed|inline|internal|let|mapping|match|memory|mutable|null|of|override|partial|private|promise|public|pure|reference|relocatable|return|returns|sizeof|static|storage|struct|super|supports|switch|this|true|try|typedef|typeof|var|view|virtual)$/;function B(e){const t={},r=e.length;for(let n=0;n<r;n++){const r=e[n];if(!m(r))continue;const i=g(r);if(!i)throw new u("Invalid struct signature.",{details:r});const o=i.properties.split(";"),s=[],a=o.length;for(let e=0;e<a;e++){const t=o[e].trim();if(!t)continue;const r=x(t,{type:"struct"});s.push(r)}if(!s.length)throw new u("Invalid struct signature.",{details:r,metaMessages:["No properties exist."]});t[i.name]=s}const n={},i=Object.entries(t),o=i.length;for(let e=0;e<o;e++){const[r,o]=i[e];n[r]=k(o,t)}return n}var N=/^(?<type>[a-zA-Z0-9_]+?)(?<array>(?:\[\d*?\])+?)?$/;function k(e,t,r=new Set){const i=[],o=e.length;for(let a=0;a<o;a++){const o=e[a];if(s.test(o.type))i.push(o);else{const e=n(N,o.type);if(!e?.type)throw new u("Invalid ABI parameter.",{details:JSON.stringify(o,null,2),metaMessages:["ABI parameter type is invalid."]});const{array:s,type:a}=e;if(a in t){if(r.has(a))throw new u("Circular reference detected.",{metaMessages:[`Struct "${a}" is a circular reference.`]});i.push({...o,type:`tuple${s??""}`,components:k(t[a]??[],t,new Set([...r,a]))})}else{if(!O(a))throw new u("Unknown type.",{metaMessages:[`Type "${a}" is not a valid ABI type. Perhaps you forgot to include a struct signature?`]});i.push(o)}}}return i}function M(e){const t=B(e),r=[],n=e.length;for(let i=0;i<n;i++){const n=e[i];m(n)||r.push(I(n,t))}return r}function D(e){let t;if("string"==typeof e)t=I(e);else{const r=B(e),n=e.length;for(let i=0;i<n;i++){const n=e[i];if(!m(n)){t=I(n,r);break}}}if(!t)throw new u("Failed to parse ABI item.",{details:`parseAbiItem(${JSON.stringify(e,null,2)})`,docsPath:"/api/human.html#parseabiitem-1"});return t}function L(e){let t;if("string"==typeof e)t=x(e,{modifiers:E});else{const r=B(e),n=e.length;for(let i=0;i<n;i++){const n=e[i];if(!m(n)){t=x(n,{modifiers:E,structs:r});break}}}if(!t)throw new u("Failed to parse ABI parameter.",{details:`parseAbiParameter(${JSON.stringify(e,null,2)})`,docsPath:"/api/human.html#parseabiparameter-1"});return t}function F(e){const t=[];if("string"==typeof e){const r=S(e),n=r.length;for(let e=0;e<n;e++)t.push(x(r[e],{modifiers:E}))}else{const r=B(e),n=e.length;for(let i=0;i<n;i++){const n=e[i];if(m(n))continue;const o=S(n),s=o.length;for(let e=0;e<s;e++)t.push(x(o[e],{modifiers:E,structs:r}))}}if(0===t.length)throw new u("Failed to parse ABI parameters.",{details:`parseAbiParameters(${JSON.stringify(e,null,2)})`,docsPath:"/api/human.html#parseabiparameters-1"});return t}}},t={};function r(n){var i=t[n];if(void 0!==i)return i.exports;var o=t[n]={id:n,loaded:!1,exports:{}};return e[n].call(o.exports,o,o.exports,r),o.loaded=!0,o.exports}r.d=(e,t)=>{for(var n in t)r.o(t,n)&&!r.o(e,n)&&Object.defineProperty(e,n,{enumerable:!0,get:t[n]})},r.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(e){if("object"==typeof window)return window}}(),r.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),r.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},r.nmd=e=>(e.paths=[],e.children||(e.children=[]),e);var n=r(9375);return n.default})()));

}).call(this)}).call(this,require("timers").setImmediate)
},{"timers":76}],79:[function(require,module,exports){
// Returns a wrapper function that returns a wrapped callback
// The wrapper function should do some stuff, and return a
// presumably different callback function.
// This makes sure that own properties are retained, so that
// decorations and such are not lost along the way.
module.exports = wrappy
function wrappy (fn, cb) {
  if (fn && cb) return wrappy(fn)(cb)

  if (typeof fn !== 'function')
    throw new TypeError('need wrapper function')

  Object.keys(fn).forEach(function (k) {
    wrapper[k] = fn[k]
  })

  return wrapper

  function wrapper() {
    var args = new Array(arguments.length)
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i]
    }
    var ret = fn.apply(this, args)
    var cb = args[args.length-1]
    if (typeof ret === 'function' && ret !== cb) {
      Object.keys(cb).forEach(function (k) {
        ret[k] = cb[k]
      })
    }
    return ret
  }
}

},{}]},{},[1]);
