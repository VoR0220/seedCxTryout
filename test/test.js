const expect = require('chai').expect;
const toTestUtils = require('../src/utilities.js');
const { promisify } = require('util');
const redis = require("redis"),
    client = redis.createClient();
const getAsync = promisify(client.get).bind(client);

describe('websocket unit tests', (done) => {
    beforeEach('flush the database',  (done) => {
        client.flushall('ASYNC', (err, succeeded) => {
            if (err) throw new Error('Problem in flushing the db: ', err)
            done()
        })
    })
    it('should update redis properly', async() => {
        toTestUtils.inputPriceToRedis({price: 19.85}, 'coinbase');
        let expectedVal = await getAsync('coinbase');
        expect(expectedVal).to.equal('19.85');
    });

    it('should filter out unwanted values in an update', async() => {
        toTestUtils.inputPriceToRedis(["hello", "hb"], 'bitfinex');
        let expectedVal = await getAsync('bitfinex');
        expect(expectedVal).to.equal(null);
        toTestUtils.inputPriceToRedis({someValue: "hey hey heyyyyy", anotherValue: "wussah wussah wussah wussuuuuup", finalVal: "bitconneeeeect!!!"}, 'bitfinex');
        expectedVal = await getAsync('bitfinex');
        expect(expectedVal).to.equal(null);
    });
})

