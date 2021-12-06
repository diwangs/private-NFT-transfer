include "merkleTree.circom";

// Verifies that commitment that corresponds to given secret and nullifier is included in the merkle tree of deposits
template Withdraw(levels) {
    signal input root;
    signal input nullifierHash;
    signal private input nullifier;
    signal private input secret;
    signal private input tokenUidId;
    signal private input tokenUidContract;
    signal private input pathElements[levels];
    signal private input pathIndices[levels];

    // Commitment are well-formed
    component hasher = CommitmentHasher();
    hasher.nullifier <== nullifier;
    hasher.secret <== secret;
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
