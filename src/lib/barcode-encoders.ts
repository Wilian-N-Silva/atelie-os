export type BarcodeModule = { width: number; black: boolean };
export type LinearBarcodeKind = "code128" | "code39" | "ean13";

const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
] as const;

const CODE39_PATTERNS: Record<string, string> = {
  "0": "nnnwwnwnn",
  "1": "wnnwnnnnw",
  "2": "nnwwnnnnw",
  "3": "wnwwnnnnn",
  "4": "nnnwwnnnw",
  "5": "wnnwwnnnn",
  "6": "nnwwwnnnn",
  "7": "nnnwnnwnw",
  "8": "wnnwnnwnn",
  "9": "nnwwnnwnn",
  A: "wnnnnwnnw",
  B: "nnwnnwnnw",
  C: "wnwnnwnnn",
  D: "nnnnwwnnw",
  E: "wnnnwwnnn",
  F: "nnwnwwnnn",
  G: "nnnnnwwnw",
  H: "wnnnnwwnn",
  I: "nnwnnwwnn",
  J: "nnnnwwwnn",
  K: "wnnnnnnww",
  L: "nnwnnnnww",
  M: "wnwnnnnwn",
  N: "nnnnwnnww",
  O: "wnnnwnnwn",
  P: "nnwnwnnwn",
  Q: "nnnnnnwww",
  R: "wnnnnnwwn",
  S: "nnwnnnwwn",
  T: "nnnnwnwwn",
  U: "wwnnnnnnw",
  V: "nwwnnnnnw",
  W: "wwwnnnnnn",
  X: "nwnnwnnnw",
  Y: "wwnnwnnnn",
  Z: "nwwnwnnnn",
  "-": "nwnnnnwnw",
  ".": "wwnnnnwnn",
  " ": "nwwnnnwnn",
  "$": "nwnwnwnnn",
  "/": "nwnwnnnwn",
  "+": "nwnnnwnwn",
  "%": "nnnwnwnwn",
  "*": "nwnnwnwnn",
};

const EAN_L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const EAN_G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const EAN_R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
const EAN_PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

function modulesFromPattern(pattern: string) {
  const modules: BarcodeModule[] = [{ width: 10, black: false }];
  pattern.split("").forEach((value, index) => {
    modules.push({ width: Number(value), black: index % 2 === 0 });
  });
  modules.push({ width: 10, black: false });
  return modules;
}

function modulesFromBits(bits: string) {
  const modules: BarcodeModule[] = [{ width: 10, black: false }];
  for (const bit of bits) {
    const black = bit === "1";
    const last = modules[modules.length - 1];
    if (last.black === black) last.width += 1;
    else modules.push({ width: 1, black });
  }
  modules.push({ width: 10, black: false });
  return modules;
}

function normalizeCode128Source(code: string) {
  return String(code || "0").replace(/[^\x20-\x7E]/g, "").trim() || "0";
}

function encodeCode128Values(code: string) {
  const source = normalizeCode128Source(code);
  if (/^\d+$/.test(source) && source.length % 2 === 0) {
    const values = [105];
    for (let index = 0; index < source.length; index += 2) {
      values.push(Number(source.slice(index, index + 2)));
    }
    return { values, text: source };
  }

  const values = [104];
  for (const char of source) values.push(char.charCodeAt(0) - 32);
  return { values, text: source };
}

export function encodeCode128(code: string) {
  const { values, text } = encodeCode128Values(code);
  const checksum = values.reduce((sum, value, index) => sum + (index === 0 ? value : value * index), 0) % 103;
  const pattern = [...values, checksum, 106].map((value) => CODE128_PATTERNS[value]).join("");
  return { modules: modulesFromPattern(pattern), text };
}

export function encodeCode39(code: string) {
  const source = String(code || "0").toUpperCase().replace(/[^A-Z0-9-. $/+%]/g, "") || "0";
  const encoded = `*${source}*`;
  const modules: BarcodeModule[] = [{ width: 10, black: false }];
  encoded.split("").forEach((char, charIndex) => {
    const pattern = CODE39_PATTERNS[char] ?? CODE39_PATTERNS["0"];
    pattern.split("").forEach((part, index) => {
      modules.push({ width: part === "w" ? 3 : 1, black: index % 2 === 0 });
    });
    if (charIndex < encoded.length - 1) modules.push({ width: 1, black: false });
  });
  modules.push({ width: 10, black: false });
  return { modules, text: source };
}

function ean13Checksum(first12: string) {
  const sum = first12.split("").reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  return String((10 - (sum % 10)) % 10);
}

export function normalizeEan13(code: string) {
  const digits = String(code || "0").replace(/\D/g, "") || "0";
  const first12 = digits.length >= 12 ? digits.slice(0, 12) : digits.padStart(12, "0");
  return `${first12}${ean13Checksum(first12)}`;
}

