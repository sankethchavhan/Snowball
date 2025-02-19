const TransactionPool = require('./transaction-pool');
const Transaction = require('./transaction');
const Wallet = require('.');
const Blockchain = require('../blockchain');
describe('Transaction-Pool',()=>{
	let transactionPool,transaction,senderwallet;
	beforeEach(()=>{
		transactionPool = new TransactionPool();
		senderwallet = new Wallet();
		transaction = new Transaction({
			senderwallet,
			recipient: 'fake-recipient',
			amount: 50
		});
	});
	describe('set Transaction()',()=>{
		it('adds a transaction',()=>{
			transactionPool.setTransaction(transaction);
			expect(transactionPool.transactionMap[transaction.id]).toBe(transaction);
		});
	});
	describe('existing transaction()',()=>{
		it('returns an existing transaction given an input address',()=>{
			transactionPool.setTransaction(transaction);
			expect(transactionPool.existingTransaction({ inputAddress: senderwallet.publicKey}))
			.toBe(transaction);
		}); 	
	});
	describe('validTransactions()', () => {
		let validTransactions, errorMock;
	    
		beforeEach(() => {
		  validTransactions = [];
		  errorMock = jest.fn();
		  global.console.error = errorMock;
	    
		  for (let i=0; i<10; i++) {
		    transaction = new Transaction({
		      senderwallet,
		      recipient: 'any-recipient',
		      amount: 30
		    });
		    if (i%3===0) {
		      transaction.input.amount = 999999;
		    } else if (i%3===1) {
		      transaction.input.signature = new Wallet().sign('foo');
		    } else {
		      validTransactions.push(transaction);
		    }
	    
		    transactionPool.setTransaction(transaction);
		  }
		});
	    
		it('returns valid transactions', () => {
		  expect(transactionPool.validTransactions()).toEqual(validTransactions);
		});
	    
		it('logs errors for the invalid transactions', () => {
		  transactionPool.validTransactions();
		  expect(errorMock).toHaveBeenCalled();
		});
	});
	describe('clear()',()=>{
		it('clears the transaction',()=>{
			transactionPool.clear();
			expect(transactionPool.transactionMap).toEqual({});
		});
	});
	describe('clearBlockchainTransaction()',()=>{
		it('clears the pool of any existing blockchain transactions',()=>{
			const blockchain = new Blockchain();
			const expectedTransactionMap = {};
			for(let i=0;i<6;i++){
				const transaction = new Wallet().createTransaction({
					recipient: 'foo',
					amount: 20
				});
				transactionPool.setTransaction(transaction);
				if(i%2===0){
					blockchain.addBlock({data: [transaction]})
				}else {
					expectedTransactionMap[transaction.id]=transaction;
				}

			};
			transactionPool.clearBlockchainTransaction({chain: blockchain.chain});
			expect(transactionPool.transactionMap).toEqual(expectedTransactionMap);
		});
	});
});