const decodeEntities = function (encodedString) {
    var translate_re = /&(nbsp|amp|quot|lt|gt|#39);/g;
    var translate = {
        // "nbsp":" ",
        "amp": "&",
        "quot": "\"",
        '#39': "\'",
        "lt": "<",
        "gt": ">"
    };
    return encodedString.replace(translate_re, function (match, entity) {
        return translate[entity];
    }).replace(/&#(\d+);/gi, function (match, numStr) {
        var num = parseInt(numStr, 10);
        return String.fromCharCode(num);
    }).replace(/\\n/g, '');
}

module.exports = {
    decodeEntities
}