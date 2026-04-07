function extractSyntax(doc) {
    if (!doc) return null;
    const match = doc.match(/\*\*Syntax:\*\*\n```appian\n(.+?)\n```/s);
    return match ? match[1].trim() : null;
}

function extractParams(syntax) {
    if (!syntax) return [];
    const match = syntax.match(/\((.+)\)/);
    if (!match) return [];
    return match[1]
        .split(',')
        .map(p => p.trim().replace(/[\[\]]/g, ''))
        .filter(p => p.length > 0);
}

function extractDescription(doc) {
    if (!doc) return '';
    const parts = doc.split('\n\n**Syntax:**');
    return parts[0].trim();
}

function extractExample(doc) {
    if (!doc) return null;
    const match = doc.match(/\*\*Example:\*\*\n```appian\n(.+?)\n```/s);
    return match ? match[1].trim() : null;
}

function extractExampleResult(doc) {
    if (!doc) return null;
    const match = doc.match(/\*\*Result:\*\*\n```\n(.+?)\n```/s);
    return match ? match[1].trim() : null;
}

module.exports = {
    extractSyntax,
    extractParams,
    extractDescription,
    extractExample,
    extractExampleResult
};
