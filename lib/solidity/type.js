

var f = require('./formatters');
var SolidityParam = require('./param');

/**
 * SolidityType prototype is used to encode/decode solidity params of certain type
 */
var SolidityType = function (config) {
    this._inputFormatter = config.inputFormatter;
    this._outputFormatter = config.outputFormatter;
};

/**
 * Should be used to determine if this SolidityType do match given type
 *
 * @method isType
 * @param {String} name
 * @return {Bool} true if type match this SolidityType, otherwise false
 */
SolidityType.prototype.isType = function (name) {
    throw "this method should be overrwritten!";
};

SolidityType.prototype.encode = function (value, name) {
    if (this.isDynamicArray(name)) {
        var length = value.length;                          // in int
        var nestedName = this.nestedName(name);

        var result = [];
        result.push(f.formatInputInt(length).encode());
        
        var self = this;
        value.forEach(function (v) {
            result.push(self.encode(v, nestedName));
        });

        return result;
    } else if (this.isStaticArray(name)) {
        var length = this.staticArrayLength(name);          // in int
        var nestedName = this.nestedName(name);

        var result = [];
        for (var i = 0; i < length; i++) {
            result.push(this.encode(value[i], nestedName));
        }

        return result;
    }

    return this._inputFormatter(value, name).encode();
};

/**
 * Should be used to decode params from bytes
 *
 * @method decode
 * @param {String} bytes
 * @param {Number} offset in bytes
 * @param {String} name type name
 * @returns {SolidityParam} param
 */
SolidityType.prototype.decode = function (bytes, offset, name) {
    if (this.isDynamicArray(name)) {
        var arrayOffset = parseInt('0x' + bytes.substr(offset * 2, 64)); // in bytes
        var length = parseInt('0x' + bytes.substr(arrayOffset * 2, 64)); // in int
        var arrayStart = arrayOffset + 32; // array starts after length; // in bytes

        var nestedName = this.nestedName(name);
        var nestedStaticPartLength = this.staticPartLength(nestedName);  // in bytes
        var result = [];

        for (var i = 0; i < length * nestedStaticPartLength; i += nestedStaticPartLength) {
            result.push(this.decode(bytes, arrayStart + i, nestedName));
        }

        return result;
    } else if (this.isStaticArray(name)) {
        var length = this.staticArrayLength(name);                      // in int
        var arrayStart = offset;                                        // in bytes

        var nestedName = this.nestedName(name);
        var nestedStaticPartLength = this.staticPartLength(nestedName); // in bytes
        var result = [];

        for (var i = 0; i < length * nestedStaticPartLength; i += nestedStaticPartLength) {
            result.push(this.decode(bytes, arrayStart + i, nestedName));
        }

        return result;
    }

    var length = this.staticPartLength(name);
    return this._outputFormatter(new SolidityParam(bytes.substr(offset * 2, length * 2)));
};

module.exports = SolidityType;
