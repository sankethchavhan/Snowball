const Block = require('./block');
const {cryptohash} = require('../util');
const Transaction = require('../wallet/transaction');
const Wallet = require('../wallet');
const transactionSet = new Set();
const { REWARD_INPUT, MINING_REWARD } = require('../config');
class Blockchain {
	constructor() {
	    this.chain = [Block.genesis()];
	}
    
	addBlock({data}) {
	    const newBlock = Block.mineblock({
		lastblock : this.chain[this.chain.length - 1], // Retrieve last block
		data
	    });
	    this.chain.push(newBlock);
	}
	replaceChain(chain,validateTransactions,onSuccess){
		if(chain.length <= this.chain.length){
			console.error('this incoming chain must be longer');
			return;
		}
		if(!Blockchain.isValidChain(chain)){
			console.error('this incoming chain must be valid');
			return;
		}
		if (validateTransactions && !this.validTransactionData({ chain })) {
			console.error('The incoming chain has invalid data');
			return;
		}
		if(onSuccess) onSuccess();
		console.log('replacing the chain with',chain);
		this.chain = chain;
	}
	validTransactionData({ chain }) {
		for (let i=1; i<chain.length; i++) {
			const block = chain[i];
			let rewardTransactionCount = 0;
			for (let transaction of block.data) {
				if (transaction.input.address === REWARD_INPUT.address) {
					rewardTransactionCount += 1;
					if (rewardTransactionCount > 1) {
						console.error('Miner rewards exceeds limit');
						return false;
					}
					if (Object.values(transaction.outputMap)[0] !== MINING_REWARD) {
						console.error('Miner reward amount is invalid');
						return false;
					}
				} else {
					if (!Transaction.validTransaction(transaction)) {
						console.error('Invalid transaction');
						return false;
					}
					const trueBalance = Wallet.calculateBalance({
						chain: this.chain,
						address: transaction.input.address
					});
					if (transaction.input.amount !== trueBalance) {
						console.error('Invalid input amount');
						return false;
					}
					if (transactionSet.has(transaction)) {
						console.error('An identical transaction appears more than once in the block');
						return false;
					} else {
						transactionSet.add(transaction);
					}
				}
			}
		}
		return true;
	}
	static isValidChain(chain){
		if(JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis())) {return false};
		for(let i = 1; i<chain.length;i++){
			const {timestamp,lasthash,hash,data,difficulty,nonce} = chain[i];
			const actualLastHash = chain[i-1].hash;
			const lastDifficulty = chain[i-1].difficulty;
			if(lasthash!==actualLastHash) return false;
			const validatedhash = cryptohash(timestamp,lasthash,data,difficulty,nonce);
			if(hash!==validatedhash) return false;
			if(Math.abs(lastDifficulty - difficulty)>1) return false;
		}
		return true;
	}
}

module.exports = Blockchain;
    