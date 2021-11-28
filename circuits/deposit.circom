include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/pedersen.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "merkleTree.circom";

template CommitmentHasher() {
    signal input nullifier;
    signal input secret;
    signal output commitment;
    signal output nullifierHash;

    component commitmentHasher = Pedersen(496);
    component nullifierHasher = Pedersen(248);
    component nullifierBits = Num2Bits(248);
    component secretBits = Num2Bits(248);
    nullifierBits.in <== nullifier;
    secretBits.in <== secret;
    for (var i = 0; i < 248; i++) {
        nullifierHasher.in[i] <== nullifierBits.out[i];
        commitmentHasher.in[i] <== nullifierBits.out[i];
        commitmentHasher.in[i + 248] <== secretBits.out[i];
    }

    commitment <== commitmentHasher.out[0];
    nullifierHash <== nullifierHasher.out[0];
}

template Deposit(levels){
    
    signal input oldroot;
    signal input newroot;
    signal input key;
    signal input nullifierHash;
    signal ptivate input rho;
    signal private input secret;
    signal private nullifier;
    signal private oldValue;

    signal private oldKey;
    signal private relativecoin[levels];

    component hasher = CommitmentHasher();
    hasher.rho <== rho;
    hasher.secret <== secret;
    hasher.nullifierHash === nullifierHash; 

    // check if the input is equal to the output
    component checkcoin = IsEqual();
    checkcoin.in[0] <== hasher.out;
    checkcoin.in[1] <== hasher.commitment;
    checkcoin.out === 1;

    // compute cm and send cm to the ledger
    component tree = MerkleTreeChecker(levels);
    tree.leaf <== hasher.commitment;
    tree.oldroot <== oldroot;
    tree.newroot <== newroot;
    for (var i=0; i < levels; i++){
        tree.relativecoin[i] <== relativecoin[i];
    }
    tree.oldKey <== oldKey;
    tree.oldValue <== oldValue;
    tree.key <== key;
    tree.newValue <== hasher.out;
}
component main = Deposit(30);