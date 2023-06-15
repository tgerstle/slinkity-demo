//remove weird characters
//https://stackoverflow.com/questions/2670037/how-to-remove-invalid-utf-8-characters-from-a-javascript-string
const cleanString = function (input) {
  let output = '';
  for (let i = 0; i < input.length; i++) {
    if (input.charCodeAt(i) <= 127) {
      output += input.charAt(i);
    }
  }
  return output;
};

const standardizeValue = function (val) {
  if (val === null) {
    val = '';
  }
  try {
    let replacement = '_';
    const fractionMap = {
      '¼': '1_4',
      '½': '1_2',
      '¾': '3_4',
      '⅐': '1_7',
      '⅑': '1_9',
      '⅒': '1_10',
      '⅓': '1_3',
      '⅔': '2_3',
      '⅕': '1_5',
      '⅖': '2_5',
      '⅗': '3_5',
      '⅘': '4_5',
      '⅙': '1_6',
      '⅚': '5_6',
      '⅛': '1_8',
      '⅜': '3_8',
      '⅝': '5_8',
      '⅞': '7_8',
    };
    for (const fract in fractionMap) {
      const re = new RegExp(fract, 'g');
      val = val.replace(re, fractionMap[fract]);
    }
    val = val.toLowerCase().trim();
    val = cleanString(val);
    val = val.replace(/\\/g, replacement);
    val = val.replace(/\//g, replacement);
    val = val.replace(/:/g, '');
    val = val.replace(/\,/g, '');
    val = val.replace(/\'/g, '');
    val = val.replace(/\&/g, '');
    val = val.replace(/\%/g, '');
    val = val.replace(/\$/g, '');
    val = val.replace(/\s/g, replacement);
    val = val.replace(/-/g, replacement);
    val = val.replace(/_/g, replacement);
    val = val.replace(/\./g, replacement);
  } catch (err) {
    console.log(err, 'error in standardizeValue');
    return '';
  }

  return val;
};

module.exports = { standardizeValue, cleanString };
