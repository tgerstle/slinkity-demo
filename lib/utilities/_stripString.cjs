const stripString = function (originalString) {
    if (typeof originalString === 'string') {
        originalString = originalString.replace(/<br ?\/?>/gi, ' ');
        originalString = originalString.replace(/(<([^>]+)>)/gi, '');
        originalString = originalString.replace(/(\\r|\\n|\r|\n)/gi, ' ');
        originalString = originalString.replace(/\\t/g, '');
        originalString = originalString.replace(/ {2,}/g, ' ');
        originalString = originalString.trim();
        return originalString;
    } else {
        console.log('Error: stripString must be passed a string but got:', originalString);
        return '';
    }
};

// export { stripString };
module.exports = {
    stripString,
};
