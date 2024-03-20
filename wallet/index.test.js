const Wallet = require('.');
const Transaction = require('./transaction');
const {verifySignature} = require('../util');
const Blockchain = require('../blockchain');
const { STARTING_BALANCE } = require('../config');
describe ('Wallet', ()=>{
	let wallet;
	beforeEach(()=>{
		wallet = new Wallet();
	});
	it('has a balance',()=>{
		expect(wallet).toHaveProperty('balance');
	});
	it('has a public key',()=>{
		expect(wallet).toHaveProperty('publicKey');
	});
	describe('signing data',()=>{
		const data = 'foobar';
		it('verfies signature',()=>{
			expect(
				verifySignature({
					publicKey: wallet.publicKey,
					data,
					signature: wallet.sign(data)
				})
			).toBe(true);
		});
		it('does not verify a invalid signature',()=>{
			expect(
				verifySignature({
					publicKey: wallet.publicKey,
					data,
					signature: new Wallet().sign(data)
				})
			).toBe(false);
		});
	});
	describe('create Transaction',()=>{
		describe('the amount exceeds the balance',()=>{
			it('throws an error',()=>{
				expect(()=>wallet.createTransaction({amount:999999,recipient:'foo-recipient'}))
				.toThrow('amount exceeds the balance');
			})
		});
		describe('the amount is valid',()=>{
			let transaction,amount,recipient;
			beforeEach(()=>{
				amount=50;
				recipient= 'foo-recpient';
				transaction = wallet.createTransaction({amount,recipient});
			})
			it('creates an instance of transaction',()=>{
				expect(transaction instanceof Transaction).toBe(true);
			});	
			it('matches the transaction input matches the wallet',()=>{
				expect(transaction.input.address).toEqual(wallet.publicKey);
			});
			it('outputs the amount of recipient',()=>{
				expect(transaction.outputMap[recipient]).toEqual(amount);
			});
		});
		describe('chain is passed',()=>{
			it('calls wallet.calculateBalance()',()=>{
				const calculateBalanceMock = jest.fn();
				const originalCalculatebalance = Wallet.calculateBalance;
				Wallet.calculateBalance = calculateBalanceMock;
				Wallet.calculateBalance = calculateBalanceMock;
				wallet.createTransaction({
					recipient: 'fof',
					amount: 40,
					chain: new Blockchain().chain
				});
				expect(calculateBalanceMock).toHaveBeenCalled();
				Wallet.calculateBalance = originalCalculatebalance;
			});
		});
	});;
	describe('calculateBalance()',()=>{
		let blockchain;
		beforeEach(()=>{
			blockchain = new Blockchain();
		});
		describe('there are no ouputs for the wallet',()=>{
			it('returns starting balance',()=>{
				expect(Wallet.calculateBalance({
					chain: blockchain.chain,
					address: wallet.publicKey,
				})).toEqual(STARTING_BALANCE);
			});
		});
		describe('there are some outputs for the wallet',()=>{
			let transactionOne, transactionTwo;
			beforeEach(()=>{
				transactionOne = new Wallet().createTransaction({
					recipient: wallet.publicKey,
					amount: 50
				});
				transactionTwo = new Wallet().createTransaction({
					recipient: wallet.publicKey,
					amount: 100
				});
				blockchain.addBlock({data:[transactionOne,transactionTwo]});
			});
			it('adds the sum of all outputs to the wallet balance', () => {
				expect(
				  Wallet.calculateBalance({
				    chain: blockchain.chain,
				    address: wallet.publicKey
				  })
				).toEqual(
				  STARTING_BALANCE +
				  transactionOne.outputMap[wallet.publicKey] +
				  transactionTwo.outputMap[wallet.publicKey]
				);
			});
			describe('our wallet has made a transaction',()=>{
				let recentTransaction;
				beforeEach(()=>{
					recentTransaction = wallet.createTransaction({
						recipient: 'foof',
						amount: 30
					});
					blockchain.addBlock({data:[recentTransaction]});
				});
				it('returns the output amount of recentTransaction',()=>{
					expect(
						Wallet.calculateBalance({
							chain: blockchain.chain,
							address: wallet.publicKey
						})
					).toEqual(recentTransaction.outputMap[wallet.publicKey]);
				});
				describe('there are outputs next and after recent transaction',()=>{
					let sameBlockTransaction,nextBlockTransaction;
					beforeEach(()=>{
						recentTransaction = wallet.createTransaction({
							recipient: 'later-foof',
							amount: 60
						});
						sameBlockTransaction = Transaction.rewardTransaction({minerWallet:wallet});
						blockchain.addBlock({data:[recentTransaction,sameBlockTransaction]});
						nextBlockTransaction = new Wallet().createTransaction({
							recipient: wallet.publicKey,
							amount:75
						});
						blockchain.addBlock({data:[nextBlockTransaction]});
					});
					it('includes the output amount',()=>{
						expect(
							Wallet.calculateBalance({
								chain: blockchain.chain,
								address: wallet.publicKey
							})
						).toEqual(
							recentTransaction.outputMap[wallet.publicKey]+
							sameBlockTransaction.outputMap[wallet.publicKey]+
							nextBlockTransaction.outputMap[wallet.publicKey]
							);
					});

				});
			});
		});
	});
});