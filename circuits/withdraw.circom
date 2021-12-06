include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/pedersen.circom";
include "merkleTree.circom";

// Verifies that commitment that corresponds to given secret and nullifier is included in the merkle tree of deposits
template Withdraw(levels) {
    signal input root;
    signal input nullifierHash;
    signal private input tokenUidId;
    signal private input tokenUidContract;
    signal private input nullifier;
    signal private input secretId;
    signal private input pathElements[levels];
    signal private input pathIndices[levels];

    // Get publicId from secretId
    component publicIdHasher = Pedersen(248);
    component secretIdBits = Num2Bits(248);
    secretIdBits.in <== secretId;
    for (var i = 0; i < 248; i++) {
        publicIdHasher.in[i] <== secretIdBits.out[i]
    }

    // Commitment are well-formed
    component hasher = CommitmentHasher();
    hasher.nullifier <== nullifier;
    hasher.publicId <== publicIdHasher.out[0];
    hasher.tokenUidId  <== tokenUidId;
    hasher.tokenUidContract <== tokenUidContract;
    hasher.nullifierHash === nullifierHash; // Serial number computed correctly?

    // Commitment appears on the ledger
    component tree = MerkleTreeChecker(levels);
    tree.leaf <== hasher.commitment;
    tree.root <== root;
    for (var i = 0; i < levels; i++) {
        tree.pathElements[i] <== pathElements[i];
        tree.pathIndices[i] <== pathIndices[i];
    }
}

component main = Withdraw(20);
