/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message` 
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persisten storage method.
 *  
 */

const SHA256 = require('crypto-js/sha256');
const BlockClass = require('./block.js');
const bitcoinMessage = require('bitcoinjs-message');

class Blockchain {

    /**
     * Constructor of the class, you will need to setup your chain array and the height
     * of your chain (the length of your chain array).
     * Also everytime you create a Blockchain class you will need to initialized the chain creating
     * the Genesis Block.
     * The methods in this class will always return a Promise to allow client applications or
     * other backends to call asynchronous functions.
     */
    constructor() {
        this.chain = [];
        this.height = -1;
        this.initializeChain();
    }

    /**
     * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
     * You should use the `addBlock(block)` to create the Genesis Block
     * Passing as a data `{data: 'Genesis Block'}`
     */
    async initializeChain() {
        if( this.height === -1){
            let block = new BlockClass.Block({data: 'Genesis Block'});
            await this._addBlock(block);
        }
    }

    /**
     * Utility method that return a Promise that will resolve with the height of the chain
     */
    getChainHeight() {
        return new Promise((resolve, reject) => {
            resolve(this.height);
        });
    }

    /**
     * _addBlock(block) will store a block in the chain
     * @param {*} block 
     * The method will return a Promise that will resolve with the block added
     * or reject if an error happen during the execution.
     * You will need to check for the height to assign the `previousBlockHash`,
     * assign the `timestamp` and the correct `height`...At the end you need to 
     * create the `block hash` and push the block into the chain array. Don't for get 
     * to update the `this.height`
     * Note: the symbol `_` in the method name indicates in the javascript convention 
     * that this method is a private method. 
     */
    _addBlock(block) {
        let self = this;
        return new Promise(async (resolve, reject) => {

           if (self.chain.length > 0) { // i.e genesis block already exists
            block.previousBlockHash = self.chain[self.chain.length - 1].hash;
           }

           block.time = new Date().getTime().toString().slice(0,-3);
           block.height = self.height + 1;
           block.hash = SHA256(JSON.stringify(block)).toString();
           self.chain.push(block)
           self.height += 1;

           // validate chain after adding new block
           await self.validateChain().then((errorLog) => {

            if (errorLog.length > 0) {
                // revert changes to chain
                self.chain.pop(); // remove latest (invalid) block
                self.height -= 1;
                reject(errorLog);
            } else { // no validation errors, all good 
                resolve(block);
            }
           }).catch((error) => {
            // revert changes to chain
            self.chain.pop(); // remove latest (invalid) block
            self.height -= 1;
            reject(error)
           });
        });
    }

    /**
     * The requestMessageOwnershipVerification(address) method
     * will allow you  to request a message that you will use to
     * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
     * This is the first step before submit your Block.
     * The method return a Promise that will resolve with the message to be signed
     * @param {*} address 
     */
    requestMessageOwnershipVerification(address) {
        return new Promise((resolve) => {
            resolve(`${address}:${new Date().getTime().toString().slice(0,-3)}:starRegistry`);
        });
    }

    /**
     * The submitStar(address, message, signature, star) method
     * will allow users to register a new Block with the star object
     * into the chain. This method will resolve with the Block added or
     * reject with an error.
     * Algorithm steps:
     * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
     * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
     * 3. Check if the time elapsed is less than 5 minutes
     * 4. Veify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
     * 5. Create the block and add it to the chain
     * 6. Resolve with the block added.
     * @param {*} address 
     * @param {*} message 
     * @param {*} signature 
     * @param {*} star 
     */
    submitStar(address, message, signature, star) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            let messageTimestamp = parseInt(message.split(':')[1]);
            let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));
            let timeElapsed = currentTime - messageTimestamp
            
            // pass new parameters (messagePrefix, checkSegwitAlways ) to support segwit signature
            // see (https://github.com/bitcoinjs/bitcoinjs-message#about-electrum-segwit-signature-support)
            let verifiedMessage = bitcoinMessage.verify(message, address, signature, null, true);

            if (timeElapsed < 0) {
                reject("Invalid Time. Message timestamp is from the future!")
            } else if (timeElapsed >= 300) { // 5 mins in secs => 60 * 5 = 300 sec
                reject("Expired Message. 5 mins grace to sign message exceeded!")
            } else if (!verifiedMessage) {
                reject("Message signature verification failed!")
            } else {
                let block = new BlockClass.Block({'owner': address, 'star': star})
                await self._addBlock(block);
                resolve(block) 
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block
     *  with the hash passed as a parameter.
     * Search on the chain array for the block that has the hash.
     * @param {*} hash 
     */
    getBlockByHash(hash) {
        let self = this;
        return new Promise((resolve, reject) => {
           let matchingBlocks = self.chain.filter(block => block.hash == hash);
           if (matchingBlocks.length > 0) {
            resolve(matchingBlocks[0])
           } else {
            // reject(Error("No matching block found"))
            resolve(null) // error not being handled in calling function, resolve null to avoid exception
           }
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block object 
     * with the height equal to the parameter `height`
     * @param {*} height 
     */
    getBlockByHeight(height) {
        let self = this;
        return new Promise((resolve, reject) => {
            let block = self.chain.filter(p => p.height === height)[0];
            if(block){
                resolve(block);
            } else {
                resolve(null);
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with an array of Stars objects existing in the chain 
     * and are belongs to the owner with the wallet address passed as parameter.
     * Remember the star should be returned decoded.
     * @param {*} address 
     */
    getStarsByWalletAddress(address) {
        let self = this;
        let stars = [];
        return new Promise((resolve, reject) => {
            stars = self.chain.filter((block, index) => index > 0 && block.getBData().then((data) => {
                data.owner === address
            }).catch((error) => reject(error)));
            resolve(stars);
        });
    }

    /**
     * This method will return a Promise that will resolve with the list of errors when validating the chain.
     * Steps to validate:
     * 1. You should validate each block using `validateBlock`
     * 2. Each Block should check the with the previousBlockHash
     * 
     * David's Comments
     * Instruction 1: "Must validate each block using validateBlock()"
     * Solution Implemented:
     *      ValidateBlock() function does not exist, so i assume the 
     *      instruction means to call valide each block using the 
     *      validate() method for each block.
     * 
     * Instruction 2: Each Block should check the with the previousBlockHash
     * Solution Implemented:
     *      1. Retrieve hash of the preceeding block in the chain 
     *         (stored as `previousBlockHash` in the current chain)
     *      2. Recompute the hash of the previous block in the chain
     *      3. Compare value stored in previousBlockHash of the current chain and 
     *         the new value computed as the new hash for the previous block.
     *      4. The previous block is valid (i.e unchanged / not tempered with) if the values of both hashes match.
     *
     *  Explanation:
     *      I think what this second step of the validation is trying to achieve
     *      is to determine if a particular block in the chain has been modified by using 
     *      the block mined immediately after to confirm if the value of the block
     *      has been modified after the next block was added.
     *      i.e
     *      Imagine two blocks A and B. Block B was mined, immediately after block A. 
     *      ... A -> B ...
     * 
     *      If block A, is modified after Block B has been created and added to the chain, 
     *      then, if the hash of block A is recomputed now, the value will be different
     *      from the value of `previousBlockHash` stored in B. 
     * 
     *      ================
     *      In simpler terms
     *      ================
     *      
     *      Since the first step checks that the current block itself is still valid,
     *      If that verification is successful, then we can then use the current block to 
     *      validate the previous block. 
     *      That can be done by recomputing the hash of the previous block, and then 
     *      comparing the value stored as the previousHash in the current block with the 
     *      newly computed hash.
     * 
     * 
     */
    validateChain() {
        let self = this;
        let errorLog = [];
        return new Promise(async (resolve, reject) => {
            let blocks = self.chain.entries();
            for (const block_item of blocks) {
                let height = block_item[0]
                let block = block_item[1];

                // validate the block
                block.validate().then((validBlock) => {
                    if (!validBlock) {
                        errorLog.push(`Block ${JSON.stringify(block)} is not valid`)
                    }
                }).catch(
                    (error) => {errorLog.push(error)})
                
                // validate the previous block in the chain
                if (height > 0) {
                    let previousBlock = self.chain[height - 1];
                    if (block.previousBlockHash != previousBlock.hash) {
                        errorLog.push(
                            Error(`Hash of Previous Block (${previousBlock.hash}) != PreviousBlockHash (${block.previousBlockHash}) of current block`).message)
                    }
                }
            };

            resolve(errorLog);

        });
    }

}

module.exports.Blockchain = Blockchain;   