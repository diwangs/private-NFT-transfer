include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/pedersen.circom";
include "merkleTree.circom";

//create proof of old commitment on ledger and sender owns the old token 
template Send(levels){
    signal input oldRoot;
    signal input oldNullifierHash;
    signal input newCommitment;
    signal private input oldNullifier;
    signal private input oldSecretId;
    signal private input oldTokenUidId;
    signal private input oldTokenUidContract;
    signal private input oldPathElements[levels];
    signal private input oldPathIndices[levels];
    signal private input newNullifier;
    signal private input newPublicId;
    signal private input newTokenUidId;
    signal private input newTokenUidContract;

    // Get publicId from secretId
    component publicIdHasher = Pedersen(248);
    component secretIdBits = Num2Bits(248);
    secretIdBits.in <== oldSecretId;
    for (var i = 0; i < 248; i++) {
        publicIdHasher.in[i] <== secretIdBits.out[i]
    }

    // Old commitment is well-formed
    component oldHasher = CommitmentHasher();
    oldHasher.nullifier <== oldNullifier;
    oldHasher.publicId <== publicIdHasher.out[0];
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
    newHasher.publicId <== newPublicId;
    newHasher.tokenUidId <== newTokenUidId;
    newHasher.tokenUidContract <== newTokenUidContract;
    newHasher.commitment === newCommitment;

    // New commitment uid == old commitment uid
    oldTokenUidId === newTokenUidId;
    oldTokenUidContract === newTokenUidContract;
}

component main = Send(20);