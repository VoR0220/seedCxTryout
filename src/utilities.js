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
            firstCoinbase = true;
            client.set("coinbase", data["price"]);
            break;
        case "gemini":
            // every single response i've seen so far indicates there's only one event in any log
            firstGemini = true;
            client.set("gemini", data.events[0].price);
            break;
        case "bitfinex":
            // bitfinex returns a bit more data than we care about, the following is to handle that
            if (_.isPlainObject(data) || data[1] == "hb" || data.length <= 8 || typeof data[7] !== 'number') return;
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
    //console.log("coinbasePrice: ", coinbasePrice);
    const geminiPrice = parseFloat(await getAsync('gemini')).toFixed(2);
    //console.log("geminiPrice: ", geminiPrice);
    const bitfinexPrice = parseFloat(await getAsync('bitfinex')).toFixed(2);
    //console.log("bitfinexPrice: ", bitfinexPrice);
    
    let bestPrice = _.max([coinbasePrice, geminiPrice, bitfinexPrice]);
    // hack to ensure best price for our average (it's not unix-y but it'll work in lieu of this)
    //appendToStringArray(bestPrice)
    return bestPrice;
}

async function appendToStringArray(newBestPrice) {
    let currentStringArr = await getAsync('averageBest');
    if (currentStringArr  === null || currentStringArr === undefined) {
        client.set("averageBest", newBestPrice);
    } else {
        let arr = currentStringArr.split(',');
        arr.push(newBestPrice);
        client.set("averageBest", arr.join(','));
    }
}

async function getAvgBestPrice() {
    let currentStringArr = await getAsync('averageBest');
    let mean = _.mean(currentStringArr.split(',').map(parseFloat));
    let opts = { format: '%s%v', code: 'USD', symbol: '$' }
    console.log("> Avg Best: ", formatCurrency(mean, opts));
    // clean up client
    client.del('averageBest');
}

eventEmitter.on('priceUpdate', async () => {
    if  (firstCoinbase && firstGemini && firstBitfinex) {
        let bestPrice = await getMaxPrice();
        appendToStringArray(bestPrice);
        let opts = { format: '%s%v', code: 'USD', symbol: '$' }
        console.log("> Best: ", formatCurrency(bestPrice, opts));
    }
})

module.exports = {inputPriceToRedis, getMaxPrice, getAvgBestPrice}