export function encodeEan13(code: string) {
  const text = normalizeEan13(code);
  const first = Number(text[0]);
  const parity = EAN_PARITY[first];
  let bits = "101";
  for (let index = 1; index <= 6; index += 1) {
    const digit = Number(text[index]);
    bits += parity[index - 1] === "L" ? EAN_L[digit] : EAN_G[digit];
  }
  bits += "01010";
  for (let index = 7; index <= 12; index += 1) {
    bits += EAN_R[Number(text[index])];
  }
  bits += "101";
  return { modules: modulesFromBits(bits), text };
}

export function encodeLinearBarcode(code: string, type: LinearBarcodeKind) {
  if (type === "code39") return encodeCode39(code);
  if (type === "ean13") return encodeEan13(code);
  return encodeCode128(code);
}

const QR_VERSION = 3;
const QR_SIZE = 17 + QR_VERSION * 4;
const QR_DATA_CODEWORDS = 55;
const QR_EC_CODEWORDS = 15;

const GF_EXP = new Array<number>(512);
const GF_LOG = new Array<number>(256);
let x = 1;
for (let index = 0; index < 255; index += 1) {
  GF_EXP[index] = x;
  GF_LOG[x] = index;
  x <<= 1;
  if (x & 0x100) x ^= 0x11d;
}
for (let index = 255; index < 512; index += 1) GF_EXP[index] = GF_EXP[index - 255];

function gfMul(a: number, b: number) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGenerator(degree: number) {
  let poly = [1];
  for (let index = 0; index < degree; index += 1) {
    const next = new Array<number>(poly.length + 1).fill(0);
    poly.forEach((coefficient, coefficientIndex) => {
      next[coefficientIndex] ^= gfMul(coefficient, 1);
      next[coefficientIndex + 1] ^= gfMul(coefficient, GF_EXP[index]);
    });
    poly = next;
  }
  return poly;
}

function rsRemainder(data: number[], degree: number) {
  const generator = rsGenerator(degree);
  const message = [...data, ...new Array<number>(degree).fill(0)];
  for (let index = 0; index < data.length; index += 1) {
    const factor = message[index];
    if (factor === 0) continue;
    generator.forEach((coefficient, coefficientIndex) => {
      message[index + coefficientIndex] ^= gfMul(coefficient, factor);
    });
  }
  return message.slice(data.length);
}

class BitBuffer {
  bits: number[] = [];

  append(value: number, length: number) {
    for (let index = length - 1; index >= 0; index -= 1) {
      this.bits.push((value >>> index) & 1);
    }
  }

  appendBytes(bytes: number[]) {
    bytes.forEach((byte) => this.append(byte, 8));
  }

  toCodewords(maxCodewords: number) {
    const maxBits = maxCodewords * 8;
    const terminator = Math.min(4, maxBits - this.bits.length);
    for (let index = 0; index < terminator; index += 1) this.bits.push(0);
    while (this.bits.length % 8 !== 0) this.bits.push(0);

    const codewords: number[] = [];
    for (let index = 0; index < this.bits.length; index += 8) {
      codewords.push(Number.parseInt(this.bits.slice(index, index + 8).join(""), 2));
    }
    const pads = [0xec, 0x11];
    let padIndex = 0;
    while (codewords.length < maxCodewords) {
      codewords.push(pads[padIndex % 2]);
      padIndex += 1;
    }
    return codewords.slice(0, maxCodewords);
  }
}

function qrDataCodewords(code: string) {
  const bytes = Array.from(new TextEncoder().encode(String(code || "0"))).slice(0, QR_DATA_CODEWORDS - 2);
  const buffer = new BitBuffer();
  buffer.append(0b0100, 4);
  buffer.append(bytes.length, 8);
  buffer.appendBytes(bytes);
  return buffer.toCodewords(QR_DATA_CODEWORDS);
}

function blankQrMatrix() {
  return {
    modules: Array.from({ length: QR_SIZE }, () => new Array<boolean>(QR_SIZE).fill(false)),
    reserved: Array.from({ length: QR_SIZE }, () => new Array<boolean>(QR_SIZE).fill(false)),
  };
}

function setQrModule(matrix: ReturnType<typeof blankQrMatrix>, row: number, col: number, value: boolean, reserve = true) {
  if (row < 0 || col < 0 || row >= QR_SIZE || col >= QR_SIZE) return;
  matrix.modules[row][col] = value;
  if (reserve) matrix.reserved[row][col] = true;
}

