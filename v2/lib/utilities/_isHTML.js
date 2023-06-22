const isHTML = function (variable) {
    if (typeof variable != 'string') {
        return false;
    }
    const regex = /(<([^>]+)>)/i
    return regex.test(variable);
}

module.exports = {
    isHTML
}