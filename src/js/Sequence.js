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
     * Gets the current array of the sequence.
     * @returns {Array} The current array.
     */
    get array() {
        return this.#array;
    }
    /**
     * Sets the array for the sequence and resets the current index.
     * Accepts either an array or a list of elements.
     * @param {...*} args - The new array to set, or elements to include.
     */
    set(...args) {
        let array;
        if (args.length === 1 && Array.isArray(args[0])) {
            array = args[0];
        } else {
            array = args;
        }
        if (!Array.isArray(array)) throw new TypeError('Argument must be an array or list of elements');
        this.#array = array;
        // prime for 1st element
        this.#currentIndex = this.#array.length > 0 ? this.#array.length-1 : 0;
    }
    /**
     * Gets the current index in the sequence.
     * @returns {number} The current index.
     */
    next(step = 1) {
        if (!step || typeof step !== 'number') {
            step = 1; // default step is 1
        }
        if (this.#array.length === 0) return undefined;
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
    current() {
        if (this.#array.length === 0) return undefined;
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
    length() {
        return this.#array.length;
    }
    /**
     * Returns a string representation of the sequence starting from the current index.
     * @returns {string} A string representation of the sequence.
     */    
    toString() {
        if (!this.#array || this.#array.length === 0) return '';
        let result = '';
        for (let i = 0; i < this.#array.length; i++) {
            if (i > 0) result += ', ';
            result += this.#array[(i + this.#currentIndex) % this.#array.length];
        }
        return result;
    }
}

export default Sequence;