function addFinder(matrix: ReturnType<typeof blankQrMatrix>, top: number, left: number) {
  for (let row = -1; row <= 7; row += 1) {
    for (let col = -1; col <= 7; col += 1) {
      const r = top + row;
      const c = left + col;
      if (r < 0 || c < 0 || r >= QR_SIZE || c >= QR_SIZE) continue;
      const dark = row >= 0 && row <= 6 && col >= 0 && col <= 6
        && (row === 0 || row === 6 || col === 0 || col === 6 || (row >= 2 && row <= 4 && col >= 2 && col <= 4));
      setQrModule(matrix, r, c, dark);
    }
  }
}

function addAlignment(matrix: ReturnType<typeof blankQrMatrix>, centerRow: number, centerCol: number) {
  for (let row = -2; row <= 2; row += 1) {
    for (let col = -2; col <= 2; col += 1) {
      const dark = Math.max(Math.abs(row), Math.abs(col)) === 2 || (row === 0 && col === 0);
      setQrModule(matrix, centerRow + row, centerCol + col, dark);
    }
  }
}

function addQrPatterns(matrix: ReturnType<typeof blankQrMatrix>) {
  addFinder(matrix, 0, 0);
  addFinder(matrix, 0, QR_SIZE - 7);
  addFinder(matrix, QR_SIZE - 7, 0);
  addAlignment(matrix, 22, 22);

  for (let index = 8; index < QR_SIZE - 8; index += 1) {
    setQrModule(matrix, 6, index, index % 2 === 0);
    setQrModule(matrix, index, 6, index % 2 === 0);
  }

  for (let index = 0; index < 8; index += 1) {
    setQrModule(matrix, 8, index, false);
    setQrModule(matrix, index, 8, false);
    setQrModule(matrix, QR_SIZE - 1 - index, 8, false);
    setQrModule(matrix, 8, QR_SIZE - 1 - index, false);
  }
  setQrModule(matrix, 8, 8, false);
  setQrModule(matrix, 8, QR_SIZE - 8, false);
  setQrModule(matrix, QR_SIZE - 8, 8, true);
}

function formatBits() {
  const data = (1 << 3) | 0; // EC level L, mask 0
  let value = data << 10;
  const generator = 0x537;
  for (let bit = 14; bit >= 10; bit -= 1) {
    if ((value >>> bit) & 1) value ^= generator << (bit - 10);
  }
  return ((data << 10) | value) ^ 0x5412;
}

function addFormatInfo(matrix: ReturnType<typeof blankQrMatrix>) {
  const bits = formatBits();
  const first = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];
  const second = [
    [QR_SIZE - 1, 8], [QR_SIZE - 2, 8], [QR_SIZE - 3, 8], [QR_SIZE - 4, 8], [QR_SIZE - 5, 8], [QR_SIZE - 6, 8], [QR_SIZE - 7, 8],
    [8, QR_SIZE - 8], [8, QR_SIZE - 7], [8, QR_SIZE - 6], [8, QR_SIZE - 5], [8, QR_SIZE - 4], [8, QR_SIZE - 3], [8, QR_SIZE - 2], [8, QR_SIZE - 1],
  ];
  first.forEach(([row, col], index) => setQrModule(matrix, row, col, ((bits >>> index) & 1) === 1));
  second.forEach(([row, col], index) => setQrModule(matrix, row, col, ((bits >>> index) & 1) === 1));
}

function placeQrData(matrix: ReturnType<typeof blankQrMatrix>, codewords: number[]) {
  const bits = codewords.flatMap((codeword) => Array.from({ length: 8 }, (_, index) => (codeword >>> (7 - index)) & 1));
  let bitIndex = 0;
  let upward = true;

  for (let col = QR_SIZE - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1;
    for (let offset = 0; offset < QR_SIZE; offset += 1) {
      const row = upward ? QR_SIZE - 1 - offset : offset;
      for (let lane = 0; lane < 2; lane += 1) {
        const c = col - lane;
        if (matrix.reserved[row][c]) continue;
        const bit = bits[bitIndex] ?? 0;
        const masked = bit ^ ((row + c) % 2 === 0 ? 1 : 0);
        setQrModule(matrix, row, c, masked === 1, false);
        bitIndex += 1;
      }
    }
    upward = !upward;
  }
}

export function encodeQrCode(code: string) {
  const data = qrDataCodewords(code);
  const ec = rsRemainder(data, QR_EC_CODEWORDS);
  const matrix = blankQrMatrix();
  addQrPatterns(matrix);
  placeQrData(matrix, [...data, ...ec]);
  addFormatInfo(matrix);

  const quiet = 4;
  const size = QR_SIZE + quiet * 2;
  const cells = Array.from({ length: size * size }, (_, index) => {
    const row = Math.floor(index / size) - quiet;
    const col = index % size - quiet;
    if (row < 0 || col < 0 || row >= QR_SIZE || col >= QR_SIZE) return false;
    return matrix.modules[row][col];
  });

  return { cells, size, text: String(code || "0") };
}
