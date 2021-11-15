const Migrations = artifacts.require("Migrations");
const UserInfo = artifacts.require("UserInfo");

module.exports = function (deployer) {
  deployer.deploy(Migrations);
  deployer.deploy(UserInfo);
};
