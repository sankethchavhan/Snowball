const PubNub = require('pubnub');
const credentials = {
	publishKey: 'pub-c-d798a84f-d48e-406c-8912-df9a77d8aaf9',
	subscribeKey: 'sub-c-1bff3338-8fd9-42df-a35f-cb0b5f227a17',
	secretKey: 'sec-c-YjE4Yzc4YzUtNGNiNy00YTMzLWI1YTctZWU0NmViOGVkNTY4',
	userId: 'sanketh09'
};
const CHANNELS={
	TEST:'TEST',
	BLOCKCHAIN: 'BLOCKCHAIN',
	TRANSACTION: 'TRANSACTION'
}	
class PubSub{
	constructor({blockchain,transactionPool,wallet}) {
		this.blockchain = blockchain;
		this.transactionPool = transactionPool;
		this.wallet = wallet;
		this.pubnub = new PubNub(credentials);
		this.pubnub.subscribe({channels:Object.values(CHANNELS)});
		this.pubnub.addListener(this.listener());
	}
	handleMessage(channel, message) {
		console.log(`Message received. \nChannel: ${channel}. \nMessage: ${message}`);
		const parsedMessage = JSON.parse(message);
		switch(channel){
			case CHANNELS.BLOCKCHAIN:
				this.blockchain.replaceChain(parsedMessage,true,()=>{
					this.transactionPool.clearBlockchainTransactions({
						chain: parsedMessage
					});
				});
				break;
			case CHANNELS.TRANSACTION:
				if (!this.transactionPool.existingTransaction({
					inputAddress: this.wallet.publicKey
				})) {
					this.transactionPool.setTransaction(parsedMessage);
				}
				break;
			default:
				return;
		}
	}
	listener(){
		return {
			message: messageObject=>{
				const{channel,message}=messageObject;
				this.handleMessage(channel, message);
			}
		}
	}
	publish({ channel, message}) {
		this.pubnub.publish({ channel, message });
	}
	broadcastChain() {
		this.publish({
		  channel: CHANNELS.BLOCKCHAIN,
		  message: JSON.stringify(this.blockchain.chain)
		});
	}
	broadcastTransaction(transaction){
		this.publish({
			channel: CHANNELS.TRANSACTION,
			message: JSON.stringify(transaction)
		});
	}
}

module.exports = PubSub;
