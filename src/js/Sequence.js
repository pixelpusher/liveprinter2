import { parseStrudel as uzu } from "lp-language";

class Sequence {
    #array;
    #currentIndex;
    /**
    * Creates a new Sequence instance.
    * @param {...*} args - The initial array to set, or elements to include.
    * @throws {TypeError} If the provided argument is not an array.
    */
    constructor(...args) {
        this.set(...args);
    }
    /**
    * Sets the array for the sequence and resets the current index.
    * Accepts either an array or a list of elements.
    * @param {...*} args - The new array to set, or elements to include.
    */
    set(...args) {
        // console.log('Sequence: set called with arguments:', args);
        if (args.length === 1 && args[0] !=  null) 
        {
            // console.log('Sequence: set received a single argument, processing:', args[0]);
            // array or iterable
            if (Array.isArray(args[0])) {
                this.#array = args[0];
            }
            // string that needs parsing
            else if (typeof args[0] === 'string') {
                // console.log('Sequence: Warning - input string', args[0]);
                
                if (args[0].includes('[') && args[0].includes(']')) { // strudel uzu minigrammar parsing
                    // console.log('Sequence: Warning - uzu string', args[0]);
                    
                    try {
                        const parsed = uzu(args[0]); // might be (uzu syntax string, beats)
                        if (Array.isArray(parsed)) {
                            this.#array = parsed;
                            // console.log('Sequence: Successfully parsed uzu string into array:', this.#array);
                        } else {
                            throw new TypeError(`set: Error in Uzu parsing, check the syntax because parsed string did not result in an array: ${args[0]}`);
                        }
                    } catch (e) {
                        throw new TypeError(`set: Failed to parse Uzu string, check the syntax: ${args}`);
                    }
                } 
                else if (args[0].match(/,/)) { // just a string with commas, split on commas
                    // console.log('Sequence: Warning - input string contains commas, splitting on commas. If this is not intended, check the input string:', args[0]);
                    this.#array = args[0].split(',').map(item => item.trim()).filter(char => char.length > 0);
                } else {
                    // console.log('Sequence: Warning - input string with spaces', args[0]);
                    
                    // just a string with no commas, split on spaces
                    this.#array = args[0].split(' ').map(item => item.trim()).filter(char => char.length > 0);
                }
            }
        }
        else if (args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'number')
            {
                // console.log('Sequence: Warning - input string with 2 arguments, treating as Uzu string with beats', args);
                try {
                    const parsed = uzu(args[0], args[1]); // might be (uzu syntax string, beats)
                    if (Array.isArray(parsed)) {
                        this.#array = parsed;
                        // console.log('Sequence: Successfully parsed uzu string with beats into array:', this.#array);
                    } else {
                        throw new TypeError(`set: Error in Uzu parsing with beats, check the syntax because parsed string did not result in an array: ${args}`);
                    }
                } catch (e) {
                    throw new TypeError(`set: Failed to parse Uzu string with beats, check the syntax: ${args}`);
                }
            }
            else {
                this.#array = args;
            }
            if (!Array.isArray(args)) throw new TypeError('set: Argument must be an array, iterable or list of elements');
        // prime for 1st element
        this.#currentIndex = this.#array.length > 0 ? this.#array.length-1 : 0;
    }
    /**
    * Gets the item at the specified index in the sequence.
    * @param {number} index - The index of the item to retrieve.
    * @returns {*} The item at the specified index, or undefined if the index is out of bounds.
    */
    get(index) {
        if (this.empty()) return undefined;
        if (index < 0 || index >= this.#array.length) {
            return undefined; // or throw an error if you prefer
        }
        return this.#array[index];
    }
    
    /**
    * Gets the current index in the sequence.
    * @returns {number} The current index.
    */
    next(step = 1) {
        if (!step || typeof step !== 'number') {
            step = 1; // default step is 1
        }
        if (this.empty()) return undefined;
        this.#currentIndex += step;
        this.#currentIndex %= this.#array.length; // wrap around
        // handle negative indices
        if (this.#currentIndex < 0) {
            this.#currentIndex = this.#array.length + this.#currentIndex;
        }
        return this.#array[this.#currentIndex];
    }
    /**
    * Gets the previous item in the sequence.
    * @param {number} [step=1] - The number of steps to go back.
    * @returns {*} The previous item in the sequence, or undefined if the sequence is empty.
    */
    prev(step = 1) {
        if (!step || typeof step !== 'number') {
            step = 1; // default step is 1
        }
        return this.next(-step);
    }
    /**
    * Gets the current item in the sequence.
    * @returns {*} The current item in the sequence, or undefined if the sequence is empty.
    */
    get current() {
        if (this.empty()) return undefined;
        return this.#array[this.#currentIndex];
    }
    /**
    * Resets the current index to the start of the sequence.
    */
    rewind() {
        this.#currentIndex = 0;
    }
    /**
    * Checks if the sequence is empty.
    * @returns {boolean} True if the sequence is empty, false otherwise.
    */
    empty() {
        return !this.#array || this.#array.length === 0;
    }
    /**
    * Gets the length of the sequence.
    * @returns {number} The length of the sequence.
    */
    get length() {
        return this.#array.length;
    }
    
    get array() {
        return this.#array;
    } 
    
    /**
    * Returns a string representation of the sequence starting from the current index.
    * @returns {string} A string representation of the sequence.
    */   
    toString() {
        if (this.empty()) return '';
        let result = '';
        for (let i = 0; i < this.#array.length; i++) {
            if (i > 0) result += ', ';
            result += this.#array[(i + this.#currentIndex) % this.#array.length];
        }
        return result;
    }
}

export default Sequence;