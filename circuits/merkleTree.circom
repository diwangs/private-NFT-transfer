include "../node_modules/circomlib/circuits/mimcsponge.circom";
include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/pedersen.circom";

// Computes MiMC([left, right])
template HashLeftRight() {
    signal input left;
    signal input right;
    signal output hash;

    component hasher = MiMCSponge(2, 1);
    hasher.ins[0] <== left;
    hasher.ins[1] <== right;
    hasher.k <== 0;
    hash <== hasher.outs[0];
}

// if s == 0 returns [in[0], in[1]]
// if s == 1 returns [in[1], in[0]]
template DualMux() {
    signal input in[2];
    signal input s;
    signal output out[2];

    s * (1 - s) === 0
    out[0] <== (in[1] - in[0])*s + in[0];
    out[1] <== (in[0] - in[1])*s + in[1];
}

// Verifies that merkle proof is correct for given merkle root and a leaf
// pathIndices input is an array of 0/1 selectors telling whether given pathElement is on the left or right side of merkle path
template MerkleTreeChecker(levels) {
    signal input leaf;
    signal input root;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    component selectors[levels];
    component hashers[levels];

    for (var i = 0; i < levels; i++) {
        selectors[i] = DualMux();
        selectors[i].in[0] <== i == 0 ? leaf : hashers[i - 1].hash;
        selectors[i].in[1] <== pathElements[i];
        selectors[i].s <== pathIndices[i];

        hashers[i] = HashLeftRight();
        hashers[i].left <== selectors[i].out[0];
        hashers[i].right <== selectors[i].out[1];
    }

    root === hashers[levels - 1].hash;
}

// computes Pedersen(nullifier + publicId)
template CommitmentHasher() {
    signal input nullifier;
    signal input publicId;
    signal input tokenUidId;
    signal input tokenUidContract;
    signal output commitment;
    signal output nullifierHash;

    component commitmentHasher = Pedersen(912);
    component nullifierHasher = Pedersen(248);

    component nullifierBits = Num2Bits(248);
    component publicIdBits = Num2Bits(256);
    component tokenUidIdBits = Num2Bits(248); // take off the most significant bit
    component tokenUidContractBits = Num2Bits(160);
    nullifierBits.in <== nullifier;
    publicIdBits.in <== publicId;
    tokenUidIdBits.in <== tokenUidId;
    tokenUidContractBits.in <== tokenUidContract;

    for (var i = 0; i < 248; i++) {
        nullifierHasher.in[i] <== nullifierBits.out[i];
        commitmentHasher.in[i] <== nullifierBits.out[i];
        commitmentHasher.in[i + 248] <== publicIdBits.out[i];
        commitmentHasher.in[i + 504] <== tokenUidIdBits.out[i];
    }
    for (var i = 248; i < 256; i++) {
        commitmentHasher.in[i + 248] <== publicIdBits.out[i];
    }
    for (var i = 0; i < 160; i++) {
        commitmentHasher.in[i + 752] <== tokenUidContractBits.out[i];
    }

    commitment <== commitmentHasher.out[0];
    nullifierHash <== nullifierHasher.out[0];
}