const events = require('events');
const eventEmitter = new events.EventEmitter();
const formatCurrency = require('format-currency');
const { promisify } = require('util');
const _ = require('lodash');
const redis = require("redis"),
    client = redis.createClient();
const getAsync = promisify(client.get).bind(client);

var firstCoinbase = false;
var firstGemini = false;
var firstBitfinex = false;

client.on("error", (err) => {
    console.log("Error in Redis: " + err);
});

// unfortunately there's nothing standardized about this exchange data so we'll need to do some of this a bit more manually
function inputPriceToRedis(data, name) {
    switch (name) {
        case "coinbase":
            console.log("Hit coinbase first");
            firstCoinbase = true;
            client.set("coinbase", data["price"]);
            break;
        case "gemini":
            // every single response i've seen so far indicates there's only one event in any log
            console.log("hit gemini first");
            firstGemini = true;
            client.set("gemini", data.events[0].price);
            break;
        case "bitfinex":
            // bitfinex returns a bit more data than we care about, the following is to handle that
            if (_.isPlainObject(data) || data[1] == "hb") return;
            firstBitfinex = true;
            // the 7th indice is where the price of the last trade is denoted
            client.set("bitfinex", data[7]);
            break;
        default:
            throw ("Invalid exchange inputted");
    }
    eventEmitter.emit('priceUpdate');
}

async function getMaxPrice() {
    const coinbasePrice = parseFloat(await getAsync('coinbase')).toFixed(2);
    console.log("coinbasePrice: ", coinbasePrice);
    const geminiPrice = parseFloat(await getAsync('gemini')).toFixed(2);
    console.log("geminiPrice: ", geminiPrice);
    const bitfinexPrice = parseFloat(await getAsync('bitfinex')).toFixed(2);
    console.log("bitfinexPrice: ", bitfinexPrice);
    console.log("Max: ", _.max([coinbasePrice, geminiPrice, bitfinexPrice]));
    let opts = { format: '%s%v', code: 'USD', symbol: '$' }
    console.log("Max formatted: ",  formatCurrency(_.max([coinbasePrice, geminiPrice, bitfinexPrice]), opts))
    return _.max([coinbasePrice, geminiPrice, bitfinexPrice]);
}

eventEmitter.on('priceUpdate', () => {
    let opts = { format: '%s%v', code: 'USD', symbol: '$' }
    if  (firstCoinbase && firstGemini && firstBitfinex) {
        console.log("> Best: ", formatCurrency(getMaxPrice(), opts));
    }
})

module.exports = {inputPriceToRedis, getMaxPrice}