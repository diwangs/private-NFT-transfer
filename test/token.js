const DummyNFT = artifacts.require("UserInfo");

contract("DummyNFT", accounts => {
    it("Test awardItem ownerOf", () => {
        let nft;

        return DummyNFT.deployed()
            .then(instance => {
                nft = instance
                return nft.awardItem(accounts[0], "Some URL", {from: accounts[0]})
            })
            .then(result => {
                tokenId = result.logs[0].args.tokenId
                return nft.ownerOf(tokenId)
            })
            .then(owner => {
                assert.equal(
                    owner,
                    accounts[0],
                    "Account 0 doesn't have a token"
                );
            })
    });

    it("Test awardItem tokenURI", () => {
        let nft;

        return DummyNFT.deployed()
            .then(instance => {
                nft = instance
                return nft.awardItem(accounts[0], "Some URL", {from: accounts[0]})
            })
            .then(result => {
                tokenId = result.logs[0].args.tokenId
                return nft.tokenURI(tokenId)
            })
            .then(tokenURI => {
                console.log("Sheesh", tokenURI)
                assert.equal(
                    "Some URL",
                    tokenURI,
                    "Token metadata is wrong"
                );
            })
    });
    it("Test awardItem balanceOf",() => {
        let nft;

        return DummyNFT.deploy()
            .then(instance => {
                nft = instance
                return nft.awardItem(account[0],"Some URL", {from: account[0]})
            })
            .then(result =>{
                tokenId = result.logs[0].args.tokenId
                return nft.balanceOf(tokenId)
            })
            .then(balanceOf =>{
                console.log("address of ", owner)
                assert.equal(
                    "Owner address",
                    balanceOf,
                    "The address of the balance of this onwer doesn't exist"
                );
            })
    })
});
