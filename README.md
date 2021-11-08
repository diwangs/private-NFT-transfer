# Ethereum Ecosystem
- Standard token -> ERC-20
- NFT -> a standard (ERC-721)

# Ethereum and JavaScript
- MetaMask
- web3.js
- Ganache

# ZK-SNARK Circuits
- Circom
- Flow:
	- ZK proof generation client (web, circom)
	- ZK proof verification to on Solidity (other contract)

# ZK-SNARK Transfer
- Not interested in hiding the attributes, only the owner
- ERC-721 is owned by the contract, needs to create circuits that transfers ownership internally
- Sends withdrawal / ownership proofs off-chain (semi-honest?)
	- Withdrawal proofs and payment are disconnected
- Flow possibilities:
	- Arbitrary transaction between two parties
		- Proves that transaction happens without revealing sender and receiver
		- Needs to record the sequence of proofs?
		- Privacy is as good as the amount of users in the system
	- Buyer bids to creator, creator sends it to buyer
		- ZK bids?

# Plan
- Create dummy ERC-721 token and another contracts that stores them
- Modify the deposit contract for ZK proving?