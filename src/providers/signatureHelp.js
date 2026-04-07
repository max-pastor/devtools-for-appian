const vscode = require('vscode');
const { LANGUAGE_ID } = require('../languageId');
const { extractSyntax, extractParams, extractDescription, extractExample, extractExampleResult } = require('../docParsers');

function registerSignatureHelpProvider({ funcIndex }) {
    return vscode.languages.registerSignatureHelpProvider(LANGUAGE_ID, {
        provideSignatureHelp(document, position) {
            const lineText = document.lineAt(position).text;
            const textBefore = lineText.substring(0, position.character);

            let depth = 0;
            let funcEnd = -1;

            for (let i = textBefore.length - 1; i >= 0; i--) {
                const ch = textBefore[i];
                if (ch === ')') depth++;
                else if (ch === '(') {
                    if (depth === 0) {
                        funcEnd = i;
                        break;
                    }
                    depth--;
                }
            }

            if (funcEnd < 0) return null;

            const beforeParen = textBefore.substring(0, funcEnd).trim();
            const funcNameMatch = beforeParen.match(/([a-zA-Z_][a-zA-Z0-9_]*![a-zA-Z0-9_]+|[a-zA-Z_][a-zA-Z0-9_]*)$/);
            if (!funcNameMatch) return null;

            const funcName = funcNameMatch[1];
            const funcData = funcIndex.get(funcName.toLowerCase());
            if (!funcData) return null;

            const syntax = extractSyntax(funcData.documentation);
            const description = extractDescription(funcData.documentation);
            const params = extractParams(syntax);

            const argsText = textBefore.substring(funcEnd + 1);
            let paramIndex = 0;
            let argDepth = 0;
            for (const ch of argsText) {
                if (ch === '(' || ch === '[' || ch === '{') argDepth++;
                else if (ch === ')' || ch === ']' || ch === '}') argDepth--;
                else if (ch === ',' && argDepth === 0) paramIndex++;
            }

            const sigHelp = new vscode.SignatureHelp();

            const example = funcData.example || extractExample(funcData.documentation);
            let docString = description;
            if (example) {
                docString += `\n\n**Example:** \`${example}\``;
                const exampleResult = funcData.exampleResult || extractExampleResult(funcData.documentation);
                if (exampleResult) {
                    docString += ` → \`${exampleResult}\``;
                }
            }

            const signatureLabel = syntax || (params.length > 0
                ? `${funcName}(${params.join(', ')})`
                : `${funcName}()`);

            const sigInfo = new vscode.SignatureInformation(
                signatureLabel,
                new vscode.MarkdownString(docString)
            );

            params.forEach(p => {
                sigInfo.parameters.push(new vscode.ParameterInformation(p));
            });

            sigHelp.signatures = [sigInfo];
            sigHelp.activeSignature = 0;
            sigHelp.activeParameter = params.length > 0
                ? Math.min(paramIndex, params.length - 1)
                : 0;

            return sigHelp;
        }
    }, {
        triggerCharacters: ['(', ','],
        retriggerCharacters: ['(', ',']
    });
}

module.exports = { registerSignatureHelpProvider };
