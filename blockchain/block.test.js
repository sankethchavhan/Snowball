const hexToBinary = require('hex-to-binary');
const Block = require('./block');
const { GENESIS_DATA,MINE_RATE } = require('../config');
const {cryptohash} = require('../util');	
describe('Block',()=>{
	const timestamp = 2000;
	const lasthash = 'lasthash';
	const hash = 'hash';
	const nonce = 1;
	const difficulty = 1;
	const data = ['blockchain','data'];
	const block = new Block({timestamp,lasthash,hash,data,nonce,difficulty});

	it('has a timestamp,lasthash,hash,data',()=>{
		expect(block.timestamp).toEqual(timestamp);
		expect(block.lasthash).toEqual(lasthash);
		expect(block.hash).toEqual(hash);
		expect(block.data).toEqual(data);
		expect(block.nonce).toEqual(nonce);
		expect(block.difficulty).toEqual(difficulty);
	});

	describe ('genesis()',()=>{
		const genesis_block = Block.genesis();
		
		it('returns a block instance', ()=>{
			expect(genesis_block instanceof Block).toBe(true);
		});
		it('genesis data', () =>{
			expect(genesis_block).toEqual(GENESIS_DATA);
		});
	});
	describe('mineblock()', () =>{
		const lastblock = Block.genesis();
		const data = 'minedblockdata';
		const minedblock = Block.mineblock({lastblock,data});

		it('returns a block instance', () =>{
			expect(minedblock instanceof Block).toBe(true);
		});
		it('sets the lasthash to be the hash of the lastblock',()=>{
			expect(minedblock.lasthash).toEqual(lastblock.hash);
		});
		it('sets the data of the minedblock',()=>{
			expect(minedblock.data).toEqual(data);
		})
		it('sets the timestamp',()=>{
			expect(minedblock.timestamp).not.toEqual(undefined);
		});
		it('creates SHA256 hashing based on proper inputs',()=>{
			expect(minedblock.hash).
			toEqual
			(cryptohash
				(minedblock.timestamp,
				minedblock.nonce,
				minedblock.difficulty,
				lastblock.hash,
				data));
		});
		it('sets the hash to be at the same difficulty as given',()=>{
			expect(hexToBinary(minedblock.hash)
			.substring(0,minedblock.difficulty))
			.toEqual('0'.repeat(minedblock.difficulty));
		});
		it('adjusts the difficulty',()=>{
			const possibleResults = [lastblock.difficulty+1,lastblock.difficulty-1];
			expect(possibleResults.includes(minedblock.difficulty)).toBe(true);
		})
	});
	describe('adjust difficulty',()=>{
		it('raises difficulty for a quickly mined block',()=>{
			expect(Block.adjustDifficulty({
				originalBlock: block,
				timestamp: block.timestamp + MINE_RATE - 100
			})).toEqual(block.difficulty+1);
		});
		it('lowers difficulty for a slowly mined block',()=>{
			expect(Block.adjustDifficulty({
				originalBlock: block,
				timestamp: block.timestamp + MINE_RATE + 100
			})).toEqual(block.difficulty-1);
		});
		it('has a lower limit of one',()=>{
			block.difficulty = -1;
			expect(Block.adjustDifficulty({originalBlock:block})).toEqual(1);
		});
	});
});


