pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/drafts/Counters.sol";

contract UserInfo is ERC721Full{
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    constructor() ERC721Full("UserInfo", "ITM") public {
    }
    function awardItem(address tx_address, float memory tx_amount) public returns (uint256) {
        _tokenIds.increment();

        uint256 newItemId = _tokenIds.current();
        _mint(tx_address, newItemId);
        _setTokenURI(newItemId, tx_amount);

        return newItemId;
    }

}