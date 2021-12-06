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
        const n1 = snarkjs.bigInt("272418632970930087013102078582984595767243027035861303396446195359448020486")
        const s1 = snarkjs.bigInt("254080219567091772673909445246567392088208036796494585251815984474602972369")
        const n2 = snarkjs.bigInt("218278570709644582400354933544764600979629809596418196314625408049795099009")
        const s2 = snarkjs.bigInt("381081628386906533194738143309184053498881367127906410807449526152710014129")
        const toyUidId = snarkjs.bigInt("225786548703635696515976828206103424260018282918369313743154006793831650038")
        const toyUidContract = snarkjs.bigInt("727964461428934226824242621095672674158845536690")
        
        const deposit1 = createDeposit({ 
            nullifier: n1, 
            secret: s1,
            tokenUidId: toyUidId,
            tokenUidContract: toyUidContract,
        })

        const deposit2 = createDeposit({ 
            nullifier: n2, 
            secret: s2,
            tokenUidId: toyUidId,
            tokenUidContract: toyUidContract,
        })

        // Deposit
        console.log("Deposit") 
        let tx = await vault.deposit(toHex(deposit1.commitment), {from: accounts[0]})

        truffleAssert.eventEmitted(tx, 'Deposit', (e) => {
            return e.commitment == toHex(deposit1.commitment)
        })

        // Send
        console.log("Send") 
        const r1 = await generateSendProof({ vault, oldDeposit: deposit1, newDeposit: deposit2 })
        // console.log(r1)
        tx = await vault.send(r1.proof, ...r1.args)

        truffleAssert.eventEmitted(tx, 'Withdrawal', (e) => {
            return e.nullifierHash == toHex(deposit1.nullifierHash)
        })
        truffleAssert.eventEmitted(tx, 'Deposit', (e) => {
            return e.commitment == toHex(deposit2.commitment)
        })

        // Withdraw
        console.log("Withdraw") 
        const r2 = await generateWithdrawProof({ vault, deposit: deposit2 })
        // console.log(r2)
        tx = await vault.withdraw(r2.proof, ...r2.args)
        
        truffleAssert.eventEmitted(tx, 'Withdrawal', (e) => {
            return e.nullifierHash == toHex(deposit2.nullifierHash)
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

function createDeposit({ nullifier, secret, tokenUidId, tokenUidContract }) {
    // tokenUid = concat(address, tokenId) -> 20 + 32 = 52 bytes
    const deposit = { nullifier, secret, tokenUidId, tokenUidContract }
    deposit.preimage = Buffer.concat([
        deposit.nullifier.leInt2Buff(31), 
        deposit.secret.leInt2Buff(31), 
        deposit.tokenUidId.leInt2Buff(31),
        deposit.tokenUidContract.leInt2Buff(20),
    ])
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
 async function generateWithdrawProof({ vault, deposit}) {
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
      tokenUidId: deposit.tokenUidId,
      tokenUidContract: deposit.tokenUidContract,
      pathElements: pathElements,
      pathIndices: pathIndices,
    }
    const inputJSON = JSON.stringify(input, (_, v) => typeof v === 'bigint' ? v.toString() : v)
    
    console.log('Generating SNARK proof, this may take minutes...')
    console.time('Proof time')
    // const proofData = await websnarkUtils.genWitnessAndProve(groth16, input, circuit, proving_key) // fast but wrong?
    // const proofData = require(__dirname + '/../proof.json') // for later
    const proofData = proofSnarkJs(inputJSON, __dirname + '/../build/circuits/withdraw') // TODO: find faster alternative
    const { proof } = websnarkUtils.toSolidityInput(proofData)
    console.timeEnd('Proof time')
  
    const args = [
      toHex(input.root),
      toHex(input.nullifierHash),
    ]

    return { proof, args }
}

async function generateSendProof({ vault, oldDeposit, newDeposit }) {
    circuit = require(__dirname + '/../build/circuits/send.json')
    // proving_key = fs.readFileSync(__dirname + '/../build/circuits/withdraw_proving_key.bin').buffer
    // groth16 = await buildGroth16()

    // Compute merkle proof of our commitment
    const { root, pathElements, pathIndices } = await generateMerkleProof(vault, oldDeposit)
  
    // Prepare circuit input
    const input = {
      // Public snark inputs
      oldRoot: root,
      oldNullifierHash: oldDeposit.nullifierHash,
      newCommitment: newDeposit.commitment,
  
      // Private snark inputs
      oldNullifier: oldDeposit.nullifier,
      oldSecret: oldDeposit.secret,
      oldTokenUidId: oldDeposit.tokenUidId,
      oldTokenUidContract: oldDeposit.tokenUidContract,
      oldPathElements: pathElements,
      oldPathIndices: pathIndices,
      newNullifier: newDeposit.nullifier,
      newSecret: newDeposit.secret,
      newTokenUidId: newDeposit.tokenUidId,
      newTokenUidContract: newDeposit.tokenUidContract,
    }
    const inputJSON = JSON.stringify(input, (_, v) => typeof v === 'bigint' ? v.toString() : v)
    
    console.log('Generating SNARK proof, this may take minutes...')
    console.time('Proof time')
    // const proofData = await websnarkUtils.genWitnessAndProve(groth16, input, circuit, proving_key) // fast but wrong?
    // const proofData = require(__dirname + '/../proof.json') // for later
    const proofData = proofSnarkJs(inputJSON, __dirname + '/../build/circuits/send') // TODO: find faster alternative
    const { proof } = websnarkUtils.toSolidityInput(proofData)
    console.timeEnd('Proof time')
  
    const args = [
      toHex(input.oldRoot),
      toHex(input.oldNullifierHash),
      toHex(input.newCommitment),
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

function proofSnarkJs(inputJSON, baseDir) {
    fs.writeFileSync(baseDir + '_input.json', inputJSON)
    
    execSync("npx snarkjs calculatewitness -c " + baseDir + ".json -i " + baseDir + "_input.json -w " + baseDir + "_witness.json") // produces witness.json
    execSync("npx snarkjs proof -w " + baseDir + "_witness.json --pk " + baseDir + "_proving_key.json -p " + baseDir + "_proof.json --pub " + baseDir + "_public.json") // produces proof.json and public.json
    const proofData = require(baseDir + '_proof.json')

    return proofData
}