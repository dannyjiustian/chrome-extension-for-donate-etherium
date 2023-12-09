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
