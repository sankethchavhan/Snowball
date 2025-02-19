const Transaction = require('./transaction');
const {STARTING_BALANCE} = require('../config');
const {ec,cryptohash} = require('../util');
class Wallet{
	constructor(){
		this.balance = STARTING_BALANCE;
		this.keyPair = ec.genKeyPair();
		this.publicKey = this.keyPair.getPublic().encode('hex');
	}
	sign(data){
		return this.keyPair.sign(cryptohash(data));
	}
	createTransaction({recipient,amount,chain}){
		if(chain){
			this.balance = Wallet.calculateBalance({
				chain,
				address: this.publicKey,
			});
		}
		if(amount>this.balance){
			throw new Error('amount exceeds the balance1');
		}
		return new Transaction({senderwallet: this,recipient,amount});
	}
	static calculateBalance({ chain, address }) {
		let outputsTotal = 0;
		let hasConductedTransaction = false;
	    
		for (let i = chain.length - 1; i > 0; i--) {
		    const block = chain[i];
		    for (let transaction of block.data) {
			if (transaction.input.address === address) {
			    hasConductedTransaction = true;
			}
			const addressOutput = transaction.outputMap[address];
			if (addressOutput) {
			    outputsTotal += addressOutput;
			}
		    }
		    if (hasConductedTransaction) {
			break;
		    }
		}
	    
		return hasConductedTransaction ? outputsTotal : STARTING_BALANCE + outputsTotal;
	    }
	    

}

module.exports = Wallet;