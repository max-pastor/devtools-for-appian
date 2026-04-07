const vscode = require('vscode');
const { LANGUAGE_ID } = require('../languageId');
const {
    extractSyntax,
    extractParams,
    extractDescription,
    extractExample,
    extractExampleResult
} = require('../docParsers');

function registerHoverProvider({ funcIndex }) {
    return vscode.languages.registerHoverProvider(LANGUAGE_ID, {
        provideHover(document, position) {
            const wordRange = document.getWordRangeAtPosition(
                position,
                /[a-zA-Z_][a-zA-Z0-9_]*![a-zA-Z0-9_]+|[a-zA-Z_][a-zA-Z0-9_]*/
            );
            if (!wordRange) return null;

            const word = document.getText(wordRange);
            const funcData = funcIndex.get(word.toLowerCase());
            if (!funcData) return null;

            const syntax = extractSyntax(funcData.documentation);
            const description = extractDescription(funcData.documentation);
            const params = extractParams(syntax);
            const example = funcData.example || extractExample(funcData.documentation);
            const exampleResult = funcData.exampleResult || extractExampleResult(funcData.documentation);

            const md = new vscode.MarkdownString();
            md.appendMarkdown(`### ${funcData.label}\n\n`);
            md.appendMarkdown(`${description}\n\n`);

            if (syntax) {
                md.appendMarkdown(`---\n\n`);
                md.appendMarkdown(`**Syntax:**\n`);
                md.appendCodeblock(syntax, LANGUAGE_ID);
            }

            if (params.length > 0) {
                md.appendMarkdown(`\n**Parameters:**\n`);
                params.forEach(p => {
                    md.appendMarkdown(`- \`${p}\`\n`);
                });
            }

            if (example) {
                md.appendMarkdown(`\n---\n\n`);
                md.appendMarkdown(`**Example:**\n`);
                md.appendCodeblock(example, LANGUAGE_ID);
                if (exampleResult) {
                    md.appendMarkdown(`\n**Result:**\n`);
                    md.appendCodeblock(exampleResult, 'text');
                }
            }

            md.appendMarkdown(`\n---\n*Appian Function*`);
            md.isTrusted = true;

            return new vscode.Hover(md, wordRange);
        }
    });
}

module.exports = { registerHoverProvider };
