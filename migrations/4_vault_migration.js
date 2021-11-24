const Vault = artifacts.require("Vault");
const Hasher = artifacts.require("Hasher");
const MERKLE_TREE_HEIGHT = 20;

module.exports = async function (deployer, network, accounts) {
  const hasher = await Hasher.deployed();
  await deployer.deploy(Vault, hasher.address, MERKLE_TREE_HEIGHT);
};
