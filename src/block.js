/**
 *                          Block class
 *  The Block class is a main component into any Blockchain platform, 
 *  it will store the data and act as a dataset for your application.
 *  The class will expose a method to validate the data... The body of
 *  the block will contain an Object that contain the data to be stored,
 *  the data should be stored encoded.
 *  All the exposed methods should return a Promise to allow all the methods 
 *  run asynchronous.
 */

const SHA256 = require('crypto-js/sha256');
const hex2ascii = require('hex2ascii');

class Block {

    // Constructor - argument data will be the object containing the transaction data
	constructor(data){
		this.hash = null;                                           // Hash of the block
		this.height = 0;                                            // Block Height (consecutive number of each block)
		this.body = Buffer.from(JSON.stringify(data)).toString('hex');   // Will contain the transactions stored in the block, by default it will encode the data
		this.time = 0;                                              // Timestamp for the Block creation
		this.previousBlockHash = null;                              // Reference to the previous Block Hash
    }
    
    /**
     *  validate() method will validate if the block has been tampered or not.
     *  Been tampered means that someone from outside the application tried to change
     *  values in the block data as a consecuence the hash of the block should be different.
     *  Steps:
     *  1. Return a new promise to allow the method be called asynchronous.
     *  2. Save the in auxiliary variable the current hash of the block (`this` represent the block object)
     *  3. Recalculate the hash of the entire block (Use SHA256 from crypto-js library)
     *  4. Compare if the auxiliary hash value is different from the calculated one.
     *  5. Resolve true or false depending if it is valid or not.
     *  Note: to access the class values inside a Promise code you need to create an auxiliary value `let self = this;`
     * 
     * 
     * David's Comments
     * This is my understanding of how the steps above achieve validation.
     * 1. At the point of creating a block, our program automatically computes a hash value of the block 
     *    and set this as the `hash` property of the block.
     * 2. If this block is modified in any way i.e the properties of the block are altered, then 
     *    when the hash of the block is recomputed, it will give a different value. 
     * 3. To validate a block, we recompute the hash, and compare it with initially value of the hash generated when 
     *    the block was originally created. (Remember this is stored as the property `hash` in the block itself)
     * 4. If the new computed hash, is different from the stored hash, then the block has been modified.
     * 
     * 
     * Follow Up Question
     * ==================
     * Question: What is preventing whoever altered the property
     *           from reculating the hash of the block after altering and setting that as the new hash though?
     * 
     * Ans: In our current implementation, nothing really, but on a standard blockhain, confirmations would have happened
     *      which requires that other blocks be mined and added to the blockchain after this particular block.
     *      So if you do change properties of this block, and even update the hash, you will then need to 
     *      update previousHash values for all blocks added to the chain after this block and also
     *      recalculate their hashes. Which is computational tedious. And even if you do succeed, there is still
     *      the concensus bit. Other nodes in the network need to agree with your new version of the chain.)
     * 
     * Interesting Gotcha
     * ==================
     * When the initial value of the `hash` property is calculated, the hash property in the block at that point
     * is set to the default value  of "null", because of course, the hash of the block is just being calculated for the first time
     * so this value could not possibly exist yet.
     * 
     * When the hash of the block is to be recalculated for comparison, the `hash` field of the block at that point will no longer
     * be `null` as this would have been updated with the hash value after the first calculation. 
     * Now, recalculating the hash of the block (bearing in mind that hash property would have changed from null) will
     * necessarily mean that the two hashed can never be the same. 
     * To get the initially value, the hash must be recalculated while exempting the `hash` property of the block 
     * because that was how it was initially calculated.
     * 
     */
    validate() {
        let self = this;
        return new Promise((resolve, reject) => {
            // Save in auxiliary variable the current block hash
            let currentHash = self.hash;
            // temporarily reset `hash` property to `null`
            // i.e the default value when the hash was initially calculated
            self.hash = null;                                 
            // Recalculate the hash of the Block
            let newHash = SHA256(JSON.stringify(self)).toString();
            // revert temp change to hash
            self.hash = currentHash;
            // Comparing if the hashes changed
            if (currentHash !== newHash) {
                // Returning the Block is not valid
                resolve(false)
            } else {
                // Returning the Block is valid
                resolve(true);
            }

        });
    }

    /**
     *  Auxiliary Method to return the block body (decoding the data)
     *  Steps:
     *  
     *  1. Use hex2ascii module to decode the data
     *  2. Because data is a javascript object use JSON.parse(string) to get the Javascript Object
     *  3. Resolve with the data and make sure that you don't need to return the data for the `genesis block` 
     *     or Reject with an error.
     */
    getBData() {
        let self = this;
        return new Promise((resolve, reject) => {
            // Getting the encoded data saved in the Block
            let encodedData = self.body;
            // Decoding the data to retrieve the JSON representation of the object
            let decodedData = hex2ascii(encodedData).toString();
            // Parse the data to an object to be retrieve.
            let data = JSON.parse(decodedData);
            // Resolve with the data if the object isn't the Genesis block
            if (this.height === 0) {
                reject("Cannot return data for Genesis Block!")
            } else {
                resolve(data);
            }
        });
    }

}

module.exports.Block = Block;                    // Exposing the Block class as a module