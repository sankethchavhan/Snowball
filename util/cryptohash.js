const crypto = require('crypto')
const cryptohash = (...inputs) =>{
	const hash = crypto.createHash('SHA256');
	hash.update(inputs.map(input => JSON.stringify(input)).sort().join(' '));
	return hash.digest('hex');
}

module.exports = cryptohash;
