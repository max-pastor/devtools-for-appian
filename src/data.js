const appianData = require('../appian-docs-final.json');

function buildFunctionIndex(data) {
    const index = new Map();
    for (const func of data) {
        index.set(func.label.toLowerCase(), func);
    }
    return index;
}

function buildKnownAFunctions(data) {
    const known = new Set();
    for (const func of data) {
        if (func.label.startsWith('a!')) {
            known.add(func.label.toLowerCase());
        }
    }
    return known;
}

module.exports = {
    appianData,
    funcIndex: buildFunctionIndex(appianData),
    knownAFunctions: buildKnownAFunctions(appianData)
};
