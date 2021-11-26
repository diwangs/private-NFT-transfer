const MERKLE_TREE_HEIGHT = 20

const crypto = require('crypto')
const circomlib = require('circomlib')
const snarkjs = require('snarkjs')

// for withdrawal
// const buildGroth16 = require('websnark/src/groth16')
const websnarkUtils = require('websnark/src/utils')
const merkleTree = require('fixed-merkle-tree')
const fs = require('fs')

// for tests
const truffleAssert = require('truffle-assertions')
const { execSync } = require('child_process')

const Vault = artifacts.require("Vault")

contract("Vault", accounts => {
    let vault;

    beforeEach(async () => {
        vault = await Vault.deployed() 
    })
    
    it("e2e test", async () => {
        // const n = "272418632970930087013102078582984595767243027035861303396446195359448020486"
        // const s = "254080219567091772673909445246567392088208036796494585251815984474602972369"
        const deposit = createDeposit({ nullifier: rbigint(31), secret: rbigint(31) })

        // Deposit
        let tx = await vault.deposit(toHex(deposit.commitment), {from: accounts[0]})

        truffleAssert.eventEmitted(tx, 'Deposit', (e) => {
            return e.commitment == toHex(deposit.commitment)
        })

        // Withdraw
        const { proof, args } = await generateProof({ vault, deposit })
        tx = await vault.withdraw(proof, ...args)
        
        truffleAssert.eventEmitted(tx, 'Withdrawal', (e) => {
            return e.nullifierHash == toHex(deposit.nullifierHash)
        })
    })
})

// ---
// Util functions
// ---
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

/**
 * Generate SNARK proof for withdrawal
 * @param deposit Deposit object
 * @param recipient Funds recipient
 * @param relayer Relayer address
 * @param fee Relayer fee
 * @param refund Receive ether for exchanged tokens
 */
 async function generateProof({ vault, deposit}) {
    circuit = require(__dirname + '/../build/circuits/withdraw.json')
    // proving_key = fs.readFileSync(__dirname + '/../build/circuits/withdraw_proving_key.bin').buffer
    // groth16 = await buildGroth16()

    // Compute merkle proof of our commitment
    const { root, pathElements, pathIndices } = await generateMerkleProof(vault, deposit)
  
    // Prepare circuit input
    const input = {
      // Public snark inputs
      root: root,
      nullifierHash: deposit.nullifierHash,
  
      // Private snark inputs
      nullifier: deposit.nullifier,
      secret: deposit.secret,
      pathElements: pathElements,
      pathIndices: pathIndices,
    }
    const inputJSON = JSON.stringify(input, (_, v) => typeof v === 'bigint' ? v.toString() : v)
    
    console.log('Generating SNARK proof, this may take minutes...')
    console.time('Proof time')
    // const proofData = await websnarkUtils.genWitnessAndProve(groth16, input, circuit, proving_key) // fast but wrong?
    // const proofData = require(__dirname + '/../proof.json') // for later
    const proofData = proofSnarkJs(inputJSON) // TODO: find faster alternative
    const { proof } = websnarkUtils.toSolidityInput(proofData)
    console.timeEnd('Proof time')
  
    const args = [
      toHex(input.root),
      toHex(input.nullifierHash),
    ]

    return { proof, args }
}

/**
 * Generate merkle tree for a deposit.
 * Download deposit events from the tornado, reconstructs merkle tree, finds our deposit leaf
 * in it and generates merkle proof
 * @param deposit Deposit object
 */
 async function generateMerkleProof(tornado, deposit) {
    // Get all deposit events from smart contract and assemble merkle tree from them
    const events = await tornado.getPastEvents('Deposit', { fromBlock: 0, toBlock: 'latest' })
    const leaves = events
      .sort((a, b) => a.returnValues.leafIndex - b.returnValues.leafIndex) // Sort events in chronological order
      .map(e => e.returnValues.commitment)
    const tree = new merkleTree(MERKLE_TREE_HEIGHT, leaves)
  
    // Find current commitment in the tree
    const depositEvent = events.find(e => e.returnValues.commitment === toHex(deposit.commitment))
    const leafIndex = depositEvent ? depositEvent.returnValues.leafIndex : -1
  
    // Validate that our data is correct
    const root = tree.root()
    const isValidRoot = await tornado.isKnownRoot(toHex(root))
    const isSpent = await tornado.isSpent(toHex(deposit.nullifierHash))
    assert(isValidRoot === true, 'Merkle tree is corrupted')
    assert(isSpent === false, 'The note is already spent')
    assert(leafIndex >= 0, 'The deposit is not found in the tree')
  
    // Compute merkle proof of our commitment
    const { pathElements, pathIndices } = tree.path(leafIndex)
    return { pathElements, pathIndices, root: tree.root() }
}

function proofSnarkJs(inputJSON) {
    fs.writeFileSync(__dirname + '/../input.json', inputJSON)
    fs.copyFileSync(__dirname + '/../build/circuits/withdraw.json', __dirname + '/../circuit.json')
    fs.copyFileSync(__dirname + '/../build/circuits/withdraw_proving_key.json', __dirname + '/../proving_key.json')
    
    execSync("npx snarkjs calculatewitness") // produces witness.json
    execSync("npx snarkjs proof") // produces proof.json and public.json
    const proofData = require(__dirname + '/../proof.json')

    fs.rmSync(__dirname + '/../circuit.json')
    fs.rmSync(__dirname + '/../input.json')
    fs.rmSync(__dirname + '/../proving_key.json')
    fs.rmSync(__dirname + '/../witness.json')
    fs.rmSync(__dirname + '/../public.json')
    fs.rmSync(__dirname + '/../proof.json')

    return proofData
}