var vrf = (function (exports) {
	'use strict';

	var commonjsGlobal$1 = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	function getAugmentedNamespace(n) {
		if (n.__esModule) return n;
		var a = Object.defineProperty({}, '__esModule', {value: true});
		Object.keys(n).forEach(function (k) {
			var d = Object.getOwnPropertyDescriptor(n, k);
			Object.defineProperty(a, k, d.get ? d : {
				enumerable: true,
				get: function () {
					return n[k];
				}
			});
		});
		return a;
	}

	function commonjsRequire (path) {
		throw new Error('Could not dynamically require "' + path + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
	}

	var lib$1 = {};

	var bn = {exports: {}};

	(function (module) {
	(function (module, exports) {

	  // Utils
	  function assert (val, msg) {
	    if (!val) throw new Error(msg || 'Assertion failed');
	  }

	  // Could use `inherits` module, but don't want to move from single file
	  // architecture yet.
	  function inherits (ctor, superCtor) {
	    ctor.super_ = superCtor;
	    var TempCtor = function () {};
	    TempCtor.prototype = superCtor.prototype;
	    ctor.prototype = new TempCtor();
	    ctor.prototype.constructor = ctor;
	  }

	  // BN

	  function BN (number, base, endian) {
	    if (BN.isBN(number)) {
	      return number;
	    }

	    this.negative = 0;
	    this.words = null;
	    this.length = 0;

	    // Reduction context
	    this.red = null;

	    if (number !== null) {
	      if (base === 'le' || base === 'be') {
	        endian = base;
	        base = 10;
	      }

	      this._init(number || 0, base || 10, endian || 'be');
	    }
	  }
	  if (typeof module === 'object') {
	    module.exports = BN;
	  } else {
	    exports.BN = BN;
	  }

	  BN.BN = BN;
	  BN.wordSize = 26;

	  var Buffer;
	  try {
	    if (typeof window !== 'undefined' && typeof window.Buffer !== 'undefined') {
	      Buffer = window.Buffer;
	    } else {
	      Buffer = require('buffer').Buffer;
	    }
	  } catch (e) {
	  }

	  BN.isBN = function isBN (num) {
	    if (num instanceof BN) {
	      return true;
	    }

	    return num !== null && typeof num === 'object' &&
	      num.constructor.wordSize === BN.wordSize && Array.isArray(num.words);
	  };

	  BN.max = function max (left, right) {
	    if (left.cmp(right) > 0) return left;
	    return right;
	  };

	  BN.min = function min (left, right) {
	    if (left.cmp(right) < 0) return left;
	    return right;
	  };

	  BN.prototype._init = function init (number, base, endian) {
	    if (typeof number === 'number') {
	      return this._initNumber(number, base, endian);
	    }

	    if (typeof number === 'object') {
	      return this._initArray(number, base, endian);
	    }

	    if (base === 'hex') {
	      base = 16;
	    }
	    assert(base === (base | 0) && base >= 2 && base <= 36);

	    number = number.toString().replace(/\s+/g, '');
	    var start = 0;
	    if (number[0] === '-') {
	      start++;
	      this.negative = 1;
	    }

	    if (start < number.length) {
	      if (base === 16) {
	        this._parseHex(number, start, endian);
	      } else {
	        this._parseBase(number, base, start);
	        if (endian === 'le') {
	          this._initArray(this.toArray(), base, endian);
	        }
	      }
	    }
	  };

	  BN.prototype._initNumber = function _initNumber (number, base, endian) {
	    if (number < 0) {
	      this.negative = 1;
	      number = -number;
	    }
	    if (number < 0x4000000) {
	      this.words = [number & 0x3ffffff];
	      this.length = 1;
	    } else if (number < 0x10000000000000) {
	      this.words = [
	        number & 0x3ffffff,
	        (number / 0x4000000) & 0x3ffffff
	      ];
	      this.length = 2;
	    } else {
	      assert(number < 0x20000000000000); // 2 ^ 53 (unsafe)
	      this.words = [
	        number & 0x3ffffff,
	        (number / 0x4000000) & 0x3ffffff,
	        1
	      ];
	      this.length = 3;
	    }

	    if (endian !== 'le') return;

	    // Reverse the bytes
	    this._initArray(this.toArray(), base, endian);
	  };

	  BN.prototype._initArray = function _initArray (number, base, endian) {
	    // Perhaps a Uint8Array
	    assert(typeof number.length === 'number');
	    if (number.length <= 0) {
	      this.words = [0];
	      this.length = 1;
	      return this;
	    }

	    this.length = Math.ceil(number.length / 3);
	    this.words = new Array(this.length);
	    for (var i = 0; i < this.length; i++) {
	      this.words[i] = 0;
	    }

	    var j, w;
	    var off = 0;
	    if (endian === 'be') {
	      for (i = number.length - 1, j = 0; i >= 0; i -= 3) {
	        w = number[i] | (number[i - 1] << 8) | (number[i - 2] << 16);
	        this.words[j] |= (w << off) & 0x3ffffff;
	        this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
	        off += 24;
	        if (off >= 26) {
	          off -= 26;
	          j++;
	        }
	      }
	    } else if (endian === 'le') {
	      for (i = 0, j = 0; i < number.length; i += 3) {
	        w = number[i] | (number[i + 1] << 8) | (number[i + 2] << 16);
	        this.words[j] |= (w << off) & 0x3ffffff;
	        this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
	        off += 24;
	        if (off >= 26) {
	          off -= 26;
	          j++;
	        }
	      }
	    }
	    return this._strip();
	  };

	  function parseHex4Bits (string, index) {
	    var c = string.charCodeAt(index);
	    // '0' - '9'
	    if (c >= 48 && c <= 57) {
	      return c - 48;
	    // 'A' - 'F'
	    } else if (c >= 65 && c <= 70) {
	      return c - 55;
	    // 'a' - 'f'
	    } else if (c >= 97 && c <= 102) {
	      return c - 87;
	    } else {
	      assert(false, 'Invalid character in ' + string);
	    }
	  }

	  function parseHexByte (string, lowerBound, index) {
	    var r = parseHex4Bits(string, index);
	    if (index - 1 >= lowerBound) {
	      r |= parseHex4Bits(string, index - 1) << 4;
	    }
	    return r;
	  }

	  BN.prototype._parseHex = function _parseHex (number, start, endian) {
	    // Create possibly bigger array to ensure that it fits the number
	    this.length = Math.ceil((number.length - start) / 6);
	    this.words = new Array(this.length);
	    for (var i = 0; i < this.length; i++) {
	      this.words[i] = 0;
	    }

	    // 24-bits chunks
	    var off = 0;
	    var j = 0;

	    var w;
	    if (endian === 'be') {
	      for (i = number.length - 1; i >= start; i -= 2) {
	        w = parseHexByte(number, start, i) << off;
	        this.words[j] |= w & 0x3ffffff;
	        if (off >= 18) {
	          off -= 18;
	          j += 1;
	          this.words[j] |= w >>> 26;
	        } else {
	          off += 8;
	        }
	      }
	    } else {
	      var parseLength = number.length - start;
	      for (i = parseLength % 2 === 0 ? start + 1 : start; i < number.length; i += 2) {
	        w = parseHexByte(number, start, i) << off;
	        this.words[j] |= w & 0x3ffffff;
	        if (off >= 18) {
	          off -= 18;
	          j += 1;
	          this.words[j] |= w >>> 26;
	        } else {
	          off += 8;
	        }
	      }
	    }

	    this._strip();
	  };

	  function parseBase (str, start, end, mul) {
	    var r = 0;
	    var b = 0;
	    var len = Math.min(str.length, end);
	    for (var i = start; i < len; i++) {
	      var c = str.charCodeAt(i) - 48;

	      r *= mul;

	      // 'a'
	      if (c >= 49) {
	        b = c - 49 + 0xa;

	      // 'A'
	      } else if (c >= 17) {
	        b = c - 17 + 0xa;

	      // '0' - '9'
	      } else {
	        b = c;
	      }
	      assert(c >= 0 && b < mul, 'Invalid character');
	      r += b;
	    }
	    return r;
	  }

	  BN.prototype._parseBase = function _parseBase (number, base, start) {
	    // Initialize as zero
	    this.words = [0];
	    this.length = 1;

	    // Find length of limb in base
	    for (var limbLen = 0, limbPow = 1; limbPow <= 0x3ffffff; limbPow *= base) {
	      limbLen++;
	    }
	    limbLen--;
	    limbPow = (limbPow / base) | 0;

	    var total = number.length - start;
	    var mod = total % limbLen;
	    var end = Math.min(total, total - mod) + start;

	    var word = 0;
	    for (var i = start; i < end; i += limbLen) {
	      word = parseBase(number, i, i + limbLen, base);

	      this.imuln(limbPow);
	      if (this.words[0] + word < 0x4000000) {
	        this.words[0] += word;
	      } else {
	        this._iaddn(word);
	      }
	    }

	    if (mod !== 0) {
	      var pow = 1;
	      word = parseBase(number, i, number.length, base);

	      for (i = 0; i < mod; i++) {
	        pow *= base;
	      }

	      this.imuln(pow);
	      if (this.words[0] + word < 0x4000000) {
	        this.words[0] += word;
	      } else {
	        this._iaddn(word);
	      }
	    }

	    this._strip();
	  };

	  BN.prototype.copy = function copy (dest) {
	    dest.words = new Array(this.length);
	    for (var i = 0; i < this.length; i++) {
	      dest.words[i] = this.words[i];
	    }
	    dest.length = this.length;
	    dest.negative = this.negative;
	    dest.red = this.red;
	  };

	  function move (dest, src) {
	    dest.words = src.words;
	    dest.length = src.length;
	    dest.negative = src.negative;
	    dest.red = src.red;
	  }

	  BN.prototype._move = function _move (dest) {
	    move(dest, this);
	  };

	  BN.prototype.clone = function clone () {
	    var r = new BN(null);
	    this.copy(r);
	    return r;
	  };

	  BN.prototype._expand = function _expand (size) {
	    while (this.length < size) {
	      this.words[this.length++] = 0;
	    }
	    return this;
	  };

	  // Remove leading `0` from `this`
	  BN.prototype._strip = function strip () {
	    while (this.length > 1 && this.words[this.length - 1] === 0) {
	      this.length--;
	    }
	    return this._normSign();
	  };

	  BN.prototype._normSign = function _normSign () {
	    // -0 = 0
	    if (this.length === 1 && this.words[0] === 0) {
	      this.negative = 0;
	    }
	    return this;
	  };

	  // Check Symbol.for because not everywhere where Symbol defined
	  // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol#Browser_compatibility
	  if (typeof Symbol !== 'undefined' && typeof Symbol.for === 'function') {
	    try {
	      BN.prototype[Symbol.for('nodejs.util.inspect.custom')] = inspect;
	    } catch (e) {
	      BN.prototype.inspect = inspect;
	    }
	  } else {
	    BN.prototype.inspect = inspect;
	  }

	  function inspect () {
	    return (this.red ? '<BN-R: ' : '<BN: ') + this.toString(16) + '>';
	  }

	  /*

	  var zeros = [];
	  var groupSizes = [];
	  var groupBases = [];

	  var s = '';
	  var i = -1;
	  while (++i < BN.wordSize) {
	    zeros[i] = s;
	    s += '0';
	  }
	  groupSizes[0] = 0;
	  groupSizes[1] = 0;
	  groupBases[0] = 0;
	  groupBases[1] = 0;
	  var base = 2 - 1;
	  while (++base < 36 + 1) {
	    var groupSize = 0;
	    var groupBase = 1;
	    while (groupBase < (1 << BN.wordSize) / base) {
	      groupBase *= base;
	      groupSize += 1;
	    }
	    groupSizes[base] = groupSize;
	    groupBases[base] = groupBase;
	  }

	  */

	  var zeros = [
	    '',
	    '0',
	    '00',
	    '000',
	    '0000',
	    '00000',
	    '000000',
	    '0000000',
	    '00000000',
	    '000000000',
	    '0000000000',
	    '00000000000',
	    '000000000000',
	    '0000000000000',
	    '00000000000000',
	    '000000000000000',
	    '0000000000000000',
	    '00000000000000000',
	    '000000000000000000',
	    '0000000000000000000',
	    '00000000000000000000',
	    '000000000000000000000',
	    '0000000000000000000000',
	    '00000000000000000000000',
	    '000000000000000000000000',
	    '0000000000000000000000000'
	  ];

	  var groupSizes = [
	    0, 0,
	    25, 16, 12, 11, 10, 9, 8,
	    8, 7, 7, 7, 7, 6, 6,
	    6, 6, 6, 6, 6, 5, 5,
	    5, 5, 5, 5, 5, 5, 5,
	    5, 5, 5, 5, 5, 5, 5
	  ];

	  var groupBases = [
	    0, 0,
	    33554432, 43046721, 16777216, 48828125, 60466176, 40353607, 16777216,
	    43046721, 10000000, 19487171, 35831808, 62748517, 7529536, 11390625,
	    16777216, 24137569, 34012224, 47045881, 64000000, 4084101, 5153632,
	    6436343, 7962624, 9765625, 11881376, 14348907, 17210368, 20511149,
	    24300000, 28629151, 33554432, 39135393, 45435424, 52521875, 60466176
	  ];

	  BN.prototype.toString = function toString (base, padding) {
	    base = base || 10;
	    padding = padding | 0 || 1;

	    var out;
	    if (base === 16 || base === 'hex') {
	      out = '';
	      var off = 0;
	      var carry = 0;
	      for (var i = 0; i < this.length; i++) {
	        var w = this.words[i];
	        var word = (((w << off) | carry) & 0xffffff).toString(16);
	        carry = (w >>> (24 - off)) & 0xffffff;
	        if (carry !== 0 || i !== this.length - 1) {
	          out = zeros[6 - word.length] + word + out;
	        } else {
	          out = word + out;
	        }
	        off += 2;
	        if (off >= 26) {
	          off -= 26;
	          i--;
	        }
	      }
	      if (carry !== 0) {
	        out = carry.toString(16) + out;
	      }
	      while (out.length % padding !== 0) {
	        out = '0' + out;
	      }
	      if (this.negative !== 0) {
	        out = '-' + out;
	      }
	      return out;
	    }

	    if (base === (base | 0) && base >= 2 && base <= 36) {
	      // var groupSize = Math.floor(BN.wordSize * Math.LN2 / Math.log(base));
	      var groupSize = groupSizes[base];
	      // var groupBase = Math.pow(base, groupSize);
	      var groupBase = groupBases[base];
	      out = '';
	      var c = this.clone();
	      c.negative = 0;
	      while (!c.isZero()) {
	        var r = c.modrn(groupBase).toString(base);
	        c = c.idivn(groupBase);

	        if (!c.isZero()) {
	          out = zeros[groupSize - r.length] + r + out;
	        } else {
	          out = r + out;
	        }
	      }
	      if (this.isZero()) {
	        out = '0' + out;
	      }
	      while (out.length % padding !== 0) {
	        out = '0' + out;
	      }
	      if (this.negative !== 0) {
	        out = '-' + out;
	      }
	      return out;
	    }

	    assert(false, 'Base should be between 2 and 36');
	  };

	  BN.prototype.toNumber = function toNumber () {
	    var ret = this.words[0];
	    if (this.length === 2) {
	      ret += this.words[1] * 0x4000000;
	    } else if (this.length === 3 && this.words[2] === 0x01) {
	      // NOTE: at this stage it is known that the top bit is set
	      ret += 0x10000000000000 + (this.words[1] * 0x4000000);
	    } else if (this.length > 2) {
	      assert(false, 'Number can only safely store up to 53 bits');
	    }
	    return (this.negative !== 0) ? -ret : ret;
	  };

	  BN.prototype.toJSON = function toJSON () {
	    return this.toString(16, 2);
	  };

	  if (Buffer) {
	    BN.prototype.toBuffer = function toBuffer (endian, length) {
	      return this.toArrayLike(Buffer, endian, length);
	    };
	  }

	  BN.prototype.toArray = function toArray (endian, length) {
	    return this.toArrayLike(Array, endian, length);
	  };

	  var allocate = function allocate (ArrayType, size) {
	    if (ArrayType.allocUnsafe) {
	      return ArrayType.allocUnsafe(size);
	    }
	    return new ArrayType(size);
	  };

	  BN.prototype.toArrayLike = function toArrayLike (ArrayType, endian, length) {
	    this._strip();

	    var byteLength = this.byteLength();
	    var reqLength = length || Math.max(1, byteLength);
	    assert(byteLength <= reqLength, 'byte array longer than desired length');
	    assert(reqLength > 0, 'Requested array length <= 0');

	    var res = allocate(ArrayType, reqLength);
	    var postfix = endian === 'le' ? 'LE' : 'BE';
	    this['_toArrayLike' + postfix](res, byteLength);
	    return res;
	  };

	  BN.prototype._toArrayLikeLE = function _toArrayLikeLE (res, byteLength) {
	    var position = 0;
	    var carry = 0;

	    for (var i = 0, shift = 0; i < this.length; i++) {
	      var word = (this.words[i] << shift) | carry;

	      res[position++] = word & 0xff;
	      if (position < res.length) {
	        res[position++] = (word >> 8) & 0xff;
	      }
	      if (position < res.length) {
	        res[position++] = (word >> 16) & 0xff;
	      }

	      if (shift === 6) {
	        if (position < res.length) {
	          res[position++] = (word >> 24) & 0xff;
	        }
	        carry = 0;
	        shift = 0;
	      } else {
	        carry = word >>> 24;
	        shift += 2;
	      }
	    }

	    if (position < res.length) {
	      res[position++] = carry;

	      while (position < res.length) {
	        res[position++] = 0;
	      }
	    }
	  };

	  BN.prototype._toArrayLikeBE = function _toArrayLikeBE (res, byteLength) {
	    var position = res.length - 1;
	    var carry = 0;

	    for (var i = 0, shift = 0; i < this.length; i++) {
	      var word = (this.words[i] << shift) | carry;

	      res[position--] = word & 0xff;
	      if (position >= 0) {
	        res[position--] = (word >> 8) & 0xff;
	      }
	      if (position >= 0) {
	        res[position--] = (word >> 16) & 0xff;
	      }

	      if (shift === 6) {
	        if (position >= 0) {
	          res[position--] = (word >> 24) & 0xff;
	        }
	        carry = 0;
	        shift = 0;
	      } else {
	        carry = word >>> 24;
	        shift += 2;
	      }
	    }

	    if (position >= 0) {
	      res[position--] = carry;

	      while (position >= 0) {
	        res[position--] = 0;
	      }
	    }
	  };

	  if (Math.clz32) {
	    BN.prototype._countBits = function _countBits (w) {
	      return 32 - Math.clz32(w);
	    };
	  } else {
	    BN.prototype._countBits = function _countBits (w) {
	      var t = w;
	      var r = 0;
	      if (t >= 0x1000) {
	        r += 13;
	        t >>>= 13;
	      }
	      if (t >= 0x40) {
	        r += 7;
	        t >>>= 7;
	      }
	      if (t >= 0x8) {
	        r += 4;
	        t >>>= 4;
	      }
	      if (t >= 0x02) {
	        r += 2;
	        t >>>= 2;
	      }
	      return r + t;
	    };
	  }

	  BN.prototype._zeroBits = function _zeroBits (w) {
	    // Short-cut
	    if (w === 0) return 26;

	    var t = w;
	    var r = 0;
	    if ((t & 0x1fff) === 0) {
	      r += 13;
	      t >>>= 13;
	    }
	    if ((t & 0x7f) === 0) {
	      r += 7;
	      t >>>= 7;
	    }
	    if ((t & 0xf) === 0) {
	      r += 4;
	      t >>>= 4;
	    }
	    if ((t & 0x3) === 0) {
	      r += 2;
	      t >>>= 2;
	    }
	    if ((t & 0x1) === 0) {
	      r++;
	    }
	    return r;
	  };

	  // Return number of used bits in a BN
	  BN.prototype.bitLength = function bitLength () {
	    var w = this.words[this.length - 1];
	    var hi = this._countBits(w);
	    return (this.length - 1) * 26 + hi;
	  };

	  function toBitArray (num) {
	    var w = new Array(num.bitLength());

	    for (var bit = 0; bit < w.length; bit++) {
	      var off = (bit / 26) | 0;
	      var wbit = bit % 26;

	      w[bit] = (num.words[off] >>> wbit) & 0x01;
	    }

	    return w;
	  }

	  // Number of trailing zero bits
	  BN.prototype.zeroBits = function zeroBits () {
	    if (this.isZero()) return 0;

	    var r = 0;
	    for (var i = 0; i < this.length; i++) {
	      var b = this._zeroBits(this.words[i]);
	      r += b;
	      if (b !== 26) break;
	    }
	    return r;
	  };

	  BN.prototype.byteLength = function byteLength () {
	    return Math.ceil(this.bitLength() / 8);
	  };

	  BN.prototype.toTwos = function toTwos (width) {
	    if (this.negative !== 0) {
	      return this.abs().inotn(width).iaddn(1);
	    }
	    return this.clone();
	  };

	  BN.prototype.fromTwos = function fromTwos (width) {
	    if (this.testn(width - 1)) {
	      return this.notn(width).iaddn(1).ineg();
	    }
	    return this.clone();
	  };

	  BN.prototype.isNeg = function isNeg () {
	    return this.negative !== 0;
	  };

	  // Return negative clone of `this`
	  BN.prototype.neg = function neg () {
	    return this.clone().ineg();
	  };

	  BN.prototype.ineg = function ineg () {
	    if (!this.isZero()) {
	      this.negative ^= 1;
	    }

	    return this;
	  };

	  // Or `num` with `this` in-place
	  BN.prototype.iuor = function iuor (num) {
	    while (this.length < num.length) {
	      this.words[this.length++] = 0;
	    }

	    for (var i = 0; i < num.length; i++) {
	      this.words[i] = this.words[i] | num.words[i];
	    }

	    return this._strip();
	  };

	  BN.prototype.ior = function ior (num) {
	    assert((this.negative | num.negative) === 0);
	    return this.iuor(num);
	  };

	  // Or `num` with `this`
	  BN.prototype.or = function or (num) {
	    if (this.length > num.length) return this.clone().ior(num);
	    return num.clone().ior(this);
	  };

	  BN.prototype.uor = function uor (num) {
	    if (this.length > num.length) return this.clone().iuor(num);
	    return num.clone().iuor(this);
	  };

	  // And `num` with `this` in-place
	  BN.prototype.iuand = function iuand (num) {
	    // b = min-length(num, this)
	    var b;
	    if (this.length > num.length) {
	      b = num;
	    } else {
	      b = this;
	    }

	    for (var i = 0; i < b.length; i++) {
	      this.words[i] = this.words[i] & num.words[i];
	    }

	    this.length = b.length;

	    return this._strip();
	  };

	  BN.prototype.iand = function iand (num) {
	    assert((this.negative | num.negative) === 0);
	    return this.iuand(num);
	  };

	  // And `num` with `this`
	  BN.prototype.and = function and (num) {
	    if (this.length > num.length) return this.clone().iand(num);
	    return num.clone().iand(this);
	  };

	  BN.prototype.uand = function uand (num) {
	    if (this.length > num.length) return this.clone().iuand(num);
	    return num.clone().iuand(this);
	  };

	  // Xor `num` with `this` in-place
	  BN.prototype.iuxor = function iuxor (num) {
	    // a.length > b.length
	    var a;
	    var b;
	    if (this.length > num.length) {
	      a = this;
	      b = num;
	    } else {
	      a = num;
	      b = this;
	    }

	    for (var i = 0; i < b.length; i++) {
	      this.words[i] = a.words[i] ^ b.words[i];
	    }

	    if (this !== a) {
	      for (; i < a.length; i++) {
	        this.words[i] = a.words[i];
	      }
	    }

	    this.length = a.length;

	    return this._strip();
	  };

	  BN.prototype.ixor = function ixor (num) {
	    assert((this.negative | num.negative) === 0);
	    return this.iuxor(num);
	  };

	  // Xor `num` with `this`
	  BN.prototype.xor = function xor (num) {
	    if (this.length > num.length) return this.clone().ixor(num);
	    return num.clone().ixor(this);
	  };

	  BN.prototype.uxor = function uxor (num) {
	    if (this.length > num.length) return this.clone().iuxor(num);
	    return num.clone().iuxor(this);
	  };

	  // Not ``this`` with ``width`` bitwidth
	  BN.prototype.inotn = function inotn (width) {
	    assert(typeof width === 'number' && width >= 0);

	    var bytesNeeded = Math.ceil(width / 26) | 0;
	    var bitsLeft = width % 26;

	    // Extend the buffer with leading zeroes
	    this._expand(bytesNeeded);

	    if (bitsLeft > 0) {
	      bytesNeeded--;
	    }

	    // Handle complete words
	    for (var i = 0; i < bytesNeeded; i++) {
	      this.words[i] = ~this.words[i] & 0x3ffffff;
	    }

	    // Handle the residue
	    if (bitsLeft > 0) {
	      this.words[i] = ~this.words[i] & (0x3ffffff >> (26 - bitsLeft));
	    }

	    // And remove leading zeroes
	    return this._strip();
	  };

	  BN.prototype.notn = function notn (width) {
	    return this.clone().inotn(width);
	  };

	  // Set `bit` of `this`
	  BN.prototype.setn = function setn (bit, val) {
	    assert(typeof bit === 'number' && bit >= 0);

	    var off = (bit / 26) | 0;
	    var wbit = bit % 26;

	    this._expand(off + 1);

	    if (val) {
	      this.words[off] = this.words[off] | (1 << wbit);
	    } else {
	      this.words[off] = this.words[off] & ~(1 << wbit);
	    }

	    return this._strip();
	  };

	  // Add `num` to `this` in-place
	  BN.prototype.iadd = function iadd (num) {
	    var r;

	    // negative + positive
	    if (this.negative !== 0 && num.negative === 0) {
	      this.negative = 0;
	      r = this.isub(num);
	      this.negative ^= 1;
	      return this._normSign();

	    // positive + negative
	    } else if (this.negative === 0 && num.negative !== 0) {
	      num.negative = 0;
	      r = this.isub(num);
	      num.negative = 1;
	      return r._normSign();
	    }

	    // a.length > b.length
	    var a, b;
	    if (this.length > num.length) {
	      a = this;
	      b = num;
	    } else {
	      a = num;
	      b = this;
	    }

	    var carry = 0;
	    for (var i = 0; i < b.length; i++) {
	      r = (a.words[i] | 0) + (b.words[i] | 0) + carry;
	      this.words[i] = r & 0x3ffffff;
	      carry = r >>> 26;
	    }
	    for (; carry !== 0 && i < a.length; i++) {
	      r = (a.words[i] | 0) + carry;
	      this.words[i] = r & 0x3ffffff;
	      carry = r >>> 26;
	    }

	    this.length = a.length;
	    if (carry !== 0) {
	      this.words[this.length] = carry;
	      this.length++;
	    // Copy the rest of the words
	    } else if (a !== this) {
	      for (; i < a.length; i++) {
	        this.words[i] = a.words[i];
	      }
	    }

	    return this;
	  };

	  // Add `num` to `this`
	  BN.prototype.add = function add (num) {
	    var res;
	    if (num.negative !== 0 && this.negative === 0) {
	      num.negative = 0;
	      res = this.sub(num);
	      num.negative ^= 1;
	      return res;
	    } else if (num.negative === 0 && this.negative !== 0) {
	      this.negative = 0;
	      res = num.sub(this);
	      this.negative = 1;
	      return res;
	    }

	    if (this.length > num.length) return this.clone().iadd(num);

	    return num.clone().iadd(this);
	  };

	  // Subtract `num` from `this` in-place
	  BN.prototype.isub = function isub (num) {
	    // this - (-num) = this + num
	    if (num.negative !== 0) {
	      num.negative = 0;
	      var r = this.iadd(num);
	      num.negative = 1;
	      return r._normSign();

	    // -this - num = -(this + num)
	    } else if (this.negative !== 0) {
	      this.negative = 0;
	      this.iadd(num);
	      this.negative = 1;
	      return this._normSign();
	    }

	    // At this point both numbers are positive
	    var cmp = this.cmp(num);

	    // Optimization - zeroify
	    if (cmp === 0) {
	      this.negative = 0;
	      this.length = 1;
	      this.words[0] = 0;
	      return this;
	    }

	    // a > b
	    var a, b;
	    if (cmp > 0) {
	      a = this;
	      b = num;
	    } else {
	      a = num;
	      b = this;
	    }

	    var carry = 0;
	    for (var i = 0; i < b.length; i++) {
	      r = (a.words[i] | 0) - (b.words[i] | 0) + carry;
	      carry = r >> 26;
	      this.words[i] = r & 0x3ffffff;
	    }
	    for (; carry !== 0 && i < a.length; i++) {
	      r = (a.words[i] | 0) + carry;
	      carry = r >> 26;
	      this.words[i] = r & 0x3ffffff;
	    }

	    // Copy rest of the words
	    if (carry === 0 && i < a.length && a !== this) {
	      for (; i < a.length; i++) {
	        this.words[i] = a.words[i];
	      }
	    }

	    this.length = Math.max(this.length, i);

	    if (a !== this) {
	      this.negative = 1;
	    }

	    return this._strip();
	  };

	  // Subtract `num` from `this`
	  BN.prototype.sub = function sub (num) {
	    return this.clone().isub(num);
	  };

	  function smallMulTo (self, num, out) {
	    out.negative = num.negative ^ self.negative;
	    var len = (self.length + num.length) | 0;
	    out.length = len;
	    len = (len - 1) | 0;

	    // Peel one iteration (compiler can't do it, because of code complexity)
	    var a = self.words[0] | 0;
	    var b = num.words[0] | 0;
	    var r = a * b;

	    var lo = r & 0x3ffffff;
	    var carry = (r / 0x4000000) | 0;
	    out.words[0] = lo;

	    for (var k = 1; k < len; k++) {
	      // Sum all words with the same `i + j = k` and accumulate `ncarry`,
	      // note that ncarry could be >= 0x3ffffff
	      var ncarry = carry >>> 26;
	      var rword = carry & 0x3ffffff;
	      var maxJ = Math.min(k, num.length - 1);
	      for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
	        var i = (k - j) | 0;
	        a = self.words[i] | 0;
	        b = num.words[j] | 0;
	        r = a * b + rword;
	        ncarry += (r / 0x4000000) | 0;
	        rword = r & 0x3ffffff;
	      }
	      out.words[k] = rword | 0;
	      carry = ncarry | 0;
	    }
	    if (carry !== 0) {
	      out.words[k] = carry | 0;
	    } else {
	      out.length--;
	    }

	    return out._strip();
	  }

	  // TODO(indutny): it may be reasonable to omit it for users who don't need
	  // to work with 256-bit numbers, otherwise it gives 20% improvement for 256-bit
	  // multiplication (like elliptic secp256k1).
	  var comb10MulTo = function comb10MulTo (self, num, out) {
	    var a = self.words;
	    var b = num.words;
	    var o = out.words;
	    var c = 0;
	    var lo;
	    var mid;
	    var hi;
	    var a0 = a[0] | 0;
	    var al0 = a0 & 0x1fff;
	    var ah0 = a0 >>> 13;
	    var a1 = a[1] | 0;
	    var al1 = a1 & 0x1fff;
	    var ah1 = a1 >>> 13;
	    var a2 = a[2] | 0;
	    var al2 = a2 & 0x1fff;
	    var ah2 = a2 >>> 13;
	    var a3 = a[3] | 0;
	    var al3 = a3 & 0x1fff;
	    var ah3 = a3 >>> 13;
	    var a4 = a[4] | 0;
	    var al4 = a4 & 0x1fff;
	    var ah4 = a4 >>> 13;
	    var a5 = a[5] | 0;
	    var al5 = a5 & 0x1fff;
	    var ah5 = a5 >>> 13;
	    var a6 = a[6] | 0;
	    var al6 = a6 & 0x1fff;
	    var ah6 = a6 >>> 13;
	    var a7 = a[7] | 0;
	    var al7 = a7 & 0x1fff;
	    var ah7 = a7 >>> 13;
	    var a8 = a[8] | 0;
	    var al8 = a8 & 0x1fff;
	    var ah8 = a8 >>> 13;
	    var a9 = a[9] | 0;
	    var al9 = a9 & 0x1fff;
	    var ah9 = a9 >>> 13;
	    var b0 = b[0] | 0;
	    var bl0 = b0 & 0x1fff;
	    var bh0 = b0 >>> 13;
	    var b1 = b[1] | 0;
	    var bl1 = b1 & 0x1fff;
	    var bh1 = b1 >>> 13;
	    var b2 = b[2] | 0;
	    var bl2 = b2 & 0x1fff;
	    var bh2 = b2 >>> 13;
	    var b3 = b[3] | 0;
	    var bl3 = b3 & 0x1fff;
	    var bh3 = b3 >>> 13;
	    var b4 = b[4] | 0;
	    var bl4 = b4 & 0x1fff;
	    var bh4 = b4 >>> 13;
	    var b5 = b[5] | 0;
	    var bl5 = b5 & 0x1fff;
	    var bh5 = b5 >>> 13;
	    var b6 = b[6] | 0;
	    var bl6 = b6 & 0x1fff;
	    var bh6 = b6 >>> 13;
	    var b7 = b[7] | 0;
	    var bl7 = b7 & 0x1fff;
	    var bh7 = b7 >>> 13;
	    var b8 = b[8] | 0;
	    var bl8 = b8 & 0x1fff;
	    var bh8 = b8 >>> 13;
	    var b9 = b[9] | 0;
	    var bl9 = b9 & 0x1fff;
	    var bh9 = b9 >>> 13;

	    out.negative = self.negative ^ num.negative;
	    out.length = 19;
	    /* k = 0 */
	    lo = Math.imul(al0, bl0);
	    mid = Math.imul(al0, bh0);
	    mid = (mid + Math.imul(ah0, bl0)) | 0;
	    hi = Math.imul(ah0, bh0);
	    var w0 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w0 >>> 26)) | 0;
	    w0 &= 0x3ffffff;
	    /* k = 1 */
	    lo = Math.imul(al1, bl0);
	    mid = Math.imul(al1, bh0);
	    mid = (mid + Math.imul(ah1, bl0)) | 0;
	    hi = Math.imul(ah1, bh0);
	    lo = (lo + Math.imul(al0, bl1)) | 0;
	    mid = (mid + Math.imul(al0, bh1)) | 0;
	    mid = (mid + Math.imul(ah0, bl1)) | 0;
	    hi = (hi + Math.imul(ah0, bh1)) | 0;
	    var w1 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w1 >>> 26)) | 0;
	    w1 &= 0x3ffffff;
	    /* k = 2 */
	    lo = Math.imul(al2, bl0);
	    mid = Math.imul(al2, bh0);
	    mid = (mid + Math.imul(ah2, bl0)) | 0;
	    hi = Math.imul(ah2, bh0);
	    lo = (lo + Math.imul(al1, bl1)) | 0;
	    mid = (mid + Math.imul(al1, bh1)) | 0;
	    mid = (mid + Math.imul(ah1, bl1)) | 0;
	    hi = (hi + Math.imul(ah1, bh1)) | 0;
	    lo = (lo + Math.imul(al0, bl2)) | 0;
	    mid = (mid + Math.imul(al0, bh2)) | 0;
	    mid = (mid + Math.imul(ah0, bl2)) | 0;
	    hi = (hi + Math.imul(ah0, bh2)) | 0;
	    var w2 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w2 >>> 26)) | 0;
	    w2 &= 0x3ffffff;
	    /* k = 3 */
	    lo = Math.imul(al3, bl0);
	    mid = Math.imul(al3, bh0);
	    mid = (mid + Math.imul(ah3, bl0)) | 0;
	    hi = Math.imul(ah3, bh0);
	    lo = (lo + Math.imul(al2, bl1)) | 0;
	    mid = (mid + Math.imul(al2, bh1)) | 0;
	    mid = (mid + Math.imul(ah2, bl1)) | 0;
	    hi = (hi + Math.imul(ah2, bh1)) | 0;
	    lo = (lo + Math.imul(al1, bl2)) | 0;
	    mid = (mid + Math.imul(al1, bh2)) | 0;
	    mid = (mid + Math.imul(ah1, bl2)) | 0;
	    hi = (hi + Math.imul(ah1, bh2)) | 0;
	    lo = (lo + Math.imul(al0, bl3)) | 0;
	    mid = (mid + Math.imul(al0, bh3)) | 0;
	    mid = (mid + Math.imul(ah0, bl3)) | 0;
	    hi = (hi + Math.imul(ah0, bh3)) | 0;
	    var w3 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w3 >>> 26)) | 0;
	    w3 &= 0x3ffffff;
	    /* k = 4 */
	    lo = Math.imul(al4, bl0);
	    mid = Math.imul(al4, bh0);
	    mid = (mid + Math.imul(ah4, bl0)) | 0;
	    hi = Math.imul(ah4, bh0);
	    lo = (lo + Math.imul(al3, bl1)) | 0;
	    mid = (mid + Math.imul(al3, bh1)) | 0;
	    mid = (mid + Math.imul(ah3, bl1)) | 0;
	    hi = (hi + Math.imul(ah3, bh1)) | 0;
	    lo = (lo + Math.imul(al2, bl2)) | 0;
	    mid = (mid + Math.imul(al2, bh2)) | 0;
	    mid = (mid + Math.imul(ah2, bl2)) | 0;
	    hi = (hi + Math.imul(ah2, bh2)) | 0;
	    lo = (lo + Math.imul(al1, bl3)) | 0;
	    mid = (mid + Math.imul(al1, bh3)) | 0;
	    mid = (mid + Math.imul(ah1, bl3)) | 0;
	    hi = (hi + Math.imul(ah1, bh3)) | 0;
	    lo = (lo + Math.imul(al0, bl4)) | 0;
	    mid = (mid + Math.imul(al0, bh4)) | 0;
	    mid = (mid + Math.imul(ah0, bl4)) | 0;
	    hi = (hi + Math.imul(ah0, bh4)) | 0;
	    var w4 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w4 >>> 26)) | 0;
	    w4 &= 0x3ffffff;
	    /* k = 5 */
	    lo = Math.imul(al5, bl0);
	    mid = Math.imul(al5, bh0);
	    mid = (mid + Math.imul(ah5, bl0)) | 0;
	    hi = Math.imul(ah5, bh0);
	    lo = (lo + Math.imul(al4, bl1)) | 0;
	    mid = (mid + Math.imul(al4, bh1)) | 0;
	    mid = (mid + Math.imul(ah4, bl1)) | 0;
	    hi = (hi + Math.imul(ah4, bh1)) | 0;
	    lo = (lo + Math.imul(al3, bl2)) | 0;
	    mid = (mid + Math.imul(al3, bh2)) | 0;
	    mid = (mid + Math.imul(ah3, bl2)) | 0;
	    hi = (hi + Math.imul(ah3, bh2)) | 0;
	    lo = (lo + Math.imul(al2, bl3)) | 0;
	    mid = (mid + Math.imul(al2, bh3)) | 0;
	    mid = (mid + Math.imul(ah2, bl3)) | 0;
	    hi = (hi + Math.imul(ah2, bh3)) | 0;
	    lo = (lo + Math.imul(al1, bl4)) | 0;
	    mid = (mid + Math.imul(al1, bh4)) | 0;
	    mid = (mid + Math.imul(ah1, bl4)) | 0;
	    hi = (hi + Math.imul(ah1, bh4)) | 0;
	    lo = (lo + Math.imul(al0, bl5)) | 0;
	    mid = (mid + Math.imul(al0, bh5)) | 0;
	    mid = (mid + Math.imul(ah0, bl5)) | 0;
	    hi = (hi + Math.imul(ah0, bh5)) | 0;
	    var w5 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w5 >>> 26)) | 0;
	    w5 &= 0x3ffffff;
	    /* k = 6 */
	    lo = Math.imul(al6, bl0);
	    mid = Math.imul(al6, bh0);
	    mid = (mid + Math.imul(ah6, bl0)) | 0;
	    hi = Math.imul(ah6, bh0);
	    lo = (lo + Math.imul(al5, bl1)) | 0;
	    mid = (mid + Math.imul(al5, bh1)) | 0;
	    mid = (mid + Math.imul(ah5, bl1)) | 0;
	    hi = (hi + Math.imul(ah5, bh1)) | 0;
	    lo = (lo + Math.imul(al4, bl2)) | 0;
	    mid = (mid + Math.imul(al4, bh2)) | 0;
	    mid = (mid + Math.imul(ah4, bl2)) | 0;
	    hi = (hi + Math.imul(ah4, bh2)) | 0;
	    lo = (lo + Math.imul(al3, bl3)) | 0;
	    mid = (mid + Math.imul(al3, bh3)) | 0;
	    mid = (mid + Math.imul(ah3, bl3)) | 0;
	    hi = (hi + Math.imul(ah3, bh3)) | 0;
	    lo = (lo + Math.imul(al2, bl4)) | 0;
	    mid = (mid + Math.imul(al2, bh4)) | 0;
	    mid = (mid + Math.imul(ah2, bl4)) | 0;
	    hi = (hi + Math.imul(ah2, bh4)) | 0;
	    lo = (lo + Math.imul(al1, bl5)) | 0;
	    mid = (mid + Math.imul(al1, bh5)) | 0;
	    mid = (mid + Math.imul(ah1, bl5)) | 0;
	    hi = (hi + Math.imul(ah1, bh5)) | 0;
	    lo = (lo + Math.imul(al0, bl6)) | 0;
	    mid = (mid + Math.imul(al0, bh6)) | 0;
	    mid = (mid + Math.imul(ah0, bl6)) | 0;
	    hi = (hi + Math.imul(ah0, bh6)) | 0;
	    var w6 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w6 >>> 26)) | 0;
	    w6 &= 0x3ffffff;
	    /* k = 7 */
	    lo = Math.imul(al7, bl0);
	    mid = Math.imul(al7, bh0);
	    mid = (mid + Math.imul(ah7, bl0)) | 0;
	    hi = Math.imul(ah7, bh0);
	    lo = (lo + Math.imul(al6, bl1)) | 0;
	    mid = (mid + Math.imul(al6, bh1)) | 0;
	    mid = (mid + Math.imul(ah6, bl1)) | 0;
	    hi = (hi + Math.imul(ah6, bh1)) | 0;
	    lo = (lo + Math.imul(al5, bl2)) | 0;
	    mid = (mid + Math.imul(al5, bh2)) | 0;
	    mid = (mid + Math.imul(ah5, bl2)) | 0;
	    hi = (hi + Math.imul(ah5, bh2)) | 0;
	    lo = (lo + Math.imul(al4, bl3)) | 0;
	    mid = (mid + Math.imul(al4, bh3)) | 0;
	    mid = (mid + Math.imul(ah4, bl3)) | 0;
	    hi = (hi + Math.imul(ah4, bh3)) | 0;
	    lo = (lo + Math.imul(al3, bl4)) | 0;
	    mid = (mid + Math.imul(al3, bh4)) | 0;
	    mid = (mid + Math.imul(ah3, bl4)) | 0;
	    hi = (hi + Math.imul(ah3, bh4)) | 0;
	    lo = (lo + Math.imul(al2, bl5)) | 0;
	    mid = (mid + Math.imul(al2, bh5)) | 0;
	    mid = (mid + Math.imul(ah2, bl5)) | 0;
	    hi = (hi + Math.imul(ah2, bh5)) | 0;
	    lo = (lo + Math.imul(al1, bl6)) | 0;
	    mid = (mid + Math.imul(al1, bh6)) | 0;
	    mid = (mid + Math.imul(ah1, bl6)) | 0;
	    hi = (hi + Math.imul(ah1, bh6)) | 0;
	    lo = (lo + Math.imul(al0, bl7)) | 0;
	    mid = (mid + Math.imul(al0, bh7)) | 0;
	    mid = (mid + Math.imul(ah0, bl7)) | 0;
	    hi = (hi + Math.imul(ah0, bh7)) | 0;
	    var w7 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w7 >>> 26)) | 0;
	    w7 &= 0x3ffffff;
	    /* k = 8 */
	    lo = Math.imul(al8, bl0);
	    mid = Math.imul(al8, bh0);
	    mid = (mid + Math.imul(ah8, bl0)) | 0;
	    hi = Math.imul(ah8, bh0);
	    lo = (lo + Math.imul(al7, bl1)) | 0;
	    mid = (mid + Math.imul(al7, bh1)) | 0;
	    mid = (mid + Math.imul(ah7, bl1)) | 0;
	    hi = (hi + Math.imul(ah7, bh1)) | 0;
	    lo = (lo + Math.imul(al6, bl2)) | 0;
	    mid = (mid + Math.imul(al6, bh2)) | 0;
	    mid = (mid + Math.imul(ah6, bl2)) | 0;
	    hi = (hi + Math.imul(ah6, bh2)) | 0;
	    lo = (lo + Math.imul(al5, bl3)) | 0;
	    mid = (mid + Math.imul(al5, bh3)) | 0;
	    mid = (mid + Math.imul(ah5, bl3)) | 0;
	    hi = (hi + Math.imul(ah5, bh3)) | 0;
	    lo = (lo + Math.imul(al4, bl4)) | 0;
	    mid = (mid + Math.imul(al4, bh4)) | 0;
	    mid = (mid + Math.imul(ah4, bl4)) | 0;
	    hi = (hi + Math.imul(ah4, bh4)) | 0;
	    lo = (lo + Math.imul(al3, bl5)) | 0;
	    mid = (mid + Math.imul(al3, bh5)) | 0;
	    mid = (mid + Math.imul(ah3, bl5)) | 0;
	    hi = (hi + Math.imul(ah3, bh5)) | 0;
	    lo = (lo + Math.imul(al2, bl6)) | 0;
	    mid = (mid + Math.imul(al2, bh6)) | 0;
	    mid = (mid + Math.imul(ah2, bl6)) | 0;
	    hi = (hi + Math.imul(ah2, bh6)) | 0;
	    lo = (lo + Math.imul(al1, bl7)) | 0;
	    mid = (mid + Math.imul(al1, bh7)) | 0;
	    mid = (mid + Math.imul(ah1, bl7)) | 0;
	    hi = (hi + Math.imul(ah1, bh7)) | 0;
	    lo = (lo + Math.imul(al0, bl8)) | 0;
	    mid = (mid + Math.imul(al0, bh8)) | 0;
	    mid = (mid + Math.imul(ah0, bl8)) | 0;
	    hi = (hi + Math.imul(ah0, bh8)) | 0;
	    var w8 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w8 >>> 26)) | 0;
	    w8 &= 0x3ffffff;
	    /* k = 9 */
	    lo = Math.imul(al9, bl0);
	    mid = Math.imul(al9, bh0);
	    mid = (mid + Math.imul(ah9, bl0)) | 0;
	    hi = Math.imul(ah9, bh0);
	    lo = (lo + Math.imul(al8, bl1)) | 0;
	    mid = (mid + Math.imul(al8, bh1)) | 0;
	    mid = (mid + Math.imul(ah8, bl1)) | 0;
	    hi = (hi + Math.imul(ah8, bh1)) | 0;
	    lo = (lo + Math.imul(al7, bl2)) | 0;
	    mid = (mid + Math.imul(al7, bh2)) | 0;
	    mid = (mid + Math.imul(ah7, bl2)) | 0;
	    hi = (hi + Math.imul(ah7, bh2)) | 0;
	    lo = (lo + Math.imul(al6, bl3)) | 0;
	    mid = (mid + Math.imul(al6, bh3)) | 0;
	    mid = (mid + Math.imul(ah6, bl3)) | 0;
	    hi = (hi + Math.imul(ah6, bh3)) | 0;
	    lo = (lo + Math.imul(al5, bl4)) | 0;
	    mid = (mid + Math.imul(al5, bh4)) | 0;
	    mid = (mid + Math.imul(ah5, bl4)) | 0;
	    hi = (hi + Math.imul(ah5, bh4)) | 0;
	    lo = (lo + Math.imul(al4, bl5)) | 0;
	    mid = (mid + Math.imul(al4, bh5)) | 0;
	    mid = (mid + Math.imul(ah4, bl5)) | 0;
	    hi = (hi + Math.imul(ah4, bh5)) | 0;
	    lo = (lo + Math.imul(al3, bl6)) | 0;
	    mid = (mid + Math.imul(al3, bh6)) | 0;
	    mid = (mid + Math.imul(ah3, bl6)) | 0;
	    hi = (hi + Math.imul(ah3, bh6)) | 0;
	    lo = (lo + Math.imul(al2, bl7)) | 0;
	    mid = (mid + Math.imul(al2, bh7)) | 0;
	    mid = (mid + Math.imul(ah2, bl7)) | 0;
	    hi = (hi + Math.imul(ah2, bh7)) | 0;
	    lo = (lo + Math.imul(al1, bl8)) | 0;
	    mid = (mid + Math.imul(al1, bh8)) | 0;
	    mid = (mid + Math.imul(ah1, bl8)) | 0;
	    hi = (hi + Math.imul(ah1, bh8)) | 0;
	    lo = (lo + Math.imul(al0, bl9)) | 0;
	    mid = (mid + Math.imul(al0, bh9)) | 0;
	    mid = (mid + Math.imul(ah0, bl9)) | 0;
	    hi = (hi + Math.imul(ah0, bh9)) | 0;
	    var w9 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w9 >>> 26)) | 0;
	    w9 &= 0x3ffffff;
	    /* k = 10 */
	    lo = Math.imul(al9, bl1);
	    mid = Math.imul(al9, bh1);
	    mid = (mid + Math.imul(ah9, bl1)) | 0;
	    hi = Math.imul(ah9, bh1);
	    lo = (lo + Math.imul(al8, bl2)) | 0;
	    mid = (mid + Math.imul(al8, bh2)) | 0;
	    mid = (mid + Math.imul(ah8, bl2)) | 0;
	    hi = (hi + Math.imul(ah8, bh2)) | 0;
	    lo = (lo + Math.imul(al7, bl3)) | 0;
	    mid = (mid + Math.imul(al7, bh3)) | 0;
	    mid = (mid + Math.imul(ah7, bl3)) | 0;
	    hi = (hi + Math.imul(ah7, bh3)) | 0;
	    lo = (lo + Math.imul(al6, bl4)) | 0;
	    mid = (mid + Math.imul(al6, bh4)) | 0;
	    mid = (mid + Math.imul(ah6, bl4)) | 0;
	    hi = (hi + Math.imul(ah6, bh4)) | 0;
	    lo = (lo + Math.imul(al5, bl5)) | 0;
	    mid = (mid + Math.imul(al5, bh5)) | 0;
	    mid = (mid + Math.imul(ah5, bl5)) | 0;
	    hi = (hi + Math.imul(ah5, bh5)) | 0;
	    lo = (lo + Math.imul(al4, bl6)) | 0;
	    mid = (mid + Math.imul(al4, bh6)) | 0;
	    mid = (mid + Math.imul(ah4, bl6)) | 0;
	    hi = (hi + Math.imul(ah4, bh6)) | 0;
	    lo = (lo + Math.imul(al3, bl7)) | 0;
	    mid = (mid + Math.imul(al3, bh7)) | 0;
	    mid = (mid + Math.imul(ah3, bl7)) | 0;
	    hi = (hi + Math.imul(ah3, bh7)) | 0;
	    lo = (lo + Math.imul(al2, bl8)) | 0;
	    mid = (mid + Math.imul(al2, bh8)) | 0;
	    mid = (mid + Math.imul(ah2, bl8)) | 0;
	    hi = (hi + Math.imul(ah2, bh8)) | 0;
	    lo = (lo + Math.imul(al1, bl9)) | 0;
	    mid = (mid + Math.imul(al1, bh9)) | 0;
	    mid = (mid + Math.imul(ah1, bl9)) | 0;
	    hi = (hi + Math.imul(ah1, bh9)) | 0;
	    var w10 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w10 >>> 26)) | 0;
	    w10 &= 0x3ffffff;
	    /* k = 11 */
	    lo = Math.imul(al9, bl2);
	    mid = Math.imul(al9, bh2);
	    mid = (mid + Math.imul(ah9, bl2)) | 0;
	    hi = Math.imul(ah9, bh2);
	    lo = (lo + Math.imul(al8, bl3)) | 0;
	    mid = (mid + Math.imul(al8, bh3)) | 0;
	    mid = (mid + Math.imul(ah8, bl3)) | 0;
	    hi = (hi + Math.imul(ah8, bh3)) | 0;
	    lo = (lo + Math.imul(al7, bl4)) | 0;
	    mid = (mid + Math.imul(al7, bh4)) | 0;
	    mid = (mid + Math.imul(ah7, bl4)) | 0;
	    hi = (hi + Math.imul(ah7, bh4)) | 0;
	    lo = (lo + Math.imul(al6, bl5)) | 0;
	    mid = (mid + Math.imul(al6, bh5)) | 0;
	    mid = (mid + Math.imul(ah6, bl5)) | 0;
	    hi = (hi + Math.imul(ah6, bh5)) | 0;
	    lo = (lo + Math.imul(al5, bl6)) | 0;
	    mid = (mid + Math.imul(al5, bh6)) | 0;
	    mid = (mid + Math.imul(ah5, bl6)) | 0;
	    hi = (hi + Math.imul(ah5, bh6)) | 0;
	    lo = (lo + Math.imul(al4, bl7)) | 0;
	    mid = (mid + Math.imul(al4, bh7)) | 0;
	    mid = (mid + Math.imul(ah4, bl7)) | 0;
	    hi = (hi + Math.imul(ah4, bh7)) | 0;
	    lo = (lo + Math.imul(al3, bl8)) | 0;
	    mid = (mid + Math.imul(al3, bh8)) | 0;
	    mid = (mid + Math.imul(ah3, bl8)) | 0;
	    hi = (hi + Math.imul(ah3, bh8)) | 0;
	    lo = (lo + Math.imul(al2, bl9)) | 0;
	    mid = (mid + Math.imul(al2, bh9)) | 0;
	    mid = (mid + Math.imul(ah2, bl9)) | 0;
	    hi = (hi + Math.imul(ah2, bh9)) | 0;
	    var w11 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w11 >>> 26)) | 0;
	    w11 &= 0x3ffffff;
	    /* k = 12 */
	    lo = Math.imul(al9, bl3);
	    mid = Math.imul(al9, bh3);
	    mid = (mid + Math.imul(ah9, bl3)) | 0;
	    hi = Math.imul(ah9, bh3);
	    lo = (lo + Math.imul(al8, bl4)) | 0;
	    mid = (mid + Math.imul(al8, bh4)) | 0;
	    mid = (mid + Math.imul(ah8, bl4)) | 0;
	    hi = (hi + Math.imul(ah8, bh4)) | 0;
	    lo = (lo + Math.imul(al7, bl5)) | 0;
	    mid = (mid + Math.imul(al7, bh5)) | 0;
	    mid = (mid + Math.imul(ah7, bl5)) | 0;
	    hi = (hi + Math.imul(ah7, bh5)) | 0;
	    lo = (lo + Math.imul(al6, bl6)) | 0;
	    mid = (mid + Math.imul(al6, bh6)) | 0;
	    mid = (mid + Math.imul(ah6, bl6)) | 0;
	    hi = (hi + Math.imul(ah6, bh6)) | 0;
	    lo = (lo + Math.imul(al5, bl7)) | 0;
	    mid = (mid + Math.imul(al5, bh7)) | 0;
	    mid = (mid + Math.imul(ah5, bl7)) | 0;
	    hi = (hi + Math.imul(ah5, bh7)) | 0;
	    lo = (lo + Math.imul(al4, bl8)) | 0;
	    mid = (mid + Math.imul(al4, bh8)) | 0;
	    mid = (mid + Math.imul(ah4, bl8)) | 0;
	    hi = (hi + Math.imul(ah4, bh8)) | 0;
	    lo = (lo + Math.imul(al3, bl9)) | 0;
	    mid = (mid + Math.imul(al3, bh9)) | 0;
	    mid = (mid + Math.imul(ah3, bl9)) | 0;
	    hi = (hi + Math.imul(ah3, bh9)) | 0;
	    var w12 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w12 >>> 26)) | 0;
	    w12 &= 0x3ffffff;
	    /* k = 13 */
	    lo = Math.imul(al9, bl4);
	    mid = Math.imul(al9, bh4);
	    mid = (mid + Math.imul(ah9, bl4)) | 0;
	    hi = Math.imul(ah9, bh4);
	    lo = (lo + Math.imul(al8, bl5)) | 0;
	    mid = (mid + Math.imul(al8, bh5)) | 0;
	    mid = (mid + Math.imul(ah8, bl5)) | 0;
	    hi = (hi + Math.imul(ah8, bh5)) | 0;
	    lo = (lo + Math.imul(al7, bl6)) | 0;
	    mid = (mid + Math.imul(al7, bh6)) | 0;
	    mid = (mid + Math.imul(ah7, bl6)) | 0;
	    hi = (hi + Math.imul(ah7, bh6)) | 0;
	    lo = (lo + Math.imul(al6, bl7)) | 0;
	    mid = (mid + Math.imul(al6, bh7)) | 0;
	    mid = (mid + Math.imul(ah6, bl7)) | 0;
	    hi = (hi + Math.imul(ah6, bh7)) | 0;
	    lo = (lo + Math.imul(al5, bl8)) | 0;
	    mid = (mid + Math.imul(al5, bh8)) | 0;
	    mid = (mid + Math.imul(ah5, bl8)) | 0;
	    hi = (hi + Math.imul(ah5, bh8)) | 0;
	    lo = (lo + Math.imul(al4, bl9)) | 0;
	    mid = (mid + Math.imul(al4, bh9)) | 0;
	    mid = (mid + Math.imul(ah4, bl9)) | 0;
	    hi = (hi + Math.imul(ah4, bh9)) | 0;
	    var w13 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w13 >>> 26)) | 0;
	    w13 &= 0x3ffffff;
	    /* k = 14 */
	    lo = Math.imul(al9, bl5);
	    mid = Math.imul(al9, bh5);
	    mid = (mid + Math.imul(ah9, bl5)) | 0;
	    hi = Math.imul(ah9, bh5);
	    lo = (lo + Math.imul(al8, bl6)) | 0;
	    mid = (mid + Math.imul(al8, bh6)) | 0;
	    mid = (mid + Math.imul(ah8, bl6)) | 0;
	    hi = (hi + Math.imul(ah8, bh6)) | 0;
	    lo = (lo + Math.imul(al7, bl7)) | 0;
	    mid = (mid + Math.imul(al7, bh7)) | 0;
	    mid = (mid + Math.imul(ah7, bl7)) | 0;
	    hi = (hi + Math.imul(ah7, bh7)) | 0;
	    lo = (lo + Math.imul(al6, bl8)) | 0;
	    mid = (mid + Math.imul(al6, bh8)) | 0;
	    mid = (mid + Math.imul(ah6, bl8)) | 0;
	    hi = (hi + Math.imul(ah6, bh8)) | 0;
	    lo = (lo + Math.imul(al5, bl9)) | 0;
	    mid = (mid + Math.imul(al5, bh9)) | 0;
	    mid = (mid + Math.imul(ah5, bl9)) | 0;
	    hi = (hi + Math.imul(ah5, bh9)) | 0;
	    var w14 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w14 >>> 26)) | 0;
	    w14 &= 0x3ffffff;
	    /* k = 15 */
	    lo = Math.imul(al9, bl6);
	    mid = Math.imul(al9, bh6);
	    mid = (mid + Math.imul(ah9, bl6)) | 0;
	    hi = Math.imul(ah9, bh6);
	    lo = (lo + Math.imul(al8, bl7)) | 0;
	    mid = (mid + Math.imul(al8, bh7)) | 0;
	    mid = (mid + Math.imul(ah8, bl7)) | 0;
	    hi = (hi + Math.imul(ah8, bh7)) | 0;
	    lo = (lo + Math.imul(al7, bl8)) | 0;
	    mid = (mid + Math.imul(al7, bh8)) | 0;
	    mid = (mid + Math.imul(ah7, bl8)) | 0;
	    hi = (hi + Math.imul(ah7, bh8)) | 0;
	    lo = (lo + Math.imul(al6, bl9)) | 0;
	    mid = (mid + Math.imul(al6, bh9)) | 0;
	    mid = (mid + Math.imul(ah6, bl9)) | 0;
	    hi = (hi + Math.imul(ah6, bh9)) | 0;
	    var w15 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w15 >>> 26)) | 0;
	    w15 &= 0x3ffffff;
	    /* k = 16 */
	    lo = Math.imul(al9, bl7);
	    mid = Math.imul(al9, bh7);
	    mid = (mid + Math.imul(ah9, bl7)) | 0;
	    hi = Math.imul(ah9, bh7);
	    lo = (lo + Math.imul(al8, bl8)) | 0;
	    mid = (mid + Math.imul(al8, bh8)) | 0;
	    mid = (mid + Math.imul(ah8, bl8)) | 0;
	    hi = (hi + Math.imul(ah8, bh8)) | 0;
	    lo = (lo + Math.imul(al7, bl9)) | 0;
	    mid = (mid + Math.imul(al7, bh9)) | 0;
	    mid = (mid + Math.imul(ah7, bl9)) | 0;
	    hi = (hi + Math.imul(ah7, bh9)) | 0;
	    var w16 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w16 >>> 26)) | 0;
	    w16 &= 0x3ffffff;
	    /* k = 17 */
	    lo = Math.imul(al9, bl8);
	    mid = Math.imul(al9, bh8);
	    mid = (mid + Math.imul(ah9, bl8)) | 0;
	    hi = Math.imul(ah9, bh8);
	    lo = (lo + Math.imul(al8, bl9)) | 0;
	    mid = (mid + Math.imul(al8, bh9)) | 0;
	    mid = (mid + Math.imul(ah8, bl9)) | 0;
	    hi = (hi + Math.imul(ah8, bh9)) | 0;
	    var w17 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w17 >>> 26)) | 0;
	    w17 &= 0x3ffffff;
	    /* k = 18 */
	    lo = Math.imul(al9, bl9);
	    mid = Math.imul(al9, bh9);
	    mid = (mid + Math.imul(ah9, bl9)) | 0;
	    hi = Math.imul(ah9, bh9);
	    var w18 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
	    c = (((hi + (mid >>> 13)) | 0) + (w18 >>> 26)) | 0;
	    w18 &= 0x3ffffff;
	    o[0] = w0;
	    o[1] = w1;
	    o[2] = w2;
	    o[3] = w3;
	    o[4] = w4;
	    o[5] = w5;
	    o[6] = w6;
	    o[7] = w7;
	    o[8] = w8;
	    o[9] = w9;
	    o[10] = w10;
	    o[11] = w11;
	    o[12] = w12;
	    o[13] = w13;
	    o[14] = w14;
	    o[15] = w15;
	    o[16] = w16;
	    o[17] = w17;
	    o[18] = w18;
	    if (c !== 0) {
	      o[19] = c;
	      out.length++;
	    }
	    return out;
	  };

	  // Polyfill comb
	  if (!Math.imul) {
	    comb10MulTo = smallMulTo;
	  }

	  function bigMulTo (self, num, out) {
	    out.negative = num.negative ^ self.negative;
	    out.length = self.length + num.length;

	    var carry = 0;
	    var hncarry = 0;
	    for (var k = 0; k < out.length - 1; k++) {
	      // Sum all words with the same `i + j = k` and accumulate `ncarry`,
	      // note that ncarry could be >= 0x3ffffff
	      var ncarry = hncarry;
	      hncarry = 0;
	      var rword = carry & 0x3ffffff;
	      var maxJ = Math.min(k, num.length - 1);
	      for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
	        var i = k - j;
	        var a = self.words[i] | 0;
	        var b = num.words[j] | 0;
	        var r = a * b;

	        var lo = r & 0x3ffffff;
	        ncarry = (ncarry + ((r / 0x4000000) | 0)) | 0;
	        lo = (lo + rword) | 0;
	        rword = lo & 0x3ffffff;
	        ncarry = (ncarry + (lo >>> 26)) | 0;

	        hncarry += ncarry >>> 26;
	        ncarry &= 0x3ffffff;
	      }
	      out.words[k] = rword;
	      carry = ncarry;
	      ncarry = hncarry;
	    }
	    if (carry !== 0) {
	      out.words[k] = carry;
	    } else {
	      out.length--;
	    }

	    return out._strip();
	  }

	  function jumboMulTo (self, num, out) {
	    // Temporary disable, see https://github.com/indutny/bn.js/issues/211
	    // var fftm = new FFTM();
	    // return fftm.mulp(self, num, out);
	    return bigMulTo(self, num, out);
	  }

	  BN.prototype.mulTo = function mulTo (num, out) {
	    var res;
	    var len = this.length + num.length;
	    if (this.length === 10 && num.length === 10) {
	      res = comb10MulTo(this, num, out);
	    } else if (len < 63) {
	      res = smallMulTo(this, num, out);
	    } else if (len < 1024) {
	      res = bigMulTo(this, num, out);
	    } else {
	      res = jumboMulTo(this, num, out);
	    }

	    return res;
	  };

	  // Multiply `this` by `num`
	  BN.prototype.mul = function mul (num) {
	    var out = new BN(null);
	    out.words = new Array(this.length + num.length);
	    return this.mulTo(num, out);
	  };

	  // Multiply employing FFT
	  BN.prototype.mulf = function mulf (num) {
	    var out = new BN(null);
	    out.words = new Array(this.length + num.length);
	    return jumboMulTo(this, num, out);
	  };

	  // In-place Multiplication
	  BN.prototype.imul = function imul (num) {
	    return this.clone().mulTo(num, this);
	  };

	  BN.prototype.imuln = function imuln (num) {
	    var isNegNum = num < 0;
	    if (isNegNum) num = -num;

	    assert(typeof num === 'number');
	    assert(num < 0x4000000);

	    // Carry
	    var carry = 0;
	    for (var i = 0; i < this.length; i++) {
	      var w = (this.words[i] | 0) * num;
	      var lo = (w & 0x3ffffff) + (carry & 0x3ffffff);
	      carry >>= 26;
	      carry += (w / 0x4000000) | 0;
	      // NOTE: lo is 27bit maximum
	      carry += lo >>> 26;
	      this.words[i] = lo & 0x3ffffff;
	    }

	    if (carry !== 0) {
	      this.words[i] = carry;
	      this.length++;
	    }

	    return isNegNum ? this.ineg() : this;
	  };

	  BN.prototype.muln = function muln (num) {
	    return this.clone().imuln(num);
	  };

	  // `this` * `this`
	  BN.prototype.sqr = function sqr () {
	    return this.mul(this);
	  };

	  // `this` * `this` in-place
	  BN.prototype.isqr = function isqr () {
	    return this.imul(this.clone());
	  };

	  // Math.pow(`this`, `num`)
	  BN.prototype.pow = function pow (num) {
	    var w = toBitArray(num);
	    if (w.length === 0) return new BN(1);

	    // Skip leading zeroes
	    var res = this;
	    for (var i = 0; i < w.length; i++, res = res.sqr()) {
	      if (w[i] !== 0) break;
	    }

	    if (++i < w.length) {
	      for (var q = res.sqr(); i < w.length; i++, q = q.sqr()) {
	        if (w[i] === 0) continue;

	        res = res.mul(q);
	      }
	    }

	    return res;
	  };

	  // Shift-left in-place
	  BN.prototype.iushln = function iushln (bits) {
	    assert(typeof bits === 'number' && bits >= 0);
	    var r = bits % 26;
	    var s = (bits - r) / 26;
	    var carryMask = (0x3ffffff >>> (26 - r)) << (26 - r);
	    var i;

	    if (r !== 0) {
	      var carry = 0;

	      for (i = 0; i < this.length; i++) {
	        var newCarry = this.words[i] & carryMask;
	        var c = ((this.words[i] | 0) - newCarry) << r;
	        this.words[i] = c | carry;
	        carry = newCarry >>> (26 - r);
	      }

	      if (carry) {
	        this.words[i] = carry;
	        this.length++;
	      }
	    }

	    if (s !== 0) {
	      for (i = this.length - 1; i >= 0; i--) {
	        this.words[i + s] = this.words[i];
	      }

	      for (i = 0; i < s; i++) {
	        this.words[i] = 0;
	      }

	      this.length += s;
	    }

	    return this._strip();
	  };

	  BN.prototype.ishln = function ishln (bits) {
	    // TODO(indutny): implement me
	    assert(this.negative === 0);
	    return this.iushln(bits);
	  };

	  // Shift-right in-place
	  // NOTE: `hint` is a lowest bit before trailing zeroes
	  // NOTE: if `extended` is present - it will be filled with destroyed bits
	  BN.prototype.iushrn = function iushrn (bits, hint, extended) {
	    assert(typeof bits === 'number' && bits >= 0);
	    var h;
	    if (hint) {
	      h = (hint - (hint % 26)) / 26;
	    } else {
	      h = 0;
	    }

	    var r = bits % 26;
	    var s = Math.min((bits - r) / 26, this.length);
	    var mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
	    var maskedWords = extended;

	    h -= s;
	    h = Math.max(0, h);

	    // Extended mode, copy masked part
	    if (maskedWords) {
	      for (var i = 0; i < s; i++) {
	        maskedWords.words[i] = this.words[i];
	      }
	      maskedWords.length = s;
	    }

	    if (s === 0) ; else if (this.length > s) {
	      this.length -= s;
	      for (i = 0; i < this.length; i++) {
	        this.words[i] = this.words[i + s];
	      }
	    } else {
	      this.words[0] = 0;
	      this.length = 1;
	    }

	    var carry = 0;
	    for (i = this.length - 1; i >= 0 && (carry !== 0 || i >= h); i--) {
	      var word = this.words[i] | 0;
	      this.words[i] = (carry << (26 - r)) | (word >>> r);
	      carry = word & mask;
	    }

	    // Push carried bits as a mask
	    if (maskedWords && carry !== 0) {
	      maskedWords.words[maskedWords.length++] = carry;
	    }

	    if (this.length === 0) {
	      this.words[0] = 0;
	      this.length = 1;
	    }

	    return this._strip();
	  };

	  BN.prototype.ishrn = function ishrn (bits, hint, extended) {
	    // TODO(indutny): implement me
	    assert(this.negative === 0);
	    return this.iushrn(bits, hint, extended);
	  };

	  // Shift-left
	  BN.prototype.shln = function shln (bits) {
	    return this.clone().ishln(bits);
	  };

	  BN.prototype.ushln = function ushln (bits) {
	    return this.clone().iushln(bits);
	  };

	  // Shift-right
	  BN.prototype.shrn = function shrn (bits) {
	    return this.clone().ishrn(bits);
	  };

	  BN.prototype.ushrn = function ushrn (bits) {
	    return this.clone().iushrn(bits);
	  };

	  // Test if n bit is set
	  BN.prototype.testn = function testn (bit) {
	    assert(typeof bit === 'number' && bit >= 0);
	    var r = bit % 26;
	    var s = (bit - r) / 26;
	    var q = 1 << r;

	    // Fast case: bit is much higher than all existing words
	    if (this.length <= s) return false;

	    // Check bit and return
	    var w = this.words[s];

	    return !!(w & q);
	  };

	  // Return only lowers bits of number (in-place)
	  BN.prototype.imaskn = function imaskn (bits) {
	    assert(typeof bits === 'number' && bits >= 0);
	    var r = bits % 26;
	    var s = (bits - r) / 26;

	    assert(this.negative === 0, 'imaskn works only with positive numbers');

	    if (this.length <= s) {
	      return this;
	    }

	    if (r !== 0) {
	      s++;
	    }
	    this.length = Math.min(s, this.length);

	    if (r !== 0) {
	      var mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
	      this.words[this.length - 1] &= mask;
	    }

	    return this._strip();
	  };

	  // Return only lowers bits of number
	  BN.prototype.maskn = function maskn (bits) {
	    return this.clone().imaskn(bits);
	  };

	  // Add plain number `num` to `this`
	  BN.prototype.iaddn = function iaddn (num) {
	    assert(typeof num === 'number');
	    assert(num < 0x4000000);
	    if (num < 0) return this.isubn(-num);

	    // Possible sign change
	    if (this.negative !== 0) {
	      if (this.length === 1 && (this.words[0] | 0) <= num) {
	        this.words[0] = num - (this.words[0] | 0);
	        this.negative = 0;
	        return this;
	      }

	      this.negative = 0;
	      this.isubn(num);
	      this.negative = 1;
	      return this;
	    }

	    // Add without checks
	    return this._iaddn(num);
	  };

	  BN.prototype._iaddn = function _iaddn (num) {
	    this.words[0] += num;

	    // Carry
	    for (var i = 0; i < this.length && this.words[i] >= 0x4000000; i++) {
	      this.words[i] -= 0x4000000;
	      if (i === this.length - 1) {
	        this.words[i + 1] = 1;
	      } else {
	        this.words[i + 1]++;
	      }
	    }
	    this.length = Math.max(this.length, i + 1);

	    return this;
	  };

	  // Subtract plain number `num` from `this`
	  BN.prototype.isubn = function isubn (num) {
	    assert(typeof num === 'number');
	    assert(num < 0x4000000);
	    if (num < 0) return this.iaddn(-num);

	    if (this.negative !== 0) {
	      this.negative = 0;
	      this.iaddn(num);
	      this.negative = 1;
	      return this;
	    }

	    this.words[0] -= num;

	    if (this.length === 1 && this.words[0] < 0) {
	      this.words[0] = -this.words[0];
	      this.negative = 1;
	    } else {
	      // Carry
	      for (var i = 0; i < this.length && this.words[i] < 0; i++) {
	        this.words[i] += 0x4000000;
	        this.words[i + 1] -= 1;
	      }
	    }

	    return this._strip();
	  };

	  BN.prototype.addn = function addn (num) {
	    return this.clone().iaddn(num);
	  };

	  BN.prototype.subn = function subn (num) {
	    return this.clone().isubn(num);
	  };

	  BN.prototype.iabs = function iabs () {
	    this.negative = 0;

	    return this;
	  };

	  BN.prototype.abs = function abs () {
	    return this.clone().iabs();
	  };

	  BN.prototype._ishlnsubmul = function _ishlnsubmul (num, mul, shift) {
	    var len = num.length + shift;
	    var i;

	    this._expand(len);

	    var w;
	    var carry = 0;
	    for (i = 0; i < num.length; i++) {
	      w = (this.words[i + shift] | 0) + carry;
	      var right = (num.words[i] | 0) * mul;
	      w -= right & 0x3ffffff;
	      carry = (w >> 26) - ((right / 0x4000000) | 0);
	      this.words[i + shift] = w & 0x3ffffff;
	    }
	    for (; i < this.length - shift; i++) {
	      w = (this.words[i + shift] | 0) + carry;
	      carry = w >> 26;
	      this.words[i + shift] = w & 0x3ffffff;
	    }

	    if (carry === 0) return this._strip();

	    // Subtraction overflow
	    assert(carry === -1);
	    carry = 0;
	    for (i = 0; i < this.length; i++) {
	      w = -(this.words[i] | 0) + carry;
	      carry = w >> 26;
	      this.words[i] = w & 0x3ffffff;
	    }
	    this.negative = 1;

	    return this._strip();
	  };

	  BN.prototype._wordDiv = function _wordDiv (num, mode) {
	    var shift = this.length - num.length;

	    var a = this.clone();
	    var b = num;

	    // Normalize
	    var bhi = b.words[b.length - 1] | 0;
	    var bhiBits = this._countBits(bhi);
	    shift = 26 - bhiBits;
	    if (shift !== 0) {
	      b = b.ushln(shift);
	      a.iushln(shift);
	      bhi = b.words[b.length - 1] | 0;
	    }

	    // Initialize quotient
	    var m = a.length - b.length;
	    var q;

	    if (mode !== 'mod') {
	      q = new BN(null);
	      q.length = m + 1;
	      q.words = new Array(q.length);
	      for (var i = 0; i < q.length; i++) {
	        q.words[i] = 0;
	      }
	    }

	    var diff = a.clone()._ishlnsubmul(b, 1, m);
	    if (diff.negative === 0) {
	      a = diff;
	      if (q) {
	        q.words[m] = 1;
	      }
	    }

	    for (var j = m - 1; j >= 0; j--) {
	      var qj = (a.words[b.length + j] | 0) * 0x4000000 +
	        (a.words[b.length + j - 1] | 0);

	      // NOTE: (qj / bhi) is (0x3ffffff * 0x4000000 + 0x3ffffff) / 0x2000000 max
	      // (0x7ffffff)
	      qj = Math.min((qj / bhi) | 0, 0x3ffffff);

	      a._ishlnsubmul(b, qj, j);
	      while (a.negative !== 0) {
	        qj--;
	        a.negative = 0;
	        a._ishlnsubmul(b, 1, j);
	        if (!a.isZero()) {
	          a.negative ^= 1;
	        }
	      }
	      if (q) {
	        q.words[j] = qj;
	      }
	    }
	    if (q) {
	      q._strip();
	    }
	    a._strip();

	    // Denormalize
	    if (mode !== 'div' && shift !== 0) {
	      a.iushrn(shift);
	    }

	    return {
	      div: q || null,
	      mod: a
	    };
	  };

	  // NOTE: 1) `mode` can be set to `mod` to request mod only,
	  //       to `div` to request div only, or be absent to
	  //       request both div & mod
	  //       2) `positive` is true if unsigned mod is requested
	  BN.prototype.divmod = function divmod (num, mode, positive) {
	    assert(!num.isZero());

	    if (this.isZero()) {
	      return {
	        div: new BN(0),
	        mod: new BN(0)
	      };
	    }

	    var div, mod, res;
	    if (this.negative !== 0 && num.negative === 0) {
	      res = this.neg().divmod(num, mode);

	      if (mode !== 'mod') {
	        div = res.div.neg();
	      }

	      if (mode !== 'div') {
	        mod = res.mod.neg();
	        if (positive && mod.negative !== 0) {
	          mod.iadd(num);
	        }
	      }

	      return {
	        div: div,
	        mod: mod
	      };
	    }

	    if (this.negative === 0 && num.negative !== 0) {
	      res = this.divmod(num.neg(), mode);

	      if (mode !== 'mod') {
	        div = res.div.neg();
	      }

	      return {
	        div: div,
	        mod: res.mod
	      };
	    }

	    if ((this.negative & num.negative) !== 0) {
	      res = this.neg().divmod(num.neg(), mode);

	      if (mode !== 'div') {
	        mod = res.mod.neg();
	        if (positive && mod.negative !== 0) {
	          mod.isub(num);
	        }
	      }

	      return {
	        div: res.div,
	        mod: mod
	      };
	    }

	    // Both numbers are positive at this point

	    // Strip both numbers to approximate shift value
	    if (num.length > this.length || this.cmp(num) < 0) {
	      return {
	        div: new BN(0),
	        mod: this
	      };
	    }

	    // Very short reduction
	    if (num.length === 1) {
	      if (mode === 'div') {
	        return {
	          div: this.divn(num.words[0]),
	          mod: null
	        };
	      }

	      if (mode === 'mod') {
	        return {
	          div: null,
	          mod: new BN(this.modrn(num.words[0]))
	        };
	      }

	      return {
	        div: this.divn(num.words[0]),
	        mod: new BN(this.modrn(num.words[0]))
	      };
	    }

	    return this._wordDiv(num, mode);
	  };

	  // Find `this` / `num`
	  BN.prototype.div = function div (num) {
	    return this.divmod(num, 'div', false).div;
	  };

	  // Find `this` % `num`
	  BN.prototype.mod = function mod (num) {
	    return this.divmod(num, 'mod', false).mod;
	  };

	  BN.prototype.umod = function umod (num) {
	    return this.divmod(num, 'mod', true).mod;
	  };

	  // Find Round(`this` / `num`)
	  BN.prototype.divRound = function divRound (num) {
	    var dm = this.divmod(num);

	    // Fast case - exact division
	    if (dm.mod.isZero()) return dm.div;

	    var mod = dm.div.negative !== 0 ? dm.mod.isub(num) : dm.mod;

	    var half = num.ushrn(1);
	    var r2 = num.andln(1);
	    var cmp = mod.cmp(half);

	    // Round down
	    if (cmp < 0 || (r2 === 1 && cmp === 0)) return dm.div;

	    // Round up
	    return dm.div.negative !== 0 ? dm.div.isubn(1) : dm.div.iaddn(1);
	  };

	  BN.prototype.modrn = function modrn (num) {
	    var isNegNum = num < 0;
	    if (isNegNum) num = -num;

	    assert(num <= 0x3ffffff);
	    var p = (1 << 26) % num;

	    var acc = 0;
	    for (var i = this.length - 1; i >= 0; i--) {
	      acc = (p * acc + (this.words[i] | 0)) % num;
	    }

	    return isNegNum ? -acc : acc;
	  };

	  // WARNING: DEPRECATED
	  BN.prototype.modn = function modn (num) {
	    return this.modrn(num);
	  };

	  // In-place division by number
	  BN.prototype.idivn = function idivn (num) {
	    var isNegNum = num < 0;
	    if (isNegNum) num = -num;

	    assert(num <= 0x3ffffff);

	    var carry = 0;
	    for (var i = this.length - 1; i >= 0; i--) {
	      var w = (this.words[i] | 0) + carry * 0x4000000;
	      this.words[i] = (w / num) | 0;
	      carry = w % num;
	    }

	    this._strip();
	    return isNegNum ? this.ineg() : this;
	  };

	  BN.prototype.divn = function divn (num) {
	    return this.clone().idivn(num);
	  };

	  BN.prototype.egcd = function egcd (p) {
	    assert(p.negative === 0);
	    assert(!p.isZero());

	    var x = this;
	    var y = p.clone();

	    if (x.negative !== 0) {
	      x = x.umod(p);
	    } else {
	      x = x.clone();
	    }

	    // A * x + B * y = x
	    var A = new BN(1);
	    var B = new BN(0);

	    // C * x + D * y = y
	    var C = new BN(0);
	    var D = new BN(1);

	    var g = 0;

	    while (x.isEven() && y.isEven()) {
	      x.iushrn(1);
	      y.iushrn(1);
	      ++g;
	    }

	    var yp = y.clone();
	    var xp = x.clone();

	    while (!x.isZero()) {
	      for (var i = 0, im = 1; (x.words[0] & im) === 0 && i < 26; ++i, im <<= 1);
	      if (i > 0) {
	        x.iushrn(i);
	        while (i-- > 0) {
	          if (A.isOdd() || B.isOdd()) {
	            A.iadd(yp);
	            B.isub(xp);
	          }

	          A.iushrn(1);
	          B.iushrn(1);
	        }
	      }

	      for (var j = 0, jm = 1; (y.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1);
	      if (j > 0) {
	        y.iushrn(j);
	        while (j-- > 0) {
	          if (C.isOdd() || D.isOdd()) {
	            C.iadd(yp);
	            D.isub(xp);
	          }

	          C.iushrn(1);
	          D.iushrn(1);
	        }
	      }

	      if (x.cmp(y) >= 0) {
	        x.isub(y);
	        A.isub(C);
	        B.isub(D);
	      } else {
	        y.isub(x);
	        C.isub(A);
	        D.isub(B);
	      }
	    }

	    return {
	      a: C,
	      b: D,
	      gcd: y.iushln(g)
	    };
	  };

	  // This is reduced incarnation of the binary EEA
	  // above, designated to invert members of the
	  // _prime_ fields F(p) at a maximal speed
	  BN.prototype._invmp = function _invmp (p) {
	    assert(p.negative === 0);
	    assert(!p.isZero());

	    var a = this;
	    var b = p.clone();

	    if (a.negative !== 0) {
	      a = a.umod(p);
	    } else {
	      a = a.clone();
	    }

	    var x1 = new BN(1);
	    var x2 = new BN(0);

	    var delta = b.clone();

	    while (a.cmpn(1) > 0 && b.cmpn(1) > 0) {
	      for (var i = 0, im = 1; (a.words[0] & im) === 0 && i < 26; ++i, im <<= 1);
	      if (i > 0) {
	        a.iushrn(i);
	        while (i-- > 0) {
	          if (x1.isOdd()) {
	            x1.iadd(delta);
	          }

	          x1.iushrn(1);
	        }
	      }

	      for (var j = 0, jm = 1; (b.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1);
	      if (j > 0) {
	        b.iushrn(j);
	        while (j-- > 0) {
	          if (x2.isOdd()) {
	            x2.iadd(delta);
	          }

	          x2.iushrn(1);
	        }
	      }

	      if (a.cmp(b) >= 0) {
	        a.isub(b);
	        x1.isub(x2);
	      } else {
	        b.isub(a);
	        x2.isub(x1);
	      }
	    }

	    var res;
	    if (a.cmpn(1) === 0) {
	      res = x1;
	    } else {
	      res = x2;
	    }

	    if (res.cmpn(0) < 0) {
	      res.iadd(p);
	    }

	    return res;
	  };

	  BN.prototype.gcd = function gcd (num) {
	    if (this.isZero()) return num.abs();
	    if (num.isZero()) return this.abs();

	    var a = this.clone();
	    var b = num.clone();
	    a.negative = 0;
	    b.negative = 0;

	    // Remove common factor of two
	    for (var shift = 0; a.isEven() && b.isEven(); shift++) {
	      a.iushrn(1);
	      b.iushrn(1);
	    }

	    do {
	      while (a.isEven()) {
	        a.iushrn(1);
	      }
	      while (b.isEven()) {
	        b.iushrn(1);
	      }

	      var r = a.cmp(b);
	      if (r < 0) {
	        // Swap `a` and `b` to make `a` always bigger than `b`
	        var t = a;
	        a = b;
	        b = t;
	      } else if (r === 0 || b.cmpn(1) === 0) {
	        break;
	      }

	      a.isub(b);
	    } while (true);

	    return b.iushln(shift);
	  };

	  // Invert number in the field F(num)
	  BN.prototype.invm = function invm (num) {
	    return this.egcd(num).a.umod(num);
	  };

	  BN.prototype.isEven = function isEven () {
	    return (this.words[0] & 1) === 0;
	  };

	  BN.prototype.isOdd = function isOdd () {
	    return (this.words[0] & 1) === 1;
	  };

	  // And first word and num
	  BN.prototype.andln = function andln (num) {
	    return this.words[0] & num;
	  };

	  // Increment at the bit position in-line
	  BN.prototype.bincn = function bincn (bit) {
	    assert(typeof bit === 'number');
	    var r = bit % 26;
	    var s = (bit - r) / 26;
	    var q = 1 << r;

	    // Fast case: bit is much higher than all existing words
	    if (this.length <= s) {
	      this._expand(s + 1);
	      this.words[s] |= q;
	      return this;
	    }

	    // Add bit and propagate, if needed
	    var carry = q;
	    for (var i = s; carry !== 0 && i < this.length; i++) {
	      var w = this.words[i] | 0;
	      w += carry;
	      carry = w >>> 26;
	      w &= 0x3ffffff;
	      this.words[i] = w;
	    }
	    if (carry !== 0) {
	      this.words[i] = carry;
	      this.length++;
	    }
	    return this;
	  };

	  BN.prototype.isZero = function isZero () {
	    return this.length === 1 && this.words[0] === 0;
	  };

	  BN.prototype.cmpn = function cmpn (num) {
	    var negative = num < 0;

	    if (this.negative !== 0 && !negative) return -1;
	    if (this.negative === 0 && negative) return 1;

	    this._strip();

	    var res;
	    if (this.length > 1) {
	      res = 1;
	    } else {
	      if (negative) {
	        num = -num;
	      }

	      assert(num <= 0x3ffffff, 'Number is too big');

	      var w = this.words[0] | 0;
	      res = w === num ? 0 : w < num ? -1 : 1;
	    }
	    if (this.negative !== 0) return -res | 0;
	    return res;
	  };

	  // Compare two numbers and return:
	  // 1 - if `this` > `num`
	  // 0 - if `this` == `num`
	  // -1 - if `this` < `num`
	  BN.prototype.cmp = function cmp (num) {
	    if (this.negative !== 0 && num.negative === 0) return -1;
	    if (this.negative === 0 && num.negative !== 0) return 1;

	    var res = this.ucmp(num);
	    if (this.negative !== 0) return -res | 0;
	    return res;
	  };

	  // Unsigned comparison
	  BN.prototype.ucmp = function ucmp (num) {
	    // At this point both numbers have the same sign
	    if (this.length > num.length) return 1;
	    if (this.length < num.length) return -1;

	    var res = 0;
	    for (var i = this.length - 1; i >= 0; i--) {
	      var a = this.words[i] | 0;
	      var b = num.words[i] | 0;

	      if (a === b) continue;
	      if (a < b) {
	        res = -1;
	      } else if (a > b) {
	        res = 1;
	      }
	      break;
	    }
	    return res;
	  };

	  BN.prototype.gtn = function gtn (num) {
	    return this.cmpn(num) === 1;
	  };

	  BN.prototype.gt = function gt (num) {
	    return this.cmp(num) === 1;
	  };

	  BN.prototype.gten = function gten (num) {
	    return this.cmpn(num) >= 0;
	  };

	  BN.prototype.gte = function gte (num) {
	    return this.cmp(num) >= 0;
	  };

	  BN.prototype.ltn = function ltn (num) {
	    return this.cmpn(num) === -1;
	  };

	  BN.prototype.lt = function lt (num) {
	    return this.cmp(num) === -1;
	  };

	  BN.prototype.lten = function lten (num) {
	    return this.cmpn(num) <= 0;
	  };

	  BN.prototype.lte = function lte (num) {
	    return this.cmp(num) <= 0;
	  };

	  BN.prototype.eqn = function eqn (num) {
	    return this.cmpn(num) === 0;
	  };

	  BN.prototype.eq = function eq (num) {
	    return this.cmp(num) === 0;
	  };

	  //
	  // A reduce context, could be using montgomery or something better, depending
	  // on the `m` itself.
	  //
	  BN.red = function red (num) {
	    return new Red(num);
	  };

	  BN.prototype.toRed = function toRed (ctx) {
	    assert(!this.red, 'Already a number in reduction context');
	    assert(this.negative === 0, 'red works only with positives');
	    return ctx.convertTo(this)._forceRed(ctx);
	  };

	  BN.prototype.fromRed = function fromRed () {
	    assert(this.red, 'fromRed works only with numbers in reduction context');
	    return this.red.convertFrom(this);
	  };

	  BN.prototype._forceRed = function _forceRed (ctx) {
	    this.red = ctx;
	    return this;
	  };

	  BN.prototype.forceRed = function forceRed (ctx) {
	    assert(!this.red, 'Already a number in reduction context');
	    return this._forceRed(ctx);
	  };

	  BN.prototype.redAdd = function redAdd (num) {
	    assert(this.red, 'redAdd works only with red numbers');
	    return this.red.add(this, num);
	  };

	  BN.prototype.redIAdd = function redIAdd (num) {
	    assert(this.red, 'redIAdd works only with red numbers');
	    return this.red.iadd(this, num);
	  };

	  BN.prototype.redSub = function redSub (num) {
	    assert(this.red, 'redSub works only with red numbers');
	    return this.red.sub(this, num);
	  };

	  BN.prototype.redISub = function redISub (num) {
	    assert(this.red, 'redISub works only with red numbers');
	    return this.red.isub(this, num);
	  };

	  BN.prototype.redShl = function redShl (num) {
	    assert(this.red, 'redShl works only with red numbers');
	    return this.red.shl(this, num);
	  };

	  BN.prototype.redMul = function redMul (num) {
	    assert(this.red, 'redMul works only with red numbers');
	    this.red._verify2(this, num);
	    return this.red.mul(this, num);
	  };

	  BN.prototype.redIMul = function redIMul (num) {
	    assert(this.red, 'redMul works only with red numbers');
	    this.red._verify2(this, num);
	    return this.red.imul(this, num);
	  };

	  BN.prototype.redSqr = function redSqr () {
	    assert(this.red, 'redSqr works only with red numbers');
	    this.red._verify1(this);
	    return this.red.sqr(this);
	  };

	  BN.prototype.redISqr = function redISqr () {
	    assert(this.red, 'redISqr works only with red numbers');
	    this.red._verify1(this);
	    return this.red.isqr(this);
	  };

	  // Square root over p
	  BN.prototype.redSqrt = function redSqrt () {
	    assert(this.red, 'redSqrt works only with red numbers');
	    this.red._verify1(this);
	    return this.red.sqrt(this);
	  };

	  BN.prototype.redInvm = function redInvm () {
	    assert(this.red, 'redInvm works only with red numbers');
	    this.red._verify1(this);
	    return this.red.invm(this);
	  };

	  // Return negative clone of `this` % `red modulo`
	  BN.prototype.redNeg = function redNeg () {
	    assert(this.red, 'redNeg works only with red numbers');
	    this.red._verify1(this);
	    return this.red.neg(this);
	  };

	  BN.prototype.redPow = function redPow (num) {
	    assert(this.red && !num.red, 'redPow(normalNum)');
	    this.red._verify1(this);
	    return this.red.pow(this, num);
	  };

	  // Prime numbers with efficient reduction
	  var primes = {
	    k256: null,
	    p224: null,
	    p192: null,
	    p25519: null
	  };

	  // Pseudo-Mersenne prime
	  function MPrime (name, p) {
	    // P = 2 ^ N - K
	    this.name = name;
	    this.p = new BN(p, 16);
	    this.n = this.p.bitLength();
	    this.k = new BN(1).iushln(this.n).isub(this.p);

	    this.tmp = this._tmp();
	  }

	  MPrime.prototype._tmp = function _tmp () {
	    var tmp = new BN(null);
	    tmp.words = new Array(Math.ceil(this.n / 13));
	    return tmp;
	  };

	  MPrime.prototype.ireduce = function ireduce (num) {
	    // Assumes that `num` is less than `P^2`
	    // num = HI * (2 ^ N - K) + HI * K + LO = HI * K + LO (mod P)
	    var r = num;
	    var rlen;

	    do {
	      this.split(r, this.tmp);
	      r = this.imulK(r);
	      r = r.iadd(this.tmp);
	      rlen = r.bitLength();
	    } while (rlen > this.n);

	    var cmp = rlen < this.n ? -1 : r.ucmp(this.p);
	    if (cmp === 0) {
	      r.words[0] = 0;
	      r.length = 1;
	    } else if (cmp > 0) {
	      r.isub(this.p);
	    } else {
	      if (r.strip !== undefined) {
	        // r is a BN v4 instance
	        r.strip();
	      } else {
	        // r is a BN v5 instance
	        r._strip();
	      }
	    }

	    return r;
	  };

	  MPrime.prototype.split = function split (input, out) {
	    input.iushrn(this.n, 0, out);
	  };

	  MPrime.prototype.imulK = function imulK (num) {
	    return num.imul(this.k);
	  };

	  function K256 () {
	    MPrime.call(
	      this,
	      'k256',
	      'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f');
	  }
	  inherits(K256, MPrime);

	  K256.prototype.split = function split (input, output) {
	    // 256 = 9 * 26 + 22
	    var mask = 0x3fffff;

	    var outLen = Math.min(input.length, 9);
	    for (var i = 0; i < outLen; i++) {
	      output.words[i] = input.words[i];
	    }
	    output.length = outLen;

	    if (input.length <= 9) {
	      input.words[0] = 0;
	      input.length = 1;
	      return;
	    }

	    // Shift by 9 limbs
	    var prev = input.words[9];
	    output.words[output.length++] = prev & mask;

	    for (i = 10; i < input.length; i++) {
	      var next = input.words[i] | 0;
	      input.words[i - 10] = ((next & mask) << 4) | (prev >>> 22);
	      prev = next;
	    }
	    prev >>>= 22;
	    input.words[i - 10] = prev;
	    if (prev === 0 && input.length > 10) {
	      input.length -= 10;
	    } else {
	      input.length -= 9;
	    }
	  };

	  K256.prototype.imulK = function imulK (num) {
	    // K = 0x1000003d1 = [ 0x40, 0x3d1 ]
	    num.words[num.length] = 0;
	    num.words[num.length + 1] = 0;
	    num.length += 2;

	    // bounded at: 0x40 * 0x3ffffff + 0x3d0 = 0x100000390
	    var lo = 0;
	    for (var i = 0; i < num.length; i++) {
	      var w = num.words[i] | 0;
	      lo += w * 0x3d1;
	      num.words[i] = lo & 0x3ffffff;
	      lo = w * 0x40 + ((lo / 0x4000000) | 0);
	    }

	    // Fast length reduction
	    if (num.words[num.length - 1] === 0) {
	      num.length--;
	      if (num.words[num.length - 1] === 0) {
	        num.length--;
	      }
	    }
	    return num;
	  };

	  function P224 () {
	    MPrime.call(
	      this,
	      'p224',
	      'ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001');
	  }
	  inherits(P224, MPrime);

	  function P192 () {
	    MPrime.call(
	      this,
	      'p192',
	      'ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff');
	  }
	  inherits(P192, MPrime);

	  function P25519 () {
	    // 2 ^ 255 - 19
	    MPrime.call(
	      this,
	      '25519',
	      '7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed');
	  }
	  inherits(P25519, MPrime);

	  P25519.prototype.imulK = function imulK (num) {
	    // K = 0x13
	    var carry = 0;
	    for (var i = 0; i < num.length; i++) {
	      var hi = (num.words[i] | 0) * 0x13 + carry;
	      var lo = hi & 0x3ffffff;
	      hi >>>= 26;

	      num.words[i] = lo;
	      carry = hi;
	    }
	    if (carry !== 0) {
	      num.words[num.length++] = carry;
	    }
	    return num;
	  };

	  // Exported mostly for testing purposes, use plain name instead
	  BN._prime = function prime (name) {
	    // Cached version of prime
	    if (primes[name]) return primes[name];

	    var prime;
	    if (name === 'k256') {
	      prime = new K256();
	    } else if (name === 'p224') {
	      prime = new P224();
	    } else if (name === 'p192') {
	      prime = new P192();
	    } else if (name === 'p25519') {
	      prime = new P25519();
	    } else {
	      throw new Error('Unknown prime ' + name);
	    }
	    primes[name] = prime;

	    return prime;
	  };

	  //
	  // Base reduction engine
	  //
	  function Red (m) {
	    if (typeof m === 'string') {
	      var prime = BN._prime(m);
	      this.m = prime.p;
	      this.prime = prime;
	    } else {
	      assert(m.gtn(1), 'modulus must be greater than 1');
	      this.m = m;
	      this.prime = null;
	    }
	  }

	  Red.prototype._verify1 = function _verify1 (a) {
	    assert(a.negative === 0, 'red works only with positives');
	    assert(a.red, 'red works only with red numbers');
	  };

	  Red.prototype._verify2 = function _verify2 (a, b) {
	    assert((a.negative | b.negative) === 0, 'red works only with positives');
	    assert(a.red && a.red === b.red,
	      'red works only with red numbers');
	  };

	  Red.prototype.imod = function imod (a) {
	    if (this.prime) return this.prime.ireduce(a)._forceRed(this);

	    move(a, a.umod(this.m)._forceRed(this));
	    return a;
	  };

	  Red.prototype.neg = function neg (a) {
	    if (a.isZero()) {
	      return a.clone();
	    }

	    return this.m.sub(a)._forceRed(this);
	  };

	  Red.prototype.add = function add (a, b) {
	    this._verify2(a, b);

	    var res = a.add(b);
	    if (res.cmp(this.m) >= 0) {
	      res.isub(this.m);
	    }
	    return res._forceRed(this);
	  };

	  Red.prototype.iadd = function iadd (a, b) {
	    this._verify2(a, b);

	    var res = a.iadd(b);
	    if (res.cmp(this.m) >= 0) {
	      res.isub(this.m);
	    }
	    return res;
	  };

	  Red.prototype.sub = function sub (a, b) {
	    this._verify2(a, b);

	    var res = a.sub(b);
	    if (res.cmpn(0) < 0) {
	      res.iadd(this.m);
	    }
	    return res._forceRed(this);
	  };

	  Red.prototype.isub = function isub (a, b) {
	    this._verify2(a, b);

	    var res = a.isub(b);
	    if (res.cmpn(0) < 0) {
	      res.iadd(this.m);
	    }
	    return res;
	  };

	  Red.prototype.shl = function shl (a, num) {
	    this._verify1(a);
	    return this.imod(a.ushln(num));
	  };

	  Red.prototype.imul = function imul (a, b) {
	    this._verify2(a, b);
	    return this.imod(a.imul(b));
	  };

	  Red.prototype.mul = function mul (a, b) {
	    this._verify2(a, b);
	    return this.imod(a.mul(b));
	  };

	  Red.prototype.isqr = function isqr (a) {
	    return this.imul(a, a.clone());
	  };

	  Red.prototype.sqr = function sqr (a) {
	    return this.mul(a, a);
	  };

	  Red.prototype.sqrt = function sqrt (a) {
	    if (a.isZero()) return a.clone();

	    var mod3 = this.m.andln(3);
	    assert(mod3 % 2 === 1);

	    // Fast case
	    if (mod3 === 3) {
	      var pow = this.m.add(new BN(1)).iushrn(2);
	      return this.pow(a, pow);
	    }

	    // Tonelli-Shanks algorithm (Totally unoptimized and slow)
	    //
	    // Find Q and S, that Q * 2 ^ S = (P - 1)
	    var q = this.m.subn(1);
	    var s = 0;
	    while (!q.isZero() && q.andln(1) === 0) {
	      s++;
	      q.iushrn(1);
	    }
	    assert(!q.isZero());

	    var one = new BN(1).toRed(this);
	    var nOne = one.redNeg();

	    // Find quadratic non-residue
	    // NOTE: Max is such because of generalized Riemann hypothesis.
	    var lpow = this.m.subn(1).iushrn(1);
	    var z = this.m.bitLength();
	    z = new BN(2 * z * z).toRed(this);

	    while (this.pow(z, lpow).cmp(nOne) !== 0) {
	      z.redIAdd(nOne);
	    }

	    var c = this.pow(z, q);
	    var r = this.pow(a, q.addn(1).iushrn(1));
	    var t = this.pow(a, q);
	    var m = s;
	    while (t.cmp(one) !== 0) {
	      var tmp = t;
	      for (var i = 0; tmp.cmp(one) !== 0; i++) {
	        tmp = tmp.redSqr();
	      }
	      assert(i < m);
	      var b = this.pow(c, new BN(1).iushln(m - i - 1));

	      r = r.redMul(b);
	      c = b.redSqr();
	      t = t.redMul(c);
	      m = i;
	    }

	    return r;
	  };

	  Red.prototype.invm = function invm (a) {
	    var inv = a._invmp(this.m);
	    if (inv.negative !== 0) {
	      inv.negative = 0;
	      return this.imod(inv).redNeg();
	    } else {
	      return this.imod(inv);
	    }
	  };

	  Red.prototype.pow = function pow (a, num) {
	    if (num.isZero()) return new BN(1).toRed(this);
	    if (num.cmpn(1) === 0) return a.clone();

	    var windowSize = 4;
	    var wnd = new Array(1 << windowSize);
	    wnd[0] = new BN(1).toRed(this);
	    wnd[1] = a;
	    for (var i = 2; i < wnd.length; i++) {
	      wnd[i] = this.mul(wnd[i - 1], a);
	    }

	    var res = wnd[0];
	    var current = 0;
	    var currentLen = 0;
	    var start = num.bitLength() % 26;
	    if (start === 0) {
	      start = 26;
	    }

	    for (i = num.length - 1; i >= 0; i--) {
	      var word = num.words[i];
	      for (var j = start - 1; j >= 0; j--) {
	        var bit = (word >> j) & 1;
	        if (res !== wnd[0]) {
	          res = this.sqr(res);
	        }

	        if (bit === 0 && current === 0) {
	          currentLen = 0;
	          continue;
	        }

	        current <<= 1;
	        current |= bit;
	        currentLen++;
	        if (currentLen !== windowSize && (i !== 0 || j !== 0)) continue;

	        res = this.mul(res, wnd[current]);
	        currentLen = 0;
	        current = 0;
	      }
	      start = 26;
	    }

	    return res;
	  };

	  Red.prototype.convertTo = function convertTo (num) {
	    var r = num.umod(this.m);

	    return r === num ? r.clone() : r;
	  };

	  Red.prototype.convertFrom = function convertFrom (num) {
	    var res = num.clone();
	    res.red = null;
	    return res;
	  };

	  //
	  // Montgomery method engine
	  //

	  BN.mont = function mont (num) {
	    return new Mont(num);
	  };

	  function Mont (m) {
	    Red.call(this, m);

	    this.shift = this.m.bitLength();
	    if (this.shift % 26 !== 0) {
	      this.shift += 26 - (this.shift % 26);
	    }

	    this.r = new BN(1).iushln(this.shift);
	    this.r2 = this.imod(this.r.sqr());
	    this.rinv = this.r._invmp(this.m);

	    this.minv = this.rinv.mul(this.r).isubn(1).div(this.m);
	    this.minv = this.minv.umod(this.r);
	    this.minv = this.r.sub(this.minv);
	  }
	  inherits(Mont, Red);

	  Mont.prototype.convertTo = function convertTo (num) {
	    return this.imod(num.ushln(this.shift));
	  };

	  Mont.prototype.convertFrom = function convertFrom (num) {
	    var r = this.imod(num.mul(this.rinv));
	    r.red = null;
	    return r;
	  };

	  Mont.prototype.imul = function imul (a, b) {
	    if (a.isZero() || b.isZero()) {
	      a.words[0] = 0;
	      a.length = 1;
	      return a;
	    }

	    var t = a.imul(b);
	    var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
	    var u = t.isub(c).iushrn(this.shift);
	    var res = u;

	    if (u.cmp(this.m) >= 0) {
	      res = u.isub(this.m);
	    } else if (u.cmpn(0) < 0) {
	      res = u.iadd(this.m);
	    }

	    return res._forceRed(this);
	  };

	  Mont.prototype.mul = function mul (a, b) {
	    if (a.isZero() || b.isZero()) return new BN(0)._forceRed(this);

	    var t = a.mul(b);
	    var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
	    var u = t.isub(c).iushrn(this.shift);
	    var res = u;
	    if (u.cmp(this.m) >= 0) {
	      res = u.isub(this.m);
	    } else if (u.cmpn(0) < 0) {
	      res = u.iadd(this.m);
	    }

	    return res._forceRed(this);
	  };

	  Mont.prototype.invm = function invm (a) {
	    // (AR)^-1 * R^2 = (A^-1 * R^-1) * R^2 = A^-1 * R
	    var res = this.imod(a._invmp(this.m).mul(this.r2));
	    return res._forceRed(this);
	  };
	})(module, commonjsGlobal$1);
	}(bn));

	var BN = bn.exports;

	var safeBuffer = {exports: {}};

	var buffer = {};

	var base64Js = {};

	base64Js.byteLength = byteLength;
	base64Js.toByteArray = toByteArray;
	base64Js.fromByteArray = fromByteArray;

	var lookup = [];
	var revLookup = [];
	var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;

	var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	for (var i$1 = 0, len = code.length; i$1 < len; ++i$1) {
	  lookup[i$1] = code[i$1];
	  revLookup[code.charCodeAt(i$1)] = i$1;
	}

	// Support decoding URL-safe base64 strings, as Node.js does.
	// See: https://en.wikipedia.org/wiki/Base64#URL_applications
	revLookup['-'.charCodeAt(0)] = 62;
	revLookup['_'.charCodeAt(0)] = 63;

	function getLens (b64) {
	  var len = b64.length;

	  if (len % 4 > 0) {
	    throw new Error('Invalid string. Length must be a multiple of 4')
	  }

	  // Trim off extra bytes after placeholder bytes are found
	  // See: https://github.com/beatgammit/base64-js/issues/42
	  var validLen = b64.indexOf('=');
	  if (validLen === -1) validLen = len;

	  var placeHoldersLen = validLen === len
	    ? 0
	    : 4 - (validLen % 4);

	  return [validLen, placeHoldersLen]
	}

	// base64 is 4/3 + up to two characters of the original data
	function byteLength (b64) {
	  var lens = getLens(b64);
	  var validLen = lens[0];
	  var placeHoldersLen = lens[1];
	  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
	}

	function _byteLength (b64, validLen, placeHoldersLen) {
	  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
	}

	function toByteArray (b64) {
	  var tmp;
	  var lens = getLens(b64);
	  var validLen = lens[0];
	  var placeHoldersLen = lens[1];

	  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));

	  var curByte = 0;

	  // if there are placeholders, only get up to the last complete 4 chars
	  var len = placeHoldersLen > 0
	    ? validLen - 4
	    : validLen;

	  var i;
	  for (i = 0; i < len; i += 4) {
	    tmp =
	      (revLookup[b64.charCodeAt(i)] << 18) |
	      (revLookup[b64.charCodeAt(i + 1)] << 12) |
	      (revLookup[b64.charCodeAt(i + 2)] << 6) |
	      revLookup[b64.charCodeAt(i + 3)];
	    arr[curByte++] = (tmp >> 16) & 0xFF;
	    arr[curByte++] = (tmp >> 8) & 0xFF;
	    arr[curByte++] = tmp & 0xFF;
	  }

	  if (placeHoldersLen === 2) {
	    tmp =
	      (revLookup[b64.charCodeAt(i)] << 2) |
	      (revLookup[b64.charCodeAt(i + 1)] >> 4);
	    arr[curByte++] = tmp & 0xFF;
	  }

	  if (placeHoldersLen === 1) {
	    tmp =
	      (revLookup[b64.charCodeAt(i)] << 10) |
	      (revLookup[b64.charCodeAt(i + 1)] << 4) |
	      (revLookup[b64.charCodeAt(i + 2)] >> 2);
	    arr[curByte++] = (tmp >> 8) & 0xFF;
	    arr[curByte++] = tmp & 0xFF;
	  }

	  return arr
	}

	function tripletToBase64 (num) {
	  return lookup[num >> 18 & 0x3F] +
	    lookup[num >> 12 & 0x3F] +
	    lookup[num >> 6 & 0x3F] +
	    lookup[num & 0x3F]
	}

	function encodeChunk (uint8, start, end) {
	  var tmp;
	  var output = [];
	  for (var i = start; i < end; i += 3) {
	    tmp =
	      ((uint8[i] << 16) & 0xFF0000) +
	      ((uint8[i + 1] << 8) & 0xFF00) +
	      (uint8[i + 2] & 0xFF);
	    output.push(tripletToBase64(tmp));
	  }
	  return output.join('')
	}

	function fromByteArray (uint8) {
	  var tmp;
	  var len = uint8.length;
	  var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
	  var parts = [];
	  var maxChunkLength = 16383; // must be multiple of 3

	  // go through the array every three bytes, we'll deal with trailing stuff later
	  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
	    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)));
	  }

	  // pad the end with zeros, but make sure to not forget the extra bytes
	  if (extraBytes === 1) {
	    tmp = uint8[len - 1];
	    parts.push(
	      lookup[tmp >> 2] +
	      lookup[(tmp << 4) & 0x3F] +
	      '=='
	    );
	  } else if (extraBytes === 2) {
	    tmp = (uint8[len - 2] << 8) + uint8[len - 1];
	    parts.push(
	      lookup[tmp >> 10] +
	      lookup[(tmp >> 4) & 0x3F] +
	      lookup[(tmp << 2) & 0x3F] +
	      '='
	    );
	  }

	  return parts.join('')
	}

	var ieee754 = {};

	/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */

	ieee754.read = function (buffer, offset, isLE, mLen, nBytes) {
	  var e, m;
	  var eLen = (nBytes * 8) - mLen - 1;
	  var eMax = (1 << eLen) - 1;
	  var eBias = eMax >> 1;
	  var nBits = -7;
	  var i = isLE ? (nBytes - 1) : 0;
	  var d = isLE ? -1 : 1;
	  var s = buffer[offset + i];

	  i += d;

	  e = s & ((1 << (-nBits)) - 1);
	  s >>= (-nBits);
	  nBits += eLen;
	  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

	  m = e & ((1 << (-nBits)) - 1);
	  e >>= (-nBits);
	  nBits += mLen;
	  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

	  if (e === 0) {
	    e = 1 - eBias;
	  } else if (e === eMax) {
	    return m ? NaN : ((s ? -1 : 1) * Infinity)
	  } else {
	    m = m + Math.pow(2, mLen);
	    e = e - eBias;
	  }
	  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
	};

	ieee754.write = function (buffer, value, offset, isLE, mLen, nBytes) {
	  var e, m, c;
	  var eLen = (nBytes * 8) - mLen - 1;
	  var eMax = (1 << eLen) - 1;
	  var eBias = eMax >> 1;
	  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
	  var i = isLE ? 0 : (nBytes - 1);
	  var d = isLE ? 1 : -1;
	  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

	  value = Math.abs(value);

	  if (isNaN(value) || value === Infinity) {
	    m = isNaN(value) ? 1 : 0;
	    e = eMax;
	  } else {
	    e = Math.floor(Math.log(value) / Math.LN2);
	    if (value * (c = Math.pow(2, -e)) < 1) {
	      e--;
	      c *= 2;
	    }
	    if (e + eBias >= 1) {
	      value += rt / c;
	    } else {
	      value += rt * Math.pow(2, 1 - eBias);
	    }
	    if (value * c >= 2) {
	      e++;
	      c /= 2;
	    }

	    if (e + eBias >= eMax) {
	      m = 0;
	      e = eMax;
	    } else if (e + eBias >= 1) {
	      m = ((value * c) - 1) * Math.pow(2, mLen);
	      e = e + eBias;
	    } else {
	      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
	      e = 0;
	    }
	  }

	  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

	  e = (e << mLen) | m;
	  eLen += mLen;
	  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

	  buffer[offset + i - d] |= s * 128;
	};

	/*!
	 * The buffer module from node.js, for the browser.
	 *
	 * @author   Feross Aboukhadijeh <https://feross.org>
	 * @license  MIT
	 */

	(function (exports) {

	const base64 = base64Js;
	const ieee754$1 = ieee754;
	const customInspectSymbol =
	  (typeof Symbol === 'function' && typeof Symbol['for'] === 'function') // eslint-disable-line dot-notation
	    ? Symbol['for']('nodejs.util.inspect.custom') // eslint-disable-line dot-notation
	    : null;

	exports.Buffer = Buffer;
	exports.SlowBuffer = SlowBuffer;
	exports.INSPECT_MAX_BYTES = 50;

	const K_MAX_LENGTH = 0x7fffffff;
	exports.kMaxLength = K_MAX_LENGTH;

	/**
	 * If `Buffer.TYPED_ARRAY_SUPPORT`:
	 *   === true    Use Uint8Array implementation (fastest)
	 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
	 *               implementation (most compatible, even IE6)
	 *
	 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
	 * Opera 11.6+, iOS 4.2+.
	 *
	 * We report that the browser does not support typed arrays if the are not subclassable
	 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
	 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
	 * for __proto__ and has a buggy typed array implementation.
	 */
	Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport();

	if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
	    typeof console.error === 'function') {
	  console.error(
	    'This browser lacks typed array (Uint8Array) support which is required by ' +
	    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
	  );
	}

	function typedArraySupport () {
	  // Can typed array instances can be augmented?
	  try {
	    const arr = new Uint8Array(1);
	    const proto = { foo: function () { return 42 } };
	    Object.setPrototypeOf(proto, Uint8Array.prototype);
	    Object.setPrototypeOf(arr, proto);
	    return arr.foo() === 42
	  } catch (e) {
	    return false
	  }
	}

	Object.defineProperty(Buffer.prototype, 'parent', {
	  enumerable: true,
	  get: function () {
	    if (!Buffer.isBuffer(this)) return undefined
	    return this.buffer
	  }
	});

	Object.defineProperty(Buffer.prototype, 'offset', {
	  enumerable: true,
	  get: function () {
	    if (!Buffer.isBuffer(this)) return undefined
	    return this.byteOffset
	  }
	});

	function createBuffer (length) {
	  if (length > K_MAX_LENGTH) {
	    throw new RangeError('The value "' + length + '" is invalid for option "size"')
	  }
	  // Return an augmented `Uint8Array` instance
	  const buf = new Uint8Array(length);
	  Object.setPrototypeOf(buf, Buffer.prototype);
	  return buf
	}

	/**
	 * The Buffer constructor returns instances of `Uint8Array` that have their
	 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
	 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
	 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
	 * returns a single octet.
	 *
	 * The `Uint8Array` prototype remains unmodified.
	 */

	function Buffer (arg, encodingOrOffset, length) {
	  // Common case.
	  if (typeof arg === 'number') {
	    if (typeof encodingOrOffset === 'string') {
	      throw new TypeError(
	        'The "string" argument must be of type string. Received type number'
	      )
	    }
	    return allocUnsafe(arg)
	  }
	  return from(arg, encodingOrOffset, length)
	}

	Buffer.poolSize = 8192; // not used by this implementation

	function from (value, encodingOrOffset, length) {
	  if (typeof value === 'string') {
	    return fromString(value, encodingOrOffset)
	  }

	  if (ArrayBuffer.isView(value)) {
	    return fromArrayView(value)
	  }

	  if (value == null) {
	    throw new TypeError(
	      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
	      'or Array-like Object. Received type ' + (typeof value)
	    )
	  }

	  if (isInstance(value, ArrayBuffer) ||
	      (value && isInstance(value.buffer, ArrayBuffer))) {
	    return fromArrayBuffer(value, encodingOrOffset, length)
	  }

	  if (typeof SharedArrayBuffer !== 'undefined' &&
	      (isInstance(value, SharedArrayBuffer) ||
	      (value && isInstance(value.buffer, SharedArrayBuffer)))) {
	    return fromArrayBuffer(value, encodingOrOffset, length)
	  }

	  if (typeof value === 'number') {
	    throw new TypeError(
	      'The "value" argument must not be of type number. Received type number'
	    )
	  }

	  const valueOf = value.valueOf && value.valueOf();
	  if (valueOf != null && valueOf !== value) {
	    return Buffer.from(valueOf, encodingOrOffset, length)
	  }

	  const b = fromObject(value);
	  if (b) return b

	  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
	      typeof value[Symbol.toPrimitive] === 'function') {
	    return Buffer.from(value[Symbol.toPrimitive]('string'), encodingOrOffset, length)
	  }

	  throw new TypeError(
	    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
	    'or Array-like Object. Received type ' + (typeof value)
	  )
	}

	/**
	 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
	 * if value is a number.
	 * Buffer.from(str[, encoding])
	 * Buffer.from(array)
	 * Buffer.from(buffer)
	 * Buffer.from(arrayBuffer[, byteOffset[, length]])
	 **/
	Buffer.from = function (value, encodingOrOffset, length) {
	  return from(value, encodingOrOffset, length)
	};

	// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
	// https://github.com/feross/buffer/pull/148
	Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype);
	Object.setPrototypeOf(Buffer, Uint8Array);

	function assertSize (size) {
	  if (typeof size !== 'number') {
	    throw new TypeError('"size" argument must be of type number')
	  } else if (size < 0) {
	    throw new RangeError('The value "' + size + '" is invalid for option "size"')
	  }
	}

	function alloc (size, fill, encoding) {
	  assertSize(size);
	  if (size <= 0) {
	    return createBuffer(size)
	  }
	  if (fill !== undefined) {
	    // Only pay attention to encoding if it's a string. This
	    // prevents accidentally sending in a number that would
	    // be interpreted as a start offset.
	    return typeof encoding === 'string'
	      ? createBuffer(size).fill(fill, encoding)
	      : createBuffer(size).fill(fill)
	  }
	  return createBuffer(size)
	}

	/**
	 * Creates a new filled Buffer instance.
	 * alloc(size[, fill[, encoding]])
	 **/
	Buffer.alloc = function (size, fill, encoding) {
	  return alloc(size, fill, encoding)
	};

	function allocUnsafe (size) {
	  assertSize(size);
	  return createBuffer(size < 0 ? 0 : checked(size) | 0)
	}

	/**
	 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
	 * */
	Buffer.allocUnsafe = function (size) {
	  return allocUnsafe(size)
	};
	/**
	 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
	 */
	Buffer.allocUnsafeSlow = function (size) {
	  return allocUnsafe(size)
	};

	function fromString (string, encoding) {
	  if (typeof encoding !== 'string' || encoding === '') {
	    encoding = 'utf8';
	  }

	  if (!Buffer.isEncoding(encoding)) {
	    throw new TypeError('Unknown encoding: ' + encoding)
	  }

	  const length = byteLength(string, encoding) | 0;
	  let buf = createBuffer(length);

	  const actual = buf.write(string, encoding);

	  if (actual !== length) {
	    // Writing a hex string, for example, that contains invalid characters will
	    // cause everything after the first invalid character to be ignored. (e.g.
	    // 'abxxcd' will be treated as 'ab')
	    buf = buf.slice(0, actual);
	  }

	  return buf
	}

	function fromArrayLike (array) {
	  const length = array.length < 0 ? 0 : checked(array.length) | 0;
	  const buf = createBuffer(length);
	  for (let i = 0; i < length; i += 1) {
	    buf[i] = array[i] & 255;
	  }
	  return buf
	}

	function fromArrayView (arrayView) {
	  if (isInstance(arrayView, Uint8Array)) {
	    const copy = new Uint8Array(arrayView);
	    return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength)
	  }
	  return fromArrayLike(arrayView)
	}

	function fromArrayBuffer (array, byteOffset, length) {
	  if (byteOffset < 0 || array.byteLength < byteOffset) {
	    throw new RangeError('"offset" is outside of buffer bounds')
	  }

	  if (array.byteLength < byteOffset + (length || 0)) {
	    throw new RangeError('"length" is outside of buffer bounds')
	  }

	  let buf;
	  if (byteOffset === undefined && length === undefined) {
	    buf = new Uint8Array(array);
	  } else if (length === undefined) {
	    buf = new Uint8Array(array, byteOffset);
	  } else {
	    buf = new Uint8Array(array, byteOffset, length);
	  }

	  // Return an augmented `Uint8Array` instance
	  Object.setPrototypeOf(buf, Buffer.prototype);

	  return buf
	}

	function fromObject (obj) {
	  if (Buffer.isBuffer(obj)) {
	    const len = checked(obj.length) | 0;
	    const buf = createBuffer(len);

	    if (buf.length === 0) {
	      return buf
	    }

	    obj.copy(buf, 0, 0, len);
	    return buf
	  }

	  if (obj.length !== undefined) {
	    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
	      return createBuffer(0)
	    }
	    return fromArrayLike(obj)
	  }

	  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
	    return fromArrayLike(obj.data)
	  }
	}

	function checked (length) {
	  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
	  // length is NaN (which is otherwise coerced to zero.)
	  if (length >= K_MAX_LENGTH) {
	    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
	                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
	  }
	  return length | 0
	}

	function SlowBuffer (length) {
	  if (+length != length) { // eslint-disable-line eqeqeq
	    length = 0;
	  }
	  return Buffer.alloc(+length)
	}

	Buffer.isBuffer = function isBuffer (b) {
	  return b != null && b._isBuffer === true &&
	    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
	};

	Buffer.compare = function compare (a, b) {
	  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength);
	  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength);
	  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
	    throw new TypeError(
	      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
	    )
	  }

	  if (a === b) return 0

	  let x = a.length;
	  let y = b.length;

	  for (let i = 0, len = Math.min(x, y); i < len; ++i) {
	    if (a[i] !== b[i]) {
	      x = a[i];
	      y = b[i];
	      break
	    }
	  }

	  if (x < y) return -1
	  if (y < x) return 1
	  return 0
	};

	Buffer.isEncoding = function isEncoding (encoding) {
	  switch (String(encoding).toLowerCase()) {
	    case 'hex':
	    case 'utf8':
	    case 'utf-8':
	    case 'ascii':
	    case 'latin1':
	    case 'binary':
	    case 'base64':
	    case 'ucs2':
	    case 'ucs-2':
	    case 'utf16le':
	    case 'utf-16le':
	      return true
	    default:
	      return false
	  }
	};

	Buffer.concat = function concat (list, length) {
	  if (!Array.isArray(list)) {
	    throw new TypeError('"list" argument must be an Array of Buffers')
	  }

	  if (list.length === 0) {
	    return Buffer.alloc(0)
	  }

	  let i;
	  if (length === undefined) {
	    length = 0;
	    for (i = 0; i < list.length; ++i) {
	      length += list[i].length;
	    }
	  }

	  const buffer = Buffer.allocUnsafe(length);
	  let pos = 0;
	  for (i = 0; i < list.length; ++i) {
	    let buf = list[i];
	    if (isInstance(buf, Uint8Array)) {
	      if (pos + buf.length > buffer.length) {
	        if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);
	        buf.copy(buffer, pos);
	      } else {
	        Uint8Array.prototype.set.call(
	          buffer,
	          buf,
	          pos
	        );
	      }
	    } else if (!Buffer.isBuffer(buf)) {
	      throw new TypeError('"list" argument must be an Array of Buffers')
	    } else {
	      buf.copy(buffer, pos);
	    }
	    pos += buf.length;
	  }
	  return buffer
	};

	function byteLength (string, encoding) {
	  if (Buffer.isBuffer(string)) {
	    return string.length
	  }
	  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
	    return string.byteLength
	  }
	  if (typeof string !== 'string') {
	    throw new TypeError(
	      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
	      'Received type ' + typeof string
	    )
	  }

	  const len = string.length;
	  const mustMatch = (arguments.length > 2 && arguments[2] === true);
	  if (!mustMatch && len === 0) return 0

	  // Use a for loop to avoid recursion
	  let loweredCase = false;
	  for (;;) {
	    switch (encoding) {
	      case 'ascii':
	      case 'latin1':
	      case 'binary':
	        return len
	      case 'utf8':
	      case 'utf-8':
	        return utf8ToBytes(string).length
	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return len * 2
	      case 'hex':
	        return len >>> 1
	      case 'base64':
	        return base64ToBytes(string).length
	      default:
	        if (loweredCase) {
	          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
	        }
	        encoding = ('' + encoding).toLowerCase();
	        loweredCase = true;
	    }
	  }
	}
	Buffer.byteLength = byteLength;

	function slowToString (encoding, start, end) {
	  let loweredCase = false;

	  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
	  // property of a typed array.

	  // This behaves neither like String nor Uint8Array in that we set start/end
	  // to their upper/lower bounds if the value passed is out of range.
	  // undefined is handled specially as per ECMA-262 6th Edition,
	  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
	  if (start === undefined || start < 0) {
	    start = 0;
	  }
	  // Return early if start > this.length. Done here to prevent potential uint32
	  // coercion fail below.
	  if (start > this.length) {
	    return ''
	  }

	  if (end === undefined || end > this.length) {
	    end = this.length;
	  }

	  if (end <= 0) {
	    return ''
	  }

	  // Force coercion to uint32. This will also coerce falsey/NaN values to 0.
	  end >>>= 0;
	  start >>>= 0;

	  if (end <= start) {
	    return ''
	  }

	  if (!encoding) encoding = 'utf8';

	  while (true) {
	    switch (encoding) {
	      case 'hex':
	        return hexSlice(this, start, end)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Slice(this, start, end)

	      case 'ascii':
	        return asciiSlice(this, start, end)

	      case 'latin1':
	      case 'binary':
	        return latin1Slice(this, start, end)

	      case 'base64':
	        return base64Slice(this, start, end)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return utf16leSlice(this, start, end)

	      default:
	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = (encoding + '').toLowerCase();
	        loweredCase = true;
	    }
	  }
	}

	// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
	// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
	// reliably in a browserify context because there could be multiple different
	// copies of the 'buffer' package in use. This method works even for Buffer
	// instances that were created from another copy of the `buffer` package.
	// See: https://github.com/feross/buffer/issues/154
	Buffer.prototype._isBuffer = true;

	function swap (b, n, m) {
	  const i = b[n];
	  b[n] = b[m];
	  b[m] = i;
	}

	Buffer.prototype.swap16 = function swap16 () {
	  const len = this.length;
	  if (len % 2 !== 0) {
	    throw new RangeError('Buffer size must be a multiple of 16-bits')
	  }
	  for (let i = 0; i < len; i += 2) {
	    swap(this, i, i + 1);
	  }
	  return this
	};

	Buffer.prototype.swap32 = function swap32 () {
	  const len = this.length;
	  if (len % 4 !== 0) {
	    throw new RangeError('Buffer size must be a multiple of 32-bits')
	  }
	  for (let i = 0; i < len; i += 4) {
	    swap(this, i, i + 3);
	    swap(this, i + 1, i + 2);
	  }
	  return this
	};

	Buffer.prototype.swap64 = function swap64 () {
	  const len = this.length;
	  if (len % 8 !== 0) {
	    throw new RangeError('Buffer size must be a multiple of 64-bits')
	  }
	  for (let i = 0; i < len; i += 8) {
	    swap(this, i, i + 7);
	    swap(this, i + 1, i + 6);
	    swap(this, i + 2, i + 5);
	    swap(this, i + 3, i + 4);
	  }
	  return this
	};

	Buffer.prototype.toString = function toString () {
	  const length = this.length;
	  if (length === 0) return ''
	  if (arguments.length === 0) return utf8Slice(this, 0, length)
	  return slowToString.apply(this, arguments)
	};

	Buffer.prototype.toLocaleString = Buffer.prototype.toString;

	Buffer.prototype.equals = function equals (b) {
	  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
	  if (this === b) return true
	  return Buffer.compare(this, b) === 0
	};

	Buffer.prototype.inspect = function inspect () {
	  let str = '';
	  const max = exports.INSPECT_MAX_BYTES;
	  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim();
	  if (this.length > max) str += ' ... ';
	  return '<Buffer ' + str + '>'
	};
	if (customInspectSymbol) {
	  Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect;
	}

	Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
	  if (isInstance(target, Uint8Array)) {
	    target = Buffer.from(target, target.offset, target.byteLength);
	  }
	  if (!Buffer.isBuffer(target)) {
	    throw new TypeError(
	      'The "target" argument must be one of type Buffer or Uint8Array. ' +
	      'Received type ' + (typeof target)
	    )
	  }

	  if (start === undefined) {
	    start = 0;
	  }
	  if (end === undefined) {
	    end = target ? target.length : 0;
	  }
	  if (thisStart === undefined) {
	    thisStart = 0;
	  }
	  if (thisEnd === undefined) {
	    thisEnd = this.length;
	  }

	  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
	    throw new RangeError('out of range index')
	  }

	  if (thisStart >= thisEnd && start >= end) {
	    return 0
	  }
	  if (thisStart >= thisEnd) {
	    return -1
	  }
	  if (start >= end) {
	    return 1
	  }

	  start >>>= 0;
	  end >>>= 0;
	  thisStart >>>= 0;
	  thisEnd >>>= 0;

	  if (this === target) return 0

	  let x = thisEnd - thisStart;
	  let y = end - start;
	  const len = Math.min(x, y);

	  const thisCopy = this.slice(thisStart, thisEnd);
	  const targetCopy = target.slice(start, end);

	  for (let i = 0; i < len; ++i) {
	    if (thisCopy[i] !== targetCopy[i]) {
	      x = thisCopy[i];
	      y = targetCopy[i];
	      break
	    }
	  }

	  if (x < y) return -1
	  if (y < x) return 1
	  return 0
	};

	// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
	// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
	//
	// Arguments:
	// - buffer - a Buffer to search
	// - val - a string, Buffer, or number
	// - byteOffset - an index into `buffer`; will be clamped to an int32
	// - encoding - an optional encoding, relevant is val is a string
	// - dir - true for indexOf, false for lastIndexOf
	function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
	  // Empty buffer means no match
	  if (buffer.length === 0) return -1

	  // Normalize byteOffset
	  if (typeof byteOffset === 'string') {
	    encoding = byteOffset;
	    byteOffset = 0;
	  } else if (byteOffset > 0x7fffffff) {
	    byteOffset = 0x7fffffff;
	  } else if (byteOffset < -0x80000000) {
	    byteOffset = -0x80000000;
	  }
	  byteOffset = +byteOffset; // Coerce to Number.
	  if (numberIsNaN(byteOffset)) {
	    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
	    byteOffset = dir ? 0 : (buffer.length - 1);
	  }

	  // Normalize byteOffset: negative offsets start from the end of the buffer
	  if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
	  if (byteOffset >= buffer.length) {
	    if (dir) return -1
	    else byteOffset = buffer.length - 1;
	  } else if (byteOffset < 0) {
	    if (dir) byteOffset = 0;
	    else return -1
	  }

	  // Normalize val
	  if (typeof val === 'string') {
	    val = Buffer.from(val, encoding);
	  }

	  // Finally, search either indexOf (if dir is true) or lastIndexOf
	  if (Buffer.isBuffer(val)) {
	    // Special case: looking for empty string/buffer always fails
	    if (val.length === 0) {
	      return -1
	    }
	    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
	  } else if (typeof val === 'number') {
	    val = val & 0xFF; // Search for a byte value [0-255]
	    if (typeof Uint8Array.prototype.indexOf === 'function') {
	      if (dir) {
	        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
	      } else {
	        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
	      }
	    }
	    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
	  }

	  throw new TypeError('val must be string, number or Buffer')
	}

	function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
	  let indexSize = 1;
	  let arrLength = arr.length;
	  let valLength = val.length;

	  if (encoding !== undefined) {
	    encoding = String(encoding).toLowerCase();
	    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
	        encoding === 'utf16le' || encoding === 'utf-16le') {
	      if (arr.length < 2 || val.length < 2) {
	        return -1
	      }
	      indexSize = 2;
	      arrLength /= 2;
	      valLength /= 2;
	      byteOffset /= 2;
	    }
	  }

	  function read (buf, i) {
	    if (indexSize === 1) {
	      return buf[i]
	    } else {
	      return buf.readUInt16BE(i * indexSize)
	    }
	  }

	  let i;
	  if (dir) {
	    let foundIndex = -1;
	    for (i = byteOffset; i < arrLength; i++) {
	      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
	        if (foundIndex === -1) foundIndex = i;
	        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
	      } else {
	        if (foundIndex !== -1) i -= i - foundIndex;
	        foundIndex = -1;
	      }
	    }
	  } else {
	    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
	    for (i = byteOffset; i >= 0; i--) {
	      let found = true;
	      for (let j = 0; j < valLength; j++) {
	        if (read(arr, i + j) !== read(val, j)) {
	          found = false;
	          break
	        }
	      }
	      if (found) return i
	    }
	  }

	  return -1
	}

	Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
	  return this.indexOf(val, byteOffset, encoding) !== -1
	};

	Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
	  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
	};

	Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
	  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
	};

	function hexWrite (buf, string, offset, length) {
	  offset = Number(offset) || 0;
	  const remaining = buf.length - offset;
	  if (!length) {
	    length = remaining;
	  } else {
	    length = Number(length);
	    if (length > remaining) {
	      length = remaining;
	    }
	  }

	  const strLen = string.length;

	  if (length > strLen / 2) {
	    length = strLen / 2;
	  }
	  let i;
	  for (i = 0; i < length; ++i) {
	    const parsed = parseInt(string.substr(i * 2, 2), 16);
	    if (numberIsNaN(parsed)) return i
	    buf[offset + i] = parsed;
	  }
	  return i
	}

	function utf8Write (buf, string, offset, length) {
	  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
	}

	function asciiWrite (buf, string, offset, length) {
	  return blitBuffer(asciiToBytes(string), buf, offset, length)
	}

	function base64Write (buf, string, offset, length) {
	  return blitBuffer(base64ToBytes(string), buf, offset, length)
	}

	function ucs2Write (buf, string, offset, length) {
	  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
	}

	Buffer.prototype.write = function write (string, offset, length, encoding) {
	  // Buffer#write(string)
	  if (offset === undefined) {
	    encoding = 'utf8';
	    length = this.length;
	    offset = 0;
	  // Buffer#write(string, encoding)
	  } else if (length === undefined && typeof offset === 'string') {
	    encoding = offset;
	    length = this.length;
	    offset = 0;
	  // Buffer#write(string, offset[, length][, encoding])
	  } else if (isFinite(offset)) {
	    offset = offset >>> 0;
	    if (isFinite(length)) {
	      length = length >>> 0;
	      if (encoding === undefined) encoding = 'utf8';
	    } else {
	      encoding = length;
	      length = undefined;
	    }
	  } else {
	    throw new Error(
	      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
	    )
	  }

	  const remaining = this.length - offset;
	  if (length === undefined || length > remaining) length = remaining;

	  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
	    throw new RangeError('Attempt to write outside buffer bounds')
	  }

	  if (!encoding) encoding = 'utf8';

	  let loweredCase = false;
	  for (;;) {
	    switch (encoding) {
	      case 'hex':
	        return hexWrite(this, string, offset, length)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Write(this, string, offset, length)

	      case 'ascii':
	      case 'latin1':
	      case 'binary':
	        return asciiWrite(this, string, offset, length)

	      case 'base64':
	        // Warning: maxLength not taken into account in base64Write
	        return base64Write(this, string, offset, length)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return ucs2Write(this, string, offset, length)

	      default:
	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = ('' + encoding).toLowerCase();
	        loweredCase = true;
	    }
	  }
	};

	Buffer.prototype.toJSON = function toJSON () {
	  return {
	    type: 'Buffer',
	    data: Array.prototype.slice.call(this._arr || this, 0)
	  }
	};

	function base64Slice (buf, start, end) {
	  if (start === 0 && end === buf.length) {
	    return base64.fromByteArray(buf)
	  } else {
	    return base64.fromByteArray(buf.slice(start, end))
	  }
	}

	function utf8Slice (buf, start, end) {
	  end = Math.min(buf.length, end);
	  const res = [];

	  let i = start;
	  while (i < end) {
	    const firstByte = buf[i];
	    let codePoint = null;
	    let bytesPerSequence = (firstByte > 0xEF)
	      ? 4
	      : (firstByte > 0xDF)
	          ? 3
	          : (firstByte > 0xBF)
	              ? 2
	              : 1;

	    if (i + bytesPerSequence <= end) {
	      let secondByte, thirdByte, fourthByte, tempCodePoint;

	      switch (bytesPerSequence) {
	        case 1:
	          if (firstByte < 0x80) {
	            codePoint = firstByte;
	          }
	          break
	        case 2:
	          secondByte = buf[i + 1];
	          if ((secondByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
	            if (tempCodePoint > 0x7F) {
	              codePoint = tempCodePoint;
	            }
	          }
	          break
	        case 3:
	          secondByte = buf[i + 1];
	          thirdByte = buf[i + 2];
	          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
	            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
	              codePoint = tempCodePoint;
	            }
	          }
	          break
	        case 4:
	          secondByte = buf[i + 1];
	          thirdByte = buf[i + 2];
	          fourthByte = buf[i + 3];
	          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
	            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
	              codePoint = tempCodePoint;
	            }
	          }
	      }
	    }

	    if (codePoint === null) {
	      // we did not generate a valid codePoint so insert a
	      // replacement char (U+FFFD) and advance only 1 byte
	      codePoint = 0xFFFD;
	      bytesPerSequence = 1;
	    } else if (codePoint > 0xFFFF) {
	      // encode to utf16 (surrogate pair dance)
	      codePoint -= 0x10000;
	      res.push(codePoint >>> 10 & 0x3FF | 0xD800);
	      codePoint = 0xDC00 | codePoint & 0x3FF;
	    }

	    res.push(codePoint);
	    i += bytesPerSequence;
	  }

	  return decodeCodePointsArray(res)
	}

	// Based on http://stackoverflow.com/a/22747272/680742, the browser with
	// the lowest limit is Chrome, with 0x10000 args.
	// We go 1 magnitude less, for safety
	const MAX_ARGUMENTS_LENGTH = 0x1000;

	function decodeCodePointsArray (codePoints) {
	  const len = codePoints.length;
	  if (len <= MAX_ARGUMENTS_LENGTH) {
	    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
	  }

	  // Decode in chunks to avoid "call stack size exceeded".
	  let res = '';
	  let i = 0;
	  while (i < len) {
	    res += String.fromCharCode.apply(
	      String,
	      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
	    );
	  }
	  return res
	}

	function asciiSlice (buf, start, end) {
	  let ret = '';
	  end = Math.min(buf.length, end);

	  for (let i = start; i < end; ++i) {
	    ret += String.fromCharCode(buf[i] & 0x7F);
	  }
	  return ret
	}

	function latin1Slice (buf, start, end) {
	  let ret = '';
	  end = Math.min(buf.length, end);

	  for (let i = start; i < end; ++i) {
	    ret += String.fromCharCode(buf[i]);
	  }
	  return ret
	}

	function hexSlice (buf, start, end) {
	  const len = buf.length;

	  if (!start || start < 0) start = 0;
	  if (!end || end < 0 || end > len) end = len;

	  let out = '';
	  for (let i = start; i < end; ++i) {
	    out += hexSliceLookupTable[buf[i]];
	  }
	  return out
	}

	function utf16leSlice (buf, start, end) {
	  const bytes = buf.slice(start, end);
	  let res = '';
	  // If bytes.length is odd, the last 8 bits must be ignored (same as node.js)
	  for (let i = 0; i < bytes.length - 1; i += 2) {
	    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256));
	  }
	  return res
	}

	Buffer.prototype.slice = function slice (start, end) {
	  const len = this.length;
	  start = ~~start;
	  end = end === undefined ? len : ~~end;

	  if (start < 0) {
	    start += len;
	    if (start < 0) start = 0;
	  } else if (start > len) {
	    start = len;
	  }

	  if (end < 0) {
	    end += len;
	    if (end < 0) end = 0;
	  } else if (end > len) {
	    end = len;
	  }

	  if (end < start) end = start;

	  const newBuf = this.subarray(start, end);
	  // Return an augmented `Uint8Array` instance
	  Object.setPrototypeOf(newBuf, Buffer.prototype);

	  return newBuf
	};

	/*
	 * Need to make sure that buffer isn't trying to write out of bounds.
	 */
	function checkOffset (offset, ext, length) {
	  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
	  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
	}

	Buffer.prototype.readUintLE =
	Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
	  offset = offset >>> 0;
	  byteLength = byteLength >>> 0;
	  if (!noAssert) checkOffset(offset, byteLength, this.length);

	  let val = this[offset];
	  let mul = 1;
	  let i = 0;
	  while (++i < byteLength && (mul *= 0x100)) {
	    val += this[offset + i] * mul;
	  }

	  return val
	};

	Buffer.prototype.readUintBE =
	Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
	  offset = offset >>> 0;
	  byteLength = byteLength >>> 0;
	  if (!noAssert) {
	    checkOffset(offset, byteLength, this.length);
	  }

	  let val = this[offset + --byteLength];
	  let mul = 1;
	  while (byteLength > 0 && (mul *= 0x100)) {
	    val += this[offset + --byteLength] * mul;
	  }

	  return val
	};

	Buffer.prototype.readUint8 =
	Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 1, this.length);
	  return this[offset]
	};

	Buffer.prototype.readUint16LE =
	Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 2, this.length);
	  return this[offset] | (this[offset + 1] << 8)
	};

	Buffer.prototype.readUint16BE =
	Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 2, this.length);
	  return (this[offset] << 8) | this[offset + 1]
	};

	Buffer.prototype.readUint32LE =
	Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 4, this.length);

	  return ((this[offset]) |
	      (this[offset + 1] << 8) |
	      (this[offset + 2] << 16)) +
	      (this[offset + 3] * 0x1000000)
	};

	Buffer.prototype.readUint32BE =
	Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 4, this.length);

	  return (this[offset] * 0x1000000) +
	    ((this[offset + 1] << 16) |
	    (this[offset + 2] << 8) |
	    this[offset + 3])
	};

	Buffer.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE (offset) {
	  offset = offset >>> 0;
	  validateNumber(offset, 'offset');
	  const first = this[offset];
	  const last = this[offset + 7];
	  if (first === undefined || last === undefined) {
	    boundsError(offset, this.length - 8);
	  }

	  const lo = first +
	    this[++offset] * 2 ** 8 +
	    this[++offset] * 2 ** 16 +
	    this[++offset] * 2 ** 24;

	  const hi = this[++offset] +
	    this[++offset] * 2 ** 8 +
	    this[++offset] * 2 ** 16 +
	    last * 2 ** 24;

	  return BigInt(lo) + (BigInt(hi) << BigInt(32))
	});

	Buffer.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE (offset) {
	  offset = offset >>> 0;
	  validateNumber(offset, 'offset');
	  const first = this[offset];
	  const last = this[offset + 7];
	  if (first === undefined || last === undefined) {
	    boundsError(offset, this.length - 8);
	  }

	  const hi = first * 2 ** 24 +
	    this[++offset] * 2 ** 16 +
	    this[++offset] * 2 ** 8 +
	    this[++offset];

	  const lo = this[++offset] * 2 ** 24 +
	    this[++offset] * 2 ** 16 +
	    this[++offset] * 2 ** 8 +
	    last;

	  return (BigInt(hi) << BigInt(32)) + BigInt(lo)
	});

	Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
	  offset = offset >>> 0;
	  byteLength = byteLength >>> 0;
	  if (!noAssert) checkOffset(offset, byteLength, this.length);

	  let val = this[offset];
	  let mul = 1;
	  let i = 0;
	  while (++i < byteLength && (mul *= 0x100)) {
	    val += this[offset + i] * mul;
	  }
	  mul *= 0x80;

	  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

	  return val
	};

	Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
	  offset = offset >>> 0;
	  byteLength = byteLength >>> 0;
	  if (!noAssert) checkOffset(offset, byteLength, this.length);

	  let i = byteLength;
	  let mul = 1;
	  let val = this[offset + --i];
	  while (i > 0 && (mul *= 0x100)) {
	    val += this[offset + --i] * mul;
	  }
	  mul *= 0x80;

	  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

	  return val
	};

	Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 1, this.length);
	  if (!(this[offset] & 0x80)) return (this[offset])
	  return ((0xff - this[offset] + 1) * -1)
	};

	Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 2, this.length);
	  const val = this[offset] | (this[offset + 1] << 8);
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	};

	Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 2, this.length);
	  const val = this[offset + 1] | (this[offset] << 8);
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	};

	Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 4, this.length);

	  return (this[offset]) |
	    (this[offset + 1] << 8) |
	    (this[offset + 2] << 16) |
	    (this[offset + 3] << 24)
	};

	Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 4, this.length);

	  return (this[offset] << 24) |
	    (this[offset + 1] << 16) |
	    (this[offset + 2] << 8) |
	    (this[offset + 3])
	};

	Buffer.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE (offset) {
	  offset = offset >>> 0;
	  validateNumber(offset, 'offset');
	  const first = this[offset];
	  const last = this[offset + 7];
	  if (first === undefined || last === undefined) {
	    boundsError(offset, this.length - 8);
	  }

	  const val = this[offset + 4] +
	    this[offset + 5] * 2 ** 8 +
	    this[offset + 6] * 2 ** 16 +
	    (last << 24); // Overflow

	  return (BigInt(val) << BigInt(32)) +
	    BigInt(first +
	    this[++offset] * 2 ** 8 +
	    this[++offset] * 2 ** 16 +
	    this[++offset] * 2 ** 24)
	});

	Buffer.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE (offset) {
	  offset = offset >>> 0;
	  validateNumber(offset, 'offset');
	  const first = this[offset];
	  const last = this[offset + 7];
	  if (first === undefined || last === undefined) {
	    boundsError(offset, this.length - 8);
	  }

	  const val = (first << 24) + // Overflow
	    this[++offset] * 2 ** 16 +
	    this[++offset] * 2 ** 8 +
	    this[++offset];

	  return (BigInt(val) << BigInt(32)) +
	    BigInt(this[++offset] * 2 ** 24 +
	    this[++offset] * 2 ** 16 +
	    this[++offset] * 2 ** 8 +
	    last)
	});

	Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 4, this.length);
	  return ieee754$1.read(this, offset, true, 23, 4)
	};

	Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 4, this.length);
	  return ieee754$1.read(this, offset, false, 23, 4)
	};

	Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 8, this.length);
	  return ieee754$1.read(this, offset, true, 52, 8)
	};

	Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 8, this.length);
	  return ieee754$1.read(this, offset, false, 52, 8)
	};

	function checkInt (buf, value, offset, ext, max, min) {
	  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
	  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
	  if (offset + ext > buf.length) throw new RangeError('Index out of range')
	}

	Buffer.prototype.writeUintLE =
	Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  byteLength = byteLength >>> 0;
	  if (!noAssert) {
	    const maxBytes = Math.pow(2, 8 * byteLength) - 1;
	    checkInt(this, value, offset, byteLength, maxBytes, 0);
	  }

	  let mul = 1;
	  let i = 0;
	  this[offset] = value & 0xFF;
	  while (++i < byteLength && (mul *= 0x100)) {
	    this[offset + i] = (value / mul) & 0xFF;
	  }

	  return offset + byteLength
	};

	Buffer.prototype.writeUintBE =
	Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  byteLength = byteLength >>> 0;
	  if (!noAssert) {
	    const maxBytes = Math.pow(2, 8 * byteLength) - 1;
	    checkInt(this, value, offset, byteLength, maxBytes, 0);
	  }

	  let i = byteLength - 1;
	  let mul = 1;
	  this[offset + i] = value & 0xFF;
	  while (--i >= 0 && (mul *= 0x100)) {
	    this[offset + i] = (value / mul) & 0xFF;
	  }

	  return offset + byteLength
	};

	Buffer.prototype.writeUint8 =
	Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
	  this[offset] = (value & 0xff);
	  return offset + 1
	};

	Buffer.prototype.writeUint16LE =
	Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
	  this[offset] = (value & 0xff);
	  this[offset + 1] = (value >>> 8);
	  return offset + 2
	};

	Buffer.prototype.writeUint16BE =
	Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
	  this[offset] = (value >>> 8);
	  this[offset + 1] = (value & 0xff);
	  return offset + 2
	};

	Buffer.prototype.writeUint32LE =
	Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
	  this[offset + 3] = (value >>> 24);
	  this[offset + 2] = (value >>> 16);
	  this[offset + 1] = (value >>> 8);
	  this[offset] = (value & 0xff);
	  return offset + 4
	};

	Buffer.prototype.writeUint32BE =
	Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
	  this[offset] = (value >>> 24);
	  this[offset + 1] = (value >>> 16);
	  this[offset + 2] = (value >>> 8);
	  this[offset + 3] = (value & 0xff);
	  return offset + 4
	};

	function wrtBigUInt64LE (buf, value, offset, min, max) {
	  checkIntBI(value, min, max, buf, offset, 7);

	  let lo = Number(value & BigInt(0xffffffff));
	  buf[offset++] = lo;
	  lo = lo >> 8;
	  buf[offset++] = lo;
	  lo = lo >> 8;
	  buf[offset++] = lo;
	  lo = lo >> 8;
	  buf[offset++] = lo;
	  let hi = Number(value >> BigInt(32) & BigInt(0xffffffff));
	  buf[offset++] = hi;
	  hi = hi >> 8;
	  buf[offset++] = hi;
	  hi = hi >> 8;
	  buf[offset++] = hi;
	  hi = hi >> 8;
	  buf[offset++] = hi;
	  return offset
	}

	function wrtBigUInt64BE (buf, value, offset, min, max) {
	  checkIntBI(value, min, max, buf, offset, 7);

	  let lo = Number(value & BigInt(0xffffffff));
	  buf[offset + 7] = lo;
	  lo = lo >> 8;
	  buf[offset + 6] = lo;
	  lo = lo >> 8;
	  buf[offset + 5] = lo;
	  lo = lo >> 8;
	  buf[offset + 4] = lo;
	  let hi = Number(value >> BigInt(32) & BigInt(0xffffffff));
	  buf[offset + 3] = hi;
	  hi = hi >> 8;
	  buf[offset + 2] = hi;
	  hi = hi >> 8;
	  buf[offset + 1] = hi;
	  hi = hi >> 8;
	  buf[offset] = hi;
	  return offset + 8
	}

	Buffer.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE (value, offset = 0) {
	  return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt('0xffffffffffffffff'))
	});

	Buffer.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE (value, offset = 0) {
	  return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt('0xffffffffffffffff'))
	});

	Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) {
	    const limit = Math.pow(2, (8 * byteLength) - 1);

	    checkInt(this, value, offset, byteLength, limit - 1, -limit);
	  }

	  let i = 0;
	  let mul = 1;
	  let sub = 0;
	  this[offset] = value & 0xFF;
	  while (++i < byteLength && (mul *= 0x100)) {
	    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
	      sub = 1;
	    }
	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
	  }

	  return offset + byteLength
	};

	Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) {
	    const limit = Math.pow(2, (8 * byteLength) - 1);

	    checkInt(this, value, offset, byteLength, limit - 1, -limit);
	  }

	  let i = byteLength - 1;
	  let mul = 1;
	  let sub = 0;
	  this[offset + i] = value & 0xFF;
	  while (--i >= 0 && (mul *= 0x100)) {
	    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
	      sub = 1;
	    }
	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
	  }

	  return offset + byteLength
	};

	Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80);
	  if (value < 0) value = 0xff + value + 1;
	  this[offset] = (value & 0xff);
	  return offset + 1
	};

	Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
	  this[offset] = (value & 0xff);
	  this[offset + 1] = (value >>> 8);
	  return offset + 2
	};

	Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
	  this[offset] = (value >>> 8);
	  this[offset + 1] = (value & 0xff);
	  return offset + 2
	};

	Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
	  this[offset] = (value & 0xff);
	  this[offset + 1] = (value >>> 8);
	  this[offset + 2] = (value >>> 16);
	  this[offset + 3] = (value >>> 24);
	  return offset + 4
	};

	Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
	  if (value < 0) value = 0xffffffff + value + 1;
	  this[offset] = (value >>> 24);
	  this[offset + 1] = (value >>> 16);
	  this[offset + 2] = (value >>> 8);
	  this[offset + 3] = (value & 0xff);
	  return offset + 4
	};

	Buffer.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE (value, offset = 0) {
	  return wrtBigUInt64LE(this, value, offset, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'))
	});

	Buffer.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE (value, offset = 0) {
	  return wrtBigUInt64BE(this, value, offset, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'))
	});

	function checkIEEE754 (buf, value, offset, ext, max, min) {
	  if (offset + ext > buf.length) throw new RangeError('Index out of range')
	  if (offset < 0) throw new RangeError('Index out of range')
	}

	function writeFloat (buf, value, offset, littleEndian, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) {
	    checkIEEE754(buf, value, offset, 4);
	  }
	  ieee754$1.write(buf, value, offset, littleEndian, 23, 4);
	  return offset + 4
	}

	Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
	  return writeFloat(this, value, offset, true, noAssert)
	};

	Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
	  return writeFloat(this, value, offset, false, noAssert)
	};

	function writeDouble (buf, value, offset, littleEndian, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) {
	    checkIEEE754(buf, value, offset, 8);
	  }
	  ieee754$1.write(buf, value, offset, littleEndian, 52, 8);
	  return offset + 8
	}

	Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
	  return writeDouble(this, value, offset, true, noAssert)
	};

	Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
	  return writeDouble(this, value, offset, false, noAssert)
	};

	// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
	Buffer.prototype.copy = function copy (target, targetStart, start, end) {
	  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
	  if (!start) start = 0;
	  if (!end && end !== 0) end = this.length;
	  if (targetStart >= target.length) targetStart = target.length;
	  if (!targetStart) targetStart = 0;
	  if (end > 0 && end < start) end = start;

	  // Copy 0 bytes; we're done
	  if (end === start) return 0
	  if (target.length === 0 || this.length === 0) return 0

	  // Fatal error conditions
	  if (targetStart < 0) {
	    throw new RangeError('targetStart out of bounds')
	  }
	  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
	  if (end < 0) throw new RangeError('sourceEnd out of bounds')

	  // Are we oob?
	  if (end > this.length) end = this.length;
	  if (target.length - targetStart < end - start) {
	    end = target.length - targetStart + start;
	  }

	  const len = end - start;

	  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
	    // Use built-in when available, missing from IE11
	    this.copyWithin(targetStart, start, end);
	  } else {
	    Uint8Array.prototype.set.call(
	      target,
	      this.subarray(start, end),
	      targetStart
	    );
	  }

	  return len
	};

	// Usage:
	//    buffer.fill(number[, offset[, end]])
	//    buffer.fill(buffer[, offset[, end]])
	//    buffer.fill(string[, offset[, end]][, encoding])
	Buffer.prototype.fill = function fill (val, start, end, encoding) {
	  // Handle string cases:
	  if (typeof val === 'string') {
	    if (typeof start === 'string') {
	      encoding = start;
	      start = 0;
	      end = this.length;
	    } else if (typeof end === 'string') {
	      encoding = end;
	      end = this.length;
	    }
	    if (encoding !== undefined && typeof encoding !== 'string') {
	      throw new TypeError('encoding must be a string')
	    }
	    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
	      throw new TypeError('Unknown encoding: ' + encoding)
	    }
	    if (val.length === 1) {
	      const code = val.charCodeAt(0);
	      if ((encoding === 'utf8' && code < 128) ||
	          encoding === 'latin1') {
	        // Fast path: If `val` fits into a single byte, use that numeric value.
	        val = code;
	      }
	    }
	  } else if (typeof val === 'number') {
	    val = val & 255;
	  } else if (typeof val === 'boolean') {
	    val = Number(val);
	  }

	  // Invalid ranges are not set to a default, so can range check early.
	  if (start < 0 || this.length < start || this.length < end) {
	    throw new RangeError('Out of range index')
	  }

	  if (end <= start) {
	    return this
	  }

	  start = start >>> 0;
	  end = end === undefined ? this.length : end >>> 0;

	  if (!val) val = 0;

	  let i;
	  if (typeof val === 'number') {
	    for (i = start; i < end; ++i) {
	      this[i] = val;
	    }
	  } else {
	    const bytes = Buffer.isBuffer(val)
	      ? val
	      : Buffer.from(val, encoding);
	    const len = bytes.length;
	    if (len === 0) {
	      throw new TypeError('The value "' + val +
	        '" is invalid for argument "value"')
	    }
	    for (i = 0; i < end - start; ++i) {
	      this[i + start] = bytes[i % len];
	    }
	  }

	  return this
	};

	// CUSTOM ERRORS
	// =============

	// Simplified versions from Node, changed for Buffer-only usage
	const errors = {};
	function E (sym, getMessage, Base) {
	  errors[sym] = class NodeError extends Base {
	    constructor () {
	      super();

	      Object.defineProperty(this, 'message', {
	        value: getMessage.apply(this, arguments),
	        writable: true,
	        configurable: true
	      });

	      // Add the error code to the name to include it in the stack trace.
	      this.name = `${this.name} [${sym}]`;
	      // Access the stack to generate the error message including the error code
	      // from the name.
	      this.stack; // eslint-disable-line no-unused-expressions
	      // Reset the name to the actual name.
	      delete this.name;
	    }

	    get code () {
	      return sym
	    }

	    set code (value) {
	      Object.defineProperty(this, 'code', {
	        configurable: true,
	        enumerable: true,
	        value,
	        writable: true
	      });
	    }

	    toString () {
	      return `${this.name} [${sym}]: ${this.message}`
	    }
	  };
	}

	E('ERR_BUFFER_OUT_OF_BOUNDS',
	  function (name) {
	    if (name) {
	      return `${name} is outside of buffer bounds`
	    }

	    return 'Attempt to access memory outside buffer bounds'
	  }, RangeError);
	E('ERR_INVALID_ARG_TYPE',
	  function (name, actual) {
	    return `The "${name}" argument must be of type number. Received type ${typeof actual}`
	  }, TypeError);
	E('ERR_OUT_OF_RANGE',
	  function (str, range, input) {
	    let msg = `The value of "${str}" is out of range.`;
	    let received = input;
	    if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
	      received = addNumericalSeparator(String(input));
	    } else if (typeof input === 'bigint') {
	      received = String(input);
	      if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
	        received = addNumericalSeparator(received);
	      }
	      received += 'n';
	    }
	    msg += ` It must be ${range}. Received ${received}`;
	    return msg
	  }, RangeError);

	function addNumericalSeparator (val) {
	  let res = '';
	  let i = val.length;
	  const start = val[0] === '-' ? 1 : 0;
	  for (; i >= start + 4; i -= 3) {
	    res = `_${val.slice(i - 3, i)}${res}`;
	  }
	  return `${val.slice(0, i)}${res}`
	}

	// CHECK FUNCTIONS
	// ===============

	function checkBounds (buf, offset, byteLength) {
	  validateNumber(offset, 'offset');
	  if (buf[offset] === undefined || buf[offset + byteLength] === undefined) {
	    boundsError(offset, buf.length - (byteLength + 1));
	  }
	}

	function checkIntBI (value, min, max, buf, offset, byteLength) {
	  if (value > max || value < min) {
	    const n = typeof min === 'bigint' ? 'n' : '';
	    let range;
	    if (byteLength > 3) {
	      if (min === 0 || min === BigInt(0)) {
	        range = `>= 0${n} and < 2${n} ** ${(byteLength + 1) * 8}${n}`;
	      } else {
	        range = `>= -(2${n} ** ${(byteLength + 1) * 8 - 1}${n}) and < 2 ** ` +
	                `${(byteLength + 1) * 8 - 1}${n}`;
	      }
	    } else {
	      range = `>= ${min}${n} and <= ${max}${n}`;
	    }
	    throw new errors.ERR_OUT_OF_RANGE('value', range, value)
	  }
	  checkBounds(buf, offset, byteLength);
	}

	function validateNumber (value, name) {
	  if (typeof value !== 'number') {
	    throw new errors.ERR_INVALID_ARG_TYPE(name, 'number', value)
	  }
	}

	function boundsError (value, length, type) {
	  if (Math.floor(value) !== value) {
	    validateNumber(value, type);
	    throw new errors.ERR_OUT_OF_RANGE(type || 'offset', 'an integer', value)
	  }

	  if (length < 0) {
	    throw new errors.ERR_BUFFER_OUT_OF_BOUNDS()
	  }

	  throw new errors.ERR_OUT_OF_RANGE(type || 'offset',
	                                    `>= ${type ? 1 : 0} and <= ${length}`,
	                                    value)
	}

	// HELPER FUNCTIONS
	// ================

	const INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;

	function base64clean (str) {
	  // Node takes equal signs as end of the Base64 encoding
	  str = str.split('=')[0];
	  // Node strips out invalid characters like \n and \t from the string, base64-js does not
	  str = str.trim().replace(INVALID_BASE64_RE, '');
	  // Node converts strings with length < 2 to ''
	  if (str.length < 2) return ''
	  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
	  while (str.length % 4 !== 0) {
	    str = str + '=';
	  }
	  return str
	}

	function utf8ToBytes (string, units) {
	  units = units || Infinity;
	  let codePoint;
	  const length = string.length;
	  let leadSurrogate = null;
	  const bytes = [];

	  for (let i = 0; i < length; ++i) {
	    codePoint = string.charCodeAt(i);

	    // is surrogate component
	    if (codePoint > 0xD7FF && codePoint < 0xE000) {
	      // last char was a lead
	      if (!leadSurrogate) {
	        // no lead yet
	        if (codePoint > 0xDBFF) {
	          // unexpected trail
	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
	          continue
	        } else if (i + 1 === length) {
	          // unpaired lead
	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
	          continue
	        }

	        // valid lead
	        leadSurrogate = codePoint;

	        continue
	      }

	      // 2 leads in a row
	      if (codePoint < 0xDC00) {
	        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
	        leadSurrogate = codePoint;
	        continue
	      }

	      // valid surrogate pair
	      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
	    } else if (leadSurrogate) {
	      // valid bmp char, but last char was a lead
	      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
	    }

	    leadSurrogate = null;

	    // encode utf8
	    if (codePoint < 0x80) {
	      if ((units -= 1) < 0) break
	      bytes.push(codePoint);
	    } else if (codePoint < 0x800) {
	      if ((units -= 2) < 0) break
	      bytes.push(
	        codePoint >> 0x6 | 0xC0,
	        codePoint & 0x3F | 0x80
	      );
	    } else if (codePoint < 0x10000) {
	      if ((units -= 3) < 0) break
	      bytes.push(
	        codePoint >> 0xC | 0xE0,
	        codePoint >> 0x6 & 0x3F | 0x80,
	        codePoint & 0x3F | 0x80
	      );
	    } else if (codePoint < 0x110000) {
	      if ((units -= 4) < 0) break
	      bytes.push(
	        codePoint >> 0x12 | 0xF0,
	        codePoint >> 0xC & 0x3F | 0x80,
	        codePoint >> 0x6 & 0x3F | 0x80,
	        codePoint & 0x3F | 0x80
	      );
	    } else {
	      throw new Error('Invalid code point')
	    }
	  }

	  return bytes
	}

	function asciiToBytes (str) {
	  const byteArray = [];
	  for (let i = 0; i < str.length; ++i) {
	    // Node's code seems to be doing this and not & 0x7F..
	    byteArray.push(str.charCodeAt(i) & 0xFF);
	  }
	  return byteArray
	}

	function utf16leToBytes (str, units) {
	  let c, hi, lo;
	  const byteArray = [];
	  for (let i = 0; i < str.length; ++i) {
	    if ((units -= 2) < 0) break

	    c = str.charCodeAt(i);
	    hi = c >> 8;
	    lo = c % 256;
	    byteArray.push(lo);
	    byteArray.push(hi);
	  }

	  return byteArray
	}

	function base64ToBytes (str) {
	  return base64.toByteArray(base64clean(str))
	}

	function blitBuffer (src, dst, offset, length) {
	  let i;
	  for (i = 0; i < length; ++i) {
	    if ((i + offset >= dst.length) || (i >= src.length)) break
	    dst[i + offset] = src[i];
	  }
	  return i
	}

	// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
	// the `instanceof` check but they should be treated as of that type.
	// See: https://github.com/feross/buffer/issues/166
	function isInstance (obj, type) {
	  return obj instanceof type ||
	    (obj != null && obj.constructor != null && obj.constructor.name != null &&
	      obj.constructor.name === type.name)
	}
	function numberIsNaN (obj) {
	  // For IE11 support
	  return obj !== obj // eslint-disable-line no-self-compare
	}

	// Create lookup table for `toString('hex')`
	// See: https://github.com/feross/buffer/issues/219
	const hexSliceLookupTable = (function () {
	  const alphabet = '0123456789abcdef';
	  const table = new Array(256);
	  for (let i = 0; i < 16; ++i) {
	    const i16 = i * 16;
	    for (let j = 0; j < 16; ++j) {
	      table[i16 + j] = alphabet[i] + alphabet[j];
	    }
	  }
	  return table
	})();

	// Return not function with Error if BigInt not supported
	function defineBigIntMethod (fn) {
	  return typeof BigInt === 'undefined' ? BufferBigIntNotDefined : fn
	}

	function BufferBigIntNotDefined () {
	  throw new Error('BigInt not supported')
	}
	}(buffer));

	/*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */

	(function (module, exports) {
	/* eslint-disable node/no-deprecated-api */
	var buffer$1 = buffer;
	var Buffer = buffer$1.Buffer;

	// alternative to using Object.keys for old browsers
	function copyProps (src, dst) {
	  for (var key in src) {
	    dst[key] = src[key];
	  }
	}
	if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
	  module.exports = buffer$1;
	} else {
	  // Copy properties from require('buffer')
	  copyProps(buffer$1, exports);
	  exports.Buffer = SafeBuffer;
	}

	function SafeBuffer (arg, encodingOrOffset, length) {
	  return Buffer(arg, encodingOrOffset, length)
	}

	SafeBuffer.prototype = Object.create(Buffer.prototype);

	// Copy static methods from Buffer
	copyProps(Buffer, SafeBuffer);

	SafeBuffer.from = function (arg, encodingOrOffset, length) {
	  if (typeof arg === 'number') {
	    throw new TypeError('Argument must not be a number')
	  }
	  return Buffer(arg, encodingOrOffset, length)
	};

	SafeBuffer.alloc = function (size, fill, encoding) {
	  if (typeof size !== 'number') {
	    throw new TypeError('Argument must be a number')
	  }
	  var buf = Buffer(size);
	  if (fill !== undefined) {
	    if (typeof encoding === 'string') {
	      buf.fill(fill, encoding);
	    } else {
	      buf.fill(fill);
	    }
	  } else {
	    buf.fill(0);
	  }
	  return buf
	};

	SafeBuffer.allocUnsafe = function (size) {
	  if (typeof size !== 'number') {
	    throw new TypeError('Argument must be a number')
	  }
	  return Buffer(size)
	};

	SafeBuffer.allocUnsafeSlow = function (size) {
	  if (typeof size !== 'number') {
	    throw new TypeError('Argument must be a number')
	  }
	  return buffer$1.SlowBuffer(size)
	};
	}(safeBuffer, safeBuffer.exports));

	// base-x encoding / decoding
	// Copyright (c) 2018 base-x contributors
	// Copyright (c) 2014-2018 The Bitcoin Core developers (base58.cpp)
	// Distributed under the MIT software license, see the accompanying
	// file LICENSE or http://www.opensource.org/licenses/mit-license.php.
	// @ts-ignore
	var _Buffer = safeBuffer.exports.Buffer;
	function base (ALPHABET) {
	  if (ALPHABET.length >= 255) { throw new TypeError('Alphabet too long') }
	  var BASE_MAP = new Uint8Array(256);
	  for (var j = 0; j < BASE_MAP.length; j++) {
	    BASE_MAP[j] = 255;
	  }
	  for (var i = 0; i < ALPHABET.length; i++) {
	    var x = ALPHABET.charAt(i);
	    var xc = x.charCodeAt(0);
	    if (BASE_MAP[xc] !== 255) { throw new TypeError(x + ' is ambiguous') }
	    BASE_MAP[xc] = i;
	  }
	  var BASE = ALPHABET.length;
	  var LEADER = ALPHABET.charAt(0);
	  var FACTOR = Math.log(BASE) / Math.log(256); // log(BASE) / log(256), rounded up
	  var iFACTOR = Math.log(256) / Math.log(BASE); // log(256) / log(BASE), rounded up
	  function encode (source) {
	    if (Array.isArray(source) || source instanceof Uint8Array) { source = _Buffer.from(source); }
	    if (!_Buffer.isBuffer(source)) { throw new TypeError('Expected Buffer') }
	    if (source.length === 0) { return '' }
	        // Skip & count leading zeroes.
	    var zeroes = 0;
	    var length = 0;
	    var pbegin = 0;
	    var pend = source.length;
	    while (pbegin !== pend && source[pbegin] === 0) {
	      pbegin++;
	      zeroes++;
	    }
	        // Allocate enough space in big-endian base58 representation.
	    var size = ((pend - pbegin) * iFACTOR + 1) >>> 0;
	    var b58 = new Uint8Array(size);
	        // Process the bytes.
	    while (pbegin !== pend) {
	      var carry = source[pbegin];
	            // Apply "b58 = b58 * 256 + ch".
	      var i = 0;
	      for (var it1 = size - 1; (carry !== 0 || i < length) && (it1 !== -1); it1--, i++) {
	        carry += (256 * b58[it1]) >>> 0;
	        b58[it1] = (carry % BASE) >>> 0;
	        carry = (carry / BASE) >>> 0;
	      }
	      if (carry !== 0) { throw new Error('Non-zero carry') }
	      length = i;
	      pbegin++;
	    }
	        // Skip leading zeroes in base58 result.
	    var it2 = size - length;
	    while (it2 !== size && b58[it2] === 0) {
	      it2++;
	    }
	        // Translate the result into a string.
	    var str = LEADER.repeat(zeroes);
	    for (; it2 < size; ++it2) { str += ALPHABET.charAt(b58[it2]); }
	    return str
	  }
	  function decodeUnsafe (source) {
	    if (typeof source !== 'string') { throw new TypeError('Expected String') }
	    if (source.length === 0) { return _Buffer.alloc(0) }
	    var psz = 0;
	        // Skip and count leading '1's.
	    var zeroes = 0;
	    var length = 0;
	    while (source[psz] === LEADER) {
	      zeroes++;
	      psz++;
	    }
	        // Allocate enough space in big-endian base256 representation.
	    var size = (((source.length - psz) * FACTOR) + 1) >>> 0; // log(58) / log(256), rounded up.
	    var b256 = new Uint8Array(size);
	        // Process the characters.
	    while (source[psz]) {
	            // Decode character
	      var carry = BASE_MAP[source.charCodeAt(psz)];
	            // Invalid character
	      if (carry === 255) { return }
	      var i = 0;
	      for (var it3 = size - 1; (carry !== 0 || i < length) && (it3 !== -1); it3--, i++) {
	        carry += (BASE * b256[it3]) >>> 0;
	        b256[it3] = (carry % 256) >>> 0;
	        carry = (carry / 256) >>> 0;
	      }
	      if (carry !== 0) { throw new Error('Non-zero carry') }
	      length = i;
	      psz++;
	    }
	        // Skip leading zeroes in b256.
	    var it4 = size - length;
	    while (it4 !== size && b256[it4] === 0) {
	      it4++;
	    }
	    var vch = _Buffer.allocUnsafe(zeroes + (size - it4));
	    vch.fill(0x00, 0, zeroes);
	    var j = zeroes;
	    while (it4 !== size) {
	      vch[j++] = b256[it4++];
	    }
	    return vch
	  }
	  function decode (string) {
	    var buffer = decodeUnsafe(string);
	    if (buffer) { return buffer }
	    throw new Error('Non-base' + BASE + ' character')
	  }
	  return {
	    encode: encode,
	    decodeUnsafe: decodeUnsafe,
	    decode: decode
	  }
	}
	var src = base;

	var basex = src;
	var ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

	var bs58 = basex(ALPHABET);

	var bs58$1 = bs58;

	var encoding_lib = {};

	// This is free and unencumbered software released into the public domain.
	// See LICENSE.md for more information.

	//
	// Utilities
	//

	/**
	 * @param {number} a The number to test.
	 * @param {number} min The minimum value in the range, inclusive.
	 * @param {number} max The maximum value in the range, inclusive.
	 * @return {boolean} True if a >= min and a <= max.
	 */
	function inRange(a, min, max) {
	  return min <= a && a <= max;
	}

	/**
	 * @param {*} o
	 * @return {Object}
	 */
	function ToDictionary(o) {
	  if (o === undefined) return {};
	  if (o === Object(o)) return o;
	  throw TypeError('Could not convert argument to dictionary');
	}

	/**
	 * @param {string} string Input string of UTF-16 code units.
	 * @return {!Array.<number>} Code points.
	 */
	function stringToCodePoints(string) {
	  // https://heycam.github.io/webidl/#dfn-obtain-unicode

	  // 1. Let S be the DOMString value.
	  var s = String(string);

	  // 2. Let n be the length of S.
	  var n = s.length;

	  // 3. Initialize i to 0.
	  var i = 0;

	  // 4. Initialize U to be an empty sequence of Unicode characters.
	  var u = [];

	  // 5. While i < n:
	  while (i < n) {

	    // 1. Let c be the code unit in S at index i.
	    var c = s.charCodeAt(i);

	    // 2. Depending on the value of c:

	    // c < 0xD800 or c > 0xDFFF
	    if (c < 0xD800 || c > 0xDFFF) {
	      // Append to U the Unicode character with code point c.
	      u.push(c);
	    }

	    // 0xDC00 ≤ c ≤ 0xDFFF
	    else if (0xDC00 <= c && c <= 0xDFFF) {
	      // Append to U a U+FFFD REPLACEMENT CHARACTER.
	      u.push(0xFFFD);
	    }

	    // 0xD800 ≤ c ≤ 0xDBFF
	    else if (0xD800 <= c && c <= 0xDBFF) {
	      // 1. If i = n−1, then append to U a U+FFFD REPLACEMENT
	      // CHARACTER.
	      if (i === n - 1) {
	        u.push(0xFFFD);
	      }
	      // 2. Otherwise, i < n−1:
	      else {
	        // 1. Let d be the code unit in S at index i+1.
	        var d = string.charCodeAt(i + 1);

	        // 2. If 0xDC00 ≤ d ≤ 0xDFFF, then:
	        if (0xDC00 <= d && d <= 0xDFFF) {
	          // 1. Let a be c & 0x3FF.
	          var a = c & 0x3FF;

	          // 2. Let b be d & 0x3FF.
	          var b = d & 0x3FF;

	          // 3. Append to U the Unicode character with code point
	          // 2^16+2^10*a+b.
	          u.push(0x10000 + (a << 10) + b);

	          // 4. Set i to i+1.
	          i += 1;
	        }

	        // 3. Otherwise, d < 0xDC00 or d > 0xDFFF. Append to U a
	        // U+FFFD REPLACEMENT CHARACTER.
	        else  {
	          u.push(0xFFFD);
	        }
	      }
	    }

	    // 3. Set i to i+1.
	    i += 1;
	  }

	  // 6. Return U.
	  return u;
	}

	/**
	 * @param {!Array.<number>} code_points Array of code points.
	 * @return {string} string String of UTF-16 code units.
	 */
	function codePointsToString(code_points) {
	  var s = '';
	  for (var i = 0; i < code_points.length; ++i) {
	    var cp = code_points[i];
	    if (cp <= 0xFFFF) {
	      s += String.fromCharCode(cp);
	    } else {
	      cp -= 0x10000;
	      s += String.fromCharCode((cp >> 10) + 0xD800,
	                               (cp & 0x3FF) + 0xDC00);
	    }
	  }
	  return s;
	}


	//
	// Implementation of Encoding specification
	// https://encoding.spec.whatwg.org/
	//

	//
	// 3. Terminology
	//

	/**
	 * End-of-stream is a special token that signifies no more tokens
	 * are in the stream.
	 * @const
	 */ var end_of_stream = -1;

	/**
	 * A stream represents an ordered sequence of tokens.
	 *
	 * @constructor
	 * @param {!(Array.<number>|Uint8Array)} tokens Array of tokens that provide the
	 * stream.
	 */
	function Stream(tokens) {
	  /** @type {!Array.<number>} */
	  this.tokens = [].slice.call(tokens);
	}

	Stream.prototype = {
	  /**
	   * @return {boolean} True if end-of-stream has been hit.
	   */
	  endOfStream: function() {
	    return !this.tokens.length;
	  },

	  /**
	   * When a token is read from a stream, the first token in the
	   * stream must be returned and subsequently removed, and
	   * end-of-stream must be returned otherwise.
	   *
	   * @return {number} Get the next token from the stream, or
	   * end_of_stream.
	   */
	   read: function() {
	    if (!this.tokens.length)
	      return end_of_stream;
	     return this.tokens.shift();
	   },

	  /**
	   * When one or more tokens are prepended to a stream, those tokens
	   * must be inserted, in given order, before the first token in the
	   * stream.
	   *
	   * @param {(number|!Array.<number>)} token The token(s) to prepend to the stream.
	   */
	  prepend: function(token) {
	    if (Array.isArray(token)) {
	      var tokens = /**@type {!Array.<number>}*/(token);
	      while (tokens.length)
	        this.tokens.unshift(tokens.pop());
	    } else {
	      this.tokens.unshift(token);
	    }
	  },

	  /**
	   * When one or more tokens are pushed to a stream, those tokens
	   * must be inserted, in given order, after the last token in the
	   * stream.
	   *
	   * @param {(number|!Array.<number>)} token The tokens(s) to prepend to the stream.
	   */
	  push: function(token) {
	    if (Array.isArray(token)) {
	      var tokens = /**@type {!Array.<number>}*/(token);
	      while (tokens.length)
	        this.tokens.push(tokens.shift());
	    } else {
	      this.tokens.push(token);
	    }
	  }
	};

	//
	// 4. Encodings
	//

	// 4.1 Encoders and decoders

	/** @const */
	var finished = -1;

	/**
	 * @param {boolean} fatal If true, decoding errors raise an exception.
	 * @param {number=} opt_code_point Override the standard fallback code point.
	 * @return {number} The code point to insert on a decoding error.
	 */
	function decoderError(fatal, opt_code_point) {
	  if (fatal)
	    throw TypeError('Decoder error');
	  return opt_code_point || 0xFFFD;
	}

	//
	// 7. API
	//

	/** @const */ var DEFAULT_ENCODING = 'utf-8';

	// 7.1 Interface TextDecoder

	/**
	 * @constructor
	 * @param {string=} encoding The label of the encoding;
	 *     defaults to 'utf-8'.
	 * @param {Object=} options
	 */
	function TextDecoder$2(encoding, options) {
	  if (!(this instanceof TextDecoder$2)) {
	    return new TextDecoder$2(encoding, options);
	  }
	  encoding = encoding !== undefined ? String(encoding).toLowerCase() : DEFAULT_ENCODING;
	  if (encoding !== DEFAULT_ENCODING) {
	    throw new Error('Encoding not supported. Only utf-8 is supported');
	  }
	  options = ToDictionary(options);

	  /** @private @type {boolean} */
	  this._streaming = false;
	  /** @private @type {boolean} */
	  this._BOMseen = false;
	  /** @private @type {?Decoder} */
	  this._decoder = null;
	  /** @private @type {boolean} */
	  this._fatal = Boolean(options['fatal']);
	  /** @private @type {boolean} */
	  this._ignoreBOM = Boolean(options['ignoreBOM']);

	  Object.defineProperty(this, 'encoding', {value: 'utf-8'});
	  Object.defineProperty(this, 'fatal', {value: this._fatal});
	  Object.defineProperty(this, 'ignoreBOM', {value: this._ignoreBOM});
	}

	TextDecoder$2.prototype = {
	  /**
	   * @param {ArrayBufferView=} input The buffer of bytes to decode.
	   * @param {Object=} options
	   * @return {string} The decoded string.
	   */
	  decode: function decode(input, options) {
	    var bytes;
	    if (typeof input === 'object' && input instanceof ArrayBuffer) {
	      bytes = new Uint8Array(input);
	    } else if (typeof input === 'object' && 'buffer' in input &&
	               input.buffer instanceof ArrayBuffer) {
	      bytes = new Uint8Array(input.buffer,
	                             input.byteOffset,
	                             input.byteLength);
	    } else {
	      bytes = new Uint8Array(0);
	    }

	    options = ToDictionary(options);

	    if (!this._streaming) {
	      this._decoder = new UTF8Decoder({fatal: this._fatal});
	      this._BOMseen = false;
	    }
	    this._streaming = Boolean(options['stream']);

	    var input_stream = new Stream(bytes);

	    var code_points = [];

	    /** @type {?(number|!Array.<number>)} */
	    var result;

	    while (!input_stream.endOfStream()) {
	      result = this._decoder.handler(input_stream, input_stream.read());
	      if (result === finished)
	        break;
	      if (result === null)
	        continue;
	      if (Array.isArray(result))
	        code_points.push.apply(code_points, /**@type {!Array.<number>}*/(result));
	      else
	        code_points.push(result);
	    }
	    if (!this._streaming) {
	      do {
	        result = this._decoder.handler(input_stream, input_stream.read());
	        if (result === finished)
	          break;
	        if (result === null)
	          continue;
	        if (Array.isArray(result))
	          code_points.push.apply(code_points, /**@type {!Array.<number>}*/(result));
	        else
	          code_points.push(result);
	      } while (!input_stream.endOfStream());
	      this._decoder = null;
	    }

	    if (code_points.length) {
	      // If encoding is one of utf-8, utf-16be, and utf-16le, and
	      // ignore BOM flag and BOM seen flag are unset, run these
	      // subsubsteps:
	      if (['utf-8'].indexOf(this.encoding) !== -1 &&
	          !this._ignoreBOM && !this._BOMseen) {
	        // If token is U+FEFF, set BOM seen flag.
	        if (code_points[0] === 0xFEFF) {
	          this._BOMseen = true;
	          code_points.shift();
	        } else {
	          // Otherwise, if token is not end-of-stream, set BOM seen
	          // flag and append token to output.
	          this._BOMseen = true;
	        }
	      }
	    }

	    return codePointsToString(code_points);
	  }
	};

	// 7.2 Interface TextEncoder

	/**
	 * @constructor
	 * @param {string=} encoding The label of the encoding;
	 *     defaults to 'utf-8'.
	 * @param {Object=} options
	 */
	function TextEncoder$1(encoding, options) {
	  if (!(this instanceof TextEncoder$1))
	    return new TextEncoder$1(encoding, options);
	  encoding = encoding !== undefined ? String(encoding).toLowerCase() : DEFAULT_ENCODING;
	  if (encoding !== DEFAULT_ENCODING) {
	    throw new Error('Encoding not supported. Only utf-8 is supported');
	  }
	  options = ToDictionary(options);

	  /** @private @type {boolean} */
	  this._streaming = false;
	  /** @private @type {?Encoder} */
	  this._encoder = null;
	  /** @private @type {{fatal: boolean}} */
	  this._options = {fatal: Boolean(options['fatal'])};

	  Object.defineProperty(this, 'encoding', {value: 'utf-8'});
	}

	TextEncoder$1.prototype = {
	  /**
	   * @param {string=} opt_string The string to encode.
	   * @param {Object=} options
	   * @return {Uint8Array} Encoded bytes, as a Uint8Array.
	   */
	  encode: function encode(opt_string, options) {
	    opt_string = opt_string ? String(opt_string) : '';
	    options = ToDictionary(options);

	    // NOTE: This option is nonstandard. None of the encodings
	    // permitted for encoding (i.e. UTF-8, UTF-16) are stateful,
	    // so streaming is not necessary.
	    if (!this._streaming)
	      this._encoder = new UTF8Encoder(this._options);
	    this._streaming = Boolean(options['stream']);

	    var bytes = [];
	    var input_stream = new Stream(stringToCodePoints(opt_string));
	    /** @type {?(number|!Array.<number>)} */
	    var result;
	    while (!input_stream.endOfStream()) {
	      result = this._encoder.handler(input_stream, input_stream.read());
	      if (result === finished)
	        break;
	      if (Array.isArray(result))
	        bytes.push.apply(bytes, /**@type {!Array.<number>}*/(result));
	      else
	        bytes.push(result);
	    }
	    if (!this._streaming) {
	      while (true) {
	        result = this._encoder.handler(input_stream, input_stream.read());
	        if (result === finished)
	          break;
	        if (Array.isArray(result))
	          bytes.push.apply(bytes, /**@type {!Array.<number>}*/(result));
	        else
	          bytes.push(result);
	      }
	      this._encoder = null;
	    }
	    return new Uint8Array(bytes);
	  }
	};

	//
	// 8. The encoding
	//

	// 8.1 utf-8

	/**
	 * @constructor
	 * @implements {Decoder}
	 * @param {{fatal: boolean}} options
	 */
	function UTF8Decoder(options) {
	  var fatal = options.fatal;

	  // utf-8's decoder's has an associated utf-8 code point, utf-8
	  // bytes seen, and utf-8 bytes needed (all initially 0), a utf-8
	  // lower boundary (initially 0x80), and a utf-8 upper boundary
	  // (initially 0xBF).
	  var /** @type {number} */ utf8_code_point = 0,
	      /** @type {number} */ utf8_bytes_seen = 0,
	      /** @type {number} */ utf8_bytes_needed = 0,
	      /** @type {number} */ utf8_lower_boundary = 0x80,
	      /** @type {number} */ utf8_upper_boundary = 0xBF;

	  /**
	   * @param {Stream} stream The stream of bytes being decoded.
	   * @param {number} bite The next byte read from the stream.
	   * @return {?(number|!Array.<number>)} The next code point(s)
	   *     decoded, or null if not enough data exists in the input
	   *     stream to decode a complete code point.
	   */
	  this.handler = function(stream, bite) {
	    // 1. If byte is end-of-stream and utf-8 bytes needed is not 0,
	    // set utf-8 bytes needed to 0 and return error.
	    if (bite === end_of_stream && utf8_bytes_needed !== 0) {
	      utf8_bytes_needed = 0;
	      return decoderError(fatal);
	    }

	    // 2. If byte is end-of-stream, return finished.
	    if (bite === end_of_stream)
	      return finished;

	    // 3. If utf-8 bytes needed is 0, based on byte:
	    if (utf8_bytes_needed === 0) {

	      // 0x00 to 0x7F
	      if (inRange(bite, 0x00, 0x7F)) {
	        // Return a code point whose value is byte.
	        return bite;
	      }

	      // 0xC2 to 0xDF
	      if (inRange(bite, 0xC2, 0xDF)) {
	        // Set utf-8 bytes needed to 1 and utf-8 code point to byte
	        // − 0xC0.
	        utf8_bytes_needed = 1;
	        utf8_code_point = bite - 0xC0;
	      }

	      // 0xE0 to 0xEF
	      else if (inRange(bite, 0xE0, 0xEF)) {
	        // 1. If byte is 0xE0, set utf-8 lower boundary to 0xA0.
	        if (bite === 0xE0)
	          utf8_lower_boundary = 0xA0;
	        // 2. If byte is 0xED, set utf-8 upper boundary to 0x9F.
	        if (bite === 0xED)
	          utf8_upper_boundary = 0x9F;
	        // 3. Set utf-8 bytes needed to 2 and utf-8 code point to
	        // byte − 0xE0.
	        utf8_bytes_needed = 2;
	        utf8_code_point = bite - 0xE0;
	      }

	      // 0xF0 to 0xF4
	      else if (inRange(bite, 0xF0, 0xF4)) {
	        // 1. If byte is 0xF0, set utf-8 lower boundary to 0x90.
	        if (bite === 0xF0)
	          utf8_lower_boundary = 0x90;
	        // 2. If byte is 0xF4, set utf-8 upper boundary to 0x8F.
	        if (bite === 0xF4)
	          utf8_upper_boundary = 0x8F;
	        // 3. Set utf-8 bytes needed to 3 and utf-8 code point to
	        // byte − 0xF0.
	        utf8_bytes_needed = 3;
	        utf8_code_point = bite - 0xF0;
	      }

	      // Otherwise
	      else {
	        // Return error.
	        return decoderError(fatal);
	      }

	      // Then (byte is in the range 0xC2 to 0xF4) set utf-8 code
	      // point to utf-8 code point << (6 × utf-8 bytes needed) and
	      // return continue.
	      utf8_code_point = utf8_code_point << (6 * utf8_bytes_needed);
	      return null;
	    }

	    // 4. If byte is not in the range utf-8 lower boundary to utf-8
	    // upper boundary, run these substeps:
	    if (!inRange(bite, utf8_lower_boundary, utf8_upper_boundary)) {

	      // 1. Set utf-8 code point, utf-8 bytes needed, and utf-8
	      // bytes seen to 0, set utf-8 lower boundary to 0x80, and set
	      // utf-8 upper boundary to 0xBF.
	      utf8_code_point = utf8_bytes_needed = utf8_bytes_seen = 0;
	      utf8_lower_boundary = 0x80;
	      utf8_upper_boundary = 0xBF;

	      // 2. Prepend byte to stream.
	      stream.prepend(bite);

	      // 3. Return error.
	      return decoderError(fatal);
	    }

	    // 5. Set utf-8 lower boundary to 0x80 and utf-8 upper boundary
	    // to 0xBF.
	    utf8_lower_boundary = 0x80;
	    utf8_upper_boundary = 0xBF;

	    // 6. Increase utf-8 bytes seen by one and set utf-8 code point
	    // to utf-8 code point + (byte − 0x80) << (6 × (utf-8 bytes
	    // needed − utf-8 bytes seen)).
	    utf8_bytes_seen += 1;
	    utf8_code_point += (bite - 0x80) << (6 * (utf8_bytes_needed - utf8_bytes_seen));

	    // 7. If utf-8 bytes seen is not equal to utf-8 bytes needed,
	    // continue.
	    if (utf8_bytes_seen !== utf8_bytes_needed)
	      return null;

	    // 8. Let code point be utf-8 code point.
	    var code_point = utf8_code_point;

	    // 9. Set utf-8 code point, utf-8 bytes needed, and utf-8 bytes
	    // seen to 0.
	    utf8_code_point = utf8_bytes_needed = utf8_bytes_seen = 0;

	    // 10. Return a code point whose value is code point.
	    return code_point;
	  };
	}

	/**
	 * @constructor
	 * @implements {Encoder}
	 * @param {{fatal: boolean}} options
	 */
	function UTF8Encoder(options) {
	  options.fatal;
	  /**
	   * @param {Stream} stream Input stream.
	   * @param {number} code_point Next code point read from the stream.
	   * @return {(number|!Array.<number>)} Byte(s) to emit.
	   */
	  this.handler = function(stream, code_point) {
	    // 1. If code point is end-of-stream, return finished.
	    if (code_point === end_of_stream)
	      return finished;

	    // 2. If code point is in the range U+0000 to U+007F, return a
	    // byte whose value is code point.
	    if (inRange(code_point, 0x0000, 0x007f))
	      return code_point;

	    // 3. Set count and offset based on the range code point is in:
	    var count, offset;
	    // U+0080 to U+07FF:    1 and 0xC0
	    if (inRange(code_point, 0x0080, 0x07FF)) {
	      count = 1;
	      offset = 0xC0;
	    }
	    // U+0800 to U+FFFF:    2 and 0xE0
	    else if (inRange(code_point, 0x0800, 0xFFFF)) {
	      count = 2;
	      offset = 0xE0;
	    }
	    // U+10000 to U+10FFFF: 3 and 0xF0
	    else if (inRange(code_point, 0x10000, 0x10FFFF)) {
	      count = 3;
	      offset = 0xF0;
	    }

	    // 4.Let bytes be a byte sequence whose first byte is (code
	    // point >> (6 × count)) + offset.
	    var bytes = [(code_point >> (6 * count)) + offset];

	    // 5. Run these substeps while count is greater than 0:
	    while (count > 0) {

	      // 1. Set temp to code point >> (6 × (count − 1)).
	      var temp = code_point >> (6 * (count - 1));

	      // 2. Append to bytes 0x80 | (temp & 0x3F).
	      bytes.push(0x80 | (temp & 0x3F));

	      // 3. Decrease count by one.
	      count -= 1;
	    }

	    // 6. Return bytes bytes, in order.
	    return bytes;
	  };
	}

	encoding_lib.TextEncoder = TextEncoder$1;
	encoding_lib.TextDecoder = TextDecoder$2;

	var __createBinding$1 = (commonjsGlobal$1 && commonjsGlobal$1.__createBinding) || (Object.create ? (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
	}) : (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    o[k2] = m[k];
	}));
	var __setModuleDefault$1 = (commonjsGlobal$1 && commonjsGlobal$1.__setModuleDefault) || (Object.create ? (function(o, v) {
	    Object.defineProperty(o, "default", { enumerable: true, value: v });
	}) : function(o, v) {
	    o["default"] = v;
	});
	var __decorate$1 = (commonjsGlobal$1 && commonjsGlobal$1.__decorate) || function (decorators, target, key, desc) {
	    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
	    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
	    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
	    return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
	var __importStar$1 = (commonjsGlobal$1 && commonjsGlobal$1.__importStar) || function (mod) {
	    if (mod && mod.__esModule) return mod;
	    var result = {};
	    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding$1(result, mod, k);
	    __setModuleDefault$1(result, mod);
	    return result;
	};
	var __importDefault$1 = (commonjsGlobal$1 && commonjsGlobal$1.__importDefault) || function (mod) {
	    return (mod && mod.__esModule) ? mod : { "default": mod };
	};
	Object.defineProperty(lib$1, "__esModule", { value: true });
	lib$1.deserializeUnchecked = lib$1.deserialize = lib$1.serialize = BinaryReader_1 = lib$1.BinaryReader = BinaryWriter_1 = lib$1.BinaryWriter = lib$1.BorshError = lib$1.baseDecode = lib$1.baseEncode = void 0;
	const bn_js_1$1 = __importDefault$1(bn.exports);
	const bs58_1$1 = __importDefault$1(bs58);
	// TODO: Make sure this polyfill not included when not required
	const encoding$1 = __importStar$1(encoding_lib);
	const TextDecoder$1 = (typeof commonjsGlobal$1.TextDecoder !== 'function') ? encoding$1.TextDecoder : commonjsGlobal$1.TextDecoder;
	const textDecoder$1 = new TextDecoder$1('utf-8', { fatal: true });
	function baseEncode$1(value) {
	    if (typeof (value) === 'string') {
	        value = Buffer.from(value, 'utf8');
	    }
	    return bs58_1$1.default.encode(Buffer.from(value));
	}
	lib$1.baseEncode = baseEncode$1;
	function baseDecode$1(value) {
	    return Buffer.from(bs58_1$1.default.decode(value));
	}
	lib$1.baseDecode = baseDecode$1;
	const INITIAL_LENGTH$1 = 1024;
	class BorshError$1 extends Error {
	    constructor(message) {
	        super(message);
	        this.fieldPath = [];
	        this.originalMessage = message;
	    }
	    addToFieldPath(fieldName) {
	        this.fieldPath.splice(0, 0, fieldName);
	        // NOTE: Modifying message directly as jest doesn't use .toString()
	        this.message = this.originalMessage + ': ' + this.fieldPath.join('.');
	    }
	}
	lib$1.BorshError = BorshError$1;
	/// Binary encoder.
	class BinaryWriter$1 {
	    constructor() {
	        this.buf = Buffer.alloc(INITIAL_LENGTH$1);
	        this.length = 0;
	    }
	    maybeResize() {
	        if (this.buf.length < 16 + this.length) {
	            this.buf = Buffer.concat([this.buf, Buffer.alloc(INITIAL_LENGTH$1)]);
	        }
	    }
	    writeU8(value) {
	        this.maybeResize();
	        this.buf.writeUInt8(value, this.length);
	        this.length += 1;
	    }
	    writeU16(value) {
	        this.maybeResize();
	        this.buf.writeUInt16LE(value, this.length);
	        this.length += 2;
	    }
	    writeU32(value) {
	        this.maybeResize();
	        this.buf.writeUInt32LE(value, this.length);
	        this.length += 4;
	    }
	    writeU64(value) {
	        this.maybeResize();
	        this.writeBuffer(Buffer.from(new bn_js_1$1.default(value).toArray('le', 8)));
	    }
	    writeU128(value) {
	        this.maybeResize();
	        this.writeBuffer(Buffer.from(new bn_js_1$1.default(value).toArray('le', 16)));
	    }
	    writeU256(value) {
	        this.maybeResize();
	        this.writeBuffer(Buffer.from(new bn_js_1$1.default(value).toArray('le', 32)));
	    }
	    writeU512(value) {
	        this.maybeResize();
	        this.writeBuffer(Buffer.from(new bn_js_1$1.default(value).toArray('le', 64)));
	    }
	    writeBuffer(buffer) {
	        // Buffer.from is needed as this.buf.subarray can return plain Uint8Array in browser
	        this.buf = Buffer.concat([Buffer.from(this.buf.subarray(0, this.length)), buffer, Buffer.alloc(INITIAL_LENGTH$1)]);
	        this.length += buffer.length;
	    }
	    writeString(str) {
	        this.maybeResize();
	        const b = Buffer.from(str, 'utf8');
	        this.writeU32(b.length);
	        this.writeBuffer(b);
	    }
	    writeFixedArray(array) {
	        this.writeBuffer(Buffer.from(array));
	    }
	    writeArray(array, fn) {
	        this.maybeResize();
	        this.writeU32(array.length);
	        for (const elem of array) {
	            this.maybeResize();
	            fn(elem);
	        }
	    }
	    toArray() {
	        return this.buf.subarray(0, this.length);
	    }
	}
	var BinaryWriter_1 = lib$1.BinaryWriter = BinaryWriter$1;
	function handlingRangeError$1(target, propertyKey, propertyDescriptor) {
	    const originalMethod = propertyDescriptor.value;
	    propertyDescriptor.value = function (...args) {
	        try {
	            return originalMethod.apply(this, args);
	        }
	        catch (e) {
	            if (e instanceof RangeError) {
	                const code = e.code;
	                if (['ERR_BUFFER_OUT_OF_BOUNDS', 'ERR_OUT_OF_RANGE'].indexOf(code) >= 0) {
	                    throw new BorshError$1('Reached the end of buffer when deserializing');
	                }
	            }
	            throw e;
	        }
	    };
	}
	class BinaryReader$1 {
	    constructor(buf) {
	        this.buf = buf;
	        this.offset = 0;
	    }
	    readU8() {
	        const value = this.buf.readUInt8(this.offset);
	        this.offset += 1;
	        return value;
	    }
	    readU16() {
	        const value = this.buf.readUInt16LE(this.offset);
	        this.offset += 2;
	        return value;
	    }
	    readU32() {
	        const value = this.buf.readUInt32LE(this.offset);
	        this.offset += 4;
	        return value;
	    }
	    readU64() {
	        const buf = this.readBuffer(8);
	        return new bn_js_1$1.default(buf, 'le');
	    }
	    readU128() {
	        const buf = this.readBuffer(16);
	        return new bn_js_1$1.default(buf, 'le');
	    }
	    readU256() {
	        const buf = this.readBuffer(32);
	        return new bn_js_1$1.default(buf, 'le');
	    }
	    readU512() {
	        const buf = this.readBuffer(64);
	        return new bn_js_1$1.default(buf, 'le');
	    }
	    readBuffer(len) {
	        if ((this.offset + len) > this.buf.length) {
	            throw new BorshError$1(`Expected buffer length ${len} isn't within bounds`);
	        }
	        const result = this.buf.slice(this.offset, this.offset + len);
	        this.offset += len;
	        return result;
	    }
	    readString() {
	        const len = this.readU32();
	        const buf = this.readBuffer(len);
	        try {
	            // NOTE: Using TextDecoder to fail on invalid UTF-8
	            return textDecoder$1.decode(buf);
	        }
	        catch (e) {
	            throw new BorshError$1(`Error decoding UTF-8 string: ${e}`);
	        }
	    }
	    readFixedArray(len) {
	        return new Uint8Array(this.readBuffer(len));
	    }
	    readArray(fn) {
	        const len = this.readU32();
	        const result = Array();
	        for (let i = 0; i < len; ++i) {
	            result.push(fn());
	        }
	        return result;
	    }
	}
	__decorate$1([
	    handlingRangeError$1
	], BinaryReader$1.prototype, "readU8", null);
	__decorate$1([
	    handlingRangeError$1
	], BinaryReader$1.prototype, "readU16", null);
	__decorate$1([
	    handlingRangeError$1
	], BinaryReader$1.prototype, "readU32", null);
	__decorate$1([
	    handlingRangeError$1
	], BinaryReader$1.prototype, "readU64", null);
	__decorate$1([
	    handlingRangeError$1
	], BinaryReader$1.prototype, "readU128", null);
	__decorate$1([
	    handlingRangeError$1
	], BinaryReader$1.prototype, "readU256", null);
	__decorate$1([
	    handlingRangeError$1
	], BinaryReader$1.prototype, "readU512", null);
	__decorate$1([
	    handlingRangeError$1
	], BinaryReader$1.prototype, "readString", null);
	__decorate$1([
	    handlingRangeError$1
	], BinaryReader$1.prototype, "readFixedArray", null);
	__decorate$1([
	    handlingRangeError$1
	], BinaryReader$1.prototype, "readArray", null);
	var BinaryReader_1 = lib$1.BinaryReader = BinaryReader$1;
	function capitalizeFirstLetter$1(string) {
	    return string.charAt(0).toUpperCase() + string.slice(1);
	}
	function serializeField$1(schema, fieldName, value, fieldType, writer) {
	    try {
	        // TODO: Handle missing values properly (make sure they never result in just skipped write)
	        if (typeof fieldType === 'string') {
	            writer[`write${capitalizeFirstLetter$1(fieldType)}`](value);
	        }
	        else if (fieldType instanceof Array) {
	            if (typeof fieldType[0] === 'number') {
	                if (value.length !== fieldType[0]) {
	                    throw new BorshError$1(`Expecting byte array of length ${fieldType[0]}, but got ${value.length} bytes`);
	                }
	                writer.writeFixedArray(value);
	            }
	            else if (fieldType.length === 2 && typeof fieldType[1] === 'number') {
	                if (value.length !== fieldType[1]) {
	                    throw new BorshError$1(`Expecting byte array of length ${fieldType[1]}, but got ${value.length} bytes`);
	                }
	                for (let i = 0; i < fieldType[1]; i++) {
	                    serializeField$1(schema, null, value[i], fieldType[0], writer);
	                }
	            }
	            else {
	                writer.writeArray(value, (item) => { serializeField$1(schema, fieldName, item, fieldType[0], writer); });
	            }
	        }
	        else if (fieldType.kind !== undefined) {
	            switch (fieldType.kind) {
	                case 'option': {
	                    if (value === null || value === undefined) {
	                        writer.writeU8(0);
	                    }
	                    else {
	                        writer.writeU8(1);
	                        serializeField$1(schema, fieldName, value, fieldType.type, writer);
	                    }
	                    break;
	                }
	                default: throw new BorshError$1(`FieldType ${fieldType} unrecognized`);
	            }
	        }
	        else {
	            serializeStruct$1(schema, value, writer);
	        }
	    }
	    catch (error) {
	        if (error instanceof BorshError$1) {
	            error.addToFieldPath(fieldName);
	        }
	        throw error;
	    }
	}
	function serializeStruct$1(schema, obj, writer) {
	    if (typeof obj.borshSerialize === 'function') {
	        obj.borshSerialize(writer);
	        return;
	    }
	    const structSchema = schema.get(obj.constructor);
	    if (!structSchema) {
	        throw new BorshError$1(`Class ${obj.constructor.name} is missing in schema`);
	    }
	    if (structSchema.kind === 'struct') {
	        structSchema.fields.map(([fieldName, fieldType]) => {
	            serializeField$1(schema, fieldName, obj[fieldName], fieldType, writer);
	        });
	    }
	    else if (structSchema.kind === 'enum') {
	        const name = obj[structSchema.field];
	        for (let idx = 0; idx < structSchema.values.length; ++idx) {
	            const [fieldName, fieldType] = structSchema.values[idx];
	            if (fieldName === name) {
	                writer.writeU8(idx);
	                serializeField$1(schema, fieldName, obj[fieldName], fieldType, writer);
	                break;
	            }
	        }
	    }
	    else {
	        throw new BorshError$1(`Unexpected schema kind: ${structSchema.kind} for ${obj.constructor.name}`);
	    }
	}
	/// Serialize given object using schema of the form:
	/// { class_name -> [ [field_name, field_type], .. ], .. }
	function serialize$1(schema, obj, Writer = BinaryWriter$1) {
	    const writer = new Writer();
	    serializeStruct$1(schema, obj, writer);
	    return writer.toArray();
	}
	lib$1.serialize = serialize$1;
	function deserializeField$1(schema, fieldName, fieldType, reader) {
	    try {
	        if (typeof fieldType === 'string') {
	            return reader[`read${capitalizeFirstLetter$1(fieldType)}`]();
	        }
	        if (fieldType instanceof Array) {
	            if (typeof fieldType[0] === 'number') {
	                return reader.readFixedArray(fieldType[0]);
	            }
	            else if (typeof fieldType[1] === 'number') {
	                const arr = [];
	                for (let i = 0; i < fieldType[1]; i++) {
	                    arr.push(deserializeField$1(schema, null, fieldType[0], reader));
	                }
	                return arr;
	            }
	            else {
	                return reader.readArray(() => deserializeField$1(schema, fieldName, fieldType[0], reader));
	            }
	        }
	        if (fieldType.kind === 'option') {
	            const option = reader.readU8();
	            if (option) {
	                return deserializeField$1(schema, fieldName, fieldType.type, reader);
	            }
	            return undefined;
	        }
	        return deserializeStruct$1(schema, fieldType, reader);
	    }
	    catch (error) {
	        if (error instanceof BorshError$1) {
	            error.addToFieldPath(fieldName);
	        }
	        throw error;
	    }
	}
	function deserializeStruct$1(schema, classType, reader) {
	    if (typeof classType.borshDeserialize === 'function') {
	        return classType.borshDeserialize(reader);
	    }
	    const structSchema = schema.get(classType);
	    if (!structSchema) {
	        throw new BorshError$1(`Class ${classType.name} is missing in schema`);
	    }
	    if (structSchema.kind === 'struct') {
	        const result = {};
	        for (const [fieldName, fieldType] of schema.get(classType).fields) {
	            result[fieldName] = deserializeField$1(schema, fieldName, fieldType, reader);
	        }
	        return new classType(result);
	    }
	    if (structSchema.kind === 'enum') {
	        const idx = reader.readU8();
	        if (idx >= structSchema.values.length) {
	            throw new BorshError$1(`Enum index: ${idx} is out of range`);
	        }
	        const [fieldName, fieldType] = structSchema.values[idx];
	        const fieldValue = deserializeField$1(schema, fieldName, fieldType, reader);
	        return new classType({ [fieldName]: fieldValue });
	    }
	    throw new BorshError$1(`Unexpected schema kind: ${structSchema.kind} for ${classType.constructor.name}`);
	}
	/// Deserializes object from bytes using schema.
	function deserialize$1(schema, classType, buffer, Reader = BinaryReader$1) {
	    const reader = new Reader(buffer);
	    const result = deserializeStruct$1(schema, classType, reader);
	    if (reader.offset < buffer.length) {
	        throw new BorshError$1(`Unexpected ${buffer.length - reader.offset} bytes after deserialized data`);
	    }
	    return result;
	}
	lib$1.deserialize = deserialize$1;
	/// Deserializes object from bytes using schema, without checking the length read
	function deserializeUnchecked$1(schema, classType, buffer, Reader = BinaryReader$1) {
	    const reader = new Reader(buffer);
	    return deserializeStruct$1(schema, classType, reader);
	}
	lib$1.deserializeUnchecked = deserializeUnchecked$1;

	var naclFast = {exports: {}};

	var nodeCrypto = {};

	var _nodeResolve_empty = /*#__PURE__*/Object.freeze({
		__proto__: null,
		'default': nodeCrypto
	});

	var require$$0$1 = /*@__PURE__*/getAugmentedNamespace(_nodeResolve_empty);

	(function (module) {
	(function(nacl) {

	// Ported in 2014 by Dmitry Chestnykh and Devi Mandiri.
	// Public domain.
	//
	// Implementation derived from TweetNaCl version 20140427.
	// See for details: http://tweetnacl.cr.yp.to/

	var gf = function(init) {
	  var i, r = new Float64Array(16);
	  if (init) for (i = 0; i < init.length; i++) r[i] = init[i];
	  return r;
	};

	//  Pluggable, initialized in high-level API below.
	var randombytes = function(/* x, n */) { throw new Error('no PRNG'); };

	var _0 = new Uint8Array(16);
	var _9 = new Uint8Array(32); _9[0] = 9;

	var gf0 = gf(),
	    gf1 = gf([1]),
	    _121665 = gf([0xdb41, 1]),
	    D = gf([0x78a3, 0x1359, 0x4dca, 0x75eb, 0xd8ab, 0x4141, 0x0a4d, 0x0070, 0xe898, 0x7779, 0x4079, 0x8cc7, 0xfe73, 0x2b6f, 0x6cee, 0x5203]),
	    D2 = gf([0xf159, 0x26b2, 0x9b94, 0xebd6, 0xb156, 0x8283, 0x149a, 0x00e0, 0xd130, 0xeef3, 0x80f2, 0x198e, 0xfce7, 0x56df, 0xd9dc, 0x2406]),
	    X = gf([0xd51a, 0x8f25, 0x2d60, 0xc956, 0xa7b2, 0x9525, 0xc760, 0x692c, 0xdc5c, 0xfdd6, 0xe231, 0xc0a4, 0x53fe, 0xcd6e, 0x36d3, 0x2169]),
	    Y = gf([0x6658, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666]),
	    I = gf([0xa0b0, 0x4a0e, 0x1b27, 0xc4ee, 0xe478, 0xad2f, 0x1806, 0x2f43, 0xd7a7, 0x3dfb, 0x0099, 0x2b4d, 0xdf0b, 0x4fc1, 0x2480, 0x2b83]);

	function ts64(x, i, h, l) {
	  x[i]   = (h >> 24) & 0xff;
	  x[i+1] = (h >> 16) & 0xff;
	  x[i+2] = (h >>  8) & 0xff;
	  x[i+3] = h & 0xff;
	  x[i+4] = (l >> 24)  & 0xff;
	  x[i+5] = (l >> 16)  & 0xff;
	  x[i+6] = (l >>  8)  & 0xff;
	  x[i+7] = l & 0xff;
	}

	function vn(x, xi, y, yi, n) {
	  var i,d = 0;
	  for (i = 0; i < n; i++) d |= x[xi+i]^y[yi+i];
	  return (1 & ((d - 1) >>> 8)) - 1;
	}

	function crypto_verify_16(x, xi, y, yi) {
	  return vn(x,xi,y,yi,16);
	}

	function crypto_verify_32(x, xi, y, yi) {
	  return vn(x,xi,y,yi,32);
	}

	function core_salsa20(o, p, k, c) {
	  var j0  = c[ 0] & 0xff | (c[ 1] & 0xff)<<8 | (c[ 2] & 0xff)<<16 | (c[ 3] & 0xff)<<24,
	      j1  = k[ 0] & 0xff | (k[ 1] & 0xff)<<8 | (k[ 2] & 0xff)<<16 | (k[ 3] & 0xff)<<24,
	      j2  = k[ 4] & 0xff | (k[ 5] & 0xff)<<8 | (k[ 6] & 0xff)<<16 | (k[ 7] & 0xff)<<24,
	      j3  = k[ 8] & 0xff | (k[ 9] & 0xff)<<8 | (k[10] & 0xff)<<16 | (k[11] & 0xff)<<24,
	      j4  = k[12] & 0xff | (k[13] & 0xff)<<8 | (k[14] & 0xff)<<16 | (k[15] & 0xff)<<24,
	      j5  = c[ 4] & 0xff | (c[ 5] & 0xff)<<8 | (c[ 6] & 0xff)<<16 | (c[ 7] & 0xff)<<24,
	      j6  = p[ 0] & 0xff | (p[ 1] & 0xff)<<8 | (p[ 2] & 0xff)<<16 | (p[ 3] & 0xff)<<24,
	      j7  = p[ 4] & 0xff | (p[ 5] & 0xff)<<8 | (p[ 6] & 0xff)<<16 | (p[ 7] & 0xff)<<24,
	      j8  = p[ 8] & 0xff | (p[ 9] & 0xff)<<8 | (p[10] & 0xff)<<16 | (p[11] & 0xff)<<24,
	      j9  = p[12] & 0xff | (p[13] & 0xff)<<8 | (p[14] & 0xff)<<16 | (p[15] & 0xff)<<24,
	      j10 = c[ 8] & 0xff | (c[ 9] & 0xff)<<8 | (c[10] & 0xff)<<16 | (c[11] & 0xff)<<24,
	      j11 = k[16] & 0xff | (k[17] & 0xff)<<8 | (k[18] & 0xff)<<16 | (k[19] & 0xff)<<24,
	      j12 = k[20] & 0xff | (k[21] & 0xff)<<8 | (k[22] & 0xff)<<16 | (k[23] & 0xff)<<24,
	      j13 = k[24] & 0xff | (k[25] & 0xff)<<8 | (k[26] & 0xff)<<16 | (k[27] & 0xff)<<24,
	      j14 = k[28] & 0xff | (k[29] & 0xff)<<8 | (k[30] & 0xff)<<16 | (k[31] & 0xff)<<24,
	      j15 = c[12] & 0xff | (c[13] & 0xff)<<8 | (c[14] & 0xff)<<16 | (c[15] & 0xff)<<24;

	  var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7,
	      x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14,
	      x15 = j15, u;

	  for (var i = 0; i < 20; i += 2) {
	    u = x0 + x12 | 0;
	    x4 ^= u<<7 | u>>>(32-7);
	    u = x4 + x0 | 0;
	    x8 ^= u<<9 | u>>>(32-9);
	    u = x8 + x4 | 0;
	    x12 ^= u<<13 | u>>>(32-13);
	    u = x12 + x8 | 0;
	    x0 ^= u<<18 | u>>>(32-18);

	    u = x5 + x1 | 0;
	    x9 ^= u<<7 | u>>>(32-7);
	    u = x9 + x5 | 0;
	    x13 ^= u<<9 | u>>>(32-9);
	    u = x13 + x9 | 0;
	    x1 ^= u<<13 | u>>>(32-13);
	    u = x1 + x13 | 0;
	    x5 ^= u<<18 | u>>>(32-18);

	    u = x10 + x6 | 0;
	    x14 ^= u<<7 | u>>>(32-7);
	    u = x14 + x10 | 0;
	    x2 ^= u<<9 | u>>>(32-9);
	    u = x2 + x14 | 0;
	    x6 ^= u<<13 | u>>>(32-13);
	    u = x6 + x2 | 0;
	    x10 ^= u<<18 | u>>>(32-18);

	    u = x15 + x11 | 0;
	    x3 ^= u<<7 | u>>>(32-7);
	    u = x3 + x15 | 0;
	    x7 ^= u<<9 | u>>>(32-9);
	    u = x7 + x3 | 0;
	    x11 ^= u<<13 | u>>>(32-13);
	    u = x11 + x7 | 0;
	    x15 ^= u<<18 | u>>>(32-18);

	    u = x0 + x3 | 0;
	    x1 ^= u<<7 | u>>>(32-7);
	    u = x1 + x0 | 0;
	    x2 ^= u<<9 | u>>>(32-9);
	    u = x2 + x1 | 0;
	    x3 ^= u<<13 | u>>>(32-13);
	    u = x3 + x2 | 0;
	    x0 ^= u<<18 | u>>>(32-18);

	    u = x5 + x4 | 0;
	    x6 ^= u<<7 | u>>>(32-7);
	    u = x6 + x5 | 0;
	    x7 ^= u<<9 | u>>>(32-9);
	    u = x7 + x6 | 0;
	    x4 ^= u<<13 | u>>>(32-13);
	    u = x4 + x7 | 0;
	    x5 ^= u<<18 | u>>>(32-18);

	    u = x10 + x9 | 0;
	    x11 ^= u<<7 | u>>>(32-7);
	    u = x11 + x10 | 0;
	    x8 ^= u<<9 | u>>>(32-9);
	    u = x8 + x11 | 0;
	    x9 ^= u<<13 | u>>>(32-13);
	    u = x9 + x8 | 0;
	    x10 ^= u<<18 | u>>>(32-18);

	    u = x15 + x14 | 0;
	    x12 ^= u<<7 | u>>>(32-7);
	    u = x12 + x15 | 0;
	    x13 ^= u<<9 | u>>>(32-9);
	    u = x13 + x12 | 0;
	    x14 ^= u<<13 | u>>>(32-13);
	    u = x14 + x13 | 0;
	    x15 ^= u<<18 | u>>>(32-18);
	  }
	   x0 =  x0 +  j0 | 0;
	   x1 =  x1 +  j1 | 0;
	   x2 =  x2 +  j2 | 0;
	   x3 =  x3 +  j3 | 0;
	   x4 =  x4 +  j4 | 0;
	   x5 =  x5 +  j5 | 0;
	   x6 =  x6 +  j6 | 0;
	   x7 =  x7 +  j7 | 0;
	   x8 =  x8 +  j8 | 0;
	   x9 =  x9 +  j9 | 0;
	  x10 = x10 + j10 | 0;
	  x11 = x11 + j11 | 0;
	  x12 = x12 + j12 | 0;
	  x13 = x13 + j13 | 0;
	  x14 = x14 + j14 | 0;
	  x15 = x15 + j15 | 0;

	  o[ 0] = x0 >>>  0 & 0xff;
	  o[ 1] = x0 >>>  8 & 0xff;
	  o[ 2] = x0 >>> 16 & 0xff;
	  o[ 3] = x0 >>> 24 & 0xff;

	  o[ 4] = x1 >>>  0 & 0xff;
	  o[ 5] = x1 >>>  8 & 0xff;
	  o[ 6] = x1 >>> 16 & 0xff;
	  o[ 7] = x1 >>> 24 & 0xff;

	  o[ 8] = x2 >>>  0 & 0xff;
	  o[ 9] = x2 >>>  8 & 0xff;
	  o[10] = x2 >>> 16 & 0xff;
	  o[11] = x2 >>> 24 & 0xff;

	  o[12] = x3 >>>  0 & 0xff;
	  o[13] = x3 >>>  8 & 0xff;
	  o[14] = x3 >>> 16 & 0xff;
	  o[15] = x3 >>> 24 & 0xff;

	  o[16] = x4 >>>  0 & 0xff;
	  o[17] = x4 >>>  8 & 0xff;
	  o[18] = x4 >>> 16 & 0xff;
	  o[19] = x4 >>> 24 & 0xff;

	  o[20] = x5 >>>  0 & 0xff;
	  o[21] = x5 >>>  8 & 0xff;
	  o[22] = x5 >>> 16 & 0xff;
	  o[23] = x5 >>> 24 & 0xff;

	  o[24] = x6 >>>  0 & 0xff;
	  o[25] = x6 >>>  8 & 0xff;
	  o[26] = x6 >>> 16 & 0xff;
	  o[27] = x6 >>> 24 & 0xff;

	  o[28] = x7 >>>  0 & 0xff;
	  o[29] = x7 >>>  8 & 0xff;
	  o[30] = x7 >>> 16 & 0xff;
	  o[31] = x7 >>> 24 & 0xff;

	  o[32] = x8 >>>  0 & 0xff;
	  o[33] = x8 >>>  8 & 0xff;
	  o[34] = x8 >>> 16 & 0xff;
	  o[35] = x8 >>> 24 & 0xff;

	  o[36] = x9 >>>  0 & 0xff;
	  o[37] = x9 >>>  8 & 0xff;
	  o[38] = x9 >>> 16 & 0xff;
	  o[39] = x9 >>> 24 & 0xff;

	  o[40] = x10 >>>  0 & 0xff;
	  o[41] = x10 >>>  8 & 0xff;
	  o[42] = x10 >>> 16 & 0xff;
	  o[43] = x10 >>> 24 & 0xff;

	  o[44] = x11 >>>  0 & 0xff;
	  o[45] = x11 >>>  8 & 0xff;
	  o[46] = x11 >>> 16 & 0xff;
	  o[47] = x11 >>> 24 & 0xff;

	  o[48] = x12 >>>  0 & 0xff;
	  o[49] = x12 >>>  8 & 0xff;
	  o[50] = x12 >>> 16 & 0xff;
	  o[51] = x12 >>> 24 & 0xff;

	  o[52] = x13 >>>  0 & 0xff;
	  o[53] = x13 >>>  8 & 0xff;
	  o[54] = x13 >>> 16 & 0xff;
	  o[55] = x13 >>> 24 & 0xff;

	  o[56] = x14 >>>  0 & 0xff;
	  o[57] = x14 >>>  8 & 0xff;
	  o[58] = x14 >>> 16 & 0xff;
	  o[59] = x14 >>> 24 & 0xff;

	  o[60] = x15 >>>  0 & 0xff;
	  o[61] = x15 >>>  8 & 0xff;
	  o[62] = x15 >>> 16 & 0xff;
	  o[63] = x15 >>> 24 & 0xff;
	}

	function core_hsalsa20(o,p,k,c) {
	  var j0  = c[ 0] & 0xff | (c[ 1] & 0xff)<<8 | (c[ 2] & 0xff)<<16 | (c[ 3] & 0xff)<<24,
	      j1  = k[ 0] & 0xff | (k[ 1] & 0xff)<<8 | (k[ 2] & 0xff)<<16 | (k[ 3] & 0xff)<<24,
	      j2  = k[ 4] & 0xff | (k[ 5] & 0xff)<<8 | (k[ 6] & 0xff)<<16 | (k[ 7] & 0xff)<<24,
	      j3  = k[ 8] & 0xff | (k[ 9] & 0xff)<<8 | (k[10] & 0xff)<<16 | (k[11] & 0xff)<<24,
	      j4  = k[12] & 0xff | (k[13] & 0xff)<<8 | (k[14] & 0xff)<<16 | (k[15] & 0xff)<<24,
	      j5  = c[ 4] & 0xff | (c[ 5] & 0xff)<<8 | (c[ 6] & 0xff)<<16 | (c[ 7] & 0xff)<<24,
	      j6  = p[ 0] & 0xff | (p[ 1] & 0xff)<<8 | (p[ 2] & 0xff)<<16 | (p[ 3] & 0xff)<<24,
	      j7  = p[ 4] & 0xff | (p[ 5] & 0xff)<<8 | (p[ 6] & 0xff)<<16 | (p[ 7] & 0xff)<<24,
	      j8  = p[ 8] & 0xff | (p[ 9] & 0xff)<<8 | (p[10] & 0xff)<<16 | (p[11] & 0xff)<<24,
	      j9  = p[12] & 0xff | (p[13] & 0xff)<<8 | (p[14] & 0xff)<<16 | (p[15] & 0xff)<<24,
	      j10 = c[ 8] & 0xff | (c[ 9] & 0xff)<<8 | (c[10] & 0xff)<<16 | (c[11] & 0xff)<<24,
	      j11 = k[16] & 0xff | (k[17] & 0xff)<<8 | (k[18] & 0xff)<<16 | (k[19] & 0xff)<<24,
	      j12 = k[20] & 0xff | (k[21] & 0xff)<<8 | (k[22] & 0xff)<<16 | (k[23] & 0xff)<<24,
	      j13 = k[24] & 0xff | (k[25] & 0xff)<<8 | (k[26] & 0xff)<<16 | (k[27] & 0xff)<<24,
	      j14 = k[28] & 0xff | (k[29] & 0xff)<<8 | (k[30] & 0xff)<<16 | (k[31] & 0xff)<<24,
	      j15 = c[12] & 0xff | (c[13] & 0xff)<<8 | (c[14] & 0xff)<<16 | (c[15] & 0xff)<<24;

	  var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7,
	      x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14,
	      x15 = j15, u;

	  for (var i = 0; i < 20; i += 2) {
	    u = x0 + x12 | 0;
	    x4 ^= u<<7 | u>>>(32-7);
	    u = x4 + x0 | 0;
	    x8 ^= u<<9 | u>>>(32-9);
	    u = x8 + x4 | 0;
	    x12 ^= u<<13 | u>>>(32-13);
	    u = x12 + x8 | 0;
	    x0 ^= u<<18 | u>>>(32-18);

	    u = x5 + x1 | 0;
	    x9 ^= u<<7 | u>>>(32-7);
	    u = x9 + x5 | 0;
	    x13 ^= u<<9 | u>>>(32-9);
	    u = x13 + x9 | 0;
	    x1 ^= u<<13 | u>>>(32-13);
	    u = x1 + x13 | 0;
	    x5 ^= u<<18 | u>>>(32-18);

	    u = x10 + x6 | 0;
	    x14 ^= u<<7 | u>>>(32-7);
	    u = x14 + x10 | 0;
	    x2 ^= u<<9 | u>>>(32-9);
	    u = x2 + x14 | 0;
	    x6 ^= u<<13 | u>>>(32-13);
	    u = x6 + x2 | 0;
	    x10 ^= u<<18 | u>>>(32-18);

	    u = x15 + x11 | 0;
	    x3 ^= u<<7 | u>>>(32-7);
	    u = x3 + x15 | 0;
	    x7 ^= u<<9 | u>>>(32-9);
	    u = x7 + x3 | 0;
	    x11 ^= u<<13 | u>>>(32-13);
	    u = x11 + x7 | 0;
	    x15 ^= u<<18 | u>>>(32-18);

	    u = x0 + x3 | 0;
	    x1 ^= u<<7 | u>>>(32-7);
	    u = x1 + x0 | 0;
	    x2 ^= u<<9 | u>>>(32-9);
	    u = x2 + x1 | 0;
	    x3 ^= u<<13 | u>>>(32-13);
	    u = x3 + x2 | 0;
	    x0 ^= u<<18 | u>>>(32-18);

	    u = x5 + x4 | 0;
	    x6 ^= u<<7 | u>>>(32-7);
	    u = x6 + x5 | 0;
	    x7 ^= u<<9 | u>>>(32-9);
	    u = x7 + x6 | 0;
	    x4 ^= u<<13 | u>>>(32-13);
	    u = x4 + x7 | 0;
	    x5 ^= u<<18 | u>>>(32-18);

	    u = x10 + x9 | 0;
	    x11 ^= u<<7 | u>>>(32-7);
	    u = x11 + x10 | 0;
	    x8 ^= u<<9 | u>>>(32-9);
	    u = x8 + x11 | 0;
	    x9 ^= u<<13 | u>>>(32-13);
	    u = x9 + x8 | 0;
	    x10 ^= u<<18 | u>>>(32-18);

	    u = x15 + x14 | 0;
	    x12 ^= u<<7 | u>>>(32-7);
	    u = x12 + x15 | 0;
	    x13 ^= u<<9 | u>>>(32-9);
	    u = x13 + x12 | 0;
	    x14 ^= u<<13 | u>>>(32-13);
	    u = x14 + x13 | 0;
	    x15 ^= u<<18 | u>>>(32-18);
	  }

	  o[ 0] = x0 >>>  0 & 0xff;
	  o[ 1] = x0 >>>  8 & 0xff;
	  o[ 2] = x0 >>> 16 & 0xff;
	  o[ 3] = x0 >>> 24 & 0xff;

	  o[ 4] = x5 >>>  0 & 0xff;
	  o[ 5] = x5 >>>  8 & 0xff;
	  o[ 6] = x5 >>> 16 & 0xff;
	  o[ 7] = x5 >>> 24 & 0xff;

	  o[ 8] = x10 >>>  0 & 0xff;
	  o[ 9] = x10 >>>  8 & 0xff;
	  o[10] = x10 >>> 16 & 0xff;
	  o[11] = x10 >>> 24 & 0xff;

	  o[12] = x15 >>>  0 & 0xff;
	  o[13] = x15 >>>  8 & 0xff;
	  o[14] = x15 >>> 16 & 0xff;
	  o[15] = x15 >>> 24 & 0xff;

	  o[16] = x6 >>>  0 & 0xff;
	  o[17] = x6 >>>  8 & 0xff;
	  o[18] = x6 >>> 16 & 0xff;
	  o[19] = x6 >>> 24 & 0xff;

	  o[20] = x7 >>>  0 & 0xff;
	  o[21] = x7 >>>  8 & 0xff;
	  o[22] = x7 >>> 16 & 0xff;
	  o[23] = x7 >>> 24 & 0xff;

	  o[24] = x8 >>>  0 & 0xff;
	  o[25] = x8 >>>  8 & 0xff;
	  o[26] = x8 >>> 16 & 0xff;
	  o[27] = x8 >>> 24 & 0xff;

	  o[28] = x9 >>>  0 & 0xff;
	  o[29] = x9 >>>  8 & 0xff;
	  o[30] = x9 >>> 16 & 0xff;
	  o[31] = x9 >>> 24 & 0xff;
	}

	function crypto_core_salsa20(out,inp,k,c) {
	  core_salsa20(out,inp,k,c);
	}

	function crypto_core_hsalsa20(out,inp,k,c) {
	  core_hsalsa20(out,inp,k,c);
	}

	var sigma = new Uint8Array([101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107]);
	            // "expand 32-byte k"

	function crypto_stream_salsa20_xor(c,cpos,m,mpos,b,n,k) {
	  var z = new Uint8Array(16), x = new Uint8Array(64);
	  var u, i;
	  for (i = 0; i < 16; i++) z[i] = 0;
	  for (i = 0; i < 8; i++) z[i] = n[i];
	  while (b >= 64) {
	    crypto_core_salsa20(x,z,k,sigma);
	    for (i = 0; i < 64; i++) c[cpos+i] = m[mpos+i] ^ x[i];
	    u = 1;
	    for (i = 8; i < 16; i++) {
	      u = u + (z[i] & 0xff) | 0;
	      z[i] = u & 0xff;
	      u >>>= 8;
	    }
	    b -= 64;
	    cpos += 64;
	    mpos += 64;
	  }
	  if (b > 0) {
	    crypto_core_salsa20(x,z,k,sigma);
	    for (i = 0; i < b; i++) c[cpos+i] = m[mpos+i] ^ x[i];
	  }
	  return 0;
	}

	function crypto_stream_salsa20(c,cpos,b,n,k) {
	  var z = new Uint8Array(16), x = new Uint8Array(64);
	  var u, i;
	  for (i = 0; i < 16; i++) z[i] = 0;
	  for (i = 0; i < 8; i++) z[i] = n[i];
	  while (b >= 64) {
	    crypto_core_salsa20(x,z,k,sigma);
	    for (i = 0; i < 64; i++) c[cpos+i] = x[i];
	    u = 1;
	    for (i = 8; i < 16; i++) {
	      u = u + (z[i] & 0xff) | 0;
	      z[i] = u & 0xff;
	      u >>>= 8;
	    }
	    b -= 64;
	    cpos += 64;
	  }
	  if (b > 0) {
	    crypto_core_salsa20(x,z,k,sigma);
	    for (i = 0; i < b; i++) c[cpos+i] = x[i];
	  }
	  return 0;
	}

	function crypto_stream(c,cpos,d,n,k) {
	  var s = new Uint8Array(32);
	  crypto_core_hsalsa20(s,n,k,sigma);
	  var sn = new Uint8Array(8);
	  for (var i = 0; i < 8; i++) sn[i] = n[i+16];
	  return crypto_stream_salsa20(c,cpos,d,sn,s);
	}

	function crypto_stream_xor(c,cpos,m,mpos,d,n,k) {
	  var s = new Uint8Array(32);
	  crypto_core_hsalsa20(s,n,k,sigma);
	  var sn = new Uint8Array(8);
	  for (var i = 0; i < 8; i++) sn[i] = n[i+16];
	  return crypto_stream_salsa20_xor(c,cpos,m,mpos,d,sn,s);
	}

	/*
	* Port of Andrew Moon's Poly1305-donna-16. Public domain.
	* https://github.com/floodyberry/poly1305-donna
	*/

	var poly1305 = function(key) {
	  this.buffer = new Uint8Array(16);
	  this.r = new Uint16Array(10);
	  this.h = new Uint16Array(10);
	  this.pad = new Uint16Array(8);
	  this.leftover = 0;
	  this.fin = 0;

	  var t0, t1, t2, t3, t4, t5, t6, t7;

	  t0 = key[ 0] & 0xff | (key[ 1] & 0xff) << 8; this.r[0] = ( t0                     ) & 0x1fff;
	  t1 = key[ 2] & 0xff | (key[ 3] & 0xff) << 8; this.r[1] = ((t0 >>> 13) | (t1 <<  3)) & 0x1fff;
	  t2 = key[ 4] & 0xff | (key[ 5] & 0xff) << 8; this.r[2] = ((t1 >>> 10) | (t2 <<  6)) & 0x1f03;
	  t3 = key[ 6] & 0xff | (key[ 7] & 0xff) << 8; this.r[3] = ((t2 >>>  7) | (t3 <<  9)) & 0x1fff;
	  t4 = key[ 8] & 0xff | (key[ 9] & 0xff) << 8; this.r[4] = ((t3 >>>  4) | (t4 << 12)) & 0x00ff;
	  this.r[5] = ((t4 >>>  1)) & 0x1ffe;
	  t5 = key[10] & 0xff | (key[11] & 0xff) << 8; this.r[6] = ((t4 >>> 14) | (t5 <<  2)) & 0x1fff;
	  t6 = key[12] & 0xff | (key[13] & 0xff) << 8; this.r[7] = ((t5 >>> 11) | (t6 <<  5)) & 0x1f81;
	  t7 = key[14] & 0xff | (key[15] & 0xff) << 8; this.r[8] = ((t6 >>>  8) | (t7 <<  8)) & 0x1fff;
	  this.r[9] = ((t7 >>>  5)) & 0x007f;

	  this.pad[0] = key[16] & 0xff | (key[17] & 0xff) << 8;
	  this.pad[1] = key[18] & 0xff | (key[19] & 0xff) << 8;
	  this.pad[2] = key[20] & 0xff | (key[21] & 0xff) << 8;
	  this.pad[3] = key[22] & 0xff | (key[23] & 0xff) << 8;
	  this.pad[4] = key[24] & 0xff | (key[25] & 0xff) << 8;
	  this.pad[5] = key[26] & 0xff | (key[27] & 0xff) << 8;
	  this.pad[6] = key[28] & 0xff | (key[29] & 0xff) << 8;
	  this.pad[7] = key[30] & 0xff | (key[31] & 0xff) << 8;
	};

	poly1305.prototype.blocks = function(m, mpos, bytes) {
	  var hibit = this.fin ? 0 : (1 << 11);
	  var t0, t1, t2, t3, t4, t5, t6, t7, c;
	  var d0, d1, d2, d3, d4, d5, d6, d7, d8, d9;

	  var h0 = this.h[0],
	      h1 = this.h[1],
	      h2 = this.h[2],
	      h3 = this.h[3],
	      h4 = this.h[4],
	      h5 = this.h[5],
	      h6 = this.h[6],
	      h7 = this.h[7],
	      h8 = this.h[8],
	      h9 = this.h[9];

	  var r0 = this.r[0],
	      r1 = this.r[1],
	      r2 = this.r[2],
	      r3 = this.r[3],
	      r4 = this.r[4],
	      r5 = this.r[5],
	      r6 = this.r[6],
	      r7 = this.r[7],
	      r8 = this.r[8],
	      r9 = this.r[9];

	  while (bytes >= 16) {
	    t0 = m[mpos+ 0] & 0xff | (m[mpos+ 1] & 0xff) << 8; h0 += ( t0                     ) & 0x1fff;
	    t1 = m[mpos+ 2] & 0xff | (m[mpos+ 3] & 0xff) << 8; h1 += ((t0 >>> 13) | (t1 <<  3)) & 0x1fff;
	    t2 = m[mpos+ 4] & 0xff | (m[mpos+ 5] & 0xff) << 8; h2 += ((t1 >>> 10) | (t2 <<  6)) & 0x1fff;
	    t3 = m[mpos+ 6] & 0xff | (m[mpos+ 7] & 0xff) << 8; h3 += ((t2 >>>  7) | (t3 <<  9)) & 0x1fff;
	    t4 = m[mpos+ 8] & 0xff | (m[mpos+ 9] & 0xff) << 8; h4 += ((t3 >>>  4) | (t4 << 12)) & 0x1fff;
	    h5 += ((t4 >>>  1)) & 0x1fff;
	    t5 = m[mpos+10] & 0xff | (m[mpos+11] & 0xff) << 8; h6 += ((t4 >>> 14) | (t5 <<  2)) & 0x1fff;
	    t6 = m[mpos+12] & 0xff | (m[mpos+13] & 0xff) << 8; h7 += ((t5 >>> 11) | (t6 <<  5)) & 0x1fff;
	    t7 = m[mpos+14] & 0xff | (m[mpos+15] & 0xff) << 8; h8 += ((t6 >>>  8) | (t7 <<  8)) & 0x1fff;
	    h9 += ((t7 >>> 5)) | hibit;

	    c = 0;

	    d0 = c;
	    d0 += h0 * r0;
	    d0 += h1 * (5 * r9);
	    d0 += h2 * (5 * r8);
	    d0 += h3 * (5 * r7);
	    d0 += h4 * (5 * r6);
	    c = (d0 >>> 13); d0 &= 0x1fff;
	    d0 += h5 * (5 * r5);
	    d0 += h6 * (5 * r4);
	    d0 += h7 * (5 * r3);
	    d0 += h8 * (5 * r2);
	    d0 += h9 * (5 * r1);
	    c += (d0 >>> 13); d0 &= 0x1fff;

	    d1 = c;
	    d1 += h0 * r1;
	    d1 += h1 * r0;
	    d1 += h2 * (5 * r9);
	    d1 += h3 * (5 * r8);
	    d1 += h4 * (5 * r7);
	    c = (d1 >>> 13); d1 &= 0x1fff;
	    d1 += h5 * (5 * r6);
	    d1 += h6 * (5 * r5);
	    d1 += h7 * (5 * r4);
	    d1 += h8 * (5 * r3);
	    d1 += h9 * (5 * r2);
	    c += (d1 >>> 13); d1 &= 0x1fff;

	    d2 = c;
	    d2 += h0 * r2;
	    d2 += h1 * r1;
	    d2 += h2 * r0;
	    d2 += h3 * (5 * r9);
	    d2 += h4 * (5 * r8);
	    c = (d2 >>> 13); d2 &= 0x1fff;
	    d2 += h5 * (5 * r7);
	    d2 += h6 * (5 * r6);
	    d2 += h7 * (5 * r5);
	    d2 += h8 * (5 * r4);
	    d2 += h9 * (5 * r3);
	    c += (d2 >>> 13); d2 &= 0x1fff;

	    d3 = c;
	    d3 += h0 * r3;
	    d3 += h1 * r2;
	    d3 += h2 * r1;
	    d3 += h3 * r0;
	    d3 += h4 * (5 * r9);
	    c = (d3 >>> 13); d3 &= 0x1fff;
	    d3 += h5 * (5 * r8);
	    d3 += h6 * (5 * r7);
	    d3 += h7 * (5 * r6);
	    d3 += h8 * (5 * r5);
	    d3 += h9 * (5 * r4);
	    c += (d3 >>> 13); d3 &= 0x1fff;

	    d4 = c;
	    d4 += h0 * r4;
	    d4 += h1 * r3;
	    d4 += h2 * r2;
	    d4 += h3 * r1;
	    d4 += h4 * r0;
	    c = (d4 >>> 13); d4 &= 0x1fff;
	    d4 += h5 * (5 * r9);
	    d4 += h6 * (5 * r8);
	    d4 += h7 * (5 * r7);
	    d4 += h8 * (5 * r6);
	    d4 += h9 * (5 * r5);
	    c += (d4 >>> 13); d4 &= 0x1fff;

	    d5 = c;
	    d5 += h0 * r5;
	    d5 += h1 * r4;
	    d5 += h2 * r3;
	    d5 += h3 * r2;
	    d5 += h4 * r1;
	    c = (d5 >>> 13); d5 &= 0x1fff;
	    d5 += h5 * r0;
	    d5 += h6 * (5 * r9);
	    d5 += h7 * (5 * r8);
	    d5 += h8 * (5 * r7);
	    d5 += h9 * (5 * r6);
	    c += (d5 >>> 13); d5 &= 0x1fff;

	    d6 = c;
	    d6 += h0 * r6;
	    d6 += h1 * r5;
	    d6 += h2 * r4;
	    d6 += h3 * r3;
	    d6 += h4 * r2;
	    c = (d6 >>> 13); d6 &= 0x1fff;
	    d6 += h5 * r1;
	    d6 += h6 * r0;
	    d6 += h7 * (5 * r9);
	    d6 += h8 * (5 * r8);
	    d6 += h9 * (5 * r7);
	    c += (d6 >>> 13); d6 &= 0x1fff;

	    d7 = c;
	    d7 += h0 * r7;
	    d7 += h1 * r6;
	    d7 += h2 * r5;
	    d7 += h3 * r4;
	    d7 += h4 * r3;
	    c = (d7 >>> 13); d7 &= 0x1fff;
	    d7 += h5 * r2;
	    d7 += h6 * r1;
	    d7 += h7 * r0;
	    d7 += h8 * (5 * r9);
	    d7 += h9 * (5 * r8);
	    c += (d7 >>> 13); d7 &= 0x1fff;

	    d8 = c;
	    d8 += h0 * r8;
	    d8 += h1 * r7;
	    d8 += h2 * r6;
	    d8 += h3 * r5;
	    d8 += h4 * r4;
	    c = (d8 >>> 13); d8 &= 0x1fff;
	    d8 += h5 * r3;
	    d8 += h6 * r2;
	    d8 += h7 * r1;
	    d8 += h8 * r0;
	    d8 += h9 * (5 * r9);
	    c += (d8 >>> 13); d8 &= 0x1fff;

	    d9 = c;
	    d9 += h0 * r9;
	    d9 += h1 * r8;
	    d9 += h2 * r7;
	    d9 += h3 * r6;
	    d9 += h4 * r5;
	    c = (d9 >>> 13); d9 &= 0x1fff;
	    d9 += h5 * r4;
	    d9 += h6 * r3;
	    d9 += h7 * r2;
	    d9 += h8 * r1;
	    d9 += h9 * r0;
	    c += (d9 >>> 13); d9 &= 0x1fff;

	    c = (((c << 2) + c)) | 0;
	    c = (c + d0) | 0;
	    d0 = c & 0x1fff;
	    c = (c >>> 13);
	    d1 += c;

	    h0 = d0;
	    h1 = d1;
	    h2 = d2;
	    h3 = d3;
	    h4 = d4;
	    h5 = d5;
	    h6 = d6;
	    h7 = d7;
	    h8 = d8;
	    h9 = d9;

	    mpos += 16;
	    bytes -= 16;
	  }
	  this.h[0] = h0;
	  this.h[1] = h1;
	  this.h[2] = h2;
	  this.h[3] = h3;
	  this.h[4] = h4;
	  this.h[5] = h5;
	  this.h[6] = h6;
	  this.h[7] = h7;
	  this.h[8] = h8;
	  this.h[9] = h9;
	};

	poly1305.prototype.finish = function(mac, macpos) {
	  var g = new Uint16Array(10);
	  var c, mask, f, i;

	  if (this.leftover) {
	    i = this.leftover;
	    this.buffer[i++] = 1;
	    for (; i < 16; i++) this.buffer[i] = 0;
	    this.fin = 1;
	    this.blocks(this.buffer, 0, 16);
	  }

	  c = this.h[1] >>> 13;
	  this.h[1] &= 0x1fff;
	  for (i = 2; i < 10; i++) {
	    this.h[i] += c;
	    c = this.h[i] >>> 13;
	    this.h[i] &= 0x1fff;
	  }
	  this.h[0] += (c * 5);
	  c = this.h[0] >>> 13;
	  this.h[0] &= 0x1fff;
	  this.h[1] += c;
	  c = this.h[1] >>> 13;
	  this.h[1] &= 0x1fff;
	  this.h[2] += c;

	  g[0] = this.h[0] + 5;
	  c = g[0] >>> 13;
	  g[0] &= 0x1fff;
	  for (i = 1; i < 10; i++) {
	    g[i] = this.h[i] + c;
	    c = g[i] >>> 13;
	    g[i] &= 0x1fff;
	  }
	  g[9] -= (1 << 13);

	  mask = (c ^ 1) - 1;
	  for (i = 0; i < 10; i++) g[i] &= mask;
	  mask = ~mask;
	  for (i = 0; i < 10; i++) this.h[i] = (this.h[i] & mask) | g[i];

	  this.h[0] = ((this.h[0]       ) | (this.h[1] << 13)                    ) & 0xffff;
	  this.h[1] = ((this.h[1] >>>  3) | (this.h[2] << 10)                    ) & 0xffff;
	  this.h[2] = ((this.h[2] >>>  6) | (this.h[3] <<  7)                    ) & 0xffff;
	  this.h[3] = ((this.h[3] >>>  9) | (this.h[4] <<  4)                    ) & 0xffff;
	  this.h[4] = ((this.h[4] >>> 12) | (this.h[5] <<  1) | (this.h[6] << 14)) & 0xffff;
	  this.h[5] = ((this.h[6] >>>  2) | (this.h[7] << 11)                    ) & 0xffff;
	  this.h[6] = ((this.h[7] >>>  5) | (this.h[8] <<  8)                    ) & 0xffff;
	  this.h[7] = ((this.h[8] >>>  8) | (this.h[9] <<  5)                    ) & 0xffff;

	  f = this.h[0] + this.pad[0];
	  this.h[0] = f & 0xffff;
	  for (i = 1; i < 8; i++) {
	    f = (((this.h[i] + this.pad[i]) | 0) + (f >>> 16)) | 0;
	    this.h[i] = f & 0xffff;
	  }

	  mac[macpos+ 0] = (this.h[0] >>> 0) & 0xff;
	  mac[macpos+ 1] = (this.h[0] >>> 8) & 0xff;
	  mac[macpos+ 2] = (this.h[1] >>> 0) & 0xff;
	  mac[macpos+ 3] = (this.h[1] >>> 8) & 0xff;
	  mac[macpos+ 4] = (this.h[2] >>> 0) & 0xff;
	  mac[macpos+ 5] = (this.h[2] >>> 8) & 0xff;
	  mac[macpos+ 6] = (this.h[3] >>> 0) & 0xff;
	  mac[macpos+ 7] = (this.h[3] >>> 8) & 0xff;
	  mac[macpos+ 8] = (this.h[4] >>> 0) & 0xff;
	  mac[macpos+ 9] = (this.h[4] >>> 8) & 0xff;
	  mac[macpos+10] = (this.h[5] >>> 0) & 0xff;
	  mac[macpos+11] = (this.h[5] >>> 8) & 0xff;
	  mac[macpos+12] = (this.h[6] >>> 0) & 0xff;
	  mac[macpos+13] = (this.h[6] >>> 8) & 0xff;
	  mac[macpos+14] = (this.h[7] >>> 0) & 0xff;
	  mac[macpos+15] = (this.h[7] >>> 8) & 0xff;
	};

	poly1305.prototype.update = function(m, mpos, bytes) {
	  var i, want;

	  if (this.leftover) {
	    want = (16 - this.leftover);
	    if (want > bytes)
	      want = bytes;
	    for (i = 0; i < want; i++)
	      this.buffer[this.leftover + i] = m[mpos+i];
	    bytes -= want;
	    mpos += want;
	    this.leftover += want;
	    if (this.leftover < 16)
	      return;
	    this.blocks(this.buffer, 0, 16);
	    this.leftover = 0;
	  }

	  if (bytes >= 16) {
	    want = bytes - (bytes % 16);
	    this.blocks(m, mpos, want);
	    mpos += want;
	    bytes -= want;
	  }

	  if (bytes) {
	    for (i = 0; i < bytes; i++)
	      this.buffer[this.leftover + i] = m[mpos+i];
	    this.leftover += bytes;
	  }
	};

	function crypto_onetimeauth(out, outpos, m, mpos, n, k) {
	  var s = new poly1305(k);
	  s.update(m, mpos, n);
	  s.finish(out, outpos);
	  return 0;
	}

	function crypto_onetimeauth_verify(h, hpos, m, mpos, n, k) {
	  var x = new Uint8Array(16);
	  crypto_onetimeauth(x,0,m,mpos,n,k);
	  return crypto_verify_16(h,hpos,x,0);
	}

	function crypto_secretbox(c,m,d,n,k) {
	  var i;
	  if (d < 32) return -1;
	  crypto_stream_xor(c,0,m,0,d,n,k);
	  crypto_onetimeauth(c, 16, c, 32, d - 32, c);
	  for (i = 0; i < 16; i++) c[i] = 0;
	  return 0;
	}

	function crypto_secretbox_open(m,c,d,n,k) {
	  var i;
	  var x = new Uint8Array(32);
	  if (d < 32) return -1;
	  crypto_stream(x,0,32,n,k);
	  if (crypto_onetimeauth_verify(c, 16,c, 32,d - 32,x) !== 0) return -1;
	  crypto_stream_xor(m,0,c,0,d,n,k);
	  for (i = 0; i < 32; i++) m[i] = 0;
	  return 0;
	}

	function set25519(r, a) {
	  var i;
	  for (i = 0; i < 16; i++) r[i] = a[i]|0;
	}

	function car25519(o) {
	  var i, v, c = 1;
	  for (i = 0; i < 16; i++) {
	    v = o[i] + c + 65535;
	    c = Math.floor(v / 65536);
	    o[i] = v - c * 65536;
	  }
	  o[0] += c-1 + 37 * (c-1);
	}

	function sel25519(p, q, b) {
	  var t, c = ~(b-1);
	  for (var i = 0; i < 16; i++) {
	    t = c & (p[i] ^ q[i]);
	    p[i] ^= t;
	    q[i] ^= t;
	  }
	}

	function pack25519(o, n) {
	  var i, j, b;
	  var m = gf(), t = gf();
	  for (i = 0; i < 16; i++) t[i] = n[i];
	  car25519(t);
	  car25519(t);
	  car25519(t);
	  for (j = 0; j < 2; j++) {
	    m[0] = t[0] - 0xffed;
	    for (i = 1; i < 15; i++) {
	      m[i] = t[i] - 0xffff - ((m[i-1]>>16) & 1);
	      m[i-1] &= 0xffff;
	    }
	    m[15] = t[15] - 0x7fff - ((m[14]>>16) & 1);
	    b = (m[15]>>16) & 1;
	    m[14] &= 0xffff;
	    sel25519(t, m, 1-b);
	  }
	  for (i = 0; i < 16; i++) {
	    o[2*i] = t[i] & 0xff;
	    o[2*i+1] = t[i]>>8;
	  }
	}

	function neq25519(a, b) {
	  var c = new Uint8Array(32), d = new Uint8Array(32);
	  pack25519(c, a);
	  pack25519(d, b);
	  return crypto_verify_32(c, 0, d, 0);
	}

	function par25519(a) {
	  var d = new Uint8Array(32);
	  pack25519(d, a);
	  return d[0] & 1;
	}

	function unpack25519(o, n) {
	  var i;
	  for (i = 0; i < 16; i++) o[i] = n[2*i] + (n[2*i+1] << 8);
	  o[15] &= 0x7fff;
	}

	function A(o, a, b) {
	  for (var i = 0; i < 16; i++) o[i] = a[i] + b[i];
	}

	function Z(o, a, b) {
	  for (var i = 0; i < 16; i++) o[i] = a[i] - b[i];
	}

	function M(o, a, b) {
	  var v, c,
	     t0 = 0,  t1 = 0,  t2 = 0,  t3 = 0,  t4 = 0,  t5 = 0,  t6 = 0,  t7 = 0,
	     t8 = 0,  t9 = 0, t10 = 0, t11 = 0, t12 = 0, t13 = 0, t14 = 0, t15 = 0,
	    t16 = 0, t17 = 0, t18 = 0, t19 = 0, t20 = 0, t21 = 0, t22 = 0, t23 = 0,
	    t24 = 0, t25 = 0, t26 = 0, t27 = 0, t28 = 0, t29 = 0, t30 = 0,
	    b0 = b[0],
	    b1 = b[1],
	    b2 = b[2],
	    b3 = b[3],
	    b4 = b[4],
	    b5 = b[5],
	    b6 = b[6],
	    b7 = b[7],
	    b8 = b[8],
	    b9 = b[9],
	    b10 = b[10],
	    b11 = b[11],
	    b12 = b[12],
	    b13 = b[13],
	    b14 = b[14],
	    b15 = b[15];

	  v = a[0];
	  t0 += v * b0;
	  t1 += v * b1;
	  t2 += v * b2;
	  t3 += v * b3;
	  t4 += v * b4;
	  t5 += v * b5;
	  t6 += v * b6;
	  t7 += v * b7;
	  t8 += v * b8;
	  t9 += v * b9;
	  t10 += v * b10;
	  t11 += v * b11;
	  t12 += v * b12;
	  t13 += v * b13;
	  t14 += v * b14;
	  t15 += v * b15;
	  v = a[1];
	  t1 += v * b0;
	  t2 += v * b1;
	  t3 += v * b2;
	  t4 += v * b3;
	  t5 += v * b4;
	  t6 += v * b5;
	  t7 += v * b6;
	  t8 += v * b7;
	  t9 += v * b8;
	  t10 += v * b9;
	  t11 += v * b10;
	  t12 += v * b11;
	  t13 += v * b12;
	  t14 += v * b13;
	  t15 += v * b14;
	  t16 += v * b15;
	  v = a[2];
	  t2 += v * b0;
	  t3 += v * b1;
	  t4 += v * b2;
	  t5 += v * b3;
	  t6 += v * b4;
	  t7 += v * b5;
	  t8 += v * b6;
	  t9 += v * b7;
	  t10 += v * b8;
	  t11 += v * b9;
	  t12 += v * b10;
	  t13 += v * b11;
	  t14 += v * b12;
	  t15 += v * b13;
	  t16 += v * b14;
	  t17 += v * b15;
	  v = a[3];
	  t3 += v * b0;
	  t4 += v * b1;
	  t5 += v * b2;
	  t6 += v * b3;
	  t7 += v * b4;
	  t8 += v * b5;
	  t9 += v * b6;
	  t10 += v * b7;
	  t11 += v * b8;
	  t12 += v * b9;
	  t13 += v * b10;
	  t14 += v * b11;
	  t15 += v * b12;
	  t16 += v * b13;
	  t17 += v * b14;
	  t18 += v * b15;
	  v = a[4];
	  t4 += v * b0;
	  t5 += v * b1;
	  t6 += v * b2;
	  t7 += v * b3;
	  t8 += v * b4;
	  t9 += v * b5;
	  t10 += v * b6;
	  t11 += v * b7;
	  t12 += v * b8;
	  t13 += v * b9;
	  t14 += v * b10;
	  t15 += v * b11;
	  t16 += v * b12;
	  t17 += v * b13;
	  t18 += v * b14;
	  t19 += v * b15;
	  v = a[5];
	  t5 += v * b0;
	  t6 += v * b1;
	  t7 += v * b2;
	  t8 += v * b3;
	  t9 += v * b4;
	  t10 += v * b5;
	  t11 += v * b6;
	  t12 += v * b7;
	  t13 += v * b8;
	  t14 += v * b9;
	  t15 += v * b10;
	  t16 += v * b11;
	  t17 += v * b12;
	  t18 += v * b13;
	  t19 += v * b14;
	  t20 += v * b15;
	  v = a[6];
	  t6 += v * b0;
	  t7 += v * b1;
	  t8 += v * b2;
	  t9 += v * b3;
	  t10 += v * b4;
	  t11 += v * b5;
	  t12 += v * b6;
	  t13 += v * b7;
	  t14 += v * b8;
	  t15 += v * b9;
	  t16 += v * b10;
	  t17 += v * b11;
	  t18 += v * b12;
	  t19 += v * b13;
	  t20 += v * b14;
	  t21 += v * b15;
	  v = a[7];
	  t7 += v * b0;
	  t8 += v * b1;
	  t9 += v * b2;
	  t10 += v * b3;
	  t11 += v * b4;
	  t12 += v * b5;
	  t13 += v * b6;
	  t14 += v * b7;
	  t15 += v * b8;
	  t16 += v * b9;
	  t17 += v * b10;
	  t18 += v * b11;
	  t19 += v * b12;
	  t20 += v * b13;
	  t21 += v * b14;
	  t22 += v * b15;
	  v = a[8];
	  t8 += v * b0;
	  t9 += v * b1;
	  t10 += v * b2;
	  t11 += v * b3;
	  t12 += v * b4;
	  t13 += v * b5;
	  t14 += v * b6;
	  t15 += v * b7;
	  t16 += v * b8;
	  t17 += v * b9;
	  t18 += v * b10;
	  t19 += v * b11;
	  t20 += v * b12;
	  t21 += v * b13;
	  t22 += v * b14;
	  t23 += v * b15;
	  v = a[9];
	  t9 += v * b0;
	  t10 += v * b1;
	  t11 += v * b2;
	  t12 += v * b3;
	  t13 += v * b4;
	  t14 += v * b5;
	  t15 += v * b6;
	  t16 += v * b7;
	  t17 += v * b8;
	  t18 += v * b9;
	  t19 += v * b10;
	  t20 += v * b11;
	  t21 += v * b12;
	  t22 += v * b13;
	  t23 += v * b14;
	  t24 += v * b15;
	  v = a[10];
	  t10 += v * b0;
	  t11 += v * b1;
	  t12 += v * b2;
	  t13 += v * b3;
	  t14 += v * b4;
	  t15 += v * b5;
	  t16 += v * b6;
	  t17 += v * b7;
	  t18 += v * b8;
	  t19 += v * b9;
	  t20 += v * b10;
	  t21 += v * b11;
	  t22 += v * b12;
	  t23 += v * b13;
	  t24 += v * b14;
	  t25 += v * b15;
	  v = a[11];
	  t11 += v * b0;
	  t12 += v * b1;
	  t13 += v * b2;
	  t14 += v * b3;
	  t15 += v * b4;
	  t16 += v * b5;
	  t17 += v * b6;
	  t18 += v * b7;
	  t19 += v * b8;
	  t20 += v * b9;
	  t21 += v * b10;
	  t22 += v * b11;
	  t23 += v * b12;
	  t24 += v * b13;
	  t25 += v * b14;
	  t26 += v * b15;
	  v = a[12];
	  t12 += v * b0;
	  t13 += v * b1;
	  t14 += v * b2;
	  t15 += v * b3;
	  t16 += v * b4;
	  t17 += v * b5;
	  t18 += v * b6;
	  t19 += v * b7;
	  t20 += v * b8;
	  t21 += v * b9;
	  t22 += v * b10;
	  t23 += v * b11;
	  t24 += v * b12;
	  t25 += v * b13;
	  t26 += v * b14;
	  t27 += v * b15;
	  v = a[13];
	  t13 += v * b0;
	  t14 += v * b1;
	  t15 += v * b2;
	  t16 += v * b3;
	  t17 += v * b4;
	  t18 += v * b5;
	  t19 += v * b6;
	  t20 += v * b7;
	  t21 += v * b8;
	  t22 += v * b9;
	  t23 += v * b10;
	  t24 += v * b11;
	  t25 += v * b12;
	  t26 += v * b13;
	  t27 += v * b14;
	  t28 += v * b15;
	  v = a[14];
	  t14 += v * b0;
	  t15 += v * b1;
	  t16 += v * b2;
	  t17 += v * b3;
	  t18 += v * b4;
	  t19 += v * b5;
	  t20 += v * b6;
	  t21 += v * b7;
	  t22 += v * b8;
	  t23 += v * b9;
	  t24 += v * b10;
	  t25 += v * b11;
	  t26 += v * b12;
	  t27 += v * b13;
	  t28 += v * b14;
	  t29 += v * b15;
	  v = a[15];
	  t15 += v * b0;
	  t16 += v * b1;
	  t17 += v * b2;
	  t18 += v * b3;
	  t19 += v * b4;
	  t20 += v * b5;
	  t21 += v * b6;
	  t22 += v * b7;
	  t23 += v * b8;
	  t24 += v * b9;
	  t25 += v * b10;
	  t26 += v * b11;
	  t27 += v * b12;
	  t28 += v * b13;
	  t29 += v * b14;
	  t30 += v * b15;

	  t0  += 38 * t16;
	  t1  += 38 * t17;
	  t2  += 38 * t18;
	  t3  += 38 * t19;
	  t4  += 38 * t20;
	  t5  += 38 * t21;
	  t6  += 38 * t22;
	  t7  += 38 * t23;
	  t8  += 38 * t24;
	  t9  += 38 * t25;
	  t10 += 38 * t26;
	  t11 += 38 * t27;
	  t12 += 38 * t28;
	  t13 += 38 * t29;
	  t14 += 38 * t30;
	  // t15 left as is

	  // first car
	  c = 1;
	  v =  t0 + c + 65535; c = Math.floor(v / 65536);  t0 = v - c * 65536;
	  v =  t1 + c + 65535; c = Math.floor(v / 65536);  t1 = v - c * 65536;
	  v =  t2 + c + 65535; c = Math.floor(v / 65536);  t2 = v - c * 65536;
	  v =  t3 + c + 65535; c = Math.floor(v / 65536);  t3 = v - c * 65536;
	  v =  t4 + c + 65535; c = Math.floor(v / 65536);  t4 = v - c * 65536;
	  v =  t5 + c + 65535; c = Math.floor(v / 65536);  t5 = v - c * 65536;
	  v =  t6 + c + 65535; c = Math.floor(v / 65536);  t6 = v - c * 65536;
	  v =  t7 + c + 65535; c = Math.floor(v / 65536);  t7 = v - c * 65536;
	  v =  t8 + c + 65535; c = Math.floor(v / 65536);  t8 = v - c * 65536;
	  v =  t9 + c + 65535; c = Math.floor(v / 65536);  t9 = v - c * 65536;
	  v = t10 + c + 65535; c = Math.floor(v / 65536); t10 = v - c * 65536;
	  v = t11 + c + 65535; c = Math.floor(v / 65536); t11 = v - c * 65536;
	  v = t12 + c + 65535; c = Math.floor(v / 65536); t12 = v - c * 65536;
	  v = t13 + c + 65535; c = Math.floor(v / 65536); t13 = v - c * 65536;
	  v = t14 + c + 65535; c = Math.floor(v / 65536); t14 = v - c * 65536;
	  v = t15 + c + 65535; c = Math.floor(v / 65536); t15 = v - c * 65536;
	  t0 += c-1 + 37 * (c-1);

	  // second car
	  c = 1;
	  v =  t0 + c + 65535; c = Math.floor(v / 65536);  t0 = v - c * 65536;
	  v =  t1 + c + 65535; c = Math.floor(v / 65536);  t1 = v - c * 65536;
	  v =  t2 + c + 65535; c = Math.floor(v / 65536);  t2 = v - c * 65536;
	  v =  t3 + c + 65535; c = Math.floor(v / 65536);  t3 = v - c * 65536;
	  v =  t4 + c + 65535; c = Math.floor(v / 65536);  t4 = v - c * 65536;
	  v =  t5 + c + 65535; c = Math.floor(v / 65536);  t5 = v - c * 65536;
	  v =  t6 + c + 65535; c = Math.floor(v / 65536);  t6 = v - c * 65536;
	  v =  t7 + c + 65535; c = Math.floor(v / 65536);  t7 = v - c * 65536;
	  v =  t8 + c + 65535; c = Math.floor(v / 65536);  t8 = v - c * 65536;
	  v =  t9 + c + 65535; c = Math.floor(v / 65536);  t9 = v - c * 65536;
	  v = t10 + c + 65535; c = Math.floor(v / 65536); t10 = v - c * 65536;
	  v = t11 + c + 65535; c = Math.floor(v / 65536); t11 = v - c * 65536;
	  v = t12 + c + 65535; c = Math.floor(v / 65536); t12 = v - c * 65536;
	  v = t13 + c + 65535; c = Math.floor(v / 65536); t13 = v - c * 65536;
	  v = t14 + c + 65535; c = Math.floor(v / 65536); t14 = v - c * 65536;
	  v = t15 + c + 65535; c = Math.floor(v / 65536); t15 = v - c * 65536;
	  t0 += c-1 + 37 * (c-1);

	  o[ 0] = t0;
	  o[ 1] = t1;
	  o[ 2] = t2;
	  o[ 3] = t3;
	  o[ 4] = t4;
	  o[ 5] = t5;
	  o[ 6] = t6;
	  o[ 7] = t7;
	  o[ 8] = t8;
	  o[ 9] = t9;
	  o[10] = t10;
	  o[11] = t11;
	  o[12] = t12;
	  o[13] = t13;
	  o[14] = t14;
	  o[15] = t15;
	}

	function S(o, a) {
	  M(o, a, a);
	}

	function inv25519(o, i) {
	  var c = gf();
	  var a;
	  for (a = 0; a < 16; a++) c[a] = i[a];
	  for (a = 253; a >= 0; a--) {
	    S(c, c);
	    if(a !== 2 && a !== 4) M(c, c, i);
	  }
	  for (a = 0; a < 16; a++) o[a] = c[a];
	}

	function pow2523(o, i) {
	  var c = gf();
	  var a;
	  for (a = 0; a < 16; a++) c[a] = i[a];
	  for (a = 250; a >= 0; a--) {
	      S(c, c);
	      if(a !== 1) M(c, c, i);
	  }
	  for (a = 0; a < 16; a++) o[a] = c[a];
	}

	function crypto_scalarmult(q, n, p) {
	  var z = new Uint8Array(32);
	  var x = new Float64Array(80), r, i;
	  var a = gf(), b = gf(), c = gf(),
	      d = gf(), e = gf(), f = gf();
	  for (i = 0; i < 31; i++) z[i] = n[i];
	  z[31]=(n[31]&127)|64;
	  z[0]&=248;
	  unpack25519(x,p);
	  for (i = 0; i < 16; i++) {
	    b[i]=x[i];
	    d[i]=a[i]=c[i]=0;
	  }
	  a[0]=d[0]=1;
	  for (i=254; i>=0; --i) {
	    r=(z[i>>>3]>>>(i&7))&1;
	    sel25519(a,b,r);
	    sel25519(c,d,r);
	    A(e,a,c);
	    Z(a,a,c);
	    A(c,b,d);
	    Z(b,b,d);
	    S(d,e);
	    S(f,a);
	    M(a,c,a);
	    M(c,b,e);
	    A(e,a,c);
	    Z(a,a,c);
	    S(b,a);
	    Z(c,d,f);
	    M(a,c,_121665);
	    A(a,a,d);
	    M(c,c,a);
	    M(a,d,f);
	    M(d,b,x);
	    S(b,e);
	    sel25519(a,b,r);
	    sel25519(c,d,r);
	  }
	  for (i = 0; i < 16; i++) {
	    x[i+16]=a[i];
	    x[i+32]=c[i];
	    x[i+48]=b[i];
	    x[i+64]=d[i];
	  }
	  var x32 = x.subarray(32);
	  var x16 = x.subarray(16);
	  inv25519(x32,x32);
	  M(x16,x16,x32);
	  pack25519(q,x16);
	  return 0;
	}

	function crypto_scalarmult_base(q, n) {
	  return crypto_scalarmult(q, n, _9);
	}

	function crypto_box_keypair(y, x) {
	  randombytes(x, 32);
	  return crypto_scalarmult_base(y, x);
	}

	function crypto_box_beforenm(k, y, x) {
	  var s = new Uint8Array(32);
	  crypto_scalarmult(s, x, y);
	  return crypto_core_hsalsa20(k, _0, s, sigma);
	}

	var crypto_box_afternm = crypto_secretbox;
	var crypto_box_open_afternm = crypto_secretbox_open;

	function crypto_box(c, m, d, n, y, x) {
	  var k = new Uint8Array(32);
	  crypto_box_beforenm(k, y, x);
	  return crypto_box_afternm(c, m, d, n, k);
	}

	function crypto_box_open(m, c, d, n, y, x) {
	  var k = new Uint8Array(32);
	  crypto_box_beforenm(k, y, x);
	  return crypto_box_open_afternm(m, c, d, n, k);
	}

	var K = [
	  0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd,
	  0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
	  0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019,
	  0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
	  0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe,
	  0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
	  0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1,
	  0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
	  0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3,
	  0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
	  0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483,
	  0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
	  0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210,
	  0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
	  0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725,
	  0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
	  0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926,
	  0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
	  0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8,
	  0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
	  0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001,
	  0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
	  0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910,
	  0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
	  0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53,
	  0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
	  0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb,
	  0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
	  0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60,
	  0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
	  0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9,
	  0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
	  0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207,
	  0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
	  0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6,
	  0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
	  0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493,
	  0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
	  0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a,
	  0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
	];

	function crypto_hashblocks_hl(hh, hl, m, n) {
	  var wh = new Int32Array(16), wl = new Int32Array(16),
	      bh0, bh1, bh2, bh3, bh4, bh5, bh6, bh7,
	      bl0, bl1, bl2, bl3, bl4, bl5, bl6, bl7,
	      th, tl, i, j, h, l, a, b, c, d;

	  var ah0 = hh[0],
	      ah1 = hh[1],
	      ah2 = hh[2],
	      ah3 = hh[3],
	      ah4 = hh[4],
	      ah5 = hh[5],
	      ah6 = hh[6],
	      ah7 = hh[7],

	      al0 = hl[0],
	      al1 = hl[1],
	      al2 = hl[2],
	      al3 = hl[3],
	      al4 = hl[4],
	      al5 = hl[5],
	      al6 = hl[6],
	      al7 = hl[7];

	  var pos = 0;
	  while (n >= 128) {
	    for (i = 0; i < 16; i++) {
	      j = 8 * i + pos;
	      wh[i] = (m[j+0] << 24) | (m[j+1] << 16) | (m[j+2] << 8) | m[j+3];
	      wl[i] = (m[j+4] << 24) | (m[j+5] << 16) | (m[j+6] << 8) | m[j+7];
	    }
	    for (i = 0; i < 80; i++) {
	      bh0 = ah0;
	      bh1 = ah1;
	      bh2 = ah2;
	      bh3 = ah3;
	      bh4 = ah4;
	      bh5 = ah5;
	      bh6 = ah6;
	      bh7 = ah7;

	      bl0 = al0;
	      bl1 = al1;
	      bl2 = al2;
	      bl3 = al3;
	      bl4 = al4;
	      bl5 = al5;
	      bl6 = al6;
	      bl7 = al7;

	      // add
	      h = ah7;
	      l = al7;

	      a = l & 0xffff; b = l >>> 16;
	      c = h & 0xffff; d = h >>> 16;

	      // Sigma1
	      h = ((ah4 >>> 14) | (al4 << (32-14))) ^ ((ah4 >>> 18) | (al4 << (32-18))) ^ ((al4 >>> (41-32)) | (ah4 << (32-(41-32))));
	      l = ((al4 >>> 14) | (ah4 << (32-14))) ^ ((al4 >>> 18) | (ah4 << (32-18))) ^ ((ah4 >>> (41-32)) | (al4 << (32-(41-32))));

	      a += l & 0xffff; b += l >>> 16;
	      c += h & 0xffff; d += h >>> 16;

	      // Ch
	      h = (ah4 & ah5) ^ (~ah4 & ah6);
	      l = (al4 & al5) ^ (~al4 & al6);

	      a += l & 0xffff; b += l >>> 16;
	      c += h & 0xffff; d += h >>> 16;

	      // K
	      h = K[i*2];
	      l = K[i*2+1];

	      a += l & 0xffff; b += l >>> 16;
	      c += h & 0xffff; d += h >>> 16;

	      // w
	      h = wh[i%16];
	      l = wl[i%16];

	      a += l & 0xffff; b += l >>> 16;
	      c += h & 0xffff; d += h >>> 16;

	      b += a >>> 16;
	      c += b >>> 16;
	      d += c >>> 16;

	      th = c & 0xffff | d << 16;
	      tl = a & 0xffff | b << 16;

	      // add
	      h = th;
	      l = tl;

	      a = l & 0xffff; b = l >>> 16;
	      c = h & 0xffff; d = h >>> 16;

	      // Sigma0
	      h = ((ah0 >>> 28) | (al0 << (32-28))) ^ ((al0 >>> (34-32)) | (ah0 << (32-(34-32)))) ^ ((al0 >>> (39-32)) | (ah0 << (32-(39-32))));
	      l = ((al0 >>> 28) | (ah0 << (32-28))) ^ ((ah0 >>> (34-32)) | (al0 << (32-(34-32)))) ^ ((ah0 >>> (39-32)) | (al0 << (32-(39-32))));

	      a += l & 0xffff; b += l >>> 16;
	      c += h & 0xffff; d += h >>> 16;

	      // Maj
	      h = (ah0 & ah1) ^ (ah0 & ah2) ^ (ah1 & ah2);
	      l = (al0 & al1) ^ (al0 & al2) ^ (al1 & al2);

	      a += l & 0xffff; b += l >>> 16;
	      c += h & 0xffff; d += h >>> 16;

	      b += a >>> 16;
	      c += b >>> 16;
	      d += c >>> 16;

	      bh7 = (c & 0xffff) | (d << 16);
	      bl7 = (a & 0xffff) | (b << 16);

	      // add
	      h = bh3;
	      l = bl3;

	      a = l & 0xffff; b = l >>> 16;
	      c = h & 0xffff; d = h >>> 16;

	      h = th;
	      l = tl;

	      a += l & 0xffff; b += l >>> 16;
	      c += h & 0xffff; d += h >>> 16;

	      b += a >>> 16;
	      c += b >>> 16;
	      d += c >>> 16;

	      bh3 = (c & 0xffff) | (d << 16);
	      bl3 = (a & 0xffff) | (b << 16);

	      ah1 = bh0;
	      ah2 = bh1;
	      ah3 = bh2;
	      ah4 = bh3;
	      ah5 = bh4;
	      ah6 = bh5;
	      ah7 = bh6;
	      ah0 = bh7;

	      al1 = bl0;
	      al2 = bl1;
	      al3 = bl2;
	      al4 = bl3;
	      al5 = bl4;
	      al6 = bl5;
	      al7 = bl6;
	      al0 = bl7;

	      if (i%16 === 15) {
	        for (j = 0; j < 16; j++) {
	          // add
	          h = wh[j];
	          l = wl[j];

	          a = l & 0xffff; b = l >>> 16;
	          c = h & 0xffff; d = h >>> 16;

	          h = wh[(j+9)%16];
	          l = wl[(j+9)%16];

	          a += l & 0xffff; b += l >>> 16;
	          c += h & 0xffff; d += h >>> 16;

	          // sigma0
	          th = wh[(j+1)%16];
	          tl = wl[(j+1)%16];
	          h = ((th >>> 1) | (tl << (32-1))) ^ ((th >>> 8) | (tl << (32-8))) ^ (th >>> 7);
	          l = ((tl >>> 1) | (th << (32-1))) ^ ((tl >>> 8) | (th << (32-8))) ^ ((tl >>> 7) | (th << (32-7)));

	          a += l & 0xffff; b += l >>> 16;
	          c += h & 0xffff; d += h >>> 16;

	          // sigma1
	          th = wh[(j+14)%16];
	          tl = wl[(j+14)%16];
	          h = ((th >>> 19) | (tl << (32-19))) ^ ((tl >>> (61-32)) | (th << (32-(61-32)))) ^ (th >>> 6);
	          l = ((tl >>> 19) | (th << (32-19))) ^ ((th >>> (61-32)) | (tl << (32-(61-32)))) ^ ((tl >>> 6) | (th << (32-6)));

	          a += l & 0xffff; b += l >>> 16;
	          c += h & 0xffff; d += h >>> 16;

	          b += a >>> 16;
	          c += b >>> 16;
	          d += c >>> 16;

	          wh[j] = (c & 0xffff) | (d << 16);
	          wl[j] = (a & 0xffff) | (b << 16);
	        }
	      }
	    }

	    // add
	    h = ah0;
	    l = al0;

	    a = l & 0xffff; b = l >>> 16;
	    c = h & 0xffff; d = h >>> 16;

	    h = hh[0];
	    l = hl[0];

	    a += l & 0xffff; b += l >>> 16;
	    c += h & 0xffff; d += h >>> 16;

	    b += a >>> 16;
	    c += b >>> 16;
	    d += c >>> 16;

	    hh[0] = ah0 = (c & 0xffff) | (d << 16);
	    hl[0] = al0 = (a & 0xffff) | (b << 16);

	    h = ah1;
	    l = al1;

	    a = l & 0xffff; b = l >>> 16;
	    c = h & 0xffff; d = h >>> 16;

	    h = hh[1];
	    l = hl[1];

	    a += l & 0xffff; b += l >>> 16;
	    c += h & 0xffff; d += h >>> 16;

	    b += a >>> 16;
	    c += b >>> 16;
	    d += c >>> 16;

	    hh[1] = ah1 = (c & 0xffff) | (d << 16);
	    hl[1] = al1 = (a & 0xffff) | (b << 16);

	    h = ah2;
	    l = al2;

	    a = l & 0xffff; b = l >>> 16;
	    c = h & 0xffff; d = h >>> 16;

	    h = hh[2];
	    l = hl[2];

	    a += l & 0xffff; b += l >>> 16;
	    c += h & 0xffff; d += h >>> 16;

	    b += a >>> 16;
	    c += b >>> 16;
	    d += c >>> 16;

	    hh[2] = ah2 = (c & 0xffff) | (d << 16);
	    hl[2] = al2 = (a & 0xffff) | (b << 16);

	    h = ah3;
	    l = al3;

	    a = l & 0xffff; b = l >>> 16;
	    c = h & 0xffff; d = h >>> 16;

	    h = hh[3];
	    l = hl[3];

	    a += l & 0xffff; b += l >>> 16;
	    c += h & 0xffff; d += h >>> 16;

	    b += a >>> 16;
	    c += b >>> 16;
	    d += c >>> 16;

	    hh[3] = ah3 = (c & 0xffff) | (d << 16);
	    hl[3] = al3 = (a & 0xffff) | (b << 16);

	    h = ah4;
	    l = al4;

	    a = l & 0xffff; b = l >>> 16;
	    c = h & 0xffff; d = h >>> 16;

	    h = hh[4];
	    l = hl[4];

	    a += l & 0xffff; b += l >>> 16;
	    c += h & 0xffff; d += h >>> 16;

	    b += a >>> 16;
	    c += b >>> 16;
	    d += c >>> 16;

	    hh[4] = ah4 = (c & 0xffff) | (d << 16);
	    hl[4] = al4 = (a & 0xffff) | (b << 16);

	    h = ah5;
	    l = al5;

	    a = l & 0xffff; b = l >>> 16;
	    c = h & 0xffff; d = h >>> 16;

	    h = hh[5];
	    l = hl[5];

	    a += l & 0xffff; b += l >>> 16;
	    c += h & 0xffff; d += h >>> 16;

	    b += a >>> 16;
	    c += b >>> 16;
	    d += c >>> 16;

	    hh[5] = ah5 = (c & 0xffff) | (d << 16);
	    hl[5] = al5 = (a & 0xffff) | (b << 16);

	    h = ah6;
	    l = al6;

	    a = l & 0xffff; b = l >>> 16;
	    c = h & 0xffff; d = h >>> 16;

	    h = hh[6];
	    l = hl[6];

	    a += l & 0xffff; b += l >>> 16;
	    c += h & 0xffff; d += h >>> 16;

	    b += a >>> 16;
	    c += b >>> 16;
	    d += c >>> 16;

	    hh[6] = ah6 = (c & 0xffff) | (d << 16);
	    hl[6] = al6 = (a & 0xffff) | (b << 16);

	    h = ah7;
	    l = al7;

	    a = l & 0xffff; b = l >>> 16;
	    c = h & 0xffff; d = h >>> 16;

	    h = hh[7];
	    l = hl[7];

	    a += l & 0xffff; b += l >>> 16;
	    c += h & 0xffff; d += h >>> 16;

	    b += a >>> 16;
	    c += b >>> 16;
	    d += c >>> 16;

	    hh[7] = ah7 = (c & 0xffff) | (d << 16);
	    hl[7] = al7 = (a & 0xffff) | (b << 16);

	    pos += 128;
	    n -= 128;
	  }

	  return n;
	}

	function crypto_hash(out, m, n) {
	  var hh = new Int32Array(8),
	      hl = new Int32Array(8),
	      x = new Uint8Array(256),
	      i, b = n;

	  hh[0] = 0x6a09e667;
	  hh[1] = 0xbb67ae85;
	  hh[2] = 0x3c6ef372;
	  hh[3] = 0xa54ff53a;
	  hh[4] = 0x510e527f;
	  hh[5] = 0x9b05688c;
	  hh[6] = 0x1f83d9ab;
	  hh[7] = 0x5be0cd19;

	  hl[0] = 0xf3bcc908;
	  hl[1] = 0x84caa73b;
	  hl[2] = 0xfe94f82b;
	  hl[3] = 0x5f1d36f1;
	  hl[4] = 0xade682d1;
	  hl[5] = 0x2b3e6c1f;
	  hl[6] = 0xfb41bd6b;
	  hl[7] = 0x137e2179;

	  crypto_hashblocks_hl(hh, hl, m, n);
	  n %= 128;

	  for (i = 0; i < n; i++) x[i] = m[b-n+i];
	  x[n] = 128;

	  n = 256-128*(n<112?1:0);
	  x[n-9] = 0;
	  ts64(x, n-8,  (b / 0x20000000) | 0, b << 3);
	  crypto_hashblocks_hl(hh, hl, x, n);

	  for (i = 0; i < 8; i++) ts64(out, 8*i, hh[i], hl[i]);

	  return 0;
	}

	function add(p, q) {
	  var a = gf(), b = gf(), c = gf(),
	      d = gf(), e = gf(), f = gf(),
	      g = gf(), h = gf(), t = gf();

	  Z(a, p[1], p[0]);
	  Z(t, q[1], q[0]);
	  M(a, a, t);
	  A(b, p[0], p[1]);
	  A(t, q[0], q[1]);
	  M(b, b, t);
	  M(c, p[3], q[3]);
	  M(c, c, D2);
	  M(d, p[2], q[2]);
	  A(d, d, d);
	  Z(e, b, a);
	  Z(f, d, c);
	  A(g, d, c);
	  A(h, b, a);

	  M(p[0], e, f);
	  M(p[1], h, g);
	  M(p[2], g, f);
	  M(p[3], e, h);
	}

	function cswap(p, q, b) {
	  var i;
	  for (i = 0; i < 4; i++) {
	    sel25519(p[i], q[i], b);
	  }
	}

	function pack(r, p) {
	  var tx = gf(), ty = gf(), zi = gf();
	  inv25519(zi, p[2]);
	  M(tx, p[0], zi);
	  M(ty, p[1], zi);
	  pack25519(r, ty);
	  r[31] ^= par25519(tx) << 7;
	}

	function scalarmult(p, q, s) {
	  var b, i;
	  set25519(p[0], gf0);
	  set25519(p[1], gf1);
	  set25519(p[2], gf1);
	  set25519(p[3], gf0);
	  for (i = 255; i >= 0; --i) {
	    b = (s[(i/8)|0] >> (i&7)) & 1;
	    cswap(p, q, b);
	    add(q, p);
	    add(p, p);
	    cswap(p, q, b);
	  }
	}

	function scalarbase(p, s) {
	  var q = [gf(), gf(), gf(), gf()];
	  set25519(q[0], X);
	  set25519(q[1], Y);
	  set25519(q[2], gf1);
	  M(q[3], X, Y);
	  scalarmult(p, q, s);
	}

	function crypto_sign_keypair(pk, sk, seeded) {
	  var d = new Uint8Array(64);
	  var p = [gf(), gf(), gf(), gf()];
	  var i;

	  if (!seeded) randombytes(sk, 32);
	  crypto_hash(d, sk, 32);
	  d[0] &= 248;
	  d[31] &= 127;
	  d[31] |= 64;

	  scalarbase(p, d);
	  pack(pk, p);

	  for (i = 0; i < 32; i++) sk[i+32] = pk[i];
	  return 0;
	}

	var L = new Float64Array([0xed, 0xd3, 0xf5, 0x5c, 0x1a, 0x63, 0x12, 0x58, 0xd6, 0x9c, 0xf7, 0xa2, 0xde, 0xf9, 0xde, 0x14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x10]);

	function modL(r, x) {
	  var carry, i, j, k;
	  for (i = 63; i >= 32; --i) {
	    carry = 0;
	    for (j = i - 32, k = i - 12; j < k; ++j) {
	      x[j] += carry - 16 * x[i] * L[j - (i - 32)];
	      carry = Math.floor((x[j] + 128) / 256);
	      x[j] -= carry * 256;
	    }
	    x[j] += carry;
	    x[i] = 0;
	  }
	  carry = 0;
	  for (j = 0; j < 32; j++) {
	    x[j] += carry - (x[31] >> 4) * L[j];
	    carry = x[j] >> 8;
	    x[j] &= 255;
	  }
	  for (j = 0; j < 32; j++) x[j] -= carry * L[j];
	  for (i = 0; i < 32; i++) {
	    x[i+1] += x[i] >> 8;
	    r[i] = x[i] & 255;
	  }
	}

	function reduce(r) {
	  var x = new Float64Array(64), i;
	  for (i = 0; i < 64; i++) x[i] = r[i];
	  for (i = 0; i < 64; i++) r[i] = 0;
	  modL(r, x);
	}

	// Note: difference from C - smlen returned, not passed as argument.
	function crypto_sign(sm, m, n, sk) {
	  var d = new Uint8Array(64), h = new Uint8Array(64), r = new Uint8Array(64);
	  var i, j, x = new Float64Array(64);
	  var p = [gf(), gf(), gf(), gf()];

	  crypto_hash(d, sk, 32);
	  d[0] &= 248;
	  d[31] &= 127;
	  d[31] |= 64;

	  var smlen = n + 64;
	  for (i = 0; i < n; i++) sm[64 + i] = m[i];
	  for (i = 0; i < 32; i++) sm[32 + i] = d[32 + i];

	  crypto_hash(r, sm.subarray(32), n+32);
	  reduce(r);
	  scalarbase(p, r);
	  pack(sm, p);

	  for (i = 32; i < 64; i++) sm[i] = sk[i];
	  crypto_hash(h, sm, n + 64);
	  reduce(h);

	  for (i = 0; i < 64; i++) x[i] = 0;
	  for (i = 0; i < 32; i++) x[i] = r[i];
	  for (i = 0; i < 32; i++) {
	    for (j = 0; j < 32; j++) {
	      x[i+j] += h[i] * d[j];
	    }
	  }

	  modL(sm.subarray(32), x);
	  return smlen;
	}

	function unpackneg(r, p) {
	  var t = gf(), chk = gf(), num = gf(),
	      den = gf(), den2 = gf(), den4 = gf(),
	      den6 = gf();

	  set25519(r[2], gf1);
	  unpack25519(r[1], p);
	  S(num, r[1]);
	  M(den, num, D);
	  Z(num, num, r[2]);
	  A(den, r[2], den);

	  S(den2, den);
	  S(den4, den2);
	  M(den6, den4, den2);
	  M(t, den6, num);
	  M(t, t, den);

	  pow2523(t, t);
	  M(t, t, num);
	  M(t, t, den);
	  M(t, t, den);
	  M(r[0], t, den);

	  S(chk, r[0]);
	  M(chk, chk, den);
	  if (neq25519(chk, num)) M(r[0], r[0], I);

	  S(chk, r[0]);
	  M(chk, chk, den);
	  if (neq25519(chk, num)) return -1;

	  if (par25519(r[0]) === (p[31]>>7)) Z(r[0], gf0, r[0]);

	  M(r[3], r[0], r[1]);
	  return 0;
	}

	function crypto_sign_open(m, sm, n, pk) {
	  var i;
	  var t = new Uint8Array(32), h = new Uint8Array(64);
	  var p = [gf(), gf(), gf(), gf()],
	      q = [gf(), gf(), gf(), gf()];

	  if (n < 64) return -1;

	  if (unpackneg(q, pk)) return -1;

	  for (i = 0; i < n; i++) m[i] = sm[i];
	  for (i = 0; i < 32; i++) m[i+32] = pk[i];
	  crypto_hash(h, m, n);
	  reduce(h);
	  scalarmult(p, q, h);

	  scalarbase(q, sm.subarray(32));
	  add(p, q);
	  pack(t, p);

	  n -= 64;
	  if (crypto_verify_32(sm, 0, t, 0)) {
	    for (i = 0; i < n; i++) m[i] = 0;
	    return -1;
	  }

	  for (i = 0; i < n; i++) m[i] = sm[i + 64];
	  return n;
	}

	var crypto_secretbox_KEYBYTES = 32,
	    crypto_secretbox_NONCEBYTES = 24,
	    crypto_secretbox_ZEROBYTES = 32,
	    crypto_secretbox_BOXZEROBYTES = 16,
	    crypto_scalarmult_BYTES = 32,
	    crypto_scalarmult_SCALARBYTES = 32,
	    crypto_box_PUBLICKEYBYTES = 32,
	    crypto_box_SECRETKEYBYTES = 32,
	    crypto_box_BEFORENMBYTES = 32,
	    crypto_box_NONCEBYTES = crypto_secretbox_NONCEBYTES,
	    crypto_box_ZEROBYTES = crypto_secretbox_ZEROBYTES,
	    crypto_box_BOXZEROBYTES = crypto_secretbox_BOXZEROBYTES,
	    crypto_sign_BYTES = 64,
	    crypto_sign_PUBLICKEYBYTES = 32,
	    crypto_sign_SECRETKEYBYTES = 64,
	    crypto_sign_SEEDBYTES = 32,
	    crypto_hash_BYTES = 64;

	nacl.lowlevel = {
	  crypto_core_hsalsa20: crypto_core_hsalsa20,
	  crypto_stream_xor: crypto_stream_xor,
	  crypto_stream: crypto_stream,
	  crypto_stream_salsa20_xor: crypto_stream_salsa20_xor,
	  crypto_stream_salsa20: crypto_stream_salsa20,
	  crypto_onetimeauth: crypto_onetimeauth,
	  crypto_onetimeauth_verify: crypto_onetimeauth_verify,
	  crypto_verify_16: crypto_verify_16,
	  crypto_verify_32: crypto_verify_32,
	  crypto_secretbox: crypto_secretbox,
	  crypto_secretbox_open: crypto_secretbox_open,
	  crypto_scalarmult: crypto_scalarmult,
	  crypto_scalarmult_base: crypto_scalarmult_base,
	  crypto_box_beforenm: crypto_box_beforenm,
	  crypto_box_afternm: crypto_box_afternm,
	  crypto_box: crypto_box,
	  crypto_box_open: crypto_box_open,
	  crypto_box_keypair: crypto_box_keypair,
	  crypto_hash: crypto_hash,
	  crypto_sign: crypto_sign,
	  crypto_sign_keypair: crypto_sign_keypair,
	  crypto_sign_open: crypto_sign_open,

	  crypto_secretbox_KEYBYTES: crypto_secretbox_KEYBYTES,
	  crypto_secretbox_NONCEBYTES: crypto_secretbox_NONCEBYTES,
	  crypto_secretbox_ZEROBYTES: crypto_secretbox_ZEROBYTES,
	  crypto_secretbox_BOXZEROBYTES: crypto_secretbox_BOXZEROBYTES,
	  crypto_scalarmult_BYTES: crypto_scalarmult_BYTES,
	  crypto_scalarmult_SCALARBYTES: crypto_scalarmult_SCALARBYTES,
	  crypto_box_PUBLICKEYBYTES: crypto_box_PUBLICKEYBYTES,
	  crypto_box_SECRETKEYBYTES: crypto_box_SECRETKEYBYTES,
	  crypto_box_BEFORENMBYTES: crypto_box_BEFORENMBYTES,
	  crypto_box_NONCEBYTES: crypto_box_NONCEBYTES,
	  crypto_box_ZEROBYTES: crypto_box_ZEROBYTES,
	  crypto_box_BOXZEROBYTES: crypto_box_BOXZEROBYTES,
	  crypto_sign_BYTES: crypto_sign_BYTES,
	  crypto_sign_PUBLICKEYBYTES: crypto_sign_PUBLICKEYBYTES,
	  crypto_sign_SECRETKEYBYTES: crypto_sign_SECRETKEYBYTES,
	  crypto_sign_SEEDBYTES: crypto_sign_SEEDBYTES,
	  crypto_hash_BYTES: crypto_hash_BYTES,

	  gf: gf,
	  D: D,
	  L: L,
	  pack25519: pack25519,
	  unpack25519: unpack25519,
	  M: M,
	  A: A,
	  S: S,
	  Z: Z,
	  pow2523: pow2523,
	  add: add,
	  set25519: set25519,
	  modL: modL,
	  scalarmult: scalarmult,
	  scalarbase: scalarbase,
	};

	/* High-level API */

	function checkLengths(k, n) {
	  if (k.length !== crypto_secretbox_KEYBYTES) throw new Error('bad key size');
	  if (n.length !== crypto_secretbox_NONCEBYTES) throw new Error('bad nonce size');
	}

	function checkBoxLengths(pk, sk) {
	  if (pk.length !== crypto_box_PUBLICKEYBYTES) throw new Error('bad public key size');
	  if (sk.length !== crypto_box_SECRETKEYBYTES) throw new Error('bad secret key size');
	}

	function checkArrayTypes() {
	  for (var i = 0; i < arguments.length; i++) {
	    if (!(arguments[i] instanceof Uint8Array))
	      throw new TypeError('unexpected type, use Uint8Array');
	  }
	}

	function cleanup(arr) {
	  for (var i = 0; i < arr.length; i++) arr[i] = 0;
	}

	nacl.randomBytes = function(n) {
	  var b = new Uint8Array(n);
	  randombytes(b, n);
	  return b;
	};

	nacl.secretbox = function(msg, nonce, key) {
	  checkArrayTypes(msg, nonce, key);
	  checkLengths(key, nonce);
	  var m = new Uint8Array(crypto_secretbox_ZEROBYTES + msg.length);
	  var c = new Uint8Array(m.length);
	  for (var i = 0; i < msg.length; i++) m[i+crypto_secretbox_ZEROBYTES] = msg[i];
	  crypto_secretbox(c, m, m.length, nonce, key);
	  return c.subarray(crypto_secretbox_BOXZEROBYTES);
	};

	nacl.secretbox.open = function(box, nonce, key) {
	  checkArrayTypes(box, nonce, key);
	  checkLengths(key, nonce);
	  var c = new Uint8Array(crypto_secretbox_BOXZEROBYTES + box.length);
	  var m = new Uint8Array(c.length);
	  for (var i = 0; i < box.length; i++) c[i+crypto_secretbox_BOXZEROBYTES] = box[i];
	  if (c.length < 32) return null;
	  if (crypto_secretbox_open(m, c, c.length, nonce, key) !== 0) return null;
	  return m.subarray(crypto_secretbox_ZEROBYTES);
	};

	nacl.secretbox.keyLength = crypto_secretbox_KEYBYTES;
	nacl.secretbox.nonceLength = crypto_secretbox_NONCEBYTES;
	nacl.secretbox.overheadLength = crypto_secretbox_BOXZEROBYTES;

	nacl.scalarMult = function(n, p) {
	  checkArrayTypes(n, p);
	  if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error('bad n size');
	  if (p.length !== crypto_scalarmult_BYTES) throw new Error('bad p size');
	  var q = new Uint8Array(crypto_scalarmult_BYTES);
	  crypto_scalarmult(q, n, p);
	  return q;
	};

	nacl.scalarMult.base = function(n) {
	  checkArrayTypes(n);
	  if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error('bad n size');
	  var q = new Uint8Array(crypto_scalarmult_BYTES);
	  crypto_scalarmult_base(q, n);
	  return q;
	};

	nacl.scalarMult.scalarLength = crypto_scalarmult_SCALARBYTES;
	nacl.scalarMult.groupElementLength = crypto_scalarmult_BYTES;

	nacl.box = function(msg, nonce, publicKey, secretKey) {
	  var k = nacl.box.before(publicKey, secretKey);
	  return nacl.secretbox(msg, nonce, k);
	};

	nacl.box.before = function(publicKey, secretKey) {
	  checkArrayTypes(publicKey, secretKey);
	  checkBoxLengths(publicKey, secretKey);
	  var k = new Uint8Array(crypto_box_BEFORENMBYTES);
	  crypto_box_beforenm(k, publicKey, secretKey);
	  return k;
	};

	nacl.box.after = nacl.secretbox;

	nacl.box.open = function(msg, nonce, publicKey, secretKey) {
	  var k = nacl.box.before(publicKey, secretKey);
	  return nacl.secretbox.open(msg, nonce, k);
	};

	nacl.box.open.after = nacl.secretbox.open;

	nacl.box.keyPair = function() {
	  var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
	  var sk = new Uint8Array(crypto_box_SECRETKEYBYTES);
	  crypto_box_keypair(pk, sk);
	  return {publicKey: pk, secretKey: sk};
	};

	nacl.box.keyPair.fromSecretKey = function(secretKey) {
	  checkArrayTypes(secretKey);
	  if (secretKey.length !== crypto_box_SECRETKEYBYTES)
	    throw new Error('bad secret key size');
	  var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
	  crypto_scalarmult_base(pk, secretKey);
	  return {publicKey: pk, secretKey: new Uint8Array(secretKey)};
	};

	nacl.box.publicKeyLength = crypto_box_PUBLICKEYBYTES;
	nacl.box.secretKeyLength = crypto_box_SECRETKEYBYTES;
	nacl.box.sharedKeyLength = crypto_box_BEFORENMBYTES;
	nacl.box.nonceLength = crypto_box_NONCEBYTES;
	nacl.box.overheadLength = nacl.secretbox.overheadLength;

	nacl.sign = function(msg, secretKey) {
	  checkArrayTypes(msg, secretKey);
	  if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
	    throw new Error('bad secret key size');
	  var signedMsg = new Uint8Array(crypto_sign_BYTES+msg.length);
	  crypto_sign(signedMsg, msg, msg.length, secretKey);
	  return signedMsg;
	};

	nacl.sign.open = function(signedMsg, publicKey) {
	  checkArrayTypes(signedMsg, publicKey);
	  if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
	    throw new Error('bad public key size');
	  var tmp = new Uint8Array(signedMsg.length);
	  var mlen = crypto_sign_open(tmp, signedMsg, signedMsg.length, publicKey);
	  if (mlen < 0) return null;
	  var m = new Uint8Array(mlen);
	  for (var i = 0; i < m.length; i++) m[i] = tmp[i];
	  return m;
	};

	nacl.sign.detached = function(msg, secretKey) {
	  var signedMsg = nacl.sign(msg, secretKey);
	  var sig = new Uint8Array(crypto_sign_BYTES);
	  for (var i = 0; i < sig.length; i++) sig[i] = signedMsg[i];
	  return sig;
	};

	nacl.sign.detached.verify = function(msg, sig, publicKey) {
	  checkArrayTypes(msg, sig, publicKey);
	  if (sig.length !== crypto_sign_BYTES)
	    throw new Error('bad signature size');
	  if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
	    throw new Error('bad public key size');
	  var sm = new Uint8Array(crypto_sign_BYTES + msg.length);
	  var m = new Uint8Array(crypto_sign_BYTES + msg.length);
	  var i;
	  for (i = 0; i < crypto_sign_BYTES; i++) sm[i] = sig[i];
	  for (i = 0; i < msg.length; i++) sm[i+crypto_sign_BYTES] = msg[i];
	  return (crypto_sign_open(m, sm, sm.length, publicKey) >= 0);
	};

	nacl.sign.keyPair = function() {
	  var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
	  var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
	  crypto_sign_keypair(pk, sk);
	  return {publicKey: pk, secretKey: sk};
	};

	nacl.sign.keyPair.fromSecretKey = function(secretKey) {
	  checkArrayTypes(secretKey);
	  if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
	    throw new Error('bad secret key size');
	  var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
	  for (var i = 0; i < pk.length; i++) pk[i] = secretKey[32+i];
	  return {publicKey: pk, secretKey: new Uint8Array(secretKey)};
	};

	nacl.sign.keyPair.fromSeed = function(seed) {
	  checkArrayTypes(seed);
	  if (seed.length !== crypto_sign_SEEDBYTES)
	    throw new Error('bad seed size');
	  var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
	  var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
	  for (var i = 0; i < 32; i++) sk[i] = seed[i];
	  crypto_sign_keypair(pk, sk, true);
	  return {publicKey: pk, secretKey: sk};
	};

	nacl.sign.publicKeyLength = crypto_sign_PUBLICKEYBYTES;
	nacl.sign.secretKeyLength = crypto_sign_SECRETKEYBYTES;
	nacl.sign.seedLength = crypto_sign_SEEDBYTES;
	nacl.sign.signatureLength = crypto_sign_BYTES;

	nacl.hash = function(msg) {
	  checkArrayTypes(msg);
	  var h = new Uint8Array(crypto_hash_BYTES);
	  crypto_hash(h, msg, msg.length);
	  return h;
	};

	nacl.hash.hashLength = crypto_hash_BYTES;

	nacl.verify = function(x, y) {
	  checkArrayTypes(x, y);
	  // Zero length arguments are considered not equal.
	  if (x.length === 0 || y.length === 0) return false;
	  if (x.length !== y.length) return false;
	  return (vn(x, 0, y, 0, x.length) === 0) ? true : false;
	};

	nacl.setPRNG = function(fn) {
	  randombytes = fn;
	};

	(function() {
	  // Initialize PRNG if environment provides CSPRNG.
	  // If not, methods calling randombytes will throw.
	  var crypto = typeof self !== 'undefined' ? (self.crypto || self.msCrypto) : null;
	  if (crypto && crypto.getRandomValues) {
	    // Browsers.
	    var QUOTA = 65536;
	    nacl.setPRNG(function(x, n) {
	      var i, v = new Uint8Array(n);
	      for (i = 0; i < n; i += QUOTA) {
	        crypto.getRandomValues(v.subarray(i, i + Math.min(n - i, QUOTA)));
	      }
	      for (i = 0; i < n; i++) x[i] = v[i];
	      cleanup(v);
	    });
	  } else if (typeof commonjsRequire !== 'undefined') {
	    // Node.js.
	    crypto = require$$0$1;
	    if (crypto && crypto.randomBytes) {
	      nacl.setPRNG(function(x, n) {
	        var i, v = crypto.randomBytes(n);
	        for (i = 0; i < n; i++) x[i] = v[i];
	        cleanup(v);
	      });
	    }
	  }
	})();

	})(module.exports ? module.exports : (self.nacl = self.nacl || {}));
	}(naclFast));

	var nacl = naclFast.exports;

	var lib = {};

	var __createBinding = (commonjsGlobal$1 && commonjsGlobal$1.__createBinding) || (Object.create ? (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
	}) : (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    o[k2] = m[k];
	}));
	var __setModuleDefault = (commonjsGlobal$1 && commonjsGlobal$1.__setModuleDefault) || (Object.create ? (function(o, v) {
	    Object.defineProperty(o, "default", { enumerable: true, value: v });
	}) : function(o, v) {
	    o["default"] = v;
	});
	var __decorate = (commonjsGlobal$1 && commonjsGlobal$1.__decorate) || function (decorators, target, key, desc) {
	    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
	    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
	    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
	    return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
	var __importStar = (commonjsGlobal$1 && commonjsGlobal$1.__importStar) || function (mod) {
	    if (mod && mod.__esModule) return mod;
	    var result = {};
	    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
	    __setModuleDefault(result, mod);
	    return result;
	};
	var __importDefault = (commonjsGlobal$1 && commonjsGlobal$1.__importDefault) || function (mod) {
	    return (mod && mod.__esModule) ? mod : { "default": mod };
	};
	Object.defineProperty(lib, "__esModule", { value: true });
	var deserializeUnchecked_1 = lib.deserializeUnchecked = deserialize_1 = lib.deserialize = serialize_1 = lib.serialize = lib.BinaryReader = lib.BinaryWriter = lib.BorshError = lib.baseDecode = lib.baseEncode = void 0;
	const bn_js_1 = __importDefault(bn.exports);
	const bs58_1 = __importDefault(bs58);
	// TODO: Make sure this polyfill not included when not required
	const encoding = __importStar(encoding_lib);
	const TextDecoder = (typeof commonjsGlobal$1.TextDecoder !== 'function') ? encoding.TextDecoder : commonjsGlobal$1.TextDecoder;
	const textDecoder = new TextDecoder('utf-8', { fatal: true });
	function baseEncode(value) {
	    if (typeof (value) === 'string') {
	        value = Buffer.from(value, 'utf8');
	    }
	    return bs58_1.default.encode(Buffer.from(value));
	}
	lib.baseEncode = baseEncode;
	function baseDecode(value) {
	    return Buffer.from(bs58_1.default.decode(value));
	}
	lib.baseDecode = baseDecode;
	const INITIAL_LENGTH = 1024;
	class BorshError extends Error {
	    constructor(message) {
	        super(message);
	        this.fieldPath = [];
	        this.originalMessage = message;
	    }
	    addToFieldPath(fieldName) {
	        this.fieldPath.splice(0, 0, fieldName);
	        // NOTE: Modifying message directly as jest doesn't use .toString()
	        this.message = this.originalMessage + ': ' + this.fieldPath.join('.');
	    }
	}
	lib.BorshError = BorshError;
	/// Binary encoder.
	class BinaryWriter {
	    constructor() {
	        this.buf = Buffer.alloc(INITIAL_LENGTH);
	        this.length = 0;
	    }
	    maybeResize() {
	        if (this.buf.length < 16 + this.length) {
	            this.buf = Buffer.concat([this.buf, Buffer.alloc(INITIAL_LENGTH)]);
	        }
	    }
	    writeU8(value) {
	        this.maybeResize();
	        this.buf.writeUInt8(value, this.length);
	        this.length += 1;
	    }
	    writeU16(value) {
	        this.maybeResize();
	        this.buf.writeUInt16LE(value, this.length);
	        this.length += 2;
	    }
	    writeU32(value) {
	        this.maybeResize();
	        this.buf.writeUInt32LE(value, this.length);
	        this.length += 4;
	    }
	    writeU64(value) {
	        this.maybeResize();
	        this.writeBuffer(Buffer.from(new bn_js_1.default(value).toArray('le', 8)));
	    }
	    writeU128(value) {
	        this.maybeResize();
	        this.writeBuffer(Buffer.from(new bn_js_1.default(value).toArray('le', 16)));
	    }
	    writeU256(value) {
	        this.maybeResize();
	        this.writeBuffer(Buffer.from(new bn_js_1.default(value).toArray('le', 32)));
	    }
	    writeU512(value) {
	        this.maybeResize();
	        this.writeBuffer(Buffer.from(new bn_js_1.default(value).toArray('le', 64)));
	    }
	    writeBuffer(buffer) {
	        // Buffer.from is needed as this.buf.subarray can return plain Uint8Array in browser
	        this.buf = Buffer.concat([Buffer.from(this.buf.subarray(0, this.length)), buffer, Buffer.alloc(INITIAL_LENGTH)]);
	        this.length += buffer.length;
	    }
	    writeString(str) {
	        this.maybeResize();
	        const b = Buffer.from(str, 'utf8');
	        this.writeU32(b.length);
	        this.writeBuffer(b);
	    }
	    writeFixedArray(array) {
	        this.writeBuffer(Buffer.from(array));
	    }
	    writeArray(array, fn) {
	        this.maybeResize();
	        this.writeU32(array.length);
	        for (const elem of array) {
	            this.maybeResize();
	            fn(elem);
	        }
	    }
	    toArray() {
	        return this.buf.subarray(0, this.length);
	    }
	}
	lib.BinaryWriter = BinaryWriter;
	function handlingRangeError(target, propertyKey, propertyDescriptor) {
	    const originalMethod = propertyDescriptor.value;
	    propertyDescriptor.value = function (...args) {
	        try {
	            return originalMethod.apply(this, args);
	        }
	        catch (e) {
	            if (e instanceof RangeError) {
	                const code = e.code;
	                if (['ERR_BUFFER_OUT_OF_BOUNDS', 'ERR_OUT_OF_RANGE'].indexOf(code) >= 0) {
	                    throw new BorshError('Reached the end of buffer when deserializing');
	                }
	            }
	            throw e;
	        }
	    };
	}
	class BinaryReader {
	    constructor(buf) {
	        this.buf = buf;
	        this.offset = 0;
	    }
	    readU8() {
	        const value = this.buf.readUInt8(this.offset);
	        this.offset += 1;
	        return value;
	    }
	    readU16() {
	        const value = this.buf.readUInt16LE(this.offset);
	        this.offset += 2;
	        return value;
	    }
	    readU32() {
	        const value = this.buf.readUInt32LE(this.offset);
	        this.offset += 4;
	        return value;
	    }
	    readU64() {
	        const buf = this.readBuffer(8);
	        return new bn_js_1.default(buf, 'le');
	    }
	    readU128() {
	        const buf = this.readBuffer(16);
	        return new bn_js_1.default(buf, 'le');
	    }
	    readU256() {
	        const buf = this.readBuffer(32);
	        return new bn_js_1.default(buf, 'le');
	    }
	    readU512() {
	        const buf = this.readBuffer(64);
	        return new bn_js_1.default(buf, 'le');
	    }
	    readBuffer(len) {
	        if ((this.offset + len) > this.buf.length) {
	            throw new BorshError(`Expected buffer length ${len} isn't within bounds`);
	        }
	        const result = this.buf.slice(this.offset, this.offset + len);
	        this.offset += len;
	        return result;
	    }
	    readString() {
	        const len = this.readU32();
	        const buf = this.readBuffer(len);
	        try {
	            // NOTE: Using TextDecoder to fail on invalid UTF-8
	            return textDecoder.decode(buf);
	        }
	        catch (e) {
	            throw new BorshError(`Error decoding UTF-8 string: ${e}`);
	        }
	    }
	    readFixedArray(len) {
	        return new Uint8Array(this.readBuffer(len));
	    }
	    readArray(fn) {
	        const len = this.readU32();
	        const result = Array();
	        for (let i = 0; i < len; ++i) {
	            result.push(fn());
	        }
	        return result;
	    }
	}
	__decorate([
	    handlingRangeError
	], BinaryReader.prototype, "readU8", null);
	__decorate([
	    handlingRangeError
	], BinaryReader.prototype, "readU16", null);
	__decorate([
	    handlingRangeError
	], BinaryReader.prototype, "readU32", null);
	__decorate([
	    handlingRangeError
	], BinaryReader.prototype, "readU64", null);
	__decorate([
	    handlingRangeError
	], BinaryReader.prototype, "readU128", null);
	__decorate([
	    handlingRangeError
	], BinaryReader.prototype, "readU256", null);
	__decorate([
	    handlingRangeError
	], BinaryReader.prototype, "readU512", null);
	__decorate([
	    handlingRangeError
	], BinaryReader.prototype, "readString", null);
	__decorate([
	    handlingRangeError
	], BinaryReader.prototype, "readFixedArray", null);
	__decorate([
	    handlingRangeError
	], BinaryReader.prototype, "readArray", null);
	lib.BinaryReader = BinaryReader;
	function capitalizeFirstLetter(string) {
	    return string.charAt(0).toUpperCase() + string.slice(1);
	}
	function serializeField(schema, fieldName, value, fieldType, writer) {
	    try {
	        // TODO: Handle missing values properly (make sure they never result in just skipped write)
	        if (typeof fieldType === 'string') {
	            writer[`write${capitalizeFirstLetter(fieldType)}`](value);
	        }
	        else if (fieldType instanceof Array) {
	            if (typeof fieldType[0] === 'number') {
	                if (value.length !== fieldType[0]) {
	                    throw new BorshError(`Expecting byte array of length ${fieldType[0]}, but got ${value.length} bytes`);
	                }
	                writer.writeFixedArray(value);
	            }
	            else {
	                writer.writeArray(value, (item) => { serializeField(schema, fieldName, item, fieldType[0], writer); });
	            }
	        }
	        else if (fieldType.kind !== undefined) {
	            switch (fieldType.kind) {
	                case 'option': {
	                    if (value === null || value === undefined) {
	                        writer.writeU8(0);
	                    }
	                    else {
	                        writer.writeU8(1);
	                        serializeField(schema, fieldName, value, fieldType.type, writer);
	                    }
	                    break;
	                }
	                default: throw new BorshError(`FieldType ${fieldType} unrecognized`);
	            }
	        }
	        else {
	            serializeStruct(schema, value, writer);
	        }
	    }
	    catch (error) {
	        if (error instanceof BorshError) {
	            error.addToFieldPath(fieldName);
	        }
	        throw error;
	    }
	}
	function serializeStruct(schema, obj, writer) {
	    const structSchema = schema.get(obj.constructor);
	    if (!structSchema) {
	        throw new BorshError(`Class ${obj.constructor.name} is missing in schema`);
	    }
	    if (structSchema.kind === 'struct') {
	        structSchema.fields.map(([fieldName, fieldType]) => {
	            serializeField(schema, fieldName, obj[fieldName], fieldType, writer);
	        });
	    }
	    else if (structSchema.kind === 'enum') {
	        const name = obj[structSchema.field];
	        for (let idx = 0; idx < structSchema.values.length; ++idx) {
	            const [fieldName, fieldType] = structSchema.values[idx];
	            if (fieldName === name) {
	                writer.writeU8(idx);
	                serializeField(schema, fieldName, obj[fieldName], fieldType, writer);
	                break;
	            }
	        }
	    }
	    else {
	        throw new BorshError(`Unexpected schema kind: ${structSchema.kind} for ${obj.constructor.name}`);
	    }
	}
	/// Serialize given object using schema of the form:
	/// { class_name -> [ [field_name, field_type], .. ], .. }
	function serialize(schema, obj) {
	    const writer = new BinaryWriter();
	    serializeStruct(schema, obj, writer);
	    return writer.toArray();
	}
	var serialize_1 = lib.serialize = serialize;
	function deserializeField(schema, fieldName, fieldType, reader) {
	    try {
	        if (typeof fieldType === 'string') {
	            return reader[`read${capitalizeFirstLetter(fieldType)}`]();
	        }
	        if (fieldType instanceof Array) {
	            if (typeof fieldType[0] === 'number') {
	                return reader.readFixedArray(fieldType[0]);
	            }
	            return reader.readArray(() => deserializeField(schema, fieldName, fieldType[0], reader));
	        }
	        if (fieldType.kind === 'option') {
	            const option = reader.readU8();
	            if (option) {
	                return deserializeField(schema, fieldName, fieldType.type, reader);
	            }
	            return undefined;
	        }
	        return deserializeStruct(schema, fieldType, reader);
	    }
	    catch (error) {
	        if (error instanceof BorshError) {
	            error.addToFieldPath(fieldName);
	        }
	        throw error;
	    }
	}
	function deserializeStruct(schema, classType, reader) {
	    const structSchema = schema.get(classType);
	    if (!structSchema) {
	        throw new BorshError(`Class ${classType.name} is missing in schema`);
	    }
	    if (structSchema.kind === 'struct') {
	        const result = {};
	        for (const [fieldName, fieldType] of schema.get(classType).fields) {
	            result[fieldName] = deserializeField(schema, fieldName, fieldType, reader);
	        }
	        return new classType(result);
	    }
	    if (structSchema.kind === 'enum') {
	        const idx = reader.readU8();
	        if (idx >= structSchema.values.length) {
	            throw new BorshError(`Enum index: ${idx} is out of range`);
	        }
	        const [fieldName, fieldType] = structSchema.values[idx];
	        const fieldValue = deserializeField(schema, fieldName, fieldType, reader);
	        return new classType({ [fieldName]: fieldValue });
	    }
	    throw new BorshError(`Unexpected schema kind: ${structSchema.kind} for ${classType.constructor.name}`);
	}
	/// Deserializes object from bytes using schema.
	function deserialize(schema, classType, buffer) {
	    const reader = new BinaryReader(buffer);
	    const result = deserializeStruct(schema, classType, reader);
	    if (reader.offset < buffer.length) {
	        throw new BorshError(`Unexpected ${buffer.length - reader.offset} bytes after deserialized data`);
	    }
	    return result;
	}
	var deserialize_1 = lib.deserialize = deserialize;
	/// Deserializes object from bytes using schema, without checking the length read
	function deserializeUnchecked(schema, classType, buffer) {
	    const reader = new BinaryReader(buffer);
	    return deserializeStruct(schema, classType, reader);
	}
	deserializeUnchecked_1 = lib.deserializeUnchecked = deserializeUnchecked;

	var Layout$1 = {};

	/* The MIT License (MIT)
	 *
	 * Copyright 2015-2018 Peter A. Bigot
	 *
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:
	 *
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 *
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 */
	var __extends = (commonjsGlobal$1 && commonjsGlobal$1.__extends) || (function () {
	    var extendStatics = function (d, b) {
	        extendStatics = Object.setPrototypeOf ||
	            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
	            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
	        return extendStatics(d, b);
	    };
	    return function (d, b) {
	        if (typeof b !== "function" && b !== null)
	            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
	        extendStatics(d, b);
	        function __() { this.constructor = d; }
	        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	    };
	})();
	Layout$1.__esModule = true;
	Layout$1.s16 = Layout$1.s8 = Layout$1.nu64be = Layout$1.u48be = Layout$1.u40be = Layout$1.u32be = Layout$1.u24be = Layout$1.u16be = nu64 = Layout$1.nu64 = Layout$1.u48 = Layout$1.u40 = u32 = Layout$1.u32 = Layout$1.u24 = u16 = Layout$1.u16 = u8 = Layout$1.u8 = offset = Layout$1.offset = Layout$1.greedy = Layout$1.Constant = Layout$1.UTF8 = Layout$1.CString = Layout$1.Blob = Layout$1.Boolean = Layout$1.BitField = Layout$1.BitStructure = Layout$1.VariantLayout = Layout$1.Union = Layout$1.UnionLayoutDiscriminator = Layout$1.UnionDiscriminator = Layout$1.Structure = Layout$1.Sequence = Layout$1.DoubleBE = Layout$1.Double = Layout$1.FloatBE = Layout$1.Float = Layout$1.NearInt64BE = Layout$1.NearInt64 = Layout$1.NearUInt64BE = Layout$1.NearUInt64 = Layout$1.IntBE = Layout$1.Int = Layout$1.UIntBE = Layout$1.UInt = Layout$1.OffsetLayout = Layout$1.GreedyCount = Layout$1.ExternalLayout = Layout$1.bindConstructorLayout = Layout$1.nameWithProperty = Layout$1.Layout = Layout$1.uint8ArrayToBuffer = Layout$1.checkUint8Array = void 0;
	Layout$1.constant = Layout$1.utf8 = Layout$1.cstr = blob = Layout$1.blob = Layout$1.unionLayoutDiscriminator = Layout$1.union = seq = Layout$1.seq = Layout$1.bits = struct = Layout$1.struct = Layout$1.f64be = Layout$1.f64 = Layout$1.f32be = Layout$1.f32 = Layout$1.ns64be = Layout$1.s48be = Layout$1.s40be = Layout$1.s32be = Layout$1.s24be = Layout$1.s16be = ns64 = Layout$1.ns64 = Layout$1.s48 = Layout$1.s40 = Layout$1.s32 = Layout$1.s24 = void 0;
	var buffer_1 = buffer;
	/* Check if a value is a Uint8Array.
	 *
	 * @ignore */
	function checkUint8Array(b) {
	    if (!(b instanceof Uint8Array)) {
	        throw new TypeError('b must be a Uint8Array');
	    }
	}
	Layout$1.checkUint8Array = checkUint8Array;
	/* Create a Buffer instance from a Uint8Array.
	 *
	 * @ignore */
	function uint8ArrayToBuffer(b) {
	    checkUint8Array(b);
	    return buffer_1.Buffer.from(b.buffer, b.byteOffset, b.length);
	}
	Layout$1.uint8ArrayToBuffer = uint8ArrayToBuffer;
	/**
	 * Base class for layout objects.
	 *
	 * **NOTE** This is an abstract base class; you can create instances
	 * if it amuses you, but they won't support the {@link
	 * Layout#encode|encode} or {@link Layout#decode|decode} functions.
	 *
	 * @param {Number} span - Initializer for {@link Layout#span|span}.  The
	 * parameter must be an integer; a negative value signifies that the
	 * span is {@link Layout#getSpan|value-specific}.
	 *
	 * @param {string} [property] - Initializer for {@link
	 * Layout#property|property}.
	 *
	 * @abstract
	 */
	var Layout = /** @class */ (function () {
	    function Layout(span, property) {
	        if (!Number.isInteger(span)) {
	            throw new TypeError('span must be an integer');
	        }
	        /** The span of the layout in bytes.
	         *
	         * Positive values are generally expected.
	         *
	         * Zero will only appear in {@link Constant}s and in {@link
	         * Sequence}s where the {@link Sequence#count|count} is zero.
	         *
	         * A negative value indicates that the span is value-specific, and
	         * must be obtained using {@link Layout#getSpan|getSpan}. */
	        this.span = span;
	        /** The property name used when this layout is represented in an
	         * Object.
	         *
	         * Used only for layouts that {@link Layout#decode|decode} to Object
	         * instances.  If left undefined the span of the unnamed layout will
	         * be treated as padding: it will not be mutated by {@link
	         * Layout#encode|encode} nor represented as a property in the
	         * decoded Object. */
	        this.property = property;
	    }
	    /** Function to create an Object into which decoded properties will
	     * be written.
	     *
	     * Used only for layouts that {@link Layout#decode|decode} to Object
	     * instances, which means:
	     * * {@link Structure}
	     * * {@link Union}
	     * * {@link VariantLayout}
	     * * {@link BitStructure}
	     *
	     * If left undefined the JavaScript representation of these layouts
	     * will be Object instances.
	     *
	     * See {@link bindConstructorLayout}.
	     */
	    Layout.prototype.makeDestinationObject = function () {
	        return {};
	    };
	    /**
	     * Decode from a Uint8Array into a JavaScript value.
	     *
	     * @param {Uint8Array} b - the buffer from which encoded data is read.
	     *
	     * @param {Number} [offset] - the offset at which the encoded data
	     * starts.  If absent a zero offset is inferred.
	     *
	     * @returns {(Number|Array|Object)} - the value of the decoded data.
	     *
	     * @abstract
	     */
	    Layout.prototype.decode = function (b, offset) {
	        throw new Error('Layout is abstract');
	    };
	    /**
	     * Encode a JavaScript value into a Uint8Array.
	     *
	     * @param {(Number|Array|Object)} src - the value to be encoded into
	     * the buffer.  The type accepted depends on the (sub-)type of {@link
	     * Layout}.
	     *
	     * @param {Uint8Array} b - the buffer into which encoded data will be
	     * written.
	     *
	     * @param {Number} [offset] - the offset at which the encoded data
	     * starts.  If absent a zero offset is inferred.
	     *
	     * @returns {Number} - the number of bytes encoded, including the
	     * space skipped for internal padding, but excluding data such as
	     * {@link Sequence#count|lengths} when stored {@link
	     * ExternalLayout|externally}.  This is the adjustment to `offset`
	     * producing the offset where data for the next layout would be
	     * written.
	     *
	     * @abstract
	     */
	    Layout.prototype.encode = function (src, b, offset) {
	        throw new Error('Layout is abstract');
	    };
	    /**
	     * Calculate the span of a specific instance of a layout.
	     *
	     * @param {Uint8Array} b - the buffer that contains an encoded instance.
	     *
	     * @param {Number} [offset] - the offset at which the encoded instance
	     * starts.  If absent a zero offset is inferred.
	     *
	     * @return {Number} - the number of bytes covered by the layout
	     * instance.  If this method is not overridden in a subclass the
	     * definition-time constant {@link Layout#span|span} will be
	     * returned.
	     *
	     * @throws {RangeError} - if the length of the value cannot be
	     * determined.
	     */
	    Layout.prototype.getSpan = function (b, offset) {
	        if (0 > this.span) {
	            throw new RangeError('indeterminate span');
	        }
	        return this.span;
	    };
	    /**
	     * Replicate the layout using a new property.
	     *
	     * This function must be used to get a structurally-equivalent layout
	     * with a different name since all {@link Layout} instances are
	     * immutable.
	     *
	     * **NOTE** This is a shallow copy.  All fields except {@link
	     * Layout#property|property} are strictly equal to the origin layout.
	     *
	     * @param {String} property - the value for {@link
	     * Layout#property|property} in the replica.
	     *
	     * @returns {Layout} - the copy with {@link Layout#property|property}
	     * set to `property`.
	     */
	    Layout.prototype.replicate = function (property) {
	        var rv = Object.create(this.constructor.prototype);
	        Object.assign(rv, this);
	        rv.property = property;
	        return rv;
	    };
	    /**
	     * Create an object from layout properties and an array of values.
	     *
	     * **NOTE** This function returns `undefined` if invoked on a layout
	     * that does not return its value as an Object.  Objects are
	     * returned for things that are a {@link Structure}, which includes
	     * {@link VariantLayout|variant layouts} if they are structures, and
	     * excludes {@link Union}s.  If you want this feature for a union
	     * you must use {@link Union.getVariant|getVariant} to select the
	     * desired layout.
	     *
	     * @param {Array} values - an array of values that correspond to the
	     * default order for properties.  As with {@link Layout#decode|decode}
	     * layout elements that have no property name are skipped when
	     * iterating over the array values.  Only the top-level properties are
	     * assigned; arguments are not assigned to properties of contained
	     * layouts.  Any unused values are ignored.
	     *
	     * @return {(Object|undefined)}
	     */
	    Layout.prototype.fromArray = function (values) {
	        return undefined;
	    };
	    return Layout;
	}());
	Layout$1.Layout = Layout;
	/* Provide text that carries a name (such as for a function that will
	 * be throwing an error) annotated with the property of a given layout
	 * (such as one for which the value was unacceptable).
	 *
	 * @ignore */
	function nameWithProperty(name, lo) {
	    if (lo.property) {
	        return name + '[' + lo.property + ']';
	    }
	    return name;
	}
	Layout$1.nameWithProperty = nameWithProperty;
	/**
	 * Augment a class so that instances can be encoded/decoded using a
	 * given layout.
	 *
	 * Calling this function couples `Class` with `layout` in several ways:
	 *
	 * * `Class.layout_` becomes a static member property equal to `layout`;
	 * * `layout.boundConstructor_` becomes a static member property equal
	 *    to `Class`;
	 * * The {@link Layout#makeDestinationObject|makeDestinationObject()}
	 *   property of `layout` is set to a function that returns a `new
	 *   Class()`;
	 * * `Class.decode(b, offset)` becomes a static member function that
	 *   delegates to {@link Layout#decode|layout.decode}.  The
	 *   synthesized function may be captured and extended.
	 * * `Class.prototype.encode(b, offset)` provides an instance member
	 *   function that delegates to {@link Layout#encode|layout.encode}
	 *   with `src` set to `this`.  The synthesized function may be
	 *   captured and extended, but when the extension is invoked `this`
	 *   must be explicitly bound to the instance.
	 *
	 * @param {class} Class - a JavaScript class with a nullary
	 * constructor.
	 *
	 * @param {Layout} layout - the {@link Layout} instance used to encode
	 * instances of `Class`.
	 */
	function bindConstructorLayout(Class, layout) {
	    if ('function' !== typeof Class) {
	        throw new TypeError('Class must be constructor');
	    }
	    if (Object.prototype.hasOwnProperty.call(Class, 'layout_')) {
	        throw new Error('Class is already bound to a layout');
	    }
	    if (!(layout && (layout instanceof Layout))) {
	        throw new TypeError('layout must be a Layout');
	    }
	    if (Object.prototype.hasOwnProperty.call(layout, 'boundConstructor_')) {
	        throw new Error('layout is already bound to a constructor');
	    }
	    Class.layout_ = layout;
	    layout.boundConstructor_ = Class;
	    layout.makeDestinationObject = (function () { return new Class(); });
	    Object.defineProperty(Class.prototype, 'encode', {
	        value: function (b, offset) {
	            return layout.encode(this, b, offset);
	        },
	        writable: true
	    });
	    Object.defineProperty(Class, 'decode', {
	        value: function (b, offset) {
	            return layout.decode(b, offset);
	        },
	        writable: true
	    });
	}
	Layout$1.bindConstructorLayout = bindConstructorLayout;
	/**
	 * An object that behaves like a layout but does not consume space
	 * within its containing layout.
	 *
	 * This is primarily used to obtain metadata about a member, such as a
	 * {@link OffsetLayout} that can provide data about a {@link
	 * Layout#getSpan|value-specific span}.
	 *
	 * **NOTE** This is an abstract base class; you can create instances
	 * if it amuses you, but they won't support {@link
	 * ExternalLayout#isCount|isCount} or other {@link Layout} functions.
	 *
	 * @param {Number} span - initializer for {@link Layout#span|span}.
	 * The parameter can range from 1 through 6.
	 *
	 * @param {string} [property] - initializer for {@link
	 * Layout#property|property}.
	 *
	 * @abstract
	 * @augments {Layout}
	 */
	var ExternalLayout = /** @class */ (function (_super) {
	    __extends(ExternalLayout, _super);
	    function ExternalLayout() {
	        return _super !== null && _super.apply(this, arguments) || this;
	    }
	    /**
	     * Return `true` iff the external layout decodes to an unsigned
	     * integer layout.
	     *
	     * In that case it can be used as the source of {@link
	     * Sequence#count|Sequence counts}, {@link Blob#length|Blob lengths},
	     * or as {@link UnionLayoutDiscriminator#layout|external union
	     * discriminators}.
	     *
	     * @abstract
	     */
	    ExternalLayout.prototype.isCount = function () {
	        throw new Error('ExternalLayout is abstract');
	    };
	    return ExternalLayout;
	}(Layout));
	Layout$1.ExternalLayout = ExternalLayout;
	/**
	 * An {@link ExternalLayout} that determines its {@link
	 * Layout#decode|value} based on offset into and length of the buffer
	 * on which it is invoked.
	 *
	 * *Factory*: {@link module:Layout.greedy|greedy}
	 *
	 * @param {Number} [elementSpan] - initializer for {@link
	 * GreedyCount#elementSpan|elementSpan}.
	 *
	 * @param {string} [property] - initializer for {@link
	 * Layout#property|property}.
	 *
	 * @augments {ExternalLayout}
	 */
	var GreedyCount = /** @class */ (function (_super) {
	    __extends(GreedyCount, _super);
	    function GreedyCount(elementSpan, property) {
	        var _this = this;
	        if (undefined === elementSpan) {
	            elementSpan = 1;
	        }
	        if ((!Number.isInteger(elementSpan)) || (0 >= elementSpan)) {
	            throw new TypeError('elementSpan must be a (positive) integer');
	        }
	        _this = _super.call(this, -1, property) || this;
	        /** The layout for individual elements of the sequence.  The value
	         * must be a positive integer.  If not provided, the value will be
	         * 1. */
	        _this.elementSpan = elementSpan;
	        return _this;
	    }
	    /** @override */
	    GreedyCount.prototype.isCount = function () {
	        return true;
	    };
	    /** @override */
	    GreedyCount.prototype.decode = function (b, offset) {
	        checkUint8Array(b);
	        if (undefined === offset) {
	            offset = 0;
	        }
	        var rem = b.length - offset;
	        return Math.floor(rem / this.elementSpan);
	    };
	    /** @override */
	    GreedyCount.prototype.encode = function (src, b, offset) {
	        return 0;
	    };
	    return GreedyCount;
	}(ExternalLayout));
	Layout$1.GreedyCount = GreedyCount;
	/**
	 * An {@link ExternalLayout} that supports accessing a {@link Layout}
	 * at a fixed offset from the start of another Layout.  The offset may
	 * be before, within, or after the base layout.
	 *
	 * *Factory*: {@link module:Layout.offset|offset}
	 *
	 * @param {Layout} layout - initializer for {@link
	 * OffsetLayout#layout|layout}, modulo `property`.
	 *
	 * @param {Number} [offset] - Initializes {@link
	 * OffsetLayout#offset|offset}.  Defaults to zero.
	 *
	 * @param {string} [property] - Optional new property name for a
	 * {@link Layout#replicate| replica} of `layout` to be used as {@link
	 * OffsetLayout#layout|layout}.  If not provided the `layout` is used
	 * unchanged.
	 *
	 * @augments {Layout}
	 */
	var OffsetLayout = /** @class */ (function (_super) {
	    __extends(OffsetLayout, _super);
	    function OffsetLayout(layout, offset, property) {
	        var _this = this;
	        if (!(layout instanceof Layout)) {
	            throw new TypeError('layout must be a Layout');
	        }
	        if (undefined === offset) {
	            offset = 0;
	        }
	        else if (!Number.isInteger(offset)) {
	            throw new TypeError('offset must be integer or undefined');
	        }
	        _this = _super.call(this, layout.span, property || layout.property) || this;
	        /** The subordinated layout. */
	        _this.layout = layout;
	        /** The location of {@link OffsetLayout#layout} relative to the
	         * start of another layout.
	         *
	         * The value may be positive or negative, but an error will thrown
	         * if at the point of use it goes outside the span of the Uint8Array
	         * being accessed.  */
	        _this.offset = offset;
	        return _this;
	    }
	    /** @override */
	    OffsetLayout.prototype.isCount = function () {
	        return ((this.layout instanceof UInt)
	            || (this.layout instanceof UIntBE));
	    };
	    /** @override */
	    OffsetLayout.prototype.decode = function (b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        return this.layout.decode(b, offset + this.offset);
	    };
	    /** @override */
	    OffsetLayout.prototype.encode = function (src, b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        return this.layout.encode(src, b, offset + this.offset);
	    };
	    return OffsetLayout;
	}(ExternalLayout));
	Layout$1.OffsetLayout = OffsetLayout;
	/**
	 * Represent an unsigned integer in little-endian format.
	 *
	 * *Factory*: {@link module:Layout.u8|u8}, {@link
	 *  module:Layout.u16|u16}, {@link module:Layout.u24|u24}, {@link
	 *  module:Layout.u32|u32}, {@link module:Layout.u40|u40}, {@link
	 *  module:Layout.u48|u48}
	 *
	 * @param {Number} span - initializer for {@link Layout#span|span}.
	 * The parameter can range from 1 through 6.
	 *
	 * @param {string} [property] - initializer for {@link
	 * Layout#property|property}.
	 *
	 * @augments {Layout}
	 */
	var UInt = /** @class */ (function (_super) {
	    __extends(UInt, _super);
	    function UInt(span, property) {
	        var _this = _super.call(this, span, property) || this;
	        if (6 < _this.span) {
	            throw new RangeError('span must not exceed 6 bytes');
	        }
	        return _this;
	    }
	    /** @override */
	    UInt.prototype.decode = function (b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        return uint8ArrayToBuffer(b).readUIntLE(offset, this.span);
	    };
	    /** @override */
	    UInt.prototype.encode = function (src, b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        uint8ArrayToBuffer(b).writeUIntLE(src, offset, this.span);
	        return this.span;
	    };
	    return UInt;
	}(Layout));
	Layout$1.UInt = UInt;
	/**
	 * Represent an unsigned integer in big-endian format.
	 *
	 * *Factory*: {@link module:Layout.u8be|u8be}, {@link
	 * module:Layout.u16be|u16be}, {@link module:Layout.u24be|u24be},
	 * {@link module:Layout.u32be|u32be}, {@link
	 * module:Layout.u40be|u40be}, {@link module:Layout.u48be|u48be}
	 *
	 * @param {Number} span - initializer for {@link Layout#span|span}.
	 * The parameter can range from 1 through 6.
	 *
	 * @param {string} [property] - initializer for {@link
	 * Layout#property|property}.
	 *
	 * @augments {Layout}
	 */
	var UIntBE = /** @class */ (function (_super) {
	    __extends(UIntBE, _super);
	    function UIntBE(span, property) {
	        var _this = _super.call(this, span, property) || this;
	        if (6 < _this.span) {
	            throw new RangeError('span must not exceed 6 bytes');
	        }
	        return _this;
	    }
	    /** @override */
	    UIntBE.prototype.decode = function (b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        return uint8ArrayToBuffer(b).readUIntBE(offset, this.span);
	    };
	    /** @override */
	    UIntBE.prototype.encode = function (src, b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        uint8ArrayToBuffer(b).writeUIntBE(src, offset, this.span);
	        return this.span;
	    };
	    return UIntBE;
	}(Layout));
	Layout$1.UIntBE = UIntBE;
	/**
	 * Represent a signed integer in little-endian format.
	 *
	 * *Factory*: {@link module:Layout.s8|s8}, {@link
	 *  module:Layout.s16|s16}, {@link module:Layout.s24|s24}, {@link
	 *  module:Layout.s32|s32}, {@link module:Layout.s40|s40}, {@link
	 *  module:Layout.s48|s48}
	 *
	 * @param {Number} span - initializer for {@link Layout#span|span}.
	 * The parameter can range from 1 through 6.
	 *
	 * @param {string} [property] - initializer for {@link
	 * Layout#property|property}.
	 *
	 * @augments {Layout}
	 */
	var Int = /** @class */ (function (_super) {
	    __extends(Int, _super);
	    function Int(span, property) {
	        var _this = _super.call(this, span, property) || this;
	        if (6 < _this.span) {
	            throw new RangeError('span must not exceed 6 bytes');
	        }
	        return _this;
	    }
	    /** @override */
	    Int.prototype.decode = function (b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        return uint8ArrayToBuffer(b).readIntLE(offset, this.span);
	    };
	    /** @override */
	    Int.prototype.encode = function (src, b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        uint8ArrayToBuffer(b).writeIntLE(src, offset, this.span);
	        return this.span;
	    };
	    return Int;
	}(Layout));
	Layout$1.Int = Int;
	/**
	 * Represent a signed integer in big-endian format.
	 *
	 * *Factory*: {@link module:Layout.s8be|s8be}, {@link
	 * module:Layout.s16be|s16be}, {@link module:Layout.s24be|s24be},
	 * {@link module:Layout.s32be|s32be}, {@link
	 * module:Layout.s40be|s40be}, {@link module:Layout.s48be|s48be}
	 *
	 * @param {Number} span - initializer for {@link Layout#span|span}.
	 * The parameter can range from 1 through 6.
	 *
	 * @param {string} [property] - initializer for {@link
	 * Layout#property|property}.
	 *
	 * @augments {Layout}
	 */
	var IntBE = /** @class */ (function (_super) {
	    __extends(IntBE, _super);
	    function IntBE(span, property) {
	        var _this = _super.call(this, span, property) || this;
	        if (6 < _this.span) {
	            throw new RangeError('span must not exceed 6 bytes');
	        }
	        return _this;
	    }
	    /** @override */
	    IntBE.prototype.decode = function (b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        return uint8ArrayToBuffer(b).readIntBE(offset, this.span);
	    };
	    /** @override */
	    IntBE.prototype.encode = function (src, b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        uint8ArrayToBuffer(b).writeIntBE(src, offset, this.span);
	        return this.span;
	    };
	    return IntBE;
	}(Layout));
	Layout$1.IntBE = IntBE;
	var V2E32 = Math.pow(2, 32);
	/* True modulus high and low 32-bit words, where low word is always
	 * non-negative. */
	function divmodInt64(src) {
	    var hi32 = Math.floor(src / V2E32);
	    var lo32 = src - (hi32 * V2E32);
	    return { hi32: hi32, lo32: lo32 };
	}
	/* Reconstruct Number from quotient and non-negative remainder */
	function roundedInt64(hi32, lo32) {
	    return hi32 * V2E32 + lo32;
	}
	/**
	 * Represent an unsigned 64-bit integer in little-endian format when
	 * encoded and as a near integral JavaScript Number when decoded.
	 *
	 * *Factory*: {@link module:Layout.nu64|nu64}
	 *
	 * **NOTE** Values with magnitude greater than 2^52 may not decode to
	 * the exact value of the encoded representation.
	 *
	 * @augments {Layout}
	 */
	var NearUInt64 = /** @class */ (function (_super) {
	    __extends(NearUInt64, _super);
	    function NearUInt64(property) {
	        return _super.call(this, 8, property) || this;
	    }
	    /** @override */
	    NearUInt64.prototype.decode = function (b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        var buffer = uint8ArrayToBuffer(b);
	        var lo32 = buffer.readUInt32LE(offset);
	        var hi32 = buffer.readUInt32LE(offset + 4);
	        return roundedInt64(hi32, lo32);
	    };
	    /** @override */
	    NearUInt64.prototype.encode = function (src, b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        var split = divmodInt64(src);
	        var buffer = uint8ArrayToBuffer(b);
	        buffer.writeUInt32LE(split.lo32, offset);
	        buffer.writeUInt32LE(split.hi32, offset + 4);
	        return 8;
	    };
	    return NearUInt64;
	}(Layout));
	Layout$1.NearUInt64 = NearUInt64;
	/**
	 * Represent an unsigned 64-bit integer in big-endian format when
	 * encoded and as a near integral JavaScript Number when decoded.
	 *
	 * *Factory*: {@link module:Layout.nu64be|nu64be}
	 *
	 * **NOTE** Values with magnitude greater than 2^52 may not decode to
	 * the exact value of the encoded representation.
	 *
	 * @augments {Layout}
	 */
	var NearUInt64BE = /** @class */ (function (_super) {
	    __extends(NearUInt64BE, _super);
	    function NearUInt64BE(property) {
	        return _super.call(this, 8, property) || this;
	    }
	    /** @override */
	    NearUInt64BE.prototype.decode = function (b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        var buffer = uint8ArrayToBuffer(b);
	        var hi32 = buffer.readUInt32BE(offset);
	        var lo32 = buffer.readUInt32BE(offset + 4);
	        return roundedInt64(hi32, lo32);
	    };
	    /** @override */
	    NearUInt64BE.prototype.encode = function (src, b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        var split = divmodInt64(src);
	        var buffer = uint8ArrayToBuffer(b);
	        buffer.writeUInt32BE(split.hi32, offset);
	        buffer.writeUInt32BE(split.lo32, offset + 4);
	        return 8;
	    };
	    return NearUInt64BE;
	}(Layout));
	Layout$1.NearUInt64BE = NearUInt64BE;
	/**
	 * Represent a signed 64-bit integer in little-endian format when
	 * encoded and as a near integral JavaScript Number when decoded.
	 *
	 * *Factory*: {@link module:Layout.ns64|ns64}
	 *
	 * **NOTE** Values with magnitude greater than 2^52 may not decode to
	 * the exact value of the encoded representation.
	 *
	 * @augments {Layout}
	 */
	var NearInt64 = /** @class */ (function (_super) {
	    __extends(NearInt64, _super);
	    function NearInt64(property) {
	        return _super.call(this, 8, property) || this;
	    }
	    /** @override */
	    NearInt64.prototype.decode = function (b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        var buffer = uint8ArrayToBuffer(b);
	        var lo32 = buffer.readUInt32LE(offset);
	        var hi32 = buffer.readInt32LE(offset + 4);
	        return roundedInt64(hi32, lo32);
	    };
	    /** @override */
	    NearInt64.prototype.encode = function (src, b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        var split = divmodInt64(src);
	        var buffer = uint8ArrayToBuffer(b);
	        buffer.writeUInt32LE(split.lo32, offset);
	        buffer.writeInt32LE(split.hi32, offset + 4);
	        return 8;
	    };
	    return NearInt64;
	}(Layout));
	Layout$1.NearInt64 = NearInt64;
	/**
	 * Represent a signed 64-bit integer in big-endian format when
	 * encoded and as a near integral JavaScript Number when decoded.
	 *
	 * *Factory*: {@link module:Layout.ns64be|ns64be}
	 *
	 * **NOTE** Values with magnitude greater than 2^52 may not decode to
	 * the exact value of the encoded representation.
	 *
	 * @augments {Layout}
	 */
	var NearInt64BE = /** @class */ (function (_super) {
	    __extends(NearInt64BE, _super);
	    function NearInt64BE(property) {
	        return _super.call(this, 8, property) || this;
	    }
	    /** @override */
	    NearInt64BE.prototype.decode = function (b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        var buffer = uint8ArrayToBuffer(b);
	        var hi32 = buffer.readInt32BE(offset);
	        var lo32 = buffer.readUInt32BE(offset + 4);
	        return roundedInt64(hi32, lo32);
	    };
	    /** @override */
	    NearInt64BE.prototype.encode = function (src, b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        var split = divmodInt64(src);
	        var buffer = uint8ArrayToBuffer(b);
	        buffer.writeInt32BE(split.hi32, offset);
	        buffer.writeUInt32BE(split.lo32, offset + 4);
	        return 8;
	    };
	    return NearInt64BE;
	}(Layout));
	Layout$1.NearInt64BE = NearInt64BE;
	/**
	 * Represent a 32-bit floating point number in little-endian format.
	 *
	 * *Factory*: {@link module:Layout.f32|f32}
	 *
	 * @param {string} [property] - initializer for {@link
	 * Layout#property|property}.
	 *
	 * @augments {Layout}
	 */
	var Float = /** @class */ (function (_super) {
	    __extends(Float, _super);
	    function Float(property) {
	        return _super.call(this, 4, property) || this;
	    }
	    /** @override */
	    Float.prototype.decode = function (b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        return uint8ArrayToBuffer(b).readFloatLE(offset);
	    };
	    /** @override */
	    Float.prototype.encode = function (src, b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        uint8ArrayToBuffer(b).writeFloatLE(src, offset);
	        return 4;
	    };
	    return Float;
	}(Layout));
	Layout$1.Float = Float;
	/**
	 * Represent a 32-bit floating point number in big-endian format.
	 *
	 * *Factory*: {@link module:Layout.f32be|f32be}
	 *
	 * @param {string} [property] - initializer for {@link
	 * Layout#property|property}.
	 *
	 * @augments {Layout}
	 */
	var FloatBE = /** @class */ (function (_super) {
	    __extends(FloatBE, _super);
	    function FloatBE(property) {
	        return _super.call(this, 4, property) || this;
	    }
	    /** @override */
	    FloatBE.prototype.decode = function (b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        return uint8ArrayToBuffer(b).readFloatBE(offset);
	    };
	    /** @override */
	    FloatBE.prototype.encode = function (src, b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        uint8ArrayToBuffer(b).writeFloatBE(src, offset);
	        return 4;
	    };
	    return FloatBE;
	}(Layout));
	Layout$1.FloatBE = FloatBE;
	/**
	 * Represent a 64-bit floating point number in little-endian format.
	 *
	 * *Factory*: {@link module:Layout.f64|f64}
	 *
	 * @param {string} [property] - initializer for {@link
	 * Layout#property|property}.
	 *
	 * @augments {Layout}
	 */
	var Double = /** @class */ (function (_super) {
	    __extends(Double, _super);
	    function Double(property) {
	        return _super.call(this, 8, property) || this;
	    }
	    /** @override */
	    Double.prototype.decode = function (b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        return uint8ArrayToBuffer(b).readDoubleLE(offset);
	    };
	    /** @override */
	    Double.prototype.encode = function (src, b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        uint8ArrayToBuffer(b).writeDoubleLE(src, offset);
	        return 8;
	    };
	    return Double;
	}(Layout));
	Layout$1.Double = Double;
	/**
	 * Represent a 64-bit floating point number in big-endian format.
	 *
	 * *Factory*: {@link module:Layout.f64be|f64be}
	 *
	 * @param {string} [property] - initializer for {@link
	 * Layout#property|property}.
	 *
	 * @augments {Layout}
	 */
	var DoubleBE = /** @class */ (function (_super) {
	    __extends(DoubleBE, _super);
	    function DoubleBE(property) {
	        return _super.call(this, 8, property) || this;
	    }
	    /** @override */
	    DoubleBE.prototype.decode = function (b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        return uint8ArrayToBuffer(b).readDoubleBE(offset);
	    };
	    /** @override */
	    DoubleBE.prototype.encode = function (src, b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        uint8ArrayToBuffer(b).writeDoubleBE(src, offset);
	        return 8;
	    };
	    return DoubleBE;
	}(Layout));
	Layout$1.DoubleBE = DoubleBE;
	/**
	 * Represent a contiguous sequence of a specific layout as an Array.
	 *
	 * *Factory*: {@link module:Layout.seq|seq}
	 *
	 * @param {Layout} elementLayout - initializer for {@link
	 * Sequence#elementLayout|elementLayout}.
	 *
	 * @param {(Number|ExternalLayout)} count - initializer for {@link
	 * Sequence#count|count}.  The parameter must be either a positive
	 * integer or an instance of {@link ExternalLayout}.
	 *
	 * @param {string} [property] - initializer for {@link
	 * Layout#property|property}.
	 *
	 * @augments {Layout}
	 */
	var Sequence = /** @class */ (function (_super) {
	    __extends(Sequence, _super);
	    function Sequence(elementLayout, count, property) {
	        var _this = this;
	        if (!(elementLayout instanceof Layout)) {
	            throw new TypeError('elementLayout must be a Layout');
	        }
	        if (!(((count instanceof ExternalLayout) && count.isCount())
	            || (Number.isInteger(count) && (0 <= count)))) {
	            throw new TypeError('count must be non-negative integer '
	                + 'or an unsigned integer ExternalLayout');
	        }
	        var span = -1;
	        if ((!(count instanceof ExternalLayout))
	            && (0 < elementLayout.span)) {
	            span = count * elementLayout.span;
	        }
	        _this = _super.call(this, span, property) || this;
	        /** The layout for individual elements of the sequence. */
	        _this.elementLayout = elementLayout;
	        /** The number of elements in the sequence.
	         *
	         * This will be either a non-negative integer or an instance of
	         * {@link ExternalLayout} for which {@link
	         * ExternalLayout#isCount|isCount()} is `true`. */
	        _this.count = count;
	        return _this;
	    }
	    /** @override */
	    Sequence.prototype.getSpan = function (b, offset) {
	        if (0 <= this.span) {
	            return this.span;
	        }
	        if (undefined === offset) {
	            offset = 0;
	        }
	        var span = 0;
	        var count = this.count;
	        if (count instanceof ExternalLayout) {
	            count = count.decode(b, offset);
	        }
	        if (0 < this.elementLayout.span) {
	            span = count * this.elementLayout.span;
	        }
	        else {
	            var idx = 0;
	            while (idx < count) {
	                span += this.elementLayout.getSpan(b, offset + span);
	                ++idx;
	            }
	        }
	        return span;
	    };
	    /** @override */
	    Sequence.prototype.decode = function (b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        var rv = [];
	        var i = 0;
	        var count = this.count;
	        if (count instanceof ExternalLayout) {
	            count = count.decode(b, offset);
	        }
	        while (i < count) {
	            rv.push(this.elementLayout.decode(b, offset));
	            offset += this.elementLayout.getSpan(b, offset);
	            i += 1;
	        }
	        return rv;
	    };
	    /** Implement {@link Layout#encode|encode} for {@link Sequence}.
	     *
	     * **NOTE** If `src` is shorter than {@link Sequence#count|count} then
	     * the unused space in the buffer is left unchanged.  If `src` is
	     * longer than {@link Sequence#count|count} the unneeded elements are
	     * ignored.
	     *
	     * **NOTE** If {@link Layout#count|count} is an instance of {@link
	     * ExternalLayout} then the length of `src` will be encoded as the
	     * count after `src` is encoded. */
	    Sequence.prototype.encode = function (src, b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        var elo = this.elementLayout;
	        var span = src.reduce(function (span, v) {
	            return span + elo.encode(v, b, offset + span);
	        }, 0);
	        if (this.count instanceof ExternalLayout) {
	            this.count.encode(src.length, b, offset);
	        }
	        return span;
	    };
	    return Sequence;
	}(Layout));
	Layout$1.Sequence = Sequence;
	/**
	 * Represent a contiguous sequence of arbitrary layout elements as an
	 * Object.
	 *
	 * *Factory*: {@link module:Layout.struct|struct}
	 *
	 * **NOTE** The {@link Layout#span|span} of the structure is variable
	 * if any layout in {@link Structure#fields|fields} has a variable
	 * span.  When {@link Layout#encode|encoding} we must have a value for
	 * all variable-length fields, or we wouldn't be able to figure out
	 * how much space to use for storage.  We can only identify the value
	 * for a field when it has a {@link Layout#property|property}.  As
	 * such, although a structure may contain both unnamed fields and
	 * variable-length fields, it cannot contain an unnamed
	 * variable-length field.
	 *
	 * @param {Layout[]} fields - initializer for {@link
	 * Structure#fields|fields}.  An error is raised if this contains a
	 * variable-length field for which a {@link Layout#property|property}
	 * is not defined.
	 *
	 * @param {string} [property] - initializer for {@link
	 * Layout#property|property}.
	 *
	 * @param {Boolean} [decodePrefixes] - initializer for {@link
	 * Structure#decodePrefixes|property}.
	 *
	 * @throws {Error} - if `fields` contains an unnamed variable-length
	 * layout.
	 *
	 * @augments {Layout}
	 */
	var Structure = /** @class */ (function (_super) {
	    __extends(Structure, _super);
	    function Structure(fields, property, decodePrefixes) {
	        var _this = this;
	        if (!(Array.isArray(fields)
	            && fields.reduce(function (acc, v) { return acc && (v instanceof Layout); }, true))) {
	            throw new TypeError('fields must be array of Layout instances');
	        }
	        if (('boolean' === typeof property)
	            && (undefined === decodePrefixes)) {
	            decodePrefixes = property;
	            property = undefined;
	        }
	        /* Verify absence of unnamed variable-length fields. */
	        for (var _i = 0, fields_1 = fields; _i < fields_1.length; _i++) {
	            var fd = fields_1[_i];
	            if ((0 > fd.span)
	                && (undefined === fd.property)) {
	                throw new Error('fields cannot contain unnamed variable-length layout');
	            }
	        }
	        var span = -1;
	        try {
	            span = fields.reduce(function (span, fd) { return span + fd.getSpan(); }, 0);
	        }
	        catch (e) {
	            // ignore error
	        }
	        _this = _super.call(this, span, property) || this;
	        /** The sequence of {@link Layout} values that comprise the
	         * structure.
	         *
	         * The individual elements need not be the same type, and may be
	         * either scalar or aggregate layouts.  If a member layout leaves
	         * its {@link Layout#property|property} undefined the
	         * corresponding region of the buffer associated with the element
	         * will not be mutated.
	         *
	         * @type {Layout[]} */
	        _this.fields = fields;
	        /** Control behavior of {@link Layout#decode|decode()} given short
	         * buffers.
	         *
	         * In some situations a structure many be extended with additional
	         * fields over time, with older installations providing only a
	         * prefix of the full structure.  If this property is `true`
	         * decoding will accept those buffers and leave subsequent fields
	         * undefined, as long as the buffer ends at a field boundary.
	         * Defaults to `false`. */
	        _this.decodePrefixes = !!decodePrefixes;
	        return _this;
	    }
	    /** @override */
	    Structure.prototype.getSpan = function (b, offset) {
	        if (0 <= this.span) {
	            return this.span;
	        }
	        if (undefined === offset) {
	            offset = 0;
	        }
	        var span = 0;
	        try {
	            span = this.fields.reduce(function (span, fd) {
	                var fsp = fd.getSpan(b, offset);
	                offset += fsp;
	                return span + fsp;
	            }, 0);
	        }
	        catch (e) {
	            throw new RangeError('indeterminate span');
	        }
	        return span;
	    };
	    /** @override */
	    Structure.prototype.decode = function (b, offset) {
	        checkUint8Array(b);
	        if (undefined === offset) {
	            offset = 0;
	        }
	        var dest = this.makeDestinationObject();
	        for (var _i = 0, _a = this.fields; _i < _a.length; _i++) {
	            var fd = _a[_i];
	            if (undefined !== fd.property) {
	                dest[fd.property] = fd.decode(b, offset);
	            }
	            offset += fd.getSpan(b, offset);
	            if (this.decodePrefixes
	                && (b.length === offset)) {
	                break;
	            }
	        }
	        return dest;
	    };
	    /** Implement {@link Layout#encode|encode} for {@link Structure}.
	     *
	     * If `src` is missing a property for a member with a defined {@link
	     * Layout#property|property} the corresponding region of the buffer is
	     * left unmodified. */
	    Structure.prototype.encode = function (src, b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        var firstOffset = offset;
	        var lastOffset = 0;
	        var lastWrote = 0;
	        for (var _i = 0, _a = this.fields; _i < _a.length; _i++) {
	            var fd = _a[_i];
	            var span = fd.span;
	            lastWrote = (0 < span) ? span : 0;
	            if (undefined !== fd.property) {
	                var fv = src[fd.property];
	                if (undefined !== fv) {
	                    lastWrote = fd.encode(fv, b, offset);
	                    if (0 > span) {
	                        /* Read the as-encoded span, which is not necessarily the
	                         * same as what we wrote. */
	                        span = fd.getSpan(b, offset);
	                    }
	                }
	            }
	            lastOffset = offset;
	            offset += span;
	        }
	        /* Use (lastOffset + lastWrote) instead of offset because the last
	         * item may have had a dynamic length and we don't want to include
	         * the padding between it and the end of the space reserved for
	         * it. */
	        return (lastOffset + lastWrote) - firstOffset;
	    };
	    /** @override */
	    Structure.prototype.fromArray = function (values) {
	        var dest = this.makeDestinationObject();
	        for (var _i = 0, _a = this.fields; _i < _a.length; _i++) {
	            var fd = _a[_i];
	            if ((undefined !== fd.property)
	                && (0 < values.length)) {
	                dest[fd.property] = values.shift();
	            }
	        }
	        return dest;
	    };
	    /**
	     * Get access to the layout of a given property.
	     *
	     * @param {String} property - the structure member of interest.
	     *
	     * @return {Layout} - the layout associated with `property`, or
	     * undefined if there is no such property.
	     */
	    Structure.prototype.layoutFor = function (property) {
	        if ('string' !== typeof property) {
	            throw new TypeError('property must be string');
	        }
	        for (var _i = 0, _a = this.fields; _i < _a.length; _i++) {
	            var fd = _a[_i];
	            if (fd.property === property) {
	                return fd;
	            }
	        }
	        return undefined;
	    };
	    /**
	     * Get the offset of a structure member.
	     *
	     * @param {String} property - the structure member of interest.
	     *
	     * @return {Number} - the offset in bytes to the start of `property`
	     * within the structure, or undefined if `property` is not a field
	     * within the structure.  If the property is a member but follows a
	     * variable-length structure member a negative number will be
	     * returned.
	     */
	    Structure.prototype.offsetOf = function (property) {
	        if ('string' !== typeof property) {
	            throw new TypeError('property must be string');
	        }
	        var offset = 0;
	        for (var _i = 0, _a = this.fields; _i < _a.length; _i++) {
	            var fd = _a[_i];
	            if (fd.property === property) {
	                return offset;
	            }
	            if (0 > fd.span) {
	                offset = -1;
	            }
	            else if (0 <= offset) {
	                offset += fd.span;
	            }
	        }
	        return undefined;
	    };
	    return Structure;
	}(Layout));
	Layout$1.Structure = Structure;
	/**
	 * An object that can provide a {@link
	 * Union#discriminator|discriminator} API for {@link Union}.
	 *
	 * **NOTE** This is an abstract base class; you can create instances
	 * if it amuses you, but they won't support the {@link
	 * UnionDiscriminator#encode|encode} or {@link
	 * UnionDiscriminator#decode|decode} functions.
	 *
	 * @param {string} [property] - Default for {@link
	 * UnionDiscriminator#property|property}.
	 *
	 * @abstract
	 */
	var UnionDiscriminator = /** @class */ (function () {
	    function UnionDiscriminator(property) {
	        /** The {@link Layout#property|property} to be used when the
	         * discriminator is referenced in isolation (generally when {@link
	         * Union#decode|Union decode} cannot delegate to a specific
	         * variant). */
	        this.property = property;
	    }
	    /** Analog to {@link Layout#decode|Layout decode} for union discriminators.
	     *
	     * The implementation of this method need not reference the buffer if
	     * variant information is available through other means. */
	    UnionDiscriminator.prototype.decode = function (b, offset) {
	        throw new Error('UnionDiscriminator is abstract');
	    };
	    /** Analog to {@link Layout#decode|Layout encode} for union discriminators.
	     *
	     * The implementation of this method need not store the value if
	     * variant information is maintained through other means. */
	    UnionDiscriminator.prototype.encode = function (src, b, offset) {
	        throw new Error('UnionDiscriminator is abstract');
	    };
	    return UnionDiscriminator;
	}());
	Layout$1.UnionDiscriminator = UnionDiscriminator;
	/**
	 * An object that can provide a {@link
	 * UnionDiscriminator|discriminator API} for {@link Union} using an
	 * unsigned integral {@link Layout} instance located either inside or
	 * outside the union.
	 *
	 * @param {ExternalLayout} layout - initializes {@link
	 * UnionLayoutDiscriminator#layout|layout}.  Must satisfy {@link
	 * ExternalLayout#isCount|isCount()}.
	 *
	 * @param {string} [property] - Default for {@link
	 * UnionDiscriminator#property|property}, superseding the property
	 * from `layout`, but defaulting to `variant` if neither `property`
	 * nor layout provide a property name.
	 *
	 * @augments {UnionDiscriminator}
	 */
	var UnionLayoutDiscriminator = /** @class */ (function (_super) {
	    __extends(UnionLayoutDiscriminator, _super);
	    function UnionLayoutDiscriminator(layout, property) {
	        var _this = this;
	        if (!((layout instanceof ExternalLayout)
	            && layout.isCount())) {
	            throw new TypeError('layout must be an unsigned integer ExternalLayout');
	        }
	        _this = _super.call(this, property || layout.property || 'variant') || this;
	        /** The {@link ExternalLayout} used to access the discriminator
	         * value. */
	        _this.layout = layout;
	        return _this;
	    }
	    /** Delegate decoding to {@link UnionLayoutDiscriminator#layout|layout}. */
	    UnionLayoutDiscriminator.prototype.decode = function (b, offset) {
	        return this.layout.decode(b, offset);
	    };
	    /** Delegate encoding to {@link UnionLayoutDiscriminator#layout|layout}. */
	    UnionLayoutDiscriminator.prototype.encode = function (src, b, offset) {
	        return this.layout.encode(src, b, offset);
	    };
	    return UnionLayoutDiscriminator;
	}(UnionDiscriminator));
	Layout$1.UnionLayoutDiscriminator = UnionLayoutDiscriminator;
	/**
	 * Represent any number of span-compatible layouts.
	 *
	 * *Factory*: {@link module:Layout.union|union}
	 *
	 * If the union has a {@link Union#defaultLayout|default layout} that
	 * layout must have a non-negative {@link Layout#span|span}.  The span
	 * of a fixed-span union includes its {@link
	 * Union#discriminator|discriminator} if the variant is a {@link
	 * Union#usesPrefixDiscriminator|prefix of the union}, plus the span
	 * of its {@link Union#defaultLayout|default layout}.
	 *
	 * If the union does not have a default layout then the encoded span
	 * of the union depends on the encoded span of its variant (which may
	 * be fixed or variable).
	 *
	 * {@link VariantLayout#layout|Variant layout}s are added through
	 * {@link Union#addVariant|addVariant}.  If the union has a default
	 * layout, the span of the {@link VariantLayout#layout|layout
	 * contained by the variant} must not exceed the span of the {@link
	 * Union#defaultLayout|default layout} (minus the span of a {@link
	 * Union#usesPrefixDiscriminator|prefix disriminator}, if used).  The
	 * span of the variant will equal the span of the union itself.
	 *
	 * The variant for a buffer can only be identified from the {@link
	 * Union#discriminator|discriminator} {@link
	 * UnionDiscriminator#property|property} (in the case of the {@link
	 * Union#defaultLayout|default layout}), or by using {@link
	 * Union#getVariant|getVariant} and examining the resulting {@link
	 * VariantLayout} instance.
	 *
	 * A variant compatible with a JavaScript object can be identified
	 * using {@link Union#getSourceVariant|getSourceVariant}.
	 *
	 * @param {(UnionDiscriminator|ExternalLayout|Layout)} discr - How to
	 * identify the layout used to interpret the union contents.  The
	 * parameter must be an instance of {@link UnionDiscriminator}, an
	 * {@link ExternalLayout} that satisfies {@link
	 * ExternalLayout#isCount|isCount()}, or {@link UInt} (or {@link
	 * UIntBE}).  When a non-external layout element is passed the layout
	 * appears at the start of the union.  In all cases the (synthesized)
	 * {@link UnionDiscriminator} instance is recorded as {@link
	 * Union#discriminator|discriminator}.
	 *
	 * @param {(Layout|null)} defaultLayout - initializer for {@link
	 * Union#defaultLayout|defaultLayout}.  If absent defaults to `null`.
	 * If `null` there is no default layout: the union has data-dependent
	 * length and attempts to decode or encode unrecognized variants will
	 * throw an exception.  A {@link Layout} instance must have a
	 * non-negative {@link Layout#span|span}, and if it lacks a {@link
	 * Layout#property|property} the {@link
	 * Union#defaultLayout|defaultLayout} will be a {@link
	 * Layout#replicate|replica} with property `content`.
	 *
	 * @param {string} [property] - initializer for {@link
	 * Layout#property|property}.
	 *
	 * @augments {Layout}
	 */
	var Union = /** @class */ (function (_super) {
	    __extends(Union, _super);
	    function Union(discr, defaultLayout, property) {
	        var _this = this;
	        var upv = ((discr instanceof UInt)
	            || (discr instanceof UIntBE));
	        var discriminator;
	        if (upv) {
	            discriminator = new UnionLayoutDiscriminator(new OffsetLayout(discr));
	        }
	        else if ((discr instanceof ExternalLayout)
	            && discr.isCount()) {
	            discriminator = new UnionLayoutDiscriminator(discr);
	        }
	        else if (!(discr instanceof UnionDiscriminator)) {
	            throw new TypeError('discr must be a UnionDiscriminator '
	                + 'or an unsigned integer layout');
	        }
	        else {
	            discriminator = discr;
	        }
	        if (undefined === defaultLayout) {
	            defaultLayout = null;
	        }
	        if (!((null === defaultLayout)
	            || (defaultLayout instanceof Layout))) {
	            throw new TypeError('defaultLayout must be null or a Layout');
	        }
	        if (null !== defaultLayout) {
	            if (0 > defaultLayout.span) {
	                throw new Error('defaultLayout must have constant span');
	            }
	            if (undefined === defaultLayout.property) {
	                defaultLayout = defaultLayout.replicate('content');
	            }
	        }
	        /* The union span can be estimated only if there's a default
	         * layout.  The union spans its default layout, plus any prefix
	         * variant layout.  By construction both layouts, if present, have
	         * non-negative span. */
	        var span = -1;
	        if (defaultLayout) {
	            span = defaultLayout.span;
	            if ((0 <= span) && upv) {
	                span += discriminator.layout.span;
	            }
	        }
	        _this = _super.call(this, span, property) || this;
	        /** The interface for the discriminator value in isolation.
	         *
	         * This a {@link UnionDiscriminator} either passed to the
	         * constructor or synthesized from the `discr` constructor
	         * argument.  {@link
	         * Union#usesPrefixDiscriminator|usesPrefixDiscriminator} will be
	         * `true` iff the `discr` parameter was a non-offset {@link
	         * Layout} instance. */
	        _this.discriminator = discriminator;
	        /** `true` if the {@link Union#discriminator|discriminator} is the
	         * first field in the union.
	         *
	         * If `false` the discriminator is obtained from somewhere
	         * else. */
	        _this.usesPrefixDiscriminator = upv;
	        /** The layout for non-discriminator content when the value of the
	         * discriminator is not recognized.
	         *
	         * This is the value passed to the constructor.  It is
	         * structurally equivalent to the second component of {@link
	         * Union#layout|layout} but may have a different property
	         * name. */
	        _this.defaultLayout = defaultLayout;
	        /** A registry of allowed variants.
	         *
	         * The keys are unsigned integers which should be compatible with
	         * {@link Union.discriminator|discriminator}.  The property value
	         * is the corresponding {@link VariantLayout} instances assigned
	         * to this union by {@link Union#addVariant|addVariant}.
	         *
	         * **NOTE** The registry remains mutable so that variants can be
	         * {@link Union#addVariant|added} at any time.  Users should not
	         * manipulate the content of this property. */
	        _this.registry = {};
	        /* Private variable used when invoking getSourceVariant */
	        var boundGetSourceVariant = _this.defaultGetSourceVariant.bind(_this);
	        /** Function to infer the variant selected by a source object.
	         *
	         * Defaults to {@link
	         * Union#defaultGetSourceVariant|defaultGetSourceVariant} but may
	         * be overridden using {@link
	         * Union#configGetSourceVariant|configGetSourceVariant}.
	         *
	         * @param {Object} src - as with {@link
	         * Union#defaultGetSourceVariant|defaultGetSourceVariant}.
	         *
	         * @returns {(undefined|VariantLayout)} The default variant
	         * (`undefined`) or first registered variant that uses a property
	         * available in `src`. */
	        _this.getSourceVariant = function (src) {
	            return boundGetSourceVariant(src);
	        };
	        /** Function to override the implementation of {@link
	         * Union#getSourceVariant|getSourceVariant}.
	         *
	         * Use this if the desired variant cannot be identified using the
	         * algorithm of {@link
	         * Union#defaultGetSourceVariant|defaultGetSourceVariant}.
	         *
	         * **NOTE** The provided function will be invoked bound to this
	         * Union instance, providing local access to {@link
	         * Union#registry|registry}.
	         *
	         * @param {Function} gsv - a function that follows the API of
	         * {@link Union#defaultGetSourceVariant|defaultGetSourceVariant}. */
	        _this.configGetSourceVariant = function (gsv) {
	            boundGetSourceVariant = gsv.bind(this);
	        };
	        return _this;
	    }
	    /** @override */
	    Union.prototype.getSpan = function (b, offset) {
	        if (0 <= this.span) {
	            return this.span;
	        }
	        if (undefined === offset) {
	            offset = 0;
	        }
	        /* Default layouts always have non-negative span, so we don't have
	         * one and we have to recognize the variant which will in turn
	         * determine the span. */
	        var vlo = this.getVariant(b, offset);
	        if (!vlo) {
	            throw new Error('unable to determine span for unrecognized variant');
	        }
	        return vlo.getSpan(b, offset);
	    };
	    /**
	     * Method to infer a registered Union variant compatible with `src`.
	     *
	     * The first satisfied rule in the following sequence defines the
	     * return value:
	     * * If `src` has properties matching the Union discriminator and
	     *   the default layout, `undefined` is returned regardless of the
	     *   value of the discriminator property (this ensures the default
	     *   layout will be used);
	     * * If `src` has a property matching the Union discriminator, the
	     *   value of the discriminator identifies a registered variant, and
	     *   either (a) the variant has no layout, or (b) `src` has the
	     *   variant's property, then the variant is returned (because the
	     *   source satisfies the constraints of the variant it identifies);
	     * * If `src` does not have a property matching the Union
	     *   discriminator, but does have a property matching a registered
	     *   variant, then the variant is returned (because the source
	     *   matches a variant without an explicit conflict);
	     * * An error is thrown (because we either can't identify a variant,
	     *   or we were explicitly told the variant but can't satisfy it).
	     *
	     * @param {Object} src - an object presumed to be compatible with
	     * the content of the Union.
	     *
	     * @return {(undefined|VariantLayout)} - as described above.
	     *
	     * @throws {Error} - if `src` cannot be associated with a default or
	     * registered variant.
	     */
	    Union.prototype.defaultGetSourceVariant = function (src) {
	        if (Object.prototype.hasOwnProperty.call(src, this.discriminator.property)) {
	            if (this.defaultLayout && this.defaultLayout.property
	                && Object.prototype.hasOwnProperty.call(src, this.defaultLayout.property)) {
	                return undefined;
	            }
	            var vlo = this.registry[src[this.discriminator.property]];
	            if (vlo
	                && ((!vlo.layout)
	                    || (vlo.property && Object.prototype.hasOwnProperty.call(src, vlo.property)))) {
	                return vlo;
	            }
	        }
	        else {
	            for (var tag in this.registry) {
	                var vlo = this.registry[tag];
	                if (vlo.property && Object.prototype.hasOwnProperty.call(src, vlo.property)) {
	                    return vlo;
	                }
	            }
	        }
	        throw new Error('unable to infer src variant');
	    };
	    /** Implement {@link Layout#decode|decode} for {@link Union}.
	     *
	     * If the variant is {@link Union#addVariant|registered} the return
	     * value is an instance of that variant, with no explicit
	     * discriminator.  Otherwise the {@link Union#defaultLayout|default
	     * layout} is used to decode the content. */
	    Union.prototype.decode = function (b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        var dest;
	        var dlo = this.discriminator;
	        var discr = dlo.decode(b, offset);
	        var clo = this.registry[discr];
	        if (undefined === clo) {
	            var defaultLayout = this.defaultLayout;
	            var contentOffset = 0;
	            if (this.usesPrefixDiscriminator) {
	                contentOffset = dlo.layout.span;
	            }
	            dest = this.makeDestinationObject();
	            dest[dlo.property] = discr;
	            dest[defaultLayout.property] = defaultLayout.decode(b, offset + contentOffset);
	        }
	        else {
	            dest = clo.decode(b, offset);
	        }
	        return dest;
	    };
	    /** Implement {@link Layout#encode|encode} for {@link Union}.
	     *
	     * This API assumes the `src` object is consistent with the union's
	     * {@link Union#defaultLayout|default layout}.  To encode variants
	     * use the appropriate variant-specific {@link VariantLayout#encode}
	     * method. */
	    Union.prototype.encode = function (src, b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        var vlo = this.getSourceVariant(src);
	        if (undefined === vlo) {
	            var dlo = this.discriminator;
	            // this.defaultLayout is not undefined when vlo is undefined
	            var clo = this.defaultLayout;
	            var contentOffset = 0;
	            if (this.usesPrefixDiscriminator) {
	                contentOffset = dlo.layout.span;
	            }
	            dlo.encode(src[dlo.property], b, offset);
	            // clo.property is not undefined when vlo is undefined
	            return contentOffset + clo.encode(src[clo.property], b, offset + contentOffset);
	        }
	        return vlo.encode(src, b, offset);
	    };
	    /** Register a new variant structure within a union.  The newly
	     * created variant is returned.
	     *
	     * @param {Number} variant - initializer for {@link
	     * VariantLayout#variant|variant}.
	     *
	     * @param {Layout} layout - initializer for {@link
	     * VariantLayout#layout|layout}.
	     *
	     * @param {String} property - initializer for {@link
	     * Layout#property|property}.
	     *
	     * @return {VariantLayout} */
	    Union.prototype.addVariant = function (variant, layout, property) {
	        var rv = new VariantLayout(this, variant, layout, property);
	        this.registry[variant] = rv;
	        return rv;
	    };
	    /**
	     * Get the layout associated with a registered variant.
	     *
	     * If `vb` does not produce a registered variant the function returns
	     * `undefined`.
	     *
	     * @param {(Number|Uint8Array)} vb - either the variant number, or a
	     * buffer from which the discriminator is to be read.
	     *
	     * @param {Number} offset - offset into `vb` for the start of the
	     * union.  Used only when `vb` is an instance of {Uint8Array}.
	     *
	     * @return {({VariantLayout}|undefined)}
	     */
	    Union.prototype.getVariant = function (vb, offset) {
	        var variant;
	        if (vb instanceof Uint8Array) {
	            if (undefined === offset) {
	                offset = 0;
	            }
	            variant = this.discriminator.decode(vb, offset);
	        }
	        else {
	            variant = vb;
	        }
	        return this.registry[variant];
	    };
	    return Union;
	}(Layout));
	Layout$1.Union = Union;
	/**
	 * Represent a specific variant within a containing union.
	 *
	 * **NOTE** The {@link Layout#span|span} of the variant may include
	 * the span of the {@link Union#discriminator|discriminator} used to
	 * identify it, but values read and written using the variant strictly
	 * conform to the content of {@link VariantLayout#layout|layout}.
	 *
	 * **NOTE** User code should not invoke this constructor directly.  Use
	 * the union {@link Union#addVariant|addVariant} helper method.
	 *
	 * @param {Union} union - initializer for {@link
	 * VariantLayout#union|union}.
	 *
	 * @param {Number} variant - initializer for {@link
	 * VariantLayout#variant|variant}.
	 *
	 * @param {Layout} [layout] - initializer for {@link
	 * VariantLayout#layout|layout}.  If absent the variant carries no
	 * data.
	 *
	 * @param {String} [property] - initializer for {@link
	 * Layout#property|property}.  Unlike many other layouts, variant
	 * layouts normally include a property name so they can be identified
	 * within their containing {@link Union}.  The property identifier may
	 * be absent only if `layout` is is absent.
	 *
	 * @augments {Layout}
	 */
	var VariantLayout = /** @class */ (function (_super) {
	    __extends(VariantLayout, _super);
	    function VariantLayout(union, variant, layout, property) {
	        var _this = this;
	        if (!(union instanceof Union)) {
	            throw new TypeError('union must be a Union');
	        }
	        if ((!Number.isInteger(variant)) || (0 > variant)) {
	            throw new TypeError('variant must be a (non-negative) integer');
	        }
	        if (('string' === typeof layout)
	            && (undefined === property)) {
	            property = layout;
	            layout = null;
	        }
	        if (layout) {
	            if (!(layout instanceof Layout)) {
	                throw new TypeError('layout must be a Layout');
	            }
	            if ((null !== union.defaultLayout)
	                && (0 <= layout.span)
	                && (layout.span > union.defaultLayout.span)) {
	                throw new Error('variant span exceeds span of containing union');
	            }
	            if ('string' !== typeof property) {
	                throw new TypeError('variant must have a String property');
	            }
	        }
	        var span = union.span;
	        if (0 > union.span) {
	            span = layout ? layout.span : 0;
	            if ((0 <= span) && union.usesPrefixDiscriminator) {
	                span += union.discriminator.layout.span;
	            }
	        }
	        _this = _super.call(this, span, property) || this;
	        /** The {@link Union} to which this variant belongs. */
	        _this.union = union;
	        /** The unsigned integral value identifying this variant within
	         * the {@link Union#discriminator|discriminator} of the containing
	         * union. */
	        _this.variant = variant;
	        /** The {@link Layout} to be used when reading/writing the
	         * non-discriminator part of the {@link
	         * VariantLayout#union|union}.  If `null` the variant carries no
	         * data. */
	        _this.layout = layout || null;
	        return _this;
	    }
	    /** @override */
	    VariantLayout.prototype.getSpan = function (b, offset) {
	        if (0 <= this.span) {
	            /* Will be equal to the containing union span if that is not
	             * variable. */
	            return this.span;
	        }
	        if (undefined === offset) {
	            offset = 0;
	        }
	        var contentOffset = 0;
	        if (this.union.usesPrefixDiscriminator) {
	            contentOffset = this.union.discriminator.layout.span;
	        }
	        /* Span is defined solely by the variant (and prefix discriminator) */
	        var span = 0;
	        if (this.layout) {
	            span = this.layout.getSpan(b, offset + contentOffset);
	        }
	        return contentOffset + span;
	    };
	    /** @override */
	    VariantLayout.prototype.decode = function (b, offset) {
	        var dest = this.makeDestinationObject();
	        if (undefined === offset) {
	            offset = 0;
	        }
	        if (this !== this.union.getVariant(b, offset)) {
	            throw new Error('variant mismatch');
	        }
	        var contentOffset = 0;
	        if (this.union.usesPrefixDiscriminator) {
	            contentOffset = this.union.discriminator.layout.span;
	        }
	        // VariantLayout property is never undefined
	        var property = this.property;
	        if (this.layout) {
	            dest[property] = this.layout.decode(b, offset + contentOffset);
	        }
	        else if (property) {
	            dest[property] = true;
	        }
	        else if (this.union.usesPrefixDiscriminator) {
	            dest[this.union.discriminator.property] = this.variant;
	        }
	        return dest;
	    };
	    /** @override */
	    VariantLayout.prototype.encode = function (src, b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        var contentOffset = 0;
	        if (this.union.usesPrefixDiscriminator) {
	            contentOffset = this.union.discriminator.layout.span;
	        }
	        // VariantLayout property is never undefined
	        var property = this.property;
	        if (this.layout
	            && (!Object.prototype.hasOwnProperty.call(src, property))) {
	            throw new TypeError('variant lacks property ' + property);
	        }
	        this.union.discriminator.encode(this.variant, b, offset);
	        var span = contentOffset;
	        if (this.layout) {
	            this.layout.encode(src[property], b, offset + contentOffset);
	            span += this.layout.getSpan(b, offset + contentOffset);
	            if ((0 <= this.union.span)
	                && (span > this.union.span)) {
	                throw new Error('encoded variant overruns containing union');
	            }
	        }
	        return span;
	    };
	    /** Delegate {@link Layout#fromArray|fromArray} to {@link
	     * VariantLayout#layout|layout}. */
	    VariantLayout.prototype.fromArray = function (values) {
	        if (this.layout) {
	            return this.layout.fromArray(values);
	        }
	        return undefined;
	    };
	    return VariantLayout;
	}(Layout));
	Layout$1.VariantLayout = VariantLayout;
	/** JavaScript chose to define bitwise operations as operating on
	 * signed 32-bit values in 2's complement form, meaning any integer
	 * with bit 31 set is going to look negative.  For right shifts that's
	 * not a problem, because `>>>` is a logical shift, but for every
	 * other bitwise operator we have to compensate for possible negative
	 * results. */
	function fixBitwiseResult(v) {
	    if (0 > v) {
	        v += 0x100000000;
	    }
	    return v;
	}
	/**
	 * Contain a sequence of bit fields as an unsigned integer.
	 *
	 * *Factory*: {@link module:Layout.bits|bits}
	 *
	 * This is a container element; within it there are {@link BitField}
	 * instances that provide the extracted properties.  The container
	 * simply defines the aggregate representation and its bit ordering.
	 * The representation is an object containing properties with numeric
	 * or {@link Boolean} values.
	 *
	 * {@link BitField}s are added with the {@link
	 * BitStructure#addField|addField} and {@link
	 * BitStructure#addBoolean|addBoolean} methods.

	 * @param {Layout} word - initializer for {@link
	 * BitStructure#word|word}.  The parameter must be an instance of
	 * {@link UInt} (or {@link UIntBE}) that is no more than 4 bytes wide.
	 *
	 * @param {bool} [msb] - `true` if the bit numbering starts at the
	 * most significant bit of the containing word; `false` (default) if
	 * it starts at the least significant bit of the containing word.  If
	 * the parameter at this position is a string and `property` is
	 * `undefined` the value of this argument will instead be used as the
	 * value of `property`.
	 *
	 * @param {string} [property] - initializer for {@link
	 * Layout#property|property}.
	 *
	 * @augments {Layout}
	 */
	var BitStructure = /** @class */ (function (_super) {
	    __extends(BitStructure, _super);
	    function BitStructure(word, msb, property) {
	        var _this = this;
	        if (!((word instanceof UInt)
	            || (word instanceof UIntBE))) {
	            throw new TypeError('word must be a UInt or UIntBE layout');
	        }
	        if (('string' === typeof msb)
	            && (undefined === property)) {
	            property = msb;
	            msb = false;
	        }
	        if (4 < word.span) {
	            throw new RangeError('word cannot exceed 32 bits');
	        }
	        _this = _super.call(this, word.span, property) || this;
	        /** The layout used for the packed value.  {@link BitField}
	         * instances are packed sequentially depending on {@link
	         * BitStructure#msb|msb}. */
	        _this.word = word;
	        /** Whether the bit sequences are packed starting at the most
	         * significant bit growing down (`true`), or the least significant
	         * bit growing up (`false`).
	         *
	         * **NOTE** Regardless of this value, the least significant bit of
	         * any {@link BitField} value is the least significant bit of the
	         * corresponding section of the packed value. */
	        _this.msb = !!msb;
	        /** The sequence of {@link BitField} layouts that comprise the
	         * packed structure.
	         *
	         * **NOTE** The array remains mutable to allow fields to be {@link
	         * BitStructure#addField|added} after construction.  Users should
	         * not manipulate the content of this property.*/
	        _this.fields = [];
	        /* Storage for the value.  Capture a variable instead of using an
	         * instance property because we don't want anything to change the
	         * value without going through the mutator. */
	        var value = 0;
	        _this._packedSetValue = function (v) {
	            value = fixBitwiseResult(v);
	            return this;
	        };
	        _this._packedGetValue = function () {
	            return value;
	        };
	        return _this;
	    }
	    /** @override */
	    BitStructure.prototype.decode = function (b, offset) {
	        var dest = this.makeDestinationObject();
	        if (undefined === offset) {
	            offset = 0;
	        }
	        var value = this.word.decode(b, offset);
	        this._packedSetValue(value);
	        for (var _i = 0, _a = this.fields; _i < _a.length; _i++) {
	            var fd = _a[_i];
	            if (undefined !== fd.property) {
	                dest[fd.property] = fd.decode(value);
	            }
	        }
	        return dest;
	    };
	    /** Implement {@link Layout#encode|encode} for {@link BitStructure}.
	     *
	     * If `src` is missing a property for a member with a defined {@link
	     * Layout#property|property} the corresponding region of the packed
	     * value is left unmodified.  Unused bits are also left unmodified. */
	    BitStructure.prototype.encode = function (src, b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        var value = this.word.decode(b, offset);
	        this._packedSetValue(value);
	        for (var _i = 0, _a = this.fields; _i < _a.length; _i++) {
	            var fd = _a[_i];
	            if (undefined !== fd.property) {
	                var fv = src[fd.property];
	                if (undefined !== fv) {
	                    fd.encode(fv);
	                }
	            }
	        }
	        return this.word.encode(this._packedGetValue(), b, offset);
	    };
	    /** Register a new bitfield with a containing bit structure.  The
	     * resulting bitfield is returned.
	     *
	     * @param {Number} bits - initializer for {@link BitField#bits|bits}.
	     *
	     * @param {string} property - initializer for {@link
	     * Layout#property|property}.
	     *
	     * @return {BitField} */
	    BitStructure.prototype.addField = function (bits, property) {
	        var bf = new BitField(this, bits, property);
	        this.fields.push(bf);
	        return bf;
	    };
	    /** As with {@link BitStructure#addField|addField} for single-bit
	     * fields with `boolean` value representation.
	     *
	     * @param {string} property - initializer for {@link
	     * Layout#property|property}.
	     *
	     * @return {Boolean} */
	    BitStructure.prototype.addBoolean = function (property) {
	        // This is my Boolean, not the Javascript one.
	        // eslint-disable-next-line no-new-wrappers
	        var bf = new Boolean$1(this, property);
	        this.fields.push(bf);
	        return bf;
	    };
	    /**
	     * Get access to the bit field for a given property.
	     *
	     * @param {String} property - the bit field of interest.
	     *
	     * @return {BitField} - the field associated with `property`, or
	     * undefined if there is no such property.
	     */
	    BitStructure.prototype.fieldFor = function (property) {
	        if ('string' !== typeof property) {
	            throw new TypeError('property must be string');
	        }
	        for (var _i = 0, _a = this.fields; _i < _a.length; _i++) {
	            var fd = _a[_i];
	            if (fd.property === property) {
	                return fd;
	            }
	        }
	        return undefined;
	    };
	    return BitStructure;
	}(Layout));
	Layout$1.BitStructure = BitStructure;
	/**
	 * Represent a sequence of bits within a {@link BitStructure}.
	 *
	 * All bit field values are represented as unsigned integers.
	 *
	 * **NOTE** User code should not invoke this constructor directly.
	 * Use the container {@link BitStructure#addField|addField} helper
	 * method.
	 *
	 * **NOTE** BitField instances are not instances of {@link Layout}
	 * since {@link Layout#span|span} measures 8-bit units.
	 *
	 * @param {BitStructure} container - initializer for {@link
	 * BitField#container|container}.
	 *
	 * @param {Number} bits - initializer for {@link BitField#bits|bits}.
	 *
	 * @param {string} [property] - initializer for {@link
	 * Layout#property|property}.
	 */
	var BitField = /** @class */ (function () {
	    function BitField(container, bits, property) {
	        if (!(container instanceof BitStructure)) {
	            throw new TypeError('container must be a BitStructure');
	        }
	        if ((!Number.isInteger(bits)) || (0 >= bits)) {
	            throw new TypeError('bits must be positive integer');
	        }
	        var totalBits = 8 * container.span;
	        var usedBits = container.fields.reduce(function (sum, fd) { return sum + fd.bits; }, 0);
	        if ((bits + usedBits) > totalBits) {
	            throw new Error('bits too long for span remainder ('
	                + (totalBits - usedBits) + ' of '
	                + totalBits + ' remain)');
	        }
	        /** The {@link BitStructure} instance to which this bit field
	         * belongs. */
	        this.container = container;
	        /** The span of this value in bits. */
	        this.bits = bits;
	        /** A mask of {@link BitField#bits|bits} bits isolating value bits
	         * that fit within the field.
	         *
	         * That is, it masks a value that has not yet been shifted into
	         * position within its containing packed integer. */
	        this.valueMask = (1 << bits) - 1;
	        if (32 === bits) { // shifted value out of range
	            this.valueMask = 0xFFFFFFFF;
	        }
	        /** The offset of the value within the containing packed unsigned
	         * integer.  The least significant bit of the packed value is at
	         * offset zero, regardless of bit ordering used. */
	        this.start = usedBits;
	        if (this.container.msb) {
	            this.start = totalBits - usedBits - bits;
	        }
	        /** A mask of {@link BitField#bits|bits} isolating the field value
	         * within the containing packed unsigned integer. */
	        this.wordMask = fixBitwiseResult(this.valueMask << this.start);
	        /** The property name used when this bitfield is represented in an
	         * Object.
	         *
	         * Intended to be functionally equivalent to {@link
	         * Layout#property}.
	         *
	         * If left undefined the corresponding span of bits will be
	         * treated as padding: it will not be mutated by {@link
	         * Layout#encode|encode} nor represented as a property in the
	         * decoded Object. */
	        this.property = property;
	    }
	    /** Store a value into the corresponding subsequence of the containing
	     * bit field. */
	    BitField.prototype.decode = function (b, offset) {
	        var word = this.container._packedGetValue();
	        var wordValue = fixBitwiseResult(word & this.wordMask);
	        var value = wordValue >>> this.start;
	        return value;
	    };
	    /** Store a value into the corresponding subsequence of the containing
	     * bit field.
	     *
	     * **NOTE** This is not a specialization of {@link
	     * Layout#encode|Layout.encode} and there is no return value. */
	    BitField.prototype.encode = function (value) {
	        if ((!Number.isInteger(value))
	            || (value !== fixBitwiseResult(value & this.valueMask))) {
	            throw new TypeError(nameWithProperty('BitField.encode', this)
	                + ' value must be integer not exceeding ' + this.valueMask);
	        }
	        var word = this.container._packedGetValue();
	        var wordValue = fixBitwiseResult(value << this.start);
	        this.container._packedSetValue(fixBitwiseResult(word & ~this.wordMask)
	            | wordValue);
	    };
	    return BitField;
	}());
	Layout$1.BitField = BitField;
	/**
	 * Represent a single bit within a {@link BitStructure} as a
	 * JavaScript boolean.
	 *
	 * **NOTE** User code should not invoke this constructor directly.
	 * Use the container {@link BitStructure#addBoolean|addBoolean} helper
	 * method.
	 *
	 * @param {BitStructure} container - initializer for {@link
	 * BitField#container|container}.
	 *
	 * @param {string} [property] - initializer for {@link
	 * Layout#property|property}.
	 *
	 * @augments {BitField}
	 */
	/* eslint-disable no-extend-native */
	var Boolean$1 = /** @class */ (function (_super) {
	    __extends(Boolean, _super);
	    function Boolean(container, property) {
	        return _super.call(this, container, 1, property) || this;
	    }
	    /** Override {@link BitField#decode|decode} for {@link Boolean|Boolean}.
	     *
	     * @returns {boolean} */
	    Boolean.prototype.decode = function (b, offset) {
	        return !!BitField.prototype.decode.call(this, b, offset);
	    };
	    /** @override */
	    Boolean.prototype.encode = function (value) {
	        if ('boolean' === typeof value) {
	            // BitField requires integer values
	            value = +value;
	        }
	        return BitField.prototype.encode.call(this, value);
	    };
	    return Boolean;
	}(BitField));
	Layout$1.Boolean = Boolean$1;
	/* eslint-enable no-extend-native */
	/**
	 * Contain a fixed-length block of arbitrary data, represented as a
	 * Uint8Array.
	 *
	 * *Factory*: {@link module:Layout.blob|blob}
	 *
	 * @param {(Number|ExternalLayout)} length - initializes {@link
	 * Blob#length|length}.
	 *
	 * @param {String} [property] - initializer for {@link
	 * Layout#property|property}.
	 *
	 * @augments {Layout}
	 */
	var Blob$1 = /** @class */ (function (_super) {
	    __extends(Blob, _super);
	    function Blob(length, property) {
	        var _this = this;
	        if (!(((length instanceof ExternalLayout) && length.isCount())
	            || (Number.isInteger(length) && (0 <= length)))) {
	            throw new TypeError('length must be positive integer '
	                + 'or an unsigned integer ExternalLayout');
	        }
	        var span = -1;
	        if (!(length instanceof ExternalLayout)) {
	            span = length;
	        }
	        _this = _super.call(this, span, property) || this;
	        /** The number of bytes in the blob.
	         *
	         * This may be a non-negative integer, or an instance of {@link
	         * ExternalLayout} that satisfies {@link
	         * ExternalLayout#isCount|isCount()}. */
	        _this.length = length;
	        return _this;
	    }
	    /** @override */
	    Blob.prototype.getSpan = function (b, offset) {
	        var span = this.span;
	        if (0 > span) {
	            span = this.length.decode(b, offset);
	        }
	        return span;
	    };
	    /** @override */
	    Blob.prototype.decode = function (b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        var span = this.span;
	        if (0 > span) {
	            span = this.length.decode(b, offset);
	        }
	        return uint8ArrayToBuffer(b).slice(offset, offset + span);
	    };
	    /** Implement {@link Layout#encode|encode} for {@link Blob}.
	     *
	     * **NOTE** If {@link Layout#count|count} is an instance of {@link
	     * ExternalLayout} then the length of `src` will be encoded as the
	     * count after `src` is encoded. */
	    Blob.prototype.encode = function (src, b, offset) {
	        var span = this.length;
	        if (this.length instanceof ExternalLayout) {
	            span = src.length;
	        }
	        if (!(src instanceof Uint8Array && span === src.length)) {
	            throw new TypeError(nameWithProperty('Blob.encode', this)
	                + ' requires (length ' + span + ') Uint8Array as src');
	        }
	        if ((offset + span) > b.length) {
	            throw new RangeError('encoding overruns Uint8Array');
	        }
	        var srcBuffer = uint8ArrayToBuffer(src);
	        uint8ArrayToBuffer(b).write(srcBuffer.toString('hex'), offset, span, 'hex');
	        if (this.length instanceof ExternalLayout) {
	            this.length.encode(span, b, offset);
	        }
	        return span;
	    };
	    return Blob;
	}(Layout));
	Layout$1.Blob = Blob$1;
	/**
	 * Contain a `NUL`-terminated UTF8 string.
	 *
	 * *Factory*: {@link module:Layout.cstr|cstr}
	 *
	 * **NOTE** Any UTF8 string that incorporates a zero-valued byte will
	 * not be correctly decoded by this layout.
	 *
	 * @param {String} [property] - initializer for {@link
	 * Layout#property|property}.
	 *
	 * @augments {Layout}
	 */
	var CString = /** @class */ (function (_super) {
	    __extends(CString, _super);
	    function CString(property) {
	        return _super.call(this, -1, property) || this;
	    }
	    /** @override */
	    CString.prototype.getSpan = function (b, offset) {
	        checkUint8Array(b);
	        if (undefined === offset) {
	            offset = 0;
	        }
	        var idx = offset;
	        while ((idx < b.length) && (0 !== b[idx])) {
	            idx += 1;
	        }
	        return 1 + idx - offset;
	    };
	    /** @override */
	    CString.prototype.decode = function (b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        var span = this.getSpan(b, offset);
	        return uint8ArrayToBuffer(b).slice(offset, offset + span - 1).toString('utf-8');
	    };
	    /** @override */
	    CString.prototype.encode = function (src, b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        /* Must force this to a string, lest it be a number and the
	         * "utf8-encoding" below actually allocate a buffer of length
	         * src */
	        if ('string' !== typeof src) {
	            src = src.toString();
	        }
	        var srcb = buffer_1.Buffer.from(src, 'utf8');
	        var span = srcb.length;
	        if ((offset + span) > b.length) {
	            throw new RangeError('encoding overruns Buffer');
	        }
	        var buffer = uint8ArrayToBuffer(b);
	        srcb.copy(buffer, offset);
	        buffer[offset + span] = 0;
	        return span + 1;
	    };
	    return CString;
	}(Layout));
	Layout$1.CString = CString;
	/**
	 * Contain a UTF8 string with implicit length.
	 *
	 * *Factory*: {@link module:Layout.utf8|utf8}
	 *
	 * **NOTE** Because the length is implicit in the size of the buffer
	 * this layout should be used only in isolation, or in a situation
	 * where the length can be expressed by operating on a slice of the
	 * containing buffer.
	 *
	 * @param {Number} [maxSpan] - the maximum length allowed for encoded
	 * string content.  If not provided there is no bound on the allowed
	 * content.
	 *
	 * @param {String} [property] - initializer for {@link
	 * Layout#property|property}.
	 *
	 * @augments {Layout}
	 */
	var UTF8 = /** @class */ (function (_super) {
	    __extends(UTF8, _super);
	    function UTF8(maxSpan, property) {
	        var _this = this;
	        if (('string' === typeof maxSpan) && (undefined === property)) {
	            property = maxSpan;
	            maxSpan = undefined;
	        }
	        if (undefined === maxSpan) {
	            maxSpan = -1;
	        }
	        else if (!Number.isInteger(maxSpan)) {
	            throw new TypeError('maxSpan must be an integer');
	        }
	        _this = _super.call(this, -1, property) || this;
	        /** The maximum span of the layout in bytes.
	         *
	         * Positive values are generally expected.  Zero is abnormal.
	         * Attempts to encode or decode a value that exceeds this length
	         * will throw a `RangeError`.
	         *
	         * A negative value indicates that there is no bound on the length
	         * of the content. */
	        _this.maxSpan = maxSpan;
	        return _this;
	    }
	    /** @override */
	    UTF8.prototype.getSpan = function (b, offset) {
	        checkUint8Array(b);
	        if (undefined === offset) {
	            offset = 0;
	        }
	        return b.length - offset;
	    };
	    /** @override */
	    UTF8.prototype.decode = function (b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        var span = this.getSpan(b, offset);
	        if ((0 <= this.maxSpan)
	            && (this.maxSpan < span)) {
	            throw new RangeError('text length exceeds maxSpan');
	        }
	        return uint8ArrayToBuffer(b).slice(offset, offset + span).toString('utf-8');
	    };
	    /** @override */
	    UTF8.prototype.encode = function (src, b, offset) {
	        if (undefined === offset) {
	            offset = 0;
	        }
	        /* Must force this to a string, lest it be a number and the
	         * "utf8-encoding" below actually allocate a buffer of length
	         * src */
	        if ('string' !== typeof src) {
	            src = src.toString();
	        }
	        var srcb = buffer_1.Buffer.from(src, 'utf8');
	        var span = srcb.length;
	        if ((0 <= this.maxSpan)
	            && (this.maxSpan < span)) {
	            throw new RangeError('text length exceeds maxSpan');
	        }
	        if ((offset + span) > b.length) {
	            throw new RangeError('encoding overruns Buffer');
	        }
	        srcb.copy(uint8ArrayToBuffer(b), offset);
	        return span;
	    };
	    return UTF8;
	}(Layout));
	Layout$1.UTF8 = UTF8;
	/**
	 * Contain a constant value.
	 *
	 * This layout may be used in cases where a JavaScript value can be
	 * inferred without an expression in the binary encoding.  An example
	 * would be a {@link VariantLayout|variant layout} where the content
	 * is implied by the union {@link Union#discriminator|discriminator}.
	 *
	 * @param {Object|Number|String} value - initializer for {@link
	 * Constant#value|value}.  If the value is an object (or array) and
	 * the application intends the object to remain unchanged regardless
	 * of what is done to values decoded by this layout, the value should
	 * be frozen prior passing it to this constructor.
	 *
	 * @param {String} [property] - initializer for {@link
	 * Layout#property|property}.
	 *
	 * @augments {Layout}
	 */
	var Constant = /** @class */ (function (_super) {
	    __extends(Constant, _super);
	    function Constant(value, property) {
	        var _this = _super.call(this, 0, property) || this;
	        /** The value produced by this constant when the layout is {@link
	         * Constant#decode|decoded}.
	         *
	         * Any JavaScript value including `null` and `undefined` is
	         * permitted.
	         *
	         * **WARNING** If `value` passed in the constructor was not
	         * frozen, it is possible for users of decoded values to change
	         * the content of the value. */
	        _this.value = value;
	        return _this;
	    }
	    /** @override */
	    Constant.prototype.decode = function (b, offset) {
	        return this.value;
	    };
	    /** @override */
	    Constant.prototype.encode = function (src, b, offset) {
	        /* Constants take no space */
	        return 0;
	    };
	    return Constant;
	}(Layout));
	Layout$1.Constant = Constant;
	/** Factory for {@link GreedyCount}. */
	Layout$1.greedy = (function (elementSpan, property) { return new GreedyCount(elementSpan, property); });
	/** Factory for {@link OffsetLayout}. */
	var offset = Layout$1.offset = (function (layout, offset, property) { return new OffsetLayout(layout, offset, property); });
	/** Factory for {@link UInt|unsigned int layouts} spanning one
	 * byte. */
	var u8 = Layout$1.u8 = (function (property) { return new UInt(1, property); });
	/** Factory for {@link UInt|little-endian unsigned int layouts}
	 * spanning two bytes. */
	var u16 = Layout$1.u16 = (function (property) { return new UInt(2, property); });
	/** Factory for {@link UInt|little-endian unsigned int layouts}
	 * spanning three bytes. */
	Layout$1.u24 = (function (property) { return new UInt(3, property); });
	/** Factory for {@link UInt|little-endian unsigned int layouts}
	 * spanning four bytes. */
	var u32 = Layout$1.u32 = (function (property) { return new UInt(4, property); });
	/** Factory for {@link UInt|little-endian unsigned int layouts}
	 * spanning five bytes. */
	Layout$1.u40 = (function (property) { return new UInt(5, property); });
	/** Factory for {@link UInt|little-endian unsigned int layouts}
	 * spanning six bytes. */
	Layout$1.u48 = (function (property) { return new UInt(6, property); });
	/** Factory for {@link NearUInt64|little-endian unsigned int
	 * layouts} interpreted as Numbers. */
	var nu64 = Layout$1.nu64 = (function (property) { return new NearUInt64(property); });
	/** Factory for {@link UInt|big-endian unsigned int layouts}
	 * spanning two bytes. */
	Layout$1.u16be = (function (property) { return new UIntBE(2, property); });
	/** Factory for {@link UInt|big-endian unsigned int layouts}
	 * spanning three bytes. */
	Layout$1.u24be = (function (property) { return new UIntBE(3, property); });
	/** Factory for {@link UInt|big-endian unsigned int layouts}
	 * spanning four bytes. */
	Layout$1.u32be = (function (property) { return new UIntBE(4, property); });
	/** Factory for {@link UInt|big-endian unsigned int layouts}
	 * spanning five bytes. */
	Layout$1.u40be = (function (property) { return new UIntBE(5, property); });
	/** Factory for {@link UInt|big-endian unsigned int layouts}
	 * spanning six bytes. */
	Layout$1.u48be = (function (property) { return new UIntBE(6, property); });
	/** Factory for {@link NearUInt64BE|big-endian unsigned int
	 * layouts} interpreted as Numbers. */
	Layout$1.nu64be = (function (property) { return new NearUInt64BE(property); });
	/** Factory for {@link Int|signed int layouts} spanning one
	 * byte. */
	Layout$1.s8 = (function (property) { return new Int(1, property); });
	/** Factory for {@link Int|little-endian signed int layouts}
	 * spanning two bytes. */
	Layout$1.s16 = (function (property) { return new Int(2, property); });
	/** Factory for {@link Int|little-endian signed int layouts}
	 * spanning three bytes. */
	Layout$1.s24 = (function (property) { return new Int(3, property); });
	/** Factory for {@link Int|little-endian signed int layouts}
	 * spanning four bytes. */
	Layout$1.s32 = (function (property) { return new Int(4, property); });
	/** Factory for {@link Int|little-endian signed int layouts}
	 * spanning five bytes. */
	Layout$1.s40 = (function (property) { return new Int(5, property); });
	/** Factory for {@link Int|little-endian signed int layouts}
	 * spanning six bytes. */
	Layout$1.s48 = (function (property) { return new Int(6, property); });
	/** Factory for {@link NearInt64|little-endian signed int layouts}
	 * interpreted as Numbers. */
	var ns64 = Layout$1.ns64 = (function (property) { return new NearInt64(property); });
	/** Factory for {@link Int|big-endian signed int layouts}
	 * spanning two bytes. */
	Layout$1.s16be = (function (property) { return new IntBE(2, property); });
	/** Factory for {@link Int|big-endian signed int layouts}
	 * spanning three bytes. */
	Layout$1.s24be = (function (property) { return new IntBE(3, property); });
	/** Factory for {@link Int|big-endian signed int layouts}
	 * spanning four bytes. */
	Layout$1.s32be = (function (property) { return new IntBE(4, property); });
	/** Factory for {@link Int|big-endian signed int layouts}
	 * spanning five bytes. */
	Layout$1.s40be = (function (property) { return new IntBE(5, property); });
	/** Factory for {@link Int|big-endian signed int layouts}
	 * spanning six bytes. */
	Layout$1.s48be = (function (property) { return new IntBE(6, property); });
	/** Factory for {@link NearInt64BE|big-endian signed int layouts}
	 * interpreted as Numbers. */
	Layout$1.ns64be = (function (property) { return new NearInt64BE(property); });
	/** Factory for {@link Float|little-endian 32-bit floating point} values. */
	Layout$1.f32 = (function (property) { return new Float(property); });
	/** Factory for {@link FloatBE|big-endian 32-bit floating point} values. */
	Layout$1.f32be = (function (property) { return new FloatBE(property); });
	/** Factory for {@link Double|little-endian 64-bit floating point} values. */
	Layout$1.f64 = (function (property) { return new Double(property); });
	/** Factory for {@link DoubleBE|big-endian 64-bit floating point} values. */
	Layout$1.f64be = (function (property) { return new DoubleBE(property); });
	/** Factory for {@link Structure} values. */
	var struct = Layout$1.struct = (function (fields, property, decodePrefixes) {
	    return new Structure(fields, property, decodePrefixes);
	});
	/** Factory for {@link BitStructure} values. */
	Layout$1.bits = (function (word, msb, property) { return new BitStructure(word, msb, property); });
	/** Factory for {@link Sequence} values. */
	var seq = Layout$1.seq = (function (elementLayout, count, property) {
	    return new Sequence(elementLayout, count, property);
	});
	/** Factory for {@link Union} values. */
	Layout$1.union = (function (discr, defaultLayout, property) {
	    return new Union(discr, defaultLayout, property);
	});
	/** Factory for {@link UnionLayoutDiscriminator} values. */
	Layout$1.unionLayoutDiscriminator = (function (layout, property) { return new UnionLayoutDiscriminator(layout, property); });
	/** Factory for {@link Blob} values. */
	var blob = Layout$1.blob = (function (length, property) { return new Blob$1(length, property); });
	/** Factory for {@link CString} values. */
	Layout$1.cstr = (function (property) { return new CString(property); });
	/** Factory for {@link UTF8} values. */
	Layout$1.utf8 = (function (maxSpan, property) { return new UTF8(maxSpan, property); });
	/** Factory for {@link Constant} values. */
	Layout$1.constant = (function (value, property) { return new Constant(value, property); });

	/**
	 * A `StructFailure` represents a single specific failure in validation.
	 */

	/**
	 * `StructError` objects are thrown (or returned) when validation fails.
	 *
	 * Validation logic is design to exit early for maximum performance. The error
	 * represents the first error encountered during validation. For more detail,
	 * the `error.failures` property is a generator function that can be run to
	 * continue validation and receive all the failures in the data.
	 */
	class StructError extends TypeError {
	  constructor(failure, failures) {
	    let cached;
	    const {
	      message,
	      ...rest
	    } = failure;
	    const {
	      path
	    } = failure;
	    const msg = path.length === 0 ? message : "At path: " + path.join('.') + " -- " + message;
	    super(msg);
	    Object.assign(this, rest);
	    this.name = this.constructor.name;

	    this.failures = () => {
	      var _cached;

	      return (_cached = cached) != null ? _cached : cached = [failure, ...failures()];
	    };
	  }

	}

	/**
	 * Check if a value is an iterator.
	 */
	function isIterable(x) {
	  return isObject(x) && typeof x[Symbol.iterator] === 'function';
	}
	/**
	 * Check if a value is a plain object.
	 */


	function isObject(x) {
	  return typeof x === 'object' && x != null;
	}
	/**
	 * Return a value as a printable string.
	 */

	function print(value) {
	  return typeof value === 'string' ? JSON.stringify(value) : "" + value;
	}
	/**
	 * Shifts (removes and returns) the first value from the `input` iterator.
	 * Like `Array.prototype.shift()` but for an `Iterator`.
	 */

	function shiftIterator(input) {
	  const {
	    done,
	    value
	  } = input.next();
	  return done ? undefined : value;
	}
	/**
	 * Convert a single validation result to a failure.
	 */

	function toFailure(result, context, struct, value) {
	  if (result === true) {
	    return;
	  } else if (result === false) {
	    result = {};
	  } else if (typeof result === 'string') {
	    result = {
	      message: result
	    };
	  }

	  const {
	    path,
	    branch
	  } = context;
	  const {
	    type
	  } = struct;
	  const {
	    refinement,
	    message = "Expected a value of type `" + type + "`" + (refinement ? " with refinement `" + refinement + "`" : '') + ", but received: `" + print(value) + "`"
	  } = result;
	  return {
	    value,
	    type,
	    refinement,
	    key: path[path.length - 1],
	    path,
	    branch,
	    ...result,
	    message
	  };
	}
	/**
	 * Convert a validation result to an iterable of failures.
	 */

	function* toFailures(result, context, struct, value) {
	  if (!isIterable(result)) {
	    result = [result];
	  }

	  for (const r of result) {
	    const failure = toFailure(r, context, struct, value);

	    if (failure) {
	      yield failure;
	    }
	  }
	}
	/**
	 * Check a value against a struct, traversing deeply into nested values, and
	 * returning an iterator of failures or success.
	 */

	function* run(value, struct, options = {}) {
	  const {
	    path = [],
	    branch = [value],
	    coerce = false,
	    mask = false
	  } = options;
	  const ctx = {
	    path,
	    branch
	  };

	  if (coerce) {
	    value = struct.coercer(value, ctx);

	    if (mask && struct.type !== 'type' && isObject(struct.schema) && isObject(value) && !Array.isArray(value)) {
	      for (const key in value) {
	        if (struct.schema[key] === undefined) {
	          delete value[key];
	        }
	      }
	    }
	  }

	  let valid = true;

	  for (const failure of struct.validator(value, ctx)) {
	    valid = false;
	    yield [failure, undefined];
	  }

	  for (let [k, v, s] of struct.entries(value, ctx)) {
	    const ts = run(v, s, {
	      path: k === undefined ? path : [...path, k],
	      branch: k === undefined ? branch : [...branch, v],
	      coerce,
	      mask
	    });

	    for (const t of ts) {
	      if (t[0]) {
	        valid = false;
	        yield [t[0], undefined];
	      } else if (coerce) {
	        v = t[1];

	        if (k === undefined) {
	          value = v;
	        } else if (value instanceof Map) {
	          value.set(k, v);
	        } else if (value instanceof Set) {
	          value.add(v);
	        } else if (isObject(value)) {
	          value[k] = v;
	        }
	      }
	    }
	  }

	  if (valid) {
	    for (const failure of struct.refiner(value, ctx)) {
	      valid = false;
	      yield [failure, undefined];
	    }
	  }

	  if (valid) {
	    yield [undefined, value];
	  }
	}

	/**
	 * `Struct` objects encapsulate the validation logic for a specific type of
	 * values. Once constructed, you use the `assert`, `is` or `validate` helpers to
	 * validate unknown input data against the struct.
	 */

	class Struct$1 {
	  constructor(props) {
	    const {
	      type,
	      schema,
	      validator,
	      refiner,
	      coercer = value => value,
	      entries = function* () {}
	    } = props;
	    this.type = type;
	    this.schema = schema;
	    this.entries = entries;
	    this.coercer = coercer;

	    if (validator) {
	      this.validator = (value, context) => {
	        const result = validator(value, context);
	        return toFailures(result, context, this, value);
	      };
	    } else {
	      this.validator = () => [];
	    }

	    if (refiner) {
	      this.refiner = (value, context) => {
	        const result = refiner(value, context);
	        return toFailures(result, context, this, value);
	      };
	    } else {
	      this.refiner = () => [];
	    }
	  }
	  /**
	   * Assert that a value passes the struct's validation, throwing if it doesn't.
	   */


	  assert(value) {
	    return assert$7(value, this);
	  }
	  /**
	   * Create a value with the struct's coercion logic, then validate it.
	   */


	  create(value) {
	    return create(value, this);
	  }
	  /**
	   * Check if a value passes the struct's validation.
	   */


	  is(value) {
	    return is(value, this);
	  }
	  /**
	   * Mask a value, coercing and validating it, but returning only the subset of
	   * properties defined by the struct's schema.
	   */


	  mask(value) {
	    return mask(value, this);
	  }
	  /**
	   * Validate a value with the struct's validation logic, returning a tuple
	   * representing the result.
	   *
	   * You may optionally pass `true` for the `withCoercion` argument to coerce
	   * the value before attempting to validate it. If you do, the result will
	   * contain the coerced result when successful.
	   */


	  validate(value, options = {}) {
	    return validate$1(value, this, options);
	  }

	}
	/**
	 * Assert that a value passes a struct, throwing if it doesn't.
	 */

	function assert$7(value, struct) {
	  const result = validate$1(value, struct);

	  if (result[0]) {
	    throw result[0];
	  }
	}
	/**
	 * Create a value with the coercion logic of struct and validate it.
	 */

	function create(value, struct) {
	  const result = validate$1(value, struct, {
	    coerce: true
	  });

	  if (result[0]) {
	    throw result[0];
	  } else {
	    return result[1];
	  }
	}
	/**
	 * Mask a value, returning only the subset of properties defined by a struct.
	 */

	function mask(value, struct) {
	  const result = validate$1(value, struct, {
	    coerce: true,
	    mask: true
	  });

	  if (result[0]) {
	    throw result[0];
	  } else {
	    return result[1];
	  }
	}
	/**
	 * Check if a value passes a struct.
	 */

	function is(value, struct) {
	  const result = validate$1(value, struct);
	  return !result[0];
	}
	/**
	 * Validate a value against a struct, returning an error if invalid, or the
	 * value (with potential coercion) if valid.
	 */

	function validate$1(value, struct, options = {}) {
	  const tuples = run(value, struct, options);
	  const tuple = shiftIterator(tuples);

	  if (tuple[0]) {
	    const error = new StructError(tuple[0], function* () {
	      for (const t of tuples) {
	        if (t[0]) {
	          yield t[0];
	        }
	      }
	    });
	    return [error, undefined];
	  } else {
	    const v = tuple[1];
	    return [undefined, v];
	  }
	}
	/**
	 * Define a new struct type with a custom validation function.
	 */

	function define(name, validator) {
	  return new Struct$1({
	    type: name,
	    schema: null,
	    validator
	  });
	}

	/**
	 * Ensure that any value passes validation.
	 */

	function any() {
	  return define('any', () => true);
	}
	function array(Element) {
	  return new Struct$1({
	    type: 'array',
	    schema: Element,

	    *entries(value) {
	      if (Element && Array.isArray(value)) {
	        for (const [i, v] of value.entries()) {
	          yield [i, v, Element];
	        }
	      }
	    },

	    coercer(value) {
	      return Array.isArray(value) ? value.slice() : value;
	    },

	    validator(value) {
	      return Array.isArray(value) || "Expected an array value, but received: " + print(value);
	    }

	  });
	}
	/**
	 * Ensure that a value is a boolean.
	 */

	function boolean() {
	  return define('boolean', value => {
	    return typeof value === 'boolean';
	  });
	}
	/**
	 * Ensure that a value is an instance of a specific class.
	 */

	function instance(Class) {
	  return define('instance', value => {
	    return value instanceof Class || "Expected a `" + Class.name + "` instance, but received: " + print(value);
	  });
	}
	function literal(constant) {
	  const description = print(constant);
	  const t = typeof constant;
	  return new Struct$1({
	    type: 'literal',
	    schema: t === 'string' || t === 'number' || t === 'boolean' ? constant : null,

	    validator(value) {
	      return value === constant || "Expected the literal `" + description + "`, but received: " + print(value);
	    }

	  });
	}
	/**
	 * Ensure that no value ever passes validation.
	 */

	function never() {
	  return define('never', () => false);
	}
	/**
	 * Augment an existing struct to allow `null` values.
	 */

	function nullable(struct) {
	  return new Struct$1({ ...struct,
	    validator: (value, ctx) => value === null || struct.validator(value, ctx),
	    refiner: (value, ctx) => value === null || struct.refiner(value, ctx)
	  });
	}
	/**
	 * Ensure that a value is a number.
	 */

	function number() {
	  return define('number', value => {
	    return typeof value === 'number' && !isNaN(value) || "Expected a number, but received: " + print(value);
	  });
	}
	/**
	 * Augment a struct to allow `undefined` values.
	 */

	function optional(struct) {
	  return new Struct$1({ ...struct,
	    validator: (value, ctx) => value === undefined || struct.validator(value, ctx),
	    refiner: (value, ctx) => value === undefined || struct.refiner(value, ctx)
	  });
	}
	/**
	 * Ensure that a value is an object with keys and values of specific types, but
	 * without ensuring any specific shape of properties.
	 *
	 * Like TypeScript's `Record` utility.
	 */

	function record(Key, Value) {
	  return new Struct$1({
	    type: 'record',
	    schema: null,

	    *entries(value) {
	      if (isObject(value)) {
	        for (const k in value) {
	          const v = value[k];
	          yield [k, k, Key];
	          yield [k, v, Value];
	        }
	      }
	    },

	    validator(value) {
	      return isObject(value) || "Expected an object, but received: " + print(value);
	    }

	  });
	}
	/**
	 * Ensure that a value is a string.
	 */

	function string() {
	  return define('string', value => {
	    return typeof value === 'string' || "Expected a string, but received: " + print(value);
	  });
	}
	function tuple(Elements) {
	  const Never = never();
	  return new Struct$1({
	    type: 'tuple',
	    schema: null,

	    *entries(value) {
	      if (Array.isArray(value)) {
	        const length = Math.max(Elements.length, value.length);

	        for (let i = 0; i < length; i++) {
	          yield [i, value[i], Elements[i] || Never];
	        }
	      }
	    },

	    validator(value) {
	      return Array.isArray(value) || "Expected an array, but received: " + print(value);
	    }

	  });
	}
	/**
	 * Ensure that a value has a set of known properties of specific types.
	 *
	 * Note: Unrecognized properties are allowed and untouched. This is similar to
	 * how TypeScript's structural typing works.
	 */

	function type(schema) {
	  const keys = Object.keys(schema);
	  return new Struct$1({
	    type: 'type',
	    schema,

	    *entries(value) {
	      if (isObject(value)) {
	        for (const k of keys) {
	          yield [k, value[k], schema[k]];
	        }
	      }
	    },

	    validator(value) {
	      return isObject(value) || "Expected an object, but received: " + print(value);
	    }

	  });
	}
	function union(Structs) {
	  const description = Structs.map(s => s.type).join(' | ');
	  return new Struct$1({
	    type: 'union',
	    schema: null,

	    validator(value, ctx) {
	      const failures = [];

	      for (const S of Structs) {
	        const [...tuples] = run(value, S, ctx);
	        const [first] = tuples;

	        if (!first[0]) {
	          return [];
	        } else {
	          for (const [failure] of tuples) {
	            if (failure) {
	              failures.push(failure);
	            }
	          }
	        }
	      }

	      return ["Expected the value to satisfy a union of `" + description + "`, but received: " + print(value), ...failures];
	    }

	  });
	}
	/**
	 * Ensure that any value passes validation, without widening its type to `any`.
	 */

	function unknown() {
	  return define('unknown', () => true);
	}

	/**
	 * Augment a `Struct` to add an additional coercion step to its input.
	 *
	 * This allows you to transform input data before validating it, to increase the
	 * likelihood that it passes validation—for example for default values, parsing
	 * different formats, etc.
	 *
	 * Note: You must use `create(value, Struct)` on the value to have the coercion
	 * take effect! Using simply `assert()` or `is()` will not use coercion.
	 */

	function coerce(struct, condition, coercer) {
	  return new Struct$1({ ...struct,
	    coercer: (value, ctx) => {
	      return is(value, condition) ? struct.coercer(coercer(value, ctx), ctx) : struct.coercer(value, ctx);
	    }
	  });
	}

	var index_browser = {};

	var interopRequireDefault = {exports: {}};

	(function (module) {
	function _interopRequireDefault(obj) {
	  return obj && obj.__esModule ? obj : {
	    "default": obj
	  };
	}

	module.exports = _interopRequireDefault, module.exports.__esModule = true, module.exports["default"] = module.exports;
	}(interopRequireDefault));

	var classCallCheck = {exports: {}};

	(function (module) {
	function _classCallCheck(instance, Constructor) {
	  if (!(instance instanceof Constructor)) {
	    throw new TypeError("Cannot call a class as a function");
	  }
	}

	module.exports = _classCallCheck, module.exports.__esModule = true, module.exports["default"] = module.exports;
	}(classCallCheck));

	var inherits$1 = {exports: {}};

	var setPrototypeOf = {exports: {}};

	(function (module) {
	function _setPrototypeOf(o, p) {
	  module.exports = _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
	    o.__proto__ = p;
	    return o;
	  }, module.exports.__esModule = true, module.exports["default"] = module.exports;
	  return _setPrototypeOf(o, p);
	}

	module.exports = _setPrototypeOf, module.exports.__esModule = true, module.exports["default"] = module.exports;
	}(setPrototypeOf));

	(function (module) {
	var setPrototypeOf$1 = setPrototypeOf.exports;

	function _inherits(subClass, superClass) {
	  if (typeof superClass !== "function" && superClass !== null) {
	    throw new TypeError("Super expression must either be null or a function");
	  }

	  subClass.prototype = Object.create(superClass && superClass.prototype, {
	    constructor: {
	      value: subClass,
	      writable: true,
	      configurable: true
	    }
	  });
	  Object.defineProperty(subClass, "prototype", {
	    writable: false
	  });
	  if (superClass) setPrototypeOf$1(subClass, superClass);
	}

	module.exports = _inherits, module.exports.__esModule = true, module.exports["default"] = module.exports;
	}(inherits$1));

	var possibleConstructorReturn = {exports: {}};

	var _typeof = {exports: {}};

	(function (module) {
	function _typeof(obj) {
	  "@babel/helpers - typeof";

	  return (module.exports = _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) {
	    return typeof obj;
	  } : function (obj) {
	    return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
	  }, module.exports.__esModule = true, module.exports["default"] = module.exports), _typeof(obj);
	}

	module.exports = _typeof, module.exports.__esModule = true, module.exports["default"] = module.exports;
	}(_typeof));

	var assertThisInitialized = {exports: {}};

	(function (module) {
	function _assertThisInitialized(self) {
	  if (self === void 0) {
	    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
	  }

	  return self;
	}

	module.exports = _assertThisInitialized, module.exports.__esModule = true, module.exports["default"] = module.exports;
	}(assertThisInitialized));

	(function (module) {
	var _typeof$1 = _typeof.exports["default"];

	var assertThisInitialized$1 = assertThisInitialized.exports;

	function _possibleConstructorReturn(self, call) {
	  if (call && (_typeof$1(call) === "object" || typeof call === "function")) {
	    return call;
	  } else if (call !== void 0) {
	    throw new TypeError("Derived constructors may only return object or undefined");
	  }

	  return assertThisInitialized$1(self);
	}

	module.exports = _possibleConstructorReturn, module.exports.__esModule = true, module.exports["default"] = module.exports;
	}(possibleConstructorReturn));

	var getPrototypeOf = {exports: {}};

	(function (module) {
	function _getPrototypeOf(o) {
	  module.exports = _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
	    return o.__proto__ || Object.getPrototypeOf(o);
	  }, module.exports.__esModule = true, module.exports["default"] = module.exports;
	  return _getPrototypeOf(o);
	}

	module.exports = _getPrototypeOf, module.exports.__esModule = true, module.exports["default"] = module.exports;
	}(getPrototypeOf));

	var websocket_browser = {};

	var createClass = {exports: {}};

	(function (module) {
	function _defineProperties(target, props) {
	  for (var i = 0; i < props.length; i++) {
	    var descriptor = props[i];
	    descriptor.enumerable = descriptor.enumerable || false;
	    descriptor.configurable = true;
	    if ("value" in descriptor) descriptor.writable = true;
	    Object.defineProperty(target, descriptor.key, descriptor);
	  }
	}

	function _createClass(Constructor, protoProps, staticProps) {
	  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
	  if (staticProps) _defineProperties(Constructor, staticProps);
	  Object.defineProperty(Constructor, "prototype", {
	    writable: false
	  });
	  return Constructor;
	}

	module.exports = _createClass, module.exports.__esModule = true, module.exports["default"] = module.exports;
	}(createClass));

	var eventemitter3 = {exports: {}};

	(function (module) {

	var has = Object.prototype.hasOwnProperty
	  , prefix = '~';

	/**
	 * Constructor to create a storage for our `EE` objects.
	 * An `Events` instance is a plain object whose properties are event names.
	 *
	 * @constructor
	 * @private
	 */
	function Events() {}

	//
	// We try to not inherit from `Object.prototype`. In some engines creating an
	// instance in this way is faster than calling `Object.create(null)` directly.
	// If `Object.create(null)` is not supported we prefix the event names with a
	// character to make sure that the built-in object properties are not
	// overridden or used as an attack vector.
	//
	if (Object.create) {
	  Events.prototype = Object.create(null);

	  //
	  // This hack is needed because the `__proto__` property is still inherited in
	  // some old browsers like Android 4, iPhone 5.1, Opera 11 and Safari 5.
	  //
	  if (!new Events().__proto__) prefix = false;
	}

	/**
	 * Representation of a single event listener.
	 *
	 * @param {Function} fn The listener function.
	 * @param {*} context The context to invoke the listener with.
	 * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
	 * @constructor
	 * @private
	 */
	function EE(fn, context, once) {
	  this.fn = fn;
	  this.context = context;
	  this.once = once || false;
	}

	/**
	 * Add a listener for a given event.
	 *
	 * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
	 * @param {(String|Symbol)} event The event name.
	 * @param {Function} fn The listener function.
	 * @param {*} context The context to invoke the listener with.
	 * @param {Boolean} once Specify if the listener is a one-time listener.
	 * @returns {EventEmitter}
	 * @private
	 */
	function addListener(emitter, event, fn, context, once) {
	  if (typeof fn !== 'function') {
	    throw new TypeError('The listener must be a function');
	  }

	  var listener = new EE(fn, context || emitter, once)
	    , evt = prefix ? prefix + event : event;

	  if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
	  else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
	  else emitter._events[evt] = [emitter._events[evt], listener];

	  return emitter;
	}

	/**
	 * Clear event by name.
	 *
	 * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
	 * @param {(String|Symbol)} evt The Event name.
	 * @private
	 */
	function clearEvent(emitter, evt) {
	  if (--emitter._eventsCount === 0) emitter._events = new Events();
	  else delete emitter._events[evt];
	}

	/**
	 * Minimal `EventEmitter` interface that is molded against the Node.js
	 * `EventEmitter` interface.
	 *
	 * @constructor
	 * @public
	 */
	function EventEmitter() {
	  this._events = new Events();
	  this._eventsCount = 0;
	}

	/**
	 * Return an array listing the events for which the emitter has registered
	 * listeners.
	 *
	 * @returns {Array}
	 * @public
	 */
	EventEmitter.prototype.eventNames = function eventNames() {
	  var names = []
	    , events
	    , name;

	  if (this._eventsCount === 0) return names;

	  for (name in (events = this._events)) {
	    if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
	  }

	  if (Object.getOwnPropertySymbols) {
	    return names.concat(Object.getOwnPropertySymbols(events));
	  }

	  return names;
	};

	/**
	 * Return the listeners registered for a given event.
	 *
	 * @param {(String|Symbol)} event The event name.
	 * @returns {Array} The registered listeners.
	 * @public
	 */
	EventEmitter.prototype.listeners = function listeners(event) {
	  var evt = prefix ? prefix + event : event
	    , handlers = this._events[evt];

	  if (!handlers) return [];
	  if (handlers.fn) return [handlers.fn];

	  for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
	    ee[i] = handlers[i].fn;
	  }

	  return ee;
	};

	/**
	 * Return the number of listeners listening to a given event.
	 *
	 * @param {(String|Symbol)} event The event name.
	 * @returns {Number} The number of listeners.
	 * @public
	 */
	EventEmitter.prototype.listenerCount = function listenerCount(event) {
	  var evt = prefix ? prefix + event : event
	    , listeners = this._events[evt];

	  if (!listeners) return 0;
	  if (listeners.fn) return 1;
	  return listeners.length;
	};

	/**
	 * Calls each of the listeners registered for a given event.
	 *
	 * @param {(String|Symbol)} event The event name.
	 * @returns {Boolean} `true` if the event had listeners, else `false`.
	 * @public
	 */
	EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
	  var evt = prefix ? prefix + event : event;

	  if (!this._events[evt]) return false;

	  var listeners = this._events[evt]
	    , len = arguments.length
	    , args
	    , i;

	  if (listeners.fn) {
	    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

	    switch (len) {
	      case 1: return listeners.fn.call(listeners.context), true;
	      case 2: return listeners.fn.call(listeners.context, a1), true;
	      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
	      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
	      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
	      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
	    }

	    for (i = 1, args = new Array(len -1); i < len; i++) {
	      args[i - 1] = arguments[i];
	    }

	    listeners.fn.apply(listeners.context, args);
	  } else {
	    var length = listeners.length
	      , j;

	    for (i = 0; i < length; i++) {
	      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

	      switch (len) {
	        case 1: listeners[i].fn.call(listeners[i].context); break;
	        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
	        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
	        case 4: listeners[i].fn.call(listeners[i].context, a1, a2, a3); break;
	        default:
	          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
	            args[j - 1] = arguments[j];
	          }

	          listeners[i].fn.apply(listeners[i].context, args);
	      }
	    }
	  }

	  return true;
	};

	/**
	 * Add a listener for a given event.
	 *
	 * @param {(String|Symbol)} event The event name.
	 * @param {Function} fn The listener function.
	 * @param {*} [context=this] The context to invoke the listener with.
	 * @returns {EventEmitter} `this`.
	 * @public
	 */
	EventEmitter.prototype.on = function on(event, fn, context) {
	  return addListener(this, event, fn, context, false);
	};

	/**
	 * Add a one-time listener for a given event.
	 *
	 * @param {(String|Symbol)} event The event name.
	 * @param {Function} fn The listener function.
	 * @param {*} [context=this] The context to invoke the listener with.
	 * @returns {EventEmitter} `this`.
	 * @public
	 */
	EventEmitter.prototype.once = function once(event, fn, context) {
	  return addListener(this, event, fn, context, true);
	};

	/**
	 * Remove the listeners of a given event.
	 *
	 * @param {(String|Symbol)} event The event name.
	 * @param {Function} fn Only remove the listeners that match this function.
	 * @param {*} context Only remove the listeners that have this context.
	 * @param {Boolean} once Only remove one-time listeners.
	 * @returns {EventEmitter} `this`.
	 * @public
	 */
	EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
	  var evt = prefix ? prefix + event : event;

	  if (!this._events[evt]) return this;
	  if (!fn) {
	    clearEvent(this, evt);
	    return this;
	  }

	  var listeners = this._events[evt];

	  if (listeners.fn) {
	    if (
	      listeners.fn === fn &&
	      (!once || listeners.once) &&
	      (!context || listeners.context === context)
	    ) {
	      clearEvent(this, evt);
	    }
	  } else {
	    for (var i = 0, events = [], length = listeners.length; i < length; i++) {
	      if (
	        listeners[i].fn !== fn ||
	        (once && !listeners[i].once) ||
	        (context && listeners[i].context !== context)
	      ) {
	        events.push(listeners[i]);
	      }
	    }

	    //
	    // Reset the array, or remove it completely if we have no more listeners.
	    //
	    if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
	    else clearEvent(this, evt);
	  }

	  return this;
	};

	/**
	 * Remove all listeners, or those of the specified event.
	 *
	 * @param {(String|Symbol)} [event] The event name.
	 * @returns {EventEmitter} `this`.
	 * @public
	 */
	EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
	  var evt;

	  if (event) {
	    evt = prefix ? prefix + event : event;
	    if (this._events[evt]) clearEvent(this, evt);
	  } else {
	    this._events = new Events();
	    this._eventsCount = 0;
	  }

	  return this;
	};

	//
	// Alias methods names because people roll like that.
	//
	EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
	EventEmitter.prototype.addListener = EventEmitter.prototype.on;

	//
	// Expose the prefix.
	//
	EventEmitter.prefixed = prefix;

	//
	// Allow `EventEmitter` to be imported as module namespace.
	//
	EventEmitter.EventEmitter = EventEmitter;

	//
	// Expose the module.
	//
	{
	  module.exports = EventEmitter;
	}
	}(eventemitter3));

	/**
	 * WebSocket implements a browser-side WebSocket specification.
	 * @module Client
	 */

	(function (exports) {

	var _interopRequireDefault = interopRequireDefault.exports;

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports["default"] = _default;

	var _classCallCheck2 = _interopRequireDefault(classCallCheck.exports);

	var _createClass2 = _interopRequireDefault(createClass.exports);

	var _inherits2 = _interopRequireDefault(inherits$1.exports);

	var _possibleConstructorReturn2 = _interopRequireDefault(possibleConstructorReturn.exports);

	var _getPrototypeOf2 = _interopRequireDefault(getPrototypeOf.exports);

	var _eventemitter = eventemitter3.exports;

	function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2["default"])(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2["default"])(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2["default"])(this, result); }; }

	function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

	var WebSocketBrowserImpl = /*#__PURE__*/function (_EventEmitter) {
	  (0, _inherits2["default"])(WebSocketBrowserImpl, _EventEmitter);

	  var _super = _createSuper(WebSocketBrowserImpl);

	  /** Instantiate a WebSocket class
	   * @constructor
	   * @param {String} address - url to a websocket server
	   * @param {(Object)} options - websocket options
	   * @param {(String|Array)} protocols - a list of protocols
	   * @return {WebSocketBrowserImpl} - returns a WebSocket instance
	   */
	  function WebSocketBrowserImpl(address, options, protocols) {
	    var _this;

	    (0, _classCallCheck2["default"])(this, WebSocketBrowserImpl);
	    _this = _super.call(this);
	    _this.socket = new window.WebSocket(address, protocols);

	    _this.socket.onopen = function () {
	      return _this.emit("open");
	    };

	    _this.socket.onmessage = function (event) {
	      return _this.emit("message", event.data);
	    };

	    _this.socket.onerror = function (error) {
	      return _this.emit("error", error);
	    };

	    _this.socket.onclose = function (event) {
	      _this.emit("close", event.code, event.reason);
	    };

	    return _this;
	  }
	  /**
	   * Sends data through a websocket connection
	   * @method
	   * @param {(String|Object)} data - data to be sent via websocket
	   * @param {Object} optionsOrCallback - ws options
	   * @param {Function} callback - a callback called once the data is sent
	   * @return {Undefined}
	   */


	  (0, _createClass2["default"])(WebSocketBrowserImpl, [{
	    key: "send",
	    value: function send(data, optionsOrCallback, callback) {
	      var cb = callback || optionsOrCallback;

	      try {
	        this.socket.send(data);
	        cb();
	      } catch (error) {
	        cb(error);
	      }
	    }
	    /**
	     * Closes an underlying socket
	     * @method
	     * @param {Number} code - status code explaining why the connection is being closed
	     * @param {String} reason - a description why the connection is closing
	     * @return {Undefined}
	     * @throws {Error}
	     */

	  }, {
	    key: "close",
	    value: function close(code, reason) {
	      this.socket.close(code, reason);
	    }
	  }, {
	    key: "addEventListener",
	    value: function addEventListener(type, listener, options) {
	      this.socket.addEventListener(type, listener, options);
	    }
	  }]);
	  return WebSocketBrowserImpl;
	}(_eventemitter.EventEmitter);
	/**
	 * factory method for common WebSocket instance
	 * @method
	 * @param {String} address - url to a websocket server
	 * @param {(Object)} options - websocket options
	 * @return {Undefined}
	 */


	function _default(address, options) {
	  return new WebSocketBrowserImpl(address, options);
	}
	}(websocket_browser));

	var client = {};

	var runtime = {exports: {}};

	/**
	 * Copyright (c) 2014-present, Facebook, Inc.
	 *
	 * This source code is licensed under the MIT license found in the
	 * LICENSE file in the root directory of this source tree.
	 */

	(function (module) {
	var runtime = (function (exports) {

	  var Op = Object.prototype;
	  var hasOwn = Op.hasOwnProperty;
	  var undefined$1; // More compressible than void 0.
	  var $Symbol = typeof Symbol === "function" ? Symbol : {};
	  var iteratorSymbol = $Symbol.iterator || "@@iterator";
	  var asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator";
	  var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

	  function define(obj, key, value) {
	    Object.defineProperty(obj, key, {
	      value: value,
	      enumerable: true,
	      configurable: true,
	      writable: true
	    });
	    return obj[key];
	  }
	  try {
	    // IE 8 has a broken Object.defineProperty that only works on DOM objects.
	    define({}, "");
	  } catch (err) {
	    define = function(obj, key, value) {
	      return obj[key] = value;
	    };
	  }

	  function wrap(innerFn, outerFn, self, tryLocsList) {
	    // If outerFn provided and outerFn.prototype is a Generator, then outerFn.prototype instanceof Generator.
	    var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
	    var generator = Object.create(protoGenerator.prototype);
	    var context = new Context(tryLocsList || []);

	    // The ._invoke method unifies the implementations of the .next,
	    // .throw, and .return methods.
	    generator._invoke = makeInvokeMethod(innerFn, self, context);

	    return generator;
	  }
	  exports.wrap = wrap;

	  // Try/catch helper to minimize deoptimizations. Returns a completion
	  // record like context.tryEntries[i].completion. This interface could
	  // have been (and was previously) designed to take a closure to be
	  // invoked without arguments, but in all the cases we care about we
	  // already have an existing method we want to call, so there's no need
	  // to create a new function object. We can even get away with assuming
	  // the method takes exactly one argument, since that happens to be true
	  // in every case, so we don't have to touch the arguments object. The
	  // only additional allocation required is the completion record, which
	  // has a stable shape and so hopefully should be cheap to allocate.
	  function tryCatch(fn, obj, arg) {
	    try {
	      return { type: "normal", arg: fn.call(obj, arg) };
	    } catch (err) {
	      return { type: "throw", arg: err };
	    }
	  }

	  var GenStateSuspendedStart = "suspendedStart";
	  var GenStateSuspendedYield = "suspendedYield";
	  var GenStateExecuting = "executing";
	  var GenStateCompleted = "completed";

	  // Returning this object from the innerFn has the same effect as
	  // breaking out of the dispatch switch statement.
	  var ContinueSentinel = {};

	  // Dummy constructor functions that we use as the .constructor and
	  // .constructor.prototype properties for functions that return Generator
	  // objects. For full spec compliance, you may wish to configure your
	  // minifier not to mangle the names of these two functions.
	  function Generator() {}
	  function GeneratorFunction() {}
	  function GeneratorFunctionPrototype() {}

	  // This is a polyfill for %IteratorPrototype% for environments that
	  // don't natively support it.
	  var IteratorPrototype = {};
	  define(IteratorPrototype, iteratorSymbol, function () {
	    return this;
	  });

	  var getProto = Object.getPrototypeOf;
	  var NativeIteratorPrototype = getProto && getProto(getProto(values([])));
	  if (NativeIteratorPrototype &&
	      NativeIteratorPrototype !== Op &&
	      hasOwn.call(NativeIteratorPrototype, iteratorSymbol)) {
	    // This environment has a native %IteratorPrototype%; use it instead
	    // of the polyfill.
	    IteratorPrototype = NativeIteratorPrototype;
	  }

	  var Gp = GeneratorFunctionPrototype.prototype =
	    Generator.prototype = Object.create(IteratorPrototype);
	  GeneratorFunction.prototype = GeneratorFunctionPrototype;
	  define(Gp, "constructor", GeneratorFunctionPrototype);
	  define(GeneratorFunctionPrototype, "constructor", GeneratorFunction);
	  GeneratorFunction.displayName = define(
	    GeneratorFunctionPrototype,
	    toStringTagSymbol,
	    "GeneratorFunction"
	  );

	  // Helper for defining the .next, .throw, and .return methods of the
	  // Iterator interface in terms of a single ._invoke method.
	  function defineIteratorMethods(prototype) {
	    ["next", "throw", "return"].forEach(function(method) {
	      define(prototype, method, function(arg) {
	        return this._invoke(method, arg);
	      });
	    });
	  }

	  exports.isGeneratorFunction = function(genFun) {
	    var ctor = typeof genFun === "function" && genFun.constructor;
	    return ctor
	      ? ctor === GeneratorFunction ||
	        // For the native GeneratorFunction constructor, the best we can
	        // do is to check its .name property.
	        (ctor.displayName || ctor.name) === "GeneratorFunction"
	      : false;
	  };

	  exports.mark = function(genFun) {
	    if (Object.setPrototypeOf) {
	      Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
	    } else {
	      genFun.__proto__ = GeneratorFunctionPrototype;
	      define(genFun, toStringTagSymbol, "GeneratorFunction");
	    }
	    genFun.prototype = Object.create(Gp);
	    return genFun;
	  };

	  // Within the body of any async function, `await x` is transformed to
	  // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
	  // `hasOwn.call(value, "__await")` to determine if the yielded value is
	  // meant to be awaited.
	  exports.awrap = function(arg) {
	    return { __await: arg };
	  };

	  function AsyncIterator(generator, PromiseImpl) {
	    function invoke(method, arg, resolve, reject) {
	      var record = tryCatch(generator[method], generator, arg);
	      if (record.type === "throw") {
	        reject(record.arg);
	      } else {
	        var result = record.arg;
	        var value = result.value;
	        if (value &&
	            typeof value === "object" &&
	            hasOwn.call(value, "__await")) {
	          return PromiseImpl.resolve(value.__await).then(function(value) {
	            invoke("next", value, resolve, reject);
	          }, function(err) {
	            invoke("throw", err, resolve, reject);
	          });
	        }

	        return PromiseImpl.resolve(value).then(function(unwrapped) {
	          // When a yielded Promise is resolved, its final value becomes
	          // the .value of the Promise<{value,done}> result for the
	          // current iteration.
	          result.value = unwrapped;
	          resolve(result);
	        }, function(error) {
	          // If a rejected Promise was yielded, throw the rejection back
	          // into the async generator function so it can be handled there.
	          return invoke("throw", error, resolve, reject);
	        });
	      }
	    }

	    var previousPromise;

	    function enqueue(method, arg) {
	      function callInvokeWithMethodAndArg() {
	        return new PromiseImpl(function(resolve, reject) {
	          invoke(method, arg, resolve, reject);
	        });
	      }

	      return previousPromise =
	        // If enqueue has been called before, then we want to wait until
	        // all previous Promises have been resolved before calling invoke,
	        // so that results are always delivered in the correct order. If
	        // enqueue has not been called before, then it is important to
	        // call invoke immediately, without waiting on a callback to fire,
	        // so that the async generator function has the opportunity to do
	        // any necessary setup in a predictable way. This predictability
	        // is why the Promise constructor synchronously invokes its
	        // executor callback, and why async functions synchronously
	        // execute code before the first await. Since we implement simple
	        // async functions in terms of async generators, it is especially
	        // important to get this right, even though it requires care.
	        previousPromise ? previousPromise.then(
	          callInvokeWithMethodAndArg,
	          // Avoid propagating failures to Promises returned by later
	          // invocations of the iterator.
	          callInvokeWithMethodAndArg
	        ) : callInvokeWithMethodAndArg();
	    }

	    // Define the unified helper method that is used to implement .next,
	    // .throw, and .return (see defineIteratorMethods).
	    this._invoke = enqueue;
	  }

	  defineIteratorMethods(AsyncIterator.prototype);
	  define(AsyncIterator.prototype, asyncIteratorSymbol, function () {
	    return this;
	  });
	  exports.AsyncIterator = AsyncIterator;

	  // Note that simple async functions are implemented on top of
	  // AsyncIterator objects; they just return a Promise for the value of
	  // the final result produced by the iterator.
	  exports.async = function(innerFn, outerFn, self, tryLocsList, PromiseImpl) {
	    if (PromiseImpl === void 0) PromiseImpl = Promise;

	    var iter = new AsyncIterator(
	      wrap(innerFn, outerFn, self, tryLocsList),
	      PromiseImpl
	    );

	    return exports.isGeneratorFunction(outerFn)
	      ? iter // If outerFn is a generator, return the full iterator.
	      : iter.next().then(function(result) {
	          return result.done ? result.value : iter.next();
	        });
	  };

	  function makeInvokeMethod(innerFn, self, context) {
	    var state = GenStateSuspendedStart;

	    return function invoke(method, arg) {
	      if (state === GenStateExecuting) {
	        throw new Error("Generator is already running");
	      }

	      if (state === GenStateCompleted) {
	        if (method === "throw") {
	          throw arg;
	        }

	        // Be forgiving, per 25.3.3.3.3 of the spec:
	        // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
	        return doneResult();
	      }

	      context.method = method;
	      context.arg = arg;

	      while (true) {
	        var delegate = context.delegate;
	        if (delegate) {
	          var delegateResult = maybeInvokeDelegate(delegate, context);
	          if (delegateResult) {
	            if (delegateResult === ContinueSentinel) continue;
	            return delegateResult;
	          }
	        }

	        if (context.method === "next") {
	          // Setting context._sent for legacy support of Babel's
	          // function.sent implementation.
	          context.sent = context._sent = context.arg;

	        } else if (context.method === "throw") {
	          if (state === GenStateSuspendedStart) {
	            state = GenStateCompleted;
	            throw context.arg;
	          }

	          context.dispatchException(context.arg);

	        } else if (context.method === "return") {
	          context.abrupt("return", context.arg);
	        }

	        state = GenStateExecuting;

	        var record = tryCatch(innerFn, self, context);
	        if (record.type === "normal") {
	          // If an exception is thrown from innerFn, we leave state ===
	          // GenStateExecuting and loop back for another invocation.
	          state = context.done
	            ? GenStateCompleted
	            : GenStateSuspendedYield;

	          if (record.arg === ContinueSentinel) {
	            continue;
	          }

	          return {
	            value: record.arg,
	            done: context.done
	          };

	        } else if (record.type === "throw") {
	          state = GenStateCompleted;
	          // Dispatch the exception by looping back around to the
	          // context.dispatchException(context.arg) call above.
	          context.method = "throw";
	          context.arg = record.arg;
	        }
	      }
	    };
	  }

	  // Call delegate.iterator[context.method](context.arg) and handle the
	  // result, either by returning a { value, done } result from the
	  // delegate iterator, or by modifying context.method and context.arg,
	  // setting context.delegate to null, and returning the ContinueSentinel.
	  function maybeInvokeDelegate(delegate, context) {
	    var method = delegate.iterator[context.method];
	    if (method === undefined$1) {
	      // A .throw or .return when the delegate iterator has no .throw
	      // method always terminates the yield* loop.
	      context.delegate = null;

	      if (context.method === "throw") {
	        // Note: ["return"] must be used for ES3 parsing compatibility.
	        if (delegate.iterator["return"]) {
	          // If the delegate iterator has a return method, give it a
	          // chance to clean up.
	          context.method = "return";
	          context.arg = undefined$1;
	          maybeInvokeDelegate(delegate, context);

	          if (context.method === "throw") {
	            // If maybeInvokeDelegate(context) changed context.method from
	            // "return" to "throw", let that override the TypeError below.
	            return ContinueSentinel;
	          }
	        }

	        context.method = "throw";
	        context.arg = new TypeError(
	          "The iterator does not provide a 'throw' method");
	      }

	      return ContinueSentinel;
	    }

	    var record = tryCatch(method, delegate.iterator, context.arg);

	    if (record.type === "throw") {
	      context.method = "throw";
	      context.arg = record.arg;
	      context.delegate = null;
	      return ContinueSentinel;
	    }

	    var info = record.arg;

	    if (! info) {
	      context.method = "throw";
	      context.arg = new TypeError("iterator result is not an object");
	      context.delegate = null;
	      return ContinueSentinel;
	    }

	    if (info.done) {
	      // Assign the result of the finished delegate to the temporary
	      // variable specified by delegate.resultName (see delegateYield).
	      context[delegate.resultName] = info.value;

	      // Resume execution at the desired location (see delegateYield).
	      context.next = delegate.nextLoc;

	      // If context.method was "throw" but the delegate handled the
	      // exception, let the outer generator proceed normally. If
	      // context.method was "next", forget context.arg since it has been
	      // "consumed" by the delegate iterator. If context.method was
	      // "return", allow the original .return call to continue in the
	      // outer generator.
	      if (context.method !== "return") {
	        context.method = "next";
	        context.arg = undefined$1;
	      }

	    } else {
	      // Re-yield the result returned by the delegate method.
	      return info;
	    }

	    // The delegate iterator is finished, so forget it and continue with
	    // the outer generator.
	    context.delegate = null;
	    return ContinueSentinel;
	  }

	  // Define Generator.prototype.{next,throw,return} in terms of the
	  // unified ._invoke helper method.
	  defineIteratorMethods(Gp);

	  define(Gp, toStringTagSymbol, "Generator");

	  // A Generator should always return itself as the iterator object when the
	  // @@iterator function is called on it. Some browsers' implementations of the
	  // iterator prototype chain incorrectly implement this, causing the Generator
	  // object to not be returned from this call. This ensures that doesn't happen.
	  // See https://github.com/facebook/regenerator/issues/274 for more details.
	  define(Gp, iteratorSymbol, function() {
	    return this;
	  });

	  define(Gp, "toString", function() {
	    return "[object Generator]";
	  });

	  function pushTryEntry(locs) {
	    var entry = { tryLoc: locs[0] };

	    if (1 in locs) {
	      entry.catchLoc = locs[1];
	    }

	    if (2 in locs) {
	      entry.finallyLoc = locs[2];
	      entry.afterLoc = locs[3];
	    }

	    this.tryEntries.push(entry);
	  }

	  function resetTryEntry(entry) {
	    var record = entry.completion || {};
	    record.type = "normal";
	    delete record.arg;
	    entry.completion = record;
	  }

	  function Context(tryLocsList) {
	    // The root entry object (effectively a try statement without a catch
	    // or a finally block) gives us a place to store values thrown from
	    // locations where there is no enclosing try statement.
	    this.tryEntries = [{ tryLoc: "root" }];
	    tryLocsList.forEach(pushTryEntry, this);
	    this.reset(true);
	  }

	  exports.keys = function(object) {
	    var keys = [];
	    for (var key in object) {
	      keys.push(key);
	    }
	    keys.reverse();

	    // Rather than returning an object with a next method, we keep
	    // things simple and return the next function itself.
	    return function next() {
	      while (keys.length) {
	        var key = keys.pop();
	        if (key in object) {
	          next.value = key;
	          next.done = false;
	          return next;
	        }
	      }

	      // To avoid creating an additional object, we just hang the .value
	      // and .done properties off the next function object itself. This
	      // also ensures that the minifier will not anonymize the function.
	      next.done = true;
	      return next;
	    };
	  };

	  function values(iterable) {
	    if (iterable) {
	      var iteratorMethod = iterable[iteratorSymbol];
	      if (iteratorMethod) {
	        return iteratorMethod.call(iterable);
	      }

	      if (typeof iterable.next === "function") {
	        return iterable;
	      }

	      if (!isNaN(iterable.length)) {
	        var i = -1, next = function next() {
	          while (++i < iterable.length) {
	            if (hasOwn.call(iterable, i)) {
	              next.value = iterable[i];
	              next.done = false;
	              return next;
	            }
	          }

	          next.value = undefined$1;
	          next.done = true;

	          return next;
	        };

	        return next.next = next;
	      }
	    }

	    // Return an iterator with no values.
	    return { next: doneResult };
	  }
	  exports.values = values;

	  function doneResult() {
	    return { value: undefined$1, done: true };
	  }

	  Context.prototype = {
	    constructor: Context,

	    reset: function(skipTempReset) {
	      this.prev = 0;
	      this.next = 0;
	      // Resetting context._sent for legacy support of Babel's
	      // function.sent implementation.
	      this.sent = this._sent = undefined$1;
	      this.done = false;
	      this.delegate = null;

	      this.method = "next";
	      this.arg = undefined$1;

	      this.tryEntries.forEach(resetTryEntry);

	      if (!skipTempReset) {
	        for (var name in this) {
	          // Not sure about the optimal order of these conditions:
	          if (name.charAt(0) === "t" &&
	              hasOwn.call(this, name) &&
	              !isNaN(+name.slice(1))) {
	            this[name] = undefined$1;
	          }
	        }
	      }
	    },

	    stop: function() {
	      this.done = true;

	      var rootEntry = this.tryEntries[0];
	      var rootRecord = rootEntry.completion;
	      if (rootRecord.type === "throw") {
	        throw rootRecord.arg;
	      }

	      return this.rval;
	    },

	    dispatchException: function(exception) {
	      if (this.done) {
	        throw exception;
	      }

	      var context = this;
	      function handle(loc, caught) {
	        record.type = "throw";
	        record.arg = exception;
	        context.next = loc;

	        if (caught) {
	          // If the dispatched exception was caught by a catch block,
	          // then let that catch block handle the exception normally.
	          context.method = "next";
	          context.arg = undefined$1;
	        }

	        return !! caught;
	      }

	      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
	        var entry = this.tryEntries[i];
	        var record = entry.completion;

	        if (entry.tryLoc === "root") {
	          // Exception thrown outside of any try block that could handle
	          // it, so set the completion value of the entire function to
	          // throw the exception.
	          return handle("end");
	        }

	        if (entry.tryLoc <= this.prev) {
	          var hasCatch = hasOwn.call(entry, "catchLoc");
	          var hasFinally = hasOwn.call(entry, "finallyLoc");

	          if (hasCatch && hasFinally) {
	            if (this.prev < entry.catchLoc) {
	              return handle(entry.catchLoc, true);
	            } else if (this.prev < entry.finallyLoc) {
	              return handle(entry.finallyLoc);
	            }

	          } else if (hasCatch) {
	            if (this.prev < entry.catchLoc) {
	              return handle(entry.catchLoc, true);
	            }

	          } else if (hasFinally) {
	            if (this.prev < entry.finallyLoc) {
	              return handle(entry.finallyLoc);
	            }

	          } else {
	            throw new Error("try statement without catch or finally");
	          }
	        }
	      }
	    },

	    abrupt: function(type, arg) {
	      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
	        var entry = this.tryEntries[i];
	        if (entry.tryLoc <= this.prev &&
	            hasOwn.call(entry, "finallyLoc") &&
	            this.prev < entry.finallyLoc) {
	          var finallyEntry = entry;
	          break;
	        }
	      }

	      if (finallyEntry &&
	          (type === "break" ||
	           type === "continue") &&
	          finallyEntry.tryLoc <= arg &&
	          arg <= finallyEntry.finallyLoc) {
	        // Ignore the finally entry if control is not jumping to a
	        // location outside the try/catch block.
	        finallyEntry = null;
	      }

	      var record = finallyEntry ? finallyEntry.completion : {};
	      record.type = type;
	      record.arg = arg;

	      if (finallyEntry) {
	        this.method = "next";
	        this.next = finallyEntry.finallyLoc;
	        return ContinueSentinel;
	      }

	      return this.complete(record);
	    },

	    complete: function(record, afterLoc) {
	      if (record.type === "throw") {
	        throw record.arg;
	      }

	      if (record.type === "break" ||
	          record.type === "continue") {
	        this.next = record.arg;
	      } else if (record.type === "return") {
	        this.rval = this.arg = record.arg;
	        this.method = "return";
	        this.next = "end";
	      } else if (record.type === "normal" && afterLoc) {
	        this.next = afterLoc;
	      }

	      return ContinueSentinel;
	    },

	    finish: function(finallyLoc) {
	      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
	        var entry = this.tryEntries[i];
	        if (entry.finallyLoc === finallyLoc) {
	          this.complete(entry.completion, entry.afterLoc);
	          resetTryEntry(entry);
	          return ContinueSentinel;
	        }
	      }
	    },

	    "catch": function(tryLoc) {
	      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
	        var entry = this.tryEntries[i];
	        if (entry.tryLoc === tryLoc) {
	          var record = entry.completion;
	          if (record.type === "throw") {
	            var thrown = record.arg;
	            resetTryEntry(entry);
	          }
	          return thrown;
	        }
	      }

	      // The context.catch method must only be called with a location
	      // argument that corresponds to a known catch block.
	      throw new Error("illegal catch attempt");
	    },

	    delegateYield: function(iterable, resultName, nextLoc) {
	      this.delegate = {
	        iterator: values(iterable),
	        resultName: resultName,
	        nextLoc: nextLoc
	      };

	      if (this.method === "next") {
	        // Deliberately forget the last sent value so that we don't
	        // accidentally pass it on to the delegate.
	        this.arg = undefined$1;
	      }

	      return ContinueSentinel;
	    }
	  };

	  // Regardless of whether this script is executing as a CommonJS module
	  // or not, return the runtime object so that we can declare the variable
	  // regeneratorRuntime in the outer scope, which allows this module to be
	  // injected easily by `bin/regenerator --include-runtime script.js`.
	  return exports;

	}(
	  // If this script is executing as a CommonJS module, use module.exports
	  // as the regeneratorRuntime namespace. Otherwise create a new empty
	  // object. Either way, the resulting object will be used to initialize
	  // the regeneratorRuntime variable at the top of this file.
	  module.exports 
	));

	try {
	  regeneratorRuntime = runtime;
	} catch (accidentalStrictMode) {
	  // This module should not be running in strict mode, so the above
	  // assignment should always work unless something is misconfigured. Just
	  // in case runtime.js accidentally runs in strict mode, in modern engines
	  // we can explicitly access globalThis. In older engines we can escape
	  // strict mode using a global Function call. This could conceivably fail
	  // if a Content Security Policy forbids using Function, but in that case
	  // the proper solution is to fix the accidental strict mode problem. If
	  // you've misconfigured your bundler to force strict mode and applied a
	  // CSP to forbid Function, and you're not willing to fix either of those
	  // problems, please detail your unique predicament in a GitHub issue.
	  if (typeof globalThis === "object") {
	    globalThis.regeneratorRuntime = runtime;
	  } else {
	    Function("r", "regeneratorRuntime = r")(runtime);
	  }
	}
	}(runtime));

	var regenerator = runtime.exports;

	var asyncToGenerator = {exports: {}};

	(function (module) {
	function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
	  try {
	    var info = gen[key](arg);
	    var value = info.value;
	  } catch (error) {
	    reject(error);
	    return;
	  }

	  if (info.done) {
	    resolve(value);
	  } else {
	    Promise.resolve(value).then(_next, _throw);
	  }
	}

	function _asyncToGenerator(fn) {
	  return function () {
	    var self = this,
	        args = arguments;
	    return new Promise(function (resolve, reject) {
	      var gen = fn.apply(self, args);

	      function _next(value) {
	        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
	      }

	      function _throw(err) {
	        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
	      }

	      _next(undefined);
	    });
	  };
	}

	module.exports = _asyncToGenerator, module.exports.__esModule = true, module.exports["default"] = module.exports;
	}(asyncToGenerator));

	/*!
	Copyright (C) 2013-2017 by Andrea Giammarchi - @WebReflection

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE.

	*/

	var
	  // should be a not so common char
	  // possibly one JSON does not encode
	  // possibly one encodeURIComponent does not encode
	  // right now this char is '~' but this might change in the future
	  specialChar = '~',
	  safeSpecialChar = '\\x' + (
	    '0' + specialChar.charCodeAt(0).toString(16)
	  ).slice(-2),
	  escapedSafeSpecialChar = '\\' + safeSpecialChar,
	  specialCharRG = new RegExp(safeSpecialChar, 'g'),
	  safeSpecialCharRG = new RegExp(escapedSafeSpecialChar, 'g'),

	  safeStartWithSpecialCharRG = new RegExp('(?:^|([^\\\\]))' + escapedSafeSpecialChar),

	  indexOf = [].indexOf || function(v){
	    for(var i=this.length;i--&&this[i]!==v;);
	    return i;
	  },
	  $String = String  // there's no way to drop warnings in JSHint
	                    // about new String ... well, I need that here!
	                    // faked, and happy linter!
	;

	function generateReplacer(value, replacer, resolve) {
	  var
	    doNotIgnore = false,
	    inspect = !!replacer,
	    path = [],
	    all  = [value],
	    seen = [value],
	    mapp = [resolve ? specialChar : '[Circular]'],
	    last = value,
	    lvl  = 1,
	    i, fn
	  ;
	  if (inspect) {
	    fn = typeof replacer === 'object' ?
	      function (key, value) {
	        return key !== '' && replacer.indexOf(key) < 0 ? void 0 : value;
	      } :
	      replacer;
	  }
	  return function(key, value) {
	    // the replacer has rights to decide
	    // if a new object should be returned
	    // or if there's some key to drop
	    // let's call it here rather than "too late"
	    if (inspect) value = fn.call(this, key, value);

	    // first pass should be ignored, since it's just the initial object
	    if (doNotIgnore) {
	      if (last !== this) {
	        i = lvl - indexOf.call(all, this) - 1;
	        lvl -= i;
	        all.splice(lvl, all.length);
	        path.splice(lvl - 1, path.length);
	        last = this;
	      }
	      // console.log(lvl, key, path);
	      if (typeof value === 'object' && value) {
	    	// if object isn't referring to parent object, add to the
	        // object path stack. Otherwise it is already there.
	        if (indexOf.call(all, value) < 0) {
	          all.push(last = value);
	        }
	        lvl = all.length;
	        i = indexOf.call(seen, value);
	        if (i < 0) {
	          i = seen.push(value) - 1;
	          if (resolve) {
	            // key cannot contain specialChar but could be not a string
	            path.push(('' + key).replace(specialCharRG, safeSpecialChar));
	            mapp[i] = specialChar + path.join(specialChar);
	          } else {
	            mapp[i] = mapp[0];
	          }
	        } else {
	          value = mapp[i];
	        }
	      } else {
	        if (typeof value === 'string' && resolve) {
	          // ensure no special char involved on deserialization
	          // in this case only first char is important
	          // no need to replace all value (better performance)
	          value = value .replace(safeSpecialChar, escapedSafeSpecialChar)
	                        .replace(specialChar, safeSpecialChar);
	        }
	      }
	    } else {
	      doNotIgnore = true;
	    }
	    return value;
	  };
	}

	function retrieveFromPath(current, keys) {
	  for(var i = 0, length = keys.length; i < length; current = current[
	    // keys should be normalized back here
	    keys[i++].replace(safeSpecialCharRG, specialChar)
	  ]);
	  return current;
	}

	function generateReviver(reviver) {
	  return function(key, value) {
	    var isString = typeof value === 'string';
	    if (isString && value.charAt(0) === specialChar) {
	      return new $String(value.slice(1));
	    }
	    if (key === '') value = regenerate(value, value, {});
	    // again, only one needed, do not use the RegExp for this replacement
	    // only keys need the RegExp
	    if (isString) value = value .replace(safeStartWithSpecialCharRG, '$1' + specialChar)
	                                .replace(escapedSafeSpecialChar, safeSpecialChar);
	    return reviver ? reviver.call(this, key, value) : value;
	  };
	}

	function regenerateArray(root, current, retrieve) {
	  for (var i = 0, length = current.length; i < length; i++) {
	    current[i] = regenerate(root, current[i], retrieve);
	  }
	  return current;
	}

	function regenerateObject(root, current, retrieve) {
	  for (var key in current) {
	    if (current.hasOwnProperty(key)) {
	      current[key] = regenerate(root, current[key], retrieve);
	    }
	  }
	  return current;
	}

	function regenerate(root, current, retrieve) {
	  return current instanceof Array ?
	    // fast Array reconstruction
	    regenerateArray(root, current, retrieve) :
	    (
	      current instanceof $String ?
	        (
	          // root is an empty string
	          current.length ?
	            (
	              retrieve.hasOwnProperty(current) ?
	                retrieve[current] :
	                retrieve[current] = retrieveFromPath(
	                  root, current.split(specialChar)
	                )
	            ) :
	            root
	        ) :
	        (
	          current instanceof Object ?
	            // dedicated Object parser
	            regenerateObject(root, current, retrieve) :
	            // value as it is
	            current
	        )
	    )
	  ;
	}

	var CircularJSON = {
	  stringify: function stringify(value, replacer, space, doNotResolve) {
	    return CircularJSON.parser.stringify(
	      value,
	      generateReplacer(value, replacer, !doNotResolve),
	      space
	    );
	  },
	  parse: function parse(text, reviver) {
	    return CircularJSON.parser.parse(
	      text,
	      generateReviver(reviver)
	    );
	  },
	  // A parser should be an API 1:1 compatible with JSON
	  // it should expose stringify and parse methods.
	  // The default parser is the native JSON.
	  parser: JSON
	};

	var circularJson_node = CircularJSON;

	/**
	 * "Client" wraps "ws" or a browser-implemented "WebSocket" library
	 * according to the environment providing JSON RPC 2.0 support on top.
	 * @module Client
	 */

	(function (exports) {

	var _interopRequireDefault = interopRequireDefault.exports;

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports["default"] = void 0;

	var _regenerator = _interopRequireDefault(regenerator);

	var _asyncToGenerator2 = _interopRequireDefault(asyncToGenerator.exports);

	var _typeof2 = _interopRequireDefault(_typeof.exports);

	var _classCallCheck2 = _interopRequireDefault(classCallCheck.exports);

	var _createClass2 = _interopRequireDefault(createClass.exports);

	var _inherits2 = _interopRequireDefault(inherits$1.exports);

	var _possibleConstructorReturn2 = _interopRequireDefault(possibleConstructorReturn.exports);

	var _getPrototypeOf2 = _interopRequireDefault(getPrototypeOf.exports);

	var _eventemitter = eventemitter3.exports;

	var _circularJson = _interopRequireDefault(circularJson_node);

	function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2["default"])(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2["default"])(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2["default"])(this, result); }; }

	function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

	var __rest = function (s, e) {
	  var t = {};

	  for (var p in s) {
	    if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
	  }

	  if (s != null && typeof Object.getOwnPropertySymbols === "function") for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
	    if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
	  }
	  return t;
	}; // @ts-ignore


	var CommonClient = /*#__PURE__*/function (_EventEmitter) {
	  (0, _inherits2["default"])(CommonClient, _EventEmitter);

	  var _super = _createSuper(CommonClient);

	  /**
	   * Instantiate a Client class.
	   * @constructor
	   * @param {webSocketFactory} webSocketFactory - factory method for WebSocket
	   * @param {String} address - url to a websocket server
	   * @param {Object} options - ws options object with reconnect parameters
	   * @param {Function} generate_request_id - custom generation request Id
	   * @return {CommonClient}
	   */
	  function CommonClient(webSocketFactory) {
	    var _this;

	    var address = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "ws://localhost:8080";

	    var _a = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

	    var generate_request_id = arguments.length > 3 ? arguments[3] : undefined;
	    (0, _classCallCheck2["default"])(this, CommonClient);

	    var _a$autoconnect = _a.autoconnect,
	        autoconnect = _a$autoconnect === void 0 ? true : _a$autoconnect,
	        _a$reconnect = _a.reconnect,
	        reconnect = _a$reconnect === void 0 ? true : _a$reconnect,
	        _a$reconnect_interval = _a.reconnect_interval,
	        reconnect_interval = _a$reconnect_interval === void 0 ? 1000 : _a$reconnect_interval,
	        _a$max_reconnects = _a.max_reconnects,
	        max_reconnects = _a$max_reconnects === void 0 ? 5 : _a$max_reconnects,
	        rest_options = __rest(_a, ["autoconnect", "reconnect", "reconnect_interval", "max_reconnects"]);

	    _this = _super.call(this);
	    _this.webSocketFactory = webSocketFactory;
	    _this.queue = {};
	    _this.rpc_id = 0;
	    _this.address = address;
	    _this.autoconnect = autoconnect;
	    _this.ready = false;
	    _this.reconnect = reconnect;
	    _this.reconnect_interval = reconnect_interval;
	    _this.max_reconnects = max_reconnects;
	    _this.rest_options = rest_options;
	    _this.current_reconnects = 0;

	    _this.generate_request_id = generate_request_id || function () {
	      return ++_this.rpc_id;
	    };

	    if (_this.autoconnect) _this._connect(_this.address, Object.assign({
	      autoconnect: _this.autoconnect,
	      reconnect: _this.reconnect,
	      reconnect_interval: _this.reconnect_interval,
	      max_reconnects: _this.max_reconnects
	    }, _this.rest_options));
	    return _this;
	  }
	  /**
	   * Connects to a defined server if not connected already.
	   * @method
	   * @return {Undefined}
	   */


	  (0, _createClass2["default"])(CommonClient, [{
	    key: "connect",
	    value: function connect() {
	      if (this.socket) return;

	      this._connect(this.address, Object.assign({
	        autoconnect: this.autoconnect,
	        reconnect: this.reconnect,
	        reconnect_interval: this.reconnect_interval,
	        max_reconnects: this.max_reconnects
	      }, this.rest_options));
	    }
	    /**
	     * Calls a registered RPC method on server.
	     * @method
	     * @param {String} method - RPC method name
	     * @param {Object|Array} params - optional method parameters
	     * @param {Number} timeout - RPC reply timeout value
	     * @param {Object} ws_opts - options passed to ws
	     * @return {Promise}
	     */

	  }, {
	    key: "call",
	    value: function call(method, params, timeout, ws_opts) {
	      var _this2 = this;

	      if (!ws_opts && "object" === (0, _typeof2["default"])(timeout)) {
	        ws_opts = timeout;
	        timeout = null;
	      }

	      return new Promise(function (resolve, reject) {
	        if (!_this2.ready) return reject(new Error("socket not ready"));

	        var rpc_id = _this2.generate_request_id(method, params);

	        var message = {
	          jsonrpc: "2.0",
	          method: method,
	          params: params || null,
	          id: rpc_id
	        };

	        _this2.socket.send(JSON.stringify(message), ws_opts, function (error) {
	          if (error) return reject(error);
	          _this2.queue[rpc_id] = {
	            promise: [resolve, reject]
	          };

	          if (timeout) {
	            _this2.queue[rpc_id].timeout = setTimeout(function () {
	              delete _this2.queue[rpc_id];
	              reject(new Error("reply timeout"));
	            }, timeout);
	          }
	        });
	      });
	    }
	    /**
	     * Logins with the other side of the connection.
	     * @method
	     * @param {Object} params - Login credentials object
	     * @return {Promise}
	     */

	  }, {
	    key: "login",
	    value: function () {
	      var _login = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(params) {
	        var resp;
	        return _regenerator["default"].wrap(function _callee$(_context) {
	          while (1) {
	            switch (_context.prev = _context.next) {
	              case 0:
	                _context.next = 2;
	                return this.call("rpc.login", params);

	              case 2:
	                resp = _context.sent;

	                if (resp) {
	                  _context.next = 5;
	                  break;
	                }

	                throw new Error("authentication failed");

	              case 5:
	                return _context.abrupt("return", resp);

	              case 6:
	              case "end":
	                return _context.stop();
	            }
	          }
	        }, _callee, this);
	      }));

	      function login(_x) {
	        return _login.apply(this, arguments);
	      }

	      return login;
	    }()
	    /**
	     * Fetches a list of client's methods registered on server.
	     * @method
	     * @return {Array}
	     */

	  }, {
	    key: "listMethods",
	    value: function () {
	      var _listMethods = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2() {
	        return _regenerator["default"].wrap(function _callee2$(_context2) {
	          while (1) {
	            switch (_context2.prev = _context2.next) {
	              case 0:
	                _context2.next = 2;
	                return this.call("__listMethods");

	              case 2:
	                return _context2.abrupt("return", _context2.sent);

	              case 3:
	              case "end":
	                return _context2.stop();
	            }
	          }
	        }, _callee2, this);
	      }));

	      function listMethods() {
	        return _listMethods.apply(this, arguments);
	      }

	      return listMethods;
	    }()
	    /**
	     * Sends a JSON-RPC 2.0 notification to server.
	     * @method
	     * @param {String} method - RPC method name
	     * @param {Object} params - optional method parameters
	     * @return {Promise}
	     */

	  }, {
	    key: "notify",
	    value: function notify(method, params) {
	      var _this3 = this;

	      return new Promise(function (resolve, reject) {
	        if (!_this3.ready) return reject(new Error("socket not ready"));
	        var message = {
	          jsonrpc: "2.0",
	          method: method,
	          params: params || null
	        };

	        _this3.socket.send(JSON.stringify(message), function (error) {
	          if (error) return reject(error);
	          resolve();
	        });
	      });
	    }
	    /**
	     * Subscribes for a defined event.
	     * @method
	     * @param {String|Array} event - event name
	     * @return {Undefined}
	     * @throws {Error}
	     */

	  }, {
	    key: "subscribe",
	    value: function () {
	      var _subscribe = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(event) {
	        var result;
	        return _regenerator["default"].wrap(function _callee3$(_context3) {
	          while (1) {
	            switch (_context3.prev = _context3.next) {
	              case 0:
	                if (typeof event === "string") event = [event];
	                _context3.next = 3;
	                return this.call("rpc.on", event);

	              case 3:
	                result = _context3.sent;

	                if (!(typeof event === "string" && result[event] !== "ok")) {
	                  _context3.next = 6;
	                  break;
	                }

	                throw new Error("Failed subscribing to an event '" + event + "' with: " + result[event]);

	              case 6:
	                return _context3.abrupt("return", result);

	              case 7:
	              case "end":
	                return _context3.stop();
	            }
	          }
	        }, _callee3, this);
	      }));

	      function subscribe(_x2) {
	        return _subscribe.apply(this, arguments);
	      }

	      return subscribe;
	    }()
	    /**
	     * Unsubscribes from a defined event.
	     * @method
	     * @param {String|Array} event - event name
	     * @return {Undefined}
	     * @throws {Error}
	     */

	  }, {
	    key: "unsubscribe",
	    value: function () {
	      var _unsubscribe = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(event) {
	        var result;
	        return _regenerator["default"].wrap(function _callee4$(_context4) {
	          while (1) {
	            switch (_context4.prev = _context4.next) {
	              case 0:
	                if (typeof event === "string") event = [event];
	                _context4.next = 3;
	                return this.call("rpc.off", event);

	              case 3:
	                result = _context4.sent;

	                if (!(typeof event === "string" && result[event] !== "ok")) {
	                  _context4.next = 6;
	                  break;
	                }

	                throw new Error("Failed unsubscribing from an event with: " + result);

	              case 6:
	                return _context4.abrupt("return", result);

	              case 7:
	              case "end":
	                return _context4.stop();
	            }
	          }
	        }, _callee4, this);
	      }));

	      function unsubscribe(_x3) {
	        return _unsubscribe.apply(this, arguments);
	      }

	      return unsubscribe;
	    }()
	    /**
	     * Closes a WebSocket connection gracefully.
	     * @method
	     * @param {Number} code - socket close code
	     * @param {String} data - optional data to be sent before closing
	     * @return {Undefined}
	     */

	  }, {
	    key: "close",
	    value: function close(code, data) {
	      this.socket.close(code || 1000, data);
	    }
	    /**
	     * Connection/Message handler.
	     * @method
	     * @private
	     * @param {String} address - WebSocket API address
	     * @param {Object} options - ws options object
	     * @return {Undefined}
	     */

	  }, {
	    key: "_connect",
	    value: function _connect(address, options) {
	      var _this4 = this;

	      this.socket = this.webSocketFactory(address, options);
	      this.socket.addEventListener("open", function () {
	        _this4.ready = true;

	        _this4.emit("open");

	        _this4.current_reconnects = 0;
	      });
	      this.socket.addEventListener("message", function (_ref) {
	        var message = _ref.data;
	        if (message instanceof ArrayBuffer) message = Buffer.from(message).toString();

	        try {
	          message = _circularJson["default"].parse(message);
	        } catch (error) {
	          return;
	        } // check if any listeners are attached and forward event


	        if (message.notification && _this4.listeners(message.notification).length) {
	          if (!Object.keys(message.params).length) return _this4.emit(message.notification);
	          var args = [message.notification];
	          if (message.params.constructor === Object) args.push(message.params);else // using for-loop instead of unshift/spread because performance is better
	            for (var i = 0; i < message.params.length; i++) {
	              args.push(message.params[i]);
	            } // run as microtask so that pending queue messages are resolved first
	          // eslint-disable-next-line prefer-spread

	          return Promise.resolve().then(function () {
	            _this4.emit.apply(_this4, args);
	          });
	        }

	        if (!_this4.queue[message.id]) {
	          // general JSON RPC 2.0 events
	          if (message.method && message.params) {
	            // run as microtask so that pending queue messages are resolved first
	            return Promise.resolve().then(function () {
	              _this4.emit(message.method, message.params);
	            });
	          }

	          return;
	        } // reject early since server's response is invalid


	        if ("error" in message === "result" in message) _this4.queue[message.id].promise[1](new Error("Server response malformed. Response must include either \"result\"" + " or \"error\", but not both."));
	        if (_this4.queue[message.id].timeout) clearTimeout(_this4.queue[message.id].timeout);
	        if (message.error) _this4.queue[message.id].promise[1](message.error);else _this4.queue[message.id].promise[0](message.result);
	        delete _this4.queue[message.id];
	      });
	      this.socket.addEventListener("error", function (error) {
	        return _this4.emit("error", error);
	      });
	      this.socket.addEventListener("close", function (_ref2) {
	        var code = _ref2.code,
	            reason = _ref2.reason;
	        if (_this4.ready) // Delay close event until internal state is updated
	          setTimeout(function () {
	            return _this4.emit("close", code, reason);
	          }, 0);
	        _this4.ready = false;
	        _this4.socket = undefined;
	        if (code === 1000) return;
	        _this4.current_reconnects++;
	        if (_this4.reconnect && (_this4.max_reconnects > _this4.current_reconnects || _this4.max_reconnects === 0)) setTimeout(function () {
	          return _this4._connect(address, options);
	        }, _this4.reconnect_interval);
	      });
	    }
	  }]);
	  return CommonClient;
	}(_eventemitter.EventEmitter);

	exports["default"] = CommonClient;
	}(client));

	var _interopRequireDefault = interopRequireDefault.exports;

	Object.defineProperty(index_browser, "__esModule", {
	  value: true
	});
	var Client_1 = index_browser.Client = void 0;

	var _classCallCheck2 = _interopRequireDefault(classCallCheck.exports);

	var _inherits2 = _interopRequireDefault(inherits$1.exports);

	var _possibleConstructorReturn2 = _interopRequireDefault(possibleConstructorReturn.exports);

	var _getPrototypeOf2 = _interopRequireDefault(getPrototypeOf.exports);

	var _websocket = _interopRequireDefault(websocket_browser);

	var _client = _interopRequireDefault(client);

	function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2["default"])(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2["default"])(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2["default"])(this, result); }; }

	function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

	var Client = /*#__PURE__*/function (_CommonClient) {
	  (0, _inherits2["default"])(Client, _CommonClient);

	  var _super = _createSuper(Client);

	  function Client() {
	    var address = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "ws://localhost:8080";

	    var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
	        _ref$autoconnect = _ref.autoconnect,
	        autoconnect = _ref$autoconnect === void 0 ? true : _ref$autoconnect,
	        _ref$reconnect = _ref.reconnect,
	        reconnect = _ref$reconnect === void 0 ? true : _ref$reconnect,
	        _ref$reconnect_interv = _ref.reconnect_interval,
	        reconnect_interval = _ref$reconnect_interv === void 0 ? 1000 : _ref$reconnect_interv,
	        _ref$max_reconnects = _ref.max_reconnects,
	        max_reconnects = _ref$max_reconnects === void 0 ? 5 : _ref$max_reconnects;

	    var generate_request_id = arguments.length > 2 ? arguments[2] : undefined;
	    (0, _classCallCheck2["default"])(this, Client);
	    return _super.call(this, _websocket["default"], address, {
	      autoconnect: autoconnect,
	      reconnect: reconnect,
	      reconnect_interval: reconnect_interval,
	      max_reconnects: max_reconnects
	    }, generate_request_id);
	  }

	  return Client;
	}(_client["default"]);

	Client_1 = index_browser.Client = Client;

	// Unique ID creation requires a high quality random # generator. In the browser we therefore
	// require the crypto API and do not support built-in fallback to lower quality random number
	// generators (like Math.random()).
	var getRandomValues;
	var rnds8 = new Uint8Array(16);
	function rng() {
	  // lazy load so that environments that need to polyfill have a chance to do so
	  if (!getRandomValues) {
	    // getRandomValues needs to be invoked in a context where "this" is a Crypto implementation. Also,
	    // find the complete implementation of crypto (msCrypto) on IE11.
	    getRandomValues = typeof crypto !== 'undefined' && crypto.getRandomValues && crypto.getRandomValues.bind(crypto) || typeof msCrypto !== 'undefined' && typeof msCrypto.getRandomValues === 'function' && msCrypto.getRandomValues.bind(msCrypto);

	    if (!getRandomValues) {
	      throw new Error('crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported');
	    }
	  }

	  return getRandomValues(rnds8);
	}

	var REGEX = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;

	function validate(uuid) {
	  return typeof uuid === 'string' && REGEX.test(uuid);
	}

	/**
	 * Convert array of 16 byte values to UUID string format of the form:
	 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
	 */

	var byteToHex = [];

	for (var i = 0; i < 256; ++i) {
	  byteToHex.push((i + 0x100).toString(16).substr(1));
	}

	function stringify(arr) {
	  var offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
	  // Note: Be careful editing this code!  It's been tuned for performance
	  // and works in ways you may not expect. See https://github.com/uuidjs/uuid/pull/434
	  var uuid = (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + '-' + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + '-' + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + '-' + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + '-' + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase(); // Consistency check for valid UUID.  If this throws, it's likely due to one
	  // of the following:
	  // - One or more input array values don't map to a hex octet (leading to
	  // "undefined" in the uuid)
	  // - Invalid input values for the RFC `version` or `variant` fields

	  if (!validate(uuid)) {
	    throw TypeError('Stringified UUID is invalid');
	  }

	  return uuid;
	}

	//
	// Inspired by https://github.com/LiosK/UUID.js
	// and http://docs.python.org/library/uuid.html

	var _nodeId;

	var _clockseq; // Previous uuid creation time


	var _lastMSecs = 0;
	var _lastNSecs = 0; // See https://github.com/uuidjs/uuid for API details

	function v1(options, buf, offset) {
	  var i = buf && offset || 0;
	  var b = buf || new Array(16);
	  options = options || {};
	  var node = options.node || _nodeId;
	  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq; // node and clockseq need to be initialized to random values if they're not
	  // specified.  We do this lazily to minimize issues related to insufficient
	  // system entropy.  See #189

	  if (node == null || clockseq == null) {
	    var seedBytes = options.random || (options.rng || rng)();

	    if (node == null) {
	      // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
	      node = _nodeId = [seedBytes[0] | 0x01, seedBytes[1], seedBytes[2], seedBytes[3], seedBytes[4], seedBytes[5]];
	    }

	    if (clockseq == null) {
	      // Per 4.2.2, randomize (14 bit) clockseq
	      clockseq = _clockseq = (seedBytes[6] << 8 | seedBytes[7]) & 0x3fff;
	    }
	  } // UUID timestamps are 100 nano-second units since the Gregorian epoch,
	  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
	  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
	  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.


	  var msecs = options.msecs !== undefined ? options.msecs : Date.now(); // Per 4.2.1.2, use count of uuid's generated during the current clock
	  // cycle to simulate higher resolution clock

	  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1; // Time since last uuid creation (in msecs)

	  var dt = msecs - _lastMSecs + (nsecs - _lastNSecs) / 10000; // Per 4.2.1.2, Bump clockseq on clock regression

	  if (dt < 0 && options.clockseq === undefined) {
	    clockseq = clockseq + 1 & 0x3fff;
	  } // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
	  // time interval


	  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
	    nsecs = 0;
	  } // Per 4.2.1.2 Throw error if too many uuids are requested


	  if (nsecs >= 10000) {
	    throw new Error("uuid.v1(): Can't create more than 10M uuids/sec");
	  }

	  _lastMSecs = msecs;
	  _lastNSecs = nsecs;
	  _clockseq = clockseq; // Per 4.1.4 - Convert from unix epoch to Gregorian epoch

	  msecs += 12219292800000; // `time_low`

	  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
	  b[i++] = tl >>> 24 & 0xff;
	  b[i++] = tl >>> 16 & 0xff;
	  b[i++] = tl >>> 8 & 0xff;
	  b[i++] = tl & 0xff; // `time_mid`

	  var tmh = msecs / 0x100000000 * 10000 & 0xfffffff;
	  b[i++] = tmh >>> 8 & 0xff;
	  b[i++] = tmh & 0xff; // `time_high_and_version`

	  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version

	  b[i++] = tmh >>> 16 & 0xff; // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)

	  b[i++] = clockseq >>> 8 | 0x80; // `clock_seq_low`

	  b[i++] = clockseq & 0xff; // `node`

	  for (var n = 0; n < 6; ++n) {
	    b[i + n] = node[n];
	  }

	  return buf || stringify(b);
	}

	function parse(uuid) {
	  if (!validate(uuid)) {
	    throw TypeError('Invalid UUID');
	  }

	  var v;
	  var arr = new Uint8Array(16); // Parse ########-....-....-....-............

	  arr[0] = (v = parseInt(uuid.slice(0, 8), 16)) >>> 24;
	  arr[1] = v >>> 16 & 0xff;
	  arr[2] = v >>> 8 & 0xff;
	  arr[3] = v & 0xff; // Parse ........-####-....-....-............

	  arr[4] = (v = parseInt(uuid.slice(9, 13), 16)) >>> 8;
	  arr[5] = v & 0xff; // Parse ........-....-####-....-............

	  arr[6] = (v = parseInt(uuid.slice(14, 18), 16)) >>> 8;
	  arr[7] = v & 0xff; // Parse ........-....-....-####-............

	  arr[8] = (v = parseInt(uuid.slice(19, 23), 16)) >>> 8;
	  arr[9] = v & 0xff; // Parse ........-....-....-....-############
	  // (Use "/" to avoid 32-bit truncation when bit-shifting high-order bytes)

	  arr[10] = (v = parseInt(uuid.slice(24, 36), 16)) / 0x10000000000 & 0xff;
	  arr[11] = v / 0x100000000 & 0xff;
	  arr[12] = v >>> 24 & 0xff;
	  arr[13] = v >>> 16 & 0xff;
	  arr[14] = v >>> 8 & 0xff;
	  arr[15] = v & 0xff;
	  return arr;
	}

	function stringToBytes(str) {
	  str = unescape(encodeURIComponent(str)); // UTF8 escape

	  var bytes = [];

	  for (var i = 0; i < str.length; ++i) {
	    bytes.push(str.charCodeAt(i));
	  }

	  return bytes;
	}

	var DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
	var URL$1 = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';
	function v35 (name, version, hashfunc) {
	  function generateUUID(value, namespace, buf, offset) {
	    if (typeof value === 'string') {
	      value = stringToBytes(value);
	    }

	    if (typeof namespace === 'string') {
	      namespace = parse(namespace);
	    }

	    if (namespace.length !== 16) {
	      throw TypeError('Namespace must be array-like (16 iterable integer values, 0-255)');
	    } // Compute hash of namespace and value, Per 4.3
	    // Future: Use spread syntax when supported on all platforms, e.g. `bytes =
	    // hashfunc([...namespace, ... value])`


	    var bytes = new Uint8Array(16 + value.length);
	    bytes.set(namespace);
	    bytes.set(value, namespace.length);
	    bytes = hashfunc(bytes);
	    bytes[6] = bytes[6] & 0x0f | version;
	    bytes[8] = bytes[8] & 0x3f | 0x80;

	    if (buf) {
	      offset = offset || 0;

	      for (var i = 0; i < 16; ++i) {
	        buf[offset + i] = bytes[i];
	      }

	      return buf;
	    }

	    return stringify(bytes);
	  } // Function#name is not settable on some platforms (#270)


	  try {
	    generateUUID.name = name; // eslint-disable-next-line no-empty
	  } catch (err) {} // For CommonJS default export support


	  generateUUID.DNS = DNS;
	  generateUUID.URL = URL$1;
	  return generateUUID;
	}

	/*
	 * Browser-compatible JavaScript MD5
	 *
	 * Modification of JavaScript MD5
	 * https://github.com/blueimp/JavaScript-MD5
	 *
	 * Copyright 2011, Sebastian Tschan
	 * https://blueimp.net
	 *
	 * Licensed under the MIT license:
	 * https://opensource.org/licenses/MIT
	 *
	 * Based on
	 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
	 * Digest Algorithm, as defined in RFC 1321.
	 * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
	 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
	 * Distributed under the BSD License
	 * See http://pajhome.org.uk/crypt/md5 for more info.
	 */
	function md5(bytes) {
	  if (typeof bytes === 'string') {
	    var msg = unescape(encodeURIComponent(bytes)); // UTF8 escape

	    bytes = new Uint8Array(msg.length);

	    for (var i = 0; i < msg.length; ++i) {
	      bytes[i] = msg.charCodeAt(i);
	    }
	  }

	  return md5ToHexEncodedArray(wordsToMd5(bytesToWords(bytes), bytes.length * 8));
	}
	/*
	 * Convert an array of little-endian words to an array of bytes
	 */


	function md5ToHexEncodedArray(input) {
	  var output = [];
	  var length32 = input.length * 32;
	  var hexTab = '0123456789abcdef';

	  for (var i = 0; i < length32; i += 8) {
	    var x = input[i >> 5] >>> i % 32 & 0xff;
	    var hex = parseInt(hexTab.charAt(x >>> 4 & 0x0f) + hexTab.charAt(x & 0x0f), 16);
	    output.push(hex);
	  }

	  return output;
	}
	/**
	 * Calculate output length with padding and bit length
	 */


	function getOutputLength(inputLength8) {
	  return (inputLength8 + 64 >>> 9 << 4) + 14 + 1;
	}
	/*
	 * Calculate the MD5 of an array of little-endian words, and a bit length.
	 */


	function wordsToMd5(x, len) {
	  /* append padding */
	  x[len >> 5] |= 0x80 << len % 32;
	  x[getOutputLength(len) - 1] = len;
	  var a = 1732584193;
	  var b = -271733879;
	  var c = -1732584194;
	  var d = 271733878;

	  for (var i = 0; i < x.length; i += 16) {
	    var olda = a;
	    var oldb = b;
	    var oldc = c;
	    var oldd = d;
	    a = md5ff(a, b, c, d, x[i], 7, -680876936);
	    d = md5ff(d, a, b, c, x[i + 1], 12, -389564586);
	    c = md5ff(c, d, a, b, x[i + 2], 17, 606105819);
	    b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
	    a = md5ff(a, b, c, d, x[i + 4], 7, -176418897);
	    d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426);
	    c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341);
	    b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);
	    a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416);
	    d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417);
	    c = md5ff(c, d, a, b, x[i + 10], 17, -42063);
	    b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
	    a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682);
	    d = md5ff(d, a, b, c, x[i + 13], 12, -40341101);
	    c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290);
	    b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);
	    a = md5gg(a, b, c, d, x[i + 1], 5, -165796510);
	    d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632);
	    c = md5gg(c, d, a, b, x[i + 11], 14, 643717713);
	    b = md5gg(b, c, d, a, x[i], 20, -373897302);
	    a = md5gg(a, b, c, d, x[i + 5], 5, -701558691);
	    d = md5gg(d, a, b, c, x[i + 10], 9, 38016083);
	    c = md5gg(c, d, a, b, x[i + 15], 14, -660478335);
	    b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);
	    a = md5gg(a, b, c, d, x[i + 9], 5, 568446438);
	    d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690);
	    c = md5gg(c, d, a, b, x[i + 3], 14, -187363961);
	    b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501);
	    a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467);
	    d = md5gg(d, a, b, c, x[i + 2], 9, -51403784);
	    c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473);
	    b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734);
	    a = md5hh(a, b, c, d, x[i + 5], 4, -378558);
	    d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463);
	    c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562);
	    b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);
	    a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060);
	    d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353);
	    c = md5hh(c, d, a, b, x[i + 7], 16, -155497632);
	    b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);
	    a = md5hh(a, b, c, d, x[i + 13], 4, 681279174);
	    d = md5hh(d, a, b, c, x[i], 11, -358537222);
	    c = md5hh(c, d, a, b, x[i + 3], 16, -722521979);
	    b = md5hh(b, c, d, a, x[i + 6], 23, 76029189);
	    a = md5hh(a, b, c, d, x[i + 9], 4, -640364487);
	    d = md5hh(d, a, b, c, x[i + 12], 11, -421815835);
	    c = md5hh(c, d, a, b, x[i + 15], 16, 530742520);
	    b = md5hh(b, c, d, a, x[i + 2], 23, -995338651);
	    a = md5ii(a, b, c, d, x[i], 6, -198630844);
	    d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415);
	    c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905);
	    b = md5ii(b, c, d, a, x[i + 5], 21, -57434055);
	    a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571);
	    d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606);
	    c = md5ii(c, d, a, b, x[i + 10], 15, -1051523);
	    b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799);
	    a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359);
	    d = md5ii(d, a, b, c, x[i + 15], 10, -30611744);
	    c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380);
	    b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649);
	    a = md5ii(a, b, c, d, x[i + 4], 6, -145523070);
	    d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379);
	    c = md5ii(c, d, a, b, x[i + 2], 15, 718787259);
	    b = md5ii(b, c, d, a, x[i + 9], 21, -343485551);
	    a = safeAdd(a, olda);
	    b = safeAdd(b, oldb);
	    c = safeAdd(c, oldc);
	    d = safeAdd(d, oldd);
	  }

	  return [a, b, c, d];
	}
	/*
	 * Convert an array bytes to an array of little-endian words
	 * Characters >255 have their high-byte silently ignored.
	 */


	function bytesToWords(input) {
	  if (input.length === 0) {
	    return [];
	  }

	  var length8 = input.length * 8;
	  var output = new Uint32Array(getOutputLength(length8));

	  for (var i = 0; i < length8; i += 8) {
	    output[i >> 5] |= (input[i / 8] & 0xff) << i % 32;
	  }

	  return output;
	}
	/*
	 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
	 * to work around bugs in some JS interpreters.
	 */


	function safeAdd(x, y) {
	  var lsw = (x & 0xffff) + (y & 0xffff);
	  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
	  return msw << 16 | lsw & 0xffff;
	}
	/*
	 * Bitwise rotate a 32-bit number to the left.
	 */


	function bitRotateLeft(num, cnt) {
	  return num << cnt | num >>> 32 - cnt;
	}
	/*
	 * These functions implement the four basic operations the algorithm uses.
	 */


	function md5cmn(q, a, b, x, s, t) {
	  return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
	}

	function md5ff(a, b, c, d, x, s, t) {
	  return md5cmn(b & c | ~b & d, a, b, x, s, t);
	}

	function md5gg(a, b, c, d, x, s, t) {
	  return md5cmn(b & d | c & ~d, a, b, x, s, t);
	}

	function md5hh(a, b, c, d, x, s, t) {
	  return md5cmn(b ^ c ^ d, a, b, x, s, t);
	}

	function md5ii(a, b, c, d, x, s, t) {
	  return md5cmn(c ^ (b | ~d), a, b, x, s, t);
	}

	var v3 = v35('v3', 0x30, md5);
	var v3$1 = v3;

	function v4(options, buf, offset) {
	  options = options || {};
	  var rnds = options.random || (options.rng || rng)(); // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`

	  rnds[6] = rnds[6] & 0x0f | 0x40;
	  rnds[8] = rnds[8] & 0x3f | 0x80; // Copy bytes to buffer, if provided

	  if (buf) {
	    offset = offset || 0;

	    for (var i = 0; i < 16; ++i) {
	      buf[offset + i] = rnds[i];
	    }

	    return buf;
	  }

	  return stringify(rnds);
	}

	// Adapted from Chris Veness' SHA1 code at
	// http://www.movable-type.co.uk/scripts/sha1.html
	function f$1(s, x, y, z) {
	  switch (s) {
	    case 0:
	      return x & y ^ ~x & z;

	    case 1:
	      return x ^ y ^ z;

	    case 2:
	      return x & y ^ x & z ^ y & z;

	    case 3:
	      return x ^ y ^ z;
	  }
	}

	function ROTL(x, n) {
	  return x << n | x >>> 32 - n;
	}

	function sha1(bytes) {
	  var K = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6];
	  var H = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];

	  if (typeof bytes === 'string') {
	    var msg = unescape(encodeURIComponent(bytes)); // UTF8 escape

	    bytes = [];

	    for (var i = 0; i < msg.length; ++i) {
	      bytes.push(msg.charCodeAt(i));
	    }
	  } else if (!Array.isArray(bytes)) {
	    // Convert Array-like to Array
	    bytes = Array.prototype.slice.call(bytes);
	  }

	  bytes.push(0x80);
	  var l = bytes.length / 4 + 2;
	  var N = Math.ceil(l / 16);
	  var M = new Array(N);

	  for (var _i = 0; _i < N; ++_i) {
	    var arr = new Uint32Array(16);

	    for (var j = 0; j < 16; ++j) {
	      arr[j] = bytes[_i * 64 + j * 4] << 24 | bytes[_i * 64 + j * 4 + 1] << 16 | bytes[_i * 64 + j * 4 + 2] << 8 | bytes[_i * 64 + j * 4 + 3];
	    }

	    M[_i] = arr;
	  }

	  M[N - 1][14] = (bytes.length - 1) * 8 / Math.pow(2, 32);
	  M[N - 1][14] = Math.floor(M[N - 1][14]);
	  M[N - 1][15] = (bytes.length - 1) * 8 & 0xffffffff;

	  for (var _i2 = 0; _i2 < N; ++_i2) {
	    var W = new Uint32Array(80);

	    for (var t = 0; t < 16; ++t) {
	      W[t] = M[_i2][t];
	    }

	    for (var _t = 16; _t < 80; ++_t) {
	      W[_t] = ROTL(W[_t - 3] ^ W[_t - 8] ^ W[_t - 14] ^ W[_t - 16], 1);
	    }

	    var a = H[0];
	    var b = H[1];
	    var c = H[2];
	    var d = H[3];
	    var e = H[4];

	    for (var _t2 = 0; _t2 < 80; ++_t2) {
	      var s = Math.floor(_t2 / 20);
	      var T = ROTL(a, 5) + f$1(s, b, c, d) + e + K[s] + W[_t2] >>> 0;
	      e = d;
	      d = c;
	      c = ROTL(b, 30) >>> 0;
	      b = a;
	      a = T;
	    }

	    H[0] = H[0] + a >>> 0;
	    H[1] = H[1] + b >>> 0;
	    H[2] = H[2] + c >>> 0;
	    H[3] = H[3] + d >>> 0;
	    H[4] = H[4] + e >>> 0;
	  }

	  return [H[0] >> 24 & 0xff, H[0] >> 16 & 0xff, H[0] >> 8 & 0xff, H[0] & 0xff, H[1] >> 24 & 0xff, H[1] >> 16 & 0xff, H[1] >> 8 & 0xff, H[1] & 0xff, H[2] >> 24 & 0xff, H[2] >> 16 & 0xff, H[2] >> 8 & 0xff, H[2] & 0xff, H[3] >> 24 & 0xff, H[3] >> 16 & 0xff, H[3] >> 8 & 0xff, H[3] & 0xff, H[4] >> 24 & 0xff, H[4] >> 16 & 0xff, H[4] >> 8 & 0xff, H[4] & 0xff];
	}

	var v5 = v35('v5', 0x50, sha1);
	var v5$1 = v5;

	var nil = '00000000-0000-0000-0000-000000000000';

	function version$3(uuid) {
	  if (!validate(uuid)) {
	    throw TypeError('Invalid UUID');
	  }

	  return parseInt(uuid.substr(14, 1), 16);
	}

	var esmBrowser = /*#__PURE__*/Object.freeze({
		__proto__: null,
		v1: v1,
		v3: v3$1,
		v4: v4,
		v5: v5$1,
		NIL: nil,
		version: version$3,
		validate: validate,
		stringify: stringify,
		parse: parse
	});

	var require$$0 = /*@__PURE__*/getAugmentedNamespace(esmBrowser);

	const uuid$1 = require$$0.v4;

	/**
	 *  Generates a JSON-RPC 1.0 or 2.0 request
	 *  @param {String} method Name of method to call
	 *  @param {Array|Object} params Array of parameters passed to the method as specified, or an object of parameter names and corresponding value
	 *  @param {String|Number|null} [id] Request ID can be a string, number, null for explicit notification or left out for automatic generation
	 *  @param {Object} [options]
	 *  @param {Number} [options.version=2] JSON-RPC version to use (1 or 2)
	 *  @param {Boolean} [options.notificationIdNull=false] When true, version 2 requests will set id to null instead of omitting it
	 *  @param {Function} [options.generator] Passed the request, and the options object and is expected to return a request ID
	 *  @throws {TypeError} If any of the parameters are invalid
	 *  @return {Object} A JSON-RPC 1.0 or 2.0 request
	 *  @memberOf Utils
	 */
	const generateRequest$1 = function(method, params, id, options) {
	  if(typeof method !== 'string') {
	    throw new TypeError(method + ' must be a string');
	  }

	  options = options || {};

	  // check valid version provided
	  const version = typeof options.version === 'number' ? options.version : 2;
	  if (version !== 1 && version !== 2) {
	    throw new TypeError(version + ' must be 1 or 2');
	  }

	  const request = {
	    method: method
	  };

	  if(version === 2) {
	    request.jsonrpc = '2.0';
	  }

	  if(params) {
	    // params given, but invalid?
	    if(typeof params !== 'object' && !Array.isArray(params)) {
	      throw new TypeError(params + ' must be an object, array or omitted');
	    }
	    request.params = params;
	  }

	  // if id was left out, generate one (null means explicit notification)
	  if(typeof(id) === 'undefined') {
	    const generator = typeof options.generator === 'function' ? options.generator : function() { return uuid$1(); };
	    request.id = generator(request, options);
	  } else if (version === 2 && id === null) {
	    // we have a version 2 notification
	    if (options.notificationIdNull) {
	      request.id = null; // id will not be set at all unless option provided
	    }
	  } else {
	    request.id = id;
	  }

	  return request;
	};

	var generateRequest_1 = generateRequest$1;

	const uuid = require$$0.v4;
	const generateRequest = generateRequest_1;

	/**
	 * Constructor for a Jayson Browser Client that does not depend any node.js core libraries
	 * @class ClientBrowser
	 * @param {Function} callServer Method that calls the server, receives the stringified request and a regular node-style callback
	 * @param {Object} [options]
	 * @param {Function} [options.reviver] Reviver function for JSON
	 * @param {Function} [options.replacer] Replacer function for JSON
	 * @param {Number} [options.version=2] JSON-RPC version to use (1|2)
	 * @param {Function} [options.generator] Function to use for generating request IDs
	 *  @param {Boolean} [options.notificationIdNull=false] When true, version 2 requests will set id to null instead of omitting it
	 * @return {ClientBrowser}
	 */
	const ClientBrowser = function(callServer, options) {
	  if(!(this instanceof ClientBrowser)) {
	    return new ClientBrowser(callServer, options);
	  }

	  if (!options) {
	    options = {};
	  }

	  this.options = {
	    reviver: typeof options.reviver !== 'undefined' ? options.reviver : null,
	    replacer: typeof options.replacer !== 'undefined' ? options.replacer : null,
	    generator: typeof options.generator !== 'undefined' ? options.generator : function() { return uuid(); },
	    version: typeof options.version !== 'undefined' ? options.version : 2,
	    notificationIdNull: typeof options.notificationIdNull === 'boolean' ? options.notificationIdNull : false,
	  };

	  this.callServer = callServer;
	};

	var browser = ClientBrowser;

	/**
	 *  Creates a request and dispatches it if given a callback.
	 *  @param {String|Array} method A batch request if passed an Array, or a method name if passed a String
	 *  @param {Array|Object} [params] Parameters for the method
	 *  @param {String|Number} [id] Optional id. If undefined an id will be generated. If null it creates a notification request
	 *  @param {Function} [callback] Request callback. If specified, executes the request rather than only returning it.
	 *  @throws {TypeError} Invalid parameters
	 *  @return {Object} JSON-RPC 1.0 or 2.0 compatible request
	 */
	ClientBrowser.prototype.request = function(method, params, id, callback) {
	  const self = this;
	  let request = null;

	  // is this a batch request?
	  const isBatch = Array.isArray(method) && typeof params === 'function';

	  if (this.options.version === 1 && isBatch) {
	    throw new TypeError('JSON-RPC 1.0 does not support batching');
	  }

	  // is this a raw request?
	  const isRaw = !isBatch && method && typeof method === 'object' && typeof params === 'function';

	  if(isBatch || isRaw) {
	    callback = params;
	    request = method;
	  } else {
	    if(typeof id === 'function') {
	      callback = id;
	      // specifically undefined because "null" is a notification request
	      id = undefined;
	    }

	    const hasCallback = typeof callback === 'function';

	    try {
	      request = generateRequest(method, params, id, {
	        generator: this.options.generator,
	        version: this.options.version,
	        notificationIdNull: this.options.notificationIdNull,
	      });
	    } catch(err) {
	      if(hasCallback) {
	        return callback(err);
	      }
	      throw err;
	    }

	    // no callback means we should just return a raw request
	    if(!hasCallback) {
	      return request;
	    }

	  }

	  let message;
	  try {
	    message = JSON.stringify(request, this.options.replacer);
	  } catch(err) {
	    return callback(err);
	  }

	  this.callServer(message, function(err, response) {
	    self._parseResponse(err, response, callback);
	  });

	  // always return the raw request
	  return request;
	};

	/**
	 * Parses a response from a server
	 * @param {Object} err Error to pass on that is unrelated to the actual response
	 * @param {String} responseText JSON-RPC 1.0 or 2.0 response
	 * @param {Function} callback Callback that will receive different arguments depending on the amount of parameters
	 * @private
	 */
	ClientBrowser.prototype._parseResponse = function(err, responseText, callback) {
	  if(err) {
	    callback(err);
	    return;
	  }

	  if(!responseText) {
	    // empty response text, assume that is correct because it could be a
	    // notification which jayson does not give any body for
	    return callback();
	  }

	  let response;
	  try {
	    response = JSON.parse(responseText, this.options.reviver);
	  } catch(err) {
	    return callback(err);
	  }

	  if(callback.length === 3) {
	    // if callback length is 3, we split callback arguments on error and response

	    // is batch response?
	    if(Array.isArray(response)) {

	      // neccesary to split strictly on validity according to spec here
	      const isError = function(res) {
	        return typeof res.error !== 'undefined';
	      };

	      const isNotError = function (res) {
	        return !isError(res);
	      };

	      return callback(null, response.filter(isError), response.filter(isNotError));
	    
	    } else {

	      // split regardless of validity
	      return callback(null, response.error, response.result);
	    
	    }
	  
	  }

	  callback(null, response);
	};

	var RpcClient = browser;

	const toBuffer = arr => {
	  if (buffer.Buffer.isBuffer(arr)) {
	    return arr;
	  } else if (arr instanceof Uint8Array) {
	    return buffer.Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength);
	  } else {
	    return buffer.Buffer.from(arr);
	  }
	};

	var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	function getDefaultExportFromCjs (x) {
		return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
	}

	var hash$1 = {};

	var utils$9 = {};

	var minimalisticAssert = assert$6;

	function assert$6(val, msg) {
	  if (!val)
	    throw new Error(msg || 'Assertion failed');
	}

	assert$6.equal = function assertEqual(l, r, msg) {
	  if (l != r)
	    throw new Error(msg || ('Assertion failed: ' + l + ' != ' + r));
	};

	var inherits_browser = {exports: {}};

	if (typeof Object.create === 'function') {
	  // implementation from standard node.js 'util' module
	  inherits_browser.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor;
	    ctor.prototype = Object.create(superCtor.prototype, {
	      constructor: {
	        value: ctor,
	        enumerable: false,
	        writable: true,
	        configurable: true
	      }
	    });
	  };
	} else {
	  // old school shim for old browsers
	  inherits_browser.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor;
	    var TempCtor = function () {};
	    TempCtor.prototype = superCtor.prototype;
	    ctor.prototype = new TempCtor();
	    ctor.prototype.constructor = ctor;
	  };
	}

	var assert$5 = minimalisticAssert;
	var inherits = inherits_browser.exports;

	utils$9.inherits = inherits;

	function isSurrogatePair(msg, i) {
	  if ((msg.charCodeAt(i) & 0xFC00) !== 0xD800) {
	    return false;
	  }
	  if (i < 0 || i + 1 >= msg.length) {
	    return false;
	  }
	  return (msg.charCodeAt(i + 1) & 0xFC00) === 0xDC00;
	}

	function toArray(msg, enc) {
	  if (Array.isArray(msg))
	    return msg.slice();
	  if (!msg)
	    return [];
	  var res = [];
	  if (typeof msg === 'string') {
	    if (!enc) {
	      // Inspired by stringToUtf8ByteArray() in closure-library by Google
	      // https://github.com/google/closure-library/blob/8598d87242af59aac233270742c8984e2b2bdbe0/closure/goog/crypt/crypt.js#L117-L143
	      // Apache License 2.0
	      // https://github.com/google/closure-library/blob/master/LICENSE
	      var p = 0;
	      for (var i = 0; i < msg.length; i++) {
	        var c = msg.charCodeAt(i);
	        if (c < 128) {
	          res[p++] = c;
	        } else if (c < 2048) {
	          res[p++] = (c >> 6) | 192;
	          res[p++] = (c & 63) | 128;
	        } else if (isSurrogatePair(msg, i)) {
	          c = 0x10000 + ((c & 0x03FF) << 10) + (msg.charCodeAt(++i) & 0x03FF);
	          res[p++] = (c >> 18) | 240;
	          res[p++] = ((c >> 12) & 63) | 128;
	          res[p++] = ((c >> 6) & 63) | 128;
	          res[p++] = (c & 63) | 128;
	        } else {
	          res[p++] = (c >> 12) | 224;
	          res[p++] = ((c >> 6) & 63) | 128;
	          res[p++] = (c & 63) | 128;
	        }
	      }
	    } else if (enc === 'hex') {
	      msg = msg.replace(/[^a-z0-9]+/ig, '');
	      if (msg.length % 2 !== 0)
	        msg = '0' + msg;
	      for (i = 0; i < msg.length; i += 2)
	        res.push(parseInt(msg[i] + msg[i + 1], 16));
	    }
	  } else {
	    for (i = 0; i < msg.length; i++)
	      res[i] = msg[i] | 0;
	  }
	  return res;
	}
	utils$9.toArray = toArray;

	function toHex(msg) {
	  var res = '';
	  for (var i = 0; i < msg.length; i++)
	    res += zero2(msg[i].toString(16));
	  return res;
	}
	utils$9.toHex = toHex;

	function htonl(w) {
	  var res = (w >>> 24) |
	            ((w >>> 8) & 0xff00) |
	            ((w << 8) & 0xff0000) |
	            ((w & 0xff) << 24);
	  return res >>> 0;
	}
	utils$9.htonl = htonl;

	function toHex32(msg, endian) {
	  var res = '';
	  for (var i = 0; i < msg.length; i++) {
	    var w = msg[i];
	    if (endian === 'little')
	      w = htonl(w);
	    res += zero8(w.toString(16));
	  }
	  return res;
	}
	utils$9.toHex32 = toHex32;

	function zero2(word) {
	  if (word.length === 1)
	    return '0' + word;
	  else
	    return word;
	}
	utils$9.zero2 = zero2;

	function zero8(word) {
	  if (word.length === 7)
	    return '0' + word;
	  else if (word.length === 6)
	    return '00' + word;
	  else if (word.length === 5)
	    return '000' + word;
	  else if (word.length === 4)
	    return '0000' + word;
	  else if (word.length === 3)
	    return '00000' + word;
	  else if (word.length === 2)
	    return '000000' + word;
	  else if (word.length === 1)
	    return '0000000' + word;
	  else
	    return word;
	}
	utils$9.zero8 = zero8;

	function join32(msg, start, end, endian) {
	  var len = end - start;
	  assert$5(len % 4 === 0);
	  var res = new Array(len / 4);
	  for (var i = 0, k = start; i < res.length; i++, k += 4) {
	    var w;
	    if (endian === 'big')
	      w = (msg[k] << 24) | (msg[k + 1] << 16) | (msg[k + 2] << 8) | msg[k + 3];
	    else
	      w = (msg[k + 3] << 24) | (msg[k + 2] << 16) | (msg[k + 1] << 8) | msg[k];
	    res[i] = w >>> 0;
	  }
	  return res;
	}
	utils$9.join32 = join32;

	function split32(msg, endian) {
	  var res = new Array(msg.length * 4);
	  for (var i = 0, k = 0; i < msg.length; i++, k += 4) {
	    var m = msg[i];
	    if (endian === 'big') {
	      res[k] = m >>> 24;
	      res[k + 1] = (m >>> 16) & 0xff;
	      res[k + 2] = (m >>> 8) & 0xff;
	      res[k + 3] = m & 0xff;
	    } else {
	      res[k + 3] = m >>> 24;
	      res[k + 2] = (m >>> 16) & 0xff;
	      res[k + 1] = (m >>> 8) & 0xff;
	      res[k] = m & 0xff;
	    }
	  }
	  return res;
	}
	utils$9.split32 = split32;

	function rotr32$1(w, b) {
	  return (w >>> b) | (w << (32 - b));
	}
	utils$9.rotr32 = rotr32$1;

	function rotl32$2(w, b) {
	  return (w << b) | (w >>> (32 - b));
	}
	utils$9.rotl32 = rotl32$2;

	function sum32$3(a, b) {
	  return (a + b) >>> 0;
	}
	utils$9.sum32 = sum32$3;

	function sum32_3$1(a, b, c) {
	  return (a + b + c) >>> 0;
	}
	utils$9.sum32_3 = sum32_3$1;

	function sum32_4$2(a, b, c, d) {
	  return (a + b + c + d) >>> 0;
	}
	utils$9.sum32_4 = sum32_4$2;

	function sum32_5$2(a, b, c, d, e) {
	  return (a + b + c + d + e) >>> 0;
	}
	utils$9.sum32_5 = sum32_5$2;

	function sum64$1(buf, pos, ah, al) {
	  var bh = buf[pos];
	  var bl = buf[pos + 1];

	  var lo = (al + bl) >>> 0;
	  var hi = (lo < al ? 1 : 0) + ah + bh;
	  buf[pos] = hi >>> 0;
	  buf[pos + 1] = lo;
	}
	utils$9.sum64 = sum64$1;

	function sum64_hi$1(ah, al, bh, bl) {
	  var lo = (al + bl) >>> 0;
	  var hi = (lo < al ? 1 : 0) + ah + bh;
	  return hi >>> 0;
	}
	utils$9.sum64_hi = sum64_hi$1;

	function sum64_lo$1(ah, al, bh, bl) {
	  var lo = al + bl;
	  return lo >>> 0;
	}
	utils$9.sum64_lo = sum64_lo$1;

	function sum64_4_hi$1(ah, al, bh, bl, ch, cl, dh, dl) {
	  var carry = 0;
	  var lo = al;
	  lo = (lo + bl) >>> 0;
	  carry += lo < al ? 1 : 0;
	  lo = (lo + cl) >>> 0;
	  carry += lo < cl ? 1 : 0;
	  lo = (lo + dl) >>> 0;
	  carry += lo < dl ? 1 : 0;

	  var hi = ah + bh + ch + dh + carry;
	  return hi >>> 0;
	}
	utils$9.sum64_4_hi = sum64_4_hi$1;

	function sum64_4_lo$1(ah, al, bh, bl, ch, cl, dh, dl) {
	  var lo = al + bl + cl + dl;
	  return lo >>> 0;
	}
	utils$9.sum64_4_lo = sum64_4_lo$1;

	function sum64_5_hi$1(ah, al, bh, bl, ch, cl, dh, dl, eh, el) {
	  var carry = 0;
	  var lo = al;
	  lo = (lo + bl) >>> 0;
	  carry += lo < al ? 1 : 0;
	  lo = (lo + cl) >>> 0;
	  carry += lo < cl ? 1 : 0;
	  lo = (lo + dl) >>> 0;
	  carry += lo < dl ? 1 : 0;
	  lo = (lo + el) >>> 0;
	  carry += lo < el ? 1 : 0;

	  var hi = ah + bh + ch + dh + eh + carry;
	  return hi >>> 0;
	}
	utils$9.sum64_5_hi = sum64_5_hi$1;

	function sum64_5_lo$1(ah, al, bh, bl, ch, cl, dh, dl, eh, el) {
	  var lo = al + bl + cl + dl + el;

	  return lo >>> 0;
	}
	utils$9.sum64_5_lo = sum64_5_lo$1;

	function rotr64_hi$1(ah, al, num) {
	  var r = (al << (32 - num)) | (ah >>> num);
	  return r >>> 0;
	}
	utils$9.rotr64_hi = rotr64_hi$1;

	function rotr64_lo$1(ah, al, num) {
	  var r = (ah << (32 - num)) | (al >>> num);
	  return r >>> 0;
	}
	utils$9.rotr64_lo = rotr64_lo$1;

	function shr64_hi$1(ah, al, num) {
	  return ah >>> num;
	}
	utils$9.shr64_hi = shr64_hi$1;

	function shr64_lo$1(ah, al, num) {
	  var r = (ah << (32 - num)) | (al >>> num);
	  return r >>> 0;
	}
	utils$9.shr64_lo = shr64_lo$1;

	var common$5 = {};

	var utils$8 = utils$9;
	var assert$4 = minimalisticAssert;

	function BlockHash$4() {
	  this.pending = null;
	  this.pendingTotal = 0;
	  this.blockSize = this.constructor.blockSize;
	  this.outSize = this.constructor.outSize;
	  this.hmacStrength = this.constructor.hmacStrength;
	  this.padLength = this.constructor.padLength / 8;
	  this.endian = 'big';

	  this._delta8 = this.blockSize / 8;
	  this._delta32 = this.blockSize / 32;
	}
	common$5.BlockHash = BlockHash$4;

	BlockHash$4.prototype.update = function update(msg, enc) {
	  // Convert message to array, pad it, and join into 32bit blocks
	  msg = utils$8.toArray(msg, enc);
	  if (!this.pending)
	    this.pending = msg;
	  else
	    this.pending = this.pending.concat(msg);
	  this.pendingTotal += msg.length;

	  // Enough data, try updating
	  if (this.pending.length >= this._delta8) {
	    msg = this.pending;

	    // Process pending data in blocks
	    var r = msg.length % this._delta8;
	    this.pending = msg.slice(msg.length - r, msg.length);
	    if (this.pending.length === 0)
	      this.pending = null;

	    msg = utils$8.join32(msg, 0, msg.length - r, this.endian);
	    for (var i = 0; i < msg.length; i += this._delta32)
	      this._update(msg, i, i + this._delta32);
	  }

	  return this;
	};

	BlockHash$4.prototype.digest = function digest(enc) {
	  this.update(this._pad());
	  assert$4(this.pending === null);

	  return this._digest(enc);
	};

	BlockHash$4.prototype._pad = function pad() {
	  var len = this.pendingTotal;
	  var bytes = this._delta8;
	  var k = bytes - ((len + this.padLength) % bytes);
	  var res = new Array(k + this.padLength);
	  res[0] = 0x80;
	  for (var i = 1; i < k; i++)
	    res[i] = 0;

	  // Append length
	  len <<= 3;
	  if (this.endian === 'big') {
	    for (var t = 8; t < this.padLength; t++)
	      res[i++] = 0;

	    res[i++] = 0;
	    res[i++] = 0;
	    res[i++] = 0;
	    res[i++] = 0;
	    res[i++] = (len >>> 24) & 0xff;
	    res[i++] = (len >>> 16) & 0xff;
	    res[i++] = (len >>> 8) & 0xff;
	    res[i++] = len & 0xff;
	  } else {
	    res[i++] = len & 0xff;
	    res[i++] = (len >>> 8) & 0xff;
	    res[i++] = (len >>> 16) & 0xff;
	    res[i++] = (len >>> 24) & 0xff;
	    res[i++] = 0;
	    res[i++] = 0;
	    res[i++] = 0;
	    res[i++] = 0;

	    for (t = 8; t < this.padLength; t++)
	      res[i++] = 0;
	  }

	  return res;
	};

	var sha = {};

	var common$4 = {};

	var utils$7 = utils$9;
	var rotr32 = utils$7.rotr32;

	function ft_1$1(s, x, y, z) {
	  if (s === 0)
	    return ch32$1(x, y, z);
	  if (s === 1 || s === 3)
	    return p32(x, y, z);
	  if (s === 2)
	    return maj32$1(x, y, z);
	}
	common$4.ft_1 = ft_1$1;

	function ch32$1(x, y, z) {
	  return (x & y) ^ ((~x) & z);
	}
	common$4.ch32 = ch32$1;

	function maj32$1(x, y, z) {
	  return (x & y) ^ (x & z) ^ (y & z);
	}
	common$4.maj32 = maj32$1;

	function p32(x, y, z) {
	  return x ^ y ^ z;
	}
	common$4.p32 = p32;

	function s0_256$1(x) {
	  return rotr32(x, 2) ^ rotr32(x, 13) ^ rotr32(x, 22);
	}
	common$4.s0_256 = s0_256$1;

	function s1_256$1(x) {
	  return rotr32(x, 6) ^ rotr32(x, 11) ^ rotr32(x, 25);
	}
	common$4.s1_256 = s1_256$1;

	function g0_256$1(x) {
	  return rotr32(x, 7) ^ rotr32(x, 18) ^ (x >>> 3);
	}
	common$4.g0_256 = g0_256$1;

	function g1_256$1(x) {
	  return rotr32(x, 17) ^ rotr32(x, 19) ^ (x >>> 10);
	}
	common$4.g1_256 = g1_256$1;

	var utils$6 = utils$9;
	var common$3 = common$5;
	var shaCommon$1 = common$4;

	var rotl32$1 = utils$6.rotl32;
	var sum32$2 = utils$6.sum32;
	var sum32_5$1 = utils$6.sum32_5;
	var ft_1 = shaCommon$1.ft_1;
	var BlockHash$3 = common$3.BlockHash;

	var sha1_K = [
	  0x5A827999, 0x6ED9EBA1,
	  0x8F1BBCDC, 0xCA62C1D6
	];

	function SHA1() {
	  if (!(this instanceof SHA1))
	    return new SHA1();

	  BlockHash$3.call(this);
	  this.h = [
	    0x67452301, 0xefcdab89, 0x98badcfe,
	    0x10325476, 0xc3d2e1f0 ];
	  this.W = new Array(80);
	}

	utils$6.inherits(SHA1, BlockHash$3);
	var _1 = SHA1;

	SHA1.blockSize = 512;
	SHA1.outSize = 160;
	SHA1.hmacStrength = 80;
	SHA1.padLength = 64;

	SHA1.prototype._update = function _update(msg, start) {
	  var W = this.W;

	  for (var i = 0; i < 16; i++)
	    W[i] = msg[start + i];

	  for(; i < W.length; i++)
	    W[i] = rotl32$1(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);

	  var a = this.h[0];
	  var b = this.h[1];
	  var c = this.h[2];
	  var d = this.h[3];
	  var e = this.h[4];

	  for (i = 0; i < W.length; i++) {
	    var s = ~~(i / 20);
	    var t = sum32_5$1(rotl32$1(a, 5), ft_1(s, b, c, d), e, W[i], sha1_K[s]);
	    e = d;
	    d = c;
	    c = rotl32$1(b, 30);
	    b = a;
	    a = t;
	  }

	  this.h[0] = sum32$2(this.h[0], a);
	  this.h[1] = sum32$2(this.h[1], b);
	  this.h[2] = sum32$2(this.h[2], c);
	  this.h[3] = sum32$2(this.h[3], d);
	  this.h[4] = sum32$2(this.h[4], e);
	};

	SHA1.prototype._digest = function digest(enc) {
	  if (enc === 'hex')
	    return utils$6.toHex32(this.h, 'big');
	  else
	    return utils$6.split32(this.h, 'big');
	};

	var utils$5 = utils$9;
	var common$2 = common$5;
	var shaCommon = common$4;
	var assert$3 = minimalisticAssert;

	var sum32$1 = utils$5.sum32;
	var sum32_4$1 = utils$5.sum32_4;
	var sum32_5 = utils$5.sum32_5;
	var ch32 = shaCommon.ch32;
	var maj32 = shaCommon.maj32;
	var s0_256 = shaCommon.s0_256;
	var s1_256 = shaCommon.s1_256;
	var g0_256 = shaCommon.g0_256;
	var g1_256 = shaCommon.g1_256;

	var BlockHash$2 = common$2.BlockHash;

	var sha256_K = [
	  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
	  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
	  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
	  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
	  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
	  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
	  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
	  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
	  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
	  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
	  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
	  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
	  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
	  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
	  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
	  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
	];

	function SHA256$1() {
	  if (!(this instanceof SHA256$1))
	    return new SHA256$1();

	  BlockHash$2.call(this);
	  this.h = [
	    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
	    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
	  ];
	  this.k = sha256_K;
	  this.W = new Array(64);
	}
	utils$5.inherits(SHA256$1, BlockHash$2);
	var _256 = SHA256$1;

	SHA256$1.blockSize = 512;
	SHA256$1.outSize = 256;
	SHA256$1.hmacStrength = 192;
	SHA256$1.padLength = 64;

	SHA256$1.prototype._update = function _update(msg, start) {
	  var W = this.W;

	  for (var i = 0; i < 16; i++)
	    W[i] = msg[start + i];
	  for (; i < W.length; i++)
	    W[i] = sum32_4$1(g1_256(W[i - 2]), W[i - 7], g0_256(W[i - 15]), W[i - 16]);

	  var a = this.h[0];
	  var b = this.h[1];
	  var c = this.h[2];
	  var d = this.h[3];
	  var e = this.h[4];
	  var f = this.h[5];
	  var g = this.h[6];
	  var h = this.h[7];

	  assert$3(this.k.length === W.length);
	  for (i = 0; i < W.length; i++) {
	    var T1 = sum32_5(h, s1_256(e), ch32(e, f, g), this.k[i], W[i]);
	    var T2 = sum32$1(s0_256(a), maj32(a, b, c));
	    h = g;
	    g = f;
	    f = e;
	    e = sum32$1(d, T1);
	    d = c;
	    c = b;
	    b = a;
	    a = sum32$1(T1, T2);
	  }

	  this.h[0] = sum32$1(this.h[0], a);
	  this.h[1] = sum32$1(this.h[1], b);
	  this.h[2] = sum32$1(this.h[2], c);
	  this.h[3] = sum32$1(this.h[3], d);
	  this.h[4] = sum32$1(this.h[4], e);
	  this.h[5] = sum32$1(this.h[5], f);
	  this.h[6] = sum32$1(this.h[6], g);
	  this.h[7] = sum32$1(this.h[7], h);
	};

	SHA256$1.prototype._digest = function digest(enc) {
	  if (enc === 'hex')
	    return utils$5.toHex32(this.h, 'big');
	  else
	    return utils$5.split32(this.h, 'big');
	};

	var utils$4 = utils$9;
	var SHA256 = _256;

	function SHA224() {
	  if (!(this instanceof SHA224))
	    return new SHA224();

	  SHA256.call(this);
	  this.h = [
	    0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939,
	    0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4 ];
	}
	utils$4.inherits(SHA224, SHA256);
	var _224 = SHA224;

	SHA224.blockSize = 512;
	SHA224.outSize = 224;
	SHA224.hmacStrength = 192;
	SHA224.padLength = 64;

	SHA224.prototype._digest = function digest(enc) {
	  // Just truncate output
	  if (enc === 'hex')
	    return utils$4.toHex32(this.h.slice(0, 7), 'big');
	  else
	    return utils$4.split32(this.h.slice(0, 7), 'big');
	};

	var utils$3 = utils$9;
	var common$1 = common$5;
	var assert$2 = minimalisticAssert;

	var rotr64_hi = utils$3.rotr64_hi;
	var rotr64_lo = utils$3.rotr64_lo;
	var shr64_hi = utils$3.shr64_hi;
	var shr64_lo = utils$3.shr64_lo;
	var sum64 = utils$3.sum64;
	var sum64_hi = utils$3.sum64_hi;
	var sum64_lo = utils$3.sum64_lo;
	var sum64_4_hi = utils$3.sum64_4_hi;
	var sum64_4_lo = utils$3.sum64_4_lo;
	var sum64_5_hi = utils$3.sum64_5_hi;
	var sum64_5_lo = utils$3.sum64_5_lo;

	var BlockHash$1 = common$1.BlockHash;

	var sha512_K = [
	  0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd,
	  0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
	  0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019,
	  0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
	  0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe,
	  0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
	  0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1,
	  0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
	  0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3,
	  0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
	  0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483,
	  0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
	  0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210,
	  0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
	  0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725,
	  0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
	  0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926,
	  0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
	  0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8,
	  0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
	  0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001,
	  0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
	  0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910,
	  0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
	  0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53,
	  0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
	  0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb,
	  0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
	  0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60,
	  0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
	  0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9,
	  0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
	  0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207,
	  0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
	  0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6,
	  0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
	  0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493,
	  0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
	  0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a,
	  0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
	];

	function SHA512$1() {
	  if (!(this instanceof SHA512$1))
	    return new SHA512$1();

	  BlockHash$1.call(this);
	  this.h = [
	    0x6a09e667, 0xf3bcc908,
	    0xbb67ae85, 0x84caa73b,
	    0x3c6ef372, 0xfe94f82b,
	    0xa54ff53a, 0x5f1d36f1,
	    0x510e527f, 0xade682d1,
	    0x9b05688c, 0x2b3e6c1f,
	    0x1f83d9ab, 0xfb41bd6b,
	    0x5be0cd19, 0x137e2179 ];
	  this.k = sha512_K;
	  this.W = new Array(160);
	}
	utils$3.inherits(SHA512$1, BlockHash$1);
	var _512 = SHA512$1;

	SHA512$1.blockSize = 1024;
	SHA512$1.outSize = 512;
	SHA512$1.hmacStrength = 192;
	SHA512$1.padLength = 128;

	SHA512$1.prototype._prepareBlock = function _prepareBlock(msg, start) {
	  var W = this.W;

	  // 32 x 32bit words
	  for (var i = 0; i < 32; i++)
	    W[i] = msg[start + i];
	  for (; i < W.length; i += 2) {
	    var c0_hi = g1_512_hi(W[i - 4], W[i - 3]);  // i - 2
	    var c0_lo = g1_512_lo(W[i - 4], W[i - 3]);
	    var c1_hi = W[i - 14];  // i - 7
	    var c1_lo = W[i - 13];
	    var c2_hi = g0_512_hi(W[i - 30], W[i - 29]);  // i - 15
	    var c2_lo = g0_512_lo(W[i - 30], W[i - 29]);
	    var c3_hi = W[i - 32];  // i - 16
	    var c3_lo = W[i - 31];

	    W[i] = sum64_4_hi(
	      c0_hi, c0_lo,
	      c1_hi, c1_lo,
	      c2_hi, c2_lo,
	      c3_hi, c3_lo);
	    W[i + 1] = sum64_4_lo(
	      c0_hi, c0_lo,
	      c1_hi, c1_lo,
	      c2_hi, c2_lo,
	      c3_hi, c3_lo);
	  }
	};

	SHA512$1.prototype._update = function _update(msg, start) {
	  this._prepareBlock(msg, start);

	  var W = this.W;

	  var ah = this.h[0];
	  var al = this.h[1];
	  var bh = this.h[2];
	  var bl = this.h[3];
	  var ch = this.h[4];
	  var cl = this.h[5];
	  var dh = this.h[6];
	  var dl = this.h[7];
	  var eh = this.h[8];
	  var el = this.h[9];
	  var fh = this.h[10];
	  var fl = this.h[11];
	  var gh = this.h[12];
	  var gl = this.h[13];
	  var hh = this.h[14];
	  var hl = this.h[15];

	  assert$2(this.k.length === W.length);
	  for (var i = 0; i < W.length; i += 2) {
	    var c0_hi = hh;
	    var c0_lo = hl;
	    var c1_hi = s1_512_hi(eh, el);
	    var c1_lo = s1_512_lo(eh, el);
	    var c2_hi = ch64_hi(eh, el, fh, fl, gh);
	    var c2_lo = ch64_lo(eh, el, fh, fl, gh, gl);
	    var c3_hi = this.k[i];
	    var c3_lo = this.k[i + 1];
	    var c4_hi = W[i];
	    var c4_lo = W[i + 1];

	    var T1_hi = sum64_5_hi(
	      c0_hi, c0_lo,
	      c1_hi, c1_lo,
	      c2_hi, c2_lo,
	      c3_hi, c3_lo,
	      c4_hi, c4_lo);
	    var T1_lo = sum64_5_lo(
	      c0_hi, c0_lo,
	      c1_hi, c1_lo,
	      c2_hi, c2_lo,
	      c3_hi, c3_lo,
	      c4_hi, c4_lo);

	    c0_hi = s0_512_hi(ah, al);
	    c0_lo = s0_512_lo(ah, al);
	    c1_hi = maj64_hi(ah, al, bh, bl, ch);
	    c1_lo = maj64_lo(ah, al, bh, bl, ch, cl);

	    var T2_hi = sum64_hi(c0_hi, c0_lo, c1_hi, c1_lo);
	    var T2_lo = sum64_lo(c0_hi, c0_lo, c1_hi, c1_lo);

	    hh = gh;
	    hl = gl;

	    gh = fh;
	    gl = fl;

	    fh = eh;
	    fl = el;

	    eh = sum64_hi(dh, dl, T1_hi, T1_lo);
	    el = sum64_lo(dl, dl, T1_hi, T1_lo);

	    dh = ch;
	    dl = cl;

	    ch = bh;
	    cl = bl;

	    bh = ah;
	    bl = al;

	    ah = sum64_hi(T1_hi, T1_lo, T2_hi, T2_lo);
	    al = sum64_lo(T1_hi, T1_lo, T2_hi, T2_lo);
	  }

	  sum64(this.h, 0, ah, al);
	  sum64(this.h, 2, bh, bl);
	  sum64(this.h, 4, ch, cl);
	  sum64(this.h, 6, dh, dl);
	  sum64(this.h, 8, eh, el);
	  sum64(this.h, 10, fh, fl);
	  sum64(this.h, 12, gh, gl);
	  sum64(this.h, 14, hh, hl);
	};

	SHA512$1.prototype._digest = function digest(enc) {
	  if (enc === 'hex')
	    return utils$3.toHex32(this.h, 'big');
	  else
	    return utils$3.split32(this.h, 'big');
	};

	function ch64_hi(xh, xl, yh, yl, zh) {
	  var r = (xh & yh) ^ ((~xh) & zh);
	  if (r < 0)
	    r += 0x100000000;
	  return r;
	}

	function ch64_lo(xh, xl, yh, yl, zh, zl) {
	  var r = (xl & yl) ^ ((~xl) & zl);
	  if (r < 0)
	    r += 0x100000000;
	  return r;
	}

	function maj64_hi(xh, xl, yh, yl, zh) {
	  var r = (xh & yh) ^ (xh & zh) ^ (yh & zh);
	  if (r < 0)
	    r += 0x100000000;
	  return r;
	}

	function maj64_lo(xh, xl, yh, yl, zh, zl) {
	  var r = (xl & yl) ^ (xl & zl) ^ (yl & zl);
	  if (r < 0)
	    r += 0x100000000;
	  return r;
	}

	function s0_512_hi(xh, xl) {
	  var c0_hi = rotr64_hi(xh, xl, 28);
	  var c1_hi = rotr64_hi(xl, xh, 2);  // 34
	  var c2_hi = rotr64_hi(xl, xh, 7);  // 39

	  var r = c0_hi ^ c1_hi ^ c2_hi;
	  if (r < 0)
	    r += 0x100000000;
	  return r;
	}

	function s0_512_lo(xh, xl) {
	  var c0_lo = rotr64_lo(xh, xl, 28);
	  var c1_lo = rotr64_lo(xl, xh, 2);  // 34
	  var c2_lo = rotr64_lo(xl, xh, 7);  // 39

	  var r = c0_lo ^ c1_lo ^ c2_lo;
	  if (r < 0)
	    r += 0x100000000;
	  return r;
	}

	function s1_512_hi(xh, xl) {
	  var c0_hi = rotr64_hi(xh, xl, 14);
	  var c1_hi = rotr64_hi(xh, xl, 18);
	  var c2_hi = rotr64_hi(xl, xh, 9);  // 41

	  var r = c0_hi ^ c1_hi ^ c2_hi;
	  if (r < 0)
	    r += 0x100000000;
	  return r;
	}

	function s1_512_lo(xh, xl) {
	  var c0_lo = rotr64_lo(xh, xl, 14);
	  var c1_lo = rotr64_lo(xh, xl, 18);
	  var c2_lo = rotr64_lo(xl, xh, 9);  // 41

	  var r = c0_lo ^ c1_lo ^ c2_lo;
	  if (r < 0)
	    r += 0x100000000;
	  return r;
	}

	function g0_512_hi(xh, xl) {
	  var c0_hi = rotr64_hi(xh, xl, 1);
	  var c1_hi = rotr64_hi(xh, xl, 8);
	  var c2_hi = shr64_hi(xh, xl, 7);

	  var r = c0_hi ^ c1_hi ^ c2_hi;
	  if (r < 0)
	    r += 0x100000000;
	  return r;
	}

	function g0_512_lo(xh, xl) {
	  var c0_lo = rotr64_lo(xh, xl, 1);
	  var c1_lo = rotr64_lo(xh, xl, 8);
	  var c2_lo = shr64_lo(xh, xl, 7);

	  var r = c0_lo ^ c1_lo ^ c2_lo;
	  if (r < 0)
	    r += 0x100000000;
	  return r;
	}

	function g1_512_hi(xh, xl) {
	  var c0_hi = rotr64_hi(xh, xl, 19);
	  var c1_hi = rotr64_hi(xl, xh, 29);  // 61
	  var c2_hi = shr64_hi(xh, xl, 6);

	  var r = c0_hi ^ c1_hi ^ c2_hi;
	  if (r < 0)
	    r += 0x100000000;
	  return r;
	}

	function g1_512_lo(xh, xl) {
	  var c0_lo = rotr64_lo(xh, xl, 19);
	  var c1_lo = rotr64_lo(xl, xh, 29);  // 61
	  var c2_lo = shr64_lo(xh, xl, 6);

	  var r = c0_lo ^ c1_lo ^ c2_lo;
	  if (r < 0)
	    r += 0x100000000;
	  return r;
	}

	var utils$2 = utils$9;

	var SHA512 = _512;

	function SHA384() {
	  if (!(this instanceof SHA384))
	    return new SHA384();

	  SHA512.call(this);
	  this.h = [
	    0xcbbb9d5d, 0xc1059ed8,
	    0x629a292a, 0x367cd507,
	    0x9159015a, 0x3070dd17,
	    0x152fecd8, 0xf70e5939,
	    0x67332667, 0xffc00b31,
	    0x8eb44a87, 0x68581511,
	    0xdb0c2e0d, 0x64f98fa7,
	    0x47b5481d, 0xbefa4fa4 ];
	}
	utils$2.inherits(SHA384, SHA512);
	var _384 = SHA384;

	SHA384.blockSize = 1024;
	SHA384.outSize = 384;
	SHA384.hmacStrength = 192;
	SHA384.padLength = 128;

	SHA384.prototype._digest = function digest(enc) {
	  if (enc === 'hex')
	    return utils$2.toHex32(this.h.slice(0, 12), 'big');
	  else
	    return utils$2.split32(this.h.slice(0, 12), 'big');
	};

	sha.sha1 = _1;
	sha.sha224 = _224;
	sha.sha256 = _256;
	sha.sha384 = _384;
	sha.sha512 = _512;

	var ripemd = {};

	var utils$1 = utils$9;
	var common = common$5;

	var rotl32 = utils$1.rotl32;
	var sum32 = utils$1.sum32;
	var sum32_3 = utils$1.sum32_3;
	var sum32_4 = utils$1.sum32_4;
	var BlockHash = common.BlockHash;

	function RIPEMD160() {
	  if (!(this instanceof RIPEMD160))
	    return new RIPEMD160();

	  BlockHash.call(this);

	  this.h = [ 0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0 ];
	  this.endian = 'little';
	}
	utils$1.inherits(RIPEMD160, BlockHash);
	ripemd.ripemd160 = RIPEMD160;

	RIPEMD160.blockSize = 512;
	RIPEMD160.outSize = 160;
	RIPEMD160.hmacStrength = 192;
	RIPEMD160.padLength = 64;

	RIPEMD160.prototype._update = function update(msg, start) {
	  var A = this.h[0];
	  var B = this.h[1];
	  var C = this.h[2];
	  var D = this.h[3];
	  var E = this.h[4];
	  var Ah = A;
	  var Bh = B;
	  var Ch = C;
	  var Dh = D;
	  var Eh = E;
	  for (var j = 0; j < 80; j++) {
	    var T = sum32(
	      rotl32(
	        sum32_4(A, f(j, B, C, D), msg[r[j] + start], K(j)),
	        s[j]),
	      E);
	    A = E;
	    E = D;
	    D = rotl32(C, 10);
	    C = B;
	    B = T;
	    T = sum32(
	      rotl32(
	        sum32_4(Ah, f(79 - j, Bh, Ch, Dh), msg[rh[j] + start], Kh(j)),
	        sh[j]),
	      Eh);
	    Ah = Eh;
	    Eh = Dh;
	    Dh = rotl32(Ch, 10);
	    Ch = Bh;
	    Bh = T;
	  }
	  T = sum32_3(this.h[1], C, Dh);
	  this.h[1] = sum32_3(this.h[2], D, Eh);
	  this.h[2] = sum32_3(this.h[3], E, Ah);
	  this.h[3] = sum32_3(this.h[4], A, Bh);
	  this.h[4] = sum32_3(this.h[0], B, Ch);
	  this.h[0] = T;
	};

	RIPEMD160.prototype._digest = function digest(enc) {
	  if (enc === 'hex')
	    return utils$1.toHex32(this.h, 'little');
	  else
	    return utils$1.split32(this.h, 'little');
	};

	function f(j, x, y, z) {
	  if (j <= 15)
	    return x ^ y ^ z;
	  else if (j <= 31)
	    return (x & y) | ((~x) & z);
	  else if (j <= 47)
	    return (x | (~y)) ^ z;
	  else if (j <= 63)
	    return (x & z) | (y & (~z));
	  else
	    return x ^ (y | (~z));
	}

	function K(j) {
	  if (j <= 15)
	    return 0x00000000;
	  else if (j <= 31)
	    return 0x5a827999;
	  else if (j <= 47)
	    return 0x6ed9eba1;
	  else if (j <= 63)
	    return 0x8f1bbcdc;
	  else
	    return 0xa953fd4e;
	}

	function Kh(j) {
	  if (j <= 15)
	    return 0x50a28be6;
	  else if (j <= 31)
	    return 0x5c4dd124;
	  else if (j <= 47)
	    return 0x6d703ef3;
	  else if (j <= 63)
	    return 0x7a6d76e9;
	  else
	    return 0x00000000;
	}

	var r = [
	  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
	  7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8,
	  3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12,
	  1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2,
	  4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13
	];

	var rh = [
	  5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12,
	  6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2,
	  15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13,
	  8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14,
	  12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11
	];

	var s = [
	  11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8,
	  7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12,
	  11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5,
	  11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12,
	  9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6
	];

	var sh = [
	  8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6,
	  9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11,
	  9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5,
	  15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8,
	  8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11
	];

	var utils$a = utils$9;
	var assert$1 = minimalisticAssert;

	function Hmac(hash, key, enc) {
	  if (!(this instanceof Hmac))
	    return new Hmac(hash, key, enc);
	  this.Hash = hash;
	  this.blockSize = hash.blockSize / 8;
	  this.outSize = hash.outSize / 8;
	  this.inner = null;
	  this.outer = null;

	  this._init(utils$a.toArray(key, enc));
	}
	var hmac = Hmac;

	Hmac.prototype._init = function init(key) {
	  // Shorten key, if needed
	  if (key.length > this.blockSize)
	    key = new this.Hash().update(key).digest();
	  assert$1(key.length <= this.blockSize);

	  // Add padding to key
	  for (var i = key.length; i < this.blockSize; i++)
	    key.push(0);

	  for (i = 0; i < key.length; i++)
	    key[i] ^= 0x36;
	  this.inner = new this.Hash().update(key);

	  // 0x36 ^ 0x5c = 0x6a
	  for (i = 0; i < key.length; i++)
	    key[i] ^= 0x6a;
	  this.outer = new this.Hash().update(key);
	};

	Hmac.prototype.update = function update(msg, enc) {
	  this.inner.update(msg, enc);
	  return this;
	};

	Hmac.prototype.digest = function digest(enc) {
	  this.outer.update(this.inner.digest());
	  return this.outer.digest(enc);
	};

	(function (exports) {
	var hash = exports;

	hash.utils = utils$9;
	hash.common = common$5;
	hash.sha = sha;
	hash.ripemd = ripemd;
	hash.hmac = hmac;

	// Proxy hash functions to the main object
	hash.sha1 = hash.sha.sha1;
	hash.sha256 = hash.sha.sha256;
	hash.sha224 = hash.sha.sha224;
	hash.sha384 = hash.sha.sha384;
	hash.sha512 = hash.sha.sha512;
	hash.ripemd160 = hash.ripemd.ripemd160;
	}(hash$1));

	var hash = hash$1;

	const version$2 = "logger/5.5.0";

	let _permanentCensorErrors = false;
	let _censorErrors = false;
	const LogLevels = { debug: 1, "default": 2, info: 2, warning: 3, error: 4, off: 5 };
	let _logLevel = LogLevels["default"];
	let _globalLogger = null;
	function _checkNormalize() {
	    try {
	        const missing = [];
	        // Make sure all forms of normalization are supported
	        ["NFD", "NFC", "NFKD", "NFKC"].forEach((form) => {
	            try {
	                if ("test".normalize(form) !== "test") {
	                    throw new Error("bad normalize");
	                }
	                ;
	            }
	            catch (error) {
	                missing.push(form);
	            }
	        });
	        if (missing.length) {
	            throw new Error("missing " + missing.join(", "));
	        }
	        if (String.fromCharCode(0xe9).normalize("NFD") !== String.fromCharCode(0x65, 0x0301)) {
	            throw new Error("broken implementation");
	        }
	    }
	    catch (error) {
	        return error.message;
	    }
	    return null;
	}
	const _normalizeError = _checkNormalize();
	var LogLevel;
	(function (LogLevel) {
	    LogLevel["DEBUG"] = "DEBUG";
	    LogLevel["INFO"] = "INFO";
	    LogLevel["WARNING"] = "WARNING";
	    LogLevel["ERROR"] = "ERROR";
	    LogLevel["OFF"] = "OFF";
	})(LogLevel || (LogLevel = {}));
	var ErrorCode;
	(function (ErrorCode) {
	    ///////////////////
	    // Generic Errors
	    // Unknown Error
	    ErrorCode["UNKNOWN_ERROR"] = "UNKNOWN_ERROR";
	    // Not Implemented
	    ErrorCode["NOT_IMPLEMENTED"] = "NOT_IMPLEMENTED";
	    // Unsupported Operation
	    //   - operation
	    ErrorCode["UNSUPPORTED_OPERATION"] = "UNSUPPORTED_OPERATION";
	    // Network Error (i.e. Ethereum Network, such as an invalid chain ID)
	    //   - event ("noNetwork" is not re-thrown in provider.ready; otherwise thrown)
	    ErrorCode["NETWORK_ERROR"] = "NETWORK_ERROR";
	    // Some sort of bad response from the server
	    ErrorCode["SERVER_ERROR"] = "SERVER_ERROR";
	    // Timeout
	    ErrorCode["TIMEOUT"] = "TIMEOUT";
	    ///////////////////
	    // Operational  Errors
	    // Buffer Overrun
	    ErrorCode["BUFFER_OVERRUN"] = "BUFFER_OVERRUN";
	    // Numeric Fault
	    //   - operation: the operation being executed
	    //   - fault: the reason this faulted
	    ErrorCode["NUMERIC_FAULT"] = "NUMERIC_FAULT";
	    ///////////////////
	    // Argument Errors
	    // Missing new operator to an object
	    //  - name: The name of the class
	    ErrorCode["MISSING_NEW"] = "MISSING_NEW";
	    // Invalid argument (e.g. value is incompatible with type) to a function:
	    //   - argument: The argument name that was invalid
	    //   - value: The value of the argument
	    ErrorCode["INVALID_ARGUMENT"] = "INVALID_ARGUMENT";
	    // Missing argument to a function:
	    //   - count: The number of arguments received
	    //   - expectedCount: The number of arguments expected
	    ErrorCode["MISSING_ARGUMENT"] = "MISSING_ARGUMENT";
	    // Too many arguments
	    //   - count: The number of arguments received
	    //   - expectedCount: The number of arguments expected
	    ErrorCode["UNEXPECTED_ARGUMENT"] = "UNEXPECTED_ARGUMENT";
	    ///////////////////
	    // Blockchain Errors
	    // Call exception
	    //  - transaction: the transaction
	    //  - address?: the contract address
	    //  - args?: The arguments passed into the function
	    //  - method?: The Solidity method signature
	    //  - errorSignature?: The EIP848 error signature
	    //  - errorArgs?: The EIP848 error parameters
	    //  - reason: The reason (only for EIP848 "Error(string)")
	    ErrorCode["CALL_EXCEPTION"] = "CALL_EXCEPTION";
	    // Insufficient funds (< value + gasLimit * gasPrice)
	    //   - transaction: the transaction attempted
	    ErrorCode["INSUFFICIENT_FUNDS"] = "INSUFFICIENT_FUNDS";
	    // Nonce has already been used
	    //   - transaction: the transaction attempted
	    ErrorCode["NONCE_EXPIRED"] = "NONCE_EXPIRED";
	    // The replacement fee for the transaction is too low
	    //   - transaction: the transaction attempted
	    ErrorCode["REPLACEMENT_UNDERPRICED"] = "REPLACEMENT_UNDERPRICED";
	    // The gas limit could not be estimated
	    //   - transaction: the transaction passed to estimateGas
	    ErrorCode["UNPREDICTABLE_GAS_LIMIT"] = "UNPREDICTABLE_GAS_LIMIT";
	    // The transaction was replaced by one with a higher gas price
	    //   - reason: "cancelled", "replaced" or "repriced"
	    //   - cancelled: true if reason == "cancelled" or reason == "replaced")
	    //   - hash: original transaction hash
	    //   - replacement: the full TransactionsResponse for the replacement
	    //   - receipt: the receipt of the replacement
	    ErrorCode["TRANSACTION_REPLACED"] = "TRANSACTION_REPLACED";
	})(ErrorCode || (ErrorCode = {}));
	const HEX = "0123456789abcdef";
	class Logger {
	    constructor(version) {
	        Object.defineProperty(this, "version", {
	            enumerable: true,
	            value: version,
	            writable: false
	        });
	    }
	    _log(logLevel, args) {
	        const level = logLevel.toLowerCase();
	        if (LogLevels[level] == null) {
	            this.throwArgumentError("invalid log level name", "logLevel", logLevel);
	        }
	        if (_logLevel > LogLevels[level]) {
	            return;
	        }
	        console.log.apply(console, args);
	    }
	    debug(...args) {
	        this._log(Logger.levels.DEBUG, args);
	    }
	    info(...args) {
	        this._log(Logger.levels.INFO, args);
	    }
	    warn(...args) {
	        this._log(Logger.levels.WARNING, args);
	    }
	    makeError(message, code, params) {
	        // Errors are being censored
	        if (_censorErrors) {
	            return this.makeError("censored error", code, {});
	        }
	        if (!code) {
	            code = Logger.errors.UNKNOWN_ERROR;
	        }
	        if (!params) {
	            params = {};
	        }
	        const messageDetails = [];
	        Object.keys(params).forEach((key) => {
	            const value = params[key];
	            try {
	                if (value instanceof Uint8Array) {
	                    let hex = "";
	                    for (let i = 0; i < value.length; i++) {
	                        hex += HEX[value[i] >> 4];
	                        hex += HEX[value[i] & 0x0f];
	                    }
	                    messageDetails.push(key + "=Uint8Array(0x" + hex + ")");
	                }
	                else {
	                    messageDetails.push(key + "=" + JSON.stringify(value));
	                }
	            }
	            catch (error) {
	                messageDetails.push(key + "=" + JSON.stringify(params[key].toString()));
	            }
	        });
	        messageDetails.push(`code=${code}`);
	        messageDetails.push(`version=${this.version}`);
	        const reason = message;
	        if (messageDetails.length) {
	            message += " (" + messageDetails.join(", ") + ")";
	        }
	        // @TODO: Any??
	        const error = new Error(message);
	        error.reason = reason;
	        error.code = code;
	        Object.keys(params).forEach(function (key) {
	            error[key] = params[key];
	        });
	        return error;
	    }
	    throwError(message, code, params) {
	        throw this.makeError(message, code, params);
	    }
	    throwArgumentError(message, name, value) {
	        return this.throwError(message, Logger.errors.INVALID_ARGUMENT, {
	            argument: name,
	            value: value
	        });
	    }
	    assert(condition, message, code, params) {
	        if (!!condition) {
	            return;
	        }
	        this.throwError(message, code, params);
	    }
	    assertArgument(condition, message, name, value) {
	        if (!!condition) {
	            return;
	        }
	        this.throwArgumentError(message, name, value);
	    }
	    checkNormalize(message) {
	        if (_normalizeError) {
	            this.throwError("platform missing String.prototype.normalize", Logger.errors.UNSUPPORTED_OPERATION, {
	                operation: "String.prototype.normalize", form: _normalizeError
	            });
	        }
	    }
	    checkSafeUint53(value, message) {
	        if (typeof (value) !== "number") {
	            return;
	        }
	        if (message == null) {
	            message = "value not safe";
	        }
	        if (value < 0 || value >= 0x1fffffffffffff) {
	            this.throwError(message, Logger.errors.NUMERIC_FAULT, {
	                operation: "checkSafeInteger",
	                fault: "out-of-safe-range",
	                value: value
	            });
	        }
	        if (value % 1) {
	            this.throwError(message, Logger.errors.NUMERIC_FAULT, {
	                operation: "checkSafeInteger",
	                fault: "non-integer",
	                value: value
	            });
	        }
	    }
	    checkArgumentCount(count, expectedCount, message) {
	        if (message) {
	            message = ": " + message;
	        }
	        else {
	            message = "";
	        }
	        if (count < expectedCount) {
	            this.throwError("missing argument" + message, Logger.errors.MISSING_ARGUMENT, {
	                count: count,
	                expectedCount: expectedCount
	            });
	        }
	        if (count > expectedCount) {
	            this.throwError("too many arguments" + message, Logger.errors.UNEXPECTED_ARGUMENT, {
	                count: count,
	                expectedCount: expectedCount
	            });
	        }
	    }
	    checkNew(target, kind) {
	        if (target === Object || target == null) {
	            this.throwError("missing new", Logger.errors.MISSING_NEW, { name: kind.name });
	        }
	    }
	    checkAbstract(target, kind) {
	        if (target === kind) {
	            this.throwError("cannot instantiate abstract class " + JSON.stringify(kind.name) + " directly; use a sub-class", Logger.errors.UNSUPPORTED_OPERATION, { name: target.name, operation: "new" });
	        }
	        else if (target === Object || target == null) {
	            this.throwError("missing new", Logger.errors.MISSING_NEW, { name: kind.name });
	        }
	    }
	    static globalLogger() {
	        if (!_globalLogger) {
	            _globalLogger = new Logger(version$2);
	        }
	        return _globalLogger;
	    }
	    static setCensorship(censorship, permanent) {
	        if (!censorship && permanent) {
	            this.globalLogger().throwError("cannot permanently disable censorship", Logger.errors.UNSUPPORTED_OPERATION, {
	                operation: "setCensorship"
	            });
	        }
	        if (_permanentCensorErrors) {
	            if (!censorship) {
	                return;
	            }
	            this.globalLogger().throwError("error censorship permanent", Logger.errors.UNSUPPORTED_OPERATION, {
	                operation: "setCensorship"
	            });
	        }
	        _censorErrors = !!censorship;
	        _permanentCensorErrors = !!permanent;
	    }
	    static setLogLevel(logLevel) {
	        const level = LogLevels[logLevel.toLowerCase()];
	        if (level == null) {
	            Logger.globalLogger().warn("invalid log level - " + logLevel);
	            return;
	        }
	        _logLevel = level;
	    }
	    static from(version) {
	        return new Logger(version);
	    }
	}
	Logger.errors = ErrorCode;
	Logger.levels = LogLevel;

	const version$1 = "bytes/5.5.0";

	const logger = new Logger(version$1);
	///////////////////////////////
	function isHexable(value) {
	    return !!(value.toHexString);
	}
	function addSlice(array) {
	    if (array.slice) {
	        return array;
	    }
	    array.slice = function () {
	        const args = Array.prototype.slice.call(arguments);
	        return addSlice(new Uint8Array(Array.prototype.slice.apply(array, args)));
	    };
	    return array;
	}
	function isInteger(value) {
	    return (typeof (value) === "number" && value == value && (value % 1) === 0);
	}
	function isBytes(value) {
	    if (value == null) {
	        return false;
	    }
	    if (value.constructor === Uint8Array) {
	        return true;
	    }
	    if (typeof (value) === "string") {
	        return false;
	    }
	    if (!isInteger(value.length) || value.length < 0) {
	        return false;
	    }
	    for (let i = 0; i < value.length; i++) {
	        const v = value[i];
	        if (!isInteger(v) || v < 0 || v >= 256) {
	            return false;
	        }
	    }
	    return true;
	}
	function arrayify(value, options) {
	    if (!options) {
	        options = {};
	    }
	    if (typeof (value) === "number") {
	        logger.checkSafeUint53(value, "invalid arrayify value");
	        const result = [];
	        while (value) {
	            result.unshift(value & 0xff);
	            value = parseInt(String(value / 256));
	        }
	        if (result.length === 0) {
	            result.push(0);
	        }
	        return addSlice(new Uint8Array(result));
	    }
	    if (options.allowMissingPrefix && typeof (value) === "string" && value.substring(0, 2) !== "0x") {
	        value = "0x" + value;
	    }
	    if (isHexable(value)) {
	        value = value.toHexString();
	    }
	    if (isHexString(value)) {
	        let hex = value.substring(2);
	        if (hex.length % 2) {
	            if (options.hexPad === "left") {
	                hex = "0x0" + hex.substring(2);
	            }
	            else if (options.hexPad === "right") {
	                hex += "0";
	            }
	            else {
	                logger.throwArgumentError("hex data is odd-length", "value", value);
	            }
	        }
	        const result = [];
	        for (let i = 0; i < hex.length; i += 2) {
	            result.push(parseInt(hex.substring(i, i + 2), 16));
	        }
	        return addSlice(new Uint8Array(result));
	    }
	    if (isBytes(value)) {
	        return addSlice(new Uint8Array(value));
	    }
	    return logger.throwArgumentError("invalid arrayify value", "value", value);
	}
	function isHexString(value, length) {
	    if (typeof (value) !== "string" || !value.match(/^0x[0-9A-Fa-f]*$/)) {
	        return false;
	    }
	    if (length && value.length !== 2 + 2 * length) {
	        return false;
	    }
	    return true;
	}

	const version = "sha2/5.5.0";

	new Logger(version);
	function sha256(data) {
	    return "0x" + (hash.sha256().update(arrayify(data)).digest("hex"));
	}

	class Struct {
	  constructor(properties) {
	    Object.assign(this, properties);
	  }

	  encode() {
	    return buffer.Buffer.from(serialize_1(SOLANA_SCHEMA, this));
	  }

	  static decode(data) {
	    return deserialize_1(SOLANA_SCHEMA, this, data);
	  }

	  static decodeUnchecked(data) {
	    return deserializeUnchecked_1(SOLANA_SCHEMA, this, data);
	  }

	} // Class representing a Rust-compatible enum, since enums are only strings or
	const SOLANA_SCHEMA = new Map();

	/**
	 * Maximum length of derived pubkey seed
	 */

	const MAX_SEED_LENGTH = 32;
	/**
	 * Value to be converted into public key
	 */

	function isPublicKeyData(value) {
	  return value._bn !== undefined;
	}
	/**
	 * A public key
	 */


	class PublicKey extends Struct {
	  /** @internal */

	  /**
	   * Create a new PublicKey object
	   * @param value ed25519 public key as buffer or base-58 encoded string
	   */
	  constructor(value) {
	    super({});
	    this._bn = void 0;

	    if (isPublicKeyData(value)) {
	      this._bn = value._bn;
	    } else {
	      if (typeof value === 'string') {
	        // assume base 58 encoding by default
	        const decoded = bs58$1.decode(value);

	        if (decoded.length != 32) {
	          throw new Error(`Invalid public key input`);
	        }

	        this._bn = new BN(decoded);
	      } else {
	        this._bn = new BN(value);
	      }

	      if (this._bn.byteLength() > 32) {
	        throw new Error(`Invalid public key input`);
	      }
	    }
	  }
	  /**
	   * Default public key value. (All zeros)
	   */


	  /**
	   * Checks if two publicKeys are equal
	   */
	  equals(publicKey) {
	    return this._bn.eq(publicKey._bn);
	  }
	  /**
	   * Return the base-58 representation of the public key
	   */


	  toBase58() {
	    return bs58$1.encode(this.toBytes());
	  }

	  toJSON() {
	    return this.toBase58();
	  }
	  /**
	   * Return the byte array representation of the public key
	   */


	  toBytes() {
	    return this.toBuffer();
	  }
	  /**
	   * Return the Buffer representation of the public key
	   */


	  toBuffer() {
	    const b = this._bn.toArrayLike(buffer.Buffer);

	    if (b.length === 32) {
	      return b;
	    }

	    const zeroPad = buffer.Buffer.alloc(32);
	    b.copy(zeroPad, 32 - b.length);
	    return zeroPad;
	  }
	  /**
	   * Return the base-58 representation of the public key
	   */


	  toString() {
	    return this.toBase58();
	  }
	  /**
	   * Derive a public key from another key, a seed, and a program ID.
	   * The program ID will also serve as the owner of the public key, giving
	   * it permission to write data to the account.
	   */

	  /* eslint-disable require-await */


	  static async createWithSeed(fromPublicKey, seed, programId) {
	    const buffer$1 = buffer.Buffer.concat([fromPublicKey.toBuffer(), buffer.Buffer.from(seed), programId.toBuffer()]);
	    const hash = sha256(new Uint8Array(buffer$1)).slice(2);
	    return new PublicKey(buffer.Buffer.from(hash, 'hex'));
	  }
	  /**
	   * Derive a program address from seeds and a program ID.
	   */

	  /* eslint-disable require-await */


	  static async createProgramAddress(seeds, programId) {
	    let buffer$1 = buffer.Buffer.alloc(0);
	    seeds.forEach(function (seed) {
	      if (seed.length > MAX_SEED_LENGTH) {
	        throw new TypeError(`Max seed length exceeded`);
	      }

	      buffer$1 = buffer.Buffer.concat([buffer$1, toBuffer(seed)]);
	    });
	    buffer$1 = buffer.Buffer.concat([buffer$1, programId.toBuffer(), buffer.Buffer.from('ProgramDerivedAddress')]);
	    let hash = sha256(new Uint8Array(buffer$1)).slice(2);
	    let publicKeyBytes = new BN(hash, 16).toArray(undefined, 32);

	    if (is_on_curve(publicKeyBytes)) {
	      throw new Error(`Invalid seeds, address must fall off the curve`);
	    }

	    return new PublicKey(publicKeyBytes);
	  }
	  /**
	   * Find a valid program address
	   *
	   * Valid program addresses must fall off the ed25519 curve.  This function
	   * iterates a nonce until it finds one that when combined with the seeds
	   * results in a valid program address.
	   */


	  static async findProgramAddress(seeds, programId) {
	    let nonce = 255;
	    let address;

	    while (nonce != 0) {
	      try {
	        const seedsWithNonce = seeds.concat(buffer.Buffer.from([nonce]));
	        address = await this.createProgramAddress(seedsWithNonce, programId);
	      } catch (err) {
	        if (err instanceof TypeError) {
	          throw err;
	        }

	        nonce--;
	        continue;
	      }

	      return [address, nonce];
	    }

	    throw new Error(`Unable to find a viable program address nonce`);
	  }
	  /**
	   * Check that a pubkey is on the ed25519 curve.
	   */


	  static isOnCurve(pubkey) {
	    return is_on_curve(pubkey) == 1;
	  }

	}
	PublicKey.default = new PublicKey('11111111111111111111111111111111');
	SOLANA_SCHEMA.set(PublicKey, {
	  kind: 'struct',
	  fields: [['_bn', 'u256']]
	}); // @ts-ignore

	let naclLowLevel = nacl.lowlevel; // Check that a pubkey is on the curve.
	// This function and its dependents were sourced from:
	// https://github.com/dchest/tweetnacl-js/blob/f1ec050ceae0861f34280e62498b1d3ed9c350c6/nacl.js#L792

	function is_on_curve(p) {
	  var r = [naclLowLevel.gf(), naclLowLevel.gf(), naclLowLevel.gf(), naclLowLevel.gf()];
	  var t = naclLowLevel.gf(),
	      chk = naclLowLevel.gf(),
	      num = naclLowLevel.gf(),
	      den = naclLowLevel.gf(),
	      den2 = naclLowLevel.gf(),
	      den4 = naclLowLevel.gf(),
	      den6 = naclLowLevel.gf();
	  naclLowLevel.set25519(r[2], gf1);
	  naclLowLevel.unpack25519(r[1], p);
	  naclLowLevel.S(num, r[1]);
	  naclLowLevel.M(den, num, naclLowLevel.D);
	  naclLowLevel.Z(num, num, r[2]);
	  naclLowLevel.A(den, r[2], den);
	  naclLowLevel.S(den2, den);
	  naclLowLevel.S(den4, den2);
	  naclLowLevel.M(den6, den4, den2);
	  naclLowLevel.M(t, den6, num);
	  naclLowLevel.M(t, t, den);
	  naclLowLevel.pow2523(t, t);
	  naclLowLevel.M(t, t, num);
	  naclLowLevel.M(t, t, den);
	  naclLowLevel.M(t, t, den);
	  naclLowLevel.M(r[0], t, den);
	  naclLowLevel.S(chk, r[0]);
	  naclLowLevel.M(chk, chk, den);
	  if (neq25519(chk, num)) naclLowLevel.M(r[0], r[0], I);
	  naclLowLevel.S(chk, r[0]);
	  naclLowLevel.M(chk, chk, den);
	  if (neq25519(chk, num)) return 0;
	  return 1;
	}

	let gf1 = naclLowLevel.gf([1]);
	let I = naclLowLevel.gf([0xa0b0, 0x4a0e, 0x1b27, 0xc4ee, 0xe478, 0xad2f, 0x1806, 0x2f43, 0xd7a7, 0x3dfb, 0x0099, 0x2b4d, 0xdf0b, 0x4fc1, 0x2480, 0x2b83]);

	function neq25519(a, b) {
	  var c = new Uint8Array(32),
	      d = new Uint8Array(32);
	  naclLowLevel.pack25519(c, a);
	  naclLowLevel.pack25519(d, b);
	  return naclLowLevel.crypto_verify_32(c, 0, d, 0);
	}

	new PublicKey('BPFLoader1111111111111111111111111111111111');

	/**
	 * Layout for a public key
	 */

	const publicKey = (property = 'publicKey') => {
	  return blob(32, property);
	};
	/**
	 * Layout for a Rust String type
	 */

	const rustString = (property = 'string') => {
	  const rsl = struct([u32('length'), u32('lengthPadding'), blob(offset(u32(), -8), 'chars')], property);

	  const _decode = rsl.decode.bind(rsl);

	  const _encode = rsl.encode.bind(rsl);

	  rsl.decode = (buffer, offset) => {
	    const data = _decode(buffer, offset);

	    return data['chars'].toString('utf8');
	  };

	  rsl.encode = (str, buffer$1, offset) => {
	    const data = {
	      chars: buffer.Buffer.from(str, 'utf8')
	    };
	    return _encode(data, buffer$1, offset);
	  };

	  rsl.alloc = str => {
	    return u32().span + u32().span + buffer.Buffer.from(str, 'utf8').length;
	  };

	  return rsl;
	};
	/**
	 * Layout for an Authorized object
	 */

	const authorized = (property = 'authorized') => {
	  return struct([publicKey('staker'), publicKey('withdrawer')], property);
	};
	/**
	 * Layout for a Lockup object
	 */

	const lockup = (property = 'lockup') => {
	  return struct([ns64('unixTimestamp'), ns64('epoch'), publicKey('custodian')], property);
	};
	/**
	 *  Layout for a VoteInit object
	 */

	const voteInit = (property = 'voteInit') => {
	  return struct([publicKey('nodePubkey'), publicKey('authorizedVoter'), publicKey('authorizedWithdrawer'), u8('commission')], property);
	};
	function getAlloc(type, fields) {
	  let alloc = 0;
	  type.layout.fields.forEach(item => {
	    if (item.span >= 0) {
	      alloc += item.span;
	    } else if (typeof item.alloc === 'function') {
	      alloc += item.alloc(fields[item.property]);
	    }
	  });
	  return alloc;
	}

	function decodeLength(bytes) {
	  let len = 0;
	  let size = 0;

	  for (;;) {
	    let elem = bytes.shift();
	    len |= (elem & 0x7f) << size * 7;
	    size += 1;

	    if ((elem & 0x80) === 0) {
	      break;
	    }
	  }

	  return len;
	}
	function encodeLength(bytes, len) {
	  let rem_len = len;

	  for (;;) {
	    let elem = rem_len & 0x7f;
	    rem_len >>= 7;

	    if (rem_len == 0) {
	      bytes.push(elem);
	      break;
	    } else {
	      elem |= 0x80;
	      bytes.push(elem);
	    }
	  }
	}

	/**
	 * The message header, identifying signed and read-only account
	 */

	const PUBKEY_LENGTH = 32;
	/**
	 * List of instructions to be processed atomically
	 */

	class Message {
	  constructor(args) {
	    this.header = void 0;
	    this.accountKeys = void 0;
	    this.recentBlockhash = void 0;
	    this.instructions = void 0;
	    this.indexToProgramIds = new Map();
	    this.header = args.header;
	    this.accountKeys = args.accountKeys.map(account => new PublicKey(account));
	    this.recentBlockhash = args.recentBlockhash;
	    this.instructions = args.instructions;
	    this.instructions.forEach(ix => this.indexToProgramIds.set(ix.programIdIndex, this.accountKeys[ix.programIdIndex]));
	  }

	  isAccountSigner(index) {
	    return index < this.header.numRequiredSignatures;
	  }

	  isAccountWritable(index) {
	    return index < this.header.numRequiredSignatures - this.header.numReadonlySignedAccounts || index >= this.header.numRequiredSignatures && index < this.accountKeys.length - this.header.numReadonlyUnsignedAccounts;
	  }

	  isProgramId(index) {
	    return this.indexToProgramIds.has(index);
	  }

	  programIds() {
	    return [...this.indexToProgramIds.values()];
	  }

	  nonProgramIds() {
	    return this.accountKeys.filter((_, index) => !this.isProgramId(index));
	  }

	  serialize() {
	    const numKeys = this.accountKeys.length;
	    let keyCount = [];
	    encodeLength(keyCount, numKeys);
	    const instructions = this.instructions.map(instruction => {
	      const {
	        accounts,
	        programIdIndex
	      } = instruction;
	      const data = bs58$1.decode(instruction.data);
	      let keyIndicesCount = [];
	      encodeLength(keyIndicesCount, accounts.length);
	      let dataCount = [];
	      encodeLength(dataCount, data.length);
	      return {
	        programIdIndex,
	        keyIndicesCount: buffer.Buffer.from(keyIndicesCount),
	        keyIndices: buffer.Buffer.from(accounts),
	        dataLength: buffer.Buffer.from(dataCount),
	        data
	      };
	    });
	    let instructionCount = [];
	    encodeLength(instructionCount, instructions.length);
	    let instructionBuffer = buffer.Buffer.alloc(PACKET_DATA_SIZE);
	    buffer.Buffer.from(instructionCount).copy(instructionBuffer);
	    let instructionBufferLength = instructionCount.length;
	    instructions.forEach(instruction => {
	      const instructionLayout = struct([u8('programIdIndex'), blob(instruction.keyIndicesCount.length, 'keyIndicesCount'), seq(u8('keyIndex'), instruction.keyIndices.length, 'keyIndices'), blob(instruction.dataLength.length, 'dataLength'), seq(u8('userdatum'), instruction.data.length, 'data')]);
	      const length = instructionLayout.encode(instruction, instructionBuffer, instructionBufferLength);
	      instructionBufferLength += length;
	    });
	    instructionBuffer = instructionBuffer.slice(0, instructionBufferLength);
	    const signDataLayout = struct([blob(1, 'numRequiredSignatures'), blob(1, 'numReadonlySignedAccounts'), blob(1, 'numReadonlyUnsignedAccounts'), blob(keyCount.length, 'keyCount'), seq(publicKey('key'), numKeys, 'keys'), publicKey('recentBlockhash')]);
	    const transaction = {
	      numRequiredSignatures: buffer.Buffer.from([this.header.numRequiredSignatures]),
	      numReadonlySignedAccounts: buffer.Buffer.from([this.header.numReadonlySignedAccounts]),
	      numReadonlyUnsignedAccounts: buffer.Buffer.from([this.header.numReadonlyUnsignedAccounts]),
	      keyCount: buffer.Buffer.from(keyCount),
	      keys: this.accountKeys.map(key => toBuffer(key.toBytes())),
	      recentBlockhash: bs58$1.decode(this.recentBlockhash)
	    };
	    let signData = buffer.Buffer.alloc(2048);
	    const length = signDataLayout.encode(transaction, signData);
	    instructionBuffer.copy(signData, length);
	    return signData.slice(0, length + instructionBuffer.length);
	  }
	  /**
	   * Decode a compiled message into a Message object.
	   */


	  static from(buffer$1) {
	    // Slice up wire data
	    let byteArray = [...buffer$1];
	    const numRequiredSignatures = byteArray.shift();
	    const numReadonlySignedAccounts = byteArray.shift();
	    const numReadonlyUnsignedAccounts = byteArray.shift();
	    const accountCount = decodeLength(byteArray);
	    let accountKeys = [];

	    for (let i = 0; i < accountCount; i++) {
	      const account = byteArray.slice(0, PUBKEY_LENGTH);
	      byteArray = byteArray.slice(PUBKEY_LENGTH);
	      accountKeys.push(bs58$1.encode(buffer.Buffer.from(account)));
	    }

	    const recentBlockhash = byteArray.slice(0, PUBKEY_LENGTH);
	    byteArray = byteArray.slice(PUBKEY_LENGTH);
	    const instructionCount = decodeLength(byteArray);
	    let instructions = [];

	    for (let i = 0; i < instructionCount; i++) {
	      const programIdIndex = byteArray.shift();
	      const accountCount = decodeLength(byteArray);
	      const accounts = byteArray.slice(0, accountCount);
	      byteArray = byteArray.slice(accountCount);
	      const dataLength = decodeLength(byteArray);
	      const dataSlice = byteArray.slice(0, dataLength);
	      const data = bs58$1.encode(buffer.Buffer.from(dataSlice));
	      byteArray = byteArray.slice(dataLength);
	      instructions.push({
	        programIdIndex,
	        accounts,
	        data
	      });
	    }

	    const messageArgs = {
	      header: {
	        numRequiredSignatures,
	        numReadonlySignedAccounts,
	        numReadonlyUnsignedAccounts
	      },
	      recentBlockhash: bs58$1.encode(buffer.Buffer.from(recentBlockhash)),
	      accountKeys,
	      instructions
	    };
	    return new Message(messageArgs);
	  }

	}

	function assert (condition, message) {
	  if (!condition) {
	    throw new Error(message || 'Assertion failed');
	  }
	}

	/**
	 * Default (empty) signature
	 *
	 * Signatures are 64 bytes in length
	 */
	const DEFAULT_SIGNATURE = buffer.Buffer.alloc(64).fill(0);
	/**
	 * Maximum over-the-wire size of a Transaction
	 *
	 * 1280 is IPv6 minimum MTU
	 * 40 bytes is the size of the IPv6 header
	 * 8 bytes is the size of the fragment header
	 */

	const PACKET_DATA_SIZE = 1280 - 40 - 8;
	const SIGNATURE_LENGTH = 64;
	/**
	 * Account metadata used to define instructions
	 */

	/**
	 * Transaction Instruction class
	 */
	class TransactionInstruction {
	  /**
	   * Public keys to include in this transaction
	   * Boolean represents whether this pubkey needs to sign the transaction
	   */

	  /**
	   * Program Id to execute
	   */

	  /**
	   * Program input
	   */
	  constructor(opts) {
	    this.keys = void 0;
	    this.programId = void 0;
	    this.data = buffer.Buffer.alloc(0);
	    this.programId = opts.programId;
	    this.keys = opts.keys;

	    if (opts.data) {
	      this.data = opts.data;
	    }
	  }

	}
	/**
	 * Pair of signature and corresponding public key
	 */

	/**
	 * Transaction class
	 */
	class Transaction {
	  /**
	   * Signatures for the transaction.  Typically created by invoking the
	   * `sign()` method
	   */

	  /**
	   * The first (payer) Transaction signature
	   */
	  get signature() {
	    if (this.signatures.length > 0) {
	      return this.signatures[0].signature;
	    }

	    return null;
	  }
	  /**
	   * The transaction fee payer
	   */


	  /**
	   * Construct an empty Transaction
	   */
	  constructor(opts) {
	    this.signatures = [];
	    this.feePayer = void 0;
	    this.instructions = [];
	    this.recentBlockhash = void 0;
	    this.nonceInfo = void 0;
	    opts && Object.assign(this, opts);
	  }
	  /**
	   * Add one or more instructions to this Transaction
	   */


	  add(...items) {
	    if (items.length === 0) {
	      throw new Error('No instructions');
	    }

	    items.forEach(item => {
	      if ('instructions' in item) {
	        this.instructions = this.instructions.concat(item.instructions);
	      } else if ('data' in item && 'programId' in item && 'keys' in item) {
	        this.instructions.push(item);
	      } else {
	        this.instructions.push(new TransactionInstruction(item));
	      }
	    });
	    return this;
	  }
	  /**
	   * Compile transaction data
	   */


	  compileMessage() {
	    const {
	      nonceInfo
	    } = this;

	    if (nonceInfo && this.instructions[0] != nonceInfo.nonceInstruction) {
	      this.recentBlockhash = nonceInfo.nonce;
	      this.instructions.unshift(nonceInfo.nonceInstruction);
	    }

	    const {
	      recentBlockhash
	    } = this;

	    if (!recentBlockhash) {
	      throw new Error('Transaction recentBlockhash required');
	    }

	    if (this.instructions.length < 1) {
	      console.warn('No instructions provided');
	    }

	    let feePayer;

	    if (this.feePayer) {
	      feePayer = this.feePayer;
	    } else if (this.signatures.length > 0 && this.signatures[0].publicKey) {
	      // Use implicit fee payer
	      feePayer = this.signatures[0].publicKey;
	    } else {
	      throw new Error('Transaction fee payer required');
	    }

	    for (let i = 0; i < this.instructions.length; i++) {
	      if (this.instructions[i].programId === undefined) {
	        throw new Error(`Transaction instruction index ${i} has undefined program id`);
	      }
	    }

	    const programIds = [];
	    const accountMetas = [];
	    this.instructions.forEach(instruction => {
	      instruction.keys.forEach(accountMeta => {
	        accountMetas.push({ ...accountMeta
	        });
	      });
	      const programId = instruction.programId.toString();

	      if (!programIds.includes(programId)) {
	        programIds.push(programId);
	      }
	    }); // Append programID account metas

	    programIds.forEach(programId => {
	      accountMetas.push({
	        pubkey: new PublicKey(programId),
	        isSigner: false,
	        isWritable: false
	      });
	    }); // Sort. Prioritizing first by signer, then by writable

	    accountMetas.sort(function (x, y) {
	      const pubkeySorting = x.pubkey.toBase58().localeCompare(y.pubkey.toBase58());
	      const checkSigner = x.isSigner === y.isSigner ? 0 : x.isSigner ? -1 : 1;
	      const checkWritable = x.isWritable === y.isWritable ? pubkeySorting : x.isWritable ? -1 : 1;
	      return checkSigner || checkWritable;
	    }); // Cull duplicate account metas

	    const uniqueMetas = [];
	    accountMetas.forEach(accountMeta => {
	      const pubkeyString = accountMeta.pubkey.toString();
	      const uniqueIndex = uniqueMetas.findIndex(x => {
	        return x.pubkey.toString() === pubkeyString;
	      });

	      if (uniqueIndex > -1) {
	        uniqueMetas[uniqueIndex].isWritable = uniqueMetas[uniqueIndex].isWritable || accountMeta.isWritable;
	      } else {
	        uniqueMetas.push(accountMeta);
	      }
	    }); // Move fee payer to the front

	    const feePayerIndex = uniqueMetas.findIndex(x => {
	      return x.pubkey.equals(feePayer);
	    });

	    if (feePayerIndex > -1) {
	      const [payerMeta] = uniqueMetas.splice(feePayerIndex, 1);
	      payerMeta.isSigner = true;
	      payerMeta.isWritable = true;
	      uniqueMetas.unshift(payerMeta);
	    } else {
	      uniqueMetas.unshift({
	        pubkey: feePayer,
	        isSigner: true,
	        isWritable: true
	      });
	    } // Disallow unknown signers


	    for (const signature of this.signatures) {
	      const uniqueIndex = uniqueMetas.findIndex(x => {
	        return x.pubkey.equals(signature.publicKey);
	      });

	      if (uniqueIndex > -1) {
	        if (!uniqueMetas[uniqueIndex].isSigner) {
	          uniqueMetas[uniqueIndex].isSigner = true;
	          console.warn('Transaction references a signature that is unnecessary, ' + 'only the fee payer and instruction signer accounts should sign a transaction. ' + 'This behavior is deprecated and will throw an error in the next major version release.');
	        }
	      } else {
	        throw new Error(`unknown signer: ${signature.publicKey.toString()}`);
	      }
	    }

	    let numRequiredSignatures = 0;
	    let numReadonlySignedAccounts = 0;
	    let numReadonlyUnsignedAccounts = 0; // Split out signing from non-signing keys and count header values

	    const signedKeys = [];
	    const unsignedKeys = [];
	    uniqueMetas.forEach(({
	      pubkey,
	      isSigner,
	      isWritable
	    }) => {
	      if (isSigner) {
	        signedKeys.push(pubkey.toString());
	        numRequiredSignatures += 1;

	        if (!isWritable) {
	          numReadonlySignedAccounts += 1;
	        }
	      } else {
	        unsignedKeys.push(pubkey.toString());

	        if (!isWritable) {
	          numReadonlyUnsignedAccounts += 1;
	        }
	      }
	    });
	    const accountKeys = signedKeys.concat(unsignedKeys);
	    const instructions = this.instructions.map(instruction => {
	      const {
	        data,
	        programId
	      } = instruction;
	      return {
	        programIdIndex: accountKeys.indexOf(programId.toString()),
	        accounts: instruction.keys.map(meta => accountKeys.indexOf(meta.pubkey.toString())),
	        data: bs58$1.encode(data)
	      };
	    });
	    instructions.forEach(instruction => {
	      assert(instruction.programIdIndex >= 0);
	      instruction.accounts.forEach(keyIndex => assert(keyIndex >= 0));
	    });
	    return new Message({
	      header: {
	        numRequiredSignatures,
	        numReadonlySignedAccounts,
	        numReadonlyUnsignedAccounts
	      },
	      accountKeys,
	      recentBlockhash,
	      instructions
	    });
	  }
	  /**
	   * @internal
	   */


	  _compile() {
	    const message = this.compileMessage();
	    const signedKeys = message.accountKeys.slice(0, message.header.numRequiredSignatures);

	    if (this.signatures.length === signedKeys.length) {
	      const valid = this.signatures.every((pair, index) => {
	        return signedKeys[index].equals(pair.publicKey);
	      });
	      if (valid) return message;
	    }

	    this.signatures = signedKeys.map(publicKey => ({
	      signature: null,
	      publicKey
	    }));
	    return message;
	  }
	  /**
	   * Get a buffer of the Transaction data that need to be covered by signatures
	   */


	  serializeMessage() {
	    return this._compile().serialize();
	  }
	  /**
	   * Specify the public keys which will be used to sign the Transaction.
	   * The first signer will be used as the transaction fee payer account.
	   *
	   * Signatures can be added with either `partialSign` or `addSignature`
	   *
	   * @deprecated Deprecated since v0.84.0. Only the fee payer needs to be
	   * specified and it can be set in the Transaction constructor or with the
	   * `feePayer` property.
	   */


	  setSigners(...signers) {
	    if (signers.length === 0) {
	      throw new Error('No signers');
	    }

	    const seen = new Set();
	    this.signatures = signers.filter(publicKey => {
	      const key = publicKey.toString();

	      if (seen.has(key)) {
	        return false;
	      } else {
	        seen.add(key);
	        return true;
	      }
	    }).map(publicKey => ({
	      signature: null,
	      publicKey
	    }));
	  }
	  /**
	   * Sign the Transaction with the specified signers. Multiple signatures may
	   * be applied to a Transaction. The first signature is considered "primary"
	   * and is used identify and confirm transactions.
	   *
	   * If the Transaction `feePayer` is not set, the first signer will be used
	   * as the transaction fee payer account.
	   *
	   * Transaction fields should not be modified after the first call to `sign`,
	   * as doing so may invalidate the signature and cause the Transaction to be
	   * rejected.
	   *
	   * The Transaction must be assigned a valid `recentBlockhash` before invoking this method
	   */


	  sign(...signers) {
	    if (signers.length === 0) {
	      throw new Error('No signers');
	    } // Dedupe signers


	    const seen = new Set();
	    const uniqueSigners = [];

	    for (const signer of signers) {
	      const key = signer.publicKey.toString();

	      if (seen.has(key)) {
	        continue;
	      } else {
	        seen.add(key);
	        uniqueSigners.push(signer);
	      }
	    }

	    this.signatures = uniqueSigners.map(signer => ({
	      signature: null,
	      publicKey: signer.publicKey
	    }));

	    const message = this._compile();

	    this._partialSign(message, ...uniqueSigners);

	    this._verifySignatures(message.serialize(), true);
	  }
	  /**
	   * Partially sign a transaction with the specified accounts. All accounts must
	   * correspond to either the fee payer or a signer account in the transaction
	   * instructions.
	   *
	   * All the caveats from the `sign` method apply to `partialSign`
	   */


	  partialSign(...signers) {
	    if (signers.length === 0) {
	      throw new Error('No signers');
	    } // Dedupe signers


	    const seen = new Set();
	    const uniqueSigners = [];

	    for (const signer of signers) {
	      const key = signer.publicKey.toString();

	      if (seen.has(key)) {
	        continue;
	      } else {
	        seen.add(key);
	        uniqueSigners.push(signer);
	      }
	    }

	    const message = this._compile();

	    this._partialSign(message, ...uniqueSigners);
	  }
	  /**
	   * @internal
	   */


	  _partialSign(message, ...signers) {
	    const signData = message.serialize();
	    signers.forEach(signer => {
	      const signature = nacl.sign.detached(signData, signer.secretKey);

	      this._addSignature(signer.publicKey, toBuffer(signature));
	    });
	  }
	  /**
	   * Add an externally created signature to a transaction. The public key
	   * must correspond to either the fee payer or a signer account in the transaction
	   * instructions.
	   */


	  addSignature(pubkey, signature) {
	    this._compile(); // Ensure signatures array is populated


	    this._addSignature(pubkey, signature);
	  }
	  /**
	   * @internal
	   */


	  _addSignature(pubkey, signature) {
	    assert(signature.length === 64);
	    const index = this.signatures.findIndex(sigpair => pubkey.equals(sigpair.publicKey));

	    if (index < 0) {
	      throw new Error(`unknown signer: ${pubkey.toString()}`);
	    }

	    this.signatures[index].signature = buffer.Buffer.from(signature);
	  }
	  /**
	   * Verify signatures of a complete, signed Transaction
	   */


	  verifySignatures() {
	    return this._verifySignatures(this.serializeMessage(), true);
	  }
	  /**
	   * @internal
	   */


	  _verifySignatures(signData, requireAllSignatures) {
	    for (const {
	      signature,
	      publicKey
	    } of this.signatures) {
	      if (signature === null) {
	        if (requireAllSignatures) {
	          return false;
	        }
	      } else {
	        if (!nacl.sign.detached.verify(signData, signature, publicKey.toBuffer())) {
	          return false;
	        }
	      }
	    }

	    return true;
	  }
	  /**
	   * Serialize the Transaction in the wire format.
	   */


	  serialize(config) {
	    const {
	      requireAllSignatures,
	      verifySignatures
	    } = Object.assign({
	      requireAllSignatures: true,
	      verifySignatures: true
	    }, config);
	    const signData = this.serializeMessage();

	    if (verifySignatures && !this._verifySignatures(signData, requireAllSignatures)) {
	      throw new Error('Signature verification failed');
	    }

	    return this._serialize(signData);
	  }
	  /**
	   * @internal
	   */


	  _serialize(signData) {
	    const {
	      signatures
	    } = this;
	    const signatureCount = [];
	    encodeLength(signatureCount, signatures.length);
	    const transactionLength = signatureCount.length + signatures.length * 64 + signData.length;
	    const wireTransaction = buffer.Buffer.alloc(transactionLength);
	    assert(signatures.length < 256);
	    buffer.Buffer.from(signatureCount).copy(wireTransaction, 0);
	    signatures.forEach(({
	      signature
	    }, index) => {
	      if (signature !== null) {
	        assert(signature.length === 64, `signature has invalid length`);
	        buffer.Buffer.from(signature).copy(wireTransaction, signatureCount.length + index * 64);
	      }
	    });
	    signData.copy(wireTransaction, signatureCount.length + signatures.length * 64);
	    assert(wireTransaction.length <= PACKET_DATA_SIZE, `Transaction too large: ${wireTransaction.length} > ${PACKET_DATA_SIZE}`);
	    return wireTransaction;
	  }
	  /**
	   * Deprecated method
	   * @internal
	   */


	  get keys() {
	    assert(this.instructions.length === 1);
	    return this.instructions[0].keys.map(keyObj => keyObj.pubkey);
	  }
	  /**
	   * Deprecated method
	   * @internal
	   */


	  get programId() {
	    assert(this.instructions.length === 1);
	    return this.instructions[0].programId;
	  }
	  /**
	   * Deprecated method
	   * @internal
	   */


	  get data() {
	    assert(this.instructions.length === 1);
	    return this.instructions[0].data;
	  }
	  /**
	   * Parse a wire transaction into a Transaction object.
	   */


	  static from(buffer$1) {
	    // Slice up wire data
	    let byteArray = [...buffer$1];
	    const signatureCount = decodeLength(byteArray);
	    let signatures = [];

	    for (let i = 0; i < signatureCount; i++) {
	      const signature = byteArray.slice(0, SIGNATURE_LENGTH);
	      byteArray = byteArray.slice(SIGNATURE_LENGTH);
	      signatures.push(bs58$1.encode(buffer.Buffer.from(signature)));
	    }

	    return Transaction.populate(Message.from(byteArray), signatures);
	  }
	  /**
	   * Populate Transaction object from message and signatures
	   */


	  static populate(message, signatures = []) {
	    const transaction = new Transaction();
	    transaction.recentBlockhash = message.recentBlockhash;

	    if (message.header.numRequiredSignatures > 0) {
	      transaction.feePayer = message.accountKeys[0];
	    }

	    signatures.forEach((signature, index) => {
	      const sigPubkeyPair = {
	        signature: signature == bs58$1.encode(DEFAULT_SIGNATURE) ? null : bs58$1.decode(signature),
	        publicKey: message.accountKeys[index]
	      };
	      transaction.signatures.push(sigPubkeyPair);
	    });
	    message.instructions.forEach(instruction => {
	      const keys = instruction.accounts.map(account => {
	        const pubkey = message.accountKeys[account];
	        return {
	          pubkey,
	          isSigner: transaction.signatures.some(keyObj => keyObj.publicKey.toString() === pubkey.toString()) || message.isAccountSigner(account),
	          isWritable: message.isAccountWritable(account)
	        };
	      });
	      transaction.instructions.push(new TransactionInstruction({
	        keys,
	        programId: message.accountKeys[instruction.programIdIndex],
	        data: bs58$1.decode(instruction.data)
	      }));
	    });
	    return transaction;
	  }

	}

	new PublicKey('SysvarC1ock11111111111111111111111111111111');
	new PublicKey('SysvarEpochSchedu1e111111111111111111111111');
	new PublicKey('Sysvar1nstructions1111111111111111111111111');
	const SYSVAR_RECENT_BLOCKHASHES_PUBKEY = new PublicKey('SysvarRecentB1ockHashes11111111111111111111');
	const SYSVAR_RENT_PUBKEY = new PublicKey('SysvarRent111111111111111111111111111111111');
	new PublicKey('SysvarRewards111111111111111111111111111111');
	new PublicKey('SysvarS1otHashes111111111111111111111111111');
	new PublicKey('SysvarS1otHistory11111111111111111111111111');
	new PublicKey('SysvarStakeHistory1111111111111111111111111');

	// zzz
	function sleep(ms) {
	  return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * @internal
	 */

	/**
	 * Populate a buffer of instruction data using an InstructionType
	 * @internal
	 */
	function encodeData(type, fields) {
	  const allocLength = type.layout.span >= 0 ? type.layout.span : getAlloc(type, fields);
	  const data = buffer.Buffer.alloc(allocLength);
	  const layoutFields = Object.assign({
	    instruction: type.index
	  }, fields);
	  type.layout.encode(layoutFields, data);
	  return data;
	}

	/**
	 * https://github.com/solana-labs/solana/blob/90bedd7e067b5b8f3ddbb45da00a4e9cabb22c62/sdk/src/fee_calculator.rs#L7-L11
	 *
	 * @internal
	 */

	const FeeCalculatorLayout = nu64('lamportsPerSignature');
	/**
	 * Calculator for transaction fees.
	 */

	/**
	 * See https://github.com/solana-labs/solana/blob/0ea2843ec9cdc517572b8e62c959f41b55cf4453/sdk/src/nonce_state.rs#L29-L32
	 *
	 * @internal
	 */

	const NonceAccountLayout = struct([u32('version'), u32('state'), publicKey('authorizedPubkey'), publicKey('nonce'), struct([FeeCalculatorLayout], 'feeCalculator')]);
	const NONCE_ACCOUNT_LENGTH = NonceAccountLayout.span;

	/**
	 * NonceAccount class
	 */
	class NonceAccount {
	  /**
	   * @internal
	   */
	  constructor(args) {
	    this.authorizedPubkey = void 0;
	    this.nonce = void 0;
	    this.feeCalculator = void 0;
	    this.authorizedPubkey = args.authorizedPubkey;
	    this.nonce = args.nonce;
	    this.feeCalculator = args.feeCalculator;
	  }
	  /**
	   * Deserialize NonceAccount from the account data.
	   *
	   * @param buffer account data
	   * @return NonceAccount
	   */


	  static fromAccountData(buffer) {
	    const nonceAccount = NonceAccountLayout.decode(toBuffer(buffer), 0);
	    return new NonceAccount({
	      authorizedPubkey: new PublicKey(nonceAccount.authorizedPubkey),
	      nonce: new PublicKey(nonceAccount.nonce).toString(),
	      feeCalculator: nonceAccount.feeCalculator
	    });
	  }

	}
	/**
	 * An enumeration of valid SystemInstructionType's
	 */

	/**
	 * An enumeration of valid system InstructionType's
	 * @internal
	 */
	const SYSTEM_INSTRUCTION_LAYOUTS = Object.freeze({
	  Create: {
	    index: 0,
	    layout: struct([u32('instruction'), ns64('lamports'), ns64('space'), publicKey('programId')])
	  },
	  Assign: {
	    index: 1,
	    layout: struct([u32('instruction'), publicKey('programId')])
	  },
	  Transfer: {
	    index: 2,
	    layout: struct([u32('instruction'), ns64('lamports')])
	  },
	  CreateWithSeed: {
	    index: 3,
	    layout: struct([u32('instruction'), publicKey('base'), rustString('seed'), ns64('lamports'), ns64('space'), publicKey('programId')])
	  },
	  AdvanceNonceAccount: {
	    index: 4,
	    layout: struct([u32('instruction')])
	  },
	  WithdrawNonceAccount: {
	    index: 5,
	    layout: struct([u32('instruction'), ns64('lamports')])
	  },
	  InitializeNonceAccount: {
	    index: 6,
	    layout: struct([u32('instruction'), publicKey('authorized')])
	  },
	  AuthorizeNonceAccount: {
	    index: 7,
	    layout: struct([u32('instruction'), publicKey('authorized')])
	  },
	  Allocate: {
	    index: 8,
	    layout: struct([u32('instruction'), ns64('space')])
	  },
	  AllocateWithSeed: {
	    index: 9,
	    layout: struct([u32('instruction'), publicKey('base'), rustString('seed'), ns64('space'), publicKey('programId')])
	  },
	  AssignWithSeed: {
	    index: 10,
	    layout: struct([u32('instruction'), publicKey('base'), rustString('seed'), publicKey('programId')])
	  },
	  TransferWithSeed: {
	    index: 11,
	    layout: struct([u32('instruction'), ns64('lamports'), rustString('seed'), publicKey('programId')])
	  }
	});
	/**
	 * Factory class for transactions to interact with the System program
	 */

	class SystemProgram {
	  /**
	   * @internal
	   */
	  constructor() {}
	  /**
	   * Public key that identifies the System program
	   */


	  /**
	   * Generate a transaction instruction that creates a new account
	   */
	  static createAccount(params) {
	    const type = SYSTEM_INSTRUCTION_LAYOUTS.Create;
	    const data = encodeData(type, {
	      lamports: params.lamports,
	      space: params.space,
	      programId: toBuffer(params.programId.toBuffer())
	    });
	    return new TransactionInstruction({
	      keys: [{
	        pubkey: params.fromPubkey,
	        isSigner: true,
	        isWritable: true
	      }, {
	        pubkey: params.newAccountPubkey,
	        isSigner: true,
	        isWritable: true
	      }],
	      programId: this.programId,
	      data
	    });
	  }
	  /**
	   * Generate a transaction instruction that transfers lamports from one account to another
	   */


	  static transfer(params) {
	    let data;
	    let keys;

	    if ('basePubkey' in params) {
	      const type = SYSTEM_INSTRUCTION_LAYOUTS.TransferWithSeed;
	      data = encodeData(type, {
	        lamports: params.lamports,
	        seed: params.seed,
	        programId: toBuffer(params.programId.toBuffer())
	      });
	      keys = [{
	        pubkey: params.fromPubkey,
	        isSigner: false,
	        isWritable: true
	      }, {
	        pubkey: params.basePubkey,
	        isSigner: true,
	        isWritable: false
	      }, {
	        pubkey: params.toPubkey,
	        isSigner: false,
	        isWritable: true
	      }];
	    } else {
	      const type = SYSTEM_INSTRUCTION_LAYOUTS.Transfer;
	      data = encodeData(type, {
	        lamports: params.lamports
	      });
	      keys = [{
	        pubkey: params.fromPubkey,
	        isSigner: true,
	        isWritable: true
	      }, {
	        pubkey: params.toPubkey,
	        isSigner: false,
	        isWritable: true
	      }];
	    }

	    return new TransactionInstruction({
	      keys,
	      programId: this.programId,
	      data
	    });
	  }
	  /**
	   * Generate a transaction instruction that assigns an account to a program
	   */


	  static assign(params) {
	    let data;
	    let keys;

	    if ('basePubkey' in params) {
	      const type = SYSTEM_INSTRUCTION_LAYOUTS.AssignWithSeed;
	      data = encodeData(type, {
	        base: toBuffer(params.basePubkey.toBuffer()),
	        seed: params.seed,
	        programId: toBuffer(params.programId.toBuffer())
	      });
	      keys = [{
	        pubkey: params.accountPubkey,
	        isSigner: false,
	        isWritable: true
	      }, {
	        pubkey: params.basePubkey,
	        isSigner: true,
	        isWritable: false
	      }];
	    } else {
	      const type = SYSTEM_INSTRUCTION_LAYOUTS.Assign;
	      data = encodeData(type, {
	        programId: toBuffer(params.programId.toBuffer())
	      });
	      keys = [{
	        pubkey: params.accountPubkey,
	        isSigner: true,
	        isWritable: true
	      }];
	    }

	    return new TransactionInstruction({
	      keys,
	      programId: this.programId,
	      data
	    });
	  }
	  /**
	   * Generate a transaction instruction that creates a new account at
	   *   an address generated with `from`, a seed, and programId
	   */


	  static createAccountWithSeed(params) {
	    const type = SYSTEM_INSTRUCTION_LAYOUTS.CreateWithSeed;
	    const data = encodeData(type, {
	      base: toBuffer(params.basePubkey.toBuffer()),
	      seed: params.seed,
	      lamports: params.lamports,
	      space: params.space,
	      programId: toBuffer(params.programId.toBuffer())
	    });
	    let keys = [{
	      pubkey: params.fromPubkey,
	      isSigner: true,
	      isWritable: true
	    }, {
	      pubkey: params.newAccountPubkey,
	      isSigner: false,
	      isWritable: true
	    }];

	    if (params.basePubkey != params.fromPubkey) {
	      keys.push({
	        pubkey: params.basePubkey,
	        isSigner: true,
	        isWritable: false
	      });
	    }

	    return new TransactionInstruction({
	      keys,
	      programId: this.programId,
	      data
	    });
	  }
	  /**
	   * Generate a transaction that creates a new Nonce account
	   */


	  static createNonceAccount(params) {
	    const transaction = new Transaction();

	    if ('basePubkey' in params && 'seed' in params) {
	      transaction.add(SystemProgram.createAccountWithSeed({
	        fromPubkey: params.fromPubkey,
	        newAccountPubkey: params.noncePubkey,
	        basePubkey: params.basePubkey,
	        seed: params.seed,
	        lamports: params.lamports,
	        space: NONCE_ACCOUNT_LENGTH,
	        programId: this.programId
	      }));
	    } else {
	      transaction.add(SystemProgram.createAccount({
	        fromPubkey: params.fromPubkey,
	        newAccountPubkey: params.noncePubkey,
	        lamports: params.lamports,
	        space: NONCE_ACCOUNT_LENGTH,
	        programId: this.programId
	      }));
	    }

	    const initParams = {
	      noncePubkey: params.noncePubkey,
	      authorizedPubkey: params.authorizedPubkey
	    };
	    transaction.add(this.nonceInitialize(initParams));
	    return transaction;
	  }
	  /**
	   * Generate an instruction to initialize a Nonce account
	   */


	  static nonceInitialize(params) {
	    const type = SYSTEM_INSTRUCTION_LAYOUTS.InitializeNonceAccount;
	    const data = encodeData(type, {
	      authorized: toBuffer(params.authorizedPubkey.toBuffer())
	    });
	    const instructionData = {
	      keys: [{
	        pubkey: params.noncePubkey,
	        isSigner: false,
	        isWritable: true
	      }, {
	        pubkey: SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
	        isSigner: false,
	        isWritable: false
	      }, {
	        pubkey: SYSVAR_RENT_PUBKEY,
	        isSigner: false,
	        isWritable: false
	      }],
	      programId: this.programId,
	      data
	    };
	    return new TransactionInstruction(instructionData);
	  }
	  /**
	   * Generate an instruction to advance the nonce in a Nonce account
	   */


	  static nonceAdvance(params) {
	    const type = SYSTEM_INSTRUCTION_LAYOUTS.AdvanceNonceAccount;
	    const data = encodeData(type);
	    const instructionData = {
	      keys: [{
	        pubkey: params.noncePubkey,
	        isSigner: false,
	        isWritable: true
	      }, {
	        pubkey: SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
	        isSigner: false,
	        isWritable: false
	      }, {
	        pubkey: params.authorizedPubkey,
	        isSigner: true,
	        isWritable: false
	      }],
	      programId: this.programId,
	      data
	    };
	    return new TransactionInstruction(instructionData);
	  }
	  /**
	   * Generate a transaction instruction that withdraws lamports from a Nonce account
	   */


	  static nonceWithdraw(params) {
	    const type = SYSTEM_INSTRUCTION_LAYOUTS.WithdrawNonceAccount;
	    const data = encodeData(type, {
	      lamports: params.lamports
	    });
	    return new TransactionInstruction({
	      keys: [{
	        pubkey: params.noncePubkey,
	        isSigner: false,
	        isWritable: true
	      }, {
	        pubkey: params.toPubkey,
	        isSigner: false,
	        isWritable: true
	      }, {
	        pubkey: SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
	        isSigner: false,
	        isWritable: false
	      }, {
	        pubkey: SYSVAR_RENT_PUBKEY,
	        isSigner: false,
	        isWritable: false
	      }, {
	        pubkey: params.authorizedPubkey,
	        isSigner: true,
	        isWritable: false
	      }],
	      programId: this.programId,
	      data
	    });
	  }
	  /**
	   * Generate a transaction instruction that authorizes a new PublicKey as the authority
	   * on a Nonce account.
	   */


	  static nonceAuthorize(params) {
	    const type = SYSTEM_INSTRUCTION_LAYOUTS.AuthorizeNonceAccount;
	    const data = encodeData(type, {
	      authorized: toBuffer(params.newAuthorizedPubkey.toBuffer())
	    });
	    return new TransactionInstruction({
	      keys: [{
	        pubkey: params.noncePubkey,
	        isSigner: false,
	        isWritable: true
	      }, {
	        pubkey: params.authorizedPubkey,
	        isSigner: true,
	        isWritable: false
	      }],
	      programId: this.programId,
	      data
	    });
	  }
	  /**
	   * Generate a transaction instruction that allocates space in an account without funding
	   */


	  static allocate(params) {
	    let data;
	    let keys;

	    if ('basePubkey' in params) {
	      const type = SYSTEM_INSTRUCTION_LAYOUTS.AllocateWithSeed;
	      data = encodeData(type, {
	        base: toBuffer(params.basePubkey.toBuffer()),
	        seed: params.seed,
	        space: params.space,
	        programId: toBuffer(params.programId.toBuffer())
	      });
	      keys = [{
	        pubkey: params.accountPubkey,
	        isSigner: false,
	        isWritable: true
	      }, {
	        pubkey: params.basePubkey,
	        isSigner: true,
	        isWritable: false
	      }];
	    } else {
	      const type = SYSTEM_INSTRUCTION_LAYOUTS.Allocate;
	      data = encodeData(type, {
	        space: params.space
	      });
	      keys = [{
	        pubkey: params.accountPubkey,
	        isSigner: true,
	        isWritable: true
	      }];
	    }

	    return new TransactionInstruction({
	      keys,
	      programId: this.programId,
	      data
	    });
	  }

	}
	SystemProgram.programId = new PublicKey('11111111111111111111111111111111');

	new PublicKey('BPFLoader2111111111111111111111111111111111');

	var browserPonyfill = {exports: {}};

	(function (module, exports) {
	var global = typeof self !== 'undefined' ? self : commonjsGlobal;
	var __self__ = (function () {
	function F() {
	this.fetch = false;
	this.DOMException = global.DOMException;
	}
	F.prototype = global;
	return new F();
	})();
	(function(self) {

	((function (exports) {

	  var support = {
	    searchParams: 'URLSearchParams' in self,
	    iterable: 'Symbol' in self && 'iterator' in Symbol,
	    blob:
	      'FileReader' in self &&
	      'Blob' in self &&
	      (function() {
	        try {
	          new Blob();
	          return true
	        } catch (e) {
	          return false
	        }
	      })(),
	    formData: 'FormData' in self,
	    arrayBuffer: 'ArrayBuffer' in self
	  };

	  function isDataView(obj) {
	    return obj && DataView.prototype.isPrototypeOf(obj)
	  }

	  if (support.arrayBuffer) {
	    var viewClasses = [
	      '[object Int8Array]',
	      '[object Uint8Array]',
	      '[object Uint8ClampedArray]',
	      '[object Int16Array]',
	      '[object Uint16Array]',
	      '[object Int32Array]',
	      '[object Uint32Array]',
	      '[object Float32Array]',
	      '[object Float64Array]'
	    ];

	    var isArrayBufferView =
	      ArrayBuffer.isView ||
	      function(obj) {
	        return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
	      };
	  }

	  function normalizeName(name) {
	    if (typeof name !== 'string') {
	      name = String(name);
	    }
	    if (/[^a-z0-9\-#$%&'*+.^_`|~]/i.test(name)) {
	      throw new TypeError('Invalid character in header field name')
	    }
	    return name.toLowerCase()
	  }

	  function normalizeValue(value) {
	    if (typeof value !== 'string') {
	      value = String(value);
	    }
	    return value
	  }

	  // Build a destructive iterator for the value list
	  function iteratorFor(items) {
	    var iterator = {
	      next: function() {
	        var value = items.shift();
	        return {done: value === undefined, value: value}
	      }
	    };

	    if (support.iterable) {
	      iterator[Symbol.iterator] = function() {
	        return iterator
	      };
	    }

	    return iterator
	  }

	  function Headers(headers) {
	    this.map = {};

	    if (headers instanceof Headers) {
	      headers.forEach(function(value, name) {
	        this.append(name, value);
	      }, this);
	    } else if (Array.isArray(headers)) {
	      headers.forEach(function(header) {
	        this.append(header[0], header[1]);
	      }, this);
	    } else if (headers) {
	      Object.getOwnPropertyNames(headers).forEach(function(name) {
	        this.append(name, headers[name]);
	      }, this);
	    }
	  }

	  Headers.prototype.append = function(name, value) {
	    name = normalizeName(name);
	    value = normalizeValue(value);
	    var oldValue = this.map[name];
	    this.map[name] = oldValue ? oldValue + ', ' + value : value;
	  };

	  Headers.prototype['delete'] = function(name) {
	    delete this.map[normalizeName(name)];
	  };

	  Headers.prototype.get = function(name) {
	    name = normalizeName(name);
	    return this.has(name) ? this.map[name] : null
	  };

	  Headers.prototype.has = function(name) {
	    return this.map.hasOwnProperty(normalizeName(name))
	  };

	  Headers.prototype.set = function(name, value) {
	    this.map[normalizeName(name)] = normalizeValue(value);
	  };

	  Headers.prototype.forEach = function(callback, thisArg) {
	    for (var name in this.map) {
	      if (this.map.hasOwnProperty(name)) {
	        callback.call(thisArg, this.map[name], name, this);
	      }
	    }
	  };

	  Headers.prototype.keys = function() {
	    var items = [];
	    this.forEach(function(value, name) {
	      items.push(name);
	    });
	    return iteratorFor(items)
	  };

	  Headers.prototype.values = function() {
	    var items = [];
	    this.forEach(function(value) {
	      items.push(value);
	    });
	    return iteratorFor(items)
	  };

	  Headers.prototype.entries = function() {
	    var items = [];
	    this.forEach(function(value, name) {
	      items.push([name, value]);
	    });
	    return iteratorFor(items)
	  };

	  if (support.iterable) {
	    Headers.prototype[Symbol.iterator] = Headers.prototype.entries;
	  }

	  function consumed(body) {
	    if (body.bodyUsed) {
	      return Promise.reject(new TypeError('Already read'))
	    }
	    body.bodyUsed = true;
	  }

	  function fileReaderReady(reader) {
	    return new Promise(function(resolve, reject) {
	      reader.onload = function() {
	        resolve(reader.result);
	      };
	      reader.onerror = function() {
	        reject(reader.error);
	      };
	    })
	  }

	  function readBlobAsArrayBuffer(blob) {
	    var reader = new FileReader();
	    var promise = fileReaderReady(reader);
	    reader.readAsArrayBuffer(blob);
	    return promise
	  }

	  function readBlobAsText(blob) {
	    var reader = new FileReader();
	    var promise = fileReaderReady(reader);
	    reader.readAsText(blob);
	    return promise
	  }

	  function readArrayBufferAsText(buf) {
	    var view = new Uint8Array(buf);
	    var chars = new Array(view.length);

	    for (var i = 0; i < view.length; i++) {
	      chars[i] = String.fromCharCode(view[i]);
	    }
	    return chars.join('')
	  }

	  function bufferClone(buf) {
	    if (buf.slice) {
	      return buf.slice(0)
	    } else {
	      var view = new Uint8Array(buf.byteLength);
	      view.set(new Uint8Array(buf));
	      return view.buffer
	    }
	  }

	  function Body() {
	    this.bodyUsed = false;

	    this._initBody = function(body) {
	      this._bodyInit = body;
	      if (!body) {
	        this._bodyText = '';
	      } else if (typeof body === 'string') {
	        this._bodyText = body;
	      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
	        this._bodyBlob = body;
	      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
	        this._bodyFormData = body;
	      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
	        this._bodyText = body.toString();
	      } else if (support.arrayBuffer && support.blob && isDataView(body)) {
	        this._bodyArrayBuffer = bufferClone(body.buffer);
	        // IE 10-11 can't handle a DataView body.
	        this._bodyInit = new Blob([this._bodyArrayBuffer]);
	      } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
	        this._bodyArrayBuffer = bufferClone(body);
	      } else {
	        this._bodyText = body = Object.prototype.toString.call(body);
	      }

	      if (!this.headers.get('content-type')) {
	        if (typeof body === 'string') {
	          this.headers.set('content-type', 'text/plain;charset=UTF-8');
	        } else if (this._bodyBlob && this._bodyBlob.type) {
	          this.headers.set('content-type', this._bodyBlob.type);
	        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
	          this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
	        }
	      }
	    };

	    if (support.blob) {
	      this.blob = function() {
	        var rejected = consumed(this);
	        if (rejected) {
	          return rejected
	        }

	        if (this._bodyBlob) {
	          return Promise.resolve(this._bodyBlob)
	        } else if (this._bodyArrayBuffer) {
	          return Promise.resolve(new Blob([this._bodyArrayBuffer]))
	        } else if (this._bodyFormData) {
	          throw new Error('could not read FormData body as blob')
	        } else {
	          return Promise.resolve(new Blob([this._bodyText]))
	        }
	      };

	      this.arrayBuffer = function() {
	        if (this._bodyArrayBuffer) {
	          return consumed(this) || Promise.resolve(this._bodyArrayBuffer)
	        } else {
	          return this.blob().then(readBlobAsArrayBuffer)
	        }
	      };
	    }

	    this.text = function() {
	      var rejected = consumed(this);
	      if (rejected) {
	        return rejected
	      }

	      if (this._bodyBlob) {
	        return readBlobAsText(this._bodyBlob)
	      } else if (this._bodyArrayBuffer) {
	        return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
	      } else if (this._bodyFormData) {
	        throw new Error('could not read FormData body as text')
	      } else {
	        return Promise.resolve(this._bodyText)
	      }
	    };

	    if (support.formData) {
	      this.formData = function() {
	        return this.text().then(decode)
	      };
	    }

	    this.json = function() {
	      return this.text().then(JSON.parse)
	    };

	    return this
	  }

	  // HTTP methods whose capitalization should be normalized
	  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT'];

	  function normalizeMethod(method) {
	    var upcased = method.toUpperCase();
	    return methods.indexOf(upcased) > -1 ? upcased : method
	  }

	  function Request(input, options) {
	    options = options || {};
	    var body = options.body;

	    if (input instanceof Request) {
	      if (input.bodyUsed) {
	        throw new TypeError('Already read')
	      }
	      this.url = input.url;
	      this.credentials = input.credentials;
	      if (!options.headers) {
	        this.headers = new Headers(input.headers);
	      }
	      this.method = input.method;
	      this.mode = input.mode;
	      this.signal = input.signal;
	      if (!body && input._bodyInit != null) {
	        body = input._bodyInit;
	        input.bodyUsed = true;
	      }
	    } else {
	      this.url = String(input);
	    }

	    this.credentials = options.credentials || this.credentials || 'same-origin';
	    if (options.headers || !this.headers) {
	      this.headers = new Headers(options.headers);
	    }
	    this.method = normalizeMethod(options.method || this.method || 'GET');
	    this.mode = options.mode || this.mode || null;
	    this.signal = options.signal || this.signal;
	    this.referrer = null;

	    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
	      throw new TypeError('Body not allowed for GET or HEAD requests')
	    }
	    this._initBody(body);
	  }

	  Request.prototype.clone = function() {
	    return new Request(this, {body: this._bodyInit})
	  };

	  function decode(body) {
	    var form = new FormData();
	    body
	      .trim()
	      .split('&')
	      .forEach(function(bytes) {
	        if (bytes) {
	          var split = bytes.split('=');
	          var name = split.shift().replace(/\+/g, ' ');
	          var value = split.join('=').replace(/\+/g, ' ');
	          form.append(decodeURIComponent(name), decodeURIComponent(value));
	        }
	      });
	    return form
	  }

	  function parseHeaders(rawHeaders) {
	    var headers = new Headers();
	    // Replace instances of \r\n and \n followed by at least one space or horizontal tab with a space
	    // https://tools.ietf.org/html/rfc7230#section-3.2
	    var preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, ' ');
	    preProcessedHeaders.split(/\r?\n/).forEach(function(line) {
	      var parts = line.split(':');
	      var key = parts.shift().trim();
	      if (key) {
	        var value = parts.join(':').trim();
	        headers.append(key, value);
	      }
	    });
	    return headers
	  }

	  Body.call(Request.prototype);

	  function Response(bodyInit, options) {
	    if (!options) {
	      options = {};
	    }

	    this.type = 'default';
	    this.status = options.status === undefined ? 200 : options.status;
	    this.ok = this.status >= 200 && this.status < 300;
	    this.statusText = 'statusText' in options ? options.statusText : 'OK';
	    this.headers = new Headers(options.headers);
	    this.url = options.url || '';
	    this._initBody(bodyInit);
	  }

	  Body.call(Response.prototype);

	  Response.prototype.clone = function() {
	    return new Response(this._bodyInit, {
	      status: this.status,
	      statusText: this.statusText,
	      headers: new Headers(this.headers),
	      url: this.url
	    })
	  };

	  Response.error = function() {
	    var response = new Response(null, {status: 0, statusText: ''});
	    response.type = 'error';
	    return response
	  };

	  var redirectStatuses = [301, 302, 303, 307, 308];

	  Response.redirect = function(url, status) {
	    if (redirectStatuses.indexOf(status) === -1) {
	      throw new RangeError('Invalid status code')
	    }

	    return new Response(null, {status: status, headers: {location: url}})
	  };

	  exports.DOMException = self.DOMException;
	  try {
	    new exports.DOMException();
	  } catch (err) {
	    exports.DOMException = function(message, name) {
	      this.message = message;
	      this.name = name;
	      var error = Error(message);
	      this.stack = error.stack;
	    };
	    exports.DOMException.prototype = Object.create(Error.prototype);
	    exports.DOMException.prototype.constructor = exports.DOMException;
	  }

	  function fetch(input, init) {
	    return new Promise(function(resolve, reject) {
	      var request = new Request(input, init);

	      if (request.signal && request.signal.aborted) {
	        return reject(new exports.DOMException('Aborted', 'AbortError'))
	      }

	      var xhr = new XMLHttpRequest();

	      function abortXhr() {
	        xhr.abort();
	      }

	      xhr.onload = function() {
	        var options = {
	          status: xhr.status,
	          statusText: xhr.statusText,
	          headers: parseHeaders(xhr.getAllResponseHeaders() || '')
	        };
	        options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL');
	        var body = 'response' in xhr ? xhr.response : xhr.responseText;
	        resolve(new Response(body, options));
	      };

	      xhr.onerror = function() {
	        reject(new TypeError('Network request failed'));
	      };

	      xhr.ontimeout = function() {
	        reject(new TypeError('Network request failed'));
	      };

	      xhr.onabort = function() {
	        reject(new exports.DOMException('Aborted', 'AbortError'));
	      };

	      xhr.open(request.method, request.url, true);

	      if (request.credentials === 'include') {
	        xhr.withCredentials = true;
	      } else if (request.credentials === 'omit') {
	        xhr.withCredentials = false;
	      }

	      if ('responseType' in xhr && support.blob) {
	        xhr.responseType = 'blob';
	      }

	      request.headers.forEach(function(value, name) {
	        xhr.setRequestHeader(name, value);
	      });

	      if (request.signal) {
	        request.signal.addEventListener('abort', abortXhr);

	        xhr.onreadystatechange = function() {
	          // DONE (success or failure)
	          if (xhr.readyState === 4) {
	            request.signal.removeEventListener('abort', abortXhr);
	          }
	        };
	      }

	      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit);
	    })
	  }

	  fetch.polyfill = true;

	  if (!self.fetch) {
	    self.fetch = fetch;
	    self.Headers = Headers;
	    self.Request = Request;
	    self.Response = Response;
	  }

	  exports.Headers = Headers;
	  exports.Request = Request;
	  exports.Response = Response;
	  exports.fetch = fetch;

	  Object.defineProperty(exports, '__esModule', { value: true });

	  return exports;

	})({}));
	})(__self__);
	__self__.fetch.ponyfill = true;
	// Remove "polyfill" property added by whatwg-fetch
	delete __self__.fetch.polyfill;
	// Choose between native implementation (global) or custom implementation (__self__)
	// var ctx = global.fetch ? global : __self__;
	var ctx = __self__; // this line disable service worker support temporarily
	exports = ctx.fetch; // To enable: import fetch from 'cross-fetch'
	exports.default = ctx.fetch; // For TypeScript consumers without esModuleInterop.
	exports.fetch = ctx.fetch; // To enable: import {fetch} from 'cross-fetch'
	exports.Headers = ctx.Headers;
	exports.Request = ctx.Request;
	exports.Response = ctx.Response;
	module.exports = exports;
	}(browserPonyfill, browserPonyfill.exports));

	var fetch = /*@__PURE__*/getDefaultExportFromCjs(browserPonyfill.exports);

	const MINIMUM_SLOT_PER_EPOCH = 32; // Returns the number of trailing zeros in the binary representation of self.

	function trailingZeros(n) {
	  let trailingZeros = 0;

	  while (n > 1) {
	    n /= 2;
	    trailingZeros++;
	  }

	  return trailingZeros;
	} // Returns the smallest power of two greater than or equal to n


	function nextPowerOfTwo(n) {
	  if (n === 0) return 1;
	  n--;
	  n |= n >> 1;
	  n |= n >> 2;
	  n |= n >> 4;
	  n |= n >> 8;
	  n |= n >> 16;
	  n |= n >> 32;
	  return n + 1;
	}
	/**
	 * Epoch schedule
	 * (see https://docs.solana.com/terminology#epoch)
	 * Can be retrieved with the {@link connection.getEpochSchedule} method
	 */


	class EpochSchedule {
	  /** The maximum number of slots in each epoch */

	  /** The number of slots before beginning of an epoch to calculate a leader schedule for that epoch */

	  /** Indicates whether epochs start short and grow */

	  /** The first epoch with `slotsPerEpoch` slots */

	  /** The first slot of `firstNormalEpoch` */
	  constructor(slotsPerEpoch, leaderScheduleSlotOffset, warmup, firstNormalEpoch, firstNormalSlot) {
	    this.slotsPerEpoch = void 0;
	    this.leaderScheduleSlotOffset = void 0;
	    this.warmup = void 0;
	    this.firstNormalEpoch = void 0;
	    this.firstNormalSlot = void 0;
	    this.slotsPerEpoch = slotsPerEpoch;
	    this.leaderScheduleSlotOffset = leaderScheduleSlotOffset;
	    this.warmup = warmup;
	    this.firstNormalEpoch = firstNormalEpoch;
	    this.firstNormalSlot = firstNormalSlot;
	  }

	  getEpoch(slot) {
	    return this.getEpochAndSlotIndex(slot)[0];
	  }

	  getEpochAndSlotIndex(slot) {
	    if (slot < this.firstNormalSlot) {
	      const epoch = trailingZeros(nextPowerOfTwo(slot + MINIMUM_SLOT_PER_EPOCH + 1)) - trailingZeros(MINIMUM_SLOT_PER_EPOCH) - 1;
	      const epochLen = this.getSlotsInEpoch(epoch);
	      const slotIndex = slot - (epochLen - MINIMUM_SLOT_PER_EPOCH);
	      return [epoch, slotIndex];
	    } else {
	      const normalSlotIndex = slot - this.firstNormalSlot;
	      const normalEpochIndex = Math.floor(normalSlotIndex / this.slotsPerEpoch);
	      const epoch = this.firstNormalEpoch + normalEpochIndex;
	      const slotIndex = normalSlotIndex % this.slotsPerEpoch;
	      return [epoch, slotIndex];
	    }
	  }

	  getFirstSlotInEpoch(epoch) {
	    if (epoch <= this.firstNormalEpoch) {
	      return (Math.pow(2, epoch) - 1) * MINIMUM_SLOT_PER_EPOCH;
	    } else {
	      return (epoch - this.firstNormalEpoch) * this.slotsPerEpoch + this.firstNormalSlot;
	    }
	  }

	  getLastSlotInEpoch(epoch) {
	    return this.getFirstSlotInEpoch(epoch) + this.getSlotsInEpoch(epoch) - 1;
	  }

	  getSlotsInEpoch(epoch) {
	    if (epoch < this.firstNormalEpoch) {
	      return Math.pow(2, epoch + trailingZeros(MINIMUM_SLOT_PER_EPOCH));
	    } else {
	      return this.slotsPerEpoch;
	    }
	  }

	}

	class SendTransactionError extends Error {
	  constructor(message, logs) {
	    super(message);
	    this.logs = void 0;
	    this.logs = logs;
	  }

	}

	// TODO: These constants should be removed in favor of reading them out of a
	// Syscall account

	/**
	 * @internal
	 */
	const NUM_TICKS_PER_SECOND = 160;
	/**
	 * @internal
	 */

	const DEFAULT_TICKS_PER_SLOT = 64;
	/**
	 * @internal
	 */

	const NUM_SLOTS_PER_SECOND = NUM_TICKS_PER_SECOND / DEFAULT_TICKS_PER_SLOT;
	/**
	 * @internal
	 */

	const MS_PER_SLOT = 1000 / NUM_SLOTS_PER_SECOND;

	function promiseTimeout(promise, timeoutMs) {
	  let timeoutId;
	  const timeoutPromise = new Promise(resolve => {
	    timeoutId = setTimeout(() => resolve(null), timeoutMs);
	  });
	  return Promise.race([promise, timeoutPromise]).then(result => {
	    clearTimeout(timeoutId);
	    return result;
	  });
	}

	function makeWebsocketUrl(endpoint) {
	  let url = new URL(endpoint);
	  const useHttps = url.protocol === 'https:';
	  url.protocol = useHttps ? 'wss:' : 'ws:';
	  url.host = ''; // Only shift the port by +1 as a convention for ws(s) only if given endpoint
	  // is explictly specifying the endpoint port (HTTP-based RPC), assuming
	  // we're directly trying to connect to solana-validator's ws listening port.
	  // When the endpoint omits the port, we're connecting to the protocol
	  // default ports: http(80) or https(443) and it's assumed we're behind a reverse
	  // proxy which manages WebSocket upgrade and backend port redirection.

	  if (url.port !== '') {
	    url.port = String(Number(url.port) + 1);
	  }

	  return url.toString();
	}

	const PublicKeyFromString = coerce(instance(PublicKey), string(), value => new PublicKey(value));
	const RawAccountDataResult = tuple([string(), literal('base64')]);
	const BufferFromRawAccountData = coerce(instance(buffer.Buffer), RawAccountDataResult, value => buffer.Buffer.from(value[0], 'base64'));
	/**
	 * Attempt to use a recent blockhash for up to 30 seconds
	 * @internal
	 */

	const BLOCKHASH_CACHE_TIMEOUT_MS = 30 * 1000;

	/**
	 * @internal
	 */
	function createRpcResult(result) {
	  return union([type({
	    jsonrpc: literal('2.0'),
	    id: string(),
	    result
	  }), type({
	    jsonrpc: literal('2.0'),
	    id: string(),
	    error: type({
	      code: unknown(),
	      message: string(),
	      data: optional(any())
	    })
	  })]);
	}

	const UnknownRpcResult = createRpcResult(unknown());
	/**
	 * @internal
	 */

	function jsonRpcResult(schema) {
	  return coerce(createRpcResult(schema), UnknownRpcResult, value => {
	    if ('error' in value) {
	      return value;
	    } else {
	      return { ...value,
	        result: create(value.result, schema)
	      };
	    }
	  });
	}
	/**
	 * @internal
	 */


	function jsonRpcResultAndContext(value) {
	  return jsonRpcResult(type({
	    context: type({
	      slot: number()
	    }),
	    value
	  }));
	}
	/**
	 * @internal
	 */


	function notificationResultAndContext(value) {
	  return type({
	    context: type({
	      slot: number()
	    }),
	    value
	  });
	}
	/**
	 * The level of commitment desired when querying state
	 * <pre>
	 *   'processed': Query the most recent block which has reached 1 confirmation by the connected node
	 *   'confirmed': Query the most recent block which has reached 1 confirmation by the cluster
	 *   'finalized': Query the most recent block which has been finalized by the cluster
	 * </pre>
	 */


	const GetInflationGovernorResult = type({
	  foundation: number(),
	  foundationTerm: number(),
	  initial: number(),
	  taper: number(),
	  terminal: number()
	});
	/**
	 * The inflation reward for an epoch
	 */

	/**
	 * Expected JSON RPC response for the "getInflationReward" message
	 */
	const GetInflationRewardResult = jsonRpcResult(array(nullable(type({
	  epoch: number(),
	  effectiveSlot: number(),
	  amount: number(),
	  postBalance: number()
	}))));
	/**
	 * Information about the current epoch
	 */

	const GetEpochInfoResult = type({
	  epoch: number(),
	  slotIndex: number(),
	  slotsInEpoch: number(),
	  absoluteSlot: number(),
	  blockHeight: optional(number()),
	  transactionCount: optional(number())
	});
	const GetEpochScheduleResult = type({
	  slotsPerEpoch: number(),
	  leaderScheduleSlotOffset: number(),
	  warmup: boolean(),
	  firstNormalEpoch: number(),
	  firstNormalSlot: number()
	});
	/**
	 * Leader schedule
	 * (see https://docs.solana.com/terminology#leader-schedule)
	 */

	const GetLeaderScheduleResult = record(string(), array(number()));
	/**
	 * Transaction error or null
	 */

	const TransactionErrorResult = nullable(union([type({}), string()]));
	/**
	 * Signature status for a transaction
	 */

	const SignatureStatusResult = type({
	  err: TransactionErrorResult
	});
	/**
	 * Transaction signature received notification
	 */

	const SignatureReceivedResult = literal('receivedSignature');
	/**
	 * Version info for a node
	 */

	const VersionResult = type({
	  'solana-core': string(),
	  'feature-set': optional(number())
	});
	const SimulatedTransactionResponseStruct = jsonRpcResultAndContext(type({
	  err: nullable(union([type({}), string()])),
	  logs: nullable(array(string())),
	  accounts: optional(nullable(array(nullable(type({
	    executable: boolean(),
	    owner: string(),
	    lamports: number(),
	    data: array(string()),
	    rentEpoch: optional(number())
	  }))))),
	  unitsConsumed: optional(number())
	}));

	function createRpcClient(url, useHttps, httpHeaders, fetchMiddleware, disableRetryOnRateLimit) {

	  let fetchWithMiddleware;

	  if (fetchMiddleware) {
	    fetchWithMiddleware = async (url, options) => {
	      const modifiedFetchArgs = await new Promise((resolve, reject) => {
	        try {
	          fetchMiddleware(url, options, (modifiedUrl, modifiedOptions) => resolve([modifiedUrl, modifiedOptions]));
	        } catch (error) {
	          reject(error);
	        }
	      });
	      return await fetch(...modifiedFetchArgs);
	    };
	  }

	  const clientBrowser = new RpcClient(async (request, callback) => {
	    const agent = undefined;
	    const options = {
	      method: 'POST',
	      body: request,
	      agent,
	      headers: Object.assign({
	        'Content-Type': 'application/json'
	      }, httpHeaders || {})
	    };

	    try {
	      let too_many_requests_retries = 5;
	      let res;
	      let waitTime = 500;

	      for (;;) {
	        if (fetchWithMiddleware) {
	          res = await fetchWithMiddleware(url, options);
	        } else {
	          res = await fetch(url, options);
	        }

	        if (res.status !== 429
	        /* Too many requests */
	        ) {
	          break;
	        }

	        if (disableRetryOnRateLimit === true) {
	          break;
	        }

	        too_many_requests_retries -= 1;

	        if (too_many_requests_retries === 0) {
	          break;
	        }

	        console.log(`Server responded with ${res.status} ${res.statusText}.  Retrying after ${waitTime}ms delay...`);
	        await sleep(waitTime);
	        waitTime *= 2;
	      }

	      const text = await res.text();

	      if (res.ok) {
	        callback(null, text);
	      } else {
	        callback(new Error(`${res.status} ${res.statusText}: ${text}`));
	      }
	    } catch (err) {
	      if (err instanceof Error) callback(err);
	    } finally {
	    }
	  }, {});
	  return clientBrowser;
	}

	function createRpcRequest(client) {
	  return (method, args) => {
	    return new Promise((resolve, reject) => {
	      client.request(method, args, (err, response) => {
	        if (err) {
	          reject(err);
	          return;
	        }

	        resolve(response);
	      });
	    });
	  };
	}

	function createRpcBatchRequest(client) {
	  return requests => {
	    return new Promise((resolve, reject) => {
	      // Do nothing if requests is empty
	      if (requests.length === 0) resolve([]);
	      const batch = requests.map(params => {
	        return client.request(params.methodName, params.args);
	      });
	      client.request(batch, (err, response) => {
	        if (err) {
	          reject(err);
	          return;
	        }

	        resolve(response);
	      });
	    });
	  };
	}
	/**
	 * Expected JSON RPC response for the "getInflationGovernor" message
	 */


	const GetInflationGovernorRpcResult = jsonRpcResult(GetInflationGovernorResult);
	/**
	 * Expected JSON RPC response for the "getEpochInfo" message
	 */

	const GetEpochInfoRpcResult = jsonRpcResult(GetEpochInfoResult);
	/**
	 * Expected JSON RPC response for the "getEpochSchedule" message
	 */

	const GetEpochScheduleRpcResult = jsonRpcResult(GetEpochScheduleResult);
	/**
	 * Expected JSON RPC response for the "getLeaderSchedule" message
	 */

	const GetLeaderScheduleRpcResult = jsonRpcResult(GetLeaderScheduleResult);
	/**
	 * Expected JSON RPC response for the "minimumLedgerSlot" and "getFirstAvailableBlock" messages
	 */

	const SlotRpcResult = jsonRpcResult(number());
	/**
	 * Supply
	 */

	/**
	 * Expected JSON RPC response for the "getSupply" message
	 */
	const GetSupplyRpcResult = jsonRpcResultAndContext(type({
	  total: number(),
	  circulating: number(),
	  nonCirculating: number(),
	  nonCirculatingAccounts: array(PublicKeyFromString)
	}));
	/**
	 * Token amount object which returns a token amount in different formats
	 * for various client use cases.
	 */

	/**
	 * Expected JSON RPC structure for token amounts
	 */
	const TokenAmountResult = type({
	  amount: string(),
	  uiAmount: nullable(number()),
	  decimals: number(),
	  uiAmountString: optional(string())
	});
	/**
	 * Token address and balance.
	 */

	/**
	 * Expected JSON RPC response for the "getTokenLargestAccounts" message
	 */
	const GetTokenLargestAccountsResult = jsonRpcResultAndContext(array(type({
	  address: PublicKeyFromString,
	  amount: string(),
	  uiAmount: nullable(number()),
	  decimals: number(),
	  uiAmountString: optional(string())
	})));
	/**
	 * Expected JSON RPC response for the "getTokenAccountsByOwner" message
	 */

	const GetTokenAccountsByOwner = jsonRpcResultAndContext(array(type({
	  pubkey: PublicKeyFromString,
	  account: type({
	    executable: boolean(),
	    owner: PublicKeyFromString,
	    lamports: number(),
	    data: BufferFromRawAccountData,
	    rentEpoch: number()
	  })
	})));
	const ParsedAccountDataResult = type({
	  program: string(),
	  parsed: unknown(),
	  space: number()
	});
	/**
	 * Expected JSON RPC response for the "getTokenAccountsByOwner" message with parsed data
	 */

	const GetParsedTokenAccountsByOwner = jsonRpcResultAndContext(array(type({
	  pubkey: PublicKeyFromString,
	  account: type({
	    executable: boolean(),
	    owner: PublicKeyFromString,
	    lamports: number(),
	    data: ParsedAccountDataResult,
	    rentEpoch: number()
	  })
	})));
	/**
	 * Pair of an account address and its balance
	 */

	/**
	 * Expected JSON RPC response for the "getLargestAccounts" message
	 */
	const GetLargestAccountsRpcResult = jsonRpcResultAndContext(array(type({
	  lamports: number(),
	  address: PublicKeyFromString
	})));
	/**
	 * @internal
	 */

	const AccountInfoResult = type({
	  executable: boolean(),
	  owner: PublicKeyFromString,
	  lamports: number(),
	  data: BufferFromRawAccountData,
	  rentEpoch: number()
	});
	/**
	 * @internal
	 */

	const KeyedAccountInfoResult = type({
	  pubkey: PublicKeyFromString,
	  account: AccountInfoResult
	});
	const ParsedOrRawAccountData = coerce(union([instance(buffer.Buffer), ParsedAccountDataResult]), union([RawAccountDataResult, ParsedAccountDataResult]), value => {
	  if (Array.isArray(value)) {
	    return create(value, BufferFromRawAccountData);
	  } else {
	    return value;
	  }
	});
	/**
	 * @internal
	 */

	const ParsedAccountInfoResult = type({
	  executable: boolean(),
	  owner: PublicKeyFromString,
	  lamports: number(),
	  data: ParsedOrRawAccountData,
	  rentEpoch: number()
	});
	const KeyedParsedAccountInfoResult = type({
	  pubkey: PublicKeyFromString,
	  account: ParsedAccountInfoResult
	});
	/**
	 * @internal
	 */

	const StakeActivationResult = type({
	  state: union([literal('active'), literal('inactive'), literal('activating'), literal('deactivating')]),
	  active: number(),
	  inactive: number()
	});
	/**
	 * Expected JSON RPC response for the "getConfirmedSignaturesForAddress2" message
	 */

	const GetConfirmedSignaturesForAddress2RpcResult = jsonRpcResult(array(type({
	  signature: string(),
	  slot: number(),
	  err: TransactionErrorResult,
	  memo: nullable(string()),
	  blockTime: optional(nullable(number()))
	})));
	/**
	 * Expected JSON RPC response for the "getSignaturesForAddress" message
	 */

	const GetSignaturesForAddressRpcResult = jsonRpcResult(array(type({
	  signature: string(),
	  slot: number(),
	  err: TransactionErrorResult,
	  memo: nullable(string()),
	  blockTime: optional(nullable(number()))
	})));
	/***
	 * Expected JSON RPC response for the "accountNotification" message
	 */

	const AccountNotificationResult = type({
	  subscription: number(),
	  result: notificationResultAndContext(AccountInfoResult)
	});
	/**
	 * @internal
	 */

	const ProgramAccountInfoResult = type({
	  pubkey: PublicKeyFromString,
	  account: AccountInfoResult
	});
	/***
	 * Expected JSON RPC response for the "programNotification" message
	 */

	const ProgramAccountNotificationResult = type({
	  subscription: number(),
	  result: notificationResultAndContext(ProgramAccountInfoResult)
	});
	/**
	 * @internal
	 */

	const SlotInfoResult = type({
	  parent: number(),
	  slot: number(),
	  root: number()
	});
	/**
	 * Expected JSON RPC response for the "slotNotification" message
	 */

	const SlotNotificationResult = type({
	  subscription: number(),
	  result: SlotInfoResult
	});
	/**
	 * Slot updates which can be used for tracking the live progress of a cluster.
	 * - `"firstShredReceived"`: connected node received the first shred of a block.
	 * Indicates that a new block that is being produced.
	 * - `"completed"`: connected node has received all shreds of a block. Indicates
	 * a block was recently produced.
	 * - `"optimisticConfirmation"`: block was optimistically confirmed by the
	 * cluster. It is not guaranteed that an optimistic confirmation notification
	 * will be sent for every finalized blocks.
	 * - `"root"`: the connected node rooted this block.
	 * - `"createdBank"`: the connected node has started validating this block.
	 * - `"frozen"`: the connected node has validated this block.
	 * - `"dead"`: the connected node failed to validate this block.
	 */

	/**
	 * @internal
	 */
	const SlotUpdateResult = union([type({
	  type: union([literal('firstShredReceived'), literal('completed'), literal('optimisticConfirmation'), literal('root')]),
	  slot: number(),
	  timestamp: number()
	}), type({
	  type: literal('createdBank'),
	  parent: number(),
	  slot: number(),
	  timestamp: number()
	}), type({
	  type: literal('frozen'),
	  slot: number(),
	  timestamp: number(),
	  stats: type({
	    numTransactionEntries: number(),
	    numSuccessfulTransactions: number(),
	    numFailedTransactions: number(),
	    maxTransactionsPerEntry: number()
	  })
	}), type({
	  type: literal('dead'),
	  slot: number(),
	  timestamp: number(),
	  err: string()
	})]);
	/**
	 * Expected JSON RPC response for the "slotsUpdatesNotification" message
	 */

	const SlotUpdateNotificationResult = type({
	  subscription: number(),
	  result: SlotUpdateResult
	});
	/**
	 * Expected JSON RPC response for the "signatureNotification" message
	 */

	const SignatureNotificationResult = type({
	  subscription: number(),
	  result: notificationResultAndContext(union([SignatureStatusResult, SignatureReceivedResult]))
	});
	/**
	 * Expected JSON RPC response for the "rootNotification" message
	 */

	const RootNotificationResult = type({
	  subscription: number(),
	  result: number()
	});
	const ContactInfoResult = type({
	  pubkey: string(),
	  gossip: nullable(string()),
	  tpu: nullable(string()),
	  rpc: nullable(string()),
	  version: nullable(string())
	});
	const VoteAccountInfoResult = type({
	  votePubkey: string(),
	  nodePubkey: string(),
	  activatedStake: number(),
	  epochVoteAccount: boolean(),
	  epochCredits: array(tuple([number(), number(), number()])),
	  commission: number(),
	  lastVote: number(),
	  rootSlot: nullable(number())
	});
	/**
	 * Expected JSON RPC response for the "getVoteAccounts" message
	 */

	const GetVoteAccounts = jsonRpcResult(type({
	  current: array(VoteAccountInfoResult),
	  delinquent: array(VoteAccountInfoResult)
	}));
	const ConfirmationStatus = union([literal('processed'), literal('confirmed'), literal('finalized')]);
	const SignatureStatusResponse = type({
	  slot: number(),
	  confirmations: nullable(number()),
	  err: TransactionErrorResult,
	  confirmationStatus: optional(ConfirmationStatus)
	});
	/**
	 * Expected JSON RPC response for the "getSignatureStatuses" message
	 */

	const GetSignatureStatusesRpcResult = jsonRpcResultAndContext(array(nullable(SignatureStatusResponse)));
	/**
	 * Expected JSON RPC response for the "getMinimumBalanceForRentExemption" message
	 */

	const GetMinimumBalanceForRentExemptionRpcResult = jsonRpcResult(number());
	const ConfirmedTransactionResult = type({
	  signatures: array(string()),
	  message: type({
	    accountKeys: array(string()),
	    header: type({
	      numRequiredSignatures: number(),
	      numReadonlySignedAccounts: number(),
	      numReadonlyUnsignedAccounts: number()
	    }),
	    instructions: array(type({
	      accounts: array(number()),
	      data: string(),
	      programIdIndex: number()
	    })),
	    recentBlockhash: string()
	  })
	});
	const ParsedInstructionResult = type({
	  parsed: unknown(),
	  program: string(),
	  programId: PublicKeyFromString
	});
	const RawInstructionResult = type({
	  accounts: array(PublicKeyFromString),
	  data: string(),
	  programId: PublicKeyFromString
	});
	const InstructionResult = union([RawInstructionResult, ParsedInstructionResult]);
	const UnknownInstructionResult = union([type({
	  parsed: unknown(),
	  program: string(),
	  programId: string()
	}), type({
	  accounts: array(string()),
	  data: string(),
	  programId: string()
	})]);
	const ParsedOrRawInstruction = coerce(InstructionResult, UnknownInstructionResult, value => {
	  if ('accounts' in value) {
	    return create(value, RawInstructionResult);
	  } else {
	    return create(value, ParsedInstructionResult);
	  }
	});
	/**
	 * @internal
	 */

	const ParsedConfirmedTransactionResult = type({
	  signatures: array(string()),
	  message: type({
	    accountKeys: array(type({
	      pubkey: PublicKeyFromString,
	      signer: boolean(),
	      writable: boolean()
	    })),
	    instructions: array(ParsedOrRawInstruction),
	    recentBlockhash: string()
	  })
	});
	const TokenBalanceResult = type({
	  accountIndex: number(),
	  mint: string(),
	  owner: optional(string()),
	  uiTokenAmount: TokenAmountResult
	});
	/**
	 * @internal
	 */

	const ConfirmedTransactionMetaResult = type({
	  err: TransactionErrorResult,
	  fee: number(),
	  innerInstructions: optional(nullable(array(type({
	    index: number(),
	    instructions: array(type({
	      accounts: array(number()),
	      data: string(),
	      programIdIndex: number()
	    }))
	  })))),
	  preBalances: array(number()),
	  postBalances: array(number()),
	  logMessages: optional(nullable(array(string()))),
	  preTokenBalances: optional(nullable(array(TokenBalanceResult))),
	  postTokenBalances: optional(nullable(array(TokenBalanceResult)))
	});
	/**
	 * @internal
	 */

	const ParsedConfirmedTransactionMetaResult = type({
	  err: TransactionErrorResult,
	  fee: number(),
	  innerInstructions: optional(nullable(array(type({
	    index: number(),
	    instructions: array(ParsedOrRawInstruction)
	  })))),
	  preBalances: array(number()),
	  postBalances: array(number()),
	  logMessages: optional(nullable(array(string()))),
	  preTokenBalances: optional(nullable(array(TokenBalanceResult))),
	  postTokenBalances: optional(nullable(array(TokenBalanceResult)))
	});
	/**
	 * Expected JSON RPC response for the "getBlock" message
	 */

	const GetBlockRpcResult = jsonRpcResult(nullable(type({
	  blockhash: string(),
	  previousBlockhash: string(),
	  parentSlot: number(),
	  transactions: array(type({
	    transaction: ConfirmedTransactionResult,
	    meta: nullable(ConfirmedTransactionMetaResult)
	  })),
	  rewards: optional(array(type({
	    pubkey: string(),
	    lamports: number(),
	    postBalance: nullable(number()),
	    rewardType: nullable(string())
	  }))),
	  blockTime: nullable(number()),
	  blockHeight: nullable(number())
	})));
	/**
	 * Expected JSON RPC response for the "getConfirmedBlock" message
	 *
	 * @deprecated Deprecated since Solana v1.8.0. Please use {@link GetBlockRpcResult} instead.
	 */

	const GetConfirmedBlockRpcResult = jsonRpcResult(nullable(type({
	  blockhash: string(),
	  previousBlockhash: string(),
	  parentSlot: number(),
	  transactions: array(type({
	    transaction: ConfirmedTransactionResult,
	    meta: nullable(ConfirmedTransactionMetaResult)
	  })),
	  rewards: optional(array(type({
	    pubkey: string(),
	    lamports: number(),
	    postBalance: nullable(number()),
	    rewardType: nullable(string())
	  }))),
	  blockTime: nullable(number())
	})));
	/**
	 * Expected JSON RPC response for the "getBlock" message
	 */

	const GetBlockSignaturesRpcResult = jsonRpcResult(nullable(type({
	  blockhash: string(),
	  previousBlockhash: string(),
	  parentSlot: number(),
	  signatures: array(string()),
	  blockTime: nullable(number())
	})));
	/**
	 * Expected JSON RPC response for the "getTransaction" message
	 */

	const GetTransactionRpcResult = jsonRpcResult(nullable(type({
	  slot: number(),
	  meta: ConfirmedTransactionMetaResult,
	  blockTime: optional(nullable(number())),
	  transaction: ConfirmedTransactionResult
	})));
	/**
	 * Expected parsed JSON RPC response for the "getTransaction" message
	 */

	const GetParsedTransactionRpcResult = jsonRpcResult(nullable(type({
	  slot: number(),
	  transaction: ParsedConfirmedTransactionResult,
	  meta: nullable(ParsedConfirmedTransactionMetaResult),
	  blockTime: optional(nullable(number()))
	})));
	/**
	 * Expected JSON RPC response for the "getRecentBlockhash" message
	 *
	 * @deprecated Deprecated since Solana v1.8.0. Please use {@link GetLatestBlockhashRpcResult} instead.
	 */

	const GetRecentBlockhashAndContextRpcResult = jsonRpcResultAndContext(type({
	  blockhash: string(),
	  feeCalculator: type({
	    lamportsPerSignature: number()
	  })
	}));
	/**
	 * Expected JSON RPC response for the "getLatestBlockhash" message
	 */

	const GetLatestBlockhashRpcResult = jsonRpcResultAndContext(type({
	  blockhash: string(),
	  lastValidBlockHeight: number()
	}));
	const PerfSampleResult = type({
	  slot: number(),
	  numTransactions: number(),
	  numSlots: number(),
	  samplePeriodSecs: number()
	});
	/*
	 * Expected JSON RPC response for "getRecentPerformanceSamples" message
	 */

	const GetRecentPerformanceSamplesRpcResult = jsonRpcResult(array(PerfSampleResult));
	/**
	 * Expected JSON RPC response for the "getFeeCalculatorForBlockhash" message
	 */

	const GetFeeCalculatorRpcResult = jsonRpcResultAndContext(nullable(type({
	  feeCalculator: type({
	    lamportsPerSignature: number()
	  })
	})));
	/**
	 * Expected JSON RPC response for the "requestAirdrop" message
	 */

	const RequestAirdropRpcResult = jsonRpcResult(string());
	/**
	 * Expected JSON RPC response for the "sendTransaction" message
	 */

	const SendTransactionRpcResult = jsonRpcResult(string());
	/**
	 * Information about the latest slot being processed by a node
	 */

	/**
	 * @internal
	 */
	const LogsResult = type({
	  err: TransactionErrorResult,
	  logs: array(string()),
	  signature: string()
	});
	/**
	 * Logs result.
	 */

	/**
	 * Expected JSON RPC response for the "logsNotification" message.
	 */
	const LogsNotificationResult = type({
	  result: notificationResultAndContext(LogsResult),
	  subscription: number()
	});
	/**
	 * Filter for log subscriptions.
	 */

	/**
	 * A connection to a fullnode JSON RPC endpoint
	 */
	class Connection {
	  /** @internal */

	  /** @internal */

	  /** @internal */

	  /** @internal */

	  /** @internal */

	  /** @internal */

	  /** @internal */

	  /** @internal */

	  /** @internal */

	  /** @internal */

	  /** @internal */

	  /** @internal */

	  /** @internal */

	  /** @internal */

	  /** @internal */

	  /** @internal */

	  /** @internal */

	  /** @internal */

	  /** @internal */

	  /** @internal */

	  /** @internal */

	  /** @internal */

	  /** @internal */

	  /** @internal */

	  /** @internal */

	  /** @internal */

	  /** @internal */

	  /** @internal */

	  /**
	   * Establish a JSON RPC connection
	   *
	   * @param endpoint URL to the fullnode JSON RPC endpoint
	   * @param commitmentOrConfig optional default commitment level or optional ConnectionConfig configuration object
	   */
	  constructor(endpoint, commitmentOrConfig) {
	    this._commitment = void 0;
	    this._confirmTransactionInitialTimeout = void 0;
	    this._rpcEndpoint = void 0;
	    this._rpcWsEndpoint = void 0;
	    this._rpcClient = void 0;
	    this._rpcRequest = void 0;
	    this._rpcBatchRequest = void 0;
	    this._rpcWebSocket = void 0;
	    this._rpcWebSocketConnected = false;
	    this._rpcWebSocketHeartbeat = null;
	    this._rpcWebSocketIdleTimeout = null;
	    this._disableBlockhashCaching = false;
	    this._pollingBlockhash = false;
	    this._blockhashInfo = {
	      recentBlockhash: null,
	      lastFetch: 0,
	      transactionSignatures: [],
	      simulatedSignatures: []
	    };
	    this._accountChangeSubscriptionCounter = 0;
	    this._accountChangeSubscriptions = {};
	    this._programAccountChangeSubscriptionCounter = 0;
	    this._programAccountChangeSubscriptions = {};
	    this._rootSubscriptionCounter = 0;
	    this._rootSubscriptions = {};
	    this._signatureSubscriptionCounter = 0;
	    this._signatureSubscriptions = {};
	    this._slotSubscriptionCounter = 0;
	    this._slotSubscriptions = {};
	    this._logsSubscriptionCounter = 0;
	    this._logsSubscriptions = {};
	    this._slotUpdateSubscriptionCounter = 0;
	    this._slotUpdateSubscriptions = {};
	    let url = new URL(endpoint);
	    const useHttps = url.protocol === 'https:';
	    let wsEndpoint;
	    let httpHeaders;
	    let fetchMiddleware;
	    let disableRetryOnRateLimit;

	    if (commitmentOrConfig && typeof commitmentOrConfig === 'string') {
	      this._commitment = commitmentOrConfig;
	    } else if (commitmentOrConfig) {
	      this._commitment = commitmentOrConfig.commitment;
	      this._confirmTransactionInitialTimeout = commitmentOrConfig.confirmTransactionInitialTimeout;
	      wsEndpoint = commitmentOrConfig.wsEndpoint;
	      httpHeaders = commitmentOrConfig.httpHeaders;
	      fetchMiddleware = commitmentOrConfig.fetchMiddleware;
	      disableRetryOnRateLimit = commitmentOrConfig.disableRetryOnRateLimit;
	    }

	    this._rpcEndpoint = endpoint;
	    this._rpcWsEndpoint = wsEndpoint || makeWebsocketUrl(endpoint);
	    this._rpcClient = createRpcClient(url.toString(), useHttps, httpHeaders, fetchMiddleware, disableRetryOnRateLimit);
	    this._rpcRequest = createRpcRequest(this._rpcClient);
	    this._rpcBatchRequest = createRpcBatchRequest(this._rpcClient);
	    this._rpcWebSocket = new Client_1(this._rpcWsEndpoint, {
	      autoconnect: false,
	      max_reconnects: Infinity
	    });

	    this._rpcWebSocket.on('open', this._wsOnOpen.bind(this));

	    this._rpcWebSocket.on('error', this._wsOnError.bind(this));

	    this._rpcWebSocket.on('close', this._wsOnClose.bind(this));

	    this._rpcWebSocket.on('accountNotification', this._wsOnAccountNotification.bind(this));

	    this._rpcWebSocket.on('programNotification', this._wsOnProgramAccountNotification.bind(this));

	    this._rpcWebSocket.on('slotNotification', this._wsOnSlotNotification.bind(this));

	    this._rpcWebSocket.on('slotsUpdatesNotification', this._wsOnSlotUpdatesNotification.bind(this));

	    this._rpcWebSocket.on('signatureNotification', this._wsOnSignatureNotification.bind(this));

	    this._rpcWebSocket.on('rootNotification', this._wsOnRootNotification.bind(this));

	    this._rpcWebSocket.on('logsNotification', this._wsOnLogsNotification.bind(this));
	  }
	  /**
	   * The default commitment used for requests
	   */


	  get commitment() {
	    return this._commitment;
	  }
	  /**
	   * Fetch the balance for the specified public key, return with context
	   */


	  async getBalanceAndContext(publicKey, commitment) {
	    const args = this._buildArgs([publicKey.toBase58()], commitment);

	    const unsafeRes = await this._rpcRequest('getBalance', args);
	    const res = create(unsafeRes, jsonRpcResultAndContext(number()));

	    if ('error' in res) {
	      throw new Error('failed to get balance for ' + publicKey.toBase58() + ': ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch the balance for the specified public key
	   */


	  async getBalance(publicKey, commitment) {
	    return await this.getBalanceAndContext(publicKey, commitment).then(x => x.value).catch(e => {
	      throw new Error('failed to get balance of account ' + publicKey.toBase58() + ': ' + e);
	    });
	  }
	  /**
	   * Fetch the estimated production time of a block
	   */


	  async getBlockTime(slot) {
	    const unsafeRes = await this._rpcRequest('getBlockTime', [slot]);
	    const res = create(unsafeRes, jsonRpcResult(nullable(number())));

	    if ('error' in res) {
	      throw new Error('failed to get block time for slot ' + slot + ': ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch the lowest slot that the node has information about in its ledger.
	   * This value may increase over time if the node is configured to purge older ledger data
	   */


	  async getMinimumLedgerSlot() {
	    const unsafeRes = await this._rpcRequest('minimumLedgerSlot', []);
	    const res = create(unsafeRes, jsonRpcResult(number()));

	    if ('error' in res) {
	      throw new Error('failed to get minimum ledger slot: ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch the slot of the lowest confirmed block that has not been purged from the ledger
	   */


	  async getFirstAvailableBlock() {
	    const unsafeRes = await this._rpcRequest('getFirstAvailableBlock', []);
	    const res = create(unsafeRes, SlotRpcResult);

	    if ('error' in res) {
	      throw new Error('failed to get first available block: ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch information about the current supply
	   */


	  async getSupply(config) {
	    let configArg = {};

	    if (typeof config === 'string') {
	      configArg = {
	        commitment: config
	      };
	    } else if (config) {
	      configArg = { ...config,
	        commitment: config && config.commitment || this.commitment
	      };
	    } else {
	      configArg = {
	        commitment: this.commitment
	      };
	    }

	    const unsafeRes = await this._rpcRequest('getSupply', [configArg]);
	    const res = create(unsafeRes, GetSupplyRpcResult);

	    if ('error' in res) {
	      throw new Error('failed to get supply: ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch the current supply of a token mint
	   */


	  async getTokenSupply(tokenMintAddress, commitment) {
	    const args = this._buildArgs([tokenMintAddress.toBase58()], commitment);

	    const unsafeRes = await this._rpcRequest('getTokenSupply', args);
	    const res = create(unsafeRes, jsonRpcResultAndContext(TokenAmountResult));

	    if ('error' in res) {
	      throw new Error('failed to get token supply: ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch the current balance of a token account
	   */


	  async getTokenAccountBalance(tokenAddress, commitment) {
	    const args = this._buildArgs([tokenAddress.toBase58()], commitment);

	    const unsafeRes = await this._rpcRequest('getTokenAccountBalance', args);
	    const res = create(unsafeRes, jsonRpcResultAndContext(TokenAmountResult));

	    if ('error' in res) {
	      throw new Error('failed to get token account balance: ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch all the token accounts owned by the specified account
	   *
	   * @return {Promise<RpcResponseAndContext<Array<{pubkey: PublicKey, account: AccountInfo<Buffer>}>>>}
	   */


	  async getTokenAccountsByOwner(ownerAddress, filter, commitment) {
	    let _args = [ownerAddress.toBase58()];

	    if ('mint' in filter) {
	      _args.push({
	        mint: filter.mint.toBase58()
	      });
	    } else {
	      _args.push({
	        programId: filter.programId.toBase58()
	      });
	    }

	    const args = this._buildArgs(_args, commitment, 'base64');

	    const unsafeRes = await this._rpcRequest('getTokenAccountsByOwner', args);
	    const res = create(unsafeRes, GetTokenAccountsByOwner);

	    if ('error' in res) {
	      throw new Error('failed to get token accounts owned by account ' + ownerAddress.toBase58() + ': ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch parsed token accounts owned by the specified account
	   *
	   * @return {Promise<RpcResponseAndContext<Array<{pubkey: PublicKey, account: AccountInfo<ParsedAccountData>}>>>}
	   */


	  async getParsedTokenAccountsByOwner(ownerAddress, filter, commitment) {
	    let _args = [ownerAddress.toBase58()];

	    if ('mint' in filter) {
	      _args.push({
	        mint: filter.mint.toBase58()
	      });
	    } else {
	      _args.push({
	        programId: filter.programId.toBase58()
	      });
	    }

	    const args = this._buildArgs(_args, commitment, 'jsonParsed');

	    const unsafeRes = await this._rpcRequest('getTokenAccountsByOwner', args);
	    const res = create(unsafeRes, GetParsedTokenAccountsByOwner);

	    if ('error' in res) {
	      throw new Error('failed to get token accounts owned by account ' + ownerAddress.toBase58() + ': ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch the 20 largest accounts with their current balances
	   */


	  async getLargestAccounts(config) {
	    const arg = { ...config,
	      commitment: config && config.commitment || this.commitment
	    };
	    const args = arg.filter || arg.commitment ? [arg] : [];
	    const unsafeRes = await this._rpcRequest('getLargestAccounts', args);
	    const res = create(unsafeRes, GetLargestAccountsRpcResult);

	    if ('error' in res) {
	      throw new Error('failed to get largest accounts: ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch the 20 largest token accounts with their current balances
	   * for a given mint.
	   */


	  async getTokenLargestAccounts(mintAddress, commitment) {
	    const args = this._buildArgs([mintAddress.toBase58()], commitment);

	    const unsafeRes = await this._rpcRequest('getTokenLargestAccounts', args);
	    const res = create(unsafeRes, GetTokenLargestAccountsResult);

	    if ('error' in res) {
	      throw new Error('failed to get token largest accounts: ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch all the account info for the specified public key, return with context
	   */


	  async getAccountInfoAndContext(publicKey, commitment) {
	    const args = this._buildArgs([publicKey.toBase58()], commitment, 'base64');

	    const unsafeRes = await this._rpcRequest('getAccountInfo', args);
	    const res = create(unsafeRes, jsonRpcResultAndContext(nullable(AccountInfoResult)));

	    if ('error' in res) {
	      throw new Error('failed to get info about account ' + publicKey.toBase58() + ': ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch parsed account info for the specified public key
	   */


	  async getParsedAccountInfo(publicKey, commitment) {
	    const args = this._buildArgs([publicKey.toBase58()], commitment, 'jsonParsed');

	    const unsafeRes = await this._rpcRequest('getAccountInfo', args);
	    const res = create(unsafeRes, jsonRpcResultAndContext(nullable(ParsedAccountInfoResult)));

	    if ('error' in res) {
	      throw new Error('failed to get info about account ' + publicKey.toBase58() + ': ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch all the account info for the specified public key
	   */


	  async getAccountInfo(publicKey, commitment) {
	    try {
	      const res = await this.getAccountInfoAndContext(publicKey, commitment);
	      return res.value;
	    } catch (e) {
	      throw new Error('failed to get info about account ' + publicKey.toBase58() + ': ' + e);
	    }
	  }
	  /**
	   * Fetch all the account info for multiple accounts specified by an array of public keys, return with context
	   */


	  async getMultipleAccountsInfoAndContext(publicKeys, commitment) {
	    const keys = publicKeys.map(key => key.toBase58());

	    const args = this._buildArgs([keys], commitment, 'base64');

	    const unsafeRes = await this._rpcRequest('getMultipleAccounts', args);
	    const res = create(unsafeRes, jsonRpcResultAndContext(array(nullable(AccountInfoResult))));

	    if ('error' in res) {
	      throw new Error('failed to get info for accounts ' + keys + ': ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch all the account info for multiple accounts specified by an array of public keys
	   */


	  async getMultipleAccountsInfo(publicKeys, commitment) {
	    const res = await this.getMultipleAccountsInfoAndContext(publicKeys, commitment);
	    return res.value;
	  }
	  /**
	   * Returns epoch activation information for a stake account that has been delegated
	   */


	  async getStakeActivation(publicKey, commitment, epoch) {
	    const args = this._buildArgs([publicKey.toBase58()], commitment, undefined, epoch !== undefined ? {
	      epoch
	    } : undefined);

	    const unsafeRes = await this._rpcRequest('getStakeActivation', args);
	    const res = create(unsafeRes, jsonRpcResult(StakeActivationResult));

	    if ('error' in res) {
	      throw new Error(`failed to get Stake Activation ${publicKey.toBase58()}: ${res.error.message}`);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch all the accounts owned by the specified program id
	   *
	   * @return {Promise<Array<{pubkey: PublicKey, account: AccountInfo<Buffer>}>>}
	   */


	  async getProgramAccounts(programId, configOrCommitment) {
	    const extra = {};
	    let commitment;
	    let encoding;

	    if (configOrCommitment) {
	      if (typeof configOrCommitment === 'string') {
	        commitment = configOrCommitment;
	      } else {
	        commitment = configOrCommitment.commitment;
	        encoding = configOrCommitment.encoding;

	        if (configOrCommitment.dataSlice) {
	          extra.dataSlice = configOrCommitment.dataSlice;
	        }

	        if (configOrCommitment.filters) {
	          extra.filters = configOrCommitment.filters;
	        }
	      }
	    }

	    const args = this._buildArgs([programId.toBase58()], commitment, encoding || 'base64', extra);

	    const unsafeRes = await this._rpcRequest('getProgramAccounts', args);
	    const res = create(unsafeRes, jsonRpcResult(array(KeyedAccountInfoResult)));

	    if ('error' in res) {
	      throw new Error('failed to get accounts owned by program ' + programId.toBase58() + ': ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch and parse all the accounts owned by the specified program id
	   *
	   * @return {Promise<Array<{pubkey: PublicKey, account: AccountInfo<Buffer | ParsedAccountData>}>>}
	   */


	  async getParsedProgramAccounts(programId, configOrCommitment) {
	    const extra = {};
	    let commitment;

	    if (configOrCommitment) {
	      if (typeof configOrCommitment === 'string') {
	        commitment = configOrCommitment;
	      } else {
	        commitment = configOrCommitment.commitment;

	        if (configOrCommitment.filters) {
	          extra.filters = configOrCommitment.filters;
	        }
	      }
	    }

	    const args = this._buildArgs([programId.toBase58()], commitment, 'jsonParsed', extra);

	    const unsafeRes = await this._rpcRequest('getProgramAccounts', args);
	    const res = create(unsafeRes, jsonRpcResult(array(KeyedParsedAccountInfoResult)));

	    if ('error' in res) {
	      throw new Error('failed to get accounts owned by program ' + programId.toBase58() + ': ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Confirm the transaction identified by the specified signature.
	   */


	  async confirmTransaction(signature, commitment) {
	    let decodedSignature;

	    try {
	      decodedSignature = bs58$1.decode(signature);
	    } catch (err) {
	      throw new Error('signature must be base58 encoded: ' + signature);
	    }

	    assert(decodedSignature.length === 64, 'signature has invalid length');
	    const start = Date.now();
	    const subscriptionCommitment = commitment || this.commitment;
	    let subscriptionId;
	    let response = null;
	    const confirmPromise = new Promise((resolve, reject) => {
	      try {
	        subscriptionId = this.onSignature(signature, (result, context) => {
	          subscriptionId = undefined;
	          response = {
	            context,
	            value: result
	          };
	          resolve(null);
	        }, subscriptionCommitment);
	      } catch (err) {
	        reject(err);
	      }
	    });
	    let timeoutMs = this._confirmTransactionInitialTimeout || 60 * 1000;

	    switch (subscriptionCommitment) {
	      case 'processed':
	      case 'recent':
	      case 'single':
	      case 'confirmed':
	      case 'singleGossip':
	        {
	          timeoutMs = this._confirmTransactionInitialTimeout || 30 * 1000;
	          break;
	        }
	    }

	    try {
	      await promiseTimeout(confirmPromise, timeoutMs);
	    } finally {
	      if (subscriptionId) {
	        this.removeSignatureListener(subscriptionId);
	      }
	    }

	    if (response === null) {
	      const duration = (Date.now() - start) / 1000;
	      throw new Error(`Transaction was not confirmed in ${duration.toFixed(2)} seconds. It is unknown if it succeeded or failed. Check signature ${signature} using the Solana Explorer or CLI tools.`);
	    }

	    return response;
	  }
	  /**
	   * Return the list of nodes that are currently participating in the cluster
	   */


	  async getClusterNodes() {
	    const unsafeRes = await this._rpcRequest('getClusterNodes', []);
	    const res = create(unsafeRes, jsonRpcResult(array(ContactInfoResult)));

	    if ('error' in res) {
	      throw new Error('failed to get cluster nodes: ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Return the list of nodes that are currently participating in the cluster
	   */


	  async getVoteAccounts(commitment) {
	    const args = this._buildArgs([], commitment);

	    const unsafeRes = await this._rpcRequest('getVoteAccounts', args);
	    const res = create(unsafeRes, GetVoteAccounts);

	    if ('error' in res) {
	      throw new Error('failed to get vote accounts: ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch the current slot that the node is processing
	   */


	  async getSlot(commitment) {
	    const args = this._buildArgs([], commitment);

	    const unsafeRes = await this._rpcRequest('getSlot', args);
	    const res = create(unsafeRes, jsonRpcResult(number()));

	    if ('error' in res) {
	      throw new Error('failed to get slot: ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch the current slot leader of the cluster
	   */


	  async getSlotLeader(commitment) {
	    const args = this._buildArgs([], commitment);

	    const unsafeRes = await this._rpcRequest('getSlotLeader', args);
	    const res = create(unsafeRes, jsonRpcResult(string()));

	    if ('error' in res) {
	      throw new Error('failed to get slot leader: ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch `limit` number of slot leaders starting from `startSlot`
	   *
	   * @param startSlot fetch slot leaders starting from this slot
	   * @param limit number of slot leaders to return
	   */


	  async getSlotLeaders(startSlot, limit) {
	    const args = [startSlot, limit];
	    const unsafeRes = await this._rpcRequest('getSlotLeaders', args);
	    const res = create(unsafeRes, jsonRpcResult(array(PublicKeyFromString)));

	    if ('error' in res) {
	      throw new Error('failed to get slot leaders: ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch the current status of a signature
	   */


	  async getSignatureStatus(signature, config) {
	    const {
	      context,
	      value: values
	    } = await this.getSignatureStatuses([signature], config);
	    assert(values.length === 1);
	    const value = values[0];
	    return {
	      context,
	      value
	    };
	  }
	  /**
	   * Fetch the current statuses of a batch of signatures
	   */


	  async getSignatureStatuses(signatures, config) {
	    const params = [signatures];

	    if (config) {
	      params.push(config);
	    }

	    const unsafeRes = await this._rpcRequest('getSignatureStatuses', params);
	    const res = create(unsafeRes, GetSignatureStatusesRpcResult);

	    if ('error' in res) {
	      throw new Error('failed to get signature status: ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch the current transaction count of the cluster
	   */


	  async getTransactionCount(commitment) {
	    const args = this._buildArgs([], commitment);

	    const unsafeRes = await this._rpcRequest('getTransactionCount', args);
	    const res = create(unsafeRes, jsonRpcResult(number()));

	    if ('error' in res) {
	      throw new Error('failed to get transaction count: ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch the current total currency supply of the cluster in lamports
	   *
	   * @deprecated Deprecated since v1.2.8. Please use {@link getSupply} instead.
	   */


	  async getTotalSupply(commitment) {
	    const result = await this.getSupply({
	      commitment,
	      excludeNonCirculatingAccountsList: true
	    });
	    return result.value.total;
	  }
	  /**
	   * Fetch the cluster InflationGovernor parameters
	   */


	  async getInflationGovernor(commitment) {
	    const args = this._buildArgs([], commitment);

	    const unsafeRes = await this._rpcRequest('getInflationGovernor', args);
	    const res = create(unsafeRes, GetInflationGovernorRpcResult);

	    if ('error' in res) {
	      throw new Error('failed to get inflation: ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch the inflation reward for a list of addresses for an epoch
	   */


	  async getInflationReward(addresses, epoch, commitment) {
	    const args = this._buildArgs([addresses.map(pubkey => pubkey.toBase58())], commitment, undefined, {
	      epoch
	    });

	    const unsafeRes = await this._rpcRequest('getInflationReward', args);
	    const res = create(unsafeRes, GetInflationRewardResult);

	    if ('error' in res) {
	      throw new Error('failed to get inflation reward: ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch the Epoch Info parameters
	   */


	  async getEpochInfo(commitment) {
	    const args = this._buildArgs([], commitment);

	    const unsafeRes = await this._rpcRequest('getEpochInfo', args);
	    const res = create(unsafeRes, GetEpochInfoRpcResult);

	    if ('error' in res) {
	      throw new Error('failed to get epoch info: ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch the Epoch Schedule parameters
	   */


	  async getEpochSchedule() {
	    const unsafeRes = await this._rpcRequest('getEpochSchedule', []);
	    const res = create(unsafeRes, GetEpochScheduleRpcResult);

	    if ('error' in res) {
	      throw new Error('failed to get epoch schedule: ' + res.error.message);
	    }

	    const epochSchedule = res.result;
	    return new EpochSchedule(epochSchedule.slotsPerEpoch, epochSchedule.leaderScheduleSlotOffset, epochSchedule.warmup, epochSchedule.firstNormalEpoch, epochSchedule.firstNormalSlot);
	  }
	  /**
	   * Fetch the leader schedule for the current epoch
	   * @return {Promise<RpcResponseAndContext<LeaderSchedule>>}
	   */


	  async getLeaderSchedule() {
	    const unsafeRes = await this._rpcRequest('getLeaderSchedule', []);
	    const res = create(unsafeRes, GetLeaderScheduleRpcResult);

	    if ('error' in res) {
	      throw new Error('failed to get leader schedule: ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch the minimum balance needed to exempt an account of `dataLength`
	   * size from rent
	   */


	  async getMinimumBalanceForRentExemption(dataLength, commitment) {
	    const args = this._buildArgs([dataLength], commitment);

	    const unsafeRes = await this._rpcRequest('getMinimumBalanceForRentExemption', args);
	    const res = create(unsafeRes, GetMinimumBalanceForRentExemptionRpcResult);

	    if ('error' in res) {
	      console.warn('Unable to fetch minimum balance for rent exemption');
	      return 0;
	    }

	    return res.result;
	  }
	  /**
	   * Fetch a recent blockhash from the cluster, return with context
	   * @return {Promise<RpcResponseAndContext<{blockhash: Blockhash, feeCalculator: FeeCalculator}>>}
	   *
	   * @deprecated Deprecated since Solana v1.8.0. Please use {@link getLatestBlockhash} instead.
	   */


	  async getRecentBlockhashAndContext(commitment) {
	    const args = this._buildArgs([], commitment);

	    const unsafeRes = await this._rpcRequest('getRecentBlockhash', args);
	    const res = create(unsafeRes, GetRecentBlockhashAndContextRpcResult);

	    if ('error' in res) {
	      throw new Error('failed to get recent blockhash: ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch recent performance samples
	   * @return {Promise<Array<PerfSample>>}
	   */


	  async getRecentPerformanceSamples(limit) {
	    const args = this._buildArgs(limit ? [limit] : []);

	    const unsafeRes = await this._rpcRequest('getRecentPerformanceSamples', args);
	    const res = create(unsafeRes, GetRecentPerformanceSamplesRpcResult);

	    if ('error' in res) {
	      throw new Error('failed to get recent performance samples: ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch the fee calculator for a recent blockhash from the cluster, return with context
	   *
	   * @deprecated Deprecated since Solana v1.8.0. Please use {@link getFeeForMessage} instead.
	   */


	  async getFeeCalculatorForBlockhash(blockhash, commitment) {
	    const args = this._buildArgs([blockhash], commitment);

	    const unsafeRes = await this._rpcRequest('getFeeCalculatorForBlockhash', args);
	    const res = create(unsafeRes, GetFeeCalculatorRpcResult);

	    if ('error' in res) {
	      throw new Error('failed to get fee calculator: ' + res.error.message);
	    }

	    const {
	      context,
	      value
	    } = res.result;
	    return {
	      context,
	      value: value !== null ? value.feeCalculator : null
	    };
	  }
	  /**
	   * Fetch the fee for a message from the cluster, return with context
	   */


	  async getFeeForMessage(message, commitment) {
	    const wireMessage = message.serialize().toString('base64');

	    const args = this._buildArgs([wireMessage], commitment);

	    const unsafeRes = await this._rpcRequest('getFeeForMessage', args);
	    const res = create(unsafeRes, jsonRpcResultAndContext(nullable(number())));

	    if ('error' in res) {
	      throw new Error('failed to get slot: ' + res.error.message);
	    }

	    if (res.result === null) {
	      throw new Error('invalid blockhash');
	    }

	    return res.result;
	  }
	  /**
	   * Fetch a recent blockhash from the cluster
	   * @return {Promise<{blockhash: Blockhash, feeCalculator: FeeCalculator}>}
	   *
	   * @deprecated Deprecated since Solana v1.8.0. Please use {@link getLatestBlockhash} instead.
	   */


	  async getRecentBlockhash(commitment) {
	    try {
	      const res = await this.getRecentBlockhashAndContext(commitment);
	      return res.value;
	    } catch (e) {
	      throw new Error('failed to get recent blockhash: ' + e);
	    }
	  }
	  /**
	   * Fetch the latest blockhash from the cluster
	   * @return {Promise<{blockhash: Blockhash, lastValidBlockHeight: number}>}
	   */


	  async getLatestBlockhash(commitment) {
	    try {
	      const res = await this.getLatestBlockhashAndContext(commitment);
	      return res.value;
	    } catch (e) {
	      throw new Error('failed to get recent blockhash: ' + e);
	    }
	  }
	  /**
	   * Fetch the latest blockhash from the cluster
	   * @return {Promise<{blockhash: Blockhash, lastValidBlockHeight: number}>}
	   */


	  async getLatestBlockhashAndContext(commitment) {
	    const args = this._buildArgs([], commitment);

	    const unsafeRes = await this._rpcRequest('getLatestBlockhash', args);
	    const res = create(unsafeRes, GetLatestBlockhashRpcResult);

	    if ('error' in res) {
	      throw new Error('failed to get latest blockhash: ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch the node version
	   */


	  async getVersion() {
	    const unsafeRes = await this._rpcRequest('getVersion', []);
	    const res = create(unsafeRes, jsonRpcResult(VersionResult));

	    if ('error' in res) {
	      throw new Error('failed to get version: ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch the genesis hash
	   */


	  async getGenesisHash() {
	    const unsafeRes = await this._rpcRequest('getGenesisHash', []);
	    const res = create(unsafeRes, jsonRpcResult(string()));

	    if ('error' in res) {
	      throw new Error('failed to get genesis hash: ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch a processed block from the cluster.
	   */


	  async getBlock(slot, opts) {
	    const args = this._buildArgsAtLeastConfirmed([slot], opts && opts.commitment);

	    const unsafeRes = await this._rpcRequest('getBlock', args);
	    const res = create(unsafeRes, GetBlockRpcResult);

	    if ('error' in res) {
	      throw new Error('failed to get confirmed block: ' + res.error.message);
	    }

	    const result = res.result;
	    if (!result) return result;
	    return { ...result,
	      transactions: result.transactions.map(({
	        transaction,
	        meta
	      }) => {
	        const message = new Message(transaction.message);
	        return {
	          meta,
	          transaction: { ...transaction,
	            message
	          }
	        };
	      })
	    };
	  }
	  /**
	   * Fetch a confirmed or finalized transaction from the cluster.
	   */


	  async getTransaction(signature, opts) {
	    const args = this._buildArgsAtLeastConfirmed([signature], opts && opts.commitment);

	    const unsafeRes = await this._rpcRequest('getTransaction', args);
	    const res = create(unsafeRes, GetTransactionRpcResult);

	    if ('error' in res) {
	      throw new Error('failed to get transaction: ' + res.error.message);
	    }

	    const result = res.result;
	    if (!result) return result;
	    return { ...result,
	      transaction: { ...result.transaction,
	        message: new Message(result.transaction.message)
	      }
	    };
	  }
	  /**
	   * Fetch parsed transaction details for a confirmed or finalized transaction
	   */


	  async getParsedTransaction(signature, commitment) {
	    const args = this._buildArgsAtLeastConfirmed([signature], commitment, 'jsonParsed');

	    const unsafeRes = await this._rpcRequest('getTransaction', args);
	    const res = create(unsafeRes, GetParsedTransactionRpcResult);

	    if ('error' in res) {
	      throw new Error('failed to get transaction: ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch parsed transaction details for a batch of confirmed transactions
	   */


	  async getParsedTransactions(signatures, commitment) {
	    const batch = signatures.map(signature => {
	      const args = this._buildArgsAtLeastConfirmed([signature], commitment, 'jsonParsed');

	      return {
	        methodName: 'getTransaction',
	        args
	      };
	    });
	    const unsafeRes = await this._rpcBatchRequest(batch);
	    const res = unsafeRes.map(unsafeRes => {
	      const res = create(unsafeRes, GetParsedTransactionRpcResult);

	      if ('error' in res) {
	        throw new Error('failed to get transactions: ' + res.error.message);
	      }

	      return res.result;
	    });
	    return res;
	  }
	  /**
	   * Fetch a list of Transactions and transaction statuses from the cluster
	   * for a confirmed block.
	   *
	   * @deprecated Deprecated since v1.13.0. Please use {@link getBlock} instead.
	   */


	  async getConfirmedBlock(slot, commitment) {
	    const args = this._buildArgsAtLeastConfirmed([slot], commitment);

	    const unsafeRes = await this._rpcRequest('getConfirmedBlock', args);
	    const res = create(unsafeRes, GetConfirmedBlockRpcResult);

	    if ('error' in res) {
	      throw new Error('failed to get confirmed block: ' + res.error.message);
	    }

	    const result = res.result;

	    if (!result) {
	      throw new Error('Confirmed block ' + slot + ' not found');
	    }

	    const block = { ...result,
	      transactions: result.transactions.map(({
	        transaction,
	        meta
	      }) => {
	        const message = new Message(transaction.message);
	        return {
	          meta,
	          transaction: { ...transaction,
	            message
	          }
	        };
	      })
	    };
	    return { ...block,
	      transactions: block.transactions.map(({
	        transaction,
	        meta
	      }) => {
	        return {
	          meta,
	          transaction: Transaction.populate(transaction.message, transaction.signatures)
	        };
	      })
	    };
	  }
	  /**
	   * Fetch confirmed blocks between two slots
	   */


	  async getBlocks(startSlot, endSlot, commitment) {
	    const args = this._buildArgsAtLeastConfirmed(endSlot !== undefined ? [startSlot, endSlot] : [startSlot], commitment);

	    const unsafeRes = await this._rpcRequest('getBlocks', args);
	    const res = create(unsafeRes, jsonRpcResult(array(number())));

	    if ('error' in res) {
	      throw new Error('failed to get blocks: ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch a list of Signatures from the cluster for a block, excluding rewards
	   */


	  async getBlockSignatures(slot, commitment) {
	    const args = this._buildArgsAtLeastConfirmed([slot], commitment, undefined, {
	      transactionDetails: 'signatures',
	      rewards: false
	    });

	    const unsafeRes = await this._rpcRequest('getBlock', args);
	    const res = create(unsafeRes, GetBlockSignaturesRpcResult);

	    if ('error' in res) {
	      throw new Error('failed to get block: ' + res.error.message);
	    }

	    const result = res.result;

	    if (!result) {
	      throw new Error('Block ' + slot + ' not found');
	    }

	    return result;
	  }
	  /**
	   * Fetch a list of Signatures from the cluster for a confirmed block, excluding rewards
	   *
	   * @deprecated Deprecated since Solana v1.8.0. Please use {@link getBlockSignatures} instead.
	   */


	  async getConfirmedBlockSignatures(slot, commitment) {
	    const args = this._buildArgsAtLeastConfirmed([slot], commitment, undefined, {
	      transactionDetails: 'signatures',
	      rewards: false
	    });

	    const unsafeRes = await this._rpcRequest('getConfirmedBlock', args);
	    const res = create(unsafeRes, GetBlockSignaturesRpcResult);

	    if ('error' in res) {
	      throw new Error('failed to get confirmed block: ' + res.error.message);
	    }

	    const result = res.result;

	    if (!result) {
	      throw new Error('Confirmed block ' + slot + ' not found');
	    }

	    return result;
	  }
	  /**
	   * Fetch a transaction details for a confirmed transaction
	   *
	   * @deprecated Deprecated since Solana v1.8.0. Please use {@link getTransaction} instead.
	   */


	  async getConfirmedTransaction(signature, commitment) {
	    const args = this._buildArgsAtLeastConfirmed([signature], commitment);

	    const unsafeRes = await this._rpcRequest('getConfirmedTransaction', args);
	    const res = create(unsafeRes, GetTransactionRpcResult);

	    if ('error' in res) {
	      throw new Error('failed to get transaction: ' + res.error.message);
	    }

	    const result = res.result;
	    if (!result) return result;
	    const message = new Message(result.transaction.message);
	    const signatures = result.transaction.signatures;
	    return { ...result,
	      transaction: Transaction.populate(message, signatures)
	    };
	  }
	  /**
	   * Fetch parsed transaction details for a confirmed transaction
	   *
	   * @deprecated Deprecated since Solana v1.8.0. Please use {@link getParsedTransaction} instead.
	   */


	  async getParsedConfirmedTransaction(signature, commitment) {
	    const args = this._buildArgsAtLeastConfirmed([signature], commitment, 'jsonParsed');

	    const unsafeRes = await this._rpcRequest('getConfirmedTransaction', args);
	    const res = create(unsafeRes, GetParsedTransactionRpcResult);

	    if ('error' in res) {
	      throw new Error('failed to get confirmed transaction: ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch parsed transaction details for a batch of confirmed transactions
	   *
	   * @deprecated Deprecated since Solana v1.8.0. Please use {@link getParsedTransactions} instead.
	   */


	  async getParsedConfirmedTransactions(signatures, commitment) {
	    const batch = signatures.map(signature => {
	      const args = this._buildArgsAtLeastConfirmed([signature], commitment, 'jsonParsed');

	      return {
	        methodName: 'getConfirmedTransaction',
	        args
	      };
	    });
	    const unsafeRes = await this._rpcBatchRequest(batch);
	    const res = unsafeRes.map(unsafeRes => {
	      const res = create(unsafeRes, GetParsedTransactionRpcResult);

	      if ('error' in res) {
	        throw new Error('failed to get confirmed transactions: ' + res.error.message);
	      }

	      return res.result;
	    });
	    return res;
	  }
	  /**
	   * Fetch a list of all the confirmed signatures for transactions involving an address
	   * within a specified slot range. Max range allowed is 10,000 slots.
	   *
	   * @deprecated Deprecated since v1.3. Please use {@link getConfirmedSignaturesForAddress2} instead.
	   *
	   * @param address queried address
	   * @param startSlot start slot, inclusive
	   * @param endSlot end slot, inclusive
	   */


	  async getConfirmedSignaturesForAddress(address, startSlot, endSlot) {
	    let options = {};
	    let firstAvailableBlock = await this.getFirstAvailableBlock();

	    while (!('until' in options)) {
	      startSlot--;

	      if (startSlot <= 0 || startSlot < firstAvailableBlock) {
	        break;
	      }

	      try {
	        const block = await this.getConfirmedBlockSignatures(startSlot, 'finalized');

	        if (block.signatures.length > 0) {
	          options.until = block.signatures[block.signatures.length - 1].toString();
	        }
	      } catch (err) {
	        if (err instanceof Error && err.message.includes('skipped')) {
	          continue;
	        } else {
	          throw err;
	        }
	      }
	    }

	    let highestConfirmedRoot = await this.getSlot('finalized');

	    while (!('before' in options)) {
	      endSlot++;

	      if (endSlot > highestConfirmedRoot) {
	        break;
	      }

	      try {
	        const block = await this.getConfirmedBlockSignatures(endSlot);

	        if (block.signatures.length > 0) {
	          options.before = block.signatures[block.signatures.length - 1].toString();
	        }
	      } catch (err) {
	        if (err instanceof Error && err.message.includes('skipped')) {
	          continue;
	        } else {
	          throw err;
	        }
	      }
	    }

	    const confirmedSignatureInfo = await this.getConfirmedSignaturesForAddress2(address, options);
	    return confirmedSignatureInfo.map(info => info.signature);
	  }
	  /**
	   * Returns confirmed signatures for transactions involving an
	   * address backwards in time from the provided signature or most recent confirmed block
	   *
	   *
	   * @param address queried address
	   * @param options
	   */


	  async getConfirmedSignaturesForAddress2(address, options, commitment) {
	    const args = this._buildArgsAtLeastConfirmed([address.toBase58()], commitment, undefined, options);

	    const unsafeRes = await this._rpcRequest('getConfirmedSignaturesForAddress2', args);
	    const res = create(unsafeRes, GetConfirmedSignaturesForAddress2RpcResult);

	    if ('error' in res) {
	      throw new Error('failed to get confirmed signatures for address: ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Returns confirmed signatures for transactions involving an
	   * address backwards in time from the provided signature or most recent confirmed block
	   *
	   *
	   * @param address queried address
	   * @param options
	   */


	  async getSignaturesForAddress(address, options, commitment) {
	    const args = this._buildArgsAtLeastConfirmed([address.toBase58()], commitment, undefined, options);

	    const unsafeRes = await this._rpcRequest('getSignaturesForAddress', args);
	    const res = create(unsafeRes, GetSignaturesForAddressRpcResult);

	    if ('error' in res) {
	      throw new Error('failed to get signatures for address: ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * Fetch the contents of a Nonce account from the cluster, return with context
	   */


	  async getNonceAndContext(nonceAccount, commitment) {
	    const {
	      context,
	      value: accountInfo
	    } = await this.getAccountInfoAndContext(nonceAccount, commitment);
	    let value = null;

	    if (accountInfo !== null) {
	      value = NonceAccount.fromAccountData(accountInfo.data);
	    }

	    return {
	      context,
	      value
	    };
	  }
	  /**
	   * Fetch the contents of a Nonce account from the cluster
	   */


	  async getNonce(nonceAccount, commitment) {
	    return await this.getNonceAndContext(nonceAccount, commitment).then(x => x.value).catch(e => {
	      throw new Error('failed to get nonce for account ' + nonceAccount.toBase58() + ': ' + e);
	    });
	  }
	  /**
	   * Request an allocation of lamports to the specified address
	   *
	   * ```typescript
	   * import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
	   *
	   * (async () => {
	   *   const connection = new Connection("https://api.testnet.solana.com", "confirmed");
	   *   const myAddress = new PublicKey("2nr1bHFT86W9tGnyvmYW4vcHKsQB3sVQfnddasz4kExM");
	   *   const signature = await connection.requestAirdrop(myAddress, LAMPORTS_PER_SOL);
	   *   await connection.confirmTransaction(signature);
	   * })();
	   * ```
	   */


	  async requestAirdrop(to, lamports) {
	    const unsafeRes = await this._rpcRequest('requestAirdrop', [to.toBase58(), lamports]);
	    const res = create(unsafeRes, RequestAirdropRpcResult);

	    if ('error' in res) {
	      throw new Error('airdrop to ' + to.toBase58() + ' failed: ' + res.error.message);
	    }

	    return res.result;
	  }
	  /**
	   * @internal
	   */


	  async _recentBlockhash(disableCache) {
	    if (!disableCache) {
	      // Wait for polling to finish
	      while (this._pollingBlockhash) {
	        await sleep(100);
	      }

	      const timeSinceFetch = Date.now() - this._blockhashInfo.lastFetch;

	      const expired = timeSinceFetch >= BLOCKHASH_CACHE_TIMEOUT_MS;

	      if (this._blockhashInfo.recentBlockhash !== null && !expired) {
	        return this._blockhashInfo.recentBlockhash;
	      }
	    }

	    return await this._pollNewBlockhash();
	  }
	  /**
	   * @internal
	   */


	  async _pollNewBlockhash() {
	    this._pollingBlockhash = true;

	    try {
	      const startTime = Date.now();

	      for (let i = 0; i < 50; i++) {
	        const {
	          blockhash
	        } = await this.getRecentBlockhash('finalized');

	        if (this._blockhashInfo.recentBlockhash != blockhash) {
	          this._blockhashInfo = {
	            recentBlockhash: blockhash,
	            lastFetch: Date.now(),
	            transactionSignatures: [],
	            simulatedSignatures: []
	          };
	          return blockhash;
	        } // Sleep for approximately half a slot


	        await sleep(MS_PER_SLOT / 2);
	      }

	      throw new Error(`Unable to obtain a new blockhash after ${Date.now() - startTime}ms`);
	    } finally {
	      this._pollingBlockhash = false;
	    }
	  }
	  /**
	   * Simulate a transaction
	   */


	  async simulateTransaction(transactionOrMessage, signers, includeAccounts) {
	    let transaction;

	    if (transactionOrMessage instanceof Transaction) {
	      transaction = transactionOrMessage;
	    } else {
	      transaction = Transaction.populate(transactionOrMessage);
	    }

	    if (transaction.nonceInfo && signers) {
	      transaction.sign(...signers);
	    } else {
	      let disableCache = this._disableBlockhashCaching;

	      for (;;) {
	        transaction.recentBlockhash = await this._recentBlockhash(disableCache);
	        if (!signers) break;
	        transaction.sign(...signers);

	        if (!transaction.signature) {
	          throw new Error('!signature'); // should never happen
	        }

	        const signature = transaction.signature.toString('base64');

	        if (!this._blockhashInfo.simulatedSignatures.includes(signature) && !this._blockhashInfo.transactionSignatures.includes(signature)) {
	          // The signature of this transaction has not been seen before with the
	          // current recentBlockhash, all done. Let's break
	          this._blockhashInfo.simulatedSignatures.push(signature);

	          break;
	        } else {
	          // This transaction would be treated as duplicate (its derived signature
	          // matched to one of already recorded signatures).
	          // So, we must fetch a new blockhash for a different signature by disabling
	          // our cache not to wait for the cache expiration (BLOCKHASH_CACHE_TIMEOUT_MS).
	          disableCache = true;
	        }
	      }
	    }

	    const message = transaction._compile();

	    const signData = message.serialize();

	    const wireTransaction = transaction._serialize(signData);

	    const encodedTransaction = wireTransaction.toString('base64');
	    const config = {
	      encoding: 'base64',
	      commitment: this.commitment
	    };

	    if (includeAccounts) {
	      const addresses = (Array.isArray(includeAccounts) ? includeAccounts : message.nonProgramIds()).map(key => key.toBase58());
	      config['accounts'] = {
	        encoding: 'base64',
	        addresses
	      };
	    }

	    if (signers) {
	      config.sigVerify = true;
	    }

	    const args = [encodedTransaction, config];
	    const unsafeRes = await this._rpcRequest('simulateTransaction', args);
	    const res = create(unsafeRes, SimulatedTransactionResponseStruct);

	    if ('error' in res) {
	      let logs;

	      if ('data' in res.error) {
	        logs = res.error.data.logs;

	        if (logs && Array.isArray(logs)) {
	          const traceIndent = '\n    ';
	          const logTrace = traceIndent + logs.join(traceIndent);
	          console.error(res.error.message, logTrace);
	        }
	      }

	      throw new SendTransactionError('failed to simulate transaction: ' + res.error.message, logs);
	    }

	    return res.result;
	  }
	  /**
	   * Sign and send a transaction
	   */


	  async sendTransaction(transaction, signers, options) {
	    if (transaction.nonceInfo) {
	      transaction.sign(...signers);
	    } else {
	      let disableCache = this._disableBlockhashCaching;

	      for (;;) {
	        transaction.recentBlockhash = await this._recentBlockhash(disableCache);
	        transaction.sign(...signers);

	        if (!transaction.signature) {
	          throw new Error('!signature'); // should never happen
	        }

	        const signature = transaction.signature.toString('base64');

	        if (!this._blockhashInfo.transactionSignatures.includes(signature)) {
	          // The signature of this transaction has not been seen before with the
	          // current recentBlockhash, all done. Let's break
	          this._blockhashInfo.transactionSignatures.push(signature);

	          break;
	        } else {
	          // This transaction would be treated as duplicate (its derived signature
	          // matched to one of already recorded signatures).
	          // So, we must fetch a new blockhash for a different signature by disabling
	          // our cache not to wait for the cache expiration (BLOCKHASH_CACHE_TIMEOUT_MS).
	          disableCache = true;
	        }
	      }
	    }

	    const wireTransaction = transaction.serialize();
	    return await this.sendRawTransaction(wireTransaction, options);
	  }
	  /**
	   * Send a transaction that has already been signed and serialized into the
	   * wire format
	   */


	  async sendRawTransaction(rawTransaction, options) {
	    const encodedTransaction = toBuffer(rawTransaction).toString('base64');
	    const result = await this.sendEncodedTransaction(encodedTransaction, options);
	    return result;
	  }
	  /**
	   * Send a transaction that has already been signed, serialized into the
	   * wire format, and encoded as a base64 string
	   */


	  async sendEncodedTransaction(encodedTransaction, options) {
	    const config = {
	      encoding: 'base64'
	    };
	    const skipPreflight = options && options.skipPreflight;
	    const preflightCommitment = options && options.preflightCommitment || this.commitment;

	    if (options && options.maxRetries) {
	      config.maxRetries = options.maxRetries;
	    }

	    if (skipPreflight) {
	      config.skipPreflight = skipPreflight;
	    }

	    if (preflightCommitment) {
	      config.preflightCommitment = preflightCommitment;
	    }

	    const args = [encodedTransaction, config];
	    const unsafeRes = await this._rpcRequest('sendTransaction', args);
	    const res = create(unsafeRes, SendTransactionRpcResult);

	    if ('error' in res) {
	      let logs;

	      if ('data' in res.error) {
	        logs = res.error.data.logs;

	        if (logs && Array.isArray(logs)) {
	          const traceIndent = '\n    ';
	          const logTrace = traceIndent + logs.join(traceIndent);
	          console.error(res.error.message, logTrace);
	        }
	      }

	      throw new SendTransactionError('failed to send transaction: ' + res.error.message, logs);
	    }

	    return res.result;
	  }
	  /**
	   * @internal
	   */


	  _wsOnOpen() {
	    this._rpcWebSocketConnected = true;
	    this._rpcWebSocketHeartbeat = setInterval(() => {
	      // Ping server every 5s to prevent idle timeouts
	      this._rpcWebSocket.notify('ping').catch(() => {});
	    }, 5000);

	    this._updateSubscriptions();
	  }
	  /**
	   * @internal
	   */


	  _wsOnError(err) {
	    console.error('ws error:', err.message);
	  }
	  /**
	   * @internal
	   */


	  _wsOnClose(code) {
	    if (this._rpcWebSocketHeartbeat) {
	      clearInterval(this._rpcWebSocketHeartbeat);
	      this._rpcWebSocketHeartbeat = null;
	    }

	    if (code === 1000) {
	      // explicit close, check if any subscriptions have been made since close
	      this._updateSubscriptions();

	      return;
	    } // implicit close, prepare subscriptions for auto-reconnect


	    this._resetSubscriptions();
	  }
	  /**
	   * @internal
	   */


	  async _subscribe(sub, rpcMethod, rpcArgs) {
	    if (sub.subscriptionId == null) {
	      sub.subscriptionId = 'subscribing';

	      try {
	        const id = await this._rpcWebSocket.call(rpcMethod, rpcArgs);

	        if (typeof id === 'number' && sub.subscriptionId === 'subscribing') {
	          // eslint-disable-next-line require-atomic-updates
	          sub.subscriptionId = id;
	        }
	      } catch (err) {
	        if (sub.subscriptionId === 'subscribing') {
	          // eslint-disable-next-line require-atomic-updates
	          sub.subscriptionId = null;
	        }

	        if (err instanceof Error) {
	          console.error(`${rpcMethod} error for argument`, rpcArgs, err.message);
	        }
	      }
	    }
	  }
	  /**
	   * @internal
	   */


	  async _unsubscribe(sub, rpcMethod) {
	    const subscriptionId = sub.subscriptionId;

	    if (subscriptionId != null && typeof subscriptionId != 'string') {
	      const unsubscribeId = subscriptionId;

	      try {
	        await this._rpcWebSocket.call(rpcMethod, [unsubscribeId]);
	      } catch (err) {
	        if (err instanceof Error) {
	          console.error(`${rpcMethod} error:`, err.message);
	        }
	      }
	    }
	  }
	  /**
	   * @internal
	   */


	  _resetSubscriptions() {
	    Object.values(this._accountChangeSubscriptions).forEach(s => s.subscriptionId = null);
	    Object.values(this._programAccountChangeSubscriptions).forEach(s => s.subscriptionId = null);
	    Object.values(this._rootSubscriptions).forEach(s => s.subscriptionId = null);
	    Object.values(this._signatureSubscriptions).forEach(s => s.subscriptionId = null);
	    Object.values(this._slotSubscriptions).forEach(s => s.subscriptionId = null);
	    Object.values(this._slotUpdateSubscriptions).forEach(s => s.subscriptionId = null);
	  }
	  /**
	   * @internal
	   */


	  _updateSubscriptions() {
	    const accountKeys = Object.keys(this._accountChangeSubscriptions).map(Number);
	    const programKeys = Object.keys(this._programAccountChangeSubscriptions).map(Number);
	    const slotKeys = Object.keys(this._slotSubscriptions).map(Number);
	    const slotUpdateKeys = Object.keys(this._slotUpdateSubscriptions).map(Number);
	    const signatureKeys = Object.keys(this._signatureSubscriptions).map(Number);
	    const rootKeys = Object.keys(this._rootSubscriptions).map(Number);
	    const logsKeys = Object.keys(this._logsSubscriptions).map(Number);

	    if (accountKeys.length === 0 && programKeys.length === 0 && slotKeys.length === 0 && slotUpdateKeys.length === 0 && signatureKeys.length === 0 && rootKeys.length === 0 && logsKeys.length === 0) {
	      if (this._rpcWebSocketConnected) {
	        this._rpcWebSocketConnected = false;
	        this._rpcWebSocketIdleTimeout = setTimeout(() => {
	          this._rpcWebSocketIdleTimeout = null;

	          try {
	            this._rpcWebSocket.close();
	          } catch (err) {
	            // swallow error if socket has already been closed.
	            if (err instanceof Error) {
	              console.log(`Error when closing socket connection: ${err.message}`);
	            }
	          }
	        }, 500);
	      }

	      return;
	    }

	    if (this._rpcWebSocketIdleTimeout !== null) {
	      clearTimeout(this._rpcWebSocketIdleTimeout);
	      this._rpcWebSocketIdleTimeout = null;
	      this._rpcWebSocketConnected = true;
	    }

	    if (!this._rpcWebSocketConnected) {
	      this._rpcWebSocket.connect();

	      return;
	    }

	    for (let id of accountKeys) {
	      const sub = this._accountChangeSubscriptions[id];

	      this._subscribe(sub, 'accountSubscribe', this._buildArgs([sub.publicKey], sub.commitment, 'base64'));
	    }

	    for (let id of programKeys) {
	      const sub = this._programAccountChangeSubscriptions[id];

	      this._subscribe(sub, 'programSubscribe', this._buildArgs([sub.programId], sub.commitment, 'base64', {
	        filters: sub.filters
	      }));
	    }

	    for (let id of slotKeys) {
	      const sub = this._slotSubscriptions[id];

	      this._subscribe(sub, 'slotSubscribe', []);
	    }

	    for (let id of slotUpdateKeys) {
	      const sub = this._slotUpdateSubscriptions[id];

	      this._subscribe(sub, 'slotsUpdatesSubscribe', []);
	    }

	    for (let id of signatureKeys) {
	      const sub = this._signatureSubscriptions[id];
	      const args = [sub.signature];
	      if (sub.options) args.push(sub.options);

	      this._subscribe(sub, 'signatureSubscribe', args);
	    }

	    for (let id of rootKeys) {
	      const sub = this._rootSubscriptions[id];

	      this._subscribe(sub, 'rootSubscribe', []);
	    }

	    for (let id of logsKeys) {
	      const sub = this._logsSubscriptions[id];
	      let filter;

	      if (typeof sub.filter === 'object') {
	        filter = {
	          mentions: [sub.filter.toString()]
	        };
	      } else {
	        filter = sub.filter;
	      }

	      this._subscribe(sub, 'logsSubscribe', this._buildArgs([filter], sub.commitment));
	    }
	  }
	  /**
	   * @internal
	   */


	  _wsOnAccountNotification(notification) {
	    const res = create(notification, AccountNotificationResult);

	    for (const sub of Object.values(this._accountChangeSubscriptions)) {
	      if (sub.subscriptionId === res.subscription) {
	        sub.callback(res.result.value, res.result.context);
	        return;
	      }
	    }
	  }
	  /**
	   * Register a callback to be invoked whenever the specified account changes
	   *
	   * @param publicKey Public key of the account to monitor
	   * @param callback Function to invoke whenever the account is changed
	   * @param commitment Specify the commitment level account changes must reach before notification
	   * @return subscription id
	   */


	  onAccountChange(publicKey, callback, commitment) {
	    const id = ++this._accountChangeSubscriptionCounter;
	    this._accountChangeSubscriptions[id] = {
	      publicKey: publicKey.toBase58(),
	      callback,
	      commitment,
	      subscriptionId: null
	    };

	    this._updateSubscriptions();

	    return id;
	  }
	  /**
	   * Deregister an account notification callback
	   *
	   * @param id subscription id to deregister
	   */


	  async removeAccountChangeListener(id) {
	    if (this._accountChangeSubscriptions[id]) {
	      const subInfo = this._accountChangeSubscriptions[id];
	      delete this._accountChangeSubscriptions[id];
	      await this._unsubscribe(subInfo, 'accountUnsubscribe');

	      this._updateSubscriptions();
	    } else {
	      throw new Error(`Unknown account change id: ${id}`);
	    }
	  }
	  /**
	   * @internal
	   */


	  _wsOnProgramAccountNotification(notification) {
	    const res = create(notification, ProgramAccountNotificationResult);

	    for (const sub of Object.values(this._programAccountChangeSubscriptions)) {
	      if (sub.subscriptionId === res.subscription) {
	        const {
	          value,
	          context
	        } = res.result;
	        sub.callback({
	          accountId: value.pubkey,
	          accountInfo: value.account
	        }, context);
	        return;
	      }
	    }
	  }
	  /**
	   * Register a callback to be invoked whenever accounts owned by the
	   * specified program change
	   *
	   * @param programId Public key of the program to monitor
	   * @param callback Function to invoke whenever the account is changed
	   * @param commitment Specify the commitment level account changes must reach before notification
	   * @param filters The program account filters to pass into the RPC method
	   * @return subscription id
	   */


	  onProgramAccountChange(programId, callback, commitment, filters) {
	    const id = ++this._programAccountChangeSubscriptionCounter;
	    this._programAccountChangeSubscriptions[id] = {
	      programId: programId.toBase58(),
	      callback,
	      commitment,
	      subscriptionId: null,
	      filters
	    };

	    this._updateSubscriptions();

	    return id;
	  }
	  /**
	   * Deregister an account notification callback
	   *
	   * @param id subscription id to deregister
	   */


	  async removeProgramAccountChangeListener(id) {
	    if (this._programAccountChangeSubscriptions[id]) {
	      const subInfo = this._programAccountChangeSubscriptions[id];
	      delete this._programAccountChangeSubscriptions[id];
	      await this._unsubscribe(subInfo, 'programUnsubscribe');

	      this._updateSubscriptions();
	    } else {
	      throw new Error(`Unknown program account change id: ${id}`);
	    }
	  }
	  /**
	   * Registers a callback to be invoked whenever logs are emitted.
	   */


	  onLogs(filter, callback, commitment) {
	    const id = ++this._logsSubscriptionCounter;
	    this._logsSubscriptions[id] = {
	      filter,
	      callback,
	      commitment,
	      subscriptionId: null
	    };

	    this._updateSubscriptions();

	    return id;
	  }
	  /**
	   * Deregister a logs callback.
	   *
	   * @param id subscription id to deregister.
	   */


	  async removeOnLogsListener(id) {
	    if (!this._logsSubscriptions[id]) {
	      throw new Error(`Unknown logs id: ${id}`);
	    }

	    const subInfo = this._logsSubscriptions[id];
	    delete this._logsSubscriptions[id];
	    await this._unsubscribe(subInfo, 'logsUnsubscribe');

	    this._updateSubscriptions();
	  }
	  /**
	   * @internal
	   */


	  _wsOnLogsNotification(notification) {
	    const res = create(notification, LogsNotificationResult);
	    const keys = Object.keys(this._logsSubscriptions).map(Number);

	    for (let id of keys) {
	      const sub = this._logsSubscriptions[id];

	      if (sub.subscriptionId === res.subscription) {
	        sub.callback(res.result.value, res.result.context);
	        return;
	      }
	    }
	  }
	  /**
	   * @internal
	   */


	  _wsOnSlotNotification(notification) {
	    const res = create(notification, SlotNotificationResult);

	    for (const sub of Object.values(this._slotSubscriptions)) {
	      if (sub.subscriptionId === res.subscription) {
	        sub.callback(res.result);
	        return;
	      }
	    }
	  }
	  /**
	   * Register a callback to be invoked upon slot changes
	   *
	   * @param callback Function to invoke whenever the slot changes
	   * @return subscription id
	   */


	  onSlotChange(callback) {
	    const id = ++this._slotSubscriptionCounter;
	    this._slotSubscriptions[id] = {
	      callback,
	      subscriptionId: null
	    };

	    this._updateSubscriptions();

	    return id;
	  }
	  /**
	   * Deregister a slot notification callback
	   *
	   * @param id subscription id to deregister
	   */


	  async removeSlotChangeListener(id) {
	    if (this._slotSubscriptions[id]) {
	      const subInfo = this._slotSubscriptions[id];
	      delete this._slotSubscriptions[id];
	      await this._unsubscribe(subInfo, 'slotUnsubscribe');

	      this._updateSubscriptions();
	    } else {
	      throw new Error(`Unknown slot change id: ${id}`);
	    }
	  }
	  /**
	   * @internal
	   */


	  _wsOnSlotUpdatesNotification(notification) {
	    const res = create(notification, SlotUpdateNotificationResult);

	    for (const sub of Object.values(this._slotUpdateSubscriptions)) {
	      if (sub.subscriptionId === res.subscription) {
	        sub.callback(res.result);
	        return;
	      }
	    }
	  }
	  /**
	   * Register a callback to be invoked upon slot updates. {@link SlotUpdate}'s
	   * may be useful to track live progress of a cluster.
	   *
	   * @param callback Function to invoke whenever the slot updates
	   * @return subscription id
	   */


	  onSlotUpdate(callback) {
	    const id = ++this._slotUpdateSubscriptionCounter;
	    this._slotUpdateSubscriptions[id] = {
	      callback,
	      subscriptionId: null
	    };

	    this._updateSubscriptions();

	    return id;
	  }
	  /**
	   * Deregister a slot update notification callback
	   *
	   * @param id subscription id to deregister
	   */


	  async removeSlotUpdateListener(id) {
	    if (this._slotUpdateSubscriptions[id]) {
	      const subInfo = this._slotUpdateSubscriptions[id];
	      delete this._slotUpdateSubscriptions[id];
	      await this._unsubscribe(subInfo, 'slotsUpdatesUnsubscribe');

	      this._updateSubscriptions();
	    } else {
	      throw new Error(`Unknown slot update id: ${id}`);
	    }
	  }

	  _buildArgs(args, override, encoding, extra) {
	    const commitment = override || this._commitment;

	    if (commitment || encoding || extra) {
	      let options = {};

	      if (encoding) {
	        options.encoding = encoding;
	      }

	      if (commitment) {
	        options.commitment = commitment;
	      }

	      if (extra) {
	        options = Object.assign(options, extra);
	      }

	      args.push(options);
	    }

	    return args;
	  }
	  /**
	   * @internal
	   */


	  _buildArgsAtLeastConfirmed(args, override, encoding, extra) {
	    const commitment = override || this._commitment;

	    if (commitment && !['confirmed', 'finalized'].includes(commitment)) {
	      throw new Error('Using Connection with default commitment: `' + this._commitment + '`, but method requires at least `confirmed`');
	    }

	    return this._buildArgs(args, override, encoding, extra);
	  }
	  /**
	   * @internal
	   */


	  _wsOnSignatureNotification(notification) {
	    const res = create(notification, SignatureNotificationResult);

	    for (const [id, sub] of Object.entries(this._signatureSubscriptions)) {
	      if (sub.subscriptionId === res.subscription) {
	        if (res.result.value === 'receivedSignature') {
	          sub.callback({
	            type: 'received'
	          }, res.result.context);
	        } else {
	          // Signatures subscriptions are auto-removed by the RPC service so
	          // no need to explicitly send an unsubscribe message
	          delete this._signatureSubscriptions[Number(id)];

	          this._updateSubscriptions();

	          sub.callback({
	            type: 'status',
	            result: res.result.value
	          }, res.result.context);
	        }

	        return;
	      }
	    }
	  }
	  /**
	   * Register a callback to be invoked upon signature updates
	   *
	   * @param signature Transaction signature string in base 58
	   * @param callback Function to invoke on signature notifications
	   * @param commitment Specify the commitment level signature must reach before notification
	   * @return subscription id
	   */


	  onSignature(signature, callback, commitment) {
	    const id = ++this._signatureSubscriptionCounter;
	    this._signatureSubscriptions[id] = {
	      signature,
	      callback: (notification, context) => {
	        if (notification.type === 'status') {
	          callback(notification.result, context);
	        }
	      },
	      options: {
	        commitment
	      },
	      subscriptionId: null
	    };

	    this._updateSubscriptions();

	    return id;
	  }
	  /**
	   * Register a callback to be invoked when a transaction is
	   * received and/or processed.
	   *
	   * @param signature Transaction signature string in base 58
	   * @param callback Function to invoke on signature notifications
	   * @param options Enable received notifications and set the commitment
	   *   level that signature must reach before notification
	   * @return subscription id
	   */


	  onSignatureWithOptions(signature, callback, options) {
	    const id = ++this._signatureSubscriptionCounter;
	    this._signatureSubscriptions[id] = {
	      signature,
	      callback,
	      options,
	      subscriptionId: null
	    };

	    this._updateSubscriptions();

	    return id;
	  }
	  /**
	   * Deregister a signature notification callback
	   *
	   * @param id subscription id to deregister
	   */


	  async removeSignatureListener(id) {
	    if (this._signatureSubscriptions[id]) {
	      const subInfo = this._signatureSubscriptions[id];
	      delete this._signatureSubscriptions[id];
	      await this._unsubscribe(subInfo, 'signatureUnsubscribe');

	      this._updateSubscriptions();
	    } else {
	      throw new Error(`Unknown signature result id: ${id}`);
	    }
	  }
	  /**
	   * @internal
	   */


	  _wsOnRootNotification(notification) {
	    const res = create(notification, RootNotificationResult);

	    for (const sub of Object.values(this._rootSubscriptions)) {
	      if (sub.subscriptionId === res.subscription) {
	        sub.callback(res.result);
	        return;
	      }
	    }
	  }
	  /**
	   * Register a callback to be invoked upon root changes
	   *
	   * @param callback Function to invoke whenever the root changes
	   * @return subscription id
	   */


	  onRootChange(callback) {
	    const id = ++this._rootSubscriptionCounter;
	    this._rootSubscriptions[id] = {
	      callback,
	      subscriptionId: null
	    };

	    this._updateSubscriptions();

	    return id;
	  }
	  /**
	   * Deregister a root notification callback
	   *
	   * @param id subscription id to deregister
	   */


	  async removeRootChangeListener(id) {
	    if (this._rootSubscriptions[id]) {
	      const subInfo = this._rootSubscriptions[id];
	      delete this._rootSubscriptions[id];
	      await this._unsubscribe(subInfo, 'rootUnsubscribe');

	      this._updateSubscriptions();
	    } else {
	      throw new Error(`Unknown root change id: ${id}`);
	    }
	  }

	}

	/**
	 * Keypair signer interface
	 */

	/**
	 * An account keypair used for signing transactions.
	 */
	class Keypair {
	  /**
	   * Create a new keypair instance.
	   * Generate random keypair if no {@link Ed25519Keypair} is provided.
	   *
	   * @param keypair ed25519 keypair
	   */
	  constructor(keypair) {
	    this._keypair = void 0;

	    if (keypair) {
	      this._keypair = keypair;
	    } else {
	      this._keypair = nacl.sign.keyPair();
	    }
	  }
	  /**
	   * Generate a new random keypair
	   */


	  static generate() {
	    return new Keypair(nacl.sign.keyPair());
	  }
	  /**
	   * Create a keypair from a raw secret key byte array.
	   *
	   * This method should only be used to recreate a keypair from a previously
	   * generated secret key. Generating keypairs from a random seed should be done
	   * with the {@link Keypair.fromSeed} method.
	   *
	   * @throws error if the provided secret key is invalid and validation is not skipped.
	   *
	   * @param secretKey secret key byte array
	   * @param options: skip secret key validation
	   */


	  static fromSecretKey(secretKey, options) {
	    const keypair = nacl.sign.keyPair.fromSecretKey(secretKey);

	    if (!options || !options.skipValidation) {
	      const encoder = new TextEncoder();
	      const signData = encoder.encode('@solana/web3.js-validation-v1');
	      const signature = nacl.sign.detached(signData, keypair.secretKey);

	      if (!nacl.sign.detached.verify(signData, signature, keypair.publicKey)) {
	        throw new Error('provided secretKey is invalid');
	      }
	    }

	    return new Keypair(keypair);
	  }
	  /**
	   * Generate a keypair from a 32 byte seed.
	   *
	   * @param seed seed byte array
	   */


	  static fromSeed(seed) {
	    return new Keypair(nacl.sign.keyPair.fromSeed(seed));
	  }
	  /**
	   * The public key for this keypair
	   */


	  get publicKey() {
	    return new PublicKey(this._keypair.publicKey);
	  }
	  /**
	   * The raw secret key for this keypair
	   */


	  get secretKey() {
	    return this._keypair.secretKey;
	  }

	}

	const PRIVATE_KEY_BYTES$1 = 64;
	const PUBLIC_KEY_BYTES$1 = 32;
	const SIGNATURE_BYTES = 64;
	/**
	 * Params for creating an ed25519 instruction using a public key
	 */

	const ED25519_INSTRUCTION_LAYOUT = struct([u8('numSignatures'), u8('padding'), u16('signatureOffset'), u16('signatureInstructionIndex'), u16('publicKeyOffset'), u16('publicKeyInstructionIndex'), u16('messageDataOffset'), u16('messageDataSize'), u16('messageInstructionIndex')]);
	class Ed25519Program {
	  /**
	   * @internal
	   */
	  constructor() {}
	  /**
	   * Public key that identifies the ed25519 program
	   */


	  /**
	   * Create an ed25519 instruction with a public key and signature. The
	   * public key must be a buffer that is 32 bytes long, and the signature
	   * must be a buffer of 64 bytes.
	   */
	  static createInstructionWithPublicKey(params) {
	    const {
	      publicKey,
	      message,
	      signature,
	      instructionIndex
	    } = params;
	    assert(publicKey.length === PUBLIC_KEY_BYTES$1, `Public Key must be ${PUBLIC_KEY_BYTES$1} bytes but received ${publicKey.length} bytes`);
	    assert(signature.length === SIGNATURE_BYTES, `Signature must be ${SIGNATURE_BYTES} bytes but received ${signature.length} bytes`);
	    const publicKeyOffset = ED25519_INSTRUCTION_LAYOUT.span;
	    const signatureOffset = publicKeyOffset + publicKey.length;
	    const messageDataOffset = signatureOffset + signature.length;
	    const numSignatures = 1;
	    const instructionData = buffer.Buffer.alloc(messageDataOffset + message.length);
	    ED25519_INSTRUCTION_LAYOUT.encode({
	      numSignatures,
	      padding: 0,
	      signatureOffset,
	      signatureInstructionIndex: instructionIndex,
	      publicKeyOffset,
	      publicKeyInstructionIndex: instructionIndex,
	      messageDataOffset,
	      messageDataSize: message.length,
	      messageInstructionIndex: instructionIndex
	    }, instructionData);
	    instructionData.fill(publicKey, publicKeyOffset);
	    instructionData.fill(signature, signatureOffset);
	    instructionData.fill(message, messageDataOffset);
	    return new TransactionInstruction({
	      keys: [],
	      programId: Ed25519Program.programId,
	      data: instructionData
	    });
	  }
	  /**
	   * Create an ed25519 instruction with a private key. The private key
	   * must be a buffer that is 64 bytes long.
	   */


	  static createInstructionWithPrivateKey(params) {
	    const {
	      privateKey,
	      message,
	      instructionIndex
	    } = params;
	    assert(privateKey.length === PRIVATE_KEY_BYTES$1, `Private key must be ${PRIVATE_KEY_BYTES$1} bytes but received ${privateKey.length} bytes`);

	    try {
	      const keypair = Keypair.fromSecretKey(privateKey);
	      const publicKey = keypair.publicKey.toBytes();
	      const signature = nacl.sign.detached(message, keypair.secretKey);
	      return this.createInstructionWithPublicKey({
	        publicKey,
	        message,
	        signature,
	        instructionIndex
	      });
	    } catch (error) {
	      throw new Error(`Error creating instruction; ${error}`);
	    }
	  }

	}
	Ed25519Program.programId = new PublicKey('Ed25519SigVerify111111111111111111111111111');

	/**
	 * Address of the stake config account which configures the rate
	 * of stake warmup and cooldown as well as the slashing penalty.
	 */

	new PublicKey('StakeConfig11111111111111111111111111111111');
	/**
	 * Stake account lockup info
	 */

	class Lockup {
	  /** Unix timestamp of lockup expiration */

	  /** Epoch of lockup expiration */

	  /** Lockup custodian authority */

	  /**
	   * Create a new Lockup object
	   */
	  constructor(unixTimestamp, epoch, custodian) {
	    this.unixTimestamp = void 0;
	    this.epoch = void 0;
	    this.custodian = void 0;
	    this.unixTimestamp = unixTimestamp;
	    this.epoch = epoch;
	    this.custodian = custodian;
	  }
	  /**
	   * Default, inactive Lockup value
	   */


	}
	/**
	 * Create stake account transaction params
	 */

	Lockup.default = new Lockup(0, 0, PublicKey.default);
	/**
	 * An enumeration of valid StakeInstructionType's
	 */

	/**
	 * An enumeration of valid stake InstructionType's
	 * @internal
	 */
	Object.freeze({
	  Initialize: {
	    index: 0,
	    layout: struct([u32('instruction'), authorized(), lockup()])
	  },
	  Authorize: {
	    index: 1,
	    layout: struct([u32('instruction'), publicKey('newAuthorized'), u32('stakeAuthorizationType')])
	  },
	  Delegate: {
	    index: 2,
	    layout: struct([u32('instruction')])
	  },
	  Split: {
	    index: 3,
	    layout: struct([u32('instruction'), ns64('lamports')])
	  },
	  Withdraw: {
	    index: 4,
	    layout: struct([u32('instruction'), ns64('lamports')])
	  },
	  Deactivate: {
	    index: 5,
	    layout: struct([u32('instruction')])
	  },
	  Merge: {
	    index: 7,
	    layout: struct([u32('instruction')])
	  },
	  AuthorizeWithSeed: {
	    index: 8,
	    layout: struct([u32('instruction'), publicKey('newAuthorized'), u32('stakeAuthorizationType'), rustString('authoritySeed'), publicKey('authorityOwner')])
	  }
	});
	/**
	 * Stake authorization type
	 */

	/**
	 * An enumeration of valid StakeAuthorizationLayout's
	 */
	Object.freeze({
	  Staker: {
	    index: 0
	  },
	  Withdrawer: {
	    index: 1
	  }
	});
	new PublicKey('Stake11111111111111111111111111111111111111');
	/**
	 * Params for creating an secp256k1 instruction using a public key
	 */

	struct([u8('numSignatures'), u16('signatureOffset'), u8('signatureInstructionIndex'), u16('ethAddressOffset'), u8('ethAddressInstructionIndex'), u16('messageDataOffset'), u16('messageDataSize'), u8('messageInstructionIndex'), blob(20, 'ethAddress'), blob(64, 'signature'), u8('recoveryId')]);
	new PublicKey('KeccakSecp256k11111111111111111111111111111');

	new PublicKey('Va1idator1nfo111111111111111111111111111111');
	/**
	 * @internal
	 */

	type({
	  name: string(),
	  website: optional(string()),
	  details: optional(string()),
	  keybaseUsername: optional(string())
	});

	new PublicKey('Vote111111111111111111111111111111111111111');

	/**
	 * See https://github.com/solana-labs/solana/blob/8a12ed029cfa38d4a45400916c2463fb82bbec8c/programs/vote_api/src/vote_state.rs#L68-L88
	 *
	 * @internal
	 */
	struct([publicKey('nodePubkey'), publicKey('authorizedWithdrawer'), u8('commission'), nu64(), // votes.length
	seq(struct([nu64('slot'), u32('confirmationCount')]), offset(u32(), -8), 'votes'), u8('rootSlotValid'), nu64('rootSlot'), nu64(), // authorizedVoters.length
	seq(struct([nu64('epoch'), publicKey('authorizedVoter')]), offset(u32(), -8), 'authorizedVoters'), struct([seq(struct([publicKey('authorizedPubkey'), nu64('epochOfLastAuthorizedSwitch'), nu64('targetEpoch')]), 32, 'buf'), nu64('idx'), u8('isEmpty')], 'priorVoters'), nu64(), // epochCredits.length
	seq(struct([nu64('epoch'), nu64('credits'), nu64('prevCredits')]), offset(u32(), -8), 'epochCredits'), struct([nu64('slot'), nu64('timestamp')], 'lastTimestamp')]);
	/**
	 * An enumeration of valid VoteInstructionType's
	 */

	Object.freeze({
	  InitializeAccount: {
	    index: 0,
	    layout: struct([u32('instruction'), voteInit()])
	  },
	  Authorize: {
	    index: 1,
	    layout: struct([u32('instruction'), publicKey('newAuthorized'), u32('voteAuthorizationType')])
	  },
	  Withdraw: {
	    index: 3,
	    layout: struct([u32('instruction'), ns64('lamports')])
	  }
	});
	/**
	 * VoteAuthorize type
	 */

	/**
	 * An enumeration of valid VoteAuthorization layouts.
	 */
	Object.freeze({
	  Voter: {
	    index: 0
	  },
	  Withdrawer: {
	    index: 1
	  }
	});
	new PublicKey('Vote111111111111111111111111111111111111111');

	const endpoint = {
	  http: {
	    devnet: 'http://api.devnet.solana.com',
	    testnet: 'http://api.testnet.solana.com',
	    'mainnet-beta': 'http://api.mainnet-beta.solana.com/'
	  },
	  https: {
	    devnet: 'https://api.devnet.solana.com',
	    testnet: 'https://api.testnet.solana.com',
	    'mainnet-beta': 'https://api.mainnet-beta.solana.com/'
	  }
	};

	/**
	 * Retrieves the RPC API URL for the specified cluster
	 */
	function clusterApiUrl(cluster, tls) {
	  const key = tls === false ? 'http' : 'https';

	  if (!cluster) {
	    return endpoint[key]['devnet'];
	  }

	  const url = endpoint[key][cluster];

	  if (!url) {
	    throw new Error(`Unknown ${key} cluster: ${cluster}`);
	  }

	  return url;
	}

	const getVrfProgram = cluster => {
	  switch (cluster) {
	    case "devnet":
	      {
	        return new PublicKey("VRFS1BUivo8SDWKjsx3TVW976LXvpB1fFwTf6hGutbJ");
	      }

	    case "mainnet-beta":
	      {
	        return new PublicKey("VRFbts7MNgJGfc4ZznJAshGGwdJz2xcUgMhv6FJmYJR");
	      }

	    default:
	      throw new Error(`${cluster} is not supported`);
	  }
	};
	const config_account_seed = Buffer.from("orao-vrf-network-configuration");
	const randomness_account_seed = Buffer.from("orao-vrf-randomness-request");

	const deriveAccountAddress = async (seed, vrfProgram) => {
	  let [pubkey, _] = await PublicKey.findProgramAddress([randomness_account_seed, seed], vrfProgram);
	  return pubkey;
	};

	class RandomnessRequested {
	  constructor(seed) {
	    this.seed = void 0;
	    this.seed = seed;
	  }

	}
	class RandomnessFullfilled {
	  constructor(seed, randomness, pubkey) {
	    this.seed = void 0;
	    this.randomness = void 0;
	    this.pubkey = void 0;
	    this.seed = seed;
	    this.randomness = randomness;
	    this.pubkey = pubkey;
	  }

	}

	const deriveConfigAccountAddress = async cluster => {
	  const vrfProgram = getVrfProgram(cluster);
	  let [pubkey, _] = await PublicKey.findProgramAddress([config_account_seed], vrfProgram);
	  return pubkey;
	};

	const decodeTreasuryFromConfig = buffer => {
	  const reader = new BinaryReader_1(buffer);
	  reader.readFixedArray(32); // authority

	  return new PublicKey(reader.readFixedArray(32));
	};

	const decodeRandomnessAccount = buffer => {
	  const reader = new BinaryReader_1(buffer);
	  const tag = reader.readU8();

	  if (tag === 0) {
	    return new RandomnessRequested(reader.readFixedArray(32));
	  } else if (tag === 1) {
	    return new RandomnessFullfilled(reader.readFixedArray(32), reader.readFixedArray(64), new PublicKey(reader.readFixedArray(32)));
	  } else {
	    throw "Invalid account data";
	  }
	};

	const createOrGetRandomnessRequest = async (payer, cluster, seed = undefined) => {
	  // Create a connection to to Solana's network
	  const connection = new Connection(clusterApiUrl(cluster));
	  const vrfProgram = getVrfProgram(cluster);

	  if (seed === undefined) {
	    // generate random seed if none was provided
	    seed = Keypair.generate().publicKey.toBuffer();
	    console.log("generated seed for randomness request: ", seed);
	  } else {
	    console.log("user user-provided seed for randomness request: ", seed);
	  }

	  const randomnessAddress = await deriveAccountAddress(seed, vrfProgram);
	  const randomnessAccount = await connection.getAccountInfo(randomnessAddress);

	  if (randomnessAccount === null) {
	    // no randomness yet for this seed,
	    // request one and return the tx to the
	    // user to sign and send
	    const writer = new BinaryWriter_1();
	    writer.writeU8(0); // RequestRandomness Instruction

	    writer.writeFixedArray(seed);
	    const configAddress = await deriveConfigAccountAddress(cluster);
	    const configAccount = await connection.getAccountInfo(configAddress);
	    const treasuryAddress = decodeTreasuryFromConfig(configAccount.data);
	    const tx = new TransactionInstruction({
	      keys: [{
	        pubkey: payer,
	        isSigner: true,
	        isWritable: true
	      }, {
	        pubkey: configAddress,
	        isSigner: false,
	        isWritable: false
	      }, {
	        pubkey: treasuryAddress,
	        isSigner: false,
	        isWritable: true
	      }, {
	        pubkey: randomnessAddress,
	        isSigner: false,
	        isWritable: true
	      }, {
	        pubkey: SystemProgram.programId,
	        isSigner: false,
	        isWritable: false
	      }, {
	        pubkey: SYSVAR_RENT_PUBKEY,
	        isSigner: false,
	        isWritable: false
	      }],
	      programId: vrfProgram,
	      data: Buffer.from(writer.toArray())
	    });
	    return new Transaction().add(tx);
	  } else {
	    // there is already randomness generated for this seed
	    return decodeRandomnessAccount(randomnessAccount.data);
	  }
	};

	class NotFoundError extends Error {
	  constructor(msg) {
	    super(msg);
	    Object.setPrototypeOf(this, NotFoundError.prototype);
	  }

	}
	class RandomnessVerifyError extends Error {
	  constructor(msg) {
	    super(msg);
	    Object.setPrototypeOf(this, RandomnessVerifyError.prototype);
	  }

	}

	/*! noble-ed25519 - MIT License (c) 2019 Paul Miller (paulmillr.com) */
	const _0n = BigInt(0);
	const _1n = BigInt(1);
	const _2n = BigInt(2);
	const _255n = BigInt(255);
	const CURVE_ORDER = _2n ** BigInt(252) + BigInt('27742317777372353535851937790883648493');
	const CURVE = {
	    a: BigInt(-1),
	    d: BigInt('37095705934669439343138083508754565189542113879843219016388785533085940283555'),
	    P: _2n ** _255n - BigInt(19),
	    l: CURVE_ORDER,
	    n: CURVE_ORDER,
	    h: BigInt(8),
	    Gx: BigInt('15112221349535400772501151409588531511454012693041857206046113283949847762202'),
	    Gy: BigInt('46316835694926478169428394003475163141307993866256225615783033603165251855960'),
	};
	const MAX_256B = _2n ** BigInt(256);
	const SQRT_M1 = BigInt('19681161376707505956807079304988542015446066515923890162744021073123829784752');
	BigInt('6853475219497561581579357271197624642482790079785650197046958215289687604742');
	BigInt('25063068953384623474111414158702152701244531502492656460079210482610430750235');
	BigInt('54469307008909316920995813868745141605393597292927456921205312896311721017578');
	BigInt('1159843021668779879193775521855586647937357759715417654439879720876111806838');
	BigInt('40440834346308536858101042469323190826248399146238708352240133220865137265952');
	class ExtendedPoint {
	    constructor(x, y, z, t) {
	        this.x = x;
	        this.y = y;
	        this.z = z;
	        this.t = t;
	    }
	    static fromAffine(p) {
	        if (!(p instanceof Point)) {
	            throw new TypeError('ExtendedPoint#fromAffine: expected Point');
	        }
	        if (p.equals(Point.ZERO))
	            return ExtendedPoint.ZERO;
	        return new ExtendedPoint(p.x, p.y, _1n, mod(p.x * p.y));
	    }
	    static toAffineBatch(points) {
	        const toInv = invertBatch(points.map((p) => p.z));
	        return points.map((p, i) => p.toAffine(toInv[i]));
	    }
	    static normalizeZ(points) {
	        return this.toAffineBatch(points).map(this.fromAffine);
	    }
	    equals(other) {
	        assertExtPoint(other);
	        const { x: X1, y: Y1, z: Z1 } = this;
	        const { x: X2, y: Y2, z: Z2 } = other;
	        const X1Z2 = mod(X1 * Z2);
	        const X2Z1 = mod(X2 * Z1);
	        const Y1Z2 = mod(Y1 * Z2);
	        const Y2Z1 = mod(Y2 * Z1);
	        return X1Z2 === X2Z1 && Y1Z2 === Y2Z1;
	    }
	    negate() {
	        return new ExtendedPoint(mod(-this.x), this.y, this.z, mod(-this.t));
	    }
	    double() {
	        const { x: X1, y: Y1, z: Z1 } = this;
	        const { a } = CURVE;
	        const A = mod(X1 ** _2n);
	        const B = mod(Y1 ** _2n);
	        const C = mod(_2n * mod(Z1 ** _2n));
	        const D = mod(a * A);
	        const E = mod(mod((X1 + Y1) ** _2n) - A - B);
	        const G = D + B;
	        const F = G - C;
	        const H = D - B;
	        const X3 = mod(E * F);
	        const Y3 = mod(G * H);
	        const T3 = mod(E * H);
	        const Z3 = mod(F * G);
	        return new ExtendedPoint(X3, Y3, Z3, T3);
	    }
	    add(other) {
	        assertExtPoint(other);
	        const { x: X1, y: Y1, z: Z1, t: T1 } = this;
	        const { x: X2, y: Y2, z: Z2, t: T2 } = other;
	        const A = mod((Y1 - X1) * (Y2 + X2));
	        const B = mod((Y1 + X1) * (Y2 - X2));
	        const F = mod(B - A);
	        if (F === _0n)
	            return this.double();
	        const C = mod(Z1 * _2n * T2);
	        const D = mod(T1 * _2n * Z2);
	        const E = D + C;
	        const G = B + A;
	        const H = D - C;
	        const X3 = mod(E * F);
	        const Y3 = mod(G * H);
	        const T3 = mod(E * H);
	        const Z3 = mod(F * G);
	        return new ExtendedPoint(X3, Y3, Z3, T3);
	    }
	    subtract(other) {
	        return this.add(other.negate());
	    }
	    precomputeWindow(W) {
	        const windows = 1 + 256 / W;
	        const points = [];
	        let p = this;
	        let base = p;
	        for (let window = 0; window < windows; window++) {
	            base = p;
	            points.push(base);
	            for (let i = 1; i < 2 ** (W - 1); i++) {
	                base = base.add(p);
	                points.push(base);
	            }
	            p = base.double();
	        }
	        return points;
	    }
	    wNAF(n, affinePoint) {
	        if (!affinePoint && this.equals(ExtendedPoint.BASE))
	            affinePoint = Point.BASE;
	        const W = (affinePoint && affinePoint._WINDOW_SIZE) || 1;
	        if (256 % W) {
	            throw new Error('Point#wNAF: Invalid precomputation window, must be power of 2');
	        }
	        let precomputes = affinePoint && pointPrecomputes.get(affinePoint);
	        if (!precomputes) {
	            precomputes = this.precomputeWindow(W);
	            if (affinePoint && W !== 1) {
	                precomputes = ExtendedPoint.normalizeZ(precomputes);
	                pointPrecomputes.set(affinePoint, precomputes);
	            }
	        }
	        let p = ExtendedPoint.ZERO;
	        let f = ExtendedPoint.ZERO;
	        const windows = 1 + 256 / W;
	        const windowSize = 2 ** (W - 1);
	        const mask = BigInt(2 ** W - 1);
	        const maxNumber = 2 ** W;
	        const shiftBy = BigInt(W);
	        for (let window = 0; window < windows; window++) {
	            const offset = window * windowSize;
	            let wbits = Number(n & mask);
	            n >>= shiftBy;
	            if (wbits > windowSize) {
	                wbits -= maxNumber;
	                n += _1n;
	            }
	            if (wbits === 0) {
	                let pr = precomputes[offset];
	                if (window % 2)
	                    pr = pr.negate();
	                f = f.add(pr);
	            }
	            else {
	                let cached = precomputes[offset + Math.abs(wbits) - 1];
	                if (wbits < 0)
	                    cached = cached.negate();
	                p = p.add(cached);
	            }
	        }
	        return ExtendedPoint.normalizeZ([p, f])[0];
	    }
	    multiply(scalar, affinePoint) {
	        return this.wNAF(normalizeScalar(scalar, CURVE.l), affinePoint);
	    }
	    multiplyUnsafe(scalar) {
	        let n = normalizeScalar(scalar, CURVE.l, false);
	        const G = ExtendedPoint.BASE;
	        const P0 = ExtendedPoint.ZERO;
	        if (n === _0n)
	            return P0;
	        if (this.equals(P0) || n === _1n)
	            return this;
	        if (this.equals(G))
	            return this.wNAF(n);
	        let p = P0;
	        let d = this;
	        while (n > _0n) {
	            if (n & _1n)
	                p = p.add(d);
	            d = d.double();
	            n >>= _1n;
	        }
	        return p;
	    }
	    isSmallOrder() {
	        return this.multiplyUnsafe(CURVE.h).equals(ExtendedPoint.ZERO);
	    }
	    isTorsionFree() {
	        return this.multiplyUnsafe(CURVE.l).equals(ExtendedPoint.ZERO);
	    }
	    toAffine(invZ = invert(this.z)) {
	        const { x, y, z } = this;
	        const ax = mod(x * invZ);
	        const ay = mod(y * invZ);
	        const zz = mod(z * invZ);
	        if (zz !== _1n)
	            throw new Error('invZ was invalid');
	        return new Point(ax, ay);
	    }
	    fromRistrettoBytes() {
	        legacyRist();
	    }
	    toRistrettoBytes() {
	        legacyRist();
	    }
	    fromRistrettoHash() {
	        legacyRist();
	    }
	}
	ExtendedPoint.BASE = new ExtendedPoint(CURVE.Gx, CURVE.Gy, _1n, mod(CURVE.Gx * CURVE.Gy));
	ExtendedPoint.ZERO = new ExtendedPoint(_0n, _1n, _1n, _0n);
	function assertExtPoint(other) {
	    if (!(other instanceof ExtendedPoint))
	        throw new TypeError('ExtendedPoint expected');
	}
	function legacyRist() {
	    throw new Error('Legacy method: switch to RistrettoPoint');
	}
	const pointPrecomputes = new WeakMap();
	class Point {
	    constructor(x, y) {
	        this.x = x;
	        this.y = y;
	    }
	    _setWindowSize(windowSize) {
	        this._WINDOW_SIZE = windowSize;
	        pointPrecomputes.delete(this);
	    }
	    static fromHex(hex, strict = true) {
	        const { d, P } = CURVE;
	        hex = ensureBytes(hex, 32);
	        const normed = hex.slice();
	        normed[31] = hex[31] & ~0x80;
	        const y = bytesToNumberLE(normed);
	        if (strict && y >= P)
	            throw new Error('Expected 0 < hex < P');
	        if (!strict && y >= MAX_256B)
	            throw new Error('Expected 0 < hex < 2**256');
	        const y2 = mod(y * y);
	        const u = mod(y2 - _1n);
	        const v = mod(d * y2 + _1n);
	        let { isValid, value: x } = uvRatio(u, v);
	        if (!isValid)
	            throw new Error('Point.fromHex: invalid y coordinate');
	        const isXOdd = (x & _1n) === _1n;
	        const isLastByteOdd = (hex[31] & 0x80) !== 0;
	        if (isLastByteOdd !== isXOdd) {
	            x = mod(-x);
	        }
	        return new Point(x, y);
	    }
	    static async fromPrivateKey(privateKey) {
	        return (await getExtendedPublicKey(privateKey)).point;
	    }
	    toRawBytes() {
	        const bytes = numberTo32BytesLE(this.y);
	        bytes[31] |= this.x & _1n ? 0x80 : 0;
	        return bytes;
	    }
	    toHex() {
	        return bytesToHex(this.toRawBytes());
	    }
	    toX25519() {
	        const { y } = this;
	        const u = mod((_1n + y) * invert(_1n - y));
	        return numberTo32BytesLE(u);
	    }
	    isTorsionFree() {
	        return ExtendedPoint.fromAffine(this).isTorsionFree();
	    }
	    equals(other) {
	        return this.x === other.x && this.y === other.y;
	    }
	    negate() {
	        return new Point(mod(-this.x), this.y);
	    }
	    add(other) {
	        return ExtendedPoint.fromAffine(this).add(ExtendedPoint.fromAffine(other)).toAffine();
	    }
	    subtract(other) {
	        return this.add(other.negate());
	    }
	    multiply(scalar) {
	        return ExtendedPoint.fromAffine(this).multiply(scalar, this).toAffine();
	    }
	}
	Point.BASE = new Point(CURVE.Gx, CURVE.Gy);
	Point.ZERO = new Point(_0n, _1n);
	class Signature {
	    constructor(r, s) {
	        this.r = r;
	        this.s = s;
	        this.assertValidity();
	    }
	    static fromHex(hex) {
	        const bytes = ensureBytes(hex, 64);
	        const r = Point.fromHex(bytes.slice(0, 32), false);
	        const s = bytesToNumberLE(bytes.slice(32, 64));
	        return new Signature(r, s);
	    }
	    assertValidity() {
	        const { r, s } = this;
	        if (!(r instanceof Point))
	            throw new Error('Expected Point instance');
	        normalizeScalar(s, CURVE.l, false);
	        return this;
	    }
	    toRawBytes() {
	        const u8 = new Uint8Array(64);
	        u8.set(this.r.toRawBytes());
	        u8.set(numberTo32BytesLE(this.s), 32);
	        return u8;
	    }
	    toHex() {
	        return bytesToHex(this.toRawBytes());
	    }
	}
	function concatBytes(...arrays) {
	    if (!arrays.every((a) => a instanceof Uint8Array))
	        throw new Error('Expected Uint8Array list');
	    if (arrays.length === 1)
	        return arrays[0];
	    const length = arrays.reduce((a, arr) => a + arr.length, 0);
	    const result = new Uint8Array(length);
	    for (let i = 0, pad = 0; i < arrays.length; i++) {
	        const arr = arrays[i];
	        result.set(arr, pad);
	        pad += arr.length;
	    }
	    return result;
	}
	const hexes = Array.from({ length: 256 }, (v, i) => i.toString(16).padStart(2, '0'));
	function bytesToHex(uint8a) {
	    if (!(uint8a instanceof Uint8Array))
	        throw new Error('Uint8Array expected');
	    let hex = '';
	    for (let i = 0; i < uint8a.length; i++) {
	        hex += hexes[uint8a[i]];
	    }
	    return hex;
	}
	function hexToBytes(hex) {
	    if (typeof hex !== 'string') {
	        throw new TypeError('hexToBytes: expected string, got ' + typeof hex);
	    }
	    if (hex.length % 2)
	        throw new Error('hexToBytes: received invalid unpadded hex');
	    const array = new Uint8Array(hex.length / 2);
	    for (let i = 0; i < array.length; i++) {
	        const j = i * 2;
	        const hexByte = hex.slice(j, j + 2);
	        const byte = Number.parseInt(hexByte, 16);
	        if (Number.isNaN(byte) || byte < 0)
	            throw new Error('Invalid byte sequence');
	        array[i] = byte;
	    }
	    return array;
	}
	function numberTo32BytesBE(num) {
	    const length = 32;
	    const hex = num.toString(16).padStart(length * 2, '0');
	    return hexToBytes(hex);
	}
	function numberTo32BytesLE(num) {
	    return numberTo32BytesBE(num).reverse();
	}
	function edIsNegative(num) {
	    return (mod(num) & _1n) === _1n;
	}
	function bytesToNumberLE(uint8a) {
	    if (!(uint8a instanceof Uint8Array))
	        throw new Error('Expected Uint8Array');
	    return BigInt('0x' + bytesToHex(Uint8Array.from(uint8a).reverse()));
	}
	function mod(a, b = CURVE.P) {
	    const res = a % b;
	    return res >= _0n ? res : b + res;
	}
	function invert(number, modulo = CURVE.P) {
	    if (number === _0n || modulo <= _0n) {
	        throw new Error(`invert: expected positive integers, got n=${number} mod=${modulo}`);
	    }
	    let a = mod(number, modulo);
	    let b = modulo;
	    let x = _0n, u = _1n;
	    while (a !== _0n) {
	        const q = b / a;
	        const r = b % a;
	        const m = x - u * q;
	        b = a, a = r, x = u, u = m;
	    }
	    const gcd = b;
	    if (gcd !== _1n)
	        throw new Error('invert: does not exist');
	    return mod(x, modulo);
	}
	function invertBatch(nums, p = CURVE.P) {
	    const tmp = new Array(nums.length);
	    const lastMultiplied = nums.reduce((acc, num, i) => {
	        if (num === _0n)
	            return acc;
	        tmp[i] = acc;
	        return mod(acc * num, p);
	    }, _1n);
	    const inverted = invert(lastMultiplied, p);
	    nums.reduceRight((acc, num, i) => {
	        if (num === _0n)
	            return acc;
	        tmp[i] = mod(acc * tmp[i], p);
	        return mod(acc * num, p);
	    }, inverted);
	    return tmp;
	}
	function pow2(x, power) {
	    const { P } = CURVE;
	    let res = x;
	    while (power-- > _0n) {
	        res *= res;
	        res %= P;
	    }
	    return res;
	}
	function pow_2_252_3(x) {
	    const { P } = CURVE;
	    const _5n = BigInt(5);
	    const _10n = BigInt(10);
	    const _20n = BigInt(20);
	    const _40n = BigInt(40);
	    const _80n = BigInt(80);
	    const x2 = (x * x) % P;
	    const b2 = (x2 * x) % P;
	    const b4 = (pow2(b2, _2n) * b2) % P;
	    const b5 = (pow2(b4, _1n) * x) % P;
	    const b10 = (pow2(b5, _5n) * b5) % P;
	    const b20 = (pow2(b10, _10n) * b10) % P;
	    const b40 = (pow2(b20, _20n) * b20) % P;
	    const b80 = (pow2(b40, _40n) * b40) % P;
	    const b160 = (pow2(b80, _80n) * b80) % P;
	    const b240 = (pow2(b160, _80n) * b80) % P;
	    const b250 = (pow2(b240, _10n) * b10) % P;
	    const pow_p_5_8 = (pow2(b250, _2n) * x) % P;
	    return { pow_p_5_8, b2 };
	}
	function uvRatio(u, v) {
	    const v3 = mod(v * v * v);
	    const v7 = mod(v3 * v3 * v);
	    const pow = pow_2_252_3(u * v7).pow_p_5_8;
	    let x = mod(u * v3 * pow);
	    const vx2 = mod(v * x * x);
	    const root1 = x;
	    const root2 = mod(x * SQRT_M1);
	    const useRoot1 = vx2 === u;
	    const useRoot2 = vx2 === mod(-u);
	    const noRoot = vx2 === mod(-u * SQRT_M1);
	    if (useRoot1)
	        x = root1;
	    if (useRoot2 || noRoot)
	        x = root2;
	    if (edIsNegative(x))
	        x = mod(-x);
	    return { isValid: useRoot1 || useRoot2, value: x };
	}
	async function sha512ModqLE(...args) {
	    const hash = await utils.sha512(concatBytes(...args));
	    const value = bytesToNumberLE(hash);
	    return mod(value, CURVE.l);
	}
	function ensureBytes(hex, expectedLength) {
	    const bytes = hex instanceof Uint8Array ? Uint8Array.from(hex) : hexToBytes(hex);
	    if (typeof expectedLength === 'number' && bytes.length !== expectedLength)
	        throw new Error(`Expected ${expectedLength} bytes`);
	    return bytes;
	}
	function normalizeScalar(num, max, strict = true) {
	    if (!max)
	        throw new TypeError('Specify max value');
	    if (typeof num === 'number' && Number.isSafeInteger(num))
	        num = BigInt(num);
	    if (typeof num === 'bigint' && num < max) {
	        if (strict) {
	            if (_0n < num)
	                return num;
	        }
	        else {
	            if (_0n <= num)
	                return num;
	        }
	    }
	    throw new TypeError('Expected valid scalar: 0 < scalar < max');
	}
	function adjustBytes25519(bytes) {
	    bytes[0] &= 248;
	    bytes[31] &= 127;
	    bytes[31] |= 64;
	    return bytes;
	}
	async function getExtendedPublicKey(key) {
	    key =
	        typeof key === 'bigint' || typeof key === 'number'
	            ? numberTo32BytesBE(normalizeScalar(key, MAX_256B))
	            : ensureBytes(key);
	    if (key.length !== 32)
	        throw new Error(`Expected 32 bytes`);
	    const hashed = await utils.sha512(key);
	    const head = adjustBytes25519(hashed.slice(0, 32));
	    const prefix = hashed.slice(32, 64);
	    const scalar = mod(bytesToNumberLE(head), CURVE.l);
	    const point = Point.BASE.multiply(scalar);
	    const pointBytes = point.toRawBytes();
	    return { head, prefix, scalar, point, pointBytes };
	}
	async function verify(sig, message, publicKey) {
	    message = ensureBytes(message);
	    if (!(publicKey instanceof Point))
	        publicKey = Point.fromHex(publicKey, false);
	    const { r, s } = sig instanceof Signature ? sig.assertValidity() : Signature.fromHex(sig);
	    const SB = ExtendedPoint.BASE.multiplyUnsafe(s);
	    const k = await sha512ModqLE(r.toRawBytes(), publicKey.toRawBytes(), message);
	    const kA = ExtendedPoint.fromAffine(publicKey).multiplyUnsafe(k);
	    const RkA = ExtendedPoint.fromAffine(r).add(kA);
	    return RkA.subtract(SB).multiplyUnsafe(CURVE.h).equals(ExtendedPoint.ZERO);
	}
	Point.BASE._setWindowSize(8);
	const crypto$1 = {
	    node: nodeCrypto,
	    web: typeof self === 'object' && 'crypto' in self ? self.crypto : undefined,
	};
	const utils = {
	    TORSION_SUBGROUP: [
	        '0100000000000000000000000000000000000000000000000000000000000000',
	        'c7176a703d4dd84fba3c0b760d10670f2a2053fa2c39ccc64ec7fd7792ac037a',
	        '0000000000000000000000000000000000000000000000000000000000000080',
	        '26e8958fc2b227b045c3f489f2ef98f0d5dfac05d3c63339b13802886d53fc05',
	        'ecffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f',
	        '26e8958fc2b227b045c3f489f2ef98f0d5dfac05d3c63339b13802886d53fc85',
	        '0000000000000000000000000000000000000000000000000000000000000000',
	        'c7176a703d4dd84fba3c0b760d10670f2a2053fa2c39ccc64ec7fd7792ac03fa',
	    ],
	    bytesToHex,
	    getExtendedPublicKey,
	    mod,
	    invert,
	    hashToPrivateScalar: (hash) => {
	        hash = ensureBytes(hash);
	        if (hash.length < 40 || hash.length > 1024)
	            throw new Error('Expected 40-1024 bytes of private key as per FIPS 186');
	        const num = mod(bytesToNumberLE(hash), CURVE.l);
	        if (num === _0n || num === _1n)
	            throw new Error('Invalid private key');
	        return num;
	    },
	    randomBytes: (bytesLength = 32) => {
	        if (crypto$1.web) {
	            return crypto$1.web.getRandomValues(new Uint8Array(bytesLength));
	        }
	        else if (crypto$1.node) {
	            const { randomBytes } = crypto$1.node;
	            return new Uint8Array(randomBytes(bytesLength).buffer);
	        }
	        else {
	            throw new Error("The environment doesn't have randomBytes function");
	        }
	    },
	    randomPrivateKey: () => {
	        return utils.randomBytes(32);
	    },
	    sha512: async (message) => {
	        if (crypto$1.web) {
	            const buffer = await crypto$1.web.subtle.digest('SHA-512', message.buffer);
	            return new Uint8Array(buffer);
	        }
	        else if (crypto$1.node) {
	            return Uint8Array.from(crypto$1.node.createHash('sha512').update(message).digest());
	        }
	        else {
	            throw new Error("The environment doesn't have sha512 function");
	        }
	    },
	    precompute(windowSize = 8, point = Point.BASE) {
	        const cached = point.equals(Point.BASE) ? point : new Point(point.x, point.y);
	        cached._setWindowSize(windowSize);
	        cached.multiply(_2n);
	        return cached;
	    },
	};

	const isOraoVrfFulfilled = (tx, vrfProgram) => {
	  const instructions = tx.transaction.message.instructions;

	  if (instructions.length !== 2) {
	    return false;
	  }

	  return instructions[0].programId.toString() === Ed25519Program.programId.toString() && instructions[1].programId.toString() === vrfProgram.toString();
	};

	const extractPublicKeyUsed = tx => {
	  const SIGNATURE_OFFSETS_SERIALIZED_SIZE = 14;
	  const SIGNATURE_OFFSETS_START = 2;
	  const DATA_START = SIGNATURE_OFFSETS_SERIALIZED_SIZE + SIGNATURE_OFFSETS_START;
	  const instructionData = tx.transaction.message.instructions[0].data || "";
	  const data = bs58$1.decode(instructionData).toJSON().data;
	  const pubKeyBytes = data.slice(DATA_START, DATA_START + 32);
	  return new Uint8Array(pubKeyBytes);
	};
	/**
	 * Verify `Randomness` with `PublicKey` and `Seed` provided.
	 *
	 * Fetch `PublicKey` from `FulfillRandomness` transaction which contains EdSigVerify
	 * and FulfillRandomness instruction. Then, verify `Randomness` (signauture) generated
	 * from `seed` (message) and `PublicKey`. An invalid `Randomness` will throw `RandomnessVerifyError`.
	 *
	 * _Note: This step is optional as `Randomness` would have been verified onchain via
	 * native EdSigverify program._
	 *
	 * @param connection Connection to to full node JSON RPC endpoint
	 * @param seed 32 bytes seed (message)
	 * @param randomness 64 bytes signature
	 * @returns
	 */


	const verifyRandomnessOffchain = async (cluster, seed, randomness) => {
	  const connection = new Connection(clusterApiUrl(cluster));
	  const vrfProgram = getVrfProgram(cluster); // Get randomness account

	  const randomnessAddress = await deriveAccountAddress(seed, vrfProgram);
	  const randomnessAccount = await connection.getAccountInfo(randomnessAddress);

	  if (randomnessAccount == null) {
	    throw new NotFoundError(`No Randomness found for seed ${seed}`);
	  } // List all confirmed Transactions


	  const signatures = await connection.getSignaturesForAddress(randomnessAddress);

	  if (signatures.length === 0) {
	    throw new NotFoundError(`No transactions found for seed ${seed}.`);
	  }

	  for (const signature of signatures) {
	    const tx = await connection.getParsedTransaction(signature.signature); // Skip if it isn't FulfillRandomness transaction.

	    if (tx === null || !isOraoVrfFulfilled(tx, vrfProgram)) {
	      continue;
	    } // Verify!


	    const pubKey = extractPublicKeyUsed(tx);
	    const isVerified = await verify(randomness, seed, pubKey);

	    if (!isVerified) {
	      throw new RandomnessVerifyError("Verification failed.");
	    }

	    return;
	  }

	  throw new RandomnessVerifyError("No transaction with EdSigVerify instruction found.");
	};

	exports.RandomnessFullfilled = RandomnessFullfilled;
	exports.RandomnessRequested = RandomnessRequested;
	exports.createOrGetRandomnessRequest = createOrGetRandomnessRequest;
	exports.verifyRandomnessOffchain = verifyRandomnessOffchain;

	Object.defineProperty(exports, '__esModule', { value: true });

	return exports;

})({});
//# sourceMappingURL=index.iife.js.map
