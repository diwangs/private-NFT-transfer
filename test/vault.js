const crypto = require('crypto')
const circomlib = require('circomlib')
const snarkjs = require('snarkjs')
const truffleAssert = require('truffle-assertions')

const Vault = artifacts.require("Vault")
const DummyNFT = artifacts.require("UserInfo");

const rbigint = nbytes => snarkjs.bigInt.leBuff2int(crypto.randomBytes(nbytes))
const pedersenHash = data => circomlib.babyJub.unpackPoint(circomlib.pedersenHash.hash(data))[0]
function toHex(number, length = 32) {
    const str = number instanceof Buffer ? number.toString('hex') : snarkjs.bigInt(number).toString(16)
    return '0x' + str.padStart(length * 2, '0')
}

function createDeposit({ nullifier, secret }) {
    const deposit = { nullifier, secret }
    deposit.preimage = Buffer.concat([deposit.nullifier.leInt2Buff(31), deposit.secret.leInt2Buff(31)])
    deposit.commitment = pedersenHash(deposit.preimage)
    deposit.commitmentHex = toHex(deposit.commitment)
    deposit.nullifierHash = pedersenHash(deposit.nullifier.leInt2Buff(31))
    deposit.nullifierHex = toHex(deposit.nullifierHash)
    return deposit
}

contract("Vault", accounts => {
    let vault;

    beforeEach(async () => {
        vault = await Vault.deployed() 
    })

    it("Should process deposit correctly", async () => {
        const deposit = createDeposit({ nullifier: rbigint(31), secret: rbigint(31) })
        let tx = await vault.deposit(toHex(deposit.commitment), {from: accounts[0]})
        
        truffleAssert.eventEmitted(tx, 'Deposit', (e) => {
            return e.commitment == toHex(deposit.commitment)
        })
    })
})