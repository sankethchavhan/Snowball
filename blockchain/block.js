const hexToBinary = require('hex-to-binary');
const {GENESIS_DATA,MINE_RATE} = require('../config');
const {cryptohash} = require('../util');

class Block{
	constructor({timestamp,lasthash,hash,data,nonce,difficulty}){
		this.timestamp = timestamp;
		this.lasthash = lasthash;
		this.hash = hash;
		this.data = data;
		this.nonce = nonce;
		this.difficulty = difficulty;
	}
	static genesis() {
		return new this(GENESIS_DATA);
	}
	static mineblock({lastblock,data}){
		const lasthash = lastblock.hash;
		let hash,timestamp;
		let { difficulty } = lastblock;
		let nonce = 0;
		do{
			nonce++;
			timestamp = Date.now();
			difficulty = Block.adjustDifficulty({originalBlock:lastblock,timestamp});
			hash = cryptohash(timestamp,lasthash,data,difficulty,nonce);
		}while(hexToBinary(hash).substring(0,difficulty) !== '0'.repeat(difficulty));
		return new this({timestamp,lasthash,data,difficulty,nonce,hash});
	}
	static adjustDifficulty({originalBlock,timestamp}){
		const {difficulty} = originalBlock;
		if(difficulty<1) return 1;
		if((timestamp - originalBlock.timestamp)>MINE_RATE) return difficulty-1;
		return difficulty+1;
	}
}

module.exports = Block;