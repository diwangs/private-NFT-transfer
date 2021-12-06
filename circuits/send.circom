include "merkleTree.circom";

//create proof of old commitment on ledger and sender owns the old token 
template Send(levels){
    signal input oldRoot;
    signal input oldNullifierHash;
    signal input newCommitment;
    signal private input oldNullifier;
    signal private input oldSecret;
    signal private input oldTokenUidId;
    signal private input oldTokenUidContract;
    signal private input oldPathElements[levels];
    signal private input oldPathIndices[levels];
    signal private input newNullifier;
    signal private input newSecret;
    signal private input newTokenUidId;
    signal private input newTokenUidContract;

    // Old commitment is well-formed
    component oldHasher = CommitmentHasher();
    oldHasher.nullifier <== oldNullifier;
    oldHasher.secret <== oldSecret;
    oldHasher.tokenUidId  <== oldTokenUidId;
    oldHasher.tokenUidContract <== oldTokenUidContract;
    oldHasher.nullifierHash === oldNullifierHash; // Serial number computed correctly?

    // Old commitment appears on the ledger
    component tree = MerkleTreeChecker(levels);
    tree.leaf <== oldHasher.commitment;
    tree.root <== oldRoot;
    for (var i = 0; i < levels; i++) {
        tree.pathElements[i] <== oldPathElements[i];
        tree.pathIndices[i] <== oldPathIndices[i];
    }

    // New commitment is well-formed
    component newHasher = CommitmentHasher();
    newHasher.nullifier <== newNullifier;
    newHasher.secret <== newSecret;
    newHasher.tokenUidId <== newTokenUidId;
    newHasher.tokenUidContract <== newTokenUidContract;
    newHasher.commitment === newCommitment;

    // New commitment uid == old commitment uid
    oldTokenUidId === newTokenUidId;
    oldTokenUidContract === newTokenUidContract;
}

component main = Send(20);