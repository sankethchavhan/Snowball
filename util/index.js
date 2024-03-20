const EC = require('elliptic').ec;
const ec = new EC('secp256k1');
const cryptohash = require('./cryptohash');
const verifySignature = ({publicKey,data,signature})=>{
	const keyFromPublic = ec.keyFromPublic(publicKey, 'hex');
	return keyFromPublic.verify(cryptohash(data),signature);
};
module.exports={ec,verifySignature,cryptohash};
