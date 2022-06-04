'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var borsh = require('borsh');
var web3_js = require('@solana/web3.js');
var bs58 = require('bs58');
var nodeCrypto = require('crypto');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var bs58__default = /*#__PURE__*/_interopDefaultLegacy(bs58);
var nodeCrypto__default = /*#__PURE__*/_interopDefaultLegacy(nodeCrypto);

const getVrfProgram = cluster => {
  switch (cluster) {
    case "devnet":
      {
        return new web3_js.PublicKey("VRFS1BUivo8SDWKjsx3TVW976LXvpB1fFwTf6hGutbJ");
      }

    case "mainnet-beta":
      {
        return new web3_js.PublicKey("VRFbts7MNgJGfc4ZznJAshGGwdJz2xcUgMhv6FJmYJR");
      }

    default:
      throw new Error(`${cluster} is not supported`);
  }
};
const config_account_seed = Buffer.from("orao-vrf-network-configuration");
const randomness_account_seed = Buffer.from("orao-vrf-randomness-request");

const deriveAccountAddress = async (seed, vrfProgram) => {
  let [pubkey, _] = await web3_js.PublicKey.findProgramAddress([randomness_account_seed, seed], vrfProgram);
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
  let [pubkey, _] = await web3_js.PublicKey.findProgramAddress([config_account_seed], vrfProgram);
  return pubkey;
};

const decodeTreasuryFromConfig = buffer => {
  const reader = new borsh.BinaryReader(buffer);
  reader.readFixedArray(32); // authority

  return new web3_js.PublicKey(reader.readFixedArray(32));
};

const decodeRandomnessAccount = buffer => {
  const reader = new borsh.BinaryReader(buffer);
  const tag = reader.readU8();

  if (tag === 0) {
    return new RandomnessRequested(reader.readFixedArray(32));
  } else if (tag === 1) {
    return new RandomnessFullfilled(reader.readFixedArray(32), reader.readFixedArray(64), new web3_js.PublicKey(reader.readFixedArray(32)));
  } else {
    throw "Invalid account data";
  }
};

const createOrGetRandomnessRequest = async (payer, cluster, seed = undefined) => {
  // Create a connection to to Solana's network
  const connection = new web3_js.Connection(web3_js.clusterApiUrl(cluster));
  const vrfProgram = getVrfProgram(cluster);

  if (seed === undefined) {
    // generate random seed if none was provided
    seed = web3_js.Keypair.generate().publicKey.toBuffer();
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
    const writer = new borsh.BinaryWriter();
    writer.writeU8(0); // RequestRandomness Instruction

    writer.writeFixedArray(seed);
    const configAddress = await deriveConfigAccountAddress(cluster);
    const configAccount = await connection.getAccountInfo(configAddress);
    const treasuryAddress = decodeTreasuryFromConfig(configAccount.data);
    const tx = new web3_js.TransactionInstruction({
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
        pubkey: web3_js.SystemProgram.programId,
        isSigner: false,
        isWritable: false
      }, {
        pubkey: web3_js.SYSVAR_RENT_PUBKEY,
        isSigner: false,
        isWritable: false
      }],
      programId: vrfProgram,
      data: Buffer.from(writer.toArray())
    });
    return new web3_js.Transaction().add(tx);
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
const crypto = {
    node: nodeCrypto__default["default"],
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
        if (crypto.web) {
            return crypto.web.getRandomValues(new Uint8Array(bytesLength));
        }
        else if (crypto.node) {
            const { randomBytes } = crypto.node;
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
        if (crypto.web) {
            const buffer = await crypto.web.subtle.digest('SHA-512', message.buffer);
            return new Uint8Array(buffer);
        }
        else if (crypto.node) {
            return Uint8Array.from(crypto.node.createHash('sha512').update(message).digest());
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

  return instructions[0].programId.toString() === web3_js.Ed25519Program.programId.toString() && instructions[1].programId.toString() === vrfProgram.toString();
};

const extractPublicKeyUsed = tx => {
  const SIGNATURE_OFFSETS_SERIALIZED_SIZE = 14;
  const SIGNATURE_OFFSETS_START = 2;
  const DATA_START = SIGNATURE_OFFSETS_SERIALIZED_SIZE + SIGNATURE_OFFSETS_START;
  const instructionData = tx.transaction.message.instructions[0].data || "";
  const data = bs58__default["default"].decode(instructionData).toJSON().data;
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
  const connection = new web3_js.Connection(web3_js.clusterApiUrl(cluster));
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
//# sourceMappingURL=index.cjs.js.map
