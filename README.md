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
## Zerocoin / Tornado Cash: Static value
- $cm = h(s || h(sn))$
	- Serial number = nullifier
- $coin = (s, sn, cm)$
- Deposit
	- Send coin, 
	- Send $cm$ to $cm_list$
		- Advanced -> the list is actually merkle tree
- Withdraw
	- Send $h(sn)$, check if $sn$ has been spent in the past
	- Generate zk-proof that I know $s$ such that $h(s || h(sn))$ appears on the $cm_list$

## Zerocash: Dynamic Value + Sending
- $cm = h(s || h(pk || id || rho))$
	- $pk$ -> address? or $h(secret_key)$ for easier proving
	- $sn = h(rho)$ 
- $token = (pk, id, rho, s, cm)$
- __Deposit (mint)__
	- Client generate $rho$, $s$ and keep it secret (as a note)
	- Send token
		- tx = $cm, k, id$ 
	- Compute $cm$ and send $cm$ to $cm_list$
- __Send (pour)__
	- Create new $rho$, $s$ for a new token commitment 
	- Create proof that
		- Sender owns the old token
			- Old public key matches the sender private key
		- Old commitments appear on the ledger
			- Merkle tree path
		- Revealed serial number is computed correctly
		- Old and new token commitments are well-formed
			- $cm$ follows the formula
		- Old id == new id
	- Send old $sn$, mark in boolean hash table as spent
	- Send new $cm$, insert to the merkle-tree
	- Send new $id$, $rho$, $s$ to the recipient (out-of-band)
- __Withdraw (spend)__
	- Proof that I know $id, rho, s$  such that $cm$ appears in the $cm_list$ 
	- Send proof and $sn$
	- Check $sn$, withdraw the token
