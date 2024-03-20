const { v4: uuidv4 } = require('uuid');	
const { verifySignature } = require('../util');
const { REWARD_INPUT, MINING_REWARD } = require('../config');
class Transaction{
	constructor({senderwallet,recipient,amount,outputMap,input}){
		this.id = uuidv4();
		this.outputMap = outputMap || this.createOutputMap({ senderwallet, recipient, amount });
		this.input = input || this.createInput({ senderwallet, outputMap: this.outputMap });
	}
	createOutputMap({ senderwallet, recipient, amount }) {
		const outputMap = {};
	    
		outputMap[recipient] = amount;
		outputMap[senderwallet.publicKey] = senderwallet.balance - amount;
	    
		return outputMap;
	}     
	createInput({senderwallet,outputMap}){
		return {
			timestamp: Date.now(),
			amount: senderwallet.balance,
			address: senderwallet.publicKey,
			signature: senderwallet.sign(outputMap)
		};
	}
	update({senderwallet,recipient,amount}){
		if(amount>this.outputMap[senderwallet.publicKey]){
			throw new Error('amount exceeds balance');
		}
		if(!this.outputMap[recipient]){
			this.outputMap[recipient] = amount;
		}else{
			this.outputMap[recipient]=this.outputMap[recipient]+amount;
		}
		this.outputMap[senderwallet.publicKey]= this.outputMap[senderwallet.publicKey] - amount;
		this.input = this.createInput({senderwallet,outputMap:this.outputMap});
	}
	static validTransaction(transaction){
		const {input:{amount,signature,address},outputMap} = transaction;
		const outputTotal = Object.values(outputMap).reduce((total,outputAmount)=>total+outputAmount);
		if(amount!==outputTotal){
			console.error('transaction is invalid, from: ',address);
			return false;
		}
		if(!verifySignature({publicKey:address,data:outputMap,signature})){
			console.error('signature is invalid, from: ',address);
			return false;
		}
		return true;
	}
	static rewardTransaction({minerWallet}){
		return new this({
			input: REWARD_INPUT,
			outputMap: {[minerWallet.publicKey]:MINING_REWARD} 
		})
	}
}

module.exports = Transaction;