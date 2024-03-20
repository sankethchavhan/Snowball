const Blockchain = require('.');
const Block = require('./block');
const {cryptohash} = require('../util');
const Wallet = require('../wallet');
const Transaction = require('../wallet/transaction');
describe('Blockchain',()=>{
	let blockchain, newChain,originalChain,errorMock;

	beforeEach(()=>{
		blockchain = new Blockchain();
		newChain = new Blockchain();
		originalChain = blockchain.chain;
		errorMock = jest.fn();
		global.console.error = errorMock;
	});
	it('contains  chain array',()=>{
		expect(blockchain.chain instanceof Array).toBe(true);
	});
	it('starts with a genesis block',()=>{
		expect(blockchain.chain[0]).toEqual(Block.genesis());
	});
	it('adds new block to the chain',()=>{
		const newData = 'Newdata';
		blockchain.addBlock({data: newData});
		expect(blockchain.chain[blockchain.chain.length - 1].data).toEqual(newData);
	});
	describe('isValidChain()',()=>{
		describe('when the chain does have genesis block',()=>{
			it('returns False',()=>{
				blockchain.chain[0] = {data:'fakegenesisdata'};
				expect(Blockchain.isValidChain(blockchain.chain)).toBe(false); 
			});
		});
		describe('it starts with genesis block and multiple blocks',()=>{
			beforeEach(()=>{
				blockchain.addBlock({data: 'Bears'});
				blockchain.addBlock({data: 'Nemo'});
				blockchain.addBlock({data: 'dory'});
			});
			describe('lasthash reference has changed',()=>{
				it('returns false',()=>{
					blockchain.chain[2].lasthash = 'broken-lasthash';
					expect(Blockchain.isValidChain(blockchain.chain)).toBe(false); 
				});
			});
			describe('There is an invalid field in the chain',()=>{
				it('returns false',()=>{
					blockchain.chain[2].data = 'broken-data';
					expect(Blockchain.isValidChain(blockchain.chain)).toBe(false); 
				});
			});
			describe('there is a block with jumped difficulty',()=>{
				it('returns false',()=>{
					const lastblock = blockchain.chain[blockchain.chain.length-1];
					const timestamp = Date.now();
					const lasthash = lastblock.hash;
					const data = [];
					const nonce = 0;
					const difficulty = lastblock.difficulty-3;
					const hash = cryptohash(timestamp,lasthash,difficulty,nonce,data);

					const badBlock = new Block({
						timestamp,lasthash,hash,nonce,difficulty,data
					});
					blockchain.chain.push(badBlock);
					expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
				});
			});
			describe('the chain is all fine',()=>{
				it('returns True',()=>{
					expect(Blockchain.isValidChain(blockchain.chain)).toBe(true);
				});
			});
		});
	});
	describe('replaceChain()',()=>{
		let logMock;
		beforeEach(()=>{
			logMock = jest.fn();
			global.console.error = errorMock;
			global.console.log = logMock;
		});

		describe('the newchain is not longer',()=>{
			beforeEach(()=>{
				newChain.chain[0] = {new:'chain'};
				blockchain.replaceChain(newChain.chain);
			});
			it('does not replace the chain',()=>{
				expect(blockchain.chain).toEqual(originalChain);
			});
			it('logs an error',()=>{
				expect(errorMock).toHaveBeenCalled();
			});
		});
		describe('when the chain is longer',()=>{
			beforeEach(()=>{
				newChain.addBlock({data: 'Bears'});
				newChain.addBlock({data: 'Nemo'});
				newChain.addBlock({data: 'dory'});
			});
			describe('the chain is invalid',()=>{
				beforeEach(()=>{
					newChain.chain[2].hash = 'Broken-hash';
					blockchain.replaceChain(newChain.chain);
				});
				it('does not replace the chain',()=>{
					expect(blockchain.chain).toEqual(originalChain);
				});
				it('logs and error',()=>{
					expect(errorMock).toHaveBeenCalled();
				});
			});
			describe('the chain is valid',()=>{
				beforeEach(()=>{
					blockchain.replaceChain(newChain.chain);
				});
				it('replaces the chain',()=>{
					expect(blockchain.chain).toEqual(newChain.chain);
				});
				it('logs chain replacement',()=>{
					expect(logMock).toHaveBeenCalled();
				});
			});
			describe('and the `validateTransactions` flag is true', () => {
				it('calls validateTransactionData()', () => {
					const validateTransactionDataMock = jest.fn();
					blockchain.validTransactionData = validateTransactionDataMock;
					newChain.addBlock({ data: 'foo' });
					blockchain.replaceChain(newChain.chain, true);
					expect(validateTransactionDataMock).toHaveBeenCalled();
				});
			});
		});
	});
	describe('validTransactionData()',()=>{
		let transaction, rewardTransaction, wallet;
		beforeEach(()=>{
			wallet = new Wallet();
			transaction = wallet.createTransaction({
				recipient: 'foof-address',
				amount: 69
			});
			rewardTransaction = Transaction.rewardTransaction({ minerWallet: wallet });
		});
		describe('the transaction is valid()',()=>{
			it('returns true',()=>{
				newChain.addBlock({data:[transaction,rewardTransaction]});
				expect(blockchain.validTransactionData({chain: newChain.chain})).toBe(true);
				expect(errorMock).not.toHaveBeenCalled();
			});
		});
		describe('and the transaction data has multiple rewards', () => {
			it('returns false and logs an error	', () => {
				newChain.addBlock({ data: [transaction, rewardTransaction, rewardTransaction] });
				expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(false);
				expect(errorMock).toHaveBeenCalled();
			});
		});
		describe('and the transaction data has at least one malformed outputMap', () => {
			describe('and the transaction is not a reward transaction', () => {
				it('returns false and logs an error', () => {
					transaction.outputMap[wallet.publicKey] = 999999;
					newChain.addBlock({ data: [transaction, rewardTransaction ]});
					expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(false);
					expect(errorMock).toHaveBeenCalled();
				});
			});
			describe('and the transaction is a reward transaciton', () => {
				it('returns false and logs an error', () => {
					rewardTransaction.outputMap[wallet.publicKey] = 999999;
					newChain.addBlock({ data: [transaction, rewardTransaction] });
					expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(false);
					expect(errorMock).toHaveBeenCalled();
				});
			});
			describe('and the transaction data has at least one malformed input', () => {
				it('returns false and logs an error', () => {
					wallet.balance = 9000;
					const evilOutputMap = {
						[wallet.publicKey]: 8900,
						fooRecipient: 100
					};
					const evilTransaction = {
						input: {
						timestamp: Date.now(),
						amount: wallet.balance,
						address: wallet.publicKey,
						signature: wallet.sign(evilOutputMap)
						},
						outputMap: evilOutputMap
					};
					newChain.addBlock({ data: [evilTransaction, rewardTransaction] });
					expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(false);
					expect(errorMock).toHaveBeenCalled();
				});
			});
			describe('and a block contains multiple identical transactions', () => {
				it('returns false and logs an error', () => {
					newChain.addBlock({
						data: [transaction, transaction, transaction, rewardTransaction]
					});
					expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(false);
					expect(errorMock).toHaveBeenCalled();
				});
			});
		});
	});
});