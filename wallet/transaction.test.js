const Transaction = require ('./transaction');
const Wallet = require('.');
const { verifySignature } = require('../util');
const { REWARD_INPUT, MINING_REWARD } = require('../config');
describe('Transaction',()=>{
	let transaction,senderwallet,recipient,amount;
	beforeEach(()=>{
		senderwallet = new Wallet();
		recipient = 'recipient-public-key';
		amount = 200;
		transaction = new Transaction({senderwallet,recipient,amount});
	});
	it('has an Id',()=>{
		expect(transaction).toHaveProperty('id');
	});
	describe('outputMap',()=>{
		it('has an outputMap',()=>{
			expect(transaction).toHaveProperty('outputMap');
		});
		it('outputs the amount to the recipient',()=>{
			expect(transaction.outputMap[recipient]).toEqual(amount);
		});
		it('outputs the remaining amount to the senderwallet',()=>{
			expect(transaction.outputMap[senderwallet.publicKey])
			.toEqual(senderwallet.balance - amount);
		});
	});
	describe('input',()=>{
		it('has a input',()=>{
			expect(transaction).toHaveProperty('input');
		});
		it('has a timestamp in th input',()=>{
			expect(transaction.input).toHaveProperty('timestamp');
		});
		it('sets the amount to senderwallet balance',()=>{
			expect(transaction.input.amount).toEqual(senderwallet.balance);
		});
		it('sets the address to the senderwallet publickey',()=>{
			expect(transaction.input.address).toEqual(senderwallet.publicKey);
		});
		it('signs the input',()=>{
			expect(
				verifySignature({
					publicKey: senderwallet.publicKey,
					data: transaction.outputMap,
					signature: transaction.input.signature
				})
			).toBe(true);
		});
	});
	describe('validTransaction()',()=>{
		let errorMock;
		beforeEach(()=>{
			errorMock = jest.fn();
			global.console.error = errorMock;
		});
		describe('when the transaction is valid',()=>{
			it('retruns true',()=>{
				expect(Transaction.validTransaction(transaction)).toBe(true);
			});
		});
		describe('when the transaction is invalid',()=>{
			describe('transaction outputMap is invalid',()=>{
				it('returns false and logs an error',()=>{
					transaction.outputMap[senderwallet.publicKey]=99999;
					expect(Transaction.validTransaction(transaction)).toBe(false);
					expect(errorMock).toHaveBeenCalled();
				});
			});
			describe('transaction input signature is invalid',()=>{
				it('returns false and logs an error',()=>{
					transaction.input.signature = new Wallet().sign('data');
					expect(Transaction.validTransaction(transaction)).toBe(false);
					expect(errorMock).toHaveBeenCalled();
				});
			});
		});
	});
	describe('update()',()=>{
		let originalSignature,originalSenderOutput,nextRecipient,nextAmount;
		describe('the amount is invalid',()=>{
			it('throws an error',()=>{
				expect(()=>{
					transaction.update({
						senderwallet,
						recipient:'foo',
						amount:999999
					});
				}).toThrow('amount exceeds balance');
			});
		});
		describe('amount is valid',()=>{
			beforeEach(()=>{
				originalSignature = transaction.input.signature;
				originalSenderOutput = transaction.outputMap[senderwallet.publicKey];
				nextRecipient = 'next-recipient';
				nextAmount = 50; 
				transaction.update({
					senderwallet,
					recipient:nextRecipient,
					amount:nextAmount
				});
			});
			it('outputs the amount to the next recipient',()=>{
				expect(transaction.outputMap[nextRecipient]).toEqual(nextAmount);
			});
			it('subtracts the amount from senderwallet output amount',()=>{
				expect(transaction.outputMap[senderwallet.publicKey])
				.toEqual(originalSenderOutput-nextAmount);
			});
			it('maintains a total output that matches the input amount',()=>{
				expect(
					Object.values(transaction.outputMap)
					.reduce((total,outputAmount)=> total+outputAmount))
					.toEqual(transaction.input.amount);
			});
			it('re-signs the transaction',()=>{
				expect(transaction.input.signature).not.toEqual(originalSignature);
			});
			describe('another update for same recipient',()=>{
				let addedAmount;
				beforeEach(()=>{
					addedAmount = 80;
					transaction.update({
						senderwallet,
						recipient:nextRecipient,
						amount: addedAmount
					});
				});
				it('adds to the recipient amount',()=>{
					expect(transaction.outputMap[nextRecipient])
					.toEqual(nextAmount+addedAmount);
				});
				it('subtract new amount from originalSender output amount',()=>{
					expect(transaction.outputMap[senderwallet.publicKey])
					.toEqual(originalSenderOutput-nextAmount-addedAmount);
				});
			});
		});
	});
	describe('reward Transaction()',()=>{
		let rewardTransaction, minerWallet;
		beforeEach(()=>{
			minerWallet = new Wallet();
			rewardTransaction = Transaction.rewardTransaction({minerWallet});
		});
		it('creates a transaction with the reward input',()=>{
			expect(rewardTransaction.input).toEqual(REWARD_INPUT);
		})
		it('creates ones transaction for the miner with the mining reward',()=>{
			expect(rewardTransaction.outputMap[minerWallet.publicKey]).toEqual(MINING_REWARD);
		});
	});
});